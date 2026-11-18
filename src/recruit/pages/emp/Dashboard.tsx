import { useMemo, useState, type ReactNode } from "react";
import { Badge, Button, Card, DemoTag, Empty, Grid, Label, Note, Page, Select } from "../../ui";
import { BarList, Funnel } from "../../charts";
import { Icon } from "../../icons";
import { useNav } from "../../nav";
import { openDrawer, setActiveVacancy, useRecruit, vacancyById, type RecruitState } from "../../store";
import { candidate, employerStats, employerVacancies } from "../../selectors";
import { APPLICATIONS, EMPLOYER_BY_ID, MARKET, TIERS, type Offer, type Stage } from "../../data";
import { eur, num, plural } from "../../format";
import { ActivityItem, PersonAvatar, PipelineBar, employerEvents, identity, kRange, lowerWhen, roleName, stageCounts, stageRank } from "../../shared/talentKit";

/* The employer's home: where hiring stands, what it costs against an agency,
   and the few things that need Rachel today. Every figure is derived from
   the shared store, so actions anywhere in the demo move these numbers. */

const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
};

export default function EmployerDashboard() {
  const s = useRecruit();
  const nav = useNav();
  const employerId = s.employerId;
  const emp = EMPLOYER_BY_ID[employerId];
  const st = useMemo(() => employerStats(s, employerId), [s, employerId]);
  const vacs = employerVacancies(s, employerId);
  const open = vacs.filter(v => v.status === "open");
  const [role, setRole] = useState("all");

  /* Funnel for all open roles or one of them. Each stage counts people at that stage or beyond. */
  const roleVacs = role === "all" ? open : open.filter(v => v.id === role);
  const entries = s.pipeline.filter(p => roleVacs.some(v => v.id === p.vacancyId));
  const atLeast = (stage: Stage) => entries.filter(p => stageRank(p.stage) >= stageRank(stage)).length;
  const funnelAll = [
    { label: "Potentially relevant", value: roleVacs.reduce((t, v) => t + v.marketMatches, 0), note: "Simulated marketplace" },
    { label: "In your pipeline", value: entries.length, note: "Identified or later" },
    { label: "Shortlisted", value: atLeast("shortlisted"), note: "Shortlisted or later" },
    { label: "Contact requested", value: atLeast("contact"), note: "Waiting on or given consent" },
    { label: "Interviewing", value: atLeast("interview"), note: "Interview or later" },
    { label: "Offer", value: atLeast("offer"), note: "Offer drafted or sent" },
  ];
  const firstZero = funnelAll.findIndex(x => x.value === 0);
  const funnel = firstZero === -1 ? funnelAll : funnelAll.slice(0, firstZero + 1);

  /* Membership economics: this year's placements plus any made live in the demo. */
  const paidMembership = TIERS.find(t => t.id === emp?.tier)?.price ?? 0;
  const priorFees = (emp?.spendYtd ?? 0) - paidMembership;
  const priorSalaries = priorFees / MARKET.recruitDefaultRate;
  const live = s.placements.filter(p => p.employerId === employerId);
  const placements = (emp?.placementsYtd ?? 0) + live.length;
  const salaries = priorSalaries + live.reduce((t, p) => t + p.salary, 0);
  const fees = priorFees + live.reduce((t, p) => t + p.salary * p.feeRate, 0);
  const spend = fees + paidMembership;
  const agency = salaries * MARKET.agencyBenchmarkRate;
  const saving = agency - spend;

  const interviews = s.interviews.filter(i => i.status === "scheduled" && vacs.some(v => v.id === i.vacancyId));
  const sent = st.offers.filter(o => o.status === "sent").length;
  const awaiting = st.offers.filter(o => o.status === "awaiting approval").length;
  const ages = open.map(v => v.postedDays);
  const avgAge = ages.length ? Math.round(ages.reduce((t, x) => t + x, 0) / ages.length) : 0;
  const oldest = open.slice().sort((a, b) => b.postedDays - a.postedDays)[0];
  const newest = open.slice().sort((a, b) => a.postedDays - b.postedDays)[0];
  const events = employerEvents(s, employerId).slice(0, 5);
  const attention = attentionItems(s, employerId);

  const findTalent = (vacancyId?: string) => { if (vacancyId) setActiveVacancy(vacancyId); nav.go("emp.talent", "discover"); };

  return (
    <Page wide eyebrow={(emp?.name || "Employer").toUpperCase()}
      title="Your next great hire may already be here."
      sub={<>{greeting()}, Rachel. {plural(st.open, "role")} open, {num(st.matched)} potentially relevant professionals across them in the simulated marketplace, and {plural(st.offers.length, "offer")} in progress.</>}
      actions={<>
        <Button icon="plus" onClick={() => nav.go("emp.vacancies", "create")}>Create vacancy</Button>
        <Button variant="primary" size="lg" icon="search" onClick={() => findTalent()}>Find talent</Button>
      </>}>

      {/* Executive ledger */}
      <Card pad={0} style={{ overflow: "hidden", background: "linear-gradient(120deg, color-mix(in oklab, #4263EB 13%, var(--surface)) 0%, var(--surface) 55%)" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(165px, 1fr))", marginLeft: -1 }}>
          <Kpi icon="vacancies" label="Open positions" value={num(st.open)} sub={newest ? "Newest: " + newest.title + ", " + newest.postedDays + " days" : "No open roles"} onClick={() => nav.go("emp.vacancies", "active")} />
          <Kpi icon="users" label="Matched professionals" value={num(st.matched)} sub="Potentially relevant, simulated" onClick={() => findTalent()} accent />
          <Kpi icon="check" label="Shortlisted" value={num(st.shortlisted)} sub={plural(st.contact, "introduction") + " requested"} onClick={() => nav.go("emp.hiring", "shortlists")} />
          <Kpi icon="calendar" label="Interview pipeline" value={num(st.interview)} sub={plural(interviews.length, "interview") + " booked"} onClick={() => nav.go("emp.hiring", "interviews")} />
          <Kpi icon="offers" label="Offers in progress" value={num(st.offers.length)} sub={sent + " sent, " + awaiting + " awaiting approval"} onClick={() => nav.go("emp.hiring", "offers")} />
          <Kpi icon="clock" label="Average vacancy age" value={avgAge + " days"} sub={oldest ? "Oldest: " + oldest.title + ", " + oldest.postedDays + " days" : ""} onClick={() => nav.go("emp.vacancies", "active")} />
        </div>
      </Card>

      <Grid cols="rc-g-3-2">
        <Card title="Hiring funnel" sub="People at each stage or beyond, for your open roles"
          action={<Select value={role} onChange={setRole} style={{ height: 32, fontSize: 12.5, width: "auto", maxWidth: 230 }}
            options={[{ value: "all", label: "All open roles" }].concat(open.map(v => ({ value: v.id, label: roleName(v) })))} />}>
          {roleVacs.length ? (
            <>
              <Funnel stages={funnel} format={v => num(v)} />
              <div className="rc-row rc-wrap" style={{ gap: 10, marginTop: 14, fontSize: 11.5, color: "var(--faint)" }}>
                <span>The first stage is an aggregate of the simulated marketplace; the rest are people in your pipelines.</span>
                {firstZero !== -1 && <span>No one at later stages yet.</span>}
              </div>
            </>
          ) : <Empty icon="vacancies" title="No open roles" body="Open a vacancy to start a pipeline." action={<Button variant="primary" icon="plus" onClick={() => nav.go("emp.vacancies", "create")}>Create vacancy</Button>} />}
        </Card>

        <Card title="Recruitment economics" sub={"This year: " + plural(placements, "placement") + ", " + eur(salaries) + " in combined salaries"} action={<DemoTag>Estimate</DemoTag>}>
          <div className="rc-row" style={{ alignItems: "baseline", gap: 10 }}>
            <span style={{ fontSize: 34, fontWeight: 600, letterSpacing: "-1.4px", color: "var(--teal, var(--ok))", fontVariantNumeric: "tabular-nums" }}>{eur(saving)}</span>
            <span style={{ fontSize: 12.5, color: "var(--dim)" }}>estimated saving after membership</span>
          </div>
          <div style={{ marginTop: 18 }}>
            <BarList format={x => eur(x)} max={agency}
              items={[
                { label: "Typical agency fee at " + Math.round(MARKET.agencyBenchmarkRate * 100) + "%", value: agency, color: "var(--faint)" },
                { label: "Recruit: " + Math.round(MARKET.recruitDefaultRate * 100) + "% success fees plus membership", value: spend, color: "var(--accent)" },
              ]} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(118px, 1fr))", gap: 10, marginTop: 18 }}>
            <Mini label="Success fees" value={eur(fees)} />
            <Mini label="Membership" value={eur(paidMembership)} />
            <Mini label="Estimated spend" value={eur(spend)} />
          </div>
          <div className="rc-row" style={{ gap: 10, marginTop: 14 }}>
            <span style={{ fontSize: 11.5, color: "var(--faint)", flex: 1, lineHeight: 1.5 }}>Estimates from Harbourview's placements this year. Agency comparison uses a {Math.round(MARKET.agencyBenchmarkRate * 100)}% fee on the same salaries.</span>
            <Button size="sm" variant="ghost" iconRight="arrowRight" onClick={() => nav.go("emp.costs", "calculator")}>Calculator</Button>
          </div>
        </Card>
      </Grid>

      <Grid cols="rc-g-2-1">
        <Card title="Open roles" sub="Age, pipeline and market depth for each role"
          action={<Button size="sm" variant="ghost" iconRight="arrowRight" onClick={() => nav.go("emp.vacancies", "active")}>All roles</Button>}>
          {open.map((v, i) => {
            const counts = stageCounts(s, v.id);
            const inPipe = Object.values(counts).reduce((t, x) => t + x, 0);
            return (
              <div key={v.id} style={{ padding: "14px 0", borderTop: i ? "1px solid var(--border)" : 0 }}>
                <div className="rc-row rc-wrap" style={{ gap: 10 }}>
                  <button className="rc-link" onClick={() => openDrawer("vacancy", v.id)} style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)", textAlign: "left" }}>{v.title}</button>
                  {v.created && <Badge tone="accent">New</Badge>}
                  <span style={{ fontSize: 12, color: "var(--dim)" }}>{kRange(v.salary)}, {v.location}</span>
                  <span style={{ marginLeft: "auto", fontFamily: "var(--mono)", fontSize: 10.5, color: "var(--faint)" }}>{v.postedDays === 0 ? "Posted today" : "Posted " + v.postedDays + (v.postedDays === 1 ? " day" : " days") + " ago"}</span>
                </div>
                <div className="rc-row rc-wrap" style={{ gap: 18, marginTop: 10, alignItems: "center" }}>
                  <div style={{ flex: "1 1 260px", minWidth: 0 }}><PipelineBar counts={counts} legend /></div>
                  <div className="rc-row" style={{ gap: 18 }}>
                    <Num label="Pipeline" value={inPipe} />
                    <Num label="Applicants" value={v.applicants} />
                    <Num label="In market" value={v.marketMatches} />
                  </div>
                  <Button size="sm" icon="search" onClick={() => findTalent(v.id)}>Find talent</Button>
                </div>
              </div>
            );
          })}
          {!open.length && <Empty icon="vacancies" title="No open roles" body="Paused and filled roles are under Vacancies." />}
        </Card>

        <Card title="Needs your attention" sub="Decisions and replies waiting on your team">
          {attention.length ? attention.map((a, i) => (
            <div key={i} className="rc-row" style={{ alignItems: "flex-start", gap: 11, padding: "11px 0", borderTop: i ? "1px solid var(--border)" : 0 }}>
              <span style={{ width: 28, height: 28, flex: "none", borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", background: "var(--surface-2)", color: a.color }}><Icon name={a.icon} size={13} /></span>
              <div className="rc-grow">
                <div style={{ fontSize: 13, color: "var(--ink)", lineHeight: 1.45 }}>{a.title}</div>
                <div style={{ fontSize: 12, color: "var(--dim)", marginTop: 2, lineHeight: 1.45 }}>{a.sub}</div>
              </div>
              <Button size="sm" variant="ghost" onClick={a.go}>{a.cta}</Button>
            </div>
          )) : <Empty icon="check" title="Nothing waiting on you" body="Offers, introductions and new applications that need a decision appear here." />}
        </Card>
      </Grid>

      <Grid cols="" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 300px), 1fr))" }}>
        <Card title="Offers in progress" sub={st.offers.length ? "Drafts stay invisible to candidates until sent" : undefined}
          action={<Button size="sm" variant="ghost" iconRight="arrowRight" onClick={() => nav.go("emp.hiring", "offers")}>Offers</Button>}>
          {st.offers.map((o, i) => <OfferRow key={o.id} s={s} o={o} employerId={employerId} first={i === 0} />)}
          {!st.offers.length && <Empty icon="offers" title="No offers in progress" body="Offers you draft from a shortlist show here with their approval status." />}
        </Card>

        <Card title="Upcoming interviews" action={<Button size="sm" variant="ghost" iconRight="arrowRight" onClick={() => nav.go("emp.hiring", "interviews")}>Interviews</Button>}>
          {interviews.map((iv, i) => {
            const c = candidate(s, iv.candidateId);
            const who = identity(s, employerId, c);
            const v = vacancyById(iv.vacancyId, s);
            const [day, time] = iv.when.split(", ");
            const parts = day.split(" ");
            return (
              <div key={iv.id} className="rc-row rc-rowhover" onClick={() => openDrawer("candidate", c.id, { vacancyId: iv.vacancyId })}
                style={{ gap: 12, padding: "10px 8px", margin: "0 -8px", borderRadius: 10, borderTop: i ? "1px solid var(--border)" : 0 }}>
                <div style={{ width: 48, flex: "none", textAlign: "center", padding: "6px 0", borderRadius: 11, background: "var(--surface-2)", border: "1px solid var(--border)" }}>
                  <div style={{ fontFamily: "var(--mono)", fontSize: 9, letterSpacing: ".1em", color: "var(--faint)", textTransform: "uppercase" }}>{parts.length === 3 ? parts[2] : "Date"}</div>
                  <div style={{ fontSize: parts.length === 3 ? 17 : 11, fontWeight: 600, lineHeight: 1.1, marginTop: 2 }}>{parts.length === 3 ? parts[1] : day}</div>
                </div>
                <div className="rc-grow">
                  <div className="rc-ellipsis" style={{ fontSize: 13, color: "var(--ink)" }}>{who.name}</div>
                  <div className="rc-ellipsis" style={{ fontSize: 12, color: "var(--dim)", marginTop: 2 }}>{v?.title}, round {iv.round}. {iv.format}, {parts.length === 3 ? parts[0] : ""}{time ? " " + time : ""}</div>
                  <div className="rc-ellipsis" style={{ fontSize: 11, color: "var(--faint)", marginTop: 2 }}>Panel: {iv.panel.join(", ")}</div>
                </div>
              </div>
            );
          })}
          {!interviews.length && <Empty icon="calendar" title="No interviews booked" body="Book interviews from a shortlist and they appear here." />}
        </Card>

        <Card title="Recent hiring activity" action={<Button size="sm" variant="ghost" iconRight="arrowRight" onClick={() => nav.go("emp.overview", "activity")}>All activity</Button>}>
          {events.map((e, i) => <ActivityItem key={e.id} s={s} employerId={employerId} e={e} compact first={i === 0} />)}
          {!events.length && <Empty icon="activity" title="No activity yet" />}
        </Card>
      </Grid>

      <Note icon="info">
        Matched professionals, savings and salaries are illustrative estimates from the simulated marketplace, not guarantees. Alignment scores are decision support: your team makes every hiring decision.
      </Note>
    </Page>
  );
}

