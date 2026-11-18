import { VACANCIES, type CareerPath } from "../../data";
import type { Candidate, Verification } from "../../data/types";

/* Shared logic for the Career explorer tabs (paths, transferable skills and
   the simulator): how a broad transferable skill links to profile skills and
   path requirements, how other sectors describe it, and where the evidence
   for it sits on the profile. Everything here is illustrative decision
   support, never a prediction. */

export const norm = (x: string) => x.toLowerCase().trim();

/** Transferable skills are phrased more broadly than profile skills. Each one
    stands for these profile skills and path requirements. */
export const SKILL_LINKS: Record<string, string[]> = {
  "Customer experience leadership": ["Guest experience strategy", "Customer experience", "Service recovery"],
  "Multi-department operations": ["Rooms division operations", "Team leadership", "Hotel operations", "Service operations"],
  "Coaching and training": ["Staff training and development"],
  "Budget ownership": ["Budget management", "P&L ownership"],
  "Service design": ["Service design", "Guest experience strategy"],
  "Complaint resolution": ["Service recovery"],
  "Executive leadership": ["Team leadership", "P&L ownership"],
  "Turnaround management": ["Hotel turnaround"],
  "Commercial negotiation": ["Commercial strategy", "Negotiation"],
  "Board reporting": ["Owner and stakeholder relations"],
  "Multi-site operations": ["Multi-site operations"],
};

/** Requirements a path carries beyond its matched list. */
const PATH_EXTRA: Record<string, string[]> = { "ps-ops": ["Multi-site operations"] };

export const linkedNames = (skill: string) => [skill].concat(SKILL_LINKS[skill] || []);

const VAC = Object.fromEntries(VACANCIES.map(v => [v.id, v]));

/** The path explicitly draws on this skill (Career Pathfinder's matched list). */
export function skillUsedBy(skill: string, p: CareerPath) {
  const names = linkedNames(skill).map(norm);
  const pool = p.matched.concat(PATH_EXTRA[p.id] || []).map(norm);
  return names.some(n => pool.includes(n));
}

/** Matched by the path, or asked for by the live vacancy behind it. */
export function skillValuedBy(skill: string, p: CareerPath) {
  if (skillUsedBy(skill, p)) return true;
  const v = p.vacancyId ? VAC[p.vacancyId] : undefined;
  if (!v) return false;
  const names = linkedNames(skill).map(norm);
  return v.required.concat(v.preferred).map(norm).some(n => names.includes(n));
}

/** The persona's transferable skills a path uses. */
export const pathSkills = (c: Candidate, p: CareerPath) => c.transferable.filter(t => skillUsedBy(t, p));

/* ── industries ─────────────────────────────────────────────────────────── */

export type Bucket = "events" | "retail" | "cx" | "procurement" | "hotels" | "groups" | "investment";

export function bucketOf(industry: string): Bucket {
  const t = norm(industry);
  if (t.includes("event")) return "events";
  if (t.includes("retail")) return "retail";
  if (t.includes("customer")) return "cx";
  if (t.includes("procure")) return "procurement";
  if (t.includes("investment")) return "investment";
  if (t.includes("group")) return "groups";
  return "hotels";
}

export interface IndustryGroup { name: string; adjacent: boolean; paths: CareerPath[]; roles: number; bucket: Bucket }

export function industriesOf(paths: CareerPath[]): IndustryGroup[] {
  const out: IndustryGroup[] = [];
  paths.forEach(p => {
    let g = out.find(x => x.name === p.industry);
    if (!g) { g = { name: p.industry, adjacent: false, paths: [], roles: 0, bucket: bucketOf(p.industry) }; out.push(g); }
    g.paths.push(p);
    g.roles += p.openRoles;
    g.adjacent = g.adjacent || p.adjacent;
  });
  return out;
}

/* ── how other sectors describe a skill ─────────────────────────────────── */

