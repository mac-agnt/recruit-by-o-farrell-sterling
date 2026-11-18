/* Demo data and pure helpers for Recruit HQ, the founder's operating layer for
   the Recruit marketplace (O'Farrell Sterling). Every figure is derived from the
   shared fixtures in src/recruit/data and describes one illustrative
   future-state scenario, not actual results. */

import {
  MARKET, TIERS, SERIES, MONTHS, SCENARIO_CAPTION, CANDIDATE_FUNNEL, CAMPAIGNS, REGION_MIX, QUALITY,
  membershipRevenue, totalAccounts, placementEconomics,
  EMPLOYERS, EMPLOYER_BY_ID, VACANCIES, CANDIDATE_BY_ID, PLACEMENTS, PARTNERS, COURSE_BY_ID,
  RECRUIT_AGENTS, HQ_TEAM, HQ_TEAMS, ORG, INTEGRATIONS_ROADMAP, COMMISSION_RULES, VERIFICATION_QUEUE,
  PRIVACY_REQUESTS, GOVERNANCE
} from "../recruit/data";
import { num, eur, plural } from "../recruit/format";

/* ---- small formatters, so every number below is computed, not typed ---- */
const MINUS = "−";
const k1 = (n) => (n / 1000).toFixed(1).replace(/\.0$/, "") + "k";
const eurk1 = (n) => "€" + (n / 1000).toFixed(1).replace(/\.0$/, "") + "k";
const pctOf = (a, b, d) => (100 * a / b).toFixed(d || 0) + "%";
const signed = (n) => (n >= 0 ? "+" : MINUS) + num(Math.abs(n));
const lastDelta = (arr) => arr[arr.length - 1] - arr[arr.length - 2];
const growth = (arr) => {
  const a = arr[arr.length - 2], b = arr[arr.length - 1];
  return (b >= a ? "+" : MINUS) + Math.abs(100 * (b - a) / a).toFixed(1) + "%";
};
const bars9 = (arr) => { const t = arr.slice(-9), mx = Math.max.apply(null, t); return t.map(v => +(v / mx).toFixed(3)); };
const FLAT = [.84, .86, .85, .88, .87, .9, .89, .91, .92];
const tierLabel = (id) => (TIERS.find(t => t.id === id) || {}).label || "";
const candName = (id) => (CANDIDATE_BY_ID[id] || {}).name || id;
const empShort = (id) => (EMPLOYER_BY_ID[id] || {}).short || id;
const agentById = (id) => RECRUIT_AGENTS.find(a => a.id === id) || {};
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

/* The marketplace series, named once. */
const REG = SERIES.registered, VER = SERIES.verified, DISC = SERIES.discoverable, EMP = SERIES.employers,
  VAC = SERIES.vacancies, PLC = SERIES.placements, HRS = SERIES.hoursToShortlist, MRR = SERIES.membershipMrr,
  FEE = SERIES.successFees, EDU = SERIES.educationRevenue;
const MEMBERSHIP_ANNUAL = membershipRevenue(TIERS);
/* From the Verification Agent's queue: the backlog older than the 5-day target. */
const VERIFY_OLD = 210;
/* From the Ops Watchdog: memberships expiring in the next 30 days. */
const RENEWALS_30 = 23;
const AGENT_RUNS_TODAY = RECRUIT_AGENTS.reduce((t, a) => t + a.runsToday, 0);

const INK="var(--ink)", BODY="var(--body)", DIM="var(--dim)", FAINT="var(--faint)";
const LIME="var(--accent)", GREEN="var(--ok)", AMBER="var(--warn)", RED="var(--bad)", NEUTRAL="var(--neutral)";
const MONO="var(--mono)";

const ICONS = {
  navHome:"M12 3.2 3.6 9.1v10a1.5 1.5 0 0 0 1.5 1.5h13.8a1.5 1.5 0 0 0 1.5-1.5v-10L12 3.2Z M8.9 13.1h2l1-2.6 1.5 5 1.1-2.4h1.6",
  navAgents:"M12 2.4v2.3 M12 2.4a.9.9 0 1 0 0-.02 M8.2 6.5h7.6A2.2 2.2 0 0 1 18 8.7v5.1a2.2 2.2 0 0 1-2.2 2.2H8.2A2.2 2.2 0 0 1 6 13.8V8.7a2.2 2.2 0 0 1 2.2-2.2Z M9.9 10.6v1.4 M14.1 10.6v1.4 M6 10h-1.9 M18 10h1.9 M9.2 18.6h5.6 M9.2 21.2h5.6",
  navDash:"M4 5.6h7.2v5.1H4V5.6Z M13.6 5.6H20v8.6h-6.4V5.6Z M4 13.1h7.2v5.3H4v-5.3Z M13.6 16.6H20v1.8h-6.4v-1.8Z",
  navWork:"M9.4 4.4h5.2a1.4 1.4 0 0 1 1.4 1.4v1.1h2.4A1.6 1.6 0 0 1 20 8.5v9.1a1.6 1.6 0 0 1-1.6 1.6H5.6A1.6 1.6 0 0 1 4 17.6V8.5a1.6 1.6 0 0 1 1.6-1.6H8V5.8a1.4 1.4 0 0 1 1.4-1.4Z M8 6.9h8 M9.6 13.3l1.8 1.8 3.4-3.6",
  navRecords:"M12 3.6c3.9 0 7 1.1 7 2.5S15.9 8.6 12 8.6 5 7.5 5 6.1 8.1 3.6 12 3.6Z M5 6.1v5.7c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5V6.1 M5 11.8v5.7c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5v-5.7",
  navActivity:"M4.6 4.6h14.8A1.6 1.6 0 0 1 21 6.2v11.6a1.6 1.6 0 0 1-1.6 1.6H4.6A1.6 1.6 0 0 1 3 17.8V6.2a1.6 1.6 0 0 1 1.6-1.6Z M6 12.4h2.2l1.5-4.1 2.3 8 1.9-5.4 1.2 1.5H18",
  navAdmin:"M12 2.9 5 5.6v5.9c0 4 2.8 7.1 7 8.6 4.2-1.5 7-4.6 7-8.6V5.6L12 2.9Z M12 8.6a2 2 0 1 1 0 4 2 2 0 0 1 0-4Z M8.8 16.3a3.6 3.6 0 0 1 6.4 0",
  helios:"M21 11.5a8.4 8.4 0 0 1-9 8.4 9.9 9.9 0 0 1-4-.8L3 21l1.9-4.9A8.3 8.3 0 0 1 4 11.5 8.4 8.4 0 0 1 12 3a8.4 8.4 0 0 1 9 8.5Z M8 12h1.6l1.2-2.6 1.6 5 1.4-2.4H16",
  inbox:"M3 13h4l1.5 3h7l1.5-3h4 M3 13l2.4-7A2 2 0 0 1 7.3 4.6h9.4a2 2 0 0 1 1.9 1.4L21 13v4.4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V13Z",
  work:"M6 4.6h12a1.6 1.6 0 0 1 1.6 1.6v12.2A1.6 1.6 0 0 1 18 20H6a1.6 1.6 0 0 1-1.6-1.6V6.2A1.6 1.6 0 0 1 6 4.6Z M8.4 10.4l1.9 1.9 3.9-3.9 M8.4 15.6h7.2",
  approvals:"M12 3.6 19.5 6v6.1c0 4-3.1 6.9-7.5 8.3-4.4-1.4-7.5-4.3-7.5-8.3V6L12 3.6Z M9.2 12.2l2 2 3.6-3.7",
  insights:"M4.5 19.5V13 M9.7 19.5V7.5 M14.9 19.5v-8 M20 19.5V5",
  people:"M12 12.5a3.6 3.6 0 1 0 0-7.2 3.6 3.6 0 0 0 0 7.2Z M5 20.2c.9-3.1 3.6-4.9 7-4.9s6.1 1.8 7 4.9",
  orgs:"M4.5 20V6.4A1.4 1.4 0 0 1 5.9 5h6.2a1.4 1.4 0 0 1 1.4 1.4V20 M13.5 10.5h4.6A1.4 1.4 0 0 1 19.5 12v8 M3 20h18 M7.5 8.5h2.5 M7.5 12h2.5 M7.5 15.5h2.5",
  teams:"M9 12a3.2 3.2 0 1 0 0-6.4A3.2 3.2 0 0 0 9 12Z M16.5 12.5a2.6 2.6 0 1 0 0-5.2 2.6 2.6 0 0 0 0 5.2Z M2.6 19.6c.8-2.8 3.2-4.4 6.4-4.4s5.6 1.6 6.4 4.4 M17 15.4c2.2.4 3.7 1.8 4.3 4.2",
  locations:"M12 21s6.5-5.6 6.5-11a6.5 6.5 0 1 0-13 0C5.5 15.4 12 21 12 21Z M12 12.8a2.6 2.6 0 1 0 0-5.2 2.6 2.6 0 0 0 0 5.2Z",
  visits:"M8 4v3 M16 4v3 M4.5 9.5h15 M6.4 6h11.2A1.9 1.9 0 0 1 19.5 8v10a1.9 1.9 0 0 1-1.9 1.9H6.4A1.9 1.9 0 0 1 4.5 18V8A1.9 1.9 0 0 1 6.4 6Z M9 13.5l1.6 1.6 3.4-3.4",
  autos:"M18.5 8.5A5 5 0 0 0 8.9 7.3 3.8 3.8 0 0 0 6 14.6 M8 17.5l3.2 3.2 M11.2 20.7l3.2-3.2 M11.2 20.7V9.6",
  health:"M3 12.5h3.4l2-5 3 10 2.2-5H21",
  modules:"M6.6 4.4h10.8a2.2 2.2 0 0 1 2.2 2.2v10.8a2.2 2.2 0 0 1-2.2 2.2H6.6a2.2 2.2 0 0 1-2.2-2.2V6.6a2.2 2.2 0 0 1 2.2-2.2Z M4.4 9.6h15.2 M9.6 19.6V9.6",
  agents:"M8.5 3.6h7A2.4 2.4 0 0 1 17.9 6v5.6a2.4 2.4 0 0 1-2.4 2.4h-7A2.4 2.4 0 0 1 6.1 11.6V6a2.4 2.4 0 0 1 2.4-2.4Z M9.6 8.2h.01 M14.4 8.2h.01 M12 14v2.6 M7.6 20.4h8.8 M12 16.6c-2.4 0-4.4 1.7-4.4 3.8h8.8c0-2.1-2-3.8-4.4-3.8Z",
  dash:"M4.4 4.4h6v6h-6v-6Z M13.6 4.4h6v3.6h-6V4.4Z M13.6 11.6h6v8h-6v-8Z M4.4 14h6v5.6h-6V14Z",
  files:"M5 7.2a1.8 1.8 0 0 1 1.8-1.8h3l1.8 2.2h5.6A1.8 1.8 0 0 1 19 9.4v7.4a1.8 1.8 0 0 1-1.8 1.8H6.8A1.8 1.8 0 0 1 5 16.8V7.2Z",
  pulseLine:"M2.5 12.5h3.6l2.1-6.4 3.2 12.2 2.6-8.4 1.8 2.6h5.7",
  records:"M6.4 3.6h7.4l4.2 4.2v12.6H6.4V3.6Z M13.4 3.8v4.2h4.2 M9 12.4h6 M9 16h4",
  tree:"M4.5 6h5 M4.5 12h5 M4.5 18h5 M12.5 6h7 M12.5 12h7 M12.5 18h7",
  graph:"M7 7.4a2.4 2.4 0 1 0 0-4.8 2.4 2.4 0 0 0 0 4.8Z M17.6 10.4a2.4 2.4 0 1 0 0-4.8 2.4 2.4 0 0 0 0 4.8Z M9.4 21.4a2.4 2.4 0 1 0 0-4.8 2.4 2.4 0 0 0 0 4.8Z M8.6 6.4l7.6 2.6 M15.8 11.4l-5.6 5.2",
  bell:"M6 8.5a6 6 0 0 1 12 0c0 6.5 2.6 8.5 2.6 8.5H3.4S6 15 6 8.5Z M10.3 20.5a1.94 1.94 0 0 0 3.4 0"
};


/* Ontology stays first and is never removed (PulseLogic enforces this too). */
const REC_SECTIONS = [
  {id:"ontology", label:"Ontology", blurb:"How every marketplace record connects: entities, predicates and the paths between them."},
  {id:"files", label:"Files", blurb:"Pricing drafts, policies, partner proposals and templates. Indexed pages are the ones Recruit Assistant can read."},
  {id:"contacts", label:"Contacts", blurb:"The HQ team, employer contacts, partners and candidates who agreed to share their details."},
  {id:"records", label:"Records", blurb:"Every marketplace record by entity: candidates, employers, vacancies, offers, placements and courses."},
  {id:"relationships", label:"Relationships", blurb:"Follow one record through everything it connects to."}
];

/* [name, role, email, organisation, tag, tint, ref]. Candidates appear only
   once they have accepted an introduction, so their details were shared with
   consent. Emails use reserved .example domains. */
const staffEmail = (name) => name.split(" ")[0].toLowerCase() + "@recruit.example";
const CONSENTED = ["c-sarah", "c-declan", "c-tomas"];
const CONTACTS = HQ_TEAM.map(p => [p.name, p.role, staffEmail(p.name), "O'Farrell Sterling", "staff", p.tint, null])
  .concat([
    ["e-harbourview", "harbourview"], ["e-cedarhouse", "cedarhouse"], ["e-atlantic", "atlanticcrest"], ["e-fenwick", "fenwickvale"],
    ["e-saltmarsh", "saltmarshbay"], ["e-brightwater", "brightwater"], ["e-alder", "alderoak"]
  ].map(([id, dom]) => {
    const e = EMPLOYER_BY_ID[id];
    const slug = e.contact.toLowerCase().replace(/[^a-z ]/g, "").replace(" ", ".");
    return [e.contact, e.contactRole, slug + "@" + dom + ".example", e.name, "employer", e.tint, id];
  }))
  .concat([
    ["Partnerships office", "Concept partner, nothing signed", "partners@liffey.example", "Liffey Institute", "partner", "#9fb4ff", "pt-liffey"],
    ["Admissions office", "Proposed partner, nothing signed", "admissions@leeside.example", "Leeside College", "partner", "#c8b4f0", "pt-leeside"]
  ])
  .concat(CONSENTED.map(id => {
    const c = CANDIDATE_BY_ID[id];
    return [c.name, c.title, c.email, "Shared with Harbourview", "candidate", c.tint, id];
  }));

/* Files: [label, kind, ref, tab]. kind is employer | candidate | vacancy |
   course | partner | agent | page, and the link opens the matching drawer or page. */