/* ── pieces ─────────────────────────────────────────────────────────────── */

function Kpi({ icon, label, value, sub, onClick, accent }: { icon: string; label: string; value: ReactNode; sub: ReactNode; onClick: () => void; accent?: boolean }) {
  return (
    <button onClick={onClick} className="rc-rowhover rc-focus"
      style={{ textAlign: "left", padding: "18px 20px 18px", border: 0, borderLeft: "1px solid var(--border)", background: "none", color: "inherit", cursor: "pointer", minWidth: 0 }}>
      <div className="rc-row" style={{ gap: 7, fontSize: 12, color: "var(--dim)" }}>
        <span style={{ color: accent ? "var(--accent)" : "var(--faint)", display: "flex" }}><Icon name={icon} size={13} /></span>{label}
      </div>
      <div style={{ fontSize: 30, fontWeight: 600, letterSpacing: "-1.2px", marginTop: 10, lineHeight: 1, color: accent ? "var(--accent)" : "var(--ink)", fontVariantNumeric: "tabular-nums" }}>{value}</div>
      <div className="rc-ellipsis" style={{ fontSize: 11.5, color: "var(--faint)", marginTop: 8 }}>{sub}</div>
    </button>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ padding: "10px 12px", borderRadius: "var(--r-sm, 12px)", background: "var(--surface-2)", border: "1px solid var(--border)", minWidth: 0 }}>
      <Label style={{ fontSize: 8.5 }}>{label}</Label>
      <div style={{ fontSize: 14, fontWeight: 600, marginTop: 5, fontVariantNumeric: "tabular-nums" }}>{value}</div>
    </div>
  );
}

