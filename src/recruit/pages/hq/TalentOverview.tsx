import { useMemo, type ReactNode } from "react";
import { Badge, Button, Card, DemoTag, Grid, Label, ListRow, Note, Page, Progress, Stat } from "../../ui";
import { BarList, Donut, Funnel, Legend, LineChart, SERIES_COLORS, Sparkline, StackBar } from "../../charts";
import { useNav } from "../../nav";
import { openDrawer, useRecruit } from "../../store";
import { candidate } from "../../selectors";
import {
  CANDIDATES, CANDIDATE_BY_ID, CANDIDATE_FUNNEL, INDUSTRY_MIX, MARKET, MONTHS, QUALITY, REGION_MIX, SCENARIO_CAPTION, SENIORITY_MIX, SERIES,
} from "../../data";
import { num, pctRaw } from "../../format";

/* Recruit HQ, Talent overview: the health of the supply side of the
   marketplace. Totals are the illustrative scenario in data/metrics.ts; the
   sample records behind them are listed on the Candidates tab. */

const monthDelta = (a: number[]) => a[a.length - 1] - a[a.length - 2];
const signed = (n: number) => (n >= 0 ? "+" : "-") + num(Math.abs(n));
const share = (part: number, whole: number) => pctRaw((part / whole) * 100);

/** Completeness buckets (illustrative). The two top buckets add up to the
    93,870 completed profiles in the acquisition funnel. */
const COMPLETENESS = [
  { label: "90 to 100% complete", value: 51240, done: true },
  { label: "80 to 89% complete", value: 42630, done: true },
  { label: "60 to 79% complete", value: 5920, done: false },
  { label: "40 to 59% complete", value: 1980, done: false },
  { label: "Under 40% complete", value: 710, done: false },
];

/** Verification backlog by age (illustrative): 210 items are older than five days. */
const AGEING = [
  { label: "Under 1 day", value: 342 },
  { label: "1 to 2 days", value: 418 },
  { label: "3 to 5 days", value: 314 },
  { label: "6 to 10 days", value: 162 },
  { label: "Over 10 days", value: 48 },
];
const AGE_COLORS = [SERIES_COLORS[1], SERIES_COLORS[5], SERIES_COLORS[0], SERIES_COLORS[2], SERIES_COLORS[4]];

/** Monthly engagement (illustrative shares of registered professionals). */
const ENGAGEMENT = [
  { label: "Active in the last 30 days", share: 0.58 },
  { label: "Opened a market value report", share: 0.64 },
  { label: "Explored a career path", share: 0.31 },
  { label: "Updated their profile this month", share: 0.17 },
];

const yK = (v: number) => (v % 1000 === 0 ? v / 1000 + "k" : num(v));

