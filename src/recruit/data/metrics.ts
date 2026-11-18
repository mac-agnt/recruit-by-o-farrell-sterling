/* The single source for every marketplace-wide number. These describe one
   illustrative future-state scenario, not actual results: O'Farrell Sterling
   was incorporated in June 2026 and Recruit is not yet operating. */

export const DEMO_LABEL = "Illustrative future-state data";

export const MARKET = {
  registeredProfessionals: 102480,
  verifiedProfiles: 81420,
  discoverableCandidates: 64210,
  employerAccounts: 1280,
  openVacancies: 326,
  placementsThisMonth: 48,
  medianHoursToShortlist: 4.2,
  /** John's stated ambition for the talent network. */
  talentTarget: 100000,
  verificationBacklog: 1284,
  /** Memberships renewing in the next 30 days (illustrative). */
  renewalsDue30: 23,
  avgPlacementSalary: 60000,
  agencyBenchmarkRate: 0.25,
  recruitDefaultRate: 0.08,
  /** Founder-provided context, not an integrated data source. */
  founderLinkedInFollowers: 30000,
};

/** Employer membership tiers. 1-50 (€395), 51-100 (€595) and the top tier
    (about €2,500) came from the founder; the middle brackets are concept
    assumptions for the demo. */
export interface Tier { id: number; label: string; band: string; min: number; max: number | null; price: number; accounts: number; confirmed: boolean; perks: string[] }

export const TIERS: Tier[] = [
  { id: 1, label: "Starter", band: "1-50 employees", min: 1, max: 50, price: 395, accounts: 420, confirmed: true,
    perks: ["Search the live marketplace", "2 active vacancies", "Standard success fee"] },
  { id: 2, label: "Growth", band: "51-100 employees", min: 51, max: 100, price: 595, accounts: 350, confirmed: true,
    perks: ["Everything in Starter", "5 active vacancies", "Candidate comparison"] },
  { id: 3, label: "Professional", band: "101-250 employees", min: 101, max: 250, price: 995, accounts: 270, confirmed: false,
    perks: ["Everything in Growth", "15 active vacancies", "Hiring pipeline and offers", "Team seats for 5"] },
  { id: 4, label: "Group", band: "251-500 employees", min: 251, max: 500, price: 1495, accounts: 160, confirmed: false,
    perks: ["Everything in Professional", "Unlimited vacancies", "Multi-site hiring", "Team seats for 15"] },
  { id: 5, label: "Enterprise", band: "501+ employees", min: 501, max: null, price: 2500, accounts: 80, confirmed: true,
    perks: ["Everything in Group", "Group-wide hiring analytics", "Dedicated employer success lead", "Unlimited seats"] },
];

export const membershipRevenue = (tiers: Tier[] = TIERS) => tiers.reduce((s, t) => s + t.price * t.accounts, 0);
export const totalAccounts = (tiers: Tier[] = TIERS) => tiers.reduce((s, t) => s + t.accounts, 0);
export const tierFor = (employees: number, tiers: Tier[] = TIERS) =>
  tiers.find(t => employees >= t.min && (t.max === null || employees <= t.max)) || tiers[tiers.length - 1];

/** Placement economics for the month, from explicit assumptions. */
export const placementEconomics = (placements = MARKET.placementsThisMonth, avgSalary = MARKET.avgPlacementSalary,
  agencyRate = MARKET.agencyBenchmarkRate, recruitRate = MARKET.recruitDefaultRate) => {
  const agencyFees = placements * avgSalary * agencyRate;
  const recruitFees = placements * avgSalary * recruitRate;
  return { placements, avgSalary, agencyRate, recruitRate, agencyFees, recruitFees, saving: agencyFees - recruitFees };
};

/** Twelve months of the scenario's second year. Labels are scenario months,
    not calendar history. */
export const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export const SCENARIO_CAPTION = "Scenario year 2, illustrative";

export const SERIES = {
  registered: [58200, 62900, 67400, 71800, 75600, 79900, 83700, 87600, 91800, 95900, 99300, 102480],
  verified: [41100, 45300, 49800, 53600, 57200, 61000, 64700, 68400, 72100, 75600, 78700, 81420],
  discoverable: [31400, 34900, 38600, 41800, 44900, 48100, 51200, 54300, 57500, 60300, 62600, 64210],
  employers: [612, 671, 734, 802, 866, 931, 994, 1058, 1121, 1176, 1231, 1280],
  vacancies: [188, 204, 219, 236, 251, 262, 281, 293, 301, 314, 319, 326],
  placements: [17, 19, 22, 24, 27, 29, 31, 34, 37, 41, 44, 48],
  hoursToShortlist: [11.6, 10.4, 9.1, 8.2, 7.4, 6.6, 6.1, 5.5, 5.0, 4.7, 4.4, 4.2],
  /** Monthly recurring membership revenue in euro (annualised / 12). */
  membershipMrr: [44100, 48300, 52900, 57800, 62600, 67400, 72100, 76900, 81400, 85300, 88900, 90167],
  successFees: [81600, 91200, 105600, 115200, 129600, 139200, 148800, 163200, 177600, 196800, 211200, 230400],
  educationRevenue: [4200, 5100, 6300, 7400, 8800, 9600, 11200, 12400, 13900, 15100, 16600, 18240],
};

