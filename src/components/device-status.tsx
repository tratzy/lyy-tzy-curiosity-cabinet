import { useCallback, useEffect, useId, useState, type ReactNode } from "react";
import {
  Clock,
  Cloud,
  CloudDrizzle,
  CloudFog,
  CloudLightning,
  CloudMoon,
  CloudRain,
  CloudSnow,
  CloudSun,
  Moon,
  Signal,
  Sun,
  Wifi,
  WifiOff,
  Zap,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ *
 * Ring gauge: an SVG progress ring around an icon + value, label below.
 * ------------------------------------------------------------------ */

const R = 32;
const CIRC = 2 * Math.PI * R;

function RingGauge({
  value,
  colors,
  label,
  children,
  onClick,
  title,
  instant,
}: {
  /** 0..1 */
  value: number;
  colors: [string, string];
  label: string;
  children: ReactNode;
  onClick?: () => void;
  title?: string | undefined;
  /** Skip the fill transition for one update (used when the clock ring wraps to zero). */
  instant?: boolean;
}) {
  const id = useId().replace(/:/g, "");
  const v = Math.min(1, Math.max(0, value));
  const cls = cn(
    "group flex min-w-0 flex-col items-center gap-2 rounded-xl text-center focus-visible:outline-none",
    onClick && "cursor-pointer",
  );

  const content = (
    <>
      <div className="relative size-[4.25rem] sm:size-20">
        <svg viewBox="0 0 72 72" className="absolute inset-0 size-full -rotate-90" aria-hidden="true">
          <defs>
            <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor={colors[0]} />
              <stop offset="1" stopColor={colors[1]} />
            </linearGradient>
          </defs>
          <circle
            cx="36"
            cy="36"
            r={R}
            fill="none"
            stroke="currentColor"
            strokeWidth="4.5"
            className="text-border"
            opacity="0.7"
          />
          <circle
            cx="36"
            cy="36"
            r={R}
            fill="none"
            stroke={`url(#${id})`}
            strokeWidth="4.5"
            strokeLinecap="round"
            strokeDasharray={CIRC}
            strokeDashoffset={CIRC * (1 - v)}
            style={{
              transition: instant ? "none" : "stroke-dashoffset 0.9s cubic-bezier(0.16, 1, 0.3, 1)",
            }}
          />
        </svg>
        <div className="absolute inset-[7px] flex flex-col items-center justify-center gap-1 rounded-full bg-background/50 text-foreground">
          {children}
        </div>
      </div>
      <span className="max-w-full truncate font-mono text-[10px] uppercase tracking-wider text-muted-foreground transition-colors group-hover:text-foreground sm:text-[11px]">
        {label}
      </span>
    </>
  );

  return onClick ? (
    <button type="button" onClick={onClick} title={title} className={cls}>
      {content}
    </button>
  ) : (
    <div title={title} className={cls}>
      {content}
    </div>
  );
}

const Value = ({ children }: { children: ReactNode }) => (
  <span className="font-mono text-[11px] font-bold leading-none tabular-nums sm:text-xs">
    {children}
  </span>
);

/* ------------------------------------------------------------------ *
 * Battery
 * ------------------------------------------------------------------ */

type BatteryManagerLike = EventTarget & { level: number; charging: boolean };
type BatteryState =
  | { status: "loading" }
  | { status: "unsupported" }
  | { status: "ok"; level: number; charging: boolean };

function useBattery(): BatteryState {
  const [state, setState] = useState<BatteryState>({ status: "loading" });

  useEffect(() => {
    const nav = navigator as Navigator & { getBattery?: () => Promise<BatteryManagerLike> };
    if (typeof nav.getBattery !== "function") {
      setState({ status: "unsupported" });
      return;
    }
    let battery: BatteryManagerLike | undefined;
    let cancelled = false;
    const read = () => {
      if (battery) setState({ status: "ok", level: battery.level, charging: battery.charging });
    };
    nav
      .getBattery()
      .then((b) => {
        if (cancelled) return;
        battery = b;
        read();
        b.addEventListener("levelchange", read);
        b.addEventListener("chargingchange", read);
      })
      .catch(() => !cancelled && setState({ status: "unsupported" }));
    return () => {
      cancelled = true;
      battery?.removeEventListener("levelchange", read);
      battery?.removeEventListener("chargingchange", read);
    };
  }, []);

  return state;
}

/** Battery drawn with plain CSS: outline, nub, and a fill that is exactly the remaining charge. */
function BatteryGlyph({ level, color, charging }: { level: number; color: string; charging: boolean }) {
  return (
    <span className="relative inline-flex items-center" style={{ color }}>
      <span className="block h-[10px] w-[20px] rounded-[3px] border border-current p-[1.5px]">
        <span
          className="block h-full rounded-[1.5px] bg-current transition-[width] duration-700"
          style={{ width: `${Math.max(level, 0.04) * 100}%` }}
        />
      </span>
      <span className="ml-px h-[4px] w-[2px] rounded-r-sm bg-current" />
      {charging && (
        <Zap className="absolute -right-1.5 -top-2 size-3 fill-warning text-warning" aria-hidden />
      )}
    </span>
  );
}

function BatteryGauge() {
  const battery = useBattery();
  if (battery.status !== "ok") {
    return (
      <RingGauge
        value={0}
        colors={["var(--neon-cyan)", "var(--neon-blue)"]}
        label="Baterai"
        title={battery.status === "unsupported" ? "Browser ini tidak membagikan info baterai" : undefined}
      >
        <BatteryGlyph level={0} color="var(--muted-foreground)" charging={false} />
        <Value>—</Value>
      </RingGauge>
    );
  }
  const color =
    battery.level > 0.5 ? "var(--success)" : battery.level > 0.2 ? "var(--warning)" : "var(--destructive)";
  return (
    <RingGauge value={battery.level} colors={[color, color]} label="Baterai">
      <BatteryGlyph level={battery.level} color={color} charging={battery.charging} />
      <Value>{Math.round(battery.level * 100)}%</Value>
    </RingGauge>
  );
}

/* ------------------------------------------------------------------ *
 * Weather (Open-Meteo, no API key). Defaults to Jakarta; tap to use your own location.
 * ------------------------------------------------------------------ */

type Coords = { lat: number; lon: number };
const JAKARTA: Coords = { lat: -6.2, lon: 106.82 };

type WeatherState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ok"; temp: number; code: number; isDay: boolean };

function weatherIcon(code: number, isDay: boolean): LucideIcon {
  if (code === 0) return isDay ? Sun : Moon;
  if (code <= 2) return isDay ? CloudSun : CloudMoon;
  if (code === 3) return Cloud;
  if (code === 45 || code === 48) return CloudFog;
  if (code >= 51 && code <= 57) return CloudDrizzle;
  if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) return CloudRain;
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return CloudSnow;
  if (code >= 95) return CloudLightning;
  return Cloud;
}

