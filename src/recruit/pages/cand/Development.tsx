import { Avatar, Badge, Button, Card, DemoTag, Empty, Grid, Label, Note, Page, Progress, Stat, Timeline } from "../../ui";
import { BarList } from "../../charts";
import { Icon } from "../../icons";
import { useNav } from "../../nav";
import { logActivity, notify, openDrawer, useRecruit } from "../../store";
import { candidate } from "../../selectors";
import { CAREER_PATHS, COURSE_BY_ID, INDEX_ACTIONS, PARTNER_BY_ID } from "../../data";
import type { CareerPath, Course } from "../../data";
import { eurK } from "../../format";
import { impactText, lowerFirst, recommendedCourses } from "../../shared/CourseDrawer";
import { actionKind, extraOf, fmtMonth, DEMO_TODAY, patchExtra, type IndexAction } from "./Profile";
import { StrengthenAction } from "./Verification";

/* My development: the plan that connects courses, evidence and experience
   to the roles a person is aiming at. Dates and effects are illustrative. */

interface GapStep { id: string; label: string; how: string; path: CareerPath; course?: Course }

/** Paths with a live role first, then by alignment. */
function focusPaths(id: string) {
  return (CAREER_PATHS[id] || []).slice().sort((a, b) => (b.vacancyId ? 1 : 0) - (a.vacancyId ? 1 : 0) || b.alignment - a.alignment).slice(0, 3);
}
function gapSteps(id: string): GapStep[] {
  return focusPaths(id).flatMap(p => p.gaps.map((g, i) => {
    const courses = p.courseIds.map(x => COURSE_BY_ID[x]).filter(Boolean);
    const course = courses.find(cr => g.how.toLowerCase().includes(cr.title.toLowerCase())) || (/certificate|course|diploma|programme/i.test(g.how) ? courses[0] : undefined);
    return { id: "gap:" + p.id + ":" + i, label: g.label, how: g.how, path: p, course };
  }));
}

/** Month offset from the demo's today for an intake label. */
function startOffset(starts: string) {
  const m = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"].findIndex(x => starts.toLowerCase().startsWith(x));
  if (m >= 0) return ((m - DEMO_TODAY.getMonth() + 12) % 12) || 12;
  return /weekly/i.test(starts) ? 0 : 1;
}
function lengthMonths(duration: string) {
  const w = /(\d+)\s*weeks?/i.exec(duration);
  if (w) return Math.max(1, Math.round(Number(w[1]) / 4.33));
  const mo = /(\d+)\s*months?/i.exec(duration);
  if (mo) return Number(mo[1]);
  return 0;
}
const monthAt = (offset: number) => { const d = new Date(DEMO_TODAY); d.setDate(1); d.setMonth(d.getMonth() + offset); return fmtMonth(d); };
const MOVE_OFFSET: Record<string, number> = { "Now": 0, "1 to 3 months": 2, "3 to 6 months": 5, "6 to 9 months": 8, "6 to 12 months": 9, "9 to 12 months": 11, "12 to 24 months": 18 };

