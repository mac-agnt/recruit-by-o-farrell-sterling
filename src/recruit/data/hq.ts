/* Recruit HQ fixtures: the founder's team, operating work, launch plan,
   integrations roadmap and governance. Staff other than John are fictional. */

export const ORG = {
  legalName: "O'Farrell Sterling Limited",
  product: "Recruit",
  location: "Dublin, Ireland",
  incorporated: "June 2026",
  founder: "John O'Farrell",
  founderRole: "Founder",
  founderBio: "Around 35 years in hospitality management, including senior hotel leadership, negotiation, operational restructuring and management consultancy.",
  currency: "EUR",
  timezone: "Europe/Dublin",
};

export const HQ_TEAM = [
  { name: "John O'Farrell", role: "Founder", team: "Founder", initials: "JO", tint: "#9fb4ff", fictional: false, access: "Owner" },
  { name: "Clodagh Reilly", role: "Head of Marketplace Operations", team: "Marketplace Operations", initials: "CR", tint: "#7fe0d2", fictional: true, access: "Admin" },
  { name: "Owen Brady", role: "Employer Success Lead", team: "Employer Success", initials: "OB", tint: "#e6c78a", fictional: true, access: "Manager" },
  { name: "Yasmin Haddad", role: "Talent Verification Lead", team: "Talent Verification", initials: "YH", tint: "#c8b4f0", fictional: true, access: "Manager" },
  { name: "Fergal Nash", role: "Partnerships Lead", team: "Partnerships", initials: "FN", tint: "#a8e0c0", fictional: true, access: "Manager" },
  { name: "Leah Corcoran", role: "Growth Lead", team: "Growth", initials: "LC", tint: "#f0b8c8", fictional: true, access: "Manager" },
  { name: "Michael Tierney", role: "Finance Lead", team: "Finance", initials: "MT", tint: "#f2c59a", fictional: true, access: "Finance" },
];

export const HQ_TEAMS = [
  { name: "Founder", lead: "John O'Farrell", members: 1, remit: "Vision, pricing, key accounts and partnerships" },
  { name: "Marketplace Operations", lead: "Clodagh Reilly", members: 6, remit: "Vacancies, pipelines and marketplace quality" },
  { name: "Employer Success", lead: "Owen Brady", members: 5, remit: "Onboarding, renewals and employer support" },
  { name: "Talent Verification", lead: "Yasmin Haddad", members: 8, remit: "Credential checks, references and profile accuracy" },
  { name: "Partnerships", lead: "Fergal Nash", members: 3, remit: "Education partners and course catalogue" },
  { name: "Growth", lead: "Leah Corcoran", members: 4, remit: "Candidate and employer acquisition" },
  { name: "Finance", lead: "Michael Tierney", members: 2, remit: "Invoicing, commissions and forecasting" },
];

export const LAUNCH_PLAN = [
  { phase: "Foundation", window: "Now to Month 3", status: "In progress", items: [
    { label: "Incorporate O'Farrell Sterling Limited", status: "Done", owner: "John O'Farrell", note: "Incorporated June 2026" },
    { label: "Validate pricing with 20 hotel GMs", status: "In progress", owner: "John O'Farrell", note: "Membership tiers and success fee" },
    { label: "Build the Recruit product demonstration", status: "In progress", owner: "Consulting.ie", note: "This demo" },
    { label: "Shortlist an education partner for a pilot", status: "Planned", owner: "Partnerships", note: "No partner signed" },
  ] },
  { phase: "Pilot", window: "Months 4 to 6", status: "Planned", items: [
    { label: "Pilot with Dublin hotels from the founder's network", status: "Planned", owner: "Employer Success", note: "Target 20 employers" },
    { label: "First 5,000 professional profiles", status: "Planned", owner: "Growth", note: "Founder network and LinkedIn outreach" },
    { label: "Verification process with one issuer", status: "Planned", owner: "Talent Verification", note: "Simulated in this demo" },
  ] },
  { phase: "Public launch", window: "Months 7 to 9", status: "Planned", items: [
    { label: "Dublin hotel leaders launch event", status: "Planned", owner: "John O'Farrell", note: "Invite-only breakfast" },
    { label: "Market value campaign", status: "Planned", owner: "Growth", note: "Know your market value" },
    { label: "Open membership to all hospitality employers", status: "Planned", owner: "Employer Success", note: "Five tiers" },
  ] },
  { phase: "Scale", window: "Months 10 to 24", status: "Planned", items: [
    { label: "100,000 registered professionals", status: "Planned", owner: "Growth", note: "The founder's target" },
    { label: "Expand to adjacent industries", status: "Planned", owner: "Marketplace Operations", note: "Events, retail, facilities" },
    { label: "International markets", status: "Planned", owner: "John O'Farrell", note: "UK first" },
  ] },
];

