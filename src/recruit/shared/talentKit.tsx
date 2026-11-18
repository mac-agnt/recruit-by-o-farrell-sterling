import type { CSSProperties, ReactNode } from "react";
import { Avatar, Button, Label, Select } from "../ui";
import { SERIES_COLORS, StackBar } from "../charts";
import { Icon } from "../icons";
import { CANDIDATES, CANDIDATE_BY_ID, STAGES, STAGE_ORDER, type ActivityEvent, type Candidate, type Stage, type Vacancy } from "../data";
import { addToPipeline, contactVisible, openDrawer, pipelineFor, toggleCompare, toggleSavedCandidate, vacancyById, type RecruitState } from "../store";
import { candidate, displayName, employerVacancies, searchableCandidates } from "../selectors";
import { alignmentTone, matchScore, type Match } from "../match";
import { eur, eurK } from "../format";

/* Shared pieces for the employer talent screens and the candidate drawer:
   identity under consent rules, stage labels, alignment rings and the
   shortlist / save / compare controls. Everything reads the one store. */

export type Tone = "accent" | "ok" | "warn" | "bad" | "neutral" | "teal";

/* ── stages ─────────────────────────────────────────────────────────────── */

export const STAGE_LABEL = Object.fromEntries(STAGES.map(x => [x.id, x.label])) as Record<Stage, string>;
export const STAGE_COLOR: Record<Stage, string> = {
  identified: "var(--faint)", shortlisted: SERIES_COLORS[0], contact: SERIES_COLORS[2], interview: SERIES_COLORS[3], offer: SERIES_COLORS[1], hired: "var(--ok)",
};
export const STAGE_TONE: Record<Stage, Tone> = { identified: "neutral", shortlisted: "accent", contact: "warn", interview: "accent", offer: "teal", hired: "ok" };
export const stageRank = (st: Stage) => STAGE_ORDER.indexOf(st);
export function stageText(st: Stage) {
  return st === "offer" ? "Offer stage" : st === "interview" ? "Interview stage" : st === "hired" ? "Hired" : st === "contact" ? "Contact requested" : st === "shortlisted" ? "Shortlisted" : "Identified";
}

export function stageCounts(s: RecruitState, vacancyId: string): Record<Stage, number> {
  const out: Record<Stage, number> = { identified: 0, shortlisted: 0, contact: 0, interview: 0, offer: 0, hired: 0 };
  s.pipeline.forEach(p => { if (p.vacancyId === vacancyId) out[p.stage] += 1; });
  return out;
}

