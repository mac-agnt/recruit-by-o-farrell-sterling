import { useMemo, useState, type ReactNode } from "react";
import { Badge, Button, Card, Chip, DemoTag, Empty, Grid, Label, Note, Page, Select, Slider, TextArea, TextInput } from "../../ui";
import { BarList } from "../../charts";
import { Icon } from "../../icons";
import { useNav } from "../../nav";
import { allVacancies, createVacancy, openDrawer, setActiveVacancy, useRecruit, vacancyById, type RecruitState } from "../../store";
import { employerVacancies } from "../../selectors";
import { CANDIDATES, EMPLOYER_BY_ID, VACANCIES, type Vacancy } from "../../data";
import { eur, num, plural } from "../../format";
import {
  PersonAvatar, ScoreRing, ShortlistButton, identity, kRange, lowerSkill, noticeText, rankFor, requiredCoverage, topReason, type Ranked,
} from "../../shared/talentKit";

/* Create a vacancy and see who it matches before anyone applies. The live
   preview ranks the sample profiles as the form changes; "Find matching
   talent" posts the role to the shared store (so it appears in Active roles,
   in HQ and in candidates' recommendations) and opens an explainable
   matching analysis. */

interface Draft {
  title: string; department: string; location: string; salaryMin: string; salaryMax: string; type: string;
  required: string[]; preferred: string[]; minYears: number; qualifications: string[]; start: string; responsibilities: string;
}
type Errors = Partial<Record<keyof Draft, string>>;

const DEPARTMENTS = ["Executive", "Operations", "Commercial", "Food & Beverage", "Rooms", "Events", "Leisure", "Sales & Marketing", "People", "Finance"];
const TYPES = ["Permanent, full-time", "Permanent, part-time", "Fixed-term contract", "Seasonal"];
const STARTS = ["As soon as reasonably available", "January 2027", "February 2027", "March 2027", "April 2027", "May 2027"];
const EMPTY: Draft = { title: "", department: "Operations", location: "Dublin 2", salaryMin: "", salaryMax: "", type: TYPES[0], required: [], preferred: [], minYears: 5, qualifications: [], start: "", responsibilities: "" };
const GM_SEED = VACANCIES.find(v => v.id === "v-hv-gm");
const GM_EXAMPLE: Draft = {
  title: "General Manager", department: "Executive", location: "Dublin", salaryMin: "120000", salaryMax: "140000", type: "Permanent, full-time",
  required: ["P&L ownership", "Team leadership", "Owner and stakeholder relations", "Commercial strategy", "Revenue management"],
  preferred: GM_SEED?.preferred.slice() || [], minYears: 15, qualifications: GM_SEED?.qualifications.slice() || [],
  start: "As soon as reasonably available", responsibilities: (GM_SEED?.responsibilities || []).join("\n"),
};

/* Every skill the marketplace knows about, for suggestions. */
const ALL_SKILLS = Array.from(new Set(CANDIDATES.flatMap(c => c.skills.map(x => x.name)).concat(VACANCIES.flatMap(v => v.required.concat(v.preferred))))).sort((a, b) => a.localeCompare(b));
const BUCKETS = [{ label: "90% and above", lo: 90 }, { label: "80 to 89%", lo: 80 }, { label: "70 to 79%", lo: 70 }, { label: "60 to 69%", lo: 60 }, { label: "50 to 59%", lo: 50 }, { label: "Below 50%", lo: 0 }];

/* The draft survives switching tabs within the session. */
let rememberedDraft: Draft = EMPTY;

const parseMoney = (x: string) => {
  const t = x.toLowerCase().replace(/[€,\s]/g, "");
  const k = t.endsWith("k");
  const n = parseFloat(k ? t.slice(0, -1) : t);
  return Number.isFinite(n) ? Math.round(k ? n * 1000 : n) : 0;
};
const lines = (x: string) => x.split("\n").map(l => l.replace(/^[-*•\s]+/, "").trim()).filter(Boolean);

function deriveRegion(loc: string) {
  const l = loc.toLowerCase();
  if (/cork|kerry|killarney|limerick|clare|ennis|lahinch|waterford|tipperary|kinsale/.test(l)) return "Munster";
  if (/galway|mayo|westport|sligo|roscommon|leitrim/.test(l)) return "Connacht";
  if (/donegal|cavan|monaghan/.test(l)) return "Ulster";
  if (/london|lisbon|abroad|united kingdom|\buk\b/.test(l)) return "International";
  return "Leinster";
}
function deriveSeniority(min: number, max: number): Vacancy["seniority"] {
  const mid = (min + max) / 2;
  return mid >= 105000 ? "Executive" : mid >= 65000 ? "Senior" : mid >= 42000 ? "Manager" : "Supervisor";
}

