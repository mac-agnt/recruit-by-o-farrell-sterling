import { useMemo, type ReactNode } from "react";
import { Avatar, Badge, Button, Card, DemoTag, Grid, Label, Note, Page } from "../../ui";
import { BarList, LineChart, RangeBar } from "../../charts";
import { Icon } from "../../icons";
import { useNav } from "../../nav";
import { allVacancies, openDrawer, useRecruit } from "../../store";
import { candidate, relevantRoles } from "../../selectors";
import { CANDIDATE_BY_ID, CAREER_PATHS, DEMAND_BY_CATEGORY, GEO_SALARY, PARTNER_BY_ID, PEER_COMPARISON, SALARY_HISTORY, VALUE_SCENARIOS } from "../../data";
import type { Candidate } from "../../data";
import { eur, eurK, num } from "../../format";
import { alignmentTone } from "../../match";
import { impactText, niceAxis, recommendedCourses } from "../../shared/CourseDrawer";
import { combineScenarios, homeRegion, regionalBasis, regionalRange, scenarioAxis, ScenarioOption, useScenarioPicks } from "./Scenarios";

/* Know your market value. The screen a professional shares with a friend:
   what they are worth today, why, how it has moved, and what could change
   it. Every salary is an illustrative estimate from demo benchmarks. */

const GRAD = "linear-gradient(90deg, #4263EB, var(--teal, #16B8A6))";
const lc = (t: string) => t.toLowerCase();

