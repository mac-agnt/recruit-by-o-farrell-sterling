import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type CSSProperties, type ReactNode } from "react";
import { Avatar, Badge, Button, Checkbox, Field, Label, Modal, Note, Segmented, Select, TextInput } from "../../ui";
import { RangeBar, SERIES_COLORS } from "../../charts";
import { Icon } from "../../icons";
import { contactVisible, createOffer, editOffer, introFor, scheduleInterview, useRecruit, vacancyById, visibilityOf, type RecruitState } from "../../store";
import { candidate, displayName } from "../../selectors";
import { EMPLOYER_TEAM, type Tier } from "../../data";
import type { Candidate, Interview, Offer, Stage, Vacancy } from "../../data/types";
import { eur, eurK } from "../../format";

/* Shared pieces for the employer hiring, costs and messages screens:
   the interview and offer dialogs, demo dates, and session-only settings. */

export type Tone = "accent" | "ok" | "warn" | "bad" | "neutral" | "teal";

/* ── demo calendar ──────────────────────────────────────────────────────── */

/** The seed data is written around Wednesday 18 November 2026. */
export const DEMO_TODAY = new Date(2026, 10, 18);
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** Reads "Fri 20 Nov, 14:00" or "Mon 4 Jan 2027" style strings. */
export function parseWhen(when: string): Date | null {
  const m = /(\d{1,2}) (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*(?: (\d{4}))?(?:,? (\d{1,2}):(\d{2}))?/.exec(when);
  if (!m) return null;
  const month = MON.indexOf(m[2]);
  const year = m[3] ? Number(m[3]) : month >= 6 ? 2026 : 2027;
  return new Date(year, month, Number(m[1]), m[4] ? Number(m[4]) : 9, m[5] ? Number(m[5]) : 0);
}
export const fmtDay = (d: Date) => DOW[d.getDay()] + " " + d.getDate() + " " + MON[d.getMonth()];
export const dayDiff = (d: Date) =>
  Math.round((new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() - DEMO_TODAY.getTime()) / 86400000);
export function relDay(d: Date) {
  const n = dayDiff(d);
  if (n === 0) return "Today";
  if (n === 1) return "Tomorrow";
  if (n === -1) return "Yesterday";
  return n > 0 ? "In " + n + " days" : -n + " days ago";
}
export function workingDays(count: number, from: Date = DEMO_TODAY) {
  const out: Date[] = [];
  const d = new Date(from);
  while (out.length < count) {
    d.setDate(d.getDate() + 1);
    if (d.getDay() !== 0 && d.getDay() !== 6) out.push(new Date(d));
  }
  return out;
}
export const TIMES = ["09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "12:00", "14:00", "14:30", "15:00", "15:30", "16:00", "16:30"];
export const START_OPTIONS = ["Mon 4 Jan 2027", "Mon 11 Jan 2027", "Mon 18 Jan 2027", "Mon 1 Feb 2027", "Mon 1 Mar 2027"];
export const EXPIRY_OPTIONS = ["Wed 25 Nov", "Fri 27 Nov", "Wed 2 Dec", "Fri 4 Dec", "Wed 9 Dec"];

/* ── shared vocabulary ──────────────────────────────────────────────────── */

export const STAGE_COLOR: Record<Stage, string> = {
  identified: "var(--faint)", shortlisted: "var(--accent)", contact: "var(--warn)",
  interview: SERIES_COLORS[3], offer: SERIES_COLORS[5], hired: "var(--teal, var(--ok))",
};

export const OFFER_STATUS: Record<Offer["status"], { label: string; tone: Tone }> = {
  draft: { label: "Draft", tone: "neutral" },
  "awaiting approval": { label: "Awaiting approval", tone: "warn" },
  approved: { label: "Approved", tone: "accent" },
  sent: { label: "Sent", tone: "accent" },
  "changes requested": { label: "Changes requested", tone: "warn" },
  accepted: { label: "Accepted", tone: "ok" },
  declined: { label: "Declined", tone: "bad" },
  withdrawn: { label: "Withdrawn", tone: "neutral" },
};
export const isLiveOffer = (o: Offer) => o.status !== "declined" && o.status !== "withdrawn";
/** Lower-case only the first letter, so "Due 25 Nov" reads "due 25 Nov" mid-sentence. */
export const lc1 = (t: string) => t.charAt(0).toLowerCase() + t.slice(1);

export const BENEFITS = ["Pension, 8% employer contribution", "Private healthcare for the family", "Performance bonus up to 15%", "Relocation allowance", "Car allowance"];
export const PANEL_EXTRA = "Owners' board representative";
export const ACCESS_LEVELS = ["Admin", "Hiring manager", "Offer approver", "Interviewer"] as const;
export type Access = (typeof ACCESS_LEVELS)[number];
export const teamMember = (name: string) => EMPLOYER_TEAM.find(m => m.name === name);

/** A plan allowance read from the tier perks, walking down because "Everything in Growth" inherits. */
export function allowance(tiers: Tier[], id: number, re: RegExp) {
  for (let i = tiers.findIndex(t => t.id === id); i >= 0; i--) {
    const hit = tiers[i].perks.find(p => re.test(p));
    if (hit) return { text: hit, n: /unlimited/i.test(hit) ? Infinity : Number((/(\d+)/.exec(hit) || [])[1] || 0) };
  }
  return null;
}

/** The latest offer this employer has made a person for a role (live ones first). */
export function offerFor(s: RecruitState, employerId: string, vacancyId: string, candidateId: string) {
  const list = s.offers.filter(o => o.employerId === employerId && o.vacancyId === vacancyId && o.candidateId === candidateId);
  return list.filter(isLiveOffer).pop() || list.pop();
}

/** What this employer may show of a person. Identity only after consent for anonymous profiles. */
export function who(s: RecruitState, employerId: string, id: string) {
  const c = candidate(s, id);
  const name = displayName(s, employerId, c);
  const hidden = name !== c.name;
  return { c, name, hidden, first: hidden ? name : c.name.split(" ")[0] };
}

export function consentState(s: RecruitState, employerId: string, candidateId: string): "shared" | "pending" | "declined" | "none" {
  if (contactVisible(employerId, candidateId, s)) return "shared";
  const intro = introFor(employerId, candidateId, s);
  if (!intro) return "none";
  return intro.status === "declined" ? "declined" : intro.status === "pending" ? "pending" : "shared";
}

export function ConsentBadge({ state }: { state: ReturnType<typeof consentState> }) {
  if (state === "shared") return <Badge tone="teal" icon="check">Details shared</Badge>;
  if (state === "pending") return <Badge tone="warn" icon="clock">Awaiting consent</Badge>;
  if (state === "declined") return <Badge tone="bad" icon="x">Introduction declined</Badge>;
  return <Badge tone="neutral" icon="lock">Contact hidden</Badge>;
}

export function PersonAvatar({ c, hidden, size = 32 }: { c: Candidate; hidden: boolean; size?: number }) {
  if (!hidden) return <Avatar initials={c.initials} tint={c.tint} size={size} />;
  return (
    <span title="Identity is shared after consent"
      style={{ width: size, height: size, flex: "none", borderRadius: 999, background: "var(--surface-2)", border: "1px dashed var(--border-strong)", color: "var(--dim)", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
      <Icon name="eyeOff" size={Math.round(size * 0.42)} />
    </span>
  );
}

/** A label above a group of buttons (Field wraps a <label>, which would click the first button). */
export function Group({ label, hint, children, style }: { label: ReactNode; hint?: ReactNode; children: ReactNode; style?: CSSProperties }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 7, minWidth: 0, ...style }}>
      <span style={{ fontSize: 12, fontWeight: 500, color: "var(--body)" }}>{label}</span>
      {children}
      {hint && <span style={{ fontSize: 11.5, color: "var(--faint)", lineHeight: 1.45 }}>{hint}</span>}
    </div>
  );
}

export function useWidth<T extends HTMLElement>(): [React.RefObject<T>, number] {
  const ref = useRef<T>(null);
  const [w, setW] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    setW(el.clientWidth);
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => setW(el.clientWidth));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref as React.RefObject<T>, w];
}

