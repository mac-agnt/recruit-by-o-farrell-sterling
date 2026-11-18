import { useState, type ReactNode } from "react";
import { Avatar, Badge, Button, Drawer, Empty, KV, Note, Progress, TextArea, Timeline } from "../ui";
import { useNav } from "../nav";
import { allVacancies, logActivity, notify, openDrawer, useRecruit } from "../store";
import { CANDIDATE_BY_ID, EMPLOYER_BY_ID, HQ_TEAM, STAGES, STAGE_ORDER, SUPPORT_TICKETS } from "../data";
import type { Employer, Offer, Placement, Stage, Vacancy } from "../data/types";
import { eur, eurK, num, plural } from "../format";

/* The shared employer drawer. In Recruit HQ it is the account record:
   membership, commercial health, vacancies with pipelines, offers,
   placements and fees, support and notes. Opened from the candidate or
   employer portals it shows the public employer profile only, so no
   commercial data leaks outside HQ. */

type Tone = "accent" | "ok" | "warn" | "bad" | "neutral" | "teal";

const ACTOR = "John O'Farrell";
const SUCCESS_LEAD = HQ_TEAM.find(m => m.team === "Employer Success")?.name || "Employer Success";
const PAST_SHORTLIST: Stage[] = ["shortlisted", "contact", "interview", "offer", "hired"];
const HEALTH_TONE: Record<Employer["health"], Tone> = { healthy: "ok", watch: "warn", "at risk": "bad" };
const STATUS_TONE: Record<Employer["membershipStatus"], Tone> = { active: "teal", "renewal due": "warn", trial: "accent", lapsed: "bad" };
const VAC_TONE: Record<Vacancy["status"], Tone> = { open: "accent", paused: "warn", filled: "ok", draft: "neutral" };
const OFFER_TONE: Record<Offer["status"], Tone> = {
  draft: "neutral", "awaiting approval": "warn", approved: "accent", sent: "accent", "changes requested": "warn", accepted: "ok", declined: "bad", withdrawn: "neutral",
};
const INVOICE_TONE: Record<Placement["invoice"], Tone> = { paid: "ok", invoiced: "accent", pending: "neutral", overdue: "bad" };
const STAGE_LABEL = Object.fromEntries(STAGES.map(st => [st.id, st.label])) as Record<string, string>;
const cap = (x: string) => x.charAt(0).toUpperCase() + x.slice(1);
const nameOf = (id: string) => CANDIDATE_BY_ID[id]?.name || "A candidate";

const DEMO_TODAY = new Date(2026, 10, 18);
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
function daysUntil(label: string): number | null {
  const m = label.match(/(\d{1,2})\s+([A-Z][a-z]{2})/);
  if (!m || MON.indexOf(m[2]) < 0) return null;
  const d = new Date(DEMO_TODAY.getFullYear(), MON.indexOf(m[2]), Number(m[1]));
  if (d < DEMO_TODAY) d.setFullYear(d.getFullYear() + 1);
  return Math.round((d.getTime() - DEMO_TODAY.getTime()) / 86400000);
}

export default function EmployerDrawer({ id, onClose, ctx }: { id: string; onClose: () => void; ctx?: Record<string, string> }) {
  const nav = useNav();
  const e = EMPLOYER_BY_ID[id];
  if (!e) {
    return (
      <Drawer open onClose={onClose} eyebrow="EMPLOYER" title="Account not found">
        <Empty icon="employer" title="This employer is not in the demo data" body="It may have been removed when the demo was reset." />
      </Drawer>
    );
  }
  const internal = nav.role === "hq" || ctx?.from === "hq";
  return internal ? <AccountView e={e} onClose={onClose} /> : <PublicView e={e} onClose={onClose} />;
}

/* ── HQ account record ──────────────────────────────────────────────────── */

