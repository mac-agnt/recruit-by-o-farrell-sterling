import { createContext, useContext } from "react";

/* Role-aware navigation. Each experience has its own side rail; every module
   has top-bar tabs. HQ keeps the Pulse locked layout: Home first, Agents
   directly under it (PulseLogic enforces this too). */

export type Role = "public" | "candidate" | "employer" | "hq";
export interface Tab { id: string; label: string }
export interface Mod { page: string; label: string; icon: string; tabs: Tab[]; hint?: string; switchTo?: Role }
export type NavItem = Mod | { divider: true };

const t = (...pairs: [string, string][]): Tab[] => pairs.map(([id, label]) => ({ id, label }));

export const NAVS: Record<Role, NavItem[]> = {
  public: [
    { page: "pub.discover", label: "Discover Recruit", icon: "discover", tabs: t(["overview", "Overview"], ["how", "How it works"], ["pricing", "Membership and pricing"], ["education", "Education partners"], ["preview", "Marketplace preview"]) },
    { divider: true },
    { page: "cand.dashboard", label: "Explore as a candidate", icon: "candidate", tabs: [], switchTo: "candidate" },
    { page: "emp.overview", label: "Explore as an employer", icon: "employer", tabs: [], switchTo: "employer" },
    { page: "Home", label: "Explore Recruit HQ", icon: "hq", tabs: [], switchTo: "hq" },
  ],
  candidate: [
    { page: "cand.dashboard", label: "My dashboard", icon: "home", tabs: t(["overview", "Overview"], ["activity", "My activity"]) },
    { page: "cand.profile", label: "My profile", icon: "profile", tabs: t(["profile", "Professional profile"], ["cv", "CV"], ["verification", "Verification"]) },
    { page: "cand.value", label: "Market value", icon: "value", tabs: t(["value", "My value"], ["breakdown", "Value breakdown"], ["scenarios", "Scenarios"]) },
    { page: "cand.explorer", label: "Career explorer", icon: "explorer", tabs: t(["paths", "Career paths"], ["skills", "Transferable skills"], ["simulator", "Career simulator"]) },
    { page: "cand.jobs", label: "Opportunities", icon: "jobs", tabs: t(["recommended", "Recommended"], ["saved", "Saved jobs"], ["applications", "Applications"]) },
    { page: "cand.learning", label: "Learning", icon: "learning", tabs: t(["courses", "Recommended courses"], ["development", "My development"]) },
    { page: "cand.offers", label: "Offers", icon: "offers", tabs: t(["incoming", "Incoming offers"], ["compare", "Compare offers"], ["messages", "Messages"]) },
  ],
  employer: [
    { page: "emp.overview", label: "Overview", icon: "home", tabs: t(["dashboard", "Dashboard"], ["activity", "Hiring activity"]) },
    { page: "emp.talent", label: "Talent marketplace", icon: "search", tabs: t(["discover", "Discover talent"], ["saved", "Saved candidates"], ["compare", "Compare"]) },
    { page: "emp.vacancies", label: "Vacancies", icon: "vacancies", tabs: t(["active", "Active roles"], ["create", "Create vacancy"], ["applications", "Applications"]) },
    { page: "emp.hiring", label: "Hiring", icon: "hiring", tabs: t(["shortlists", "Shortlists"], ["interviews", "Interviews"], ["offers", "Offers"], ["placements", "Placements"]) },
    { page: "emp.costs", label: "Costs and membership", icon: "costs", tabs: t(["calculator", "Cost calculator"], ["membership", "Membership"], ["billing", "Billing"]) },
    { page: "emp.messages", label: "Messages", icon: "messages", tabs: t(["inbox", "Inbox"], ["notifications", "Notifications"]) },
  ],
  hq: [
    { page: "Home", label: "Home", icon: "helios", tabs: [] },
    { page: "Agents", label: "Agents", icon: "navAgents", tabs: t(["overview", "Agent overview"], ["detail", "Agent detail"], ["runs", "Run history"]) },
    { divider: true },
    { page: "hq.talent", label: "Talent", icon: "talent", tabs: t(["overview", "Overview"], ["candidates", "Candidates"], ["verification", "Verification"], ["market", "Market intelligence"]) },
    { page: "hq.employers", label: "Employers", icon: "employer", tabs: t(["accounts", "Accounts"], ["memberships", "Memberships"], ["activity", "Hiring activity"]) },
    { page: "hq.roles", label: "Roles and placements", icon: "jobs", tabs: t(["vacancies", "Vacancies"], ["pipelines", "Pipelines"], ["offers", "Offers"], ["placements", "Placements"]) },
    { page: "hq.learning", label: "Learning partners", icon: "learning", tabs: t(["institutions", "Institutions"], ["courses", "Courses"], ["referrals", "Referrals"]) },
    { page: "hq.revenue", label: "Revenue", icon: "revenue", tabs: t(["overview", "Overview"], ["memberships", "Memberships"], ["commissions", "Commissions"], ["forecast", "Forecast"]) },
    { divider: true },
    { page: "Dashboard", label: "Dashboard", icon: "navDash", tabs: t(["marketplace", "Marketplace"], ["growth", "Growth"], ["commercial", "Commercial"], ["quality", "Quality"]) },
    { page: "Work", label: "Work", icon: "navWork", tabs: t(["tasks", "Tasks"], ["approvals", "Approvals"], ["launch", "Launch plan"], ["workflows", "Workflows"], ["schedules", "Schedules"]) },
    { page: "Records", label: "Records", icon: "navRecords", tabs: t(["ontology", "Ontology"], ["files", "Files"], ["contacts", "Contacts"], ["records", "Records"], ["relationships", "Relationships"]) },
    { page: "Activity", label: "Activity", icon: "pulseLine", tabs: t(["all", "All activity"], ["hiring", "Hiring"], ["profiles", "Profiles"], ["financial", "Financial"]) },
  ],
};

