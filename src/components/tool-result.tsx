import { useState, type ReactNode } from "react";
import {
  Check,
  CheckCircle2,
  Copy,
  Download,
  ExternalLink,
  Link2,
  Quote,
  Share2,
  XCircle,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  formatPrimitive,
  humanizeKey,
  isEmpty,
  isPlainObject,
  isUrl,
  mediaOf,
  primaryTextKey,
  toPlainText,
  unwrapPayload,
  withoutMeta,
  type PlainObject,
} from "@/lib/result-format";
import type { MediaKind } from "@/lib/tool-request";
import { cn } from "@/lib/utils";

export type RunResult =
  | { kind: "media"; media: MediaKind; url: string; contentType: string; filename: string }
  | { kind: "json"; data: unknown }
  | { kind: "text"; text: string };

const MAX_DEPTH = 4;
const MAX_ITEMS = 24;

export function ToolResult({ result }: { result: RunResult }) {
  if (result.kind === "media") return <MediaResult result={result} />;

  if (result.kind === "text") {
    const text = result.text.trim();
    return (
      <ResultShell copyText={text}>
        <PayloadView value={text} depth={0} />
      </ResultShell>
    );
  }

  const payload = unwrapPayload(result.data);
  return (
    <ResultShell copyText={toPlainText(payload)}>
      <PayloadView value={payload} depth={0} />
    </ResultShell>
  );
}

/* ------------------------------------------------------------------ *
 * Shell: content + a small action bar
 * ------------------------------------------------------------------ */

function ResultShell({ children, copyText }: { children: ReactNode; copyText: string }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="result-stagger flex flex-col gap-3">{children}</div>
      {copyText.trim() && (
        <div className="flex justify-end animate-fade-up [animation-delay:200ms]">
          <CopyButton text={copyText} label="Salin hasil" />
        </div>
      )}
    </div>
  );
}

function CopyButton({ text, label, compact }: { text: string; label: string; compact?: boolean }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        void navigator.clipboard.writeText(text);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1500);
      }}
      aria-label={label}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg border border-border glass-field text-xs font-medium text-muted-foreground transition-[color,border-color,box-shadow] duration-300 hover:border-primary/50 hover:text-primary hover:shadow-glow-cyan",
        compact ? "size-8 justify-center" : "h-9 px-3",
      )}
    >
      {copied ? <Check className="size-3.5 text-success" /> : <Copy className="size-3.5" />}
      {!compact && (copied ? "Tersalin" : label)}
    </button>
  );
}

/* ------------------------------------------------------------------ *
 * Media
 * ------------------------------------------------------------------ */

function MediaResult({ result }: { result: Extract<RunResult, { kind: "media" }> }) {
  const canShare = typeof navigator !== "undefined" && "share" in navigator;
  const share = async () => {
    try {
      const blob = await fetch(result.url).then((r) => r.blob());
      const file = new File([blob], result.filename, { type: blob.type });
      await navigator.share({ files: [file] });
    } catch {
      /* user cancelled or sharing not allowed */
    }
  };
  return (
    <div className="flex flex-col gap-3 animate-fade-up">
      <MediaFrame kind={result.media} url={result.url} large />
      <div className="flex gap-2">
        <Button asChild variant="neon" className="flex-1">
          <a href={result.url} download={result.filename}>
            <Download /> Simpan
          </a>
        </Button>
        {canShare && (
          <Button type="button" variant="glass" onClick={share} aria-label="Bagikan">
            <Share2 />
          </Button>
        )}
      </div>
    </div>
  );
}

