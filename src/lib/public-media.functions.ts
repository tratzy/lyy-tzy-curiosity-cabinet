import { createServerFn } from "@tanstack/react-start";

import type { Tables } from "@/integrations/supabase/types";

const BANNER_LINK_TTL_SECONDS = 60 * 60 * 6;
const BACKGROUND_LINK_TTL_SECONDS = 60 * 60 * 24;

export type PublicBanner = Tables<"banners"> & { url: string | null };
export type PublicBackground = { path: string | null; url: string | null; dim: number | null };

// Visitors cannot read the private buckets directly. The server signs links only for
// files the site currently shows: active banners and the chosen background image.
export const getActiveBanners = createServerFn({ method: "GET" }).handler(
  async (): Promise<PublicBanner[]> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin.from("banners").select("*").eq("is_active", true);
    if (error) throw new Error("Gagal memuat banner");
    const rows = data ?? [];
    if (rows.length === 0) return [];
    const { data: signed } = await supabaseAdmin.storage
      .from("banners")
      .createSignedUrls(
        rows.map((r) => r.video_path),
        BANNER_LINK_TTL_SECONDS,
      );
    const byPath = new Map((signed ?? []).map((s) => [s.path, s.signedUrl]));
    return rows.map((r) => ({ ...r, url: byPath.get(r.video_path) ?? null }));
  },
);

export const getSiteBackground = createServerFn({ method: "GET" }).handler(
  async (): Promise<PublicBackground> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("site_settings")
      .select("background_path, background_dim")
      .eq("id", 1)
      .maybeSingle();
    if (error) throw new Error("Gagal memuat pengaturan");
    const path = data?.background_path ?? null;
    let url: string | null = null;
    if (path) {
      const { data: signed } = await supabaseAdmin.storage
        .from("site-assets")
        .createSignedUrl(path, BACKGROUND_LINK_TTL_SECONDS);
      url = signed?.signedUrl ?? null;
    }
    return { path, url, dim: data?.background_dim ?? null };
  },
);
