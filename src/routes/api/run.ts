import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import {
  buildUpstreamRequest,
  canSendFiles,
  IMAGE_MAX_BYTES,
  imageSendMode,
  type ToolParam,
  type UpstreamFile,
} from "@/lib/tool-request";

const bodySchema = z.object({
  slug: z.string().min(1).max(80),
  params: z.record(z.string().max(5000)).default({}),
});

const UPLOAD_BUCKET = "tool-uploads";
const UPLOAD_LINK_TTL_SECONDS = 60 * 60;
const UPLOAD_KEEP_MS = 60 * 60 * 1000;

type Admin = (typeof import("@/integrations/supabase/client.server"))["supabaseAdmin"];

function extFromType(type: string): string {
  const sub = type.split("/")[1]?.split(";")[0]?.split("+")[0] ?? "jpg";
  return sub === "jpeg" ? "jpg" : sub.replace(/[^a-z0-9]/gi, "") || "jpg";
}

/** Reads either a JSON body or a multipart body (text params as JSON + image files as `file:<key>`). */
async function readBody(
  request: Request,
): Promise<{ body: unknown; files: Record<string, File> } | null> {
  const contentType = request.headers.get("content-type") ?? "";
  try {
    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData();
      const files: Record<string, File> = {};
      for (const [name, value] of form.entries()) {
        if (name.startsWith("file:") && typeof value !== "string") files[name.slice(5)] = value;
      }
      const rawParams = form.get("params");
      return {
        body: {
          slug: form.get("slug"),
          params: typeof rawParams === "string" && rawParams ? JSON.parse(rawParams) : {},
        },
        files,
      };
    }
    return { body: await request.json(), files: {} };
  } catch {
    return null;
  }
}

// Uploaded images are only needed while the tool runs; old ones are cleared on later uploads.
async function clearOldUploads(admin: Admin) {
  try {
    const { data } = await admin.storage
      .from(UPLOAD_BUCKET)
      .list("runs", { limit: 50, sortBy: { column: "created_at", order: "asc" } });
    const cutoff = Date.now() - UPLOAD_KEEP_MS;
    const old = (data ?? [])
      .filter((o) => o.created_at && new Date(o.created_at).getTime() < cutoff)
      .map((o) => `runs/${o.name}`);
    if (old.length) await admin.storage.from(UPLOAD_BUCKET).remove(old);
  } catch {
    // Best effort only.
  }
}

// Proxy that runs a tool: looks up the admin-defined endpoint, adds secret headers,
// calls it server-side (no CORS problems) and streams the upstream response back.
export const Route = createFileRoute("/api/run")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const read = await readBody(request);
        const check = read ? bodySchema.safeParse(read.body) : null;
        if (!read || !check?.success) {
          return Response.json({ error: "Input tidak valid" }, { status: 400 });
        }
        const parsed = check.data;
        const values: Record<string, string> = { ...parsed.params };

        // Secret headers live in an admin-only table, so the server reads them with the privileged client.
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: tool, error } = await supabaseAdmin
          .from("tools")
          .select("id, method, endpoint, body_type, is_active, kind, params")
          .eq("slug", parsed.slug)
          .maybeSingle();

        if (error) return Response.json({ error: "Gagal memuat tool" }, { status: 500 });
        if (!tool || !tool.is_active || tool.kind !== "dynamic" || !tool.endpoint) {
          return Response.json({ error: "Tool tidak ditemukan" }, { status: 404 });
        }

        // Image inputs: validate, then send as a temporary link or as the file itself.
        const declared = Array.isArray(tool.params) ? (tool.params as unknown as ToolParam[]) : [];
        const upstreamFiles: Record<string, UpstreamFile> = {};
        let cleaned = false;
        for (const p of declared.filter((d) => d.type === "image")) {
          delete values[p.key];
          const file = read.files[p.key];
          if (!file || file.size === 0) {
            if (p.required) {
              return Response.json(
                { error: `Gambar "${p.label || p.key}" belum dipilih` },
                { status: 400 },
              );
            }
            continue;
          }
          if (!file.type.startsWith("image/")) {
            return Response.json({ error: "File harus berupa gambar" }, { status: 400 });
          }
          if (file.size > IMAGE_MAX_BYTES) {
            return Response.json({ error: "Ukuran gambar maksimal 10 MB" }, { status: 400 });
          }
          const filename = `${p.key}.${extFromType(file.type)}`;
          if (imageSendMode(p) === "file" && canSendFiles(tool)) {
            upstreamFiles[p.key] = { blob: file, filename };
            continue;
          }
          if (!cleaned) {
            cleaned = true;
            await clearOldUploads(supabaseAdmin);
          }
          const path = `runs/${crypto.randomUUID()}.${extFromType(file.type)}`;
          const { error: upErr } = await supabaseAdmin.storage
            .from(UPLOAD_BUCKET)
            .upload(path, file, { contentType: file.type });
          const { data: signed } = upErr
            ? { data: null }
            : await supabaseAdmin.storage
                .from(UPLOAD_BUCKET)
                .createSignedUrl(path, UPLOAD_LINK_TTL_SECONDS);
          if (!signed?.signedUrl) {
            return Response.json({ error: "Gagal mengunggah gambar" }, { status: 500 });
          }
          values[p.key] = signed.signedUrl;
        }

        const { data: secret } = await supabaseAdmin
          .from("tool_secrets")
          .select("headers")
          .eq("tool_id", tool.id)
          .maybeSingle();
        const secretHeaders =
          secret?.headers && typeof secret.headers === "object" && !Array.isArray(secret.headers)
            ? (Object.fromEntries(
                Object.entries(secret.headers).map(([k, v]) => [k, String(v ?? "")]),
              ) as Record<string, string>)
            : {};

        let upstream: Response;
        try {
          const { url, init } = buildUpstreamRequest(tool, values, secretHeaders, upstreamFiles);
          upstream = await fetch(url, { ...init, signal: AbortSignal.timeout(60_000) });
        } catch (e) {
          const message =
            e instanceof Error && e.name === "TimeoutError"
              ? "Layanan terlalu lama merespons"
              : "Layanan tidak bisa dihubungi";
          return Response.json({ error: message }, { status: 502 });
        }

        const headers = new Headers();
        headers.set(
          "content-type",
          upstream.headers.get("content-type") ?? "application/octet-stream",
        );
        headers.set("x-upstream-status", String(upstream.status));
        headers.set("cache-control", "no-store");
        return new Response(upstream.body, { status: upstream.status, headers });
      },
    },
  },
});
