import type { ReactNode } from "react";
import { Badge, Button, Card, Grid, Label, Page } from "../../ui";
import { Gauge, SERIES_COLORS, StackBar } from "../../charts";
import { Icon } from "../../icons";
import { useNav } from "../../nav";
import { useRecruit, type RecruitState } from "../../store";
import { candidate } from "../../selectors";
import { CANDIDATE_BY_ID, INDEX_ACTIONS, INDEX_LABELS, INDEX_MAX, PEER_COMPARISON } from "../../data";
import type { Candidate } from "../../data";
import { num } from "../../format";
import { extraOf, LEADERSHIP, StateBadge, verificationItems, type VItem } from "./Profile";
import { StrengthenAction } from "./Verification";

/* Value breakdown: the Recruit Index for this person, area by area. What
   counts, what is verified, and what would lift it. Evidence and
   completeness only; never a credit score and never a hiring decision. */

type Area = keyof typeof INDEX_MAX;
const AREAS = Object.keys(INDEX_MAX) as Area[];
const AREA_OF: Record<string, Area> = { "Verified experience": "experience", "Skills evidence": "skills", "Leadership achievements": "leadership", "Qualifications": "qualifications", "Profile evidence": "evidence" };
const COLOR: Record<Area, string> = { experience: SERIES_COLORS[0], skills: SERIES_COLORS[1], leadership: SERIES_COLORS[2], qualifications: SERIES_COLORS[3], evidence: SERIES_COLORS[4] };
const ICON: Record<Area, string> = { experience: "jobs", skills: "sparkle", leadership: "users", qualifications: "award", evidence: "file" };
const COUNTS: Record<Area, string> = {
  experience: "Roles, years and scope confirmed by employers or references. Verified roles count in full; self-reported roles count in part.",
  skills: "Skills backed by certificates, references or documented results. Pending and self-reported skills count less until they are checked.",
  leadership: "Teams led, people developed and results delivered through others, with figures where possible.",
  qualifications: "Degrees, diplomas and certificates, confirmed with the issuer.",
  evidence: "How complete and well evidenced the profile is: summary, figures, documents and references.",
};

/** Area scores with completed actions credited to the area they evidence. */
export function areaScores(id: string, done: RecruitState["indexActions"]): Record<Area, number> {
  const b: Record<Area, number> = { ...CANDIDATE_BY_ID[id].breakdown };
  (INDEX_ACTIONS[id] || []).forEach(a => {
    if (done[a.id] !== "done") return;
    const k = AREA_OF[a.area] || "evidence";
    b[k] = Math.min(INDEX_MAX[k], b[k] + a.points);
  });
  return b;
}

