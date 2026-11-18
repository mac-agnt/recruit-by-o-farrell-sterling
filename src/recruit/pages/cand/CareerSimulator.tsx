import { useEffect, useState, type ReactNode } from "react";
import { Badge, Button, Card, DemoTag, Divider, Grid, Label, Note, Page, Slider, Stat, Timeline, Toggle, toneColor } from "../../ui";
import { RangeBar } from "../../charts";
import { Icon } from "../../icons";
import { useNav } from "../../nav";
import { enrol, openDrawer, toggleSavedJob, useRecruit, vacancyById } from "../../store";
import { candidate } from "../../selectors";
import { CAREER_PATHS, COURSE_BY_ID, EMPLOYER_BY_ID, PARTNER_BY_ID, VALUE_SCENARIOS, type CareerPath } from "../../data";
import type { Candidate, Course } from "../../data/types";
import { eur, eurK, num, plural } from "../../format";
import { alignmentTone } from "../../match";
import { bucketOf, durationMonths, parseMonths, simulatorHandoff, type Bucket } from "./explorerKit";

/* Career explorer, career simulator. Pick a path, change the inputs, and see
   an illustrative projection: salary range, alignment, time to readiness,
   roles in reach and a step-by-step plan. Never a promise of an outcome. */

export default function CareerSimulator() {
  const s = useRecruit();
  return <SimView key={s.persona} />;
}

const LATERAL: Record<Bucket, string> = {
  events: "Senior events manager at a dedicated venue",
  retail: "Store operations manager at a flagship store",
  cx: "Head of service at a venue or retailer",
  procurement: "Category buyer for food and beverage",
  hotels: "Operations role in a larger hotel",
  groups: "Cluster or area role inside a hotel group",
  investment: "Owner's representative on a hotel project",
};

interface Factor { id: string; label: string; detail: string; align: number; lo: number; hi: number; months: number; roles: number }
interface Choices { course: boolean; years: number; relocate: boolean; lateral: boolean }

const r500 = (n: number) => Math.round(n / 500) * 500;
const signed = (n: number, f: (v: number) => string) => (n > 0 ? "+" : n < 0 ? "-" : "") + f(Math.abs(n));
const monthsLabel = (m: number) => (m < 1 ? "Now" : Math.round(m) + (Math.round(m) === 1 ? " month" : " months"));
const readyIn = (t: string) => (/^now$/i.test(t) ? "ready now" : "ready in " + t.toLowerCase());

function project(c: Candidate, p: CareerPath, course: Course | undefined, ch: Choices) {
  const relo = (VALUE_SCENARIOS[c.id] || []).find(x => x.id === "relocate");
  const place = relo && /london/i.test(relo.detail) ? "London" : "Dublin";
  const vac = p.vacancyId ? vacancyById(p.vacancyId) : undefined;
  const [m0, m1] = parseMonths(p.timeToMove);
  const base = (m0 + m1) / 2;
  let months = base;
  const factors: Factor[] = [];

  if (ch.course && course) {
    const cm = durationMonths(course.duration);
    const next = Math.max(cm, base * 0.6);
    factors.push({ id: "course", label: "Complete " + course.title, detail: (PARTNER_BY_ID[course.partnerId]?.short || "Partner") + ", " + course.duration + (p.gaps.length ? ". Closes the gaps employers ask about." : "."),
      align: p.gaps.length ? Math.min(8, 3 + 2 * p.gaps.length) : 2, lo: r500(course.impact[0] * 0.4), hi: r500(course.impact[1] * 0.4), months: next - months, roles: Math.round(p.openRoles * 0.2) });
    months = next;
  }
  if (ch.lateral) {
    factors.push({ id: "lateral", label: "Lateral step first", detail: LATERAL[bucketOf(p.industry)] + ", then step up with sector experience.",
      align: 5, lo: r500(p.salary[0] * 0.02), hi: r500(p.salary[1] * 0.03), months: 9, roles: Math.round(p.openRoles * 0.1) });
    months += 9;
  }
  if (ch.years > 0) {
    const next = Math.max(months, 12 * ch.years);
    factors.push({ id: "years", label: plural(ch.years, "more year") + " of experience", detail: (p.gaps[0]?.how || "Take on wider scope in your current role") + ".",
      align: Math.min(6, 2 * ch.years), lo: r500(p.salary[0] * 0.025 * ch.years), hi: r500(p.salary[1] * 0.03 * ch.years), months: next - months, roles: Math.round(p.openRoles * 0.08 * ch.years) });
    months = next;
  }
  if (ch.relocate && relo) {
    const anchored = !!vac && vac.location.includes(place);
    const local = c.location.includes(place);
    factors.push({ id: "relocate", label: "Relocate to " + place,
      detail: anchored ? "This role is already " + place + "-based, so pay is unchanged. Living nearby widens the roles you can reach." : relo.note,
      align: anchored && !local ? 3 : 0, lo: anchored ? 0 : r500(relo.low * 0.6), hi: anchored ? 0 : r500(relo.high * 0.6), months: 1, roles: Math.round(p.openRoles * 0.3) });
    months += 1;
  }
  const sum = (k: "align" | "lo" | "hi" | "roles") => factors.reduce((t, f) => t + f[k], 0);
  return { factors, place, relo, vac, base, months, align: Math.min(97, p.alignment + sum("align")), lo: p.salary[0] + sum("lo"), hi: p.salary[1] + sum("hi"), roles: p.openRoles + sum("roles") };
}

