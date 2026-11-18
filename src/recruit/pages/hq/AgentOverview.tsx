import { useState } from "react";
import AgentFace from "../../../components/AgentFace";
import { Badge, Button, Card, Chip, Grid, Label, Note, Page, Stat } from "../../ui";
import { Icon } from "../../icons";
import { useNav, type NavApi } from "../../nav";
import { openDrawer } from "../../store";
import { RECRUIT_AGENTS, type RecruitAgent } from "../../data";
import { num, pctRaw } from "../../format";

/* The eight Recruit agents on the Pulse Agents page. Runs and outputs are
   scripted demo fixtures: the agents draft, rank and flag, people decide, and
   no agent takes a real external action. */

type Tone = "accent" | "ok" | "warn" | "bad" | "neutral" | "teal";
const STATE: Record<RecruitAgent["state"], { label: string; tone: Tone }> = {
  working: { label: "Working", tone: "accent" },
  thinking: { label: "Thinking", tone: "warn" },
  waiting: { label: "Waiting on a person", tone: "neutral" },
  complete: { label: "Complete", tone: "teal" },
  attention: { label: "Needs attention", tone: "bad" },
  idle: { label: "Idle", tone: "neutral" },
};
const WIDE = new Set(["briefing", "ops", "verify", "growth"]);

const GRID_CSS = `
.hq-agents{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px}
.hq-agents>*{min-width:0}
.hq-agents>.hq-wide{grid-column:span 2}
@media (max-width:1180px){.hq-agents{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media (max-width:640px){.hq-agents{grid-template-columns:minmax(0,1fr)}.hq-agents>.hq-wide{grid-column:auto}}`;

/** Related-record chips open the shared drawer for the record type. */
function openRef(ref: string, nav: NavApi) {
  if (ref.startsWith("c-")) openDrawer("candidate", ref);
  else if (ref.startsWith("e-")) openDrawer("employer", ref);
  else if (ref.startsWith("v-")) openDrawer("vacancy", ref);
  else if (ref.startsWith("o-")) openDrawer("offer", ref);
  else if (ref.startsWith("crs-")) openDrawer("course", ref);
  else if (ref.startsWith("pt-")) nav.go("hq.learning", "institutions");
}
const opens = (ref: string) => /^(c|e|v|o|crs|pt)-/.test(ref);

export default function AgentOverview() {
  const nav = useNav();
  const runs = RECRUIT_AGENTS.reduce((t, a) => t + a.runsToday, 0);
  const success = RECRUIT_AGENTS.reduce((t, a) => t + a.successRate * a.runsToday, 0) / (runs || 1);
  const needs = RECRUIT_AGENTS.filter(a => a.state === "attention" || a.state === "waiting");

  return (
    <Page wide eyebrow="AGENTS" title="Eight agents, one marketplace"
      sub="They read the marketplace, draft, rank and flag. People make every decision, and no agent takes a real external action in this demo."
      actions={<>
        <Button icon="activity" onClick={() => nav.go("Agents", "runs")}>Run history</Button>
        <Button variant="primary" iconRight="arrowRight" onClick={() => nav.go("Agents", "detail:briefing")}>Open the Briefing Agent</Button>
      </>}>
      <style>{GRID_CSS}</style>

      <Grid cols="rc-g4">
        <Stat icon="bolt" label="Runs today" value={num(runs)} sub="Scripted demo runs" />
        <Stat icon="check" tone="teal" label="Success rate" value={pctRaw(success, 1)} sub="Weighted by runs" />
        <Stat icon="alert" tone="warn" label="Need a person" value={needs.length} sub={needs.map(a => a.name).join(" and ")} />
        <Stat icon="shield" tone="accent" label="External actions taken" value="0" sub="Agents draft; people send" />
      </Grid>

      <div className="hq-agents">
        {RECRUIT_AGENTS.map(a => WIDE.has(a.id) ? <WideAgent key={a.id} a={a} nav={nav} /> : <CompactAgent key={a.id} a={a} nav={nav} />)}
      </div>

      <Note icon="shield">
        Every agent here is a scripted demo fixture. None calls a live model, contacts a candidate or employer, sends a message or changes a verification status. Recommendations open the screen where a person can act.
      </Note>
    </Page>
  );
}

