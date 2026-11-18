import type { ReactNode } from "react";
import { Avatar, Badge, Button, Card, DemoTag, Grid, Label, Note, Progress, Section, Table, type Col } from "../../ui";
import { BarChart, BarList, Donut, Funnel, Legend, LineChart, SERIES_COLORS, Sparkline } from "../../charts";
import { Icon } from "../../icons";
import { useNav } from "../../nav";
import { DEFAULT_CALC, openDrawer, useRecruit } from "../../store";
import { calcResult, membershipTotals, partnerStats } from "../../selectors";
import {
  CAMPAIGNS, CANDIDATE_BY_ID, CANDIDATE_FUNNEL, EMPLOYER_FUNNEL, GOVERNANCE, MARKET, MONTHS, PRIVACY_REQUESTS, QUALITY, RECRUIT_AGENTS,
  SCENARIO_CAPTION, SERIES, TIERS, VERIFICATION_QUEUE, membershipRevenue, placementEconomics,
} from "../../data";
import { eur, eurK, eurM, num, pct, pctRaw } from "../../format";

/* Recruit sections mounted under the Pulse Dashboard, one per top-bar tab.
   Every figure is the illustrative future-state scenario in data/metrics.ts,
   never an actual result. The Harbourview example always uses the canonical
   inputs (DEFAULT_CALC), whatever the employer calculator currently shows. */

type Tab = "marketplace" | "growth" | "commercial" | "quality";
const TABS: Tab[] = ["marketplace", "growth", "commercial", "quality"];
const LAST = SERIES.registered.length - 1;
const k = (v: number) => (v >= 1000 ? Math.round(v / 1000) + "k" : String(Math.round(v)));
/** A rate such as 0.095 as "9.5%", whole numbers without a decimal. */
const rl = (r: number) => { const v = Math.round(r * 1000) / 10; return (Number.isInteger(v) ? v.toFixed(0) : v.toFixed(1)) + "%"; };

export default function DashboardExtras() {
  const nav = useNav();
  const tab: Tab = (TABS as string[]).includes(nav.tab) ? (nav.tab as Tab) : "marketplace";
  return (
    <div style={{ width: "100%", maxWidth: 1280, margin: "0 auto", boxSizing: "border-box", padding: "0 32px 40px" }}>
      <div key={tab} className="rc-col rc-rise" style={{ gap: 14 }}>
        {tab === "marketplace" && <Marketplace />}
        {tab === "growth" && <Growth />}
        {tab === "commercial" && <Commercial />}
        {tab === "quality" && <Quality />}
      </div>
    </div>
  );
}

/* ── marketplace ────────────────────────────────────────────────────────── */

