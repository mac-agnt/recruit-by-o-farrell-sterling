import { useSyncExternalStore } from "react";
import {
  APPLICATIONS, CANDIDATE_THREADS, COMMISSION_RULES, EMPLOYER_THREADS, ENROLMENTS, GOVERNANCE, INTERVIEWS, INTRO_REQUESTS,
  OFFERS, PIPELINE, PLACEMENTS, SEED_ACTIVITY, TIERS, VACANCIES, CANDIDATE_BY_ID, COURSE_BY_ID, EMPLOYER_BY_ID,
} from "./data";
import type {
  ActivityEvent, Application, Enrolment, Interview, IntroRequest, MessageThread, Offer, OfferEvent, PipelineEntry, Placement, Stage, Vacancy,
} from "./data/types";
import type { Tier } from "./data/metrics";
import { eur } from "./format";

/* One shared store for every portal. Actions change state; every view reads
   the same state, so a change made as an employer shows up for the candidate
   and in HQ straight away. Persisted to this browser only. */

export interface ProfileEdits {
  title?: string; summary?: string; location?: string; preferredRoles?: string[]; interests?: string[];
  salaryExpectation?: [number, number]; availability?: string; noticeWeeks?: number; addedSkills?: string[];
}
export interface VisibilitySettings {
  mode: "discoverable" | "anonymous" | "hidden"; blockCurrentEmployer: boolean; showSalary: boolean;
  seniorOffers: boolean; contactAfterConsent: boolean;
}
export interface Calc { salary: number; agencyRate: number; recruitRate: number; membership: number; includeMembership: boolean }
export type DrawerKind = "candidate" | "vacancy" | "employer" | "course" | "offer" | "agent";
export interface Drawer { kind: DrawerKind; id: string; ctx?: Record<string, string> }
export interface Toast { id: number; text: string; tone: "ok" | "accent" | "warn" | "bad" }

export interface RecruitState {
  v: number;
  persona: string;
  employerId: string;
  activeVacancy: string;
  profiles: Record<string, ProfileEdits>;
  cv: { status: "idle" | "running" | "done"; stage: number; source: string | null; fileName: string | null };
  savedJobs: Record<string, string[]>;
  applications: Application[];
  enrolments: Enrolment[];
  offers: Offer[];
  placements: Placement[];
  visibility: Record<string, VisibilitySettings>;
  indexActions: Record<string, "done" | "pending">;
  /** Credentials a person recorded as confirmed by the issuer (key: candidateId|item). */
  verifiedItems: Record<string, true>;
  createdVacancies: Vacancy[];
  vacancyStatus: Record<string, Vacancy["status"]>;
  pipeline: PipelineEntry[];
  interviews: Interview[];
  intros: IntroRequest[];
  savedCandidates: string[];
  compare: string[];
  employerThreads: MessageThread[];
  candidateThreads: Record<string, MessageThread[]>;
  membershipTier: number;
  calc: Calc;
  tiers: Tier[];
  commissionRules: typeof COMMISSION_RULES;
  governance: Record<string, boolean>;
  activity: ActivityEvent[];
  readThreads: string[];
  /* Not persisted */
  drawer: Drawer | null;
  toast: Toast | null;
}

const VERSION = 3;
const KEY = "recruit-demo-state";

export const DEFAULT_CALC: Calc = { salary: 120000, agencyRate: 0.25, recruitRate: 0.08, membership: 995, includeMembership: true };
const defaultVisibility = (): VisibilitySettings => ({ mode: "discoverable", blockCurrentEmployer: true, showSalary: true, seniorOffers: false, contactAfterConsent: true });

function seed(): RecruitState {
  return {
    v: VERSION,
    persona: "c-aoife",
    employerId: "e-harbourview",
    activeVacancy: "v-hv-gm",
    profiles: {},
    cv: { status: "idle", stage: 0, source: null, fileName: null },
    savedJobs: { "c-aoife": ["v-ch-rged", "v-ac-hm"], "c-mark": ["v-nl-eod"], "c-sarah": [] },
    applications: APPLICATIONS.map(a => ({ ...a })),
    enrolments: ENROLMENTS.map(e => ({ ...e })),
    offers: OFFERS.map(o => ({ ...o, benefits: o.benefits.slice(), history: o.history.slice() })),
    placements: PLACEMENTS.map(p => ({ ...p })),
    visibility: { "c-aoife": defaultVisibility(), "c-mark": defaultVisibility(), "c-sarah": { ...defaultVisibility(), seniorOffers: true } },
    indexActions: {},
    verifiedItems: {},
    createdVacancies: [],
    vacancyStatus: {},
    pipeline: PIPELINE.map(p => ({ ...p })),
    interviews: INTERVIEWS.map(i => ({ ...i })),
    intros: INTRO_REQUESTS.map(i => ({ ...i })),
    savedCandidates: ["c-sarah", "c-niamh", "c-priya"],
    compare: ["c-sarah", "c-declan", "c-niamh"],
    employerThreads: EMPLOYER_THREADS.map(t => ({ ...t, messages: t.messages.slice() })),
    candidateThreads: Object.fromEntries(Object.entries(CANDIDATE_THREADS).map(([k, list]) => [k, list.map(t => ({ ...t, messages: t.messages.slice() }))])),
    membershipTier: 3,
    calc: { ...DEFAULT_CALC },
    tiers: TIERS.map(t => ({ ...t })),
    commissionRules: COMMISSION_RULES.map(r => ({ ...r })),
    governance: Object.fromEntries(GOVERNANCE.map(g => [g.id, g.on])),
    activity: SEED_ACTIVITY.slice().sort((a, b) => b.at - a.at),
    readThreads: [],
    drawer: null,
    toast: null,
  };
}

