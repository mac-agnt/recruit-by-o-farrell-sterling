import { useState } from "react";
import { Avatar, Badge, Button, Card, DemoTag, Grid, Label, Note, Page, Slider, Stat, Table, type Col } from "../../ui";
import { BarList } from "../../charts";
import { useNav } from "../../nav";
import { logActivity, notify, openDrawer, setCommissionRate, useRecruit, vacancyById } from "../../store";
import { placementTotals } from "../../selectors";
import { CANDIDATE_BY_ID, EMPLOYER_BY_ID, MARKET, SERIES, type Placement } from "../../data";
import { eur, eurK, num, pct } from "../../format";

/* HQ revenue: success fees on placements. The table shows the sample records
   (including any hire accepted live in the demo); the month's aggregate comes
   from the simulated operating model. The pricing simulator recalculates as
   the sliders move and can set the standard rate used for new placements. */

type Tone = "accent" | "ok" | "warn" | "bad" | "neutral" | "teal";
const INVOICE: Record<Placement["invoice"], { label: string; tone: Tone }> = {
  paid: { label: "Paid", tone: "ok" }, invoiced: { label: "Invoiced", tone: "accent" }, pending: { label: "Due on start", tone: "neutral" }, overdue: { label: "Overdue", tone: "bad" },
};
const rateLabel = (r: number) => { const v = Math.round(r * 1000) / 10; return (Number.isInteger(v) ? v.toFixed(0) : v.toFixed(1)) + "%"; };

