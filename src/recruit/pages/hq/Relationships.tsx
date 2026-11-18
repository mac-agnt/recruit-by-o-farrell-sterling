import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Badge, Button, Card, Chip, KV, Label, Page, TextInput } from "../../ui";
import { SERIES_COLORS } from "../../charts";
import { Icon, RICONS } from "../../icons";
import { useNav, type NavApi } from "../../nav";
import { allVacancies, offerById, openDrawer, useRecruit, vacancyById, visibilityOf, type RecruitState } from "../../store";
import { candidate as candidateOf, employerVacancies, relevantRoles } from "../../selectors";
import { matchScore } from "../../match";
import {
  CANDIDATES, CANDIDATE_BY_ID, COURSES, COURSE_BY_ID, CREDENTIAL_CHECKS, EMPLOYERS, EMPLOYER_BY_ID, EMPLOYER_INTEREST, EMPLOYER_TEAM,
  MARKET, PARTNERS, PARTNER_BY_ID, STAGES, type Vacancy,
} from "../../data";
import { eur, eurK, num, pct } from "../../format";

/* Records > Relationships: the intelligence layer. One record sits in the
   centre and everything it connects to is arranged around it by relationship
   type. Selecting a neighbour re-centres the graph on it, so a viewer can walk
   from a professional to her skills, the roles that need them, the course that
   closes the gap and the employers hiring for it. Built in plain SVG; motion
   is transform and opacity only and stops under prefers-reduced-motion. */

type Kind = "candidate" | "employer" | "vacancy" | "course" | "partner" | "skill" | "qual" | "offer" | "placement" | "commission" | "org" | "person" | "role";
interface GNode { id: string; kind: Kind; key: string; label: string; sub: string; initials?: string; tint?: string }
interface Link { node: GNode; meta: string }
interface Group { pred: string; links: Link[]; all: Link[]; dashed: boolean }
interface Placed { node: GNode; meta: string; pred: string; theta: number; r: number; color: string; dashed: boolean }

const EXPLORER_KEY = "recruit-explorer-focus";
const DEFAULT_FOCUS = "candidate:c-aoife";
const TEAL = SERIES_COLORS[1], AMBER = SERIES_COLORS[2], LILAC = SERIES_COLORS[3], ROSE = SERIES_COLORS[4], SKY = SERIES_COLORS[5];

const PRED: Record<string, { color: string; dashed?: boolean; hint: string }> = {
  HAS_SKILL: { color: TEAL, hint: "Verified skills on the profile" },
  TRANSFERABLE: { color: SKY, dashed: true, hint: "Skills that travel to other roles" },
  HOLDS_QUALIFICATION: { color: LILAC, hint: "Qualifications and certificates" },
  HAS_EXPERIENCE: { color: "var(--dim)", hint: "Organisations in the career history" },
  APPLIES_TO: { color: "var(--accent)", hint: "Applications made" },
  IN_PIPELINE: { color: "var(--accent)", hint: "Hiring pipelines the person is in" },
  MATCHES: { color: "var(--accent)", dashed: true, hint: "Explainable role matches, decision support only" },
  OFFERS: { color: ROSE, hint: "Offers made to the person" },
  PLACED: { color: TEAL, hint: "Placements made through Recruit" },
  INTERESTED: { color: ROSE, dashed: true, hint: "Employers who viewed or saved the profile" },
  ENROLS_IN: { color: AMBER, hint: "Courses enrolled in" },
  RECOMMENDED: { color: AMBER, dashed: true, hint: "Courses suggested by the agents" },
  POSTS: { color: "var(--accent)", hint: "Vacancies posted" },
  SENDS_OFFER: { color: ROSE, hint: "Offers sent" },
  HIRED: { color: TEAL, hint: "Placements made" },
  CONTACT: { color: "var(--dim)", hint: "People at the employer" },
  INTERESTED_IN: { color: ROSE, dashed: true, hint: "Professionals the employer looked at" },
  EMPLOYS: { color: "var(--dim)", hint: "Current staff with a Recruit profile" },
  POSTED_BY: { color: "var(--accent)", hint: "The employer behind the vacancy" },
  PIPELINE: { color: "var(--accent)", hint: "People in the hiring pipeline" },
  APPLICANT: { color: "var(--accent)", hint: "People who applied" },
  FILLED_BY: { color: TEAL, hint: "The placement that filled it" },
  REQUIRES: { color: TEAL, hint: "Skills the role asks for" },
  UPSKILL_VIA: { color: AMBER, dashed: true, hint: "Courses that close the gap" },
  PROVIDED_BY: { color: AMBER, hint: "The education partner" },
  TEACHES: { color: TEAL, hint: "Skills the course builds" },
  ENROLLED: { color: AMBER, hint: "Professionals enrolled" },
  RECOMMENDED_FOR: { color: AMBER, dashed: true, hint: "Profiles it is suggested for" },
  LEADS_TO: { color: AMBER, hint: "Roles it prepares people for" },
  VALUED_BY: { color: AMBER, dashed: true, hint: "Employers hiring for those roles now" },
  HELD_BY: { color: TEAL, hint: "Professionals who hold it" },
  TRANSFERABLE_FOR: { color: SKY, dashed: true, hint: "Professionals for whom it is transferable" },
  REQUIRED_BY: { color: "var(--accent)", hint: "Open roles that ask for it" },
  TAUGHT_BY: { color: AMBER, hint: "Courses that teach it" },
  PROVIDES: { color: AMBER, hint: "Courses on Recruit" },
  ISSUED_TO: { color: LILAC, hint: "Professionals holding its qualifications" },
  VERIFIES: { color: LILAC, hint: "Credential checks, simulated" },
  ISSUED_BY: { color: LILAC, hint: "Who issued it" },
  FOR: { color: ROSE, hint: "The professional" },
  FROM: { color: ROSE, hint: "The employer" },
  FOR_ROLE: { color: "var(--accent)", hint: "The vacancy" },
  COMPETES_WITH: { color: ROSE, hint: "Other live offers for the same person" },
  HIRED_BY: { color: TEAL, hint: "The employer" },
  FILLS: { color: "var(--accent)", hint: "The vacancy it filled" },
  GENERATES: { color: "var(--warn)", hint: "The success fee" },
  GENERATED_BY: { color: "var(--warn)", hint: "The placement behind it" },
  PAID_BY: { color: "var(--warn)", hint: "Who pays it" },
  EMPLOYED: { color: "var(--dim)", hint: "Professionals who worked there" },
  WORKS_AT: { color: "var(--dim)", hint: "Their employer" },
  APPROVES: { color: ROSE, hint: "Offers waiting on their approval" },
  OPEN_ROLE: { color: "var(--accent)", hint: "Open vacancies for this role" },
  TRAINED_BY: { color: AMBER, hint: "Courses that lead here" },
  PREFERRED_BY: { color: "var(--accent)", dashed: true, hint: "Professionals who want this role" },
};

const KIND_LABEL: Record<Kind, string> = {
  candidate: "Candidate", employer: "Employer", vacancy: "Vacancy", course: "Course", partner: "Education partner", skill: "Skill", qual: "Qualification",
  offer: "Offer", placement: "Placement", commission: "Commission", org: "Organisation", person: "Employer contact", role: "Role",
};
const KIND_ICON: Record<Kind, string> = {
  candidate: "candidate", employer: "employer", vacancy: "vacancies", course: "learning", partner: "partners", skill: "target", qual: "award",
  offer: "offers", placement: "placement", commission: "euro", org: "org", person: "users", role: "jobs",
};

const JOURNEYS: { id: string; parts: string[]; steps: string[]; finalPred?: string }[] = [
  { id: "aoife", parts: ["Aoife", "skills", "jobs", "course", "employers"],
    steps: ["candidate:c-aoife", "skill:Guest experience strategy", "vacancy:v-ch-rged", "course:crs-wine", "employer:e-cedarhouse"] },
  { id: "harbourview", parts: ["Harbourview", "GM vacancy", "Sarah", "offers"],
    steps: ["employer:e-harbourview", "vacancy:v-hv-gm", "candidate:c-sarah"], finalPred: "OFFERS" },
  { id: "mark", parts: ["Mark", "transferable skills", "events role"],
    steps: ["candidate:c-mark", "skill:Stakeholder management", "vacancy:v-nl-eod"] },
];

const norm = (x: string) => x.toLowerCase().trim();
const cap = (x: string) => (x ? x[0].toUpperCase() + x.slice(1) : x);
const trunc = (x: string, n: number) => (x.length > n ? x.slice(0, n - 1).trimEnd() + "…" : x);
const stageLabel = (id: string) => STAGES.find(st => st.id === id)?.label || id;
const stageRank = (id: string) => STAGES.findIndex(st => st.id === id);
const core = (t: string) => norm(t.split(",")[0]).replace(/^hotel /, "");
/** Loose role-title match, so "Hotel General Manager" finds "General Manager, Cedarhouse Grand Canal" but not a deputy role. */
function roleMatches(role: string, title: string) {
  const a = core(role), b = core(title);
  if (!a || !b || /deputy/.test(a) !== /deputy/.test(b)) return false;
  return a === b || a.includes(b) || b.includes(a);
}
const EMPLOYER_BY_NAME = new Map(EMPLOYERS.map(e => [e.name, e]));
const PARTNER_BY_NAME = new Map(PARTNERS.map(p => [p.name, p]));

