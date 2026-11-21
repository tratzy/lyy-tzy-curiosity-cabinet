import { useEffect, useRef, useState } from "react";
import { Play, RotateCcw, Sparkles, TriangleAlert } from "lucide-react";

import { ToolLoading } from "@/components/tool-loading";
import { ToolResult, type RunResult } from "@/components/tool-result";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toolParams, type Tool } from "@/lib/tools-data";

function extFromType(type: string): string {
  const sub = type.split("/")[1]?.split(";")[0] ?? "bin";
  return sub === "jpeg" ? "jpg" : sub === "quicktime" ? "mov" : sub === "mpeg" ? "mp3" : sub;
}

type RunError = { title: string; detail: string };

function friendlyError(status: number, message: string): RunError {
  if (status === 404) return { title: "Tool tidak tersedia", detail: "Tool ini sedang nonaktif." };
  if (status === 400 || status === 422) {
    return { title: "Isian belum sesuai", detail: message || "Periksa lagi isianmu lalu coba lagi." };
  }
  if (status === 429) {
    return { title: "Terlalu banyak permintaan", detail: "Tunggu sebentar lalu coba lagi." };
  }
  if (status >= 500) {
    return { title: "Layanan sedang sibuk", detail: message || "Coba lagi beberapa saat lagi." };
  }
  return { title: "Gagal memproses", detail: message || "Coba lagi." };
}

