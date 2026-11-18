/* Career paths, market value scenarios and salary history for the three
   personas. Every salary here is an illustrative estimate built from demo
   benchmarks, never a guaranteed outcome. */

export interface CareerPath {
  id: string;
  title: string;
  industry: string;
  salary: [number, number];
  alignment: number;
  vacancyId?: string;
  openRoles: number;
  demand: "High" | "Steady" | "Growing" | "Limited";
  matched: string[];
  gaps: { label: string; how: string }[];
  courseIds: string[];
  explanation: string;
  timeToMove: string;
  adjacent: boolean;
}

export const CAREER_PATHS: Record<string, CareerPath[]> = {
  "c-mark": [
    { id: "pm-eod", title: "Events Operations Director", industry: "Events and live experiences", salary: [75000, 85000], alignment: 86,
      vacancyId: "v-nl-eod", openRoles: 23, demand: "High", adjacent: true, timeToMove: "3 to 6 months",
      matched: ["Team leadership", "Budget management", "Procurement", "Service operations", "Negotiation", "Stakeholder management"],
      gaps: [{ label: "Festival-scale crowd and venue safety", how: "Covered in the Events Operations Professional Certificate" },
        { label: "Production, staging and AV suppliers", how: "Two live-event placements in the same certificate" }],
      courseIds: ["crs-events"],
      explanation: "Your management, procurement and multi-team operational experience may transfer into larger events and retail operations roles. You already deliver 410 events a year and run supplier contracts; the step up is scale and production, not a new discipline." },
    { id: "pm-rrom", title: "Regional Retail Operations Manager", industry: "Retail", salary: [70000, 82000], alignment: 79,
      vacancyId: "v-bw-rrom", openRoles: 41, demand: "Growing", adjacent: true, timeToMove: "6 to 9 months",
      matched: ["Team leadership", "Budget management", "Procurement", "Customer experience", "Stakeholder management"],
      gaps: [{ label: "Retail metrics: sales per square metre, shrinkage", how: "Retail Operations Leadership, weeks 1 to 4" },
        { label: "Leading managers across several sites", how: "Ask for a multi-outlet project in your current role" }],
      courseIds: ["crs-retail"],
      explanation: "Running three restaurants and two bars is multi-outlet operations in all but name. Retail groups hiring from hospitality value your service culture; the gap is retail-specific metrics." },
    { id: "pm-cxd", title: "Customer Experience Director", industry: "Customer experience, cross-sector", salary: [78000, 90000], alignment: 74,
      vacancyId: "v-qc-cxd", openRoles: 17, demand: "Steady", adjacent: true, timeToMove: "9 to 12 months",
      matched: ["Customer experience", "Service operations", "Team leadership", "Stakeholder management"],
      gaps: [{ label: "CX measurement: NPS programmes and journey analytics", how: "Customer Experience Strategy certificate" },
        { label: "Digital service channels", how: "Lead the digital feedback rollout at your resort" },
        { label: "Board-level reporting", how: "Present the quarterly guest report to your GM and owners" }],
      courseIds: ["crs-cx"],
      explanation: "Your client ratings and complaint handling are strong evidence, but CX director roles expect measurement frameworks and board reporting. Worth it if you want the highest ceiling." },
    { id: "pm-proc", title: "Procurement Manager, hospitality and leisure", industry: "Procurement", salary: [62000, 74000], alignment: 71,
      openRoles: 12, demand: "Limited", adjacent: true, timeToMove: "6 to 12 months",
      matched: ["Procurement", "Negotiation", "Budget management"],
      gaps: [{ label: "Formal procurement qualification", how: "Build on your Certificate in Procurement and Supply" }],
      courseIds: [],
      explanation: "Your food-cost result shows real buying skill, but fewer roles and a similar salary make this a lateral move." },
    { id: "pm-hom", title: "Hotel Operations Manager", industry: "Hospitality, same sector", salary: [68000, 78000], alignment: 88,
      openRoles: 64, demand: "High", adjacent: false, timeToMove: "1 to 3 months",
      matched: ["Team leadership", "Service operations", "Budget management", "Customer experience", "Rostering and labour planning"],
      gaps: [{ label: "Rooms division experience", how: "Shadow front office and housekeeping for a quarter" }],
      courseIds: ["crs-people"],
      explanation: "The safe move inside hotels. Highest alignment, but it keeps the hours you said you want to change." },
  ],
  "c-aoife": [
    { id: "pa-rged", title: "Regional Guest Experience Director", industry: "Hotel groups", salary: [88000, 100000], alignment: 91,
      vacancyId: "v-ch-rged", openRoles: 9, demand: "Growing", adjacent: false, timeToMove: "Now",
      matched: ["Guest experience strategy", "Service recovery", "Staff training and development", "Team leadership", "Stakeholder management"],
      gaps: [{ label: "Multi-property experience", how: "Highlight the group-wide training ladder you designed" }],
      courseIds: ["crs-cx"],
      explanation: "Your review-score and training results map directly onto group guest-experience roles. This is the strongest match in the marketplace for you today." },
    { id: "pa-gm", title: "Hotel General Manager", industry: "Hotels", salary: [105000, 125000], alignment: 74,
      openRoles: 18, demand: "Steady", adjacent: false, timeToMove: "12 to 24 months",
      matched: ["Team leadership", "Budget management", "Rooms division operations", "Guest experience strategy"],
      gaps: [{ label: "Full P&L ownership", how: "Executive Programme in Hotel General Management" },
        { label: "Owner and board reporting", how: "Ask to co-present the monthly owner report" }],
      courseIds: ["crs-gm", "crs-finance"],
      explanation: "Most deputy GMs with your profile move up within two years. The evidence employers will look for is P&L ownership and owner reporting." },
    { id: "pa-cxd", title: "Customer Experience Director", industry: "Customer experience, cross-sector", salary: [80000, 92000], alignment: 82,
      vacancyId: "v-qc-cxd", openRoles: 17, demand: "Steady", adjacent: true, timeToMove: "3 to 6 months",
      matched: ["Guest experience strategy", "Service recovery", "Stakeholder management"],
      gaps: [{ label: "CX measurement frameworks", how: "Customer Experience Strategy certificate" }],
      courseIds: ["crs-cx"],
      explanation: "Service recovery and review scores translate well into venue and retail CX roles." },
    { id: "pa-fbd", title: "Director of Food & Beverage", industry: "Hotels", salary: [84000, 98000], alignment: 70,
      openRoles: 14, demand: "Steady", adjacent: false, timeToMove: "6 to 12 months",
      matched: ["Team leadership", "Budget management", "Guest experience strategy"],
      gaps: [{ label: "Beverage programme leadership", how: "Wine & Beverage Leadership Diploma" }],
      courseIds: ["crs-wine"],
      explanation: "The Wine & Beverage Leadership Diploma closes the main gap. Eoin Lynch, a Recruit member, used it to move into a 5-star F&B role." },
  ],
  "c-sarah": [
    { id: "ps-ops", title: "Operations Director, hotel group", industry: "Hotel groups", salary: [135000, 155000], alignment: 84,
      vacancyId: "v-fv-opsd", openRoles: 6, demand: "Limited", adjacent: false, timeToMove: "Now",
      matched: ["P&L ownership", "Team leadership", "Commercial strategy", "Owner and stakeholder relations"],
      gaps: [{ label: "Leading through general managers", how: "Mentor two GMs in your current group" }],
      courseIds: [], explanation: "Your turnaround record is exactly what groups look for in operations directors. Fewer roles, higher ceiling." },
    { id: "ps-gm", title: "General Manager, larger hotel", industry: "Hotels", salary: [120000, 140000], alignment: 94,
      vacancyId: "v-hv-gm", openRoles: 18, demand: "Steady", adjacent: false, timeToMove: "Now",
      matched: ["P&L ownership", "Team leadership", "Hotel turnaround", "Commercial strategy", "Owner and stakeholder relations"],
      gaps: [], courseIds: [], explanation: "Your strongest and most immediate route: two offers already reflect it." },
    { id: "ps-asset", title: "Hotel Asset Manager", industry: "Hotel investment", salary: [110000, 130000], alignment: 72,
      openRoles: 4, demand: "Limited", adjacent: true, timeToMove: "6 to 12 months",
      matched: ["P&L ownership", "Owner and stakeholder relations", "Commercial strategy"],
      gaps: [{ label: "Investment and valuation analysis", how: "Diploma in Corporate Finance is a strong base" }],
      courseIds: ["crs-finance"], explanation: "A move to the owner's side of the table. Your corporate finance diploma and owner relationships are the bridge." },
  ],
};

