import { CANDIDATES, CANDIDATE_BY_ID, EMPLOYER_BY_ID, INDEX_ACTIONS, INDEX_MAX, MARKET, membershipRevenue, totalAccounts, COURSE_BY_ID, PARTNERS } from "./data";
import type { Candidate, IndexBreakdown, Vacancy } from "./data/types";
import { allVacancies, contactVisible, visibilityOf, type RecruitState } from "./store";
import { AOIFE_RELEVANT, matchScore } from "./match";

const norm = (x: string) => x.toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();

/* Derived views of the shared state. Every number a screen shows should come
   from here or from data/metrics.ts so the portals never disagree. */

/** A candidate with their own edits, verification progress and privacy applied. */
export function candidate(s: RecruitState, id: string): Candidate {
  const base = CANDIDATE_BY_ID[id];
  if (!base) throw new Error("Unknown candidate " + id);
  const edits = s.profiles[id] || {};
  const actions = INDEX_ACTIONS[id] || [];
  // Completed actions add points to the area they name, never past that area's maximum.
  const AREA: Record<string, keyof IndexBreakdown> = { "Verified experience": "experience", "Skills evidence": "skills", "Leadership achievements": "leadership", "Qualifications": "qualifications", "Profile evidence": "evidence" };
  const breakdown: IndexBreakdown = { ...base.breakdown };
  actions.filter(a => s.indexActions[a.id] === "done").forEach(a => {
    const key = AREA[a.area] || "evidence";
    breakdown[key] = Math.min(INDEX_MAX[key], breakdown[key] + a.points);
  });
  const indexTotal = breakdown.experience + breakdown.skills + breakdown.leadership + breakdown.qualifications + breakdown.evidence;
  const vis = s.visibility[id];
  const extraSkills = (edits.addedSkills || []).map(n => ({ name: n, level: 70, verification: "self" as const }));
  const recorded = Object.keys(s.verifiedItems || {}).filter(k => k.startsWith(id + "|")).map(k => norm(k.slice(id.length + 1)));
  const confirmed = (name: string) => recorded.some(r => r.includes(norm(name)) || norm(name).includes(r.replace(/ certificate$/, "")));
  const employmentConfirmed = recorded.some(r => r.includes("employment"));
  return {
    ...base,
    title: edits.title || base.title,
    summary: edits.summary ?? base.summary,
    location: edits.location || base.location,
    preferredRoles: edits.preferredRoles || base.preferredRoles,
    interests: edits.interests || base.interests,
    salaryExpectation: edits.salaryExpectation || base.salaryExpectation,
    availability: (edits.availability as Candidate["availability"]) || base.availability,
    noticeWeeks: edits.noticeWeeks ?? base.noticeWeeks,
    skills: base.skills.map(k => (k.verification !== "verified" && confirmed(k.name) ? { ...k, verification: "verified" as const } : k)).concat(extraSkills),
    qualifications: base.qualifications.map(q => (q.verification !== "verified" && confirmed(q.name) ? { ...q, verification: "verified" as const } : q)),
    experience: employmentConfirmed ? base.experience.map(x => (x.verification === "pending" ? { ...x, verification: "verified" as const } : x)) : base.experience,
    verifiedCredentials: base.verifiedCredentials + recorded.length,
    recruitIndex: Math.min(1000, indexTotal),
    breakdown,
    completeness: Math.min(100, base.completeness + actions.filter(a => s.indexActions[a.id]).length * 2 + (Object.keys(edits).length ? 2 : 0)),
    visibility: vis ? vis.mode : base.visibility,
  };
}

export const persona = (s: RecruitState) => candidate(s, s.persona);

