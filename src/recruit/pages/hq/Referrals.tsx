import { useMemo } from "react";
import { Avatar, Badge, Button, Card, DemoTag, Grid, Label, Note, Page, Progress, Stat, Table, type Col } from "../../ui";
import { BarList, LineChart } from "../../charts";
import { Icon } from "../../icons";
import { useNav } from "../../nav";
import { openDrawer, setPersona, useRecruit } from "../../store";
import { CANDIDATE_BY_ID, COURSES, COURSE_BY_ID, MONTHS, PARTNERS, PARTNER_BY_ID, SCENARIO_CAPTION, SERIES, type Course, type Partner } from "../../data";
import { eur, eurK, num, pct } from "../../format";

/* HQ learning partners: referral activity and the commission it could earn.
   Commission and revenue-share figures are concept assumptions for fictional
   partners. Live demo enrolments (for example Aoife enrolling in the Wine &
   Beverage Leadership Diploma) are added on top of the simulated totals. */

const memberPrice = (c: Course) => c.price * (1 - c.memberDiscount);

interface PartnerRow { p: Partner; enrolments: number; live: number; conv: number; avgFee: number; commission: number; discounts: number }

export default function Referrals() {
  const s = useRecruit();
  const nav = useNav();

  const rows: PartnerRow[] = useMemo(() => {
    const live = s.enrolments.filter(e => e.date === "Today");
    return PARTNERS.map(p => {
      const courses = COURSES.filter(c => c.partnerId === p.id);
      const weight = courses.reduce((t, c) => t + c.enrolled, 0) || 1;
      const avgFee = courses.reduce((t, c) => t + memberPrice(c) * c.enrolled, 0) / weight;
      const avgDisc = courses.reduce((t, c) => t + c.price * c.memberDiscount * c.enrolled, 0) / weight;
      const here = live.map(e => COURSE_BY_ID[e.courseId]).filter((c): c is Course => !!c && c.partnerId === p.id);
      const liveFees = here.reduce((t, c) => t + memberPrice(c), 0);
      const liveDisc = here.reduce((t, c) => t + c.price * c.memberDiscount, 0);
      const enrolments = p.enrolments + here.length;
      return { p, enrolments, live: here.length, conv: enrolments / p.referrals, avgFee,
        commission: (p.enrolments * avgFee + liveFees) * p.revenueShare, discounts: p.enrolments * avgDisc + liveDisc };
    });
  }, [s.enrolments]);

  const referrals = rows.reduce((t, r) => t + r.p.referrals, 0);
  const enrolments = rows.reduce((t, r) => t + r.enrolments, 0);
  const live = rows.reduce((t, r) => t + r.live, 0);
  const commission = rows.reduce((t, r) => t + r.commission, 0);
  const discounts = rows.reduce((t, r) => t + r.discounts, 0);

  const enrolList = s.enrolments.slice().sort((a, b) => (a.date === "Today" ? 0 : 1) - (b.date === "Today" ? 0 : 1));
  const liveList = enrolList.filter(e => e.date === "Today");
  const perEnrolment = COURSES.map(c => ({ c, value: memberPrice(c) * (PARTNER_BY_ID[c.partnerId]?.revenueShare || 0) }))
    .sort((a, b) => b.value - a.value).slice(0, 6);
  const edu = SERIES.educationRevenue;
  const last = edu.length - 1;

  const cols: Col<PartnerRow>[] = [
    { key: "p", label: "Partner", width: "minmax(190px, 2fr)", render: r => (
      <span className="rc-row" style={{ gap: 10 }}>
        <Avatar initials={r.p.initials} tint={r.p.tint} size={28} square />
        <span className="rc-grow">
          <span className="rc-ellipsis" style={{ display: "block", fontSize: 13, fontWeight: 500, color: "var(--ink)" }}>{r.p.short}</span>
          <span className="rc-ellipsis" style={{ display: "block", fontSize: 11, color: "var(--faint)", marginTop: 2 }}>{r.p.status}</span>
        </span>
      </span>
    ) },
    { key: "ref", label: "Referrals", width: "88px", align: "right", render: r => num(r.p.referrals) },
    { key: "enr", label: "Enrolments", width: "112px", align: "right", render: r => (
      <span className="rc-row" style={{ justifyContent: "flex-end", gap: 6 }}>{r.live > 0 && <Badge tone="teal">+{r.live}</Badge>}{num(r.enrolments)}</span>
    ) },
    { key: "conv", label: "Conversion", width: "116px", render: r => (
      <div>
        <div style={{ fontSize: 12.5 }}>{pct(r.conv, 1)}</div>
        <Progress value={r.conv * 100} tone="teal" height={4} style={{ marginTop: 5 }} />
      </div>
    ) },
    { key: "fee", label: "Avg member fee", width: "112px", align: "right", render: r => eur(r.avgFee) },
    { key: "share", label: "Share", width: "64px", align: "right", render: r => pct(r.p.revenueShare) },
    { key: "comm", label: "Commission", width: "104px", align: "right", render: r => <b style={{ fontWeight: 600, color: "var(--ink)" }}>{eurK(r.commission)}</b> },
    { key: "disc", label: "Discounts given", width: "112px", align: "right", render: r => eurK(r.discounts) },
  ];

  return (
    <Page wide eyebrow="LEARNING PARTNERS" title="Referrals and commissions"
      sub="How Recruit members reach partner courses, and what that could earn. Commission figures are concept assumptions for fictional partners."
      actions={<>
        <DemoTag>Concept economics</DemoTag>
        <Button icon="learning" onClick={() => nav.setTab("courses")}>Course catalogue</Button>
      </>}>

      <Grid cols="rc-g5">
        <Stat icon="send" label="Partner referrals" value={num(referrals)} sub="Members sent to partners" />
        <Stat icon="check" tone="teal" label="Enrolments" value={num(enrolments)} delta={live ? "+" + live + " today" : undefined} sub="From Recruit referrals" />
        <Stat icon="trendUp" label="Referral conversion" value={pct(enrolments / referrals, 1)} sub="Enrolments over referrals" />
        <Stat icon="euro" tone="accent" label="Commission opportunity" value={eurK(commission)} sub="Concept, all time" />
        <Stat icon="award" label="Member discounts given" value={eurK(discounts)} sub="Value passed to members" />
      </Grid>

      <Table cols={cols} rows={rows}
        caption="Commission = member course fee x the partner's concept revenue share. Fees are enrolment-weighted averages; today's enrolments use the exact course fee." />

      <Grid cols="rc-g-3-2">
        <Card title="Enrolments in the demo" sub="Live enrolments appear here first, and flow into the partner totals above"
          action={<Badge tone={liveList.length ? "teal" : "neutral"} icon={liveList.length ? "check" : "clock"}>{liveList.length} today</Badge>}>
          {liveList.length === 0 && (
            <div style={{ padding: "12px 14px", marginBottom: 10, borderRadius: "var(--r-sm, 12px)", border: "1px dashed var(--border-strong)", display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
              <span style={{ color: "var(--accent)" }}><Icon name="learning" size={16} /></span>
              <div className="rc-grow" style={{ fontSize: 12.5, color: "var(--body)", lineHeight: 1.5, minWidth: 220 }}>
                Nothing enrolled today yet. Enrol Aoife in the Wine & Beverage Leadership Diploma from her learning plan and it lands here, with the commission it could earn.
              </div>
              <Button size="sm" variant="primary" iconRight="arrowRight" onClick={() => { setPersona("c-aoife"); nav.go("cand.learning", "courses"); }}>Open Aoife's courses</Button>
            </div>
          )}
          {enrolList.map((e, i) => {
            const c = CANDIDATE_BY_ID[e.candidateId];
            const course = COURSE_BY_ID[e.courseId];
            const p = course ? PARTNER_BY_ID[course.partnerId] : undefined;
            const isLive = e.date === "Today";
            const fee = course ? memberPrice(course) : 0;
            const state = e.status === "completed" ? "Completed " + e.date : e.status === "in progress" ? e.progress + "% complete" : "Enrolled " + e.date;
            return (
              <div key={e.id} className={"rc-row" + (isLive ? " rc-rise" : "")} style={{ gap: 11, padding: "10px 0", borderTop: i || liveList.length === 0 ? "1px solid var(--border)" : 0 }}>
                <span onClick={() => openDrawer("candidate", e.candidateId)} style={{ cursor: "pointer" }}><Avatar initials={c?.initials || "?"} tint={c?.tint} size={30} /></span>
                <div className="rc-grow">
                  <div className="rc-row" style={{ gap: 6, fontSize: 13 }}>
                    <button className="rc-link" style={{ color: "var(--ink)", fontWeight: 500 }} onClick={() => openDrawer("candidate", e.candidateId)}>{c?.name}</button>
                    <span style={{ color: "var(--faint)" }}>enrolled in</span>
                  </div>
                  <button className="rc-link rc-ellipsis" style={{ display: "block", maxWidth: "100%", fontSize: 12.5, marginTop: 2, textAlign: "left" }} onClick={() => openDrawer("course", e.courseId)}>{course?.title}</button>
                </div>
                <div className="rc-hide-sm" style={{ textAlign: "right", fontSize: 11.5, color: "var(--dim)", minWidth: 120 }}>
                  <div>{eur(fee)} member fee</div>
                  <div style={{ color: "var(--faint)", marginTop: 2 }}>{eur(fee * (p?.revenueShare || 0))} commission, concept</div>
                </div>
                {isLive ? <Badge tone="teal" icon="bolt">Live demo, today</Badge>
                  : <Badge tone={e.status === "completed" ? "ok" : "neutral"}>{state}</Badge>}
              </div>
            );
          })}
        </Card>

        <Card title="Commission per enrolment" sub="Member course fee x the partner's concept share, top six courses" action={<DemoTag>Concept</DemoTag>}>
          <BarList items={perEnrolment.map(x => ({ label: x.c.title, value: x.value, display: eur(x.value), sub: PARTNER_BY_ID[x.c.partnerId]?.short }))} color="#f0a33e" />
          <Note style={{ marginTop: 16 }}>Revenue shares are concept assumptions. No partnership is signed and no course payment is taken in this demo.</Note>
        </Card>
      </Grid>

      <Card title="Education revenue" sub={SCENARIO_CAPTION + ". Partnership revenue from the fictional partners, month by month."} action={<DemoTag />}>
        <div className="rc-row rc-wrap" style={{ gap: 24, alignItems: "stretch" }}>
          <div style={{ flex: "0 0 200px", minWidth: 180 }}>
            <Label>This month</Label>
            <div style={{ fontSize: 30, fontWeight: 600, letterSpacing: "-1px", marginTop: 8 }}>{eur(edu[last])}</div>
            <div style={{ fontSize: 12, color: "var(--teal, var(--ok))", marginTop: 4 }}>Up {pct(edu[last] / edu[0] - 1)} since {MONTHS[0]}</div>
            <div style={{ fontSize: 12, color: "var(--dim)", marginTop: 14, lineHeight: 1.5 }}>{eur(edu.reduce((t, v) => t + v, 0))} across the scenario year, before referral commissions.</div>
          </div>
          <div className="rc-grow" style={{ minWidth: 280 }}>
            <LineChart height={200} labels={MONTHS} yFormat={v => eurK(v)}
              series={[{ name: "Education revenue", values: edu, color: "#f0a33e", area: true }]} />
          </div>
        </div>
      </Card>
    </Page>
  );
}