/* ── session-only state ─────────────────────────────────────────────────── */
/* Settings the shared store has no field for. They live for the browser
   session, survive tab changes, and never touch the shared demo state. */

function sessionState<T>(initial: T) {
  let value = initial;
  const subs = new Set<() => void>();
  const get = () => value;
  const subscribe = (fn: () => void) => { subs.add(fn); return () => { subs.delete(fn); }; };
  const set = (next: T | ((v: T) => T)) => {
    value = typeof next === "function" ? (next as (v: T) => T)(value) : next;
    subs.forEach(f => f());
  };
  return { get, set, subscribe };
}
function useSession<T>(st: { get: () => T; subscribe: (fn: () => void) => () => void }) {
  return useSyncExternalStore(st.subscribe, st.get, st.get);
}

export type NotifyKind = "offers" | "consent" | "interviews" | "applications" | "pipeline" | "membership";
export interface HiringPrefs {
  noticeWeeks: number;
  salaryTransparency: "range" | "from" | "hidden";
  suggestions: boolean;
  notify: Record<NotifyKind, boolean>;
  emailDigest: boolean;
  interviewFormat: Interview["format"];
  interviewLength: number;
  interviewPanel: string[];
}
export const DEFAULT_PREFS: HiringPrefs = {
  noticeWeeks: 8,
  salaryTransparency: "range",
  suggestions: true,
  notify: { offers: true, consent: true, interviews: true, applications: true, pipeline: true, membership: true },
  emailDigest: false,
  interviewFormat: "In person",
  interviewLength: 60,
  interviewPanel: ["Rachel Moran", "Conall Hegarty"],
};
export const PREFS = sessionState<HiringPrefs>(DEFAULT_PREFS);
export const usePrefs = () => useSession(PREFS);

