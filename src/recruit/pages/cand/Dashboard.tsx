import { useMemo } from "react";
import { Avatar, Badge, Button, Card, DemoTag, Grid, Label, ListRow, Note, Page, Progress } from "../../ui";
import { Gauge, LineChart, RangeBar } from "../../charts";
import { Icon } from "../../icons";
import { useNav } from "../../nav";
import { openDrawer, respondIntroduction, useRecruit, vacancyById } from "../../store";
import { candidate, relevantRoles } from "../../selectors";
import { COURSES, EMPLOYER_BY_ID, EMPLOYER_INTEREST, PARTNER_BY_ID, SALARY_HISTORY, CAREER_PATHS } from "../../data";
import { eur, eurK, num } from "../../format";
import { alignmentTone } from "../../match";

/* Candidate home. The first screen a professional sees: what they are worth,
   what is moving, and the next good step. */

const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
};

export default function CandidateDashboard() {
  const s = useRecruit();
  const nav = useNav();
  const c = candidate(s, s.persona);
  const first = c.name.split(" ")[0];
  const roles = useMemo(() => relevantRoles(s, c.id), [s, c.id]);
  const courses = COURSES.filter(x => x.recommendedFor.includes(c.id)).slice(0, 3);
  const history = SALARY_HISTORY[c.id] || [];
  const interest = EMPLOYER_INTEREST[c.id] || [];
  const intros = s.intros.filter(i => i.candidateId === c.id && i.status === "pending");
  const verifiedSkills = c.skills.filter(x => x.verification === "verified").length;
  const pendingItems = c.skills.filter(x => x.verification === "pending").length + c.qualifications.filter(q => q.verification === "pending").length;
  const topPath = (CAREER_PATHS[c.id] || [])[0];
  const opportunities = c.id === "c-aoife" ? 12 : roles.length;
  const devRecs = c.id === "c-aoife" ? 3 : courses.length;
  const lo = Math.floor((Math.min(c.salaryCurrent, c.marketRange[0]) * 0.8) / 5000) * 5000;
  const hi = Math.ceil((c.marketRange[1] * 1.15) / 5000) * 5000;
  const gap = c.marketRange[0] - c.salaryCurrent;

  return (
    <Page wide eyebrow="MY DASHBOARD"
      title={<>{greeting()}, {first}.</>}
      sub={gap > 0 ? "Your professional value is growing. Your experience points to " + eurK(c.marketRange[0]) + " to " + eurK(c.marketRange[1]) + " in today's market." : "Your professional value is growing. Your evidence supports your current range."}
      actions={<>
        <Button icon="upload" onClick={() => nav.go("cand.profile", "cv")}>Update CV</Button>
        <Button variant="primary" icon="value" onClick={() => nav.go("cand.value", "value")}>See my market value</Button>
      </>}>

      {/* Hero band: index, value and the four numbers that matter */}
      <Grid cols="rc-g-3-2">
        <Card pad={24} style={{ background: "linear-gradient(140deg, color-mix(in oklab, #4263EB 16%, var(--surface)) 0%, var(--surface) 55%)" }}>
          <div className="rc-row rc-wrap" style={{ gap: 26, alignItems: "center" }}>
            <Gauge value={c.recruitIndex} label="Recruit Index out of 1,000" sub={<Badge tone="teal" icon="trendUp">{c.verifiedCredentials} verified credentials</Badge>} size={230} />
            <div className="rc-grow" style={{ minWidth: 240 }}>
              <Label>Market value</Label>
              <div className="rc-row" style={{ alignItems: "baseline", gap: 10, marginTop: 8 }}>
                <span style={{ fontSize: 34, fontWeight: 600, letterSpacing: "-1.4px" }}>{eurK(c.marketRange[0])} to {eurK(c.marketRange[1])}</span>
                <DemoTag />
              </div>
              <div style={{ fontSize: 13, color: "var(--dim)", marginTop: 6 }}>Estimated market range against a current salary of {eur(c.salaryCurrent)}.</div>
              <RangeBar min={lo} max={hi} band={c.marketRange} marker={c.salaryCurrent} markerLabel="You" format={eurK} />
              <div className="rc-grid rc-g3" style={{ gap: 10, marginTop: 18 }}>
                <MiniStat icon="jobs" label="Relevant roles" value={String(opportunities)} onClick={() => nav.go("cand.jobs", "recommended")} />
                <MiniStat icon="learning" label="Development picks" value={String(devRecs)} onClick={() => nav.go("cand.learning", "courses")} />
                <MiniStat icon="verified" label="Profile complete" value={c.completeness + "%"} onClick={() => nav.go("cand.profile", "verification")} />
              </div>
            </div>
          </div>
        </Card>

        <Card title="Career intelligence briefing" sub="Prepared this morning by Recruit's agents from your profile and the live marketplace"
          action={<Badge tone="accent" icon="sparkle">Demo briefing</Badge>}>
          <div className="rc-col" style={{ gap: 12 }}>
            {gap > 0 && <BriefLine icon="value" tone="var(--teal, var(--ok))" text={"Your estimated range sits " + eurK(gap) + " to " + eurK(c.marketRange[1] - c.salaryCurrent) + " above your current salary. Experience and verified results carry most of that."} />}
            {roles[0] && <BriefLine icon="jobs" tone="var(--accent)" text={roles[0].v.title + " at " + (EMPLOYER_BY_ID[roles[0].v.employerId]?.short || "") + " is your strongest match at " + roles[0].m.score + "%."} />}
            {courses[0] && <BriefLine icon="learning" tone="#f0a33e" text={courses[0].title + " is the qualification most linked to higher-paid roles for profiles like yours."} />}
            {topPath && topPath.adjacent && <BriefLine icon="explorer" tone="#c8b4f0" text={"Your skills also travel: " + topPath.title + " (" + topPath.alignment + "% alignment)."} />}
            {pendingItems > 0 && <BriefLine icon="clock" tone="var(--warn)" text={pendingItems + " item" + (pendingItems > 1 ? "s are" : " is") + " waiting on verification. Verified evidence lifts your index."} />}
          </div>
          <Note style={{ marginTop: 14 }}>Estimates are decision support from illustrative demo benchmarks, not guarantees. Employers make hiring decisions.</Note>
        </Card>
      </Grid>

      {intros.length > 0 && (
        <Card tone="accent" title="Introduction requests" sub="Employers can't see your contact details until you agree.">
          {intros.map(i => {
            const v = vacancyById(i.vacancyId, s);
            const emp = v ? EMPLOYER_BY_ID[v.employerId] : null;
            return (
              <div key={i.id} className="rc-row rc-wrap" style={{ gap: 12, padding: "10px 0", borderTop: "1px solid var(--border)" }}>
                <Avatar initials={emp?.initials || "?"} tint={emp?.tint} size={34} square />
                <div className="rc-grow">
                  <div style={{ fontSize: 13.5, fontWeight: 500 }}>{emp?.name} would like an introduction</div>
                  <div style={{ fontSize: 12, color: "var(--dim)", marginTop: 2 }}>{v?.title} · {v ? eurK(v.salary[0]) + "-" + eurK(v.salary[1]).slice(1) : ""} · {v?.location}</div>
                </div>
                <Button size="sm" onClick={() => openDrawer("vacancy", i.vacancyId)}>View role</Button>
                <Button size="sm" variant="ghost" onClick={() => respondIntroduction(i.id, "declined")}>Decline</Button>
                <Button size="sm" variant="primary" icon="check" onClick={() => respondIntroduction(i.id, "accepted")}>Share my details</Button>
              </div>
            );
          })}
        </Card>
      )}

      <Grid cols="rc-g-2-1">
        <Card title="Career progression" sub="Your salary against the market benchmark for your experience level"
          action={<DemoTag />}>
          <LineChart height={230} labels={history.map(h => h.year)} yFormat={v => eurK(v)}
            series={[
              { name: "Your salary", values: history.map(h => h.salary), color: "var(--accent)", area: true },
              { name: "Market benchmark", values: history.map(h => h.market), color: "var(--teal, #16B8A6)", dashed: true },
            ]} />
        </Card>
        <Card title="Profile verification" sub={verifiedSkills + " of " + c.skills.length + " skills verified"}
          action={<Button size="sm" variant="ghost" iconRight="arrowRight" onClick={() => nav.go("cand.profile", "verification")}>Manage</Button>}>
          <div className="rc-row" style={{ alignItems: "baseline", gap: 8 }}>
            <span style={{ fontSize: 30, fontWeight: 600, letterSpacing: "-1px" }}>{c.completeness}%</span>
            <span style={{ fontSize: 12.5, color: "var(--dim)" }}>profile evidence</span>
          </div>
          <Progress value={c.completeness} style={{ marginTop: 10 }} />
          <div className="rc-col" style={{ gap: 9, marginTop: 16 }}>
            {[["Verified", c.skills.filter(x => x.verification === "verified").length + c.qualifications.filter(q => q.verification === "verified").length, "var(--teal, var(--ok))"],
              ["Self-reported", c.skills.filter(x => x.verification === "self").length + c.qualifications.filter(q => q.verification === "self").length, "var(--dim)"],
              ["Pending", pendingItems, "var(--warn)"]].map(([label, n, color]) => (
              <div key={label as string} className="rc-row" style={{ fontSize: 12.5 }}>
                <span style={{ width: 8, height: 8, borderRadius: 3, background: color as string }} />
                <span className="rc-grow" style={{ color: "var(--body)" }}>{label}</span>
                <b style={{ fontWeight: 600 }}>{n}</b>
              </div>
            ))}
          </div>
        </Card>
      </Grid>

      <Grid cols="rc-g3">
        <Card title="Recommended for you" sub={opportunities + " relevant opportunities"} action={<Button size="sm" variant="ghost" iconRight="arrowRight" onClick={() => nav.go("cand.jobs", "recommended")}>All</Button>}>
          {roles.slice(0, 4).map(({ v, m }) => (
            <ListRow key={v.id} onClick={() => openDrawer("vacancy", v.id)}
              title={<span className="rc-row" style={{ gap: 8 }}><span className="rc-ellipsis">{v.title}</span></span>}
              sub={(EMPLOYER_BY_ID[v.employerId]?.short || "") + " · " + eurK(v.salary[0]) + "-" + eurK(v.salary[1]).slice(1)}
              right={<Badge tone={alignmentTone(m.score)}>{m.score}%</Badge>} />
          ))}
        </Card>
        <Card title="Recommended courses" sub="From education partners (fictional, illustrative)" action={<Button size="sm" variant="ghost" iconRight="arrowRight" onClick={() => nav.go("cand.learning", "courses")}>All</Button>}>
          {courses.map(x => {
            const enrolled = s.enrolments.some(e => e.candidateId === c.id && e.courseId === x.id);
            return (
              <ListRow key={x.id} onClick={() => openDrawer("course", x.id)} title={x.title}
                sub={(PARTNER_BY_ID[x.partnerId]?.short || "") + " · " + x.duration}
                right={enrolled ? <Badge tone="teal" icon="check">Enrolled</Badge> : <Badge tone="warn">+{eurK(x.impact[0])}-{eurK(x.impact[1]).slice(1)}</Badge>} />
            );
          })}
          {!courses.length && <div style={{ fontSize: 12.5, color: "var(--dim)" }}>No course picks yet.</div>}
        </Card>
        <Card title="Recent employer interest" sub="Who looked, and why">
          {interest.map((it, i) => {
            const emp = EMPLOYER_BY_ID[it.employerId];
            return (
              <div key={i} className="rc-row" style={{ alignItems: "flex-start", gap: 11, padding: "9px 0", borderTop: i ? "1px solid var(--border)" : 0 }}>
                <Avatar initials={emp?.initials || "?"} tint={emp?.tint} size={28} square />
                <div className="rc-grow" style={{ fontSize: 12.5, lineHeight: 1.45 }}>
                  <span style={{ color: "var(--ink)", fontWeight: 500 }}>{emp?.short}</span> <span style={{ color: "var(--dim)" }}>{it.text}</span>
                </div>
                <span style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--faint)", whiteSpace: "nowrap" }}>{it.when}</span>
              </div>
            );
          })}
        </Card>
      </Grid>

      <div style={{ fontSize: 11.5, color: "var(--faint)", padding: "4px 4px 0" }}>
        Recruit Index {num(c.recruitIndex)} reflects professional evidence and profile completeness only. It is not a credit score, a judgement of personal worth or a hiring decision.
      </div>
    </Page>
  );
}

function MiniStat({ icon, label, value, onClick }: { icon: string; label: string; value: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="rc-card rc-click rc-focus"
      style={{ textAlign: "left", padding: "11px 12px", borderRadius: 14, background: "var(--surface-2)", border: "1px solid var(--border)", cursor: "pointer", color: "inherit" }}>
      <div className="rc-row" style={{ gap: 6, color: "var(--dim)", fontSize: 11.5 }}><Icon name={icon} size={13} />{label}</div>
      <div style={{ fontSize: 20, fontWeight: 600, letterSpacing: "-.6px", marginTop: 6 }}>{value}</div>
    </button>
  );
}

function BriefLine({ icon, text, tone }: { icon: string; text: string; tone: string }) {
  return (
    <div className="rc-row" style={{ alignItems: "flex-start", gap: 11 }}>
      <span style={{ width: 26, height: 26, flex: "none", borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", background: "var(--surface-2)", color: tone }}><Icon name={icon} size={13} /></span>
      <div style={{ fontSize: 13, lineHeight: 1.55, color: "var(--body)", paddingTop: 3 }}>{text}</div>
    </div>
  );
}
