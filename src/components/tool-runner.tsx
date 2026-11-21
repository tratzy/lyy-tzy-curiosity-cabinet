import { useEffect, useRef, useState } from "react";
import { Play, RotateCcw, TriangleAlert } from "lucide-react";

import { MiniLoader } from "@/components/mini-loader";
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

export function ToolRunner({ tool }: { tool: Tool }) {
  const params = toolParams(tool);
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      params.map((p) => [p.key, p.default ?? (p.type === "select" ? (p.options?.[0] ?? "") : "")]),
    ),
  );
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<RunResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState<number | null>(null);
  const objectUrl = useRef<string | null>(null);

  useEffect(
    () => () => {
      if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
    },
    [],
  );

  const run = async (e: React.FormEvent) => {
    e.preventDefault();
    setRunning(true);
    setError(null);
    setResult(null);
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
        let message = text;
        try {
          const j = JSON.parse(text) as Record<string, unknown>;
          message = String(j["error"] ?? j["message"] ?? text);
        } catch {
          /* plain text error */
        }
        throw new Error(`(${res.status}) ${message.slice(0, 300) || "Endpoint gagal merespons"}`);
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

      if (mediaType && forced !== "json" && forced !== "text") {
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
        if (forced === "text") setResult({ kind: "text", text });
        else {
          try {
            setResult({ kind: "json", data: JSON.parse(text) });
          } catch {
            setResult({ kind: "text", text });
          }
        }
      }
      setElapsed(Math.round(performance.now() - started));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      <form onSubmit={run} className="glass flex flex-col gap-5 rounded-2xl p-5 sm:p-6">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-sm font-bold uppercase tracking-[0.2em] text-foreground">
            Input
          </h2>
          <span className="font-mono text-[11px] uppercase text-muted-foreground">
            {params.length} parameter
          </span>
        </div>

        {params.length === 0 && (
          <p className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
            Tool ini tidak butuh input. Tekan tombol jalankan.
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
                className="resize-none bg-background/60"
              />
            ) : p.type === "select" ? (
              <select
                id={`p-${p.key}`}
                value={values[p.key] ?? ""}
                onChange={(e) => setValues((v) => ({ ...v, [p.key]: e.target.value }))}
                required={p.required}
                className="h-10 w-full rounded-md border border-input bg-background/60 px-3 text-sm text-foreground outline-none focus:border-primary/60"
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
                className="h-10 bg-background/60"
              />
            )}
          </div>
        ))}

        <div className="mt-auto flex gap-2 pt-2">
          <Button type="submit" variant="neon" size="xl" className="flex-1" disabled={running}>
            <Play /> {running ? "Memproses…" : "Jalankan"}
          </Button>
          {(result || error) && (
            <Button
              type="button"
              variant="glass"
              size="xl"
              onClick={() => {
                setResult(null);
                setError(null);
              }}
              aria-label="Reset hasil"
            >
              <RotateCcw />
            </Button>
          )}
        </div>
      </form>

      <section className="glass flex min-h-[320px] flex-col rounded-2xl p-5 sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-sm font-bold uppercase tracking-[0.2em] text-foreground">
            Hasil
          </h2>
          {elapsed !== null && result && (
            <span className="font-mono text-[11px] text-success">✓ {elapsed} ms</span>
          )}
        </div>
        <div className="flex flex-1 flex-col justify-center">
          {running ? (
            <MiniLoader label="Menghubungi endpoint" />
          ) : error ? (
            <div className="flex items-start gap-3 rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-foreground animate-fade-up">
              <TriangleAlert className="mt-0.5 size-4 shrink-0 text-destructive" />
              <p className="break-words">{error}</p>
            </div>
          ) : result ? (
            <ToolResult result={result} />
          ) : (
            <p className="text-center text-sm text-muted-foreground">Hasil akan muncul di sini.</p>
          )}
        </div>
      </section>
    </div>
  );
}