function load(): RecruitState {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const saved = JSON.parse(raw);
      if (saved && saved.v === VERSION) return { ...seed(), ...saved, drawer: null, toast: null };
    }
  } catch { /* storage blocked: fall back to the seed */ }
  return seed();
}

let state: RecruitState = load();
const listeners = new Set<() => void>();
let saveTimer: ReturnType<typeof setTimeout> | null = null;

function persist() {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try {
      const { drawer: _d, toast: _t, ...rest } = state;
      localStorage.setItem(KEY, JSON.stringify(rest));
    } catch { /* ignore */ }
  }, 150);
}

export function getState() { return state; }
export function subscribe(fn: () => void) { listeners.add(fn); return () => { listeners.delete(fn); }; }

/** Apply a change. `recipe` returns the fields that changed. */
export function update(recipe: (s: RecruitState) => Partial<RecruitState> | null | void) {
  const patch = recipe(state);
  if (!patch) return;
  state = { ...state, ...patch };
  persist();
  listeners.forEach(l => l());
}

/** The whole state; components derive what they need with useMemo. */
export function useRecruit(): RecruitState {
  return useSyncExternalStore(subscribe, getState, getState);
}

/* ── feedback ───────────────────────────────────────────────────────────── */
let toastSeq = 0;
export function notify(text: string, tone: Toast["tone"] = "ok") {
  const id = ++toastSeq;
  update(() => ({ toast: { id, text, tone } }));
  setTimeout(() => update(s => (s.toast && s.toast.id === id ? { toast: null } : null)), 3400);
}

const clock = () => new Date().toLocaleTimeString("en-IE", { hour: "2-digit", minute: "2-digit" });
const today = () => "Today " + clock();
let evSeq = 0;
export function logActivity(e: Omit<ActivityEvent, "id" | "at" | "when"> & { when?: string }) {
  const ev: ActivityEvent = { id: "live" + Date.now() + "-" + (++evSeq), at: Date.now(), when: e.when || "Just now", ...e };
  update(s => ({ activity: [ev].concat(s.activity).slice(0, 160) }));
}

const name = (id: string) => CANDIDATE_BY_ID[id]?.name || "A candidate";
/** How employer-side log lines refer to a person: anonymous profiles stay anonymous. */
const shown = (id: string) => {
  const c = CANDIDATE_BY_ID[id];
  if (!c) return "A candidate";
  const mode = state.visibility[id]?.mode || c.visibility;
  return mode === "anonymous" ? "Professional #" + (40000 + c.recruitIndex * 37 % 9999) + " (anonymous profile)" : c.name;
};
const first = (id: string) => name(id).split(" ")[0];

/* ── drawers ────────────────────────────────────────────────────────────── */
export const openDrawer = (kind: DrawerKind, id: string, ctx?: Record<string, string>) => update(() => ({ drawer: { kind, id, ctx } }));
export const closeDrawer = () => update(() => ({ drawer: null }));

/* ── vacancies ──────────────────────────────────────────────────────────── */
export function allVacancies(s: RecruitState = state): Vacancy[] {
  return VACANCIES.map(v => (s.vacancyStatus[v.id] ? { ...v, status: s.vacancyStatus[v.id] } : v)).concat(
    s.createdVacancies.map(v => (s.vacancyStatus[v.id] ? { ...v, status: s.vacancyStatus[v.id] } : v)));
}
export const vacancyById = (id: string, s: RecruitState = state) => allVacancies(s).find(v => v.id === id);

