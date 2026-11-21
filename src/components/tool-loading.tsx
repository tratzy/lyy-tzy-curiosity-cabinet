import { useEffect, useState } from "react";

import { DynamicIcon } from "@/components/dynamic-icon";

const MEDIA_STEPS = ["Menyiapkan kanvas", "Meracik hasil", "Memoles detail", "Hampir jadi"];
const DATA_STEPS = ["Membaca isianmu", "Memproses data", "Menyusun hasil", "Hampir selesai"];

/**
 * Lively loader shown while a tool runs: spinning neon rings around the tool icon,
 * rotating status lines, a running timer and shimmering placeholders.
 * Keeps its motion even when the device asks for reduced motion (data-keep-motion).
 */
export function ToolLoading({ icon, media }: { icon: string | null; media: boolean }) {
  const steps = media ? MEDIA_STEPS : DATA_STEPS;
  const [ms, setMs] = useState(0);

  useEffect(() => {
    const started = performance.now();
    const id = window.setInterval(() => setMs(performance.now() - started), 100);
    return () => window.clearInterval(id);
  }, []);

  const step = Math.min(Math.floor(ms / 1800), steps.length - 1);
  const message = ms > 15_000 ? "Masih bekerja, sebentar lagi" : steps[step];

  return (
    <div
      data-keep-motion
      role="status"
      aria-live="polite"
      className="flex flex-col items-center gap-6 py-4 animate-fade-up"
    >
      <div className="relative size-36 sm:size-40">
        <div className="tl-glow absolute -inset-6 rounded-full" />
        <div className="tl-ring tl-ring-a" />
        <div className="tl-ring tl-ring-b" />
        <div className="tl-ring tl-ring-c" />
        <div className="tl-orbit" style={{ ["--dur" as string]: "2.6s" }}>
          <span className="tl-dot" style={{ ["--c" as string]: "var(--neon-cyan)" }} />
        </div>
        <div
          className="tl-orbit"
          style={{ ["--dur" as string]: "3.8s", ["--dir" as string]: "reverse", inset: "18px" }}
        >
          <span className="tl-dot" style={{ ["--c" as string]: "var(--neon-pink)" }} />
        </div>
        <div className="absolute inset-0 grid place-items-center">
          <div className="tl-core grid size-14 place-items-center rounded-2xl border border-primary/40 bg-background/70 text-primary shadow-glow-cyan backdrop-blur">
            <DynamicIcon name={icon ?? undefined} className="size-6" />
          </div>
        </div>
      </div>

      <div className="flex flex-col items-center gap-3 text-center">
        <p key={message} className="tl-msg text-sm font-semibold text-foreground">
          {message}
          <span className="ml-0.5 inline-flex gap-0.5">
            <span className="loader-dot">.</span>
            <span className="loader-dot [animation-delay:0.2s]">.</span>
            <span className="loader-dot [animation-delay:0.4s]">.</span>
          </span>
        </p>
        <div className="relative h-1.5 w-56 overflow-hidden rounded-full bg-secondary">
          <div className="tl-bar" />
        </div>
        <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
          {(ms / 1000).toFixed(1).replace(".", ",")} dtk
        </span>
      </div>

      <div className="w-full space-y-2.5" aria-hidden>
        <div className="tl-skel h-16 rounded-xl" />
        <div className="grid grid-cols-2 gap-2.5">
          <div className="tl-skel h-12 rounded-xl [animation-delay:0.15s]" />
          <div className="tl-skel h-12 rounded-xl [animation-delay:0.3s]" />
        </div>
      </div>
    </div>
  );
}