/* ── nodes ──────────────────────────────────────────────────────────────── */

function nodeMaker(s: RecruitState) {
  const cand = (id: string): GNode | null => {
    if (!CANDIDATE_BY_ID[id]) return null;
    const c = candidateOf(s, id);
    return { id: "candidate:" + id, kind: "candidate", key: id, label: c.name, sub: c.title, initials: c.initials, tint: c.tint };
  };
  const emp = (id: string): GNode | null => {
    const e = EMPLOYER_BY_ID[id];
    return e ? { id: "employer:" + id, kind: "employer", key: id, label: e.name, sub: e.sector + ", " + e.location, initials: e.initials, tint: e.tint } : null;
  };
  const vac = (id: string): GNode | null => {
    const v = vacancyById(id, s);
    return v ? { id: "vacancy:" + id, kind: "vacancy", key: id, label: v.title, sub: (EMPLOYER_BY_ID[v.employerId]?.short || "") + ", " + eurK(v.salary[0]) + "-" + eurK(v.salary[1]).slice(1) } : null;
  };
  const course = (id: string): GNode | null => {
    const k = COURSE_BY_ID[id];
    return k ? { id: "course:" + id, kind: "course", key: id, label: k.title, sub: (PARTNER_BY_ID[k.partnerId]?.short || "") + ", " + k.duration } : null;
  };
  const partner = (id: string): GNode | null => {
    const p = PARTNER_BY_ID[id];
    return p ? { id: "partner:" + id, kind: "partner", key: id, label: p.short, sub: p.status + ", fictional", initials: p.initials, tint: p.tint } : null;
  };
  const skill = (name: string): GNode => ({ id: "skill:" + name, kind: "skill", key: name, label: name, sub: "Skill" });
  const qual = (name: string): GNode => {
    const holder = CANDIDATES.find(c => c.qualifications.some(q => q.name === name));
    const issuer = holder?.qualifications.find(q => q.name === name)?.issuer || "";
    return { id: "qual:" + name, kind: "qual", key: name, label: name, sub: issuer };
  };
  const offer = (id: string): GNode | null => {
    const o = offerById(id, s);
    if (!o) return null;
    return { id: "offer:" + id, kind: "offer", key: id, label: (EMPLOYER_BY_ID[o.employerId]?.short || "Employer") + " offer", sub: (CANDIDATE_BY_ID[o.candidateId]?.name || "") + ", " + eur(o.salary) };
  };
  const placement = (id: string): GNode | null => {
    const p = s.placements.find(x => x.id === id);
    if (!p) return null;
    return { id: "placement:" + id, kind: "placement", key: id, label: (CANDIDATE_BY_ID[p.candidateId]?.name.split(" ")[0] || "") + " at " + (EMPLOYER_BY_ID[p.employerId]?.short || ""), sub: "Placement, " + p.date };
  };
  const commission = (id: string): GNode | null => {
    const p = s.placements.find(x => x.id === id);
    return p ? { id: "commission:" + id, kind: "commission", key: id, label: eur(p.salary * p.feeRate) + " fee", sub: pct(p.feeRate) + " success fee" } : null;
  };
  const org = (name: string): GNode => ({ id: "org:" + name, kind: "org", key: name, label: name, sub: "Organisation from a career history" });
  const person = (employerId: string, name: string): GNode => {
    const e = EMPLOYER_BY_ID[employerId];
    const role = employerId === "e-harbourview" ? EMPLOYER_TEAM.find(m => m.name === name)?.role : e?.contact === name ? e.contactRole : "";
    return { id: "person:" + employerId + "|" + name, kind: "person", key: employerId + "|" + name, label: name, sub: (role || "Contact") + ", " + (e?.short || ""),
      initials: name.split(" ").map(w => w[0]).join("").slice(0, 2) };
  };
  const role = (title: string): GNode => ({ id: "role:" + title, kind: "role", key: title, label: title, sub: "Role" });
  return { cand, emp, vac, course, partner, skill, qual, offer, placement, commission, org, person, role };
}

function resolve(s: RecruitState, id: string): GNode | null {
  const at = id.indexOf(":");
  if (at < 1) return null;
  const kind = id.slice(0, at) as Kind, key = id.slice(at + 1);
  const m = nodeMaker(s);
  switch (kind) {
    case "candidate": return m.cand(key);
    case "employer": return m.emp(key);
    case "vacancy": return m.vac(key);
    case "course": return m.course(key);
    case "partner": return m.partner(key);
    case "skill": return m.skill(key);
    case "qual": return m.qual(key);
    case "offer": return m.offer(key);
    case "placement": return m.placement(key);
    case "commission": return m.commission(key);
    case "org": return m.org(key);
    case "person": { const [e, ...n] = key.split("|"); return EMPLOYER_BY_ID[e] ? m.person(e, n.join("|")) : null; }
    case "role": return m.role(key);
    default: return null;
  }
}

/* ── neighbours ─────────────────────────────────────────────────────────── */

const CAP = 6;