const FILE_TREE = [
  {type:"folder", id:"f-com", name:"Commercial", depth:0},
  {type:"file", id:"fl-1", name:"Membership pricing model (draft).xlsx", depth:1, parent:"f-com", indexed:true,
   path:"Commercial / Pricing", title:"Membership pricing model (draft)",
   facts:[["TYPE","XLSX · 4 sheets"],["ADDED","2 Nov 2026"],["INDEXED","All sheets"],["OWNER","John O'Farrell"]],
   body:["Five membership tiers by employer size. Starter (1-50 employees, €395), Growth (51-100, €595) and Enterprise (501+, about €2,500) came from John. Professional (€995) and Group (€1,495) are concept assumptions still being tested.",
     "At the current tier mix the model gives " + eur(MEMBERSHIP_ANNUAL) + " a year across " + num(totalAccounts(TIERS)) + " employer accounts, an average of " + eur(MEMBERSHIP_ANNUAL / totalAccounts(TIERS)) + ". This is a simulated, annualised figure for the demo scenario.",
     "Validation with 20 hotel general managers is in progress. Nothing here is a published price list."],
   links:[["Membership revenue","page","hq.revenue","memberships"],["Pricing settings","page","Settings","pricing"],["Harbourview Grand Hotel","employer","e-harbourview"]]},
  {type:"file", id:"fl-2", name:"Success fee terms (draft, not final).pdf", depth:1, parent:"f-com", indexed:true,
   path:"Commercial / Fees", title:"Success fee terms (draft, not final)",
   facts:[["TYPE","PDF · 5 pages"],["ADDED","9 Nov 2026"],["INDEXED","All 5 pages"],["OWNER","Michael Tierney"]],
   body:["Draft terms for the success fee charged when a hire is made through Recruit. The default is 8% of first-year base salary, invoiced on the candidate's start date.",
     "Two changes are proposed: 7% for employers with six or more placements a year, and 10% for executive placements above €120,000. The executive rate is waiting on John's approval.",
     "These are not final terms and no employer has signed them. A 25% agency fee is used as the comparison."],
   links:[["Executive rate approval","page","Work","approvals"],["Commission rules","page","hq.revenue","commissions"],["Cedarhouse Hotels","employer","e-cedarhouse"]]},
  {type:"folder", id:"f-pol", name:"Policies", depth:0},
  {type:"file", id:"fl-3", name:"Verification policy v0.3.pdf", depth:1, parent:"f-pol", indexed:true,
   path:"Policies / Verification", title:"Verification policy v0.3",
   facts:[["TYPE","PDF · 8 pages"],["ADDED","28 Oct 2026"],["INDEXED","All 8 pages"],["OWNER","Yasmin Haddad"]],
   body:["How a credential moves from self-reported to verified: the issuer confirms it, a referee confirms it, or the verification team checks the original. Agents organise requests but can never mark a fact as verified.",
     "The target is to clear every request inside 5 days. " + num(MARKET.verificationBacklog) + " profiles are waiting today and " + VERIFY_OLD + " are older than that, mostly qualifications waiting on issuers.",
     "Issuer checks in this demo are simulated. No institution is connected."],
   links:[["Verification queue","page","hq.talent","verification"],["Verification Agent","agent","verify"],["Hospitality Skills Board","partner","pt-skills"]]},
  {type:"file", id:"fl-4", name:"Candidate privacy notice (draft).pdf", depth:1, parent:"f-pol", indexed:false,
   path:"Policies / Privacy", title:"Candidate privacy notice (draft)",
   facts:[["TYPE","PDF · 6 pages"],["ADDED","4 Nov 2026"],["INDEXED","Not indexed"],["OWNER","John O'Farrell"]],
   body:["Plain-language notice for professionals: what Recruit stores, who can see it, and how to export, correct or delete it. Contact details stay hidden from employers until the candidate accepts an introduction.",
     "Discoverability is opt-in: discoverable, anonymous or hidden. Candidates can block their current employer, and deletion requests are handled within 30 days.",
     "Draft for legal review. It is not indexed yet, so Recruit Assistant cannot answer questions from it."],
   links:[["Consent and privacy settings","page","Settings","governance"]]},
  {type:"file", id:"fl-5", name:"Recruit Index explained (draft).pdf", depth:1, parent:"f-pol", indexed:true,
   path:"Policies / Recruit Index", title:"Recruit Index explained (draft)",
   facts:[["TYPE","PDF · 4 pages"],["ADDED","6 Nov 2026"],["INDEXED","All 4 pages"],["OWNER","Clodagh Reilly"]],
   body:["The Recruit Index is evidence-based decision support. It is not a credit score and it is not a judgement of a person's worth.",
     "It weighs five areas of professional evidence: experience, skills, leadership, qualifications and verified evidence. No sensitive characteristics are used.",
     "It never rejects anyone automatically. Hiring decisions stay with people."],
   links:[["Talent overview","page","hq.talent","overview"],["Governance settings","page","Settings","governance"]]},
  {type:"folder", id:"f-par", name:"Partners", depth:0},
  {type:"file", id:"fl-6", name:"Education partner proposal: Leeside College (unsigned).pdf", depth:1, parent:"f-par", indexed:true,
   path:"Partners / Proposals", title:"Education partner proposal: Leeside College (unsigned)",
   facts:[["TYPE","PDF · 7 pages"],["ADDED","17 Nov 2026"],["INDEXED","All 7 pages"],["OWNER","Fergal Nash"]],
   body:["A student pathways pilot: final-year hospitality students build a Recruit profile before they graduate, and employers see a verified graduate pipeline.",
     "Drafted by the Growth & Partnerships agent from the Student pathways concept, which converts at 30.4% in the campaign model. The proposed referral share is 8% of course fees from Recruit referrals.",
     "Leeside College is a fictional demo institution. Nothing is signed and the proposal has not been sent."],
   links:[["Approve in Work","page","Work","approvals"],["Learning partners","page","hq.learning","institutions"],["Growth & Partnerships","agent","growth"]]},
  {type:"folder", id:"f-lau", name:"Launch", depth:0},
  {type:"file", id:"fl-7", name:"Launch plan.pdf", depth:1, parent:"f-lau", indexed:true,
   path:"Launch / Plan", title:"Launch plan",
   facts:[["TYPE","PDF · 12 pages"],["ADDED","20 Oct 2026"],["INDEXED","All 12 pages"],["OWNER","John O'Farrell"]],
   body:["Four phases: Foundation (now to month 3), Pilot (months 4 to 6), Public launch (months 7 to 9) and Scale (months 10 to 24). " + ORG.legalName + " was incorporated in " + ORG.incorporated + ".",
     "The pilot targets 20 Dublin hotels from John's network and the first 5,000 professional profiles. The scale phase works toward the 100,000 professionals John has set as the target.",
     "Every marketplace number in this demo is an illustrative future-state scenario, not a result."],
   links:[["Launch plan","page","Work","launch"],["Growth dashboard","page","Dashboard","growth"]]},
  {type:"folder", id:"f-tpl", name:"Templates", depth:0},
  {type:"file", id:"fl-8", name:"Harbourview GM offer letter (sample).docx", depth:1, parent:"f-tpl", indexed:true,
   path:"Templates / Offers", title:"Harbourview GM offer letter (sample)",
   facts:[["TYPE","DOCX · 3 pages"],["ADDED","9 Nov 2026"],["INDEXED","All 3 pages"],["OWNER","Owen Brady"]],
   body:["Sample offer letter built from the General Manager vacancy at Harbourview Grand Hotel: €120,000 base, a performance bonus of up to 15% of base, an 8% employer pension contribution and private healthcare for the family.",
     "The live offer went to Sarah Kavanagh on 11 November and expires on 25 November. A contingency offer for Declan Murphy at €122,000 is drafted and waiting on Deirdre Foley's approval.",
     "Kept as a template for employers. Salary figures are illustrative."],
   links:[["Sarah Kavanagh","candidate","c-sarah"],["General Manager","vacancy","v-hv-gm"],["Harbourview Grand Hotel","employer","e-harbourview"]]}
];

/* [label, kind, x, y, big, note]. Not drawn by the current views; kept so
   the schema reads in Recruit's own terms. */
const ONTO_NODES = [
  ["Candidate","entity",500,300,1,"A professional's profile: experience, skills, qualifications and verification."],
  ["Employer","entity",300,190,1,"A member account: hotels, groups and adjacent-industry employers."],
  ["Vacancy","entity",700,190,1,"An open role with its requirements, salary range and pipeline."],
  ["Skill","entity",250,430,0,"A named capability, self-reported or verified."],
  ["Qualification","entity",140,300,0,"A credential and its issuer. Only a confirmation marks it verified."],
  ["Offer","entity",850,320,0,"Drafted, approved and sent by the employer. Hidden from the candidate until sent."],
  ["Placement","ledger",620,95,0,"A completed hire. Generates the success fee."],
  ["Membership","ledger",390,95,0,"An employer's tier and renewal date."],
  ["Course","module",690,430,0,"A partner course a candidate can enrol in."],
  ["Education Partner","module",860,470,0,"A fictional concept partner. Nothing is signed."],
  ["Verification","entity",360,520,0,"A check sent to an issuer or referee, simulated in this demo."],
  ["HAS_SKILL","predicate",360,370,0,"Candidate → Skill."],
  ["MATCHES","predicate",600,245,0,"Candidate → Vacancy, with evidence."],
  ["POSTS","predicate",500,170,0,"Employer → Vacancy."],
  ["APPLIES_TO","predicate",610,320,0,"Candidate → Vacancy."],
  ["SENDS_OFFER","predicate",780,250,0,"Employer → Offer."],
  ["FILLS","predicate",660,150,0,"Placement → Vacancy."],
  ["GENERATES","predicate",500,95,0,"Placement → success fee; Membership → revenue."],
  ["PROVIDES","predicate",780,450,0,"Education Partner → Course."],
  ["ENROLS_IN","predicate",600,370,0,"Candidate → Course."]
];

const ONTO_EDGES = [
  [500,300,250,430],[500,300,140,300],[500,300,700,190],[300,190,700,190],
  [700,190,850,320],[300,190,850,320],[620,95,700,190],[390,95,300,190],
  [500,300,690,430],[860,470,690,430],[500,300,360,520],[360,520,140,300],
  [620,95,390,95]
];

const REC_TEMPLATES = [
  ["Field sheet","Records","Labelled fields in a grid. The default for a candidate, employer or vacancy.",
   "M5 5.5h14v13H5v-13Z M5 10h14 M12 10v8.5","grid"],
  ["Contact card","Records","A portrait, key fields and every linked record in one compact panel.",
   "M12 11.5a3.4 3.4 0 1 0 0-6.8 3.4 3.4 0 0 0 0 6.8Z M5.5 19c.8-3 3.3-4.7 6.5-4.7s5.7 1.7 6.5 4.7","card"],
  ["Directory","Records","A sortable table of many records at once, built for lists of candidates or employers.",
   "M4.5 6.5h15 M4.5 12h15 M4.5 17.5h15 M4.5 6.5h.01 M4.5 12h.01 M4.5 17.5h.01","rows"],
  ["Timeline","Case work","Ordered events with who did what and when. Good for a hire from shortlist to start date.",
   "M12 3.5v17 M12 7.5h6 M12 13h-6 M12 18h6","timeline"],
  ["Kanban board","Case work","Cards in columns by stage. For pipelines that move from identified to hired.",
   "M5 5h4.5v14H5V5Z M9.75 5h4.5v9h-4.5V5Z M14.5 5H19v6h-4.5V5Z","kanban"],
  ["Checklist","Case work","Ticked steps in order, with an owner and a due date on each. Good for verification.",
   "M5 6.5h2l1.4 1.4L11 5.5 M5 12.5h2l1.4 1.4 2.6-2.4 M5 18.5h2l1.4 1.4 2.6-2.4 M15 6.5h4 M15 12.5h4 M15 18.5h4","checklist"],
  ["Ledger","Finance","Rows and running totals. For memberships, success fees and partner shares.",
   "M4 6h16 M4 12h16 M4 18h16 M9 3.5v17","ledger"],
  ["Invoice","Finance","Line items, totals and a status. Built to be sent, not just stored.",
   "M7 3.5h10v17H7v-17Z M9.5 8h5 M9.5 11.5h5 M9.5 15h3","invoice"],
  ["Document","Notes","Long-form text with linked records pulled out down the side.",
   "M7 3.5h7l5 5v12H7v-17Z M14 3.7v5h5 M10 13h6 M10 16.5h4","document"],
  ["Gallery","Notes","A wall of images and files with a caption on each. For a venue or an event.",
   "M4.5 6h6v6h-6V6Z M13.5 6h6v6h-6V6Z M4.5 14h6v4h-6v-4Z M13.5 14h6v4h-6v-4Z","gallery"],
  ["Map & locations","Ops","A pinboard of places, with the record's fields beside each pin. For employers by region.",
   "M12 21s6.5-5.6 6.5-11a6.5 6.5 0 1 0-13 0C5.5 15.4 12 21 12 21Z M12 12.8a2.6 2.6 0 1 0 0-5.2 2.6 2.6 0 0 0 0 5.2Z","map"],
  ["Schedule","Ops","A calendar of interviews against this record, with recurring rules.",
   "M8 4v3 M16 4v3 M4.5 9.5h15 M6.4 6h11.2A1.9 1.9 0 0 1 19.5 8v10a1.9 1.9 0 0 1-1.9 1.9H6.4A1.9 1.9 0 0 1 4.5 18V8A1.9 1.9 0 0 1 6.4 6Z","schedule"]
];
const REC_TEMPLATE_CATS = ["All","Records","Case work","Finance","Notes","Ops"];

/* ---- settings: the HQ team and what each role may do ---- */
const LAST_ACTIVE = ["Now", "4 min ago", "12 min ago", "1 h ago", "2 h ago", "Yesterday", "3 h ago"];
const PEOPLE = HQ_TEAM.map((p, i) => [p.name, p.role, staffEmail(p.name), "Dublin HQ", "active", p.access, LAST_ACTIVE[i] || "Today"])
  .concat([["Investor preview", "Read-only seat for the demo data room", "preview@recruit.example", "External", "inactive", "External", "Not used yet"]]);
const ROLE_LEVELS = ["Owner","Admin","Manager","Finance","External"];
const PERM_KEYS = [["view","View records"],["edit","Edit records"],["approve","Approve decisions"]];
const GRANT_DEFS = [
  ["view","View records","Read anything in scope"],
  ["edit","Edit records","Create and change records"],
  ["approve","Approve decisions","Offers, commissions and pricing"],
  ["contact","See contact details","Only after a candidate agrees"],
  ["export","Export data","Download and share out"],
  ["agents","Manage agents","Create, tune and pause agents"],
  ["settings","Change settings","Pricing, roles and integrations"],
  ["audit","Read the audit log","Every action, everyone"]
];
const ROLE_SCOPES = ["All records","Their team","Assigned only"];
const DEFAULT_PERMS = {Owner:{view:true,edit:true,approve:true}, Admin:{view:true,edit:true,approve:true},
  Manager:{view:true,edit:true,approve:false}, Finance:{view:true,edit:true,approve:true}, External:{view:true,edit:false,approve:false}};

/* The integrations roadmap. Nothing in this demo is connected to a live
   system: every entry is Planned, a Demo simulation or Not connected. */
const INT_GLYPH = {
  "CV intake and parsing":"M7 3.5h7l4.5 4.5v12.5H7V3.5Z M14 3.7V8h4.3 M9.5 12.5h6 M9.5 16h4",
  "Email and notifications":"M3.5 6.5h17v11h-17v-11Z M3.5 7.2l8.5 6.3 8.5-6.3",
  "Calendar scheduling":"M8 4v3 M16 4v3 M4.5 9.5h15 M6.4 6h11.2A1.9 1.9 0 0 1 19.5 8v10a1.9 1.9 0 0 1-1.9 1.9H6.4A1.9 1.9 0 0 1 4.5 18V8A1.9 1.9 0 0 1 6.4 6Z",
  "Payment processing":"M3.5 6.5h17v11h-17v-11Z M3.5 10h17 M7 14.5h4",
  "Educational credential verification":"M12 3.6 19.5 6v6.1c0 4-3.1 6.9-7.5 8.3-4.4-1.4-7.5-4.3-7.5-8.3V6L12 3.6Z M9.2 12.2l2 2 3.6-3.7",
  "CRM and employer communications":"M4.5 20V6.4A1.4 1.4 0 0 1 5.9 5h6.2a1.4 1.4 0 0 1 1.4 1.4V20 M13.5 10.5h4.6A1.4 1.4 0 0 1 19.5 12v8 M3 20h18 M7.5 8.5h2.5 M7.5 12h2.5",
  "Analytics":"M4.5 19.5V13 M9.7 19.5V7.5 M14.9 19.5v-8 M20 19.5V5",
  "LinkedIn":"M20.5 15.5a2 2 0 0 1-2 2H8l-4.5 3.5V5.5a2 2 0 0 1 2-2h13a2 2 0 0 1 2 2v10Z M8 9h8 M8 12.5h5"
};
const INT_TINTS = ["#9fb4ff","#7fe0d2","#e6c78a","#f2c59a","#c8b4f0","#a8e0c0","#9fd6f0","#f0b8c8"];
const INT_USAGE = {
  "CV intake and parsing": [agentById("profile").runsToday + " CVs structured today (simulated)", "Runs on prepared demo data", ["Read"]],
  "Educational credential verification": ["71 issuer requests simulated today", "No institution connected", ["Read"]],
  "Payment processing": ["No payments are taken in this demo", "Not connected", []],
  "LinkedIn": ["Founder network context only, not a data source", "Not connected", []]
};
const INTEGRATIONS = INTEGRATIONS_ROADMAP.map((r, i) => {
  const u = INT_USAGE[r.name] || [r.category + " · on the roadmap", "Not connected", []];
  return {name:r.name, blurb:r.detail, tint:INT_TINTS[i % INT_TINTS.length], status:r.status,
    statusKind: r.status === "Demo simulation" ? "warn" : "off",
    glyph: INT_GLYPH[r.name] || INT_GLYPH.Analytics,
    lastSync: u[1], usage: u[0], auth: r.status === "Planned" ? "Planned" : r.status === "Demo simulation" ? "Simulated" : "None", scopes: u[2]};
});

/* Background catalogue. Each entry is pure CSS so a tile is the real thing at
   thumbnail size, not a picture of it. */
