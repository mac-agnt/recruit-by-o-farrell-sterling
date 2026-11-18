import { useState } from "react";
import { Badge, Button, Card, Chip, Empty, Page } from "../../ui";
import { Icon } from "../../icons";
import { useNav } from "../../nav";
import { openDrawer, setActiveVacancy, useRecruit, vacancyById, type RecruitState } from "../../store";
import { employerVacancies } from "../../selectors";
import { CANDIDATE_BY_ID, EMPLOYER_BY_ID } from "../../data";
import type { ActivityEvent } from "../../data/types";
import { eur } from "../../format";
import { FOCUS_OFFER, HV_EARLIER, FEE_RATE, dayDiff, lc1, parseWhen, relDay, usePrefs, who, type NotifyKind } from "./hiringKit";

/* Notifications for Harbourview, drawn from the shared activity log: only
   events that touch this employer's roles, offers, placements or account.
   Read state is kept for this browser session. */

const ME = "Rachel Moran";
const KINDS: { id: NotifyKind; label: string; icon: string; color: string }[] = [
  { id: "offers", label: "Offers", icon: "offers", color: "var(--accent)" },
  { id: "consent", label: "Consent", icon: "lock", color: "var(--warn)" },
  { id: "interviews", label: "Interviews", icon: "calendar", color: "var(--teal, var(--ok))" },
  { id: "applications", label: "Applications", icon: "file", color: "var(--accent)" },
  { id: "pipeline", label: "Pipeline", icon: "hiring", color: "var(--dim)" },
  { id: "membership", label: "Membership and billing", icon: "costs", color: "var(--teal, var(--ok))" },
];
const KIND = Object.fromEntries(KINDS.map(k => [k.id, k])) as Record<NotifyKind, (typeof KINDS)[number]>;

function kindOf(ev: ActivityEvent): NotifyKind {
  const t = ev.title.toLowerCase();
  if (ev.category === "financial" || /plan|membership|fee|invoice/.test(t)) return "membership";
  if (/offer|changes requested/.test(t)) return "offers";
  if (/introduction/.test(t)) return "consent";
  if (/interview/.test(t)) return "interviews";
  if (/application/.test(t)) return "applications";
  return "pipeline";
}
const isToday = (ev: ActivityEvent) => /just now|min ago|h ago|today/i.test(ev.when);

/* Session read state: survives tab changes, resets on reload. */
let readIds: string[] = [];
let allReadAt = 0;

