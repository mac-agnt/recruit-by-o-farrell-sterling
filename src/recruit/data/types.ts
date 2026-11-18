/* Shared types for the Recruit demo. Every record has a stable id and related
   records point at those ids, so one change shows up in every portal. */

export type Verification = "verified" | "self" | "pending";
export type Availability = "Actively looking" | "Open to offers" | "Passive" | "Not looking";
export type Visibility = "discoverable" | "anonymous" | "hidden";

export interface Skill { name: string; level: number; verification: Verification }
export interface Qualification { name: string; issuer: string; year: number; verification: Verification }
export interface Experience {
  role: string; org: string; orgPublic: string; location: string;
  from: string; to: string; summary: string; achievements: string[]; verification: Verification;
}
export interface IndexBreakdown { experience: number; skills: number; leadership: number; qualifications: number; evidence: number }

export interface Candidate {
  id: string;
  name: string;
  initials: string;
  tint: string;
  title: string;
  /** Anonymised description of the current employer, shown before consent. */
  currentOrgPublic: string;
  /** Named employer, only shown once the candidate shares contact details. */
  currentOrg: string;
  sector: string;
  industry: string;
  location: string;
  region: string;
  years: number;
  salaryCurrent: number;
  salaryExpectation: [number, number];
  marketRange: [number, number];
  recruitIndex: number;
  breakdown: IndexBreakdown;
  availability: Availability;
  noticeWeeks: number;
  visibility: Visibility;
  teamSize: number;
  summary: string;
  skills: Skill[];
  transferable: string[];
  qualifications: Qualification[];
  experience: Experience[];
  achievements: string[];
  preferredRoles: string[];
  interests: string[];
  languages: string[];
  volunteer: string[];
  completeness: number;
  verifiedCredentials: number;
  joined: string;
  email: string;
  phone: string;
  status: "active" | "placed";
  /** Story personas get the deepest data. */
  story?: "aoife" | "sarah" | "mark";
}

export interface Employer {
  id: string;
  name: string;
  short: string;
  initials: string;
  tint: string;
  sector: string;
  industry: string;
  location: string;
  employees: number;
  tier: number;
  memberSince: string;
  renewal: string;
  membershipStatus: "active" | "renewal due" | "trial" | "lapsed";
  verified: boolean;
  contact: string;
  contactRole: string;
  hotels?: number;
  spendYtd: number;
  placementsYtd: number;
  engagement: number;
  health: "healthy" | "watch" | "at risk";
  note: string;
}

export interface Vacancy {
  id: string;
  employerId: string;
  title: string;
  department: string;
  location: string;
  region: string;
  salary: [number, number];
  type: string;
  seniority: "Executive" | "Senior" | "Manager" | "Supervisor";
  postedDays: number;
  status: "open" | "paused" | "filled" | "draft";
  required: string[];
  preferred: string[];
  qualifications: string[];
  minYears: number;
  start: string;
  responsibilities: string[];
  summary: string;
  /** Aggregate matches in the simulated marketplace (sample records are a subset). */
  marketMatches: number;
  applicants: number;
  created?: boolean;
}

export type Stage = "identified" | "shortlisted" | "contact" | "interview" | "offer" | "hired";

export interface PipelineEntry {
  id: string;
  vacancyId: string;
  candidateId: string;
  stage: Stage;
  source: "search" | "applied" | "agent" | "referral";
  updated: string;
  note?: string;
}

export interface Application {
  id: string;
  candidateId: string;
  vacancyId: string;
  status: "submitted" | "viewed" | "interview" | "offer" | "unsuccessful" | "withdrawn";
  date: string;
  note?: string;
}

export interface Interview {
  id: string;
  vacancyId: string;
  candidateId: string;
  when: string;
  format: "In person" | "Video" | "Phone";
  panel: string[];
  round: number;
  status: "scheduled" | "completed";
}

export interface OfferEvent { when: string; who: string; text: string; kind: "system" | "employer" | "candidate" | "approval" }

export interface Offer {
  id: string;
  vacancyId: string;
  employerId: string;
  candidateId: string;
  title: string;
  salary: number;
  bonus: string;
  benefits: string[];
  location: string;
  start: string;
  expires: string;
  status: "draft" | "awaiting approval" | "approved" | "sent" | "changes requested" | "accepted" | "declined" | "withdrawn";
  /** Drafts are invisible to the candidate until they are sent. */
  visibleToCandidate: boolean;
  history: OfferEvent[];
  approver?: string;
  contingency?: boolean;
}

export interface Placement {
  id: string;
  candidateId: string;
  employerId: string;
  vacancyId: string;
  salary: number;
  feeRate: number;
  date: string;
  startDate: string;
  invoice: "paid" | "invoiced" | "pending" | "overdue";
}

export interface Partner {
  id: string;
  name: string;
  short: string;
  initials: string;
  tint: string;
  kind: string;
  location: string;
  status: string;
  courses: number;
  referrals: number;
  enrolments: number;
  revenueShare: number;
  note: string;
}

export interface Course {
  id: string;
  partnerId: string;
  title: string;
  category: string;
  level: string;
  duration: string;
  format: string;
  price: number;
  memberDiscount: number;
  skills: string[];
  roles: string[];
  impact: [number, number];
  credential: string;
  starts: string;
  summary: string;
  modules: string[];
  recommendedFor: string[];
  enrolled: number;
  rating: number;
}

export interface Enrolment { id: string; candidateId: string; courseId: string; date: string; status: "enrolled" | "in progress" | "completed"; progress: number }

export type ActivityCategory = "hiring" | "profiles" | "financial" | "learning" | "agents" | "growth";

export interface ActivityEvent {
  id: string;
  at: number;
  when: string;
  category: ActivityCategory;
  actor: string;
  title: string;
  detail: string;
  refs: string[];
  status?: "completed" | "awaiting" | "failed" | "working";
}

export interface IntroRequest { id: string; vacancyId: string; candidateId: string; status: "pending" | "accepted" | "declined"; date: string }

export interface MessageThread {
  id: string;
  with: string;
  withRole: string;
  initials: string;
  tint: string;
  subject: string;
  unread: boolean;
  refs: string[];
  messages: { from: "them" | "me"; text: string; when: string }[];
}