export function ToolRunner({ tool }: { tool: Tool }) {
  const params = toolParams(tool);
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      params.map((p) => [p.key, p.default ?? (p.type === "select" ? (p.options?.[0] ?? "") : "")]),
    ),
  );
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<RunResult | null>(null);
  const [error, setError] = useState<RunError | null>(null);
  const [elapsed, setElapsed] = useState<number | null>(null);
  const objectUrl = useRef<string | null>(null);
  const resultRef = useRef<HTMLElement>(null);

  useEffect(
    () => () => {
      if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
    },
    [],
  );

  const isMediaTool =
    tool.response_type === "image" || tool.response_type === "video" || tool.response_type === "audio";

  const run = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setRunning(true);
    setError(null);
    setResult(null);
    if (window.innerWidth < 1024) {
      window.requestAnimationFrame(() =>
        resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }),
      );
    }
    const started = performance.now();
    try {
      const res = await fetch("/api/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: tool.slug, params: values }),
      });
      const contentType = res.headers.get("content-type") ?? "";
      const forced = tool.response_type;

      if (!res.ok) {
        const text = await res.text();
        let message = "";
        try {
          const j = JSON.parse(text) as Record<string, unknown>;
          const m = j["error"] ?? j["message"];
          message = typeof m === "string" ? m : "";
        } catch {
          message = text.length < 160 && !/<[a-z]/i.test(text) ? text : "";
        }
        setError(friendlyError(res.status, message.slice(0, 200)));
        return;
      }

      const mediaType =
        forced === "image" || forced === "video" || forced === "audio"
          ? forced
          : contentType.startsWith("image/")
            ? "image"
            : contentType.startsWith("video/")
              ? "video"
              : contentType.startsWith("audio/")
                ? "audio"
                : null;

      const isTextual = /json|text|xml|javascript/.test(contentType);
      if (mediaType && forced !== "json" && forced !== "text" && !(forced !== "auto" && isTextual)) {
        const blob = await res.blob();
        if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
        const url = URL.createObjectURL(blob);
        objectUrl.current = url;
        setResult({
          kind: "media",
          media: mediaType,
          url,
          contentType: blob.type,
          filename: `${tool.slug}-${Date.now()}.${extFromType(blob.type || contentType)}`,
        });
      } else {
        const text = await res.text();
        try {
          setResult({ kind: "json", data: JSON.parse(text) });
        } catch {
          setResult({ kind: "text", text });
        }
      }
      setElapsed(Math.round(performance.now() - started));
    } catch {
      setError({ title: "Koneksi terputus", detail: "Periksa internetmu lalu coba lagi." });
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:items-start">
      <form onSubmit={run} className="glass flex flex-col gap-5 rounded-2xl p-5 sm:p-6">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-sm font-bold uppercase tracking-[0.2em] text-foreground">
            Isian
          </h2>
          {params.length > 0 && (
            <span className="rounded-full bg-secondary px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              {params.length} kolom
            </span>
          )}
        </div>

        {params.length === 0 && (
          <p className="flex items-center gap-2 rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
            <Sparkles className="size-4 shrink-0 text-primary" />
            Tidak perlu isian. Langsung tekan Jalankan.
          </p>
        )}

        {params.map((p) => (
          <div key={p.key} className="space-y-2">
            <Label htmlFor={`p-${p.key}`} className="text-sm">
              {p.label || p.key}
              {p.required && <span className="ml-1 text-accent">*</span>}
            </Label>
            {p.type === "textarea" ? (
              <Textarea
                id={`p-${p.key}`}
                value={values[p.key] ?? ""}
                onChange={(e) => setValues((v) => ({ ...v, [p.key]: e.target.value }))}
                placeholder={p.placeholder}
                required={p.required}
                rows={4}
                className="resize-none glass-field"
              />
            ) : p.type === "select" ? (
              <select
                id={`p-${p.key}`}
                value={values[p.key] ?? ""}
                onChange={(e) => setValues((v) => ({ ...v, [p.key]: e.target.value }))}
                required={p.required}
                className="h-10 w-full rounded-md border border-input glass-field px-3 text-sm text-foreground outline-none focus:border-primary/60"
              >
                {(p.options ?? []).map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            ) : (
              <Input
                id={`p-${p.key}`}
                type={p.type === "number" ? "number" : p.type === "url" ? "url" : "text"}
                value={values[p.key] ?? ""}
                onChange={(e) => setValues((v) => ({ ...v, [p.key]: e.target.value }))}
                placeholder={p.placeholder}
                required={p.required}
                className="h-10 glass-field"
              />
            )}
          </div>
        ))}

        <div className="mt-auto flex gap-2 pt-2">
          <Button type="submit" variant="neon" size="xl" className="flex-1" disabled={running}>
            <Play /> {running ? "Memproses…" : result ? "Jalankan lagi" : "Jalankan"}
          </Button>
          {(result || error) && !running && (
            <Button
              type="button"
              variant="glass"
              size="xl"
              onClick={() => {
                setResult(null);
                setError(null);
              }}
              aria-label="Bersihkan hasil"
            >
              <RotateCcw />
            </Button>
          )}
        </div>
      </form>

      <section
        ref={resultRef}
        className="glass relative flex min-h-[340px] scroll-mt-20 flex-col overflow-hidden rounded-2xl p-5 sm:p-6"
      >
        <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-neon opacity-60" />
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-sm font-bold uppercase tracking-[0.2em] text-foreground">
            Hasil
          </h2>
          {elapsed !== null && result && !running && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-success/10 px-2.5 py-0.5 font-mono text-[11px] text-success animate-fade-up">
              <span className="size-1.5 rounded-full bg-success" />
              Selesai · {(elapsed / 1000).toFixed(1).replace(".", ",")} dtk
            </span>
          )}
        </div>
        <div className="flex flex-1 flex-col justify-center">
          {running ? (
            <ToolLoading icon={tool.icon} media={isMediaTool} />
          ) : error ? (
            <div className="flex flex-col items-center gap-4 py-6 text-center animate-fade-up">
              <div className="grid size-14 place-items-center rounded-2xl border border-destructive/40 bg-destructive/10 text-destructive">
                <TriangleAlert className="size-6" />
              </div>
              <div>
                <p className="font-semibold">{error.title}</p>
                <p className="mt-1 max-w-xs break-words text-sm text-muted-foreground">
                  {error.detail}
                </p>
              </div>
              <Button type="button" variant="glass" size="sm" onClick={() => void run()}>
                <RotateCcw /> Coba lagi
              </Button>
            </div>
          ) : result ? (
            <ToolResult result={result} />
          ) : (
            <EmptyState />
          )}
        </div>
      </section>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center gap-4 py-6 text-center">
      <div className="relative grid size-16 place-items-center">
        <div className="absolute inset-0 rounded-2xl bg-gradient-neon opacity-20 blur-xl animate-float" />
        <div className="relative grid size-16 place-items-center glass rounded-2xl text-muted-foreground animate-float">
          <Sparkles className="size-6" />
        </div>
      </div>
      <div>
        <p className="font-medium text-foreground">Siap dijalankan</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Isi kolom di samping lalu tekan Jalankan. Hasilnya tampil di sini.
        </p>
      </div>
    </div>
  );
}
