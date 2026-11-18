import { Avatar, Badge, Button, Chip, DemoTag, Drawer, Empty, KV, Label, Note, Progress } from "../ui";
import { RangeBar } from "../charts";
import { Icon } from "../icons";
import { useNav } from "../nav";
import { enrol, useRecruit } from "../store";
import { candidate } from "../selectors";
import { CANDIDATE_BY_ID, CAREER_PATHS, COURSE_BY_ID, COURSES, INDEX_ACTIONS, PARTNER_BY_ID, VALUE_SCENARIOS } from "../data";
import type { Candidate, Course } from "../data";
import { eur, eurK, num } from "../format";

/* The course detail drawer, shared by the candidate pages and Recruit HQ.
   Partners are fictional, prices indicative and opportunity effects
   illustrative. Candidates can enrol; every other role sees enrolment stats. */

export const memberPrice = (c: Course) => Math.round(c.price * (1 - c.memberDiscount));
const AXIS_STEPS = [2000, 5000, 10000, 15000, 20000, 25000, 30000, 40000, 50000];
/** A salary axis with five round steps that covers lo to hi, so RangeBar ticks read cleanly. */
export function niceAxis(lo: number, hi: number): [number, number] {
  for (const step of AXIS_STEPS) {
    const l = Math.floor(lo / step) * step;
    if (l + step * 5 >= hi) return [l, l + step * 5];
  }
  const step = Math.ceil((hi - lo) / 5 / 10000) * 10000;
  const l = Math.floor(lo / step) * step;
  return [l, l + step * 5];
}

export const impactText = (r: [number, number]) => (r[0] < 0 ? "-" + eurK(-r[0]) : "+" + eurK(r[0])) + " to +" + eurK(r[1]);

/** Lower-cases the first letter unless the word is an acronym (CX, P&L). */
export const lowerFirst = (t: string) => (t.length > 1 && t[1] === t[1].toLowerCase() ? t[0].toLowerCase() + t.slice(1) : t);

const STOP = ["management", "knowledge", "awareness", "programme", "operation", "leadership", "strategy", "experience", "development", "hospitality"];
const keywords = (t: string) => t.toLowerCase().split(/[^a-z]+/).filter(w => w.length >= 7 && !STOP.some(st => w.startsWith(st.slice(0, 6))));
const titleHit = (course: Course, text: string) => {
  const tw = course.title.toLowerCase().split(/[^a-z]+/);
  return keywords(text).some(w => tw.some(x => x.startsWith(w.slice(0, 7))));
};

export interface CourseRec { course: Course; reason: string }

/** Courses that fit a person, each with a plain reason. Explainable by design:
    a career-path gap, an index action, a self-reported skill or a stated interest. */
export function recommendedCourses(c: Candidate): CourseRec[] {
  const paths = CAREER_PATHS[c.id] || [];
  const actions = INDEX_ACTIONS[c.id] || [];
  const selfSkills = c.skills.filter(k => k.verification === "self");
  const reasonFor = (course: Course): string | null => {
    const t = course.title.toLowerCase();
    for (const p of paths) {
      if (!p.courseIds.includes(course.id)) continue;
      const gap = p.gaps.find(g => g.how.toLowerCase().includes(t));
      if (gap) return "Closes a gap for " + p.title + ": " + lowerFirst(gap.label.split(":")[0]);
    }
    const act = actions.find(a => a.label.toLowerCase().includes(t));
    if (act) return "Adds " + act.points + " Recruit Index points once complete";
    const p = paths.find(x => x.courseIds.includes(course.id));
    if (p) return "Linked to your path: " + p.title + " (" + p.alignment + "% alignment)";
    if (course.impact[1] >= 5000) {
      const sk = selfSkills.find(k => titleHit(course, k.name));
      if (sk) return "Builds evidence for " + lowerFirst(sk.name) + ", which is self-reported today";
      const it = c.interests.find(i => titleHit(course, i));
      if (it) return "Matches your interest in " + lowerFirst(it);
    }
    if (course.recommendedFor.includes(c.id)) return "Picked for your profile by Career Pathfinder";
    return null;
  };
  return COURSES.map(course => ({ course, reason: reasonFor(course) })).filter((x): x is CourseRec => x.reason !== null);
}

