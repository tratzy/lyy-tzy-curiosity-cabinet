import { useId, type CSSProperties } from "react";

import { cn } from "@/lib/utils";

// One lemniscate path shared by the loader and the small logo. pathLength=100 keeps dash maths simple.
export const INFINITY_PATH =
  "M200 110 C 240 46, 340 46, 340 110 C 340 174, 240 174, 200 110 C 160 46, 60 46, 60 110 C 60 174, 160 174, 200 110 Z";

/** Seconds the light line takes to trace the whole infinity on first load. */
export const INFINITY_DRAW_SECONDS = 1.8;

type Props = {
  className?: string;
  animated?: boolean;
  detailed?: boolean;
  /** First-load mode: a line of light draws the infinity, then move lines keep circling it. */
  intro?: boolean;
};

type Layer = readonly [length: number, width: number, opacity: number];

// A comet is a stack of dashes that all end at the same head. The longest one is thin and faint,
// the shortest is wide and bright, so the stack reads as a tapering "move line" tail.
const COMET_FULL: readonly Layer[] = [
  [36, 4, 0.12],
  [28, 5, 0.18],
  [20, 6.5, 0.28],
  [12, 8, 0.48],
  [6, 10, 0.8],
];
const COMET_MINI: readonly Layer[] = [
  [20, 5, 0.3],
  [9, 8, 0.7],
];
const LINE_FULL: readonly Layer[] = [
  [42, 1.2, 0.25],
  [26, 1.6, 0.5],
  [11, 2, 0.95],
];

/**
 * Neon 3D infinity, built from three stacked SVGs so the cheap animations never repaint the
 * expensive ones:
 *  1. halo   — one static blurred stroke (only its opacity pulses, which the compositor handles)
 *  2. body   — extruded depth, gradient tube, core and highlight (drawn on once when `intro`)
 *  3. lights — move lines; only stroke-dashoffset animates here, and there is no filter
 */
