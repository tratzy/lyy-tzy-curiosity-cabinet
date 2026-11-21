import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { buildUpstreamRequest } from "@/lib/tool-request";

const bodySchema = z.object({
  slug: z.string().min(1).max(80),
  params: z.record(z.string().max(5000)).default({}),
});

// Proxy that runs a tool: looks up the admin-defined endpoint, adds secret headers,
// calls it server-side (no CORS problems) and streams the upstream response back.
export const Route = createFileRoute("/api/run")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let parsed: z.infer<typeof bodySchema>;
        try {
          parsed = bodySchema.parse(await request.json());
        } catch {
          return Response.json({ error: "Input tidak valid" }, { status: 400 });
        }

        // Secret headers live in an admin-only table, so the server reads them with the privileged client.
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: tool, error } = await supabaseAdmin
          .from("tools")
          .select("id, method, endpoint, body_type, is_active, kind")
          .eq("slug", parsed.slug)
          .maybeSingle();

        if (error) return Response.json({ error: "Gagal memuat tool" }, { status: 500 });
        if (!tool || !tool.is_active || tool.kind !== "dynamic" || !tool.endpoint) {
          return Response.json({ error: "Tool tidak ditemukan" }, { status: 404 });
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
          const { url, init } = buildUpstreamRequest(tool, parsed.params, secretHeaders);
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