export default function CourseDrawer({ id, onClose }: { id: string; onClose: () => void; ctx?: Record<string, string> }) {
  const s = useRecruit();
  const nav = useNav();
  const course = COURSE_BY_ID[id];
  if (!course) {
    return (
      <Drawer open onClose={onClose} eyebrow="COURSE" title="Course not found">
        <Empty icon="learning" title="This course is no longer listed" body="It may have been withdrawn by the education partner." />
      </Drawer>
    );
  }
  const partner = PARTNER_BY_ID[course.partnerId];
  const isCand = nav.role === "candidate";
  const c = isCand ? candidate(s, s.persona) : null;
  const enrolment = c ? s.enrolments.find(e => e.candidateId === c.id && e.courseId === course.id) : undefined;
  const records = s.enrolments.filter(e => e.courseId === course.id);
  const liveToday = records.filter(e => e.date === "Today").length;
  const rec = c ? recommendedCourses(c).find(r => r.course.id === course.id) : undefined;
  const sc = c ? (VALUE_SCENARIOS[c.id] || []).find(v => v.id === "qual" && v.detail === course.title) : undefined;
  const effect: [number, number] = sc ? [sc.low, sc.high] : course.impact;
  const mp = memberPrice(course);
  const [lo, hi] = c ? niceAxis(Math.min(c.salaryCurrent, c.marketRange[0] + Math.min(0, effect[0])) * 0.9, (c.marketRange[1] + effect[1]) * 1.04) : [0, 1];

  const footer = c ? (
    enrolment ? (
      <>
        <Badge tone="teal" icon="check">Enrolled</Badge>
        <span className="rc-grow" style={{ fontSize: 12.5, color: "var(--dim)" }}>
          {enrolment.progress > 0 ? enrolment.progress + "% complete" : "Starts: " + course.starts}
        </span>
        <Button variant="ghost" onClick={onClose}>Close</Button>
        <Button variant="primary" iconRight="arrowRight" onClick={() => { onClose(); nav.go("cand.learning", "development"); }}>My development</Button>
      </>
    ) : (
      <>
        <span className="rc-grow" style={{ fontSize: 12, color: "var(--dim)", lineHeight: 1.45, minWidth: 180 }}>
          Member price {eur(mp)}. Demo enrolment: no payment is taken.
        </span>
        <Button variant="ghost" onClick={onClose}>Close</Button>
        <Button variant="primary" icon="plus" onClick={() => enrol(s.persona, course.id)}>Enrol at member price</Button>
      </>
    )
  ) : (
    <>
      <span className="rc-grow" style={{ fontSize: 12.5, color: "var(--dim)" }}>
        {num(course.enrolled + liveToday)} enrolled to date{liveToday ? ", " + liveToday + " today" : ""}
      </span>
      {nav.role === "hq" && <Button onClick={() => { onClose(); nav.go("hq.learning", "courses"); }} iconRight="arrowRight">All courses</Button>}
      <Button variant="primary" onClick={onClose}>Close</Button>
    </>
  );

  return (
    <Drawer open onClose={onClose} width={620} eyebrow={"COURSE · " + (partner?.short || "Partner").toUpperCase()} title={course.title} sub={course.summary}
      badge={<Badge tone="accent">{course.category}</Badge>} footer={footer}>
      <div className="rc-col" style={{ gap: 18 }}>
        {partner && (
          <div className="rc-row" style={{ gap: 12, alignItems: "flex-start" }}>
            <Avatar initials={partner.initials} tint={partner.tint} size={40} square />
            <div className="rc-grow">
              <div style={{ fontSize: 14, fontWeight: 500 }}>{partner.name}</div>
              <div style={{ fontSize: 12, color: "var(--dim)", marginTop: 3 }}>{partner.kind} · {partner.location}</div>
            </div>
            <Badge>{partner.status}</Badge>
          </div>
        )}
        <Note>Fictional demo partner. No partnership has been signed, and course details are illustrative.</Note>
        {rec && <Note tone="accent" icon="sparkle"><b style={{ fontWeight: 600 }}>Why it is recommended for you.</b> {rec.reason}.</Note>}

        <KV cols={2} items={[
          { k: "Duration", v: course.duration },
          { k: "Level", v: course.level },
          { k: "Format", v: course.format },
          { k: "Starts", v: course.starts },
          { k: "Credential", v: course.credential },
          { k: "Rating", v: <span className="rc-row" style={{ gap: 5 }}><Icon name="star" size={12} style={{ color: "#f0a33e" }} />{course.rating.toFixed(1)} from {num(course.enrolled)} learners</span> },
        ]} />

        <div>
          <Label>Indicative cost</Label>
          <div className="rc-grid rc-g3" style={{ gap: 10, marginTop: 9 }}>
            <PriceCell label="List price" value={eur(course.price)} />
            <PriceCell label="Member discount" value={Math.round(course.memberDiscount * 100) + "%"} sub={"You save " + eur(course.price - mp)} />
            <PriceCell label="Member price" value={eur(mp)} strong />
          </div>
          <div style={{ fontSize: 11.5, color: "var(--faint)", marginTop: 8 }}>Indicative pricing from a fictional partner. No payment is taken in this demo.</div>
        </div>

        <div style={{ padding: 16, borderRadius: "var(--r-md, 16px)", background: "var(--surface-2)", border: "1px solid var(--border)" }}>
          <div className="rc-row">
            <Label>Illustrative opportunity impact</Label>
            <span className="rc-grow" />
            <DemoTag />
          </div>
          <div style={{ fontSize: 26, fontWeight: 600, letterSpacing: "-1px", marginTop: 8 }}>{impactText(course.impact)}</div>
          <div style={{ fontSize: 12.5, color: "var(--dim)", marginTop: 4, lineHeight: 1.5 }}>
            In selected relevant roles, for professionals with a comparable profile. An estimate, not a guaranteed outcome.
          </div>
          {c && (
            <>
              {sc && (
                <div style={{ fontSize: 12.5, color: "var(--body)", marginTop: 10, lineHeight: 1.5 }}>
                  Across your whole market the illustrative effect is smaller: {impactText([sc.low, sc.high])}, with {sc.roles} more matching roles.
                </div>
              )}
              <RangeBar min={lo} max={hi} band={c.marketRange} scenario={[c.marketRange[0] + effect[0], c.marketRange[1] + effect[1]]}
                marker={c.salaryCurrent} markerLabel="You" format={eurK} />
              <div style={{ fontSize: 11.5, color: "var(--faint)" }}>Solid band: your estimated range today. Dashed: with this credential, illustrative.</div>
            </>
          )}
        </div>

        <div>
          <Label>Modules</Label>
          <div className="rc-col" style={{ gap: 8, marginTop: 10 }}>
            {course.modules.map((m, i) => (
              <div key={m} className="rc-row" style={{ gap: 10, alignItems: "flex-start" }}>
                <span style={{ width: 22, height: 22, flex: "none", borderRadius: 8, background: "var(--surface-2)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10.5, fontWeight: 600, color: "var(--dim)" }}>{i + 1}</span>
                <span style={{ fontSize: 13, color: "var(--body)", lineHeight: 1.5, paddingTop: 2 }}>{m}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rc-grid rc-g2" style={{ gap: 16 }}>
          <div>
            <Label>Skills gained</Label>
            <div className="rc-row rc-wrap" style={{ gap: 6, marginTop: 10 }}>
              {course.skills.map(k => <Chip key={k}>{k}</Chip>)}
            </div>
          </div>
          <div>
            <Label>Roles where it is relevant</Label>
            <div className="rc-row rc-wrap" style={{ gap: 6, marginTop: 10 }}>
              {course.roles.map(r => <Chip key={r}><Icon name="jobs" size={11} />{r}</Chip>)}
            </div>
            {c && <button className="rc-link" style={{ fontSize: 12.5, marginTop: 10 }} onClick={() => { onClose(); nav.go("cand.jobs", "recommended"); }}>See matching open roles</button>}
          </div>
        </div>

        {c && enrolment && (
          <div>
            <Label>Your progress</Label>
            <Progress value={enrolment.progress} style={{ marginTop: 10 }} />
            <div style={{ fontSize: 12, color: "var(--dim)", marginTop: 6 }}>
              {enrolment.progress > 0 ? enrolment.progress + "% complete, " + enrolment.status : "Enrolled " + (enrolment.date === "Today" ? "today" : enrolment.date) + ". Your place is held. Starts: " + course.starts + "."}
            </div>
          </div>
        )}

        {!c && (
          <div>
            <Label>Enrolments through Recruit</Label>
            <KV cols={3} items={[
              { k: "To date", v: num(course.enrolled + liveToday) },
              { k: "Today", v: num(liveToday) },
              { k: "Partner share", v: partner ? Math.round(partner.revenueShare * 100) + "% (concept)" : "None" },
            ]} />
            {records.length > 0 && (
              <div style={{ marginTop: 12 }}>
                {records.map((e, i) => {
                  const who = CANDIDATE_BY_ID[e.candidateId];
                  return (
                    <div key={e.id} className="rc-row" style={{ gap: 10, padding: "9px 0", borderTop: i ? "1px solid var(--border)" : 0 }}>
                      <Avatar initials={who?.initials || "?"} tint={who?.tint} size={26} />
                      <span className="rc-grow rc-ellipsis" style={{ fontSize: 12.5 }}>{who?.name || "A member"}</span>
                      <span style={{ fontSize: 11.5, color: "var(--dim)" }}>{e.status}</span>
                      <span style={{ width: 70 }}><Progress value={e.progress} height={4} /></span>
                      <span style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--faint)", width: 44, textAlign: "right" }}>{e.date}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </Drawer>
  );
}

function PriceCell({ label, value, sub, strong }: { label: string; value: string; sub?: string; strong?: boolean }) {
  return (
    <div style={{ padding: "11px 13px", borderRadius: "var(--r-sm, 12px)", background: strong ? "var(--accent-soft)" : "var(--surface-2)", border: "1px solid " + (strong ? "var(--accent-line)" : "var(--border)") }}>
      <div style={{ fontSize: 11, color: "var(--dim)" }}>{label}</div>
      <div style={{ fontSize: 17, fontWeight: 600, letterSpacing: "-.4px", marginTop: 4, color: "var(--ink)" }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: "var(--faint)", marginTop: 2 }}>{sub}</div>}
    </div>
  );
}