const BG_DEFS = [
  {id:"bloom", name:"Bloom", cat:"Signature",
   css:"background:radial-gradient(60% 48% at 50% 34%, var(--accent-faint), transparent 72%), radial-gradient(44% 38% at 16% 84%, rgba(255,255,255,.05), transparent 70%)",
   thumb:"background:radial-gradient(62% 58% at 46% 34%, var(--accent-soft), transparent 74%), radial-gradient(50% 46% at 82% 84%, rgba(255,255,255,.08), transparent 72%), var(--surface-2)"},
  {id:"mist", name:"Mist", cat:"Signature",
   css:"background:radial-gradient(52% 44% at 24% 22%, rgba(255,255,255,.07), transparent 70%), radial-gradient(56% 46% at 80% 76%, rgba(255,255,255,.05), transparent 72%)",
   thumb:"background:radial-gradient(58% 52% at 24% 22%, rgba(255,255,255,.16), transparent 72%), radial-gradient(60% 54% at 82% 78%, rgba(255,255,255,.10), transparent 74%), var(--surface-2)"},
  {id:"grid", name:"Grid", cat:"Signature",
   css:"background-image:linear-gradient(var(--border) 1px, transparent 1px),linear-gradient(90deg, var(--border) 1px, transparent 1px);background-size:56px 56px;mask-image:radial-gradient(62% 56% at 50% 46%, #000, transparent 78%);-webkit-mask-image:radial-gradient(62% 56% at 50% 46%, #000, transparent 78%)",
   thumb:"background-color:var(--surface-2);background-image:linear-gradient(var(--border-strong) 1px, transparent 1px),linear-gradient(90deg, var(--border-strong) 1px, transparent 1px);background-size:14px 14px"},
  {id:"none", name:"None", cat:"Signature", css:"", thumb:"background:var(--surface-2)"},

  {id:"aurora", name:"Aurora", cat:"Gradient",
   css:"background:radial-gradient(70% 52% at 18% 8%, var(--bloom-a), transparent 66%), radial-gradient(64% 48% at 84% 22%, var(--bloom-b), transparent 68%), radial-gradient(70% 60% at 50% 104%, var(--bloom-c), transparent 70%);filter:blur(24px)",
   thumb:"background:radial-gradient(72% 60% at 16% 6%, var(--bloom-a), transparent 68%), radial-gradient(66% 54% at 86% 24%, var(--bloom-b), transparent 70%), radial-gradient(74% 66% at 50% 108%, var(--bloom-c), transparent 72%), var(--surface-2)"},
  {id:"horizon", name:"Horizon", cat:"Gradient",
   css:"background:linear-gradient(180deg, transparent 0%, var(--accent-faint) 58%, transparent 100%), radial-gradient(90% 40% at 50% 72%, var(--accent-soft), transparent 70%)",
   thumb:"background:linear-gradient(180deg, var(--surface-2) 0%, var(--accent-faint) 58%, var(--surface-2) 100%), radial-gradient(90% 44% at 50% 74%, var(--accent-soft), transparent 70%)"},
  {id:"dusk", name:"Dusk", cat:"Gradient",
   css:"background:linear-gradient(200deg, var(--bloom-c) -10%, transparent 46%), linear-gradient(20deg, var(--bloom-b) -10%, transparent 52%);opacity:.5",
   thumb:"background:linear-gradient(200deg, var(--bloom-c) -12%, transparent 48%), linear-gradient(20deg, var(--bloom-b) -12%, transparent 54%), var(--surface-2)"},
  {id:"ember", name:"Ember", cat:"Gradient",
   css:"background:radial-gradient(60% 70% at 84% 96%, var(--bloom-a), transparent 64%), radial-gradient(50% 60% at 10% 96%, var(--bloom-c), transparent 66%)",
   thumb:"background:radial-gradient(64% 76% at 84% 100%, var(--bloom-a), transparent 66%), radial-gradient(54% 66% at 8% 100%, var(--bloom-c), transparent 68%), var(--surface-2)"},

  {id:"mesh", name:"Mesh", cat:"Abstract",
   css:"background-image:radial-gradient(var(--border-strong) 1px, transparent 1px);background-size:22px 22px;mask-image:radial-gradient(70% 62% at 50% 46%, #000, transparent 76%);-webkit-mask-image:radial-gradient(70% 62% at 50% 46%, #000, transparent 76%)",
   thumb:"background-color:var(--surface-2);background-image:radial-gradient(var(--border-strong) 1px, transparent 1px);background-size:8px 8px"},
  {id:"contour", name:"Contour", cat:"Abstract",
   css:"background:repeating-radial-gradient(circle at 30% 110%, transparent 0 22px, var(--border) 22px 23px);mask-image:radial-gradient(80% 70% at 40% 80%, #000, transparent 78%);-webkit-mask-image:radial-gradient(80% 70% at 40% 80%, #000, transparent 78%)",
   thumb:"background:repeating-radial-gradient(circle at 26% 116%, var(--surface-2) 0 9px, var(--border-strong) 9px 10px)"},
  {id:"weave", name:"Weave", cat:"Abstract",
   css:"background:repeating-linear-gradient(48deg, transparent 0 16px, var(--border) 16px 17px), repeating-linear-gradient(-48deg, transparent 0 16px, var(--border) 16px 17px);opacity:.7",
   thumb:"background-color:var(--surface-2);background-image:repeating-linear-gradient(48deg, transparent 0 7px, var(--border-strong) 7px 8px), repeating-linear-gradient(-48deg, transparent 0 7px, var(--border-strong) 7px 8px)"},
  {id:"halo", name:"Halo", cat:"Abstract",
   css:"background:repeating-radial-gradient(circle at 50% 50%, transparent 0 46px, var(--accent-line) 46px 47px);mask-image:radial-gradient(60% 60% at 50% 50%, #000, transparent 72%);-webkit-mask-image:radial-gradient(60% 60% at 50% 50%, #000, transparent 72%)",
   thumb:"background:repeating-radial-gradient(circle at 50% 50%, var(--surface-2) 0 11px, var(--accent-line) 11px 12px)"},
  {id:"drift", name:"Drift", cat:"Abstract",
   css:"background:conic-gradient(from 210deg at 32% 38%, var(--bloom-b), transparent 38%), conic-gradient(from 20deg at 76% 70%, var(--bloom-a), transparent 34%);filter:blur(30px);opacity:.6",
   thumb:"background:conic-gradient(from 210deg at 32% 38%, var(--bloom-b), transparent 38%), conic-gradient(from 20deg at 76% 70%, var(--bloom-a), transparent 34%), var(--surface-2)"},
  {id:"scan", name:"Scanlines", cat:"Abstract",
   css:"background:repeating-linear-gradient(0deg, var(--border) 0 1px, transparent 1px 7px);mask-image:linear-gradient(180deg, #000, transparent 88%);-webkit-mask-image:linear-gradient(180deg, #000, transparent 88%)",
   thumb:"background-color:var(--surface-2);background-image:repeating-linear-gradient(0deg, var(--border-strong) 0 1px, transparent 1px 5px)"}
];

const THEMES = [
  {id:"recruit", label:"Recruit", group:"Dark", bg:"#0b0d13", surface:"#151a24", ink:"#f2f4f8", accent:"#6d86ff"},
  {id:"dark", label:"Dark", group:"Dark", bg:"#0b0c0b", surface:"#1a1c19", ink:"#f2f3ef", accent:"#c8f04b"},
  {id:"indigo", label:"Indigo", group:"Dark", bg:"#0a0b13", surface:"#1a1b26", ink:"#f0f1fa", accent:"#8b93ff"},
  {id:"slate", label:"Slate", group:"Dark", bg:"#100e0c", surface:"#211c17", ink:"#f4f0ea", accent:"#e8a14a"},
  {id:"plum", label:"Plum", group:"Dark", bg:"#100a10", surface:"#20151f", ink:"#f6eef4", accent:"#f077b0"},
  {id:"ember", label:"Ember", group:"Dark", bg:"#0b0b0b", surface:"#1c1714", ink:"#f7f3ef", accent:"#f4561a"},
  {id:"harbour", label:"Harbour", group:"Dark", bg:"#0b0e10", surface:"#13171a", ink:"#f3f5f4", accent:"#5ee79a"},
  {id:"cargo", label:"Cargo", group:"Dark", bg:"#0a0a0a", surface:"#1a1c1a", ink:"#f2f5f2", accent:"#4ade80"},
  {id:"ocean", label:"Ocean", group:"Dark", bg:"#080e12", surface:"#141f25", ink:"#eaf4f8", accent:"#4fd4d0"},
  {id:"graphite", label:"Graphite", group:"Dark", bg:"#111112", surface:"#212124", ink:"#f4f4f5", accent:"#f4f4f5"},
  {id:"light", label:"Cream", group:"Light", bg:"#f4f2ed", surface:"#ffffff", ink:"#16181c", accent:"#0071e3"},
  {id:"warm", label:"Warm paper", group:"Light", bg:"#faf5ec", surface:"#fffdf9", ink:"#2a2016", accent:"#c9683f"},
  {id:"mist", label:"Mist", group:"Light", bg:"#eef1f4", surface:"#ffffff", ink:"#141e20", accent:"#0e9f6e"},
  {id:"sand", label:"Sand", group:"Light", bg:"#f6f1e6", surface:"#fffdf7", ink:"#221d12", accent:"#7d5fd6"}
];


const ADMIN_ICONS = {
  people:"M12 12.5a3.6 3.6 0 1 0 0-7.2 3.6 3.6 0 0 0 0 7.2Z M5 20.2c.9-3.1 3.6-4.9 7-4.9s6.1 1.8 7 4.9",
  teams:"M9 12a3.2 3.2 0 1 0 0-6.4A3.2 3.2 0 0 0 9 12Z M16.5 12.5a2.6 2.6 0 1 0 0-5.2 2.6 2.6 0 0 0 0 5.2Z M2.6 19.6c.8-2.8 3.2-4.4 6.4-4.4s5.6 1.6 6.4 4.4 M17 15.4c2.2.4 3.7 1.8 4.3 4.2",
  structure:"M4.5 20V6.4A1.4 1.4 0 0 1 5.9 5h6.2a1.4 1.4 0 0 1 1.4 1.4V20 M13.5 10.5h4.6A1.4 1.4 0 0 1 19.5 12v8 M3 20h18 M7.5 8.5h2.5 M7.5 12h2.5",
  shield:"M12 3.6 19.5 6v6.1c0 4-3.1 6.9-7.5 8.3-4.4-1.4-7.5-4.3-7.5-8.3V6L12 3.6Z M9.2 12.2l2 2 3.6-3.7",
  agent:"M2 12h4l2.5-6 3.5 12 3-8 2 2h5",
  flow:"M18.5 8.5A5 5 0 0 0 8.9 7.3 3.8 3.8 0 0 0 6 14.6 M8 17.5l3.2 3.2 M11.2 20.7l3.2-3.2 M11.2 20.7V9.6",
  plug:"M9 3.5v5 M15 3.5v5 M6.5 8.5h11v3a5.5 5.5 0 0 1-11 0v-3Z M12 17v3.5",
  modules:"M6.6 4.4h10.8a2.2 2.2 0 0 1 2.2 2.2v10.8a2.2 2.2 0 0 1-2.2 2.2H6.6a2.2 2.2 0 0 1-2.2-2.2V6.6a2.2 2.2 0 0 1 2.2-2.2Z M4.4 9.6h15.2 M9.6 19.6V9.6",
  health:"M3 12.5h3.4l2-5 3 10 2.2-5H21",
  lock:"M6.5 10.5h11a1.5 1.5 0 0 1 1.5 1.5v7a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 5 19v-7a1.5 1.5 0 0 1 1.5-1.5Z M8.5 10.5V7.5a3.5 3.5 0 0 1 7 0v3",
  audit:"M8 3.5h8l3.5 3.5v13a1.5 1.5 0 0 1-1.5 1.5H6a1.5 1.5 0 0 1-1.5-1.5V5A1.5 1.5 0 0 1 6 3.5h2Z M9 12h6 M9 16h4",
  brand:"M12 3.5 14.6 9l6.4.6-4.8 4.2 1.4 6.2-5.6-3.3-5.6 3.3 1.4-6.2L3 9.6 9.4 9 12 3.5Z",
  bell:"M6 8.5a6 6 0 0 1 12 0c0 6.5 2.6 8.5 2.6 8.5H3.4S6 15 6 8.5Z M10.3 20.5a1.94 1.94 0 0 0 3.4 0",
  data:"M4.5 7.5c0-1.7 3.4-3 7.5-3s7.5 1.3 7.5 3-3.4 3-7.5 3-7.5-1.3-7.5-3Z M4.5 7.5v9c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3v-9 M4.5 12c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3",
  money:"M17.5 6.5a6.5 6.5 0 1 0 0 11 M3.5 10.5H13 M3.5 13.5H13",
  percent:"M19 5 5 19 M7.5 9.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z M16.5 18.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z",
  calc:"M7 3.5h10a1.5 1.5 0 0 1 1.5 1.5v14a1.5 1.5 0 0 1-1.5 1.5H7A1.5 1.5 0 0 1 5.5 19V5A1.5 1.5 0 0 1 7 3.5Z M8.5 7h7v3h-7V7Z M8.6 13.5h.01 M12 13.5h.01 M15.4 13.5h.01 M8.6 17h.01 M12 17h.01 M15.4 17h.01",
  eye:"M2.5 12s3.5-6.5 9.5-6.5S21.5 12 21.5 12s-3.5 6.5-9.5 6.5S2.5 12 2.5 12Z M12 14.8a2.8 2.8 0 1 0 0-5.6 2.8 2.8 0 0 0 0 5.6Z"
};

/* Settings rows: [label, value] is a value; [label, note, true|false] is a
   local switch; [label, value, "note"|"locked", note] is a value with a note
   under it; [label, note, "gov:<id>"] is bound to the shared governance state.
   Cards whose rows depend on editable state (tiers, commission, consent,
   renewals) are refreshed from the shared store in PulseLogic. */