/** Scenarios the market value simulator can combine. Effects are illustrative. */
export interface ValueScenario { id: string; label: string; detail: string; low: number; high: number; roles: number; note: string }

export const VALUE_SCENARIOS: Record<string, ValueScenario[]> = {
  "c-aoife": [
    { id: "qual", label: "Complete a new qualification", detail: "Wine & Beverage Leadership Diploma", low: 3000, high: 9000, roles: 7, note: "Opens Director of F&B and beverage-led GM roles. In selected relevant roles the effect can reach €8,000 to €15,000." },
    { id: "senior", label: "Gain senior management experience", detail: "Two years with full P&L ownership", low: 15000, high: 28000, roles: 18, note: "Moves you into the general manager bracket." },
    { id: "relocate", label: "Relocate", detail: "London hotel market", low: 9000, high: 16000, roles: 26, note: "Higher salaries, but higher living costs. Net effect depends on housing." },
    { id: "industry", label: "Move into a different industry", detail: "Customer experience in venues or retail", low: -2000, high: 4000, roles: 17, note: "Similar pay, more regular hours, wider long-term ceiling." },
    { id: "special", label: "Develop a specialism", detail: "Group guest experience and service design", low: 4000, high: 8000, roles: 9, note: "Few people combine operations and service design. Groups pay for it." },
  ],
  "c-mark": [
    { id: "qual", label: "Complete a new qualification", detail: "Events Operations Professional Certificate", low: 4000, high: 9000, roles: 23, note: "Closes the two gaps events employers ask about." },
    { id: "senior", label: "Gain senior management experience", detail: "Director-level role in hospitality", low: 8000, high: 14000, roles: 14, note: "Director of F&B or resort operations." },
    { id: "relocate", label: "Relocate", detail: "Dublin city roles", low: 3000, high: 7000, roles: 31, note: "Most events and CX roles are Dublin-based." },
    { id: "industry", label: "Move into a different industry", detail: "Events Operations Director", low: 8000, high: 11000, roles: 23, note: "Your strongest adjacent move: 86% transferable-skills alignment." },
    { id: "special", label: "Develop a specialism", detail: "Procurement and supplier management", low: 2000, high: 6000, roles: 12, note: "Your food-cost result is strong evidence." },
  ],
  "c-sarah": [
    { id: "qual", label: "Complete a new qualification", detail: "Asset management or investment course", low: 2000, high: 8000, roles: 4, note: "Bridges into asset management." },
    { id: "senior", label: "Gain senior management experience", detail: "Group operations director", low: 15000, high: 22000, roles: 6, note: "Fewer roles, higher ceiling." },
    { id: "relocate", label: "Relocate", detail: "Dublin flagship hotels", low: 6000, high: 14000, roles: 18, note: "Both current offers are in Dublin." },
    { id: "industry", label: "Move into a different industry", detail: "Hotel investment and asset management", low: -4000, high: 8000, roles: 4, note: "Owner-side roles value your turnaround record." },
    { id: "special", label: "Develop a specialism", detail: "Turnaround and repositioning", low: 5000, high: 12000, roles: 8, note: "Interim and turnaround GM work commands a premium." },
  ],
};

