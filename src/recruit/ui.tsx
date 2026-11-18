import { Fragment, useEffect, useRef, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Icon } from "./icons";

/* The Recruit UI kit. Every piece is built from the Pulse tokens (surfaces,
   borders, radii, accent fill, mono labels) so new screens read as the same
   product as Home, Records and the rest of the Glass UI. */

type Tone = "accent" | "ok" | "warn" | "bad" | "neutral" | "teal";

const TONE: Record<Tone, { fg: string; bg: string; line: string }> = {
  accent: { fg: "var(--accent)", bg: "var(--accent-soft)", line: "var(--accent-line)" },
  ok: { fg: "var(--ok)", bg: "var(--ok-soft)", line: "color-mix(in oklab, var(--ok) 40%, transparent)" },
  teal: { fg: "var(--teal, var(--ok))", bg: "var(--teal-soft, var(--ok-soft))", line: "color-mix(in oklab, var(--teal, var(--ok)) 40%, transparent)" },
  warn: { fg: "var(--warn)", bg: "var(--warn-soft)", line: "color-mix(in oklab, var(--warn) 40%, transparent)" },
  bad: { fg: "var(--bad)", bg: "var(--bad-soft)", line: "color-mix(in oklab, var(--bad) 40%, transparent)" },
  neutral: { fg: "var(--dim)", bg: "var(--surface-2)", line: "var(--border)" },
};
export const toneColor = (t: Tone) => TONE[t].fg;

/* ── layout ─────────────────────────────────────────────────────────────── */

export function Page({ eyebrow, title, sub, actions, children, wide }: { eyebrow?: string; title: ReactNode; sub?: ReactNode; actions?: ReactNode; children: ReactNode; wide?: boolean }) {
  return (
    <div className={"rc-page" + (wide ? " wide" : "")}>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 20, flexWrap: "wrap", padding: "18px 4px 22px" }}>
        <div style={{ flex: "1 1 420px", minWidth: 0 }}>
          {eyebrow && <Label style={{ letterSpacing: ".16em" }}>{eyebrow}</Label>}
          <h1 style={{ margin: eyebrow ? "8px 0 0" : 0, fontSize: "clamp(30px, 3.2vw, 40px)", fontWeight: 500, letterSpacing: "-1.4px", lineHeight: 1.08, color: "var(--ink)", textWrap: "balance" as CSSProperties["textWrap"] }}>{title}</h1>
          {sub && <div style={{ marginTop: 10, fontSize: 14, lineHeight: 1.6, color: "var(--dim)", maxWidth: "68ch", textWrap: "pretty" as CSSProperties["textWrap"] }}>{sub}</div>}
        </div>
        {actions && <div className="rc-row rc-wrap" style={{ flex: "none", gap: 8 }}>{actions}</div>}
      </div>
      <div className="rc-col" style={{ gap: 14 }}>{children}</div>
    </div>
  );
}

export function Grid({ cols = "rc-g2", gap = 14, children, style }: { cols?: string; gap?: number; children: ReactNode; style?: CSSProperties }) {
  return <div className={"rc-grid " + cols} style={{ gap, ...style }}>{children}</div>;
}

export function Card({ title, sub, action, children, pad = 20, style, onClick, tone, glass, className, headerStyle }: {
  title?: ReactNode; sub?: ReactNode; action?: ReactNode; children?: ReactNode; pad?: number | string; style?: CSSProperties;
  onClick?: () => void; tone?: Tone; glass?: boolean; className?: string; headerStyle?: CSSProperties;
}) {
  const border = tone ? TONE[tone].line : "var(--border)";
  return (
    <div className={"rc-card" + (onClick ? " rc-click" : "") + (className ? " " + className : "")} onClick={onClick}
      style={{ position: "relative", minWidth: 0, background: glass ? "var(--glass-surface)" : "var(--surface)", border: "1px solid " + border,
        borderRadius: "var(--card-r, 18px)", boxShadow: "var(--card-shadow)", backdropFilter: "blur(20px) saturate(1.3)", padding: pad, ...style }}>
      {(title || action) && (
        <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: children ? 14 : 0, ...headerStyle }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            {title && <div style={{ fontSize: 14, fontWeight: 600, letterSpacing: "-.2px", color: "var(--ink)" }}>{title}</div>}
            {sub && <div style={{ fontSize: 12.5, color: "var(--dim)", marginTop: 4, lineHeight: 1.5 }}>{sub}</div>}
          </div>
          {action && <div style={{ flex: "none", display: "flex", alignItems: "center", gap: 8 }}>{action}</div>}
        </div>
      )}
      {children}
    </div>
  );
}