const pctRate = (r) => Math.round(r * 100) + "%";
const ECON = placementEconomics();
const TEAM_SIZE = HQ_TEAMS.reduce((t, x) => t + x.members, 0);
const ADMIN_CARDS = [
  {id:"people", group:"ORGANISATION", title:"People and access", icon:"people", tint:"#7fe0d2",
   blurb:"Invite, suspend and offboard the people who use Recruit HQ.",
   tags:[HQ_TEAM.length + " leads", TEAM_SIZE + " people", "Dublin HQ"], badge:"1 unused seat", badgeKind:"warn",
   listLabel:"WHAT YOU CONTROL HERE", rows:[]},
  {id:"roles", group:"ORGANISATION", title:"Roles and permissions", icon:"shield", tint:"var(--accent)",
   blurb:"Permission templates, and exactly what each role can reach.",
   tags:[ROLE_LEVELS.length + " roles", GRANT_DEFS.length + " grants", ROLE_SCOPES.length + " scopes"],
   heroLabel:"SEE IT AS SOMEONE ELSE", heroAction:"Preview the employer view",
   heroText:"Switch to Harbourview's view of Recruit to check what an employer sees: anonymised profiles until a candidate agrees, and only its own vacancies and offers.",
   listLabel:"WHAT YOU CONTROL HERE",
   rows:[["Owner","John O'Farrell"],["Admin","Marketplace Operations"],["Manager","Team leads"],["Finance","Invoices, commissions and forecasts"],
     ["Candidate contact details","Always on","locked","Visible only after the candidate accepts an introduction."],
     ["Approving offers, pricing and commission","Owner only"]]},
  {id:"structure", group:"ORGANISATION", title:"Company structure", icon:"structure", tint:"#e6c78a",
   blurb:"The company behind Recruit, where it works and when.",
   tags:["Dublin", ORG.currency, ORG.timezone], listLabel:"COMPANY DETAILS",
   rows:[["Company", ORG.legalName],["Product", ORG.product],["Founder", ORG.founder],["Incorporated", ORG.incorporated],
     ["Location", ORG.location],["Teams", String(HQ_TEAMS.length)],["Working hours","09:00 to 17:30, Mon to Fri"],
     ["Currency and timezone", ORG.currency + " · " + ORG.timezone]]},
  {id:"appearance", group:"ORGANISATION", title:"Appearance and themes", icon:"brand", tint:"#9fd6f0",
   blurb:"Pick a light or dark theme for how Recruit HQ looks to you.",
   tags:["Recruit theme"], listLabel:"THEMES", rows:[]},

  {id:"teams", group:"TEAM", title:"Teams", icon:"teams", tint:"#a8e0c0",
   blurb:"Who leads each part of Recruit and what they own.",
   tags:[HQ_TEAMS.length + " teams", TEAM_SIZE + " people"], listLabel:"TEAMS AND LEADS",
   rows: HQ_TEAMS.map(t => [t.name + " · " + t.lead, t.members + (t.members === 1 ? " person" : " people"), "note", t.remit])},
  {id:"agents", group:"TEAM", title:"Agents and AI controls", icon:"agent", tint:"var(--accent)",
   blurb:"What Recruit's eight agents may read, what they may do, and where they must stop.",
   tags:[RECRUIT_AGENTS.length + " agents", num(AGENT_RUNS_TODAY) + " runs today"],
   heroLabel:"GLOBAL CONTROL", heroAction:"Pause every agent",
   heroText:"One switch pauses every agent. Anything mid-run finishes its current step and then holds.",
   listLabel:"WHAT YOU CONTROL HERE",
   rows:[["Agents never contact candidates or employers","Drafts go to a person", true],
     ["Agents cannot mark a fact as verified","Always on","locked","Only a confirmation or a person changes verification status."],
     ["Write and external tools wait for a person","Approval required", true],
     ["Salary figures labelled as estimates","Always on","locked","Every market range and scenario says it is illustrative."],
     ["Monthly usage cap","€40"],["Memory and retention","90 days"]]},
  {id:"notif", group:"TEAM", title:"Notifications", icon:"bell", tint:"#f2c59a",
   blurb:"Which events reach the team, on which channel, and when not to.",
   tags:["Inbox","Email planned","Quiet 19:00 to 07:00"], listLabel:"WHAT TRIGGERS A NOTIFICATION",
   rows:[["Vacancy with no shortlist after 21 days","Ops Watchdog", true],["Offer waiting on approval for 24 hours","Ops Watchdog", true],
     ["Verification older than 5 days","Verification Agent", true],["Membership renewal in 30 days","Ops Watchdog", true],
     ["Introduction unanswered for 48 hours","Ops Watchdog", false],["Email delivery","Planned integration"],
     ["Quiet hours","19:00 to 07:00"],["Founder briefing","07:00 on weekdays"]]},
  {id:"wf", group:"TEAM", title:"Workflow controls", icon:"flow", tint:"#c8b4f0",
   blurb:"The guardrails, not the builder. Building workflows happens in Work.",
   tags:["Team leads","Retry twice"], listLabel:"WHAT YOU CONTROL HERE",
   rows:[["Who can create workflows","Team leads"],["Maximum autonomy","Proposes, never sends", true],
     ["Failure handling","Retry twice, then notify"],["Usage limit","500 runs a day"],["Global pause","All workflows", false]]},

  {id:"tiers", group:"PRICING", title:"Membership tiers", icon:"money", tint:"#e6c78a",
   blurb:"Five tiers by employer size. Starter, Growth and Enterprise prices came from John; Professional and Group are concept assumptions.",
   tags:[TIERS.length + " tiers", eur(MEMBERSHIP_ANNUAL) + " a year"],
   heroLabel:"SIMULATED, ANNUALISED", heroAction:"Open membership revenue",
   heroText: eur(MEMBERSHIP_ANNUAL) + " a year across " + num(totalAccounts(TIERS)) + " employer accounts at the current mix. Every view reads these same prices.",
   listLabel:"TIERS",
   rows: TIERS.map(t => [t.label + " · " + t.band, eur(t.price) + " a year", "note", t.confirmed ? "Price from the founder" : "Concept assumption"])},
  {id:"commission", group:"PRICING", title:"Success fees and commission", icon:"percent", tint:"#f0a33e",
   blurb:"The success fee charged on each hire, and the proposals waiting on a decision.",
   tags:[pctRate(MARKET.recruitDefaultRate) + " default", pctRate(MARKET.agencyBenchmarkRate) + " agency comparison"],
   badge:"1 awaiting you", badgeKind:"warn",
   heroLabel:"PENDING DECISION", heroAction:"Review in Work",
   heroText:"Executive placements at 10% above €120,000 are proposed and waiting on you. At 10%, a €128,000 placement carries a €12,800 fee instead of €10,240.",
   listLabel:"RULES",
   rows: COMMISSION_RULES.map(r => [r.label, pctRate(r.rate) + " · " + r.applies, "note", r.note])},
  {id:"calculator", group:"PRICING", title:"Agency comparison", icon:"calc", tint:"#9fd6f0",
   blurb:"The assumptions behind every saving Recruit quotes to employers.",
   tags:[pctRate(MARKET.agencyBenchmarkRate) + " agency", pctRate(MARKET.recruitDefaultRate) + " Recruit"], listLabel:"ASSUMPTIONS",
   rows:[["Agency benchmark fee", pctRate(MARKET.agencyBenchmarkRate)],["Recruit default success fee", pctRate(MARKET.recruitDefaultRate)],
     ["Average placement salary", eur(MARKET.avgPlacementSalary), "note", "Assumption for the scenario"],
     ["Saving per placement", eur(MARKET.avgPlacementSalary * (MARKET.agencyBenchmarkRate - MARKET.recruitDefaultRate)), "note", "Before the membership fee"],
     ["This month, " + MARKET.placementsThisMonth + " placements", eur(ECON.saving), "note", "Illustrative saving against agency fees"]]},
  {id:"renewals", group:"PRICING", title:"Renewals and billing", icon:"flow", tint:"#a8e0c0",
   blurb:"Renewal dates, reminders and invoices. Payment processing is not connected in this demo.",
   tags:[RENEWALS_30 + " due in 30 days", "Billing simulated"], badge: RENEWALS_30 + " due", badgeKind:"warn",
   heroLabel:"NEXT UP", heroAction:"Open memberships",
   heroText:"Saltmarsh Bay Resort renews on 6 Dec and engagement is down since the season ended. Alder & Oak renews on 27 Dec and is likely to move up a tier.",
   listLabel:"WHAT YOU CONTROL HERE",
   rows:[["Memberships expiring within 30 days", String(RENEWALS_30)],["Renewal reminders","30, 14 and 3 days before", true],
     ["Reminders need a person to send","Drafted by Ops Watchdog", true],["Payment processing","Not connected"],
     ["Overdue invoices","1 · €4,060 Cedarhouse Hotels"]]},

  {id:"integrations", group:"INTEGRATIONS", title:"Integrations roadmap", icon:"plug", tint:"#9fd6f0",
   blurb:"Nothing in this demo is connected to a live system. Each connection is Planned, a Demo simulation or Not connected.",
   tags:[INTEGRATIONS.filter(i => i.status === "Planned").length + " planned", INTEGRATIONS.filter(i => i.status === "Demo simulation").length + " simulated"],
   badge:"None live", badgeKind:"", listLabel:"CONNECTIONS", rows:[]},
  {id:"sources", group:"INTEGRATIONS", title:"Data sources", icon:"data", tint:"#c8b4f0",
   blurb:"Where every number in Recruit HQ comes from.", listLabel:"SOURCES",
   rows:[["Marketplace figures","Illustrative scenario","note","O'Farrell Sterling was incorporated in June 2026 and Recruit is not yet operating."],
     ["CV analysis","Prepared demo data","note","No document leaves the browser."],["Salary benchmarks","Illustrative ranges"],
     ["Founder network","Founder-provided context","note","Around 30,000 LinkedIn followers. Not a connected data source."],
     ["Education partners","Fictional, none signed"],["Saved changes","Stay in this browser"]]},
  {id:"api", group:"INTEGRATIONS", title:"API and webhooks", icon:"modules", tint:"#f0b8c8",
   blurb:"Keys and outbound events for future integrations.", listLabel:"WHAT YOU CONTROL HERE",
   rows:[["API keys","None issued"],["Outbound webhooks","None configured"],["Sandbox mode","Demo data only", true],["Event log retention","90 days"]]},

  {id:"consent", group:"GOVERNANCE", title:"Consent and privacy", icon:"eye", tint:"#7fe0d2",
   blurb:"How candidate data is shared, scored and protected. Locked rules cannot be switched off.",
   tags:[GOVERNANCE.filter(g => g.locked).length + " locked rules"],
   badge: PRIVACY_REQUESTS.filter(r => r.status !== "Completed").length + " requests open", badgeKind:"warn",
   listLabel:"RULES",
   rows: GOVERNANCE.map(g => g.locked ? [g.label, "Always on", "locked", g.note] : [g.label, g.note, "gov:" + g.id])},
  {id:"audit", group:"GOVERNANCE", title:"Audit log", icon:"audit", tint:"#c8b4f0",
   blurb:"A locked history of who did what. Searchable, exportable, never editable.",
   tags:["Append-only"], heroLabel:"FULL HISTORY", heroAction:"Open activity",
   heroText:"Every hiring, profile and financial event, from the portals and the agents, is in Activity with the person or agent behind it.",
   listLabel:"WHAT IS RECORDED",
   rows:[["Agent runs today", num(AGENT_RUNS_TODAY)],["Hiring decisions","Written as the person who made them"],
     ["Privacy requests", PRIVACY_REQUESTS.length + " this month"],["Permission changes","Logged"],["Exports","Logged"],["Deleted records","Logged, never editable"]]},
  {id:"datamgmt", group:"GOVERNANCE", title:"Data management", icon:"data", tint:"#a8e0c0",
   blurb:"Export, correct and delete, with a 30-day clock on every request.", listLabel:"REQUESTS",
   rows: PRIVACY_REQUESTS.map(r => [r.type + " · " + r.who, r.status, "note", r.age === "Today" ? "Raised today" : "Raised " + r.age + " ago"])},
  {id:"security", group:"GOVERNANCE", title:"Security", icon:"lock", tint:"#9fb4ff",
   blurb:"Sign-in, sessions and devices for the HQ team.", listLabel:"WHAT YOU CONTROL HERE",
   rows:[["Two-factor authentication","Required for HQ", true],["Single sign-on","Planned"],["Session length","12 hours"],
     ["Security alerts","Sent to the founder", true],["Candidate data deletion","Self-service, within 30 days"]]},
  {id:"dataquality", group:"GOVERNANCE", title:"Data quality", icon:"health", tint:"#f07a9d",
   blurb:"What is wrong with the data, how much of it, and the fix.",
   tags:["5 issue types"], badge: VERIFY_OLD + " overdue", badgeKind:"bad", listLabel:"ISSUES FOUND",
   issues:[["Verification older than 5 days", String(VERIFY_OLD), "high", "Mostly qualifications waiting on issuers. Yasmin Haddad's team clears the manual queue.", "Open verification", {page:"hq.talent", tab:"verification"}],
     ["Profiles missing salary expectations", "312", "medium", "Matching is weaker without an expected range. Profile Intelligence has a nudge drafted.", "Open candidates", {page:"hq.talent", tab:"candidates"}],
     ["Checks waiting on candidate documents", "25", "medium", "From this morning's verification run. The agent chases; nothing is marked verified.", "Open verification", {page:"hq.talent", tab:"verification"}],
     ["Issuer not connected", "1", "low", "Universidade do Tejo, for Lucia Ferreira's MSc, moved to the manual queue (simulated).", "Open Lucia Ferreira", {drawer:["candidate", "c-lucia"]}],
     ["Invoices overdue", "1", "low", "Cedarhouse Hotels, €4,060 for the Accommodation Manager placement.", "Open placements", {page:"hq.roles", tab:"placements"}]],
   rows:[]}
];

const ADMIN_GROUPS = [
  ["ORGANISATION", "repeat(3,1fr)"],
  ["TEAM", "repeat(3,1fr)"],
  ["PRICING", "repeat(3,1fr)"],
  ["INTEGRATIONS", "repeat(3,1fr)"],
  ["GOVERNANCE", "repeat(3,1fr)"]
];

/* ---- activity: three streams ---- */
const SRC_TINT = {Recruit:"var(--accent)", Agent:"#c8b4f0", Employer:"#7fe0d2", Candidate:"#9fb4ff", Partner:"#e6c78a"};
const SRC_ABBR = {Recruit:"RC", Agent:"AI", Employer:"EM", Candidate:"CA", Partner:"PT"};

/* The live ticker. These are the repeatable, anonymous events of a busy
   marketplace; named events come from the shared store and the portals.
   [title, note, actor, related record, source, status] */
const HIRING_EVENTS = [
  ["Marketplace search","An employer searched for revenue managers in Leinster and saved three profiles.","Employer search","Talent marketplace","Employer","completed"],
  ["Profiles re-ranked","A vacancy was re-ranked after a candidate updated their profile.","Talent Matchmaker","Open vacancy","Agent","working"],
  ["Anonymised profile viewed","An employer opened an anonymised profile. Contact details stay hidden.","Employer","Anonymised profile","Employer","completed"],
  ["Vacancies checked","Open roles checked for anything with no shortlist after 21 days.","Ops Watchdog","Open vacancies","Agent","working"],
  ["Interview times offered","An employer offered three interview slots through Recruit.","Employer","Interview","Employer","completed"],
  ["Application started","A professional started an application from a recommended role.","Candidate","Recommended role","Candidate","completed"]
];
const PROFILE_EVENTS = [
  ["CV analysed","A CV was structured into a profile draft with items to verify (simulated).","Profile Intelligence","New professional","Agent","working"],
  ["Professional registered","A new professional joined Recruit and started a profile.","Recruit","New profile","Recruit","completed"],
  ["Credential check sent","A qualification was sent to its issuer for confirmation (simulated).","Verification Agent","Verification queue","Agent","working"],
  ["Market range refreshed","An estimated salary range was refreshed after a profile change.","Market Value Analyst","Profile","Agent","completed"],
  ["Visibility changed","A professional switched their profile to anonymous.","Candidate","Privacy settings","Candidate","completed"],
  ["Course opened","A professional opened a partner course from their development plan.","Candidate","Partner course","Partner","completed"]
];
const FINANCIAL_EVENTS = [
  ["Membership payment recorded","A membership payment was recorded (simulated, no payment taken).","Recruit","Membership","Recruit","completed"],
  ["Fee estimate updated","A success fee estimate was recalculated after an offer changed.","Recruit","Offer","Recruit","completed"],
  ["Renewal reminder drafted","A renewal reminder was drafted for review. Not sent.","Ops Watchdog","Membership","Agent","awaiting"],
  ["Partner share accrued","A referral share accrued to a concept partner. No agreement is signed.","Recruit","Education partner","Partner","completed"],
  ["Plans compared","An employer compared membership tiers in the cost calculator.","Employer","Pricing","Employer","completed"]
];

const STREAM_DEFS = [
  {id:"hiring", title:"Hiring activity", sub:"Vacancies, interviews and offers", pool:HIRING_EVENTS, every:5200,
   tint:"var(--accent)", icon:"M9 6V4.8a1.3 1.3 0 0 1 1.3-1.3h3.4A1.3 1.3 0 0 1 15 4.8V6 M4.5 6h15A1.5 1.5 0 0 1 21 7.5v10a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 17.5v-10A1.5 1.5 0 0 1 4.5 6Z M3 12h18"},
  {id:"profiles", title:"Profiles and verification", sub:"CVs, credentials and learning", pool:PROFILE_EVENTS, every:4300,
   tint:"var(--teal)", icon:"M12 3.6 19.5 6v6.1c0 4-3.1 6.9-7.5 8.3-4.4-1.4-7.5-4.3-7.5-8.3V6L12 3.6Z M9.2 12.2l2 2 3.6-3.7"},
  {id:"financial", title:"Financial", sub:"Memberships, fees and partner shares", pool:FINANCIAL_EVENTS, every:8800,
   tint:"#e6c78a", icon:"M17.5 6.5a6.5 6.5 0 1 0 0 11 M3.5 10.5H13 M3.5 13.5H13"}
];

/* The HQ rail. recruit/nav.tsx (NAVS.hq) is the source; this mirrors it as a fallback. */
const NAV = [
  {label:"Home", icon:"helios", page:"Home"},
  {label:"Agents", icon:"navAgents", page:"Agents"},
  {divider:true},
  {label:"Talent", icon:"talent", page:"hq.talent"},
  {label:"Employers", icon:"employer", page:"hq.employers"},
  {label:"Roles and placements", icon:"jobs", page:"hq.roles"},
  {label:"Learning partners", icon:"learning", page:"hq.learning"},
  {label:"Revenue", icon:"revenue", page:"hq.revenue"},
  {divider:true},
  {label:"Dashboard", icon:"navDash", page:"Dashboard", dot:true},
  {label:"Work", icon:"navWork", page:"Work"},
  {label:"Records", icon:"navRecords", page:"Records"},
  {label:"Activity", icon:"pulseLine", page:"Activity", dot:true}
];

/* The HQ action inbox: what happened, why it matters, what John can do.
   go is where the row leads: a page and tab, or a shared drawer. */
const FENWICK = EMPLOYER_BY_ID["e-fenwick"], FV_OPS = VACANCIES.find(v => v.id === "v-fv-opsd");
const CEDAR_PL = PLACEMENTS.find(p => p.employerId === "e-cedarhouse" && p.invoice === "overdue") || PLACEMENTS[0];
const ITEMS = {
  fenwick:{kind:"Alert", importance:"critical", icon:ICONS.health, age:FV_OPS.postedDays + "d",
    title:FENWICK.short + ": " + FV_OPS.title + " has no shortlist after " + FV_OPS.postedDays + " days",
    why:FV_OPS.marketMatches + " market matches and " + plural(FV_OPS.applicants, "applicant") + ". Engagement on the account is down to " + FENWICK.engagement + ".",
    detail:"Ops Watchdog flags any vacancy with no shortlist after 21 days. Oliver Grant has an open support ticket with Owen Brady. Talent Matchmaker suggests widening the search to multi-site leaders; any shortlist would be shared anonymised.",
    actionLabel:"Open the vacancy", secondaryLabel:"Assign to Owen", group:"Alerts",
    go:{drawer:["vacancy", FV_OPS.id]},
    fields:[{k:"Employer",v:FENWICK.name},{k:"Vacancy",v:FV_OPS.title},{k:"Salary",v:eur(FV_OPS.salary[0]) + " to " + eur(FV_OPS.salary[1])},{k:"Raised by",v:"Ops Watchdog"}],
    history:[{when:"Today 09:40",text:"Ops Watchdog raised the exception"},{when:"2 days ago",text:"Oliver Grant opened a support ticket"}]},
  commission:{kind:"Approval", importance:"high", icon:ICONS.approvals, age:"1d",
    title:"Executive commission rule (10%) awaiting your approval",
    why:"Proposed for placements above €120,000. Offers already sent stay at 8%.",
    detail:"Raised by Michael Tierney. At 10%, a €128,000 placement carries a €12,800 fee instead of €10,240. Approving changes the rule for new executive offers only.",
    actionLabel:"Review in Work", secondaryLabel:"Ask Michael", group:"Approvals",
    go:{page:"Work", tab:"approvals"},
    fields:[{k:"Rule",v:"Executive placements"},{k:"Rate",v:"8% to 10%"},{k:"Applies to",v:"Salaries above €120,000"},{k:"Raised by",v:"Michael Tierney"}],
    history:[{when:"Yesterday 16:10",text:"Michael Tierney proposed the rule"},{when:"Yesterday 16:10",text:"Routed to John O'Farrell for approval"}]},
  renewals:{kind:"Task", importance:"high", icon:ICONS.work, age:"Today",
    title:RENEWALS_30 + " memberships expire within 30 days",
    why:"Reminders are drafted, not sent. Saltmarsh Bay Resort (6 Dec) and Alder & Oak (27 Dec) come first.",
    detail:"Ops Watchdog drafted renewal reminders for Owen Brady to review. Saltmarsh's engagement fell to 58 after the season; Alder & Oak is likely to move up a tier.",
    actionLabel:"Open memberships", secondaryLabel:"Assign to Owen", group:"Work",
    go:{page:"hq.employers", tab:"memberships"},
    fields:[{k:"Expiring",v:String(RENEWALS_30)},{k:"First",v:"Saltmarsh Bay Resort, 6 Dec"},{k:"Drafted by",v:"Ops Watchdog"},{k:"Owner",v:"Owen Brady"}],
    history:[{when:"Today 08:00",text:"Renewal reminders drafted"},{when:"4 days ago",text:"Saltmarsh raised renewal questions"}]},
  verification:{kind:"Alert", importance:"high", icon:ICONS.people, age:"5d+",
    title:num(MARKET.verificationBacklog) + " profiles awaiting verification",
    why:VERIFY_OLD + " are older than the 5-day target, mostly qualifications waiting on issuers.",
    detail:"Issuer checks in this demo are simulated. The Verification Agent routes requests and chases referees but never marks a fact as verified; Yasmin Haddad's team clears the manual queue.",
    actionLabel:"Open verification", secondaryLabel:"Assign to Yasmin", group:"Alerts",
    go:{page:"hq.talent", tab:"verification"},
    fields:[{k:"Waiting",v:num(MARKET.verificationBacklog)},{k:"Over 5 days",v:String(VERIFY_OLD)},{k:"Owner",v:"Yasmin Haddad"},{k:"Agent",v:"Verification Agent"}],
    history:[{when:"Today 09:05",text:"71 checks sent to issuers (simulated)"},{when:"Today 08:35",text:"One issuer not connected, moved to the manual queue"}]},
  invoice:{kind:"Alert", importance:"normal", icon:ICONS.insights, age:"6d",
    title:"Cedarhouse placement invoice overdue: " + eur(CEDAR_PL.salary * CEDAR_PL.feeRate),
    why:pctRate(CEDAR_PL.feeRate) + " of " + eur(CEDAR_PL.salary) + " for the Accommodation Manager placement at Cedarhouse Galway.",
    detail:candName(CEDAR_PL.candidateId) + " started on " + CEDAR_PL.startDate + ". Michael Tierney is following up and the support ticket is waiting on the employer. Payment processing is not connected in this demo.",
    actionLabel:"Open placements", secondaryLabel:"Snooze", group:"Alerts",
    go:{page:"hq.roles", tab:"placements"},
    fields:[{k:"Employer",v:"Cedarhouse Hotels"},{k:"Fee",v:eur(CEDAR_PL.salary * CEDAR_PL.feeRate)},{k:"Rate",v:pctRate(CEDAR_PL.feeRate)},{k:"Owner",v:"Michael Tierney"}],
    history:[{when:"6 days ago",text:"Invoice fell overdue"},{when:"Today",text:"Michael Tierney followed up"}]}
};
const ORDER = ["fenwick","commission","renewals","verification","invoice"];

