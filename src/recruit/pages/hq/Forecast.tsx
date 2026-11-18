import { useMemo, useState } from "react";
import { Badge, Button, Card, DemoTag, Grid, KV, Label, Note, Page, Segmented, Table, type Col } from "../../ui";
import { BarList, LineChart, SERIES_COLORS, StackBar } from "../../charts";
import { Icon } from "../../icons";
import { useNav } from "../../nav";
import { useRecruit } from "../../store";
import { membershipTotals } from "../../selectors";
import { CAMPAIGNS, LAUNCH_PLAN, REVENUE_SCENARIOS, SERIES, UNIT_ECONOMICS } from "../../data";
import { eur, eurK, eurM, num, pct } from "../../format";

/* HQ revenue: three revenue scenarios and a 24-month path to each. Scenario
   inputs come from data/hq.ts; membership uses the current tier prices.
   Future-state demo forecast, not actual company financial results. */

type Sid = "conservative" | "base" | "ambitious";
const COLOR: Record<Sid, string> = { conservative: SERIES_COLORS[2], base: SERIES_COLORS[0], ambitious: SERIES_COLORS[1] };

/* Year one follows the launch plan (no revenue in months 1 to 3, pilot from
   month 4); year two follows the simulated operating model month by month. */
const totals = SERIES.membershipMrr.map((v, i) => v + SERIES.successFees[i] + SERIES.educationRevenue[i]);
const yearTwo = totals.map(v => v / totals[totals.length - 1]);
const RAMP = Array.from({ length: 24 }, (_, i) => {
  const m = i + 1;
  if (m <= 3) return 0;
  if (m <= 12) return yearTwo[0] * Math.pow((m - 3) / 10, 2);
  return yearTwo[m - 13];
});
const LABELS = RAMP.map((_, i) => "M" + (i + 1));