export function createVacancy(input: Omit<Vacancy, "id" | "postedDays" | "status" | "applicants" | "created">): Vacancy {
  const id = "v-new-" + Date.now().toString(36);
  const vac: Vacancy = { ...input, id, postedDays: 0, status: "open", applicants: 0, created: true };
  update(s => ({ createdVacancies: s.createdVacancies.concat([vac]), activeVacancy: id }));
  const emp = EMPLOYER_BY_ID[input.employerId];
  logActivity({ category: "hiring", actor: emp?.contact || "Employer", title: "Vacancy posted", detail: (emp?.name || "An employer") + " posted " + input.title + " (" + eur(input.salary[0]) + " to " + eur(input.salary[1]) + ").", refs: [id, input.employerId] });
  notify(input.title + " is live. Matching talent now.");
  return vac;
}
export function setVacancyStatus(id: string, status: Vacancy["status"]) {
  update(s => ({ vacancyStatus: { ...s.vacancyStatus, [id]: status } }));
  const v = vacancyById(id);
  logActivity({ category: "hiring", actor: "Rachel Moran", title: "Vacancy " + status, detail: (v?.title || "A vacancy") + " is now " + status + ".", refs: [id] });
  notify((v?.title || "Vacancy") + " marked " + status, status === "open" ? "ok" : "accent");
}
export const setActiveVacancy = (id: string) => update(() => ({ activeVacancy: id }));

/* ── pipeline ───────────────────────────────────────────────────────────── */
const STAGE_TO_APP: Partial<Record<Stage, Application["status"]>> = { shortlisted: "viewed", contact: "viewed", interview: "interview", offer: "offer" };

export function pipelineFor(vacancyId: string, candidateId: string, s: RecruitState = state) {
  return s.pipeline.find(p => p.vacancyId === vacancyId && p.candidateId === candidateId);
}

export function addToPipeline(vacancyId: string, candidateId: string, stage: Stage = "shortlisted", source: PipelineEntry["source"] = "search") {
  const existing = pipelineFor(vacancyId, candidateId);
  if (existing) { moveStage(existing.id, stage); return; }
  const entry: PipelineEntry = { id: "p" + Date.now().toString(36), vacancyId, candidateId, stage, source, updated: "Just now" };
  update(s => ({ pipeline: s.pipeline.concat([entry]) }));
  const v = vacancyById(vacancyId);
  logActivity({ category: "hiring", actor: "Rachel Moran", title: stage === "shortlisted" ? "Candidate shortlisted" : "Added to pipeline",
    detail: shown(candidateId) + " was " + (stage === "shortlisted" ? "shortlisted" : "added") + " for " + (v?.title || "a vacancy") + ".", refs: [candidateId, vacancyId] });
  notify(first(candidateId) + " added to the " + (v?.title || "") + " shortlist");
}

export function removeFromPipeline(vacancyId: string, candidateId: string) {
  const entry = pipelineFor(vacancyId, candidateId);
  if (!entry) return;
  update(s => ({ pipeline: s.pipeline.filter(p => p.id !== entry.id) }));
  notify(first(candidateId) + " removed from the pipeline", "accent");
}

export function moveStage(entryId: string, stage: Stage) {
  const entry = state.pipeline.find(p => p.id === entryId);
  if (!entry || entry.stage === stage) return;
  update(s => ({
    pipeline: s.pipeline.map(p => (p.id === entryId ? { ...p, stage, updated: "Just now" } : p)),
    applications: s.applications.map(a => (a.candidateId === entry.candidateId && a.vacancyId === entry.vacancyId && STAGE_TO_APP[stage]
      ? { ...a, status: STAGE_TO_APP[stage]! } : a)),
  }));
  const v = vacancyById(entry.vacancyId);
  logActivity({ category: "hiring", actor: "Rachel Moran", title: "Pipeline stage changed", detail: shown(entry.candidateId) + " moved to " + stage + " for " + (v?.title || "a vacancy") + ".", refs: [entry.candidateId, entry.vacancyId] });
  if (stage === "contact") requestIntroduction(entry.vacancyId, entry.candidateId, true);
  else notify(first(entry.candidateId) + " moved to " + stage);
}

/* ── consent and introductions ──────────────────────────────────────────── */
export function introFor(employerId: string, candidateId: string, s: RecruitState = state) {
  return s.intros.find(i => i.candidateId === candidateId && vacancyById(i.vacancyId, s)?.employerId === employerId);
}
/** Contact details are only visible once the candidate has accepted an introduction or an offer exists. */
export function contactVisible(employerId: string, candidateId: string, s: RecruitState = state) {
  const intro = introFor(employerId, candidateId, s);
  return intro?.status === "accepted" || s.offers.some(o => o.employerId === employerId && o.candidateId === candidateId && o.visibleToCandidate);
}

