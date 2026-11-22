import { useEffect, useRef, useState } from "react";
import {
  ChevronDown,
  Download,
  Eye,
  Heart,
  Layers,
  MessageCircle,
  Play,
  Share2,
  Sparkles,
  Volume2,
  VolumeX,
  Wand2,
  ExternalLink,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  formatCompact,
  formatDuration,
  type MediaCard,
  type MediaCardLink,
  type MediaCardStat,
} from "@/lib/result-format";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 4;

/** 2×2 grid of video cards, four at a time. */
export function MediaCardGrid({ cards }: { cards: MediaCard[] }) {
  const [shown, setShown] = useState(PAGE_SIZE);
  const visible = cards.slice(0, shown);
  const left = cards.length - shown;
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
        {visible.map((card, i) => (
          <MediaCardView key={`${card.video}-${i}`} card={card} index={i} />
        ))}
      </div>
      {left > 0 && (
        <Button
          type="button"
          variant="glass"
          size="sm"
          className="w-full"
          onClick={() => setShown((n) => n + PAGE_SIZE)}
        >
          <ChevronDown /> Muat {Math.min(PAGE_SIZE, left)} lagi
          <span className="font-mono text-[11px] text-muted-foreground">· sisa {left}</span>
        </Button>
      )}
    </div>
  );
}