function Header({ a, size }: { a: RecruitAgent; size: number }) {
  const st = STATE[a.state];
  return (
    <div className="rc-row" style={{ gap: 12, alignItems: "flex-start" }}>
      <div style={{ flex: "none", padding: 4, borderRadius: 16, background: "var(--surface-2)", border: "1px solid var(--border)" }}>
        <AgentFace shape={a.shape} state={a.state} tint={a.tint} size={String(size)} />
      </div>
      <div className="rc-grow">
        <div className="rc-row rc-wrap" style={{ gap: 8 }}>
          <span style={{ fontSize: 15, fontWeight: 600, letterSpacing: "-.2px", color: "var(--ink)" }}>{a.name}</span>
          <Badge tone={st.tone} dot>{st.label}</Badge>
        </div>
        <div style={{ fontSize: 12.5, color: "var(--dim)", marginTop: 4, lineHeight: 1.45 }}>{a.role}</div>
      </div>
    </div>
  );
}

function Numbers({ a }: { a: RecruitAgent }) {
  return (
    <div className="rc-grid rc-g3" style={{ gap: 8 }}>
      {[["Runs today", num(a.runsToday)], ["Success", a.successRate + "%"], ["Last run", a.lastRun]].map(([k, v]) => (
        <div key={k} style={{ padding: "9px 11px", borderRadius: 12, background: "var(--surface-2)", border: "1px solid var(--border)", minWidth: 0 }}>
          <div style={{ fontSize: 10.5, color: "var(--faint)" }}>{k}</div>
          <div style={{ fontSize: 16, fontWeight: 600, letterSpacing: "-.4px", marginTop: 3, fontVariantNumeric: "tabular-nums" }}>{v}</div>
        </div>
      ))}
    </div>
  );
}

function Guardrail({ a }: { a: RecruitAgent }) {
  return (
    <div className="rc-row" style={{ gap: 9, alignItems: "flex-start", padding: "9px 11px", borderRadius: 12, background: "var(--surface-faint)", border: "1px solid var(--border)" }}>
      <span style={{ color: "var(--teal, var(--ok))", marginTop: 1 }}><Icon name="shield" size={13} /></span>
      <div style={{ fontSize: 12, color: "var(--body)", lineHeight: 1.45 }}><span style={{ color: "var(--ink)", fontWeight: 500 }}>Guardrail.</span> {a.guardrail}</div>
    </div>
  );
}

function Related({ a, nav }: { a: RecruitAgent; nav: NavApi }) {
  if (!a.related.length) return null;
  return (
    <div className="rc-row rc-wrap" style={{ gap: 6 }}>
      {a.related.map(r => (
        <Chip key={r.ref} onClick={opens(r.ref) ? () => openRef(r.ref, nav) : undefined}>
          <span style={{ fontSize: 10, color: "var(--faint)" }}>{r.kind}</span>{r.label}
        </Chip>
      ))}
    </div>
  );
}

function Recommendations({ a, nav, limit }: { a: RecruitAgent; nav: NavApi; limit?: number }) {
  const list = limit ? a.recommendations.slice(0, limit) : a.recommendations;
  return (
    <div className="rc-col" style={{ gap: 8 }}>
      {list.map(r => (
        <div key={r.text} className="rc-row rc-wrap" style={{ gap: 10, padding: "10px 12px", borderRadius: 12, background: "var(--accent-faint)", border: "1px solid var(--accent-line)" }}>
          <span style={{ color: "var(--accent)" }}><Icon name="sparkle" size={13} /></span>
          <span className="rc-grow" style={{ fontSize: 12.5, color: "var(--body)", lineHeight: 1.45, minWidth: 160 }}>{r.text}</span>
          <Button size="sm" iconRight="arrowRight" onClick={() => nav.go(r.go.page, r.go.tab)}>{r.action}</Button>
        </div>
      ))}
    </div>
  );
}

