import { useEffect, useState } from "react";
import { Layers, Loader2, Zap } from "lucide-react";
import { toast } from "sonner";

import { HeadersEditor, ParamsEditor, type HeaderRow } from "@/components/admin/params-editor";
import { IconPicker } from "@/components/admin/icon-picker";
import { resolveIconName } from "@/components/dynamic-icon";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import type { Json, TablesInsert } from "@/integrations/supabase/types";
import {
  BODY_TYPES,
  endpointPlaceholders,
  HTTP_METHODS,
  RESPONSE_TYPES,
  slugify,
  type ToolParam,
} from "@/lib/tool-request";
import { toolParams, type Tool } from "@/lib/tools-data";
import { cn } from "@/lib/utils";

type FormState = {
  kind: "static" | "dynamic";
  parent_id: string | null;
  name: string;
  slug: string;
  description: string;
  icon: string;
  category: string;
  badge: string;
  method: string;
  endpoint: string;
  body_type: string;
  response_type: string;
  params: ToolParam[];
  headers: HeaderRow[];
  is_active: boolean;
  sort_order: number;
};

export type ToolFormTarget =
  | { mode: "create"; kind: "static" | "dynamic"; parentId?: string | null }
  | { mode: "edit"; tool: Tool };

const empty = (
  kind: "static" | "dynamic",
  parentId: string | null,
  category: string,
): FormState => ({
  kind,
  parent_id: parentId,
  name: "",
  slug: "",
  description: "",
  icon: kind === "static" ? "Layers" : "Zap",
  category,
  badge: "",
  method: "GET",
  endpoint: "",
  body_type: "json",
  response_type: "auto",
  params: [],
  headers: [],
  is_active: true,
  sort_order: 0,
});

const RESPONSE_LABEL: Record<string, string> = {
  auto: "Otomatis",
  json: "JSON",
  image: "Gambar",
  video: "Video",
  audio: "Audio",
  text: "Teks",
};