export function requestIntroduction(vacancyId: string, candidateId: string, quiet = false) {
  const v = vacancyById(vacancyId);
  if (!v) return;
  if (!pipelineFor(vacancyId, candidateId)) {
    update(s => ({ pipeline: s.pipeline.concat([{ id: "p" + Date.now().toString(36), vacancyId, candidateId, stage: "contact", source: "search", updated: "Just now" }]) }));
  } else if (!quiet) {
    const entry = pipelineFor(vacancyId, candidateId)!;
    update(s => ({ pipeline: s.pipeline.map(p => (p.id === entry.id ? { ...p, stage: "contact", updated: "Just now" } : p)) }));
  }
  if (introFor(v.employerId, candidateId)) { notify("Introduction already requested", "accent"); return; }
  const intro: IntroRequest = { id: "ir" + Date.now().toString(36), vacancyId, candidateId, status: "pending", date: "Just now" };
  update(s => ({ intros: s.intros.concat([intro]) }));
  logActivity({ category: "hiring", actor: EMPLOYER_BY_ID[v.employerId]?.short || "Employer", title: "Introduction requested", detail: "Introduction requested to " + shown(candidateId) + " for " + v.title + ". Contact details stay hidden until they agree.", refs: [candidateId, vacancyId], status: "awaiting" });
  notify("Introduction requested. " + first(candidateId) + " decides whether to share contact details.", "accent");
  const persona = !!CANDIDATE_BY_ID[candidateId]?.story;
  if (!persona) {
    // Simulated candidate response for sample records. Personas answer in the candidate portal.
    setTimeout(() => respondIntroduction(intro.id, "accepted", true), 4200);
  }
}

export function respondIntroduction(introId: string, status: "accepted" | "declined", simulated = false) {
  const intro = state.intros.find(i => i.id === introId);
  if (!intro || intro.status !== "pending") return;
  update(s => ({ intros: s.intros.map(i => (i.id === introId ? { ...i, status } : i)) }));
  const v = vacancyById(intro.vacancyId);
  logActivity({ category: "hiring", actor: name(intro.candidateId), title: status === "accepted" ? "Introduction accepted" : "Introduction declined",
    detail: name(intro.candidateId) + (status === "accepted" ? " agreed to share contact details with " : " declined an introduction from ") + (EMPLOYER_BY_ID[v?.employerId || ""]?.name || "an employer") + (simulated ? " (simulated response)." : "."), refs: [intro.candidateId, intro.vacancyId] });
  notify(first(intro.candidateId) + (status === "accepted" ? " accepted the introduction" : " declined the introduction"), status === "accepted" ? "ok" : "warn");
}

/* ── interviews ─────────────────────────────────────────────────────────── */
export function scheduleInterview(vacancyId: string, candidateId: string, when: string, format: Interview["format"], panel: string[]) {
  const round = state.interviews.filter(i => i.vacancyId === vacancyId && i.candidateId === candidateId).reduce((m, i) => Math.max(m, i.round), 0) + 1;
  const iv: Interview = { id: "i" + Date.now().toString(36), vacancyId, candidateId, when, format, panel, round, status: "scheduled" };
  update(s => ({ interviews: s.interviews.concat([iv]) }));
  const entry = pipelineFor(vacancyId, candidateId);
  if (entry && entry.stage !== "interview") {
    update(s => ({ pipeline: s.pipeline.map(p => (p.id === entry.id ? { ...p, stage: "interview", updated: "Just now" } : p)),
      applications: s.applications.map(a => (a.candidateId === candidateId && a.vacancyId === vacancyId ? { ...a, status: "interview" } : a)) }));
  } else if (!entry) addToPipeline(vacancyId, candidateId, "interview");
  const v = vacancyById(vacancyId);
  logActivity({ category: "hiring", actor: "Rachel Moran", title: "Interview scheduled", detail: shown(candidateId) + ", " + (v?.title || "") + ", round " + round + ": " + when + " (" + format.toLowerCase() + ").", refs: [candidateId, vacancyId] });
  notify("Interview booked with " + first(candidateId) + " for " + when);
}

/* ── offers ─────────────────────────────────────────────────────────────── */
const offerEvent = (who: string, text: string, kind: OfferEvent["kind"]): OfferEvent => ({ when: today(), who, text, kind });
function patchOffer(id: string, patch: Partial<Offer>, ev?: OfferEvent) {
  update(s => ({ offers: s.offers.map(o => (o.id === id ? { ...o, ...patch, history: ev ? o.history.concat([ev]) : o.history } : o)) }));
}
export const offerById = (id: string, s: RecruitState = state) => s.offers.find(o => o.id === id);

