/* Recruit's eight agents. Runs and outputs are scripted demo fixtures: no
   agent here calls a live model or takes a real external action. */

export interface RecruitAgent {
  id: string;
  name: string;
  shape: string;
  tint: string;
  state: "working" | "thinking" | "waiting" | "complete" | "attention" | "idle";
  role: string;
  description: string;
  responsibilities: string[];
  outputs: string[];
  related: { label: string; kind: string; ref: string }[];
  recommendations: { text: string; action: string; go: { page: string; tab?: string } }[];
  guardrail: string;
  runsToday: number;
  successRate: number;
  lastRun: string;
  schedule: string;
}

export const RECRUIT_AGENTS: RecruitAgent[] = [
  { id: "briefing", name: "Briefing Agent", shape: "crown-pebble", tint: "#1b2430", state: "complete",
    role: "Writes John's morning briefing across the whole marketplace",
    description: "Reads roles, candidates, revenue, placements, verification and growth overnight, then tells John the few things that need a decision.",
    responsibilities: ["Summarise overnight marketplace movement", "Flag exceptions worth a decision", "Track progress to the talent network target"],
    outputs: ["Morning briefing on Home", "Weekly founder summary"],
    related: [{ label: "Harbourview Grand Hotel", kind: "Employer", ref: "e-harbourview" }, { label: "General Manager", kind: "Vacancy", ref: "v-hv-gm" }],
    recommendations: [{ text: "Approve the revised 8% commission rule before the Group tier pilot", action: "Open approvals", go: { page: "Work", tab: "approvals" } }],
    guardrail: "Read-only. Never contacts candidates or employers.", runsToday: 1, successRate: 100, lastRun: "07:00", schedule: "Weekdays at 07:00" },
  { id: "ops", name: "Ops Watchdog", shape: "shield", tint: "#2b1b1e", state: "attention",
    role: "Spots operational problems before they cost a placement",
    description: "Watches vacancies, introductions, offers, memberships and verification queues for anything stuck.",
    responsibilities: ["Vacancies with no shortlist after 21 days", "Introductions unanswered for 48 hours", "Memberships expiring in 30 days", "Offers waiting on approval", "Verification backlog"],
    outputs: ["Exceptions list", "Escalations to the right team"],
    related: [{ label: "Operations Director, Ireland", kind: "Vacancy", ref: "v-fv-opsd" }, { label: "Saltmarsh Bay Resort", kind: "Employer", ref: "e-saltmarsh" }],
    recommendations: [{ text: "Fenwick & Vale's Operations Director role is 26 days old with no shortlist", action: "Open vacancies", go: { page: "hq.roles", tab: "vacancies" } },
      { text: "23 memberships expire in the next 30 days", action: "Open memberships", go: { page: "hq.employers", tab: "memberships" } }],
    guardrail: "Raises alerts and drafts emails. Sends nothing without a person.", runsToday: 24, successRate: 99, lastRun: "09:40", schedule: "Every hour" },
  { id: "profile", name: "Profile Intelligence", shape: "glass-visor", tint: "#16241f", state: "working",
    role: "Turns CVs into structured, evidence-backed profiles",
    description: "Extracts experience, skills and qualifications from uploaded CVs, builds the career timeline and lists the evidence still missing.",
    responsibilities: ["CV information extraction", "Profile structuring", "Skills identification", "Missing evidence", "Profile improvement suggestions"],
    outputs: ["Structured profile drafts", "Verification checklists", "Improvement suggestions"],
    related: [{ label: "Aoife Byrne", kind: "Candidate", ref: "c-aoife" }],
    recommendations: [{ text: "312 profiles are missing salary expectations, which weakens matching", action: "Open talent", go: { page: "hq.talent", tab: "candidates" } }],
    guardrail: "Never marks a fact as verified. Self-reported stays self-reported.", runsToday: 418, successRate: 97, lastRun: "09:52", schedule: "On every CV upload" },
  { id: "match", name: "Talent Matchmaker", shape: "executive-capsule", tint: "#1b2430", state: "working",
    role: "Explains why a professional may fit a vacancy",
    description: "Ranks profiles for each vacancy and shows the evidence behind every suggestion. It suggests; people decide.",
    responsibilities: ["Rank relevant profiles for each vacancy", "Show supporting evidence", "List areas needing employer judgement"],
    outputs: ["Match explanations", "Suggested additions to pipelines"],
    related: [{ label: "General Manager", kind: "Vacancy", ref: "v-hv-gm" }, { label: "Sarah Kavanagh", kind: "Candidate", ref: "c-sarah" }],
    recommendations: [{ text: "Lucia Ferreira fits Fenwick's Hotel Manager role on lifestyle brand experience", action: "Open pipelines", go: { page: "hq.roles", tab: "pipelines" } }],
    guardrail: "Never rejects anyone and never makes a hiring decision.", runsToday: 326, successRate: 98, lastRun: "09:31", schedule: "On every vacancy change" },
  { id: "value", name: "Market Value Analyst", shape: "control-cube", tint: "#2a2118", state: "complete",
    role: "Builds salary scenarios from illustrative benchmarks",
    description: "Estimates market ranges for each profile and models how qualifications, experience or a move could change them.",
    responsibilities: ["Estimate market ranges", "Model career scenarios", "Find development opportunities"],
    outputs: ["Market value reports", "Scenario estimates"],
    related: [{ label: "Aoife Byrne", kind: "Candidate", ref: "c-aoife" }],
    recommendations: [{ text: "Deputy GM salaries in Dublin moved up 3% this quarter in the benchmark set", action: "Open market intelligence", go: { page: "hq.talent", tab: "market" } }],
    guardrail: "Every figure is labelled an estimate. Never a guarantee.", runsToday: 1120, successRate: 100, lastRun: "08:15", schedule: "Nightly, and on profile change" },
  { id: "path", name: "Career Pathfinder", shape: "offset-pebble", tint: "#241b2e", state: "working",
    role: "Finds where experience can travel",
    description: "Maps transferable skills to adjacent industries and roles, and names the gaps worth closing.",
    responsibilities: ["Transferable-skills mapping", "Adjacent career suggestions", "Development gap analysis"],
    outputs: ["Career explorer reports", "Course suggestions"],
    related: [{ label: "Mark Doyle", kind: "Candidate", ref: "c-mark" }, { label: "Events Operations Director", kind: "Vacancy", ref: "v-nl-eod" }],
    recommendations: [{ text: "Hospitality-to-events moves are up this quarter. Feature it in Career change week.", action: "Open growth", go: { page: "Dashboard", tab: "growth" } }],
    guardrail: "Suggests options, never predicts outcomes.", runsToday: 640, successRate: 99, lastRun: "07:30", schedule: "Weekly, and on request" },
  { id: "verify", name: "Verification Agent", shape: "precision-brow", tint: "#191c1f", state: "waiting",
    role: "Organises verification requests and evidence",
    description: "Sends credential checks to issuers, chases references and keeps the verification queue moving.",
    responsibilities: ["Route credential checks", "Chase references", "Track document status"],
    outputs: ["Verification queue", "Issuer requests"],
    related: [{ label: "Hospitality Skills Board", kind: "Partner", ref: "pt-skills" }],
    recommendations: [{ text: "1,284 profiles wait on verification; 210 are older than 5 days", action: "Open verification", go: { page: "hq.talent", tab: "verification" } }],
    guardrail: "Never marks an unverified fact as verified.", runsToday: 96, successRate: 94, lastRun: "09:05", schedule: "Every 30 minutes" },
  { id: "growth", name: "Growth & Partnerships", shape: "low-dome", tint: "#16241f", state: "thinking",
    role: "Finds partner, candidate and employer growth",
    description: "Watches acquisition funnels, education partner pipelines and employer conversion, and drafts the next experiments.",
    responsibilities: ["Education partner pipeline", "Candidate engagement", "Employer conversion"],
    outputs: ["Growth experiments", "Partner briefs"],
    related: [{ label: "Liffey Institute", kind: "Partner", ref: "pt-liffey" }],
    recommendations: [{ text: "Student pathways converts at 30%. Draft a proposal for Leeside College.", action: "Open partners", go: { page: "hq.learning", tab: "institutions" } }],
    guardrail: "Drafts outreach. People send it.", runsToday: 12, successRate: 100, lastRun: "08:40", schedule: "Daily at 08:30" },
];

