import type { ActivityEvent } from "./types";

/* Seed activity. New events from demo actions are prepended by the store. */
const now = Date.now();
const ago = (mins: number) => now - mins * 60000;
let n = 0;
const ev = (mins: number, when: string, category: ActivityEvent["category"], actor: string, title: string, detail: string, refs: string[], status: ActivityEvent["status"] = "completed"): ActivityEvent =>
  ({ id: "seed" + (++n), at: ago(mins), when, category, actor, title, detail, refs, status });

export const SEED_ACTIVITY: ActivityEvent[] = [
  ev(4, "4 min ago", "profiles", "Profile Intelligence", "CV analysed", "A new CV was structured into a profile with four items to verify.", ["Profile Intelligence"], "completed"),
  ev(11, "11 min ago", "hiring", "Talent Matchmaker", "18 profiles ranked for General Manager", "Harbourview Grand Hotel's General Manager vacancy was re-ranked after a profile update.", ["v-hv-gm", "e-harbourview"]),
  ev(26, "26 min ago", "financial", "Recruit", "Membership renewed", "Corrib Point Hotel renewed its Growth membership at €595.", ["e-corrib"]),
  ev(38, "38 min ago", "hiring", "Rachel Moran", "Interview confirmed", "Tomás Ryan confirmed his second interview for General Manager, Fri 20 Nov.", ["c-tomas", "v-hv-gm"]),
  ev(52, "52 min ago", "profiles", "Yasmin Haddad", "Credential verified", "Emer Fitzgerald's Certificate in Revenue Management was confirmed by the issuer and recorded by the verification team.", ["c-emer", "pt-liffey"]),
  ev(75, "1 h ago", "agents", "Ops Watchdog", "Exception raised", "Operations Director, Ireland (Fenwick & Vale) has had no shortlist for 26 days.", ["v-fv-opsd", "e-fenwick"], "awaiting"),
  ev(96, "1 h ago", "learning", "Liffey Institute", "Course enrolment", "A Recruit member enrolled in the Revenue Management Certificate with the member discount.", ["crs-revenue", "pt-liffey"]),
  ev(124, "2 h ago", "hiring", "Cedarhouse Hotels", "Profile viewed", "Cedarhouse viewed Aoife Byrne's profile for Regional Guest Experience Director.", ["c-aoife", "v-ch-rged", "e-cedarhouse"]),
  ev(150, "2 h ago", "financial", "Recruit", "Success fee invoiced", "€5,120 invoiced to Alder & Oak Restaurants for the Head Chef placement (8%).", ["e-alder", "pl4"]),
  ev(210, "3 h ago", "growth", "Growth & Partnerships", "Experiment drafted", "Student pathways proposal for Leeside College drafted for John's review.", ["pt-leeside"], "awaiting"),
  ev(260, "4 h ago", "hiring", "Priya Nair", "Interview accepted", "Priya accepted a video interview for Revenue Manager, Mon 23 Nov.", ["c-priya", "v-hv-rev"]),
  ev(330, "5 h ago", "agents", "Briefing Agent", "Morning briefing posted", "48 placements this month; Harbourview has two offers in progress for General Manager.", ["Briefing Agent"]),
  ev(380, "6 h ago", "profiles", "Mark Doyle", "Career report opened", "Mark Doyle opened his transferable skills report from Career Pathfinder.", ["c-mark"]),
  ev(470, "8 h ago", "hiring", "Recruit", "Introduction awaiting consent", "Harbourview requested an introduction to Professional #42230 (anonymous profile). Contact details stay hidden until they agree.", ["c-ciaran", "v-hv-gm"], "awaiting"),
  ev(1440, "Yesterday", "hiring", "Talent Matchmaker", "Pipeline suggestion", "Mark Doyle suggested for Head of Food & Beverage at Harbourview.", ["c-mark", "v-hv-fb"]),
  ev(1500, "Yesterday", "financial", "Recruit", "Placement fee paid", "Saltmarsh Bay Resort paid €5,680 for the Revenue Manager placement.", ["e-saltmarsh", "pl3"]),
  ev(1580, "Yesterday", "profiles", "Aoife Byrne", "Certificate uploaded", "Aoife Byrne uploaded her Opera PMS certificate for verification.", ["c-aoife"], "awaiting"),
  ev(1640, "Yesterday", "hiring", "Rachel Moran", "Contingency offer drafted", "A contingency offer for General Manager was routed to Deirdre Foley for approval.", ["o-hv-declan", "v-hv-gm"], "awaiting"),
  ev(7200, "Fri 13 Nov", "hiring", "Cedarhouse Hotels", "Offer sent", "Cedarhouse Hotels sent Sarah Kavanagh an offer for General Manager, Grand Canal: €128,000.", ["c-sarah", "o-ch-sarah"]),
  ev(10080, "Wed 11 Nov", "hiring", "Harbourview Grand Hotel", "Offer sent", "Harbourview sent Sarah Kavanagh an offer for General Manager: €120,000.", ["c-sarah", "o-hv-sarah"]),
  ev(8640, "Thu 12 Nov", "financial", "Recruit", "Membership upgraded", "Atlantic Crest Hotel Group moved to the Enterprise tier.", ["e-atlantic"]),
  ev(12960, "Mon 9 Nov", "learning", "Corrib Academy", "Placement partner added", "Corrib Hospitality Academy offered two live-event placements for the Events Operations certificate (concept).", ["pt-corrib", "crs-events"]),
];