/* ---- Recruit Assistant: scripted answers built from the fixtures ----
   Each one says it comes from demo data. Actions are [label, primary, target],
   where target is {page, tab}, {drawer:[kind, id]} or {ask}. ctx carries the
   shared store's live lists so answers follow changes made in the portals. */
const DEMO = "From the demo data: ";
const SCRIPTED_QUESTIONS = [
  "Which vacancies need attention?",
  "Where are employers spending the most?",
  "Show our membership performance.",
  "Which candidates are awaiting verification?",
  "How close are we to our talent network target?"
];
function vacancyAnswer(ctx){
  const open = ((ctx && ctx.vacancies) || VACANCIES).filter(v => v.status === "open").slice().sort((a, b) => b.postedDays - a.postedDays);
  const lead = open[0];
  if (!lead) return {tool:"marketplace.vacancies.search", effect:"read", text:DEMO + "there are no open vacancies in the sample right now.",
    actions:[["Open all vacancies", 1, {page:"hq.roles", tab:"vacancies"}]]};
  const stale = open.filter(v => v.postedDays > 14).length;
  return {tool:"marketplace.vacancies.search", effect:"read",
    text:DEMO + lead.title + " at " + EMPLOYER_BY_ID[lead.employerId].name + " is the one to act on: " + lead.postedDays + " days open, "
      + lead.marketMatches + " market matches and " + plural(lead.applicants, "applicant") + ". " + stale + " of the " + open.length
      + " sample roles are older than 14 days; these are the oldest. Ops Watchdog flags any role with no shortlist after 21 days.",
    cols:["Vacancy","Employer","Days open","Applicants"],
    rows:open.slice(0, 4).map(v => [v.title, empShort(v.employerId), String(v.postedDays), String(v.applicants)]),
    actions:[["Open the vacancy", 1, {drawer:["vacancy", lead.id]}], ["Open all vacancies", 0, {page:"hq.roles", tab:"vacancies"}]]};
}
function spendAnswer(){
  const list = EMPLOYERS.slice().sort((a, b) => b.spendYtd - a.spendYtd);
  const total = list.reduce((t, e) => t + e.spendYtd, 0);
  const top3 = list.slice(0, 3).reduce((t, e) => t + e.spendYtd, 0);
  const a = list[0], b = list[1];
  return {tool:"revenue.employers.rank", effect:"read",
    text:DEMO + a.name + " leads year-to-date spend at " + eur(a.spendYtd) + " across " + plural(a.placementsYtd, "placement") + ", ahead of "
      + b.name + " at " + eur(b.spendYtd) + ". The top three accounts make up " + pctOf(top3, total) + " of the " + eur(total)
      + " tracked across the " + list.length + " sample employers.",
    cols:["Employer","Spend YTD","Placements","Tier"],
    rows:list.slice(0, 4).map(e => [e.name, eur(e.spendYtd), String(e.placementsYtd), tierLabel(e.tier)]),
    actions:[["Open " + a.short, 1, {drawer:["employer", a.id]}], ["Open revenue overview", 0, {page:"hq.revenue", tab:"overview"}]]};
}
function membershipAnswer(ctx){
  const tiers = (ctx && ctx.tiers) || TIERS;
  const revenue = membershipRevenue(tiers), accounts = totalAccounts(tiers);
  const best = tiers.slice().sort((x, y) => y.price * y.accounts - x.price * x.accounts)[0];
  return {tool:"revenue.memberships.summary", effect:"read",
    text:DEMO + "memberships bring in " + eur(revenue) + " a year across " + num(accounts) + " employer accounts, simulated and annualised, an average of "
      + eur(revenue / accounts) + ". " + best.label + " earns the most at " + eur(best.price * best.accounts)
      + ". Starter, Growth and Enterprise prices came from John; Professional and Group are concept assumptions.",
    cols:["Tier","Accounts","Price","Annual"],
    rows:tiers.map(t => [t.label + " · " + t.band, num(t.accounts), eur(t.price), eur(t.price * t.accounts)]),
    actions:[["Open memberships", 1, {page:"hq.revenue", tab:"memberships"}], ["Open pricing settings", 0, {page:"Settings", tab:"pricing"}]]};
}
function verificationAnswer(){
  const days = (s) => parseInt(s, 10) || 0;
  const q = VERIFICATION_QUEUE.slice().sort((a, b) => days(b.age) - days(a.age)).slice(0, 4);
  return {tool:"talent.verification.queue", effect:"read",
    text:DEMO + num(MARKET.verificationBacklog) + " profiles are waiting on verification and " + VERIFY_OLD
      + " are older than the 5-day target. These are the oldest items in the sample queue. The Verification Agent routes requests and chases referees, but it never marks a fact as verified.",
    cols:["Candidate","Item","Age","Status"],
    rows:q.map(r => [candName(r.candidateId), r.item, r.age, r.status]),
    actions:[["Open the verification queue", 1, {page:"hq.talent", tab:"verification"}], ["Open " + candName(q[0].candidateId), 0, {drawer:["candidate", q[0].candidateId]}]]};
}
function targetAnswer(){
  const t = MARKET.talentTarget;
  return {tool:"talent.network.progress", effect:"read",
    text:DEMO + num(MARKET.registeredProfessionals) + " professionals are registered against John's target of " + num(t) + ", so the target is passed by "
      + num(MARKET.registeredProfessionals - t) + ". " + num(MARKET.verifiedProfiles) + " profiles are verified, " + pctOf(MARKET.verifiedProfiles, t)
      + " of the target, and " + num(MARKET.discoverableCandidates) + " are discoverable to employers.",
    cols:["Measure","Profiles","Of target","This month"],
    rows:[["Registered", num(REG[11]), pctOf(REG[11], t), signed(lastDelta(REG))],
      ["Verified", num(VER[11]), pctOf(VER[11], t), signed(lastDelta(VER))],
      ["Discoverable", num(DISC[11]), pctOf(DISC[11], t), signed(lastDelta(DISC))],
      ["Awaiting verification", num(MARKET.verificationBacklog), pctOf(MARKET.verificationBacklog, t, 1), VERIFY_OLD + " over 5 days"]],
    actions:[["Open talent overview", 1, {page:"hq.talent", tab:"overview"}], ["Open the growth dashboard", 0, {page:"Dashboard", tab:"growth"}]]};
}
function commissionAnswer(ctx){
  const rules = (ctx && ctx.commissionRules) || COMMISSION_RULES;
  const rate = (id, fb) => pctRate((rules.find(r => r.id === id) || {rate:fb}).rate);
  return {tool:"revenue.commissions.rules", effect:"read",
    text:DEMO + "the standard success fee is " + rate("cr1", 0.08) + " of first-year salary, against a " + pctRate(MARKET.agencyBenchmarkRate)
      + " agency benchmark. Two changes are proposed: " + rate("cr2", 0.07) + " for employers with six or more placements a year, and "
      + rate("cr3", 0.1) + " for executive placements above €120,000, which is waiting on your approval.",
    cols:["Rule","Rate","Applies to","Status"],
    rows:rules.map(r => [r.label, pctRate(r.rate), r.applies, r.note]),
    actions:[["Review the approval", 1, {page:"Work", tab:"approvals"}], ["Open commissions", 0, {page:"hq.revenue", tab:"commissions"}]]};
}
function invoiceAnswer(ctx){
  const pls = (ctx && ctx.placements) || PLACEMENTS;
  const fee = (p) => p.salary * p.feeRate;
  const rank = {overdue:0, invoiced:1, pending:2, paid:3};
  const list = pls.slice().sort((a, b) => (rank[a.invoice] - rank[b.invoice]) || fee(b) - fee(a));
  const count = (s) => pls.filter(p => p.invoice === s).length;
  const over = pls.filter(p => p.invoice === "overdue");
  return {tool:"revenue.placements.invoices", effect:"read",
    text:DEMO + plural(pls.length, "sample placement") + " carry " + eur(pls.reduce((t, p) => t + fee(p), 0)) + " in success fees: "
      + count("paid") + " paid, " + count("invoiced") + " invoiced, " + count("pending") + " pending and " + count("overdue") + " overdue."
      + (over.length ? " The overdue fee is " + EMPLOYER_BY_ID[over[0].employerId].name + " at " + eur(fee(over[0])) + ", " + pctRate(over[0].feeRate)
        + " of " + eur(over[0].salary) + "." : "")
      + " Payment processing is not connected, so nothing is collected in this demo.",
    cols:["Placement","Employer","Fee","Invoice"],
    rows:list.slice(0, 4).map(p => [candName(p.candidateId), empShort(p.employerId), eur(fee(p)), cap(p.invoice)]),
    actions:[["Open placements", 1, {page:"hq.roles", tab:"placements"}], ["Open Cedarhouse Hotels", 0, {drawer:["employer", "e-cedarhouse"]}]]};
}
function fallbackAnswer(){
  return {tool:"assistant.help", effect:"read",
    text:"Recruit Assistant answers from Recruit's demo data, so it covers a set of scripted questions for now. Pick one of these and the answer is built from the same records every portal uses.",
    actions:SCRIPTED_QUESTIONS.map((q, i) => [q, i === 0 ? 1 : 0, {ask:q}])};
}
const ANSWERS = {vacancies:vacancyAnswer, spend:spendAnswer, membership:membershipAnswer, verification:verificationAnswer,
  target:targetAnswer, commission:commissionAnswer, invoices:invoiceAnswer, fallback:fallbackAnswer};

function pickAnswer(q, ctx){
  const s = (q || "").toLowerCase();
  if (/commission|success fee|fee rule|executive rate|10%/.test(s)) return commissionAnswer(ctx);
  if (/invoice|overdue|payment|paid\b/.test(s)) return invoiceAnswer(ctx);
  if (/verif|credential|backlog|issuer|referee/.test(s)) return verificationAnswer(ctx);
  if (/target|network|100,000|100000|how close|registered/.test(s)) return targetAnswer(ctx);
  if (/membership|tier|subscription|renewal|pricing|price/.test(s)) return membershipAnswer(ctx);
  if (/spend|biggest|top employer|most valuable|revenue by/.test(s)) return spendAnswer(ctx);
  if (/vacanc|role|shortlist|attention|stuck|fenwick|hiring|pipeline/.test(s)) return vacancyAnswer(ctx);
  return fallbackAnswer();
}

// Turns a plain-English filter name into a full dashboard area: no real
// backend, just a seeded generator so the same phrase always produces the
// same numbers, with direction and vocabulary nudged by keywords in the text.
function synthesizeCustomArea(name){
  const trimmed = (name || "").trim();
  if (!trimmed) return null;
  let seed = 0;
  for (let i = 0; i < trimmed.length; i++) seed = (seed * 31 + trimmed.charCodeAt(i)) >>> 0;
  const rnd = (n) => (((seed >>> (n % 24)) ^ (seed << ((n * 7) % 13))) >>> 0) % 997 / 997;
  const low = trimmed.toLowerCase();
  const has = (...words) => words.some(w => low.indexOf(w) > -1);
  const up = has("growth","launch","scale","pilot","campaign","week","new","expansion","grow");
  const risk = has("risk","issue","delay","overdue","churn","decline","stuck","late","backlog");
  const dir = risk ? -1 : (up ? 1 : (rnd(2) > 0.45 ? 1 : -1));

  let vocab = "generic";
  if (has("dublin","galway","munster","leinster","connacht","ulster","london","uk","ireland","kerry","clare","wicklow","region"))
    vocab = "region";
  else if (has("cost","spend","budget","saving","fee","revenue","margin")) vocab = "cost";
  else if (has("candidate","talent","professional","graduate","student","career")) vocab = "people";
  else if (has("verification","verify","credential","issuer","reference","queue")) vocab = "ops";
  else if (has("employer","hotel","restaurant","retail","event","member","renewal","account")) vocab = "customer";

  const V = {
    region:   {labels:["Sign-ups","Open roles","Placements","Coverage"], unit:"30 DAYS"},
    cost:     {labels:["Fees","Cost per hire","Saving vs agency","Budget used"], unit:"EUR · 30 DAYS"},
    people:   {labels:["Professionals","Verified","Time to shortlist","Retention"], unit:"PROFILES"},
    ops:      {labels:["Checks waiting","Turnaround","Exceptions","Checks sent"], unit:"CHECKS"},
    customer: {labels:["Active employers","Renewal rate","Churn","Engagement"], unit:"ACCOUNTS"},
    generic:  {labels:["Volume","Rate","Cost","Coverage"], unit:"ACTIVITY · 30 DAYS"}
  }[vocab];

  let v0 = 40 + Math.floor(rnd(1) * 220);
  const chart = MONTHS.map((m, i) => {
    v0 = Math.max(8, Math.round(v0 * (1 + dir * (0.03 + rnd(i + 3) * 0.07))));
    return [m, v0, String(v0)];
  });
  const metrics = V.labels.map((label, i) => {
    const val = 20 + Math.floor(rnd(i + 5) * 400);
    const pct = 2 + Math.round(rnd(i + 9) * 18);
    const isUp = dir > 0 ? rnd(i + 12) > 0.25 : rnd(i + 12) > 0.7;
    const bars = [0,1,2,3,4,5,6,7,8].map(k => 0.3 + rnd(i * 3 + k) * 0.7);
    return [label, i === 1 ? pct + "%" : String(val), (isUp ? "+" : MINUS) + pct + (i === 1 ? "pt" : "%"), isUp ? "up" : "down", "vs last month", bars];
  });
  const capName = trimmed.replace(/\b\w/g, c => c.toUpperCase());
  const split = [
    [capName + ": direct", String(Math.round(v0 * 0.5)), "48%", 1],
    ["Existing pipeline", String(Math.round(v0 * 0.3)), "31%", 0],
    ["Everything else", String(Math.round(v0 * 0.2)), "21%", 0]
  ];
  const table = [1,2,3].map(w => [capName + ", week " + w, String(20 + Math.floor(rnd(20 + w) * 200)),
    (dir > 0 ? "+" : MINUS) + (3 + Math.floor(rnd(23 + w) * 14)) + "%", "Tagged from records mentioning “" + low + "”"]);
  table.push(["Everything else", String(20 + Math.floor(rnd(30) * 200)), "+0%", "Baseline"]);
  return {
    id: trimmed, label: capName, color: "var(--accent)", owner: "CUSTOM FILTER",
    description: "Generated from “" + trimmed + "”, a plain-English filter over demo data, not a registered metric set.",
    kind: "columns", chartTitle: capName + " over time", chartUnit: V.unit,
    chart, splitTitle: "Where “" + low + "” shows up", split,
    tableCols: ["Item","Value","Change","Note"], table,
    metrics, legend: [capName, "Pipeline", "Other"]
  };
}

const ORGS = EMPLOYERS.map(e => [e.name, e.sector, eur(e.spendYtd), tierLabel(e.tier), e.health]);
const TEAMS = HQ_TEAMS.map(t => [t.name, t.members + (t.members === 1 ? " member" : " members"), t.lead, t.remit]);
const LOCATIONS = [["Dublin HQ", ORG.location, TEAM_SIZE + " people across " + HQ_TEAMS.length + " teams", "active"]];

/* ---- agents: the eight Recruit agents and one group thread ----
   Names, shapes, tints, states and roles come from RECRUIT_AGENTS. Agents
   propose and wait for a person; none of them acts outside Recruit. */
