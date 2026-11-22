import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  imageSendMode,
  PARAM_TYPES,
  type ImageSendMode,
  type ParamType,
  type ToolParam,
} from "@/lib/tool-request";

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
  filesAllowed = true,
}: {
  value: ToolParam[];
  onChange: (v: ToolParam[]) => void;
  /** False when the tool's method/body cannot carry a file (GET, DELETE, query). */
  filesAllowed?: boolean;
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
              placeholder={p.type === "image" ? "Petunjuk (mis. Pilih foto wajah)" : "Placeholder"}
              aria-label="Placeholder"
            />
          </div>
          {p.type === "image" && (
            <div className="space-y-1.5">
              <select
                value={imageSendMode(p)}
                onChange={(e) => update(i, { send_as: e.target.value as ImageSendMode })}
                className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm text-foreground"
                aria-label="Cara kirim gambar"
              >
                <option value="url">Kirim sebagai link gambar sementara</option>
                <option value="file">Kirim sebagai file langsung</option>
              </select>
              {imageSendMode(p) === "file" && !filesAllowed ? (
                <p className="text-xs text-warning">
                  Metode GET/DELETE atau body "query" tidak bisa membawa file, jadi gambar akan
                  dikirim sebagai link. Pakai POST dengan body JSON/form untuk mengirim file.
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  {imageSendMode(p) === "file"
                    ? "Gambar dikirim sebagai file (multipart/form-data) dengan nama field = key."
                    : "Gambar diunggah dulu, lalu link-nya (berlaku 1 jam) dikirim sebagai nilai key."}
                </p>
              )}
            </div>
          )}
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
            {p.type === "image" ? (
              <span />
            ) : (
              <Input
                value={p.default ?? ""}
                onChange={(e) => update(i, { default: e.target.value })}
                placeholder="Nilai default (opsional)"
                className="h-8 max-w-[60%] text-xs"
                aria-label="Nilai default"
              />
            )}
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
