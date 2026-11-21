import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { siteSettingsQueryOptions } from "@/lib/site-settings";

/**
 * Fixed full-screen backdrop for the glass UI: drifting color blobs that the frosted panels
 * refract, plus the background image chosen in the admin panel (with a readability overlay).
 */
export function SiteBackground() {
  const { data } = useQuery(siteSettingsQueryOptions);
  const url = data?.backgroundUrl ?? null;
  const [loadedUrl, setLoadedUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!url) return;
    const img = new Image();
    img.onload = () => setLoadedUrl(url);
    img.src = url;
  }, [url]);

  const dim = (data?.dim ?? 60) / 100;

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <AmbientBlobs />
      {url && (
        <div
          className="absolute inset-0 transition-opacity duration-1000"
          style={{ opacity: loadedUrl === url ? 1 : 0 }}
        >
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url("${url}")` }}
          />
          <div className="absolute inset-0 bg-background" style={{ opacity: dim }} />
          <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-transparent to-background/80" />
        </div>
      )}
    </div>
  );
}

const BLOBS = [
  { cls: "left-[-12%] top-[-8%] size-[55vmax]", color: "var(--blob-a)", dur: "28s", dx: "10vw", dy: "8vh", delay: "0s" },
  { cls: "right-[-18%] top-[18%] size-[48vmax]", color: "var(--blob-b)", dur: "34s", dx: "-12vw", dy: "10vh", delay: "-6s" },
  { cls: "bottom-[-20%] left-[15%] size-[52vmax]", color: "var(--blob-c)", dur: "30s", dx: "8vw", dy: "-10vh", delay: "-12s" },
] as const;

function AmbientBlobs() {
  return (
    <div className="absolute inset-0 opacity-70">
      {BLOBS.map((b, i) => (
        <span
          key={i}
          className={`ambient-blob ${b.cls}`}
          style={
            {
              background: `radial-gradient(circle at 50% 50%, ${b.color}, transparent 68%)`,
              "--dur": b.dur,
              "--dx": b.dx,
              "--dy": b.dy,
              "--delay": b.delay,
            } as React.CSSProperties
          }
        />
      ))}
      <div className="absolute inset-0 bg-grid opacity-40" />
    </div>
  );
}
