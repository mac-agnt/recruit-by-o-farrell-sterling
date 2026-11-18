import { useEffect, useState } from "react";
import { Avatar, Badge, Button, Card, Grid, Label, Note, Page, Segmented } from "../../ui";
import { StackBar } from "../../charts";
import { Icon } from "../../icons";
import { useNav, type NavApi } from "../../nav";
import { HQ_TEAMS, HQ_TEAM, LAUNCH_PLAN, ORG } from "../../data";

/* Work > Launch plan. This is the real business plan, not the illustrative
   scenario: the company was incorporated in June 2026 and that is the only
   milestone marked done. Everything else is in progress or planned. */

type Status = "Done" | "In progress" | "Planned";
type Filter = "all" | Status;
type Item = (typeof LAUNCH_PLAN)[number]["items"][number];

const STATUS: Record<Status, { color: string; tone: "teal" | "accent" | "neutral" }> = {
  "Done": { color: "var(--teal, #16B8A6)", tone: "teal" },
  "In progress": { color: "var(--accent)", tone: "accent" },
  "Planned": { color: "var(--neutral)", tone: "neutral" },
};

const window2months = (w: string): [number, number] => {
  const n = (w.match(/\d+/g) || []).map(Number);
  return n.length >= 2 ? [n[0] - 1, n[n.length - 1]] : [0, n[0] || 3];
};

/** Where each milestone shows up in the product, so the plan connects to the demo. */
function linkFor(label: string, nav: NavApi): { text: string; go: () => void } | null {
  const l = label.toLowerCase();
  if (l.includes("incorporate")) return { text: "Organisation", go: () => nav.go("Settings", "organisation") };
  if (l.includes("pricing")) return { text: "Pricing", go: () => nav.go("Settings", "pricing") };
  if (l.includes("demonstration")) return { text: "Discover Recruit", go: () => nav.switchRole("public") };
  if (l.includes("education partner")) return { text: "Partners", go: () => nav.go("hq.learning", "institutions") };
  if (l.includes("pilot with")) return { text: "Employers", go: () => nav.go("hq.employers", "accounts") };
  if (l.includes("verification")) return { text: "Verification", go: () => nav.go("hq.talent", "verification") };
  if (l.includes("profiles") || l.includes("campaign") || l.includes("event")) return { text: "Growth", go: () => nav.go("Dashboard", "growth") };
  if (l.includes("membership")) return { text: "Memberships", go: () => nav.go("hq.revenue", "memberships") };
  if (l.includes("100,000")) return { text: "Talent target", go: () => nav.go("Dashboard", "marketplace") };
  if (l.includes("adjacent")) return { text: "Market intelligence", go: () => nav.go("hq.talent", "market") };
  return null;
}

function useReducedMotion() {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduce(mq.matches);
    const on = () => setReduce(mq.matches);
    mq.addEventListener?.("change", on);
    return () => mq.removeEventListener?.("change", on);
  }, []);
  return reduce;
}

