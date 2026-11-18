import { Fragment, useState, type ReactNode } from "react";
import AgentFace from "../../../components/AgentFace";
import { Badge, Button, Chip, Empty, Grid, Label, Page, Segmented, Stat, Timeline } from "../../ui";
import { Icon } from "../../icons";
import { useNav } from "../../nav";
import { openDrawer } from "../../store";
import { AGENT_RUNS, RECRUIT_AGENTS, type AgentRun } from "../../data";
import { num } from "../../format";

/* Agent run history: every scripted run in the demo, filterable by agent and
   result. Select a run to see what it read, what it produced and the guardrail
   it ran under. No run takes a real external action. */

type Tone = "accent" | "ok" | "warn" | "bad" | "neutral" | "teal";
type Result = AgentRun["result"];
const RESULT: Record<Result, { label: string; tone: Tone; icon: string }> = {
  ok: { label: "Clean", tone: "teal", icon: "check" },
  partial: { label: "Partial", tone: "warn", icon: "alert" },
  waiting: { label: "Waiting on John", tone: "accent", icon: "clock" },
  failed: { label: "Failed", tone: "bad", icon: "x" },
};
const AGENT = Object.fromEntries(RECRUIT_AGENTS.map(a => [a.id, a]));
const cost = (r: AgentRun) => Number(r.cost.replace(/[^0-9.]/g, "")) || 0;
const seconds = (d: string) => Number((d.match(/(\d+)m/) || [0, 0])[1]) * 60 + Number((d.match(/(\d+)s/) || [0, 0])[1]);
const order = (r: AgentRun) => (r.started.startsWith("Today") ? 0 : 1) * 10000 - Number(r.started.replace(/\D/g, "").slice(-4) || 0);
const TEMPLATE = "minmax(120px, .9fr) minmax(170px, 1.3fr) 128px 110px minmax(150px, 1.2fr) minmax(200px, 1.8fr) 64px 34px";