function validate(d: Draft): Errors {
  const e: Errors = {};
  if (!d.title.trim()) e.title = "Add a role title";
  if (!d.location.trim()) e.location = "Add a location";
  const min = parseMoney(d.salaryMin), max = parseMoney(d.salaryMax);
  if (!min || !max) e.salaryMin = "Enter a minimum and a maximum budget";
  else if (min < 15000) e.salaryMin = "That minimum looks low for an annual salary";
  else if (max < min) e.salaryMax = "The maximum must be at least the minimum";
  if (d.required.length < 2) e.required = "Add at least two required skills so matching can explain itself";
  if (!d.start) e.start = "Choose when the role should start";
  if (!lines(d.responsibilities).length) e.responsibilities = "Add at least one responsibility, one per line";
  return e;
}

function toVacancy(d: Draft, employerId: string, id = "draft"): Vacancy {
  const min = parseMoney(d.salaryMin), max = Math.max(parseMoney(d.salaryMax), min);
  const resp = lines(d.responsibilities);
  const emp = EMPLOYER_BY_ID[employerId];
  const title = d.title.trim() || "New role";
  const location = d.location.trim() || "Dublin";
  return {
    id, employerId, title, department: d.department, location, region: deriveRegion(location), salary: [min, max], type: d.type,
    seniority: deriveSeniority(min, max), postedDays: 0, status: "open", required: d.required, preferred: d.preferred, qualifications: d.qualifications,
    minYears: d.minYears, start: d.start || "To be agreed", responsibilities: resp,
    summary: (emp?.name ? emp.name + " is" : "We are") + " hiring " + (/^[aeiou]/i.test(title) ? "an " : "a ") + title + " in " + location + "." + (resp[0] ? " " + resp[0].replace(/\.$/, "") + "." : ""),
    marketMatches: 0, applicants: 0,
  };
}

/** Potentially relevant professionals: sample profiles at 60%+ plus a deterministic aggregate.
    Roles that match live marketplace roles by title and level are benchmarked on them. */
function estimateMarket(s: RecruitState, v: Vacancy, sample: number) {
  const key = (t: string) => t.split(",")[0].trim().toLowerCase();
  const comps = allVacancies(s).filter(x => !x.created && x.marketMatches > 0 && key(x.title) === key(v.title) && x.seniority === v.seniority);
  if (comps.length) {
    const bench = Math.round(comps.reduce((t, x) => t + x.marketMatches, 0) / comps.length);
    return { total: Math.max(sample, bench), basis: "Benchmarked on " + plural(comps.length, "comparable live role") + " in the marketplace" };
  }
  const mult = { Executive: 1.25, Senior: 2.5, Manager: 4, Supervisor: 6 }[v.seniority];
  const breadth = Math.max(0, 6 - v.required.length) * 2;
  return { total: sample + Math.round(sample * mult) + breadth, basis: "Estimated from sample alignment, seniority and how specific the requirements are" };
}

/** Suggested skills: what professionals who hold or want this title actually evidence. */
function suggestionsFor(title: string, exclude: string[]) {
  const t = title.trim().toLowerCase();
  const pool = t.length > 2 ? CANDIDATES.filter(c => c.title.toLowerCase().includes(t) || c.preferredRoles.some(r => r.toLowerCase().includes(t))) : [];
  const words = t.split(/[^a-z&]+/).filter(w => w.length > 3 && !["manager", "head", "director", "senior"].includes(w));
  const fallback = !pool.length && words.length ? CANDIDATES.filter(c => words.some(w => c.title.toLowerCase().includes(w) || c.preferredRoles.some(r => r.toLowerCase().includes(w)))) : [];
  const src = pool.length ? pool : fallback.length ? fallback : CANDIDATES;
  const freq = new Map<string, number>();
  src.forEach(c => c.skills.forEach(x => freq.set(x.name, (freq.get(x.name) || 0) + 1)));
  return Array.from(freq.entries()).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([k]) => k).filter(k => !exclude.includes(k)).slice(0, 8);
}