export default function LaunchPlan() {
  const nav = useNav();
  const reduce = useReducedMotion();
  const [filter, setFilter] = useState<Filter>("all");
  const items = LAUNCH_PLAN.flatMap(p => p.items);
  const count = (st: Status) => items.filter(i => i.status === st).length;
  const done = count("Done"), active = count("In progress"), planned = count("Planned");
  const span = 24;

  return (
    <Page wide eyebrow="WORK" title="Launch plan"
      sub={"The real business plan for " + ORG.legalName + ". The company was incorporated in " + ORG.incorporated + "; everything after that is in progress or planned."}
      actions={<Button icon="hq" onClick={() => nav.go("Settings", "organisation")}>Organisation</Button>}>

      <Grid cols="rc-g-1-2">
        <Card title="Planned against completed" sub={items.length + " milestones across " + LAUNCH_PLAN.length + " phases"}>
          <div className="rc-row" style={{ alignItems: "baseline", gap: 10 }}>
            <span style={{ fontSize: 40, fontWeight: 600, letterSpacing: "-1.6px", lineHeight: 1 }}>{done}</span>
            <span style={{ fontSize: 14, color: "var(--dim)" }}>of {items.length} done</span>
          </div>
          <div style={{ marginTop: 16 }}>
            <StackBar height={12} total={items.length} parts={[
              { label: "Done", value: done, color: STATUS["Done"].color },
              { label: "In progress", value: active, color: STATUS["In progress"].color },
              { label: "Planned", value: planned, color: "var(--border-strong)" },
            ]} />
          </div>
          <div className="rc-grid rc-g3" style={{ gap: 8, marginTop: 14 }}>
            {(["Done", "In progress", "Planned"] as Status[]).map(st => (
              <button key={st} onClick={() => setFilter(filter === st ? "all" : st)} className="rc-focus"
                style={{ textAlign: "left", padding: "10px 12px", borderRadius: 12, cursor: "pointer", color: "inherit",
                  background: filter === st ? "var(--accent-soft)" : "var(--surface-2)", border: "1px solid " + (filter === st ? "var(--accent-line)" : "var(--border)") }}>
                <div className="rc-row" style={{ gap: 6, fontSize: 11.5, color: "var(--dim)" }}>
                  <span style={{ width: 8, height: 8, borderRadius: 3, background: st === "Planned" ? "var(--border-strong)" : STATUS[st].color }} />{st}
                </div>
                <div style={{ fontSize: 20, fontWeight: 600, marginTop: 4 }}>{count(st)}</div>
              </button>
            ))}
          </div>
          <Note style={{ marginTop: 14 }}>Only incorporation is complete. Marketplace figures elsewhere in HQ describe an illustrative future state, not progress to date.</Note>
        </Card>

        <Card title="Twenty-four months" sub="Phase windows from today, in months">
          <div style={{ position: "relative", paddingTop: 6 }}>
            {LAUNCH_PLAN.map(p => {
              const [a, b] = window2months(p.window);
              const st = p.status as Status;
              return (
                <div key={p.phase} className="rc-row" style={{ gap: 12, marginBottom: 12 }}>
                  <div style={{ width: 112, flex: "none" }}>
                    <div style={{ fontSize: 12.5, fontWeight: 500, color: "var(--ink)" }}>{p.phase}</div>
                    <div style={{ fontSize: 11, color: "var(--faint)", marginTop: 2 }}>{p.window}</div>
                  </div>
                  <div className="rc-grow" style={{ position: "relative", height: 26, borderRadius: 8, background: "var(--surface-faint)", border: "1px solid var(--border)" }}>
                    <div style={{ position: "absolute", top: 3, bottom: 3, left: "calc(" + (a / span) * 100 + "% + 3px)", width: "calc(" + ((b - a) / span) * 100 + "% - 6px)", borderRadius: 6,
                      background: st === "Planned" ? "transparent" : STATUS[st].color, opacity: st === "Planned" ? 1 : 0.85,
                      border: st === "Planned" ? "1.5px dashed var(--border-strong)" : 0 }} />
                  </div>
                </div>
              );
            })}
            <div className="rc-row" style={{ gap: 12 }}>
              <div style={{ width: 112, flex: "none" }} />
              <div className="rc-grow" style={{ position: "relative", height: 16 }}>
                {[0, 3, 6, 9, 12, 18, 24].map(m => (
                  <span key={m} style={{ position: "absolute", left: (m / span) * 100 + "%", transform: "translateX(" + (m === 0 ? "0" : m === span ? "-100%" : "-50%") + ")",
                    fontFamily: "var(--mono)", fontSize: 10, color: "var(--faint)" }}>{m === 0 ? "Now" : "M" + m}</span>
                ))}
              </div>
            </div>
          </div>
          <div className="rc-row rc-wrap" style={{ gap: 14, marginTop: 14, fontSize: 11.5, color: "var(--dim)" }}>
            <span className="rc-row" style={{ gap: 6 }}><span style={{ width: 14, height: 8, borderRadius: 3, background: STATUS["In progress"].color }} />In progress</span>
            <span className="rc-row" style={{ gap: 6 }}><span style={{ width: 14, height: 8, borderRadius: 3, border: "1.5px dashed var(--border-strong)" }} />Planned</span>
          </div>
        </Card>
      </Grid>

      <div className="rc-row rc-wrap" style={{ gap: 10, padding: "4px 4px 0" }}>
        <div className="rc-grow" style={{ fontSize: 17, fontWeight: 600, letterSpacing: "-.3px" }}>Roadmap</div>
        <div className="rc-scroll-x">
          <Segmented size="sm" value={filter} onChange={setFilter}
            options={[{ id: "all", label: "All" }, { id: "Done", label: "Done" }, { id: "In progress", label: "In progress" }, { id: "Planned", label: "Planned" }]} />
        </div>
      </div>

      <div className="rc-grid rc-g4" style={{ gap: 14, alignItems: "start" }}>
        {LAUNCH_PLAN.map(p => {
          const st = p.status as Status;
          return (
            <Card key={p.phase} pad={18} tone={st === "In progress" ? "accent" : undefined}
              style={st === "Planned" ? { background: "transparent", borderStyle: "dashed" } : { background: "linear-gradient(160deg, color-mix(in oklab, #4263EB 10%, var(--surface)) 0%, var(--surface) 60%)" }}>
              <div className="rc-row" style={{ gap: 8, alignItems: "flex-start" }}>
                <div className="rc-grow">
                  <div style={{ fontSize: 15, fontWeight: 600, letterSpacing: "-.2px" }}>{p.phase}</div>
                  <div style={{ fontSize: 12, color: "var(--dim)", marginTop: 3 }}>{p.window}</div>
                </div>
                <Badge tone={STATUS[st].tone} dot>{st}</Badge>
              </div>
              <div className="rc-col" style={{ gap: 4, marginTop: 14 }}>
                {p.items.map(it => <Milestone key={it.label} it={it} dim={filter !== "all" && it.status !== filter} nav={nav} reduce={reduce} />)}
              </div>
            </Card>
          );
        })}
      </div>
    </Page>
  );
}

