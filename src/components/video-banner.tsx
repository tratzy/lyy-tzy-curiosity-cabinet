import { useEffect, useRef, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";

import type { Banner } from "@/lib/banners-data";
import { cn } from "@/lib/utils";

/** Home banner: plays admin-uploaded videos; with several, moves to the next when one ends. */
export function VideoBanner({ banners }: { banners: Banner[] }) {
  const playable = banners.filter((b) => b.url);
  const [index, setIndex] = useState(0);
  const [muted, setMuted] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);

  const current = playable[index % Math.max(playable.length, 1)];

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = muted;
    void v.play().catch(() => {
      /* autoplay blocked: stays on first frame */
    });
  }, [index, muted]);

  if (!current?.url) return null;

  const multiple = playable.length > 1;
  const video = (
    <video
      key={current.id}
      ref={videoRef}
      src={current.url}
      autoPlay
      muted={muted}
      playsInline
      loop={!multiple}
      preload="auto"
      onEnded={() => multiple && setIndex((i) => (i + 1) % playable.length)}
      className="absolute inset-0 h-full w-full object-cover animate-in fade-in duration-500"
    />
  );

  return (
    <div className="neon-border group relative overflow-hidden rounded-3xl border border-border/70 bg-surface shadow-card">
      <div className="relative aspect-video w-full sm:aspect-[21/9]">
        {current.link_url ? (
          <a
            href={current.link_url}
            target="_blank"
            rel="noreferrer"
            aria-label={current.title ?? "Buka banner"}
          >
            {video}
          </a>
        ) : (
          video
        )}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-background/70 to-transparent" />

        <button
          type="button"
          onClick={() => setMuted((m) => !m)}
          className="glass absolute bottom-3 right-3 z-10 grid size-9 place-items-center rounded-full text-foreground transition-colors hover:text-primary"
          aria-label={muted ? "Nyalakan suara" : "Matikan suara"}
        >
          {muted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
        </button>

        {multiple && (
          <div className="absolute bottom-4 left-4 z-10 flex gap-1.5">
            {playable.map((b, i) => (
              <button
                key={b.id}
                type="button"
                onClick={() => setIndex(i)}
                className={cn(
                  "h-1.5 rounded-full transition-[width,background-color] duration-300",
                  i === index ? "w-6 bg-primary shadow-glow-cyan" : "w-1.5 bg-foreground/40",
                )}
                aria-label={`Banner ${i + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function VideoBannerSkeleton() {
  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-3xl border border-border/70 bg-surface sm:aspect-[21/9]">
      <div className="animate-shimmer absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-foreground/5 to-transparent" />
    </div>
  );
}
