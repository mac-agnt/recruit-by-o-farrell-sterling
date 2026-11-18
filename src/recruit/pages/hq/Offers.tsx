import { useMemo, useState } from "react";
import { Avatar, Badge, Button, Card, Empty, Grid, ListRow, Note, Page, Segmented, Select, Stat, Table, Timeline, type Col } from "../../ui";
import { Icon } from "../../icons";
import { useNav } from "../../nav";
import { openDrawer, useRecruit } from "../../store";
import { candidate } from "../../selectors";
import { EMPLOYER_BY_ID, QUALITY } from "../../data";
import type { Offer } from "../../data/types";
import { eur, plural } from "../../format";

/* Recruit HQ, Offers: every offer in the shared store, from internal drafts
   to accepted. Candidates control their offers: they only see what an
   employer has sent, and only they can accept, decline or ask for changes.
   HQ watches; it never acts for a candidate. */

type Tone = "accent" | "ok" | "warn" | "bad" | "neutral" | "teal";
type View = "all" | "negotiation" | "internal" | "accepted" | "closed";

const GROUP: Record<Offer["status"], Exclude<View, "all">> = {
  draft: "internal", "awaiting approval": "internal", approved: "internal",
  sent: "negotiation", "changes requested": "negotiation", accepted: "accepted", declined: "closed", withdrawn: "closed",
};
const OFFER_TONE: Record<Offer["status"], Tone> = {
  draft: "neutral", "awaiting approval": "warn", approved: "accent", sent: "accent", "changes requested": "warn", accepted: "ok", declined: "bad", withdrawn: "neutral",
};
const KIND_TONE: Record<Offer["history"][number]["kind"], Tone> = { system: "neutral", employer: "accent", candidate: "teal", approval: "ok" };
const cap = (x: string) => x.charAt(0).toUpperCase() + x.slice(1);

const DEMO_TODAY = new Date(2026, 10, 18);
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
function daysUntil(label: string): number | null {
  const m = label.match(/(\d{1,2})\s+([A-Z][a-z]{2})/);
  if (!m || MON.indexOf(m[2]) < 0) return null;
  const d = new Date(DEMO_TODAY.getFullYear(), MON.indexOf(m[2]), Number(m[1]));
  if (d < DEMO_TODAY) d.setFullYear(d.getFullYear() + 1);
  return Math.round((d.getTime() - DEMO_TODAY.getTime()) / 86400000);
}