function Num({ label, value }: { label: string; value: number }) {
  return (
    <div style={{ textAlign: "right" }}>
      <div style={{ fontSize: 16, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{num(value)}</div>
      <div style={{ fontSize: 10.5, color: "var(--faint)", marginTop: 1 }}>{label}</div>
    </div>
  );
}

function OfferRow({ s, o, employerId, first }: { s: RecruitState; o: Offer; employerId: string; first: boolean }) {
  const c = candidate(s, o.candidateId);
  const who = identity(s, employerId, c);
  const badge = o.status === "sent" ? <Badge tone="accent">Sent</Badge>
    : o.status === "awaiting approval" ? <Badge tone="warn" icon="clock">Approval</Badge>
    : o.status === "changes requested" ? <Badge tone="warn">Changes asked</Badge>
    : o.status === "approved" ? <Badge tone="teal">Approved</Badge>
    : <Badge tone="neutral">Draft</Badge>;
  return (
    <div className="rc-row rc-rowhover" onClick={() => openDrawer("offer", o.id)} style={{ gap: 11, padding: "10px 8px", margin: "0 -8px", borderRadius: 10, borderTop: first ? 0 : "1px solid var(--border)" }}>
      <PersonAvatar c={c} anon={who.anon} size={34} />
      <div className="rc-grow">
        <div className="rc-row" style={{ gap: 7 }}>
          <span className="rc-ellipsis" style={{ fontSize: 13, color: "var(--ink)" }}>{who.name}</span>
          {o.contingency && <span style={{ fontSize: 10.5, color: "var(--faint)" }}>Contingency</span>}
        </div>
        <div className="rc-ellipsis" style={{ fontSize: 12, color: "var(--dim)", marginTop: 2 }}>
          {o.title}, {eur(o.salary)}. {o.status === "sent" ? "Expires " + o.expires : o.status === "awaiting approval" ? "With " + (o.approver || "the approver") : "Start " + o.start}
        </div>
      </div>
      {badge}
    </div>
  );
}

interface Attention { icon: string; color: string; title: string; sub: string; cta: string; go: () => void }

/** Offers, consent and applications that are waiting on the employer, newest pressure first. */
function attentionItems(s: RecruitState, employerId: string): Attention[] {
  const out: Attention[] = [];
  const name = (id: string) => identity(s, employerId, candidate(s, id)).name;
  s.offers.filter(o => o.employerId === employerId).forEach(o => {
    if (o.status === "changes requested") out.push({ icon: "edit", color: "var(--warn)", title: name(o.candidateId) + " asked for changes to the " + o.title + " offer", sub: "Revise and resend from Offers", cta: "Open", go: () => openDrawer("offer", o.id) });
    if (o.status === "sent") out.push({ icon: "offers", color: "var(--accent)", title: name(o.candidateId) + " is considering your " + o.title + " offer", sub: eur(o.salary) + ". Expires " + o.expires + ".", cta: "Open", go: () => openDrawer("offer", o.id) });
    if (o.status === "awaiting approval") out.push({ icon: "clock", color: "var(--warn)", title: (o.contingency ? "Contingency offer for " : "Offer for ") + name(o.candidateId) + " awaits " + (o.approver || "approval"), sub: "Not visible to the candidate until it is sent", cta: "Review", go: () => openDrawer("offer", o.id) });
    if (o.status === "approved") out.push({ icon: "check", color: "var(--teal, var(--ok))", title: "Offer for " + name(o.candidateId) + " is approved", sub: "Ready to send when you are", cta: "Open", go: () => openDrawer("offer", o.id) });
  });
  s.intros.filter(i => i.status === "pending" && vacancyById(i.vacancyId, s)?.employerId === employerId).forEach(i => {
    out.push({ icon: "link", color: "var(--warn)", title: "Introduction to " + name(i.candidateId) + " awaiting consent", sub: (vacancyById(i.vacancyId, s)?.title || "") + ", requested " + lowerWhen(i.date), cta: "Profile", go: () => openDrawer("candidate", i.candidateId, { vacancyId: i.vacancyId }) });
  });
  const seeded = new Set(APPLICATIONS.map(a => a.id));
  s.applications.filter(a => a.status === "submitted" && vacancyById(a.vacancyId, s)?.employerId === employerId).forEach(a => {
    out.push({ icon: "file", color: "var(--accent)", title: name(a.candidateId) + " applied for " + (vacancyById(a.vacancyId, s)?.title || "a role"), sub: (seeded.has(a.id) ? "Applied " + a.date : "Applied today") + ". Not yet reviewed.", cta: "Review", go: () => openDrawer("candidate", a.candidateId, { vacancyId: a.vacancyId }) });
  });
  return out.slice(0, 6);
}
