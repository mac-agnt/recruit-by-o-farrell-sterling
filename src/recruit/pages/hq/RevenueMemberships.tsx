import { useState } from "react";
import { Avatar, Badge, Button, Card, DemoTag, Grid, Label, Page, Slider, Stat, Table, type Col } from "../../ui";
import { BarChart, Donut, Legend, LineChart, SERIES_COLORS } from "../../charts";
import { Icon } from "../../icons";
import { useNav } from "../../nav";
import { openDrawer, useRecruit } from "../../store";
import { membershipTotals } from "../../selectors";
import { EMPLOYERS, MONTHS, RECRUIT_AGENTS, SCENARIO_CAPTION, SERIES, TIERS, membershipRevenue, type Tier } from "../../data";
import { eur, eurK, eurM, num, pct } from "../../format";

/* HQ revenue: employer memberships by tier, the ARR trend and an illustrative
   renewal forecast. Prices follow Settings > Pricing; tiers 3 and 4 are
   concept assumptions, the rest came from the founder. */

interface TierRow { t: Tier; revenue: number; share: number }

export default function RevenueMemberships() {
  const s = useRecruit();
  const nav = useNav();
  const mt = membershipTotals(s);
  const avg = mt.revenue / (mt.accounts || 1);
  const mScale = mt.revenue / membershipRevenue(TIERS);
  const arr = SERIES.membershipMrr.map(v => v * 12 * mScale);
  const last = arr.length - 1;
  const growth = arr[last] / arr[0] - 1;
  const newThisMonth = SERIES.employers[last] - SERIES.employers[last - 1];

  const rows: TierRow[] = s.tiers.map(t => ({ t, revenue: t.price * t.accounts, share: (t.price * t.accounts) / (mt.revenue || 1) }));

  /* Renewal model: annual memberships renew on their anniversary. Accounts that
     were members at the start of the scenario year are spread evenly; accounts
     that joined since renew in the month they joined. */
  const atRisk = EMPLOYERS.filter(e => e.health === "at risk").length;
  const [churn, setChurn] = useState(Math.round((atRisk / EMPLOYERS.length) * 100));
  const base = SERIES.employers[0];
  const due = MONTHS.map((_, i) => base / 12 + (i ? SERIES.employers[i] - SERIES.employers[i - 1] : 0));
  const expected = due.map(d => Math.round(d * (1 - churn / 100)));
  const totalDue = Math.round(due.reduce((t, d) => t + d, 0));
  const totalExpected = expected.reduce((t, d) => t + d, 0);
  const opsText = RECRUIT_AGENTS.find(a => a.id === "ops")?.recommendations.find(r => /membership/i.test(r.text))?.text || "";
  const flagged = Number((opsText.match(/\d+/) || ["0"])[0]);
  const dueSoon = EMPLOYERS.filter(e => e.membershipStatus === "renewal due");

  const cols: Col<TierRow>[] = [
    { key: "tier", label: "Tier", width: "minmax(170px, 1.6fr)", render: r => (
      <div>
        <div style={{ fontSize: 13.5, fontWeight: 500, color: "var(--ink)" }}>{r.t.label}</div>
        <div style={{ fontSize: 11.5, color: "var(--dim)", marginTop: 2 }}>{r.t.band}</div>
      </div>
    ) },
    { key: "price", label: "Price a year", width: "190px", render: r => (
      <span className="rc-row" style={{ gap: 8 }}>
        <b style={{ fontWeight: 600, color: "var(--ink)" }}>{eur(r.t.price)}</b>
        {r.t.confirmed ? <Badge tone="teal">Founder-provided</Badge> : <Badge tone="warn">Concept</Badge>}
      </span>
    ) },
    { key: "acc", label: "Accounts", width: "92px", align: "right", render: r => num(r.t.accounts) },
    { key: "rev", label: "Revenue", width: "118px", align: "right", render: r => eur(r.revenue) },
    { key: "share", label: "Share", width: "150px", render: r => (
      <div className="rc-row" style={{ gap: 10 }}>
        <div className="rc-grow" style={{ height: 6, borderRadius: 999, background: "var(--track)", overflow: "hidden" }}>
          <div style={{ width: r.share * 100 + "%", height: "100%", borderRadius: 999, background: SERIES_COLORS[(r.t.id - 1) % SERIES_COLORS.length], transition: "width .5s var(--ease)" }} />
        </div>
        <span style={{ width: 40, textAlign: "right", fontSize: 12.5 }}>{pct(r.share)}</span>
      </div>
    ) },
  ];

  return (
    <Page wide eyebrow="REVENUE" title="Membership revenue"
      sub="Annual employer memberships across five tiers, simulated at current prices. Tiers 3 and 4 are concept assumptions; tiers 1, 2 and 5 came from the founder."
      actions={<>
        <DemoTag>Simulated</DemoTag>
        <Button icon="settings" onClick={() => nav.go("Settings", "pricing")}>Edit prices</Button>
      </>}>

      <Grid cols="rc-g4">
        <Stat icon="revenue" tone="accent" label="Annualised membership revenue" value={eur(mt.revenue)} sub="Simulated, current prices" />
        <Stat icon="employer" label="Employer accounts" value={num(mt.accounts)} delta={"+" + num(newThisMonth) + " this month"} />
        <Stat icon="euro" label="Average membership" value={eur(avg)} sub="Per account, per year" />
        <Stat icon="trendUp" tone="teal" label="ARR growth this scenario year" value={"+" + pct(growth)} sub={"From " + eurK(arr[0]) + " in " + MONTHS[0]} />
      </Grid>

      <Grid cols="rc-g-3-2">
        <Table cols={cols} rows={rows}
          caption={<span className="rc-row rc-wrap" style={{ gap: 10 }}>
            <span className="rc-grow">Tiers 3 and 4 (101-250 and 251-500 employees) are concept assumptions for the demo. Prices are editable in Settings.</span>
            <button className="rc-link" onClick={() => nav.go("Settings", "pricing")}>Open pricing</button>
          </span>} />
        <Card title="Revenue by tier" sub="Share of annualised membership revenue">
          <div className="rc-row rc-wrap" style={{ gap: 20, alignItems: "center" }}>
            <Donut size={150} thickness={16} center={eurM(mt.revenue)} sub="a year"
              segments={rows.map(r => ({ label: r.t.label, value: r.revenue, color: SERIES_COLORS[(r.t.id - 1) % SERIES_COLORS.length] }))} />
            <div className="rc-grow" style={{ minWidth: 170 }}>
              <Legend items={rows.map(r => ({ label: r.t.label + (r.t.confirmed ? "" : ", concept"), value: eurK(r.revenue), color: SERIES_COLORS[(r.t.id - 1) % SERIES_COLORS.length] }))} />
            </div>
          </div>
        </Card>
      </Grid>

      <Grid cols="rc-g2">
        <Card title="Annual recurring revenue" sub={SCENARIO_CAPTION + ", monthly membership revenue x 12"} action={<DemoTag />}>
          <div className="rc-row" style={{ alignItems: "baseline", gap: 8 }}>
            <span style={{ fontSize: 28, fontWeight: 600, letterSpacing: "-1px" }}>{eurM(arr[last])}</span>
            <span style={{ fontSize: 12.5, color: "var(--teal, var(--ok))" }}>+{pct(growth)} in the year</span>
          </div>
          <LineChart height={220} labels={MONTHS} yFormat={v => eurM(v)} style={{ marginTop: 12 }}
            series={[{ name: "ARR", values: arr, color: "var(--accent)", area: true }]} />
        </Card>

        <Card title="Renewal forecast" sub="Expected renewals by month next scenario year. Illustrative." action={<DemoTag>Assumption</DemoTag>}>
          <Slider label="Annual churn assumption" value={churn} min={0} max={20} onChange={setChurn} display={churn + "%"} />
          <div style={{ fontSize: 11.5, color: "var(--faint)", marginTop: 6 }}>Default from the sample: {atRisk} of {EMPLOYERS.length} accounts is marked at risk.</div>
          <BarChart height={168} style={{ marginTop: 14 }} highlight={0} color="var(--accent)" yFormat={v => num(v)}
            data={MONTHS.map((m, i) => ({ label: m, value: expected[i] }))} />
          <div className="rc-grid rc-g3" style={{ gap: 10, marginTop: 12 }}>
            <Mini label="Renewals due" value={num(totalDue)} />
            <Mini label="Expected to renew" value={num(totalExpected)} />
            <Mini label="Renewal revenue" value={eurK(totalExpected * avg)} />
          </div>
        </Card>
      </Grid>

      <Card title="Renewals that need a person" sub={flagged ? flagged + " memberships expire in the next 30 days, flagged by Ops Watchdog. Sample accounts below." : "Sample accounts with a renewal due"}
        action={<Button size="sm" variant="ghost" iconRight="arrowRight" onClick={() => nav.go("hq.employers", "memberships")}>All memberships</Button>}>
        <div className="rc-grid rc-g2" style={{ gap: 10 }}>
          {dueSoon.map(e => {
            const t = s.tiers.find(x => x.id === e.tier);
            return (
              <div key={e.id} className="rc-row rc-rowhover" onClick={() => openDrawer("employer", e.id)}
                style={{ gap: 12, padding: "12px 14px", borderRadius: "var(--r-sm, 12px)", border: "1px solid var(--border)", background: "var(--surface-2)" }}>
                <Avatar initials={e.initials} tint={e.tint} size={34} square />
                <div className="rc-grow">
                  <div className="rc-ellipsis" style={{ fontSize: 13.5, fontWeight: 500 }}>{e.name}</div>
                  <div className="rc-ellipsis" style={{ fontSize: 12, color: "var(--dim)", marginTop: 2 }}>{t?.label} tier, {eur(t?.price || 0)} a year. Renews {e.renewal}.</div>
                  <div className="rc-ellipsis" style={{ fontSize: 11.5, color: "var(--faint)", marginTop: 2 }}>{e.note}</div>
                </div>
                <Badge tone={e.health === "watch" ? "warn" : "ok"}>{e.health === "watch" ? "Watch" : "Healthy"}</Badge>
                <Icon name="chevronRight" size={14} color="var(--faint)" />
              </div>
            );
          })}
        </div>
      </Card>
    </Page>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ padding: "10px 12px", borderRadius: 14, background: "var(--surface-2)", border: "1px solid var(--border)", minWidth: 0 }}>
      <Label style={{ fontSize: 8.5 }}>{label}</Label>
      <div style={{ fontSize: 17, fontWeight: 600, letterSpacing: "-.4px", marginTop: 5 }}>{value}</div>
    </div>
  );
}
