import { useEffect, useRef, useState } from "react";
import { ROLES, ROLE_META, type Role } from "./nav";
import { Icon } from "./icons";
import { resetDemo, setPersona, setupScene, useRecruit } from "./store";
import { CANDIDATE_BY_ID, DEMO_LABEL, PERSONAS } from "./data";

/* The persistent demo chrome: the experience switcher in the rail, the
   candidate persona picker, and the "illustrative data" marker with the
   presenter guide. None of this is authentication. */

export function RoleSwitcher({ v }: { v: any }) {
  const role: Role = v.role;
  const open = v.railOpen;
  const [menu, setMenu] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!menu) return;
    const off = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setMenu(false); };
    window.addEventListener("mousedown", off);
    return () => window.removeEventListener("mousedown", off);
  }, [menu]);

  if (!open) {
    return (
      <div ref={ref} style={{ position: "relative", marginBottom: 14 }}>
        <button onClick={() => setMenu(m => !m)} title={"Viewing: " + ROLE_META[role].label} className="rc-btn rc-focus"
          style={{ width: 40, height: 40, borderRadius: 13, border: "1px solid var(--accent-line)", background: "var(--accent-faint)", color: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
          <Icon name={ROLE_META[role].icon} size={17} />
        </button>
        {menu && <RoleMenu role={role} onPick={r => { setMenu(false); v.switchRole(r); }} style={{ left: 52, top: 0 }} />}
      </div>
    );
  }
  const idx = ROLES.indexOf(role);
  return (
    <div style={{ margin: "0 0 16px", padding: "0 2px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "0 4px 8px" }}>
        <span style={{ fontFamily: "var(--mono)", fontSize: 9, letterSpacing: ".14em", color: "var(--faint)", flex: 1 }}>DEMO VIEW</span>
        <span style={{ fontSize: 10.5, color: "var(--dim)" }}>{ROLE_META[role].blurb}</span>
      </div>
      <div style={{ position: "relative", display: "grid", gridTemplateColumns: "repeat(4, 1fr)", padding: 3, borderRadius: 14, background: "var(--surface-faint)", border: "1px solid var(--border)" }}>
        <span style={{ position: "absolute", top: 3, bottom: 3, left: 3, width: "calc((100% - 6px) / 4)", transform: "translateX(" + idx * 100 + "%)", borderRadius: 11,
          background: "var(--accent-fill, var(--accent))", boxShadow: "var(--accent-glow, none)", transition: "transform .45s cubic-bezier(.22,.9,.16,1)" }} />
        {ROLES.map(r => (
          <button key={r} onClick={() => v.switchRole(r)} title={ROLE_META[r].label} className="rc-focus"
            style={{ position: "relative", zIndex: 1, height: 46, border: 0, background: "none", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4,
              color: r === role ? "var(--on-accent)" : "var(--dim)", transition: "color .3s var(--ease)", padding: 0 }}>
            <Icon name={ROLE_META[r].icon} size={15} stroke={1.8} />
            <span style={{ fontSize: 10, fontWeight: r === role ? 600 : 500, letterSpacing: "-.1px" }}>{ROLE_META[r].short}</span>
          </button>
        ))}
      </div>
      {role === "candidate" && <PersonaPicker />}
    </div>
  );
}

function RoleMenu({ role, onPick, style }: { role: Role; onPick: (r: Role) => void; style?: React.CSSProperties }) {
  return (
    <div style={{ position: "absolute", zIndex: 90, width: 240, padding: 6, background: "var(--overlay)", border: "1px solid var(--border-strong)", borderRadius: 16, boxShadow: "0 20px 50px rgba(0,0,0,.5)", backdropFilter: "blur(24px)", animation: "popIn .25s var(--ease) both", ...style }}>
      {ROLES.map(r => (
        <button key={r} onClick={() => onPick(r)} className="rc-rowhover"
          style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "9px 10px", border: 0, borderRadius: 11, background: r === role ? "var(--accent-faint)" : "none", color: "var(--ink)", cursor: "pointer", textAlign: "left" }}>
          <span style={{ width: 28, height: 28, borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", background: r === role ? "var(--accent-soft)" : "var(--surface-2)", color: r === role ? "var(--accent)" : "var(--dim)" }}><Icon name={ROLE_META[r].icon} size={14} /></span>
          <span style={{ flex: 1, minWidth: 0 }}>
            <span style={{ display: "block", fontSize: 13, fontWeight: 500 }}>{ROLE_META[r].label}</span>
            <span style={{ display: "block", fontSize: 11, color: "var(--faint)" }}>{ROLE_META[r].blurb}</span>
          </span>
        </button>
      ))}
    </div>
  );
}

function PersonaPicker() {
  const s = useRecruit();
  return (
    <div style={{ marginTop: 10, padding: "9px 10px", borderRadius: 13, background: "var(--surface)", border: "1px solid var(--border)" }}>
      <div style={{ fontFamily: "var(--mono)", fontSize: 8.5, letterSpacing: ".13em", color: "var(--faint)" }}>DEMO PROFILE</div>
      <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
        {PERSONAS.map(id => {
          const c = CANDIDATE_BY_ID[id];
          const on = s.persona === id;
          return (
            <button key={id} onClick={() => setPersona(id)} title={c.name + ", " + c.title} className="rc-focus"
              style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: 6, padding: "5px 6px", borderRadius: 10, cursor: "pointer",
                border: "1px solid " + (on ? "var(--accent-line)" : "transparent"), background: on ? "var(--accent-faint)" : "none", color: on ? "var(--ink)" : "var(--dim)", transition: "background .2s, border-color .2s" }}>
              <span style={{ width: 20, height: 20, borderRadius: 999, background: c.tint, color: "#0d1220", fontSize: 8.5, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}>{c.initials}</span>
              <span style={{ fontSize: 11, fontWeight: on ? 600 : 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.name.split(" ")[0]}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

const SCENES: { n: number; title: string; line: string; page: string; tab?: string }[] = [
  { n: 1, title: "The vision", line: "Recruit replaces the limits of CVs and slow recruitment.", page: "pub.discover", tab: "overview" },
  { n: 2, title: "A candidate's market value", line: "Aoife's Recruit Index, salary range and scenarios.", page: "cand.dashboard", tab: "overview" },
  { n: 3, title: "Beyond the CV", line: "Mark's 17 years in hospitality, mapped to new careers.", page: "cand.explorer", tab: "paths" },
  { n: 4, title: "The live marketplace", line: "Harbourview searches for a GM and finds Sarah.", page: "emp.talent", tab: "discover" },
  { n: 5, title: "The economics", line: "€120,000 salary: €30,000 agency fee or €9,600.", page: "emp.costs", tab: "calculator" },
  { n: 6, title: "Senior talent offers", line: "Sarah compares two offers on her own terms.", page: "cand.offers", tab: "compare" },
  { n: 7, title: "The business at scale", line: "102,480 professionals, 1,280 employers, 48 placements.", page: "Dashboard", tab: "marketplace" },
  { n: 8, title: "The intelligence layer", line: "Agents and the ontology, then back to Home.", page: "Agents", tab: "overview" },
];

/** The persistent illustrative-data marker, with the presenter guide behind it. */
export function DemoChip({ v }: { v: any }) {
  const [open, setOpen] = useState(false);
  const [last, setLast] = useState<number | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const off = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    window.addEventListener("mousedown", off);
    return () => window.removeEventListener("mousedown", off);
  }, [open]);
  const run = (sc: typeof SCENES[number]) => {
    setupScene(sc.n);
    v.rGo(sc.page, sc.tab);
    setLast(sc.n);
  };
  return (
    <div ref={ref} style={{ position: "absolute", left: 18, bottom: 14, zIndex: 20 }}>
      {open && (
        <div style={{ position: "absolute", left: 0, bottom: 42, width: "min(340px, calc(100vw - 40px))", padding: 8, background: "var(--overlay)", border: "1px solid var(--border-strong)", borderRadius: 18, boxShadow: "0 24px 60px rgba(0,0,0,.5)", backdropFilter: "blur(24px)", animation: "popIn .25s var(--ease) both" }}>
          <div style={{ padding: "8px 10px 10px" }}>
            <div style={{ fontSize: 14, fontWeight: 600 }}>Presenter guide</div>
            <div style={{ fontSize: 11.5, color: "var(--dim)", marginTop: 4, lineHeight: 1.5 }}>Eight scenes in order. Each one opens the right view and sets up its story.</div>
          </div>
          <div style={{ maxHeight: "min(52vh, 420px)", overflowY: "auto" }}>
            {SCENES.map(sc => (
              <button key={sc.n} onClick={() => run(sc)} className="rc-rowhover"
                style={{ width: "100%", display: "flex", alignItems: "flex-start", gap: 11, padding: "9px 10px", border: 0, borderRadius: 12, background: last === sc.n ? "var(--accent-faint)" : "none", color: "var(--ink)", cursor: "pointer", textAlign: "left" }}>
                <span style={{ width: 24, height: 24, flex: "none", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--mono)", fontSize: 10.5,
                  background: last === sc.n ? "var(--accent)" : "var(--surface-2)", color: last === sc.n ? "var(--on-accent)" : "var(--dim)", border: "1px solid var(--border)" }}>{sc.n}</span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: "block", fontSize: 13, fontWeight: 500 }}>{sc.title}</span>
                  <span style={{ display: "block", fontSize: 11.5, color: "var(--dim)", marginTop: 2, lineHeight: 1.45 }}>{sc.line}</span>
                </span>
                <Icon name="arrowRight" size={13} style={{ marginTop: 5, color: "var(--faint)" }} />
              </button>
            ))}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 10px 4px", borderTop: "1px solid var(--border)", marginTop: 6 }}>
            <span style={{ flex: 1, fontSize: 11, color: "var(--faint)" }}>Changes are stored in this browser only.</span>
            <button onClick={() => { resetDemo(); setLast(null); }} className="rc-btn rc-btn-secondary" style={{ height: 28, padding: "0 11px", borderRadius: 9, border: "1px solid var(--border)", background: "var(--surface-2)", color: "var(--body)", fontSize: 11.5, cursor: "pointer" }}>Reset demo data</button>
          </div>
        </div>
      )}
      <button onClick={() => setOpen(o => !o)} className="rc-btn rc-focus" title="Presenter guide"
        style={{ display: "flex", alignItems: "center", gap: 8, height: 30, padding: "0 12px 0 5px", borderRadius: 999, border: "1px solid var(--border)", background: "var(--overlay)", backdropFilter: "blur(16px)", color: "var(--dim)", cursor: "pointer", boxShadow: "0 8px 24px rgba(0,0,0,.28)" }}>
        <span style={{ height: 20, padding: "0 7px", borderRadius: 999, background: "var(--warn-soft)", color: "var(--warn)", fontFamily: "var(--mono)", fontSize: 9, letterSpacing: ".14em", display: "flex", alignItems: "center", fontWeight: 600 }}>DEMO</span>
        <span className="rc-demo-label" style={{ fontSize: 11.5, whiteSpace: "nowrap" }}>{DEMO_LABEL}</span>
        <Icon name={open ? "chevronDown" : "chevronRight"} size={12} style={{ transform: open ? "none" : "rotate(-90deg)", transition: "transform .2s" }} />
      </button>
    </div>
  );
}

/** Who you are in the current view, for the rail card and the header. */
export function usePersona(v: any) {
  const s = useRecruit();
  const role: Role = v.role;
  const meta = ROLE_META[role];
  const cand = role === "candidate" ? CANDIDATE_BY_ID[s.persona] : null;
  return { name: cand ? cand.name : meta.who, sub: cand ? cand.title : meta.whoRole, initials: cand ? cand.initials : meta.initials, tint: cand ? cand.tint : meta.tint };
}

export function PersonaName({ v }: { v: any }) { return <>{usePersona(v).name}</>; }
export function PersonaSub({ v }: { v: any }) { return <>{usePersona(v).sub}</>; }
export function PersonaInitials({ v }: { v: any }) { return <>{usePersona(v).initials}</>; }