export function Label({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return <div style={{ fontFamily: "var(--mono)", fontSize: 9.5, letterSpacing: ".13em", textTransform: "uppercase", color: "var(--faint)", ...style }}>{children}</div>;
}

export function Divider({ style }: { style?: CSSProperties }) {
  return <div style={{ height: 1, background: "var(--border)", margin: "14px 0", ...style }} />;
}

export function Section({ title, sub, action, children }: { title: ReactNode; sub?: ReactNode; action?: ReactNode; children: ReactNode }) {
  return (
    <div className="rc-col" style={{ gap: 12, marginTop: 10 }}>
      <div className="rc-row" style={{ alignItems: "flex-end", padding: "0 4px" }}>
        <div className="rc-grow">
          <div style={{ fontSize: 17, fontWeight: 600, letterSpacing: "-.3px" }}>{title}</div>
          {sub && <div style={{ fontSize: 13, color: "var(--dim)", marginTop: 4 }}>{sub}</div>}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

/* ── text and status ────────────────────────────────────────────────────── */

export function Badge({ tone = "neutral", children, dot, icon, style }: { tone?: Tone; children: ReactNode; dot?: boolean; icon?: string; style?: CSSProperties }) {
  const t = TONE[tone];
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, height: 22, padding: "0 9px", borderRadius: "var(--chip-r, 8px)",
      background: t.bg, color: t.fg, border: "1px solid " + t.line, fontSize: 11, fontWeight: 500, whiteSpace: "nowrap", flex: "none", ...style }}>
      {dot && <span style={{ width: 6, height: 6, borderRadius: 2, background: t.fg }} />}
      {icon && <Icon name={icon} size={11} stroke={2.1} />}
      {children}
    </span>
  );
}

export function VerifyBadge({ status, compact }: { status: "verified" | "self" | "pending"; compact?: boolean }) {
  if (status === "verified") return <Badge tone="teal" icon="verified">{compact ? "Verified" : "Verified"}</Badge>;
  if (status === "pending") return <Badge tone="warn" icon="clock">{compact ? "Pending" : "Verification pending"}</Badge>;
  return <Badge tone="neutral" icon="edit">{compact ? "Self" : "Self-reported"}</Badge>;
}

export function DemoTag({ children = "Illustrative", title }: { children?: ReactNode; title?: string }) {
  return (
    <span title={title || "Illustrative estimate from demo data. Not a guarantee or a measured result."}
      style={{ display: "inline-flex", alignItems: "center", gap: 5, height: 20, padding: "0 8px", borderRadius: 999, border: "1px dashed var(--border-strong)",
        color: "var(--faint)", fontFamily: "var(--mono)", fontSize: 9, letterSpacing: ".1em", textTransform: "uppercase", whiteSpace: "nowrap", flex: "none" }}>
      <Icon name="info" size={10} stroke={2} />{children}
    </span>
  );
}

