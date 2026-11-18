import { useMemo, useState } from "react";
import { Avatar, Badge, Button, Card, DemoTag, Empty, Grid, Note, Page, Segmented, Stat, Table, type Col } from "../../ui";
import { BarChart, BarList } from "../../charts";
import { Icon } from "../../icons";
import { useNav } from "../../nav";
import { allVacancies, logActivity, notify, openDrawer, update, useRecruit } from "../../store";
import { placementTotals } from "../../selectors";
import { CANDIDATE_BY_ID, EMPLOYER_BY_ID, MARKET, MONTHS, SCENARIO_CAPTION, SERIES, SUPPORT_TICKETS, placementEconomics } from "../../data";
import type { Placement } from "../../data/types";
import { eur, eurK, num } from "../../format";

/* Recruit HQ, Placements: the sample placement records (plus live ones when
   a candidate accepts an offer in the demo), their success fees and
   invoices. Invoice actions update the shared store, so revenue views and
   the employer drawer agree. The month's marketplace economics are the
   illustrative scenario from data/metrics.ts. */

type Tone = "accent" | "ok" | "warn" | "bad" | "neutral" | "teal";
type View = "all" | Placement["invoice"];

const ACTOR = "John O'Farrell";
const INVOICE_TONE: Record<Placement["invoice"], Tone> = { paid: "ok", invoiced: "accent", pending: "neutral", overdue: "bad" };
const INVOICE_RANK: Record<Placement["invoice"], number> = { overdue: 0, pending: 1, invoiced: 2, paid: 3 };
const LAST_MONTH = "21 Oct";
const cap = (x: string) => x.charAt(0).toUpperCase() + x.slice(1);
const fee = (p: Placement) => p.salary * p.feeRate;
const pctLabel = (r: number) => Math.round(r * 1000) / 10 + "%";