export function createOffer(input: { vacancyId: string; candidateId: string; salary: number; bonus: string; benefits: string[]; start: string; expires: string; location?: string }) {
  const v = vacancyById(input.vacancyId);
  if (!v) return null;
  const id = "o" + Date.now().toString(36);
  const offer: Offer = { id, vacancyId: input.vacancyId, employerId: v.employerId, candidateId: input.candidateId, title: v.title, salary: input.salary,
    bonus: input.bonus, benefits: input.benefits, location: input.location || v.location, start: input.start, expires: input.expires,
    status: "draft", visibleToCandidate: false, approver: "Deirdre Foley",
    history: [offerEvent("Rachel Moran", "Offer drafted: " + eur(input.salary), "employer")] };
  update(s => ({ offers: s.offers.concat([offer]) }));
  const entry = pipelineFor(input.vacancyId, input.candidateId);
  if (entry) update(s => ({ pipeline: s.pipeline.map(p => (p.id === entry.id ? { ...p, stage: "offer", updated: "Just now" } : p)) }));
  else addToPipeline(input.vacancyId, input.candidateId, "offer");
  logActivity({ category: "hiring", actor: "Rachel Moran", title: "Offer drafted", detail: "Draft offer for " + name(input.candidateId) + ": " + v.title + ", " + eur(input.salary) + ". Not visible to the candidate yet.", refs: [id, input.candidateId] });
  notify("Offer drafted. Send it for approval when ready.", "accent");
  return offer;
}
export function editOffer(id: string, patch: Partial<Pick<Offer, "salary" | "bonus" | "benefits" | "start" | "expires">>, note: string) {
  const o = offerById(id);
  if (!o) return;
  const resend = o.status === "changes requested";
  patchOffer(id, { ...patch, ...(resend ? { status: "sent" as const } : {}) }, offerEvent("Rachel Moran", note, "employer"));
  logActivity({ category: "hiring", actor: "Rachel Moran", title: resend ? "Offer revised and resent" : "Offer edited", detail: name(o.candidateId) + ": " + note, refs: [id, o.candidateId] });
  notify(resend ? "Revised offer sent to " + first(o.candidateId) : "Offer updated");
}
export function submitOffer(id: string) {
  const o = offerById(id); if (!o) return;
  patchOffer(id, { status: "awaiting approval" }, offerEvent("Rachel Moran", "Sent to " + (o.approver || "the approver") + " for approval", "system"));
  logActivity({ category: "hiring", actor: "Rachel Moran", title: "Offer sent for approval", detail: name(o.candidateId) + ", " + o.title + ": waiting on " + (o.approver || "approval") + ".", refs: [id], status: "awaiting" });
  notify("Sent to " + (o.approver || "the approver") + " for approval", "accent");
}
export function approveOffer(id: string) {
  const o = offerById(id); if (!o) return;
  patchOffer(id, { status: "approved" }, offerEvent(o.approver || "Approver", "Approved", "approval"));
  logActivity({ category: "hiring", actor: o.approver || "Approver", title: "Offer approved", detail: name(o.candidateId) + ", " + o.title + ", " + eur(o.salary) + ".", refs: [id] });
  notify("Offer approved. Ready to send.");
}
export function sendOffer(id: string) {
  const o = offerById(id); if (!o) return;
  patchOffer(id, { status: "sent", visibleToCandidate: true, contingency: false }, offerEvent("Recruit", "Sent to " + first(o.candidateId), "system"));
  logActivity({ category: "hiring", actor: EMPLOYER_BY_ID[o.employerId]?.short || "Employer", title: "Offer sent", detail: name(o.candidateId) + " received an offer for " + o.title + ": " + eur(o.salary) + ".", refs: [id, o.candidateId] });
  notify("Offer sent to " + first(o.candidateId));
}
export function withdrawOffer(id: string) {
  const o = offerById(id); if (!o) return;
  patchOffer(id, { status: "withdrawn" }, offerEvent("Rachel Moran", "Offer withdrawn", "employer"));
  logActivity({ category: "hiring", actor: "Rachel Moran", title: "Offer withdrawn", detail: name(o.candidateId) + ", " + o.title + ".", refs: [id] });
  notify("Offer withdrawn", "warn");
}