export default function ValueBreakdown() {
  const s = useRecruit();
  const nav = useNav();
  const c = candidate(s, s.persona);
  const scores = areaScores(c.id, s.indexActions);
  const items = verificationItems(s, c);
  const actions = INDEX_ACTIONS[c.id] || [];
  const peers = PEER_COMPARISON[c.id];
  const idxRow = peers?.rows.find(r => r.label === "Recruit Index");
  const available = actions.filter(a => !s.indexActions[a.id]).reduce((t, a) => t + a.points, 0);
  const strongest = AREAS.slice().sort((a, b) => scores[b] / INDEX_MAX[b] - scores[a] / INDEX_MAX[a])[0];
  const roomiest = AREAS.slice().sort((a, b) => (INDEX_MAX[b] - scores[b]) - (INDEX_MAX[a] - scores[a]))[0];

  return (
    <Page wide eyebrow="MARKET VALUE" title="Your Recruit Index, explained"
      sub="A score from 0 to 1,000 built from five areas of professional evidence. Here is where every point comes from, and what would add more."
      actions={<>
        <Button icon="value" onClick={() => nav.go("cand.value", "value")}>My value</Button>
        <Button variant="primary" icon="verified" onClick={() => nav.go("cand.profile", "verification")}>Strengthen my index</Button>
      </>}>

      <Card pad={24} style={{ background: "linear-gradient(140deg, color-mix(in oklab, #4263EB 16%, var(--surface)) 0%, var(--surface) 55%)" }}>
        <div className="rc-row rc-wrap" style={{ gap: 30, alignItems: "center" }}>
          <Gauge value={c.recruitIndex} label="Recruit Index out of 1,000" size={236}
            sub={idxRow ? <Badge tone="teal" icon="trendUp">Ahead of {idxRow.pct}% of peers</Badge> : undefined} />
          <div className="rc-grow" style={{ minWidth: 280 }}>
            <Label>Where your points come from</Label>
            <div style={{ marginTop: 12 }}>
              <StackBar total={1000} height={14} parts={AREAS.map(a => ({ label: INDEX_LABELS[a], value: scores[a], color: COLOR[a] }))} />
            </div>
            <div className="rc-col" style={{ gap: 9, marginTop: 16 }}>
              {AREAS.map(a => (
                <div key={a} className="rc-row" style={{ gap: 10, fontSize: 13 }}>
                  <span style={{ width: 9, height: 9, borderRadius: 3, background: COLOR[a], flex: "none" }} />
                  <span className="rc-grow" style={{ color: "var(--body)" }}>{INDEX_LABELS[a]}</span>
                  <span style={{ fontVariantNumeric: "tabular-nums" }}><b style={{ fontWeight: 600 }}>{scores[a]}</b><span style={{ color: "var(--faint)" }}> / {INDEX_MAX[a]}</span></span>
                </div>
              ))}
              <div className="rc-row" style={{ gap: 10, fontSize: 13, paddingTop: 9, borderTop: "1px solid var(--border)" }}>
                <span style={{ width: 9, flex: "none" }} />
                <span className="rc-grow" style={{ color: "var(--ink)", fontWeight: 500 }}>Total</span>
                <span style={{ fontVariantNumeric: "tabular-nums" }}><b style={{ fontWeight: 600 }}>{num(c.recruitIndex)}</b><span style={{ color: "var(--faint)" }}> / 1,000</span></span>
              </div>
            </div>
          </div>
          <div style={{ width: 260, maxWidth: "100%", flex: "none" }} className="rc-col">
            <Insight icon="award" title="Strongest area" body={INDEX_LABELS[strongest] + ", at " + Math.round((scores[strongest] / INDEX_MAX[strongest]) * 100) + "% of the maximum."} />
            <Insight icon="target" title="Most room to grow" body={INDEX_LABELS[roomiest] + ": " + (INDEX_MAX[roomiest] - scores[roomiest]) + " points still open."} />
            <Insight icon="trendUp" title="Quick wins" body={available ? available + " points from the actions below, most taking minutes." : "Every quick action is done or in progress."} last />
          </div>
        </div>
      </Card>

      {AREAS.map(a => <AreaCard key={a} area={a} c={c} score={scores[a]} items={items} s={s} />)}

      <Card title="What the index is, and what it is not" sub="Recruit's rules for the score, applied to every profile">
        <Grid cols="rc-g2" gap={20}>
          <div className="rc-col" style={{ gap: 11 }}>
            <Label>It is</Label>
            <Rule ok text="A measure of professional evidence and profile completeness: experience, skills, leadership, qualifications and evidence." />
            <Rule ok text="Explainable. Every point sits in one of the five areas shown on this page." />
            <Rule ok text="Yours to improve. Verified evidence and a complete profile lift it." />
            <Rule ok text="Decision support. Employers see it next to your full profile, never instead of it." />
          </div>
          <div className="rc-col" style={{ gap: 11 }}>
            <Label>It is not</Label>
            <Rule text="A credit score, or a judgement of your worth as a person." />
            <Rule text="Built from sensitive characteristics. Age, gender, ethnicity, religion, disability and family status are never used." />
            <Rule text="A hiring decision. People decide; no one is rejected automatically." />
            <Rule text="Visible to an employer you have blocked, in any form." />
          </div>
        </Grid>
      </Card>

      <div style={{ fontSize: 11.5, color: "var(--faint)", padding: "4px 4px 0" }}>
        Points are added when evidence is confirmed or, for evidence you provide yourself, when you add it. Agents never mark anything verified.
      </div>
    </Page>
  );
}