function AccountView({ e, onClose }: { e: Employer; onClose: () => void }) {
  const s = useRecruit();
  const [note, setNote] = useState("");

  const tierId = e.id === s.employerId ? s.membershipTier : e.tier;
  const tier = s.tiers.find(t => t.id === tierId) || s.tiers[0];
  const entriesFor = (vid: string) => s.pipeline.filter(p => p.vacancyId === vid).length;
  const vacs = allVacancies(s).filter(v => v.employerId === e.id)
    .sort((a, b) => Number(b.status === "open") - Number(a.status === "open") || entriesFor(b.id) - entriesFor(a.id) || b.postedDays - a.postedDays);
  const open = vacs.filter(v => v.status === "open");
  const offers = s.offers.filter(o => o.employerId === e.id);
  const placements = s.placements.filter(p => p.employerId === e.id);
  const live = placements.filter(p => p.date === "Today");
  const spend = e.spendYtd + live.reduce((t, p) => t + p.salary * p.feeRate, 0);
  const placementsYtd = e.placementsYtd + live.length;
  const fees = placements.reduce((t, p) => t + p.salary * p.feeRate, 0);
  const tickets = SUPPORT_TICKETS.filter(t => t.employerId === e.id);
  const refs = new Set<string>([e.id, ...vacs.map(v => v.id), ...offers.map(o => o.id), ...placements.map(p => p.id)]);
  const events = s.activity.filter(ev => ev.refs.some(r => refs.has(r)) || ev.actor === e.name || ev.actor === e.short);
  const notes = events.filter(ev => ev.title === "Account note added" && ev.refs[0] === e.id);
  const call = events.find(ev => ev.title === "Renewal call scheduled" && ev.refs[0] === e.id);
  const review = events.find(ev => ev.title === "Account review sent" && ev.refs[0] === e.id);
  const days = daysUntil(e.renewal);
  const renewalPhrase = /^\d/.test(e.renewal) ? "the " + e.renewal + " renewal" : "the pilot end on " + e.renewal.replace(/^Pilot ends /, "");
  const stale = open.filter(v => v.postedDays > 21 && !s.pipeline.some(p => p.vacancyId === v.id && PAST_SHORTLIST.includes(p.stage)));

  const risks: string[] = [];
  stale.forEach(v => risks.push(v.title + " open " + v.postedDays + " days without a shortlist"));
  if (e.membershipStatus === "trial") risks.push(e.note.replace(/\.$/, ""), e.renewal + (placementsYtd ? "" : ", no hires yet"));
  if (e.membershipStatus === "renewal due" && days !== null) risks.push("Renewal due in " + days + " days");
  if (e.engagement < 60) risks.push("Engagement " + e.engagement + " of 100");
  if (!placementsYtd && e.membershipStatus !== "trial") risks.push("No placements yet this year");
  if (e.health === "healthy") risks.push("Engagement " + e.engagement + ", " + plural(placementsYtd, "placement") + " this year");
  const ticketDone = (tid: string) => s.activity.find(ev => ev.refs[0] === tid && ev.title === "Support ticket resolved");

  const scheduleCall = () => {
    logActivity({ category: "financial", actor: ACTOR, title: "Renewal call scheduled", refs: [e.id], status: "awaiting",
      detail: SUCCESS_LEAD + " to call " + e.contact + " (" + e.contactRole + ") ahead of " + renewalPhrase + " of the " + tier.label + " membership. Demo booking, calendar sync is planned." });
    notify("Renewal call with " + e.contact + " scheduled (demo booking)");
  };
  const sendReview = () => {
    logActivity({ category: "financial", actor: ACTOR, title: "Account review sent", refs: [e.id], status: "completed",
      detail: "Account review sent to " + e.contact + ": " + plural(placementsYtd, "placement") + " and " + eur(spend) + " spend this year, "
        + plural(open.length, "open role") + ", ahead of " + renewalPhrase + ". Demo only, no email sent." });
    notify("Account review sent to " + e.contact + " (demo, no email sent)");
  };
  const addNote = () => {
    const text = note.trim();
    if (!text) return;
    logActivity({ category: "hiring", actor: ACTOR, title: "Account note added", detail: text, refs: [e.id] });
    notify("Note added to " + e.short);
    setNote("");
  };

  return (
    <Drawer open onClose={onClose} width={640} eyebrow="EMPLOYER ACCOUNT" title={e.name}
      sub={e.sector + ", " + e.location + ". " + e.memberSince + "."}
      badge={<Badge tone={HEALTH_TONE[e.health]}>{cap(e.health)}</Badge>}
      footer={<>
        <Button variant="primary" icon={call ? "check" : "calendar"} disabled={!!call} onClick={scheduleCall}>
          {call ? "Renewal call booked" : "Schedule renewal call"}
        </Button>
        <Button icon={review ? "check" : "send"} disabled={!!review} onClick={sendReview}>{review ? "Account review sent" : "Send account review"}</Button>
        <span className="rc-grow" />
        <span style={{ fontSize: 11.5, color: "var(--faint)" }}>Owner: {SUCCESS_LEAD}</span>
      </>}>

      <div className="rc-row rc-wrap" style={{ gap: 7 }}>
        <Badge tone="accent">{tier.label}, {eur(tier.price)} a year</Badge>
        {!tier.confirmed && <Badge tone="warn">Concept tier</Badge>}
        <Badge tone={STATUS_TONE[e.membershipStatus]}>{cap(e.membershipStatus)}</Badge>
        <Badge tone={days !== null && days <= 30 ? "warn" : "neutral"} icon="calendar">
          {(/^\d/.test(e.renewal) ? "Renews " + e.renewal : e.renewal) + (days !== null ? ", " + days + " days" : "")}
        </Badge>
        {e.verified && <Badge tone="teal" icon="verified">Verified employer</Badge>}
      </div>

      <Note tone={HEALTH_TONE[e.health]} icon={e.health === "healthy" ? "shield" : "alert"} style={{ marginTop: 14 }}>
        <b style={{ fontWeight: 600 }}>{cap(e.health)}.</b> {risks.join(". ")}.
      </Note>

      <div style={{ marginTop: 14 }}>
        <KV cols={3} items={[
          { k: "Contact", v: e.contact + ", " + e.contactRole },
          { k: "Employees", v: num(e.employees) + (e.hotels ? ", " + plural(e.hotels, "hotel") : "") },
          { k: "Membership value", v: eur(tier.price) + " a year" },
          { k: "Spend YTD", v: eur(spend) + (live.length ? " (incl. live fee)" : "") },
          { k: "Placements YTD", v: num(placementsYtd) },
          { k: "Engagement", v: <span className="rc-row" style={{ gap: 8 }}>{e.engagement}<Progress value={e.engagement} height={4} tone={e.engagement >= 70 ? "teal" : e.engagement >= 55 ? "warn" : "bad"} style={{ flex: 1 }} /></span> },
        ]} />
      </div>

      <Block title="Vacancies" meta={open.length + " open, " + (vacs.length - open.length) + " filled or closed"}>
        {vacs.map(v => {
          const entries = s.pipeline.filter(p => p.vacancyId === v.id);
          const flagged = stale.includes(v);
          return (
            <div key={v.id} onClick={() => openDrawer("vacancy", v.id)} className="rc-rowhover" style={{ padding: "10px 10px", margin: "0 -10px", borderRadius: 12 }}>
              <div className="rc-row" style={{ gap: 8 }}>
                <span className="rc-grow rc-ellipsis" style={{ fontSize: 13, fontWeight: 500, color: "var(--ink)" }}>{v.title}</span>
                {flagged && <Badge tone="bad" icon="alert">No shortlist</Badge>}
                {v.created && <Badge tone="teal">New</Badge>}
                <Badge tone={VAC_TONE[v.status]}>{cap(v.status)}</Badge>
              </div>
              <div style={{ fontSize: 11.5, color: "var(--dim)", marginTop: 3 }}>
                {eurK(v.salary[0])}-{eurK(v.salary[1]).slice(1)} · {v.postedDays} days{v.status === "open" ? " · " + v.marketMatches + " market matches" : ""}
              </div>
              {entries.length > 0 && (
                <div className="rc-row rc-wrap" style={{ gap: 5, marginTop: 7 }}>
                  {STAGE_ORDER.map(st => {
                    const n = entries.filter(p => p.stage === st).length;
                    return n ? <span key={st} style={{ fontSize: 10.5, padding: "2px 7px", borderRadius: 999, background: st === "offer" || st === "hired" ? "var(--accent-soft)" : "var(--surface-2)", border: "1px solid var(--border)", color: "var(--body)" }}>{n} {STAGE_LABEL[st].toLowerCase()}</span> : null;
                  })}
                </div>
              )}
            </div>
          );
        })}
        {!vacs.length && <Quiet>No vacancies in the sample.</Quiet>}
      </Block>

      <Block title="Offers" meta={offers.length ? plural(offers.length, "offer") : undefined}>
        {offers.map(o => (
          <div key={o.id} onClick={() => openDrawer("offer", o.id)} className="rc-rowhover"
            style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 10px", margin: "0 -10px", borderRadius: 12 }}>
            <Avatar initials={CANDIDATE_BY_ID[o.candidateId]?.initials || "?"} tint={CANDIDATE_BY_ID[o.candidateId]?.tint} size={28} />
            <div className="rc-grow">
              <div className="rc-ellipsis" style={{ fontSize: 13, color: "var(--ink)" }}>{nameOf(o.candidateId)}, {eur(o.salary)}</div>
              <div className="rc-ellipsis" style={{ fontSize: 11.5, color: "var(--dim)", marginTop: 2 }}>{o.title}{o.contingency ? ", contingency" : ""}</div>
            </div>
            {!o.visibleToCandidate && <Badge tone="neutral" icon="eyeOff">Not visible to candidate</Badge>}
            <Badge tone={OFFER_TONE[o.status]}>{cap(o.status)}</Badge>
          </div>
        ))}
        {!offers.length && <Quiet>No offers in the sample records.</Quiet>}
      </Block>

      <Block title="Placements and fees" meta={placements.length ? eur(fees) + " in success fees" : undefined}>
        {placements.map(p => {
          const v = vacs.find(x => x.id === p.vacancyId);
          return (
            <div key={p.id} onClick={() => openDrawer("candidate", p.candidateId, { from: "hq" })} className="rc-rowhover"
              style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 10px", margin: "0 -10px", borderRadius: 12 }}>
              <Avatar initials={CANDIDATE_BY_ID[p.candidateId]?.initials || "?"} tint={CANDIDATE_BY_ID[p.candidateId]?.tint} size={28} />
              <div className="rc-grow">
                <div className="rc-ellipsis" style={{ fontSize: 13, color: "var(--ink)" }}>{nameOf(p.candidateId)}, {v?.title || "Placement"}</div>
                <div className="rc-ellipsis" style={{ fontSize: 11.5, color: "var(--dim)", marginTop: 2 }}>
                  {eur(p.salary)} at {Math.round(p.feeRate * 100)}% = {eur(p.salary * p.feeRate)} · placed {p.date}, starts {p.startDate}
                </div>
              </div>
              <Badge tone={INVOICE_TONE[p.invoice]}>{cap(p.invoice)}</Badge>
            </div>
          );
        })}
        {!placements.length && <Quiet>{placementsYtd ? plural(placementsYtd, "placement") + " this year; none in the sample records." : "No placements yet."}</Quiet>}
      </Block>

      <Block title="Support tickets" meta={tickets.length ? tickets.filter(t => !ticketDone(t.id)).length + " open" : undefined}>
        {tickets.map(t => {
          const done = ticketDone(t.id);
          return (
            <div key={t.id} className="rc-row" style={{ gap: 10, padding: "8px 0", alignItems: "flex-start" }}>
              <Badge tone={t.priority === "High" ? "bad" : t.priority === "Medium" ? "warn" : "neutral"}>{t.priority}</Badge>
              <div className="rc-grow">
                <div style={{ fontSize: 13, color: "var(--ink)" }}>{t.subject}</div>
                <div style={{ fontSize: 11.5, color: "var(--dim)", marginTop: 2 }}>{t.owner} · {t.age} · {done ? "Resolved" : t.status}</div>
              </div>
            </div>
          );
        })}
        {!tickets.length && <Quiet>No open support tickets.</Quiet>}
      </Block>

      <Block title="Account notes">
        <div className="rc-col" style={{ gap: 8 }}>
          {notes.map(n => (
            <div key={n.id} style={{ padding: "10px 12px", borderRadius: "var(--r-sm, 12px)", background: "var(--surface-2)", border: "1px solid var(--border)" }}>
              <div style={{ fontSize: 13, color: "var(--body)", lineHeight: 1.5 }}>{n.detail}</div>
              <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--faint)", marginTop: 5 }}>{n.actor} · {n.when}</div>
            </div>
          ))}
          <div style={{ padding: "10px 12px", borderRadius: "var(--r-sm, 12px)", background: "var(--surface-faint)", border: "1px solid var(--border)" }}>
            <div style={{ fontSize: 13, color: "var(--body)", lineHeight: 1.5 }}>{e.note}</div>
            <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--faint)", marginTop: 5 }}>Account summary</div>
          </div>
          <TextArea value={note} onChange={ev => setNote(ev.target.value)} rows={2} placeholder={"Add a note about " + e.short} />
          <div className="rc-row" style={{ justifyContent: "flex-end" }}>
            <Button size="sm" icon="plus" disabled={!note.trim()} onClick={addNote}>Add note</Button>
          </div>
        </div>
      </Block>

      <Block title="Recent account activity">
        {events.length
          ? <Timeline items={events.slice(0, 6).map(ev => ({ when: ev.when, title: ev.title, body: ev.detail,
              tone: (ev.status === "awaiting" ? "warn" : ev.status === "failed" ? "bad" : "accent") as Tone }))} />
          : <Quiet>Nothing logged for this account yet.</Quiet>}
      </Block>
    </Drawer>
  );
}