/** Open roles relevant to a candidate, best first. */
export function relevantRoles(s: RecruitState, id: string, limit = 12) {
  const c = candidate(s, id);
  const open = allVacancies(s).filter(v => v.status === "open");
  if (id === "c-aoife") {
    const ordered = AOIFE_RELEVANT.map(vid => open.find(v => v.id === vid)).filter(Boolean) as Vacancy[];
    const created = open.filter(v => v.created).map(v => ({ v, m: matchScore(c, v) })).filter(x => x.m.score >= 70);
    return ordered.map(v => ({ v, m: matchScore(c, v) })).concat(created).sort((a, b) => b.m.score - a.m.score).slice(0, limit);
  }
  return open.map(v => ({ v, m: matchScore(c, v) })).filter(x => x.m.score >= 60).sort((a, b) => b.m.score - a.m.score).slice(0, limit);
}

/** Candidates an employer can find: discoverable or anonymised, never hidden, never blocked. */
export function searchableCandidates(s: RecruitState, employerId: string) {
  return CANDIDATES.map(c => candidate(s, c.id)).filter(c => {
    if (c.status !== "active") return false;
    if (c.visibility === "hidden") return false;
    const v = visibilityOf(c.id, s);
    if (v.blockCurrentEmployer && c.currentOrg === EMPLOYER_BY_ID[employerId]?.name) return false;
    return true;
  });
}

/** What an employer may see of a person: identity only after consent. */
export function displayName(s: RecruitState, employerId: string, c: Candidate) {
  if (contactVisible(employerId, c.id, s)) return c.name;
  if (c.visibility === "anonymous") return "Professional #" + (40000 + c.recruitIndex * 37 % 9999);
  return c.name;
}
export const isAnonymous = (c: Candidate) => c.visibility === "anonymous";

export function employerVacancies(s: RecruitState, employerId: string) {
  return allVacancies(s).filter(v => v.employerId === employerId);
}

export function offersFor(s: RecruitState, candidateId: string) {
  return s.offers.filter(o => o.candidateId === candidateId && o.visibleToCandidate);
}

/** Membership revenue and accounts from the editable pricing. */
export function membershipTotals(s: RecruitState) {
  return { revenue: membershipRevenue(s.tiers), accounts: totalAccounts(s.tiers) };
}

export function calcResult(s: RecruitState) {
  const { salary, agencyRate, recruitRate, membership, includeMembership } = s.calc;
  const agencyFee = salary * agencyRate;
  const recruitFee = salary * recruitRate;
  const gross = agencyFee - recruitFee;
  const net = gross - (includeMembership ? membership : 0);
  return { agencyFee, recruitFee, gross, net };
}

export function placementTotals(s: RecruitState) {
  const fees = s.placements.reduce((t, p) => t + p.salary * p.feeRate, 0);
  const agency = s.placements.reduce((t, p) => t + p.salary * 0.25, 0);
  return { count: s.placements.length, fees, agency, saving: agency - fees, extra: Math.max(0, MARKET.placementsThisMonth - s.placements.filter(p => p.date !== "21 Oct").length) };
}

export function partnerStats(s: RecruitState) {
  return PARTNERS.map(p => {
    const live = s.enrolments.filter(e => COURSE_BY_ID[e.courseId]?.partnerId === p.id && e.date === "Today").length;
    return { ...p, enrolments: p.enrolments + live, live };
  });
}

/** Counts used on the employer dashboard. */
export function employerStats(s: RecruitState, employerId: string) {
  const vacs = employerVacancies(s, employerId).filter(v => v.status === "open");
  const ids = new Set(vacs.map(v => v.id));
  const entries = s.pipeline.filter(p => ids.has(p.vacancyId));
  const count = (stage: string) => entries.filter(p => p.stage === stage).length;
  const offers = s.offers.filter(o => o.employerId === employerId && !["declined", "withdrawn", "accepted"].includes(o.status));
  const matched = vacs.reduce((t, v) => t + v.marketMatches, 0);
  return { open: vacs.length, matched, shortlisted: count("shortlisted"), contact: count("contact"), interview: count("interview"), offer: count("offer"), hired: count("hired"), offers, entries };
}