export const INTEGRATIONS_ROADMAP = [
  { name: "CV intake and parsing", category: "Profiles", status: "Demo simulation", detail: "CV analysis in this demo runs on prepared structured data. No document leaves the browser." },
  { name: "Email and notifications", category: "Communication", status: "Planned", detail: "Interview, offer and verification emails." },
  { name: "Calendar scheduling", category: "Hiring", status: "Planned", detail: "Interview slots synced with employer calendars." },
  { name: "Payment processing", category: "Finance", status: "Not connected", detail: "Membership and success-fee billing. No payments are taken in this demo." },
  { name: "Educational credential verification", category: "Verification", status: "Demo simulation", detail: "Issuer checks are simulated. No institution is connected." },
  { name: "CRM and employer communications", category: "Employers", status: "Planned", detail: "Employer accounts, renewals and support history." },
  { name: "Analytics", category: "Insight", status: "Planned", detail: "Product and funnel analytics." },
  { name: "LinkedIn", category: "Outreach", status: "Not connected", detail: "A potential outreach channel for the founder network. Not a data source." },
];

export const GOVERNANCE = [
  { id: "g-consent", label: "Candidate consent before contact details are shared", on: true, locked: true, note: "Employers see anonymised profiles until a candidate accepts an introduction." },
  { id: "g-discover", label: "Profile discoverability is opt-in", on: true, locked: true, note: "Candidates choose discoverable, anonymous or hidden." },
  { id: "g-block", label: "Candidates can block their current employer", on: true, locked: false, note: "Blocked employers never see the profile, even anonymised." },
  { id: "g-human", label: "Hiring decisions stay with people", on: true, locked: true, note: "Scores and matches are decision support. No automated rejection." },
  { id: "g-sensitive", label: "No sensitive characteristics in scoring", on: true, locked: true, note: "The Recruit Index uses professional evidence and profile completeness only." },
  { id: "g-estimates", label: "Salary figures labelled as estimates", on: true, locked: true, note: "Market ranges and scenarios are illustrative, never guaranteed." },
  { id: "g-verify", label: "Agents cannot mark facts as verified", on: true, locked: true, note: "Only a confirmed check or a person changes verification status." },
  { id: "g-export", label: "Candidates can export their data", on: true, locked: false, note: "Self-service export from account settings." },
  { id: "g-delete", label: "Deletion requests handled within 30 days", on: true, locked: false, note: "Tracked in the requests queue below." },
  { id: "g-correct", label: "Candidates can correct their profile", on: true, locked: false, note: "Corrections re-run matching and the index." },
];

export const PRIVACY_REQUESTS = [
  { id: "pr1", type: "Data export", who: "Professional #48213", age: "1 day", status: "Completed" },
  { id: "pr2", type: "Profile correction", who: "Professional #77140", age: "2 days", status: "In progress" },
  { id: "pr3", type: "Deletion request", who: "Professional #10398", age: "4 days", status: "Scheduled" },
  { id: "pr4", type: "Contact visibility change", who: "Professional #59221", age: "Today", status: "Completed" },
];

export const COMMISSION_RULES = [
  { id: "cr1", label: "Standard success fee", rate: 0.08, applies: "All placements", note: "Default for every membership tier" },
  { id: "cr2", label: "Volume rate", rate: 0.07, applies: "Employers with 6+ placements a year", note: "Proposed" },
  { id: "cr3", label: "Executive placements", rate: 0.1, applies: "Salaries above €120,000", note: "Proposed, pending founder approval" },
  { id: "cr4", label: "Education partner referrals", rate: 0.1, applies: "Course fees from Recruit referrals", note: "Concept, varies by partner" },
];

