import { useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Boxes,
  ExternalLink,
  Eye,
  Film,
  ImageIcon,
  Layers,
  LogOut,
  Pencil,
  Plus,
  Search,
  ShieldAlert,
  Trash2,
  Zap,
} from "lucide-react";
import { toast } from "sonner";

import { BackgroundManager } from "@/components/admin/background-manager";
import { BannerManager } from "@/components/admin/banner-manager";
import { ToolFormDialog, type ToolFormTarget } from "@/components/admin/tool-form-dialog";
import { DynamicIcon } from "@/components/dynamic-icon";
import { InfinityMark } from "@/components/infinity-mark";
import { MiniLoader } from "@/components/mini-loader";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { adminToolsQueryOptions, childrenOf, type Tool } from "@/lib/tools-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Panel Admin — Lyy'Tzy" },
      { name: "description", content: "Kelola tools, endpoint, metode, dan ikon di Lyy'Tzy." },
      { property: "og:title", content: "Panel Admin — Lyy'Tzy" },
      {
        property: "og:description",
        content: "Kelola tools, endpoint, metode, dan ikon di Lyy'Tzy.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  const { isAdmin, loading, username } = useAuth();
  const navigate = useNavigate();

  const signOut = async () => {
    await supabase.auth.signOut();
    void navigate({ to: "/" });
  };

  if (loading) {
    return (
      <div className="grid min-h-dvh place-items-center">
        <MiniLoader label="Memeriksa akses" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="grid min-h-dvh place-items-center px-4">
        <div className="glass max-w-sm rounded-3xl p-8 text-center">
          <ShieldAlert className="mx-auto size-10 text-accent" />
          <h1 className="mt-4 text-xl font-bold">Bukan akun admin</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Akun “{username}” tidak punya akses ke panel admin.
          </p>
          <div className="mt-6 flex gap-2">
            <Button asChild variant="glass" className="flex-1">
              <Link to="/">Beranda</Link>
            </Button>
            <Button variant="neon" className="flex-1" onClick={signOut}>
              Keluar
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return <AdminDashboard username={username} onSignOut={signOut} />;
}

function AdminDashboard({
  username,
  onSignOut,
}: {
  username: string | null;
  onSignOut: () => void;
}) {
  const queryClient = useQueryClient();
  const { data: tools = [], isLoading } = useQuery(adminToolsQueryOptions);
  const [target, setTarget] = useState<ToolFormTarget | null>(null);
  const [toDelete, setToDelete] = useState<Tool | null>(null);
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<"tools" | "banner" | "background">("tools");

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["tools"] });

  const stats = {
    total: tools.length,
    groups: tools.filter((t) => t.kind === "static").length,
    dynamic: tools.filter((t) => t.kind === "dynamic").length,
    inactive: tools.filter((t) => !t.is_active).length,
  };

  const q = query.trim().toLowerCase();
  const matches = (t: Tool) =>
    !q || `${t.name} ${t.slug} ${t.endpoint ?? ""} ${t.category}`.toLowerCase().includes(q);
  const top = useMemo(
    () =>
      tools
        .filter((t) => !t.parent_id)
        .filter((t) => matches(t) || childrenOf(tools, t.id).some(matches)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tools, q],
  );

  const toggleActive = async (tool: Tool, active: boolean) => {
    queryClient.setQueryData<Tool[]>(adminToolsQueryOptions.queryKey, (old) =>
      old?.map((t) => (t.id === tool.id ? { ...t, is_active: active } : t)),
    );
    const { error } = await supabase.from("tools").update({ is_active: active }).eq("id", tool.id);
    if (error) toast.error(error.message);
    void refresh();
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    const { error } = await supabase.from("tools").delete().eq("id", toDelete.id);
    if (error) toast.error(error.message);
    else toast.success(`“${toDelete.name}” dihapus`);
    setToDelete(null);
    void refresh();
  };

  return (
    <div className="min-h-dvh pb-16">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/75 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2.5">
            <InfinityMark className="h-7 w-12" detailed={false} />
            <span className="font-display text-sm font-bold tracking-[0.18em]">
              <span className="text-gradient-neon">ADMIN</span>
            </span>
          </Link>
          <div className="flex items-center gap-2">
            <span className="hidden font-mono text-xs text-muted-foreground sm:inline">
              @{username}
            </span>
            <Button asChild variant="glass" size="sm">
              <Link to="/">
                <Eye /> <span className="hidden sm:inline">Lihat web</span>
              </Link>
            </Button>
            <Button variant="glass" size="sm" onClick={onSignOut} aria-label="Keluar">
              <LogOut />
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 pt-8 sm:px-6">
        <div className="mb-6 inline-grid grid-cols-3 gap-1 rounded-xl bg-secondary/60 p-1">
          {(
            [
              { k: "tools", label: "Tools", Icon: Boxes },
              { k: "banner", label: "Banner", Icon: Film },
              { k: "background", label: "Latar", Icon: ImageIcon },
            ] as const
          ).map(({ k, label, Icon }) => (
            <button
              key={k}
              type="button"
              onClick={() => setTab(k)}
              className={cn(
                "flex items-center justify-center gap-2 rounded-lg px-3 py-2 sm:px-5 text-sm font-medium transition-[background-color,color,box-shadow] duration-300",
                tab === k
                  ? "bg-background text-primary shadow-glow-cyan"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className="size-4" /> {label}
            </button>
          ))}
        </div>

        {tab === "background" ? (
          <div className="animate-fade-up">
            <h1 className="text-3xl font-bold tracking-tight">Latar Belakang</h1>
            <p className="mb-6 mt-1 text-sm text-muted-foreground">
              Gambar ini tampil di belakang semua halaman web.
            </p>
            <BackgroundManager />
          </div>
        ) : tab === "banner" ? (
          <div className="animate-fade-up">
            <h1 className="text-3xl font-bold tracking-tight">Banner Video</h1>
            <p className="mb-6 mt-1 text-sm text-muted-foreground">
              Video aktif diputar di bagian atas beranda.
            </p>
            <BannerManager />
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between animate-fade-up">
              <div>
                <h1 className="text-3xl font-bold tracking-tight">Kelola Tools</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  Tambah tools statis (grup) atau dinamis (endpoint API).
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="glass"
                  onClick={() => setTarget({ mode: "create", kind: "static" })}
                >
                  <Layers /> Grup Statis
                </Button>
                <Button
                  variant="neon"
                  onClick={() => setTarget({ mode: "create", kind: "dynamic" })}
                >
                  <Plus /> Tool Dinamis
                </Button>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 animate-fade-up [animation-delay:80ms]">
              <StatCard icon={<Boxes />} label="Total tools" value={stats.total} />
              <StatCard icon={<Layers />} label="Grup statis" value={stats.groups} />
              <StatCard icon={<Zap />} label="Dinamis" value={stats.dynamic} />
              <StatCard icon={<Eye />} label="Nonaktif" value={stats.inactive} />
            </div>

            <label className="group relative mt-6 flex items-center">
              <Search className="pointer-events-none absolute left-3 size-4 text-muted-foreground group-focus-within:text-primary" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Cari nama, slug, atau endpoint…"
                className="h-11 w-full rounded-xl border border-border bg-surface/70 pl-9 pr-3 text-sm outline-none transition-[border-color,box-shadow] focus:border-primary/60 focus:shadow-glow-cyan"
              />
            </label>

            <div className="mt-4 space-y-3">
              {isLoading ? (
                <MiniLoader className="py-16" label="Memuat tools" />
              ) : top.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border py-16 text-center text-muted-foreground">
                  Belum ada tools.
                </div>
              ) : (
                top.map((tool) => (
                  <div key={tool.id} className="glass overflow-hidden rounded-2xl animate-fade-up">
                    <ToolRow
                      tool={tool}
                      onEdit={() => setTarget({ mode: "edit", tool })}
                      onDelete={() => setToDelete(tool)}
                      onToggle={(a) => toggleActive(tool, a)}
                    />
                    {tool.kind === "static" && (
                      <div className="border-t border-border/60 bg-background/30">
                        {childrenOf(tools, tool.id)
                          .filter((c) => !q || matches(c) || matches(tool))
                          .map((child) => (
                            <ToolRow
                              key={child.id}
                              tool={child}
                              nested
                              onEdit={() => setTarget({ mode: "edit", tool: child })}
                              onDelete={() => setToDelete(child)}
                              onToggle={(a) => toggleActive(child, a)}
                            />
                          ))}
                        <button
                          type="button"
                          onClick={() =>
                            setTarget({ mode: "create", kind: "dynamic", parentId: tool.id })
                          }
                          className="flex w-full items-center gap-2 py-3 pl-12 pr-4 text-sm text-muted-foreground transition-colors hover:bg-primary/5 hover:text-primary sm:pl-16"
                        >
                          <Plus className="size-4" /> Tambah tool ke {tool.name}
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </main>

      <ToolFormDialog
        target={target}
        tools={tools}
        onClose={() => setTarget(null)}
        onSaved={refresh}
      />

      <AlertDialog open={Boolean(toDelete)} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent className="border-border bg-popover">
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus “{toDelete?.name}”?</AlertDialogTitle>
            <AlertDialogDescription>
              {toDelete?.kind === "static"
                ? "Semua tools di dalam grup ini juga akan terhapus. Tindakan ini tidak bisa dibatalkan."
                : "Tool ini akan dihapus permanen."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="glass rounded-2xl p-4">
      <div className="text-primary [&_svg]:size-4">{icon}</div>
      <p className="mt-2 font-display text-2xl font-bold">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function ToolRow({
  tool,
  nested,
  onEdit,
  onDelete,
  onToggle,
}: {
  tool: Tool;
  nested?: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onToggle: (active: boolean) => void;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 px-4 py-3 transition-colors hover:bg-primary/5",
        nested && "border-b border-border/40 pl-8 sm:pl-12",
        !tool.is_active && "opacity-55",
      )}
    >
      <div
        className={cn(
          "grid size-10 shrink-0 place-items-center rounded-xl border",
          tool.kind === "static"
            ? "border-accent/40 bg-accent/10 text-accent"
            : "border-primary/30 bg-primary/10 text-primary",
        )}
      >
        <DynamicIcon name={tool.icon} className="size-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate font-medium">{tool.name}</p>
          <span
            className={cn(
              "shrink-0 rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase",
              tool.kind === "static" ? "bg-accent/15 text-accent" : "bg-primary/15 text-primary",
            )}
          >
            {tool.kind === "static" ? "Statis" : tool.method}
          </span>
        </div>
        <p className="truncate font-mono text-[11px] text-muted-foreground">
          {tool.kind === "static" ? `/${tool.slug} · ${tool.category}` : tool.endpoint}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <Switch
          checked={tool.is_active}
          onCheckedChange={onToggle}
          aria-label="Aktifkan tool"
          className="mr-1"
        />
        <Button
          asChild
          variant="ghost"
          size="icon"
          className="hidden text-muted-foreground hover:text-primary sm:inline-flex"
          aria-label="Buka tool"
        >
          <Link to="/tool/$slug" params={{ slug: tool.slug }}>
            <ExternalLink />
          </Link>
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="text-muted-foreground hover:text-primary"
          onClick={onEdit}
          aria-label="Edit tool"
        >
          <Pencil />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="text-muted-foreground hover:text-destructive"
          onClick={onDelete}
          aria-label="Hapus tool"
        >
          <Trash2 />
        </Button>
      </div>
    </div>
  );
}