function neighbours(s: RecruitState, n: GNode, prefer: Set<string>): Group[] {
  const m = nodeMaker(s);
  const seen = new Set<string>([n.id]);
  const out: Group[] = [];
  const open = allVacancies(s).filter(v => v.status === "open");
  const push = (pred: string, raw: ({ node: GNode | null; meta: string })[], cap: number) => {
    const local = new Set<string>();
    const all: Link[] = [];
    raw.forEach(l => {
      if (!l.node || seen.has(l.node.id) || local.has(l.node.id)) return;
      local.add(l.node.id);
      all.push({ node: l.node, meta: l.meta });
    });
    if (!all.length) return;
    const ordered = all.filter(l => prefer.has(l.node.id)).concat(all.filter(l => !prefer.has(l.node.id)));
    const links = ordered.slice(0, Math.min(cap, CAP));
    links.forEach(l => seen.add(l.node.id));
    out.push({ pred, links, all, dashed: !!PRED[pred]?.dashed });
  };
  const demand = (name: string) => open.filter(v => v.required.concat(v.preferred).some(r => norm(r) === norm(name))).length;

  switch (n.kind) {
    case "candidate": {
      const c = candidateOf(s, n.key);
      const verified = c.skills.filter(k => k.verification === "verified").sort((a, b) => b.level - a.level);
      push("HAS_SKILL", verified.map(k => ({ node: m.skill(k.name), meta: "Verified, level " + k.level })), 3);
      const trans = c.transferable.slice().sort((a, b) => demand(b) - demand(a));
      push("TRANSFERABLE", trans.map(t => ({ node: m.skill(t), meta: demand(t) ? demand(t) + " open roles ask for it" : "Transferable skill" })), 2);
      const quals = c.qualifications.slice().sort((a, b) => (a.verification === "verified" ? 0 : 1) - (b.verification === "verified" ? 0 : 1) || b.year - a.year);
      push("HOLDS_QUALIFICATION", quals.map(q => ({ node: m.qual(q.name), meta: (PARTNER_BY_NAME.get(q.issuer)?.short || q.issuer) + ", " + q.year })), 2);
      push("HAS_EXPERIENCE", c.experience.map(x => {
        const e = EMPLOYER_BY_NAME.get(x.org);
        return { node: e ? m.emp(e.id) : m.org(x.org), meta: x.role + (x.to === "Present" ? ", current" : ", until " + x.to) };
      }), 2);
      push("APPLIES_TO", s.applications.filter(a => a.candidateId === c.id && a.status !== "withdrawn").map(a => ({ node: m.vac(a.vacancyId), meta: "Application, " + a.status })), 3);
      push("IN_PIPELINE", s.pipeline.filter(p => p.candidateId === c.id).map(p => ({ node: m.vac(p.vacancyId), meta: stageLabel(p.stage) })), 3);
      push("MATCHES", relevantRoles(s, c.id, 8).map(({ v, m: x }) => ({ node: m.vac(v.id), meta: x.score + "% match" })), 3);
      push("OFFERS", s.offers.filter(o => o.candidateId === c.id && o.status !== "withdrawn").map(o => ({ node: m.offer(o.id), meta: eur(o.salary) + ", " + o.status })), 3);
      push("PLACED", s.placements.filter(p => p.candidateId === c.id).map(p => ({ node: m.placement(p.id), meta: "Starts " + p.startDate })), 2);
      push("INTERESTED", (EMPLOYER_INTEREST[c.id] || []).map(i => ({ node: m.emp(i.employerId), meta: i.when })), 2);
      push("ENROLS_IN", s.enrolments.filter(e => e.candidateId === c.id).map(e => ({ node: m.course(e.courseId), meta: e.date === "Today" ? "Enrolled today" : e.status })), 3);
      push("RECOMMENDED", COURSES.filter(k => k.recommendedFor.includes(c.id)).map(k => ({ node: m.course(k.id), meta: "Suggested course" })), 2);
      break;
    }
    case "employer": {
      const e = EMPLOYER_BY_ID[n.key];
      const vacs = employerVacancies(s, e.id).slice().sort((a, b) => (a.status === "open" ? 0 : 1) - (b.status === "open" ? 0 : 1));
      push("POSTS", vacs.map(v => ({ node: m.vac(v.id), meta: v.status === "open" ? eurK(v.salary[0]) + "-" + eurK(v.salary[1]).slice(1) : v.status })), 5);
      push("SENDS_OFFER", s.offers.filter(o => o.employerId === e.id && o.status !== "withdrawn").map(o => ({ node: m.offer(o.id), meta: (CANDIDATE_BY_ID[o.candidateId]?.name || "") + ", " + o.status })), 3);
      push("HIRED", s.placements.filter(p => p.employerId === e.id).map(p => ({ node: m.placement(p.id), meta: "Placed " + p.date })), 3);
      const team = e.id === "e-harbourview" ? EMPLOYER_TEAM.map(t => t.name) : [e.contact];
      push("CONTACT", team.map(name => ({ node: m.person(e.id, name), meta: m.person(e.id, name).sub })), 4);
      push("INTERESTED_IN", Object.entries(EMPLOYER_INTEREST).flatMap(([cid, list]) => list.filter(i => i.employerId === e.id).map(i => ({ node: m.cand(cid), meta: i.when }))), 3);
      push("EMPLOYS", CANDIDATES.filter(c => c.status === "active" && c.currentOrg === e.name).map(c => ({ node: m.cand(c.id), meta: "Current employer" })), 3);
      break;
    }
    case "vacancy": {
      const v = vacancyById(n.key, s);
      if (!v) break;
      push("POSTED_BY", [{ node: m.emp(v.employerId), meta: "Employer" }], 1);
      const pipe = s.pipeline.filter(p => p.vacancyId === v.id).sort((a, b) => stageRank(b.stage) - stageRank(a.stage));
      push("PIPELINE", pipe.map(p => ({ node: m.cand(p.candidateId), meta: stageLabel(p.stage) })), 6);
      push("APPLICANT", s.applications.filter(a => a.vacancyId === v.id && a.status !== "withdrawn").map(a => ({ node: m.cand(a.candidateId), meta: "Applied " + a.date })), 3);
      push("OFFERS", s.offers.filter(o => o.vacancyId === v.id && o.status !== "withdrawn").map(o => ({ node: m.offer(o.id), meta: eur(o.salary) + ", " + o.status })), 3);
      push("FILLED_BY", s.placements.filter(p => p.vacancyId === v.id).map(p => ({ node: m.placement(p.id), meta: "Starts " + p.startDate })), 1);
      push("REQUIRES", v.required.map(r => ({ node: m.skill(r), meta: "Required" })).concat(v.preferred.map(r => ({ node: m.skill(r), meta: "Preferred" }))), 4);
      if (pipe.length < 3) {
        const ranked = CANDIDATES.filter(c => c.status === "active" && visibilityOf(c.id, s).mode !== "hidden")
          .map(c => ({ c, x: matchScore(candidateOf(s, c.id), v) })).filter(r => r.x.score >= 70).sort((a, b) => b.x.score - a.x.score);
        push("MATCHES", ranked.map(r => ({ node: m.cand(r.c.id), meta: r.x.score + "% match" })), 3);
      }
      const wanted = v.required.concat(v.preferred).map(norm);
      push("UPSKILL_VIA", COURSES.filter(k => k.roles.some(r => roleMatches(r, v.title)) || k.skills.filter(x => wanted.includes(norm(x))).length >= 2)
        .map(k => ({ node: m.course(k.id), meta: PARTNER_BY_ID[k.partnerId]?.short || "" })), 2);
      break;
    }
    case "course": {
      const k = COURSE_BY_ID[n.key];
      push("PROVIDED_BY", [{ node: m.partner(k.partnerId), meta: "Fictional partner" }], 1);
      push("TEACHES", k.skills.map(x => ({ node: m.skill(x), meta: "Skill" })), 3);
      push("ENROLLED", s.enrolments.filter(e => e.courseId === k.id).map(e => ({ node: m.cand(e.candidateId), meta: e.date === "Today" ? "Enrolled today" : e.status })), 4);
      push("RECOMMENDED_FOR", k.recommendedFor.map(id => ({ node: m.cand(id), meta: "Suggested" })), 3);
      push("LEADS_TO", k.roles.map(r => ({ node: m.role(r), meta: "Role" })), 3);
      const hiring: { node: GNode | null; meta: string }[] = [];
      k.roles.forEach(r => open.filter(v => roleMatches(r, v.title)).forEach(v => hiring.push({ node: m.emp(v.employerId), meta: "Hiring: " + v.title })));
      push("VALUED_BY", hiring, 3);
      break;
    }
    case "skill": {
      const name = n.key;
      const eq = (x: string) => norm(x) === norm(name);
      const people = CANDIDATES.map(c => candidateOf(s, c.id));
      const holders = people.map(c => ({ c, k: c.skills.find(x => eq(x.name)) })).filter(x => x.k)
        .sort((a, b) => (a.k!.verification === "verified" ? 0 : 1) - (b.k!.verification === "verified" ? 0 : 1) || b.k!.level - a.k!.level);
      push("HELD_BY", holders.map(x => ({ node: m.cand(x.c.id), meta: (x.k!.verification === "verified" ? "Verified" : x.k!.verification === "pending" ? "Pending" : "Self-reported") + ", level " + x.k!.level })), 5);
      push("TRANSFERABLE_FOR", people.filter(c => c.transferable.some(eq)).map(c => ({ node: m.cand(c.id), meta: "Transferable" })), 3);
      const vacs = open.filter(v => v.required.some(eq) || v.preferred.some(eq)).sort((a, b) => (a.required.some(eq) ? 0 : 1) - (b.required.some(eq) ? 0 : 1));
      push("REQUIRED_BY", vacs.map(v => ({ node: m.vac(v.id), meta: (v.required.some(eq) ? "Required" : "Preferred") + ", " + (EMPLOYER_BY_ID[v.employerId]?.short || "") })), 5);
      push("TAUGHT_BY", COURSES.filter(k => k.skills.some(eq)).map(k => ({ node: m.course(k.id), meta: PARTNER_BY_ID[k.partnerId]?.short || "" })), 3);
      break;
    }
    case "partner": {
      const p = PARTNER_BY_ID[n.key];
      push("PROVIDES", COURSES.filter(k => k.partnerId === p.id).map(k => ({ node: m.course(k.id), meta: eur(k.price) })), 4);
      push("ISSUED_TO", CANDIDATES.filter(c => c.qualifications.some(q => q.issuer === p.name)).map(c => ({ node: m.cand(c.id), meta: c.qualifications.find(q => q.issuer === p.name)?.name || "" })), 6);
      push("VERIFIES", CREDENTIAL_CHECKS.filter(x => x.issuer === p.name).map(x => ({ node: m.cand(x.candidateId), meta: x.credential + ", " + x.status })), 3);
      break;
    }
    case "qual": {
      const holders = CANDIDATES.filter(c => c.qualifications.some(q => q.name === n.key));
      const issuer = n.sub;
      const p = PARTNER_BY_NAME.get(issuer);
      if (issuer) push("ISSUED_BY", [{ node: p ? m.partner(p.id) : m.org(issuer), meta: p ? "Education partner, fictional" : "Issuer" }], 1);
      push("HELD_BY", holders.map(c => {
        const q = c.qualifications.find(x => x.name === n.key);
        return { node: m.cand(c.id), meta: (q?.verification === "verified" ? "Verified" : q?.verification === "pending" ? "Pending" : "Self-reported") + ", " + (q?.year || "") };
      }), 6);
      break;
    }
    case "offer": {
      const o = offerById(n.key, s);
      if (!o) break;
      push("FOR", [{ node: m.cand(o.candidateId), meta: "Professional" }], 1);
      push("FROM", [{ node: m.emp(o.employerId), meta: "Employer" }], 1);
      push("FOR_ROLE", [{ node: m.vac(o.vacancyId), meta: "Vacancy" }], 1);
      push("COMPETES_WITH", s.offers.filter(x => x.candidateId === o.candidateId && x.id !== o.id && !["withdrawn", "declined"].includes(x.status))
        .map(x => ({ node: m.offer(x.id), meta: eur(x.salary) + ", " + x.status })), 2);
      break;
    }
    case "placement": {
      const p = s.placements.find(x => x.id === n.key);
      if (!p) break;
      push("PLACED", [{ node: m.cand(p.candidateId), meta: "Professional" }], 1);
      push("HIRED_BY", [{ node: m.emp(p.employerId), meta: "Employer" }], 1);
      push("FILLS", [{ node: m.vac(p.vacancyId), meta: "Vacancy" }], 1);
      push("GENERATES", [{ node: m.commission(p.id), meta: eur(p.salary * p.feeRate) }], 1);
      break;
    }
    case "commission": {
      const p = s.placements.find(x => x.id === n.key);
      if (!p) break;
      push("GENERATED_BY", [{ node: m.placement(p.id), meta: "Placement" }], 1);
      push("PAID_BY", [{ node: m.emp(p.employerId), meta: "Invoice " + p.invoice }], 1);
      break;
    }
    case "org":
      push("EMPLOYED", CANDIDATES.filter(c => c.experience.some(x => x.org === n.key)).map(c => ({ node: m.cand(c.id), meta: c.experience.find(x => x.org === n.key)?.role || "" })), 6);
      break;
    case "person": {
      const [e, ...rest] = n.key.split("|");
      const name = rest.join("|");
      push("WORKS_AT", [{ node: m.emp(e), meta: n.sub }], 1);
      push("APPROVES", s.offers.filter(o => o.employerId === e && o.approver === name && o.status !== "withdrawn").map(o => ({ node: m.offer(o.id), meta: o.status })), 3);
      break;
    }
    case "role":
      push("OPEN_ROLE", open.filter(v => roleMatches(n.key, v.title)).map(v => ({ node: m.vac(v.id), meta: EMPLOYER_BY_ID[v.employerId]?.short || "" })), 4);
      push("TRAINED_BY", COURSES.filter(k => k.roles.includes(n.key)).map(k => ({ node: m.course(k.id), meta: PARTNER_BY_ID[k.partnerId]?.short || "" })), 3);
      push("PREFERRED_BY", CANDIDATES.filter(c => c.preferredRoles.some(r => roleMatches(n.key, r))).map(c => ({ node: m.cand(c.id), meta: c.title })), 4);
      break;
  }
  return out;
}