export default function Development() {
  const s = useRecruit();
  const nav = useNav();
  const c = candidate(s, s.persona);
  const extra = extraOf(s, c.id);
  const plan = extra.plan || [];
  const enrolments = s.enrolments.filter(e => e.candidateId === c.id).map(e => ({ e, course: COURSE_BY_ID[e.courseId] })).filter(x => !!x.course);
  const enrolledIds = new Set(enrolments.map(x => x.course.id));
  const actions = INDEX_ACTIONS[c.id] || [];
  const openActions = actions.filter(a => !s.indexActions[a.id]);
  const gaps = gapSteps(c.id);
  const paths = focusPaths(c.id);
  const top = paths[0];
  const recs = recommendedCourses(c);
  const pointsOpen = openActions.reduce((t, a) => t + a.points, 0);

  const addToPlan = (g: GapStep) => {
    patchExtra(c.id, cur => ({ plan: (cur.plan || []).concat([g.id]) }));
    logActivity({ category: "learning", actor: c.name, title: "Development step planned", detail: c.name + " added a step to their development plan: " + lowerFirst(g.how) + ".", refs: [c.id] });
    notify("Added to your development plan");
  };
  const removeFromPlan = (id: string) => patchExtra(c.id, cur => ({ plan: (cur.plan || []).filter(x => x !== id) }));

  /* Milestones: enrolled courses, planned steps and the moves they lead to. */
  type Milestone = { at: number; when: string; title: string; body: string; tone: "accent" | "teal" | "warn" | "neutral" };
  const ms: Milestone[] = [];
  const quick = openActions.filter(a => actionKind(a) !== "course");
  if (quick.length) ms.push({ at: 0, when: "This month", title: "Add evidence to your profile", body: quick.length + (quick.length === 1 ? " action" : " actions") + ", worth up to " + quick.reduce((t, a) => t + a.points, 0) + " Recruit Index points.", tone: "warn" });
  enrolments.forEach(({ e, course }) => {
    const st = e.progress > 0 ? 0 : startOffset(course.starts);
    const len = lengthMonths(course.duration);
    const act = actions.find(a => a.label.toLowerCase().includes(course.title.toLowerCase()));
    if (e.progress === 0) ms.push({ at: st, when: monthAt(st), title: "Start " + course.title, body: course.starts + ", " + course.format.toLowerCase() + ".", tone: "accent" });
    ms.push({ at: st + len, when: monthAt(st + len), title: "Complete " + course.title, body: course.credential + (act ? ", adding " + act.points + " Recruit Index points" : "") + ".", tone: "teal" });
  });
  if (!enrolments.length && recs[0]) {
    const cr = recs[0].course, st = startOffset(cr.starts);
    ms.push({ at: st, when: monthAt(st), title: "Suggested: start " + cr.title, body: "Not enrolled yet. " + recs[0].reason + ".", tone: "neutral" });
  }
  gaps.filter(g => plan.includes(g.id) && !g.course).forEach(g => ms.push({ at: 3, when: "Next 6 months", title: g.how, body: "Closes a gap for " + g.path.title + ": " + lowerFirst(g.label) + ".", tone: "accent" }));
  paths.forEach(p => ms.push({ at: (MOVE_OFFSET[p.timeToMove] ?? 12) + 0.5, when: p.timeToMove === "Now" ? "Now" : "In " + p.timeToMove, title: (p.timeToMove === "Now" ? "Ready now: " : "Ready for ") + p.title,
    body: eurK(p.salary[0]) + " to " + eurK(p.salary[1]) + ", " + p.openRoles + " open roles, " + p.alignment + "% alignment today.", tone: "neutral" }));
  ms.sort((a, b) => a.at - b.at);

  /* Illustrative effect of each course step on opportunities. */
  const effectCourses = Array.from(new Map(
    enrolments.map(x => x.course).concat(gaps.filter(g => g.course).map(g => g.course as Course)).map(cr => [cr.id, cr] as [string, Course])).values()).slice(0, 5);

  return (
    <Page wide eyebrow="LEARNING" title="My development plan"
      sub="Courses, evidence and experience, linked to the roles you are aiming at. Dates and effects are illustrative and depend on you and the market."
      actions={<>
        <Button icon="learning" onClick={() => nav.go("cand.learning", "courses")}>Browse courses</Button>
        <Button variant="primary" icon="value" onClick={() => nav.go("cand.value", "value")}>See my market value</Button>
      </>}>

      <Grid cols="rc-g4">
        <Stat icon="learning" tone="accent" label="Active courses" value={enrolments.length} sub={enrolments.length ? "member pricing, demo" : "none yet"} />
        <Stat icon="route" label="Next steps" value={openActions.length + gaps.filter(g => !plan.includes(g.id) && !(g.course && enrolledIds.has(g.course.id))).length} sub="evidence and gaps" />
        <Stat icon="chart" tone="teal" label="Index points available" value={"+" + pointsOpen} sub="from the actions below" onClick={() => nav.go("cand.value", "breakdown")} />
        <Stat icon="target" label={top ? top.title : "Top path"} value={top ? top.alignment + "%" : "None"} sub={top ? "alignment today, " + top.timeToMove.toLowerCase() : "no paths mapped"} onClick={() => nav.go("cand.explorer", "paths")} />
      </Grid>

      <Grid cols="rc-g-3-2">
        <div className="rc-col" style={{ gap: 14 }}>
          <Card title="Active courses" sub={enrolments.length ? "Your enrolments and progress" : "You are not enrolled on a course yet"}
            action={<Button size="sm" variant="ghost" iconRight="arrowRight" onClick={() => nav.go("cand.learning", "courses")}>Courses</Button>}>
            {enrolments.map(({ e, course }, i) => {
              const p = PARTNER_BY_ID[course.partnerId];
              const nextModule = course.modules[Math.min(course.modules.length - 1, Math.floor((e.progress / 100) * course.modules.length))];
              return (
                <div key={e.id} className="rc-rowhover" onClick={() => openDrawer("course", course.id)}
                  style={{ padding: "12px 8px", margin: "0 -8px", borderRadius: 10, borderTop: i ? "1px solid var(--border)" : 0 }}>
                  <div className="rc-row" style={{ gap: 11 }}>
                    <Avatar initials={p?.initials || "?"} tint={p?.tint} size={32} square />
                    <div className="rc-grow" style={{ minWidth: 0 }}>
                      <div className="rc-ellipsis" style={{ fontSize: 13.5, fontWeight: 500 }}>{course.title}</div>
                      <div style={{ fontSize: 11.5, color: "var(--dim)", marginTop: 2 }}>{p?.short} · {course.duration}</div>
                    </div>
                    <Badge tone={e.progress > 0 ? "accent" : "teal"}>{e.progress > 0 ? e.progress + "%" : "Enrolled " + (e.date === "Today" ? "today" : e.date)}</Badge>
                  </div>
                  <Progress value={e.progress} style={{ marginTop: 10 }} />
                  <div style={{ fontSize: 11.5, color: "var(--faint)", marginTop: 6 }}>{e.progress > 0 ? "Next: " + nextModule : "Starts: " + course.starts + ". First module: " + course.modules[0]}</div>
                </div>
              );
            })}
            {!enrolments.length && (
              <Empty icon="learning" title="No courses yet" body={recs[0] ? recs[0].course.title + " is the strongest fit for you. " + recs[0].reason + "." : "Browse the marketplace for courses linked to your next role."}
                action={recs[0] ? <Button size="sm" variant="primary" onClick={() => openDrawer("course", recs[0].course.id)}>View the course</Button> : <Button size="sm" onClick={() => nav.go("cand.learning", "courses")}>Browse courses</Button>} />
            )}
          </Card>

          <Card title="Recommended next steps" sub="Each one linked to a gap in a path you could take, or to evidence that lifts your index">
            {openActions.length > 0 && <Label style={{ marginBottom: 4 }}>Evidence for your profile</Label>}
            {openActions.map(a => <ActionStep key={a.id} a={a} />)}
            {gaps.length > 0 && <Label style={{ margin: openActions.length ? "16px 0 4px" : "0 0 4px" }}>Gaps for your next roles</Label>}
            {gaps.map(g => {
              const planned = plan.includes(g.id);
              const enrolled = !!g.course && enrolledIds.has(g.course.id);
              return (
                <div key={g.id} className="rc-row rc-wrap" style={{ gap: 12, padding: "11px 0", borderTop: "1px solid var(--border)" }}>
                  <span style={{ width: 28, height: 28, borderRadius: 9, background: "var(--surface-2)", color: g.course ? "#f0a33e" : "#c8b4f0", display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}>
                    <Icon name={g.course ? "learning" : "target"} size={14} />
                  </span>
                  <div className="rc-grow" style={{ minWidth: 220 }}>
                    <div style={{ fontSize: 13, color: "var(--ink)" }}>{g.label}</div>
                    <div style={{ fontSize: 12, color: "var(--dim)", marginTop: 3, lineHeight: 1.45 }}>{g.how}</div>
                    <div style={{ fontSize: 11, color: "var(--faint)", marginTop: 4 }}>For {g.path.title} · {g.path.alignment}% alignment</div>
                  </div>
                  {g.course
                    ? (enrolled ? <Badge tone="teal" icon="check">Enrolled</Badge> : <Button size="sm" iconRight="arrowRight" onClick={() => openDrawer("course", g.course!.id)}>View course</Button>)
                    : (planned
                      ? <span className="rc-row" style={{ gap: 8 }}><Badge tone="accent" icon="check">In your plan</Badge><button className="rc-link" style={{ fontSize: 12 }} onClick={() => removeFromPlan(g.id)}>Remove</button></span>
                      : <Button size="sm" icon="plus" onClick={() => addToPlan(g)}>Add to plan</Button>)}
                </div>
              );
            })}
            {!openActions.length && !gaps.length && <div style={{ fontSize: 12.5, color: "var(--dim)" }}>Nothing outstanding. Your evidence already covers the roles you are targeting.</div>}
          </Card>
        </div>

        <div className="rc-col" style={{ gap: 14 }}>
          <Card title="Milestones" sub="Your plan over time" action={<DemoTag />}>
            <Timeline items={ms.map(m => ({ when: m.when, title: m.title, body: m.body, tone: m.tone }))} />
          </Card>

          <Card title="How each step may change your opportunities" sub="Illustrative effect in selected relevant roles" action={<DemoTag />}>
            {effectCourses.length > 0 && (
              <BarList items={effectCourses.map(cr => ({ label: cr.title, value: cr.impact[1], display: impactText(cr.impact), color: enrolledIds.has(cr.id) ? "var(--teal, #16B8A6)" : undefined }))} />
            )}
            {actions.length > 0 && (
              <div style={{ marginTop: effectCourses.length ? 16 : 0, paddingTop: effectCourses.length ? 12 : 0, borderTop: effectCourses.length ? "1px solid var(--border)" : 0 }}>
                <div className="rc-row" style={{ fontSize: 12.5 }}>
                  <span className="rc-grow" style={{ color: "var(--body)" }}>Recruit Index from evidence</span>
                  <b style={{ fontWeight: 600 }}>{actions.filter(a => s.indexActions[a.id] === "done").reduce((t, a) => t + a.points, 0)} of {actions.reduce((t, a) => t + a.points, 0)} points</b>
                </div>
                <Progress value={actions.filter(a => s.indexActions[a.id] === "done").reduce((t, a) => t + a.points, 0)} max={Math.max(1, actions.reduce((t, a) => t + a.points, 0))} tone="teal" style={{ marginTop: 8 }} />
              </div>
            )}
            {paths.length > 0 && (
              <div className="rc-col" style={{ gap: 8, marginTop: 16 }}>
                {paths.map(p => (
                  <div key={p.id} className="rc-row" style={{ gap: 8, fontSize: 12.5 }}>
                    <Icon name="trendUp" size={13} style={{ color: "var(--accent)" }} />
                    <span className="rc-grow rc-ellipsis" style={{ color: "var(--body)" }}>{p.title}</span>
                    <span style={{ color: "var(--dim)" }}>{eurK(p.salary[0])} to {eurK(p.salary[1])}</span>
                  </div>
                ))}
              </div>
            )}
            <Note style={{ marginTop: 14 }}>Courses and evidence widen your options; they do not guarantee a role or a salary. Employers make those decisions.</Note>
          </Card>
        </div>
      </Grid>
    </Page>
  );
}

function ActionStep({ a }: { a: IndexAction }) {
  const s = useRecruit();
  const c = candidate(s, s.persona);
  return (
    <div className="rc-row rc-wrap" style={{ gap: 12, padding: "11px 0", borderTop: "1px solid var(--border)" }}>
      <span style={{ width: 28, height: 28, borderRadius: 9, background: "var(--accent-soft)", color: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", flex: "none", fontSize: 11, fontWeight: 600 }}>+{a.points}</span>
      <div className="rc-grow" style={{ minWidth: 220 }}>
        <div style={{ fontSize: 13, color: "var(--ink)" }}>{a.label}</div>
        <div style={{ fontSize: 11, color: "var(--faint)", marginTop: 3 }}>{a.area} · {a.effort}</div>
      </div>
      <StrengthenAction a={a} c={c} />
    </div>
  );
}