function WideAgent({ a, nav }: { a: RecruitAgent; nav: NavApi }) {
  return (
    <Card className="hq-wide" pad={22} tone={a.state === "attention" ? "bad" : undefined}
      style={a.id === "briefing" ? { background: "linear-gradient(140deg, color-mix(in oklab, #4263EB 12%, var(--surface)) 0%, var(--surface) 55%)" } : undefined}>
      <div className="rc-row" style={{ alignItems: "flex-start", gap: 12 }}>
        <div className="rc-grow"><Header a={a} size={52} /></div>
        <Button size="sm" variant="primary" iconRight="arrowRight" onClick={() => nav.go("Agents", "detail:" + a.id)}>Open agent</Button>
      </div>
      <div style={{ fontSize: 13, color: "var(--body)", lineHeight: 1.6, marginTop: 14 }}>{a.description}</div>
      <div className="rc-grid rc-g2" style={{ gap: 16, marginTop: 16 }}>
        <div className="rc-col" style={{ gap: 10 }}>
          <Label>Responsibilities</Label>
          <div className="rc-col" style={{ gap: 7 }}>
            {a.responsibilities.map(r => (
              <div key={r} className="rc-row" style={{ gap: 8, alignItems: "flex-start", fontSize: 12.5, color: "var(--body)", lineHeight: 1.45 }}>
                <span style={{ color: "var(--accent)", marginTop: 2 }}><Icon name="check" size={12} stroke={2.2} /></span>{r}
              </div>
            ))}
          </div>
          <Label style={{ marginTop: 6 }}>Outputs</Label>
          <div className="rc-row rc-wrap" style={{ gap: 6 }}>{a.outputs.map(o => <Chip key={o}>{o}</Chip>)}</div>
        </div>
        <div className="rc-col" style={{ gap: 10 }}>
          <Numbers a={a} />
          <div className="rc-row" style={{ gap: 8, fontSize: 12, color: "var(--dim)" }}><Icon name="calendar" size={13} />{a.schedule}</div>
          <Guardrail a={a} />
          <Related a={a} nav={nav} />
        </div>
      </div>
      <div style={{ marginTop: 16 }}><Recommendations a={a} nav={nav} /></div>
    </Card>
  );
}

function CompactAgent({ a, nav }: { a: RecruitAgent; nav: NavApi }) {
  const [open, setOpen] = useState(false);
  return (
    <Card pad={18} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <Header a={a} size={42} />
      <div style={{ fontSize: 12.5, color: "var(--body)", lineHeight: 1.55 }}>{a.description}</div>
      <Numbers a={a} />
      <div className="rc-row" style={{ gap: 8, fontSize: 12, color: "var(--dim)" }}><Icon name="calendar" size={13} />{a.schedule}</div>
      <Guardrail a={a} />
      <Recommendations a={a} nav={nav} limit={1} />
      <Related a={a} nav={nav} />
      {open && (
        <div className="rc-col rc-fade" style={{ gap: 9, paddingTop: 10, borderTop: "1px solid var(--border)" }}>
          <Label>Responsibilities</Label>
          {a.responsibilities.map(r => (
            <div key={r} className="rc-row" style={{ gap: 8, alignItems: "flex-start", fontSize: 12, color: "var(--body)" }}>
              <span style={{ color: "var(--accent)", marginTop: 2 }}><Icon name="check" size={11} stroke={2.2} /></span>{r}
            </div>
          ))}
          <Label>Outputs</Label>
          <div className="rc-row rc-wrap" style={{ gap: 6 }}>{a.outputs.map(o => <Chip key={o}>{o}</Chip>)}</div>
        </div>
      )}
      <div className="rc-row" style={{ gap: 8, marginTop: "auto", paddingTop: 2 }}>
        <Button size="sm" variant="ghost" iconRight={open ? "chevronDown" : "chevronRight"} onClick={() => setOpen(!open)}>{open ? "Less" : "Responsibilities"}</Button>
        <span className="rc-grow" />
        <Button size="sm" iconRight="arrowRight" onClick={() => nav.go("Agents", "detail:" + a.id)}>Open agent</Button>
      </div>
    </Card>
  );
}
