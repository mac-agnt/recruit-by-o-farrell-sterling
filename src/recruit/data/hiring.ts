import type { Application, Interview, IntroRequest, MessageThread, Offer, PipelineEntry, Placement, Stage } from "./types";

export const STAGES: { id: Stage; label: string; hint: string }[] = [
  { id: "identified", label: "Identified", hint: "Found in search or suggested" },
  { id: "shortlisted", label: "Shortlisted", hint: "Worth a closer look" },
  { id: "contact", label: "Contact requested", hint: "Waiting for candidate consent" },
  { id: "interview", label: "Interview", hint: "Interviews booked or held" },
  { id: "offer", label: "Offer", hint: "Offer drafted or sent" },
  { id: "hired", label: "Hired", hint: "Offer accepted" },
];
export const STAGE_ORDER: Stage[] = STAGES.map(s => s.id);

export const PIPELINE: PipelineEntry[] = [
  { id: "p1", vacancyId: "v-hv-gm", candidateId: "c-patrick", stage: "identified", source: "search", updated: "2 days ago" },
  { id: "p2", vacancyId: "v-hv-gm", candidateId: "c-lucia", stage: "identified", source: "agent", updated: "Yesterday", note: "Suggested by Talent Matchmaker" },
  { id: "p3", vacancyId: "v-hv-gm", candidateId: "c-niamh", stage: "shortlisted", source: "search", updated: "5 days ago" },
  { id: "p4", vacancyId: "v-hv-gm", candidateId: "c-emer", stage: "shortlisted", source: "applied", updated: "4 days ago" },
  { id: "p5", vacancyId: "v-hv-gm", candidateId: "c-ciaran", stage: "contact", source: "search", updated: "2 days ago", note: "Introduction requested, awaiting consent" },
  { id: "p6", vacancyId: "v-hv-gm", candidateId: "c-tomas", stage: "interview", source: "applied", updated: "Today", note: "Second interview Fri 20 Nov" },
  { id: "p7", vacancyId: "v-hv-gm", candidateId: "c-declan", stage: "offer", source: "search", updated: "2 days ago", note: "Contingency offer awaiting approval" },
  { id: "p8", vacancyId: "v-hv-gm", candidateId: "c-sarah", stage: "offer", source: "search", updated: "Mon", note: "Offer sent 11 Nov" },
  { id: "p9", vacancyId: "v-hv-rev", candidateId: "c-zara", stage: "identified", source: "applied", updated: "3 days ago" },
  { id: "p10", vacancyId: "v-hv-rev", candidateId: "c-priya", stage: "interview", source: "search", updated: "Yesterday", note: "First interview Mon 23 Nov" },
  { id: "p11", vacancyId: "v-hv-fb", candidateId: "c-mark", stage: "identified", source: "agent", updated: "Today", note: "Suggested by Talent Matchmaker. Exploring a move out of hotels." },
  { id: "p12", vacancyId: "v-hv-fb", candidateId: "c-eoin", stage: "shortlisted", source: "search", updated: "Yesterday" },
  { id: "p13", vacancyId: "v-hv-fb", candidateId: "c-sean", stage: "identified", source: "search", updated: "Today" },
  { id: "p14", vacancyId: "v-ch-gm", candidateId: "c-sarah", stage: "offer", source: "search", updated: "Fri", note: "Offer sent 13 Nov" },
  { id: "p15", vacancyId: "v-ch-rged", candidateId: "c-orla", stage: "shortlisted", source: "search", updated: "3 days ago" },
  { id: "p16", vacancyId: "v-ch-rged", candidateId: "c-grainne", stage: "identified", source: "search", updated: "Yesterday" },
  { id: "p17", vacancyId: "v-lc-dgm", candidateId: "c-aoife", stage: "interview", source: "applied", updated: "Today", note: "Second interview Thu 26 Nov" },
  { id: "p18", vacancyId: "v-sb-rom", candidateId: "c-aoife", stage: "identified", source: "applied", updated: "6 days ago" },
  { id: "p19", vacancyId: "v-nl-eod", candidateId: "c-fiona", stage: "shortlisted", source: "search", updated: "4 days ago" },
  { id: "p20", vacancyId: "v-nl-eod", candidateId: "c-ruairi", stage: "identified", source: "search", updated: "Yesterday" },
  { id: "p21", vacancyId: "v-bw-rrom", candidateId: "c-mark", stage: "identified", source: "applied", updated: "4 days ago" },
  { id: "p22", vacancyId: "v-bw-rrom", candidateId: "c-ben", stage: "interview", source: "search", updated: "2 days ago" },
  { id: "p23", vacancyId: "v-qc-cxd", candidateId: "c-orla", stage: "contact", source: "search", updated: "Yesterday" },
  { id: "p24", vacancyId: "v-fv-hm", candidateId: "c-lucia", stage: "identified", source: "agent", updated: "Today" },
];