export const SUPPORT_TICKETS = [
  { id: "s1", employerId: "e-fenwick", subject: "No suitable shortlist for Operations Director", priority: "High", age: "2 days", owner: "Owen Brady", status: "Open" },
  { id: "s2", employerId: "e-saltmarsh", subject: "Renewal questions after the season", priority: "Medium", age: "4 days", owner: "Owen Brady", status: "Open" },
  { id: "s3", employerId: "e-cedarhouse", subject: "Invoice for Accommodation Manager overdue", priority: "Medium", age: "6 days", owner: "Michael Tierney", status: "Waiting on employer" },
  { id: "s4", employerId: "e-brightwater", subject: "Pilot review meeting", priority: "Low", age: "1 day", owner: "Clodagh Reilly", status: "Scheduled" },
];

/** Verification queue sample (of 1,284). */
export const VERIFICATION_QUEUE = [
  { id: "vq1", candidateId: "c-aoife", item: "Opera PMS certificate", type: "Certificate", age: "1 day", owner: "Verification Agent", status: "Sent to issuer" },
  { id: "vq2", candidateId: "c-lucia", item: "MSc Tourism Management", type: "Qualification", age: "5 days", owner: "Yasmin Haddad", status: "Waiting on issuer" },
  { id: "vq3", candidateId: "c-joseph", item: "Higher Certificate in Hospitality", type: "Qualification", age: "1 day", owner: "Verification Agent", status: "Sent to issuer" },
  { id: "vq4", candidateId: "c-mark", item: "Wine and Spirits Certificate", type: "Certificate", age: "3 days", owner: "Verification Agent", status: "Waiting on candidate" },
  { id: "vq5", candidateId: "c-ciaran", item: "Reference: Parnell Square Hotel", type: "Reference", age: "6 days", owner: "Yasmin Haddad", status: "Chasing referee" },
  { id: "vq6", candidateId: "c-daniel", item: "Employment dates, airport hotel", type: "Employment", age: "2 days", owner: "Verification Agent", status: "Sent to employer" },
  { id: "vq7", candidateId: "c-kateryna", item: "Diploma in Spa Management", type: "Qualification", age: "4 days", owner: "Verification Agent", status: "Waiting on issuer" },
];

/** Revenue scenarios and unit economics (concept assumptions). */
export const REVENUE_SCENARIOS = [
  { id: "conservative", label: "Conservative", employers: 900, placements: 360, avgSalary: 55000, rate: 0.07, partnerRevenue: 120000 },
  { id: "base", label: "Base", employers: 1280, placements: 576, avgSalary: 60000, rate: 0.08, partnerRevenue: 218880 },
  { id: "ambitious", label: "Ambitious", employers: 2000, placements: 960, avgSalary: 62000, rate: 0.08, partnerRevenue: 360000 },
];

export const UNIT_ECONOMICS = [
  { label: "Employer acquisition cost", value: "€640", note: "Blended sales and events cost per new membership (assumption)" },
  { label: "Candidate acquisition cost", value: "€3.80", note: "Per registered professional (assumption)" },
  { label: "Average membership", value: "€845", note: "€1,082,000 across 1,280 accounts" },
  { label: "Average success fee", value: "€4,800", note: "8% of a €60,000 average salary" },
  { label: "Membership payback", value: "9 months", note: "Acquisition cost over monthly membership revenue" },
  { label: "Gross margin", value: "71%", note: "After verification and partner shares (assumption)" },
];

export const UNCONFIRMED_SERVICES = [
  { label: "Premium employer campaigns", note: "Featured vacancies and talent campaigns. Unconfirmed commercial concept." },
  { label: "Executive search add-on", note: "Assisted search for C-suite roles. Unconfirmed commercial concept." },
  { label: "Candidate career coaching", note: "Paid sessions with Career Pathfinder reports. Unconfirmed commercial concept." },
];
