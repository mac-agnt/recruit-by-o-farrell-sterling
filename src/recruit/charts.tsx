import { useEffect, useId, useRef, useState, type CSSProperties, type ReactNode } from "react";

/* SVG charts drawn from data, measured to their container so text never
   stretches. Colours are Pulse tokens; every chart has real axes or labels. */

export const SERIES_COLORS = ["var(--accent)", "var(--teal, #16B8A6)", "#f0a33e", "#c8b4f0", "#f07a9d", "#7fd0f0"];

function useWidth<T extends HTMLElement>(): [React.RefObject<T>, number] {
  const ref = useRef<T>(null);
  const [w, setW] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    setW(el.clientWidth);
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => setW(el.clientWidth));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref as React.RefObject<T>, w];
}

const niceMax = (v: number) => {
  if (v <= 0) return 1;
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  const m = v / p;
  return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 2.5 ? 2.5 : m <= 5 ? 5 : 10) * p;
};

export interface Series { name: string; values: number[]; color?: string; dashed?: boolean; area?: boolean }

export function LineChart({ labels, series, height = 220, yFormat = (v: number) => String(v), yMin, yMax, legend = true, highlightLast = true, style }: {
  labels: string[]; series: Series[]; height?: number; yFormat?: (v: number) => string; yMin?: number; yMax?: number; legend?: boolean; highlightLast?: boolean; style?: CSSProperties;
}) {
  const [ref, w] = useWidth<HTMLDivElement>();
  const gid = useId().replace(/:/g, "");
  const [hover, setHover] = useState<number | null>(null);
  const all = series.flatMap(s => s.values.filter(v => Number.isFinite(v)));
  const lo = yMin ?? Math.min(0, ...all);
  const hi = yMax ?? niceMax(Math.max(...all) * 1.08);
  const padL = 52, padR = 14, padT = 12, padB = 26;
  const iw = Math.max(10, w - padL - padR), ih = height - padT - padB;
  const x = (i: number) => padL + (labels.length <= 1 ? iw / 2 : (i / (labels.length - 1)) * iw);
  const y = (v: number) => padT + ih - ((v - lo) / (hi - lo || 1)) * ih;
  const ticks = 4;
  return (
    <div style={style}>
      {legend && series.length > 1 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 14, marginBottom: 10 }}>
          {series.map((s, i) => (
            <span key={s.name} style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: 11.5, color: "var(--dim)" }}>
              <span style={{ width: 14, height: 3, borderRadius: 2, background: s.color || SERIES_COLORS[i], opacity: s.dashed ? 0.6 : 1 }} />{s.name}
            </span>
          ))}
        </div>
      )}
      <div ref={ref} style={{ position: "relative", width: "100%", height }} onMouseLeave={() => setHover(null)}>
        {w > 0 && (
          <svg width={w} height={height} style={{ display: "block", overflow: "visible" }}
            onMouseMove={e => { const r = (e.currentTarget as SVGSVGElement).getBoundingClientRect(); const px = e.clientX - r.left - padL; setHover(Math.max(0, Math.min(labels.length - 1, Math.round((px / iw) * (labels.length - 1))))); }}>
            <defs>
              {series.map((s, i) => (
                <linearGradient key={i} id={gid + "g" + i} x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor={s.color || SERIES_COLORS[i]} stopOpacity=".28" />
                  <stop offset="100%" stopColor={s.color || SERIES_COLORS[i]} stopOpacity="0" />
                </linearGradient>
              ))}
            </defs>
            {Array.from({ length: ticks + 1 }, (_, t) => {
              const v = lo + ((hi - lo) / ticks) * t;
              return (
                <g key={t}>
                  <line x1={padL} x2={padL + iw} y1={y(v)} y2={y(v)} stroke="var(--border)" strokeDasharray={t ? "3 4" : undefined} />
                  <text x={padL - 8} y={y(v) + 3.5} textAnchor="end" fontSize="10" fill="var(--faint)" fontFamily="var(--mono)">{yFormat(v)}</text>
                </g>
              );
            })}
            {labels.map((l, i) => (labels.length <= 12 || i % Math.ceil(labels.length / 12) === 0) && (
              <text key={l + i} x={x(i)} y={height - 6} textAnchor="middle" fontSize="10" fill={hover === i ? "var(--ink)" : "var(--faint)"} fontFamily="var(--mono)">{l}</text>
            ))}
            {series.map((s, si) => {
              const pts = s.values.map((v, i) => [x(i), y(v)] as const).filter(p => Number.isFinite(p[1]));
              const d = pts.map((p, i) => (i ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1)).join(" ");
              const color = s.color || SERIES_COLORS[si];
              return (
                <g key={s.name}>
                  {s.area && pts.length > 1 && <path d={d + " L" + pts[pts.length - 1][0] + " " + (padT + ih) + " L" + pts[0][0] + " " + (padT + ih) + " Z"} fill={"url(#" + gid + "g" + si + ")"} />}
                  {s.dashed
                    ? <path d={d} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" strokeDasharray="5 5" opacity={0.8} />
                    : <path d={d} pathLength={1} fill="none" stroke={color} strokeWidth={2.2} strokeLinejoin="round" strokeLinecap="round"
                        style={{ strokeDasharray: 1, animation: "rcDrawN 1.2s cubic-bezier(.4,0,.2,1) both" }} />}
                  {highlightLast && pts.length > 0 && !s.dashed && <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r={4} fill={color} stroke="var(--surface)" strokeWidth={2} />}
                </g>
              );
            })}
            {hover !== null && (
              <g>
                <line x1={x(hover)} x2={x(hover)} y1={padT} y2={padT + ih} stroke="var(--border-strong)" />
                {series.map((s, si) => Number.isFinite(s.values[hover]) && <circle key={si} cx={x(hover)} cy={y(s.values[hover])} r={3.5} fill={s.color || SERIES_COLORS[si]} />)}
              </g>
            )}
          </svg>
        )}
        {hover !== null && w > 0 && (
          <div style={{ position: "absolute", top: 4, left: Math.min(Math.max(x(hover) - 70, 0), w - 150), width: 150, pointerEvents: "none", padding: "8px 10px",
            background: "var(--tooltip)", border: "1px solid var(--border)", borderRadius: 10, boxShadow: "0 10px 30px rgba(0,0,0,.35)", fontSize: 11.5, zIndex: 2 }}>
            <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--faint)" }}>{labels[hover]}</div>
            {series.map((s, si) => Number.isFinite(s.values[hover]) && (
              <div key={si} style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4, color: "var(--tooltip-ink, var(--ink))" }}>
                <span style={{ width: 7, height: 7, borderRadius: 2, background: s.color || SERIES_COLORS[si] }} />
                <span style={{ flex: 1, color: "var(--dim)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.name}</span>
                <b style={{ fontWeight: 600 }}>{yFormat(s.values[hover])}</b>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function BarChart({ data, height = 200, yFormat = (v: number) => String(v), color = "var(--accent)", highlight, style }: {
  data: { label: string; value: number; color?: string }[]; height?: number; yFormat?: (v: number) => string; color?: string; highlight?: number; style?: CSSProperties;
}) {
  const [ref, w] = useWidth<HTMLDivElement>();
  const hi = niceMax(Math.max(...data.map(d => d.value)) * 1.05);
  const padL = 48, padB = 24, padT = 14;
  const iw = Math.max(10, w - padL - 6), ih = height - padB - padT;
  const bw = Math.max(6, Math.min(40, (iw / data.length) * 0.58));
  return (
    <div ref={ref} style={{ width: "100%", height, ...style }}>
      {w > 0 && (
        <svg width={w} height={height} style={{ display: "block" }}>
          {[0, 0.5, 1].map(t => (
            <g key={t}>
              <line x1={padL} x2={w - 6} y1={padT + ih - ih * t} y2={padT + ih - ih * t} stroke="var(--border)" strokeDasharray={t ? "3 4" : undefined} />
              <text x={padL - 8} y={padT + ih - ih * t + 3.5} textAnchor="end" fontSize="10" fill="var(--faint)" fontFamily="var(--mono)">{yFormat(hi * t)}</text>
            </g>
          ))}
          {data.map((d, i) => {
            const cx = padL + (i + 0.5) * (iw / data.length);
            const h = (d.value / hi) * ih;
            const on = highlight === undefined ? i === data.length - 1 : highlight === i;
            return (
              <g key={d.label + i}>
                <rect x={cx - bw / 2} y={padT + ih - h} width={bw} height={Math.max(1, h)} rx={Math.min(6, bw / 3)} fill={d.color || color} opacity={on ? 1 : 0.42}
                  style={{ transformOrigin: cx + "px " + (padT + ih) + "px", animation: "rcGrowY .8s cubic-bezier(.16,1,.3,1) " + i * 30 + "ms both" }}>
                  <title>{d.label + ": " + yFormat(d.value)}</title>
                </rect>
                {on && <text x={cx} y={padT + ih - h - 6} textAnchor="middle" fontSize="10.5" fill="var(--ink)" fontWeight="600">{yFormat(d.value)}</text>}
                <text x={cx} y={height - 6} textAnchor="middle" fontSize="10" fill="var(--faint)" fontFamily="var(--mono)">{d.label}</text>
              </g>
            );
          })}
        </svg>
      )}
    </div>
  );
}

/** Horizontal labelled bars, for rankings and mixes. */
export function BarList({ items, format = (v: number) => String(v), max, color = "var(--accent)" }: {
  items: { label: ReactNode; value: number; display?: ReactNode; color?: string; sub?: ReactNode }[]; format?: (v: number) => string; max?: number; color?: string;
}) {
  const m = max ?? Math.max(...items.map(i => i.value), 1);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
      {items.map((it, i) => (
        <div key={i}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 10, fontSize: 12.5 }}>
            <span style={{ flex: 1, minWidth: 0, color: "var(--body)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{it.label}</span>
            {it.sub && <span style={{ fontSize: 11, color: "var(--faint)" }}>{it.sub}</span>}
            <span style={{ fontWeight: 600, color: "var(--ink)", fontVariantNumeric: "tabular-nums" }}>{it.display ?? format(it.value)}</span>
          </div>
          <div style={{ height: 6, borderRadius: 999, background: "var(--track)", marginTop: 6, overflow: "hidden" }}>
            <div style={{ width: (it.value / m) * 100 + "%", height: "100%", borderRadius: 999, background: it.color || color, transformOrigin: "left", animation: "rcGrow .9s cubic-bezier(.16,1,.3,1) " + i * 50 + "ms both" }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function Donut({ segments, size = 168, thickness = 18, center, sub }: { segments: { label: string; value: number; color?: string }[]; size?: number; thickness?: number; center?: ReactNode; sub?: ReactNode }) {
  const total = segments.reduce((t, s) => t + s.value, 0) || 1;
  const r = (size - thickness) / 2, c = 2 * Math.PI * r;
  let acc = 0;
  return (
    <div style={{ position: "relative", width: size, height: size, flex: "none" }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--track)" strokeWidth={thickness} />
        {segments.map((s, i) => {
          const len = (s.value / total) * c;
          const el = <circle key={i} cx={size / 2} cy={size / 2} r={r} fill="none" stroke={s.color || SERIES_COLORS[i % SERIES_COLORS.length]} strokeWidth={thickness}
            strokeDasharray={Math.max(0, len - 2) + " " + (c - Math.max(0, len - 2))} strokeDashoffset={-acc}><title>{s.label}</title></circle>;
          acc += len;
          return el;
        })}
      </svg>
      {(center || sub) && (
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center" }}>
          <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: "-.6px" }}>{center}</div>
          {sub && <div style={{ fontSize: 10.5, color: "var(--faint)", marginTop: 3, maxWidth: size * 0.6 }}>{sub}</div>}
        </div>
      )}
    </div>
  );
}

export function Legend({ items }: { items: { label: ReactNode; value?: ReactNode; color?: string }[] }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 9, minWidth: 0 }}>
      {items.map((it, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 9, fontSize: 12.5 }}>
          <span style={{ width: 9, height: 9, borderRadius: 3, background: it.color || SERIES_COLORS[i % SERIES_COLORS.length], flex: "none" }} />
          <span style={{ flex: 1, minWidth: 0, color: "var(--body)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{it.label}</span>
          {it.value !== undefined && <span style={{ fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{it.value}</span>}
        </div>
      ))}
    </div>
  );
}

/** A 270° gauge for the Recruit Index. */
export function Gauge({ value, max = 1000, size = 220, label, sub, thickness = 14 }: { value: number; max?: number; size?: number; label?: ReactNode; sub?: ReactNode; thickness?: number }) {
  const gid = useId().replace(/:/g, "");
  const r = (size - thickness) / 2 - 6, cx = size / 2, cy = size / 2;
  const sweep = 270, start = 135;
  const arc = (from: number, to: number) => {
    const a0 = ((start + from) * Math.PI) / 180, a1 = ((start + to) * Math.PI) / 180;
    const large = to - from > 180 ? 1 : 0;
    return "M" + (cx + r * Math.cos(a0)) + " " + (cy + r * Math.sin(a0)) + " A" + r + " " + r + " 0 " + large + " 1 " + (cx + r * Math.cos(a1)) + " " + (cy + r * Math.sin(a1));
  };
  const p = Math.max(0, Math.min(1, value / max));
  const len = (sweep / 360) * 2 * Math.PI * r;
  const [ready, setReady] = useState(false);
  useEffect(() => { const t = requestAnimationFrame(() => setReady(true)); return () => cancelAnimationFrame(t); }, []);
  const ticks = [0, 250, 500, 750, 1000];
  return (
    <div style={{ position: "relative", width: size, height: size * 0.86, flex: "none" }}>
      <svg width={size} height={size} style={{ position: "absolute", top: 0, left: 0 }}>
        <defs>
          <linearGradient id={gid} x1="0" x2="1" y1="1" y2="0">
            <stop offset="0%" stopColor="#4263EB" />
            <stop offset="100%" stopColor="var(--teal, #16B8A6)" />
          </linearGradient>
        </defs>
        <path d={arc(0, sweep)} fill="none" stroke="var(--track)" strokeWidth={thickness} strokeLinecap="round" />
        <path d={arc(0, sweep)} fill="none" stroke={"url(#" + gid + ")"} strokeWidth={thickness} strokeLinecap="round"
          strokeDasharray={len} strokeDashoffset={ready ? len * (1 - p) : len} style={{ transition: "stroke-dashoffset 1.3s cubic-bezier(.16,1,.3,1)" }} />
        {ticks.map(t => {
          const a = ((start + (t / max) * sweep) * Math.PI) / 180;
          return <text key={t} x={cx + (r - thickness - 8) * Math.cos(a)} y={cy + (r - thickness - 8) * Math.sin(a) + 3} textAnchor="middle" fontSize="9" fill="var(--faint)" fontFamily="var(--mono)">{t}</text>;
        })}
      </svg>
      <div style={{ position: "absolute", left: 0, right: 0, top: size * 0.3, textAlign: "center" }}>
        <div style={{ fontSize: size * 0.2, fontWeight: 600, letterSpacing: "-2px", lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>{value}</div>
        {label && <div style={{ fontSize: 11.5, color: "var(--dim)", marginTop: 6 }}>{label}</div>}
        {sub && <div style={{ marginTop: 8, display: "flex", justifyContent: "center" }}>{sub}</div>}
      </div>
    </div>
  );
}

export function Sparkline({ values, width = 96, height = 30, color = "var(--accent)" }: { values: number[]; width?: number; height?: number; color?: string }) {
  const lo = Math.min(...values), hi = Math.max(...values);
  const pts = values.map((v, i) => [(i / (values.length - 1)) * (width - 4) + 2, height - 3 - ((v - lo) / (hi - lo || 1)) * (height - 6)]);
  return (
    <svg width={width} height={height} style={{ display: "block", flex: "none" }}>
      <path d={pts.map((p, i) => (i ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1)).join(" ")} fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r={2.6} fill={color} />
    </svg>
  );
}

/** A salary axis with a market band, an optional scenario band and a marker for the current salary. */
export function RangeBar({ min, max, band, scenario, marker, markerLabel = "Current", format = (v: number) => String(v), height = 74 }: {
  min: number; max: number; band: [number, number]; scenario?: [number, number] | null; marker?: number; markerLabel?: string; format?: (v: number) => string; height?: number;
}) {
  const pos = (v: number) => ((v - min) / (max - min)) * 100;
  const ticks = 5;
  return (
    <div style={{ position: "relative", height, marginTop: 6 }}>
      <div style={{ position: "absolute", left: 0, right: 0, top: 26, height: 10, borderRadius: 999, background: "var(--track)" }} />
      <div title="Estimated market range" style={{ position: "absolute", top: 24, height: 14, left: pos(band[0]) + "%", width: pos(band[1]) - pos(band[0]) + "%", borderRadius: 999,
        background: "linear-gradient(90deg, #4263EB, var(--teal, #16B8A6))", boxShadow: "0 0 18px var(--accent-soft)", transition: "left .6s var(--ease), width .6s var(--ease)" }} />
      {scenario && (
        <div title="Scenario range" style={{ position: "absolute", top: 21, height: 20, left: pos(scenario[0]) + "%", width: Math.max(1, pos(scenario[1]) - pos(scenario[0])) + "%", borderRadius: 999,
          border: "1.5px dashed var(--warn)", transition: "left .6s var(--ease), width .6s var(--ease)" }} />
      )}
      {marker !== undefined && (
        <div style={{ position: "absolute", left: pos(marker) + "%", top: 0, transform: "translateX(-50%)", display: "flex", flexDirection: "column", alignItems: "center", transition: "left .6s var(--ease)" }}>
          <span style={{ fontSize: 10.5, color: "var(--ink)", whiteSpace: "nowrap", fontWeight: 500 }}>{markerLabel} {format(marker)}</span>
          <span style={{ width: 2, height: 22, background: "var(--ink)", borderRadius: 2, marginTop: 3 }} />
        </div>
      )}
      {Array.from({ length: ticks + 1 }, (_, i) => {
        const v = min + ((max - min) / ticks) * i;
        return <span key={i} style={{ position: "absolute", top: 46, left: (i / ticks) * 100 + "%", transform: "translateX(" + (i === 0 ? "0" : i === ticks ? "-100%" : "-50%") + ")", fontFamily: "var(--mono)", fontSize: 10, color: "var(--faint)", whiteSpace: "nowrap" }}>{format(v)}</span>;
      })}
    </div>
  );
}

/** A single stacked bar, for index breakdowns and mixes. */
export function StackBar({ parts, height = 12, total }: { parts: { label: string; value: number; color?: string }[]; height?: number; total?: number }) {
  const t = total ?? parts.reduce((s, p) => s + p.value, 0);
  return (
    <div style={{ display: "flex", height, borderRadius: 999, overflow: "hidden", background: "var(--track)", gap: 2 }}>
      {parts.map((p, i) => (
        <div key={i} title={p.label + ": " + p.value} style={{ width: (p.value / t) * 100 + "%", background: p.color || SERIES_COLORS[i % SERIES_COLORS.length], transformOrigin: "left", animation: "rcGrow .9s cubic-bezier(.16,1,.3,1) " + i * 80 + "ms both" }} />
      ))}
    </div>
  );
}

/** Horizontal funnel with conversion between steps. */
export function Funnel({ stages, format = (v: number) => String(v) }: { stages: { label: string; value: number; note?: string }[]; format?: (v: number) => string }) {
  const top = stages[0]?.value || 1;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {stages.map((s, i) => {
        const w = Math.max(6, Math.sqrt(s.value / top) * 100);
        const conv = i ? (stages[i - 1].value ? (s.value / stages[i - 1].value) * 100 : 0) : null;
        return (
          <div key={s.label} style={{ display: "grid", gridTemplateColumns: "minmax(110px, 170px) 1fr 64px", alignItems: "center", gap: 12 }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 12.5, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.label}</div>
              {s.note && <div style={{ fontSize: 10.5, color: "var(--faint)", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.note}</div>}
            </div>
            <div style={{ position: "relative", height: 30 }}>
              <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: w + "%", borderRadius: 8, background: "linear-gradient(90deg, color-mix(in oklab, #4263EB " + (90 - i * 10) + "%, var(--teal, #16B8A6)), color-mix(in oklab, #4263EB " + (70 - i * 10) + "%, var(--teal, #16B8A6)))",
                transformOrigin: "left", animation: "rcGrow .9s cubic-bezier(.16,1,.3,1) " + i * 70 + "ms both", display: "flex", alignItems: "center", paddingLeft: 10 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: "#fff", whiteSpace: "nowrap", textShadow: "0 1px 2px rgba(0,0,0,.3)" }}>{format(s.value)}</span>
              </div>
            </div>
            <div style={{ textAlign: "right", fontFamily: "var(--mono)", fontSize: 10.5, color: conv === null ? "var(--faint)" : "var(--dim)" }}>{conv === null ? "start" : conv.toFixed(conv < 10 ? 1 : 0) + "%"}</div>
          </div>
        );
      })}
    </div>
  );
}