function Owner({ name }: { name: string }) {
  const person = HQ_TEAM.find(m => m.name === name);
  const team = HQ_TEAMS.find(t => t.name === name);
  if (person) return <span className="rc-row" style={{ gap: 6 }}><Avatar initials={person.initials} tint={person.tint} size={18} />{person.name}</span>;
  if (team) return <span className="rc-row" style={{ gap: 6 }}><Icon name="users" size={12} />{team.name} team</span>;
  return <span className="rc-row" style={{ gap: 6 }}><Icon name="employer" size={12} />{name}</span>;
}

function Milestone({ it, dim, nav, reduce }: { it: Item; dim: boolean; nav: NavApi; reduce: boolean }) {
  const st = it.status as Status;
  const link = linkFor(it.label, nav);
  return (
    <div style={{ display: "flex", gap: 11, padding: "10px 8px", margin: "0 -8px", borderRadius: 12, opacity: dim ? 0.32 : 1, transition: reduce ? undefined : "opacity .3s var(--ease)",
      background: st === "Done" ? "var(--teal-soft, var(--ok-soft))" : undefined }}>
      <span style={{ width: 20, height: 20, flex: "none", marginTop: 1, borderRadius: 999, display: "flex", alignItems: "center", justifyContent: "center",
        background: st === "Done" ? STATUS["Done"].color : "transparent",
        border: st === "Done" ? 0 : st === "In progress" ? "2px solid var(--accent)" : "1.5px dashed var(--border-strong)", color: "var(--on-accent)" }}>
        {st === "Done" && <Icon name="check" size={11} stroke={3} />}
        {st === "In progress" && <span style={{ width: 8, height: 8, borderRadius: 999, background: "var(--accent)", animation: reduce ? undefined : "rcPulse 1.6s ease-in-out infinite" }} />}
      </span>
      <div className="rc-grow">
        <div style={{ fontSize: 13, lineHeight: 1.45, color: st === "Planned" ? "var(--body)" : "var(--ink)", fontWeight: st === "Planned" ? 400 : 500 }}>{it.label}</div>
        <div style={{ fontSize: 11.5, color: "var(--dim)", marginTop: 3, lineHeight: 1.45 }}>{it.note}</div>
        <div className="rc-row rc-wrap" style={{ gap: 10, marginTop: 7, fontSize: 11.5, color: "var(--faint)" }}>
          <Owner name={it.owner} />
          {link && <button className="rc-link" style={{ fontSize: 11.5 }} onClick={link.go}>{link.text}</button>}
        </div>
      </div>
      {st === "Done" && <Label style={{ color: "var(--teal, var(--ok))", marginTop: 3 }}>Done</Label>}
    </div>
  );
}