/* ── layout ─────────────────────────────────────────────────────────────── */

const TAU = Math.PI * 2;

/* Nodes sit on one ellipse. The angle is warped so the top and bottom, where
   labels are centred under or over a node, get more room than the sides,
   where labels run outwards. Each position is kept in polar form (angle and
   distance) so a node and its edge move along the same arc. */
const warp = (u: number) => u - 0.24 * Math.sin(2 * u);
const warpSlope = (u: number) => 1 - 0.48 * Math.cos(2 * u);

function layout(groups: Group[], rx: number, ry: number) {
  const n = groups.reduce((t, g) => t + g.links.length, 0);
  const placed: (Placed & { room: number })[] = [];
  const labels: { pred: string; theta: number; len: number; color: string }[] = [];
  if (!n) return { placed, labels };
  const gap = groups.length > 1 ? 0.7 : 0;
  const step = TAU / (n + gap * groups.length);
  let u = -Math.PI / 2 - (step * (groups[0].links.length + gap)) / 2;
  const polar = (t: number) => { const x = rx * Math.cos(t), y = ry * Math.sin(t); return { theta: Math.atan2(y, x), len: Math.hypot(x, y) }; };
  groups.forEach(g => {
    const color = PRED[g.pred]?.color || "var(--accent)";
    const start = u;
    g.links.forEach((l, i) => {
      const ui = start + step * (i + 0.5);
      const p = polar(warp(ui));
      placed.push({ node: l.node, meta: l.meta, pred: g.pred, theta: p.theta, r: p.len, color, dashed: g.dashed, room: Math.max(rx, ry) * step * warpSlope(ui) });
    });
    const mid = polar(warp(start + (step * g.links.length) / 2));
    labels.push({ pred: g.pred, theta: mid.theta, len: mid.len, color });
    u += step * (g.links.length + gap);
  });
  return { placed, labels };
}

function useReducedMotion() {
  const [reduce, setReduce] = useState(() => typeof window !== "undefined" && !!window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const on = () => setReduce(mq.matches);
    mq.addEventListener?.("change", on);
    return () => mq.removeEventListener?.("change", on);
  }, []);
  return reduce;
}

function initialFocus(s: RecruitState) {
  try {
    const id = sessionStorage.getItem(EXPLORER_KEY);
    if (id) { sessionStorage.removeItem(EXPLORER_KEY); if (resolve(s, id)) return id; }
  } catch { /* storage blocked */ }
  return DEFAULT_FOCUS;
}

/* ── page ───────────────────────────────────────────────────────────────── */