export function ToolFormDialog({
  target,
  tools,
  onClose,
  onSaved,
}: {
  target: ToolFormTarget | null;
  tools: Tool[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<FormState | null>(null);
  const [slugTouched, setSlugTouched] = useState(false);
  const [saving, setSaving] = useState(false);

  const groups = tools.filter((t) => t.kind === "static");
  const categories = Array.from(new Set(tools.map((t) => t.category))).sort();

  useEffect(() => {
    if (!target) setForm(null);
    else if (target.mode === "create") {
      const parent = target.parentId ? tools.find((t) => t.id === target.parentId) : undefined;
      setForm(empty(target.kind, target.parentId ?? null, parent?.category ?? "Tools"));
      setSlugTouched(false);
    } else loadExisting(target.tool);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);

  function loadExisting(t: Tool) {
    setSlugTouched(true);
    setForm({
      kind: t.kind,
      parent_id: t.parent_id,
      name: t.name,
      slug: t.slug,
      description: t.description,
      icon: t.icon,
      category: t.category,
      badge: t.badge ?? "",
      method: t.method,
      endpoint: t.endpoint ?? "",
      body_type: t.body_type,
      response_type: t.response_type,
      params: toolParams(t),
      headers: [],
      is_active: t.is_active,
      sort_order: t.sort_order,
    });
    if (t.kind === "dynamic") {
      supabase
        .from("tool_secrets")
        .select("headers")
        .eq("tool_id", t.id)
        .maybeSingle()
        .then(({ data }) => {
          const h = data?.headers;
          if (h && typeof h === "object" && !Array.isArray(h)) {
            const rows = Object.entries(h).map(([key, value]) => ({
              key,
              value: String(value ?? ""),
            }));
            setForm((f) => (f ? { ...f, headers: rows } : f));
          }
        });
    }
  }

  if (!target || !form) return null;

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => (f ? { ...f, [key]: value } : f));
  const isEdit = target.mode === "edit";
  const isDynamic = form.kind === "dynamic";
  const hasBody = !["GET", "DELETE"].includes(form.method);
  const missingPlaceholders = endpointPlaceholders(form.endpoint).filter(
    (k) => !form.params.some((p) => p.key === k),
  );

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error("Nama tool wajib diisi.");
      return;
    }
    const slug = slugify(form.slug || form.name);
    if (!slug) {
      toast.error("Slug tidak valid.");
      return;
    }
    const icon = resolveIconName(form.icon);
    if (!icon) {
      toast.error("Nama ikon Lucide tidak ditemukan.");
      return;
    }
    if (isDynamic) {
      try {
        const u = new URL(form.endpoint.replace(/\{[a-zA-Z0-9_]+\}/g, "x"));
        if (!["http:", "https:"].includes(u.protocol)) throw new Error();
      } catch {
        {
          toast.error("Endpoint harus URL lengkap (https://…).");
          return;
        }
      }
      const keys = form.params.map((p) => p.key.trim());
      if (keys.some((k) => !k)) {
        toast.error("Semua parameter wajib punya key.");
        return;
      }
      if (new Set(keys).size !== keys.length) {
        toast.error("Key parameter tidak boleh sama.");
        return;
      }
    }

    setSaving(true);
    const payload: TablesInsert<"tools"> = {
      kind: form.kind,
      parent_id: isDynamic ? form.parent_id : null,
      name: form.name.trim(),
      slug,
      description: form.description.trim(),
      icon,
      category: form.category.trim() || "Tools",
      badge: form.badge.trim() || null,
      method: form.method,
      endpoint: isDynamic ? form.endpoint.trim() : null,
      body_type: form.body_type,
      response_type: form.response_type,
      params: (isDynamic
        ? form.params.map((p) => ({
            ...p,
            key: p.key.trim(),
            label: p.label.trim() || p.key.trim(),
          }))
        : []) as unknown as Json,
      is_active: form.is_active,
      sort_order: Number.isFinite(form.sort_order) ? form.sort_order : 0,
    };

    try {
      let id: string;
      if (isEdit) {
        const { error } = await supabase.from("tools").update(payload).eq("id", target.tool.id);
        if (error) throw error;
        id = target.tool.id;
      } else {
        const { data, error } = await supabase.from("tools").insert(payload).select("id").single();
        if (error) throw error;
        id = data.id;
      }

      const headers = Object.fromEntries(
        form.headers.filter((h) => h.key.trim()).map((h) => [h.key.trim(), h.value]),
      );
      if (isDynamic && Object.keys(headers).length > 0) {
        const { error } = await supabase.from("tool_secrets").upsert({ tool_id: id, headers });
        if (error) throw error;
      } else if (isEdit) {
        await supabase.from("tool_secrets").delete().eq("tool_id", id);
      }

      toast.success(isEdit ? "Tool diperbarui" : "Tool ditambahkan");
      onSaved();
      onClose();
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : String((err as { message?: string })?.message ?? err);
      toast.error(msg.includes("duplicate") ? "Slug sudah dipakai tool lain." : msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92dvh] w-[calc(100vw-1.5rem)] max-w-2xl overflow-y-auto border-border bg-popover p-0 sm:rounded-2xl">
        <form onSubmit={save}>
          <DialogHeader className="sticky top-0 z-10 border-b border-border bg-popover/95 px-5 py-4 text-left">
            <DialogTitle className="font-display tracking-wide">
              {isEdit ? "Edit Tool" : "Tambah Tool"}
            </DialogTitle>
            <DialogDescription>
              {isDynamic
                ? "Tool dinamis menjalankan satu endpoint API."
                : "Tool statis adalah grup yang berisi beberapa tools."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 px-5 py-5">
            {!isEdit && !form.parent_id && (
              <div className="grid grid-cols-2 gap-2">
                {(
                  [
                    { k: "dynamic", label: "Dinamis", desc: "1 endpoint", Icon: Zap },
                    { k: "static", label: "Statis", desc: "Grup berisi tools", Icon: Layers },
                  ] as const
                ).map(({ k, label, desc, Icon }) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => set("kind", k)}
                    className={cn(
                      "flex items-center gap-3 rounded-xl border p-3 text-left transition-[border-color,box-shadow,background-color]",
                      form.kind === k
                        ? "border-primary/60 bg-primary/10 shadow-glow-cyan"
                        : "border-border hover:border-primary/30",
                    )}
                  >
                    <Icon
                      className={cn(
                        "size-5",
                        form.kind === k ? "text-primary" : "text-muted-foreground",
                      )}
                    />
                    <span>
                      <span className="block text-sm font-semibold">{label}</span>
                      <span className="block text-xs text-muted-foreground">{desc}</span>
                    </span>
                  </button>
                ))}
              </div>
            )}

            <Section title="Info">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Nama">
                  <Input
                    value={form.name}
                    onChange={(e) => {
                      set("name", e.target.value);
                      if (!slugTouched) set("slug", slugify(e.target.value));
                    }}
                    placeholder="Brat Generator"
                    required
                  />
                </Field>
                <Field label="Slug (URL)">
                  <Input
                    value={form.slug}
                    onChange={(e) => {
                      setSlugTouched(true);
                      set("slug", slugify(e.target.value));
                    }}
                    placeholder="brat-generator"
                    className="font-mono"
                  />
                </Field>
              </div>
              <Field label="Deskripsi">
                <Textarea
                  value={form.description}
                  onChange={(e) => set("description", e.target.value)}
                  rows={2}
                  className="resize-none"
                  placeholder="Penjelasan singkat tool"
                />
              </Field>
              <div className="grid gap-3 sm:grid-cols-3">
                <Field label="Kategori">
                  <Input
                    value={form.category}
                    onChange={(e) => set("category", e.target.value)}
                    list="tool-categories"
                    placeholder="Maker"
                  />
                  <datalist id="tool-categories">
                    {categories.map((c) => (
                      <option key={c} value={c} />
                    ))}
                  </datalist>
                </Field>
                <Field label="Badge">
                  <Input
                    value={form.badge}
                    onChange={(e) => set("badge", e.target.value)}
                    placeholder="GIF / HD / AI"
                  />
                </Field>
                <Field label="Urutan">
                  <Input
                    type="number"
                    value={form.sort_order}
                    onChange={(e) => set("sort_order", Number(e.target.value))}
                  />
                </Field>
              </div>
              <Field label="Ikon (nama ikon Lucide React)">
                <IconPicker value={form.icon} onChange={(v) => set("icon", v)} />
              </Field>
            </Section>

            {isDynamic && (
              <>
                <Section title="Endpoint">
                  <Field label="Masuk ke grup statis">
                    <select
                      value={form.parent_id ?? ""}
                      onChange={(e) => set("parent_id", e.target.value || null)}
                      className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground"
                    >
                      <option value="">— Tidak (tampil di beranda) —</option>
                      {groups.map((g) => (
                        <option key={g.id} value={g.id}>
                          {g.name}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <div className="grid grid-cols-[110px_1fr] gap-2">
                    <Field label="Metode">
                      <select
                        value={form.method}
                        onChange={(e) => set("method", e.target.value)}
                        className="h-9 w-full rounded-md border border-input bg-background px-2 font-mono text-sm font-semibold text-primary"
                      >
                        {HTTP_METHODS.map((m) => (
                          <option key={m} value={m}>
                            {m}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="URL Endpoint">
                      <Input
                        value={form.endpoint}
                        onChange={(e) => set("endpoint", e.target.value)}
                        placeholder="https://api.contoh.com/brat"
                        className="font-mono text-xs"
                        required
                      />
                    </Field>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Tulis <code className="font-mono text-primary">{"{key}"}</code> di URL untuk
                    parameter path (mis. <code className="font-mono">/user/{"{username}"}</code>).
                    Parameter lain dikirim sebagai {hasBody ? "body" : "query string"}.
                  </p>
                  {missingPlaceholders.length > 0 && (
                    <p className="text-xs text-warning">
                      Belum ada parameter untuk: {missingPlaceholders.join(", ")}
                    </p>
                  )}
                  <div className="grid grid-cols-2 gap-2">
                    {hasBody && (
                      <Field label="Format body">
                        <select
                          value={form.body_type}
                          onChange={(e) => set("body_type", e.target.value)}
                          className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm text-foreground"
                        >
                          {BODY_TYPES.map((b) => (
                            <option key={b} value={b}>
                              {b === "json" ? "JSON" : b === "form" ? "Form" : "Query string"}
                            </option>
                          ))}
                        </select>
                      </Field>
                    )}
                    <Field label="Jenis hasil">
                      <select
                        value={form.response_type}
                        onChange={(e) => set("response_type", e.target.value)}
                        className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm text-foreground"
                      >
                        {RESPONSE_TYPES.map((r) => (
                          <option key={r} value={r}>
                            {RESPONSE_LABEL[r]}
                          </option>
                        ))}
                      </select>
                    </Field>
                  </div>
                </Section>

                <Section title="Parameter input">
                  <ParamsEditor value={form.params} onChange={(v) => set("params", v)} />
                </Section>

                <Section title="Header rahasia (opsional)">
                  <p className="text-xs text-muted-foreground">
                    Untuk API key. Disimpan aman dan tidak terlihat oleh pengunjung.
                  </p>
                  <HeadersEditor value={form.headers} onChange={(v) => set("headers", v)} />
                </Section>
              </>
            )}

            <label className="flex items-center justify-between rounded-xl border border-border p-3">
              <span>
                <span className="block text-sm font-medium">Aktif</span>
                <span className="block text-xs text-muted-foreground">
                  Tool nonaktif disembunyikan dari pengunjung
                </span>
              </span>
              <Switch checked={form.is_active} onCheckedChange={(c) => set("is_active", c)} />
            </label>
          </div>

          <div className="sticky bottom-0 flex gap-2 border-t border-border bg-popover/95 px-5 py-4">
            <Button type="button" variant="glass" className="flex-1" onClick={onClose}>
              Batal
            </Button>
            <Button type="submit" variant="neon" className="flex-1" disabled={saving}>
              {saving && <Loader2 className="animate-spin" />} Simpan
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h3 className="font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">
        {title}
      </h3>
      {children}
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
