import type { Ref } from "react";

type RingSpec = {
  inset: string;
  rx: string;
  ry: string;
  color: string;
  dur: string;
  reverse?: boolean;
};

// Three gyroscope rings in different planes. Each carries one comet of light that circles it.
const RINGS: readonly RingSpec[] = [
  { inset: "0%", rx: "72deg", ry: "0deg", color: "var(--neon-cyan)", dur: "2.9s" },
  { inset: "8%", rx: "0deg", ry: "72deg", color: "var(--neon-pink)", dur: "3.7s", reverse: true },
  { inset: "17%", rx: "55deg", ry: "55deg", color: "var(--neon-blue)", dur: "2.3s" },
];

const FACES = ["front", "back", "right", "left", "top", "bottom"] as const;

function Cube({ className }: { className: string }) {
  return (
    <div className={`orb-cube ${className}`}>
      {FACES.map((f) => (
        <i key={f} className={`orb-face orb-face-${f}`} />
      ))}
    </div>
  );
}

/**
 * First-load centrepiece: two nested neon crystal cubes tumbling in opposite directions, three
 * tilted rings whose comets orbit in real 3D (front halves pass in front of the cubes, back halves
 * behind them), and a round progress ring around everything.
 *
 * Everything animates with transform/opacity only, so it runs on the compositor and stays smooth
 * on phones. The parent writes progress (0..1) into the `--p` custom property of `progressRef`.
 */
export function OrbitalCore({ progressRef }: { progressRef?: Ref<HTMLDivElement> }) {
  return (
    <div className="orb-stage" aria-hidden="true">
      <div className="orb-exit-wrap">
        <div className="orb-scene">
          <div className="orb-hud" />
          {[0, 1, 2].map((i) => (
            <span key={i} className="orb-wave" style={{ animationDelay: `${i * 0.93}s` }} />
          ))}
          <div className="orb-glow" />

          {RINGS.map((r) => (
            <div
              key={r.color}
              className="orb-ring"
              style={{
                inset: r.inset,
                ["--rx" as string]: r.rx,
                ["--ry" as string]: r.ry,
                ["--c" as string]: r.color,
                ["--dur" as string]: r.dur,
                ["--dir" as string]: r.reverse ? "reverse" : "normal",
              }}
            >
              <div className="orb-spin">
                <div className="orb-arc" />
                <span className="orb-dot" />
              </div>
            </div>
          ))}

          <Cube className="orb-cube-outer" />
          <Cube className="orb-cube-inner" />

          <div ref={progressRef} className="orb-progress">
            <div className="orb-progress-arc" />
            <div className="orb-progress-head">
              <span className="orb-dot orb-dot-sm" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
