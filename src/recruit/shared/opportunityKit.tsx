import { useState, type ComponentProps, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Avatar, Badge, Button, Card, Chip, Field, Label, Modal, Note, TextArea, toneColor } from "../ui";
import { Icon } from "../icons";
import { applyToJob, openDrawer, respondOffer, toggleSavedJob, useRecruit, vacancyById, type RecruitState } from "../store";
import { candidate } from "../selectors";
import { EMPLOYER_BY_ID } from "../data";
import type { Application, Offer, Stage, Vacancy } from "../data/types";
import { alignmentTone, matchScore, type Match } from "../match";
import { eur, plural } from "../format";

/* Shared pieces for the candidate's jobs and offers screens and the vacancy
   and offer drawers: portal-safe dialogs, demo dates, the job card with its
   apply flow, and the candidate's offer responses. */

export type Tone = "accent" | "ok" | "warn" | "bad" | "neutral" | "teal";

/* ── dialogs ────────────────────────────────────────────────────────────── */

/** Dialogs render beside the drawers at the app root. Inside a page they would
    be clipped by the page's entry animation and sit under the side rail. */
function overlayHost(): HTMLElement | null {
  if (typeof document === "undefined") return null;
  const panel = document.querySelector("[data-main-panel]");
  return (panel?.closest("[data-theme]") as HTMLElement | null) || (document.querySelector("[data-theme]") as HTMLElement | null) || document.body;
}

export function PortalModal(props: ComponentProps<typeof Modal>) {
  if (!props.open) return null;
  const host = overlayHost();
  const el = <div onClick={e => e.stopPropagation()}><Modal {...props} /></div>;
  return host ? createPortal(el, host) : el;
}

/* ── demo calendar ──────────────────────────────────────────────────────── */

/** The seed data is written around Wednesday 18 November 2026. */
export const DEMO_TODAY = new Date(2026, 10, 18);
const MON = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

/** Reads "Wed 25 Nov", "Mon 4 Jan 2027", "January 2027" and "Today 10:42". */
export function parseDemoDate(text: string): { date: Date; exact: boolean } | null {
  const t = text.toLowerCase();
  if (t.startsWith("today") || t === "just now") return { date: DEMO_TODAY, exact: true };
  const d = /(\d{1,2})\s+([a-z]{3})[a-z]*(?:\s+(\d{4}))?/.exec(t);
  if (d && MON.includes(d[2])) {
    const month = MON.indexOf(d[2]);
    const year = d[3] ? Number(d[3]) : month >= 6 ? 2026 : 2027;
    return { date: new Date(year, month, Number(d[1])), exact: true };
  }
  const m = /([a-z]{3})[a-z]*\s+(\d{4})/.exec(t);
  if (m && MON.includes(m[1])) return { date: new Date(Number(m[2]), MON.indexOf(m[1]), 1), exact: false };
  return null;
}

export function daysUntil(text: string): number | null {
  const p = parseDemoDate(text);
  return p ? Math.round((p.date.getTime() - DEMO_TODAY.getTime()) / 86400000) : null;
}

export const noticeLabel = (weeks: number) => (weeks === 1 ? "1 week's notice" : weeks + " weeks' notice");

/** Whether a start date leaves room for the candidate's notice period. */
export function noticeFit(noticeWeeks: number, start: string): { level: "flex" | "ok" | "tight" | "clash"; tone: Tone; label: string } {
  const p = parseDemoDate(start);
  if (!p) return { level: "flex", tone: "ok", label: "Flexible start date" };
  const earliest = new Date(DEMO_TODAY.getTime() + noticeWeeks * 7 * 86400000);
  if (earliest <= p.date) return { level: "ok", tone: "ok", label: "Fits your " + noticeLabel(noticeWeeks) };
  const monthEnd = new Date(p.date.getFullYear(), p.date.getMonth() + 1, 0);
  if (!p.exact && earliest <= monthEnd) return { level: "tight", tone: "warn", label: "Tight with your " + noticeLabel(noticeWeeks) };
  return { level: "clash", tone: "bad", label: "Starts before your notice ends" };
}

export const postedLabel = (days: number) => (days <= 0 ? "Posted today" : days === 1 ? "Posted yesterday" : "Posted " + days + " days ago");

/* ── applications ───────────────────────────────────────────────────────── */

/** Employer-led stages a candidate can see: they agreed to contact or further. */
export const VISIBLE_STAGES: Stage[] = ["contact", "interview", "offer", "hired"];

export const activeApplication = (s: RecruitState, candidateId: string, vacancyId: string): Application | undefined =>
  s.applications.find(a => a.candidateId === candidateId && a.vacancyId === vacancyId && a.status !== "withdrawn");

