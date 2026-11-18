import { Component, type ComponentType, type ReactNode } from "react";
import { NavContext, type NavApi, type Role } from "./nav";
import { closeDrawer, useRecruit } from "./store";
import { Icon } from "./icons";

import PubOverview from "./pages/pub/Overview";
import PubHow from "./pages/pub/HowItWorks";
import PubPricing from "./pages/pub/Pricing";
import PubEducation from "./pages/pub/Education";
import PubPreview from "./pages/pub/Preview";

import CDashboard from "./pages/cand/Dashboard";
import CActivity from "./pages/cand/MyActivity";
import CProfile from "./pages/cand/Profile";
import CCV from "./pages/cand/CV";
import CVerification from "./pages/cand/Verification";
import CMyValue from "./pages/cand/MyValue";
import CBreakdown from "./pages/cand/ValueBreakdown";
import CScenarios from "./pages/cand/Scenarios";
import CPaths from "./pages/cand/CareerPaths";
import CSkills from "./pages/cand/TransferableSkills";
import CSimulator from "./pages/cand/CareerSimulator";
import CJobs from "./pages/cand/JobsRecommended";
import CSaved from "./pages/cand/JobsSaved";
import CApplications from "./pages/cand/Applications";
import CCourses from "./pages/cand/Courses";
import CDevelopment from "./pages/cand/Development";
import COffers from "./pages/cand/OffersIncoming";
import COffersCompare from "./pages/cand/OffersCompare";
import CMessages from "./pages/cand/Messages";
import CSettings from "./pages/cand/Settings";

import EDashboard from "./pages/emp/Dashboard";
import EActivity from "./pages/emp/HiringActivity";
import EDiscover from "./pages/emp/Discover";
import ESaved from "./pages/emp/Saved";
import ECompare from "./pages/emp/Compare";
import EActive from "./pages/emp/ActiveRoles";
import ECreate from "./pages/emp/CreateVacancy";
import EApplications from "./pages/emp/Applications";
import EShortlists from "./pages/emp/Shortlists";
import EInterviews from "./pages/emp/Interviews";
import EOffers from "./pages/emp/Offers";
import EPlacements from "./pages/emp/Placements";
import ECalculator from "./pages/emp/Calculator";
import EMembership from "./pages/emp/Membership";
import EBilling from "./pages/emp/Billing";
import EInbox from "./pages/emp/Inbox";
import ENotifications from "./pages/emp/Notifications";
import EOrg from "./pages/emp/Org";

import HTalentOverview from "./pages/hq/TalentOverview";
import HTalentCandidates from "./pages/hq/TalentCandidates";
import HVerification from "./pages/hq/Verification";
import HMarket from "./pages/hq/MarketIntel";
import HAccounts from "./pages/hq/Accounts";
import HMemberships from "./pages/hq/Memberships";
import HEmployerActivity from "./pages/hq/EmployerActivity";
import HVacancies from "./pages/hq/Vacancies";
import HPipelines from "./pages/hq/Pipelines";
import HOffers from "./pages/hq/Offers";
import HPlacements from "./pages/hq/Placements";
import HInstitutions from "./pages/hq/Institutions";
import HCourses from "./pages/hq/Courses";
import HReferrals from "./pages/hq/Referrals";
import HRevenue from "./pages/hq/RevenueOverview";
import HRevenueMemberships from "./pages/hq/RevenueMemberships";
import HCommissions from "./pages/hq/Commissions";
import HForecast from "./pages/hq/Forecast";

import CandidateDrawer from "./shared/CandidateDrawer";
import VacancyDrawer from "./shared/VacancyDrawer";
import EmployerDrawer from "./shared/EmployerDrawer";
import CourseDrawer from "./shared/CourseDrawer";
import OfferDrawer from "./shared/OfferDrawer";

/* page -> tab -> screen. Pages share one component when a module's tabs are
   sections of a single screen (settings, organisation). */
const ROUTES: Record<string, Record<string, ComponentType>> = {
  "pub.discover": { overview: PubOverview, how: PubHow, pricing: PubPricing, education: PubEducation, preview: PubPreview },
  "cand.dashboard": { overview: CDashboard, activity: CActivity },
  "cand.profile": { profile: CProfile, cv: CCV, verification: CVerification },
  "cand.value": { value: CMyValue, breakdown: CBreakdown, scenarios: CScenarios },
  "cand.explorer": { paths: CPaths, skills: CSkills, simulator: CSimulator },
  "cand.jobs": { recommended: CJobs, saved: CSaved, applications: CApplications },
  "cand.learning": { courses: CCourses, development: CDevelopment },
  "cand.offers": { incoming: COffers, compare: COffersCompare, messages: CMessages },
  "cand.settings": { visibility: CSettings, privacy: CSettings, account: CSettings },
  "emp.overview": { dashboard: EDashboard, activity: EActivity },
  "emp.talent": { discover: EDiscover, saved: ESaved, compare: ECompare },
  "emp.vacancies": { active: EActive, create: ECreate, applications: EApplications },
  "emp.hiring": { shortlists: EShortlists, interviews: EInterviews, offers: EOffers, placements: EPlacements },
  "emp.costs": { calculator: ECalculator, membership: EMembership, billing: EBilling },
  "emp.messages": { inbox: EInbox, notifications: ENotifications },
  "emp.org": { team: EOrg, preferences: EOrg },
  "hq.talent": { overview: HTalentOverview, candidates: HTalentCandidates, verification: HVerification, market: HMarket },
  "hq.employers": { accounts: HAccounts, memberships: HMemberships, activity: HEmployerActivity },
  "hq.roles": { vacancies: HVacancies, pipelines: HPipelines, offers: HOffers, placements: HPlacements },
  "hq.learning": { institutions: HInstitutions, courses: HCourses, referrals: HReferrals },
  "hq.revenue": { overview: HRevenue, memberships: HRevenueMemberships, commissions: HCommissions, forecast: HForecast },
};