/** Earnings history and the market benchmark for the same experience level. */
export const SALARY_HISTORY: Record<string, { year: string; salary: number; market: number }[]> = {
  "c-aoife": [
    { year: "2013", salary: 24000, market: 26000 }, { year: "2015", salary: 31000, market: 33000 }, { year: "2017", salary: 42000, market: 45000 },
    { year: "2019", salary: 55000, market: 58000 }, { year: "2021", salary: 68000, market: 73000 }, { year: "2023", salary: 74000, market: 82000 },
    { year: "2025", salary: 78000, market: 87000 }, { year: "Now", salary: 80000, market: 90000 },
  ],
  "c-mark": [
    { year: "2009", salary: 29000, market: 30000 }, { year: "2012", salary: 36000, market: 38000 }, { year: "2015", salary: 47000, market: 48000 },
    { year: "2018", salary: 55000, market: 57000 }, { year: "2021", salary: 61000, market: 63000 }, { year: "2024", salary: 65000, market: 67000 },
    { year: "Now", salary: 67000, market: 69000 },
  ],
  "c-sarah": [
    { year: "2005", salary: 38000, market: 40000 }, { year: "2009", salary: 52000, market: 54000 }, { year: "2012", salary: 68000, market: 70000 },
    { year: "2016", salary: 88000, market: 92000 }, { year: "2019", salary: 102000, market: 108000 }, { year: "2022", salary: 109000, market: 120000 },
    { year: "Now", salary: 114000, market: 128000 },
  ],
};

