import { useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { StatusCard } from "@/components/device-status";
import { SiteFooter, SiteHeader } from "@/components/site-header";
import { ToolCard } from "@/components/tool-card";
import { VideoBanner, VideoBannerSkeleton } from "@/components/video-banner";
import { bannersQueryOptions } from "@/lib/banners-data";
import { paginate } from "@/lib/pagination";
import { childrenOf, topLevelTools, toolsQueryOptions } from "@/lib/tools-data";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Lyy'Tzy — Semua Tools dalam Satu Tempat" },
      {
        name: "description",
        content:
          "Brat, BratVid, QR, translate, IP lookup dan banyak tools lain yang berjalan lewat API.",
      },
      { property: "og:title", content: "Lyy'Tzy — Semua Tools dalam Satu Tempat" },
      {
        property: "og:description",
        content:
          "Brat, BratVid, QR, translate, IP lookup dan banyak tools lain yang berjalan lewat API.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(toolsQueryOptions),
  component: Index,
});

function Index() {
  const { data: tools } = useSuspenseQuery(toolsQueryOptions);
  const [page, setPage] = useState(0);
  const gridRef = useRef<HTMLDivElement>(null);

  const top = useMemo(() => topLevelTools(tools), [tools]);

  // 3 columns × 3 rows per page.
  const paged = paginate(top, page);

  const goToPage = (next: number) => {
    setPage(next);
    gridRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="min-h-dvh">
      <SiteHeader />

      <main className="mx-auto max-w-6xl px-4 sm:px-6">
        <section className="relative pb-8 pt-6 sm:pt-10">
          
          <div className="relative">
            <HomeBanner />

            <div className="mt-6 animate-fade-up [animation-delay:120ms]">
              <StatusCard />
            </div>
          </div>
        </section>

        {top.length === 0 ? (
          <div className="glass rounded-2xl border-dashed py-20 text-center text-muted-foreground">
            Belum ada tools.
          </div>
        ) : (
          <div ref={gridRef} className="scroll-mt-20">
            <div className="grid grid-cols-3 gap-2.5 sm:gap-4">
              {paged.items.map((tool, i) => (
                <ToolCard
                  key={`${tool.id}-${paged.page}`}
                  tool={tool}
                  index={i}
                  childCount={tool.kind === "static" ? childrenOf(tools, tool.id).length : undefined}
                />
              ))}
            </div>

            {paged.pageCount > 1 && (
              <nav
                className="mt-6 flex items-center justify-center gap-3"
                aria-label="Halaman tools"
              >
                <PageButton
                  label="Halaman sebelumnya"
                  disabled={paged.page === 0}
                  onClick={() => goToPage(paged.page - 1)}
                >
                  <ChevronLeft className="size-4" />
                </PageButton>
                <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
                  <span className="text-primary">{paged.page + 1}</span> / {paged.pageCount}
                </span>
                <PageButton
                  label="Halaman berikutnya"
                  disabled={paged.page >= paged.pageCount - 1}
                  onClick={() => goToPage(paged.page + 1)}
                >
                  <ChevronRight className="size-4" />
                </PageButton>
              </nav>
            )}
          </div>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}

function PageButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="grid size-10 place-items-center rounded-xl border border-border glass-field text-muted-foreground transition-[background-color,border-color,color,box-shadow] duration-300 hover:border-primary/40 hover:text-foreground hover:shadow-glow-cyan disabled:pointer-events-none disabled:opacity-35"
    >
      {children}
    </button>
  );
}

function HomeBanner() {
  const { data, isPending } = useQuery(bannersQueryOptions);
  if (isPending) return <VideoBannerSkeleton />;
  if (!data?.length) return null;
  return (
    <div className="animate-fade-up">
      <VideoBanner banners={data} />
    </div>
  );
}