export default function RunHistory() {
  const nav = useNav();
  const [agent, setAgent] = useState("all");
  const [result, setResult] = useState<"all" | Result>("all");
  const [open, setOpen] = useState<string | null>(null);

  const today = AGENT_RUNS.filter(r => r.started.startsWith("Today"));
  const clean = today.filter(r => r.result === "ok").length;
  const issues = today.filter(r => r.result === "partial" || r.result === "failed").length;
  const spend = today.reduce((t, r) => t + cost(r), 0);
  const totalRuns = RECRUIT_AGENTS.reduce((t, a) => t + a.runsToday, 0);
  const maxSec = Math.max(...AGENT_RUNS.map(r => seconds(r.duration)));

  const rows = AGENT_RUNS.filter(r => (agent === "all" || r.agentId === agent) && (result === "all" || r.result === result))
    .slice().sort((a, b) => order(a) - order(b));

  return (
    <Page wide eyebrow="AGENTS" title="Run history"
      sub="Every scripted run in this demo, with what it read, what it produced and what it cost. Select a run for the detail."
      actions={<Button icon="users" onClick={() => nav.go("Agents", "overview")}>Agent overview</Button>}>

      <Grid cols="rc-g4">
        <Stat icon="activity" label="Logged runs today" value={today.length} sub={"A sample of " + num(totalRuns) + " runs today"} />
        <Stat icon="check" tone="teal" label="Clean runs" value={clean + " of " + today.length} sub={Math.round((clean / (today.length || 1)) * 100) + "% of logged runs"} />
        <Stat icon="alert" tone="warn" label="Need a look" value={issues} sub="Partial or failed today" />
        <Stat icon="euro" label="Cost today" value={"€" + spend.toFixed(2)} sub="Logged runs, simulated" />
      </Grid>

      <div className="rc-col" style={{ gap: 10 }}>
        <div className="rc-row rc-wrap" style={{ gap: 6 }}>
          <Chip active={agent === "all"} onClick={() => setAgent("all")}>All agents</Chip>
          {RECRUIT_AGENTS.map(a => (
            <Chip key={a.id} active={agent === a.id} onClick={() => setAgent(agent === a.id ? "all" : a.id)} style={{ paddingLeft: 5 }}>
              <AgentFace shape={a.shape} state={a.state} tint={a.tint} size="18" />{a.name}
            </Chip>
          ))}
        </div>
        <div className="rc-scroll-x">
          <Segmented size="sm" value={result} onChange={setResult}
            options={[{ id: "all", label: "All results" }, { id: "ok", label: "Clean" }, { id: "partial", label: "Partial" }, { id: "waiting", label: "Waiting" }, { id: "failed", label: "Failed" }]} />
        </div>
      </div>

      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--card-r, 18px)", overflow: "hidden", boxShadow: "var(--card-shadow)" }}>
        <div className="rc-scroll-x">
          <div style={{ minWidth: 960 }}>
            <div style={{ display: "grid", gridTemplateColumns: TEMPLATE, background: "var(--surface-faint)", borderBottom: "1px solid var(--border)" }}>
              {["Started", "Agent", "Result", "Duration", "Records", "Output", "Cost", ""].map((h, i) => (
                <div key={i} style={{ padding: "10px 16px", fontSize: 11.5, fontWeight: 500, color: "var(--faint)", textAlign: h === "Cost" ? "right" : "left" }}>{h}</div>
              ))}
            </div>
            {rows.map((r, i) => {
              const a = AGENT[r.agentId];
              const res = RESULT[r.result];
              const isOpen = open === r.id;
              return (
                <Fragment key={r.id}>
                  <div role="button" tabIndex={0} aria-expanded={isOpen} className="rc-rowhover rc-focus"
                    onClick={() => setOpen(isOpen ? null : r.id)} onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setOpen(isOpen ? null : r.id); } }}
                    style={{ display: "grid", gridTemplateColumns: TEMPLATE, alignItems: "center", borderTop: i ? "1px solid var(--border)" : 0, background: isOpen ? "var(--surface-2)" : undefined }}>
                    <Cell><span style={{ fontFamily: "var(--mono)", fontSize: 12, color: "var(--dim)" }}>{r.started}</span></Cell>
                    <Cell>
                      <span className="rc-row" style={{ gap: 9 }}>
                        {a && <AgentFace shape={a.shape} state={a.state} tint={a.tint} size="24" />}
                        <span className="rc-ellipsis" style={{ fontSize: 13, color: "var(--ink)", fontWeight: 500 }}>{a?.name}</span>
                      </span>
                    </Cell>
                    <Cell><Badge tone={res.tone} icon={res.icon}>{res.label}</Badge></Cell>
                    <Cell>
                      <div style={{ fontSize: 12.5, fontVariantNumeric: "tabular-nums" }}>{r.duration}</div>
                      <div style={{ height: 3, borderRadius: 999, background: "var(--track)", marginTop: 5, overflow: "hidden" }}>
                        <div style={{ width: Math.max(4, (seconds(r.duration) / maxSec) * 100) + "%", height: "100%", background: "var(--accent)", borderRadius: 999 }} />
                      </div>
                    </Cell>
                    <Cell><span className="rc-ellipsis" style={{ display: "block", fontSize: 12.5, color: "var(--body)" }}>{r.records}</span></Cell>
                    <Cell><span className="rc-ellipsis" style={{ display: "block", fontSize: 12.5, color: "var(--body)" }}>{r.output}</span></Cell>
                    <Cell align="right"><span style={{ fontSize: 12.5, fontVariantNumeric: "tabular-nums" }}>{r.cost}</span></Cell>
                    <Cell><span style={{ color: "var(--faint)", display: "flex", transform: isOpen ? "rotate(90deg)" : "none", transition: "transform .25s var(--ease)" }}><Icon name="chevronRight" size={14} /></span></Cell>
                  </div>
                  {isOpen && a && (
                    <div className="rc-fade" style={{ padding: "16px 18px 18px", background: "var(--surface-faint)", borderTop: "1px solid var(--border)" }}>
                      <div className="rc-grid rc-g3" style={{ gap: 18 }}>
                        <div style={{ minWidth: 0 }}>
                          <Label>Run trace</Label>
                          <div style={{ marginTop: 10 }}>
                            <Timeline items={[
                              { when: r.started, title: "Started", body: a.schedule, tone: "accent" },
                              { when: r.duration, title: "Read " + r.records, body: a.role },
                              { when: r.cost, title: res.label + " result", body: r.output, tone: res.tone },
                            ]} />
                          </div>
                        </div>
                        <div className="rc-col" style={{ gap: 10, minWidth: 0 }}>
                          <Label>Guardrail it ran under</Label>
                          <div className="rc-row" style={{ gap: 9, alignItems: "flex-start", fontSize: 12.5, color: "var(--body)", lineHeight: 1.5 }}>
                            <span style={{ color: "var(--teal, var(--ok))", marginTop: 2 }}><Icon name="shield" size={13} /></span>{a.guardrail}
                          </div>
                          <Label style={{ marginTop: 4 }}>What it produces</Label>
                          <div className="rc-row rc-wrap" style={{ gap: 6 }}>{a.outputs.map(o => <Chip key={o}>{o}</Chip>)}</div>
                          {r.result === "failed" && <div style={{ fontSize: 12, color: "var(--warn)", lineHeight: 1.5 }}>Nothing was lost: the work moved to a manual queue for a person to pick up.</div>}
                          {r.result === "waiting" && <div style={{ fontSize: 12, color: "var(--dim)", lineHeight: 1.5 }}>The draft waits for John. Agents never send outreach on their own.</div>}
                        </div>
                        <div className="rc-col" style={{ gap: 10, minWidth: 0 }}>
                          <Label>Related records</Label>
                          <div className="rc-row rc-wrap" style={{ gap: 6 }}>
                            {a.related.map(x => (
                              <Chip key={x.ref} onClick={() => {
                                if (x.ref.startsWith("c-")) openDrawer("candidate", x.ref);
                                else if (x.ref.startsWith("e-")) openDrawer("employer", x.ref);
                                else if (x.ref.startsWith("v-")) openDrawer("vacancy", x.ref);
                                else if (x.ref.startsWith("crs-")) openDrawer("course", x.ref);
                                else if (x.ref.startsWith("pt-")) nav.go("hq.learning", "institutions");
                              }}><span style={{ fontSize: 10, color: "var(--faint)" }}>{x.kind}</span>{x.label}</Chip>
                            ))}
                          </div>
                          <div className="rc-row rc-wrap" style={{ gap: 8, marginTop: 4 }}>
                            <Button size="sm" variant="primary" iconRight="arrowRight" onClick={() => nav.go("Agents", "detail:" + a.id)}>Open agent</Button>
                            {a.recommendations[0] && <Button size="sm" onClick={() => nav.go(a.recommendations[0].go.page, a.recommendations[0].go.tab)}>{a.recommendations[0].action}</Button>}
                          </div>
                          <div style={{ fontSize: 11.5, color: "var(--faint)" }}>Simulated run. No external action was taken.</div>
                        </div>
                      </div>
                    </div>
                  )}
                </Fragment>
              );
            })}
            {!rows.length && (
              <Empty icon="filter" title="No runs match" body="Try another agent or result filter."
                action={<Button size="sm" onClick={() => { setAgent("all"); setResult("all"); }}>Clear filters</Button>} />
            )}
          </div>
        </div>
        <div style={{ padding: "11px 18px", borderTop: "1px solid var(--border)", background: "var(--surface-faint)", fontSize: 11.5, color: "var(--faint)" }}>
          Showing {rows.length} of {AGENT_RUNS.length} logged runs from today and yesterday. Costs are simulated model costs for the demo.
        </div>
      </div>
    </Page>
  );
}

function Cell({ children, align }: { children: ReactNode; align?: "right" }) {
  return <div style={{ padding: "12px 16px", minWidth: 0, textAlign: align || "left" }}>{children}</div>;
}
