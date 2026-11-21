import { useMemo, useState } from "react";
import { Check, TriangleAlert } from "lucide-react";

import { DynamicIcon, ICON_NAMES, resolveIconName } from "@/components/dynamic-icon";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const POPULAR = [
  "Sparkles",
  "Wrench",
  "Image",
  "Film",
  "Music",
  "Download",
  "Type",
  "QrCode",
  "Globe",
  "Bot",
  "Languages",
  "Camera",
  "Zap",
  "Shield",
  "Code",
  "Gamepad2",
];

export function IconPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const resolved = resolveIconName(value);
  const q = value
    .trim()
    .toLowerCase()
    .replace(/[-_\s]/g, "");

  const suggestions = useMemo(() => {
    if (!q) return POPULAR;
    const starts: string[] = [];
    const contains: string[] = [];
    for (const name of ICON_NAMES) {
      const n = name.toLowerCase();
      if (n.startsWith(q)) starts.push(name);
      else if (n.includes(q)) contains.push(name);
      if (starts.length >= 40) break;
    }
    return [...starts, ...contains].slice(0, 40);
  }, [q]);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <div
          className={cn(
            "grid size-10 shrink-0 place-items-center rounded-lg border",
            resolved
              ? "border-primary/50 bg-primary/10 text-primary"
              : "border-destructive/50 bg-destructive/10 text-destructive",
          )}
        >
          {resolved ? (
            <DynamicIcon name={resolved} className="size-5" />
          ) : (
            <TriangleAlert className="size-4" />
          )}
        </div>
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setOpen(true)}
          placeholder="Contoh: Sparkles, QrCode, file-text"
          className="font-mono"
        />
      </div>
      <p className="text-xs text-muted-foreground">
        {resolved ? (
          <>
            Ikon Lucide: <span className="font-mono text-primary">{resolved}</span>
          </>
        ) : (
          "Nama ikon tidak ditemukan di Lucide — pilih dari saran di bawah."
        )}
      </p>
      {open && (
        <div className="grid max-h-48 grid-cols-6 gap-1.5 overflow-y-auto rounded-xl border border-border bg-background/60 p-2 sm:grid-cols-8">
          {suggestions.map((name) => (
            <button
              key={name}
              type="button"
              title={name}
              onClick={() => onChange(name)}
              className={cn(
                "relative grid aspect-square place-items-center rounded-lg border border-transparent text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary",
                resolved === name && "border-primary/60 bg-primary/10 text-primary",
              )}
            >
              <DynamicIcon name={name} className="size-4" />
              {resolved === name && <Check className="absolute right-0.5 top-0.5 size-2.5" />}
            </button>
          ))}
          {suggestions.length === 0 && (
            <p className="col-span-full py-3 text-center text-xs text-muted-foreground">
              Tidak ada ikon cocok.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