const fromAgent = (id, extra) => {
  const a = agentById(id);
  return Object.assign({id, name:a.name, shape:a.shape, tint:a.tint, state:a.state, role:a.role}, extra);
};
const AGENT_DEFS = [
  fromAgent("briefing", {when:"07:00", preview:MARKET.placementsThisMonth + " placements this month. two things need you.",
   thread:[
     {kind:"stamp", text:"Today 07:00"},
     {kind:"routine", text:"Ran routine", routine:"Morning briefing"},
     {kind:"agent", text:"morning briefing:", lines:[
       {k:"Placements", v:MARKET.placementsThisMonth + " this month, up from " + PLC[10]},
       {k:"Revenue", v:eur(FEE[11]) + " in success fees · memberships " + eur(MEMBERSHIP_ANNUAL) + " a year (simulated)"},
       {k:"Network", v:num(MARKET.registeredProfessionals) + " registered · " + num(MARKET.verifiedProfiles) + " verified · target passed"},
       {k:"Exception", v:"Fenwick & Vale's Operations Director, " + FV_OPS.postedDays + " days without a shortlist"}]},
     {kind:"agent", text:"two things need you today: the 10% executive commission rule, and whether we widen Fenwick's search. everything else is moving."},
     {kind:"user", text:"put fenwick on owen's list for this morning"},
     {kind:"agent", text:"done. task created against Fenwick & Vale Hospitality for Owen Brady, due today. i'll check on it in tomorrow's briefing."}
   ]}),
  fromAgent("ops", {when:"09:40", preview:"fenwick's operations director: " + FV_OPS.postedDays + " days, no shortlist.",
   thread:[
     {kind:"stamp", text:"Today 09:40"},
     {kind:"routine", text:"Ran routine", routine:"Vacancy exception watch"},
     {kind:"agent", text:"five exceptions this run:", lines:[
       {k:"Vacancy", v:FV_OPS.title + " · Fenwick & Vale · " + FV_OPS.postedDays + " days, no shortlist"},
       {k:"Renewals", v:RENEWALS_30 + " memberships expire in the next 30 days"},
       {k:"Verification", v:VERIFY_OLD + " checks older than 5 days"},
       {k:"Offer", v:"Declan Murphy's contingency offer is waiting on Deirdre Foley"},
       {k:"Invoice", v:"Cedarhouse placement fee overdue · " + eur(CEDAR_PL.salary * CEDAR_PL.feeRate)}]},
     {kind:"agent", text:"fenwick is the one to act on: " + FV_OPS.marketMatches + " market matches, one applicant, and engagement down to " + FENWICK.engagement + ". i've drafted a note to Oliver Grant suggesting we widen to multi-site leaders. it waits for a person to send it."},
     {kind:"user", text:"who would we suggest"},
     {kind:"agent", text:"talent matchmaker's top three: Ciarán O'Brien, Siobhán Doherty and Patrick Healy, all with 20 or more years and multi-site or general manager experience. they would go to Fenwick anonymised until each one agrees to an introduction."}
   ]}),
  fromAgent("profile", {when:"09:52", preview:agentById("profile").runsToday + " cvs structured today. 312 missing salary expectations.",
   thread:[
     {kind:"stamp", text:"Today 09:52"},
     {kind:"routine", text:"Ran routine", routine:"CV structuring"},
     {kind:"agent", text:"a new CV is now a profile draft:", lines:[
       {k:"Timeline", v:"Career history structured"},
       {k:"Evidence", v:"4 items to verify"},
       {k:"Status", v:"Self-reported until checked"}]},
     {kind:"agent", text:agentById("profile").runsToday + " CVs structured today. 312 profiles still have no salary expectation, which weakens matching. i can draft a nudge for those candidates."},
     {kind:"user", text:"draft it, don't send"},
     {kind:"agent", text:"drafted and parked in Work. it goes nowhere until someone on Leah's team sends it."}
   ]}),
  fromAgent("match", {when:"09:31", preview:"18 profiles ranked for harbourview's general manager.",
   thread:[
     {kind:"stamp", text:"Today 09:31"},
     {kind:"routine", text:"Ran routine", routine:"Rank relevant profiles"},
     {kind:"agent", text:"General Manager at Harbourview Grand Hotel, re-ranked:", lines:[
       {k:"Ranked", v:"18 relevant profiles"},
       {k:"Pipeline", v:"Sarah Kavanagh and Declan Murphy at offer · Tomás Ryan at second interview"},
       {k:"New", v:"Lucia Ferreira suggested for Hotel Manager at Fenwick Dublin"}]},
     {kind:"agent", text:"every suggestion shows its evidence and the points that need the employer's judgement. i don't reject anyone and i don't decide."},
     {kind:"user", text:"why lucia for fenwick"},
     {kind:"agent", text:"lifestyle brand experience: a 96% brand audit and a 9.3 guest score at a Lisbon design hotel, four languages, and she is relocating to Dublin. notice period and relocation timing need a conversation."}
   ]}),
  fromAgent("value", {when:"08:15", preview:"1,120 market ranges refreshed. all labelled estimates.",
   thread:[
     {kind:"stamp", text:"Today 08:15"},
     {kind:"routine", text:"Ran routine", routine:"Market range refresh"},
     {kind:"agent", text:"nightly refresh done:", lines:[
       {k:"Profiles", v:"1,120 re-estimated"},
       {k:"Benchmark", v:"Deputy GM salaries in Dublin up 3% this quarter"},
       {k:"Label", v:"Every figure shown as an estimate"}]},
     {kind:"user", text:"what does that mean for aoife"},
     {kind:"agent", text:"Aoife Byrne's estimated range is " + eur(CANDIDATE_BY_ID["c-aoife"].marketRange[0]) + " to " + eur(CANDIDATE_BY_ID["c-aoife"].marketRange[1]) + " for her current level in Dublin. it's an estimate from illustrative benchmarks, not a guarantee, and it says so wherever she sees it."}
   ]}),
  fromAgent("path", {when:"07:30", preview:"hospitality to events moves are up this quarter.",
   thread:[
     {kind:"stamp", text:"Today 07:30"},
     {kind:"routine", text:"Ran routine", routine:"Career explorer reports"},
     {kind:"agent", text:"640 career explorer reports updated:", lines:[
       {k:"Strongest move", v:"Hotel events to live events operations"},
       {k:"Example", v:"Mark Doyle · Events Operations Director at 86% alignment"},
       {k:"Gap to close", v:"Festival-scale safety and production suppliers"}]},
     {kind:"agent", text:"hospitality to events moves are up this quarter. worth featuring in Career change week. i suggest options; i don't predict outcomes."},
     {kind:"user", text:"which course closes mark's gap"},
     {kind:"agent", text:"the " + COURSE_BY_ID["crs-events"].title + " from Corrib Hospitality Academy: 12 weeks part-time with two live-event placements, " + eur(COURSE_BY_ID["crs-events"].price) + " before the " + pctRate(COURSE_BY_ID["crs-events"].memberDiscount) + " member discount. Corrib is a concept partner and nothing is signed."}
   ]}),
  fromAgent("verify", {when:"09:05", preview:"71 sent to issuers. 25 waiting on documents.",
   thread:[
     {kind:"stamp", text:"Today 09:05"},
     {kind:"routine", text:"Ran routine", routine:"Verification chase"},
     {kind:"agent", text:"this run:", lines:[
       {k:"Sent", v:"71 checks to issuers (simulated)"},
       {k:"Waiting", v:"25 on candidate documents"},
       {k:"Manual queue", v:"Universidade do Tejo not connected · Lucia Ferreira's MSc"}]},
     {kind:"agent", text:num(MARKET.verificationBacklog) + " profiles are waiting overall and " + VERIFY_OLD + " are older than 5 days. i can chase and route, but i never mark anything verified. that takes a confirmation or a person."},
     {kind:"user", text:"who's been waiting longest"},
     {kind:"agent", text:"Ciarán O'Brien's reference from Parnell Square Hotel, 6 days, and Lucia Ferreira's MSc, 5 days. both are with Yasmin's team. i've drafted a second reference request for Ciarán; it waits for a yes."}
   ]}),
  fromAgent("growth", {when:"08:40", preview:"leeside proposal drafted. waiting for john.",
   thread:[
     {kind:"stamp", text:"Today 08:40"},
     {kind:"routine", text:"Ran routine", routine:"Growth experiments"},
     {kind:"agent", text:"two experiments drafted:", lines:[
       {k:"Partner", v:"Student pathways proposal for Leeside College"},
       {k:"Campaign", v:"Career change week · hospitality to events stories"},
       {k:"Funnel", v:"Student pathways converts at 30.4% in the campaign model"}]},
     {kind:"agent", text:"the Leeside proposal is in Work for your approval. Leeside is a proposed partner and nothing is signed; approving only lets Fergal send it."},
     {kind:"user", text:"what referral share did we propose"},
     {kind:"agent", text:pctRate(PARTNERS.find(p => p.id === "pt-leeside").revenueShare) + " of course fees from Recruit referrals. Liffey is at " + pctRate(PARTNERS.find(p => p.id === "pt-liffey").revenueShare) + " and Corrib at " + pctRate(PARTNERS.find(p => p.id === "pt-corrib").revenueShare) + ", both concept partners."}
   ]}),
  {id:"review", name:"Monday marketplace review", shape:"rim-capsule", tint:"#1b2430", state:"complete", group:true,
   members:["briefing","ops","match"], role:"Briefing Agent, Ops Watchdog and Talent Matchmaker on the weekly review",
   when:"Mon", preview:"talent matchmaker: three pipelines moved last week.",
   thread:[
     {kind:"stamp", text:"Monday 08:00"},
     {kind:"routine", text:"Ran routine", routine:"Weekly marketplace review"},
     {kind:"agent", from:"briefing", text:"last week: " + num(MARKET.openVacancies) + " open roles, placements on track for the month, and the talent network passed 100,000 registered professionals."},
     {kind:"agent", from:"ops", text:"one vacancy is stuck: Fenwick & Vale's Operations Director. everything else had a shortlist inside 21 days."},
     {kind:"agent", from:"match", text:"three pipelines moved: Harbourview's General Manager reached offer stage twice, Revenue Manager booked a first interview, and Larchfield's Deputy GM has a second interview with Aoife Byrne."},
     {kind:"user", text:"good. keep fenwick on top until it moves"},
     {kind:"agent", from:"ops", text:"pinned. it stays first in every briefing until a shortlist exists."},
     {kind:"agent", from:"briefing", text:"noted for next Monday's one-pager."}
   ]}
];

/* ---- dashboard ---- */
const KPI_DEFS = {
  professionals:{label:"Registered professionals", value:num(MARKET.registeredProfessionals), delta:signed(lastDelta(REG)), dir:"up", hint:"this month", hero:true},
  verified:{label:"Verified profiles", value:num(MARKET.verifiedProfiles), delta:signed(lastDelta(VER)), dir:"up", hint:pctOf(MARKET.verifiedProfiles, MARKET.talentTarget) + " of the 100,000 target"},
  employers:{label:"Employer accounts", value:num(MARKET.employerAccounts), delta:signed(lastDelta(EMP)), dir:"up", hint:"paying members"},
  roles:{label:"Open roles", value:num(MARKET.openVacancies), delta:signed(lastDelta(VAC)), dir:"up", hint:"live vacancies"},
  placements:{label:"Placements this month", value:num(MARKET.placementsThisMonth), delta:signed(lastDelta(PLC)), dir:"up", hint:"vs last month"},
  shortlist:{label:"Median time to shortlist", value:MARKET.medianHoursToShortlist + "h", delta:MINUS + Math.abs(lastDelta(HRS)).toFixed(1) + "h", dir:"up", hint:"faster than last month"},
  membership:{label:"Membership revenue", value:eur(MEMBERSHIP_ANNUAL), delta:growth(MRR), dir:"up", hint:"simulated, annualised"},
  fees:{label:"Success fees this month", value:eur(FEE[11]), delta:growth(FEE), dir:"up", hint:"8% default rate"}
};

const regionSplit = () => {
  const total = MARKET.registeredProfessionals;
  const groups = [["Dublin",["Dublin"]],["Munster",["Munster"]],["Rest of Leinster",["Rest of Leinster"]],["Connacht",["Connacht"]],["UK",["UK"]],["Elsewhere",["Ulster (ROI)","Rest of world"]]];
  const shares = groups.map(g => g[1].reduce((s, l) => s + ((REGION_MIX.find(r => r.label === l) || {}).value || 0), 0));
  let left = total;
  return groups.map((g, i) => {
    const v = i === groups.length - 1 ? left : Math.round(total * shares[i] / 100);
    left -= v;
    return [g[0], num(v), shares[i] + "%", i === 0 ? 1 : 0];
  });
};
const FUNNEL_SHORT = {"Site visits":"Site visits", "CV uploads":"CV uploads", "Completed profiles":"Completed", "Verified profiles":"Verified", "Discoverable":"Discoverable"};
const FUNNEL_OF = ["of reach", "of visits", "of uploads", "of completed", "of verified"];
const funnelSteps = () => CANDIDATE_FUNNEL.slice(1).map((s, i) =>
  [FUNNEL_SHORT[s.label] || s.label, num(s.value), pctOf(s.value, CANDIDATE_FUNNEL[i].value) + " " + FUNNEL_OF[i], s.value]);
const CAMPAIGN_SHORT = {cp1:"Founder network", cp2:"Leaders breakfast", cp3:"Market value", cp4:"Student pathways", cp5:"Career change", cp6:"Group roadshow"};
const TOP_CAMPAIGNS = CAMPAIGNS.slice().sort((a, b) => b.signups - a.signups).slice(0, 4);
const REV_NOW = FEE[11] + MRR[11] + EDU[11];
const INVOICE_RANK = {overdue:0, invoiced:1, pending:2, paid:3};
const FEE_ROWS = PLACEMENTS.slice().sort((a, b) => (INVOICE_RANK[a.invoice] - INVOICE_RANK[b.invoice]) || (b.salary * b.feeRate - a.salary * a.feeRate)).slice(0, 4)
  .map(p => [candName(p.candidateId) + " · " + empShort(p.employerId), eur(p.salary * p.feeRate), pctRate(p.feeRate), cap(p.invoice)]);

const ASPECT_DEFS = [
  {id:"marketplace", label:"Marketplace", color:"var(--accent)", owner:"CLODAGH REILLY",
   description:"Professionals, employers and open roles. " + SCENARIO_CAPTION + ".",
   kind:"columns", chartTitle:"Registered professionals by month", chartUnit:"PROFESSIONALS",
   chart:MONTHS.map((m, i) => [m, REG[i], k1(REG[i])]),
   splitTitle:"Where professionals are", split:regionSplit(),
   tableCols:["Measure","Now","This month","Note"],
   table:[["Registered professionals", num(REG[11]), signed(lastDelta(REG)), "Past the 100,000 target"],
     ["Verified profiles", num(VER[11]), signed(lastDelta(VER)), pctOf(VER[11], MARKET.talentTarget) + " of the target"],
     ["Employer accounts", num(EMP[11]), signed(lastDelta(EMP)), "Paying members"],
     ["Open roles", num(VAC[11]), signed(lastDelta(VAC)), "Live on the marketplace"]],
   metrics:[["Registered professionals", num(REG[11]), signed(lastDelta(REG)), "up", "this month", bars9(REG)],
     ["Employer accounts", num(EMP[11]), signed(lastDelta(EMP)), "up", "paying members", bars9(EMP)],
     ["Open roles", num(VAC[11]), signed(lastDelta(VAC)), "up", "live vacancies", bars9(VAC)],
     ["Placements", num(PLC[11]), signed(lastDelta(PLC)), "up", "this month", bars9(PLC)]]},
  {id:"growth", label:"Growth", color:"var(--teal)", owner:"LEAH CORCORAN",
   description:"How professionals find Recruit, from first visit to discoverable. All time, illustrative.",
   kind:"funnel", funnel:funnelSteps(), chartTitle:"Candidate funnel", chartUnit:"ALL TIME",
   chart:MONTHS.map((m, i) => [m, REG[i], k1(REG[i])]),
   splitTitle:"Projected campaign sign-ups",
   split:TOP_CAMPAIGNS.map((c, i) => [CAMPAIGN_SHORT[c.id] || c.name, num(c.signups), pctOf(c.signups, TOP_CAMPAIGNS[0].signups), i === 0 ? 1 : 0]),
   tableCols:["Campaign","Sign-ups","Conversion","Status"],
   table:TOP_CAMPAIGNS.map(c => [c.name, num(c.signups), c.conv.toFixed(1) + "%", c.status]),
   metrics:[["Registered professionals", num(REG[11]), growth(REG), "up", "this month", bars9(REG)],
     ["Verified profiles", num(VER[11]), growth(VER), "up", "this month", bars9(VER)],
     ["Discoverable", num(DISC[11]), growth(DISC), "up", "opted in to search", bars9(DISC)],
     ["Employer accounts", num(EMP[11]), growth(EMP), "up", "this month", bars9(EMP)]]},
  {id:"commercial", label:"Commercial", color:"#f0a33e", owner:"MICHAEL TIERNEY",
   description:"Success fees, memberships and education revenue by month. Simulated.",
   kind:"stacked", legend:["Success fees","Memberships","Education"],
   stacked:MONTHS.map((m, i) => [m, [Math.round(FEE[i] / 1000), Math.round(MRR[i] / 1000), Math.round(EDU[i] / 1000)]]),
   chartTitle:"Revenue by month", chartUnit:"EUR THOUSANDS",
   chart:MONTHS.map((m, i) => { const t = FEE[i] + MRR[i] + EDU[i]; return [m, Math.round(t / 1000), eurk1(t)]; }),
   splitTitle:"Revenue this month",
   split:[["Success fees", eurk1(FEE[11]), pctOf(FEE[11], REV_NOW), 1], ["Memberships", eurk1(MRR[11]), pctOf(MRR[11], REV_NOW), 0], ["Education", eurk1(EDU[11]), pctOf(EDU[11], REV_NOW), 0]],
   tableCols:["Placement","Fee","Rate","Invoice"],
   table:FEE_ROWS,
   metrics:[["Success fees", eur(FEE[11]), growth(FEE), "up", "this month", bars9(FEE)],
     ["Membership revenue", eur(MEMBERSHIP_ANNUAL), growth(MRR), "up", "simulated, annualised", bars9(MRR)],
     ["Education revenue", eur(EDU[11]), growth(EDU), "up", "partner shares, this month", bars9(EDU)],
     ["Saving vs agency fees", eur(ECON.saving), growth(PLC), "up", "this month, illustrative", bars9(PLC)]]},
  {id:"quality", label:"Quality", color:"#c8b4f0", owner:"YASMIN HADDAD",
   description:"Speed and accuracy of matching and verification against Recruit's targets.",
   kind:"dots", target:6, targetLabel:"Target: a shortlist inside 6 hours", chartTitle:"Median hours to shortlist", chartUnit:"HOURS",
   chart:MONTHS.map((m, i) => [m, HRS[i], HRS[i] + "h"]),
   splitTitle:"Verification queue",
   split:[["Within 5 days", num(MARKET.verificationBacklog - VERIFY_OLD), pctOf(MARKET.verificationBacklog - VERIFY_OLD, MARKET.verificationBacklog), 1],
     ["Older than 5 days", num(VERIFY_OLD), pctOf(VERIFY_OLD, MARKET.verificationBacklog), 0]],
   tableCols:["Measure","Now","Status","Note"],
   table:[["Median time to shortlist", HRS[11] + "h", "On target", "Target inside 6 hours"],
     ["Verification turnaround", QUALITY.verificationSlaHours + "h", "On target", "Median, target inside 5 days"],
     ["Checks older than 5 days", num(VERIFY_OLD), MINUS + VERIFY_OLD + " to clear", "Of " + num(MARKET.verificationBacklog) + " waiting"],
     ["Profile accuracy", QUALITY.profileAccuracy + "%", "On target", "Spot-checked profiles"]],
   metrics:[["Median time to shortlist", HRS[11] + "h", MINUS + Math.abs(lastDelta(HRS)).toFixed(1) + "h", "up", "vs last month", bars9(HRS)],
     ["Introduction acceptance", QUALITY.introAcceptance + "%", "of requests", "up", "candidates agreeing to talk", FLAT],
     ["Offer acceptance", QUALITY.offerAcceptance + "%", "of offers", "up", "accepted once sent", FLAT],
     ["12-month retention", QUALITY.retention12m + "%", QUALITY.retention6m + "% at 6 months", "up", "placed professionals", FLAT]]}
];

