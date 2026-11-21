import { queryOptions } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export const BANNER_BUCKET = "banners";
export const BANNER_MAX_BYTES = 50 * 1024 * 1024;
const LINK_TTL_SECONDS = 60 * 60 * 6;

export type Banner = Tables<"banners"> & { url: string | null };

// The bucket is private (workspace blocks public buckets), so videos play through signed links.
async function withSignedUrls(rows: Tables<"banners">[]): Promise<Banner[]> {
  if (rows.length === 0) return [];
  const { data } = await supabase.storage.from(BANNER_BUCKET).createSignedUrls(
    rows.map((r) => r.video_path),
    LINK_TTL_SECONDS,
  );
  const byPath = new Map((data ?? []).map((d) => [d.path, d.signedUrl]));
  return rows.map((r) => ({ ...r, url: byPath.get(r.video_path) ?? null }));
}

const order = (a: Tables<"banners">, b: Tables<"banners">) =>
  a.sort_order - b.sort_order || b.created_at.localeCompare(a.created_at);

export const bannersQueryOptions = queryOptions({
  queryKey: ["banners", "public"],
  queryFn: async (): Promise<Banner[]> => {
    const { data, error } = await supabase.from("banners").select("*").eq("is_active", true);
    if (error) throw new Error(error.message);
    return withSignedUrls((data ?? []).sort(order));
  },
  staleTime: 1000 * 60 * 30,
});

export const adminBannersQueryOptions = queryOptions({
  queryKey: ["banners", "admin"],
  queryFn: async (): Promise<Banner[]> => {
    const { data, error } = await supabase.from("banners").select("*");
    if (error) throw new Error(error.message);
    return withSignedUrls((data ?? []).sort(order));
  },
});