export interface AgentRun { id: string; agentId: string; started: string; duration: string; result: "ok" | "partial" | "failed" | "waiting"; records: string; output: string; cost: string }

export const AGENT_RUNS: AgentRun[] = [
  { id: "r1", agentId: "ops", started: "Today 09:40", duration: "14s", result: "ok", records: "326 vacancies, 1,280 accounts", output: "5 exceptions raised", cost: "€0.02" },
  { id: "r2", agentId: "profile", started: "Today 09:52", duration: "6s", result: "ok", records: "1 CV", output: "Profile drafted, 4 items to verify", cost: "€0.01" },
  { id: "r3", agentId: "match", started: "Today 09:31", duration: "22s", result: "ok", records: "General Manager, Harbourview", output: "18 relevant profiles ranked", cost: "€0.03" },
  { id: "r4", agentId: "verify", started: "Today 09:05", duration: "41s", result: "partial", records: "96 checks", output: "71 sent to issuers, 25 waiting on candidate documents", cost: "€0.02" },
  { id: "r5", agentId: "growth", started: "Today 08:40", duration: "1m 02s", result: "ok", records: "6 campaigns, 5 partners", output: "2 experiments drafted", cost: "€0.04" },
  { id: "r6", agentId: "value", started: "Today 08:15", duration: "3m 10s", result: "ok", records: "1,120 profiles", output: "Market ranges refreshed", cost: "€0.09" },
  { id: "r7", agentId: "path", started: "Today 07:30", duration: "2m 44s", result: "ok", records: "640 profiles", output: "Career explorer reports updated", cost: "€0.06" },
  { id: "r8", agentId: "briefing", started: "Today 07:00", duration: "24s", result: "ok", records: "Whole marketplace", output: "Morning briefing posted to Home", cost: "€0.02" },
  { id: "r9", agentId: "ops", started: "Today 08:40", duration: "12s", result: "ok", records: "326 vacancies", output: "4 exceptions raised", cost: "€0.02" },
  { id: "r10", agentId: "verify", started: "Today 08:35", duration: "38s", result: "failed", records: "1 issuer", output: "Issuer endpoint not connected (simulated). Moved to manual queue.", cost: "€0.00" },
  { id: "r11", agentId: "match", started: "Today 08:10", duration: "19s", result: "ok", records: "Regional Guest Experience Director", output: "34 relevant profiles ranked", cost: "€0.03" },
  { id: "r12", agentId: "profile", started: "Today 07:58", duration: "7s", result: "ok", records: "1 CV", output: "Profile drafted, 2 items to verify", cost: "€0.01" },
  { id: "r13", agentId: "ops", started: "Yesterday 17:40", duration: "13s", result: "ok", records: "326 vacancies", output: "Offer approval waiting 24 hours flagged", cost: "€0.02" },
  { id: "r14", agentId: "growth", started: "Yesterday 08:40", duration: "58s", result: "waiting", records: "Partner brief", output: "Leeside proposal drafted, waiting for John", cost: "€0.04" },
  { id: "r15", agentId: "briefing", started: "Yesterday 07:00", duration: "22s", result: "ok", records: "Whole marketplace", output: "Morning briefing posted to Home", cost: "€0.02" },
  { id: "r16", agentId: "value", started: "Yesterday 08:15", duration: "3m 02s", result: "ok", records: "1,094 profiles", output: "Market ranges refreshed", cost: "€0.09" },
];