const TRANSLATIONS: Record<string, Partial<Record<Bucket, string>>> = {
  "team leadership": { events: "Crew and production team leadership", retail: "Multi-store team management", cx: "Service team leadership", procurement: "Category team leadership", hotels: "Department leadership", groups: "Leading managers across properties", investment: "Directing operator teams" },
  "budget management": { events: "Event budget and P&L control", retail: "Store budget and margin control", cx: "CX programme budgeting", procurement: "Spend management", hotels: "Departmental P&L", groups: "Regional budget accountability" },
  "procurement": { events: "Supplier and vendor management", retail: "Buying and supplier terms", cx: "Partner and vendor management", procurement: "Strategic sourcing", hotels: "Purchasing" },
  "service operations": { events: "Event logistics", retail: "Service delivery management", cx: "Customer operations", procurement: "Operational demand planning", hotels: "Front-of-house operations" },
  "negotiation": { events: "Venue and supplier contracting", retail: "Supplier negotiation", cx: "Vendor and service-level negotiation", procurement: "Contract negotiation", hotels: "Supplier negotiation" },
  "customer experience": { events: "Attendee and client experience", retail: "Shopper experience", cx: "Customer journey ownership", procurement: "Internal customer service", hotels: "Guest experience" },
  "stakeholder management": { events: "Client and promoter relationships", retail: "Head-office and landlord relations", cx: "Cross-functional stakeholder management", procurement: "Supplier relationship management", hotels: "Owner and client relations", groups: "Group stakeholder management" },
  "health and safety compliance": { events: "Crowd and venue safety", retail: "Store safety and compliance", cx: "Service risk and compliance", procurement: "Supplier compliance audits", hotels: "Health and safety compliance" },
  "rostering and labour planning": { events: "Crew scheduling", retail: "Labour scheduling and payroll control", cx: "Workforce management", procurement: "Resource planning", hotels: "Labour planning" },
  "event delivery": { events: "Live event production", retail: "In-store events and launches", cx: "Experience delivery", procurement: "Event supplier management", hotels: "Conference and banqueting" },
  "customer experience leadership": { groups: "Group guest experience standards", hotels: "Guest experience management", cx: "Customer experience leadership" },
  "multi-department operations": { groups: "Multi-property operations", hotels: "Hotel operations management", cx: "Cross-functional service operations" },
  "coaching and training": { groups: "Group training programmes", hotels: "Staff development", cx: "Frontline coaching and enablement" },
  "budget ownership": { groups: "Regional budget accountability", hotels: "Departmental P&L", cx: "CX programme budget ownership" },
  "service design": { groups: "Brand service standards", hotels: "Guest journey design", cx: "Service design and journey mapping" },
  "complaint resolution": { groups: "Group service recovery programmes", hotels: "Guest relations", cx: "Complaint handling and root-cause analysis" },
  "guest experience strategy": { groups: "Group guest experience strategy", hotels: "Guest satisfaction programme", cx: "Customer experience strategy" },
  "rooms division operations": { groups: "Rooms standards across properties", hotels: "Rooms division management", cx: "Operational service delivery" },
  "service recovery": { groups: "Recovery programmes and playbooks", hotels: "Guest recovery", cx: "Service recovery and retention" },
  "executive leadership": { groups: "Group operations leadership", hotels: "General management", investment: "Executive oversight of operators" },
  "turnaround management": { groups: "Underperforming property recovery", hotels: "Hotel repositioning", investment: "Value creation and repositioning" },
  "commercial negotiation": { groups: "Group commercial agreements", hotels: "Commercial negotiation", investment: "Management-contract negotiation" },
  "board reporting": { groups: "Group board reporting", hotels: "Owner reporting", investment: "Investor reporting" },
  "multi-site operations": { groups: "Portfolio operations", hotels: "Cluster management", investment: "Portfolio performance oversight" },
  "p&l ownership": { groups: "Portfolio P&L accountability", hotels: "Full P&L ownership", investment: "Asset performance management" },
  "hotel turnaround": { groups: "Property turnaround", hotels: "Hotel turnaround", investment: "Asset repositioning" },
  "owner and stakeholder relations": { groups: "Owner and investor relations", hotels: "Owner relations", investment: "Investor and lender relations" },
  "commercial strategy": { groups: "Group commercial planning", hotels: "Commercial strategy", investment: "Business planning for assets" },
};

export function translateSkill(skill: string, bucket: Bucket): string | null {
  return TRANSLATIONS[norm(skill)]?.[bucket] || null;
}

/* ── evidence on the profile ────────────────────────────────────────────── */

