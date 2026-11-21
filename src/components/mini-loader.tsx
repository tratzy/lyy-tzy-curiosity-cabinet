import { InfinityMark } from "@/components/infinity-mark";
import { cn } from "@/lib/utils";

export function MiniLoader({ className, label }: { className?: string; label?: string }) {
  return (
    <div className={cn("flex flex-col items-center gap-3", className)} role="status">
      <InfinityMark className="h-12 w-24" detailed={false} />
      {label && (
        <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
          {label}
        </span>
      )}
    </div>
  );
}