function AreaCard({ area, c, score, items, s }: { area: Area; c: Candidate; score: number; items: VItem[]; s: RecruitState }) {
  const max = INDEX_MAX[area];
  const actions = (INDEX_ACTIONS[c.id] || []).filter(a => (AREA_OF[a.area] || "evidence") === area);
  const base = CANDIDATE_BY_ID[c.id];
  const group = area === "experience" ? "Experience" : area === "skills" ? "Skills" : area === "qualifications" ? "Qualifications" : null;
  const list = group ? items.filter(i => i.group === group) : [];
  const v = list.filter(i => i.state === "verified").length;
  let verified: ReactNode;
  if (group) {
    const open = list.filter(i => i.state !== "verified");
    verified = (
      <>
        <div style={{ fontSize: 13, color: "var(--ink)" }}>{v} of {list.length} {group.toLowerCase()} verified</div>
        <div className="rc-col" style={{ gap: 6, marginTop: 9 }}>
          {open.slice(0, 3).map(i => (
            <div key={i.key} className="rc-row" style={{ gap: 8 }}>
              <span className="rc-grow rc-ellipsis" style={{ fontSize: 12.5, color: "var(--body)" }}>{i.name}</span>
              <StateBadge state={i.state} compact />
            </div>
          ))}
          {!open.length && <div style={{ fontSize: 12.5, color: "var(--dim)" }}>Everything in this area is verified.</div>}
          {open.length > 3 && <div style={{ fontSize: 11.5, color: "var(--faint)" }}>and {open.length - 3} more</div>}
        </div>
      </>
    );
  } else if (area === "leadership") {
    const results = base.experience.flatMap(e => e.achievements.filter(x => LEADERSHIP.test(x)).map(x => ({ x, e })));
    verified = (
      <>
        <div style={{ fontSize: 13, color: "var(--ink)" }}>Leads {num(c.teamSize)} people, confirmed with the current employer</div>
        <div className="rc-col" style={{ gap: 6, marginTop: 9 }}>
          {results.slice(0, 3).map(r => (
            <div key={r.x} className="rc-row" style={{ gap: 8, alignItems: "flex-start" }}>
              <span style={{ color: r.e.verification === "verified" ? "var(--teal, var(--ok))" : "var(--faint)", marginTop: 2 }}><Icon name="check" size={12} stroke={2.4} /></span>
              <span style={{ fontSize: 12.5, color: "var(--body)", lineHeight: 1.45 }}>{r.x}</span>
            </div>
          ))}
          {!results.length && <div style={{ fontSize: 12.5, color: "var(--dim)" }}>No people results with figures yet.</div>}
        </div>
      </>
    );
  } else {
    const ev = Object.values(extraOf(s, c.id).evidence || {}).filter(e => e.kind === "evidence").length;
    verified = (
      <>
        <div style={{ fontSize: 13, color: "var(--ink)" }}>Profile {c.completeness}% complete</div>
        <div className="rc-col" style={{ gap: 6, marginTop: 9, fontSize: 12.5, color: "var(--body)" }}>
          <span>{base.achievements.length} headline results with figures</span>
          <span>{ev ? ev + " evidence item" + (ev === 1 ? "" : "s") + " you have added" : "No evidence added yet"}</span>
          <span>{c.verifiedCredentials} verified credentials on file</span>
        </div>
      </>
    );
  }
  return (
    <Card>
      <div className="rc-grid rc-g3" style={{ gap: 24 }}>
        <div>
          <div className="rc-row" style={{ gap: 9 }}>
            <span style={{ width: 28, height: 28, borderRadius: 9, background: "var(--surface-2)", color: COLOR[area], display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}><Icon name={ICON[area]} size={14} /></span>
            <span style={{ fontSize: 14, fontWeight: 600 }}>{INDEX_LABELS[area]}</span>
          </div>
          <div className="rc-row" style={{ alignItems: "baseline", gap: 6, marginTop: 14 }}>
            <span style={{ fontSize: 32, fontWeight: 600, letterSpacing: "-1.2px" }}>{score}</span>
            <span style={{ fontSize: 13, color: "var(--faint)" }}>of {max}</span>
          </div>
          <div style={{ height: 8, borderRadius: 999, background: "var(--track)", marginTop: 10, overflow: "hidden" }}>
            <div style={{ height: "100%", width: (score / max) * 100 + "%", borderRadius: 999, background: COLOR[area], transformOrigin: "left", animation: "rcGrow .9s cubic-bezier(.16,1,.3,1) both", transition: "width .5s var(--ease)" }} />
          </div>
          <div style={{ fontSize: 12, color: "var(--dim)", marginTop: 8 }}>{Math.round((score / max) * 100)}% of the maximum · {max - score} points open</div>
        </div>
        <div>
          <Label>What counts</Label>
          <div style={{ fontSize: 12.5, color: "var(--body)", lineHeight: 1.55, marginTop: 8 }}>{COUNTS[area]}</div>
          <div style={{ marginTop: 14 }}><Label>What is verified</Label></div>
          <div style={{ marginTop: 8 }}>{verified}</div>
        </div>
        <div>
          <Label>What would improve it</Label>
          <div className="rc-col" style={{ gap: 10, marginTop: 8 }}>
            {actions.map(a => (
              <div key={a.id} style={{ padding: "11px 12px", borderRadius: 12, background: "var(--surface-2)", border: "1px solid var(--border)" }}>
                <div className="rc-row" style={{ gap: 8, alignItems: "flex-start" }}>
                  <span className="rc-grow" style={{ fontSize: 12.5, color: "var(--ink)", lineHeight: 1.45 }}>{a.label}</span>
                  <Badge tone="accent">+{a.points}</Badge>
                </div>
                <div className="rc-row" style={{ gap: 8, marginTop: 9 }}>
                  <span className="rc-grow" style={{ fontSize: 11.5, color: "var(--faint)" }}>{a.effort}</span>
                  <StrengthenAction a={a} c={c} />
                </div>
              </div>
            ))}
            {!actions.length && (
              <div style={{ fontSize: 12.5, color: "var(--dim)", lineHeight: 1.55 }}>
                {area === "experience" || area === "leadership" ? "This area grows with time in role and new results. Add results with figures to your profile as they happen."
                  : area === "qualifications" ? "A new qualification would add points here. See courses linked to your next roles." : "Keep your profile current to hold these points."}
              </div>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}

function Insight({ icon, title, body, last }: { icon: string; title: string; body: string; last?: boolean }) {
  return (
    <div className="rc-row" style={{ gap: 10, alignItems: "flex-start", padding: "10px 0", borderBottom: last ? 0 : "1px solid var(--border)" }}>
      <span style={{ width: 26, height: 26, borderRadius: 9, background: "var(--surface-2)", color: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}><Icon name={icon} size={13} /></span>
      <div>
        <div style={{ fontSize: 12.5, fontWeight: 600 }}>{title}</div>
        <div style={{ fontSize: 12, color: "var(--dim)", marginTop: 2, lineHeight: 1.45 }}>{body}</div>
      </div>
    </div>
  );
}

function Rule({ text, ok }: { text: string; ok?: boolean }) {
  return (
    <div className="rc-row" style={{ gap: 10, alignItems: "flex-start" }}>
      <span style={{ width: 22, height: 22, borderRadius: 7, flex: "none", display: "flex", alignItems: "center", justifyContent: "center",
        background: ok ? "var(--teal-soft, var(--ok-soft))" : "var(--bad-soft)", color: ok ? "var(--teal, var(--ok))" : "var(--bad)" }}>
        <Icon name={ok ? "check" : "x"} size={11} stroke={2.6} />
      </span>
      <span style={{ fontSize: 13, color: "var(--body)", lineHeight: 1.55, paddingTop: 1 }}>{text}</span>
    </div>
  );
}

