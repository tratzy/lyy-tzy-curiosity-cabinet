import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";

import { SiteFooter, SiteHeader } from "@/components/site-header";
import { ToolCard } from "@/components/tool-card";
import { cn } from "@/lib/utils";
import { categoriesOf, childrenOf, toolsInCategory, toolsQueryOptions } from "@/lib/tools-data";

type Search = { c?: string };

export const Route = createFileRoute("/kategori")({
  validateSearch: (search: Record<string, unknown>): Search =>
    typeof search["c"] === "string" && search["c"] ? { c: search["c"] } : {},
  head: () => ({
    meta: [
      { title: "Kategori Tools — Lyy'Tzy" },
      { name: "description", content: "Jelajahi semua tools Lyy'Tzy berdasarkan kategori." },
      { property: "og:title", content: "Kategori Tools — Lyy'Tzy" },
      { property: "og:description", content: "Jelajahi semua tools Lyy'Tzy berdasarkan kategori." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(toolsQueryOptions),
  component: CategoryPage,
});

function CategoryPage() {
  const { c } = Route.useSearch();
  const { data: tools } = useSuspenseQuery(toolsQueryOptions);
  const categories = categoriesOf(tools);
  const shown = c ? categories.filter((cat) => cat.name === c) : categories;

  return (
    <div className="min-h-dvh">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 pt-8 sm:px-6">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-primary"
        >
          <ArrowLeft className="size-4" /> Dashboard
        </Link>
        <h1 className="mt-4 font-display text-2xl font-bold tracking-wide sm:text-3xl">
          <span className="text-gradient-neon">Kategori</span>
        </h1>

        <div className="mt-5 flex gap-2 overflow-x-auto pb-2" role="tablist" aria-label="Pilih kategori">
          <Chip active={!c} label="Semua" />
          {categories.map((cat) => (
            <Chip key={cat.name} active={c === cat.name} label={cat.name} value={cat.name} />
          ))}
        </div>

        {shown.length === 0 ? (
          <div className="glass mt-6 rounded-2xl py-16 text-center text-muted-foreground">
            Kategori tidak ditemukan.
          </div>
        ) : (
          <div className="mt-6 flex flex-col gap-10">
            {shown.map((cat) => (
              <section key={cat.name} className="animate-fade-up">
                <div className="mb-3 flex items-baseline justify-between gap-3">
                  <h2 className="font-display text-sm font-semibold uppercase tracking-[0.2em] text-foreground">
                    {cat.name}
                  </h2>
                  <span className="font-mono text-[11px] text-muted-foreground">{cat.count} tools</span>
                </div>
                <div className="grid grid-cols-3 gap-2.5 sm:gap-4">
                  {toolsInCategory(tools, cat.name).map((tool, i) => (
                    <ToolCard
                      key={tool.id}
                      tool={tool}
                      index={i}
                      childCount={tool.kind === "static" ? childrenOf(tools, tool.id).length : undefined}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}

function Chip({ active, label, value }: { active: boolean; label: string; value?: string }) {
  return (
    <Link
      to="/kategori"
      search={value ? { c: value } : {}}
      role="tab"
      aria-selected={active}
      className={cn(
        "shrink-0 rounded-full border px-4 py-1.5 text-xs font-medium transition-colors",
        active
          ? "border-primary/50 bg-secondary text-primary shadow-glow-cyan"
          : "glass-inset text-muted-foreground hover:text-foreground",
      )}
    >
      {label}
    </Link>
  );
}
