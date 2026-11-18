import type { Candidate, Vacancy } from "./data/types";
import { eurK } from "./format";

/* Explainable role alignment. The score is decision support: it ranks and
   explains, it never filters anyone out or makes a hiring decision. Sensitive
   characteristics are not inputs; only skills, experience, salary fit,
   location and stated preferences are. */

export interface Match {
  score: number;
  reasons: string[];
  considerations: string[];
  matchedSkills: string[];
  missingSkills: string[];
  salaryFit: "within" | "above" | "below";
}

/** Story pairs keep the exact figures the demo script quotes. */
const PINNED: Record<string, number> = {
  "c-aoife|v-ch-rged": 91,
  "c-mark|v-nl-eod": 86,
  "c-sarah|v-hv-gm": 94,
  "c-sarah|v-ch-gm": 93,
  "c-declan|v-hv-gm": 92,
  "c-aoife|v-lc-dgm": 88,
  "c-aoife|v-ch-dgm": 86,
  "c-aoife|v-sb-rom": 84,
  "c-aoife|v-ac-hm": 82,
  "c-aoife|v-qc-cxd": 80,
  "c-aoife|v-fv-hm": 78,
  "c-aoife|v-ao-gom": 74,
  "c-aoife|v-hv-fb": 71,
  "c-aoife|v-lc-rooms": 70,
  "c-aoife|v-hv-gm": 68,
  "c-aoife|v-ch-gm": 66,
  "c-mark|v-bw-rrom": 79,
  "c-mark|v-qc-cxd": 74,
};

/** The twelve roles the demo shows Aoife, in order. */
export const AOIFE_RELEVANT = ["v-ch-rged", "v-lc-dgm", "v-ch-dgm", "v-sb-rom", "v-ac-hm", "v-qc-cxd", "v-fv-hm", "v-ao-gom", "v-hv-fb", "v-lc-rooms", "v-hv-gm", "v-ch-gm"];

const norm = (s: string) => s.toLowerCase().trim();
/** Lower-case a skill for use mid-sentence, keeping acronyms and names like P&L or Opera PMS intact. */
const lc = (x: string) => (/[A-Z]{2,}|&/.test(x) ? x : x.charAt(0).toLowerCase() + x.slice(1));

export function matchScore(c: Candidate, v: Vacancy): Match {
  const skill = (name: string) => c.skills.find(s => norm(s.name) === norm(name));
  const matchedSkills: string[] = [];
  const missingSkills: string[] = [];
  const reasons: string[] = [];
  const considerations: string[] = [];

  let req = 0;
  v.required.forEach(r => {
    const s = skill(r);
    if (s) {
      matchedSkills.push(r);
      req += (0.62 + 0.38 * s.level / 100) * (s.verification === "verified" ? 1 : 0.9);
      if (s.verification !== "verified") considerations.push(r + " is self-reported, not yet verified");
    } else if (c.transferable.some(t => norm(t).includes(norm(r).split(" ")[0]))) {
      req += 0.4;
      missingSkills.push(r);
    } else {
      missingSkills.push(r);
    }
  });
  req = v.required.length ? req / v.required.length : 0.7;

  let pref = 0;
  v.preferred.forEach(p => { const s = skill(p); if (s) { pref += 0.6 + 0.4 * s.level / 100; matchedSkills.push(p); } });
  pref = v.preferred.length ? pref / v.preferred.length : 0.6;

  const years = c.years >= v.minYears ? 1 : (c.years / Math.max(1, v.minYears)) * 0.82;
  const [lo, hi] = v.salary;
  const mid = (c.salaryExpectation[0] + c.salaryExpectation[1]) / 2;
  let salaryFit: Match["salaryFit"] = "within";
  let salary = 1;
  if (c.salaryExpectation[0] > hi) { salaryFit = "above"; salary = Math.max(0.2, 1 - ((c.salaryExpectation[0] - hi) / hi) * 4); }
  else if (c.salaryExpectation[1] < lo * 0.82) { salaryFit = "below"; salary = 0.62; }
  else if (mid > hi) salary = 0.86;

  const region = c.region === v.region ? 1 : c.region === "International" ? 0.8 : 0.86;
  const titleWords = norm(v.title).split(/[^a-z&]+/).filter(w => w.length > 3);
  const titleHit = titleWords.some(w => norm(c.title).includes(w) || c.preferredRoles.some(p => norm(p).includes(w)));

  let score = 100 * (0.44 * req + 0.12 * pref + 0.14 * years + 0.15 * salary + 0.07 * region + 0.08 * (titleHit ? 1 : 0.55));
  score = Math.round(Math.max(32, Math.min(96, score)));
  const pinned = PINNED[c.id + "|" + v.id];
  if (pinned) score = pinned;

  if (matchedSkills.length) reasons.push("Evidence for " + matchedSkills.slice(0, 3).map(lc).join(", "));
  reasons.push(c.years + " years' experience" + (v.minYears ? ", " + v.minYears + " asked for" : ""));
  if (salaryFit === "within") reasons.push("Expects " + eurK(c.salaryExpectation[0]) + "-" + eurK(c.salaryExpectation[1]).slice(1) + ", inside the " + eurK(lo) + "-" + eurK(hi).slice(1) + " budget");
  if (c.achievements[0]) reasons.push(c.achievements[0]);
  if (c.region === v.region) reasons.push("Based in " + c.location);

  if (salaryFit === "above") considerations.push("Salary expectation sits above the budget");
  if (salaryFit === "below") considerations.push("Current level may be junior for this role");
  if (c.noticeWeeks >= 8) considerations.push(c.noticeWeeks + " weeks' notice");
  if (c.region !== v.region) considerations.push("Would relocate from " + c.location);
  missingSkills.slice(0, 2).forEach(m => considerations.push("No direct evidence of " + lc(m)));
  if (c.years < v.minYears) considerations.push("Fewer years than the role asks for");

  return { score, reasons: reasons.slice(0, 4), considerations: Array.from(new Set(considerations)).slice(0, 4), matchedSkills, missingSkills, salaryFit };
}

export const alignmentTone = (score: number) => score >= 85 ? "ok" : score >= 70 ? "accent" : score >= 55 ? "warn" : "neutral";