/** Outcome notes for held interviews, seeded for the two GM finalists. */
export const OUTCOMES = sessionState<Record<string, string>>({
  i4: "Strong on owner reporting and the refurbishment plan. The panel recommended an offer.",
  i5: "Excellent luxury standards. Twelve weeks' notice is the main consideration. Kept as the contingency choice.",
});
export const useOutcomes = () => useSession(OUTCOMES);

/** Lets another screen ask the Offers tab (or the inbox) to open on a particular record. */
export const FOCUS_OFFER = sessionState<string | null>(null);
export const FOCUS_THREAD = sessionState<string | null>(null);

/** The employer thread that belongs to an offer or a person, if there is one. */
export function threadFor(s: RecruitState, refs: string[]) {
  return s.employerThreads.find(t => refs.some(r => t.refs.includes(r)));
}

/* ── Harbourview's earlier placements this membership year ──────────────── */
/* Three hires before the General Manager search. Combined salaries €291,500;
   fees at 8% come to €23,320, which with the €995 membership matches the
   account's €24,315 spend to date. */

export const FEE_RATE = 0.08;
export const AGENCY_RATE = 0.25;
export interface EarlierPlacement { id: string; role: string; department: string; salary: number; placed: string; start: string; invoice: string; invoiced: string; status: "paid" | "invoiced"; settled: string }
export const HV_EARLIER: EarlierPlacement[] = [
  { id: "hv-pl-1", role: "Director of Sales & Marketing", department: "Commercial", salary: 113000, placed: "24 Feb", start: "6 Apr", invoice: "RCT-2026-0406", invoiced: "6 Apr", status: "paid", settled: "Paid 1 May" },
  { id: "hv-pl-2", role: "Executive Chef", department: "Kitchen", salary: 96000, placed: "9 Jun", start: "20 Jul", invoice: "RCT-2026-0720", invoiced: "20 Jul", status: "paid", settled: "Paid 14 Aug" },
  { id: "hv-pl-3", role: "Director of Rooms", department: "Rooms", salary: 82500, placed: "15 Sep", start: "26 Oct", invoice: "RCT-2026-1026", invoiced: "26 Oct", status: "invoiced", settled: "Due 25 Nov" },
];
export const HV_MEMBERSHIP = { invoice: "RCT-2026-0112", date: "12 Jan", amount: 995, plan: "Professional", period: "12 Jan 2026 to 11 Jan 2027" };
/** The year so far: the three earlier hires plus any placement recorded live in this demo. */
export function yearTotals(s: RecruitState) {
  const live = s.placements.filter(p => p.employerId === s.employerId);
  const base = earlierTotals();
  const salaries = base.salaries + live.reduce((t, p) => t + p.salary, 0);
  const fees = base.fees + live.reduce((t, p) => t + p.salary * p.feeRate, 0);
  const agency = salaries * AGENCY_RATE;
  return { count: base.count + live.length, live, salaries, fees, agency, gross: agency - fees, net: agency - fees - HV_MEMBERSHIP.amount };
}
export const earlierTotals = () => {
  const salaries = HV_EARLIER.reduce((t, p) => t + p.salary, 0);
  const fees = salaries * FEE_RATE;
  const agency = salaries * AGENCY_RATE;
  return { count: HV_EARLIER.length, salaries, fees, agency, gross: agency - fees, net: agency - fees - HV_MEMBERSHIP.amount };
};