/** Pages reached from the rail's bottom button rather than a rail item. */
export const SETTINGS_PAGES: Record<Role, Mod | null> = {
  public: null,
  candidate: { page: "cand.settings", label: "Settings", icon: "settings", tabs: t(["visibility", "Visibility"], ["privacy", "Privacy"], ["account", "Account"]) },
  employer: { page: "emp.org", label: "Organisation", icon: "org", tabs: t(["team", "Team"], ["preferences", "Preferences"]) },
  hq: { page: "Settings", label: "Settings", icon: "settings", tabs: t(["organisation", "Organisation"], ["team", "Team"], ["pricing", "Pricing"], ["integrations", "Integrations"], ["governance", "Governance"]) },
};

export const ROLE_META: Record<Role, { label: string; short: string; icon: string; home: string; who: string; whoRole: string; initials: string; tint: string; blurb: string }> = {
  public: { label: "Discover Recruit", short: "Discover", icon: "discover", home: "pub.discover", who: "Product preview", whoRole: "Public site", initials: "R", tint: "#9fb4ff", blurb: "The product story" },
  candidate: { label: "Candidate", short: "Candidate", icon: "candidate", home: "cand.dashboard", who: "Aoife Byrne", whoRole: "Deputy General Manager", initials: "AB", tint: "#9fb4ff", blurb: "A professional's view" },
  employer: { label: "Employer", short: "Employer", icon: "employer", home: "emp.overview", who: "Rachel Moran", whoRole: "Harbourview Grand Hotel", initials: "RM", tint: "#9fb4ff", blurb: "Harbourview Grand Hotel" },
  hq: { label: "Recruit HQ", short: "HQ", icon: "hq", home: "Home", who: "John O'Farrell", whoRole: "Founder, O'Farrell Sterling", initials: "JO", tint: "#7fe0d2", blurb: "The founder's operating layer" },
};

export const ROLES: Role[] = ["public", "candidate", "employer", "hq"];

const ALL_MODS: Mod[] = (Object.keys(NAVS) as Role[]).flatMap(r => NAVS[r].filter((n): n is Mod => !("divider" in n) && !n.switchTo))
  .concat((Object.values(SETTINGS_PAGES).filter(Boolean) as Mod[]));

export const moduleOf = (page: string): Mod | undefined => ALL_MODS.find(m => m.page === page);
export function roleOf(page: string): Role {
  if (page.startsWith("pub.")) return "public";
  if (page.startsWith("cand.")) return "candidate";
  if (page.startsWith("emp.")) return "employer";
  return "hq";
}
export const defaultTab = (page: string) => moduleOf(page)?.tabs[0]?.id || "";
export const isRecruitPage = (page: string) => /^(pub|cand|emp|hq)\./.test(page);

/* Components inside a Recruit page navigate with useNav(). PulseLogic owns the
   state; RecruitRouter provides these callbacks from it. */
export interface NavApi {
  role: Role;
  page: string;
  tab: string;
  go: (page: string, tab?: string) => void;
  setTab: (tab: string) => void;
  switchRole: (role: Role) => void;
  /** HQ only: ask the Home assistant a scripted question. */
  ask?: (q: string) => void;
}
export const NavContext = createContext<NavApi>({ role: "public", page: "pub.discover", tab: "overview", go: () => {}, setTab: () => {}, switchRole: () => {} });
export const useNav = () => useContext(NavContext);
