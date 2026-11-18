import type { Course, Enrolment, Partner } from "./types";

/* Education partners are fictional. None of them is a signed commercial
   partner; statuses describe where they would sit in a partnership pipeline. */

export const PARTNER_STATUS_NOTE = "Fictional demo institutions. No partnership has been signed.";

export const PARTNERS: Partner[] = [
  { id: "pt-liffey", name: "Liffey Institute of Hospitality Leadership", short: "Liffey Institute", initials: "LI", tint: "#9fb4ff",
    kind: "Professional education", location: "Dublin", status: "Concept partner", courses: 4, referrals: 1840, enrolments: 412, revenueShare: 0.12,
    note: "Leadership, revenue and beverage programmes for working managers." },
  { id: "pt-corrib", name: "Corrib Hospitality Academy", short: "Corrib Academy", initials: "CA", tint: "#7fe0d2",
    kind: "Culinary and operations", location: "Galway", status: "Concept partner", courses: 2, referrals: 960, enrolments: 238, revenueShare: 0.1,
    note: "Events, culinary and accommodation certificates." },
  { id: "pt-northgate", name: "Northgate Business School", short: "Northgate", initials: "NB", tint: "#e6c78a",
    kind: "Business and management", location: "Dublin", status: "Proposed partner", courses: 4, referrals: 1210, enrolments: 296, revenueShare: 0.1,
    note: "Finance, people leadership and customer experience for operators moving up or across." },
  { id: "pt-leeside", name: "Leeside College of Hotel Management", short: "Leeside College", initials: "LC", tint: "#c8b4f0",
    kind: "Degrees and graduate pathways", location: "Cork", status: "Proposed partner", courses: 1, referrals: 2380, enrolments: 140, revenueShare: 0.08,
    note: "Graduate pipeline: final-year students build Recruit profiles before they graduate." },
  { id: "pt-skills", name: "Hospitality Skills Board", short: "Skills Board", initials: "SB", tint: "#a8e0c0",
    kind: "Compliance certification", location: "National", status: "Verification pilot (simulated)", courses: 1, referrals: 3120, enrolments: 1610, revenueShare: 0.05,
    note: "Food safety and compliance certificates, with simulated credential checks." },
];

