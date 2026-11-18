import { useMemo, useState } from "react";
import { Avatar, Badge, Button, Card, DemoTag, Grid, Label, Note, Page } from "../../ui";
import { LineChart, RangeBar } from "../../charts";
import { Icon } from "../../icons";
import { useNav } from "../../nav";
import { openDrawer, useRecruit, vacancyById } from "../../store";
import { candidate, relevantRoles } from "../../selectors";
import { CAREER_PATHS, COURSE_BY_ID, GEO_SALARY, PARTNER_BY_ID, SALARY_HISTORY, VALUE_SCENARIOS } from "../../data";
import type { Candidate, ValueScenario } from "../../data";
import { eur, eurK } from "../../format";
import { alignmentTone } from "../../match";
import { impactText, memberPrice, niceAxis } from "../../shared/CourseDrawer";

/* Career scenarios. The fuller version of the market value simulator: pick
   changes, see an illustrative range, the roles it opens, a three-year
   projection and the courses and roles behind each change. */

/* ── simulator maths, shared with My value ────────────────────────────── */

/** Picks survive a tab switch between My value and Scenarios (per persona, this session). */
const PICKS: Record<string, string[]> = {};
export function useScenarioPicks(pid: string): [string[], (ids: string[]) => void] {
  const [, force] = useState(0);
  return [PICKS[pid] || [], ids => { PICKS[pid] = ids; force(n => n + 1); }];
}

export const LATER_WEIGHT = 0.6;
export interface Combined { range: [number, number]; delta: [number, number]; roles: number; added: number; steps: { sc: ValueScenario; weight: number }[] }

/** Changes overlap, so the largest counts in full and each further one at 60%. */
export function combineScenarios(market: [number, number], baseRoles: number, options: ValueScenario[], picks: string[]): Combined {
  const chosen = options.filter(o => picks.includes(o.id)).sort((a, b) => b.low + b.high - (a.low + a.high));
  let lo = 0, hi = 0, roles = 0;
  const steps = chosen.map((sc, i) => {
    const weight = i === 0 ? 1 : LATER_WEIGHT;
    lo += sc.low * weight; hi += sc.high * weight; roles += sc.roles * weight;
    return { sc, weight };
  });
  const r = (v: number) => Math.round(v / 1000) * 1000;
  return { range: [r(market[0] + lo), r(market[1] + hi)], delta: [r(lo), r(hi)], roles: baseRoles + Math.round(roles), added: Math.round(roles), steps };
}

/** A fixed salary axis wide enough for every combination, so bands move rather than rescale. */
export function scenarioAxis(c: Candidate, options: ValueScenario[]): [number, number] {
  const all = combineScenarios(c.marketRange, 0, options, options.map(o => o.id));
  const minLow = Math.min(0, ...options.map(o => o.low));
  return niceAxis(Math.min(c.salaryCurrent, c.marketRange[0] + minLow) * 0.92, all.range[1] * 1.03);
}

export const homeRegion = (c: Candidate) => (/dublin/i.test(c.location) ? "Dublin" : c.region === "Leinster" ? "Rest of Leinster" : c.region);
type GeoRow = (typeof GEO_SALARY)[number];
/** Regional range for a person: the GM or deputy GM band where it fits, else their own range scaled by each region's index. */
export function regionalRange(c: Candidate, row: GeoRow): [number, number] {
  if (/deputy general manager/i.test(c.title)) return row.dgm as [number, number];
  if (/general manager/i.test(c.title)) return row.gm as [number, number];
  const home = GEO_SALARY.find(g => g.region === homeRegion(c));
  const k = row.index / (home?.index || 1);
  return [Math.round((c.marketRange[0] * k) / 1000) * 1000, Math.round((c.marketRange[1] * k) / 1000) * 1000];
}
export const regionalBasis = (c: Candidate) => (/deputy general manager/i.test(c.title) ? "Deputy general manager ranges by region"
  : /general manager/i.test(c.title) ? "General manager ranges by region" : "Your range, scaled by each region's salary index");