export function respondOffer(id: string, kind: "question" | "changes" | "accept" | "decline", message = "") {
  const o = offerById(id); if (!o) return;
  const who = name(o.candidateId);
  const emp = EMPLOYER_BY_ID[o.employerId];
  if (kind === "question") {
    patchOffer(id, {}, offerEvent(who, "Asked: " + message, "candidate"));
    addThreadMessage(o.candidateId, o.employerId, message, id);
    notify("Question sent to " + (emp?.short || "the employer"));
    logActivity({ category: "hiring", actor: who, title: "Question on an offer", detail: who + " asked " + (emp?.short || "the employer") + ": " + message, refs: [id] });
    return;
  }
  if (kind === "changes") {
    patchOffer(id, { status: "changes requested" }, offerEvent(who, "Requested changes: " + message, "candidate"));
    addThreadMessage(o.candidateId, o.employerId, "Requested changes: " + message, id);
    logActivity({ category: "hiring", actor: who, title: "Changes requested", detail: who + " asked " + (emp?.short || "the employer") + " for changes: " + message, refs: [id], status: "awaiting" });
    notify("Change request sent to " + (emp?.short || "the employer"), "accent");
    return;
  }
  if (kind === "decline") {
    patchOffer(id, { status: "declined" }, offerEvent(who, message ? "Declined: " + message : "Declined", "candidate"));
    logActivity({ category: "hiring", actor: who, title: "Offer declined", detail: who + " declined " + (emp?.short || "the employer") + "'s offer for " + o.title + ".", refs: [id] });
    notify("Offer declined. " + (emp?.short || "The employer") + " has been told.", "warn");
    return;
  }
  // Accept: the hire, the placement and the success fee all follow from here.
  const rate = state.commissionRules[0]?.rate ?? 0.08;
  const placement: Placement = { id: "pl" + Date.now().toString(36), candidateId: o.candidateId, employerId: o.employerId, vacancyId: o.vacancyId,
    salary: o.salary, feeRate: rate, date: "Today", startDate: o.start, invoice: "pending" };
  update(s => ({
    offers: s.offers.map(x => (x.id === id ? { ...x, status: "accepted", history: x.history.concat([offerEvent(who, "Accepted", "candidate")]) } : x)),
    pipeline: s.pipeline.map(p => (p.candidateId === o.candidateId && p.vacancyId === o.vacancyId ? { ...p, stage: "hired", updated: "Just now" } : p)),
    placements: [placement].concat(s.placements),
    vacancyStatus: { ...s.vacancyStatus, [o.vacancyId]: "filled" },
  }));
  logActivity({ category: "hiring", actor: who, title: "Offer accepted", detail: who + " accepted " + (emp?.name || "the employer") + "'s offer: " + o.title + ", " + eur(o.salary) + ".", refs: [id, o.candidateId] });
  logActivity({ category: "financial", actor: "Recruit", title: "Success fee due", detail: eur(o.salary * rate) + " success fee (" + Math.round(rate * 100) + "%) due from " + (emp?.name || "the employer") + " on the start date. A 25% agency fee would have been " + eur(o.salary * 0.25) + ".", refs: [placement.id, o.employerId] });
  notify(who.split(" ")[0] + " accepted. Placement and success fee recorded.");
}

function addThreadMessage(candidateId: string, employerId: string, text: string, ref: string) {
  const emp = EMPLOYER_BY_ID[employerId];
  update(s => {
    const list = (s.candidateThreads[candidateId] || []).slice();
    const at = list.findIndex(t => t.refs.includes(ref));
    if (at > -1) list[at] = { ...list[at], messages: list[at].messages.concat([{ from: "me", text, when: "Just now" }]) };
    else list.unshift({ id: "ct" + Date.now().toString(36), with: emp?.contact || "Employer", withRole: (emp?.contactRole || "") + ", " + (emp?.name || ""), initials: emp?.initials || "EM", tint: emp?.tint || "#9fb4ff", subject: "Offer", unread: false, refs: [ref], messages: [{ from: "me", text, when: "Just now" }] });
    const emps = s.employerThreads.slice();
    const et = emps.findIndex(t => t.refs.includes(ref) || t.refs.includes(candidateId));
    if (employerId === s.employerId) {
      if (et > -1) emps[et] = { ...emps[et], unread: true, messages: emps[et].messages.concat([{ from: "them", text, when: "Just now" }]) };
      else emps.unshift({ id: "t" + Date.now().toString(36), with: name(candidateId), withRole: "Candidate", initials: CANDIDATE_BY_ID[candidateId]?.initials || "", tint: CANDIDATE_BY_ID[candidateId]?.tint || "#9fb4ff", subject: "Offer", unread: true, refs: [ref, candidateId], messages: [{ from: "them", text, when: "Just now" }] });
    }
    return { candidateThreads: { ...s.candidateThreads, [candidateId]: list }, employerThreads: emps };
  });
}

/** Messages typed in either inbox. */
export function sendMessage(threadId: string, text: string, side: "employer" | "candidate", candidateId?: string) {
  if (!text.trim()) return;
  if (side === "employer") update(s => ({ employerThreads: s.employerThreads.map(t => (t.id === threadId ? { ...t, messages: t.messages.concat([{ from: "me", text, when: "Just now" }]) } : t)) }));
  else if (candidateId) update(s => ({ candidateThreads: { ...s.candidateThreads, [candidateId]: (s.candidateThreads[candidateId] || []).map(t => (t.id === threadId ? { ...t, messages: t.messages.concat([{ from: "me", text, when: "Just now" }]) } : t)) } }));
  notify("Message sent");
}
export const markThreadRead = (id: string) => update(s => (s.readThreads.includes(id) ? null : { readThreads: s.readThreads.concat([id]) }));

/* ── candidate actions ──────────────────────────────────────────────────── */
export const setPersona = (id: string) => update(() => ({ persona: id }));

export function updateProfile(candidateId: string, patch: ProfileEdits, label = "Profile updated") {
  update(s => ({ profiles: { ...s.profiles, [candidateId]: { ...(s.profiles[candidateId] || {}), ...patch } } }));
  logActivity({ category: "profiles", actor: name(candidateId), title: label, detail: name(candidateId) + " updated their profile. Matching and market value were refreshed.", refs: [candidateId] });
  notify(label + ". Matches refreshed.");
}