/* ── schedule an interview ──────────────────────────────────────────────── */

export interface ScheduleChoice { vacancyId: string; candidateId: string; label: string }

export function ScheduleInterviewModal(props: { open: boolean; onClose: () => void; vacancyId?: string; candidateId?: string; choices?: ScheduleChoice[] }) {
  if (!props.open) return null;
  return <ScheduleForm {...props} />;
}

function ScheduleForm({ onClose, vacancyId, candidateId, choices }: { onClose: () => void; vacancyId?: string; candidateId?: string; choices?: ScheduleChoice[] }) {
  const s = useRecruit();
  const prefs = usePrefs();
  const days = useMemo(() => workingDays(10), []);
  const initialPick = vacancyId && candidateId ? vacancyId + "|" + candidateId : choices?.[0] ? choices[0].vacancyId + "|" + choices[0].candidateId : "";
  const [pick, setPick] = useState(initialPick);
  const [day, setDay] = useState(3);
  const [time, setTime] = useState("10:00");
  const [format, setFormat] = useState<Interview["format"]>(prefs.interviewFormat);
  const [panel, setPanel] = useState<string[]>(prefs.interviewPanel);
  const [vid, cid] = pick.split("|");
  const v = vid ? vacancyById(vid, s) : undefined;
  if (!v || !cid) {
    return (
      <Modal open onClose={onClose} title="Schedule an interview" footer={<Button onClick={onClose}>Close</Button>}>
        <Note>Nobody is ready for an interview yet. Shortlist people first, then book a conversation.</Note>
      </Modal>
    );
  }
  const p = who(s, s.employerId, cid);
  const consent = consentState(s, s.employerId, cid);
  const round = s.interviews.filter(i => i.vacancyId === v.id && i.candidateId === cid).length + 1;
  const when = fmtDay(days[day]) + ", " + time;
  const options = [...EMPLOYER_TEAM.map(m => m.name), PANEL_EXTRA];
  const toggle = (n: string) => setPanel(list => (list.includes(n) ? list.filter(x => x !== n) : list.concat([n])));
  const submit = () => { scheduleInterview(v.id, cid, when, format, panel); onClose(); };

  return (
    <Modal open onClose={onClose} width={620} title="Schedule an interview"
      sub={choices ? "Pick the person, the time and who sits on the panel." : p.name + " for " + v.title + (round > 1 ? ". Earlier rounds stay on record." : ".")}
      footer={<>
        <span style={{ marginRight: "auto", fontSize: 12, color: "var(--faint)" }}>{when} · {format} · {prefs.interviewLength} min</span>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="primary" icon="calendar" disabled={!panel.length} onClick={submit}>Book interview</Button>
      </>}>
      <div className="rc-col" style={{ gap: 16 }}>
        {choices && (
          <Field label="Candidate">
            <Select value={pick} onChange={setPick} options={choices.map(o => ({ value: o.vacancyId + "|" + o.candidateId, label: o.label }))} />
          </Field>
        )}
        <div className="rc-grid rc-g2" style={{ gap: 12 }}>
          <Field label="Date">
            <Select value={String(day)} onChange={x => setDay(Number(x))} options={days.map((d, i) => ({ value: String(i), label: fmtDay(d) + " (" + relDay(d).toLowerCase() + ")" }))} />
          </Field>
          <Field label="Time">
            <Select value={time} onChange={setTime} options={TIMES} />
          </Field>
        </div>
        <Group label="Format">
          <Segmented value={format} onChange={setFormat} options={[{ id: "In person", label: "In person" }, { id: "Video", label: "Video" }, { id: "Phone", label: "Phone" }]} />
        </Group>
        <Group label="Panel" hint={panel.length ? panel.length + " on the panel. Defaults come from your organisation preferences." : "Choose at least one interviewer."}>
          <div className="rc-row rc-wrap" style={{ gap: 7 }}>
            {options.map(n => {
              const m = teamMember(n);
              return (
                <Chip2 key={n} on={panel.includes(n)} onClick={() => toggle(n)}>
                  {m ? <Avatar initials={m.initials} tint={m.tint} size={20} /> : <Icon name="users" size={13} />}
                  {n}{m ? <span style={{ color: "var(--faint)" }}>{m.role}</span> : null}
                </Chip2>
              );
            })}
          </div>
        </Group>
        {consent !== "shared" && (
          <Note tone="warn" icon="lock">
            {p.first} hasn't shared contact details yet. Recruit sends the invitation inside the platform, so nothing personal changes hands until they agree.
          </Note>
        )}
        <Note icon="calendar">Calendar sync is planned. In this demo the invitation appears in the candidate's portal and in Recruit HQ.</Note>
      </div>
    </Modal>
  );
}