/** Keeps the shell alive if one screen throws; resets when the screen changes. */
export class ViewBoundary extends Component<{ children: ReactNode; label?: string }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  componentDidCatch(error: Error) { console.error("Recruit view failed:", error); }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div style={{ maxWidth: 560, margin: "80px auto", padding: 24, textAlign: "center", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--card-r, 18px)" }}>
        <div style={{ fontSize: 16, fontWeight: 600 }}>This view could not load</div>
        <div style={{ fontSize: 13, color: "var(--dim)", marginTop: 8, lineHeight: 1.6 }}>{this.props.label || "Something in this screen failed."} Other views still work.</div>
        <button onClick={() => this.setState({ error: null })} className="rc-btn rc-btn-secondary" style={{ marginTop: 16, height: 34, padding: "0 14px", borderRadius: 999, border: "1px solid var(--border)", background: "var(--surface-2)", color: "var(--body)", cursor: "pointer" }}>Try again</button>
      </div>
    );
  }
}

export function navApiFrom(v: any): NavApi {
  return { role: v.role as Role, page: v.page, tab: v.rTab, go: v.rGo, setTab: v.rSetTab, switchRole: v.switchRole, ask: v.askAssistant };
}

/** Renders the Recruit screen for the current page and tab. */
export default function RecruitRouter({ v }: { v: any }) {
  const api = navApiFrom(v);
  const tabs = ROUTES[v.page] || {};
  const Screen = tabs[v.rTab] || Object.values(tabs)[0];
  return (
    <NavContext.Provider value={api}>
      {Screen ? <ViewBoundary key={v.page + ":" + v.rTab}><Screen /></ViewBoundary> : null}
    </NavContext.Provider>
  );
}

/** Wrap any Recruit component mounted outside the router (legacy HQ tabs, widgets). */
export function WithNav({ v, children }: { v: any; children: React.ReactNode }) {
  return <NavContext.Provider value={navApiFrom(v)}><ViewBoundary key={v.page + ":" + v.rTab}>{children}</ViewBoundary></NavContext.Provider>;
}

/** Shared detail drawers and the toast, mounted once at the root. */
export function RecruitOverlays({ v }: { v: any }) {
  const s = useRecruit();
  const d = s.drawer;
  return (
    <NavContext.Provider value={navApiFrom(v)}>
      {d && (
        <ViewBoundary key={d.kind + d.id} label="This detail panel failed to open.">
          {d.kind === "candidate" && <CandidateDrawer id={d.id} ctx={d.ctx} onClose={closeDrawer} />}
          {d.kind === "vacancy" && <VacancyDrawer id={d.id} ctx={d.ctx} onClose={closeDrawer} />}
          {d.kind === "employer" && <EmployerDrawer id={d.id} ctx={d.ctx} onClose={closeDrawer} />}
          {d.kind === "course" && <CourseDrawer id={d.id} ctx={d.ctx} onClose={closeDrawer} />}
          {d.kind === "offer" && <OfferDrawer id={d.id} ctx={d.ctx} onClose={closeDrawer} />}
        </ViewBoundary>
      )}
      {s.toast && (
        <div key={s.toast.id} role="status" aria-live="polite"
          style={{ position: "fixed", left: "50%", bottom: 28, zIndex: 95, display: "flex", alignItems: "center", gap: 10, maxWidth: "min(560px, calc(100vw - 32px))",
            padding: "11px 16px 11px 12px", background: "var(--tooltip)", color: "var(--tooltip-ink, var(--ink))", border: "1px solid var(--border-strong)", borderRadius: 14,
            boxShadow: "0 18px 50px rgba(0,0,0,.45)", fontSize: 13, animation: "rcToast .42s cubic-bezier(.16,1,.3,1) both" }}>
          <span style={{ width: 22, height: 22, borderRadius: 8, flex: "none", display: "flex", alignItems: "center", justifyContent: "center",
            background: s.toast.tone === "ok" ? "var(--ok-soft)" : s.toast.tone === "warn" ? "var(--warn-soft)" : s.toast.tone === "bad" ? "var(--bad-soft)" : "var(--accent-soft)",
            color: s.toast.tone === "ok" ? "var(--ok)" : s.toast.tone === "warn" ? "var(--warn)" : s.toast.tone === "bad" ? "var(--bad)" : "var(--accent)" }}>
            <Icon name={s.toast.tone === "ok" ? "check" : s.toast.tone === "accent" ? "info" : "alert"} size={12} stroke={2.4} />
          </span>
          {s.toast.text}
        </div>
      )}
    </NavContext.Provider>
  );
}