export function MediaCardView({
  card,
  index = 0,
  large,
}: {
  card: MediaCard;
  index?: number;
  large?: boolean;
}) {
  const [primary, ...others] = orderLinks(card.links);
  return (
    <article
      className="group/card flex min-w-0 flex-col overflow-hidden rounded-2xl border border-border glass-inset animate-fade-up transition-[border-color,box-shadow] duration-300 hover:border-primary/40 hover:shadow-glow-cyan"
      style={{ animationDelay: `${(index % PAGE_SIZE) * 70}ms` }}
    >
      <AutoVideo card={card} large={large} />

      <div className="flex flex-1 flex-col gap-2 p-2.5 sm:p-3">
        {card.title && (
          <p
            className={cn(
              "whitespace-pre-line break-words font-medium leading-snug text-foreground",
              large ? "text-sm line-clamp-3" : "text-xs line-clamp-2",
            )}
            title={card.title}
          >
            {card.title}
          </p>
        )}

        {card.stats.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {card.stats.slice(0, large ? 6 : 3).map((s) => (
              <StatChip key={s.key} stat={s} />
            ))}
          </div>
        )}

        {(primary || card.video) && (
          <div className="mt-auto flex flex-col gap-1.5 pt-1">
            {primary && <LinkButton link={primary} variant="neon" />}
            {others.length > 0 && (
              <div className={cn("grid gap-1.5", others.length > 1 ? "grid-cols-2" : "grid-cols-1")}>
                {others.slice(0, 4).map((l) => (
                  <LinkButton key={l.key} link={l} variant="glass" />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </article>
  );
}

/** Template first (the main action for template searches), then download, then the rest. */
function orderLinks(links: MediaCardLink[]): MediaCardLink[] {
  const rank = (l: MediaCardLink) =>
    /template/i.test(l.key) ? 0 : /download|nowm/i.test(l.key) ? 1 : 2;
  return [...links].sort((a, b) => rank(a) - rank(b));
}

function linkIcon(link: MediaCardLink) {
  const k = link.key.toLowerCase();
  if (k.includes("template")) return <Wand2 />;
  if (k.includes("download") || k.includes("nowm")) return <Download />;
  if (k.includes("share")) return <Share2 />;
  return <ExternalLink />;
}

function LinkButton({ link, variant }: { link: MediaCardLink; variant: "neon" | "glass" }) {
  return (
    <Button
      asChild
      variant={variant}
      size="sm"
      className="h-8 w-full min-w-0 px-2 text-[11px] sm:text-xs"
    >
      <a href={link.url} target="_blank" rel="noreferrer" title={link.label}>
        {linkIcon(link)}
        <span className="truncate">{link.label}</span>
      </a>
    </Button>
  );
}

function statIcon(stat: MediaCardStat) {
  const k = stat.key.toLowerCase();
  if (/like|digg|heart|love/.test(k)) return <Heart className="size-3" />;
  if (/play|view/.test(k)) return <Eye className="size-3" />;
  if (/usage|use/.test(k)) return <Layers className="size-3" />;
  if (/comment/.test(k)) return <MessageCircle className="size-3" />;
  if (/share/.test(k)) return <Share2 className="size-3" />;
  if (/download/.test(k)) return <Download className="size-3" />;
  return <Sparkles className="size-3" />;
}

function StatChip({ stat }: { stat: MediaCardStat }) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary/10 px-1.5 py-0.5 font-mono text-[10px] tabular-nums text-foreground"
      title={`${stat.label}: ${new Intl.NumberFormat("id-ID").format(stat.value)}`}
    >
      <span className="text-primary">{statIcon(stat)}</span>
      {formatCompact(stat.value)}
      <span className="sr-only">{stat.label}</span>
    </span>
  );
}

/**
 * Plays muted while on screen and pauses when scrolled away, so a long list stays light.
 * Tap toggles play, the speaker button toggles sound. Falls back to the poster if the link fails.
 */
function AutoVideo({ card, large }: { card: MediaCard; large?: boolean | undefined }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [seen, setSeen] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
  const [failed, setFailed] = useState(false);
  const [userPaused, setUserPaused] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || failed) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry) return;
        if (entry.isIntersecting) {
          setSeen(true);
          if (!reduce && !userPaused) void el.play().catch(() => undefined);
        } else {
          el.pause();
        }
      },
      { threshold: 0.55 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [failed, userPaused]);

  const toggle = () => {
    const el = ref.current;
    if (!el) return;
    if (el.paused) {
      setUserPaused(false);
      void el.play().catch(() => undefined);
    } else {
      setUserPaused(true);
      el.pause();
    }
  };

  return (
    <div
      className={cn(
        "relative w-full overflow-hidden bg-background/70",
        large ? "aspect-[9/16] max-h-[520px]" : "aspect-[3/4]",
      )}
    >
      {card.poster && (
        <img
          src={card.poster}
          alt=""
          loading="lazy"
          className={cn(
            "absolute inset-0 h-full w-full object-cover transition-opacity duration-500",
            playing && !failed ? "opacity-0" : "opacity-100",
          )}
        />
      )}
      {!failed && (
        <video
          ref={ref}
          src={seen ? card.video : undefined}
          poster={card.poster ?? undefined}
          muted={muted}
          loop
          playsInline
          preload="none"
          onPlaying={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onError={() => setFailed(true)}
          onClick={toggle}
          className="absolute inset-0 h-full w-full cursor-pointer object-cover"
        />
      )}

      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-background/90 via-background/30 to-transparent" />

      {card.duration !== null && (
        <span className="pointer-events-none absolute left-2 top-2 rounded-md bg-background/75 px-1.5 py-0.5 font-mono text-[10px] tabular-nums text-foreground">
          {formatDuration(card.duration)}
        </span>
      )}

      {!failed && (
        <button
          type="button"
          onClick={() => setMuted((m) => !m)}
          aria-label={muted ? "Nyalakan suara" : "Matikan suara"}
          className="absolute right-2 top-2 grid size-7 place-items-center rounded-full border border-border bg-background/70 text-foreground transition-colors hover:border-primary/60 hover:text-primary"
        >
          {muted ? <VolumeX className="size-3.5" /> : <Volume2 className="size-3.5" />}
        </button>
      )}

      {!playing && !failed && (
        <button
          type="button"
          onClick={toggle}
          aria-label="Putar video"
          className="absolute inset-0 m-auto grid size-11 place-items-center rounded-full border border-primary/50 bg-background/60 text-primary shadow-glow-cyan transition-transform hover:scale-105"
        >
          <Play className="size-5 translate-x-px" />
        </button>
      )}
      {failed && (
        <a
          href={card.video}
          target="_blank"
          rel="noreferrer"
          className="absolute inset-x-2 top-1/2 -translate-y-1/2 rounded-lg border border-border bg-background/80 px-2 py-1.5 text-center text-[11px] text-muted-foreground"
        >
          Pratinjau tidak bisa diputar · buka video
        </a>
      )}

      {card.author && (card.author.name || card.author.avatar) && (
        <div className="pointer-events-none absolute inset-x-2 bottom-2 flex min-w-0 items-center gap-1.5">
          {card.author.avatar ? (
            <img
              src={card.author.avatar}
              alt=""
              loading="lazy"
              className="size-6 shrink-0 rounded-full border border-primary/40 object-cover"
            />
          ) : (
            <span className="grid size-6 shrink-0 place-items-center rounded-full bg-gradient-neon-soft text-[10px] font-bold text-primary">
              {(card.author.name ?? "?").charAt(0).toUpperCase()}
            </span>
          )}
          {card.author.name && (
            <span className="truncate text-[11px] font-medium text-foreground">
              {card.author.name}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