export function toggleSavedJob(candidateId: string, vacancyId: string) {
  const list = state.savedJobs[candidateId] || [];
  const saved = list.includes(vacancyId);
  update(s => ({ savedJobs: { ...s.savedJobs, [candidateId]: saved ? list.filter(x => x !== vacancyId) : list.concat([vacancyId]) } }));
  notify(saved ? "Removed from saved jobs" : "Saved to your jobs", saved ? "accent" : "ok");
}

export function applyToJob(candidateId: string, vacancyId: string, note = "") {
  if (state.applications.some(a => a.candidateId === candidateId && a.vacancyId === vacancyId && a.status !== "withdrawn")) { notify("You've already applied", "accent"); return; }
  const app: Application = { id: "a" + Date.now().toString(36), candidateId, vacancyId, status: "submitted", date: "Today", note };
  update(s => ({ applications: [app].concat(s.applications) }));
  if (!pipelineFor(vacancyId, candidateId)) {
    update(s => ({ pipeline: s.pipeline.concat([{ id: "p" + Date.now().toString(36), vacancyId, candidateId, stage: "identified", source: "applied", updated: "Just now", note: "Applied through Recruit" }]) }));
  }
  const v = vacancyById(vacancyId);
  logActivity({ category: "hiring", actor: name(candidateId), title: "Application submitted", detail: name(candidateId) + " applied for " + (v?.title || "a role") + " at " + (EMPLOYER_BY_ID[v?.employerId || ""]?.name || "an employer") + ".", refs: [candidateId, vacancyId] });
  notify("Application sent to " + (EMPLOYER_BY_ID[v?.employerId || ""]?.short || "the employer"));
}
export function withdrawApplication(appId: string) {
  const a = state.applications.find(x => x.id === appId); if (!a) return;
  update(s => ({ applications: s.applications.map(x => (x.id === appId ? { ...x, status: "withdrawn" } : x)), pipeline: s.pipeline.filter(p => !(p.candidateId === a.candidateId && p.vacancyId === a.vacancyId && p.source === "applied" && p.stage === "identified")) }));
  notify("Application withdrawn", "warn");
}

export function enrol(candidateId: string, courseId: string) {
  if (state.enrolments.some(e => e.candidateId === candidateId && e.courseId === courseId)) { notify("Already enrolled", "accent"); return; }
  const en: Enrolment = { id: "en" + Date.now().toString(36), candidateId, courseId, date: "Today", status: "enrolled", progress: 0 };
  update(s => ({ enrolments: [en].concat(s.enrolments) }));
  const c = COURSE_BY_ID[courseId];
  logActivity({ category: "learning", actor: name(candidateId), title: "Course enrolment", detail: name(candidateId) + " enrolled in " + (c?.title || "a course") + " with the member discount (demo, no payment taken).", refs: [candidateId, courseId, c?.partnerId || ""] });
  notify("Enrolled in " + (c?.title || "the course") + ". Added to your development plan.");
}

export function setVisibility(candidateId: string, patch: Partial<VisibilitySettings>) {
  update(s => ({ visibility: { ...s.visibility, [candidateId]: { ...(s.visibility[candidateId] || defaultVisibility()), ...patch } } }));
  notify("Privacy settings saved");
}
export const visibilityOf = (candidateId: string, s: RecruitState = state) => s.visibility[candidateId] || defaultVisibility();

export function completeIndexAction(actionId: string, mode: "done" | "pending", candidateId: string, label: string) {
  update(s => ({ indexActions: { ...s.indexActions, [actionId]: mode } }));
  logActivity({ category: "profiles", actor: name(candidateId), title: mode === "done" ? "Profile evidence added" : "Sent for verification", detail: name(candidateId) + ": " + label + ".", refs: [candidateId], status: mode === "done" ? "completed" : "awaiting" });
  notify(mode === "done" ? "Evidence added. Recruit Index updated." : "Sent for verification. Points apply once confirmed.", mode === "done" ? "ok" : "accent");
}

/** A person records an issuer's confirmation. Agents never call this. */
export function recordVerification(candidateId: string, item: string, by: string) {
  update(s => ({ verifiedItems: { ...s.verifiedItems, [candidateId + "|" + item]: true } }));
  // Evidence the candidate was waiting on now counts towards their index.
  if (/opera/i.test(item) && state.indexActions["ia-opera"] !== "done") update(s => ({ indexActions: { ...s.indexActions, "ia-opera": "done" } }));
}