function useWeather(coords: Coords): WeatherState {
  const [state, setState] = useState<WeatherState>({ status: "loading" });

  useEffect(() => {
    let alive = true;
    const controller = new AbortController();
    const load = async () => {
      try {
        const url =
          "https://api.open-meteo.com/v1/forecast" +
          `?latitude=${coords.lat}&longitude=${coords.lon}` +
          "&current=temperature_2m,weather_code,is_day&timezone=auto";
        const res = await fetch(url, { signal: controller.signal });
        if (!res.ok) throw new Error(String(res.status));
        const json = (await res.json()) as {
          current?: { temperature_2m?: number; weather_code?: number; is_day?: number };
        };
        const c = json.current;
        if (!alive) return;
        if (c?.temperature_2m == null || c.weather_code == null) throw new Error("no data");
        setState({
          status: "ok",
          temp: c.temperature_2m,
          code: c.weather_code,
          isDay: c.is_day !== 0,
        });
      } catch {
        if (alive && !controller.signal.aborted) setState({ status: "error" });
      }
    };
    void load();
    const id = window.setInterval(load, 10 * 60_000);
    return () => {
      alive = false;
      controller.abort();
      window.clearInterval(id);
    };
  }, [coords.lat, coords.lon]);

  return state;
}

function WeatherGauge() {
  const [coords, setCoords] = useState<Coords>(JAKARTA);
  const weather = useWeather(coords);

  const requestLocation = useCallback(() => {
    if (!("geolocation" in navigator)) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setCoords({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
      () => undefined,
      { maximumAge: 10 * 60_000, timeout: 8000 },
    );
  }, []);

  const Icon = weather.status === "ok" ? weatherIcon(weather.code, weather.isDay) : Cloud;
  // Ring: temperature on a 0–45 °C scale.
  const value = weather.status === "ok" ? weather.temp / 45 : 0;

  return (
    <RingGauge
      value={value}
      colors={["var(--warning)", "var(--neon-pink)"]}
      label="Cuaca"
      onClick={requestLocation}
      title="Ketuk untuk memakai lokasimu (bawaan: Jakarta)"
    >
      <Icon className="size-4 text-warning sm:size-[18px]" aria-hidden />
      <Value>{weather.status === "ok" ? `${Math.round(weather.temp)}°` : "—"}</Value>
    </RingGauge>
  );
}

/* ------------------------------------------------------------------ *
 * Network (Network Information API where available; online/offline everywhere)
 * ------------------------------------------------------------------ */

type ConnectionLike = EventTarget & { effectiveType?: string; type?: string };
type NetState = { online: boolean; effectiveType?: string | undefined; type?: string | undefined };

const NET_QUALITY: Record<string, number> = { "slow-2g": 0.15, "2g": 0.33, "3g": 0.66, "4g": 1 };

function useNetwork(): NetState | null {
  const [net, setNet] = useState<NetState | null>(null);

  useEffect(() => {
    const conn = (navigator as Navigator & { connection?: ConnectionLike }).connection;
    const read = () =>
      setNet({
        online: navigator.onLine,
        effectiveType: conn?.effectiveType,
        type: conn?.type,
      });
    read();
    window.addEventListener("online", read);
    window.addEventListener("offline", read);
    conn?.addEventListener("change", read);
    return () => {
      window.removeEventListener("online", read);
      window.removeEventListener("offline", read);
      conn?.removeEventListener("change", read);
    };
  }, []);

  return net;
}

function NetworkGauge() {
  const net = useNetwork();
  const online = net?.online ?? true;
  const quality = !net ? 0 : !online ? 0 : (NET_QUALITY[net.effectiveType ?? ""] ?? 1);
  const Icon = !online ? WifiOff : net?.type === "cellular" ? Signal : Wifi;
  const text = !net ? "—" : !online ? "OFF" : net.effectiveType ? net.effectiveType.toUpperCase() : "ON";

  return (
    <RingGauge
      value={quality}
      colors={online ? ["var(--neon-cyan)", "var(--neon-blue)"] : ["var(--destructive)", "var(--destructive)"]}
      label="Jaringan"
    >
      <Icon className={cn("size-4 sm:size-[18px]", online ? "text-primary" : "text-destructive")} aria-hidden />
      <Value>{text}</Value>
    </RingGauge>
  );
}

/* ------------------------------------------------------------------ *
 * Time in WIB (Asia/Jakarta). The ring is the seconds hand.
 * ------------------------------------------------------------------ */

const WIB = new Intl.DateTimeFormat("id-ID", {
  timeZone: "Asia/Jakarta",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

function wibParts(date: Date) {
  const get = (type: string) => WIB.formatToParts(date).find((p) => p.type === type)?.value ?? "00";
  return { h: get("hour"), m: get("minute"), s: Number(get("second")) };
}

function TimeGauge() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const t = now ? wibParts(now) : null;
  return (
    <RingGauge
      value={t ? (t.s + 1) / 60 : 0}
      colors={["var(--neon-pink)", "var(--neon-blue)"]}
      label="Waktu WIB"
      instant={t?.s === 0}
    >
      <Clock className="size-4 text-accent sm:size-[18px]" aria-hidden />
      <Value>{t ? `${t.h}:${t.m}` : "--:--"}</Value>
    </RingGauge>
  );
}

/* ------------------------------------------------------------------ *
 * The card
 * ------------------------------------------------------------------ */

export function StatusCard() {
  return (
    <section
      aria-label="Status perangkat"
      className="glass relative mx-auto max-w-xl overflow-hidden rounded-2xl px-2 py-4 shadow-card sm:px-5 sm:py-5"
    >
      <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-neon opacity-70" />
      <div className="grid grid-cols-4 gap-1 sm:gap-3">
        <BatteryGauge />
        <WeatherGauge />
        <NetworkGauge />
        <TimeGauge />
      </div>
    </section>
  );
}
