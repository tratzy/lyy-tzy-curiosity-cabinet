import { useEffect, useRef, useState } from "react";
import { ImagePlus, RefreshCw, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { IMAGE_MAX_BYTES } from "@/lib/tool-request";
import { cn } from "@/lib/utils";

function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1).replace(".", ",")} MB`;
}

/** Image picker for tool inputs: tap or drop a picture, see a preview, change or remove it. */
export function ImageInput({
  id,
  value,
  onChange,
  hint,
  invalid,
}: {
  id: string;
  value: File | null;
  onChange: (file: File | null) => void;
  hint?: string | undefined;
  invalid?: boolean | undefined;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    if (!value) {
      setPreview(null);
      if (inputRef.current) inputRef.current.value = "";
      return;
    }
    const url = URL.createObjectURL(value);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [value]);

  const pick = (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setProblem("File harus berupa gambar (JPG, PNG, WebP).");
      return;
    }
    if (file.size > IMAGE_MAX_BYTES) {
      setProblem("Ukuran gambar maksimal 10 MB.");
      return;
    }
    setProblem(null);
    onChange(file);
  };

  const open = () => inputRef.current?.click();

  return (
    <div className="space-y-1.5">
      <input
        ref={inputRef}
        id={id}
        type="file"
        accept="image/*"
        className="sr-only"
        tabIndex={-1}
        onChange={(e) => pick(e.target.files?.[0])}
      />
      {value && preview ? (
        <div className="glass-inset flex items-center gap-3 rounded-xl border border-border p-2.5 animate-fade-up">
          <div className="relative size-16 shrink-0 overflow-hidden rounded-lg border border-border bg-background/40 sm:size-20">
            <img src={preview} alt="Pratinjau gambar" className="h-full w-full object-cover" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{value.name || "Gambar"}</p>
            <p className="font-mono text-[11px] text-muted-foreground">{formatSize(value.size)}</p>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="mt-1 h-7 px-2 text-xs text-primary"
              onClick={open}
            >
              <RefreshCw /> Ganti
            </Button>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-8 shrink-0 text-muted-foreground hover:text-destructive"
            onClick={() => {
              setProblem(null);
              onChange(null);
            }}
            aria-label="Hapus gambar"
          >
            <X />
          </Button>
        </div>
      ) : (
        <button
          type="button"
          onClick={open}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            pick(e.dataTransfer.files[0]);
          }}
          className={cn(
            "group flex w-full flex-col items-center gap-2 rounded-xl border border-dashed px-4 py-6 text-center transition-colors glass-inset",
            dragging
              ? "border-primary bg-primary/10"
              : invalid || problem
                ? "border-destructive/60"
                : "border-primary/35 hover:border-primary hover:bg-primary/5",
          )}
        >
          <span className="grid size-11 place-items-center rounded-xl border border-primary/30 bg-primary/10 text-primary transition-transform group-hover:-translate-y-0.5">
            <ImagePlus className="size-5" />
          </span>
          <span className="text-sm font-medium">{hint || "Ketuk untuk pilih gambar"}</span>
          <span className="text-xs text-muted-foreground">JPG, PNG, WebP · maks 10 MB</span>
        </button>
      )}
      {problem && <p className="text-xs text-destructive">{problem}</p>}
    </div>
  );
}
