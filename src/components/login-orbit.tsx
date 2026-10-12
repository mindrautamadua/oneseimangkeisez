import type { CSSProperties } from "react";

const C = 200; // viewBox center

/** Concentric orbits; each turns at its own speed and direction, carrying a few light points. */
const RINGS: Array<{ r: number; t: number; rev?: boolean; dots: number[]; dash?: string }> = [
  { r: 70, t: 18, dots: [20, 200] },
  { r: 115, t: 32, rev: true, dots: [80, 250, 320], dash: "2 10" },
  { r: 160, t: 48, dots: [0, 140, 215] },
  { r: 195, t: 70, rev: true, dots: [110, 290], dash: "1 14" },
];

const v = (vars: Record<string, string>) => vars as CSSProperties;
const at = (r: number, deg: number) => {
  const a = (deg * Math.PI) / 180;
  return { x: C + r * Math.cos(a), y: C + r * Math.sin(a) };
};

/** Decorative, label-free "gateway" orbit for the login brand panel. Pure SVG + CSS animation. */
export function LoginOrbit({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 400 400" className={className} aria-hidden="true" focusable="false">
      <defs>
        <radialGradient id="kn-core" cx="45%" cy="40%" r="65%">
          <stop offset="0%" stopColor="#e0f2fe" />
          <stop offset="45%" stopColor="#38bdf8" />
          <stop offset="100%" stopColor="#0369a1" />
        </radialGradient>
        <radialGradient id="kn-halo">
          <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#38bdf8" stopOpacity="0" />
        </radialGradient>
      </defs>

      <circle cx={C} cy={C} r="120" fill="url(#kn-halo)" className="kn-breathe" />

      {RINGS.map((ring, i) => (
        <g key={ring.r} className="kn-enter" style={v({ "--d": `${150 + i * 120}ms` })}>
          <g className={`kn-spin ${ring.rev ? "kn-spin-rev" : ""}`} style={v({ "--t": `${ring.t}s` })}>
            <circle
              cx={C}
              cy={C}
              r={ring.r}
              fill="none"
              stroke="#7dd3fc"
              strokeOpacity={0.35 - i * 0.06}
              strokeWidth="1"
              strokeDasharray={ring.dash}
            />
            {ring.dots.map((deg, j) => {
              const p = at(ring.r, deg);
              const big = j === 0;
              return (
                <g key={deg}>
                  {big ? <circle cx={p.x} cy={p.y} r="5" fill="#38bdf8" className="kn-ping" style={v({ "--d": `${i * 500}ms` })} /> : null}
                  <circle cx={p.x} cy={p.y} r={big ? 4.5 : 2.5} fill={big ? "#e0f2fe" : "#7dd3fc"} fillOpacity={big ? 1 : 0.8} />
                </g>
              );
            })}
          </g>
        </g>
      ))}

      <g className="kn-enter" style={v({ "--d": "80ms" })}>
        <circle cx={C} cy={C} r="30" fill="#0284c7" className="kn-ping" />
        <circle cx={C} cy={C} r="30" fill="#0284c7" className="kn-ping" style={v({ "--d": "1300ms" })} />
        <g className="kn-breathe">
          <circle cx={C} cy={C} r="30" fill="url(#kn-core)" />
          <circle cx={C} cy={C} r="30" fill="none" stroke="#f0f9ff" strokeOpacity="0.6" strokeWidth="1.5" />
        </g>
      </g>
    </svg>
  );
}

/** Deterministic drifting particles (no randomness, so server and client render identically). */
const PARTICLES = Array.from({ length: 16 }, (_, i) => ({
  left: (i * 37 + 11) % 100,
  size: 2 + (i % 3),
  t: 12 + ((i * 7) % 10),
  d: -((i * 1700) % 16000),
  o: 0.25 + (i % 4) * 0.12,
}));

export function LoginParticles() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      {PARTICLES.map((p, i) => (
        <span
          key={i}
          className="kn-rise absolute -bottom-4 rounded-full bg-sky-200"
          style={v({
            left: `${p.left}%`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            "--t": `${p.t}s`,
            "--d": `${p.d}ms`,
            "--o": String(p.o),
          })}
        />
      ))}
    </div>
  );
}
