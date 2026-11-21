import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Film, Loader2, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";

import { MiniLoader } from "@/components/mini-loader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import {
  adminBannersQueryOptions,
  BANNER_BUCKET,
  BANNER_MAX_BYTES,
  type Banner,
} from "@/lib/banners-data";

export function BannerManager() {
  const queryClient = useQueryClient();
  const { data: banners = [], isLoading } = useQuery(adminBannersQueryOptions);
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [link, setLink] = useState("");
  const [uploading, setUploading] = useState(false);

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["banners"] });

  const pick = (f: File | undefined) => {
    if (!f) return;
    if (!f.type.startsWith("video/")) {
      toast.error("File harus video (MP4).");
      return;
    }
    if (f.size > BANNER_MAX_BYTES) {
      toast.error("Ukuran video maksimal 50 MB.");
      return;
    }
    setFile(f);
  };

  const upload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      toast.error("Pilih video dulu.");
      return;
    }
    if (link && !/^https?:\/\//i.test(link)) {
      toast.error("Link harus diawali https://");
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "mp4";
      const path = `${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from(BANNER_BUCKET)
        .upload(path, file, { contentType: file.type || "video/mp4", cacheControl: "31536000" });
      if (upErr) throw upErr;
      const { error } = await supabase.from("banners").insert({
        video_path: path,
        title: title.trim() || null,
        link_url: link.trim() || null,
        sort_order: banners.length,
      });
      if (error) {
        await supabase.storage.from(BANNER_BUCKET).remove([path]);
        throw error;
      }
      toast.success("Banner diupload");
      setFile(null);
      setTitle("");
      setLink("");
      if (fileRef.current) fileRef.current.value = "";
      void refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload gagal");
    } finally {
      setUploading(false);
    }
  };

  const toggle = async (b: Banner, active: boolean) => {
    const { error } = await supabase.from("banners").update({ is_active: active }).eq("id", b.id);
    if (error) toast.error(error.message);
    void refresh();
  };

  const remove = async (b: Banner) => {
    if (!window.confirm("Hapus banner ini?")) return;
    const { error } = await supabase.from("banners").delete().eq("id", b.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    await supabase.storage.from(BANNER_BUCKET).remove([b.video_path]);
    toast.success("Banner dihapus");
    void refresh();
  };

  return (
    <div className="space-y-5">
      <form onSubmit={upload} className="glass space-y-4 rounded-2xl p-5">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            pick(e.dataTransfer.files[0]);
          }}
          className="flex w-full flex-col items-center gap-2 rounded-xl border border-dashed border-primary/40 bg-primary/5 px-4 py-8 text-center transition-colors hover:border-primary hover:bg-primary/10"
        >
          <Upload className="size-6 text-primary" />
          <span className="text-sm font-medium">
            {file ? file.name : "Pilih atau taruh video MP4"}
          </span>
          <span className="text-xs text-muted-foreground">
            {file
              ? `${(file.size / 1024 / 1024).toFixed(1)} MB`
              : "Maks 50 MB · rasio 16:9 atau 21:9 paling pas"}
          </span>
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="video/mp4,video/webm,video/quicktime"
          className="hidden"
          onChange={(e) => pick(e.target.files?.[0])}
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">
              Judul (opsional, hanya untuk admin)
            </Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Promo November"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Link saat diklik (opsional)</Label>
            <Input value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://…" />
          </div>
        </div>
        <Button type="submit" variant="neon" className="w-full" disabled={uploading || !file}>
          {uploading ? <Loader2 className="animate-spin" /> : <Upload />}
          {uploading ? "Mengupload…" : "Upload Banner"}
        </Button>
      </form>

      {isLoading ? (
        <MiniLoader className="py-12" label="Memuat banner" />
      ) : banners.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border py-12 text-center text-sm text-muted-foreground">
          Belum ada banner. Banner aktif akan diputar di bagian atas beranda.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {banners.map((b) => (
            <div key={b.id} className="glass overflow-hidden rounded-2xl animate-fade-up">
              <div className="relative aspect-video bg-background">
                {b.url ? (
                  <video
                    src={b.url}
                    muted
                    loop
                    playsInline
                    autoPlay
                    preload="metadata"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="grid h-full place-items-center text-muted-foreground">
                    <Film />
                  </div>
                )}
              </div>
              <div className="flex items-center gap-3 p-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{b.title || "Tanpa judul"}</p>
                  <p className="truncate font-mono text-[11px] text-muted-foreground">
                    {b.link_url || "tanpa link"}
                  </p>
                </div>
                <Switch
                  checked={b.is_active}
                  onCheckedChange={(c) => toggle(b, c)}
                  aria-label="Tampilkan banner"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground hover:text-destructive"
                  onClick={() => remove(b)}
                  aria-label="Hapus banner"
                >
                  <Trash2 />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