export default function Commissions() {
  const s = useRecruit();
  const nav = useNav();
  const totals = placementTotals(s);
  const std = s.commissionRules.find(r => r.id === "cr1");
  const stdRate = std?.rate ?? MARKET.recruitDefaultRate;
  const monthFees = SERIES.successFees[SERIES.successFees.length - 1] * (stdRate / MARKET.recruitDefaultRate);
  const outstanding = s.placements.filter(p => p.invoice !== "paid").reduce((t, p) => t + p.salary * p.feeRate, 0);
  const overdue = s.placements.filter(p => p.invoice === "overdue");
  const sampleThisMonth = s.placements.filter(p => p.date !== "21 Oct").length;

  const [rate, setRate] = useState(stdRate * 100);
  const [salary, setSalary] = useState(MARKET.avgPlacementSalary);
  const n = MARKET.placementsThisMonth;
  const r = rate / 100;
  const feePer = salary * r;
  const agencyPer = salary * MARKET.agencyBenchmarkRate;
  const monthly = n * feePer;
  const saving = n * (agencyPer - feePer);
  const isStandard = Math.abs(r - stdRate) < 0.0001;

  const applyRate = () => {
    if (!std || isStandard) return;
    setCommissionRate(std.id, r);
    logActivity({ category: "financial", actor: "John O'Farrell", title: "Standard success fee changed", detail: "The standard success fee moved from " + rateLabel(stdRate) + " to " + rateLabel(r) + " for new placements (demo setting).", refs: [] });
    notify("Standard success fee set to " + rateLabel(r) + " for new placements", "accent");
  };

  const cols: Col<Placement>[] = [
    { key: "who", label: "Placed professional", width: "minmax(190px, 1.8fr)", render: p => {
      const c = CANDIDATE_BY_ID[p.candidateId];
      const v = vacancyById(p.vacancyId, s);
      return (
        <span className="rc-row" style={{ gap: 10 }}>
          <Avatar initials={c?.initials || "?"} tint={c?.tint} size={30} />
          <span className="rc-grow">
            <span className="rc-ellipsis" style={{ display: "block", fontSize: 13, fontWeight: 500, color: "var(--ink)" }}>{c?.name}</span>
            <span className="rc-ellipsis" style={{ display: "block", fontSize: 11.5, color: "var(--dim)", marginTop: 2 }}>{v?.title}</span>
          </span>
        </span>
      );
    } },
    { key: "emp", label: "Employer", width: "minmax(130px, 1fr)", render: p => (
      <button className="rc-link rc-ellipsis" style={{ maxWidth: "100%", color: "var(--body)" }} onClick={e => { e.stopPropagation(); openDrawer("employer", p.employerId); }}>
        {EMPLOYER_BY_ID[p.employerId]?.short}
      </button>
    ) },
    { key: "sal", label: "Salary", width: "92px", align: "right", render: p => eur(p.salary) },
    { key: "rate", label: "Rate", width: "60px", align: "right", render: p => rateLabel(p.feeRate) },
    { key: "fee", label: "Success fee", width: "100px", align: "right", render: p => <b style={{ fontWeight: 600, color: "var(--ink)" }}>{eur(p.salary * p.feeRate)}</b> },
    { key: "agency", label: "Agency at 25%", width: "104px", align: "right", hideSm: true, render: p => <span style={{ color: "var(--dim)" }}>{eur(p.salary * MARKET.agencyBenchmarkRate)}</span> },
    { key: "save", label: "Employer saves", width: "108px", align: "right", render: p => <span style={{ color: "var(--teal, var(--ok))" }}>{eur(p.salary * (MARKET.agencyBenchmarkRate - p.feeRate))}</span> },
    { key: "inv", label: "Invoice", width: "112px", render: p => <Badge tone={INVOICE[p.invoice].tone}>{INVOICE[p.invoice].label}</Badge> },
    { key: "date", label: "Placed", width: "84px", align: "right", render: p => <span style={{ fontSize: 12, whiteSpace: "nowrap", color: p.date === "Today" ? "var(--teal, var(--ok))" : "var(--faint)" }}>{p.date}</span> },
  ];

  return (
    <Page wide eyebrow="REVENUE" title="Placement commissions"
      sub="Success fees on hires made through Recruit, charged on the start date. Sample records plus the month's simulated aggregate."
      actions={<>
        <DemoTag>Simulated</DemoTag>
        <Button icon="settings" onClick={() => nav.go("Settings", "pricing")}>Commission rules</Button>
      </>}>

      <Grid cols="rc-g4">
        <Stat icon="placement" tone="teal" label="Placements this month" value={num(MARKET.placementsThisMonth)} sub={sampleThisMonth + " sample records, " + totals.extra + " in the aggregate"} />
        <Stat icon="euro" tone="accent" label="Success fees this month" value={eur(monthFees)} sub={num(MARKET.placementsThisMonth) + " x " + eur(MARKET.avgPlacementSalary) + " x " + rateLabel(stdRate)} />
        <Stat icon="file" label="Sample fees recorded" value={eur(totals.fees)} sub={"Saving employers " + eurK(totals.saving) + " vs 25%"} />
        <Stat icon="clock" tone={overdue.length ? "warn" : undefined} label="Outstanding" value={eur(outstanding)}
          delta={overdue.length ? overdue.length + " overdue" : "None overdue"} deltaTone={overdue.length ? "bad" : "ok"} />
      </Grid>

      <Table cols={cols} rows={s.placements} onRow={p => openDrawer("candidate", p.candidateId)}
        caption={"Fee = salary x success fee rate. The agency comparison uses a 25% benchmark. The other " + totals.extra + " placements this month sit in the simulated aggregate."} />

      <Grid cols="rc-g-1-2">
        <Card title="Commission rules" sub="Rates applied to new placements" action={<Button size="sm" variant="ghost" iconRight="arrowRight" onClick={() => nav.go("Settings", "pricing")}>Edit</Button>}>
          {s.commissionRules.map((c, i) => (
            <div key={c.id} className="rc-row" style={{ alignItems: "flex-start", gap: 12, padding: "11px 0", borderTop: i ? "1px solid var(--border)" : 0 }}>
              <div className="rc-grow">
                <div className="rc-row" style={{ gap: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 500, color: "var(--ink)" }}>{c.label}</span>
                  {i === 0 ? <Badge tone="teal">Standard</Badge> : /concept/i.test(c.note) ? <Badge tone="warn">Concept</Badge> : <Badge tone="neutral">Proposed</Badge>}
                </div>
                <div style={{ fontSize: 12, color: "var(--dim)", marginTop: 3 }}>{c.applies}. {c.note}.</div>
              </div>
              <span style={{ fontSize: 20, fontWeight: 600, letterSpacing: "-.6px", fontVariantNumeric: "tabular-nums" }}>{rateLabel(c.rate)}</span>
            </div>
          ))}
        </Card>

        <Card title="Pricing simulator" sub={"Move the rate and the average salary. Based on " + num(n) + " placements a month against a 25% agency fee."}
          action={<DemoTag>Live estimate</DemoTag>}>
          <div className="rc-grid rc-g2" style={{ gap: 22 }}>
            <div className="rc-col" style={{ gap: 18 }}>
              <Slider label="Recruit success fee" value={rate} min={5} max={12} step={0.5} onChange={setRate} display={rateLabel(r)} />
              <Slider label="Average placement salary" value={salary} min={30000} max={150000} step={1000} onChange={setSalary} display={eur(salary)} />
              <BarList max={agencyPer} items={[
                { label: "Agency fee per hire", value: agencyPer, display: eur(agencyPer), color: "var(--warn)" },
                { label: "Recruit fee per hire", value: feePer, display: eur(feePer), color: "var(--teal, #16B8A6)" },
              ]} />
            </div>
            <div className="rc-col" style={{ gap: 10 }}>
              <Result label="Monthly fee revenue" value={eur(monthly)} sub={eur(monthly * 12) + " a year at this pace"} />
              <Result label="Employer saving each month" value={eur(saving)} sub={pct(1 - r / MARKET.agencyBenchmarkRate) + " less than the agency fee"} accent />
              <Result label="Saving per hire" value={eur(agencyPer - feePer)} sub={"On a " + eurK(salary) + " salary"} />
            </div>
          </div>
          <div className="rc-row rc-wrap" style={{ gap: 8, marginTop: 16 }}>
            <span className="rc-grow" style={{ fontSize: 12, color: "var(--dim)" }}>Standard rate today: <b style={{ color: "var(--ink)", fontWeight: 600 }}>{rateLabel(stdRate)}</b>. Changing it affects new placements only.</span>
            <Button size="sm" variant="ghost" onClick={() => { setRate(stdRate * 100); setSalary(MARKET.avgPlacementSalary); }}>Reset</Button>
            <Button size="sm" variant="primary" icon="check" disabled={isStandard} onClick={applyRate}>Use {rateLabel(r)} as standard</Button>
          </div>
          <Note style={{ marginTop: 12 }}>Illustrative arithmetic, not a forecast or a measured result. Membership fees are not included.</Note>
        </Card>
      </Grid>
    </Page>
  );
}

function Result({ label, value, sub, accent }: { label: string; value: string; sub: string; accent?: boolean }) {
  return (
    <div style={{ padding: "12px 14px", borderRadius: "var(--r-sm, 12px)", minWidth: 0,
      background: accent ? "var(--teal-soft, var(--ok-soft))" : "var(--surface-2)", border: "1px solid " + (accent ? "color-mix(in oklab, var(--teal, var(--ok)) 35%, transparent)" : "var(--border)") }}>
      <Label style={{ fontSize: 8.5 }}>{label}</Label>
      <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: "-.8px", marginTop: 6, fontVariantNumeric: "tabular-nums", color: accent ? "var(--teal, var(--ok))" : "var(--ink)" }}>{value}</div>
      <div style={{ fontSize: 11.5, color: "var(--dim)", marginTop: 4 }}>{sub}</div>
    </div>
  );
}