function Marketplace() {
  const nav = useNav();
  const target = MARKET.talentTarget;
  const passedAt = SERIES.registered.findIndex(v => v >= target);
  const tiles: { label: string; value: string; values: number[]; delta: string; good: boolean; color: string }[] = [
    { label: "Verified profiles", value: num(MARKET.verifiedProfiles), values: SERIES.verified, delta: "+" + num(SERIES.verified[LAST] - SERIES.verified[LAST - 1]), good: true, color: SERIES_COLORS[1] },
    { label: "Discoverable to employers", value: num(MARKET.discoverableCandidates), values: SERIES.discoverable, delta: "+" + num(SERIES.discoverable[LAST] - SERIES.discoverable[LAST - 1]), good: true, color: SERIES_COLORS[3] },
    { label: "Employer accounts", value: num(MARKET.employerAccounts), values: SERIES.employers, delta: "+" + num(SERIES.employers[LAST] - SERIES.employers[LAST - 1]), good: true, color: SERIES_COLORS[0] },
    { label: "Open vacancies", value: num(MARKET.openVacancies), values: SERIES.vacancies, delta: "+" + num(SERIES.vacancies[LAST] - SERIES.vacancies[LAST - 1]), good: true, color: SERIES_COLORS[2] },
    { label: "Placements this month", value: num(MARKET.placementsThisMonth), values: SERIES.placements, delta: "+" + num(SERIES.placements[LAST] - SERIES.placements[LAST - 1]), good: true, color: SERIES_COLORS[1] },
    { label: "Median time to shortlist", value: MARKET.medianHoursToShortlist + "h", values: SERIES.hoursToShortlist, delta: (SERIES.hoursToShortlist[LAST] - SERIES.hoursToShortlist[LAST - 1]).toFixed(1) + "h", good: true, color: SERIES_COLORS[4] },
  ];
  return (
    <Section title="The marketplace at scale" sub="Illustrative future-state scenario, scenario year 2. Not actual results." action={<DemoTag>Illustrative future state</DemoTag>}>
      <Grid cols="rc-g-1-2">
        <Card pad={22} style={{ background: "linear-gradient(150deg, color-mix(in oklab, #16B8A6 12%, var(--surface)) 0%, var(--surface) 60%)" }}>
          <div className="rc-row" style={{ gap: 8 }}>
            <Label style={{ flex: 1 }}>Talent network target</Label>
            {MARKET.registeredProfessionals >= target && <Badge tone="teal" icon="check">Target passed</Badge>}
          </div>
          <div style={{ fontSize: 40, fontWeight: 600, letterSpacing: "-1.6px", marginTop: 12, lineHeight: 1 }}>{num(MARKET.registeredProfessionals)}</div>
          <div style={{ fontSize: 13, color: "var(--dim)", marginTop: 6 }}>registered professionals against John's {num(target)} target</div>
          <TargetBar label="Registered" value={MARKET.registeredProfessionals} target={target} tone="teal" />
          <TargetBar label="Verified" value={MARKET.verifiedProfiles} target={target} tone="accent" />
          <TargetBar label="Discoverable" value={MARKET.discoverableCandidates} target={target} tone="warn" />
          <div style={{ fontSize: 12, color: "var(--body)", marginTop: 14, lineHeight: 1.5 }}>
            {passedAt >= 0 ? "Passed in " + MONTHS[passedAt] + " of scenario year 2. " : ""}Verification is now the gap: {num(target - MARKET.verifiedProfiles)} more verified profiles to reach the same mark.
          </div>
          <Button size="sm" style={{ marginTop: 14 }} iconRight="arrowRight" onClick={() => nav.setTab("growth")}>Acquisition funnels</Button>
        </Card>
        <div className="rc-grid rc-g3" style={{ gap: 12 }}>
          {tiles.map(t => (
            <Card key={t.label} pad="16px 18px">
              <div className="rc-ellipsis" style={{ fontSize: 12, color: "var(--dim)" }}>{t.label}</div>
              <div style={{ fontSize: 24, fontWeight: 600, letterSpacing: "-.8px", marginTop: 10, lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>{t.value}</div>
              <div className="rc-row" style={{ marginTop: 10, gap: 8, alignItems: "flex-end" }}>
                <span className="rc-grow" style={{ fontSize: 11.5, color: t.good ? "var(--teal, var(--ok))" : "var(--bad)" }}>{t.delta} this month</span>
                <Sparkline values={t.values} color={t.color} width={72} height={26} />
              </div>
            </Card>
          ))}
        </div>
      </Grid>
      <Grid cols="rc-g-2-1">
        <Card title="Talent network growth" sub={SCENARIO_CAPTION} action={<DemoTag />}>
          <LineChart height={230} labels={MONTHS} yFormat={k}
            series={[
              { name: "Registered", values: SERIES.registered, color: SERIES_COLORS[1], area: true },
              { name: "Verified", values: SERIES.verified, color: "var(--accent)" },
              { name: "Discoverable", values: SERIES.discoverable, color: SERIES_COLORS[3] },
              { name: "Target", values: SERIES.registered.map(() => target), color: "var(--faint)", dashed: true },
            ]} />
        </Card>
        <Card title="Employers and open roles" sub={SCENARIO_CAPTION}>
          <LineChart height={230} labels={MONTHS} yFormat={v => num(v)}
            series={[{ name: "Employer accounts", values: SERIES.employers, color: "var(--accent)" }, { name: "Open vacancies", values: SERIES.vacancies, color: SERIES_COLORS[2] }]} />
        </Card>
      </Grid>
      <Grid cols="rc-g2">
        <Card title="Placements per month" sub={"48 this month, up from " + SERIES.placements[0] + " in " + MONTHS[0]}>
          <BarChart height={200} yFormat={v => String(Math.round(v))} color="var(--teal, #16B8A6)" data={MONTHS.map((m, i) => ({ label: m, value: SERIES.placements[i] }))} />
        </Card>
        <Card title="Median hours to shortlist" sub={"From " + SERIES.hoursToShortlist[0] + "h to " + MARKET.medianHoursToShortlist + "h as matching learns the market"}>
          <LineChart height={200} labels={MONTHS} yFormat={v => v.toFixed(0) + "h"} yMin={0}
            series={[{ name: "Hours to shortlist", values: SERIES.hoursToShortlist, color: SERIES_COLORS[4], area: true }]} />
        </Card>
      </Grid>
    </Section>
  );
}

function TargetBar({ label, value, target, tone }: { label: string; value: number; target: number; tone: "teal" | "accent" | "warn" }) {
  return (
    <div style={{ marginTop: 14 }}>
      <div className="rc-row" style={{ fontSize: 12 }}>
        <span className="rc-grow" style={{ color: "var(--dim)" }}>{label}</span>
        <span style={{ color: "var(--body)", fontVariantNumeric: "tabular-nums" }}>{num(value)}, {pct(value / target)}</span>
      </div>
      <Progress value={Math.min(value, target)} max={target} tone={tone} style={{ marginTop: 6 }} />
    </div>
  );
}

/* ── growth ─────────────────────────────────────────────────────────────── */

type Campaign = (typeof CAMPAIGNS)[number];

function Growth() {
  const s = useRecruit();
  const nav = useNav();
  const partners = partnerStats(s);
  const growthAgent = RECRUIT_AGENTS.find(a => a.id === "growth");
  const employerFunnel = EMPLOYER_FUNNEL.map(f => f.label === "Open vacancies" ? { ...f, label: "Active vacancies" }
    : f.label === "Placements this month" ? { ...f, label: "Successful placements", note: "Hires completed this month" } : f);
  const cols: Col<Campaign>[] = [
    { key: "name", label: "Campaign", width: "minmax(200px, 2fr)", render: c => (
      <div style={{ minWidth: 0 }}>
        <div className="rc-ellipsis" style={{ fontSize: 13, fontWeight: 500, color: "var(--ink)" }}>{c.name}</div>
        <div className="rc-ellipsis" style={{ fontSize: 11.5, color: "var(--dim)", marginTop: 2 }}>{c.channel}</div>
      </div>
    ) },
    { key: "status", label: "Status", width: "92px", render: c => <Badge tone={c.status === "Planned" ? "accent" : "neutral"}>{c.status}</Badge> },
    { key: "reach", label: "Reach", width: "88px", align: "right", render: c => num(c.reach) },
    { key: "signups", label: "Sign-ups", width: "84px", align: "right", render: c => num(c.signups) },
    { key: "conv", label: "Conversion", width: "92px", align: "right", render: c => pctRaw(c.conv, 1) },
    { key: "cost", label: "Cost", width: "84px", align: "right", render: c => c.cost ? eur(c.cost) : <span style={{ color: "var(--faint)" }}>None</span> },
    { key: "cps", label: "Per sign-up", width: "92px", align: "right", render: c => c.cost ? eur(c.cost / c.signups) : <span style={{ color: "var(--faint)" }}>None</span> },
  ];
  return (
    <Section title="Growth and acquisition" sub="All-time funnels in the simulated scenario, with planned and concept campaigns." action={<DemoTag>Modelled, not measured</DemoTag>}>
      <Grid cols="rc-g2">
        <Card title="Candidate acquisition" sub="From outreach to discoverable profiles">
          <Funnel stages={CANDIDATE_FUNNEL} format={num} />
        </Card>
        <Card title="Employer acquisition" sub="From first contact to a successful placement">
          <Funnel stages={employerFunnel} format={num} />
        </Card>
      </Grid>
      <Grid cols="rc-g-2-1">
        <div className="rc-col" style={{ gap: 10 }}>
          <Table cols={cols} rows={CAMPAIGNS} caption="Every campaign is planned or a concept. Reach, sign-ups and costs are modelled for the demo." />
          <Note icon="info">
            The founder network launch draws on John's network of about {num(MARKET.founderLinkedInFollowers)} LinkedIn followers. That figure is founder-provided context, not a connected data source; LinkedIn is not integrated.
          </Note>
        </div>
        <Card title="Partner acquisition" sub="Education partners by pipeline stage. All fictional, none signed."
          action={<Button size="sm" variant="ghost" iconRight="arrowRight" onClick={() => nav.go("hq.learning", "institutions")}>Partners</Button>}>
          {partners.map((p, i) => (
            <div key={p.id} className="rc-row" style={{ gap: 10, padding: "9px 0", borderTop: i ? "1px solid var(--border)" : 0 }}>
              <Avatar initials={p.initials} tint={p.tint} size={28} square />
              <div className="rc-grow">
                <div className="rc-ellipsis" style={{ fontSize: 12.5, color: "var(--ink)" }}>{p.short}</div>
                <div className="rc-ellipsis" style={{ fontSize: 11, color: "var(--faint)", marginTop: 2 }}>{p.status}</div>
              </div>
              <div style={{ textAlign: "right", fontSize: 11.5, color: "var(--dim)" }}>
                <div><b style={{ color: "var(--ink)", fontWeight: 600 }}>{num(p.referrals)}</b> referrals</div>
                <div style={{ marginTop: 2 }}>{num(p.enrolments)} enrolled</div>
              </div>
            </div>
          ))}
          {growthAgent?.recommendations[0] && (
            <div className="rc-row" style={{ gap: 9, alignItems: "flex-start", marginTop: 12, padding: "10px 12px", borderRadius: 12, background: "var(--accent-faint)", border: "1px solid var(--accent-line)" }}>
              <span style={{ color: "var(--accent)", marginTop: 1 }}><Icon name="sparkle" size={13} /></span>
              <span style={{ fontSize: 12, color: "var(--body)", lineHeight: 1.5 }}>{growthAgent.recommendations[0].text}</span>
            </div>
          )}
        </Card>
      </Grid>
    </Section>
  );
}

/* ── commercial ─────────────────────────────────────────────────────────── */

function Commercial() {
  const s = useRecruit();
  const nav = useNav();
  const mt = membershipTotals(s);
  const stdRate = s.commissionRules.find(r => r.id === "cr1")?.rate ?? MARKET.recruitDefaultRate;
  const fees = SERIES.successFees.map(v => v * (stdRate / MARKET.recruitDefaultRate));
  const econ = placementEconomics(MARKET.placementsThisMonth, MARKET.avgPlacementSalary, MARKET.agencyBenchmarkRate, stdRate);
  const ex = calcResult({ ...s, calc: DEFAULT_CALC });
  const mScale = mt.revenue / membershipRevenue(TIERS);
  const tierColor = (id: number) => SERIES_COLORS[(id - 1) % SERIES_COLORS.length];
  return (
    <Section title="Commercial model" sub="Simulated annualised figures at current prices. Illustrative, not actual results." action={<DemoTag>Simulated</DemoTag>}>
      <Grid cols="rc-g3">
        <Card title="Membership mix" sub={num(mt.accounts) + " employer accounts across five tiers"}
          action={<Button size="sm" variant="ghost" iconRight="arrowRight" onClick={() => nav.go("hq.revenue", "memberships")}>Detail</Button>}>
          <div className="rc-row rc-wrap" style={{ gap: 16, alignItems: "center" }}>
            <Donut size={136} thickness={15} center={eurM(mt.revenue)} sub="a year, simulated"
              segments={s.tiers.map(t => ({ label: t.label, value: t.price * t.accounts, color: tierColor(t.id) }))} />
            <div className="rc-grow" style={{ minWidth: 150 }}>
              <Legend items={s.tiers.map(t => ({ label: t.label + (t.confirmed ? "" : ", concept"), value: num(t.accounts), color: tierColor(t.id) }))} />
            </div>
          </div>
          <div style={{ fontSize: 12, color: "var(--body)", marginTop: 14 }}>
            <b style={{ fontWeight: 600, color: "var(--ink)" }}>{eur(mt.revenue)}</b> simulated annualised membership revenue{mScale !== 1 ? " at the edited prices" : ""}.
          </div>
        </Card>
        <Card title="Success fees" sub={rl(stdRate) + " of salary on each hire. " + eur(fees[LAST]) + " this month."}
          action={<Button size="sm" variant="ghost" iconRight="arrowRight" onClick={() => nav.go("hq.revenue", "commissions")}>Detail</Button>}>
          <BarChart height={190} yFormat={v => eurK(v)} color="var(--teal, #16B8A6)" data={MONTHS.map((m, i) => ({ label: m, value: fees[i] }))} />
          <div style={{ fontSize: 11.5, color: "var(--faint)", marginTop: 8 }}>{SCENARIO_CAPTION}. {num(MARKET.placementsThisMonth)} placements x {eur(MARKET.avgPlacementSalary)} x {rl(stdRate)} this month.</div>
        </Card>
        <Card title="Placement economics this month" sub="Explicit assumptions, not measured results">
          <div className="rc-row" style={{ alignItems: "baseline", gap: 8 }}>
            <span style={{ fontSize: 28, fontWeight: 600, letterSpacing: "-1px", color: "var(--teal, var(--ok))" }}>{eur(econ.saving)}</span>
          </div>
          <div style={{ fontSize: 12.5, color: "var(--dim)", marginTop: 4 }}>gross recruitment fee savings for employers</div>
          <div style={{ marginTop: 16 }}>
            <BarList max={econ.agencyFees} items={[
              { label: "Agency at " + pct(econ.agencyRate), value: econ.agencyFees, display: eur(econ.agencyFees), color: "var(--warn)" },
              { label: "Recruit at " + rl(econ.recruitRate), value: econ.recruitFees, display: eur(econ.recruitFees), color: "var(--teal, #16B8A6)" },
            ]} />
          </div>
          <div style={{ fontSize: 11.5, color: "var(--faint)", marginTop: 12 }}>{num(econ.placements)} placements x {eur(econ.avgSalary)} average salary.</div>
        </Card>
      </Grid>

      <Card pad={22} title="The Harbourview example" sub="One General Manager hire, using the canonical inputs from the employer calculator"
        action={<Button size="sm" iconRight="arrowRight" onClick={() => nav.go("emp.costs", "calculator")}>See it as Harbourview</Button>}>
        <div className="rc-row rc-wrap" style={{ gap: 10, alignItems: "stretch" }}>
          <Figure label="Salary" value={eur(DEFAULT_CALC.salary)} />
          <Figure label={"Agency at " + pct(DEFAULT_CALC.agencyRate)} value={eur(ex.agencyFee)} tone="warn" />
          <Figure label={"Recruit at " + pct(DEFAULT_CALC.recruitRate)} value={eur(ex.recruitFee)} tone="teal" />
          <Figure label="Gross saving" value={eur(ex.gross)} />
          <Figure label="Membership" value={"-" + eur(DEFAULT_CALC.membership)} />
          <Figure label="Net first-year saving" value={eur(ex.net)} tone="teal" strong />
        </div>
        <div style={{ marginTop: 16 }}>
          <div className="rc-row" style={{ fontSize: 11.5, color: "var(--dim)", gap: 8 }}>
            <span className="rc-grow">Fee per hire, agency against Recruit</span>
            <span>{pct(ex.recruitFee / ex.agencyFee)} of the agency fee</span>
          </div>
          <div style={{ position: "relative", height: 12, borderRadius: 999, background: "color-mix(in oklab, var(--warn) 55%, transparent)", marginTop: 8, overflow: "hidden" }}>
            <div style={{ width: (ex.recruitFee / ex.agencyFee) * 100 + "%", height: "100%", borderRadius: 999, background: "var(--teal, #16B8A6)", transition: "width .5s var(--ease)" }} />
          </div>
        </div>
        <div style={{ fontSize: 11.5, color: "var(--faint)", marginTop: 12 }}>Illustrative. Salary of {eur(DEFAULT_CALC.salary)}, a 25% agency benchmark, an 8% Recruit fee and the {eur(DEFAULT_CALC.membership)} Professional membership.</div>
      </Card>
    </Section>
  );
}

function Figure({ label, value, tone, strong }: { label: string; value: string; tone?: "warn" | "teal"; strong?: boolean }) {
  const color = tone === "warn" ? "var(--warn)" : tone === "teal" ? "var(--teal, var(--ok))" : "var(--ink)";
  return (
    <div style={{ flex: "1 1 130px", padding: "12px 14px", borderRadius: "var(--r-sm, 12px)", minWidth: 0,
      background: strong ? "var(--teal-soft, var(--ok-soft))" : "var(--surface-2)", border: "1px solid " + (strong ? "color-mix(in oklab, var(--teal, var(--ok)) 35%, transparent)" : "var(--border)") }}>
      <Label style={{ fontSize: 8.5 }}>{label}</Label>
      <div style={{ fontSize: strong ? 22 : 19, fontWeight: 600, letterSpacing: "-.6px", marginTop: 6, color, fontVariantNumeric: "tabular-nums" }}>{value}</div>
    </div>
  );
}

/* ── quality ────────────────────────────────────────────────────────────── */

function Quality() {
  const s = useRecruit();
  const nav = useNav();
  const verifyAgent = RECRUIT_AGENTS.find(a => a.id === "verify");
  const govOn = GOVERNANCE.filter(g => s.governance[g.id]).length;
  const locked = GOVERNANCE.filter(g => g.locked).length;
  const openRequests = PRIVACY_REQUESTS.filter(r => r.status !== "Completed").length;
  const metrics: { label: string; value: string; sub: string; bar?: number; icon: string }[] = [
    { label: "Profile accuracy", value: pctRaw(QUALITY.profileAccuracy, 1), sub: "Profiles confirmed accurate on review", bar: QUALITY.profileAccuracy, icon: "verified" },
    { label: "Verification turnaround", value: QUALITY.verificationSlaHours + "h", sub: "Median from request to decision", icon: "clock" },
    { label: "Introduction acceptance", value: pctRaw(QUALITY.introAcceptance), sub: "Candidates who agree to share details", bar: QUALITY.introAcceptance, icon: "users" },
    { label: "Offer acceptance", value: pctRaw(QUALITY.offerAcceptance), sub: "Offers accepted by candidates", bar: QUALITY.offerAcceptance, icon: "offers" },
    { label: "Retention at 6 months", value: pctRaw(QUALITY.retention6m), sub: "Placed professionals still in post", bar: QUALITY.retention6m, icon: "placement" },
    { label: "Retention at 12 months", value: pctRaw(QUALITY.retention12m), sub: "Placed professionals still in post", bar: QUALITY.retention12m, icon: "placement" },
    { label: "Employer NPS", value: String(QUALITY.employerNps), sub: "Net promoter score, employers", icon: "employer" },
    { label: "Candidate NPS", value: String(QUALITY.candidateNps), sub: "Net promoter score, professionals", icon: "candidate" },
    { label: "Open disputes", value: String(QUALITY.disputes), sub: "Placement or fee disputes in review", icon: "alert" },
  ];
  return (
    <Section title="Marketplace quality" sub="Illustrative quality measures for the simulated operating model." action={<DemoTag>Illustrative</DemoTag>}>
      <div className="rc-grid rc-g3" style={{ gap: 12 }}>
        {metrics.map(m => (
          <Card key={m.label} pad="16px 18px">
            <div className="rc-row" style={{ gap: 8 }}>
              <span style={{ color: "var(--dim)" }}><Icon name={m.icon} size={14} /></span>
              <span className="rc-grow rc-ellipsis" style={{ fontSize: 12, color: "var(--dim)" }}>{m.label}</span>
            </div>
            <div style={{ fontSize: 26, fontWeight: 600, letterSpacing: "-.9px", marginTop: 10, lineHeight: 1 }}>{m.value}</div>
            <div style={{ fontSize: 11.5, color: "var(--faint)", marginTop: 6 }}>{m.sub}</div>
            {m.bar !== undefined && <Progress value={m.bar} tone="teal" height={4} style={{ marginTop: 10 }} />}
          </Card>
        ))}
      </div>
      <Grid cols="rc-g-3-2">
        <Card title="Verification backlog" sub={num(MARKET.verificationBacklog) + " profiles waiting. Sample of the queue below."}
          action={<Button size="sm" variant="ghost" iconRight="arrowRight" onClick={() => nav.go("hq.talent", "verification")}>Open queue</Button>}>
          {VERIFICATION_QUEUE.map((v, i) => {
            const c = CANDIDATE_BY_ID[v.candidateId];
            return (
              <div key={v.id} className="rc-row rc-rowhover" onClick={() => openDrawer("candidate", v.candidateId)}
                style={{ gap: 10, padding: "9px 8px", margin: "0 -8px", borderRadius: 10, borderTop: i ? "1px solid var(--border)" : 0 }}>
                <Avatar initials={c?.initials || "?"} tint={c?.tint} size={28} />
                <div className="rc-grow">
                  <div className="rc-ellipsis" style={{ fontSize: 12.5, color: "var(--ink)" }}>{v.item}</div>
                  <div className="rc-ellipsis" style={{ fontSize: 11.5, color: "var(--dim)", marginTop: 2 }}>{c?.name}, {v.type.toLowerCase()}, {v.owner}</div>
                </div>
                <Badge tone={/candidate|referee/i.test(v.status) ? "warn" : "neutral"}>{v.status}</Badge>
                <span className="rc-hide-sm" style={{ width: 46, textAlign: "right", fontSize: 11, color: "var(--faint)" }}>{v.age}</span>
              </div>
            );
          })}
          {verifyAgent?.recommendations[0] && <Note icon="sparkle" style={{ marginTop: 10 }}>{verifyAgent.name}: {verifyAgent.recommendations[0].text}</Note>}
        </Card>
        <Card title="Data and consent" sub={govOn + " of " + GOVERNANCE.length + " safeguards on, " + locked + " locked"}
          action={<Button size="sm" variant="ghost" iconRight="arrowRight" onClick={() => nav.go("Settings", "governance")}>Governance</Button>}>
          {GOVERNANCE.filter(g => g.locked).slice(0, 5).map((g, i) => (
            <Highlight key={g.id} first={!i} on={!!s.governance[g.id]} title={g.label} note={g.note} />
          ))}
          <div className="rc-row" style={{ gap: 10, marginTop: 12, padding: "10px 12px", borderRadius: 12, background: "var(--surface-2)", border: "1px solid var(--border)" }}>
            <Icon name="file" size={14} color="var(--dim)" />
            <span className="rc-grow" style={{ fontSize: 12.5, color: "var(--body)" }}>Privacy requests</span>
            <Badge tone={openRequests ? "warn" : "teal"}>{openRequests} open</Badge>
            <span style={{ fontSize: 11.5, color: "var(--faint)" }}>{PRIVACY_REQUESTS.length} this week</span>
          </div>
        </Card>
      </Grid>
    </Section>
  );
}

function Highlight({ on, title, note, first }: { on: boolean; title: string; note: ReactNode; first: boolean }) {
  return (
    <div className="rc-row" style={{ alignItems: "flex-start", gap: 10, padding: "9px 0", borderTop: first ? 0 : "1px solid var(--border)" }}>
      <span style={{ width: 22, height: 22, flex: "none", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center",
        background: on ? "var(--teal-soft, var(--ok-soft))" : "var(--bad-soft)", color: on ? "var(--teal, var(--ok))" : "var(--bad)" }}>
        <Icon name={on ? "lock" : "x"} size={11} stroke={2.2} />
      </span>
      <div className="rc-grow">
        <div style={{ fontSize: 12.5, color: "var(--ink)" }}>{title}</div>
        <div style={{ fontSize: 11.5, color: "var(--dim)", marginTop: 2, lineHeight: 1.45 }}>{note}</div>
      </div>
    </div>
  );
}
