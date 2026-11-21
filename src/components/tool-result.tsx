import { useState } from "react";
import { Check, Copy, Download, ExternalLink } from "lucide-react";

import { Button } from "@/components/ui/button";
import { findMediaUrls, type MediaKind } from "@/lib/tool-request";

export type RunResult =
  | { kind: "media"; media: MediaKind; url: string; contentType: string; filename: string }
  | { kind: "json"; data: unknown }
  | { kind: "text"; text: string };

export function ToolResult({ result }: { result: RunResult }) {
  if (result.kind === "media") {
    return (
      <div className="space-y-3 animate-fade-up">
        <MediaPreview kind={result.media} url={result.url} />
        <Button asChild variant="neon" className="w-full">
          <a href={result.url} download={result.filename}>
            <Download /> Download
          </a>
        </Button>
      </div>
    );
  }

  if (result.kind === "json") {
    const media = findMediaUrls(result.data);
    return (
      <div className="space-y-4 animate-fade-up">
        {media.length > 0 && (
          <div className="grid gap-3">
            {media.map((m) => (
              <div key={m.url} className="space-y-2">
                <MediaPreview kind={m.kind} url={m.url} />
                <Button asChild variant="glass" size="sm" className="w-full">
                  <a href={m.url} target="_blank" rel="noreferrer">
                    <ExternalLink /> Buka file
                  </a>
                </Button>
              </div>
            ))}
          </div>
        )}
        <CodeBlock text={JSON.stringify(result.data, null, 2)} />
      </div>
    );
  }

  return <CodeBlock text={result.text} />;
}

function MediaPreview({ kind, url }: { kind: MediaKind; url: string }) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-[repeating-conic-gradient(var(--color-surface-2)_0_25%,var(--color-surface)_0_50%)] bg-[length:20px_20px]">
      {kind === "image" && (
        <img src={url} alt="Hasil tool" className="mx-auto max-h-[480px] w-auto object-contain" />
      )}
      {kind === "video" && (
        <video
          src={url}
          controls
          autoPlay
          loop
          playsInline
          className="mx-auto max-h-[480px] w-full"
        />
      )}
      {kind === "audio" && <audio src={url} controls className="w-full p-3" />}
    </div>
  );
}

function CodeBlock({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="relative animate-fade-up">
      <button
        type="button"
        onClick={() => {
          void navigator.clipboard.writeText(text);
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1500);
        }}
        className="absolute right-2 top-2 grid size-8 place-items-center rounded-lg border border-border bg-surface text-muted-foreground transition-colors hover:text-primary"
        aria-label="Salin hasil"
      >
        {copied ? <Check className="size-4 text-success" /> : <Copy className="size-4" />}
      </button>
      <pre className="max-h-[480px] overflow-auto rounded-xl border border-border bg-background/80 p-4 pr-12 font-mono text-xs leading-relaxed text-foreground/90 whitespace-pre-wrap break-words">
        {text}
      </pre>
    </div>
  );
}