export const COURSES: Course[] = [
  { id: "crs-wine", partnerId: "pt-liffey", title: "Wine & Beverage Leadership Diploma", category: "Leadership", level: "Professional diploma",
    duration: "16 weeks, part-time", format: "Evenings online plus four Saturday workshops in Dublin", price: 2850, memberDiscount: 0.15,
    skills: ["Beverage programme strategy", "Wine list and margin management", "Supplier negotiation", "Beverage team leadership"],
    roles: ["Director of Food & Beverage", "Hotel General Manager", "Guest Experience Director", "Beverage Director"],
    impact: [8000, 15000], credential: "Professional Diploma in Wine & Beverage Leadership", starts: "January intake",
    summary: "Builds the commercial and leadership side of beverage: list strategy, margins, supplier terms and leading a beverage team. Graduates move into F&B director and general manager roles where beverage is a profit driver.",
    modules: ["Beverage economics and margin", "Building a wine list that sells", "Supplier negotiation and terms", "Leading sommeliers and bar teams", "Capstone: a beverage plan for your hotel"],
    recommendedFor: ["c-aoife", "c-sean", "c-eoin"], enrolled: 214, rating: 4.7 },
  { id: "crs-gm", partnerId: "pt-liffey", title: "Executive Programme in Hotel General Management", category: "Leadership", level: "Executive programme",
    duration: "6 months, part-time", format: "Monthly residential blocks plus online cohort work", price: 6900, memberDiscount: 0.1,
    skills: ["P&L ownership", "Owner and stakeholder relations", "Commercial strategy", "Executive leadership"],
    roles: ["Hotel General Manager", "Area General Manager", "Operations Director"],
    impact: [12000, 25000], credential: "Executive Certificate in Hotel General Management", starts: "February intake",
    summary: "For deputy GMs and hotel managers preparing for their first general manager role. Covers P&L, owner reporting and commercial strategy, with a mentor GM for each participant.",
    modules: ["Reading and owning the P&L", "Owner and board reporting", "Commercial strategy and revenue", "Leading heads of department", "Capstone: your first 100 days as GM"],
    recommendedFor: ["c-aoife", "c-emer", "c-grainne"], enrolled: 96, rating: 4.8 },
  { id: "crs-revenue", partnerId: "pt-liffey", title: "Revenue Management Certificate", category: "Commercial", level: "Certificate",
    duration: "10 weeks, online", format: "Self-paced with weekly live sessions", price: 1450, memberDiscount: 0.15,
    skills: ["Forecasting", "Pricing strategy", "Distribution management"], roles: ["Revenue Manager", "Commercial Director"],
    impact: [4000, 9000], credential: "Certificate in Revenue Management", starts: "Monthly",
    summary: "Forecasting, pricing and distribution for hotel managers and analysts.", modules: ["Forecasting", "Pricing", "Distribution", "Total revenue"],
    recommendedFor: ["c-zara", "c-rory"], enrolled: 388, rating: 4.6 },
  { id: "crs-sommelier", partnerId: "pt-liffey", title: "Hotel Beverage Supervisor Certificate", category: "Operations", level: "Certificate",
    duration: "6 weeks", format: "Online", price: 690, memberDiscount: 0.15, skills: ["Beverage operations", "Stock control"], roles: ["Bar Manager"],
    impact: [2000, 4000], credential: "Certificate in Beverage Supervision", starts: "Monthly", summary: "Beverage operations for supervisors.",
    modules: ["Service", "Stock", "Training"], recommendedFor: [], enrolled: 520, rating: 4.4 },
  { id: "crs-events", partnerId: "pt-corrib", title: "Events Operations Professional Certificate", category: "Career change", level: "Professional certificate",
    duration: "12 weeks, part-time", format: "Online plus two live-event placements", price: 1690, memberDiscount: 0.15,
    skills: ["Crowd and venue safety", "Production and AV suppliers", "Event risk planning", "Large-team leadership"],
    roles: ["Events Operations Director", "Event Production Manager", "Venue Operations Manager"],
    impact: [5000, 10000], credential: "Professional Certificate in Events Operations", starts: "January intake",
    summary: "Closes the two gaps hotel event managers usually have when they move into live events: festival-scale safety and production suppliers.",
    modules: ["Venue and crowd safety", "Production, staging and AV", "Event risk and licensing", "Running large temporary teams", "Live-event placement"],
    recommendedFor: ["c-mark", "c-fiona", "c-ruairi"], enrolled: 158, rating: 4.6 },
  { id: "crs-accom", partnerId: "pt-corrib", title: "Accommodation Management Certificate", category: "Operations", level: "Certificate",
    duration: "8 weeks", format: "Online", price: 890, memberDiscount: 0.15, skills: ["Housekeeping operations", "Quality audits"], roles: ["Executive Housekeeper"],
    impact: [3000, 6000], credential: "Certificate in Accommodation Management", starts: "Monthly", summary: "Housekeeping and accommodation leadership.",
    modules: ["Standards", "Productivity", "Teams"], recommendedFor: ["c-maria"], enrolled: 244, rating: 4.5 },
  { id: "crs-retail", partnerId: "pt-northgate", title: "Retail Operations Leadership", category: "Career change", level: "Certificate",
    duration: "10 weeks, part-time", format: "Online with store visits", price: 1590, memberDiscount: 0.15,
    skills: ["Retail KPIs", "Shrinkage control", "Multi-store management", "Visual merchandising basics"],
    roles: ["Regional Retail Operations Manager", "Store Operations Manager"], impact: [4000, 9000], credential: "Certificate in Retail Operations Leadership", starts: "February intake",
    summary: "Retail metrics and multi-store management for operators coming from hospitality.",
    modules: ["Retail economics", "Shrinkage and stock", "Leading store managers", "Merchandising"], recommendedFor: ["c-mark", "c-ben"], enrolled: 132, rating: 4.4 },
  { id: "crs-cx", partnerId: "pt-northgate", title: "Customer Experience Strategy", category: "Career change", level: "Certificate",
    duration: "8 weeks, part-time", format: "Online", price: 1380, memberDiscount: 0.2,
    skills: ["Journey mapping", "NPS programmes", "Service design", "CX measurement"],
    roles: ["Customer Experience Director", "Guest Experience Director", "Head of Service"], impact: [5000, 11000], credential: "Certificate in Customer Experience Strategy", starts: "Monthly",
    summary: "Turns hospitality service instinct into the measurement and design language CX teams in other sectors use.",
    modules: ["Journey mapping", "Measuring experience", "Service design", "Building a CX business case"], recommendedFor: ["c-mark", "c-aoife", "c-orla"], enrolled: 276, rating: 4.7 },
  { id: "crs-finance", partnerId: "pt-northgate", title: "Financial Acumen for Operators", category: "Commercial", level: "Short course",
    duration: "6 weeks, online", format: "Online", price: 980, memberDiscount: 0.2,
    skills: ["P&L reading", "Budget forecasting", "Capital planning"], roles: ["Hotel General Manager", "Operations Director"], impact: [3000, 7000],
    credential: "Certificate in Financial Acumen", starts: "Monthly", summary: "P&L, budgets and capital planning for operators heading into general management.",
    modules: ["The hotel P&L", "Budgets and forecasts", "Capital projects"], recommendedFor: ["c-aoife", "c-mark", "c-emer"], enrolled: 341, rating: 4.5 },
  { id: "crs-people", partnerId: "pt-northgate", title: "People Leadership in Hospitality", category: "Leadership", level: "Short course",
    duration: "8 weeks", format: "Online", price: 1250, memberDiscount: 0.2, skills: ["Coaching", "Performance management", "Retention"],
    roles: ["Head of Department", "Hotel Manager"], impact: [3000, 6000], credential: "Certificate in People Leadership", starts: "Monthly",
    summary: "Coaching, performance and retention for heads of department.", modules: ["Coaching", "Performance", "Retention"], recommendedFor: ["c-joseph"], enrolled: 402, rating: 4.6 },
  { id: "crs-sustain", partnerId: "pt-leeside", title: "Sustainable Hospitality Operations", category: "Specialism", level: "Short course",
    duration: "8 weeks", format: "Online", price: 1150, memberDiscount: 0.15, skills: ["Energy and waste", "Sustainability reporting", "Supplier sustainability"],
    roles: ["Hotel General Manager", "Sustainability Lead"], impact: [3000, 8000], credential: "Certificate in Sustainable Hospitality", starts: "March intake",
    summary: "Energy, waste and reporting for operators building a sustainability specialism.", modules: ["Energy", "Waste", "Reporting"], recommendedFor: ["c-aoife"], enrolled: 118, rating: 4.5 },
  { id: "crs-food", partnerId: "pt-skills", title: "Food Safety Management, Level 3", category: "Compliance", level: "Certificate",
    duration: "3 days", format: "In person", price: 390, memberDiscount: 0.1, skills: ["Food safety management"], roles: ["Head Chef", "F&B Manager"],
    impact: [0, 2000], credential: "Food Safety Management, Level 3", starts: "Weekly", summary: "Required for kitchen and F&B leaders.",
    modules: ["HACCP", "Audits", "Training"], recommendedFor: [], enrolled: 1610, rating: 4.3 },
];

