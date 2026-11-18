import { Badge, Button, Card, DemoTag, Grid, Label, Page, Stat, Table, type Col } from "../../ui";
import { Icon } from "../../icons";
import { useNav } from "../../nav";
import { openDrawer, setActiveVacancy, useRecruit, vacancyById } from "../../store";
import { STAGE_ORDER } from "../../data";
import { eur, eurK, pct } from "../../format";
import { AGENCY_RATE, FEE_RATE, FOCUS_OFFER, HV_EARLIER, HV_MEMBERSHIP, PersonAvatar, isLiveOffer, lc1, who, yearTotals, type Tone } from "./hiringKit";

/* Placements: the hires Recruit has made for Harbourview this membership
   year, the success fees, and what a traditional agency would have charged. */

interface Row { id: string; role: string; person: React.ReactNode; placed: string; start: string; salary: number; rate: number; invoice: { label: string; tone: Tone; sub?: string }; live: boolean; onOpen?: () => void }

export default function Placements() {
  const s = useRecruit();
  const nav = useNav();
  const { live, count, salaries, fees, agency, net: saved } = yearTotals(s);
  const membership = HV_MEMBERSHIP.amount;

  const rows: Row[] = live.map((p): Row => {
    const w = who(s, s.employerId, p.candidateId);
    const v = vacancyById(p.vacancyId, s);
    return {
      id: p.id, role: v?.title || "Placement", live: true, placed: p.date, start: p.startDate, salary: p.salary, rate: p.feeRate,
      person: <span className="rc-row" style={{ gap: 8 }}><PersonAvatar c={w.c} hidden={w.hidden} size={22} /><span className="rc-ellipsis">{w.name}</span></span>,
      invoice: p.invoice === "paid" ? { label: "Paid", tone: "ok" } : p.invoice === "invoiced" ? { label: "Invoiced", tone: "accent" } : p.invoice === "overdue" ? { label: "Overdue", tone: "bad" } : { label: "Pending", tone: "warn", sub: "Due on start date" },
      onOpen: () => openDrawer("candidate", p.candidateId, { vacancyId: p.vacancyId }),
    };
  }).concat(HV_EARLIER.map((p): Row => ({
    id: p.id, role: p.role, live: false, placed: p.placed, start: p.start, salary: p.salary, rate: FEE_RATE,
    person: <span style={{ color: "var(--dim)" }}>{p.department} team</span>,
    invoice: p.status === "paid" ? { label: "Paid", tone: "ok", sub: p.settled.replace("Paid ", "on ") } : { label: "Invoiced", tone: "accent", sub: lc1(p.settled) },
  })));

  const cols: Col<Row>[] = [
    { key: "role", label: "Role", width: "1.6fr", render: r => (
      <div style={{ minWidth: 0 }}>
        <div className="rc-row rc-wrap" style={{ gap: 7 }}><span style={{ color: "var(--ink)", fontWeight: 500, lineHeight: 1.35 }}>{r.role}</span>{r.live && <Badge tone="teal">New</Badge>}</div>
        <div style={{ fontSize: 12, marginTop: 3 }}>{r.person}</div>
      </div>
    ) },
    { key: "dates", label: "Placed", width: ".85fr", hideSm: true, render: r => (
      <div style={{ fontVariantNumeric: "tabular-nums", lineHeight: 1.4 }}>{r.placed}<div style={{ fontSize: 11.5, color: "var(--faint)" }}>starts {r.start}</div></div>
    ) },
    { key: "salary", label: "Salary", width: ".85fr", align: "right", render: r => <span style={{ fontVariantNumeric: "tabular-nums" }}>{eur(r.salary)}</span> },
    { key: "fee", label: "Success fee", width: ".85fr", align: "right", render: r => (
      <div style={{ fontVariantNumeric: "tabular-nums", lineHeight: 1.4 }}><span style={{ color: "var(--ink)", fontWeight: 600 }}>{eur(r.salary * r.rate)}</span><div style={{ fontSize: 11.5, color: "var(--faint)" }}>at {pct(r.rate)}</div></div>
    ) },
    { key: "agency", label: "Agency at 25%", width: ".85fr", align: "right", hideSm: true, render: r => <span style={{ fontVariantNumeric: "tabular-nums", color: "var(--dim)" }}>{eur(r.salary * AGENCY_RATE)}</span> },
    { key: "invoice", label: "Invoice", width: ".95fr", align: "right", render: r => (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}><Badge tone={r.invoice.tone}>{r.invoice.label}</Badge>{r.invoice.sub && <span style={{ fontSize: 11.5, color: "var(--faint)" }}>{r.invoice.sub}</span>}</div>
    ) },
  ];

  /* The General Manager search, step by step. */
  const gm = vacancyById("v-hv-gm", s);
  const gmEntries = s.pipeline.filter(p => p.vacancyId === "v-hv-gm");
  const gmOffers = s.offers.filter(o => o.vacancyId === "v-hv-gm" && o.employerId === s.employerId);
  const lead = gmOffers.find(o => o.status === "accepted") || gmOffers.find(o => o.status === "sent" || o.status === "changes requested") || gmOffers.find(isLiveOffer);
  const gmPlacement = live.find(p => p.vacancyId === "v-hv-gm");
  const gmHeld = s.interviews.filter(i => i.vacancyId === "v-hv-gm" && i.status === "completed").length;
  const gmBooked = s.interviews.filter(i => i.vacancyId === "v-hv-gm" && i.status === "scheduled").length;
  const projSalary = gmPlacement?.salary ?? lead?.salary ?? (gm ? Math.round((gm.salary[0] + gm.salary[1]) / 2000) * 1000 : 0);
  const projRate = gmPlacement?.feeRate ?? s.commissionRules[0]?.rate ?? FEE_RATE;
  const leadName = lead ? who(s, s.employerId, lead.candidateId).first : "";
  const steps = gm ? [
    { label: "Role posted", value: gm.postedDays + " days ago", done: true },
    { label: "Matched", value: gm.marketMatches + " profiles", done: true },
    { label: "Shortlisted", value: String(gmEntries.filter(e => STAGE_ORDER.indexOf(e.stage) >= 1).length), done: gmEntries.some(e => STAGE_ORDER.indexOf(e.stage) >= 1) },
    { label: "Interviewed", value: gmHeld + " held" + (gmBooked ? ", " + gmBooked + " booked" : ""), done: gmHeld > 0 },
    { label: "Offers", value: gmOffers.filter(isLiveOffer).length + " in progress", done: gmOffers.some(o => o.status === "sent" || o.status === "accepted") },
    { label: "Accepted", value: gmPlacement ? "Yes" : lead && lead.status === "sent" ? "Expires " + lead.expires : "Pending", done: !!gmPlacement },
    { label: "Placement", value: gmPlacement ? "Starts " + gmPlacement.startDate : "Fee on start date", done: !!gmPlacement },
  ] : [];
  const current = steps.findIndex(x => !x.done);
  const maxBar = Math.max(...rows.map(r => r.salary * AGENCY_RATE), 1);

  return (
    <Page wide eyebrow="HIRING" title="Placements"
      sub="Hires made through Recruit this membership year, the success fees, and what a traditional agency would have charged."
      actions={<>
        <Button icon="file" onClick={() => nav.go("emp.costs", "billing")}>Billing</Button>
        <Button variant="primary" icon="costs" onClick={() => nav.go("emp.costs", "calculator")}>Cost calculator</Button>
      </>}>

      <Card pad={24} style={{ background: "linear-gradient(135deg, color-mix(in oklab, #16B8A6 13%, var(--surface)) 0%, var(--surface) 58%)" }}>
        <div className="rc-row rc-wrap" style={{ gap: 28, alignItems: "stretch" }}>
          <div style={{ flex: "1 1 260px", minWidth: 240 }}>
            <div className="rc-row" style={{ gap: 8 }}><Label>Saved this year</Label><DemoTag /></div>
            <div style={{ fontSize: 44, fontWeight: 600, letterSpacing: "-2px", lineHeight: 1, marginTop: 12, color: "var(--teal, var(--ok))", fontVariantNumeric: "tabular-nums" }}>{eur(saved)}</div>
            <div style={{ fontSize: 13, color: "var(--dim)", marginTop: 10, lineHeight: 1.55, maxWidth: 360 }}>
              Estimated against a 25% agency fee, after your {eur(membership)} membership. {count} {count === 1 ? "hire" : "hires"} and {eur(salaries)} in combined salaries.
            </div>
          </div>
          <div style={{ flex: "2 1 420px", minWidth: 280, display: "flex", flexDirection: "column", justifyContent: "center", gap: 16 }}>
            <CostBar label="Traditional agency at 25%" value={agency} max={agency} parts={[{ value: agency, color: "color-mix(in oklab, var(--warn) 75%, var(--surface))" }]} />
            <CostBar label={"Recruit: " + eur(fees) + " in success fees + " + eur(membership) + " membership"} value={fees + membership} max={agency}
              parts={[{ value: fees, color: "var(--accent)" }, { value: membership, color: "var(--teal, var(--ok))" }]} />
            <div style={{ fontSize: 12, color: "var(--faint)" }}>Recruit cost {pct((fees + membership) / agency)} of the agency equivalent this year.</div>
          </div>
        </div>
      </Card>

      <Grid cols="rc-g4">
        <Stat icon="placement" tone="teal" label="Placements this year" value={count} sub={live.length ? "Includes " + live.length + " new" : "Membership year from 12 Jan"} />
        <Stat icon="users" label="Combined salaries" value={eur(salaries)} sub={"Across " + count + " hires"} />
        <Stat icon="euro" tone="accent" label="Success fees at 8%" value={eur(fees)} sub="Invoiced on each start date" />
        <Stat icon="trendUp" tone="ok" label="Agency fees avoided" value={eur(agency - fees)} sub={"Before the " + eur(membership) + " membership"} />
      </Grid>

      {gm && (
        <Card title="General Manager: the path to placement" sub={gmPlacement ? "Placed. The success fee is recorded and invoiced on the start date." : "Where the search stands today, and what it costs when it lands."}
          action={<Button size="sm" variant="ghost" iconRight="arrowRight" onClick={() => { setActiveVacancy("v-hv-gm"); nav.go("emp.hiring", "shortlists"); }}>Open pipeline</Button>}>
          <div className="rc-scroll-x">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(" + steps.length + ", minmax(82px, 1fr))", minWidth: 580 }}>
              {steps.map((st, i) => {
                const cur = i === current;
                const color = st.done ? "var(--teal, var(--ok))" : cur ? "var(--accent)" : "var(--track)";
                return (
                  <div key={st.label} style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", padding: "0 4px" }}>
                    {i > 0 && <span style={{ position: "absolute", top: 12, right: "50%", width: "100%", height: 2, background: steps[i - 1].done ? "var(--teal, var(--ok))" : "var(--track)" }} />}
                    <span style={{ position: "relative", width: 26, height: 26, borderRadius: 999, display: "flex", alignItems: "center", justifyContent: "center",
                      background: st.done ? color : "var(--surface)", border: "2px solid " + color, color: st.done ? "var(--on-accent)" : color,
                      boxShadow: cur ? "0 0 0 4px var(--accent-soft)" : "none" }}>
                      {st.done ? <Icon name="check" size={12} stroke={3} /> : <span style={{ fontSize: 11, fontWeight: 600 }}>{i + 1}</span>}
                    </span>
                    <div style={{ fontSize: 12.5, fontWeight: cur ? 600 : 500, marginTop: 8, color: st.done || cur ? "var(--ink)" : "var(--dim)" }}>{st.label}</div>
                    <div style={{ fontSize: 11.5, color: "var(--faint)", marginTop: 3 }}>{st.value}</div>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="rc-grid rc-g3" style={{ gap: 10, marginTop: 18 }}>
            <Mini label={gmPlacement ? "Success fee" : "Success fee on acceptance"} value={eur(projSalary * projRate)} sub={pct(projRate) + " of " + eur(projSalary) + (lead && !gmPlacement ? ", " + leadName + "'s offer" : "")} tone="var(--accent)" />
            <Mini label="Agency fee at 25%" value={eur(projSalary * AGENCY_RATE)} sub="Traditional search benchmark" tone="var(--warn)" />
            <Mini label="Estimated saving" value={eur(projSalary * (AGENCY_RATE - projRate))} sub="On this one hire" tone="var(--teal, var(--ok))" />
          </div>
          {lead && !gmPlacement && (
            <div className="rc-row rc-wrap" style={{ gap: 8, marginTop: 14 }}>
              <span style={{ fontSize: 12.5, color: "var(--dim)" }}>{leadName} decides whether to accept. Recruit records the placement the moment {leadName} does.</span>
              <span className="rc-grow" />
              <Button size="sm" icon="offers" onClick={() => { FOCUS_OFFER.set(lead.id); nav.go("emp.hiring", "offers"); }}>View the offer</Button>
            </div>
          )}
        </Card>
      )}

      <Table cols={cols} rows={rows} onRow={r => r.onOpen?.()}
        caption={"Success fees are " + pct(FEE_RATE) + " of first-year base salary, invoiced on the start date. Agency comparison uses a 25% benchmark. Illustrative demo data."} />

      <Grid cols="rc-g2">
        <Card title="What each hire cost" sub="Recruit fee against the agency equivalent">
          <div className="rc-col" style={{ gap: 14 }}>
            {rows.map(r => (
              <div key={r.id}>
                <div className="rc-row" style={{ gap: 8, fontSize: 12.5 }}>
                  <span className="rc-grow rc-ellipsis" style={{ color: "var(--body)" }}>{r.role}</span>
                  <span style={{ color: "var(--teal, var(--ok))", fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{eurK(r.salary * (AGENCY_RATE - r.rate))} saved</span>
                </div>
                <div style={{ marginTop: 6, display: "flex", flexDirection: "column", gap: 3 }}>
                  <span style={{ height: 6, borderRadius: 999, width: (r.salary * AGENCY_RATE / maxBar) * 100 + "%", background: "color-mix(in oklab, var(--warn) 70%, var(--surface))", transformOrigin: "left", animation: "rcGrow .8s cubic-bezier(.16,1,.3,1) both" }} />
                  <span style={{ height: 6, borderRadius: 999, width: (r.salary * r.rate / maxBar) * 100 + "%", background: "var(--accent)", transformOrigin: "left", animation: "rcGrow .8s cubic-bezier(.16,1,.3,1) .1s both" }} />
                </div>
              </div>
            ))}
          </div>
          <div className="rc-row" style={{ gap: 14, marginTop: 14, fontSize: 11.5, color: "var(--faint)" }}>
            <span className="rc-row" style={{ gap: 6 }}><span style={{ width: 12, height: 6, borderRadius: 3, background: "color-mix(in oklab, var(--warn) 70%, var(--surface))" }} />Agency at 25%</span>
            <span className="rc-row" style={{ gap: 6 }}><span style={{ width: 12, height: 6, borderRadius: 3, background: "var(--accent)" }} />Recruit fee</span>
          </div>
          <div className="rc-row" style={{ gap: 10, marginTop: 16, paddingTop: 14, borderTop: "1px solid var(--border)" }}>
            <span className="rc-grow" style={{ fontSize: 12.5, color: "var(--dim)" }}>Agency fees avoided across {count} {count === 1 ? "hire" : "hires"}</span>
            <span style={{ fontSize: 18, fontWeight: 600, letterSpacing: "-.4px", color: "var(--teal, var(--ok))", fontVariantNumeric: "tabular-nums" }}>{eur(agency - fees)}</span>
          </div>
          <div style={{ fontSize: 11.5, color: "var(--faint)", marginTop: 4, textAlign: "right" }}>{eur(saved)} after the {eur(membership)} membership</div>
        </Card>
        <Card title="How the success fee works" sub="The same rule for every hire">
          <div className="rc-col" style={{ gap: 11 }}>
            {[
              ["placement", "A success fee of " + pct(FEE_RATE) + " of first-year base salary, only when a hire starts."],
              ["file", "Invoiced on the start date with 30-day terms. Nothing is charged before that."],
              ["search", "No fee for searching, shortlisting, introductions or interviews."],
              ["chart", "The agency comparison uses a 25% benchmark, a common rate for management searches."],
            ].map(([icon, text]) => (
              <div key={icon} className="rc-row" style={{ alignItems: "flex-start", gap: 10 }}>
                <span style={{ width: 26, height: 26, flex: "none", borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", background: "var(--surface-2)", color: "var(--accent)" }}><Icon name={icon} size={13} /></span>
                <span style={{ fontSize: 12.5, lineHeight: 1.55, color: "var(--body)", paddingTop: 4 }}>{text}</span>
              </div>
            ))}
          </div>
          <div className="rc-row rc-wrap" style={{ gap: 8, marginTop: 16 }}>
            <Button size="sm" icon="file" onClick={() => nav.go("emp.costs", "billing")}>Invoices</Button>
            <Button size="sm" variant="ghost" iconRight="arrowRight" onClick={() => nav.go("emp.costs", "calculator")}>Try the calculator</Button>
          </div>
          <div style={{ fontSize: 11.5, color: "var(--faint)", marginTop: 12 }}>Placement figures are illustrative demo data.</div>
        </Card>
      </Grid>
    </Page>
  );
}

function CostBar({ label, value, max, parts }: { label: string; value: number; max: number; parts: { value: number; color: string }[] }) {
  return (
    <div>
      <div className="rc-row" style={{ gap: 10, fontSize: 12.5 }}>
        <span className="rc-grow" style={{ color: "var(--body)" }}>{label}</span>
        <b style={{ fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{eur(value)}</b>
      </div>
      <div style={{ display: "flex", gap: 2, height: 14, marginTop: 7, borderRadius: 999, overflow: "hidden", background: "var(--track)", width: "100%" }}>
        {parts.map((p, i) => (
          <span key={i} style={{ width: (p.value / max) * 100 + "%", background: p.color, transformOrigin: "left", animation: "rcGrow .9s cubic-bezier(.16,1,.3,1) " + i * 90 + "ms both", transition: "width .5s var(--ease)" }} />
        ))}
      </div>
    </div>
  );
}

function Mini({ label, value, sub, tone }: { label: string; value: string; sub: string; tone: string }) {
  return (
    <div style={{ padding: "12px 14px", borderRadius: 14, background: "var(--surface-2)", border: "1px solid var(--border)" }}>
      <div className="rc-row" style={{ gap: 7, fontSize: 11.5, color: "var(--dim)" }}><span style={{ width: 7, height: 7, borderRadius: 2, background: tone }} />{label}</div>
      <div style={{ fontSize: 20, fontWeight: 600, letterSpacing: "-.6px", marginTop: 6, fontVariantNumeric: "tabular-nums" }}>{value}</div>
      <div style={{ fontSize: 11.5, color: "var(--faint)", marginTop: 3 }}>{sub}</div>
    </div>
  );
}