export function ScenarioOption({ sc, on, weight, onToggle }: { sc: ValueScenario; on: boolean; weight?: number; onToggle: () => void }) {
  return (
    <button onClick={onToggle} aria-pressed={on} className="rc-card rc-click rc-focus"
      style={{ width: "100%", display: "flex", gap: 11, alignItems: "flex-start", textAlign: "left", padding: "13px 14px", borderRadius: 14, cursor: "pointer", color: "inherit",
        background: on ? "var(--accent-faint)" : "var(--surface-2)", border: "1px solid " + (on ? "var(--accent-line)" : "var(--border)") }}>
      <span style={{ width: 18, height: 18, flex: "none", marginTop: 1, borderRadius: 6, border: "1.5px solid " + (on ? "var(--accent)" : "var(--border-strong)"),
        background: on ? "var(--accent)" : "transparent", color: "var(--on-accent)", display: "flex", alignItems: "center", justifyContent: "center", transition: "background .18s, border-color .18s" }}>
        {on && <Icon name="check" size={10} stroke={3.4} />}
      </span>
      <span className="rc-grow" style={{ display: "block", minWidth: 0 }}>
        <span style={{ display: "block", fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>{sc.label}</span>
        <span style={{ display: "block", fontSize: 12, color: "var(--dim)", marginTop: 2, lineHeight: 1.45 }}>{sc.detail}</span>
        <span className="rc-row rc-wrap" style={{ gap: 6, marginTop: 9 }}>
          <Badge tone={on ? "accent" : "neutral"}>{impactText([sc.low, sc.high])}</Badge>
          <Badge tone={on ? "teal" : "neutral"} icon="jobs">+{sc.roles} roles</Badge>
          {on && weight !== undefined && weight < 1 && <span style={{ fontSize: 11, color: "var(--faint)" }}>counts at {Math.round(weight * 100)}%</span>}
        </span>
      </span>
    </button>
  );
}

/* ── links from each change to real courses, paths and roles ──────────── */

const LINKS: Record<string, Record<string, { courses: string[]; paths: string[]; vacancies?: string[]; region?: string }>> = {
  "c-aoife": {
    qual: { courses: ["crs-wine"], paths: ["pa-fbd"] },
    senior: { courses: ["crs-gm", "crs-finance"], paths: ["pa-gm"] },
    relocate: { courses: [], paths: [], region: "London" },
    industry: { courses: ["crs-cx"], paths: ["pa-cxd"] },
    special: { courses: ["crs-cx"], paths: ["pa-rged"] },
  },
  "c-mark": {
    qual: { courses: ["crs-events"], paths: ["pm-eod"] },
    senior: { courses: ["crs-finance"], paths: [], vacancies: ["v-hv-fb"] },
    relocate: { courses: [], paths: ["pm-eod", "pm-cxd"], region: "Dublin" },
    industry: { courses: ["crs-events", "crs-retail"], paths: ["pm-eod", "pm-rrom"] },
    special: { courses: [], paths: ["pm-proc"] },
  },
  "c-sarah": {
    qual: { courses: ["crs-finance"], paths: ["ps-asset"] },
    senior: { courses: [], paths: ["ps-ops"] },
    relocate: { courses: [], paths: ["ps-gm"], region: "Dublin" },
    industry: { courses: ["crs-finance"], paths: ["ps-asset"] },
    special: { courses: [], paths: ["ps-gm"] },
  },
};

const NOW_YEAR = 2026;
function growth(points: { year: string; salary: number; market: number }[], key: "salary" | "market") {
  if (points.length < 2) return 0.025;
  const last = points[points.length - 1], prev = points[points.length - 2];
  const yr = (y: string) => (y === "Now" ? NOW_YEAR : Number(y));
  return Math.pow(last[key] / prev[key], 1 / Math.max(1, yr(last.year) - yr(prev.year))) - 1;
}

export default function Scenarios() {
  const s = useRecruit();
  const nav = useNav();
  const c = candidate(s, s.persona);
  const baseRoles = useMemo(() => relevantRoles(s, c.id).length, [s, c.id]);
  const options = VALUE_SCENARIOS[c.id] || [];
  const [picks, setPicks] = useScenarioPicks(c.id);
  const combo = combineScenarios(c.marketRange, baseRoles, options, picks);
  const [axLo, axHi] = scenarioAxis(c, options);
  const weightOf = (id: string) => combo.steps.find(x => x.sc.id === id)?.weight;
  const toggle = (id: string) => setPicks(picks.includes(id) ? picks.filter(x => x !== id) : picks.concat([id]));
  const active = picks.length > 0;

  const hist = SALARY_HISTORY[c.id] || [];
  const g = growth(hist, "salary"), gm = growth(hist, "market");
  const mid = (r: [number, number]) => (r[0] + r[1]) / 2;
  const target = mid(combo.range);
  const years = [0, 1, 2, 3];
  const current = years.map(t => Math.round(c.salaryCurrent * Math.pow(1 + g, t)));
  const market = years.map(t => Math.round(mid(c.marketRange) * Math.pow(1 + gm, t)));
  const scenario = years.map(t => Math.round(t === 0 ? c.salaryCurrent : t === 1 ? c.salaryCurrent + (target - c.salaryCurrent) * 0.5 : t === 2 ? target : target * (1 + gm)));
  const extra = scenario.slice(1).reduce((sum, v, i) => sum + v - current[i + 1], 0);
  const all = current.concat(market, active ? scenario : []);
  const yMin = Math.floor((Math.min(...all) * 0.9) / 10000) * 10000;
  const yMax = Math.ceil((Math.max(...all) * 1.06) / 10000) * 10000;
  const links = LINKS[c.id] || {};

  return (
    <Page wide eyebrow="MARKET VALUE" title="Career scenarios"
      sub="Combine changes to see an illustrative market range, the roles it could open and a three-year projection. Every figure is an estimate, not a guaranteed outcome."
      actions={<>
        <Button variant="ghost" icon="refresh" disabled={!active} onClick={() => setPicks([])}>Clear</Button>
        <Button icon="value" onClick={() => nav.go("cand.value", "value")}>My value</Button>
        <Button variant="primary" icon="explorer" onClick={() => nav.go("cand.explorer", "paths")}>Explore career paths</Button>
      </>}>

      <Card title="Choose what changes" sub="Pick one or more. The largest effect counts in full; each extra change counts at 60%, because effects overlap."
        action={<DemoTag />}>
        <div className="rc-grid rc-g5" style={{ gap: 10 }}>
          {options.map(o => <ScenarioOption key={o.id} sc={o} on={picks.includes(o.id)} weight={weightOf(o.id)} onToggle={() => toggle(o.id)} />)}
        </div>
      </Card>

      <Grid cols="rc-g-3-2">
        <Card title="Projected earnings, next three years" sub={active ? "Current path against the path with your chosen changes" : "Your current path against the market midpoint. Pick a change to add a scenario."}
          action={<DemoTag />}>
          <LineChart height={250} labels={["Now", String(NOW_YEAR + 1), String(NOW_YEAR + 2), String(NOW_YEAR + 3)]} yFormat={v => eurK(v)} yMin={yMin} yMax={yMax}
            series={[
              { name: "Current path", values: current, color: "var(--accent)", area: true },
              { name: "Market midpoint", values: market, color: "var(--teal, #16B8A6)", dashed: true },
              ...(active ? [{ name: "With your changes", values: scenario, color: "#f0a33e", dashed: true }] : []),
            ]} />
          <div style={{ fontSize: 11.5, color: "var(--faint)", marginTop: 10, lineHeight: 1.5 }}>
            Assumptions: your pay grows {(g * 100).toFixed(1)}% a year and the market {(gm * 100).toFixed(1)}%, as in your recent history. Changes land over two years, then track the market.
          </div>
        </Card>

        <Card title="Before and after" sub={active ? combo.steps.length + (combo.steps.length === 1 ? " change" : " changes") + " selected" : "Nothing selected yet"}>
          <div className="rc-grid rc-g2" style={{ gap: 10 }}>
            <Figure label="Today" value={eurK(c.marketRange[0]) + " to " + eurK(c.marketRange[1])} sub={baseRoles + " matching roles"} />
            <Figure label="With changes" value={active ? eurK(combo.range[0]) + " to " + eurK(combo.range[1]) : "Pick a change"} sub={active ? combo.roles + " matching roles" : "Range and roles appear here"} accent={active} />
          </div>
          <RangeBar min={axLo} max={axHi} band={c.marketRange} scenario={active ? combo.range : null} marker={c.salaryCurrent} markerLabel="You" format={eurK} />
          <div style={{ fontSize: 11.5, color: "var(--faint)" }}>Solid: estimated range today. Dashed: with your changes.</div>
          <div className="rc-grid rc-g2" style={{ gap: 10, marginTop: 14 }}>
            <Figure small label="Range change" value={active ? impactText(combo.delta) : "None"} />
            <Figure small label="Extra over 3 years vs today's path" value={active ? (extra >= 0 ? "+" : "-") + eur(Math.abs(Math.round(extra / 500) * 500)) : "None"} />
          </div>
          <Note style={{ marginTop: 14 }}>Illustrative estimate, not a guaranteed outcome. Employers set pay; Recruit only shows the evidence.</Note>
        </Card>
      </Grid>

      <Card title="What each change links to" sub="The courses, paths and open roles behind every scenario">
        {options.map((o, i) => {
          const l = links[o.id] || { courses: [], paths: [] };
          const on = picks.includes(o.id);
          const geo = l.region ? GEO_SALARY.find(r => r.region === l.region) : undefined;
          return (
            <div key={o.id} className="rc-grid rc-g3" style={{ gap: 18, padding: "16px 12px", margin: "0 -12px", borderRadius: 14, borderTop: i ? "1px solid var(--border)" : 0, background: on ? "var(--accent-faint)" : "transparent", transition: "background .3s var(--ease)" }}>
              <div>
                <div className="rc-row" style={{ gap: 8 }}>
                  <span style={{ fontSize: 13.5, fontWeight: 600 }}>{o.label}</span>
                  {on && <Badge tone="accent" icon="check">Selected</Badge>}
                </div>
                <div style={{ fontSize: 12.5, color: "var(--body)", marginTop: 3 }}>{o.detail}</div>
                <div style={{ fontSize: 12, color: "var(--dim)", marginTop: 6, lineHeight: 1.5 }}>{o.note}</div>
                <div className="rc-row rc-wrap" style={{ gap: 6, marginTop: 9 }}>
                  <Badge>{impactText([o.low, o.high])}</Badge>
                  <Badge icon="jobs">+{o.roles} roles</Badge>
                  <button className="rc-link" style={{ fontSize: 12 }} onClick={() => toggle(o.id)}>{on ? "Remove" : "Add to scenario"}</button>
                </div>
              </div>
              <div>
                <Label>Courses</Label>
                <div className="rc-col" style={{ gap: 6, marginTop: 8 }}>
                  {l.courses.map(id => {
                    const cr = COURSE_BY_ID[id];
                    if (!cr) return null;
                    return (
                      <div key={id} className="rc-rowhover" onClick={() => openDrawer("course", id)} style={{ display: "flex", gap: 10, alignItems: "center", padding: "7px 8px", margin: "0 -8px", borderRadius: 10 }}>
                        <Avatar initials={PARTNER_BY_ID[cr.partnerId]?.initials || "?"} tint={PARTNER_BY_ID[cr.partnerId]?.tint} size={26} square />
                        <div className="rc-grow" style={{ minWidth: 0 }}>
                          <div className="rc-ellipsis" style={{ fontSize: 12.5, color: "var(--ink)" }}>{cr.title}</div>
                          <div style={{ fontSize: 11, color: "var(--faint)", marginTop: 2 }}>{cr.duration} · member {eur(memberPrice(cr))}</div>
                        </div>
                      </div>
                    );
                  })}
                  {!l.courses.length && <div style={{ fontSize: 12, color: "var(--faint)" }}>{o.id === "relocate" ? "No course needed for a move" : "Built through experience, not a course"}</div>}
                </div>
              </div>
              <div>
                <Label>{geo ? "Market and roles" : "Paths and roles"}</Label>
                <div className="rc-col" style={{ gap: 6, marginTop: 8 }}>
                  {geo && (
                    <div style={{ fontSize: 12.5, color: "var(--body)", padding: "7px 0" }}>
                      <span className="rc-row" style={{ gap: 6 }}><Icon name="pin" size={12} />{geo.region}: {eurK(regionalRange(c, geo)[0])} to {eurK(regionalRange(c, geo)[1])}</span>
                      <span style={{ display: "block", fontSize: 11, color: "var(--faint)", marginTop: 3 }}>{regionalBasis(c)}, illustrative</span>
                    </div>
                  )}
                  {l.paths.map(pid => {
                    const p = (CAREER_PATHS[c.id] || []).find(x => x.id === pid);
                    if (!p) return null;
                    return (
                      <div key={pid} className="rc-rowhover" onClick={() => (p.vacancyId ? openDrawer("vacancy", p.vacancyId) : nav.go("cand.explorer", "paths"))}
                        style={{ display: "flex", gap: 10, alignItems: "center", padding: "7px 8px", margin: "0 -8px", borderRadius: 10 }}>
                        <div className="rc-grow" style={{ minWidth: 0 }}>
                          <div className="rc-ellipsis" style={{ fontSize: 12.5, color: "var(--ink)" }}>{p.title}</div>
                          <div style={{ fontSize: 11, color: "var(--faint)", marginTop: 2 }}>{eurK(p.salary[0])} to {eurK(p.salary[1])} · {p.openRoles} open roles</div>
                        </div>
                        <Badge tone={alignmentTone(p.alignment)}>{p.alignment}%</Badge>
                      </div>
                    );
                  })}
                  {(l.vacancies || []).map(vid => {
                    const v = vacancyById(vid, s);
                    if (!v) return null;
                    return (
                      <div key={vid} className="rc-rowhover" onClick={() => openDrawer("vacancy", vid)} style={{ display: "flex", gap: 10, alignItems: "center", padding: "7px 8px", margin: "0 -8px", borderRadius: 10 }}>
                        <div className="rc-grow" style={{ minWidth: 0 }}>
                          <div className="rc-ellipsis" style={{ fontSize: 12.5, color: "var(--ink)" }}>{v.title}</div>
                          <div style={{ fontSize: 11, color: "var(--faint)", marginTop: 2 }}>{eurK(v.salary[0])} to {eurK(v.salary[1])} · {v.location}</div>
                        </div>
                        <Icon name="chevronRight" size={13} style={{ color: "var(--faint)" }} />
                      </div>
                    );
                  })}
                  <button className="rc-link" style={{ fontSize: 12, textAlign: "left", marginTop: 2 }} onClick={() => nav.go("cand.jobs", "recommended")}>See matching open roles</button>
                </div>
              </div>
            </div>
          );
        })}
      </Card>

      <div style={{ fontSize: 11.5, color: "var(--faint)", padding: "4px 4px 0" }}>
        Scenario effects come from illustrative demo benchmarks for profiles like yours. They are not offers, predictions or guaranteed outcomes.
      </div>
    </Page>
  );
}

function Figure({ label, value, sub, accent, small }: { label: string; value: string; sub?: string; accent?: boolean; small?: boolean }) {
  return (
    <div style={{ padding: "12px 14px", borderRadius: 14, background: accent ? "var(--accent-faint)" : "var(--surface-2)", border: "1px solid " + (accent ? "var(--accent-line)" : "var(--border)"), minWidth: 0 }}>
      <div style={{ fontSize: 11.5, color: "var(--dim)" }}>{label}</div>
      <div style={{ fontSize: small ? 16 : 20, fontWeight: 600, letterSpacing: "-.5px", marginTop: 5, color: "var(--ink)" }}>{value}</div>
      {sub && <div style={{ fontSize: 11.5, color: "var(--faint)", marginTop: 3 }}>{sub}</div>}
    </div>
  );
}