/** All-time candidate acquisition funnel. */
export const CANDIDATE_FUNNEL = [
  { label: "Outreach reach", value: 1240000, note: "Network, events, LinkedIn and partners" },
  { label: "Site visits", value: 418600, note: "Unique visitors to Recruit" },
  { label: "CV uploads", value: 102480, note: "Registered professionals" },
  { label: "Completed profiles", value: 93870, note: "Profile completeness above 80%" },
  { label: "Verified profiles", value: 81420, note: "At least one verified credential" },
  { label: "Discoverable", value: 64210, note: "Opted in to employer search" },
];

export const EMPLOYER_FUNNEL = [
  { label: "Leads", value: 4120, note: "Hotels and groups contacted" },
  { label: "Demonstrations", value: 1915, note: "Walkthroughs held" },
  { label: "Memberships", value: 1280, note: "Paying employer accounts" },
  { label: "Open vacancies", value: 326, note: "Live roles on the marketplace" },
  { label: "Placements this month", value: 48, note: "Hires completed" },
];

export const CAMPAIGNS = [
  { id: "cp1", name: "Founder network launch", channel: "Founder network", status: "Planned", reach: 30000, signups: 4100, cost: 0, conv: 13.7, note: "John's network of roughly 30,000 LinkedIn followers. Founder-provided context, not a connected data source." },
  { id: "cp2", name: "Dublin hotel leaders breakfast", channel: "Launch event", status: "Planned", reach: 220, signups: 96, cost: 6400, conv: 43.6, note: "Invite-only launch event for general managers and HR directors." },
  { id: "cp3", name: "Know your market value", channel: "Paid social", status: "Concept", reach: 412000, signups: 18200, cost: 38600, conv: 4.4, note: "Salary insight campaign aimed at mid-career hospitality managers." },
  { id: "cp4", name: "Student pathways", channel: "Education partners", status: "Concept", reach: 26000, signups: 7900, cost: 9200, conv: 30.4, note: "Final-year hospitality students build a profile before graduating." },
  { id: "cp5", name: "Career change week", channel: "Content and PR", status: "Concept", reach: 188000, signups: 6400, cost: 12100, conv: 3.4, note: "Career Explorer stories for people ready to move sector." },
  { id: "cp6", name: "Group hotel roadshow", channel: "Direct sales", status: "Planned", reach: 140, signups: 38, cost: 11800, conv: 27.1, note: "Employer roadshow for multi-site hotel groups." },
];

export const INDUSTRY_MIX = [
  { label: "Hotels and resorts", value: 47 },
  { label: "Restaurants and bars", value: 18 },
  { label: "Events and conferences", value: 11 },
  { label: "Retail operations", value: 9 },
  { label: "Facilities and services", value: 8 },
  { label: "Other sectors", value: 7 },
];

export const REGION_MIX = [
  { label: "Dublin", value: 38 },
  { label: "Rest of Leinster", value: 17 },
  { label: "Munster", value: 21 },
  { label: "Connacht", value: 9 },
  { label: "Ulster (ROI)", value: 4 },
  { label: "UK", value: 7 },
  { label: "Rest of world", value: 4 },
];

export const SENIORITY_MIX = [
  { label: "Executive", value: 9 },
  { label: "Senior manager", value: 21 },
  { label: "Manager", value: 34 },
  { label: "Supervisor", value: 24 },
  { label: "Early career", value: 12 },
];

/** Regional salary context for hospitality management (illustrative). */
export const GEO_SALARY = [
  { region: "Dublin", gm: [118000, 150000], dgm: [82000, 96000], index: 1.12 },
  { region: "Rest of Leinster", gm: [98000, 124000], dgm: [72000, 86000], index: 0.96 },
  { region: "Munster", gm: [96000, 122000], dgm: [70000, 84000], index: 0.94 },
  { region: "Connacht", gm: [92000, 116000], dgm: [68000, 80000], index: 0.9 },
  { region: "London", gm: [128000, 170000], dgm: [90000, 108000], index: 1.24 },
];

export const QUALITY = {
  profileAccuracy: 96.8,
  verificationSlaHours: 31,
  introAcceptance: 72,
  offerAcceptance: 81,
  retention6m: 92,
  retention12m: 87,
  employerNps: 54,
  candidateNps: 61,
  disputes: 3,
};
