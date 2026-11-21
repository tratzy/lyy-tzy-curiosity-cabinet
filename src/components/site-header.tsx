import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, Home, LayoutGrid, Menu, ShieldCheck } from "lucide-react";

import { InfinityMark } from "@/components/infinity-mark";
import { Sheet, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useAuth } from "@/hooks/use-auth";
import { categoriesOf, toolsQueryOptions } from "@/lib/tools-data";
import { cn } from "@/lib/utils";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 px-3 pt-3 sm:px-6">
      <div className="glass-bar liquid-sheen relative mx-auto flex h-14 max-w-6xl items-center justify-between rounded-2xl px-3 sm:h-16 sm:px-5">
        <Link to="/" className="group relative z-10 flex items-center gap-2.5">
          <InfinityMark
            className="h-7 w-12 transition-transform duration-500 group-hover:scale-110"
            detailed={false}
          />
          <span className="font-display text-base font-bold tracking-[0.18em]">
            <span className="text-gradient-neon">LYY&apos;TZY</span>
          </span>
        </Link>

        <nav className="relative z-10 flex items-center gap-2">
          <span className="hidden items-center gap-2 glass-inset rounded-full border px-3 py-1 font-mono text-[11px] uppercase tracking-widest text-muted-foreground sm:flex">
            <span className="size-1.5 animate-pulse rounded-full bg-success" />
            Online
          </span>
          <SiteMenu />
        </nav>
      </div>
    </header>
  );
}

const itemCls =
  "flex w-full items-center gap-3 rounded-xl border border-transparent px-3 py-3 text-sm font-medium text-foreground transition-colors hover:border-primary/30 hover:bg-secondary hover:text-primary";
const activeCls = "border-primary/40 bg-secondary text-primary";

function SiteMenu() {
  const [open, setOpen] = useState(false);
  const [showCats, setShowCats] = useState(false);
  const { user } = useAuth();
  const { data: tools = [] } = useQuery(toolsQueryOptions);
  const categories = categoriesOf(tools);
  const close = () => setOpen(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        aria-label="Buka menu"
        className="glass grid size-10 place-items-center rounded-xl text-foreground transition-colors hover:border-primary/50 hover:text-primary"
      >
        <Menu className="size-5" />
      </SheetTrigger>
      <SheetContent side="right" className="flex w-[82vw] max-w-xs flex-col gap-0 rounded-l-3xl p-0">
        <div className="flex items-center gap-2.5 border-b border-border px-5 py-5">
          <InfinityMark className="h-6 w-10" detailed={false} />
          <div>
            <SheetTitle className="font-display text-sm font-bold tracking-[0.18em]">
              <span className="text-gradient-neon">LYY&apos;TZY</span>
            </SheetTitle>
            <SheetDescription className="text-xs">Menu navigasi</SheetDescription>
          </div>
        </div>

        <nav className="flex flex-1 flex-col gap-1.5 overflow-y-auto p-3" aria-label="Menu utama">
          <Link
            to="/"
            onClick={close}
            className={itemCls}
            activeProps={{ className: activeCls }}
            activeOptions={{ exact: true }}
          >
            <Home className="size-4.5" /> Dashboard
          </Link>

          <button
            type="button"
            onClick={() => setShowCats((v) => !v)}
            aria-expanded={showCats}
            className={itemCls}
          >
            <LayoutGrid className="size-4.5" /> Category
            <ChevronDown
              className={cn("ml-auto size-4 transition-transform duration-300", showCats && "rotate-180")}
            />
          </button>
          {showCats && (
            <div className="ml-4 flex flex-col gap-1 border-l border-border pl-3 animate-fade-up">
              <Link
                to="/kategori"
                onClick={close}
                className="rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-primary"
              >
                Semua kategori
              </Link>
              {categories.map((c) => (
                <Link
                  key={c.name}
                  to="/kategori"
                  search={{ c: c.name }}
                  onClick={close}
                  className="flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-primary"
                >
                  <span className="truncate">{c.name}</span>
                  <span className="font-mono text-[10px] text-muted-foreground">{c.count}</span>
                </Link>
              ))}
            </div>
          )}

          <Link
            to={user ? "/admin" : "/auth"}
            onClick={close}
            className={itemCls}
            activeProps={{ className: activeCls }}
          >
            <ShieldCheck className="size-4.5" /> Admin Panel
          </Link>
        </nav>
      </SheetContent>
    </Sheet>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-24 px-3 pb-4 sm:px-6">
      <div className="glass-bar mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 rounded-2xl px-4 py-6 text-sm text-muted-foreground sm:flex-row sm:px-6">
        <p>
          <span className="font-display tracking-widest text-foreground">LYY&apos;TZY</span> · Multi
          Tools
        </p>
      </div>
    </footer>
  );
}