export function Chip({ children, active, onClick, onRemove, tone, style }: { children: ReactNode; active?: boolean; onClick?: () => void; onRemove?: () => void; tone?: Tone; style?: CSSProperties }) {
  const t = tone ? TONE[tone] : null;
  return (
    <span onClick={onClick} className={onClick ? "rc-chip-btn" : undefined}
      style={{ display: "inline-flex", alignItems: "center", gap: 6, height: 28, padding: onRemove ? "0 6px 0 11px" : "0 11px", borderRadius: "var(--r-ctl, 10px)",
        background: active ? "var(--accent-soft)" : t ? t.bg : "var(--surface-2)", border: "1px solid " + (active ? "var(--accent-line)" : t ? t.line : "var(--border)"),
        color: active ? "var(--ink)" : t ? t.fg : "var(--body)", fontSize: 12, whiteSpace: "nowrap", flex: "none", ...style }}>
      {children}
      {onRemove && (
        <button onClick={e => { e.stopPropagation(); onRemove(); }} aria-label="Remove" className="rc-btn"
          style={{ width: 18, height: 18, border: 0, borderRadius: 999, background: "var(--track)", color: "var(--dim)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", padding: 0 }}>
          <Icon name="x" size={9} stroke={2.6} />
        </button>
      )}
    </span>
  );
}

export function Avatar({ initials, tint = "#9fb4ff", size = 36, square, style }: { initials: string; tint?: string; size?: number; square?: boolean; style?: CSSProperties }) {
  return (
    <span style={{ width: size, height: size, flex: "none", borderRadius: square ? Math.round(size * 0.3) : 999, background: tint, color: "#0d1220",
      display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: Math.max(9.5, size * 0.32), fontWeight: 650, letterSpacing: ".02em", ...style }}>
      {initials}
    </span>
  );
}

