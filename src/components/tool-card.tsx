import { Link } from "@tanstack/react-router";
import { ArrowUpRight, Layers, Play } from "lucide-react";

import { DynamicIcon } from "@/components/dynamic-icon";
import type { Tool } from "@/lib/tools-data";

/**
 * Tool tile for the 3-column grid. Three bands: a card header (category + badge/arrow),
 * a body (icon, name, description) and a footer (group size or a "Coba" cue).
 * Sized to stay readable at ~100px wide on phones; the description only shows from `sm` up.
 */
export function ToolCard({
  tool,
  childCount,
  index = 0,
}: {
  tool: Tool;
  childCount?: number | undefined;
  index?: number;
}) {
  const isGroup = tool.kind === "static";
  return (
    <Link
      to="/tool/$slug"
      params={{ slug: tool.slug }}
      className="neon-border liquid-sheen group relative flex min-w-0 flex-col overflow-hidden rounded-xl border border-border bg-gradient-card shadow-card backdrop-blur-xl backdrop-saturate-150 transition-transform duration-300 ease-out hover:-translate-y-1 focus-visible:outline-none animate-fade-up sm:rounded-2xl"
      style={{ animationDelay: `${Math.min(index, 12) * 45}ms` }}
    >
      <div className="pointer-events-none absolute -right-10 -top-10 size-32 rounded-full bg-gradient-neon opacity-0 blur-3xl transition-opacity duration-500 group-hover:opacity-25" />

      {/* Card header */}
      <div
        data-slot="card-header"
        className="relative flex items-center justify-between gap-1.5 border-b border-border/70 bg-secondary/60 px-2 py-1.5 sm:px-4 sm:py-2.5"
      >
        <span className="flex min-w-0 items-center gap-1.5 font-mono text-[9px] font-medium uppercase tracking-wider text-muted-foreground sm:text-[10px]">
          <span className="size-1.5 shrink-0 rounded-full bg-primary shadow-glow-cyan" />
          <span className="truncate">{tool.category}</span>
        </span>
        <span className="flex shrink-0 items-center gap-1">
          {tool.badge && (
            <span className="hidden rounded-full border border-border bg-secondary px-1.5 py-px font-mono text-[9px] font-medium uppercase tracking-wider text-muted-foreground sm:inline">
              {tool.badge}
            </span>
          )}
          <ArrowUpRight className="size-3.5 text-muted-foreground transition-[transform,color] duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-primary sm:size-4" />
        </span>
      </div>

      {/* Body */}
      <div className="relative flex flex-1 flex-col items-center gap-2 p-2.5 text-center sm:items-start sm:gap-3 sm:p-4 sm:text-left">
        <div className="grid size-10 shrink-0 place-items-center rounded-lg border border-border bg-gradient-neon-soft text-primary shadow-card transition-[box-shadow,color] duration-300 group-hover:text-accent group-hover:shadow-glow-pink sm:size-12 sm:rounded-xl">
          <DynamicIcon name={tool.icon} className="size-5" />
        </div>
        <div className="min-w-0 max-w-full">
          <h3 className="line-clamp-2 text-xs font-semibold leading-snug text-foreground sm:text-base">
            {tool.name}
          </h3>
          <p className="mt-1 hidden line-clamp-2 text-sm text-muted-foreground sm:block">
            {tool.description || "—"}
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className="relative flex items-center justify-center gap-2 border-t border-border/50 px-2 py-1.5 font-mono text-[9px] uppercase tracking-wider sm:justify-start sm:px-4 sm:py-2 sm:text-[11px]">
        {isGroup ? (
          <span className="flex items-center gap-1 text-accent sm:gap-1.5">
            <Layers className="size-3 sm:size-3.5" /> {childCount ?? 0} tools
          </span>
        ) : (
          <span className="flex items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 text-primary">
            <Play className="size-2.5 fill-current sm:size-3" /> Coba
          </span>
        )}
      </div>
    </Link>
  );
}
