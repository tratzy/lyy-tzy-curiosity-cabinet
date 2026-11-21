import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { siteSettingsQueryOptions } from "@/lib/site-settings";

/** Fixed full-screen background image chosen in the admin panel, with a readability overlay. */
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

  if (!url) return null;
  const dim = (data?.dim ?? 60) / 100;

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 transition-opacity duration-1000"
      style={{ opacity: loadedUrl === url ? 1 : 0 }}
    >
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url("${url}")` }}
      />
      <div className="absolute inset-0 bg-background" style={{ opacity: dim }} />
      <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-transparent to-background/80" />
    </div>
  );
}