export function Stat({ label, value, sub, delta, deltaTone = "ok", icon, tone, big, onClick, style }: {
  label: ReactNode; value: ReactNode; sub?: ReactNode; delta?: ReactNode; deltaTone?: Tone; icon?: string; tone?: Tone; big?: boolean; onClick?: () => void; style?: CSSProperties;
}) {
  return (
    <Card pad="16px 18px" onClick={onClick} style={style}>
      <div className="rc-row" style={{ gap: 8 }}>
        {icon && <span style={{ width: 26, height: 26, borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", background: tone ? TONE[tone].bg : "var(--surface-2)", color: tone ? TONE[tone].fg : "var(--dim)" }}><Icon name={icon} size={14} /></span>}
        <div className="rc-grow rc-ellipsis" style={{ fontSize: 12, color: "var(--dim)" }}>{label}</div>
      </div>
      <div style={{ fontSize: big ? 30 : 24, fontWeight: 600, letterSpacing: big ? "-1.2px" : "-.8px", marginTop: 10, lineHeight: 1, color: "var(--ink)", fontVariantNumeric: "tabular-nums" }}>{value}</div>
      {(delta || sub) && (
        <div className="rc-row" style={{ marginTop: 8, gap: 8, fontSize: 11.5 }}>
          {delta && <span style={{ color: TONE[deltaTone].fg, fontWeight: 500 }}>{delta}</span>}
          {sub && <span className="rc-ellipsis" style={{ color: "var(--faint)" }}>{sub}</span>}
        </div>
      )}
    </Card>
  );
}

export function KV({ items, cols = 2 }: { items: { k: ReactNode; v: ReactNode }[]; cols?: number }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(" + cols + ", minmax(0,1fr))", gap: 10 }}>
      {items.map((it, i) => (
        <div key={i} style={{ padding: "11px 13px", background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: "var(--r-sm, 12px)", minWidth: 0 }}>
          <Label style={{ fontSize: 8.5 }}>{it.k}</Label>
          <div style={{ fontSize: 13, color: "var(--ink)", marginTop: 5, overflow: "hidden", textOverflow: "ellipsis" }}>{it.v}</div>
        </div>
      ))}
    </div>
  );
}

export function Progress({ value, max = 100, tone = "accent", height = 6, style }: { value: number; max?: number; tone?: Tone; height?: number; style?: CSSProperties }) {
  const p = Math.max(0, Math.min(1, value / max));
  return (
    <div style={{ height, borderRadius: 999, background: "var(--track)", overflow: "hidden", ...style }}>
      <div style={{ height: "100%", width: p * 100 + "%", borderRadius: 999, background: tone === "accent" ? "var(--accent-fill, var(--accent))" : TONE[tone].fg, transformOrigin: "left", animation: "rcGrow .9s cubic-bezier(.16,1,.3,1) both", transition: "width .5s var(--ease)" }} />
    </div>
  );
}

export function Empty({ icon = "info", title, body, action }: { icon?: string; title: ReactNode; body?: ReactNode; action?: ReactNode }) {
  return (
    <div style={{ padding: "36px 20px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
      <span style={{ width: 40, height: 40, borderRadius: 13, background: "var(--surface-2)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--dim)" }}><Icon name={icon} size={17} /></span>
      <div style={{ fontSize: 14, fontWeight: 500, marginTop: 4 }}>{title}</div>
      {body && <div style={{ fontSize: 12.5, color: "var(--dim)", maxWidth: 380, lineHeight: 1.55 }}>{body}</div>}
      {action && <div style={{ marginTop: 6 }}>{action}</div>}
    </div>
  );
}

export function Note({ children, icon = "info", tone = "neutral", style }: { children: ReactNode; icon?: string; tone?: Tone; style?: CSSProperties }) {
  const t = TONE[tone];
  return (
    <div className="rc-row" style={{ alignItems: "flex-start", gap: 9, padding: "10px 13px", borderRadius: "var(--r-sm, 12px)", background: tone === "neutral" ? "var(--surface-faint)" : t.bg, border: "1px solid " + (tone === "neutral" ? "var(--border)" : t.line), fontSize: 12, lineHeight: 1.55, color: "var(--body)", ...style }}>
      <span style={{ color: t.fg, marginTop: 1 }}><Icon name={icon} size={13} /></span>
      <div className="rc-grow">{children}</div>
    </div>
  );
}

export function Timeline({ items }: { items: { when: ReactNode; title: ReactNode; body?: ReactNode; tone?: Tone }[] }) {
  return (
    <div>
      {items.map((it, i) => (
        <div key={i} style={{ display: "flex", gap: 13 }}>
          <div style={{ width: 12, display: "flex", flexDirection: "column", alignItems: "center", flex: "none" }}>
            <span style={{ width: 9, height: 9, borderRadius: 3, marginTop: 5, background: it.tone ? TONE[it.tone].fg : "var(--accent)", boxShadow: "0 0 0 3px " + (it.tone ? TONE[it.tone].bg : "var(--accent-soft)") }} />
            {i < items.length - 1 && <span style={{ flex: 1, width: 1, background: "var(--border)", marginTop: 4 }} />}
          </div>
          <div style={{ flex: 1, minWidth: 0, paddingBottom: i < items.length - 1 ? 16 : 0 }}>
            <div className="rc-row" style={{ gap: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 500, color: "var(--ink)" }}>{it.title}</span>
              <span style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--faint)", marginLeft: "auto", whiteSpace: "nowrap" }}>{it.when}</span>
            </div>
            {it.body && <div style={{ fontSize: 12.5, color: "var(--dim)", marginTop: 3, lineHeight: 1.5 }}>{it.body}</div>}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── controls ───────────────────────────────────────────────────────────── */

type BtnProps = { children?: ReactNode; variant?: "primary" | "secondary" | "ghost" | "danger"; size?: "sm" | "md" | "lg"; icon?: string; iconRight?: string;
  onClick?: (e: React.MouseEvent) => void; disabled?: boolean; full?: boolean; title?: string; style?: CSSProperties; type?: "button" | "submit" };

export function Button({ children, variant = "secondary", size = "md", icon, iconRight, onClick, disabled, full, title, style, type = "button" }: BtnProps) {
  const h = size === "sm" ? 30 : size === "lg" ? 44 : 36;
  const base: CSSProperties = { height: h, padding: children ? (size === "sm" ? "0 12px" : size === "lg" ? "0 20px" : "0 15px") : 0, width: children ? (full ? "100%" : undefined) : h,
    display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, fontSize: size === "sm" ? 12 : size === "lg" ? 14.5 : 13, fontWeight: 500,
    borderRadius: "var(--cta-r, 12px)", cursor: disabled ? "not-allowed" : "pointer", whiteSpace: "nowrap", flex: "none" };
  const look: Record<string, CSSProperties> = {
    primary: { background: "var(--accent-fill, var(--accent))", color: "var(--on-accent)", border: "1px solid transparent", boxShadow: "var(--accent-glow, none)" },
    secondary: { background: "var(--surface-2)", color: "var(--body)", border: "1px solid var(--border)" },
    ghost: { background: "transparent", color: "var(--dim)", border: "1px solid transparent" },
    danger: { background: "var(--bad-soft)", color: "var(--bad)", border: "1px solid color-mix(in oklab, var(--bad) 35%, transparent)" },
  };
  return (
    <button type={type} title={title} disabled={disabled} onClick={onClick} className={"rc-btn rc-btn-" + (variant === "danger" ? "secondary" : variant)} style={{ ...base, ...look[variant], ...style }}>
      {icon && <Icon name={icon} size={size === "sm" ? 13 : 15} stroke={1.9} />}
      {children}
      {iconRight && <Icon name={iconRight} size={size === "sm" ? 13 : 15} stroke={1.9} />}
    </button>
  );
}

export function Segmented<T extends string>({ options, value, onChange, size = "md", style }: { options: { id: T; label: ReactNode }[]; value: T; onChange: (v: T) => void; size?: "sm" | "md"; style?: CSSProperties }) {
  const idx = Math.max(0, options.findIndex(o => o.id === value));
  const h = size === "sm" ? 28 : 34;
  return (
    <div style={{ position: "relative", display: "inline-grid", gridAutoFlow: "column", gridAutoColumns: "1fr", padding: 3, background: "var(--surface-faint)",
      border: "1px solid var(--border)", borderRadius: 999, maxWidth: "100%", ...style }}>
      <span style={{ position: "absolute", left: 3, top: 3, bottom: 3, width: "calc((100% - 6px) / " + options.length + ")", transform: "translateX(" + idx * 100 + "%)",
        borderRadius: 999, background: "var(--surface-2)", boxShadow: "0 1px 0 rgba(255,255,255,.05) inset, 0 4px 12px rgba(0,0,0,.3)", transition: "transform .42s cubic-bezier(.22,.9,.16,1)" }} />
      {options.map(o => (
        <button key={o.id} onClick={() => onChange(o.id)} className="rc-focus"
          style={{ position: "relative", zIndex: 1, height: h, padding: "0 14px", border: 0, background: "none", cursor: "pointer", whiteSpace: "nowrap",
            fontSize: size === "sm" ? 12 : 12.5, fontWeight: o.id === value ? 600 : 500, color: o.id === value ? "var(--ink)" : "var(--dim)", transition: "color .3s var(--ease)" }}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Field({ label, hint, error, children, style }: { label: ReactNode; hint?: ReactNode; error?: ReactNode; children: ReactNode; style?: CSSProperties }) {
  return (
    <div role="group" style={{ display: "flex", flexDirection: "column", gap: 7, minWidth: 0, ...style }}>
      <span style={{ fontSize: 12, fontWeight: 500, color: "var(--body)" }}>{label}</span>
      {children}
      {hint && !error && <span style={{ fontSize: 11.5, color: "var(--faint)", lineHeight: 1.45 }}>{hint}</span>}
      {error && <span role="alert" style={{ fontSize: 11.5, color: "var(--bad)" }}>{error}</span>}
    </div>
  );
}

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={"rc-input " + (props.className || "")} />;
}
export function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea rows={3} {...props} className={"rc-input " + (props.className || "")} />;
}
export function Select({ value, onChange, options, style }: { value: string; onChange: (v: string) => void; options: (string | { value: string; label: string })[]; style?: CSSProperties }) {
  return (
    <select className="rc-input" value={value} onChange={e => onChange(e.target.value)} style={style}>
      {options.map(o => typeof o === "string" ? <option key={o} value={o}>{o}</option> : <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

export function Slider({ value, min, max, step = 1, onChange, label, display }: { value: number; min: number; max: number; step?: number; onChange: (v: number) => void; label?: ReactNode; display?: ReactNode }) {
  const fill = ((value - min) / (max - min)) * 100;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {(label || display) && (
        <div className="rc-row">
          <span className="rc-grow" style={{ fontSize: 12.5, color: "var(--body)" }}>{label}</span>
          <span style={{ fontSize: 14, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{display}</span>
        </div>
      )}
      <input type="range" className="rc-range" min={min} max={max} step={step} value={value} onChange={e => onChange(Number(e.target.value))}
        style={{ ["--fill" as string]: fill + "%" } as CSSProperties} />
    </div>
  );
}

export function Toggle({ on, onChange, label, sub, disabled }: { on: boolean; onChange: (v: boolean) => void; label?: ReactNode; sub?: ReactNode; disabled?: boolean }) {
  return (
    <div className="rc-row" style={{ gap: 12, alignItems: "flex-start", opacity: disabled ? 0.6 : 1 }}>
      {(label || sub) && (
        <div className="rc-grow">
          {label && <div style={{ fontSize: 13, color: "var(--ink)" }}>{label}</div>}
          {sub && <div style={{ fontSize: 11.5, color: "var(--dim)", marginTop: 3, lineHeight: 1.45 }}>{sub}</div>}
        </div>
      )}
      <button role="switch" aria-checked={on} disabled={disabled} onClick={() => onChange(!on)} className="rc-focus"
        style={{ position: "relative", width: 38, height: 22, flex: "none", borderRadius: 999, border: 0, cursor: disabled ? "not-allowed" : "pointer", padding: 0,
          background: on ? "var(--accent-fill, var(--accent))" : "var(--track)", transition: "background .25s var(--ease)" }}>
        <span style={{ position: "absolute", top: 3, left: 3, width: 16, height: 16, borderRadius: 999, background: on ? "var(--on-accent)" : "var(--dim)",
          transform: "translateX(" + (on ? 16 : 0) + "px)", transition: "transform .3s cubic-bezier(.3,1.3,.5,1), background .25s" }} />
      </button>
    </div>
  );
}

export function Checkbox({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: ReactNode }) {
  return (
    <button onClick={() => onChange(!on)} className="rc-focus" style={{ display: "flex", alignItems: "center", gap: 9, background: "none", border: 0, padding: "4px 0", cursor: "pointer", color: "var(--body)", fontSize: 12.5, textAlign: "left" }}>
      <span style={{ width: 17, height: 17, flex: "none", borderRadius: 6, border: "1.5px solid " + (on ? "var(--accent)" : "var(--border-strong)"), background: on ? "var(--accent)" : "transparent",
        display: "flex", alignItems: "center", justifyContent: "center", color: "var(--on-accent)", transition: "background .18s, border-color .18s" }}>
        {on && <Icon name="check" size={10} stroke={3.4} />}
      </span>
      {label}
    </button>
  );
}

/* ── tables ─────────────────────────────────────────────────────────────── */

export interface Col<R> { key: string; label: ReactNode; width?: string; align?: "left" | "right" | "center"; render: (r: R, i: number) => ReactNode; hideSm?: boolean }

export function Table<R>({ cols, rows, onRow, empty, dense, caption }: { cols: Col<R>[]; rows: R[]; onRow?: (r: R) => void; empty?: ReactNode; dense?: boolean; caption?: ReactNode }) {
  const template = cols.map(c => c.width || "1fr").join(" ");
  const pad = dense ? "10px 16px" : "13px 18px";
  return (
    <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--card-r, 18px)", overflow: "hidden", boxShadow: "var(--card-shadow)" }}>
      <div className="rc-table-scroll">
        <div style={{ minWidth: 640 }}>
          <div style={{ display: "grid", gridTemplateColumns: template, background: "var(--surface-faint)", borderBottom: "1px solid var(--border)" }}>
            {cols.map(c => <div key={c.key} className={c.hideSm ? "rc-hide-sm" : undefined} style={{ padding: dense ? "9px 16px" : "10px 18px", fontSize: 11.5, fontWeight: 500, color: "var(--faint)", textAlign: c.align || "left" }}>{c.label}</div>)}
          </div>
          {rows.map((r, i) => (
            <div key={i} className={onRow ? "rc-rowhover" : undefined} onClick={onRow ? () => onRow(r) : undefined}
              style={{ display: "grid", gridTemplateColumns: template, borderTop: i ? "1px solid var(--border)" : 0, alignItems: "center" }}>
              {cols.map(c => <div key={c.key} className={c.hideSm ? "rc-hide-sm" : undefined} style={{ padding: pad, minWidth: 0, fontSize: 13, color: "var(--body)", textAlign: c.align || "left" }}>{c.render(r, i)}</div>)}
            </div>
          ))}
          {!rows.length && (empty || <Empty title="Nothing here yet" />)}
        </div>
      </div>
      {caption && <div style={{ padding: "11px 18px", borderTop: "1px solid var(--border)", background: "var(--surface-faint)", fontSize: 11.5, color: "var(--faint)" }}>{caption}</div>}
    </div>
  );
}

/* ── overlays ───────────────────────────────────────────────────────────── */

/* Escape closes only the top-most overlay: overlays register on a stack. */
const escapeStack: { current: () => void }[] = [];
let escapeBound = false;
function useEscape(open: boolean, onClose: () => void) {
  const ref = useRef(onClose);
  ref.current = onClose;
  useEffect(() => {
    if (!open) return;
    const entry = { get current() { return ref.current; } };
    escapeStack.push(entry);
    if (!escapeBound && typeof window !== "undefined") {
      escapeBound = true;
      window.addEventListener("keydown", e => { if (e.key === "Escape" && escapeStack.length) escapeStack[escapeStack.length - 1].current(); });
    }
    return () => { const i = escapeStack.indexOf(entry); if (i > -1) escapeStack.splice(i, 1); };
  }, [open]);
}

/** Overlays render at the app root (inside the themed shell) so no page transform or stacking context can trap them. */
function Portal({ children }: { children: ReactNode }) {
  const target = typeof document !== "undefined" ? document.getElementById("rc-portal-root") : null;
  return target ? createPortal(children, target) : <>{children}</>;
}

export function Drawer({ open, onClose, eyebrow, title, sub, children, footer, width = 600, badge }: {
  open: boolean; onClose: () => void; eyebrow?: ReactNode; title: ReactNode; sub?: ReactNode; children: ReactNode; footer?: ReactNode; width?: number; badge?: ReactNode;
}) {
  useEscape(open, onClose);
  if (!open) return null;
  return (
    <Portal>
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 80, background: "var(--scrim)", backdropFilter: "blur(6px)", display: "flex", justifyContent: "flex-end", animation: "rcFade .25s var(--ease) both" }}>
      <div onClick={e => e.stopPropagation()} role="dialog" aria-modal="true"
        style={{ width: "min(" + width + "px, 100%)", height: "100%", display: "flex", flexDirection: "column", background: "var(--overlay)", borderLeft: "1px solid var(--border)",
          backdropFilter: "blur(24px)", boxShadow: "-30px 0 80px rgba(0,0,0,.5)", animation: "rcDrawer .38s cubic-bezier(.16,1,.3,1) both" }}>
        <div style={{ flex: "none", display: "flex", alignItems: "flex-start", gap: 12, padding: "22px 24px 18px", borderBottom: "1px solid var(--border)" }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="rc-row" style={{ gap: 9 }}>{eyebrow && <Label>{eyebrow}</Label>}{badge}</div>
            <div style={{ fontSize: 22, fontWeight: 500, letterSpacing: "-.6px", marginTop: eyebrow ? 8 : 0, lineHeight: 1.2 }}>{title}</div>
            {sub && <div style={{ fontSize: 13, color: "var(--dim)", marginTop: 6, lineHeight: 1.5 }}>{sub}</div>}
          </div>
          <CloseButton onClick={onClose} />
        </div>
        <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "20px 24px 28px" }}>{children}</div>
        {footer && <div style={{ flex: "none", display: "flex", alignItems: "center", gap: 10, padding: "14px 24px", borderTop: "1px solid var(--border)", flexWrap: "wrap" }}>{footer}</div>}
      </div>
    </div>
    </Portal>
  );
}

export function Modal({ open, onClose, title, sub, children, footer, width = 640 }: { open: boolean; onClose: () => void; title: ReactNode; sub?: ReactNode; children: ReactNode; footer?: ReactNode; width?: number }) {
  useEscape(open, onClose);
  if (!open) return null;
  return (
    <Portal>
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 82, background: "var(--scrim)", backdropFilter: "blur(6px)", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "7vh 16px 4vh", overflowY: "auto", animation: "rcFade .25s var(--ease) both" }}>
      <div onClick={e => e.stopPropagation()} role="dialog" aria-modal="true"
        style={{ width: "min(" + width + "px, 100%)", background: "var(--overlay)", border: "1px solid var(--border)", borderRadius: "var(--card-r, 18px)", boxShadow: "0 30px 80px rgba(0,0,0,.55)", backdropFilter: "blur(24px)", overflow: "hidden", animation: "riseIn .34s var(--ease) both" }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "20px 24px", borderBottom: "1px solid var(--border)" }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 18, fontWeight: 500, letterSpacing: "-.4px" }}>{title}</div>
            {sub && <div style={{ fontSize: 12.5, color: "var(--dim)", marginTop: 5, lineHeight: 1.5 }}>{sub}</div>}
          </div>
          <CloseButton onClick={onClose} />
        </div>
        <div style={{ padding: "20px 24px" }}>{children}</div>
        {footer && <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 10, padding: "16px 24px", borderTop: "1px solid var(--border)", flexWrap: "wrap" }}>{footer}</div>}
      </div>
    </div>
    </Portal>
  );
}

export function CloseButton({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} aria-label="Close" className="rc-btn rc-btn-secondary"
      style={{ width: 30, height: 30, flex: "none", border: "1px solid var(--border)", borderRadius: "var(--r-ctl, 11px)", background: "none", color: "var(--dim)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }}>
      <Icon name="x" size={12} stroke={2.4} />
    </button>
  );
}

/* ── misc ───────────────────────────────────────────────────────────────── */

/** Small list rows with a dot, used for briefings and activity. */
export function ListRow({ title, sub, meta, dot, onClick, right }: { title: ReactNode; sub?: ReactNode; meta?: ReactNode; dot?: string; onClick?: () => void; right?: ReactNode }) {
  return (
    <div onClick={onClick} className={onClick ? "rc-rowhover" : undefined} style={{ display: "flex", gap: 11, padding: "11px 8px", margin: "0 -8px", borderRadius: 10 }}>
      {dot && <span style={{ width: 7, height: 7, borderRadius: 2, flex: "none", marginTop: 6, background: dot }} />}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, lineHeight: 1.45, color: "var(--ink)" }}>{title}</div>
        {sub && <div style={{ fontSize: 12, color: "var(--dim)", marginTop: 3, lineHeight: 1.45 }}>{sub}</div>}
      </div>
      {meta && <span style={{ flex: "none", fontFamily: "var(--mono)", fontSize: 10.5, color: "var(--faint)", whiteSpace: "nowrap" }}>{meta}</span>}
      {right}
    </div>
  );
}

export function useInterval(fn: () => void, ms: number | null) {
  const ref = useRef(fn);
  ref.current = fn;
  useEffect(() => {
    if (ms === null) return;
    const t = setInterval(() => ref.current(), ms);
    return () => clearInterval(t);
  }, [ms]);
}

export function Spinner({ size = 14 }: { size?: number }) {
  return <span style={{ width: size, height: size, borderRadius: 999, border: "2px solid var(--track)", borderTopColor: "var(--accent)", display: "inline-block", animation: "rcSpin .8s linear infinite", flex: "none" }} />;
}

export { Fragment };
