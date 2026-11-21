import { queryOptions } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";

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

// The bucket is private (workspace blocks public buckets), so the image loads through a signed link.
export const siteSettingsQueryOptions = queryOptions({
  queryKey: ["site-settings"],
  queryFn: async (): Promise<SiteSettings> => {
    const { data, error } = await supabase
      .from("site_settings")
      .select("background_path, background_dim")
      .eq("id", 1)
      .maybeSingle();
    if (error) throw new Error(error.message);
    const path = data?.background_path ?? null;
    let url: string | null = null;
    if (path) {
      const { data: signed } = await supabase.storage
        .from(SITE_ASSETS_BUCKET)
        .createSignedUrl(path, LINK_TTL_SECONDS);
      url = signed?.signedUrl ?? null;
    }
    return { backgroundPath: path, backgroundUrl: url, dim: data?.background_dim ?? DEFAULT_BACKGROUND_DIM };
  },
  staleTime: 1000 * 60 * 30,
});