export default function CreateVacancy() {
  const s = useRecruit();
  const nav = useNav();
  const employerId = s.employerId;
  const [d, setD] = useState<Draft>(rememberedDraft);
  const [tried, setTried] = useState(false);
  const [createdId, setCreatedId] = useState<string | null>(null);
  const set = (patch: Partial<Draft>) => setD(prev => { const next = { ...prev, ...patch }; rememberedDraft = next; return next; });
  const errors = validate(d);
  const shownErrors: Errors = tried ? errors : {};
  const errorCount = Object.keys(errors).length;

  const draft = useMemo(() => toVacancy(d, employerId), [d, employerId]);
  const ready = !!d.title.trim() && d.required.length > 0 && parseMoney(d.salaryMin) > 0 && parseMoney(d.salaryMax) > 0;
  const preview = useMemo(() => (ready ? rankFor(s, employerId, draft) : []), [ready, s, employerId, draft]);
  const previewSample = preview.filter(x => x.m.score >= 60).length;
  const previewMarket = ready ? estimateMarket(s, draft, previewSample) : null;
  const inBudget = preview.filter(x => x.c.salaryExpectation[0] <= draft.salary[1] && x.c.salaryExpectation[1] >= draft.salary[0]).length;
  const created = employerVacancies(s, employerId).filter(v => v.created).slice().reverse();
  const current = createdId ? vacancyById(createdId, s) : undefined;

  const useExample = () => { setTried(false); set({ ...GM_EXAMPLE, required: GM_EXAMPLE.required.slice(), preferred: GM_EXAMPLE.preferred.slice(), qualifications: GM_EXAMPLE.qualifications.slice() }); };
  const clearForm = () => { setTried(false); set({ ...EMPTY }); };
  const submit = () => {
    setTried(true);
    if (errorCount) return;
    const v = toVacancy(d, employerId);
    const ranked = rankFor(s, employerId, v);
    const market = estimateMarket(s, v, ranked.filter(x => x.m.score >= 60).length);
    const { id: _id, postedDays: _p, status: _st, applicants: _a, created: _c, ...input } = v;
    const made = createVacancy({ ...input, marketMatches: market.total });
    setCreatedId(made.id);
    rememberedDraft = EMPTY;
    setD(EMPTY);
    setTried(false);
  };

  if (current) {
    return <Analysis s={s} v={current} employerId={employerId}
      onAnother={() => setCreatedId(null)}
      onDiscover={() => { setActiveVacancy(current.id); nav.go("emp.talent", "discover"); }}
      onActive={() => nav.go("emp.vacancies", "active")} />;
  }

  return (
    <Page wide eyebrow="VACANCIES" title="Create a vacancy"
      sub="Describe the role once. Recruit ranks the marketplace against it as you type, and explains every ranking. Nothing is posted until you choose Find matching talent."
      actions={<>
        <Button icon="sparkle" onClick={useExample}>Use the General Manager example</Button>
        <Button variant="primary" icon="search" onClick={submit}>Find matching talent</Button>
      </>}>

      <Grid cols="rc-g-3-2" gap={16}>
        <div className="rc-col" style={{ gap: 14 }}>
          {tried && errorCount > 0 && (
            <Note tone="bad" icon="alert">{plural(errorCount, "thing")} to fix before matching. Each one is marked below.</Note>
          )}

          <Card title="The role" sub="What you are hiring for and where">
            <div className="rc-grid rc-g2" style={{ gap: 14 }}>
              <FieldBox label="Role" error={shownErrors.title} style={{ gridColumn: "1 / -1" }}>
                <TextInput value={d.title} onChange={e => set({ title: e.target.value })} placeholder="For example, General Manager" aria-invalid={!!shownErrors.title} style={{ height: 44, fontSize: 15 }} />
              </FieldBox>
              <FieldBox label="Department">
                <Select value={d.department} onChange={x => set({ department: x })} options={DEPARTMENTS} />
              </FieldBox>
              <FieldBox label="Employment type">
                <Select value={d.type} onChange={x => set({ type: x })} options={TYPES} />
              </FieldBox>
              <FieldBox label="Location" error={shownErrors.location} hint={d.location.trim() ? "Matched as " + deriveRegion(d.location) + " for location fit" : undefined}>
                <TextInput value={d.location} onChange={e => set({ location: e.target.value })} placeholder="Town or city" />
              </FieldBox>
              <FieldBox label="Start date" error={shownErrors.start}>
                <Select value={d.start} onChange={x => set({ start: x })} options={[{ value: "", label: "Choose a start" }].concat(STARTS.map(x => ({ value: x, label: x })))} />
              </FieldBox>
            </div>
          </Card>

          <Card title="Salary budget" sub="Used to show where each professional's expectation sits. Never shown to candidates as a guarantee.">
            <div className="rc-grid rc-g2" style={{ gap: 14 }}>
              <FieldBox label="Minimum" error={shownErrors.salaryMin}>
                <Money value={d.salaryMin} onChange={x => set({ salaryMin: x })} placeholder="120,000" />
              </FieldBox>
              <FieldBox label="Maximum" error={shownErrors.salaryMax}>
                <Money value={d.salaryMax} onChange={x => set({ salaryMax: x })} placeholder="140,000" />
              </FieldBox>
            </div>
            {parseMoney(d.salaryMin) > 0 && parseMoney(d.salaryMax) >= parseMoney(d.salaryMin) && (
              <div className="rc-row rc-wrap" style={{ gap: 10, marginTop: 12, fontSize: 12.5, color: "var(--dim)" }}>
                <Badge tone="accent">{draft.seniority} level</Badge>
                <span>Derived from a {kRange(draft.salary)} budget. {ready ? inBudget + " of " + preview.length + " sample profiles expect a salary that overlaps it." : ""}</span>
              </div>
            )}
          </Card>

          <Card title="Skills and experience" sub="Required skills drive most of the alignment score; preferred skills add to it">
            <div className="rc-col" style={{ gap: 18 }}>
              <FieldBox label={"Required skills" + (d.required.length ? " (" + d.required.length + ")" : "")} error={shownErrors.required}>
                <SkillPicker value={d.required} onChange={x => set({ required: x })} suggestions={suggestionsFor(d.title, d.required.concat(d.preferred))} placeholder="Type a skill, then Enter" />
              </FieldBox>
              <FieldBox label="Preferred experience">
                <Slider label="Minimum years of relevant experience" display={d.minYears ? d.minYears + " years" : "No minimum"} min={0} max={25} value={d.minYears} onChange={x => set({ minYears: x })} />
              </FieldBox>
              <FieldBox label={"Preferred skills" + (d.preferred.length ? " (" + d.preferred.length + ")" : "")} hint="Nice to have. They lift alignment but never count against anyone.">
                <SkillPicker value={d.preferred} onChange={x => set({ preferred: x })} suggestions={suggestionsFor(d.title, d.required.concat(d.preferred)).slice(2)} placeholder="Type a skill, then Enter" />
              </FieldBox>
            </div>
          </Card>

          <Card title="Qualifications and responsibilities">
            <div className="rc-col" style={{ gap: 18 }}>
              <FieldBox label="Qualifications" hint="Shown on the role. Profiles with verified qualifications are marked in results.">
                <ListPicker value={d.qualifications} onChange={x => set({ qualifications: x })} placeholder="For example, degree in hospitality management" />
              </FieldBox>
              <FieldBox label="Responsibilities" error={shownErrors.responsibilities} hint={lines(d.responsibilities).length ? plural(lines(d.responsibilities).length, "responsibility", "responsibilities") + ", one per line" : "One per line"}>
                <TextArea rows={5} value={d.responsibilities} onChange={e => set({ responsibilities: e.target.value })} placeholder={"Full P&L for the hotel\nLead the senior team\nReport monthly to the owners"} />
              </FieldBox>
            </div>
          </Card>

          <div className="rc-row rc-wrap" style={{ gap: 10, padding: "2px 2px 0" }}>
            <Button variant="ghost" icon="refresh" onClick={clearForm}>Clear form</Button>
            <span className="rc-grow" />
            <span style={{ fontSize: 12, color: "var(--faint)" }}>Posts to Harbourview's active roles and ranks the marketplace</span>
            <Button variant="primary" size="lg" icon="search" onClick={submit}>Find matching talent</Button>
          </div>
        </div>

        <div className="rc-col" style={{ gap: 14 }}>
          <Card title="Live match preview" sub="Sample profiles ranked against this draft" action={<DemoTag>Simulated</DemoTag>}
            style={{ background: "linear-gradient(160deg, color-mix(in oklab, #4263EB 12%, var(--surface)) 0%, var(--surface) 60%)" }}>
            {ready && previewMarket ? (
              <>
                <div className="rc-row" style={{ alignItems: "baseline", gap: 10 }}>
                  <span style={{ fontSize: 36, fontWeight: 600, letterSpacing: "-1.4px", fontVariantNumeric: "tabular-nums" }}>{num(previewMarket.total)}</span>
                  <span style={{ fontSize: 12.5, color: "var(--dim)" }}>potentially relevant professionals in the simulated marketplace</span>
                </div>
                <div style={{ fontSize: 11.5, color: "var(--faint)", marginTop: 4 }}>{previewMarket.basis}. {previewSample} of the {preview.length} sample profiles align at 60% or more.</div>
                <div className="rc-col" style={{ gap: 2, marginTop: 14 }}>
                  {preview.slice(0, 5).map(({ c, m }) => {
                    const who = identity(s, employerId, c);
                    return (
                      <div key={c.id} className="rc-row" style={{ gap: 10, padding: "7px 0", borderTop: "1px solid var(--border)" }}>
                        <PersonAvatar c={c} anon={who.anon} size={28} />
                        <div className="rc-grow">
                          <div className="rc-ellipsis" style={{ fontSize: 12.5, color: "var(--ink)" }}>{who.name}</div>
                          <div className="rc-ellipsis" style={{ fontSize: 11, color: "var(--dim)" }}>{c.title}. {noticeText(c.noticeWeeks)}</div>
                        </div>
                        <ScoreRing score={m.score} size={34} />
                      </div>
                    );
                  })}
                </div>
                <div style={{ fontSize: 11.5, color: "var(--dim)", marginTop: 12, lineHeight: 1.5 }}>The full, explained ranking opens when you choose Find matching talent.</div>
              </>
            ) : (
              <Empty icon="target" title="Start with a title, a budget and a required skill" body="The preview ranks sample profiles as you type. Try the General Manager example to see it work."
                action={<Button size="sm" icon="sparkle" onClick={useExample}>Use the example</Button>} />
            )}
          </Card>

          <Card title="Roles created in this demo" sub={created.length ? "Live in Active roles and in Recruit HQ" : undefined}>
            {created.length ? created.map((v, i) => (
              <div key={v.id} className="rc-row" style={{ gap: 10, padding: "10px 0", borderTop: i ? "1px solid var(--border)" : 0 }}>
                <span style={{ width: 28, height: 28, borderRadius: 9, flex: "none", background: "var(--accent-soft)", color: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="vacancies" size={13} /></span>
                <div className="rc-grow">
                  <div className="rc-ellipsis" style={{ fontSize: 13, color: "var(--ink)" }}>{v.title}</div>
                  <div className="rc-ellipsis" style={{ fontSize: 11.5, color: "var(--dim)", marginTop: 1 }}>{kRange(v.salary)}. {num(v.marketMatches)} potentially relevant. {v.status.charAt(0).toUpperCase() + v.status.slice(1)}</div>
                </div>
                <Button size="sm" variant="ghost" onClick={() => setCreatedId(v.id)}>Analysis</Button>
              </div>
            )) : <div style={{ fontSize: 12.5, color: "var(--dim)", lineHeight: 1.55 }}>Roles you create appear here, in Active roles and in Recruit HQ. Candidates whose profiles align see them in their recommendations.</div>}
          </Card>

          <Note icon="shield">Matching uses skills, experience, salary fit, location and stated preferences only. It ranks and explains; it never rejects anyone.</Note>
        </div>
      </Grid>
    </Page>
  );
}

/* ── matching analysis ──────────────────────────────────────────────────── */

function Analysis({ s, v, employerId, onAnother, onDiscover, onActive }: { s: RecruitState; v: Vacancy; employerId: string; onAnother: () => void; onDiscover: () => void; onActive: () => void }) {
  const [all, setAll] = useState(false);
  const ranked = rankFor(s, employerId, v);
  const strong = ranked.filter(x => x.m.score >= 60);
  const weaker = ranked.filter(x => x.m.score < 60);
  const buckets = BUCKETS.map((b, i) => ({ ...b, n: ranked.filter(x => x.m.score >= b.lo && (i === 0 || x.m.score < BUCKETS[i - 1].lo)).length }));
  const coverage = v.required.map(r => {
    const has = ranked.filter(x => x.c.skills.some(k => k.name.toLowerCase() === r.toLowerCase()));
    return { r, n: has.length, verified: has.filter(x => x.c.skills.find(k => k.name.toLowerCase() === r.toLowerCase())?.verification === "verified").length };
  });
  const list = all ? ranked : strong.slice(0, 10);

  return (
    <Page wide eyebrow="VACANCIES" title={v.title + " is live"}
      sub={"Posted for " + (EMPLOYER_BY_ID[employerId]?.name || "your organisation") + " with a " + kRange(v.salary) + " budget. Here is who it matches, and why."}
      actions={<>
        <Button icon="plus" onClick={onAnother}>Create another</Button>
        <Button icon="vacancies" onClick={onActive}>View in Active roles</Button>
        <Button variant="primary" icon="search" onClick={onDiscover}>Discover with this role</Button>
      </>}>

      <Card pad={22} tone="accent" style={{ background: "linear-gradient(130deg, color-mix(in oklab, #4263EB 16%, var(--surface)) 0%, var(--surface) 58%)" }}>
        <div className="rc-row rc-wrap" style={{ gap: 28, alignItems: "center" }}>
          <div style={{ flex: "1 1 320px" }}>
            <Label>Matching analysis</Label>
            <div className="rc-row" style={{ alignItems: "baseline", gap: 12, marginTop: 10 }}>
              <span style={{ fontSize: 48, fontWeight: 600, letterSpacing: "-2px", lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>{num(v.marketMatches)}</span>
              <span style={{ fontSize: 14, color: "var(--body)", maxWidth: 300, lineHeight: 1.4 }}>potentially relevant professionals in the simulated marketplace</span>
            </div>
            <div style={{ fontSize: 12.5, color: "var(--dim)", marginTop: 10, lineHeight: 1.55 }}>
              {strong.length} of them are sample profiles you can open now. {estimateMarket(s, v, strong.length).basis}.
            </div>
          </div>
          <div className="rc-grid rc-g3" style={{ gap: 10, flex: "1 1 420px" }}>
            <Mini label="Seniority" value={v.seniority} sub={"From the " + kRange(v.salary) + " budget"} />
            <Mini label="Location fit" value={v.region} sub={v.location} />
            <Mini label="Required skills" value={String(v.required.length)} sub={v.minYears ? v.minYears + "+ years preferred" : "No minimum years"} />
          </div>
        </div>
        <div className="rc-row rc-wrap" style={{ gap: 8, marginTop: 16 }}>
          <Badge tone="ok" icon="check">Posted to Active roles</Badge>
          <Badge tone="accent" icon="hq">Visible in Recruit HQ</Badge>
          <Badge tone="teal" icon="candidate">Recommended to aligned candidates</Badge>
          <DemoTag>Simulated marketplace</DemoTag>
        </div>
      </Card>

      <Grid cols="rc-g-1-2" gap={16}>
        <div className="rc-col" style={{ gap: 14 }}>
          <Card title="Alignment across sample profiles" sub={ranked.length + " sample profiles ranked. Nobody is filtered out."}>
            <BarList format={x => String(x)} max={Math.max(1, ...buckets.map(b => b.n))}
              items={buckets.map((b, i) => ({ label: b.label, value: b.n, color: i < 2 ? "var(--ok)" : i < 4 ? "var(--accent)" : "var(--faint)" }))} />
          </Card>
          <Card title="What drives the ranking" sub="Sample profiles evidencing each required skill">
            <BarList format={x => String(x)} max={Math.max(1, ranked.length)}
              items={coverage.map(c => ({ label: c.r, value: c.n, display: c.n + " (" + c.verified + " verified)", color: "var(--teal, #16B8A6)" }))} />
            <div style={{ fontSize: 11.5, color: "var(--faint)", marginTop: 12, lineHeight: 1.5 }}>Required skills carry most of the score, then experience, salary fit, location and preferred skills. Sensitive characteristics are never inputs.</div>
          </Card>
          <Card title="Role summary">
            <div style={{ fontSize: 13, lineHeight: 1.6, color: "var(--body)" }}>{v.summary}</div>
            <div className="rc-col" style={{ gap: 6, marginTop: 12 }}>
              {v.responsibilities.map((r, i) => (
                <div key={i} className="rc-row" style={{ gap: 8, alignItems: "flex-start", fontSize: 12.5, color: "var(--body)", lineHeight: 1.5 }}>
                  <span style={{ color: "var(--accent)", marginTop: 2, display: "flex" }}><Icon name="chevronRight" size={12} stroke={2.2} /></span>{r}
                </div>
              ))}
            </div>
            <div style={{ fontSize: 12, color: "var(--dim)", marginTop: 12 }}>{v.type}. Start: {v.start}. Budget {eur(v.salary[0])} to {eur(v.salary[1])}.</div>
          </Card>
        </div>

        <Card pad={0}>
          <div className="rc-row rc-wrap" style={{ gap: 10, padding: "18px 20px 14px" }}>
            <div className="rc-grow">
              <div style={{ fontSize: 14, fontWeight: 600 }}>Ranked sample profiles</div>
              <div style={{ fontSize: 12.5, color: "var(--dim)", marginTop: 4 }}>Each with the reasons behind the score and the points worth your judgement</div>
            </div>
            <Button size="sm" variant="ghost" onClick={() => setAll(a => !a)}>{all ? "Show top matches" : "Show all " + ranked.length}</Button>
          </div>
          {list.map((x, i) => (
            <div key={x.c.id}>
              {all && i === strong.length && weaker.length > 0 && (
                <div style={{ padding: "10px 20px", background: "var(--surface-faint)", borderTop: "1px solid var(--border)", fontSize: 11.5, color: "var(--dim)" }}>
                  Lower alignment, shown for transparency. They stay in the marketplace and can still be shortlisted.
                </div>
              )}
              <RankedRow s={s} x={x} v={v} employerId={employerId} rank={i + 1} />
            </div>
          ))}
          {!list.length && <Empty icon="search" title="No sample profiles reach 60%" body="Show all to see every ranked profile, or broaden the required skills." />}
        </Card>
      </Grid>
    </Page>
  );
}

function RankedRow({ s, x, v, employerId, rank }: { s: RecruitState; x: Ranked; v: Vacancy; employerId: string; rank: number }) {
  const { c, m } = x;
  const who = identity(s, employerId, c);
  const cov = requiredCoverage(c, v);
  return (
    <div className="rc-row" style={{ gap: 14, padding: "14px 20px", borderTop: "1px solid var(--border)", alignItems: "flex-start" }}>
      <span style={{ width: 22, flex: "none", fontFamily: "var(--mono)", fontSize: 11, color: "var(--faint)", paddingTop: 12 }}>{String(rank).padStart(2, "0")}</span>
      <ScoreRing score={m.score} size={46} />
      <div className="rc-grow">
        <div className="rc-row rc-wrap" style={{ gap: 8 }}>
          <button className="rc-link" onClick={() => openDrawer("candidate", c.id, { vacancyId: v.id })} style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)", textAlign: "left" }}>{who.name}</button>
          {who.anon && <Badge tone="neutral" icon="eyeOff">Anonymous</Badge>}
          <span style={{ fontSize: 12, color: "var(--dim)" }}>{c.title}, {c.years} years. {who.place}.</span>
        </div>
        <div className="rc-col" style={{ gap: 4, marginTop: 7 }}>
          <Why icon="check" color="var(--teal, var(--ok))">{topReason(c, v, m)}{cov.missing.length ? "; no direct evidence of " + cov.missing.map(lowerSkill).join(", ") : ""}</Why>
          {m.reasons.slice(1, 3).map((r, i) => <Why key={i} icon="check" color="var(--teal, var(--ok))">{r}</Why>)}
          {m.considerations.slice(0, 2).map((r, i) => <Why key={"c" + i} icon="info" color="var(--warn)">{r}</Why>)}
        </div>
        <div className="rc-row rc-wrap" style={{ gap: 8, marginTop: 10 }}>
          <Chip style={{ height: 24, fontSize: 11.5 }}><Icon name="clock" size={11} />{noticeText(c.noticeWeeks)}</Chip>
          <Chip style={{ height: 24, fontSize: 11.5 }}><Icon name="euro" size={11} />Expects {kRange(c.salaryExpectation)}</Chip>
          <span className="rc-grow" />
          <Button size="sm" variant="ghost" onClick={() => openDrawer("candidate", c.id, { vacancyId: v.id })}>Profile</Button>
          <ShortlistButton s={s} vacancyId={v.id} candidateId={c.id} />
        </div>
      </div>
    </div>
  );
}

/* ── form pieces ────────────────────────────────────────────────────────── */

/** A div-based field: chip pickers contain buttons, so they must not sit inside a <label>. */
function FieldBox({ label, hint, error, children, style }: { label: ReactNode; hint?: ReactNode; error?: ReactNode; children: ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 7, minWidth: 0, ...style }}>
      <span style={{ fontSize: 12, fontWeight: 500, color: error ? "var(--bad)" : "var(--body)" }}>{label}</span>
      <div style={error ? { borderRadius: "var(--r-sm, 12px)", boxShadow: "0 0 0 1px color-mix(in oklab, var(--bad) 55%, transparent)" } : undefined}>{children}</div>
      {error ? <span className="rc-row" style={{ gap: 6, fontSize: 11.5, color: "var(--bad)" }}><Icon name="alert" size={11} />{error}</span>
        : hint ? <span style={{ fontSize: 11.5, color: "var(--faint)", lineHeight: 1.45 }}>{hint}</span> : null}
    </div>
  );
}

function Money({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  const n = parseMoney(value);
  return (
    <div style={{ position: "relative" }}>
      <span style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)", color: "var(--faint)", fontSize: 13.5, pointerEvents: "none" }}>€</span>
      <TextInput inputMode="numeric" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        onBlur={() => { if (n) onChange(num(n)); }} style={{ paddingLeft: 28 }} />
    </div>
  );
}

function SkillPicker({ value, onChange, suggestions, placeholder }: { value: string[]; onChange: (v: string[]) => void; suggestions: string[]; placeholder: string }) {
  const [q, setQ] = useState("");
  const query = q.trim().toLowerCase();
  const has = (x: string) => value.some(y => y.toLowerCase() === x.toLowerCase());
  const matches = query ? ALL_SKILLS.filter(x => x.toLowerCase().includes(query) && !has(x)).slice(0, 7) : [];
  const exact = ALL_SKILLS.some(x => x.toLowerCase() === query);
  const add = (x: string) => {
    const name = x.trim();
    if (!name) return;
    const canonical = ALL_SKILLS.find(a => a.toLowerCase() === name.toLowerCase()) || name.charAt(0).toUpperCase() + name.slice(1);
    if (!has(canonical)) onChange(value.concat([canonical]));
    setQ("");
  };
  return (
    <div>
      {value.length > 0 && (
        <div className="rc-row rc-wrap" style={{ gap: 6, marginBottom: 9 }}>
          {value.map(x => <Chip key={x} active onRemove={() => onChange(value.filter(y => y !== x))}>{x}</Chip>)}
        </div>
      )}
      <TextInput value={q} onChange={e => setQ(e.target.value)} placeholder={placeholder}
        onKeyDown={e => {
          if (e.key === "Enter") { e.preventDefault(); add(matches[0] && !exact ? matches[0] : q); }
          if (e.key === "Backspace" && !q && value.length) onChange(value.slice(0, -1));
        }} />
      <div className="rc-row rc-wrap" style={{ gap: 6, marginTop: 8 }}>
        {query ? (
          <>
            {matches.map(x => <Chip key={x} onClick={() => add(x)}><Icon name="plus" size={10} stroke={2.4} />{x}</Chip>)}
            {!exact && <Chip onClick={() => add(q)} style={{ borderStyle: "dashed" }}><Icon name="plus" size={10} stroke={2.4} />Add {"“"}{q.trim()}{"”"}</Chip>}
          </>
        ) : suggestions.filter(x => !has(x)).length ? (
          <>
            <span style={{ fontSize: 11.5, color: "var(--faint)", alignSelf: "center" }}>Suggested</span>
            {suggestions.filter(x => !has(x)).slice(0, 7).map(x => <Chip key={x} onClick={() => add(x)}><Icon name="plus" size={10} stroke={2.4} />{x}</Chip>)}
          </>
        ) : null}
      </div>
    </div>
  );
}

function ListPicker({ value, onChange, placeholder }: { value: string[]; onChange: (v: string[]) => void; placeholder: string }) {
  const [q, setQ] = useState("");
  const add = () => { const t = q.trim(); if (t && !value.includes(t)) onChange(value.concat([t])); setQ(""); };
  return (
    <div>
      {value.length > 0 && (
        <div className="rc-row rc-wrap" style={{ gap: 6, marginBottom: 9 }}>
          {value.map(x => <Chip key={x} onRemove={() => onChange(value.filter(y => y !== x))}><Icon name="learning" size={11} />{x}</Chip>)}
        </div>
      )}
      <div className="rc-row" style={{ gap: 8 }}>
        <TextInput value={q} onChange={e => setQ(e.target.value)} placeholder={placeholder} onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); add(); } }} />
        <Button icon="plus" onClick={add} disabled={!q.trim()}>Add</Button>
      </div>
    </div>
  );
}

function Mini({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div style={{ padding: "12px 14px", borderRadius: "var(--r-sm, 12px)", background: "var(--surface-2)", border: "1px solid var(--border)", minWidth: 0 }}>
      <Label style={{ fontSize: 8.5 }}>{label}</Label>
      <div style={{ fontSize: 17, fontWeight: 600, marginTop: 6, letterSpacing: "-.3px" }}>{value}</div>
      <div className="rc-ellipsis" style={{ fontSize: 11.5, color: "var(--dim)", marginTop: 3 }}>{sub}</div>
    </div>
  );
}

const Why = ({ icon, color, children }: { icon: string; color: string; children: ReactNode }) => (
  <div className="rc-row" style={{ gap: 8, alignItems: "flex-start", fontSize: 12.5, lineHeight: 1.45, color: "var(--body)" }}>
    <span style={{ color, marginTop: 2, display: "flex" }}><Icon name={icon} size={12} stroke={2.2} /></span><span>{children}</span>
  </div>
);