export default function Notifications() {
  const s = useRecruit();
  const nav = useNav();
  const prefs = usePrefs();
  const [, bump] = useState(0);
  const [filter, setFilter] = useState<NotifyKind | "all">("all");
  const empId = s.employerId;
  const vacIds = new Set(employerVacancies(s, empId).map(v => v.id));
  const offerIds = new Set(s.offers.filter(o => o.employerId === empId).map(o => o.id));
  const placementIds = new Set(s.placements.filter(p => p.employerId === empId).map(p => p.id));

  const events = s.activity.filter(ev => ev.refs.some(r => r === empId || vacIds.has(r) || offerIds.has(r) || placementIds.has(r)));
  const own = (ev: ActivityEvent) => ev.actor === ME;
  const unread = (ev: ActivityEvent) => !own(ev) && !readIds.includes(ev.id) && (ev.at > allReadAt) && (allReadAt > 0 || isToday(ev));
  const muted = KINDS.filter(k => !prefs.notify[k.id]);
  const visible = events.filter(ev => prefs.notify[kindOf(ev)]);
  const shown = visible.filter(ev => filter === "all" || kindOf(ev) === filter);
  const unreadCount = visible.filter(unread).length;
  const today = shown.filter(isToday);
  const earlier = shown.filter(ev => !isToday(ev));
  const groups: [string, ActivityEvent[]][] = [["Today", today], ["Earlier", earlier]];

  const markRead = (id: string) => { if (!readIds.includes(id)) { readIds = readIds.concat([id]); bump(x => x + 1); } };
  const markAll = () => { allReadAt = Date.now(); readIds = readIds.concat(visible.map(e => e.id)); bump(x => x + 1); };

  /** Names stay hidden for anonymous profiles until the person agrees. */
  const redact = (text: string, ev: ActivityEvent) => ev.refs.reduce((t, r) => {
    const c = CANDIDATE_BY_ID[r];
    if (!c) return t;
    const p = who(s, empId, r);
    return p.hidden ? t.split(c.name).join(p.name).replace(/\b(he|she) agrees\b/g, "they agree") : t;
  }, text);

  const open = (ev: ActivityEvent) => {
    markRead(ev.id);
    const kind = kindOf(ev);
    const offer = ev.refs.find(r => offerIds.has(r));
    const vac = ev.refs.find(r => vacIds.has(r));
    const cand = ev.refs.find(r => !!CANDIDATE_BY_ID[r]);
    if (offer) { FOCUS_OFFER.set(offer); nav.go("emp.hiring", "offers"); return; }
    if (kind === "membership") { nav.go("emp.costs", ev.refs.some(r => placementIds.has(r)) ? "billing" : "membership"); return; }
    if (kind === "interviews") { nav.go("emp.hiring", "interviews"); return; }
    if (cand) { openDrawer("candidate", cand, vac ? { vacancyId: vac } : undefined); return; }
    if (vac) { setActiveVacancy(vac); nav.go("emp.hiring", "shortlists"); }
  };

  const attention = needsAttention(s, nav.go);

  return (
    <Page wide eyebrow="MESSAGES" title="Notifications"
      sub="What changed on your roles, offers and account. Only events that involve Harbourview appear here."
      actions={<>
        <Button icon="sliders" onClick={() => nav.go("emp.org", "preferences")}>Preferences</Button>
        <Button variant="primary" icon="check" disabled={!unreadCount} onClick={markAll}>Mark all read</Button>
      </>}>

      {attention.length > 0 && (
        <Card title="Needs your attention" sub="Worked out from your live offers, introductions, interviews and invoices" action={<Badge tone="warn">{attention.length}</Badge>}>
          <div className="rc-grid rc-g2" style={{ gap: 10 }}>
            {attention.map(a => (
              <div key={a.id} className="rc-row" style={{ gap: 11, padding: "12px 14px", borderRadius: 14, background: "var(--surface-2)", border: "1px solid var(--border)", alignItems: "flex-start" }}>
                <span style={{ width: 28, height: 28, flex: "none", borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", background: "var(--surface)", color: a.color }}><Icon name={a.icon} size={14} /></span>
                <div className="rc-grow">
                  <div style={{ fontSize: 13, color: "var(--ink)", lineHeight: 1.4 }}>{a.title}</div>
                  <div style={{ fontSize: 12, color: "var(--dim)", marginTop: 3 }}>{a.sub}</div>
                </div>
                <Button size="sm" onClick={a.go}>{a.cta}</Button>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card pad={0}>
        <div className="rc-row rc-wrap" style={{ gap: 7, padding: "16px 18px", borderBottom: "1px solid var(--border)" }}>
          <Chip active={filter === "all"} onClick={() => setFilter("all")}>All<span style={{ color: "var(--faint)" }}>{visible.length}</span></Chip>
          {KINDS.filter(k => prefs.notify[k.id]).map(k => {
            const n = visible.filter(ev => kindOf(ev) === k.id).length;
            return <Chip key={k.id} active={filter === k.id} onClick={() => setFilter(k.id)}>{k.label}<span style={{ color: "var(--faint)" }}>{n}</span></Chip>;
          })}
          <span className="rc-grow" />
          {unreadCount > 0 ? <Badge tone="accent">{unreadCount} unread</Badge> : <span style={{ fontSize: 12, color: "var(--faint)" }}>All caught up</span>}
          {muted.length > 0 && (
            <button className="rc-link" style={{ fontSize: 12 }} onClick={() => nav.go("emp.org", "preferences")}>{muted.length} muted</button>
          )}
        </div>
        {shown.length ? (
          <div style={{ padding: "6px 10px 12px" }}>
            {groups.map(([label, list]) => list.length > 0 && (
              <div key={label}>
                <div style={{ padding: "12px 8px 6px", fontSize: 11.5, fontWeight: 600, color: "var(--faint)", letterSpacing: ".02em" }}>{label}</div>
                {list.map(ev => {
                  const k = KIND[kindOf(ev)];
                  const u = unread(ev);
                  return (
                    <button key={ev.id} onClick={() => open(ev)} className="rc-rowhover rc-focus"
                      style={{ width: "100%", display: "flex", gap: 12, alignItems: "flex-start", padding: "11px 10px", border: 0, borderRadius: 12, background: u ? "var(--accent-faint)" : "transparent", color: "inherit", textAlign: "left", cursor: "pointer" }}>
                      <span style={{ width: 30, height: 30, flex: "none", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", background: "var(--surface-2)", border: "1px solid var(--border)", color: k.color }}><Icon name={k.icon} size={14} /></span>
                      <div className="rc-grow">
                        <div className="rc-row" style={{ gap: 8 }}>
                          <span style={{ fontSize: 13, fontWeight: u ? 600 : 500, color: "var(--ink)" }}>{redact(ev.title, ev)}</span>
                          {ev.status === "awaiting" && <Badge tone="warn">Waiting</Badge>}
                        </div>
                        <div style={{ fontSize: 12.5, color: "var(--dim)", marginTop: 3, lineHeight: 1.5 }}>{redact(ev.detail, ev)}</div>
                        <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--faint)", marginTop: 5 }}>{own(ev) ? "You" : redact(ev.actor, ev)} · {ev.when}</div>
                      </div>
                      {u && <span aria-label="Unread" style={{ width: 8, height: 8, borderRadius: 999, background: "var(--accent)", flex: "none", marginTop: 6 }} />}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        ) : (
          <Empty icon="bell" title="Nothing here" body={filter === "all" ? "Notifications about your roles and offers will appear here." : "No " + KIND[filter as NotifyKind].label.toLowerCase() + " notifications yet."} />
        )}
      </Card>
    </Page>
  );
}

interface Attention { id: string; icon: string; color: string; title: string; sub: string; cta: string; go: () => void }

function needsAttention(s: RecruitState, go: (page: string, tab?: string) => void): Attention[] {
  const out: Attention[] = [];
  const empId = s.employerId;
  const mine = s.offers.filter(o => o.employerId === empId);
  const toOffer = (id: string) => () => { FOCUS_OFFER.set(id); go("emp.hiring", "offers"); };
  mine.filter(o => o.status === "changes requested").forEach(o => {
    const p = who(s, empId, o.candidateId);
    out.push({ id: "cr" + o.id, icon: "edit", color: "var(--warn)", title: p.name + " asked for changes to the " + o.title + " offer", sub: "Revise and resend from Offers", cta: "Revise", go: toOffer(o.id) });
  });
  mine.filter(o => o.status === "awaiting approval").forEach(o => {
    const p = who(s, empId, o.candidateId);
    out.push({ id: "aa" + o.id, icon: "clock", color: "var(--warn)", title: (o.contingency ? "Contingency offer for " : "Offer for ") + p.name + " is waiting on " + (o.approver || "approval"), sub: eur(o.salary) + " · " + o.title, cta: "Review", go: toOffer(o.id) });
  });
  mine.filter(o => o.status === "approved").forEach(o => {
    const p = who(s, empId, o.candidateId);
    out.push({ id: "ap" + o.id, icon: "send", color: "var(--accent)", title: "Approved offer for " + p.name + " is ready to send", sub: eur(o.salary) + " · " + o.title, cta: "Send", go: toOffer(o.id) });
  });
  mine.filter(o => o.status === "sent").forEach(o => {
    const p = who(s, empId, o.candidateId);
    const d = parseWhen(o.expires);
    out.push({ id: "ex" + o.id, icon: "offers", color: "var(--accent)", title: p.name + "'s offer expires " + o.expires, sub: (d ? relDay(d) + " · " : "") + "the decision is " + p.first + "'s", cta: "Open", go: toOffer(o.id) });
  });
  s.intros.filter(i => i.status === "pending" && vacancyById(i.vacancyId, s)?.employerId === empId).forEach(i => {
    const p = who(s, empId, i.candidateId);
    out.push({ id: "in" + i.id, icon: "lock", color: "var(--warn)", title: "Introduction to " + p.name + " is awaiting consent", sub: "Requested " + lc1(i.date) + " · " + (vacancyById(i.vacancyId, s)?.title || ""), cta: "Pipeline", go: () => { setActiveVacancy(i.vacancyId); go("emp.hiring", "shortlists"); } });
  });
  s.interviews.filter(i => i.status === "scheduled" && vacancyById(i.vacancyId, s)?.employerId === empId).forEach(i => {
    const d = parseWhen(i.when);
    if (!d || dayDiff(d) < 0 || dayDiff(d) > 3) return;
    const p = who(s, empId, i.candidateId);
    out.push({ id: "iv" + i.id, icon: "calendar", color: "var(--teal, var(--ok))", title: "Interview with " + p.name + ", " + i.when, sub: relDay(d) + " · round " + i.round + " · " + i.format.toLowerCase(), cta: "Prepare", go: () => go("emp.hiring", "interviews") });
  });
  HV_EARLIER.filter(p => p.status === "invoiced").forEach(p => {
    out.push({ id: "inv" + p.id, icon: "file", color: "var(--accent)", title: "Success fee invoice " + p.invoice + " is open", sub: eur(p.salary * FEE_RATE) + " · " + p.role + " · " + lc1(p.settled), cta: "Billing", go: () => go("emp.costs", "billing") });
  });
  const emp = EMPLOYER_BY_ID[empId];
  if (emp) {
    const plan = s.tiers.find(t => t.id === s.membershipTier);
    out.push({ id: "renew", icon: "costs", color: "var(--teal, var(--ok))", title: (plan?.label || "Your") + " membership renews " + emp.renewal, sub: eur(plan?.price || 0) + " a year · simulated, no payment taken", cta: "Plan", go: () => go("emp.costs", "membership") });
  }
  return out.slice(0, 8);
}