export default function TalentOverview() {
  const s = useRecruit();
  const nav = useNav();
  const registered = MARKET.registeredProfessionals;
  const target = MARKET.talentTarget;
  const passedAt = SERIES.registered.findIndex(v => v >= target);
  const completed = CANDIDATE_FUNNEL.find(f => f.label === "Completed profiles")?.value ?? 0;
  const sample = useMemo(() => CANDIDATES.map(c => candidate(s, c.id)), [s]);
  const sampleComplete = Math.round(sample.reduce((t, c) => t + c.completeness, 0) / Math.max(1, sample.length));
  const older = AGEING.slice(3).reduce((t, b) => t + b.value, 0);
  const profileEvents = s.activity.filter(e => e.category === "profiles").slice(0, 5);
  const hours = SERIES.hoursToShortlist;

  const progressRows: { label: string; value: number; tone: "accent" | "teal" | "warn" }[] = [
    { label: "Registered professionals", value: MARKET.registeredProfessionals, tone: "accent" },
    { label: "Verified profiles", value: MARKET.verifiedProfiles, tone: "teal" },
    { label: "Discoverable to employers", value: MARKET.discoverableCandidates, tone: "warn" },
  ];

  return (
    <Page wide eyebrow="RECRUIT HQ · TALENT" title="Talent marketplace health"
      sub={"The supply side of Recruit: " + num(registered) + " registered professionals in the scenario. Every total here is illustrative future-state data, not an actual result."}
      actions={<>
        <Button icon="verified" onClick={() => nav.setTab("verification")}>Verification queue</Button>
        <Button variant="primary" icon="talent" onClick={() => nav.setTab("candidates")}>Open talent database</Button>
      </>}>

      <Grid cols="rc-g6">
        <Stat icon="talent" tone="accent" label="Registered professionals" value={num(MARKET.registeredProfessionals)}
          delta={signed(monthDelta(SERIES.registered))} sub="this month" onClick={() => nav.setTab("candidates")} />
        <Stat icon="verified" tone="teal" label="Verified profiles" value={num(MARKET.verifiedProfiles)}
          delta={signed(monthDelta(SERIES.verified))} sub="this month" onClick={() => nav.setTab("verification")} />
        <Stat icon="eye" label="Discoverable" value={num(MARKET.discoverableCandidates)}
          delta={signed(monthDelta(SERIES.discoverable))} sub="opted in to search" onClick={() => nav.setTab("candidates")} />
        <Stat icon="employer" label="Employer accounts" value={num(MARKET.employerAccounts)}
          delta={signed(monthDelta(SERIES.employers))} sub="this month" onClick={() => nav.go("hq.employers", "accounts")} />
        <Stat icon="vacancies" label="Open vacancies" value={num(MARKET.openVacancies)}
          delta={signed(monthDelta(SERIES.vacancies))} sub="this month" onClick={() => nav.go("hq.roles", "vacancies")} />
        <Stat icon="placement" label="Placements this month" value={num(MARKET.placementsThisMonth)}
          delta={signed(monthDelta(SERIES.placements))} sub="vs last month" onClick={() => nav.go("hq.roles", "placements")} />
      </Grid>

      <Grid cols="rc-g-2-1">
        <Card title="Talent network growth" sub={SCENARIO_CAPTION + ". Registered, verified and discoverable profiles against the 100,000 target."} action={<DemoTag />}>
          <LineChart height={262} labels={MONTHS} yMin={0} yMax={120000} yFormat={yK}
            series={[
              { name: "Registered", values: SERIES.registered, color: SERIES_COLORS[0], area: true },
              { name: "Verified", values: SERIES.verified, color: SERIES_COLORS[1] },
              { name: "Discoverable", values: SERIES.discoverable, color: SERIES_COLORS[2] },
              { name: "100,000 target", values: MONTHS.map(() => target), color: "var(--faint)", dashed: true },
            ]} />
        </Card>

        <div className="rc-col" style={{ gap: 14 }}>
          <Card title="Progress to 100,000 professionals" sub="John's stated ambition for the talent network"
            action={passedAt > -1 ? <Badge tone="ok" icon="check">Passed in {MONTHS[passedAt]}</Badge> : undefined}>
            <div className="rc-col" style={{ gap: 14 }}>
              {progressRows.map(r => (
                <div key={r.label}>
                  <div className="rc-row" style={{ fontSize: 12.5, gap: 8 }}>
                    <span className="rc-grow rc-ellipsis" style={{ color: "var(--body)" }}>{r.label}</span>
                    <b style={{ fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{num(r.value)}</b>
                  </div>
                  <Progress value={r.value} max={target} tone={r.tone} height={7} style={{ marginTop: 7 }} />
                  <div style={{ fontSize: 11, color: "var(--faint)", marginTop: 5 }}>{share(r.value, target)} of the target</div>
                </div>
              ))}
            </div>
            <Note style={{ marginTop: 14 }}>Registered profiles passed the target this month. Verified is the harder number: {num(target - MARKET.verifiedProfiles)} more verified profiles would reach it.</Note>
          </Card>

          <Card title="Verification backlog" sub="Credentials waiting on an issuer, employer or referee"
            action={<Button size="sm" variant="ghost" iconRight="arrowRight" onClick={() => nav.setTab("verification")}>Open queue</Button>}>
            <div className="rc-row" style={{ alignItems: "baseline", gap: 8 }}>
              <span style={{ fontSize: 30, fontWeight: 600, letterSpacing: "-1px", fontVariantNumeric: "tabular-nums" }}>{num(MARKET.verificationBacklog)}</span>
              <span style={{ fontSize: 12.5, color: "var(--dim)" }}>items waiting</span>
              <span style={{ marginLeft: "auto" }}><DemoTag /></span>
            </div>
            <StackBar parts={AGEING.map((a, i) => ({ ...a, color: AGE_COLORS[i] }))} height={10} />
            <div className="rc-row rc-wrap" style={{ gap: 12, marginTop: 10 }}>
              {AGEING.map((a, i) => (
                <span key={a.label} className="rc-row" style={{ gap: 6, fontSize: 11, color: "var(--dim)" }}>
                  <span style={{ width: 8, height: 8, borderRadius: 3, background: AGE_COLORS[i] }} />{a.label} <b style={{ color: "var(--ink)", fontWeight: 600 }}>{num(a.value)}</b>
                </span>
              ))}
            </div>
            <div style={{ fontSize: 12, color: "var(--dim)", marginTop: 12, lineHeight: 1.5 }}>
              {num(older)} items are older than five days. Median turnaround is {QUALITY.verificationSlaHours} hours from request to decision.
            </div>
          </Card>
        </div>
      </Grid>

      <Grid cols="rc-g2">
        <Card title="Candidate acquisition funnel" sub="All time, from outreach to profiles employers can find" action={<DemoTag />}>
          <Funnel stages={CANDIDATE_FUNNEL} format={num} />
          <Note style={{ marginTop: 14 }}>
            Outreach reach includes John's network of roughly {num(MARKET.founderLinkedInFollowers)} LinkedIn followers. That is founder-provided context, not a connected data source.
          </Note>
        </Card>
        <Card title="Profile completeness" sub={num(completed) + " of " + num(registered) + " profiles (" + share(completed, registered) + ") are more than 80% complete"} action={<DemoTag />}>
          <BarList items={COMPLETENESS.map(b => ({
            label: b.label, value: b.value, display: num(b.value), sub: share(b.value, registered),
            color: b.done ? "var(--teal, #16B8A6)" : "var(--warn)",
          }))} />
          <div className="rc-row" style={{ gap: 10, marginTop: 16, padding: "11px 13px", borderRadius: "var(--r-sm, 12px)", background: "var(--surface-2)", border: "1px solid var(--border)" }}>
            <div className="rc-grow" style={{ fontSize: 12.5, color: "var(--body)", lineHeight: 1.45 }}>
              The {sample.length} sample profiles average {sampleComplete}% complete. Profile edits made in the candidate portal update this straight away.
            </div>
            <Button size="sm" variant="ghost" iconRight="arrowRight" onClick={() => nav.setTab("candidates")}>Sample</Button>
          </div>
        </Card>
      </Grid>

      <Grid cols="rc-g3">
        <Card title="Industry" sub="Where registered professionals work today" action={<DemoTag />}>
          <div className="rc-row rc-wrap" style={{ gap: 18, alignItems: "center" }}>
            <Donut segments={INDUSTRY_MIX} size={128} thickness={15} center={INDUSTRY_MIX[0].value + "%"} sub="hotels and resorts" />
            <div className="rc-grow" style={{ minWidth: 150 }}><Legend items={INDUSTRY_MIX.map(m => ({ label: m.label, value: m.value + "%" }))} /></div>
          </div>
        </Card>
        <Card title="Region" sub="Share of registered professionals, with the approximate count">
          <BarList items={REGION_MIX.map(m => ({ label: m.label, value: m.value, display: m.value + "%", sub: num(Math.round((m.value / 100) * registered)) }))} />
        </Card>
        <Card title="Seniority" sub="Current level, from structured CVs">
          <BarList color="var(--teal, #16B8A6)" items={SENIORITY_MIX.map(m => ({ label: m.label, value: m.value, display: m.value + "%", sub: num(Math.round((m.value / 100) * registered)) }))} />
        </Card>
      </Grid>

      <Grid cols="rc-g-2-1">
        <Card title="Engagement" sub="How professionals use Recruit in a typical month" action={<DemoTag />}>
          <div className="rc-col" style={{ gap: 13 }}>
            {ENGAGEMENT.map(r => (
              <div key={r.label}>
                <div className="rc-row" style={{ fontSize: 12.5, gap: 10 }}>
                  <span className="rc-grow rc-ellipsis" style={{ color: "var(--body)" }}>{r.label}</span>
                  <span style={{ fontSize: 11, color: "var(--faint)", fontVariantNumeric: "tabular-nums" }}>{num(Math.round(r.share * registered))}</span>
                  <b style={{ fontWeight: 600, minWidth: 38, textAlign: "right" }}>{pctRaw(r.share * 100)}</b>
                </div>
                <Progress value={r.share * 100} tone="teal" height={5} style={{ marginTop: 6 }} />
              </div>
            ))}
          </div>
          <div className="rc-grid rc-g3" style={{ gap: 10, marginTop: 18 }}>
            <Tile label="Introductions accepted" value={QUALITY.introAcceptance + "%"} sub="Candidates who agree to share details" />
            <Tile label="Candidate NPS" value={String(QUALITY.candidateNps)} sub="Last survey wave" />
            <Tile label="Hours to shortlist" value={String(MARKET.medianHoursToShortlist)} sub={"Down from " + hours[0] + " h in month 1"}>
              <Sparkline values={hours} width={70} height={24} color="var(--teal, #16B8A6)" />
            </Tile>
          </div>
        </Card>

        <Card title="Latest profile activity" sub="Live from the shared activity log"
          action={<Button size="sm" variant="ghost" iconRight="arrowRight" onClick={() => nav.go("Activity", "profiles")}>All</Button>}>
          {profileEvents.map(ev => {
            const ref = ev.refs.find(r => CANDIDATE_BY_ID[r]);
            return (
              <ListRow key={ev.id} title={ev.title} sub={ev.detail} meta={ev.when}
                dot={ev.status === "awaiting" ? "var(--warn)" : ev.status === "failed" ? "var(--bad)" : "var(--teal, var(--ok))"}
                onClick={ref ? () => openDrawer("candidate", ref, { from: "hq" }) : undefined} />
            );
          })}
          {!profileEvents.length && <div style={{ fontSize: 12.5, color: "var(--dim)" }}>No profile activity yet.</div>}
        </Card>
      </Grid>

      <div style={{ fontSize: 11.5, color: "var(--faint)", padding: "4px 4px 0", lineHeight: 1.6 }}>
        Marketplace totals describe one illustrative future-state scenario ({SCENARIO_CAPTION.toLowerCase()}). O'Farrell Sterling was incorporated in June 2026 and Recruit is not yet operating.
      </div>
    </Page>
  );
}

function Tile({ label, value, sub, children }: { label: string; value: string; sub?: string; children?: ReactNode }) {
  return (
    <div style={{ padding: "12px 13px", borderRadius: "var(--r-sm, 12px)", background: "var(--surface-2)", border: "1px solid var(--border)", minWidth: 0 }}>
      <Label style={{ fontSize: 8.5 }}>{label}</Label>
      <div className="rc-row" style={{ marginTop: 7, gap: 8, alignItems: "flex-end", justifyContent: "space-between" }}>
        <span style={{ fontSize: 21, fontWeight: 600, letterSpacing: "-.6px", lineHeight: 1 }}>{value}</span>
        {children}
      </div>
      {sub && <div className="rc-ellipsis" style={{ fontSize: 11, color: "var(--faint)", marginTop: 6 }}>{sub}</div>}
    </div>
  );
}