export default function Offers() {
  const s = useRecruit();
  const nav = useNav();
  const [view, setView] = useState<View>("all");
  const [histId, setHistId] = useState("o-hv-sarah");
  const rate = s.commissionRules[0]?.rate ?? 0.08;

  const offers = useMemo(() => s.offers.slice().sort((a, b) => {
    const order: View[] = ["negotiation", "internal", "accepted", "closed"];
    return order.indexOf(GROUP[a.status]) - order.indexOf(GROUP[b.status]) || b.salary - a.salary;
  }), [s.offers]);
  const count = (v: View) => (v === "all" ? offers.length : offers.filter(o => GROUP[o.status] === v).length);
  const rows = view === "all" ? offers : offers.filter(o => GROUP[o.status] === view);

  const negotiating = offers.filter(o => GROUP[o.status] === "negotiation");
  const onTable = negotiating.reduce((t, o) => t + o.salary, 0);
  const soonest = negotiating.map(o => ({ o, d: daysUntil(o.expires) })).filter(x => x.d !== null).sort((a, b) => (a.d ?? 0) - (b.d ?? 0))[0];
  const hidden = offers.filter(o => !o.visibleToCandidate && GROUP[o.status] === "internal");
  const hist = offers.find(o => o.id === histId) || offers[0];

  /* People holding more than one live offer they can see. */
  const competing = useMemo(() => {
    const live = s.offers.filter(o => o.visibleToCandidate && GROUP[o.status] === "negotiation");
    const ids = Array.from(new Set(live.map(o => o.candidateId))).filter(id => live.filter(o => o.candidateId === id).length > 1);
    return ids.map(id => ({ c: candidate(s, id), list: live.filter(o => o.candidateId === id).sort((a, b) => a.salary - b.salary) }));
  }, [s]);

  const offerIds = new Set(s.offers.map(o => o.id));
  const events = s.activity.filter(ev => ev.refs.some(r => offerIds.has(r))).slice(0, 8);

  const cols: Col<Offer>[] = [
    { key: "cand", label: "Candidate", width: "minmax(190px, 1.6fr)", render: o => {
      const c = candidate(s, o.candidateId);
      return (
        <div className="rc-row" style={{ gap: 10 }}>
          <Avatar initials={c.initials} tint={c.tint} size={30} />
          <div className="rc-grow">
            <div className="rc-ellipsis" style={{ fontWeight: 500, color: "var(--ink)" }}>{c.name}</div>
            <div className="rc-ellipsis" style={{ fontSize: 11.5, color: "var(--faint)", marginTop: 2 }}>{o.contingency ? "Contingency offer" : c.title}</div>
          </div>
        </div>
      );
    } },
    { key: "role", label: "Role and employer", width: "minmax(200px, 1.8fr)", render: o => (
      <div style={{ minWidth: 0 }}>
        <div className="rc-ellipsis" style={{ color: "var(--ink)" }}>{o.title}</div>
        <button className="rc-link" style={{ fontSize: 11.5, marginTop: 2 }} onClick={ev => { ev.stopPropagation(); openDrawer("employer", o.employerId); }}>{EMPLOYER_BY_ID[o.employerId]?.name}</button>
      </div>
    ) },
    { key: "sal", label: "Salary", width: "108px", align: "right", render: o => <span style={{ fontWeight: 600, color: "var(--ink)", fontVariantNumeric: "tabular-nums" }}>{eur(o.salary)}</span> },
    { key: "status", label: "Status", width: "150px", render: o => <Badge tone={OFFER_TONE[o.status]}>{cap(o.status)}</Badge> },
    { key: "vis", label: "Candidate sees it", width: "176px", render: o => o.visibleToCandidate
      ? <Badge tone="teal" icon="eye">Visible to candidate</Badge>
      : <Badge tone="neutral" icon="eyeOff">Not visible to candidate</Badge> },
    { key: "exp", label: "Expires", width: "110px", render: o => {
      const d = daysUntil(o.expires);
      return (
        <div>
          <div style={{ color: d !== null && d <= 7 && GROUP[o.status] === "negotiation" ? "var(--warn)" : "var(--body)" }}>{o.expires}</div>
          {d !== null && GROUP[o.status] === "negotiation" && <div style={{ fontSize: 11, color: "var(--faint)", marginTop: 2 }}>{d} days</div>}
        </div>
      );
    } },
    { key: "last", label: "Latest", width: "minmax(200px, 1.8fr)", render: o => {
      const last = o.history[o.history.length - 1];
      return last ? (
        <div style={{ minWidth: 0 }}>
          <div className="rc-ellipsis" style={{ fontSize: 12.5, color: "var(--body)" }}>{last.text}</div>
          <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--faint)", marginTop: 3 }}>{last.who} · {last.when}</div>
        </div>
      ) : null;
    } },
    { key: "fee", label: "Fee if accepted", width: "112px", align: "right", render: o => GROUP[o.status] === "closed"
      ? <span style={{ color: "var(--faint)", fontSize: 12 }}>none</span>
      : <span style={{ fontVariantNumeric: "tabular-nums", color: GROUP[o.status] === "accepted" ? "var(--ok)" : "var(--body)" }}>{eur(o.salary * rate)}</span> },
  ];

  return (
    <Page wide eyebrow="RECRUIT HQ · ROLES AND PLACEMENTS" title="Offers in play"
      sub="Every offer in the sample, from internal drafts to accepted. Salaries are the offered figures; success fees are estimates at the standard rate."
      actions={<>
        <Button icon="hiring" onClick={() => nav.setTab("pipelines")}>Pipelines</Button>
        <Button variant="primary" icon="placement" onClick={() => nav.setTab("placements")}>Placements</Button>
      </>}>

      <Grid cols="rc-g4">
        <Stat icon="offers" tone="accent" label="Offers in the sample" value={String(count("all"))} sub={plural(competing.length, "candidate") + " weighing competing offers"} onClick={() => setView("all")} />
        <Stat icon="messages" tone="warn" label="In negotiation" value={String(count("negotiation"))} sub={eur(onTable) + " in base salary on the table"} onClick={() => setView("negotiation")} />
        <Stat icon="eyeOff" label="Internal, not visible" value={String(count("internal"))} sub="drafts and approvals" onClick={() => setView("internal")} />
        <Stat icon="check" tone="ok" label="Accepted" value={String(count("accepted"))} sub={QUALITY.offerAcceptance + "% acceptance across the marketplace"} onClick={() => setView("accepted")} />
      </Grid>

      <Grid cols="rc-g-3-2">
        {competing.length ? competing.map(({ c, list }) => {
          const diff = list[list.length - 1].salary - list[0].salary;
          return (
            <Card key={c.id} title={c.name + " holds " + list.length + " offers"} sub={c.title + ", " + c.location + ". The candidate decides; neither employer sees the other's offer."}
              action={<Button size="sm" variant="ghost" iconRight="arrowRight" onClick={() => openDrawer("candidate", c.id, { from: "hq" })}>Profile</Button>}>
              <div className="rc-grid rc-g2" style={{ gap: 10 }}>
                {list.map(o => {
                  const e = EMPLOYER_BY_ID[o.employerId];
                  const d = daysUntil(o.expires);
                  return (
                    <div key={o.id} onClick={() => openDrawer("offer", o.id)} className="rc-card rc-click"
                      style={{ padding: 14, borderRadius: 14, background: "var(--surface-2)", border: "1px solid var(--border)", minWidth: 0 }}>
                      <div className="rc-row" style={{ gap: 9 }}>
                        <Avatar initials={e?.initials || "?"} tint={e?.tint} size={28} square />
                        <div className="rc-grow">
                          <div className="rc-ellipsis" style={{ fontSize: 12.5, fontWeight: 500, color: "var(--ink)" }}>{e?.name}</div>
                          <div className="rc-ellipsis" style={{ fontSize: 11, color: "var(--faint)", marginTop: 1 }}>{o.title}</div>
                        </div>
                      </div>
                      <div style={{ fontSize: 24, fontWeight: 600, letterSpacing: "-.8px", marginTop: 12 }}>{eur(o.salary)}</div>
                      <div style={{ fontSize: 11.5, color: "var(--dim)", marginTop: 4, lineHeight: 1.45 }}>{o.bonus}</div>
                      <div className="rc-col" style={{ gap: 4, marginTop: 10 }}>
                        {o.benefits.map(b => (
                          <div key={b} className="rc-row" style={{ gap: 6, fontSize: 11.5, color: "var(--body)", alignItems: "flex-start" }}>
                            <Icon name="check" size={11} color="var(--teal, var(--ok))" style={{ marginTop: 3 }} />{b}
                          </div>
                        ))}
                      </div>
                      <div className="rc-row rc-wrap" style={{ gap: 6, marginTop: 12 }}>
                        <Badge tone={OFFER_TONE[o.status]}>{cap(o.status)}</Badge>
                        <Badge tone={d !== null && d <= 7 ? "warn" : "neutral"} icon="clock">Expires {o.expires}{d !== null ? ", " + d + " days" : ""}</Badge>
                      </div>
                      <div style={{ fontSize: 11, color: "var(--faint)", marginTop: 8 }}>Starts {o.start}</div>
                    </div>
                  );
                })}
              </div>
              {diff > 0 && (
                <div style={{ fontSize: 12, color: "var(--dim)", marginTop: 12, lineHeight: 1.5 }}>
                  {EMPLOYER_BY_ID[list[list.length - 1].employerId]?.short} is {eur(diff)} higher on base salary. Bonus, pension and start date differ too; the candidate sees both side by side in their offer comparison.
                </div>
              )}
            </Card>
          );
        }) : (
          <Card title="Competing offers"><Empty icon="compare" title="Nobody is weighing two offers" body="When a candidate holds more than one live offer, both appear here side by side." /></Card>
        )}

        <div className="rc-col" style={{ gap: 14 }}>
          <Card title="Offers in negotiation" sub={plural(negotiating.length, "offer") + " sent and waiting on the candidate"}>
            <div className="rc-grid rc-g2" style={{ gap: 10 }}>
              <Mini label="Base salary on the table" value={eur(onTable)} />
              <Mini label={"Success fees at " + Math.round(rate * 100) + "%"} value={eur(onTable * rate)} sub="if every offer is accepted" />
            </div>
            {soonest && (
              <div className="rc-row" style={{ gap: 9, marginTop: 12, fontSize: 12.5, color: "var(--body)" }}>
                <Icon name="clock" size={14} color="var(--warn)" />
                <span>Next expiry: {candidate(s, soonest.o.candidateId).name}'s {EMPLOYER_BY_ID[soonest.o.employerId]?.short} offer, {soonest.o.expires} ({soonest.d} days).</span>
              </div>
            )}
          </Card>
          <Card tone="teal" title="Candidates control their offers">
            <div className="rc-col" style={{ gap: 9, fontSize: 12.5, color: "var(--body)", lineHeight: 1.5 }}>
              <div className="rc-row" style={{ gap: 9, alignItems: "flex-start" }}><Icon name="eye" size={14} color="var(--teal, var(--ok))" style={{ marginTop: 2 }} />A candidate sees an offer only once the employer sends it.</div>
              <div className="rc-row" style={{ gap: 9, alignItems: "flex-start" }}><Icon name="lock" size={14} color="var(--teal, var(--ok))" style={{ marginTop: 2 }} />Only the candidate can accept, decline or ask for changes. HQ watches the status and never acts for them.</div>
              {hidden.map(o => (
                <div key={o.id} className="rc-row" style={{ gap: 9, alignItems: "flex-start" }}>
                  <Icon name="eyeOff" size={14} color="var(--dim)" style={{ marginTop: 2 }} />
                  <span>{EMPLOYER_BY_ID[o.employerId]?.short}'s {o.contingency ? "contingency " : ""}offer to {candidate(s, o.candidateId).name} is {o.status}. It is not visible to the candidate.</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </Grid>

      <div className="rc-row rc-wrap" style={{ gap: 10, padding: "4px 4px 0" }}>
        <Segmented size="sm" value={view} onChange={setView} options={[
          { id: "all", label: "All " + count("all") },
          { id: "negotiation", label: "In negotiation " + count("negotiation") },
          { id: "internal", label: "Internal " + count("internal") },
          { id: "accepted", label: "Accepted " + count("accepted") },
          { id: "closed", label: "Closed " + count("closed") },
        ]} />
      </div>
      <Table cols={cols} rows={rows} onRow={o => { setHistId(o.id); openDrawer("offer", o.id); }}
        empty={<Empty icon="offers" title="No offers in this view" body="Choose another status to see the rest." action={<Button size="sm" onClick={() => setView("all")}>Show all offers</Button>} />}
        caption={"Showing " + rows.length + " of " + offers.length + " sample offers. Fees are estimates at the standard " + Math.round(rate * 100) + "% rate and are only due once an offer is accepted and the hire starts."} />

      <Grid cols="rc-g2">
        <Card title="Offer history" sub="Every step recorded on the offer itself, newest first"
          action={hist && (
            <Select value={hist.id} onChange={setHistId} style={{ width: 230 }}
              options={offers.map(o => ({ value: o.id, label: candidate(s, o.candidateId).name + ", " + (EMPLOYER_BY_ID[o.employerId]?.short || "") }))} />
          )}>
          {hist ? (
            <>
              <div className="rc-row rc-wrap" style={{ gap: 8, marginBottom: 14 }}>
                <span style={{ fontSize: 13, fontWeight: 500, color: "var(--ink)" }}>{hist.title}, {eur(hist.salary)}</span>
                <Badge tone={OFFER_TONE[hist.status]}>{cap(hist.status)}</Badge>
                {!hist.visibleToCandidate && <Badge tone="neutral" icon="eyeOff">Not visible to candidate</Badge>}
                <span className="rc-grow" />
                <Button size="sm" variant="ghost" iconRight="arrowRight" onClick={() => openDrawer("offer", hist.id)}>Open offer</Button>
              </div>
              <Timeline items={hist.history.slice().reverse().map(h => ({ when: h.when, title: h.who, body: h.text, tone: KIND_TONE[h.kind] }))} />
            </>
          ) : <Empty icon="offers" title="No offers yet" />}
        </Card>

        <Card title="Offer activity" sub="Every change to an offer, from the shared activity log"
          action={<Button size="sm" variant="ghost" iconRight="arrowRight" onClick={() => nav.go("Activity", "hiring")}>All activity</Button>}>
          {events.map(ev => {
            const ref = ev.refs.find(r => offerIds.has(r));
            return (
              <ListRow key={ev.id} title={ev.title} sub={ev.detail} meta={ev.when}
                dot={ev.status === "awaiting" ? "var(--warn)" : "var(--accent)"} onClick={ref ? () => { setHistId(ref); openDrawer("offer", ref); } : undefined} />
            );
          })}
          {!events.length && <Note>No offer activity logged yet.</Note>}
        </Card>
      </Grid>
    </Page>
  );
}

function Mini({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div style={{ padding: "12px 13px", borderRadius: "var(--r-sm, 12px)", background: "var(--surface-2)", border: "1px solid var(--border)", minWidth: 0 }}>
      <div className="rc-ellipsis" style={{ fontSize: 11.5, color: "var(--dim)" }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 600, letterSpacing: "-.6px", marginTop: 6, fontVariantNumeric: "tabular-nums" }}>{value}</div>
      {sub && <div className="rc-ellipsis" style={{ fontSize: 11, color: "var(--faint)", marginTop: 3 }}>{sub}</div>}
    </div>
  );
}