function Chip2({ on, onClick, children }: { on: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button onClick={onClick} className="rc-chip-btn rc-focus" aria-pressed={on}
      style={{ display: "inline-flex", alignItems: "center", gap: 7, height: 32, padding: "0 12px 0 7px", borderRadius: "var(--r-ctl, 10px)", cursor: "pointer", fontSize: 12,
        background: on ? "var(--accent-soft)" : "var(--surface-2)", border: "1px solid " + (on ? "var(--accent-line)" : "var(--border)"), color: on ? "var(--ink)" : "var(--body)" }}>
      <span style={{ width: 14, height: 14, flex: "none", borderRadius: 5, border: "1.5px solid " + (on ? "var(--accent)" : "var(--border-strong)"), background: on ? "var(--accent)" : "transparent",
        color: "var(--on-accent)", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>{on && <Icon name="check" size={9} stroke={3.4} />}</span>
      {children}
    </button>
  );
}

/* ── offer package editor ───────────────────────────────────────────────── */

const roundK = (n: number) => Math.round(n / 1000) * 1000;

export function OfferEditorModal(props: { open: boolean; onClose: () => void; offer?: Offer; vacancyId?: string; candidateId?: string; onCreated?: (id: string) => void }) {
  if (!props.open) return null;
  return <OfferForm {...props} />;
}

function OfferForm({ onClose, offer, vacancyId, candidateId, onCreated }: { onClose: () => void; offer?: Offer; vacancyId?: string; candidateId?: string; onCreated?: (id: string) => void }) {
  const s = useRecruit();
  const vid = offer?.vacancyId || vacancyId || "";
  const cid = offer?.candidateId || candidateId || "";
  const v = vacancyById(vid, s) as Vacancy | undefined;
  const p = cid ? who(s, s.employerId, cid) : null;
  const mid = v ? roundK((v.salary[0] + v.salary[1]) / 2) : 0;
  const [salaryText, setSalaryText] = useState(String(offer?.salary ?? mid));
  const [bonus, setBonus] = useState(offer?.bonus ?? "Performance bonus up to 15% of base");
  const [benefits, setBenefits] = useState<string[]>(offer?.benefits ?? BENEFITS.slice(0, 3));
  const [start, setStart] = useState(offer?.start ?? "Mon 1 Feb 2027");
  const [expires, setExpires] = useState(offer?.expires ?? "Wed 2 Dec");
  const [note, setNote] = useState("");
  const [noteTouched, setNoteTouched] = useState(false);
  if (!v || !p) return null;
  const c = p.c;
  const showExp = visibilityOf(c.id, s).showSalary;
  const salary = Number(salaryText) || 0;
  const valid = salary >= 20000 && salary <= 400000;
  const resend = offer?.status === "changes requested";

  const changes: string[] = [];
  if (offer) {
    if (salary !== offer.salary) changes.push("salary " + (salary > offer.salary ? "raised" : "revised") + " to " + eur(salary));
    if (bonus !== offer.bonus) changes.push("bonus now: " + bonus);
    const added = benefits.filter(b => !offer.benefits.includes(b));
    const removed = offer.benefits.filter(b => !benefits.includes(b));
    if (added.length) changes.push("added " + added.join(", ").toLowerCase());
    if (removed.length) changes.push("removed " + removed.join(", ").toLowerCase());
    if (start !== offer.start) changes.push("start date " + start);
    if (expires !== offer.expires) changes.push("expiry " + expires);
  }
  const autoNote = changes.length ? "Package revised: " + changes.join("; ") + "." : "";
  const noteText = noteTouched ? note : autoNote;

  const lo = Math.floor((Math.min(c.marketRange[0], c.salaryExpectation[0], v.salary[0], salary || v.salary[0]) * 0.92) / 5000) * 5000;
  const hi = Math.ceil((Math.max(c.marketRange[1], c.salaryExpectation[1], v.salary[1], salary || v.salary[1]) * 1.06) / 5000) * 5000;
  const quick = [{ label: "Budget midpoint", value: mid }].concat(showExp ? [
    { label: p.first + "'s minimum", value: c.salaryExpectation[0] },
    { label: p.first + "'s midpoint", value: roundK((c.salaryExpectation[0] + c.salaryExpectation[1]) / 2) },
  ] : [{ label: "Budget top", value: v.salary[1] }]);
  const withCurrent = (list: string[], cur: string) => (list.includes(cur) ? list : [cur].concat(list));
  const toggle = (b: string) => setBenefits(list => (list.includes(b) ? list.filter(x => x !== b)
    : BENEFITS.filter(x => list.includes(x) || x === b).concat(list.filter(x => !BENEFITS.includes(x)))));

  const save = () => {
    if (!valid) return;
    if (offer) {
      if (!changes.length) return;
      editOffer(offer.id, { salary, bonus, benefits, start, expires }, noteText.trim() || autoNote);
    } else {
      const created = createOffer({ vacancyId: v.id, candidateId: c.id, salary, bonus, benefits, start, expires });
      if (created && onCreated) onCreated(created.id);
    }
    onClose();
  };

  return (
    <Modal open onClose={onClose} width={700}
      title={offer ? (resend ? "Revise and resend the offer" : "Edit the offer package") : "Create an offer"}
      sub={p.name + " · " + v.title + " · budget " + eurK(v.salary[0]) + " to " + eurK(v.salary[1])}
      footer={<>
        <span style={{ marginRight: "auto", fontSize: 12, color: "var(--faint)" }}>
          {offer ? (resend ? p.first + " sees the revised package straight away." : "Changes are added to the negotiation history.") : "Drafts stay hidden from " + p.first + " until approved and sent."}
        </span>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="primary" icon={resend ? "send" : "check"} disabled={!valid || (!!offer && !changes.length)} onClick={save}>
          {offer ? (resend ? "Resend revised offer" : "Save changes") : "Save draft offer"}
        </Button>
      </>}>
      <div className="rc-col" style={{ gap: 16 }}>
        <div className="rc-grid rc-g-3-2" style={{ gap: 14, alignItems: "start" }}>
          <Field label="Base salary" error={valid ? undefined : "Enter a salary between €20,000 and €400,000."}>
            <div style={{ position: "relative" }}>
              <span style={{ position: "absolute", left: 13, top: 11, fontSize: 13.5, color: "var(--dim)" }}>€</span>
              <TextInput type="number" min={20000} max={400000} step={1000} value={salaryText} onChange={e => setSalaryText(e.target.value)} style={{ paddingLeft: 26, fontVariantNumeric: "tabular-nums" }} />
            </div>
          </Field>
          <Group label="Quick set">
            <div className="rc-row rc-wrap" style={{ gap: 6 }}>
              {quick.map(q => (
                <button key={q.label} onClick={() => setSalaryText(String(q.value))} className="rc-chip-btn rc-focus"
                  style={{ height: 28, padding: "0 10px", borderRadius: "var(--r-ctl, 10px)", fontSize: 11.5, cursor: "pointer", background: salary === q.value ? "var(--accent-soft)" : "var(--surface-2)", border: "1px solid " + (salary === q.value ? "var(--accent-line)" : "var(--border)"), color: "var(--body)" }}>
                  {q.label} {eurK(q.value)}
                </button>
              ))}
            </div>
          </Group>
        </div>
        <div style={{ padding: "12px 14px 4px", borderRadius: "var(--r-sm, 12px)", background: "var(--surface-faint)", border: "1px solid var(--border)" }}>
          <div className="rc-row" style={{ gap: 8 }}>
            <Label>Package against expectations</Label>
            <span className="rc-grow" />
            <span style={{ fontSize: 11, color: "var(--faint)" }}>{showExp ? "Bar: market range (illustrative) · dashed: stated expectation" : "Bar: market range (illustrative). Expectation not shared."}</span>
          </div>
          <RangeBar min={lo} max={hi} band={c.marketRange} scenario={showExp ? c.salaryExpectation : null} marker={valid ? salary : undefined} markerLabel="Offer" format={eurK} />
        </div>
        <Field label="Bonus">
          <TextInput value={bonus} onChange={e => setBonus(e.target.value)} />
        </Field>
        <Group label="Benefits">
          <div className="rc-grid rc-g2" style={{ gap: 2 }}>
            {BENEFITS.map(b => <Checkbox key={b} on={benefits.includes(b)} onChange={() => toggle(b)} label={b} />)}
          </div>
        </Group>
        <div className="rc-grid rc-g2" style={{ gap: 12 }}>
          <Field label="Start date"><Select value={start} onChange={setStart} options={withCurrent(START_OPTIONS, start)} /></Field>
          <Field label="Offer expires"><Select value={expires} onChange={setExpires} options={withCurrent(EXPIRY_OPTIONS, expires)} /></Field>
        </div>
        {offer && (
          <Field label="Note for the negotiation history" hint={noteTouched ? undefined : "Written from your changes. Edit it if you like."}>
            <TextInput value={noteText} placeholder="What changed and why" onChange={e => { setNoteTouched(true); setNote(e.target.value); }} />
          </Field>
        )}
      </div>
    </Modal>
  );
}