export const COURSE_BY_ID: Record<string, Course> = Object.fromEntries(COURSES.map(c => [c.id, c]));
export const PARTNER_BY_ID: Record<string, Partner> = Object.fromEntries(PARTNERS.map(p => [p.id, p]));

export const ENROLMENTS: Enrolment[] = [
  { id: "en1", candidateId: "c-eoin", courseId: "crs-wine", date: "2022", status: "completed", progress: 100 },
  { id: "en2", candidateId: "c-fiona", courseId: "crs-events", date: "Oct", status: "in progress", progress: 45 },
  { id: "en3", candidateId: "c-zara", courseId: "crs-revenue", date: "Sep", status: "in progress", progress: 70 },
  { id: "en4", candidateId: "c-emer", courseId: "crs-gm", date: "Sep", status: "in progress", progress: 38 },
];

/** Credential verification requests sent to partners (simulated). */
export const CREDENTIAL_CHECKS = [
  { id: "cc1", candidateId: "c-aoife", credential: "Occupational First Aid", issuer: "Response Training Ireland", status: "pending", age: "2 days" },
  { id: "cc2", candidateId: "c-lucia", credential: "MSc Tourism Management", issuer: "Universidade do Tejo", status: "pending", age: "5 days" },
  { id: "cc3", candidateId: "c-emer", credential: "Certificate in Revenue Management", issuer: "Liffey Institute of Hospitality Leadership", status: "verified", age: "Yesterday" },
  { id: "cc4", candidateId: "c-zara", credential: "BSc Economics", issuer: "Northgate Business School", status: "verified", age: "3 days" },
  { id: "cc5", candidateId: "c-joseph", credential: "Higher Certificate in Hospitality", issuer: "Corrib Hospitality Academy", status: "pending", age: "1 day" },
];