function SimView() {
  const s = useRecruit();
  const nav = useNav();
  const c = candidate(s, s.persona);
  const paths = CAREER_PATHS[c.id] || [];
  const [pathId, setPathId] = useState(() => {
    const h = simulatorHandoff.pathId;
    return h && paths.some(p => p.id === h) ? h : paths[0]?.id || "";
  });
  useEffect(() => { simulatorHandoff.pathId = null; }, []);
  const [useCourse, setUseCourse] = useState(true);
  const [years, setYears] = useState(0);
  const [relocate, setRelocate] = useState(false);
  const [lateral, setLateral] = useState(false);
  const p = paths.find(x => x.id === pathId) || paths[0];

  if (!p) {
    return <Page eyebrow="CAREER EXPLORER" title="Career simulator"><Card><Note>Career Pathfinder needs a profile to simulate from.</Note></Card></Page>;
  }

  const course = p.courseIds.map(id => COURSE_BY_ID[id]).find(Boolean);
  const res = project(c, p, course, { course: useCourse && !!course, years, relocate, lateral });
  const enrolled = course ? s.enrolments.some(e => e.candidateId === c.id && e.courseId === course.id) : false;
  const vacEmp = res.vac ? EMPLOYER_BY_ID[res.vac.employerId] : undefined;
  const saved = res.vac ? (s.savedJobs[c.id] || []).includes(res.vac.id) : false;
  const selfSkills = c.skills.filter(x => x.verification !== "verified" && p.matched.some(m => m.toLowerCase() === x.name.toLowerCase()));
  const lo = Math.floor((Math.min(c.salaryCurrent, p.salary[0]) * 0.86) / 5000) * 5000;
  const hi = Math.ceil((Math.max(res.hi, p.salary[1]) * 1.07) / 5000) * 5000;
  const reset = () => { setUseCourse(true); setYears(0); setRelocate(false); setLateral(false); };
  const changed = (!!course && !useCourse) || years > 0 || relocate || lateral;

  // The plan, in order.
  const plan: { when: string; title: string; body?: string; tone?: "accent" | "ok" | "warn" | "neutral" | "teal" }[] = [];
  let t = 0;
  plan.push({ when: "Now", title: "Position your profile for " + p.title,
    body: "Lead with " + p.matched.slice(0, 3).join(", ").toLowerCase() + ". " + (selfSkills.length ? "Verify " + selfSkills.map(x => x.name.toLowerCase()).join(" and ") + " so employers can rely on it." : "Your key skills for this path are already verified."), tone: "accent" });
  if (useCourse && course) {
    const cm = durationMonths(course.duration);
    plan.push({ when: "Months 1 to " + cm, title: "Complete " + course.title,
      body: (PARTNER_BY_ID[course.partnerId]?.short || "Partner") + ", " + course.duration + (p.gaps.length ? ". Closes: " + p.gaps.map(g => g.label.toLowerCase()).join("; ") + "." : "."), tone: "warn" });
    t = cm;
  }
  if (lateral) {
    plan.push({ when: "Months " + (t + 1) + " to " + (t + 9), title: "Lateral step: " + LATERAL[bucketOf(p.industry)].toLowerCase(), body: "Build sector experience at a similar salary before stepping up.", tone: "teal" });
    t += 9;
  }
  if (years > 0) {
    plan.push({ when: years === 1 ? "Over the next year" : "Over " + years + " years", title: "Build the experience employers look for", body: (p.gaps[0]?.how || "Take on wider scope in your current role") + ".", tone: "teal" });
    t = Math.max(t, 12 * years);
  }
  if (relocate) {
    plan.push({ when: "Month " + Math.max(1, Math.round(t) + 1), title: "Move to " + res.place, body: res.factors.find(f => f.id === "relocate")?.detail, tone: "neutral" });
  }
  plan.push({ when: res.months < 1 ? "Now" : "Month " + Math.round(res.months), title: "Apply for " + p.title + " roles",
    body: res.vac && res.vac.status === "open" ? res.vac.title + " at " + (vacEmp?.name || "an employer") + " is open today." : num(res.roles) + " roles like this are in reach in the marketplace.", tone: "accent" });
  plan.push({ when: "Target", title: "Projected range " + eurK(res.lo) + " to " + eurK(res.hi), body: "Illustrative estimate from demo benchmarks. Not a guaranteed outcome.", tone: "ok" });

  return (
    <Page wide eyebrow="CAREER EXPLORER" title="Try a move before you make it."
      sub="Choose a target path, change the inputs and see how an illustrative projection responds. Every figure is an estimate from demo benchmarks, not a promise."
      actions={<>
        <Button icon="explorer" onClick={() => nav.go("cand.explorer", "paths")}>Career paths</Button>
        <Button icon="refresh" onClick={reset} disabled={!changed}>Reset inputs</Button>
      </>}>
      <Grid cols="rc-g-side">
        <Card title="Your scenario" sub="Changes update the projection straight away">
          <Label>Target path</Label>
          <div className="rc-col" style={{ gap: 7, marginTop: 9 }}>
            {paths.map(x => {
              const on = x.id === p.id;
              return (
                <button key={x.id} className="rc-focus" onClick={() => setPathId(x.id)} aria-pressed={on}
                  style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 11px", borderRadius: "var(--r-sm, 12px)", cursor: "pointer", textAlign: "left", font: "inherit", color: "inherit",
                    border: "1px solid " + (on ? "var(--accent)" : "var(--border)"), background: on ? "var(--accent-faint)" : "var(--surface-2)", transition: "background .2s var(--ease), border-color .2s var(--ease)" }}>
                  <span style={{ width: 14, height: 14, flex: "none", borderRadius: 999, border: "1.5px solid " + (on ? "var(--accent)" : "var(--border-strong)"), display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {on && <span style={{ width: 6, height: 6, borderRadius: 999, background: "var(--accent)" }} />}
                  </span>
                  <span className="rc-grow">
                    <span style={{ display: "block", fontSize: 12.5, fontWeight: on ? 600 : 500, color: "var(--ink)", lineHeight: 1.3 }}>{x.title}</span>
                    <span style={{ display: "block", fontSize: 11, color: "var(--dim)", marginTop: 2 }}>{eurK(x.salary[0])} to {eurK(x.salary[1])} · {x.timeToMove}</span>
                  </span>
                  <span style={{ fontSize: 11, fontWeight: 600, color: toneColor(alignmentTone(x.alignment)) }}>{x.alignment}%</span>
                </button>
              );
            })}
          </div>

          <Divider style={{ margin: "18px 0" }} />
          <Label>Your choices</Label>
          <div className="rc-col" style={{ gap: 16, marginTop: 12 }}>
            <Toggle on={useCourse && !!course} disabled={!course} onChange={setUseCourse}
              label={course ? "Complete " + course.title : "Complete a linked course"}
              sub={course ? (PARTNER_BY_ID[course.partnerId]?.short || "Partner") + ", " + course.duration + ". Member price " + eur(course.price * (1 - course.memberDiscount)) + "." : "No course is linked to this path. Experience closes its gaps."} />
            <Slider label="Additional experience" value={years} min={0} max={3} step={1} onChange={setYears} display={years === 0 ? "None" : plural(years, "year")} />
            <Toggle on={relocate} disabled={!res.relo} onChange={setRelocate} label={"Relocate to " + res.place} sub={res.relo ? res.relo.note : "No relocation scenario for this profile."} />
            <Toggle on={lateral} onChange={setLateral} label="Take a lateral step first" sub={LATERAL[bucketOf(p.industry)] + ", then step up."} />
          </div>
        </Card>

        <div className="rc-col" style={{ gap: 14, minWidth: 0 }}>
          <Grid cols="rc-g4">
            <Stat icon="euro" tone="accent" label="Projected salary" value={eurK(res.lo) + " to " + eurK(res.hi)} sub={"Role today " + eurK(p.salary[0]) + " to " + eurK(p.salary[1])} />
            <Stat icon="target" tone="teal" label="Alignment" value={res.align + "%"} delta={res.align > p.alignment ? "+" + (res.align - p.alignment) + " pts" : undefined} sub={"from " + p.alignment + "% today"} />
            <Stat icon="clock" tone="warn" label="Ready in" value={monthsLabel(res.months)} sub={"Typical for this path: " + (/^now$/i.test(p.timeToMove) ? "now" : p.timeToMove.toLowerCase())} />
            <Stat icon="jobs" label="Roles in reach" value={num(res.roles)} delta={res.roles > p.openRoles ? "+" + num(res.roles - p.openRoles) : undefined} sub={"from " + num(p.openRoles) + " open today"} />
          </Grid>

          <Card title={p.title} sub={p.industry + (p.adjacent ? ", adjacent industry" : ", same sector")} action={<DemoTag>Illustrative projection</DemoTag>}>
            <RangeBar min={lo} max={hi} band={p.salary} scenario={[res.lo, res.hi]} marker={c.salaryCurrent} markerLabel="You" format={eurK} />
            <div className="rc-row rc-wrap" style={{ gap: 14, fontSize: 11.5, color: "var(--dim)" }}>
              <span className="rc-row" style={{ gap: 6 }}><span style={{ width: 16, height: 8, borderRadius: 999, background: "linear-gradient(90deg, #4263EB, var(--teal, #16B8A6))" }} />Role range today</span>
              <span className="rc-row" style={{ gap: 6 }}><span style={{ width: 16, height: 8, borderRadius: 999, border: "1.5px dashed var(--warn)" }} />Your projected range</span>
            </div>

            <Label style={{ marginTop: 18 }}>What moves the projection</Label>
            <div className="rc-col" style={{ marginTop: 6 }}>
              <FactorRow icon="explorer" title={"Starting point: " + p.title + " today"} detail={p.alignment + "% alignment, " + eurK(p.salary[0]) + " to " + eurK(p.salary[1]) + ", " + readyIn(p.timeToMove) + "."} chips={[]} />
              {res.factors.map(f => (
                <FactorRow key={f.id} icon={f.id === "course" ? "learning" : f.id === "relocate" ? "pin" : f.id === "lateral" ? "route" : "trendUp"} title={f.label} detail={f.detail}
                  chips={[
                    f.align ? "+" + f.align + " pts alignment" : "",
                    f.lo || f.hi ? signed(f.lo, eurK) + " to " + signed(f.hi, eurK) : "Pay unchanged",
                    Math.round(f.months) ? signed(Math.round(f.months), v => v + (v === 1 ? " month" : " months")) : "",
                    f.roles ? "+" + f.roles + " roles" : "",
                  ].filter(Boolean)} />
              ))}
              {!res.factors.length && <div style={{ fontSize: 12.5, color: "var(--dim)", padding: "10px 0" }}>Turn on a choice on the left to see its effect.</div>}
            </div>
          </Card>

          <Grid cols="rc-g-3-2">
            <Card title="Your step-by-step plan" sub="Built from the choices on the left" action={<Badge tone="accent" icon="route">{plural(plan.length, "step")}</Badge>}>
              <Timeline items={plan} />
            </Card>
            <Card title="Make it real" sub="Each step connects to the rest of Recruit">
              <div className="rc-col" style={{ gap: 10 }}>
                {course && (
                  <ActionRow icon="learning" title={course.title} sub={(PARTNER_BY_ID[course.partnerId]?.short || "") + ", " + course.starts.toLowerCase()}
                    right={enrolled ? <Badge tone="teal" icon="check">Enrolled</Badge> : <Button size="sm" variant="primary" onClick={() => enrol(c.id, course.id)}>Enrol</Button>}
                    onOpen={() => openDrawer("course", course.id)} />
                )}
                {res.vac && (
                  <ActionRow icon="jobs" title={res.vac.title} sub={(vacEmp?.short || "") + ", " + eurK(res.vac.salary[0]) + " to " + eurK(res.vac.salary[1])}
                    right={<Button size="sm" icon="bookmark" onClick={() => toggleSavedJob(c.id, res.vac!.id)}
                      style={saved ? { background: "var(--accent-soft)", border: "1px solid var(--accent-line)", color: "var(--ink)" } : undefined}>{saved ? "Saved" : "Save"}</Button>}
                    onOpen={() => openDrawer("vacancy", res.vac!.id)} />
                )}
                <ActionRow icon="layers" title="Translate your skills" sub="See how this industry describes your experience" onOpen={() => nav.go("cand.explorer", "skills")}
                  right={<Icon name="arrowRight" size={14} style={{ color: "var(--faint)" }} />} />
                {!course && !res.vac && <div style={{ fontSize: 12, color: "var(--dim)" }}>This path has no linked course or live vacancy today. {num(p.openRoles)} similar roles are listed.</div>}
              </div>
              <Note style={{ marginTop: 14 }}>The simulator shows what could change, not what will. Employers make hiring decisions and pay depends on the role.</Note>
            </Card>
          </Grid>
        </div>
      </Grid>
    </Page>
  );
}