export default function MyValue() {
  const s = useRecruit();
  const nav = useNav();
  const c = candidate(s, s.persona);
  const roles = useMemo(() => relevantRoles(s, c.id), [s, c.id]);
  const options = VALUE_SCENARIOS[c.id] || [];
  const [picks, setPicks] = useScenarioPicks(c.id);
  const combo = combineScenarios(c.marketRange, roles.length, options, picks);
  const [axLo, axHi] = scenarioAxis(c, options);
  const active = picks.length > 0;
  const weightOf = (id: string) => combo.steps.find(x => x.sc.id === id)?.weight;
  const toggle = (id: string) => setPicks(picks.includes(id) ? picks.filter(x => x !== id) : picks.concat([id]));

  const history = SALARY_HISTORY[c.id] || [];
  const peers = PEER_COMPARISON[c.id];
  const demand = DEMAND_BY_CATEGORY[c.id] || [];
  const paths = (CAREER_PATHS[c.id] || []).slice().sort((a, b) => b.alignment - a.alignment).slice(0, 3);
  const courses = recommendedCourses(c).sort((a, b) => b.course.impact[1] - a.course.impact[1]).slice(0, 3);
  const gapLo = c.marketRange[0] - c.salaryCurrent, gapHi = c.marketRange[1] - c.salaryCurrent;
  const [lo, hi] = niceAxis(Math.min(c.salaryCurrent, c.marketRange[0]) * 0.85, c.marketRange[1] * 1.12);
  const verifiedSkills = c.skills.filter(k => k.verification === "verified").length;
  const home = GEO_SALARY.find(g => g.region === homeRegion(c));
  const exp = c.salaryExpectation;

  /* Skills × demand: open roles on Recruit that ask for each skill. Required counts in full, preferred at half. */
  const open = allVacancies(s).filter(v => v.status === "open");
  const demandFor = (name: string) => {
    const req = open.filter(v => v.required.some(r => lc(r) === lc(name))).length;
    const pref = open.filter(v => !v.required.some(r => lc(r) === lc(name)) && v.preferred.some(p => lc(p) === lc(name))).length;
    return { req, pref, total: req + pref, weight: req + pref * 0.5 };
  };
  const skillRows = c.skills.map(k => ({ k, d: demandFor(k.name) })).filter(x => x.d.total > 0);
  const counted = skillRows.filter(x => x.k.verification === "verified").sort((a, b) => b.d.weight * b.k.level - a.d.weight * a.k.level).slice(0, 6);
  const notYet = skillRows.filter(x => x.k.verification !== "verified").sort((a, b) => b.d.total - a.d.total).slice(0, 3);

  const first = history[0], last = history[history.length - 1];
  const growthPct = first && last ? Math.round((last.salary / first.salary - 1) * 100) : 0;
  const marketPct = first && last ? Math.round((last.market / first.market - 1) * 100) : 0;
  const idxRow = peers?.rows.find(r => r.label === "Recruit Index");
  const salRow = peers?.rows.find(r => r.label === "Current salary");

  return (
    <Page wide eyebrow="MARKET VALUE" title="Know your market value"
      sub="What your experience is worth in today's market, why, and what could move it. Built from your verified evidence and illustrative demo benchmarks."
      actions={<>
        <Button icon="sliders" onClick={() => nav.go("cand.value", "scenarios")}>Model scenarios</Button>
        <Button variant="primary" icon="verified" onClick={() => nav.go("cand.profile", "verification")}>Strengthen my profile</Button>
      </>}>

      {/* Today: salary against the estimated range, and why */}
      <Grid cols="rc-g-3-2">
        <Card pad={24} style={{ background: "linear-gradient(140deg, color-mix(in oklab, #4263EB 16%, var(--surface)) 0%, var(--surface) 55%)" }}>
          <div className="rc-row rc-wrap" style={{ gap: 28, alignItems: "flex-end" }}>
            <div>
              <Label>Current salary</Label>
              <div style={{ fontSize: 30, fontWeight: 600, letterSpacing: "-1.2px", marginTop: 8, color: "var(--body)" }}>{eur(c.salaryCurrent)}</div>
            </div>
            <Icon name="arrowRight" size={20} style={{ color: "var(--faint)", marginBottom: 8 }} />
            <div className="rc-grow" style={{ minWidth: 240 }}>
              <div className="rc-row" style={{ gap: 8 }}><Label>Estimated market range</Label><DemoTag /></div>
              <div style={{ fontSize: 40, fontWeight: 600, letterSpacing: "-1.8px", marginTop: 6, lineHeight: 1.05 }}>{eurK(c.marketRange[0])} to {eurK(c.marketRange[1])}</div>
            </div>
          </div>
          <div style={{ fontSize: 13.5, color: "var(--body)", marginTop: 12, lineHeight: 1.55, maxWidth: "62ch" }}>
            {gapLo > 0
              ? <>Your experience points to <b style={{ fontWeight: 600, color: "var(--teal, var(--ok))" }}>{eurK(gapLo)} to {eurK(gapHi)} more</b> than you earn today.</>
              : gapHi > 0
                ? <>Your salary sits inside your estimated range, with up to <b style={{ fontWeight: 600, color: "var(--teal, var(--ok))" }}>{eurK(gapHi)}</b> of headroom.</>
                : <>Your salary sits at the top of your estimated range.</>}
            {" "}Your stated expectation is {eurK(exp[0])} to {eurK(exp[1])}.
          </div>
          <RangeBar min={lo} max={hi} band={c.marketRange} marker={c.salaryCurrent} markerLabel="You" format={eurK} />
          <div className="rc-grid rc-g3" style={{ gap: 10, marginTop: 16 }}>
            <MiniStat icon="jobs" label="Matching roles" value={String(roles.length)} onClick={() => nav.go("cand.jobs", "recommended")} />
            <MiniStat icon="chart" label="Recruit Index" value={num(c.recruitIndex)} onClick={() => nav.go("cand.value", "breakdown")} />
            <MiniStat icon="euro" label="Your expectation" value={eurK(exp[0]) + " to " + eurK(exp[1]).slice(1)} onClick={() => nav.go("cand.profile", "profile")} />
          </div>
        </Card>

        <Card title="Why this range" sub="The evidence behind the estimate">
          <div className="rc-col" style={{ gap: 13 }}>
            <Driver icon="clock" tone="var(--accent)" text={<>{c.years} years' experience across {CANDIDATE_BY_ID[c.id].experience.length} roles. Current role: {c.title}.</>} />
            <Driver icon="users" tone="var(--teal, #16B8A6)" text={<>Leads {num(c.teamSize)} people{peerPct(peers?.rows, "Team size led") !== null ? ", more than " + peerPct(peers?.rows, "Team size led") + "% of comparable professionals" : ""}.</>} />
            <Driver icon="verified" tone="#c8b4f0" text={<>{c.verifiedCredentials} verified credentials, and {verifiedSkills} of {c.skills.length} skills verified. Verified evidence carries the most weight.</>} />
            {home && <Driver icon="pin" tone="#f0a33e" text={<>{home.region} pays {Math.abs(Math.round((home.index - 1) * 100))}% {home.index >= 1 ? "above" : "below"} the national hospitality benchmark.</>} />}
            {peers && <Driver icon="chart" tone="#7fd0f0" text={<>Compared with {num(peers.size)} {lowerFirstWord(peers.cohort)}.</>} />}
          </div>
          <Note style={{ marginTop: 16 }}>Estimated from illustrative benchmarks: role level, region, experience and verified evidence. Not an offer, a valuation or a guarantee.</Note>
        </Card>
      </Grid>

      {/* The simulator */}
      <Card pad={22} title={<span style={{ fontSize: 16 }}>What could change my market opportunities?</span>}
        sub="Pick one or more changes. The largest effect counts in full; each extra change counts at 60%, because effects overlap."
        action={<><DemoTag /><Button size="sm" variant="ghost" iconRight="arrowRight" onClick={() => nav.go("cand.value", "scenarios")}>Full scenarios</Button></>}>
        <Grid cols="rc-g2" gap={18}>
          <div className="rc-col" style={{ gap: 8 }}>
            {options.map(o => <ScenarioOption key={o.id} sc={o} on={picks.includes(o.id)} weight={weightOf(o.id)} onToggle={() => toggle(o.id)} />)}
          </div>
          <div style={{ padding: 20, borderRadius: "var(--r-md, 16px)", background: active ? "linear-gradient(160deg, color-mix(in oklab, #f0a33e 9%, var(--surface-2)) 0%, var(--surface-2) 60%)" : "var(--surface-2)", border: "1px solid var(--border)", transition: "background .4s var(--ease)" }}>
            <div className="rc-row">
              <Label>{active ? "Illustrative range with " + combo.steps.length + (combo.steps.length === 1 ? " change" : " changes") : "Illustrative range"}</Label>
              <span className="rc-grow" />
              {active && <button className="rc-link" style={{ fontSize: 12 }} onClick={() => setPicks([])}>Clear</button>}
            </div>
            <div className="rc-row rc-wrap" style={{ alignItems: "baseline", gap: 12, marginTop: 8 }}>
              <span style={{ fontSize: 34, fontWeight: 600, letterSpacing: "-1.4px" }}>{active ? eurK(combo.range[0]) + " to " + eurK(combo.range[1]) : eurK(c.marketRange[0]) + " to " + eurK(c.marketRange[1])}</span>
              {active && <Badge tone="warn" icon="trendUp">{impactText(combo.delta)}</Badge>}
            </div>
            <div style={{ fontSize: 12.5, color: "var(--dim)", marginTop: 4 }}>{active ? "Against " + eurK(c.marketRange[0]) + " to " + eurK(c.marketRange[1]) + " today." : "Pick a change on the left to see how your range could move."}</div>
            <RangeBar min={axLo} max={axHi} band={c.marketRange} scenario={active ? combo.range : null} marker={c.salaryCurrent} markerLabel="You" format={eurK} />
            <div className="rc-row rc-wrap" style={{ gap: 14, fontSize: 11.5, color: "var(--faint)" }}>
              <span className="rc-row" style={{ gap: 6 }}><span style={{ width: 14, height: 6, borderRadius: 3, background: GRAD }} />Today</span>
              <span className="rc-row" style={{ gap: 6 }}><span style={{ width: 14, height: 8, borderRadius: 4, border: "1.5px dashed var(--warn)" }} />With changes</span>
            </div>
            <div className="rc-grid rc-g2" style={{ gap: 10, marginTop: 16 }}>
              <div style={{ padding: "11px 13px", borderRadius: 12, background: "var(--surface)", border: "1px solid var(--border)" }}>
                <div style={{ fontSize: 11.5, color: "var(--dim)" }}>Matching roles</div>
                <div className="rc-row" style={{ gap: 8, marginTop: 5, alignItems: "baseline" }}>
                  <span style={{ fontSize: 22, fontWeight: 600 }}>{active ? combo.roles : roles.length}</span>
                  {active && <span style={{ fontSize: 12, color: "var(--teal, var(--ok))", fontWeight: 500 }}>+{combo.added} from {roles.length}</span>}
                </div>
              </div>
              <div style={{ padding: "11px 13px", borderRadius: 12, background: "var(--surface)", border: "1px solid var(--border)" }}>
                <div style={{ fontSize: 11.5, color: "var(--dim)" }}>Midpoint</div>
                <div className="rc-row" style={{ gap: 8, marginTop: 5, alignItems: "baseline" }}>
                  <span style={{ fontSize: 22, fontWeight: 600 }}>{eurK((active ? combo.range[0] + combo.range[1] : c.marketRange[0] + c.marketRange[1]) / 2)}</span>
                  <span style={{ fontSize: 12, color: "var(--dim)" }}>vs {eurK(c.salaryCurrent)} now</span>
                </div>
              </div>
            </div>
            {active && (
              <div className="rc-col" style={{ gap: 9, marginTop: 16 }}>
                {combo.steps.map(st => (
                  <div key={st.sc.id} className="rc-row rc-fade" style={{ gap: 10, alignItems: "flex-start", fontSize: 12.5, lineHeight: 1.5 }}>
                    <span style={{ color: "#f0a33e", marginTop: 2 }}><Icon name="sparkle" size={12} /></span>
                    <span className="rc-grow" style={{ color: "var(--body)" }}><b style={{ fontWeight: 600, color: "var(--ink)" }}>{st.sc.label}.</b> {st.sc.note}{st.weight < 1 ? " Counted at 60%." : ""}</span>
                  </div>
                ))}
              </div>
            )}
            <div style={{ fontSize: 11.5, color: "var(--faint)", marginTop: 14 }}>Illustrative estimate, not a guaranteed outcome.</div>
          </div>
        </Grid>
      </Card>

      {/* How it has moved, and how it compares */}
      <Grid cols="rc-g-3-2">
        <Card title="Earnings progression" sub="Your salary against the market benchmark for your experience level" action={<DemoTag />}>
          <LineChart height={240} labels={history.map(h => h.year)} yFormat={v => eurK(v)}
            series={[
              { name: "Your salary", values: history.map(h => h.salary), color: "var(--accent)", area: true },
              { name: "Market benchmark", values: history.map(h => h.market), color: "var(--teal, #16B8A6)", dashed: true },
            ]} />
          {first && last && (
            <div className="rc-grid rc-g3" style={{ gap: 10, marginTop: 14 }}>
              <Fact label={"Your growth since " + first.year} value={"+" + growthPct + "%"} />
              <Fact label="Benchmark growth" value={"+" + marketPct + "%"} />
              <Fact label="Gap to benchmark now" value={eurK(Math.max(0, last.market - last.salary))} sub={"Was " + eurK(Math.max(0, first.market - first.salary)) + " in " + first.year} />
            </div>
          )}
        </Card>

        <Card title="Experience comparison" sub={peers ? peers.cohort + " (" + num(peers.size) + ", illustrative)" : "Comparable professionals"}>
          {peers && (
            <div className="rc-col" style={{ gap: 15 }}>
              {peers.rows.map(r => <PeerRow key={r.label} label={r.label} you={r.label === "Recruit Index" ? num(c.recruitIndex) : r.you} peers={r.peers} pct={r.pct} />)}
            </div>
          )}
          {idxRow && salRow && (
            <Note tone="accent" icon="trendUp" style={{ marginTop: 16 }}>
              Your evidence ranks ahead of {idxRow.pct}% of peers. Your salary ranks ahead of {salRow.pct}%{idxRow.pct - salRow.pct >= 20 ? ": a sign the market may value you more than your current pay." : "."}
            </Note>
          )}
        </Card>
      </Grid>

      {/* Where the value comes from and where it is wanted */}
      <Grid cols="rc-g3">
        <Card title="Skills driving your opportunities" sub="Verified skills by the open roles on Recruit that ask for them"
          action={<Button size="sm" variant="ghost" iconRight="arrowRight" onClick={() => nav.go("cand.explorer", "skills")}>Skills</Button>}>
          <BarList items={counted.map(x => ({ label: x.k.name, value: x.d.weight * x.k.level / 100, display: x.d.total + (x.d.total === 1 ? " role" : " roles"), sub: "level " + x.k.level, color: GRAD }))} />
          {!counted.length && <div style={{ fontSize: 12.5, color: "var(--dim)" }}>No verified skills match open roles yet.</div>}
          {notYet.length > 0 && (
            <div style={{ marginTop: 16, paddingTop: 12, borderTop: "1px solid var(--border)" }}>
              <div style={{ fontSize: 11.5, color: "var(--faint)", marginBottom: 8 }}>Not counted until verified</div>
              {notYet.map(x => (
                <div key={x.k.name} className="rc-row" style={{ gap: 8, fontSize: 12.5, padding: "3px 0" }}>
                  <span className="rc-grow rc-ellipsis" style={{ color: "var(--body)" }}>{x.k.name}</span>
                  <span style={{ color: "var(--dim)" }}>{x.d.total} {x.d.total === 1 ? "role" : "roles"}</span>
                </div>
              ))}
              <button className="rc-link" style={{ fontSize: 12, marginTop: 8 }} onClick={() => nav.go("cand.profile", "verification")}>Add evidence</button>
            </div>
          )}
          <div style={{ fontSize: 11, color: "var(--faint)", marginTop: 12, lineHeight: 1.45 }}>Bar length: roles asking for the skill (preferred counts half) weighted by your level.</div>
        </Card>

        <Card title="Relevant job categories" sub={demand.reduce((t, d) => t + d.roles, 0) + " open roles where your skills are in demand"}
          action={<Button size="sm" variant="ghost" iconRight="arrowRight" onClick={() => nav.go("cand.jobs", "recommended")}>Roles</Button>}>
          <BarList items={demand.map((d, i) => ({ label: d.label, value: d.roles, display: d.roles + " roles", sub: eurK(d.range[0]) + " to " + eurK(d.range[1]), color: i === 0 ? GRAD : undefined }))} />
          <div style={{ fontSize: 11, color: "var(--faint)", marginTop: 12 }}>Salary bands are illustrative ranges for each category.</div>
        </Card>

        <Card title="Geographic comparison" sub={regionalBasis(c) + ", illustrative"}>
          <GeoRows c={c} />
        </Card>
      </Grid>

      {/* What next */}
      <Grid cols="rc-g2">
        <Card title="Career scenarios" sub="Where your experience could take you next"
          action={<Button size="sm" variant="ghost" iconRight="arrowRight" onClick={() => nav.go("cand.value", "scenarios")}>Model scenarios</Button>}>
          {paths.map((p, i) => (
            <div key={p.id} className="rc-rowhover" onClick={() => nav.go("cand.explorer", "paths")}
              style={{ display: "flex", gap: 12, alignItems: "center", padding: "11px 8px", margin: "0 -8px", borderRadius: 10, borderTop: i ? "1px solid var(--border)" : 0 }}>
              <span style={{ width: 30, height: 30, borderRadius: 10, background: "var(--surface-2)", color: p.adjacent ? "#c8b4f0" : "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}>
                <Icon name={p.adjacent ? "explorer" : "trendUp"} size={14} />
              </span>
              <div className="rc-grow" style={{ minWidth: 0 }}>
                <div className="rc-ellipsis" style={{ fontSize: 13, color: "var(--ink)" }}>{p.title}</div>
                <div style={{ fontSize: 11.5, color: "var(--dim)", marginTop: 2 }}>{eurK(p.salary[0])} to {eurK(p.salary[1])} · {p.timeToMove} · {p.openRoles} open roles</div>
              </div>
              <Badge tone={alignmentTone(p.alignment)}>{p.alignment}%</Badge>
            </div>
          ))}
          {!paths.length && <div style={{ fontSize: 12.5, color: "var(--dim)" }}>No paths mapped yet.</div>}
        </Card>

        <Card title="Development opportunities" sub="Courses linked to higher-value roles for profiles like yours"
          action={<Button size="sm" variant="ghost" iconRight="arrowRight" onClick={() => nav.go("cand.learning", "courses")}>All courses</Button>}>
          {courses.map(({ course, reason }, i) => {
            const enrolled = s.enrolments.some(e => e.candidateId === c.id && e.courseId === course.id);
            const partner = PARTNER_BY_ID[course.partnerId];
            return (
              <div key={course.id} className="rc-rowhover" onClick={() => openDrawer("course", course.id)}
                style={{ display: "flex", gap: 12, alignItems: "center", padding: "11px 8px", margin: "0 -8px", borderRadius: 10, borderTop: i ? "1px solid var(--border)" : 0 }}>
                <Avatar initials={partner?.initials || "?"} tint={partner?.tint} size={30} square />
                <div className="rc-grow" style={{ minWidth: 0 }}>
                  <div className="rc-ellipsis" style={{ fontSize: 13, color: "var(--ink)" }}>{course.title}</div>
                  <div className="rc-ellipsis" style={{ fontSize: 11.5, color: "var(--dim)", marginTop: 2 }}>{reason}</div>
                </div>
                {enrolled ? <Badge tone="teal" icon="check">Enrolled</Badge> : <Badge tone="warn">{impactText(course.impact)}</Badge>}
              </div>
            );
          })}
          {!courses.length && <div style={{ fontSize: 12.5, color: "var(--dim)" }}>No course picks for your profile right now.</div>}
          <div style={{ fontSize: 11, color: "var(--faint)", marginTop: 10 }}>Fictional demo partners. Effects are illustrative, in selected relevant roles.</div>
        </Card>
      </Grid>

      <div style={{ fontSize: 11.5, color: "var(--faint)", padding: "4px 4px 0" }}>
        All salary figures are illustrative estimates from demo benchmarks, not guaranteed outcomes. Recruit Index {num(c.recruitIndex)} reflects professional evidence and profile completeness only. Employers make hiring and pay decisions.
      </div>
    </Page>
  );
}

const peerPct = (rows: { label: string; pct: number }[] | undefined, label: string) => rows?.find(r => r.label === label)?.pct ?? null;
const lowerFirstWord = (t: string) => t.charAt(0).toLowerCase() + t.slice(1);

function MiniStat({ icon, label, value, onClick }: { icon: string; label: string; value: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="rc-card rc-click rc-focus"
      style={{ textAlign: "left", padding: "11px 12px", borderRadius: 14, background: "var(--surface-2)", border: "1px solid var(--border)", cursor: "pointer", color: "inherit", minWidth: 0 }}>
      <div className="rc-row" style={{ gap: 6, color: "var(--dim)", fontSize: 11.5 }}><Icon name={icon} size={13} /><span className="rc-ellipsis">{label}</span></div>
      <div className="rc-ellipsis" style={{ fontSize: 19, fontWeight: 600, letterSpacing: "-.6px", marginTop: 6 }}>{value}</div>
    </button>
  );
}

function Driver({ icon, text, tone }: { icon: string; text: ReactNode; tone: string }) {
  return (
    <div className="rc-row" style={{ alignItems: "flex-start", gap: 11 }}>
      <span style={{ width: 26, height: 26, flex: "none", borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", background: "var(--surface-2)", color: tone }}><Icon name={icon} size={13} /></span>
      <div style={{ fontSize: 13, lineHeight: 1.55, color: "var(--body)", paddingTop: 3 }}>{text}</div>
    </div>
  );
}

function Fact({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div style={{ padding: "10px 12px", borderRadius: 12, background: "var(--surface-2)", border: "1px solid var(--border)", minWidth: 0 }}>
      <div className="rc-ellipsis" style={{ fontSize: 11, color: "var(--dim)" }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 600, letterSpacing: "-.5px", marginTop: 4 }}>{value}</div>
      {sub && <div className="rc-ellipsis" style={{ fontSize: 10.5, color: "var(--faint)", marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

function PeerRow({ label, you, peers, pct }: { label: string; you: string; peers: string; pct: number }) {
  return (
    <div>
      <div className="rc-row" style={{ fontSize: 12.5 }}>
        <span className="rc-grow" style={{ color: "var(--body)" }}>{label}</span>
        <b style={{ fontWeight: 600 }}>{you}</b>
      </div>
      <div style={{ position: "relative", height: 8, borderRadius: 999, background: "var(--track)", marginTop: 7 }}>
        <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: pct + "%", borderRadius: 999, background: GRAD, transformOrigin: "left", animation: "rcGrow .9s cubic-bezier(.16,1,.3,1) both" }} />
        <span title="Peer median" style={{ position: "absolute", left: "50%", top: -4, bottom: -4, width: 2, borderRadius: 2, background: "var(--ink)", opacity: 0.45 }} />
      </div>
      <div className="rc-row" style={{ fontSize: 11, color: "var(--faint)", marginTop: 5 }}>
        <span className="rc-grow">Peers: {peers}</span>
        <span>Ahead of {pct}%</span>
      </div>
    </div>
  );
}

function GeoRows({ c }: { c: Candidate }) {
  const rows = GEO_SALARY.map(g => ({ g, r: regionalRange(c, g) }));
  const lo = Math.floor((Math.min(c.salaryCurrent, ...rows.map(x => x.r[0])) * 0.92) / 5000) * 5000;
  const hi = Math.ceil((Math.max(c.salaryCurrent, ...rows.map(x => x.r[1])) * 1.04) / 5000) * 5000;
  const pos = (v: number) => ((v - lo) / (hi - lo)) * 100;
  const home = homeRegion(c);
  return (
    <div className="rc-col" style={{ gap: 14 }}>
      {rows.map(({ g, r }) => {
        const mine = g.region === home;
        return (
          <div key={g.region}>
            <div className="rc-row" style={{ fontSize: 12.5, gap: 8 }}>
              <span className="rc-grow rc-row" style={{ gap: 7, color: mine ? "var(--ink)" : "var(--body)" }}>{g.region}{mine && <Badge tone="accent">You</Badge>}</span>
              <span style={{ fontWeight: mine ? 600 : 500, fontVariantNumeric: "tabular-nums" }}>{eurK(r[0])} to {eurK(r[1])}</span>
            </div>
            <div style={{ position: "relative", height: 8, borderRadius: 999, background: "var(--track)", marginTop: 7 }}>
              <div style={{ position: "absolute", top: 0, bottom: 0, left: pos(r[0]) + "%", width: pos(r[1]) - pos(r[0]) + "%", borderRadius: 999,
                background: mine ? GRAD : "color-mix(in oklab, #4263EB 50%, var(--track))", transformOrigin: "left", animation: "rcGrow .9s cubic-bezier(.16,1,.3,1) both" }} />
              <span title={"Your salary: " + eurK(c.salaryCurrent)} style={{ position: "absolute", left: pos(c.salaryCurrent) + "%", top: -4, bottom: -4, width: 2, borderRadius: 2, background: "var(--ink)" }} />
            </div>
          </div>
        );
      })}
      <div style={{ fontSize: 11, color: "var(--faint)" }}>Line: your current salary, {eurK(c.salaryCurrent)}.</div>
    </div>
  );
}
