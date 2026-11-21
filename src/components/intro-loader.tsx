import { useEffect, useRef, useState } from "react";

import { InfinityMark } from "@/components/infinity-mark";

const DURATION_MS = 3000;
const PARTICLES = Array.from({ length: 14 }, (_, i) => ({
  left: `${8 + ((i * 53) % 84)}%`,
  bottom: `${10 + ((i * 29) % 30)}%`,
  dx: `${((i * 37) % 60) - 30}px`,
  dur: `${4.5 + ((i * 7) % 40) / 10}s`,
  delay: `${((i * 13) % 30) / 10}s`,
  pink: i % 3 === 0,
}));

const statusFor = (pct: number) =>
  pct >= 100
    ? "Siap digunakan"
    : pct >= 70
      ? "Hampir siap"
      : pct >= 35
        ? "Menghubungkan endpoint"
        : "Menyiapkan tools";

/**
 * First-load splash. Progress is written straight to the DOM through refs (no React
 * re-render per frame) so the bar and the light tracing the infinity stay at 60fps.
 */
export function IntroLoader() {
  const [phase, setPhase] = useState<"loading" | "exit" | "done">("loading");
  const barRef = useRef<HTMLDivElement>(null);
  const pctRef = useRef<HTMLSpanElement>(null);
  const statusRef = useRef<HTMLSpanElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const orbRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const total = DURATION_MS;
    const startedAt = performance.now();
    let raf = 0;
    let lastStatus = "";
    document.documentElement.style.overflow = "hidden";

    const tick = (now: number) => {
      const t = Math.min(1, (now - startedAt) / total);
      // easeInOutCubic so it feels like real loading
      const eased = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      const pct = Math.round(eased * 100);
      if (barRef.current) barRef.current.style.transform = `scaleX(${eased})`;
      orbRef.current?.style.setProperty("--p", eased.toFixed(4));
      if (pctRef.current) pctRef.current.textContent = `${pct}%`;
      trackRef.current?.setAttribute("aria-valuenow", String(pct));
      const status = statusFor(pct);
      if (status !== lastStatus && statusRef.current) {
        statusRef.current.textContent = status;
        lastStatus = status;
      }
      if (t < 1) raf = requestAnimationFrame(tick);
      else window.setTimeout(() => setPhase("exit"), 250);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    if (phase !== "exit") return;
    const id = window.setTimeout(() => {
      setPhase("done");
      document.documentElement.style.overflow = "";
    }, 700);
    return () => window.clearTimeout(id);
  }, [phase]);

  if (phase === "done") return null;

  return (
    <div
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center overflow-hidden bg-background ${
        phase === "exit" ? "loader-exit pointer-events-none" : ""
      }`}
      role="status"
      aria-live="polite"
      data-keep-motion
    >
      <div className="absolute inset-0 bg-grid opacity-60" />
      <div className="absolute left-1/2 top-1/2 h-[28rem] w-[28rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-neon-soft blur-3xl" />

      {PARTICLES.map((p, i) => (
        <span
          key={i}
          className={`loader-particle absolute size-1 rounded-full ${p.pink ? "bg-neon-pink" : "bg-neon-cyan"}`}
          style={{
            left: p.left,
            bottom: p.bottom,
            ["--dx" as string]: p.dx,
            ["--dur" as string]: p.dur,
            ["--delay" as string]: p.delay,
          }}
        />
      ))}

      <div className="relative flex w-full max-w-md flex-col items-center px-8">
        <InfinityMark progressRef={orbRef} className="w-[min(82vw,360px)]" />

        <p className="mt-10 text-center font-display text-sm tracking-[0.25em] text-foreground sm:text-base">
          <span className="text-gradient-neon font-bold">LYY&apos;TZY</span>{" "}
          <span className="text-muted-foreground">sedang memuat</span>
          <span className="loader-dot text-neon-cyan">.</span>
          <span className="loader-dot text-neon-cyan [animation-delay:0.2s]">.</span>
          <span className="loader-dot text-neon-cyan [animation-delay:0.4s]">.</span>
        </p>

        <div className="mt-6 w-full max-w-[280px]">
          <div
            ref={trackRef}
            className="relative h-1.5 w-full overflow-hidden rounded-full bg-secondary"
            role="progressbar"
            aria-label="Progres memuat"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={0}
          >
            <div
              ref={barRef}
              className="absolute inset-0 origin-left rounded-full bg-gradient-neon shadow-glow-cyan will-change-transform"
              style={{ transform: "scaleX(0)" }}
            />
            <div className="animate-shimmer absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-foreground/40 to-transparent" />
          </div>
          <div className="mt-3 flex items-center justify-between font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
            <span ref={statusRef}>Menyiapkan tools</span>
            <span ref={pctRef} className="text-neon-cyan">
              0%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