export const APPLICATIONS: Application[] = [
  { id: "a1", candidateId: "c-aoife", vacancyId: "v-lc-dgm", status: "interview", date: "6 Nov", note: "Second interview Thu 26 Nov, 10:00 at the estate" },
  { id: "a2", candidateId: "c-aoife", vacancyId: "v-sb-rom", status: "viewed", date: "12 Nov", note: "Viewed by the resort director on 14 Nov" },
  { id: "a3", candidateId: "c-mark", vacancyId: "v-bw-rrom", status: "submitted", date: "14 Nov", note: "Cross-industry pilot role" },
  { id: "a4", candidateId: "c-emer", vacancyId: "v-hv-gm", status: "viewed", date: "10 Nov" },
  { id: "a5", candidateId: "c-tomas", vacancyId: "v-hv-gm", status: "interview", date: "4 Nov" },
  { id: "a6", candidateId: "c-zara", vacancyId: "v-hv-rev", status: "submitted", date: "15 Nov" },
];

export const INTERVIEWS: Interview[] = [
  { id: "i1", vacancyId: "v-hv-gm", candidateId: "c-tomas", when: "Fri 20 Nov, 14:00", format: "In person", panel: ["Rachel Moran", "Owners' board representative"], round: 2, status: "scheduled" },
  { id: "i2", vacancyId: "v-hv-rev", candidateId: "c-priya", when: "Mon 23 Nov, 11:00", format: "Video", panel: ["Rachel Moran", "Conall Hegarty"], round: 1, status: "scheduled" },
  { id: "i3", vacancyId: "v-lc-dgm", candidateId: "c-aoife", when: "Thu 26 Nov, 10:00", format: "In person", panel: ["Hugh Carberry"], round: 2, status: "scheduled" },
  { id: "i4", vacancyId: "v-hv-gm", candidateId: "c-sarah", when: "Thu 5 Nov, 11:00", format: "In person", panel: ["Rachel Moran", "Deirdre Foley", "Owners' board representative"], round: 2, status: "completed" },
  { id: "i5", vacancyId: "v-hv-gm", candidateId: "c-declan", when: "Tue 3 Nov, 15:00", format: "In person", panel: ["Rachel Moran", "Owners' board representative"], round: 2, status: "completed" },
  { id: "i6", vacancyId: "v-bw-rrom", candidateId: "c-ben", when: "Wed 25 Nov, 09:30", format: "Video", panel: ["Sorcha Brady"], round: 1, status: "scheduled" },
];

export const OFFERS: Offer[] = [
  { id: "o-hv-sarah", vacancyId: "v-hv-gm", employerId: "e-harbourview", candidateId: "c-sarah", title: "General Manager",
    salary: 120000, bonus: "Performance bonus up to 15% of base", benefits: ["Pension, 8% employer contribution", "Private healthcare for the family", "Performance bonus up to 15%"],
    location: "Dublin 2", start: "Mon 4 Jan 2027", expires: "Wed 25 Nov", status: "sent", visibleToCandidate: true, approver: "Deirdre Foley",
    history: [
      { when: "Mon 9 Nov", who: "Rachel Moran", text: "Offer drafted from the General Manager vacancy", kind: "employer" },
      { when: "Tue 10 Nov", who: "Deirdre Foley", text: "Approved by the Finance Director", kind: "approval" },
      { when: "Tue 10 Nov", who: "Owners' board", text: "Approved by the owners' board", kind: "approval" },
      { when: "Wed 11 Nov", who: "Recruit", text: "Sent to Sarah. Her contact details were already shared with consent.", kind: "system" },
      { when: "Thu 12 Nov", who: "Sarah Kavanagh", text: "Asked how the performance bonus is measured", kind: "candidate" },
      { when: "Fri 13 Nov", who: "Rachel Moran", text: "Shared the bonus scorecard: GOP, guest score and team retention", kind: "employer" },
    ] },
  { id: "o-ch-sarah", vacancyId: "v-ch-gm", employerId: "e-cedarhouse", candidateId: "c-sarah", title: "General Manager, Cedarhouse Grand Canal",
    salary: 128000, bonus: "Annual bonus up to 10% of base", benefits: ["Pension, 6% employer contribution", "Private healthcare", "Relocation allowance of €10,000"],
    location: "Dublin 4", start: "Mon 11 Jan 2027", expires: "Fri 27 Nov", status: "sent", visibleToCandidate: true, approver: "Group CEO",
    history: [
      { when: "Thu 12 Nov", who: "Fergus Hanley", text: "Offer drafted", kind: "employer" },
      { when: "Fri 13 Nov", who: "Group CEO", text: "Approved", kind: "approval" },
      { when: "Fri 13 Nov", who: "Recruit", text: "Sent to Sarah", kind: "system" },
    ] },
  { id: "o-hv-declan", vacancyId: "v-hv-gm", employerId: "e-harbourview", candidateId: "c-declan", title: "General Manager",
    salary: 122000, bonus: "Performance bonus up to 15% of base", benefits: ["Pension, 8% employer contribution", "Private healthcare for the family", "Performance bonus up to 15%"],
    location: "Dublin 2", start: "Mon 1 Feb 2027", expires: "Not sent", status: "awaiting approval", visibleToCandidate: false, approver: "Deirdre Foley", contingency: true,
    history: [
      { when: "Mon 16 Nov", who: "Rachel Moran", text: "Contingency offer drafted in case the first-choice offer is declined. Not visible to the candidate.", kind: "employer" },
      { when: "Mon 16 Nov", who: "Recruit", text: "Routed to Deirdre Foley for approval", kind: "system" },
    ] },
];

