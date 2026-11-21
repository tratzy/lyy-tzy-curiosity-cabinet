import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { PARAM_TYPES, type ParamType, type ToolParam } from "@/lib/tool-request";

const TYPE_LABEL: Record<ParamType, string> = {
  text: "Teks",
  textarea: "Teks panjang",
  number: "Angka",
  url: "URL",
  select: "Pilihan",
  image: "Gambar (upload)",
};

export function ParamsEditor({
  value,
  onChange,
}: {
  value: ToolParam[];
  onChange: (v: ToolParam[]) => void;
}) {
  const update = (i: number, patch: Partial<ToolParam>) =>
    onChange(value.map((p, idx) => (idx === i ? { ...p, ...patch } : p)));

  return (
    <div className="space-y-3">
      {value.map((p, i) => (
        <div key={i} className="space-y-2 rounded-xl border border-border glass-inset p-3">
          <div className="grid grid-cols-2 gap-2">
            <Input
              value={p.key}
              onChange={(e) => update(i, { key: e.target.value.replace(/[^a-zA-Z0-9_]/g, "") })}
              placeholder="key (mis. text)"
              className="font-mono"
              aria-label="Key parameter"
            />
            <Input
              value={p.label}
              onChange={(e) => update(i, { label: e.target.value })}
              placeholder="Label"
              aria-label="Label parameter"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <select
              value={p.type}
              onChange={(e) => update(i, { type: e.target.value as ParamType })}
              className="h-9 rounded-md border border-input bg-background px-2 text-sm text-foreground"
              aria-label="Tipe input"
            >
              {PARAM_TYPES.map((t) => (
                <option key={t} value={t}>
                  {TYPE_LABEL[t]}
                </option>
              ))}
            </select>
            <Input
              value={p.placeholder ?? ""}
              onChange={(e) => update(i, { placeholder: e.target.value })}
              placeholder="Placeholder"
              aria-label="Placeholder"
            />
          </div>
          {p.type === "select" && (
            <Input
              value={(p.options ?? []).join(", ")}
              onChange={(e) =>
                update(i, {
                  options: e.target.value
                    .split(",")
                    .map((s) => s.trim())
                    .filter(Boolean),
                })
              }
              placeholder="Pilihan, pisahkan dengan koma: id, en, ja"
              aria-label="Pilihan"
            />
          )}
          <div className="flex items-center justify-between gap-2">
            <Input
              value={p.default ?? ""}
              onChange={(e) => update(i, { default: e.target.value })}
              placeholder="Nilai default (opsional)"
              className="h-8 max-w-[60%] text-xs"
              aria-label="Nilai default"
            />
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-xs text-muted-foreground">
                <Switch
                  checked={Boolean(p.required)}
                  onCheckedChange={(c) => update(i, { required: c })}
                />{" "}
                Wajib
              </label>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-8 text-muted-foreground hover:text-destructive"
                onClick={() => onChange(value.filter((_, idx) => idx !== i))}
                aria-label="Hapus parameter"
              >
                <Trash2 />
              </Button>
            </div>
          </div>
        </div>
      ))}
      <Button
        type="button"
        variant="glass"
        size="sm"
        className="w-full border-dashed"
        onClick={() => onChange([...value, { key: "", label: "", type: "text", required: true }])}
      >
        <Plus /> Tambah parameter
      </Button>
    </div>
  );
}

export type HeaderRow = { key: string; value: string };

export function HeadersEditor({
  value,
  onChange,
}: {
  value: HeaderRow[];
  onChange: (v: HeaderRow[]) => void;
}) {
  return (
    <div className="space-y-2">
      {value.map((h, i) => (
        <div key={i} className="flex gap-2">
          <Input
            value={h.key}
            onChange={(e) =>
              onChange(value.map((r, idx) => (idx === i ? { ...r, key: e.target.value } : r)))
            }
            placeholder="x-api-key"
            className="font-mono"
            aria-label="Nama header"
          />
          <Input
            value={h.value}
            type="password"
            onChange={(e) =>
              onChange(value.map((r, idx) => (idx === i ? { ...r, value: e.target.value } : r)))
            }
            placeholder="nilai rahasia"
            className="font-mono"
            aria-label="Nilai header"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="shrink-0 text-muted-foreground hover:text-destructive"
            onClick={() => onChange(value.filter((_, idx) => idx !== i))}
            aria-label="Hapus header"
          >
            <Trash2 />
          </Button>
        </div>
      ))}
      <Button
        type="button"
        variant="glass"
        size="sm"
        className="w-full border-dashed"
        onClick={() => onChange([...value, { key: "", value: "" }])}
      >
        <Plus /> Tambah header
      </Button>
    </div>
  );
}