export default function Forecast() {
  const s = useRecruit();
  const nav = useNav();
  const [sid, setSid] = useState<Sid>("base");
  const mt = membershipTotals(s);
  const avgMembership = mt.revenue / (mt.accounts || 1);

  const model = useMemo(() => REVENUE_SCENARIOS.map(sc => {
    const membership = sc.employers * avgMembership;
    const fees = sc.placements * sc.avgSalary * sc.rate;
    const edu = sc.partnerRevenue;
    const total = membership + fees + edu;
    const monthly = RAMP.map(r => (total / 12) * r);
    return { sc, id: sc.id as Sid, membership, fees, edu, total, monthly, cumulative: monthly.reduce((t, v) => t + v, 0) };
  }), [avgMembership]);
  const cur = model.find(m => m.id === sid) || model[1];

  type Row = { label: string; key: "membership" | "fees" | "edu" | "total" | "cumulative"; strong?: boolean };
  const metricRows: Row[] = [
    { label: "Employer memberships", key: "membership" },
    { label: "Recruitment success fees", key: "fees" },
    { label: "Education partnerships", key: "edu" },
    { label: "Annual revenue at scale", key: "total", strong: true },
    { label: "Revenue over the first 24 months", key: "cumulative" },
  ];
  const cols: Col<Row>[] = [
    { key: "m", label: "Annual figures", width: "minmax(190px, 1.6fr)", render: r => <span style={{ color: r.strong ? "var(--ink)" : "var(--body)", fontWeight: r.strong ? 600 : 400 }}>{r.label}</span> },
    ...model.map(m => ({
      key: m.id, label: <span style={{ color: m.id === sid ? "var(--ink)" : undefined, fontWeight: m.id === sid ? 600 : 500 }}>{m.sc.label}</span>, width: "minmax(110px, 1fr)", align: "right" as const,
      render: (r: Row) => <span style={{ color: m.id === sid ? "var(--ink)" : "var(--dim)", fontWeight: m.id === sid || r.strong ? 600 : 400, fontVariantNumeric: "tabular-nums" }}>{eur(m[r.key])}</span>,
    })),
  ];

  const cps = CAMPAIGNS.filter(c => c.cost > 0).map(c => ({ c, value: c.cost / c.signups })).sort((a, b) => b.value - a.value);
  const phases = LAUNCH_PLAN.map(p => p.phase + " (" + p.window.toLowerCase() + ")").join(", ");

  return (
    <Page wide eyebrow="REVENUE" title="Revenue forecast"
      sub="Three scenarios and the path to each over the first 24 months. Future-state demo forecast, not actual company financial results."
      actions={<>
        <DemoTag>Demo forecast</DemoTag>
        <Button icon="calendar" onClick={() => nav.go("Work", "launch")}>Launch plan</Button>
      </>}>

      <Note tone="warn" icon="alert">
        Future-state demo forecast, not actual company financial results. Scenario inputs are assumptions for discussion; Recruit is not yet operating.
      </Note>

      <Grid cols="rc-g-1-2">
        <Card title="Scenario" sub="Pick one to see its make-up" pad={22}>
          <Segmented size="sm" value={sid} onChange={setSid} options={model.map(m => ({ id: m.id, label: m.sc.label }))} />
          <div style={{ marginTop: 18 }}>
            <Label>Annual revenue at scale</Label>
            <div className="rc-row" style={{ alignItems: "baseline", gap: 8, marginTop: 6 }}>
              <span style={{ fontSize: 34, fontWeight: 600, letterSpacing: "-1.4px", color: "var(--ink)" }}>{eurM(cur.total)}</span>
              <span style={{ fontSize: 12.5, color: "var(--dim)" }}>a year</span>
            </div>
          </div>
          <div style={{ marginTop: 14 }}>
            <StackBar height={12} parts={[
              { label: "Memberships", value: cur.membership, color: SERIES_COLORS[0] },
              { label: "Success fees", value: cur.fees, color: SERIES_COLORS[1] },
              { label: "Education", value: cur.edu, color: SERIES_COLORS[2] },
            ]} />
            <div className="rc-col" style={{ gap: 7, marginTop: 12 }}>
              {[["Memberships", cur.membership, SERIES_COLORS[0]], ["Success fees", cur.fees, SERIES_COLORS[1]], ["Education", cur.edu, SERIES_COLORS[2]]].map(([l, v, c]) => (
                <div key={l as string} className="rc-row" style={{ fontSize: 12.5 }}>
                  <span style={{ width: 9, height: 9, borderRadius: 3, background: c as string }} />
                  <span className="rc-grow" style={{ color: "var(--body)" }}>{l}</span>
                  <span style={{ color: "var(--faint)", fontSize: 11.5 }}>{pct((v as number) / cur.total)}</span>
                  <b style={{ fontWeight: 600, width: 84, textAlign: "right" }}>{(v as number) >= 1e6 ? eurM(v as number) : eurK(v as number)}</b>
                </div>
              ))}
            </div>
          </div>
          <div style={{ marginTop: 16 }}>
            <KV cols={2} items={[
              { k: "Employers", v: num(cur.sc.employers) },
              { k: "Placements a year", v: num(cur.sc.placements) },
              { k: "Average salary", v: eur(cur.sc.avgSalary) },
              { k: "Success fee", v: pct(cur.sc.rate) },
            ]} />
          </div>
        </Card>

        <Card title="24-month forecast" sub="Monthly revenue from launch for each scenario. Hover for values." action={<DemoTag />}>
          <LineChart height={300} labels={LABELS} yFormat={v => eurK(v)}
            series={model.map(m => ({ name: m.sc.label, values: m.monthly, color: COLOR[m.id], dashed: m.id !== sid, area: m.id === sid }))} />
          <div className="rc-row rc-wrap" style={{ gap: 10, marginTop: 14 }}>
            {model.map(m => (
              <button key={m.id} onClick={() => setSid(m.id)} className="rc-card rc-click rc-focus"
                style={{ flex: "1 1 160px", textAlign: "left", padding: "10px 12px", borderRadius: 14, cursor: "pointer", color: "inherit",
                  background: m.id === sid ? "var(--accent-soft)" : "var(--surface-2)", border: "1px solid " + (m.id === sid ? "var(--accent-line)" : "var(--border)") }}>
                <div className="rc-row" style={{ gap: 7, fontSize: 11.5, color: "var(--dim)" }}>
                  <span style={{ width: 8, height: 8, borderRadius: 3, background: COLOR[m.id] }} />{m.sc.label}, first 24 months
                </div>
                <div style={{ fontSize: 18, fontWeight: 600, letterSpacing: "-.5px", marginTop: 5 }}>{eurM(m.cumulative)}</div>
              </button>
            ))}
          </div>
        </Card>
      </Grid>

      <Table cols={cols} rows={metricRows} dense
        caption="Membership = employers x the average membership at current tier prices. Success fees = placements x average salary x success fee rate." />

      <Grid cols="rc-g-3-2">
        <Card title="Unit economics" sub="Concept assumptions behind the scenarios">
          <div className="rc-grid rc-g3" style={{ gap: 10 }}>
            {UNIT_ECONOMICS.map(u => (
              <div key={u.label} style={{ padding: "12px 13px", borderRadius: "var(--r-sm, 12px)", background: "var(--surface-2)", border: "1px solid var(--border)", minWidth: 0 }}>
                <div style={{ fontSize: 11.5, color: "var(--dim)" }}>{u.label}</div>
                <div style={{ fontSize: 21, fontWeight: 600, letterSpacing: "-.6px", marginTop: 6 }}>{u.value}</div>
                <div style={{ fontSize: 11, color: "var(--faint)", marginTop: 5, lineHeight: 1.45 }}>{u.note}</div>
              </div>
            ))}
          </div>
        </Card>
        <Card title="Customer acquisition costs" sub="Cost per sign-up for planned and concept campaigns" action={<Badge tone="neutral">Modelled</Badge>}>
          <BarList items={cps.map(x => ({ label: x.c.name, value: x.value, display: eur(x.value), sub: x.c.channel }))} color="var(--accent)" />
          <div style={{ fontSize: 11.5, color: "var(--faint)", marginTop: 12, lineHeight: 1.5 }}>
            Employer campaigns cost more per sign-up and convert to paid memberships; candidate campaigns build the talent network. The founder network launch carries no paid cost.
          </div>
        </Card>
      </Grid>

      <Card title="Assumptions" sub="What the forecast takes as given">
        <div className="rc-grid rc-g2" style={{ gap: "4px 24px" }}>
          {[
            "Membership revenue uses current tier prices: an average of " + eur(avgMembership) + " across " + num(mt.accounts) + " accounts.",
            "Success fees are placements x average salary x the scenario's success fee rate, charged on the start date.",
            "Education revenue is a concept share from fictional partners. No partnership is signed.",
            "Months follow the launch plan: " + phases + ".",
            "Year one has no revenue before the pilot and ramps to the year-two starting point; year two follows the simulated operating model.",
            "Unconfirmed services (premium campaigns, executive search, coaching) are excluded.",
            "Tiers 3 and 4 are concept prices; tiers 1, 2 and 5 came from the founder.",
            "No figure here is an actual company financial result or a guarantee.",
          ].map(a => (
            <div key={a} className="rc-row" style={{ alignItems: "flex-start", gap: 10, padding: "8px 0" }}>
              <span style={{ color: "var(--accent)", marginTop: 2 }}><Icon name="check" size={13} stroke={2.2} /></span>
              <span style={{ fontSize: 12.5, color: "var(--body)", lineHeight: 1.55 }}>{a}</span>
            </div>
          ))}
        </div>
      </Card>
    </Page>
  );
}
