import { Link } from "@tanstack/react-router";
import { LayoutDashboard, LogIn } from "lucide-react";

import { InfinityMark } from "@/components/infinity-mark";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";

export function SiteHeader() {
  const { isAdmin, user } = useAuth();

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link to="/" className="group flex items-center gap-2.5">
          <InfinityMark
            className="h-7 w-12 transition-transform duration-500 group-hover:scale-110"
            detailed={false}
          />
          <span className="font-display text-base font-bold tracking-[0.18em]">
            <span className="text-gradient-neon">LYY&apos;TZY</span>
          </span>
        </Link>

        <nav className="flex items-center gap-2">
          <span className="hidden items-center gap-2 rounded-full border border-border/70 px-3 py-1 font-mono text-[11px] uppercase tracking-widest text-muted-foreground sm:flex">
            <span className="size-1.5 animate-pulse rounded-full bg-success" />
            Online
          </span>
          {isAdmin ? (
            <Button asChild variant="glass" size="sm">
              <Link to="/admin">
                <LayoutDashboard /> Admin
              </Link>
            </Button>
          ) : (
            <Button asChild variant="glass" size="sm">
              <Link to={user ? "/admin" : "/auth"}>
                <LogIn /> Admin
              </Link>
            </Button>
          )}
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-border/60">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:px-6">
        <p>
          <span className="font-display tracking-widest text-foreground">LYY&apos;TZY</span> · Multi
          Tools
        </p>
      </div>
    </footer>
  );
}