function FactorRow({ icon, title, detail, chips }: { icon: string; title: string; detail: string; chips: string[] }) {
  return (
    <div className="rc-row rc-fade" style={{ alignItems: "flex-start", gap: 11, padding: "11px 0", borderTop: "1px solid var(--border)" }}>
      <span style={{ width: 26, height: 26, flex: "none", borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", background: "var(--surface-2)", color: "var(--accent)" }}><Icon name={icon} size={13} /></span>
      <div className="rc-grow">
        <div style={{ fontSize: 13, fontWeight: 500, color: "var(--ink)" }}>{title}</div>
        <div style={{ fontSize: 12, color: "var(--dim)", marginTop: 3, lineHeight: 1.45 }}>{detail}</div>
      </div>
      {chips.length > 0 && (
        <div className="rc-row rc-wrap" style={{ gap: 6, justifyContent: "flex-end", maxWidth: 260 }}>
          {chips.map(ch => <Badge key={ch} tone={ch.startsWith("-") && !/month/.test(ch) ? "warn" : ch === "Pay unchanged" ? "neutral" : "teal"}>{ch}</Badge>)}
        </div>
      )}
    </div>
  );
}

function ActionRow({ icon, title, sub, right, onOpen }: { icon: string; title: string; sub: string; right: ReactNode; onOpen: () => void }) {
  return (
    <div className="rc-row" style={{ gap: 11, padding: "10px 12px", borderRadius: "var(--r-sm, 12px)", background: "var(--surface-2)", border: "1px solid var(--border)" }}>
      <span style={{ color: "var(--accent)", display: "inline-flex" }}><Icon name={icon} size={15} /></span>
      <button className="rc-grow rc-focus" onClick={onOpen} style={{ background: "none", border: 0, padding: 0, textAlign: "left", cursor: "pointer", color: "inherit", font: "inherit", minWidth: 0 }}>
        <span className="rc-ellipsis" style={{ display: "block", fontSize: 12.5, fontWeight: 500, color: "var(--ink)" }}>{title}</span>
        <span className="rc-ellipsis" style={{ display: "block", fontSize: 11.5, color: "var(--dim)", marginTop: 2 }}>{sub}</span>
      </button>
      {right}
    </div>
  );
}