/** How each persona compares with similar professionals (illustrative cohort). */
export const PEER_COMPARISON: Record<string, { cohort: string; size: number; rows: { label: string; you: string; peers: string; pct: number }[] }> = {
  "c-aoife": { cohort: "Deputy general managers in Dublin with 11 to 15 years' experience", size: 412, rows: [
    { label: "Current salary", you: "€80,000", peers: "€86,500 median", pct: 38 },
    { label: "Recruit Index", you: "842", peers: "791 median", pct: 79 },
    { label: "Team size led", you: "64", peers: "48 median", pct: 71 },
    { label: "Verified credentials", you: "7", peers: "5 median", pct: 68 },
  ] },
  "c-mark": { cohort: "F&B operations managers in Leinster with 15 to 20 years' experience", size: 288, rows: [
    { label: "Current salary", you: "€67,000", peers: "€68,800 median", pct: 44 },
    { label: "Recruit Index", you: "804", peers: "772 median", pct: 69 },
    { label: "Budget managed", you: "€8.4m", peers: "€5.1m median", pct: 83 },
    { label: "Verified credentials", you: "6", peers: "5 median", pct: 58 },
  ] },
  "c-sarah": { cohort: "Hotel general managers in Ireland with 18 to 25 years' experience", size: 196, rows: [
    { label: "Current salary", you: "€114,000", peers: "€121,000 median", pct: 36 },
    { label: "Recruit Index", you: "916", peers: "858 median", pct: 91 },
    { label: "Team size led", you: "230", peers: "170 median", pct: 74 },
    { label: "Verified credentials", you: "11", peers: "7 median", pct: 88 },
  ] },
};

/** Job categories where a persona's skills are in demand (illustrative open roles). */
export const DEMAND_BY_CATEGORY: Record<string, { label: string; roles: number; range: [number, number] }[]> = {
  "c-aoife": [
    { label: "Deputy and assistant GM", roles: 31, range: [80000, 95000] },
    { label: "Guest experience leadership", roles: 12, range: [85000, 100000] },
    { label: "Hotel manager", roles: 24, range: [85000, 105000] },
    { label: "Customer experience, other sectors", roles: 17, range: [78000, 92000] },
    { label: "General manager (stretch)", roles: 18, range: [105000, 125000] },
  ],
  "c-mark": [
    { label: "F&B leadership in hotels", roles: 38, range: [64000, 80000] },
    { label: "Events operations", roles: 23, range: [70000, 85000] },
    { label: "Retail operations", roles: 41, range: [68000, 82000] },
    { label: "Customer experience", roles: 17, range: [75000, 90000] },
    { label: "Procurement", roles: 12, range: [60000, 74000] },
  ],
  "c-sarah": [
    { label: "Hotel general manager", roles: 18, range: [118000, 140000] },
    { label: "Area and cluster GM", roles: 7, range: [125000, 145000] },
    { label: "Group operations director", roles: 6, range: [135000, 155000] },
    { label: "Asset management", roles: 4, range: [110000, 130000] },
  ],
};

/** Actions that would add evidence to a profile and lift the index. */
export const INDEX_ACTIONS: Record<string, { id: string; label: string; area: string; points: number; effort: string }[]> = {
  "c-aoife": [
    { id: "ia-opera", label: "Finish verifying your Opera PMS certificate", area: "Skills evidence", points: 8, effort: "Waiting on the issuer" },
    { id: "ia-ref", label: "Add a reference from your current general manager", area: "Verified experience", points: 14, effort: "10 minutes" },
    { id: "ia-rev", label: "Attach your guest review score report", area: "Leadership achievements", points: 9, effort: "5 minutes" },
    { id: "ia-wine", label: "Complete the Wine & Beverage Leadership Diploma", area: "Qualifications", points: 18, effort: "16 weeks" },
    { id: "ia-pnl", label: "Describe the budget you own, with figures", area: "Profile evidence", points: 6, effort: "5 minutes" },
  ],
  "c-mark": [
    { id: "im-ref", label: "Add a reference from a corporate events client", area: "Verified experience", points: 12, effort: "10 minutes" },
    { id: "im-neg", label: "Evidence the supplier renegotiation that cut food cost", area: "Skills evidence", points: 10, effort: "5 minutes" },
    { id: "im-evt", label: "Complete the Events Operations Professional Certificate", area: "Qualifications", points: 16, effort: "12 weeks" },
    { id: "im-wine", label: "Verify your Wine and Spirits Certificate", area: "Qualifications", points: 4, effort: "2 days" },
  ],
  "c-sarah": [
    { id: "is-board", label: "Add a reference from your owners' board", area: "Verified experience", points: 8, effort: "10 minutes" },
    { id: "is-sus", label: "Evidence the sustainability programme results", area: "Skills evidence", points: 6, effort: "5 minutes" },
    { id: "is-conf", label: "Verify conference sales results", area: "Leadership achievements", points: 5, effort: "2 days" },
  ],
};