const FILTER_GROUPS = [
  {title:"AREA", items:ASPECT_DEFS.map(a => a.label)},
  {title:"SEGMENT", items:["Hotels","Restaurants","Events","Retail"]},
  {title:"REGION", items:["Dublin","Munster","Connacht","UK"]}
];

/* ---- work: automations, agent routines and schedules ----
   agendaTime is what the day's agenda shows in its time column. */
const OPS_DEFS = [
  {id:"o1", name:"Morning briefing", kind:"routine", owner:"Briefing Agent", ownerKind:"agent", initials:"BA", agendaTime:"07:00",
   trigger:"Weekdays, 07:00", triggerKind:"schedule", next:"Tomorrow 07:00", last:"Posted to Home 07:00", status:"healthy", rate:100, on:true,
   what:"Reads roles, candidates, revenue, placements, verification and growth overnight, then tells John the few things that need a decision.",
   why:"John was opening six screens before his first call of the day.",
   saved:"9 hours a month",
   steps:[["Trigger","Every weekday at 07:00"],["Find","Overnight changes across the marketplace"],["Check","Drop anything a team already handled"],["Draft","Write the briefing"],["Send","Post to Home"]],
   runs:[["Today 07:00","24s","ok","Whole marketplace","€0.02"],["Yesterday 07:00","22s","ok","Whole marketplace","€0.02"],["Mon 07:00","26s","ok","Whole marketplace","€0.02"]]},
  {id:"o2", name:"Vacancy exception watch", kind:"automation", owner:"Ops Watchdog", ownerKind:"agent", initials:"OW", agendaTime:"Hourly",
   trigger:"Hourly", triggerKind:"schedule", next:"10:40", last:"5 exceptions raised", status:"approval", rate:99, on:true,
   what:"Checks every open vacancy for no shortlist after 21 days, introductions unanswered for 48 hours and offers waiting on approval.",
   why:"A role that goes quiet is the fastest way to lose an employer.",
   saved:"12 hours a month",
   steps:[["Trigger","Every hour"],["Find","Vacancies, introductions and offers that stopped moving"],["Check","Skip anything a person is already handling"],["Draft","Write the exception and a suggested next step"],["Approval","The account owner decides what goes to the employer","gate"],["Update","Log the exception against the vacancy"]],
   runs:[["Today 09:40","14s","ok","326 vacancies, 1,280 accounts","€0.02"],["Today 08:40","12s","ok","326 vacancies","€0.02"],["Yesterday 17:40","13s","ok","326 vacancies","€0.02"]]},
  {id:"o3", name:"Verification chase", kind:"automation", owner:"Verification Agent", ownerKind:"agent", initials:"VA", agendaTime:"30 min",
   trigger:"Every 30 minutes", triggerKind:"schedule", next:"10:05", last:"71 sent, 25 waiting", status:"failed", rate:94, on:true,
   what:"Sends credential checks to issuers, chases references and moves anything stuck to the manual queue. It never marks a fact as verified.",
   why:"Unverified profiles are the slowest part of every shortlist.",
   saved:"40 hours a month",
   steps:[["Trigger","Every 30 minutes"],["Find","Requests waiting on an issuer, referee or candidate"],["Send","Ask the issuer to confirm (simulated)"],["Check","Nothing is verified without a confirmation"],["Update","Move stuck checks to the manual queue"]],
   runs:[["Today 09:05","41s","partial","96 checks","€0.02","25 waiting on candidate documents"],["Today 08:35","38s","failed","1 issuer","€0.00","Issuer endpoint not connected (simulated). Moved to the manual queue."],["Today 08:05","36s","ok","88 checks","€0.02"]]},
  {id:"o4", name:"Renewal reminders", kind:"routine", owner:"Ops Watchdog", ownerKind:"agent", initials:"OW", agendaTime:"08:00",
   trigger:"Daily, 08:00", triggerKind:"schedule", next:"Tomorrow 08:00", last:RENEWALS_30 + " drafts waiting", status:"approval", rate:96, on:true,
   what:"Drafts a renewal note for every membership 30, 14 and 3 days before it lapses, with the year's placements and savings.",
   why:"Renewals were being chased the week they lapsed.",
   saved:"10 hours a month",
   steps:[["Trigger","Every day at 08:00"],["Find","Memberships 30, 14 or 3 days from renewal"],["Draft","Write the renewal note with the year's numbers"],["Approval","Owen Brady reviews","gate"],["Send","Email the employer (planned integration)"],["Update","Log it against the account"]],
   runs:[["Today 08:00","19s","partial",RENEWALS_30 + " accounts","€0.03",RENEWALS_30 + " drafts waiting for review"],["Yesterday 08:00","17s","ok","4 accounts","€0.01"],["Mon 08:00","18s","ok","6 accounts","€0.01"]]},
  {id:"o5", name:"Offer approval routing", kind:"automation", owner:"Clodagh Reilly", ownerKind:"person", initials:"CR", agendaTime:"Live",
   trigger:"Offer drafted", triggerKind:"event", next:"Event-based", last:"1 waiting on Deirdre Foley", status:"healthy", rate:100, on:true,
   what:"Sends every drafted offer to the employer's named approver and keeps it hidden from the candidate until it is approved and sent.",
   why:"Offers were reaching candidates before finance had seen them.",
   saved:"6 hours a month",
   steps:[["Trigger","An employer drafts an offer"],["Find","The approver for that employer"],["Check","Hide the draft from the candidate"],["Approval","The named approver decides","gate"],["Update","Release the offer for the employer to send"]],
   runs:[["Mon 16 Nov","2s","ok","Declan Murphy, General Manager","€0.00"],["Thu 12 Nov","2s","ok","Sarah Kavanagh, Grand Canal","€0.00"],["Mon 9 Nov","2s","ok","Sarah Kavanagh, General Manager","€0.00"]]},
  {id:"o6", name:"Partner referral reconciliation", kind:"report", owner:"Growth & Partnerships", ownerKind:"agent", initials:"GP", agendaTime:"07:00",
   trigger:"1st of the month, 07:00", triggerKind:"schedule", next:"1 Dec 07:00", last:"Delivered 1 Nov", status:"healthy", rate:95, on:true,
   what:"Matches course enrolments from Recruit referrals against each partner's proposed share and drafts the monthly statement. Partners are concepts; nothing is invoiced.",
   why:"Partner shares were tracked in a spreadsheet nobody owned.",
   saved:"8 hours a month",
   steps:[["Trigger","First of the month at 07:00"],["Find","Enrolments from Recruit referrals"],["Check","Apply each partner's proposed share"],["Draft","Write the partner statement"],["Approval","Fergal Nash reviews","gate"]],
   runs:[["1 Nov 07:00","1m 12s","ok","5 partners","€0.04"],["1 Oct 07:00","1m 08s","ok","4 partners","€0.04"]]},
  {id:"o7", name:"CV structuring", kind:"automation", owner:"Profile Intelligence", ownerKind:"agent", initials:"PI", agendaTime:"Live",
   trigger:"CV uploaded", triggerKind:"event", next:"Event-based", last:agentById("profile").runsToday + " today", status:"healthy", rate:97, on:true,
   what:"Turns each uploaded CV into a structured profile draft and lists the evidence still missing. Self-reported stays self-reported.",
   why:"Profiles were half-empty, so matching missed good people.",
   saved:"60 hours a month",
   steps:[["Trigger","A professional uploads a CV"],["Find","Experience, skills and qualifications"],["Draft","Structured profile and career timeline"],["Check","Flag items to verify"],["Update","Save the draft for the candidate to confirm"]],
   runs:[["Today 09:52","6s","ok","1 CV","€0.01"],["Today 07:58","7s","ok","1 CV","€0.01"],["Yesterday 18:20","6s","ok","1 CV","€0.01"]]},
  {id:"o8", name:"Weekly marketplace review", kind:"report", owner:"Briefing Agent", ownerKind:"agent", initials:"BA", agendaTime:"08:00",
   trigger:"Mon, 08:00", triggerKind:"schedule", next:"Mon 08:00", last:"Shared with 7 leads", status:"healthy", rate:98, on:true,
   what:"One page for Monday's team meeting: vacancies at risk, pipelines that moved, revenue and verification.",
   why:"The meeting used to start with twenty minutes of people reading their own screens.",
   saved:"6 hours a month",
   steps:[["Trigger","Every Monday at 08:00"],["Find","Last week's numbers from every team"],["Check","Flag anything moving more than 10%"],["Draft","Write the one-page review"],["Send","Share with the HQ team"]],
   runs:[["Mon 16 Nov 08:00","1m 12s","ok","7 recipients","€0.04"],["Mon 9 Nov 08:00","1m 04s","ok","7 recipients","€0.04"]]},
  {id:"o9", name:"Market range refresh", kind:"routine", owner:"Market Value Analyst", ownerKind:"agent", initials:"MV", agendaTime:"08:15",
   trigger:"Daily, 08:15", triggerKind:"schedule", next:"Tomorrow 08:15", last:"1,120 profiles", status:"healthy", rate:100, on:true,
   what:"Re-estimates market ranges for every profile that changed, from the illustrative benchmark set. Every figure is labelled an estimate.",
   why:"Stale salary ranges undermine trust faster than anything else.",
   saved:"20 hours a month",
   steps:[["Trigger","Every day at 08:15"],["Find","Profiles that changed since the last run"],["Check","The benchmark set for role and region"],["Update","Refresh the estimated range"]],
   runs:[["Today 08:15","3m 10s","ok","1,120 profiles","€0.09"],["Yesterday 08:15","3m 02s","ok","1,094 profiles","€0.09"]]},
  {id:"o10", name:"Career explorer reports", kind:"routine", owner:"Career Pathfinder", ownerKind:"agent", initials:"CP", agendaTime:"07:30",
   trigger:"Weekly, and on request", triggerKind:"event", next:"On request", last:"640 reports", status:"healthy", rate:99, on:true,
   what:"Maps transferable skills to adjacent roles and names the gaps worth closing. It suggests options and never predicts outcomes.",
   why:"Professionals ready to change sector had no way to see where they fit.",
   saved:"15 hours a month",
   steps:[["Trigger","Weekly, and when a candidate asks"],["Find","Transferable skills"],["Check","Adjacent roles and partner courses"],["Draft","The career explorer report"]],
   runs:[["Today 07:30","2m 44s","ok","640 profiles","€0.06"]]},
  {id:"o11", name:"Commission statement", kind:"report", owner:"Michael Tierney", ownerKind:"person", initials:"MT", agendaTime:"17:00",
   trigger:"Last working day, 17:00", triggerKind:"schedule", next:"Mon 30 Nov 17:00", last:"Delivered 30 Oct", status:"healthy", rate:95, on:true,
   what:"Assembles success fees, membership revenue and partner shares for the month, with the variance commentary.",
   why:"Month-end took three days of copying between spreadsheets.",
   saved:"16 hours a month",
   steps:[["Trigger","Last working day at 17:00"],["Find","Placements, memberships and partner shares"],["Check","Match fees to invoices"],["Draft","The variance commentary"],["Approval","John signs off","gate"],["Send","Add to the board pack"]],
   runs:[["Fri 30 Oct 17:00","3m 42s","ok","1 pack","€0.09"],["Wed 30 Sep 17:00","3m 51s","ok","1 pack","€0.09"]]},
  {id:"o12", name:"Pricing validation calls", kind:"task", owner:"John O'Farrell", ownerKind:"person", initials:"JO", agendaTime:"16:00",
   trigger:"Tue and Thu, 16:00", triggerKind:"schedule", next:"Thu 16:00", last:"2 calls prepared", status:"healthy", rate:100, on:true,
   what:"Books the next hotel general managers in the pricing validation round and prepares a one-page brief for each call.",
   why:"Pricing for the middle tiers is still a concept assumption, so every call counts.",
   saved:"4 hours a month",
   steps:[["Trigger","Tuesdays and Thursdays at 16:00"],["Find","The next GMs in the validation round"],["Draft","A one-page brief for each call"],["Update","Log feedback against the pricing model"]],
   runs:[["Tue 17 Nov 16:00","22s","ok","2 calls prepared","€0.02"],["Thu 12 Nov 16:00","20s","ok","2 calls prepared","€0.02"]]}
];

const OPS_FILTERS = [
  ["all","All"], ["routine","Agent routines"], ["automation","Automations"],
  ["report","Scheduled reports"], ["task","Recurring tasks"], ["approval","Needs approval"], ["failed","Failed"]
];

const WORK_SECTIONS = [
  {id:"tasks", label:"Tasks", blurb:"Everything assigned to you or the HQ team, in one list.",
   views:["All tasks","Due tasks","Review","Done"], filters:["Due date","Any status","Anyone","Any due date"]},
  {id:"approvals", label:"Approvals", blurb:"Decisions waiting on you. Every decision is written as the person who made it.",
   views:["Awaiting you","Awaiting others","Decided"], filters:["Raised date","Any value","Anyone"]},
  {id:"workflows", label:"Workflows", blurb:"Automations and agent routines: what runs on its own, and who owns it.",
   views:[], filters:[]},
  {id:"schedules", label:"Schedules", blurb:"The HQ calendar: when recurring work fires and what it costs the week.",
   views:[], filters:[]}
];

const WORK_TASKS = [
  {id:"w1", title:"Find a shortlist for Fenwick & Vale's Operations Director", status:"In progress", priority:"High", who:"OB",
   due:FV_OPS.postedDays + " days open", late:true, client:"Fenwick & Vale Hospitality", day:"Today", mins:"45 mins", view:"Due tasks"},
  {id:"w2", title:"Approve the 10% executive commission rule", status:"Review", priority:"High", who:"JO",
   due:"Due today", late:false, client:"Commission rules", day:"Today", mins:"15 mins", view:"Review"},
  {id:"w3", title:"Chase the Cedarhouse placement invoice (" + eur(CEDAR_PL.salary * CEDAR_PL.feeRate) + ")", status:"In progress", priority:"Medium", who:"MT",
   due:"6 days overdue", late:true, client:"Cedarhouse Hotels", day:"Today", mins:"20 mins", view:"Due tasks"},
  {id:"w4", title:"Clear the " + VERIFY_OLD + " verification checks older than 5 days", status:"In progress", priority:"High", who:"YH",
   due:"Due Friday", late:false, client:"Talent Verification", day:"Fri", mins:"Ongoing", view:"All tasks"},
  {id:"w5", title:"Call Saltmarsh Bay Resort before the 6 Dec renewal", status:"Not started", priority:"Medium", who:"OB",
   due:"Due Thursday", late:false, client:"Saltmarsh Bay Resort", day:"Thu", mins:"30 mins", view:"All tasks"},
  {id:"w6", title:"Review the Leeside College proposal before it goes out", status:"Review", priority:"Medium", who:"JO",
   due:"Due Friday", late:false, client:"Leeside College", day:"Fri", mins:"30 mins", view:"Review"},
  {id:"w7", title:"Guest list for the Dublin hotel leaders breakfast", status:"Not started", priority:"Low", who:"JO",
   due:"No due date", late:false, client:"Public launch", day:"Any day", mins:"1 hour", view:"All tasks"},
  {id:"w8", title:"Renew Corrib Point Hotel's Growth membership", status:"Done", priority:"Medium", who:"OB",
   due:"Done today", late:false, client:"Corrib Point Hotel", day:"Today", mins:"10 mins", view:"Done", done:true}
];

/* Not drawn by the current views; kept in Recruit's own terms. */
const WORKFLOWS = [
  {name:"Vacancy exception watch", state:"live", trigger:"schedule · hourly",
   actions:[["exceptions.raise","write"],["notify.inbox","write"]], lastRun:"Today 09:40",
   result:"5 exceptions raised", resultKind:"ok", runSummary:"14 ok",
   runs:["ok","ok","ok","ok","ok","ok","ok","ok","ok","ok","ok","ok","ok","ok"]},
  {name:"Offer approval routing", state:"live", trigger:"event · offer.drafted",
   actions:[["approvals.route","read"],["notify.inbox","write"]], lastRun:"Mon 16 Nov",
   result:"ok", resultKind:"ok", runSummary:"14 ok",
   runs:["ok","ok","ok","ok","ok","ok","ok","ok","ok","ok","ok","ok","ok","ok"]},
  {name:"Renewal reminders", state:"live", trigger:"schedule · daily 08:00",
   actions:[["email.draft","write"]], lastRun:"Today 08:00",
   result:RENEWALS_30 + " drafts waiting", resultKind:"warn", runSummary:"12 ok · 2 partial",
   runs:["ok","ok","ok","partial","ok","ok","ok","ok","ok","ok","ok","ok","ok","partial"]},
  {name:"Verification chase", state:"failing", trigger:"schedule · every 30 minutes",
   actions:[["issuer.request","external"]], lastRun:"Today 09:05",
   result:"issuer not connected · manual queue", resultKind:"bad", runSummary:"11 ok · 2 partial · 1 failed",
   runs:["ok","ok","ok","ok","partial","ok","ok","ok","ok","ok","ok","failed","ok","partial"]}
];

