import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ArrowLeft, Layers } from "lucide-react";

import { DynamicIcon } from "@/components/dynamic-icon";
import { SiteFooter, SiteHeader } from "@/components/site-header";
import { ToolCard } from "@/components/tool-card";
import { ToolRunner } from "@/components/tool-runner";
import { childrenOf, toolsQueryOptions } from "@/lib/tools-data";

export const Route = createFileRoute("/tool/$slug")({
  loader: async ({ context, params }) => {
    const tools = await context.queryClient.ensureQueryData(toolsQueryOptions);
    const tool = tools.find((t) => t.slug === params.slug);
    if (!tool) throw notFound();
    return { name: tool.name, description: tool.description };
  },
  head: ({ loaderData }) => {
    const title = loaderData ? `${loaderData.name} — Lyy'Tzy Tools` : "Tool — Lyy'Tzy";
    const description = loaderData?.description || "Jalankan tool ini langsung di Lyy'Tzy.";
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
    };
  },
  notFoundComponent: ToolNotFound,
  component: ToolPage,
});

function ToolPage() {
  const { slug } = Route.useParams();
  const { data: tools } = useSuspenseQuery(toolsQueryOptions);
  const tool = tools.find((t) => t.slug === slug);
  if (!tool) return <ToolNotFound />;

  const parent = tool.parent_id ? tools.find((t) => t.id === tool.parent_id) : undefined;
  const subTools = tool.kind === "static" ? childrenOf(tools, tool.id) : [];

  return (
    <div className="min-h-dvh">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 pt-8 sm:px-6">
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 transition-colors hover:text-primary"
          >
            <ArrowLeft className="size-4" /> Beranda
          </Link>
          {parent && (
            <>
              <span>/</span>
              <Link
                to="/tool/$slug"
                params={{ slug: parent.slug }}
                className="transition-colors hover:text-primary"
              >
                {parent.name}
              </Link>
            </>
          )}
        </div>

        <header className="mt-6 flex flex-col gap-5 sm:flex-row sm:items-center animate-fade-up">
          <div className="grid size-16 shrink-0 place-items-center rounded-2xl border border-primary/40 bg-gradient-neon-soft text-primary shadow-glow-cyan">
            <DynamicIcon name={tool.icon} className="size-7" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{tool.name}</h1>
              {tool.badge && (
                <span className="rounded-md border border-border bg-secondary px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                  {tool.badge}
                </span>
              )}
            </div>
            <p className="mt-1 text-muted-foreground">{tool.description}</p>
          </div>
        </header>

        <div className="mt-6 animate-fade-up [animation-delay:140ms]">
          {tool.kind === "static" ? (
            subTools.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border py-16 text-center text-muted-foreground">
                Belum ada tools di grup ini.
              </div>
            ) : (
              <>
                <p className="mb-4 flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-accent">
                  <Layers className="size-4" /> {subTools.length} tools di dalam {tool.name}
                </p>
                <div className="grid grid-cols-3 gap-2.5 sm:gap-4">
                  {subTools.map((t, i) => (
                    <ToolCard key={t.id} tool={t} index={i} />
                  ))}
                </div>
              </>
            )
          ) : (
            <ToolRunner key={tool.id} tool={tool} />
          )}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

function ToolNotFound() {
  return (
    <div className="min-h-dvh">
      <SiteHeader />
      <main className="mx-auto flex max-w-md flex-col items-center px-4 py-24 text-center">
        <h1 className="font-display text-5xl font-bold text-gradient-neon">404</h1>
        <p className="mt-3 text-muted-foreground">Tool ini tidak ditemukan atau sedang nonaktif.</p>
        <Link to="/" className="mt-6 text-primary underline-offset-4 hover:underline">
          Kembali ke beranda
        </Link>
      </main>
    </div>
  );
}
