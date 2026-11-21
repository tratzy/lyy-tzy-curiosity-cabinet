import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ImageIcon, Loader2, Save, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";

import { MiniLoader } from "@/components/mini-loader";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { supabase } from "@/integrations/supabase/client";
import {
  BACKGROUND_MAX_BYTES,
  SITE_ASSETS_BUCKET,
  siteSettingsQueryOptions,
} from "@/lib/site-settings";

export function BackgroundManager() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery(siteSettingsQueryOptions);
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [dim, setDim] = useState(60);
  const [busy, setBusy] = useState<"upload" | "dim" | "remove" | null>(null);

  useEffect(() => {
    if (data) setDim(data.dim);
  }, [data]);

  useEffect(() => {
    if (!file) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["site-settings"] });

  const pick = (f: File | undefined) => {
    if (!f) return;
    if (!f.type.startsWith("image/")) {
      toast.error("File harus gambar (JPG, PNG, atau WebP).");
      return;
    }
    if (f.size > BACKGROUND_MAX_BYTES) {
      toast.error("Ukuran gambar maksimal 10 MB.");
      return;
    }
    setFile(f);
  };

  const save = async () => {
    if (!file) return;
    setBusy("upload");
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `background/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from(SITE_ASSETS_BUCKET)
        .upload(path, file, { contentType: file.type, cacheControl: "31536000" });
      if (upErr) throw upErr;
      const { error } = await supabase
        .from("site_settings")
        .update({ background_path: path, background_dim: dim, updated_at: new Date().toISOString() })
        .eq("id", 1);
      if (error) {
        await supabase.storage.from(SITE_ASSETS_BUCKET).remove([path]);
        throw error;
      }
      if (data?.backgroundPath) {
        await supabase.storage.from(SITE_ASSETS_BUCKET).remove([data.backgroundPath]);
      }
      toast.success("Latar belakang diganti");
      setFile(null);
      if (fileRef.current) fileRef.current.value = "";
      void refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload gagal");
    } finally {
      setBusy(null);
    }
  };

  const saveDim = async () => {
    setBusy("dim");
    const { error } = await supabase
      .from("site_settings")
      .update({ background_dim: dim, updated_at: new Date().toISOString() })
      .eq("id", 1);
    setBusy(null);
    if (error) toast.error(error.message);
    else {
      toast.success("Kegelapan disimpan");
      void refresh();
    }
  };

  const remove = async () => {
    if (!data?.backgroundPath || !window.confirm("Hapus latar belakang custom?")) return;
    setBusy("remove");
    const { error } = await supabase
      .from("site_settings")
      .update({ background_path: null, updated_at: new Date().toISOString() })
      .eq("id", 1);
    if (error) {
      setBusy(null);
      toast.error(error.message);
      return;
    }
    await supabase.storage.from(SITE_ASSETS_BUCKET).remove([data.backgroundPath]);
    setBusy(null);
    toast.success("Latar belakang dihapus");
    void refresh();
  };

  if (isLoading) return <MiniLoader className="py-12" label="Memuat pengaturan" />;

  const shown = preview ?? data?.backgroundUrl ?? null;
  const dimChanged = data ? dim !== data.dim : false;

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <div className="glass space-y-3 rounded-2xl p-4">
        <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
          Pratinjau
        </p>
        <div className="relative aspect-[9/12] overflow-hidden rounded-xl border border-border bg-background sm:aspect-video">
          {shown ? (
            <>
              <img src={shown} alt="" className="absolute inset-0 h-full w-full object-cover" />
              <div className="absolute inset-0 bg-background" style={{ opacity: dim / 100 }} />
            </>
          ) : (
            <div className="absolute inset-0 bg-grid" />
          )}
          <div className="relative flex h-full flex-col justify-end gap-2 p-4">
            <div className="glass rounded-xl p-3">
              <p className="text-sm font-semibold">Contoh kartu</p>
              <p className="text-xs text-muted-foreground">Teks harus tetap mudah dibaca.</p>
            </div>
          </div>
          {preview && (
            <span className="absolute left-3 top-3 rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold text-primary-foreground">
              Belum disimpan
            </span>
          )}
        </div>
      </div>

      <div className="glass flex flex-col gap-5 rounded-2xl p-5">
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
          <ImageIcon className="size-6 text-primary" />
          <span className="text-sm font-medium">
            {file ? file.name : "Pilih atau taruh gambar latar"}
          </span>
          <span className="text-xs text-muted-foreground">
            {file
              ? `${(file.size / 1024 / 1024).toFixed(1)} MB`
              : "JPG, PNG, WebP · maks 10 MB · gambar tegak bagus untuk HP"}
          </span>
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif"
          className="hidden"
          onChange={(e) => pick(e.target.files?.[0])}
        />

        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span>Kegelapan lapisan</span>
            <span className="font-mono text-xs text-primary">{dim}%</span>
          </div>
          <Slider
            value={[dim]}
            min={0}
            max={95}
            step={5}
            onValueChange={(v) => setDim(v[0] ?? dim)}
            aria-label="Kegelapan lapisan"
          />
          <p className="text-xs text-muted-foreground">
            Makin gelap, makin mudah teks dibaca di atas gambar.
          </p>
        </div>

        <div className="mt-auto flex flex-col gap-2 sm:flex-row">
          {file ? (
            <Button variant="neon" className="flex-1" onClick={save} disabled={busy !== null}>
              {busy === "upload" ? <Loader2 className="animate-spin" /> : <Upload />}
              {busy === "upload" ? "Mengupload…" : "Simpan latar"}
            </Button>
          ) : (
            <Button
              variant="neon"
              className="flex-1"
              onClick={saveDim}
              disabled={busy !== null || !dimChanged}
            >
              {busy === "dim" ? <Loader2 className="animate-spin" /> : <Save />} Simpan kegelapan
            </Button>
          )}
          {file && (
            <Button variant="glass" onClick={() => setFile(null)} disabled={busy !== null}>
              Batal
            </Button>
          )}
          {data?.backgroundPath && !file && (
            <Button
              variant="glass"
              className="hover:text-destructive"
              onClick={remove}
              disabled={busy !== null}
            >
              {busy === "remove" ? <Loader2 className="animate-spin" /> : <Trash2 />} Hapus latar
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