export function ApplyModal({ open, onClose, vacancyId }: { open: boolean; onClose: () => void; vacancyId: string }) {
  const s = useRecruit();
  const [note, setNote] = useState("");
  if (!open) return null;
  const c = candidate(s, s.persona);
  const v = vacancyById(vacancyId, s);
  if (!v) return null;
  const emp = EMPLOYER_BY_ID[v.employerId];
  const m = matchScore(c, v);
  const draft = () => setNote(
    "I'm a " + c.title + " with " + c.years + " years' experience. Recent results include: " + c.achievements.slice(0, 2).join("; ") + ". "
    + "My strongest evidence for this role is " + (m.matchedSkills.slice(0, 3).join(", ").toLowerCase() || "my operational record") + ". "
    + "I'd welcome a conversation about how I could help " + (emp?.short || "your team") + " as " + v.title + ".");
  const send = () => { applyToJob(c.id, v.id, note.trim()); setNote(""); onClose(); };
  return (
    <PortalModal open={open} onClose={onClose} width={620} title={"Apply for " + v.title}
      sub={(emp?.name || "Employer") + ", " + v.location + ". " + eur(v.salary[0]) + " to " + eur(v.salary[1]) + "."}
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant="primary" icon="send" onClick={send}>Send application</Button></>}>
      <div className="rc-col" style={{ gap: 16 }}>
        <div className="rc-row" style={{ gap: 12, padding: "12px 14px", borderRadius: "var(--r-sm, 12px)", background: "var(--surface-2)", border: "1px solid var(--border)" }}>
          <Avatar initials={emp?.initials || "?"} tint={emp?.tint} size={36} square />
          <div className="rc-grow">
            <div className="rc-row" style={{ gap: 6, fontSize: 13.5, fontWeight: 500 }}>
              {emp?.name}{emp?.verified && <span title="Verified employer" style={{ color: "var(--teal, var(--ok))", display: "inline-flex" }}><Icon name="verified" size={13} /></span>}
            </div>
            <div style={{ fontSize: 12, color: "var(--dim)", marginTop: 2 }}>{m.reasons[0]}</div>
          </div>
          <Badge tone={alignmentTone(m.score)}>{m.score}% match</Badge>
        </div>
        <Field label="Cover note (optional)" hint="A few lines in your own words. The employer reads it alongside your Recruit profile.">
          <TextArea rows={6} value={note} onChange={e => setNote(e.target.value)} placeholder="Why this role, and what you would bring in your first six months." />
        </Field>
        <div className="rc-row rc-wrap" style={{ gap: 8 }}>
          <Chip onClick={draft}><Icon name="sparkle" size={12} />Draft from my profile</Chip>
          {note && <Chip onClick={() => setNote("")}>Clear</Chip>}
        </div>
        <Note icon="lock">{emp?.short || "The employer"} sees your Recruit profile and verified evidence. Your email and phone number stay hidden until you accept an introduction.</Note>
      </div>
    </PortalModal>
  );
}

/* ── job card ───────────────────────────────────────────────────────────── */

export function Fact({ icon, label, value, sub }: { icon: string; label: string; value: ReactNode; sub?: ReactNode }) {
  return (
    <div style={{ minWidth: 0 }}>
      <div className="rc-row" style={{ gap: 6, fontSize: 11, color: "var(--faint)" }}><Icon name={icon} size={12} />{label}</div>
      <div style={{ fontSize: 13, color: "var(--ink)", marginTop: 5, lineHeight: 1.35 }}>{value}</div>
      {sub && <div style={{ fontSize: 11.5, marginTop: 3, lineHeight: 1.35 }}>{sub}</div>}
    </div>
  );
}