/** Thin stacked bar of a role's pipeline, with an optional legend. */
export function PipelineBar({ counts, legend, height = 8 }: { counts: Record<Stage, number>; legend?: boolean; height?: number }) {
  const parts = STAGE_ORDER.filter(st => counts[st] > 0).map(st => ({ label: STAGE_LABEL[st], value: counts[st], color: STAGE_COLOR[st] }));
  const total = parts.reduce((t, p) => t + p.value, 0);
  return (
    <div>
      {total ? <StackBar parts={parts} height={height} /> : <div style={{ height, borderRadius: 999, background: "var(--track)" }} />}
      {legend && (
        <div className="rc-row rc-wrap" style={{ gap: 12, marginTop: 8 }}>
          {STAGE_ORDER.map(st => (
            <span key={st} className="rc-row" style={{ gap: 5, fontSize: 11, color: counts[st] ? "var(--body)" : "var(--faint)" }}>
              <span style={{ width: 7, height: 7, borderRadius: 2, background: STAGE_COLOR[st], opacity: counts[st] ? 1 : 0.35 }} />
              {STAGE_LABEL[st]} <b style={{ fontWeight: 600, color: counts[st] ? "var(--ink)" : "var(--faint)" }}>{counts[st]}</b>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── text ───────────────────────────────────────────────────────────────── */

export const kRange = (r: readonly number[]) => eurK(r[0]) + " to " + eurK(r[1]);
export const fullRange = (r: readonly number[]) => eur(r[0]) + " to " + eur(r[1]);
export const noticeText = (w: number) => (w <= 0 ? "No notice period listed" : w === 1 ? "1 week's notice" : w + " weeks' notice");
/** Lower-case a skill for use mid-sentence, keeping acronyms and product names. */
export const lowerSkill = (n: string) => (/^[A-Z][A-Z&]/.test(n) || /^Opera\b/.test(n) ? n : n.charAt(0).toLowerCase() + n.slice(1));
/** Lower-case relative times ("Yesterday", "2 days ago") mid-sentence; keep weekdays and dates as written. */
export const lowerWhen = (w: string) => (/^(Mon|Tue|Wed|Thu|Fri|Sat|Sun)\b|^\d/.test(w) ? w : w.charAt(0).toLowerCase() + w.slice(1));
/** A role's name in pickers; roles created in this demo are marked so two "General Manager" entries stay distinct. */
export const roleName = (v: Vacancy) => v.title + (v.created ? " (new)" : "");
export const listJoin = (xs: string[]) => (xs.length <= 1 ? xs.join("") : xs.slice(0, -1).join(", ") + " and " + xs[xs.length - 1]);
const norm = (x: string) => x.toLowerCase().trim();

/* ── vacancies and ranking ──────────────────────────────────────────────── */

export function openRoles(s: RecruitState, employerId: string) {
  return employerVacancies(s, employerId).filter(v => v.status === "open");
}

/** The vacancy a screen should match against: the preferred one, the active one, or the first open role. */
export function contextVacancy(s: RecruitState, employerId: string, preferred?: string): Vacancy | undefined {
  const mine = employerVacancies(s, employerId);
  const pick = (id?: string) => (id ? mine.find(v => v.id === id) : undefined);
  return pick(preferred) || pick(s.activeVacancy) || mine.find(v => v.status === "open") || mine[0];
}

export interface Ranked { c: Candidate; m: Match }
export function rankFor(s: RecruitState, employerId: string, v: Vacancy): Ranked[] {
  return searchableCandidates(s, employerId).map(c => ({ c, m: matchScore(c, v) }))
    .sort((a, b) => b.m.score - a.m.score || b.c.recruitIndex - a.c.recruitIndex);
}

/** Where a salary expectation sits against a role budget. Rank is higher for a closer fit. */
export function budgetFit(exp: readonly number[], budget: readonly number[]): { label: string; tone: Tone; rank: number } {
  if (exp[0] > budget[1]) return { label: "Above the role budget", tone: "warn", rank: 0 };
  if (exp[1] > budget[1]) return { label: "Partly above the budget", tone: "warn", rank: 1 };
  if (exp[1] < budget[0] * 0.85) return { label: "Below the budget range", tone: "neutral", rank: 1 };
  return { label: "Within the role budget", tone: "ok", rank: 2 };
}

/** How many required skills the profile evidences, and how many of those are verified. */
export function requiredCoverage(c: Candidate, v: Vacancy) {
  const has = (r: string) => c.skills.find(x => norm(x.name) === norm(r));
  const matched = v.required.filter(r => has(r));
  const verified = matched.filter(r => has(r)?.verification === "verified");
  return { matched, verified, missing: v.required.filter(r => !has(r)), total: v.required.length };
}

/** The headline reason, phrased from the same evidence the score uses. */
export function topReason(c: Candidate, v: Vacancy, m: Match) {
  const cov = requiredCoverage(c, v);
  if (cov.total) {
    const tail = !cov.matched.length ? "" : cov.verified.length === cov.matched.length ? ", all verified" : ", " + cov.verified.length + " verified";
    return "Evidence for " + cov.matched.length + " of " + cov.total + " required skills" + tail;
  }
  return m.reasons[0] || c.years + " years' experience";
}

/** Two or three questions an interviewer could use, built from the gaps the match found. */
export function interviewQuestions(c: Candidate, v: Vacancy, m: Match): string[] {
  const q: string[] = [];
  m.missingSkills.slice(0, 2).forEach(sk => q.push("The role needs " + lowerSkill(sk) + ". Where have you come closest to it, and what was the result?"));
  if (m.salaryFit === "above") q.push("Your expectation sits above the " + kRange(v.salary) + " budget. Which parts of the package matter most to you?");
  if (c.noticeWeeks >= 8) q.push("You have " + c.noticeWeeks + " weeks' notice. How would you plan the handover, and is any of it flexible?");
  if (c.region !== v.region) q.push("How would a move from " + c.location + " to " + v.location + " work for you, and on what timing?");
  const self = c.skills.find(sk => v.required.some(r => norm(r) === norm(sk.name)) && sk.verification !== "verified");
  if (self) q.push(self.name + " is self-reported. Who could speak to it from direct experience?");
  if (c.years < v.minYears) q.push("This role asks for " + v.minYears + " years. Which experience best prepares you for the step up?");
  if (c.achievements[0]) q.push("Your profile cites “" + c.achievements[0] + "”. What would carry over to this role, and what would not?");
  q.push("What would your first 90 days as " + v.title + " look like?");
  return Array.from(new Set(q)).slice(0, 3);
}

/* ── identity under consent ─────────────────────────────────────────────── */

export function identity(s: RecruitState, employerId: string, c: Candidate) {
  const name = displayName(s, employerId, c);
  const anon = name !== c.name;
  const shared = contactVisible(employerId, c.id, s);
  return { name, anon, shared, org: shared ? c.currentOrg : c.currentOrgPublic, place: anon ? c.region : c.location, first: anon ? "this professional" : c.name.split(" ")[0] };
}

/** Replace the real names of anonymous profiles in free text (activity lines are written by the store with real names). */
export function maskNames(s: RecruitState, employerId: string, text: string) {
  let out = text;
  CANDIDATES.forEach(base => {
    if (!out.includes(base.name)) return;
    const shown = displayName(s, employerId, candidate(s, base.id));
    if (shown !== base.name) out = out.split(base.name).join(shown);
  });
  return out;
}

export function PersonAvatar({ c, anon, size = 40, style }: { c: Candidate; anon?: boolean; size?: number; style?: CSSProperties }) {
  if (anon) {
    return (
      <span title="Anonymous profile" style={{ width: size, height: size, flex: "none", borderRadius: 999, background: "var(--surface-2)", border: "1px dashed var(--border-strong)",
        color: "var(--dim)", display: "inline-flex", alignItems: "center", justifyContent: "center", ...style }}>
        <Icon name="candidate" size={Math.round(size * 0.48)} />
      </span>
    );
  }
  return <Avatar initials={c.initials} tint={c.tint} size={size} style={style} />;
}

/* ── alignment ──────────────────────────────────────────────────────────── */

export const toneVar = (t: Tone) => (t === "ok" ? "var(--ok)" : t === "accent" ? "var(--accent)" : t === "warn" ? "var(--warn)" : t === "teal" ? "var(--teal, var(--ok))" : t === "bad" ? "var(--bad)" : "var(--dim)");

export function ScoreRing({ score, size = 56, title }: { score: number; size?: number; title?: string }) {
  const color = toneVar(alignmentTone(score));
  const sw = Math.max(4, Math.round(size * 0.085));
  const r = (size - sw) / 2;
  const circ = 2 * Math.PI * r;
  return (
    <div title={title || score + "% role alignment"} style={{ position: "relative", width: size, height: size, flex: "none" }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)", display: "block" }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--track)" strokeWidth={sw} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={circ * (1 - Math.max(0, Math.min(100, score)) / 100)} style={{ transition: "stroke-dashoffset .8s cubic-bezier(.16,1,.3,1)" }} />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: Math.round(size * 0.3), fontWeight: 600, letterSpacing: "-.5px", fontVariantNumeric: "tabular-nums", color: "var(--ink)" }}>
        {score}<span style={{ fontSize: Math.round(size * 0.16), color: "var(--dim)", marginLeft: 1, fontWeight: 500 }}>%</span>
      </div>
    </div>
  );
}

/* ── actions ────────────────────────────────────────────────────────────── */

const STAGE_ICON: Record<Stage, string> = { identified: "eye", shortlisted: "check", contact: "link", interview: "calendar", offer: "offers", hired: "placement" };

/** A badge the height of a small button, so action rows stay aligned. */
export function StagePill({ stage, style }: { stage: Stage; style?: CSSProperties }) {
  const t = toneVar(STAGE_TONE[stage]);
  return (
    <span title={STAGE_LABEL[stage]} style={{ display: "inline-flex", alignItems: "center", gap: 7, height: 30, padding: "0 12px", borderRadius: "var(--cta-r, 12px)", flex: "none", whiteSpace: "nowrap",
      fontSize: 12, fontWeight: 500, color: t, background: "color-mix(in oklab, " + t + " 12%, transparent)", border: "1px solid color-mix(in oklab, " + t + " 38%, transparent)", ...style }}>
      <Icon name={STAGE_ICON[stage]} size={12} stroke={2.1} />{stageText(stage)}
    </span>
  );
}

/** Shortlist for a vacancy, or the stage the person already holds in its pipeline. */
export function ShortlistButton({ s, vacancyId, candidateId, size = "sm", variant = "primary" }: { s: RecruitState; vacancyId?: string; candidateId: string; size?: "sm" | "md"; variant?: "primary" | "secondary" }) {
  const entry = vacancyId ? pipelineFor(vacancyId, candidateId, s) : undefined;
  if (entry && entry.stage !== "identified") return <StagePill stage={entry.stage} style={size === "md" ? { height: 36 } : undefined} />;
  const v = vacancyId ? vacancyById(vacancyId, s) : undefined;
  return (
    <Button size={size} variant={variant} icon="userPlus" disabled={!v || v.status !== "open"} title={v ? "Shortlist for " + v.title : "Choose an open role first"}
      onClick={e => { e.stopPropagation(); if (vacancyId) addToPipeline(vacancyId, candidateId, "shortlisted"); }}>
      Shortlist
    </Button>
  );
}

export function SaveButton({ s, id, size = "sm", iconOnly }: { s: RecruitState; id: string; size?: "sm" | "md"; iconOnly?: boolean }) {
  const on = s.savedCandidates.includes(id);
  return (
    <Button size={size} variant="secondary" icon="bookmark" title={on ? "Remove from saved candidates" : "Save candidate"}
      onClick={e => { e.stopPropagation(); toggleSavedCandidate(id); }}
      style={on ? { color: "var(--accent)", borderColor: "var(--accent-line)", background: "var(--accent-faint)" } : undefined}>
      {iconOnly ? undefined : on ? "Saved" : "Save"}
    </Button>
  );
}

export function CompareButton({ s, id, size = "sm", iconOnly }: { s: RecruitState; id: string; size?: "sm" | "md"; iconOnly?: boolean }) {
  const on = s.compare.includes(id);
  const full = !on && s.compare.length >= 3;
  return (
    <Button size={size} variant="secondary" icon={on ? "check" : "compare"} title={on ? "Remove from compare" : full ? "Compare holds three people" : "Add to compare"}
      onClick={e => { e.stopPropagation(); toggleCompare(id); }}
      style={on ? { color: "var(--accent)", borderColor: "var(--accent-line)", background: "var(--accent-faint)" } : full ? { opacity: 0.6 } : undefined}>
      {iconOnly ? undefined : on ? "Comparing" : "Compare"}
    </Button>
  );
}

/* ── vacancy context ────────────────────────────────────────────────────── */

/** "Matching for" picker over the employer's open roles. */
export function VacancyPicker({ s, employerId, value, onChange, label = "Matching for", style, selectStyle }: { s: RecruitState; employerId: string; value?: string; onChange: (id: string) => void; label?: string; style?: CSSProperties; selectStyle?: CSSProperties }) {
  const open = openRoles(s, employerId);
  const current = value ? employerVacancies(s, employerId).find(v => v.id === value) : undefined;
  const list = current && !open.some(v => v.id === current.id) ? [current].concat(open) : open;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 220, ...style }}>
      <Label>{label}</Label>
      <Select value={value || ""} onChange={onChange} style={selectStyle}
        options={list.length ? list.map(v => ({ value: v.id, label: roleName(v) + (v.status !== "open" ? " (" + v.status + ")" : "") + ", " + kRange(v.salary) })) : [{ value: "", label: "No open roles" }]} />
    </div>
  );
}

/* ── activity ───────────────────────────────────────────────────────────── */

export type ActKind = "pipeline" | "introductions" | "interviews" | "offers" | "applications" | "vacancies" | "fees";
export const KIND_META: Record<ActKind, { label: string; icon: string; color: string }> = {
  pipeline: { label: "Pipeline", icon: "hiring", color: SERIES_COLORS[0] },
  introductions: { label: "Introductions", icon: "link", color: SERIES_COLORS[2] },
  interviews: { label: "Interviews", icon: "calendar", color: SERIES_COLORS[3] },
  offers: { label: "Offers", icon: "offers", color: SERIES_COLORS[1] },
  applications: { label: "Applications", icon: "file", color: SERIES_COLORS[5] },
  vacancies: { label: "Vacancies", icon: "vacancies", color: SERIES_COLORS[4] },
  fees: { label: "Fees and membership", icon: "euro", color: "var(--ok)" },
};
export const KIND_ORDER: ActKind[] = ["pipeline", "introductions", "interviews", "offers", "applications", "vacancies", "fees"];

export function activityKind(e: ActivityEvent): ActKind {
  const t = e.title.toLowerCase();
  if (e.category === "financial") return "fees";
  if (/offer|changes requested/.test(t)) return "offers";
  if (/interview/.test(t)) return "interviews";
  if (/introduction/.test(t)) return "introductions";
  if (/application/.test(t)) return "applications";
  if (/vacancy/.test(t)) return "vacancies";
  return "pipeline";
}

/** Every record id that belongs to this employer: the account, its roles, offers and placements. */
export function employerRefs(s: RecruitState, employerId: string) {
  const set = new Set<string>([employerId]);
  employerVacancies(s, employerId).forEach(v => set.add(v.id));
  s.offers.filter(o => o.employerId === employerId).forEach(o => set.add(o.id));
  s.placements.filter(p => p.employerId === employerId).forEach(p => set.add(p.id));
  return set;
}
export function employerEvents(s: RecruitState, employerId: string) {
  const refs = employerRefs(s, employerId);
  return s.activity.filter(e => e.refs.some(r => refs.has(r)));
}

export function dayGroup(at: number) {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  if (at >= start) return "Today";
  if (at >= start - 86400000) return "Yesterday";
  if (at >= start - 6 * 86400000) return "Earlier this week";
  return "Earlier";
}

/** One activity line: kind icon, masked text, actor and time, and links to the records it touches. */
export function ActivityItem({ s, employerId, e, compact, first }: { s: RecruitState; employerId: string; e: ActivityEvent; compact?: boolean; first?: boolean }) {
  const kind = activityKind(e);
  const meta = KIND_META[kind];
  const links: { id: string; label: string; open: () => void }[] = [];
  if (!compact) {
    e.refs.forEach(r => {
      if (CANDIDATE_BY_ID[r]) {
        links.push({ id: r, label: displayName(s, employerId, candidate(s, r)), open: () => openDrawer("candidate", r, { vacancyId: e.refs.find(x => vacancyById(x, s)) || s.activeVacancy }) });
        return;
      }
      const v = vacancyById(r, s);
      if (v && v.employerId === employerId) { links.push({ id: r, label: v.title, open: () => openDrawer("vacancy", r) }); return; }
      const o = s.offers.find(x => x.id === r);
      if (o) links.push({ id: r, label: "Offer, " + eurK(o.salary), open: () => openDrawer("offer", r) });
    });
  }
  return (
    <div className="rc-row" style={{ alignItems: "flex-start", gap: 12, padding: compact ? "10px 0" : "13px 0", borderTop: first ? 0 : "1px solid var(--border)" }}>
      <span style={{ width: compact ? 26 : 30, height: compact ? 26 : 30, flex: "none", borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center",
        background: "color-mix(in oklab, " + meta.color + " 14%, transparent)", color: meta.color }}>
        <Icon name={meta.icon} size={compact ? 13 : 14} />
      </span>
      <div className="rc-grow">
        <div className="rc-row" style={{ gap: 8, alignItems: "baseline" }}>
          <span style={{ fontSize: 13, fontWeight: 500, color: "var(--ink)" }}>{maskNames(s, employerId, e.title)}</span>
          {e.status === "awaiting" && <span style={{ fontSize: 10.5, color: "var(--warn)", fontWeight: 500 }}>Awaiting</span>}
          <span style={{ marginLeft: "auto", fontFamily: "var(--mono)", fontSize: 10, color: "var(--faint)", whiteSpace: "nowrap" }}>{e.when}</span>
        </div>
        <div style={{ fontSize: 12.5, color: "var(--dim)", marginTop: 3, lineHeight: 1.5 }}>{maskNames(s, employerId, e.detail)}</div>
        {!compact && (
          <div className="rc-row rc-wrap" style={{ gap: 6, marginTop: 8 }}>
            <span style={{ fontSize: 11, color: "var(--faint)" }}>{maskNames(s, employerId, e.actor)}</span>
            {links.map(l => (
              <button key={l.id} onClick={l.open} className="rc-chip-btn rc-focus"
                style={{ height: 22, padding: "0 9px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--surface-2)", color: "var(--body)", fontSize: 11, cursor: "pointer" }}>
                {l.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── layout bits ────────────────────────────────────────────────────────── */

export function Fact({ label, value, sub, style }: { label: ReactNode; value: ReactNode; sub?: ReactNode; style?: CSSProperties }) {
  return (
    <div style={{ minWidth: 0, ...style }}>
      <Label style={{ fontSize: 8.5 }}>{label}</Label>
      <div style={{ fontSize: 13, color: "var(--ink)", marginTop: 5, lineHeight: 1.35 }}>{value}</div>
      {sub && <div style={{ fontSize: 11.5, color: "var(--dim)", marginTop: 2, lineHeight: 1.4 }}>{sub}</div>}
    </div>
  );
}

export function SkillTag({ name, verified, hit, missing }: { name: string; verified?: boolean; hit?: boolean; missing?: boolean }) {
  const fg = missing ? "var(--faint)" : hit ? "var(--ink)" : "var(--body)";
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, height: 24, padding: "0 9px", borderRadius: "var(--chip-r, 8px)", fontSize: 11.5, whiteSpace: "nowrap", flex: "none",
      color: fg, background: hit ? "var(--accent-soft)" : "var(--surface-2)", border: "1px " + (missing ? "dashed var(--border-strong)" : "solid " + (hit ? "var(--accent-line)" : "var(--border)")) }}>
      {verified && !missing && <span style={{ color: "var(--teal, var(--ok))", display: "inline-flex" }}><Icon name="verified" size={11} stroke={2} /></span>}
      {missing && <Icon name="minus" size={10} stroke={2.2} />}
      {name}
    </span>
  );
}