export const PLACEMENTS: Placement[] = [
  { id: "pl1", candidateId: "c-roisin", employerId: "e-atlantic", vacancyId: "v-ac-hme", salary: 92000, feeRate: 0.08, date: "3 Nov", startDate: "16 Nov", invoice: "invoiced" },
  { id: "pl2", candidateId: "c-amir", employerId: "e-corrib", vacancyId: "v-cp-hfb", salary: 76000, feeRate: 0.08, date: "6 Nov", startDate: "1 Dec", invoice: "pending" },
  { id: "pl3", candidateId: "c-clare", employerId: "e-saltmarsh", vacancyId: "v-sb-revm", salary: 71000, feeRate: 0.08, date: "2 Nov", startDate: "9 Nov", invoice: "paid" },
  { id: "pl4", candidateId: "c-gavin", employerId: "e-alder", vacancyId: "v-ao-hc", salary: 64000, feeRate: 0.08, date: "9 Nov", startDate: "23 Nov", invoice: "invoiced" },
  { id: "pl5", candidateId: "c-sinead", employerId: "e-larchfield", vacancyId: "v-lc-grm", salary: 52000, feeRate: 0.08, date: "10 Nov", startDate: "30 Nov", invoice: "pending" },
  { id: "pl6", candidateId: "c-tadhg", employerId: "e-quayside", vacancyId: "v-qc-cbm2", salary: 61000, feeRate: 0.08, date: "12 Nov", startDate: "7 Dec", invoice: "pending" },
  { id: "pl7", candidateId: "c-ewa", employerId: "e-cedarhouse", vacancyId: "v-ch-acc", salary: 58000, feeRate: 0.07, date: "4 Nov", startDate: "16 Nov", invoice: "overdue" },
  { id: "pl8", candidateId: "c-peter", employerId: "e-northlight", vacancyId: "v-nl-eom", salary: 74000, feeRate: 0.07, date: "21 Oct", startDate: "2 Nov", invoice: "paid" },
];

export const INTRO_REQUESTS: IntroRequest[] = [
  { id: "ir1", vacancyId: "v-hv-gm", candidateId: "c-ciaran", status: "pending", date: "2 days ago" },
  { id: "ir2", vacancyId: "v-qc-cxd", candidateId: "c-orla", status: "pending", date: "Yesterday" },
  { id: "ir3", vacancyId: "v-hv-gm", candidateId: "c-sarah", status: "accepted", date: "29 Oct" },
  { id: "ir4", vacancyId: "v-hv-gm", candidateId: "c-declan", status: "accepted", date: "28 Oct" },
  { id: "ir5", vacancyId: "v-hv-gm", candidateId: "c-tomas", status: "accepted", date: "1 Nov" },
];

export const EMPLOYER_THREADS: MessageThread[] = [
  { id: "t1", with: "Sarah Kavanagh", withRole: "Candidate, General Manager vacancy", initials: "SK", tint: "#7fe0d2", subject: "General Manager offer", unread: true, refs: ["c-sarah", "o-hv-sarah"],
    messages: [
      { from: "them", text: "Thank you for the offer. Could you tell me how the performance bonus is measured?", when: "Thu 12 Nov" },
      { from: "me", text: "Of course. It is a scorecard of GOP against budget, guest score and head-of-department retention. I've attached the full scorecard.", when: "Fri 13 Nov" },
      { from: "them", text: "That's helpful. I'm weighing everything up this week and will come back to you before the 25th.", when: "Today 08:40" },
    ] },
  { id: "t2", with: "Tomás Ryan", withRole: "Candidate, General Manager vacancy", initials: "TR", tint: "#c8b4f0", subject: "Second interview on Friday", unread: false, refs: ["c-tomas"],
    messages: [
      { from: "me", text: "Looking forward to Friday at 14:00. Parking is under the hotel; ask for me at reception.", when: "Yesterday" },
      { from: "them", text: "Perfect, see you then.", when: "Yesterday" },
    ] },
  { id: "t3", with: "Priya Nair", withRole: "Candidate, Revenue Manager vacancy", initials: "PN", tint: "#a8e0c0", subject: "Interview time", unread: true, refs: ["c-priya"],
    messages: [{ from: "them", text: "Monday at 11:00 by video works well for me. Thanks for being flexible.", when: "Today 09:12" }] },
  { id: "t4", with: "Owen Brady", withRole: "Employer Success, Recruit", initials: "OB", tint: "#9fb4ff", subject: "Your membership year so far", unread: false, refs: ["e-harbourview"],
    messages: [{ from: "them", text: "Your Professional membership renews on 12 January. Three placements this year so far, €291,500 in combined salaries. Against a 25% agency fee that is an estimated €48,560 saved after your membership fee. Happy to walk through it whenever suits.", when: "Mon" }] },
];