export default function Relationships() {
  const s = useRecruit();
  const nav = useNav();
  const reduce = useReducedMotion();
  const [trail, setTrail] = useState<string[]>(() => [initialFocus(s)]);
  const [hidden, setHidden] = useState<string[]>([]);
  const [hover, setHover] = useState<string | null>(null);
  const [kbFocus, setKbFocus] = useState<string | null>(null);
  const [journey, setJourney] = useState<{ id: string; step: number } | null>(null);
  const [query, setQuery] = useState("");

  const focusId = trail[trail.length - 1];
  const center = resolve(s, focusId) || resolve(s, DEFAULT_FOCUS)!;
  const activeJourney = journey ? JOURNEYS.find(j => j.id === journey.id) || null : null;
  const atLastStep = !!(activeJourney && journey && journey.step === activeJourney.steps.length - 1);
  const nextStep = activeJourney && journey && !atLastStep ? activeJourney.steps[journey.step + 1] : null;
  const prevFocus = trail[trail.length - 2];
  const prefer = useMemo(() => new Set([prevFocus, nextStep].filter((x): x is string => !!x)), [prevFocus, nextStep]);
  const groups = useMemo(() => neighbours(s, center, prefer), [s, center.id, prefer]); // eslint-disable-line react-hooks/exhaustive-deps
  const shownGroups = groups.filter(g => !hidden.includes(g.pred));
  const highlightPred = atLastStep ? activeJourney?.finalPred || null : null;

  /* Keep the newest step of the trail in view. */
  const trailRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = trailRef.current;
    if (el) el.scrollLeft = el.scrollWidth;
  }, [trail]);

  /* Measure the graph area. */
  const wrap = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(0);
  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    setW(el.clientWidth);
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => setW(el.clientWidth));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const h = Math.round(Math.max(470, Math.min(600, w * 0.74)));
  const ry = Math.max(130, h / 2 - 56);
  const rx = Math.max(130, Math.min(w / 2 - 178, ry * 1.3));
  const { placed, labels } = layout(shownGroups, rx, ry);
  const labelChars = (theta: number, r: number, room: number) => {
    const c = Math.cos(theta);
    const middle = Math.abs(c) <= 0.3;
    const px = middle ? room - 8 : (c > 0 ? w / 2 - r * c : w / 2 + r * c) - 36;
    return Math.max(8, Math.min(24, Math.floor(px / (middle ? 6 : 6.3))));
  };

  /* What was on screen after the last settled layout. Nodes that stay glide
     the short way round; new ones wait in the centre, then fan out. */
  const snap = useRef<{ center: string | null; shown: Set<string>; angles: Map<string, number>; preds: Set<string> }>({ center: null, shown: new Set(), angles: new Map(), preds: new Set() });
  const [settledFor, setSettledFor] = useState<string | null>(null);
  const hold = !reduce && settledFor !== center.id;
  const display = placed.map(p => {
    const prev = snap.current.angles.get(p.node.id);
    return prev === undefined ? p : { ...p, theta: p.theta + Math.round((prev - p.theta) / TAU) * TAU };
  });
  const centerTheta = snap.current.angles.get(center.id) ?? -Math.PI / 2;
  const items = display.map(p => ({ ...p, isCenter: false }))
    .concat([{ node: center, meta: "", pred: "", theta: centerTheta, r: 0, color: "var(--accent)", dashed: false, room: 0, isCenter: true }])
    .sort((a, b) => (a.node.id < b.node.id ? -1 : a.node.id > b.node.id ? 1 : 0));
  const sortedLabels = labels.slice().sort((a, b) => (a.pred < b.pred ? -1 : 1));

  useEffect(() => {
    if (reduce || settledFor === center.id) return;
    let b = 0;
    const done = () => setSettledFor(center.id);
    const a = requestAnimationFrame(() => { b = requestAnimationFrame(done); });
    const t = setTimeout(done, 120); // in case frames are throttled
    return () => { cancelAnimationFrame(a); cancelAnimationFrame(b); clearTimeout(t); };
  }, [center.id, settledFor, reduce]);
  useEffect(() => {
    if (hold) return;
    const angles = new Map<string, number>(display.map(p => [p.node.id, p.theta] as [string, number]));
    angles.set(center.id, centerTheta);
    snap.current = { center: center.id, shown: new Set(display.map(p => p.node.id)), angles, preds: new Set(labels.map(l => l.pred)) };
  });

  /* Guided journeys step through their records on a timer. */
  useEffect(() => {
    if (!journey || !activeJourney || atLastStep) return;
    const t = setTimeout(() => {
      setTrail(tr => tr.concat([activeJourney.steps[journey.step + 1]]));
      setJourney({ id: journey.id, step: journey.step + 1 });
    }, 2000);
    return () => clearTimeout(t);
  }, [journey, activeJourney, atLastStep]);

  const recenter = (id: string) => {
    setJourney(null);
    setHover(null);
    setTrail(tr => {
      if (tr[tr.length - 1] === id) return tr;
      const at = tr.indexOf(id);
      return at > -1 ? tr.slice(0, at + 1) : tr.concat([id]);
    });
  };
  const startJourney = (id: string) => {
    const j = JOURNEYS.find(x => x.id === id);
    if (!j) return;
    setHidden([]);
    setHover(null);
    setTrail([j.steps[0]]);
    setJourney({ id, step: 0 });
  };

  const transition = reduce ? "none" : "transform .75s cubic-bezier(.16,1,.3,1), opacity .5s ease";
  const place = (theta: number, r: number) => "rotate(" + theta + "rad) translateX(" + r + "px) rotate(" + -theta + "rad)";
  const lit = hover || (nextStep && display.some(p => p.node.id === nextStep) ? nextStep : null);
  const litPred = lit ? display.find(p => p.node.id === lit)?.pred || null : highlightPred;

  /* Search across every record type in the sample. */
  const index = useMemo(() => {
    const m = nodeMaker(s);
    const skills = new Set<string>();
    CANDIDATES.forEach(c => c.skills.forEach(k => skills.add(k.name)));
    allVacancies(s).forEach(v => v.required.forEach(r => skills.add(r)));
    const list: (GNode | null)[] = ([] as (GNode | null)[])
      .concat(CANDIDATES.map(c => m.cand(c.id)), EMPLOYERS.map(e => m.emp(e.id)), allVacancies(s).map(v => m.vac(v.id)),
        COURSES.map(k => m.course(k.id)), PARTNERS.map(p => m.partner(p.id)), Array.from(skills).map(k => m.skill(k)));
    return list.filter((x): x is GNode => !!x);
  }, [s]);
  const results = query.trim().length > 1 ? index.filter(x => (x.label + " " + x.sub).toLowerCase().includes(query.trim().toLowerCase())).slice(0, 7) : [];

  const hovered = hover ? display.find(p => p.node.id === hover) : null;
  const totalLinks = groups.reduce((t, g) => t + g.all.length, 0);
  const cx = w / 2, cy = h / 2;

  return (
    <Page wide eyebrow="RECORDS" title="Relationship explorer"
      sub="Follow one record through everything it connects to. Recruit links people, skills, qualifications, roles, courses and employers, so every match has a reason behind it."
      actions={<>
        <div style={{ position: "relative", width: 250, maxWidth: "100%" }}>
          <span style={{ position: "absolute", left: 12, top: 12, color: "var(--faint)", pointerEvents: "none" }}><Icon name="search" size={15} /></span>
          <TextInput value={query} onChange={e => setQuery(e.target.value)} placeholder="Find a person, role, skill or course" style={{ paddingLeft: 36 }} aria-label="Find a record"
            onKeyDown={e => { if (e.key === "Enter" && results[0]) { recenter(results[0].id); setQuery(""); } if (e.key === "Escape") setQuery(""); }} />
          {results.length > 0 && (
            <div className="rc-fade" style={{ position: "absolute", top: 44, left: 0, right: 0, zIndex: 5, padding: 6, background: "var(--overlay)", border: "1px solid var(--border)",
              borderRadius: 14, boxShadow: "0 18px 40px rgba(0,0,0,.4)", backdropFilter: "blur(20px)" }}>
              {results.map(r => (
                <button key={r.id} onClick={() => { recenter(r.id); setQuery(""); }} className="rc-rowhover rc-focus"
                  style={{ display: "flex", alignItems: "center", gap: 9, width: "100%", padding: "8px 9px", border: 0, borderRadius: 10, background: "transparent", color: "inherit", cursor: "pointer", textAlign: "left" }}>
                  <Icon name={KIND_ICON[r.kind]} size={14} color="var(--dim)" />
                  <span className="rc-grow">
                    <span className="rc-ellipsis" style={{ display: "block", fontSize: 12.5, color: "var(--ink)" }}>{r.label}</span>
                    <span className="rc-ellipsis" style={{ display: "block", fontSize: 11, color: "var(--faint)" }}>{KIND_LABEL[r.kind]}, {r.sub}</span>
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
        <Button icon="layers" onClick={() => nav.go("Records", "records")}>Entity registry</Button>
      </>}>

      <Card pad="14px 16px">
        <div className="rc-row rc-wrap" style={{ gap: 10 }}>
          <Label style={{ marginRight: 4 }}>Suggested journeys</Label>
          {JOURNEYS.map(j => {
            const on = journey?.id === j.id;
            const reached = on && journey ? journey.step + (atLastStep && j.finalPred ? 1 : 0) : -1;
            return (
              <button key={j.id} onClick={() => (on && !atLastStep ? setJourney(null) : startJourney(j.id))} className="rc-btn rc-btn-secondary rc-focus"
                style={{ display: "inline-flex", alignItems: "center", gap: 6, height: 32, padding: "0 12px", borderRadius: "var(--cta-r, 12px)", cursor: "pointer", fontSize: 12.5,
                  background: on ? "var(--accent-soft)" : "var(--surface-2)", border: "1px solid " + (on ? "var(--accent-line)" : "var(--border)"), color: on ? "var(--ink)" : "var(--body)" }}>
                <Icon name={on && atLastStep ? "refresh" : "route"} size={13} color="var(--accent)" />
                {j.parts.map((p, i) => (
                  <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                    {i > 0 && <Icon name="arrowRight" size={10} color="var(--faint)" />}
                    <span style={{ fontWeight: i <= reached ? 600 : 400, color: on && i > reached ? "var(--dim)" : undefined }}>{p}</span>
                  </span>
                ))}
              </button>
            );
          })}
        </div>
      </Card>

      <div className="rc-grid rc-g-side-r" style={{ gap: 14 }}>
        <Card pad={0} style={{ overflow: "hidden", alignSelf: "start" }}>
          <div className="rc-row rc-wrap" style={{ gap: 8, padding: "12px 16px", borderBottom: "1px solid var(--border)" }}>
            <Button size="sm" variant="ghost" icon="arrowLeft" disabled={trail.length < 2} onClick={() => { setJourney(null); setTrail(tr => tr.slice(0, -1)); }}>Back</Button>
            <div ref={trailRef} className="rc-row rc-scroll-x rc-grow" style={{ gap: 4 }}>
              {trail.map((id, i) => {
                const n = resolve(s, id);
                if (!n) return null;
                const last = i === trail.length - 1;
                return (
                  <span key={id + i} className="rc-row" style={{ gap: 4, flex: "none" }}>
                    {i > 0 && <Icon name="chevronRight" size={12} color="var(--faint)" />}
                    <button onClick={() => recenter(id)} disabled={last} className="rc-focus"
                      style={{ display: "inline-flex", alignItems: "center", gap: 6, height: 26, padding: "0 9px", borderRadius: 8, cursor: last ? "default" : "pointer", fontSize: 12,
                        border: "1px solid " + (last ? "var(--accent-line)" : "transparent"), background: last ? "var(--accent-soft)" : "transparent", color: last ? "var(--ink)" : "var(--dim)" }}>
                      <Icon name={KIND_ICON[n.kind]} size={12} />{trunc(n.label, last ? 26 : 18)}
                    </button>
                  </span>
                );
              })}
            </div>
            {journey && activeJourney && <Badge tone="accent" icon="route">Journey, step {journey.step + 1} of {activeJourney.steps.length}</Badge>}
            <Button size="sm" variant="ghost" icon="refresh" onClick={() => { setJourney(null); setHidden([]); setTrail([DEFAULT_FOCUS]); }}>Reset</Button>
          </div>

          <div ref={wrap} style={{ position: "relative", height: h, background: "radial-gradient(circle at 50% 50%, color-mix(in oklab, #4263EB 11%, var(--surface)) 0%, var(--surface) 58%)" }}
            onMouseLeave={() => setHover(null)}>
            {w > 0 && (
              <svg width={w} height={h} style={{ display: "block" }} role="group" aria-label={"Records connected to " + center.label}>
                <g transform={"translate(" + cx + " " + cy + ")"}>
                  <ellipse rx={rx} ry={ry} fill="none" stroke="var(--border)" strokeDasharray="2 6" />
                  <ellipse rx={rx * 0.42} ry={ry * 0.42} fill="none" stroke="var(--border)" strokeDasharray="2 6" opacity={0.5} />

                  {items.map(it => {
                    const freshEdge = !snap.current.shown.has(it.node.id);
                    const holdIt = hold && freshEdge && !it.isCenter;
                    const on = !it.isCenter && (lit === it.node.id || (!lit && highlightPred === it.pred));
                    const dim = !it.isCenter && (lit ? lit !== it.node.id : !!highlightPred && highlightPred !== it.pred);
                    return (
                      <g key={"e" + it.node.id} style={{ transform: "rotate(" + it.theta + "rad) scaleX(" + (holdIt ? 0 : it.r) + ")", transformOrigin: "0 0",
                        transition: holdIt ? "none" : transition, opacity: it.isCenter || holdIt ? 0 : dim ? 0.16 : on ? 1 : 0.55 }}>
                        <line x1={0} y1={0} x2={1} y2={0} stroke={it.color} strokeWidth={on ? 2.6 : 1.3} strokeDasharray={it.dashed ? "4 4" : undefined} vectorEffect="non-scaling-stroke" />
                      </g>
                    );
                  })}

                  {sortedLabels.map(l => {
                    const fresh = !snap.current.preds.has(l.pred);
                    const flip = Math.cos(l.theta) < -0.01;
                    const dim = litPred ? litPred !== l.pred : false;
                    return (
                      <g key={"l" + l.pred} style={{ transform: "rotate(" + l.theta + "rad) translateX(" + (46 + l.len - 26) / 2 + "px) rotate(" + (flip ? Math.PI : 0) + "rad)",
                        transformOrigin: "0 0", transition: hold && fresh ? "none" : transition, opacity: hold && fresh ? 0 : dim ? 0.22 : 1 }}>
                        <text x={0} y={3} textAnchor="middle" fontSize={8.6} fontFamily="var(--mono)" letterSpacing=".06em" fontWeight={600} fill={l.color}
                          stroke="var(--surface)" strokeWidth={3.4} paintOrder="stroke" style={{ pointerEvents: "none" }}>{l.pred}</text>
                      </g>
                    );
                  })}

                  {items.map(it => {
                    const id = it.node.id;
                    const fresh = !snap.current.shown.has(id) && snap.current.center !== id;
                    const wasCenter = snap.current.center === id && !it.isCenter;
                    const holdIt = hold && (fresh || wasCenter);
                    const r = holdIt ? 0 : it.r;
                    const dim = !it.isCenter && (lit ? lit !== id : !!highlightPred && highlightPred !== it.pred);
                    const c = Math.cos(it.theta), sn = Math.sin(it.theta);
                    const anchor = c > 0.3 ? "start" : c < -0.3 ? "end" : "middle";
                    const lx = anchor === "middle" ? 0 : c * 25, ly = anchor === "middle" ? (sn > 0 ? 33 : -25) : sn * 25 + 4;
                    return (
                      <g key={id} role={it.isCenter ? undefined : "button"} tabIndex={it.isCenter ? undefined : 0}
                        aria-label={it.isCenter ? undefined : it.pred + ": " + it.node.label + ". Centre the graph here."}
                        style={{ transform: place(it.theta, r), transformOrigin: "0 0", transition: holdIt ? "none" : transition,
                          opacity: hold && fresh ? 0 : dim ? 0.38 : 1, cursor: it.isCenter ? "default" : "pointer", outline: "none" }}
                        onClick={it.isCenter ? undefined : () => recenter(id)} onMouseEnter={it.isCenter ? undefined : () => setHover(id)}
                        onFocus={it.isCenter ? undefined : () => setKbFocus(id)} onBlur={it.isCenter ? undefined : () => setKbFocus(f => (f === id ? null : f))}
                        onKeyDown={it.isCenter ? undefined : e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); recenter(id); } }}>
                        <circle r={40} fill="var(--accent-soft)" stroke="var(--accent-line)" style={{ opacity: it.isCenter ? 1 : 0, transition: reduce ? "none" : "opacity .5s ease" }} />
                        <g style={{ transform: "scale(" + (it.isCenter ? 1.72 : hover === id ? 1.12 : 1) + ")", transformOrigin: "0 0", transition: reduce ? "none" : "transform .45s cubic-bezier(.16,1,.3,1)" }}>
                          {!it.isCenter && (kbFocus === id || nextStep === id) && <circle r={24} fill="none" stroke="var(--accent)" strokeWidth={2} />}
                          <NodeShape n={it.node} color={it.color} />
                        </g>
                        <text x={lx} y={ly} textAnchor={anchor} fontSize={11} fill={hover === id ? "var(--ink)" : "var(--body)"}
                          stroke="var(--surface)" strokeWidth={3} paintOrder="stroke" style={{ pointerEvents: "none", opacity: it.isCenter ? 0 : 1, transition: reduce ? "none" : "opacity .3s ease" }}>
                          {trunc(it.node.label, labelChars(it.theta, it.r, it.room))}
                        </text>
                      </g>
                    );
                  })}
                </g>
              </svg>
            )}

            {hovered && (
              <div style={{ position: "absolute", left: Math.min(Math.max(cx + hovered.r * Math.cos(hovered.theta) - 110, 8), w - 228), top: Math.max(cy + hovered.r * Math.sin(hovered.theta) - 96, 8),
                width: 220, pointerEvents: "none", padding: "9px 11px", background: "var(--tooltip)", border: "1px solid var(--border)", borderRadius: 12, boxShadow: "0 12px 32px rgba(0,0,0,.4)", zIndex: 3 }}>
                <div style={{ fontFamily: "var(--mono)", fontSize: 9, letterSpacing: ".08em", color: hovered.color }}>{hovered.pred}</div>
                <div style={{ fontSize: 12.5, color: "var(--tooltip-ink, var(--ink))", marginTop: 4, lineHeight: 1.35 }}>{hovered.node.label}</div>
                <div style={{ fontSize: 11, color: "var(--dim)", marginTop: 3 }}>{hovered.meta}</div>
                <div style={{ fontSize: 10.5, color: "var(--faint)", marginTop: 5 }}>Select to centre the graph here</div>
              </div>
            )}

            {!display.length && (
              <div style={{ position: "absolute", left: 0, right: 0, bottom: 40, textAlign: "center", fontSize: 12.5, color: "var(--dim)" }}>
                {groups.length ? "Every relationship type is hidden. Show them again below." : "No connected records in the sample for this one."}
              </div>
            )}
          </div>

          <div style={{ padding: "12px 16px 14px", borderTop: "1px solid var(--border)" }}>
            <div className="rc-row rc-wrap" style={{ gap: 6 }}>
              <span style={{ fontSize: 12, color: "var(--dim)", marginRight: 4 }}>
                <b style={{ color: "var(--ink)", fontWeight: 600 }}>{totalLinks}</b> connections across {groups.length} relationship types
              </span>
              {groups.map(g => {
                const off = hidden.includes(g.pred);
                return (
                  <Chip key={g.pred} active={!off} onClick={() => setHidden(hs => (off ? hs.filter(x => x !== g.pred) : hs.concat([g.pred])))}
                    style={{ height: 26, opacity: off ? 0.55 : 1 }}>
                    <span style={{ width: 8, height: 8, borderRadius: 3, background: PRED[g.pred]?.color || "var(--accent)", opacity: off ? 0.4 : 1 }} />
                    <span style={{ fontFamily: "var(--mono)", fontSize: 10, letterSpacing: ".04em" }}>{g.pred}</span>
                    <span style={{ fontSize: 11, color: "var(--faint)" }}>{g.links.length < g.all.length ? g.links.length + " of " + g.all.length : g.all.length}</span>
                  </Chip>
                );
              })}
              {hidden.length > 0 && <button className="rc-link" style={{ fontSize: 12, marginLeft: 4 }} onClick={() => setHidden([])}>Show all</button>}
            </div>
            <div style={{ fontSize: 11.5, color: "var(--faint)", marginTop: 10, lineHeight: 1.5 }}>
              Solid lines are recorded facts. Dashed lines are suggestions from the agents: matches, recommendations and transferable skills. They support a decision; they never make one.
            </div>
          </div>
        </Card>

        <Details s={s} nav={nav} n={center} groups={groups} onPick={recenter} maxHeight={h + 176} />
      </div>

      <SampleStrip s={s} />
    </Page>
  );
}

/* ── node shapes ────────────────────────────────────────────────────────── */

function NodeShape({ n, color }: { n: GNode; color: string }) {
  const r = 17;
  if ((n.kind === "candidate" || n.kind === "employer" || n.kind === "partner") && n.tint) {
    const square = n.kind !== "candidate";
    return (
      <>
        {square ? <rect x={-r} y={-r} width={r * 2} height={r * 2} rx={10} fill={n.tint} stroke="var(--surface)" strokeWidth={2} />
          : <circle r={r} fill={n.tint} stroke="var(--surface)" strokeWidth={2} />}
        <text y={3.8} textAnchor="middle" fontSize={10.5} fontWeight={650} fill="#0d1220" style={{ pointerEvents: "none" }}>{n.initials}</text>
      </>
    );
  }
  if (n.kind === "person") {
    return (
      <>
        <circle r={r} fill="var(--surface-2)" stroke={color} strokeWidth={1.5} />
        <text y={3.8} textAnchor="middle" fontSize={10} fontWeight={600} fill="var(--ink)" style={{ pointerEvents: "none" }}>{n.initials}</text>
      </>
    );
  }
  const icon = RICONS[KIND_ICON[n.kind]] || RICONS.info;
  return (
    <>
      <circle r={r} fill="var(--surface-2)" stroke={color} strokeWidth={1.6} />
      <g transform={"translate(-8 -8) scale(" + 16 / 24 + ")"}>
        <path d={icon} fill="none" stroke={color} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      </g>
    </>
  );
}

/* ── details panel ──────────────────────────────────────────────────────── */

function Details({ s, nav, n, groups, onPick, maxHeight }: { s: RecruitState; nav: NavApi; n: GNode; groups: Group[]; onPick: (id: string) => void; maxHeight: number }) {
  const [expanded, setExpanded] = useState<string | null>(null);
  useEffect(() => setExpanded(null), [n.id]);
  const facts: { k: ReactNode; v: ReactNode }[] = [];
  let insight: ReactNode = null;
  let open: { label: string; go: () => void } | null = null;
  const open_ = allVacancies(s).filter(v => v.status === "open");

  if (n.kind === "candidate") {
    const c = candidateOf(s, n.key);
    const top = relevantRoles(s, c.id, 1)[0];
    const vis = visibilityOf(c.id, s);
    facts.push({ k: "Recruit Index", v: num(c.recruitIndex) }, { k: "Experience", v: c.years + " years" }, { k: "Location", v: c.location },
      { k: "Availability", v: c.availability }, { k: "Market range", v: eurK(c.marketRange[0]) + " to " + eurK(c.marketRange[1]) + ", est." }, { k: "Visibility", v: cap(c.visibility) });
    insight = <>
      {top ? <>Strongest match: <b style={{ color: "var(--ink)", fontWeight: 600 }}>{top.v.title}</b> at {EMPLOYER_BY_ID[top.v.employerId]?.short} ({top.m.score}%). </> : null}
      {vis.blockCurrentEmployer && c.status === "active" ? "Hidden from their current employer by their own privacy setting." : ""}
    </>;
    open = { label: "Open profile", go: () => openDrawer("candidate", c.id) };
  } else if (n.kind === "employer") {
    const e = EMPLOYER_BY_ID[n.key];
    const vacs = employerVacancies(s, e.id).filter(v => v.status === "open");
    const live = s.offers.filter(o => o.employerId === e.id && !["accepted", "declined", "withdrawn"].includes(o.status));
    facts.push({ k: "Tier", v: s.tiers.find(t => t.id === e.tier)?.label || "" }, { k: "Membership", v: cap(e.membershipStatus) }, { k: "Location", v: e.location },
      { k: "Health", v: cap(e.health) }, { k: "Placements YTD", v: e.placementsYtd }, { k: "Contact", v: e.contact });
    insight = <>{vacs.length} open {vacs.length === 1 ? "role" : "roles"} and {live.length} {live.length === 1 ? "offer" : "offers"} in progress. {e.note}</>;
    open = { label: "Open employer", go: () => openDrawer("employer", e.id) };
  } else if (n.kind === "vacancy") {
    const v = vacancyById(n.key, s) as Vacancy;
    const pipe = s.pipeline.filter(p => p.vacancyId === v.id);
    const best = pipe.map(p => ({ p, x: matchScore(candidateOf(s, p.candidateId), v) })).sort((a, b) => b.x.score - a.x.score)[0];
    facts.push({ k: "Employer", v: EMPLOYER_BY_ID[v.employerId]?.short }, { k: "Salary", v: eurK(v.salary[0]) + " to " + eurK(v.salary[1]) }, { k: "Status", v: cap(v.status) },
      { k: "Posted", v: v.postedDays + " days ago" }, { k: "Pipeline", v: pipe.length }, { k: "Market matches", v: v.marketMatches || "None" });
    const inPipe = new Set(pipe.map(p => p.candidateId));
    const outside = CANDIDATES.filter(c => c.status === "active" && !inPipe.has(c.id) && visibilityOf(c.id, s).mode !== "hidden")
      .map(c => ({ c, x: matchScore(candidateOf(s, c.id), v) })).sort((a, b) => b.x.score - a.x.score)[0];
    const better = outside && (!best || outside.x.score > best.x.score) ? outside : null;
    insight = <>
      {best ? <>Best evidence in the pipeline: <b style={{ color: "var(--ink)", fontWeight: 600 }}>{CANDIDATE_BY_ID[best.p.candidateId]?.name}</b> at {best.x.score}%, now at {stageLabel(best.p.stage).toLowerCase()}. </>
        : <>No pipeline yet. {v.marketMatches} profiles in the simulated marketplace fit the brief. </>}
      {better ? <><b style={{ color: "var(--ink)", fontWeight: 600 }}>{better.c.name}</b> matches at {better.x.score}% and is not in the pipeline yet.</> : null}
    </>;
    open = { label: "Open vacancy", go: () => openDrawer("vacancy", v.id) };
  } else if (n.kind === "course") {
    const k = COURSE_BY_ID[n.key];
    const employers = new Set(open_.filter(v => k.roles.some(r => roleMatches(r, v.title))).map(v => v.employerId));
    facts.push({ k: "Provider", v: PARTNER_BY_ID[k.partnerId]?.short }, { k: "Price", v: eur(k.price) }, { k: "Member price", v: eur(k.price * (1 - k.memberDiscount)) },
      { k: "Duration", v: k.duration }, { k: "Enrolled", v: num(k.enrolled + s.enrolments.filter(e => e.courseId === k.id && e.date === "Today").length) }, { k: "Rating", v: k.rating.toFixed(1) });
    insight = <>Leads to roles at {employers.size} {employers.size === 1 ? "employer" : "employers"} hiring now. Estimated salary effect {eurK(k.impact[0])} to {eurK(k.impact[1])}, illustrative.</>;
    open = { label: "Open course", go: () => openDrawer("course", k.id) };
  } else if (n.kind === "partner") {
    const p = PARTNER_BY_ID[n.key];
    facts.push({ k: "Status", v: p.status }, { k: "Type", v: p.kind }, { k: "Location", v: p.location }, { k: "Referrals", v: num(p.referrals) },
      { k: "Enrolments", v: num(p.enrolments) }, { k: "Revenue share", v: pct(p.revenueShare) + ", concept" });
    insight = <>A fictional institution. No partnership has been signed.</>;
    open = { label: "Open partners", go: () => nav.go("hq.learning", "institutions") };
  } else if (n.kind === "skill") {
    const eq = (x: string) => norm(x) === norm(n.key);
    const holders = CANDIDATES.map(c => candidateOf(s, c.id)).filter(c => c.skills.some(k => eq(k.name)));
    const verified = holders.filter(c => c.skills.find(k => eq(k.name))?.verification === "verified").length;
    const roles = open_.filter(v => v.required.some(eq) || v.preferred.some(eq));
    const demand = roles.reduce((t, v) => t + v.marketMatches, 0);
    facts.push({ k: "Held by", v: holders.length + " in the sample" }, { k: "Verified", v: verified }, { k: "Open roles asking", v: roles.length },
      { k: "Courses teaching", v: COURSES.filter(k => k.skills.some(eq)).length });
    insight = <>Supply and demand in one place: {holders.length} sample professionals hold it and {roles.length} open {roles.length === 1 ? "role asks" : "roles ask"} for it{demand ? ", with " + num(demand) + " aggregate matches across the marketplace" : ""}.</>;
  } else if (n.kind === "qual") {
    const holders = CANDIDATES.filter(c => c.qualifications.some(q => q.name === n.key));
    facts.push({ k: "Issuer", v: n.sub || "Unknown" }, { k: "Holders", v: holders.length },
      { k: "Verified", v: holders.filter(c => c.qualifications.find(q => q.name === n.key)?.verification === "verified").length });
    insight = PARTNER_BY_NAME.get(n.sub) ? <>Issued by a fictional education partner, so a credential check would go straight to the issuer (simulated).</> : <>Checks go to the issuer. In this demo they are simulated.</>;
  } else if (n.kind === "offer") {
    const o = offerById(n.key, s);
    if (o) {
      facts.push({ k: "Professional", v: CANDIDATE_BY_ID[o.candidateId]?.name }, { k: "Employer", v: EMPLOYER_BY_ID[o.employerId]?.short }, { k: "Salary", v: eur(o.salary) },
        { k: "Status", v: cap(o.status) }, { k: "Expires", v: o.expires }, { k: "Candidate sees it", v: o.visibleToCandidate ? "Yes" : "Not yet" });
      const rival = s.offers.find(x => x.candidateId === o.candidateId && x.id !== o.id && !["withdrawn", "declined"].includes(x.status));
      insight = rival ? <>Competes with {EMPLOYER_BY_ID[rival.employerId]?.short}'s offer at {eur(rival.salary)}.</> : <>{o.bonus}.</>;
      open = { label: "Open offer", go: () => openDrawer("offer", o.id) };
    }
  } else if (n.kind === "placement" || n.kind === "commission") {
    const p = s.placements.find(x => x.id === n.key);
    if (p) {
      facts.push({ k: "Professional", v: CANDIDATE_BY_ID[p.candidateId]?.name }, { k: "Employer", v: EMPLOYER_BY_ID[p.employerId]?.short }, { k: "Salary", v: eur(p.salary) },
        { k: "Success fee", v: eur(p.salary * p.feeRate) + ", " + pct(p.feeRate) }, { k: "Agency at 25%", v: eur(p.salary * MARKET.agencyBenchmarkRate) }, { k: "Invoice", v: cap(p.invoice) });
      insight = <>The employer keeps {eur(p.salary * (MARKET.agencyBenchmarkRate - p.feeRate))} against a 25% agency fee.</>;
      open = n.kind === "commission" ? { label: "Open commissions", go: () => nav.go("hq.revenue", "commissions") } : { label: "Open profile", go: () => openDrawer("candidate", p.candidateId) };
    }
  } else if (n.kind === "org") {
    const n2 = CANDIDATES.filter(c => c.experience.some(x => x.org === n.key)).length;
    facts.push({ k: "Type", v: "Career history" }, { k: "Professionals", v: n2 });
    insight = <>From a professional's career history. Not an employer account on Recruit.</>;
  } else if (n.kind === "person") {
    const e = n.key.split("|")[0];
    facts.push({ k: "Role", v: n.sub.split(", ")[0] }, { k: "Employer", v: EMPLOYER_BY_ID[e]?.short });
    insight = <>A fictional employer contact.</>;
    open = { label: "Open employer", go: () => openDrawer("employer", e) };
  } else if (n.kind === "role") {
    const vacs = open_.filter(v => roleMatches(n.key, v.title));
    facts.push({ k: "Open roles", v: vacs.length }, { k: "Courses leading here", v: COURSES.filter(k => k.roles.includes(n.key)).length });
    insight = <>A role title shared by courses, vacancies and professionals' preferences.</>;
  }

  return (
    <Card style={{ alignSelf: "start", maxHeight, overflowY: "auto", scrollbarWidth: "thin" }}>
      <div className="rc-row" style={{ gap: 10, alignItems: "flex-start" }}>
        <span style={{ width: 34, height: 34, flex: "none", borderRadius: 11, display: "flex", alignItems: "center", justifyContent: "center", background: "var(--accent-soft)", color: "var(--accent)" }}>
          <Icon name={KIND_ICON[n.kind]} size={16} />
        </span>
        <div className="rc-grow">
          <Label>{KIND_LABEL[n.kind]}</Label>
          <div style={{ fontSize: 16, fontWeight: 600, letterSpacing: "-.3px", marginTop: 4, lineHeight: 1.3 }}>{n.label}</div>
          <div style={{ fontSize: 12, color: "var(--dim)", marginTop: 3 }}>{n.sub}</div>
        </div>
      </div>
      {facts.length > 0 && <div style={{ marginTop: 14 }}><KV cols={2} items={facts} /></div>}
      {insight && (
        <div className="rc-row" style={{ gap: 9, alignItems: "flex-start", marginTop: 12, padding: "10px 12px", borderRadius: 12, background: "var(--accent-faint)", border: "1px solid var(--accent-line)" }}>
          <span style={{ color: "var(--accent)", marginTop: 1 }}><Icon name="sparkle" size={13} /></span>
          <div style={{ fontSize: 12.5, color: "var(--body)", lineHeight: 1.5 }}>{insight}</div>
        </div>
      )}
      {open && <Button full variant="primary" iconRight="arrowRight" style={{ marginTop: 12 }} onClick={open.go}>{open.label}</Button>}

      <Label style={{ marginTop: 18 }}>Connections</Label>
      <div className="rc-col" style={{ marginTop: 8 }}>
        {groups.map(g => {
          const isOpen = expanded === g.pred;
          const list = isOpen ? g.all : g.all.slice(0, 3);
          return (
            <div key={g.pred} style={{ padding: "9px 0", borderTop: "1px solid var(--border)" }}>
              <div className="rc-row" style={{ gap: 8 }}>
                <span style={{ width: 8, height: 8, borderRadius: 3, background: PRED[g.pred]?.color || "var(--accent)" }} />
                <span style={{ fontFamily: "var(--mono)", fontSize: 10, letterSpacing: ".05em", color: "var(--body)" }}>{g.pred}</span>
                <span className="rc-grow" style={{ fontSize: 11, color: "var(--faint)" }}>{PRED[g.pred]?.hint}</span>
                <span style={{ fontSize: 11.5, color: "var(--dim)" }}>{g.all.length}</span>
              </div>
              <div className="rc-col" style={{ marginTop: 4 }}>
                {list.map(l => (
                  <button key={l.node.id} onClick={() => onPick(l.node.id)} className="rc-rowhover rc-focus"
                    style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "5px 6px", margin: "0 -6px", border: 0, borderRadius: 8, background: "transparent", color: "inherit", cursor: "pointer", textAlign: "left" }}>
                    <Icon name={KIND_ICON[l.node.kind]} size={12} color="var(--faint)" />
                    <span className="rc-grow rc-ellipsis" style={{ fontSize: 12.5, color: "var(--ink)" }}>{l.node.label}</span>
                    <span className="rc-ellipsis" style={{ fontSize: 11, color: "var(--faint)", maxWidth: 120 }}>{l.meta}</span>
                  </button>
                ))}
              </div>
              {g.all.length > 3 && (
                <button className="rc-link" style={{ fontSize: 11.5, marginTop: 4 }} onClick={() => setExpanded(isOpen ? null : g.pred)}>
                  {isOpen ? "Show fewer" : "Show all " + g.all.length}
                </button>
              )}
            </div>
          );
        })}
        {!groups.length && <div style={{ fontSize: 12.5, color: "var(--dim)", padding: "8px 0" }}>No connected records in the sample.</div>}
      </div>
    </Card>
  );
}