function MediaFrame({ kind, url, large }: { kind: MediaKind; url: string; large?: boolean }) {
  return (
    <div className="result-media relative overflow-hidden rounded-2xl border border-border shadow-card">
      {kind === "image" && (
        <img
          src={url}
          alt="Hasil"
          className={cn("mx-auto w-auto object-contain", large ? "max-h-[520px]" : "max-h-72")}
        />
      )}
      {kind === "video" && (
        <video
          src={url}
          controls
          autoPlay
          loop
          muted
          playsInline
          className={cn("mx-auto w-full", large ? "max-h-[520px]" : "max-h-72")}
        />
      )}
      {kind === "audio" && <audio src={url} controls className="w-full p-3" />}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Generic payload rendering
 * ------------------------------------------------------------------ */

function PayloadView({ value, depth }: { value: unknown; depth: number }) {
  if (isEmpty(value)) {
    return <EmptyNote />;
  }

  if (typeof value === "string") {
    const media = mediaOf(value);
    if (media) {
      return (
        <div className="space-y-2">
          <MediaFrame kind={media} url={value.trim()} large />
          <Button asChild variant="glass" size="sm" className="w-full">
            <a href={value.trim()} target="_blank" rel="noreferrer">
              <ExternalLink /> Buka di tab baru
            </a>
          </Button>
        </div>
      );
    }
    if (isUrl(value)) return <LinkCard url={value.trim()} />;
    return <HeroText text={value} />;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return (
      <div className="grid grid-cols-1">
        <StatTile label="Hasil" value={value} />
      </div>
    );
  }

  if (Array.isArray(value)) return <ArrayView items={value} depth={depth} />;

  if (isPlainObject(value)) return <ObjectView obj={value} depth={depth} />;

  return <HeroText text={String(value)} />;
}

function ArrayView({ items, depth }: { items: unknown[]; depth: number }) {
  const [showAll, setShowAll] = useState(false);
  const list = items.filter((v) => !isEmpty(v));
  if (list.length === 0) return <EmptyNote />;
  if (list.length === 1 && depth === 0) return <PayloadView value={list[0]} depth={depth} />;

  const visible = showAll ? list : list.slice(0, MAX_ITEMS);
  const more =
    list.length > MAX_ITEMS && !showAll ? (
      <button
        type="button"
        onClick={() => setShowAll(true)}
        className="text-xs font-medium text-primary underline-offset-4 hover:underline"
      >
        Tampilkan semua ({list.length})
      </button>
    ) : null;

  // Gallery of media links.
  if (visible.every((v) => mediaOf(v))) {
    return (
      <div className="space-y-2">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {visible.map((v, i) => (
            <a
              key={i}
              href={String(v)}
              target="_blank"
              rel="noreferrer"
              className="block overflow-hidden rounded-xl border border-border transition-[border-color,box-shadow] hover:border-primary/50 hover:shadow-glow-cyan"
            >
              <MediaFrame kind={mediaOf(v) ?? "image"} url={String(v)} />
            </a>
          ))}
        </div>
        {more}
      </div>
    );
  }

  // Short primitives become chips.
  if (visible.every((v) => !isPlainObject(v) && !Array.isArray(v))) {
    const long = visible.some((v) => formatPrimitive(v).length > 60);
    return (
      <div className="space-y-2">
        {long ? (
          <ol className="space-y-2">
            {visible.map((v, i) => (
              <li
                key={i}
                className="flex gap-3 rounded-xl border border-border/70 glass-inset p-3 text-sm leading-relaxed"
              >
                <span className="grid size-6 shrink-0 place-items-center rounded-md bg-primary/15 font-mono text-[11px] text-primary">
                  {i + 1}
                </span>
                <InlineValue value={v} />
              </li>
            ))}
          </ol>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {visible.map((v, i) => (
              <span
                key={i}
                className="rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-xs text-foreground"
              >
                {formatPrimitive(v)}
              </span>
            ))}
          </div>
        )}
        {more}
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      {visible.map((v, i) => (
        <div
          key={i}
          className="relative rounded-xl border border-border/70 glass-inset p-3 pl-10 sm:p-4 sm:pl-12"
        >
          <span className="absolute left-3 top-3 grid size-6 place-items-center rounded-md bg-gradient-neon-soft font-mono text-[11px] font-semibold text-primary sm:left-4 sm:top-4">
            {i + 1}
          </span>
          {depth >= MAX_DEPTH ? (
            <p className="whitespace-pre-wrap text-sm text-muted-foreground">{toPlainText(v)}</p>
          ) : (
            <PayloadView value={v} depth={depth + 1} />
          )}
        </div>
      ))}
      {more}
    </div>
  );
}

function ObjectView({ obj, depth }: { obj: PlainObject; depth: number }) {
  const o = withoutMeta(obj);
  const top = depth === 0;
  const entries = Object.entries(o).filter(([, v]) => !isEmpty(v));

  const heroKey = top ? primaryTextKey(o) : null;
  const heroMedia = top ? entries.filter(([, v]) => mediaOf(v)) : [];
  const heroMediaKeys = new Set(heroMedia.map(([k]) => k));

  const rest = entries.filter(([k]) => k !== heroKey && !heroMediaKeys.has(k));
  const stats = top
    ? rest.filter(([k, v]) => typeof v === "number" && !/(^id$|_id$|Id$|code$)/i.test(k))
    : [];
  const statKeys = new Set(stats.map(([k]) => k));
  const fields = rest.filter(
    ([k, v]) => !statKeys.has(k) && (v === null || typeof v !== "object"),
  );
  const nested = rest.filter(([, v]) => v !== null && typeof v === "object");

  return (
    <>
      {heroMedia.map(([k, v]) => (
        <MediaFrame key={k} kind={mediaOf(v) ?? "image"} url={String(v).trim()} large />
      ))}

      {heroKey && <HeroText text={String(o[heroKey])} label={humanizeKey(heroKey)} />}

      {stats.length > 0 && (
        <div className={cn("grid gap-2.5", stats.length === 1 ? "grid-cols-1" : "grid-cols-2")}>
          {stats.map(([k, v]) => (
            <StatTile key={k} label={humanizeKey(k)} value={v as number} />
          ))}
        </div>
      )}

      {fields.length > 0 && (
        <dl
          className={cn(
            "divide-y divide-border/50 overflow-hidden rounded-xl border border-border/70",
            top ? "glass-inset" : "glass-inset",
          )}
        >
          {fields.map(([k, v]) => (
            <FieldRow key={k} label={humanizeKey(k)} value={v} />
          ))}
        </dl>
      )}

      {nested.map(([k, v]) => (
        <section key={k} className="space-y-2">
          <h3 className="flex items-center gap-2 font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-accent">
            <span className="h-px w-4 bg-accent/60" />
            {humanizeKey(k)}
          </h3>
          {depth >= MAX_DEPTH ? (
            <p className="whitespace-pre-wrap text-sm text-muted-foreground">{toPlainText(v)}</p>
          ) : (
            <div className="flex flex-col gap-2.5">
              <PayloadView value={v} depth={depth + 1} />
            </div>
          )}
        </section>
      ))}
    </>
  );
}

/* ------------------------------------------------------------------ *
 * Building blocks
 * ------------------------------------------------------------------ */

function HeroText({ text, label }: { text: string; label?: string }) {
  const t = text.trim();
  const short = t.length <= 160;
  return (
    <div className="result-hero relative overflow-hidden rounded-2xl border border-primary/30 bg-gradient-neon-soft p-4 pr-12 sm:p-5 sm:pr-14">
      <Quote className="pointer-events-none absolute -right-2 -top-2 size-20 text-primary/10" />
      {label && (
        <p className="mb-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">
          {label}
        </p>
      )}
      <p
        className={cn(
          "relative whitespace-pre-wrap break-words text-foreground",
          short ? "text-lg font-semibold leading-snug sm:text-xl" : "text-sm leading-relaxed sm:text-base",
        )}
      >
        {t}
      </p>
      <div className="absolute right-3 top-3">
        <CopyButton text={t} label="Salin teks" compact />
      </div>
    </div>
  );
}

function StatTile({ label, value }: { label: string; value: number | boolean }) {
  const text =
    typeof value === "number"
      ? new Intl.NumberFormat("id-ID", { maximumFractionDigits: 4 }).format(value)
      : formatPrimitive(value);
  return (
    <div className="relative overflow-hidden rounded-xl border border-border/70 glass-inset p-3.5">
      <div className="pointer-events-none absolute -right-6 -top-6 size-20 rounded-full glow-soft opacity-30" />
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
      <p
        className={cn(
          "mt-1 truncate font-display font-bold tabular-nums text-gradient-neon",
          text.length > 9 ? "text-base sm:text-lg" : text.length > 6 ? "text-xl" : "text-2xl",
        )}
        title={text}
      >
        {text}
      </p>
    </div>
  );
}

function FieldRow({ label, value }: { label: string; value: unknown }) {
  const text = formatPrimitive(value);
  const media = mediaOf(value);
  const block =
    media === "audio" ||
    media === "video" ||
    (typeof value === "string" && text.length > 28 && !isUrl(text) && !media);
  return (
    <div
      className={cn(
        "gap-x-4 gap-y-1 px-3.5 py-2.5 text-sm",
        block ? "flex flex-col" : "flex items-center justify-between",
      )}
    >
      <dt className="shrink-0 text-xs text-muted-foreground">{label}</dt>
      <dd className={cn("min-w-0", block ? "leading-relaxed" : "text-right")}>
        <InlineValue value={value} />
      </dd>
    </div>
  );
}

function InlineValue({ value }: { value: unknown }) {
  if (typeof value === "boolean") {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
          value ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive",
        )}
      >
        {value ? <CheckCircle2 className="size-3" /> : <XCircle className="size-3" />}
        {value ? "Ya" : "Tidak"}
      </span>
    );
  }
  if (typeof value === "string") {
    const media = mediaOf(value);
    const url = value.trim();
    if (media === "image") {
      return (
        <a href={url} target="_blank" rel="noreferrer" className="inline-block">
          <img
            src={url}
            alt=""
            className="ml-auto h-12 max-w-[9rem] rounded-md border border-border object-contain"
          />
        </a>
      );
    }
    if (media === "audio") return <audio src={url} controls className="h-10 w-full" />;
    if (media === "video") {
      return <video src={url} controls playsInline className="max-h-56 w-full rounded-md" />;
    }
    if (isUrl(value)) {
      let host = url;
      try {
        host = new URL(url).hostname.replace(/^www\./, "");
      } catch {
        /* keep raw */
      }
      return (
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex max-w-full items-center gap-1 truncate text-primary underline-offset-4 hover:underline"
        >
          <Link2 className="size-3.5 shrink-0" />
          <span className="truncate">{host}</span>
        </a>
      );
    }
  }
  return <span className="break-words font-medium text-foreground">{formatPrimitive(value)}</span>;
}

function LinkCard({ url }: { url: string }) {
  let host = url;
  try {
    host = new URL(url).hostname.replace(/^www\./, "");
  } catch {
    /* keep raw */
  }
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="group flex items-center gap-3 rounded-2xl border border-primary/30 bg-gradient-neon-soft p-4 transition-shadow hover:shadow-glow-cyan"
    >
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/15 text-primary">
        <Link2 className="size-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-semibold">{host}</span>
        <span className="block truncate text-xs text-muted-foreground">{url}</span>
      </span>
      <ExternalLink className="size-4 text-muted-foreground transition-colors group-hover:text-primary" />
    </a>
  );
}

function EmptyNote() {
  return (
    <p className="rounded-xl border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
      Tidak ada hasil untuk input ini. Coba ubah isiannya.
    </p>
  );
}
