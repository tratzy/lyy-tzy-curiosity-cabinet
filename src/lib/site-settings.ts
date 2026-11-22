import { queryOptions } from "@tanstack/react-query";

import { getSiteBackground } from "@/lib/public-media.functions";

export const SITE_ASSETS_BUCKET = "site-assets";
export const BACKGROUND_MAX_BYTES = 10 * 1024 * 1024;
export const DEFAULT_BACKGROUND_DIM = 60;
const LINK_TTL_SECONDS = 60 * 60 * 24;

export type SiteSettings = {
  backgroundPath: string | null;
  backgroundUrl: string | null;
  /** 0..95 — how strongly the page colour covers the image, so text stays readable. */
  dim: number;
};

// The bucket is private, so the image loads through a link the server signs for the current background only.
export const siteSettingsQueryOptions = queryOptions({
  queryKey: ["site-settings"],
  queryFn: async (): Promise<SiteSettings> => {
    const bg = await getSiteBackground();
    return { backgroundPath: bg.path, backgroundUrl: bg.url, dim: bg.dim ?? DEFAULT_BACKGROUND_DIM };
  },
  staleTime: 1000 * 60 * 30,
});