/* ── sample strip ───────────────────────────────────────────────────────── */

function SampleStrip({ s }: { s: RecruitState }) {
  const vacs = allVacancies(s);
  const skills = new Set<string>();
  CANDIDATES.forEach(c => c.skills.forEach(k => skills.add(k.name)));
  vacs.forEach(v => v.required.concat(v.preferred).forEach(r => skills.add(r)));
  COURSES.forEach(k => k.skills.forEach(x => skills.add(x)));
  const edges = CANDIDATES.reduce((t, c) => t + c.skills.length + c.qualifications.length + c.experience.length + c.transferable.length, 0)
    + vacs.reduce((t, v) => t + v.required.length + v.preferred.length + 1, 0)
    + s.applications.length + s.pipeline.length + s.offers.length * 3 + s.placements.length * 4 + s.enrolments.length
    + COURSES.reduce((t, k) => t + k.skills.length + k.roles.length + k.recommendedFor.length + 1, 0);
  const items: [string, number][] = [
    ["Professionals", CANDIDATES.length], ["Employers", EMPLOYERS.length], ["Vacancies", vacs.length], ["Courses", COURSES.length],
    ["Partners", PARTNERS.length], ["Skills", skills.size], ["Relationships", edges],
  ];
  return (
    <div className="rc-row rc-wrap" style={{ gap: 8, padding: "2px 4px" }}>
      <span style={{ fontSize: 11.5, color: "var(--faint)", marginRight: 4 }}>Sample graph in this demo</span>
      {items.map(([k, v]) => (
        <span key={k} style={{ display: "inline-flex", alignItems: "baseline", gap: 6, height: 26, padding: "4px 10px", borderRadius: 999, background: "var(--surface-2)", border: "1px solid var(--border)", fontSize: 11.5, color: "var(--dim)" }}>
          <b style={{ color: "var(--ink)", fontWeight: 600 }}>{num(v)}</b>{k}
        </span>
      ))}
      <span style={{ fontSize: 11.5, color: "var(--faint)" }}>The full simulated marketplace holds {num(MARKET.registeredProfessionals)} professionals. All records are fictional.</span>
    </div>
  );
}