export function InfinityMark({
  className,
  animated = true,
  detailed = true,
  intro = false,
}: Props) {
  const uid = useId().replace(/:/g, "");
  const tube = `inf-tube-${uid}`;
  const depth = `inf-depth-${uid}`;
  const glow = `inf-glow-${uid}`;
  const shine = `inf-shine-${uid}`;

  const extrusion = detailed ? [10, 9, 8, 7, 6, 5, 4, 3, 2, 1] : [4, 2];
  const draw = intro && animated;
  // Move lines wait until the line of light has finished drawing the infinity.
  const lightsDelay = draw ? `${INFINITY_DRAW_SECONDS}s` : "0s";
  const drawProps = draw
    ? { pathLength: 100, strokeLinecap: "round" as const, className: "inf-draw" }
    : { strokeLinecap: "butt" as const };

  const wrapperStyle = {
    ["--draw-dur" as string]: `${INFINITY_DRAW_SECONDS}s`,
  } as CSSProperties;

  return (
    <div
      className={cn("relative aspect-[400/220]", className)}
      style={wrapperStyle}
      aria-hidden="true"
      data-keep-motion
    >
      {/* 1. Halo */}
      <svg
        viewBox="0 0 400 220"
        className={cn(
          "absolute inset-0 size-full overflow-visible",
          animated && (draw ? "inf-halo-intro" : "inf-pulse"),
        )}
        style={animated ? undefined : { opacity: 0.75 }}
      >
        <defs>
          <linearGradient id={tube} x1="40" y1="0" x2="360" y2="0" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="var(--neon-cyan)" />
            <stop offset="0.5" stopColor="var(--neon-blue)" />
            <stop offset="1" stopColor="var(--neon-pink)" />
          </linearGradient>
          <filter id={glow} x="-30%" y="-60%" width="160%" height="220%">
            <feGaussianBlur stdDeviation="9" />
          </filter>
        </defs>
        <path
          d={INFINITY_PATH}
          fill="none"
          stroke={`url(#${tube})`}
          strokeWidth={detailed ? 26 : 20}
          filter={`url(#${glow})`}
        />
      </svg>

      {/* 2. Body */}
      <svg viewBox="0 0 400 220" className="absolute inset-0 size-full overflow-visible">
        <defs>
          <linearGradient id={depth} x1="40" y1="0" x2="360" y2="0" gradientUnits="userSpaceOnUse">
            <stop
              offset="0"
              stopColor="color-mix(in oklab, var(--neon-cyan) 45%, var(--background))"
            />
            <stop
              offset="1"
              stopColor="color-mix(in oklab, var(--neon-pink) 45%, var(--background))"
            />
          </linearGradient>
          <linearGradient id={shine} x1="0" y1="40" x2="0" y2="180" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="white" stopOpacity="0.95" />
            <stop offset="0.5" stopColor="white" stopOpacity="0.15" />
            <stop offset="1" stopColor="white" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Soft glow that travels with the drawing line (no blur filter, so it stays cheap) */}
        {draw && (
          <path
            d={INFINITY_PATH}
            fill="none"
            stroke={`url(#${tube})`}
            strokeWidth={26}
            opacity={0.18}
            {...drawProps}
          />
        )}

        {extrusion.map((dy) => (
          <path
            key={dy}
            d={INFINITY_PATH}
            fill="none"
            stroke={`url(#${depth})`}
            strokeWidth={15}
            strokeLinejoin="round"
            transform={`translate(0 ${dy})`}
            opacity={0.35 + (1 - dy / 10) * 0.5}
            {...drawProps}
          />
        ))}

        <path
          d={INFINITY_PATH}
          fill="none"
          stroke={`url(#${tube})`}
          strokeWidth={14}
          strokeLinejoin="round"
          {...drawProps}
        />
        <path
          d={INFINITY_PATH}
          fill="none"
          stroke="white"
          strokeOpacity={0.35}
          strokeWidth={4}
          {...drawProps}
        />
        <path
          d={INFINITY_PATH}
          fill="none"
          stroke={`url(#${shine})`}
          strokeWidth={3}
          transform="translate(0 -4)"
          opacity={0.8}
          {...drawProps}
        />
      </svg>

      {/* 3. Lights */}
      {animated && (
        <svg viewBox="0 0 400 220" className="absolute inset-0 size-full overflow-visible">
          <g fill="none" strokeLinecap="round">
            {/* The bright head that leads the line while it draws the infinity */}
            {draw && (
              <g>
                <HeadSpark width={22} color="var(--neon-cyan)" opacity={0.35} />
                <HeadSpark width={11} color="var(--neon-cyan)" opacity={0.85} />
                <HeadSpark width={5} color="white" opacity={1} />
              </g>
            )}

            {/* Move lines that keep circling once the infinity is complete */}
            <g className={draw ? "inf-lights-in" : undefined}>
              <Comet
                layers={detailed ? COMET_FULL : COMET_MINI}
                color="var(--neon-cyan)"
                dur="2.8s"
                head={0}
                delay={lightsDelay}
              />
              <Comet
                layers={detailed ? COMET_FULL : COMET_MINI}
                color="var(--neon-pink)"
                dur="3.6s"
                head={50}
                delay={lightsDelay}
                reverse
              />
              {detailed && (
                <>
                  <Comet layers={LINE_FULL} color="white" dur="1.9s" head={25} delay={lightsDelay} />
                  <Comet
                    layers={LINE_FULL}
                    color="white"
                    dur="2.3s"
                    head={75}
                    delay={lightsDelay}
                    reverse
                  />
                </>
              )}
            </g>
          </g>
        </svg>
      )}
    </div>
  );
}

function HeadSpark({ width, color, opacity }: { width: number; color: string; opacity: number }) {
  return (
    <path
      d={INFINITY_PATH}
      pathLength={100}
      stroke={color}
      strokeOpacity={opacity}
      strokeWidth={width}
      strokeDasharray="3 97"
      className="inf-head"
    />
  );
}

/**
 * A comet of light running along the infinity. `head` is where the bright end starts (0-100, along the
 * path). Forward comets trail behind the head; reverse ones run the other way and trail ahead of it.
 */
function Comet({
  layers,
  color,
  dur,
  head,
  delay,
  reverse,
}: {
  layers: readonly Layer[];
  color: string;
  dur: string;
  head: number;
  delay: string;
  reverse?: boolean;
}) {
  return (
    <>
      {layers.map(([len, width, opacity]) => (
        <path
          key={len}
          d={INFINITY_PATH}
          pathLength={100}
          stroke={color}
          strokeOpacity={opacity}
          strokeWidth={width}
          strokeDasharray={`${len} ${100 - len}`}
          className={reverse ? "inf-light inf-light-rev" : "inf-light"}
          style={{
            ["--dur" as string]: dur,
            ["--delay" as string]: delay,
            // Every layer of one comet shares the same head, so only the tail length differs.
            ["--o" as string]: reverse ? -head : len - head,
          }}
        />
      ))}
    </>
  );
}