/* ── Public profile (candidate and employer portals) ────────────────────── */

function PublicView({ e, onClose }: { e: Employer; onClose: () => void }) {
  const s = useRecruit();
  const open = allVacancies(s).filter(v => v.employerId === e.id && v.status === "open");
  return (
    <Drawer open onClose={onClose} eyebrow="EMPLOYER" title={e.name} sub={e.sector + ", " + e.location}
      badge={e.verified ? <Badge tone="teal" icon="verified">Verified employer</Badge> : undefined}>
      <KV items={[
        { k: "Industry", v: e.industry },
        { k: "Size", v: num(e.employees) + " employees" + (e.hotels ? ", " + plural(e.hotels, "hotel") : "") },
        { k: "Location", v: e.location },
        { k: "Open roles on Recruit", v: String(open.length) },
      ]} />
      <Block title="Open roles">
        {open.map(v => (
          <div key={v.id} onClick={() => openDrawer("vacancy", v.id)} className="rc-rowhover" style={{ padding: "10px 10px", margin: "0 -10px", borderRadius: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: "var(--ink)" }}>{v.title}</div>
            <div style={{ fontSize: 11.5, color: "var(--dim)", marginTop: 3 }}>{v.location} · {eurK(v.salary[0])}-{eurK(v.salary[1]).slice(1)} · {v.type}</div>
          </div>
        ))}
        {!open.length && <Quiet>No open roles right now.</Quiet>}
      </Block>
      <Note icon="lock" style={{ marginTop: 18 }}>
        Recruit verifies every employer before it can search the marketplace. Employers see a professional's contact details only after that person accepts an introduction.
      </Note>
    </Drawer>
  );
}

function Block({ title, meta, children }: { title: string; meta?: ReactNode; children: ReactNode }) {
  return (
    <div style={{ marginTop: 22 }}>
      <div className="rc-row" style={{ gap: 10, marginBottom: 8, paddingBottom: 8, borderBottom: "1px solid var(--border)" }}>
        <span className="rc-grow" style={{ fontSize: 13.5, fontWeight: 600, letterSpacing: "-.2px", color: "var(--ink)" }}>{title}</span>
        {meta && <span style={{ fontSize: 11.5, color: "var(--faint)" }}>{meta}</span>}
      </div>
      {children}
    </div>
  );
}

function Quiet({ children }: { children: ReactNode }) {
  return <div style={{ fontSize: 12.5, color: "var(--dim)", padding: "6px 0" }}>{children}</div>;
}