const SCHEDULES = [
  {id:"s1", name:"Morning briefing", cadence:"Every weekday · 07:00", next:"Tomorrow 07:00", owner:"Briefing Agent", on:true, day:1},
  {id:"s2", name:"Market range refresh", cadence:"Daily · 08:15", next:"Tomorrow 08:15", owner:"Market Value Analyst", on:true, day:1},
  {id:"s3", name:"Verification chase", cadence:"Every 30 minutes", next:"10:05", owner:"Verification Agent", on:true, day:0},
  {id:"s4", name:"Weekly marketplace review", cadence:"Mondays · 08:00", next:"Mon 08:00", owner:"Briefing Agent", on:true, day:0},
  {id:"s5", name:"Commission statement", cadence:"Last working day · 17:00", next:"Mon 30 Nov 17:00", owner:"Michael Tierney", on:true, day:4}
];

const WIDGET_DEFS = [["inbox","Action inbox"],["work","My work"],["activity","Activity"],["kpi","Today's numbers"],["visits","Hiring this week"]];
const WORK_WIDGETS = [
  {id:"queue", label:"My queue", value:"5", hint:"assigned to you", icon:"work", queue:"mine"},
  {id:"late", label:"Running late", value:"2", hint:"past their due date", icon:"health", queue:"overdue"},
  {id:"unassigned", label:"Unassigned", value:"1", hint:"nobody owns it yet", icon:"teams", queue:"unassigned"},
  {id:"week", label:"Next 7 days", value:"4", hint:"due this week", icon:"visits", queue:"upcoming"}
];
const PERSONALITIES = ["Straight-talking","Warm","Formal","Dry"];
const ANSWER_STYLES = ["Short answers","Show the working","Ask before acting"];
/* Every context source and every registered tool an agent could be granted. */
const CONTEXT_DEFS = [
  ["Candidates","records","Profiles, skills and verification"],
  ["Employers","records","Accounts, tiers and engagement"],
  ["Vacancies","records","Open roles and pipelines"],
  ["Offers","work","Drafts, approvals and responses"],
  ["Interviews","work","Bookings and panels"],
  ["Approvals","work","What is waiting on a decision"],
  ["Memberships","money","Tiers, renewals and spend"],
  ["Success fees","money","Placements and invoices"],
  ["Partner shares","money","Referrals and enrolments"],
  ["Activity log","system","Every event, agent and human"],
  ["Courses","system","Partner courses and enrolments"],
  ["Insights","system","Saved metrics and trends"]
];
const CONTEXT_SOURCES = CONTEXT_DEFS.map(c => c[0]);
const SKILL_DEFS = [
  ["Search records","read"],["Summarise activity","read"],["Read profiles","read"],
  ["Read vacancies","read"],["Check permissions","read"],
  ["Draft email","write"],["Create task","write"],["Update record","write"],
  ["Suggest a pipeline addition","write"],["Raise approval","write"],
  ["Send email","external"],["Request an issuer check","external"],["Book a calendar slot","external"],["Push to CRM","external"]
];
const TRAIN_PHASES = [
  ["Reading the whole ontology", num(MARKET.registeredProfessionals) + " profiles"],
  ["Learning how Recruit words things", "vacancy, not job"],
  ["Researching the hospitality hiring market", "12 sources"],
  ["Writing its own system prompt", "1,240 tokens"]
];
/* The two questions the agent asks back once it knows the job. */
const BRIEF_QUESTIONS = [
  {title:"What should it cover?", sub:"Pick as many as you like. You can refine it later.",
   options:[["Vacancies","Roles that stopped moving"],["Candidates","Profiles and verification"],
            ["Employers","Accounts, renewals and spend"],["Revenue","Fees, memberships and partner shares"],
            ["Something else","Tell me in the next message"]]},
  {title:"When should it land?", sub:"One is enough to start.",
   options:[["Every morning 07:00","Before the first call"],["Weekdays 08:00","Monday to Friday only"],
            ["Only when something changes","Event-driven, no noise"],["On demand","When you ask for it"]]}
];

/* The words under a name, keyed to the same state the face lights with. */
const STATE_LABELS = {working:"working", thinking:"thinking", waiting:"waiting on you",
  complete:"up to date", attention:"needs you", idle:"idle"};

const FACE_SHAPES = [
  ["crown-pebble","Pebble"],["executive-capsule","Executive"],["shield","Shield"],
  ["glass-visor","Visor"],["control-cube","Control cube"],["low-dome","Low dome"],
  ["offset-pebble","Offset pebble"],["rim-capsule","Capsule"],["wide-eyed","Wide-eyed"],
  ["precision-brow","Precision brow"],["tall-unit","Tall unit"],["soft-asymmetric","Soft asymmetric"]
];
/* Shell colours only, deliberately desaturated so none of them reads as a
   state. Each is a pair: the deep shell for light themes and its pale partner
   for dark ones (the eyes take the other). The status light carries the state. */
const FACE_TINTS = [
  ["#191c1f","Graphite","#e3e6e8"],["#1b2430","Slate","#d3dde9"],["#241b2e","Aubergine","#ddd4ea"],
  ["#2a2118","Bronze","#eadccb"],["#16241f","Pine","#d1e4da"],["#2b1b1e","Oxblood","#eed5d7"]
];

/* ---- ontology graph: generation, Dijkstra traversal, canvas render ---- */
/* Recruit's eight record families. Same spread of angles and the same total
   leaf count as before, so the graph keeps its shape and cost. */
const CLUSTERS = [
  ["Candidates",     "#7b93ff", 0.00, 0.62, 58],
  ["Employers",      "#2dd4bf", 0.90, 0.70, 44],
  ["Vacancies",      "#f0a33e", 1.75, 0.66, 46],
  ["Skills",         "#c8b4f0", 2.55, 0.72, 52],
  ["Qualifications", "#7fd0f0", 3.35, 0.60, 38],
  ["Placements",     "#f07a9d", 4.15, 0.70, 34],
  ["Courses",        "#a8e0c0", 4.95, 0.64, 30],
  ["Offers",         "#e6c78a", 5.65, 0.72, 40]
];

function mulberry(seed){
  return function(){
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

/* Hub-and-spoke clusters around a dense phyllotaxis core, in unit space
   (-1..1 on both axes) so the layout is resolution independent. */
const _hexCache = {};
function hexRGB(hex){
  if (_hexCache[hex]) return _hexCache[hex];
  const h = hex.replace("#", "");
  const v = [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  _hexCache[hex] = v;
  return v;
}


function buildGraph(){
  const rnd = mulberry(20260902);
  const nodes = [], edges = [], adj = [];
  const add = (x, y, z, r, cluster, kind) => {
    nodes.push({x, y, z, r, cluster, kind}); adj.push([]); return nodes.length - 1;
  };
  const link = (a, b) => {
    const dx = nodes[a].x - nodes[b].x, dy = nodes[a].y - nodes[b].y, dz = nodes[a].z - nodes[b].z;
    const w = Math.sqrt(dx * dx + dy * dy + dz * dz) + 0.004;
    const id = edges.length;
    edges.push({a, b, w});
    adj[a].push([b, w, id]); adj[b].push([a, w, id]);
  };

  // the core is a filled sphere on a Fibonacci lattice, not a disc
  const CORE = 880, coreIds = [];
  for (let i = 0; i < CORE; i++){
    const t = (i + 0.5) / CORE;
    const phi = Math.acos(1 - 2 * t);
    const theta = i * 2.39996;
    const shell = 0.16 + 0.28 * Math.pow(rnd(), 0.5);
    const grade = rnd();
    coreIds.push(add(
      Math.sin(phi) * Math.cos(theta) * shell * 1.04,
      Math.cos(phi) * shell * 0.96,
      Math.sin(phi) * Math.sin(theta) * shell,
      grade < 0.06 ? 3.4 + rnd() * 1.4 : grade < 0.3 ? 2.1 + rnd() * 0.7 : 1.0 + rnd() * 0.8, 0, "core"));
  }
  // lattice neighbours plus a mesh of chords, so the sphere reads as a volume
  for (let i = 1; i < coreIds.length; i++){
    link(coreIds[i], coreIds[i - 1]);
    if (i >= 13) link(coreIds[i], coreIds[i - 13]);
    if (i >= 21 && i % 2 === 0) link(coreIds[i], coreIds[i - 21]);
    if (i >= 34 && i % 3 === 0) link(coreIds[i], coreIds[i - 34]);
    if (i >= 55 && i % 4 === 0) link(coreIds[i], coreIds[i - 55]);
    if (i >= 89 && i % 5 === 0) link(coreIds[i], coreIds[i - 89]);
    if (i % 6 === 0) link(coreIds[i], coreIds[Math.floor(rnd() * coreIds.length)]);
  }

  // a mid shell between the nucleus and the lobes: the layer that makes it
  // read as a network rather than a ball with satellites
  const MID = 560, midIds = [];
  for (let i = 0; i < MID; i++){
    const t = (i + 0.5) / MID;
    const phi = Math.acos(1 - 2 * t), theta = i * 2.39996 + 0.7;
    const d = 0.52 + 0.16 * Math.pow(rnd(), 0.6);
    const g2 = rnd();
    midIds.push(add(
      Math.sin(phi) * Math.cos(theta) * d * 1.02,
      Math.cos(phi) * d * 0.96,
      Math.sin(phi) * Math.sin(theta) * d,
      g2 < 0.05 ? 2.6 + rnd() * 1.0 : g2 < 0.3 ? 1.6 + rnd() * 0.6 : 0.8 + rnd() * 0.7, 0, "core"));
  }
  for (let i = 0; i < midIds.length; i++){
    if (i >= 1) link(midIds[i], midIds[i - 1]);
    if (i >= 17) link(midIds[i], midIds[i - 17]);
    if (i >= 29 && i % 2 === 0) link(midIds[i], midIds[i - 29]);
    // radial spokes tying the shell to the nucleus
    if (i % 2 === 0) link(midIds[i], coreIds[Math.floor(rnd() * coreIds.length)]);
    if (i % 9 === 0) link(midIds[i], coreIds[Math.floor(rnd() * coreIds.length)]);
  }

  // clusters ride a sphere: each hub gets its own latitude as well as longitude
  const hubs = [], clusterLeaves = [];
  const onSphere = (lon, lat, d0) => { const d = d0 * 1.22;
    return [Math.cos(lat) * Math.cos(lon) * d * 1.02, Math.sin(lat) * d * 0.96, Math.cos(lat) * Math.sin(lon) * d]; };
  CLUSTERS.forEach((c, ci) => {
    const [, , ang, dist, leaves] = c;
    const lat = (ci % 2 ? 1 : -1) * (0.26 + rnd() * 0.5);
    const wob = 1.06 + rnd() * 0.16;
    const hp = onSphere(ang, lat, dist * wob);
    const hub = add(hp[0], hp[1], hp[2], 5.4, ci, "hub");
    hubs.push(hub);
    const mine = [];
    clusterLeaves.push(mine);
    for (let k = 0; k < 3; k++) link(hub, coreIds[Math.floor(rnd() * coreIds.length)]);
    for (let k = 0; k < 5; k++) link(hub, midIds[Math.floor(rnd() * midIds.length)]);

    const subs = 5 + Math.floor(rnd() * 4);
    const subIds = [];
    for (let s = 0; s < subs; s++){
      const sa = ang + (rnd() - 0.5) * 0.52, sl = lat + (rnd() - 0.5) * 0.3;
      const sd = dist + 0.08 + rnd() * 0.18;
      const sp = onSphere(sa, sl, sd);
      const sub = add(sp[0], sp[1], sp[2], 3.2, ci, "sub");
      subIds.push(sub);
      link(sub, hub);
      if (s > 0 && rnd() < 0.7) link(sub, subIds[s - 1]);
      const fan = Math.floor((leaves * 7.4) / subs);
      const spread = 0.17 + rnd() * 0.2;
      let prev = -1;
      for (let l = 0; l < fan; l++){
        const la = sa + (rnd() - 0.5) * spread * 2 + (rnd() - 0.5) * 0.06;
        const ll = sl + (rnd() - 0.5) * spread * 1.1;
        const ld = sd + 0.03 + Math.pow(rnd(), 0.8) * 0.17;
        const lp = onSphere(la, ll, ld);
        const lg = rnd();
        const leaf = add(lp[0], lp[1], lp[2],
          lg < 0.08 ? 2.8 + rnd() * 1.2 : lg < 0.34 ? 1.8 + rnd() * 0.6 : 1.0 + rnd() * 0.7, ci, "leaf");
        link(leaf, sub);
        mine.push(leaf);
        if (rnd() < 0.14) link(leaf, hub);
        if (prev >= 0 && rnd() < 0.34) link(leaf, prev);
        if (rnd() < 0.16) link(leaf, midIds[Math.floor(rnd() * midIds.length)]);
        prev = leaf;
      }
    }
  });
  // far satellites hanging off the outer leaves
  CLUSTERS.forEach((c, ci) => {
    const [, , ang, dist] = c;
    for (let s = 0; s < 7; s++){
      const sa = ang + (rnd() - 0.5) * 1.5, sl = (rnd() - 0.5) * 1.3;
      const sd = dist + 0.42 + rnd() * 0.22;
      const ap = onSphere(sa, sl, sd);
      const anchor = add(ap[0], ap[1], ap[2], 2.4, ci, "sub");
      link(anchor, hubs[ci]);
      const n = 14 + Math.floor(rnd() * 18);
      for (let l = 0; l < n; l++){
        const la = sa + (rnd() - 0.5) * 0.9, ll = sl + (rnd() - 0.5) * 0.7;
        const ld = sd + 0.02 + Math.pow(rnd(), 0.8) * 0.18;
        const p = onSphere(la, ll, ld);
        const leaf = add(p[0], p[1], p[2], 0.8 + rnd() * 0.9, ci, "leaf");
        link(leaf, anchor);
        clusterLeaves[ci].push(leaf);
      }
    }
  });

  // two hub rings and long chords across the sphere
  hubs.forEach((h, i) => {
    link(h, hubs[(i + 1) % hubs.length]);
    link(h, hubs[(i + 2) % hubs.length]);
    if (i % 3 === 0) link(h, hubs[(i + 4) % hubs.length]);
  });
  // neighbouring clusters share records, so their leaves cross-link
  for (let ci = 0; ci < clusterLeaves.length; ci++){
    const a = clusterLeaves[ci], b = clusterLeaves[(ci + 1) % clusterLeaves.length];
    const n = 26 + Math.floor(rnd() * 16);
    for (let k = 0; k < n; k++){
      link(a[Math.floor(rnd() * a.length)], b[Math.floor(rnd() * b.length)]);
    }
    // and a good number reach right across to the far side
    for (let k = 0; k < 12; k++){
      const far = clusterLeaves[(ci + 3) % clusterLeaves.length];
      link(a[Math.floor(rnd() * a.length)], far[Math.floor(rnd() * far.length)]);
    }
    for (let k = 0; k < 8; k++){
      const far = clusterLeaves[(ci + 4) % clusterLeaves.length];
      link(a[Math.floor(rnd() * a.length)], far[Math.floor(rnd() * far.length)]);
    }
  }

  let minX = 1e9, maxX = -1e9, minY = 1e9, maxY = -1e9, minZ = 1e9, maxZ = -1e9;
  for (const n of nodes){
    if (n.x < minX) minX = n.x; if (n.x > maxX) maxX = n.x;
    if (n.y < minY) minY = n.y; if (n.y > maxY) maxY = n.y;
    if (n.z < minZ) minZ = n.z; if (n.z > maxZ) maxZ = n.z;
  }
  const bounds = {minX, maxX, minY, maxY, cx:(minX + maxX) / 2, cy:(minY + maxY) / 2,
    cz:(minZ + maxZ) / 2, w:maxX - minX, h:maxY - minY, d:maxZ - minZ,
    radius: Math.max(maxX - minX, maxY - minY, maxZ - minZ) / 2,
    reach: nodes.reduce((m, n) => Math.max(m, Math.sqrt(n.x * n.x + n.y * n.y + n.z * n.z)), 0)};
  return {nodes, edges, adj, hubs, coreIds, bounds};
}


export {
  INK,
  BODY,
  DIM,
  FAINT,
  LIME,
  GREEN,
  AMBER,
  RED,
  NEUTRAL,
  MONO,
  ICONS,
  REC_SECTIONS,
  CONTACTS,
  FILE_TREE,
  ONTO_NODES,
  ONTO_EDGES,
  REC_TEMPLATES,
  REC_TEMPLATE_CATS,
  PEOPLE,
  ROLE_LEVELS,
  PERM_KEYS,
  GRANT_DEFS,
  ROLE_SCOPES,
  DEFAULT_PERMS,
  INTEGRATIONS,
  BG_DEFS,
  THEMES,
  ADMIN_ICONS,
  ADMIN_CARDS,
  ADMIN_GROUPS,
  SRC_TINT,
  SRC_ABBR,
  HIRING_EVENTS,
  PROFILE_EVENTS,
  FINANCIAL_EVENTS,
  STREAM_DEFS,
  NAV,
  ITEMS,
  ORDER,
  ANSWERS,
  SCRIPTED_QUESTIONS,
  synthesizeCustomArea,
  pickAnswer,
  ORGS,
  TEAMS,
  LOCATIONS,
  AGENT_DEFS,
  KPI_DEFS,
  ASPECT_DEFS,
  FILTER_GROUPS,
  OPS_DEFS,
  OPS_FILTERS,
  WORK_SECTIONS,
  WORK_TASKS,
  WORKFLOWS,
  SCHEDULES,
  WIDGET_DEFS,
  WORK_WIDGETS,
  PERSONALITIES,
  ANSWER_STYLES,
  CONTEXT_DEFS,
  CONTEXT_SOURCES,
  SKILL_DEFS,
  TRAIN_PHASES,
  BRIEF_QUESTIONS,
  STATE_LABELS,
  FACE_SHAPES,
  FACE_TINTS,
  CLUSTERS,
  mulberry,
  _hexCache,
  hexRGB,
  buildGraph
};