export const CANDIDATE_THREADS: Record<string, MessageThread[]> = {
  "c-aoife": [
    { id: "ct1", with: "Hugh Carberry", withRole: "General Manager, Larchfield Castle Estate", initials: "HC", tint: "#c8b4f0", subject: "Second interview", unread: true, refs: ["v-lc-dgm"],
      messages: [{ from: "them", text: "Delighted to invite you back for a second conversation on Thursday 26 November at 10:00. We'll walk the estate together first.", when: "Today 07:55" }] },
    { id: "ct2", with: "Recruit Verification", withRole: "Verification team", initials: "RV", tint: "#7fe0d2", subject: "Opera PMS certificate", unread: false, refs: ["c-aoife"],
      messages: [{ from: "them", text: "We've received your Opera PMS certificate and asked the issuer to confirm it. You'll see it marked verified once they reply, usually within two working days.", when: "Yesterday" }] },
  ],
  "c-sarah": [
    { id: "ct3", with: "Rachel Moran", withRole: "HR Director, Harbourview Grand Hotel", initials: "RM", tint: "#9fb4ff", subject: "General Manager offer", unread: false, refs: ["o-hv-sarah"],
      messages: [
        { from: "me", text: "Thank you for the offer. Could you tell me how the performance bonus is measured?", when: "Thu 12 Nov" },
        { from: "them", text: "Of course. It is a scorecard of GOP against budget, guest score and head-of-department retention. I've attached the full scorecard.", when: "Fri 13 Nov" },
      ] },
    { id: "ct4", with: "Fergus Hanley", withRole: "Group Talent Director, Cedarhouse Hotels", initials: "FH", tint: "#7fe0d2", subject: "Grand Canal offer", unread: true, refs: ["o-ch-sarah"],
      messages: [{ from: "them", text: "We'd love you to lead Grand Canal. The relocation allowance is there to make the move from Cork as easy as possible.", when: "Fri 13 Nov" }] },
  ],
  "c-mark": [
    { id: "ct5", with: "Career Pathfinder", withRole: "Recruit agent", initials: "CP", tint: "#e6c78a", subject: "Your transferable skills report", unread: true, refs: ["c-mark"],
      messages: [{ from: "them", text: "Your report is ready. Events Operations Director is your strongest adjacent path at 86% transferable-skills alignment. Open Career Explorer to compare it with retail and customer experience roles.", when: "Today 07:30" }] },
  ],
};

/** Recent employer interest shown to each candidate. */
export const EMPLOYER_INTEREST: Record<string, { employerId: string; text: string; when: string }[]> = {
  "c-aoife": [
    { employerId: "e-cedarhouse", text: "viewed your profile for Regional Guest Experience Director", when: "2 h ago" },
    { employerId: "e-larchfield", text: "confirmed your second interview", when: "Today" },
    { employerId: "e-atlantic", text: "saved your profile to a Hotel Manager search", when: "Yesterday" },
    { employerId: "e-quayside", text: "viewed your anonymised profile", when: "3 days ago" },
  ],
  "c-sarah": [
    { employerId: "e-harbourview", text: "sent you an offer for General Manager", when: "Wed 11 Nov" },
    { employerId: "e-cedarhouse", text: "sent you an offer for General Manager, Grand Canal", when: "Fri 13 Nov" },
    { employerId: "e-fenwick", text: "viewed your profile for Operations Director, Ireland", when: "Yesterday" },
  ],
  "c-mark": [
    { employerId: "e-northlight", text: "viewed your profile for Events Operations Director", when: "Today" },
    { employerId: "e-harbourview", text: "added you to a Head of Food & Beverage search", when: "Today" },
    { employerId: "e-brightwater", text: "received your application", when: "4 days ago" },
  ],
};
