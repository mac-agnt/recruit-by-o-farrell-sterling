import { useState } from "react";
import { Avatar, Badge, Button, Card, Grid, KV, Label, Modal, Note, Page, Stat, Table, type Col } from "../../ui";
import { StackBar } from "../../charts";
import { Icon } from "../../icons";
import { useNav } from "../../nav";
import { useRecruit, vacancyById } from "../../store";
import { EMPLOYER_BY_ID, EMPLOYER_TEAM, ORG } from "../../data";
import { eur, pct } from "../../format";
import { AGENCY_RATE, FEE_RATE, HV_EARLIER, HV_MEMBERSHIP, lc1, who, yearTotals, type Tone } from "./hiringKit";

/* Billing: a simulated ledger of Harbourview's membership and success-fee
   invoices. No payment processing is connected in the demo. */

interface Invoice {
  id: string; number: string; issued: string; title: string; detail: string; amount: number;
  status: { label: string; tone: Tone }; kind: "membership" | "fee" | "renewal";
  salary?: number; rate?: number; state: "paid" | "open" | "upcoming";
}

export default function Billing() {
  const s = useRecruit();
  const nav = useNav();
  const [view, setView] = useState<Invoice | null>(null);
  const emp = EMPLOYER_BY_ID[s.employerId];
  const finance = EMPLOYER_TEAM.find(m => m.access === "Offer approver") || EMPLOYER_TEAM[0];
  const year = yearTotals(s);
  const plan = s.tiers.find(t => t.id === s.membershipTier);
  const renewal = (emp?.renewal || "12 Jan") + " 2027";

  const live: Invoice[] = year.live.map(p => {
    const v = vacancyById(p.vacancyId, s);
    const w = who(s, s.employerId, p.candidateId);
    const fee = p.salary * p.feeRate;
    const paid = p.invoice === "paid";
    return {
      id: p.id, number: paid || p.invoice === "invoiced" ? "RCT-" + p.id.toUpperCase().slice(-6) : "Not issued", issued: paid || p.invoice === "invoiced" ? p.date : "On start date",
      title: "Success fee: " + (v?.title || "Placement"), detail: w.name + " · " + pct(p.feeRate) + " of " + eur(p.salary) + " · starts " + p.startDate,
      amount: fee, kind: "fee", salary: p.salary, rate: p.feeRate,
      status: paid ? { label: "Paid", tone: "ok" } : p.invoice === "invoiced" ? { label: "Invoiced", tone: "accent" } : p.invoice === "overdue" ? { label: "Overdue", tone: "bad" } : { label: "Due on start date", tone: "warn" },
      state: paid ? "paid" : p.invoice === "pending" ? "upcoming" : "open",
    };
  });
  const earlier: Invoice[] = HV_EARLIER.slice().reverse().map(p => ({
    id: p.id, number: p.invoice, issued: p.invoiced, title: "Success fee: " + p.role, detail: pct(FEE_RATE) + " of " + eur(p.salary) + " · started " + p.start,
    amount: p.salary * FEE_RATE, kind: "fee", salary: p.salary, rate: FEE_RATE,
    status: p.status === "paid" ? { label: p.settled, tone: "ok" } : { label: "Invoiced, " + lc1(p.settled), tone: "accent" },
    state: p.status === "paid" ? "paid" : "open",
  }));
  const membership: Invoice = {
    id: "mem", number: HV_MEMBERSHIP.invoice, issued: HV_MEMBERSHIP.date, title: "Membership: " + HV_MEMBERSHIP.plan, detail: HV_MEMBERSHIP.period,
    amount: HV_MEMBERSHIP.amount, kind: "membership", status: { label: "Paid " + HV_MEMBERSHIP.date, tone: "ok" }, state: "paid",
  };
  const next: Invoice = {
    id: "renewal", number: "Scheduled", issued: renewal, title: "Membership renewal: " + (plan?.label || HV_MEMBERSHIP.plan), detail: (plan?.band || "") + (plan && plan.label !== HV_MEMBERSHIP.plan ? " · plan change previewed" : ""),
    amount: plan?.price ?? HV_MEMBERSHIP.amount, kind: "renewal", status: { label: "Renews " + (emp?.renewal || "12 Jan"), tone: "neutral" }, state: "upcoming",
  };
  const rows = [next].concat(live, earlier, [membership]);
  const ledger = rows.filter(r => r.kind !== "renewal");
  const billed = ledger.filter(r => r.state !== "upcoming").reduce((t, r) => t + r.amount, 0);
  const paid = ledger.filter(r => r.state === "paid").reduce((t, r) => t + r.amount, 0);
  const open = ledger.filter(r => r.state === "open").reduce((t, r) => t + r.amount, 0);
  const dueOnStart = ledger.filter(r => r.state === "upcoming").reduce((t, r) => t + r.amount, 0);
  const openRow = ledger.find(r => r.state === "open");

  const cols: Col<Invoice>[] = [
    { key: "no", label: "Invoice", width: "1fr", render: r => (
      <div>
        <div style={{ fontFamily: "var(--mono)", fontSize: 12, color: r.kind === "renewal" || r.number === "Not issued" ? "var(--faint)" : "var(--ink)" }}>{r.number}</div>
        <div style={{ fontSize: 11.5, color: "var(--faint)", marginTop: 2 }}>{r.issued}</div>
      </div>
    ) },
    { key: "desc", label: "Description", width: "2fr", render: r => (
      <div style={{ minWidth: 0 }}>
        <div style={{ color: "var(--ink)", fontWeight: 500, lineHeight: 1.35 }}>{r.title}</div>
        <div className="rc-ellipsis" style={{ fontSize: 12, color: "var(--dim)", marginTop: 2 }}>{r.detail}</div>
      </div>
    ) },
    { key: "amt", label: "Amount", width: ".8fr", align: "right", render: r => <span style={{ fontVariantNumeric: "tabular-nums", fontWeight: 600, color: r.kind === "renewal" ? "var(--dim)" : "var(--ink)" }}>{eur(r.amount)}</span> },
    { key: "st", label: "Status", width: "1.1fr", align: "right", render: r => <Badge tone={r.status.tone}>{r.status.label}</Badge> },
    { key: "act", label: "", width: ".6fr", align: "right", render: r => <Button size="sm" variant="ghost" onClick={e => { e.stopPropagation(); setView(r); }}>View</Button> },
  ];

  return (
    <Page wide eyebrow="COSTS AND MEMBERSHIP" title="Billing"
      sub="Membership and success-fee invoices for this membership year, and what they saved against agency rates."
      actions={<>
        <Button icon="placement" onClick={() => nav.go("emp.hiring", "placements")}>Placements</Button>
        <Button variant="primary" icon="costs" onClick={() => nav.go("emp.costs", "membership")}>Membership</Button>
      </>}>

      <Note tone="warn" icon="lock">
        <b style={{ fontWeight: 600, color: "var(--ink)" }}>Demo: no payment processing is connected.</b> Invoices here are simulated from demo data and nothing is charged.
      </Note>

      <Grid cols="rc-g4">
        <Stat icon="file" label="Billed this year" value={eur(billed)} sub="Membership and success fees" />
        <Stat icon="check" tone="ok" label="Paid" value={eur(paid)} sub={ledger.filter(r => r.state === "paid").length + " invoices settled"} />
        <Stat icon="clock" tone="warn" label="Outstanding" value={eur(open)} sub={openRow ? openRow.status.label : dueOnStart ? eur(dueOnStart) + " due on a start date" : "Nothing outstanding"} />
        <Stat icon="trendUp" tone="teal" label="Saved against agency fees" value={eur(year.net)} sub="After membership, at a 25% benchmark" />
      </Grid>

      <Grid cols="rc-g-side-r">
        <div style={{ alignSelf: "start", minWidth: 0 }}>
        <Table cols={cols} rows={rows} onRow={r => setView(r)}
          caption={"Billed " + eur(billed) + " · paid " + eur(paid) + " · outstanding " + eur(open) + (dueOnStart ? " · " + eur(dueOnStart) + " due on start dates" : "") + ". Simulated invoices."} />
        </div>

        <div className="rc-col" style={{ gap: 14 }}>
          <Card title="Against a 25% agency" sub={year.count + " hires, " + eur(year.salaries) + " in salaries"}>
            <div className="rc-col" style={{ gap: 12 }}>
              <div>
                <div className="rc-row" style={{ fontSize: 12.5 }}><span className="rc-grow" style={{ color: "var(--dim)" }}>Agency equivalent</span><b style={{ fontWeight: 600 }}>{eur(year.agency)}</b></div>
                <div style={{ height: 10, borderRadius: 999, background: "color-mix(in oklab, var(--warn) 75%, var(--surface))", marginTop: 6 }} />
              </div>
              <div>
                <div className="rc-row" style={{ fontSize: 12.5 }}><span className="rc-grow" style={{ color: "var(--dim)" }}>Recruit fees and membership</span><b style={{ fontWeight: 600 }}>{eur(year.fees + HV_MEMBERSHIP.amount)}</b></div>
                <div style={{ marginTop: 6 }}>
                  <StackBar height={10} total={year.agency} parts={[
                    { label: "Success fees", value: year.fees, color: "var(--accent)" },
                    { label: "Membership", value: HV_MEMBERSHIP.amount, color: "var(--teal, #16B8A6)" },
                  ]} />
                </div>
              </div>
            </div>
            <div style={{ marginTop: 16, paddingTop: 14, borderTop: "1px solid var(--border)" }}>
              <div style={{ fontSize: 26, fontWeight: 600, letterSpacing: "-.8px", color: "var(--teal, var(--ok))", fontVariantNumeric: "tabular-nums" }}>{eur(year.net)}</div>
              <div style={{ fontSize: 12, color: "var(--dim)", marginTop: 3 }}>estimated saved this year (illustrative)</div>
            </div>
          </Card>

          <Card title="Payment details">
            <div className="rc-col" style={{ gap: 12 }}>
              <div className="rc-row" style={{ gap: 10 }}>
                <span style={{ width: 32, height: 32, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--dim)" }}><Icon name="lock" size={14} /></span>
                <div className="rc-grow">
                  <div style={{ fontSize: 13, color: "var(--ink)" }}>Payment method</div>
                  <div style={{ fontSize: 12, color: "var(--dim)", marginTop: 2 }}>No card or bank details are stored</div>
                </div>
                <Badge>Not connected</Badge>
              </div>
              <div className="rc-row" style={{ gap: 10 }}>
                <Avatar initials={finance.initials} tint={finance.tint} size={32} />
                <div className="rc-grow">
                  <div style={{ fontSize: 13, color: "var(--ink)" }}>Invoices go to {finance.name}</div>
                  <div style={{ fontSize: 12, color: "var(--dim)", marginTop: 2 }}>{finance.role}, {emp?.short}</div>
                </div>
              </div>
              <div style={{ fontSize: 12, color: "var(--faint)", lineHeight: 1.5 }}>Success fees are invoiced on each hire's start date with 30-day terms. Membership is billed yearly on {emp?.renewal || "12 Jan"}.</div>
            </div>
          </Card>
        </div>
      </Grid>

      <Modal open={!!view} onClose={() => setView(null)} width={620}
        title={view ? (view.kind === "renewal" ? "Upcoming renewal" : view.number === "Not issued" ? "Fee due on the start date" : "Invoice " + view.number) : ""}
        sub={view ? view.title : undefined}
        footer={<>
          <span style={{ marginRight: "auto", fontSize: 12, color: "var(--faint)" }}>Demo: no payment processing is connected.</span>
          <Button variant="primary" onClick={() => setView(null)}>Close</Button>
        </>}>
        {view && (
          <div className="rc-col" style={{ gap: 16 }}>
            <div className="rc-grid rc-g2" style={{ gap: 12 }}>
              <div>
                <Label>From</Label>
                <div style={{ fontSize: 13, marginTop: 6, color: "var(--ink)" }}>Recruit by O'Farrell Sterling</div>
                <div style={{ fontSize: 12, color: "var(--dim)", marginTop: 2 }}>{ORG.legalName}, {ORG.location}</div>
              </div>
              <div>
                <Label>Billed to</Label>
                <div style={{ fontSize: 13, marginTop: 6, color: "var(--ink)" }}>{emp?.name}</div>
                <div style={{ fontSize: 12, color: "var(--dim)", marginTop: 2 }}>{emp?.location} · for the attention of {finance.name}</div>
              </div>
            </div>
            <div style={{ borderRadius: 14, border: "1px solid var(--border)", overflow: "hidden" }}>
              <div className="rc-row" style={{ padding: "10px 14px", background: "var(--surface-faint)", fontSize: 11.5, color: "var(--faint)" }}>
                <span className="rc-grow">Item</span><span>Amount</span>
              </div>
              <div className="rc-row" style={{ padding: "13px 14px", gap: 12, borderTop: "1px solid var(--border)", alignItems: "flex-start" }}>
                <div className="rc-grow">
                  <div style={{ fontSize: 13, color: "var(--ink)" }}>{view.kind === "fee" ? "Success fee, " + pct(view.rate || FEE_RATE) + " of first-year base salary" : view.title}</div>
                  <div style={{ fontSize: 12, color: "var(--dim)", marginTop: 3 }}>{view.kind === "fee" ? view.title.replace("Success fee: ", "") + " · base salary " + eur(view.salary || 0) : view.detail}</div>
                </div>
                <span style={{ fontVariantNumeric: "tabular-nums", fontWeight: 600 }}>{eur(view.amount)}</span>
              </div>
              <div className="rc-row" style={{ padding: "12px 14px", borderTop: "1px solid var(--border)", background: "var(--surface-faint)" }}>
                <span className="rc-grow" style={{ fontWeight: 600 }}>Total</span>
                <span style={{ fontSize: 18, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{eur(view.amount)}</span>
              </div>
            </div>
            <KV cols={3} items={[
              { k: "Issued", v: view.issued },
              { k: "Status", v: view.status.label },
              { k: view.kind === "fee" ? "Agency at 25%" : "Covers", v: view.kind === "fee" ? eur((view.salary || 0) * AGENCY_RATE) : view.kind === "renewal" ? "12 months" : HV_MEMBERSHIP.period },
            ]} />
            {view.kind === "fee" && (
              <Note icon="trendUp" tone="ok">A 25% agency fee on this hire would have been {eur((view.salary || 0) * AGENCY_RATE)}: {eur((view.salary || 0) * (AGENCY_RATE - (view.rate || FEE_RATE)))} more.</Note>
            )}
          </div>
        )}
      </Modal>
    </Page>
  );
}