const HINTS: Record<string, string[]> = {
  "team leadership": ["promoted", "team of", "supervisors", "supervised", "turnover", "heads of department", "development programme"],
  "budget management": ["budget", "food cost", "refurbishment", "payroll"],
  "procurement": ["supplier", "procurement", "food cost", "purchasing"],
  "service operations": ["restaurants", "events a year", "covers", "cover", "bars", "conference suite"],
  "negotiation": ["negotiat", "contracts"],
  "customer experience": ["client rating", "spend per cover", "review", "guest score"],
  "stakeholder management": ["corporate contracts", "owners", "board", "corporate"],
  "health and safety compliance": ["safety", "checklist", "accessibility", "compliance"],
  "rostering and labour planning": ["labour", "roster", "team of", "payroll"],
  "event delivery": ["events", "conference", "banquet", "event operations"],
  "customer experience leadership": ["guest review", "review score", "personalisation", "guest relations"],
  "multi-department operations": ["second in command", "front office, housekeeping", "rooms, food and beverage"],
  "coaching and training": ["training", "promoted", "development programme", "people management", "mentor"],
  "budget ownership": ["budget", "refurbishment", "payroll", "gop"],
  "service design": ["personalisation", "playbook", "pre-arrival", "checklist"],
  "complaint resolution": ["complaints", "recovery playbook", "guest relations"],
  "guest experience strategy": ["guest review", "review score", "personalisation", "guest score"],
  "rooms division operations": ["rooms", "front office", "housekeeping", "reservations"],
  "service recovery": ["service recovery", "complaints"],
  "staff training and development": ["training", "people management", "turnover"],
  "executive leadership": ["heads of department", "general manager", "full p&l", "executive programme"],
  "turnaround management": ["gop margin", "turnaround", "repositioning"],
  "commercial negotiation": ["negotiat", "contracts"],
  "board reporting": ["owner reporting", "owners", "board"],
  "multi-site operations": ["multi-site", "properties", "cluster", "four hotels"],
  "p&l ownership": ["p&l", "gop", "margin", "corporate finance"],
  "hotel turnaround": ["turnaround", "gop margin", "repositioning"],
  "owner and stakeholder relations": ["owners", "owner reporting", "board"],
  "commercial strategy": ["revenue", "repositioning", "weddings business"],
};

export interface Evidence { text: string; source: string; verification: Verification }

export function findEvidence(c: Candidate, skill: string, max = 4): Evidence[] {
  const keys = Array.from(new Set(linkedNames(skill).flatMap(n => HINTS[norm(n)] || [])));
  if (!keys.length) keys.push(...norm(skill).split(/\s+/).filter(w => w.length > 4));
  const hit = (t: string) => keys.some(k => norm(t).includes(k));
  const out: Evidence[] = [];
  const push = (e: Evidence) => { if (out.length < max && !out.some(x => x.text === e.text)) out.push(e); };
  c.experience.forEach(x => x.achievements.forEach(a => { if (hit(a)) push({ text: a, source: x.role + ", " + x.orgPublic, verification: x.verification }); }));
  c.experience.forEach(x => { if (hit(x.summary)) push({ text: x.summary, source: x.role + ", " + x.orgPublic, verification: x.verification }); });
  c.qualifications.forEach(q => { if (hit(q.name)) push({ text: q.name, source: q.issuer + ", " + q.year, verification: q.verification }); });
  return out;
}

/** A skill's evidence level on the profile: its own level, or the best of the profile skills it stands for. */
export function skillStanding(c: Candidate, skill: string): { level: number; verification: Verification; linked: string[] } {
  const names = linkedNames(skill).map(norm);
  const own = c.skills.filter(x => names.includes(norm(x.name)));
  if (!own.length) return { level: 68, verification: "self", linked: [] };
  const best = own.slice().sort((a, b) => b.level - a.level)[0];
  const verification: Verification = own.some(x => x.verification === "verified") ? "verified" : own.some(x => x.verification === "pending") ? "pending" : "self";
  return { level: best.level, verification, linked: own.map(x => x.name) };
}

/* ── timing ─────────────────────────────────────────────────────────────── */

/** "3 to 6 months" -> [3, 6]; "Now" -> [0, 1]. */
export function parseMonths(text: string): [number, number] {
  const n = text.match(/\d+/g)?.map(Number) || [];
  if (!n.length) return [0, 1];
  return [n[0], n[1] ?? n[0]];
}

/** "12 weeks, part-time" -> 3; "6 months, part-time" -> 6. */
export function durationMonths(text: string) {
  const n = Number(text.match(/\d+/)?.[0] || 0);
  if (/month/i.test(text)) return n;
  if (/week/i.test(text)) return Math.max(1, Math.round(n / 4.3));
  if (/day/i.test(text)) return 1;
  return 3;
}

/** The Career paths tab hands a chosen path to the simulator. */
export const simulatorHandoff: { pathId: string | null } = { pathId: null };