export function startCv(source: string, fileName: string | null) { update(() => ({ cv: { status: "running", stage: 0, source, fileName } })); }
export function advanceCv(total: number) {
  const was = state.cv.status;
  update(s => {
    if (s.cv.status !== "running") return null;
    const stage = s.cv.stage + 1;
    return { cv: stage >= total ? { ...s.cv, status: "done", stage: total } : { ...s.cv, stage } };
  });
  if (was === "running" && state.cv.status === "done") {
    logActivity({ category: "profiles", actor: "Profile Intelligence", title: "CV analysed", detail: "A CV was structured into a profile from prepared demo data. Nothing was sent to an external service.", refs: [state.persona] });
  }
}
export const resetCv = () => update(() => ({ cv: { status: "idle", stage: 0, source: null, fileName: null } }));

/* ── employer actions ───────────────────────────────────────────────────── */
export function toggleSavedCandidate(id: string) {
  const saved = state.savedCandidates.includes(id);
  update(s => ({ savedCandidates: saved ? s.savedCandidates.filter(x => x !== id) : s.savedCandidates.concat([id]) }));
  notify(saved ? "Removed from saved candidates" : first(id) + " saved", saved ? "accent" : "ok");
}
export function toggleCompare(id: string) {
  const on = state.compare.includes(id);
  if (!on && state.compare.length >= 3) { notify("Compare holds three people. Remove one first.", "warn"); return; }
  update(s => ({ compare: on ? s.compare.filter(x => x !== id) : s.compare.concat([id]) }));
  notify(on ? first(id) + " removed from compare" : first(id) + " added to compare", on ? "accent" : "ok");
}
export const clearCompare = () => update(() => ({ compare: [] }));

export function setMembershipTier(tier: number) {
  if (tier === state.membershipTier) return;
  const t = state.tiers.find(x => x.id === tier);
  update(() => ({ membershipTier: tier }));
  logActivity({ category: "financial", actor: "Rachel Moran", title: "Plan change previewed", detail: "Harbourview switched to the " + (t?.label || "") + " plan at " + eur(t?.price || 0) + " a year (simulated, no payment taken).", refs: ["e-harbourview"] });
  notify("Plan switched to " + (t?.label || "") + ". Simulated, no payment taken.", "accent");
}
export const setCalc = (patch: Partial<Calc>) => update(s => ({ calc: { ...s.calc, ...patch } }));

/* ── HQ settings ────────────────────────────────────────────────────────── */
export function setTierPrice(tierId: number, price: number) {
  update(s => ({ tiers: s.tiers.map(t => (t.id === tierId ? { ...t, price } : t)) }));
}
export function setCommissionRate(ruleId: string, rate: number) {
  update(s => ({ commissionRules: s.commissionRules.map(r => (r.id === ruleId ? { ...r, rate } : r)) }));
}
export function toggleGovernance(id: string) {
  update(s => ({ governance: { ...s.governance, [id]: !s.governance[id] } }));
  notify("Governance setting saved");
}

/* ── presenter guide ────────────────────────────────────────────────────── */
/** Scene 4 needs Sarah before she is shortlisted; scene 6 needs her offers. */
export function setupScene(scene: number) {
  if (scene === 2) update(() => ({ persona: "c-aoife" }));
  if (scene === 3) update(() => ({ persona: "c-mark" }));
  if (scene === 4) {
    update(s => ({
      activeVacancy: "v-hv-gm",
      pipeline: s.pipeline.filter(p => !(p.candidateId === "c-sarah" && p.vacancyId === "v-hv-gm")),
      offers: s.offers.filter(o => o.id !== "o-hv-sarah"),
      intros: s.intros.filter(i => !(i.candidateId === "c-sarah" && i.vacancyId === "v-hv-gm")),
      compare: [],
    }));
  }
  if (scene === 5) update(() => ({ calc: { ...DEFAULT_CALC }, membershipTier: 3 }));
  if (scene === 6) {
    const seedOffer = OFFERS.find(o => o.id === "o-hv-sarah")!;
    update(s => {
      const hasEntry = s.pipeline.some(p => p.candidateId === "c-sarah" && p.vacancyId === "v-hv-gm");
      const pipeline = hasEntry
        ? s.pipeline.map(p => (p.candidateId === "c-sarah" && p.vacancyId === "v-hv-gm" && p.stage !== "hired" ? { ...p, stage: "offer" as Stage, updated: "Wed 11 Nov" } : p))
        : s.pipeline.concat([{ ...PIPELINE.find(p => p.id === "p8")! }]);
      const offers = s.offers.some(o => o.id === "o-hv-sarah") ? s.offers : s.offers.concat([{ ...seedOffer, history: seedOffer.history.slice() }]);
      const intros = s.intros.some(i => i.candidateId === "c-sarah" && i.vacancyId === "v-hv-gm") ? s.intros
        : s.intros.concat([{ ...INTRO_REQUESTS.find(i => i.id === "ir3")! }]);
      return { persona: "c-sarah", pipeline, offers, intros };
    });
  }
}

export function resetDemo() {
  try { localStorage.removeItem(KEY); } catch { /* ignore */ }
  state = seed();
  listeners.forEach(l => l());
  notify("Demo data reset");
}