export default function Placements() {
  const s = useRecruit();
  const nav = useNav();
  const [view, setView] = useState<View>("all");
  const vacs = useMemo(() => allVacancies(s), [s]);
  const rate = s.commissionRules[0]?.rate ?? MARKET.recruitDefaultRate;
  const econ = placementEconomics(MARKET.placementsThisMonth, MARKET.avgPlacementSalary, MARKET.agencyBenchmarkRate, rate);
  const tot = placementTotals(s);
  const thisMonth = s.placements.filter(p => p.date !== LAST_MONTH);
  const earlier = s.placements.length - thisMonth.length;
  const rows = s.placements.filter(p => view === "all" || p.invoice === view)
    .slice().sort((a, b) => Number(b.date === "Today") - Number(a.date === "Today") || INVOICE_RANK[a.invoice] - INVOICE_RANK[b.invoice]);
  const toAction = s.placements.filter(p => p.invoice !== "paid").sort((a, b) => INVOICE_RANK[a.invoice] - INVOICE_RANK[b.invoice]);
  const outstanding = toAction.reduce((t, p) => t + fee(p), 0);
  const overdue = s.placements.filter(p => p.invoice === "overdue");
  const roleOf = (p: Placement) => vacs.find(v => v.id === p.vacancyId)?.title || "Placement";
  const ruleOf = (r: number) => s.commissionRules.find(x => Math.abs(x.rate - r) < 0.0001 && x.id !== "cr4")?.label || "Agreed rate";
  const reminders = (id: string) => s.activity.filter(ev => ev.refs[0] === id && ev.title === "Payment reminder sent").length;

  const setInvoice = (p: Placement, invoice: Placement["invoice"]) =>
    update(st => ({ placements: st.placements.map(x => (x.id === p.id ? { ...x, invoice } : x)) }));
  const raise = (p: Placement) => {
    const e = EMPLOYER_BY_ID[p.employerId];
    setInvoice(p, "invoiced");
    logActivity({ category: "financial", actor: ACTOR, title: "Success fee invoiced", refs: [p.id, p.employerId],
      detail: eur(fee(p)) + " invoiced to " + (e?.name || "the employer") + " for the " + roleOf(p) + " placement (" + pctLabel(p.feeRate) + "). Simulated, no payment system connected." });
    notify("Invoice raised: " + eur(fee(p)) + " to " + (e?.short || "the employer") + " (simulated)");
  };
  const remind = (p: Placement) => {
    const e = EMPLOYER_BY_ID[p.employerId];
    logActivity({ category: "financial", actor: ACTOR, title: "Payment reminder sent", refs: [p.id, p.employerId], status: "awaiting",
      detail: "Reminder sent to " + (e?.name || "the employer") + " for the overdue " + eur(fee(p)) + " success fee (" + roleOf(p) + "). Demo only, no email sent." });
    notify("Payment reminder sent to " + (e?.short || "the employer") + " (demo, no email sent)", "accent");
  };
  const markPaid = (p: Placement) => {
    const e = EMPLOYER_BY_ID[p.employerId];
    setInvoice(p, "paid");
    logActivity({ category: "financial", actor: ACTOR, title: "Placement fee paid", refs: [p.id, p.employerId],
      detail: (e?.name || "The employer") + " paid " + eur(fee(p)) + " for the " + roleOf(p) + " placement. Recorded by " + ACTOR + " (simulated, no payment processed)." });
    notify("Payment recorded: " + eur(fee(p)) + " from " + (e?.short || "the employer"));
  };

  const cols: Col<Placement>[] = [
    { key: "cand", label: "Candidate", width: "minmax(180px, 1.5fr)", render: p => {
      const c = CANDIDATE_BY_ID[p.candidateId];
      return (
        <div className="rc-row" style={{ gap: 9 }}>
          <Avatar initials={c?.initials || "?"} tint={c?.tint} size={28} />
          <div className="rc-grow">
            <button className="rc-link rc-ellipsis" style={{ display: "block", maxWidth: "100%", textAlign: "left", fontWeight: 500 }} onClick={() => openDrawer("candidate", p.candidateId, { from: "hq" })}>{c?.name}</button>
            {p.date === "Today" && <Badge tone="teal" style={{ height: 18, fontSize: 10, padding: "0 6px", marginTop: 3 }}>Live in demo</Badge>}
          </div>
        </div>
      );
    } },
    { key: "emp", label: "Employer", width: "minmax(150px, 1.3fr)", render: p => (
      <button className="rc-link rc-ellipsis" style={{ display: "block", maxWidth: "100%", textAlign: "left" }} onClick={() => openDrawer("employer", p.employerId)}>{EMPLOYER_BY_ID[p.employerId]?.name}</button>
    ) },
    { key: "role", label: "Vacancy", width: "minmax(170px, 1.5fr)", render: p => (
      <button className="rc-link rc-ellipsis" style={{ display: "block", maxWidth: "100%", textAlign: "left", color: "var(--body)" }} onClick={() => openDrawer("vacancy", p.vacancyId)}>{roleOf(p)}</button>
    ) },
    { key: "sal", label: "Final salary", width: "104px", align: "right", render: p => <span style={{ fontVariantNumeric: "tabular-nums", color: "var(--ink)" }}>{eur(p.salary)}</span> },
    { key: "rate", label: "Fee rate", width: "112px", render: p => (
      <div>
        <div style={{ fontVariantNumeric: "tabular-nums" }}>{pctLabel(p.feeRate)}</div>
        <div className="rc-ellipsis" style={{ fontSize: 10.5, color: "var(--faint)", marginTop: 2 }}>{ruleOf(p.feeRate)}</div>
      </div>
    ) },
    { key: "fee", label: "Fee", width: "92px", align: "right", render: p => <span style={{ fontWeight: 600, color: "var(--ink)", fontVariantNumeric: "tabular-nums" }}>{eur(fee(p))}</span> },
    { key: "dates", label: "Placed, starts", width: "120px", render: p => (
      <div>
        <div>{p.date}</div>
        <div style={{ fontSize: 11, color: "var(--faint)", marginTop: 2 }}>starts {p.startDate}</div>
      </div>
    ) },
    { key: "inv", label: "Invoice", width: "104px", render: p => <Badge tone={INVOICE_TONE[p.invoice]}>{cap(p.invoice)}</Badge> },
  ];

  return (
    <Page wide eyebrow="RECRUIT HQ · ROLES AND PLACEMENTS" title="Placements and success fees"
      sub={"Showing " + thisMonth.length + " of " + MARKET.placementsThisMonth + " placements this month (sample records)" + (earlier ? ", plus " + earlier + " from October" : "") + ". Marketplace totals are illustrative."}
      actions={<>
        <Button icon="offers" onClick={() => nav.setTab("offers")}>Offers</Button>
        <Button variant="primary" icon="revenue" onClick={() => nav.go("hq.revenue", "commissions")}>Commissions</Button>
      </>}>

      <Grid cols="rc-g4">
        <Stat icon="placement" tone="accent" label="Placements this month" value={num(MARKET.placementsThisMonth)} sub={thisMonth.length + " sample records below"} />
        <Stat icon="euro" tone="teal" label="Success fees this month" value={eur(econ.recruitFees)} sub={econ.placements + " x " + eur(econ.avgSalary) + " x " + pctLabel(econ.recruitRate) + ", illustrative"} />
        <Stat icon="file" label="Sample fees" value={eur(tot.fees)} sub={tot.count + " sample placements, " + eur(s.placements.reduce((t, p) => t + p.salary, 0)) + " in salaries"} />
        <Stat icon="alert" tone={overdue.length ? "bad" : "ok"} label="Outstanding (sample)" value={eur(outstanding)} sub={overdue.length ? overdue.length + " overdue invoice" + (overdue.length > 1 ? "s" : "") : "nothing overdue"} onClick={() => setView(overdue.length ? "overdue" : "pending")} />
      </Grid>

      <Grid cols="rc-g-3-2">
        <Card title="Invoices to action" sub="Sample placements not yet paid. Actions update the shared records and the activity log."
          action={<Badge tone={toAction.length ? "warn" : "ok"}>{toAction.length} open</Badge>}>
          {toAction.map((p, i) => {
            const e = EMPLOYER_BY_ID[p.employerId];
            const c = CANDIDATE_BY_ID[p.candidateId];
            const ticket = p.invoice === "overdue" ? SUPPORT_TICKETS.find(t => t.employerId === p.employerId && /invoice/i.test(t.subject)) : undefined;
            const n = reminders(p.id);
            return (
              <div key={p.id} style={{ padding: "12px 0", borderTop: i ? "1px solid var(--border)" : 0 }}>
                <div className="rc-row" style={{ gap: 10, alignItems: "flex-start" }}>
                  <Avatar initials={e?.initials || "?"} tint={e?.tint} size={32} square />
                  <div className="rc-grow">
                    <div className="rc-row rc-wrap" style={{ gap: 7 }}>
                      <span style={{ fontSize: 13.5, fontWeight: 500, color: "var(--ink)" }}>{e?.name}</span>
                      <Badge tone={INVOICE_TONE[p.invoice]}>{p.invoice === "pending" ? "Not invoiced" : cap(p.invoice)}</Badge>
                    </div>
                    <div style={{ fontSize: 12, color: "var(--dim)", marginTop: 4, lineHeight: 1.5 }}>
                      {roleOf(p)}, {c?.name}. {eur(fee(p))} at {pctLabel(p.feeRate)} of {eur(p.salary)}. Placed {p.date}, starts {p.startDate}.
                      {ticket ? " Support ticket open with " + ticket.owner + " (" + ticket.status.toLowerCase() + ", " + ticket.age + ")." : ""}
                      {n ? " " + n + (n === 1 ? " reminder" : " reminders") + " sent." : ""}
                    </div>
                  </div>
                  <span style={{ fontSize: 14, fontWeight: 600, fontVariantNumeric: "tabular-nums", color: p.invoice === "overdue" ? "var(--bad)" : "var(--ink)" }}>{eur(fee(p))}</span>
                </div>
                <div className="rc-row rc-wrap" style={{ gap: 8, marginTop: 10, paddingLeft: 42 }}>
                  {p.invoice === "pending" && <Button size="sm" variant="primary" icon="file" onClick={() => raise(p)}>Raise invoice</Button>}
                  {p.invoice === "overdue" && <Button size="sm" icon="send" onClick={() => remind(p)}>{n ? "Send another reminder" : "Send reminder"}</Button>}
                  {(p.invoice === "overdue" || p.invoice === "invoiced") && <Button size="sm" variant={p.invoice === "invoiced" ? "primary" : "secondary"} icon="check" onClick={() => markPaid(p)}>Record payment</Button>}
                  <Button size="sm" variant="ghost" onClick={() => openDrawer("employer", p.employerId)}>Account</Button>
                </div>
              </div>
            );
          })}
          {!toAction.length && <Empty icon="check" title="Every sample invoice is paid" body="New placements appear here when a candidate accepts an offer." />}
        </Card>

        <div className="rc-col" style={{ gap: 14 }}>
          <Card title="This month across the marketplace" sub={econ.placements + " placements at an average salary of " + eur(econ.avgSalary)} action={<DemoTag />}>
            <BarList items={[
              { label: "Agency fees at " + pctLabel(econ.agencyRate), value: econ.agencyFees, display: eur(econ.agencyFees), color: "var(--faint)" },
              { label: "Recruit success fees at " + pctLabel(econ.recruitRate), value: econ.recruitFees, display: eur(econ.recruitFees), color: "var(--accent)" },
            ]} />
            <div className="rc-row" style={{ gap: 10, marginTop: 16, padding: "12px 13px", borderRadius: "var(--r-sm, 12px)", background: "var(--ok-soft)", border: "1px solid color-mix(in oklab, var(--ok) 35%, transparent)" }}>
              <Icon name="trendDown" size={16} color="var(--ok)" />
              <div className="rc-grow" style={{ fontSize: 12.5, color: "var(--body)", lineHeight: 1.45 }}>
                Employers save an estimated <b style={{ color: "var(--ink)" }}>{eur(econ.saving)}</b> this month against a {pctLabel(econ.agencyRate)} agency fee.
              </div>
            </div>
            <div style={{ fontSize: 11.5, color: "var(--faint)", marginTop: 10, lineHeight: 1.5 }}>
              The sample records alone: {eur(tot.fees)} in fees against {eur(tot.agency)} at agency rates, a saving of {eur(tot.saving)}.
            </div>
          </Card>
          <Card title="Success fees by month" sub={SCENARIO_CAPTION} action={<DemoTag />}>
            <BarChart data={MONTHS.map((m, i) => ({ label: m, value: SERIES.successFees[i] }))} height={170} yFormat={v => eurK(v)} />
          </Card>
        </div>
      </Grid>

      <div className="rc-row rc-wrap" style={{ gap: 10, padding: "4px 4px 0" }}>
        <Segmented size="sm" value={view} onChange={setView} options={[
          { id: "all", label: "All " + s.placements.length },
          { id: "paid", label: "Paid " + s.placements.filter(p => p.invoice === "paid").length },
          { id: "invoiced", label: "Invoiced " + s.placements.filter(p => p.invoice === "invoiced").length },
          { id: "pending", label: "Pending " + s.placements.filter(p => p.invoice === "pending").length },
          { id: "overdue", label: "Overdue " + overdue.length },
        ]} />
      </div>
      <Table cols={cols} rows={rows}
        empty={<Empty icon="placement" title="No placements in this view" action={<Button size="sm" onClick={() => setView("all")}>Show all</Button>} />}
        caption={"Showing " + thisMonth.length + " of " + MARKET.placementsThisMonth + " placements this month (sample records)" + (earlier ? ", plus " + earlier + " from October" : "")
          + ". Totals: " + eur(s.placements.reduce((t, p) => t + p.salary, 0)) + " in salaries, " + eur(tot.fees) + " in fees. Select a name, employer or vacancy to open it."} />

      <Note icon="info">
        Fees fall due on the start date. No payments are taken or processed in this demo; payment processing is not connected.
      </Note>
    </Page>
  );
}