export function Reasons({ title, icon, tone, items }: { title: string; icon: string; tone: Tone; items: string[] }) {
  return (
    <div style={{ minWidth: 0 }}>
      <Label>{title}</Label>
      <div className="rc-col" style={{ gap: 7, marginTop: 9 }}>
        {items.map((r, i) => (
          <div key={i} className="rc-row" style={{ alignItems: "flex-start", gap: 8, fontSize: 12.5, lineHeight: 1.45, color: "var(--body)" }}>
            <span style={{ color: toneColor(tone), marginTop: 2, display: "inline-flex" }}><Icon name={icon} size={12} stroke={2.2} /></span>
            <span>{r}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export const savedStyle: CSSProperties = { background: "var(--accent-soft)", border: "1px solid var(--accent-line)", color: "var(--ink)" };

/** One opportunity, with the reasons it matches and the save and apply actions. */
export function JobCard({ v, m, onRemove, footnote }: { v: Vacancy; m: Match; onRemove?: () => void; footnote?: ReactNode }) {
  const s = useRecruit();
  const [applyOpen, setApplyOpen] = useState(false);
  const c = candidate(s, s.persona);
  const emp = EMPLOYER_BY_ID[v.employerId];
  const saved = (s.savedJobs[c.id] || []).includes(v.id);
  const app = activeApplication(s, c.id, v.id);
  const offer = s.offers.find(o => o.candidateId === c.id && o.vacancyId === v.id && o.visibleToCandidate);
  const proc = s.pipeline.find(p => p.candidateId === c.id && p.vacancyId === v.id && VISIBLE_STAGES.includes(p.stage));
  const fit = noticeFit(c.noticeWeeks, v.start);
  const open = v.status === "open";

  let applyArea: ReactNode;
  if (offer) applyArea = <Button size="sm" variant="primary" icon="offers" onClick={() => openDrawer("offer", offer.id, { role: "candidate" })}>View offer</Button>;
  else if (app) applyArea = <Badge tone="teal" icon="check" style={{ height: 30, padding: "0 12px", fontSize: 12 }}>{app.date === "Today" ? "Applied today" : "Applied " + app.date}</Badge>;
  else if (proc) applyArea = <Badge tone="accent" icon="users" style={{ height: 30, padding: "0 12px", fontSize: 12 }}>In process with {emp?.short}</Badge>;
  else if (!open) applyArea = <Badge tone="neutral" style={{ height: 30, padding: "0 12px", fontSize: 12 }}>No longer open</Badge>;
  else applyArea = <Button size="sm" variant="primary" icon="send" onClick={() => setApplyOpen(true)}>Apply</Button>;

  return (
    <Card pad={0}>
      <div style={{ padding: "18px 20px 16px" }}>
        <div className="rc-row" style={{ alignItems: "flex-start", gap: 14 }}>
          <Avatar initials={emp?.initials || "?"} tint={emp?.tint} size={42} square />
          <div className="rc-grow">
            <button className="rc-focus" onClick={() => openDrawer("vacancy", v.id)}
              style={{ background: "none", border: 0, padding: 0, cursor: "pointer", color: "var(--ink)", fontSize: 15.5, fontWeight: 600, letterSpacing: "-.3px", textAlign: "left", lineHeight: 1.3 }}>
              {v.title}
            </button>
            <div className="rc-row rc-wrap" style={{ gap: 6, marginTop: 5, fontSize: 12.5, color: "var(--dim)" }}>
              <span title={emp?.name} style={{ color: "var(--body)", fontWeight: 500 }}>{emp?.short}</span>
              {emp?.verified && <span title="Verified employer" style={{ color: "var(--teal, var(--ok))", display: "inline-flex" }}><Icon name="verified" size={13} /></span>}
              <span style={{ color: "var(--faint)" }}>·</span><span>{v.location}</span>
              <span style={{ color: "var(--faint)" }}>·</span><span>{v.type}</span>
            </div>
          </div>
          <Badge tone={alignmentTone(m.score)} style={{ height: 28, padding: "0 11px", fontSize: 13, fontWeight: 600 }}>{m.score}% match</Badge>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 14, marginTop: 16 }}>
          <Fact icon="euro" label="Salary" value={eur(v.salary[0]) + " to " + eur(v.salary[1])} />
          <Fact icon="layers" label="Level" value={v.seniority === v.department ? v.seniority : v.seniority + ", " + v.department.toLowerCase()} />
          <Fact icon="calendar" label="Start" value={v.start} sub={<span style={{ color: toneColor(fit.tone) }}>{fit.label}</span>} />
          <Fact icon="clock" label="Listed" value={postedLabel(v.postedDays)} sub={<span style={{ color: "var(--faint)" }}>{plural(v.marketMatches, "relevant profile")} in market</span>} />
        </div>
      </div>
      <div style={{ borderTop: "1px solid var(--border)", padding: "14px 20px 16px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: 18, background: "var(--surface-faint)" }}>
        <Reasons title="Why it matches" icon="check" tone="teal" items={m.reasons} />
        <Reasons title="Worth knowing" icon="info" tone="warn" items={m.considerations.length ? m.considerations : ["Nothing flagged for this role"]} />
      </div>
      <div className="rc-row rc-wrap" style={{ borderTop: "1px solid var(--border)", padding: "12px 20px", gap: 8 }}>
        <div className="rc-grow" style={{ fontSize: 11.5, color: "var(--faint)", minWidth: 160 }}>{footnote}</div>
        {onRemove
          ? <Button size="sm" variant="ghost" icon="trash" onClick={onRemove}>Remove</Button>
          : <Button size="sm" icon="bookmark" onClick={() => toggleSavedJob(c.id, v.id)} style={saved ? savedStyle : undefined}>{saved ? "Saved" : "Save"}</Button>}
        <Button size="sm" icon="eye" onClick={() => openDrawer("vacancy", v.id)}>View details</Button>
        {applyArea}
      </div>
      <ApplyModal open={applyOpen} onClose={() => setApplyOpen(false)} vacancyId={v.id} />
    </Card>
  );
}

/* ── offers ─────────────────────────────────────────────────────────────── */

export const OFFER_STATUS: Record<Offer["status"], { label: string; candidate: string; tone: Tone }> = {
  draft: { label: "Draft", candidate: "Draft", tone: "neutral" },
  "awaiting approval": { label: "Awaiting approval", candidate: "In approval", tone: "warn" },
  approved: { label: "Approved, ready to send", candidate: "Approved", tone: "accent" },
  sent: { label: "Sent to candidate", candidate: "Awaiting your response", tone: "accent" },
  "changes requested": { label: "Changes requested", candidate: "Changes requested", tone: "warn" },
  accepted: { label: "Accepted", candidate: "Accepted", tone: "ok" },
  declined: { label: "Declined", candidate: "Declined", tone: "bad" },
  withdrawn: { label: "Withdrawn", candidate: "Withdrawn by employer", tone: "neutral" },
};

export const offerIsLive = (o: Offer) => o.status === "sent" || o.status === "changes requested";

/** Reads the package terms out of the offer text. Values are illustrative. */
export function offerTerms(o: Offer) {
  const pctIn = (t: string) => { const m = /(\d+(?:\.\d+)?)\s*%/.exec(t); return m ? Number(m[1]) / 100 : 0; };
  const pensionLine = o.benefits.find(b => /pension/i.test(b)) || "";
  const healthLine = o.benefits.find(b => /health/i.test(b)) || "";
  const relocLine = o.benefits.find(b => /relocation/i.test(b)) || "";
  const reloc = /€\s?([\d,]+)/.exec(relocLine);
  const bonusPct = pctIn(o.bonus);
  const pensionPct = pctIn(pensionLine);
  return {
    bonusPct, bonusMax: Math.round(o.salary * bonusPct),
    pensionPct, pension: Math.round(o.salary * pensionPct), pensionLine,
    healthLine, family: /family/i.test(healthLine),
    relocLine, relocation: reloc ? Number(reloc[1].replace(/,/g, "")) : 0,
    others: o.benefits.filter(b => b !== pensionLine && b !== healthLine && b !== relocLine && !/bonus/i.test(b)),
  };
}

export const EVENT_TONE: Record<string, Tone> = { system: "neutral", employer: "accent", candidate: "teal", approval: "ok" };

type Respond = "question" | "changes" | "accept" | "decline";

const QUESTIONS = ["How is the bonus measured?", "Is there flexibility on the start date?", "Who would I report to day to day?", "What does the first 90 days look like?"];
const CHANGES = ["Relocation support", "Earlier review of base salary", "Start date"];
const REASONS = ["Accepted another offer", "Package", "Location", "Timing"];

/** The candidate's side of an offer: ask, negotiate, accept or decline. */
export function OfferResponseActions({ offer, size = "sm", showView = true }: { offer: Offer; size?: "sm" | "md"; showView?: boolean }) {
  const [mode, setMode] = useState<Respond | null>(null);
  const [text, setText] = useState("");
  const [picked, setPicked] = useState<string[]>([]);
  const emp = EMPLOYER_BY_ID[offer.employerId];
  const who = emp?.short || "the employer";
  const live = offerIsLive(offer);
  const start = (m: Respond) => { setText(""); setPicked([]); setMode(m); };
  const close = () => setMode(null);
  const toggle = (x: string) => setPicked(p => (p.includes(x) ? p.filter(y => y !== x) : p.concat([x])));
  const changeText = [picked.join(", "), text.trim()].filter(Boolean).join(". ");
  const btn = size === "md" ? "md" : "sm";

  return (
    <>
      <div className="rc-row rc-wrap" style={{ gap: 8 }}>
        {showView && <Button size={btn} icon="eye" onClick={() => openDrawer("offer", offer.id, { role: "candidate" })}>View details</Button>}
        {live && <Button size={btn} icon="question" onClick={() => start("question")}>Ask a question</Button>}
        {live && <Button size={btn} icon="edit" disabled={offer.status === "changes requested"} title={offer.status === "changes requested" ? "Waiting on " + who + " to reply to your request" : undefined} onClick={() => start("changes")}>Request changes</Button>}
        {live && <Button size={btn} variant="ghost" onClick={() => start("decline")}>Decline</Button>}
        {live && <Button size={btn} variant="primary" icon="check" onClick={() => start("accept")}>Accept</Button>}
      </div>

      <PortalModal open={mode === "question"} onClose={close} width={560} title={"Ask " + who + " a question"} sub={offer.title + ". Your question goes to " + (emp?.contact || "the hiring team") + " and is added to the offer history."}
        footer={<><Button variant="ghost" onClick={close}>Cancel</Button><Button variant="primary" icon="send" disabled={!text.trim()} onClick={() => { respondOffer(offer.id, "question", text.trim()); close(); }}>Send question</Button></>}>
        <div className="rc-col" style={{ gap: 12 }}>
          <div className="rc-row rc-wrap" style={{ gap: 8 }}>{QUESTIONS.map(q => <Chip key={q} active={text === q} onClick={() => setText(q)}>{q}</Chip>)}</div>
          <Field label="Your question"><TextArea rows={4} value={text} onChange={e => setText(e.target.value)} placeholder="Ask about anything in the offer." /></Field>
        </div>
      </PortalModal>

      <PortalModal open={mode === "changes"} onClose={close} width={580} title="Request changes" sub={"Tell " + who + " what would make this offer work for you. The offer stays open while they consider it."}
        footer={<><Button variant="ghost" onClick={close}>Cancel</Button><Button variant="primary" icon="send" disabled={!changeText} onClick={() => { respondOffer(offer.id, "changes", changeText); close(); }}>Send request</Button></>}>
        <div className="rc-col" style={{ gap: 12 }}>
          <Label>What would you like to change</Label>
          <div className="rc-row rc-wrap" style={{ gap: 8 }}>
            {CHANGES.map(x => <Chip key={x} active={picked.includes(x)} onClick={() => toggle(x)}>{picked.includes(x) && <Icon name="check" size={11} stroke={2.6} />}{x}</Chip>)}
          </div>
          <Field label="Details" hint="Specific is better: a figure, a date or what the support should cover.">
            <TextArea rows={4} value={text} onChange={e => setText(e.target.value)} placeholder="For example: support with temporary accommodation for the first two months." />
          </Field>
        </div>
      </PortalModal>

      <PortalModal open={mode === "accept"} onClose={close} width={560} title={"Accept " + who + "'s offer"} sub={offer.title + ", " + eur(offer.salary) + " base, starting " + offer.start + "."}
        footer={<><Button variant="ghost" onClick={close}>Not yet</Button><Button variant="primary" icon="check" onClick={() => { respondOffer(offer.id, "accept"); close(); }}>Accept offer</Button></>}>
        <div className="rc-col" style={{ gap: 10 }}>
          {[(emp?.name || "The employer") + " is told straight away, and the placement is recorded on Recruit.",
            "Any other open offers stay open until you decline them yourself.",
            "In this demo an acceptance can't be undone. Reset the demo data to replay it."].map(t => (
            <div key={t} className="rc-row" style={{ alignItems: "flex-start", gap: 9, fontSize: 13, lineHeight: 1.5, color: "var(--body)" }}>
              <span style={{ color: "var(--teal, var(--ok))", marginTop: 3, display: "inline-flex" }}><Icon name="check" size={12} stroke={2.4} /></span>{t}
            </div>
          ))}
          <Note icon="shield" tone="accent" style={{ marginTop: 6 }}>You're in control: Recruit never accepts an offer on your behalf.</Note>
        </div>
      </PortalModal>

      <PortalModal open={mode === "decline"} onClose={close} width={560} title={"Decline " + who + "'s offer"} sub={"A reason is optional. " + who + " sees what you write here."}
        footer={<><Button variant="ghost" onClick={close}>Cancel</Button><Button variant="danger" icon="x" onClick={() => { respondOffer(offer.id, "decline", [picked.join(", "), text.trim()].filter(Boolean).join(". ")); close(); }}>Decline offer</Button></>}>
        <div className="rc-col" style={{ gap: 12 }}>
          <div className="rc-row rc-wrap" style={{ gap: 8 }}>{REASONS.map(x => <Chip key={x} active={picked.includes(x)} onClick={() => toggle(x)}>{x}</Chip>)}</div>
          <Field label="Message (optional)"><TextArea rows={3} value={text} onChange={e => setText(e.target.value)} placeholder="Thank you for the offer. I've decided to..." /></Field>
        </div>
      </PortalModal>
    </>
  );
}
