import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Badge, Button, Card, Chip, DemoTag, Empty, Grid, Label, Note, Page, Progress, Select, Slider, TextInput, Toggle } from "../../ui";
import { Icon } from "../../icons";
import { useNav } from "../../nav";
import { clearCompare, openDrawer, setActiveVacancy, useRecruit, vacancyById, visibilityOf, type RecruitState } from "../../store";
import { candidate, searchableCandidates } from "../../selectors";
import { MARKET, type Candidate, type Vacancy } from "../../data";
import { matchScore, type Match } from "../../match";
import { eurK, num } from "../../format";
import {
  CompareButton, Fact, PersonAvatar, SaveButton, ScoreRing, ShortlistButton, SkillTag, VacancyPicker, budgetFit, contextVacancy, identity,
  kRange, lowerSkill, noticeText, toneVar, topReason,
} from "../../shared/talentKit";

/* Discover talent: the employer's view into the marketplace. Search and
   filters narrow the view; the ranking explains itself against the role the
   employer picks. Nobody is scored out, and the Recruit Index is one
   indicator among several. Every action writes to the shared store, so a
   shortlist here shows up in Hiring, in HQ and in the candidate's portal. */

type Vis = "discoverable" | "anonymous";
type SortKey = "alignment" | "index" | "salary" | "notice" | "years";
interface Filters {
  q: string; title: string; industries: string[]; regions: string[]; availability: string[];
  salary: [number, number]; minYears: number; team: number; verifiedOnly: boolean;
  skills: string[]; transferable: string[]; index: [number, number]; visibility: Vis[];
}

const SAL: [number, number] = [40000, 160000];
const IDX: [number, number] = [700, 1000];
const DEFAULTS: Filters = { q: "", title: "", industries: [], regions: [], availability: [], salary: SAL, minYears: 0, team: 0, verifiedOnly: false, skills: [], transferable: [], index: IDX, visibility: ["discoverable", "anonymous"] };
const SORTS: { value: SortKey; label: string }[] = [
  { value: "alignment", label: "Role alignment" },
  { value: "index", label: "Recruit Index" },
  { value: "salary", label: "Salary expectation, lowest first" },
  { value: "notice", label: "Notice period, shortest first" },
  { value: "years", label: "Years of experience" },
];
const REGIONS = ["Leinster", "Munster", "Connacht", "International"];
const AVAIL = ["Actively looking", "Open to offers", "Passive"];
const TEAMS = [{ value: "0", label: "Any team size" }, { value: "10", label: "Has led 10 or more" }, { value: "50", label: "Has led 50 or more" }, { value: "100", label: "Has led 100 or more" }, { value: "200", label: "Has led 200 or more" }];

/* Filters survive switching tabs within the session. */
let remembered: Filters = DEFAULTS;
let rememberedSort: SortKey = "alignment";

const toggleIn = <T,>(list: T[], x: T) => (list.includes(x) ? list.filter(y => y !== x) : list.concat([x]));
const freq = (lists: string[][]) => {
  const m = new Map<string, number>();
  lists.forEach(l => l.forEach(x => m.set(x, (m.get(x) || 0) + 1)));
  return m;
};

export default function Discover() {
  const s = useRecruit();
  const nav = useNav();
  const employerId = s.employerId;
  const v = contextVacancy(s, employerId);
  const [f, setF] = useState<Filters>(remembered);
  const [sort, setSortState] = useState<SortKey>(rememberedSort);
  const [moreSkills, setMoreSkills] = useState(false);
  const [moreTransfer, setMoreTransfer] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [areaRef, areaW] = useWidth<HTMLDivElement>();
  const wide = areaW >= 1000;
  const set = (patch: Partial<Filters>) => setF(prev => { const next = { ...prev, ...patch }; remembered = next; return next; });
  const setSort = (k: SortKey) => { rememberedSort = k; setSortState(k); };
  const reset = () => { remembered = DEFAULTS; setF(DEFAULTS); };

  const pool = useMemo(() => searchableCandidates(s, employerId), [s, employerId]);
  const ranked = useMemo(() => pool.map(c => ({ c, m: v ? matchScore(c, v) : null })), [pool, v]);

  /* Facets come from the sample pool so counts stay stable while filtering. */
  const titleFreq = useMemo(() => freq(pool.map(c => c.preferredRoles)), [pool]);
  const titles = Array.from(titleFreq.entries()).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  const industries = Array.from(freq(pool.map(c => [c.industry])).entries()).sort((a, b) => b[1] - a[1]);
  const regionFreq = freq(pool.map(c => [c.region]));
  const availFreq = freq(pool.map(c => [c.availability]));
  const skillFreq = useMemo(() => freq(pool.map(c => c.skills.map(x => x.name))), [pool]);
  const skillOrder = useMemo(() => {
    const roleSkills = v ? v.required.concat(v.preferred).filter(x => skillFreq.has(x)) : [];
    const rest = Array.from(skillFreq.entries()).filter(([k]) => !roleSkills.includes(k)).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([k]) => k);
    return roleSkills.concat(rest);
  }, [skillFreq, v]);
  const transferFreq = useMemo(() => freq(pool.map(c => c.transferable)), [pool]);
  const transferOrder = Array.from(transferFreq.entries()).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([k]) => k);
  const shownSkills = Array.from(new Set((moreSkills ? skillOrder.slice(0, 32) : skillOrder.slice(0, 12)).concat(f.skills)));
  const shownTransfer = Array.from(new Set((moreTransfer ? transferOrder.slice(0, 24) : transferOrder.slice(0, 9)).concat(f.transferable)));

  const words = f.q.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const passes = (c: Candidate) => {
    if (words.length) {
      const anon = c.visibility === "anonymous";
      const hay = [c.title, c.summary, c.preferredRoles.join(" "), c.skills.map(x => x.name).join(" "), c.transferable.join(" "), c.sector, anon ? c.region : c.location + " " + c.region].join(" ").toLowerCase();
      if (!words.every(w => hay.includes(w))) return false;
    }
    if (f.title && !(c.preferredRoles.includes(f.title) || c.title === f.title)) return false;
    if (f.industries.length && !f.industries.includes(c.industry)) return false;
    if (f.regions.length && !f.regions.includes(c.region)) return false;
    if (f.availability.length && !f.availability.includes(c.availability)) return false;
    if (c.salaryExpectation[0] > f.salary[1] || c.salaryExpectation[1] < f.salary[0]) return false;
    if (c.years < f.minYears) return false;
    if (c.teamSize < f.team) return false;
    if (f.verifiedOnly && (!c.qualifications.length || c.qualifications.some(q => q.verification !== "verified"))) return false;
    if (f.skills.length && !f.skills.every(sk => c.skills.some(x => x.name === sk))) return false;
    if (f.transferable.length && !f.transferable.some(t => c.transferable.includes(t))) return false;
    if (c.recruitIndex < f.index[0] || c.recruitIndex > f.index[1]) return false;
    if (!f.visibility.includes(c.visibility === "anonymous" ? "anonymous" : "discoverable")) return false;
    return true;
  };
  const list = ranked.filter(x => passes(x.c)).sort((a, b) => {
    const align = (b.m?.score ?? 0) - (a.m?.score ?? 0);
    if (sort === "index") return b.c.recruitIndex - a.c.recruitIndex || align;
    if (sort === "salary") return a.c.salaryExpectation[0] - b.c.salaryExpectation[0] || align;
    if (sort === "notice") return a.c.noticeWeeks - b.c.noticeWeeks || align;
    if (sort === "years") return b.c.years - a.c.years || align;
    return align || b.c.recruitIndex - a.c.recruitIndex;
  });

  const active: { key: string; label: string; clear: () => void }[] = [];
  if (f.q.trim()) active.push({ key: "q", label: "“" + f.q.trim() + "”", clear: () => set({ q: "" }) });
  if (f.title) active.push({ key: "t", label: "Open to " + f.title, clear: () => set({ title: "" }) });
  f.industries.forEach(x => active.push({ key: "i" + x, label: x, clear: () => set({ industries: f.industries.filter(y => y !== x) }) }));
  f.regions.forEach(x => active.push({ key: "r" + x, label: x, clear: () => set({ regions: f.regions.filter(y => y !== x) }) }));
  f.availability.forEach(x => active.push({ key: "a" + x, label: x, clear: () => set({ availability: f.availability.filter(y => y !== x) }) }));
  if (f.salary[0] !== SAL[0] || f.salary[1] !== SAL[1]) active.push({ key: "sal", label: "Expects " + kRange(f.salary), clear: () => set({ salary: SAL }) });
  if (f.minYears) active.push({ key: "yrs", label: f.minYears + "+ years", clear: () => set({ minYears: 0 }) });
  if (f.team) active.push({ key: "team", label: "Led " + f.team + "+ people", clear: () => set({ team: 0 }) });
  if (f.verifiedOnly) active.push({ key: "ver", label: "Verified qualifications only", clear: () => set({ verifiedOnly: false }) });
  f.skills.forEach(x => active.push({ key: "s" + x, label: x, clear: () => set({ skills: f.skills.filter(y => y !== x) }) }));
  f.transferable.forEach(x => active.push({ key: "tr" + x, label: x, clear: () => set({ transferable: f.transferable.filter(y => y !== x) }) }));
  if (f.index[0] !== IDX[0] || f.index[1] !== IDX[1]) active.push({ key: "idx", label: "Index " + f.index[0] + " to " + num(f.index[1]), clear: () => set({ index: IDX }) });
  if (f.visibility.length < 2) active.push({ key: "vis", label: f.visibility[0] === "anonymous" ? "Anonymous profiles only" : f.visibility[0] === "discoverable" ? "Named profiles only" : "No visibility selected", clear: () => set({ visibility: DEFAULTS.visibility }) });

  const budgetOn = !!v && f.salary[0] === v.salary[0] && f.salary[1] === v.salary[1];
  const strong = v ? ranked.filter(x => (x.m?.score ?? 0) >= 60).length : 0;

  const filterHeader = (
    <div className="rc-row rc-wrap" style={{ padding: "16px 18px 14px", gap: 9 }}>
      <span style={{ color: "var(--dim)", display: "flex" }}><Icon name="sliders" size={15} /></span>
      <span style={{ fontSize: 14, fontWeight: 600 }}>Filters</span>
      {active.length > 0 && <Badge tone="accent">{active.length}</Badge>}
      {!wide && <span style={{ fontSize: 12, color: "var(--dim)" }}>{active.length ? "Active filters are listed above the results" : "Title, location, salary, skills, evidence and more"}</span>}
      <Button size="sm" variant="ghost" onClick={reset} disabled={!active.length} style={{ marginLeft: "auto" }}>Reset</Button>
      {!wide && <Button size="sm" icon={showFilters ? "chevronDown" : "filter"} onClick={() => setShowFilters(x => !x)}>{showFilters ? "Hide filters" : "Show filters"}</Button>}
    </div>
  );

  const filterGroups = (
    <>
      <Group boxed={!wide} title="Desired job title">
        <Select value={f.title} onChange={x => set({ title: x })}
          options={[{ value: "", label: "Any title" }].concat(titles.map(([t, n]) => ({ value: t, label: t + " (" + n + ")" })))} />
      </Group>

      <Group boxed={!wide} title="Industry">
        <div className="rc-row rc-wrap" style={{ gap: 6 }}>
          {industries.map(([x, n]) => <Chip key={x} active={f.industries.includes(x)} onClick={() => set({ industries: toggleIn(f.industries, x) })}>{x} <Count n={n} /></Chip>)}
        </div>
      </Group>

      <Group boxed={!wide} title="Location">
        <div className="rc-row rc-wrap" style={{ gap: 6 }}>
          {REGIONS.filter(r => regionFreq.has(r)).map(x => <Chip key={x} active={f.regions.includes(x)} onClick={() => set({ regions: toggleIn(f.regions, x) })}>{x === "International" ? "Relocating to Ireland" : x} <Count n={regionFreq.get(x) || 0} /></Chip>)}
        </div>
      </Group>

      <Group boxed={!wide} title="Availability" sub="Everyone listed has a notice period; none can start immediately.">
        <div className="rc-row rc-wrap" style={{ gap: 6 }}>
          {AVAIL.filter(a => availFreq.has(a)).map(x => <Chip key={x} active={f.availability.includes(x)} onClick={() => set({ availability: toggleIn(f.availability, x) })}>{x} <Count n={availFreq.get(x) || 0} /></Chip>)}
        </div>
      </Group>

      <Group boxed={!wide} title="Salary expectation" right={v ? <button className="rc-link" style={{ fontSize: 11.5 }} onClick={() => set({ salary: budgetOn ? SAL : [v.salary[0], v.salary[1]] })}>{budgetOn ? "Clear budget" : "Use role budget"}</button> : undefined}
        sub="Shows people whose expected range overlaps yours.">
        <div className="rc-col" style={{ gap: 12 }}>
          <Slider label="From" display={eurK(f.salary[0])} min={SAL[0]} max={SAL[1]} step={5000} value={f.salary[0]} onChange={x => set({ salary: [Math.min(x, f.salary[1]), f.salary[1]] })} />
          <Slider label="To" display={eurK(f.salary[1])} min={SAL[0]} max={SAL[1]} step={5000} value={f.salary[1]} onChange={x => set({ salary: [f.salary[0], Math.max(x, f.salary[0])] })} />
        </div>
      </Group>

      <Group boxed={!wide} title="Relevant experience">
        <Slider label="At least" display={f.minYears ? f.minYears + " years" : "Any"} min={0} max={22} value={f.minYears} onChange={x => set({ minYears: x })} />
      </Group>

      <Group boxed={!wide} title="Leadership experience" sub="Largest team the professional has led">
        <Select value={String(f.team)} onChange={x => set({ team: Number(x) })} options={TEAMS} />
      </Group>

      <Group boxed={!wide} title="Competencies" sub={f.skills.length > 1 ? "Showing people with all " + f.skills.length + " selected" : "Pick skills a profile must evidence"}>
        <div className="rc-row rc-wrap" style={{ gap: 6 }}>
          {shownSkills.map(x => (
            <Chip key={x} active={f.skills.includes(x)} onClick={() => set({ skills: toggleIn(f.skills, x) })}
              style={v && v.required.includes(x) && !f.skills.includes(x) ? { borderColor: "var(--accent-line)" } : undefined}>
              {x} <Count n={skillFreq.get(x) || 0} />
            </Chip>
          ))}
        </div>
        <button className="rc-link" style={{ fontSize: 11.5, marginTop: 10 }} onClick={() => setMoreSkills(m => !m)}>{moreSkills ? "Show fewer" : "Show more skills"}</button>
        {v && <div style={{ fontSize: 11, color: "var(--faint)", marginTop: 6 }}>Outlined chips are required for {v.title}.</div>}
      </Group>

      <Group boxed={!wide} title="Transferable skills" sub="Shows people with any selected">
        <div className="rc-row rc-wrap" style={{ gap: 6 }}>
          {shownTransfer.map(x => <Chip key={x} active={f.transferable.includes(x)} onClick={() => set({ transferable: toggleIn(f.transferable, x) })}>{x} <Count n={transferFreq.get(x) || 0} /></Chip>)}
        </div>
        <button className="rc-link" style={{ fontSize: 11.5, marginTop: 10 }} onClick={() => setMoreTransfer(m => !m)}>{moreTransfer ? "Show fewer" : "Show more"}</button>
      </Group>

      <Group boxed={!wide} title="Recruit Index range" sub="One contextual indicator among several. Never a pass or fail.">
        <div className="rc-col" style={{ gap: 12 }}>
          <Slider label="From" display={String(f.index[0])} min={IDX[0]} max={IDX[1]} step={10} value={f.index[0]} onChange={x => set({ index: [Math.min(x, f.index[1]), f.index[1]] })} />
          <Slider label="To" display={num(f.index[1])} min={IDX[0]} max={IDX[1]} step={10} value={f.index[1]} onChange={x => set({ index: [f.index[0], Math.max(x, f.index[0])] })} />
        </div>
      </Group>

      <Group boxed={!wide} title="Evidence and visibility">
        <Toggle on={f.verifiedOnly} onChange={x => set({ verifiedOnly: x })} label="Verified qualifications only" sub="Hide profiles with self-reported or pending qualifications" />
        <div className="rc-row rc-wrap" style={{ gap: 6, marginTop: 14 }}>
          <Chip active={f.visibility.includes("discoverable")} onClick={() => set({ visibility: toggleIn(f.visibility, "discoverable" as Vis) })}><Icon name="eye" size={12} />Named profiles</Chip>
          <Chip active={f.visibility.includes("anonymous")} onClick={() => set({ visibility: toggleIn(f.visibility, "anonymous" as Vis) })}><Icon name="eyeOff" size={12} />Anonymous profiles</Chip>
        </div>
        <div style={{ fontSize: 11, color: "var(--faint)", marginTop: 8, lineHeight: 1.5 }}>Anonymous profiles hide name and employer until the professional accepts an introduction.</div>
      </Group>
    </>
  );

  const results = (
    <div className="rc-col" style={{ gap: 12, minWidth: 0 }}>
      <div className="rc-row rc-wrap" style={{ gap: 8, padding: "2px 2px 0", minHeight: 30 }}>
        <span style={{ fontSize: 13.5, color: "var(--body)" }}>
          <b style={{ color: "var(--ink)" }}>{list.length}</b> {list.length === 1 ? "profile" : "profiles"}{v && sort === "alignment" ? ", ranked by alignment with " + v.title : ", sorted by " + (SORTS.find(x => x.value === sort)?.label || "").toLowerCase()}
        </span>
        {active.map(a => <Chip key={a.key} onRemove={a.clear} style={{ height: 26 }}>{a.label}</Chip>)}
        {active.length > 1 && <button className="rc-link" style={{ fontSize: 12 }} onClick={reset}>Clear all</button>}
      </div>

      {list.map(({ c, m }, i) => <TalentCard key={c.id} s={s} c={c} m={m} v={v} employerId={employerId} index={i} />)}

      {!list.length && (
        <Card>
          <Empty icon="search" title="No sample profiles match these filters"
            body="Filters only change what you see. Widen the salary range, remove a competency or clear the search to bring people back."
            action={<Button variant="primary" icon="refresh" onClick={reset}>Reset filters</Button>} />
        </Card>
      )}

      <Note icon="shield">
        Role alignment and the Recruit Index are decision support. They explain fit from skills, experience, salary and location; they never reject anyone, and sensitive characteristics are not inputs. Notice periods are shown because no professional here can start immediately.
      </Note>
    </div>
  );

  return (
    <Page wide eyebrow="TALENT MARKETPLACE" title="Discover talent"
      sub="Search professional profiles and see, for each one, why they may fit your role. Rankings explain themselves; every hiring decision stays with your team."
      actions={<>
        <Button icon="bookmark" onClick={() => nav.go("emp.talent", "saved")}>Saved ({s.savedCandidates.length})</Button>
        <Button icon="compare" onClick={() => nav.go("emp.talent", "compare")}>Compare ({s.compare.length})</Button>
      </>}>

      {/* Search, role context and sort */}
      <Card pad={20} style={{ background: "linear-gradient(135deg, color-mix(in oklab, #4263EB 12%, var(--surface)) 0%, var(--surface) 60%)" }}>
        <div className="rc-row rc-wrap" style={{ gap: 14, alignItems: "flex-end" }}>
          <div style={{ flex: "1 1 360px", minWidth: 0 }}>
            <Label>Search the marketplace</Label>
            <div style={{ position: "relative", marginTop: 6 }}>
              <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "var(--faint)", display: "flex", pointerEvents: "none" }}><Icon name="search" size={16} /></span>
              <TextInput value={f.q} onChange={e => set({ q: e.target.value })} aria-label="Search profiles"
                placeholder="Title, skill or experience: try P&L ownership, conference or revenue"
                style={{ height: 46, paddingLeft: 40, paddingRight: f.q ? 40 : 13, fontSize: 14.5 }} />
              {f.q && (
                <button onClick={() => set({ q: "" })} aria-label="Clear search" className="rc-btn rc-focus"
                  style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", width: 24, height: 24, borderRadius: 8, border: 0, background: "var(--track)", color: "var(--dim)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }}>
                  <Icon name="x" size={10} stroke={2.6} />
                </button>
              )}
            </div>
          </div>
          <VacancyPicker s={s} employerId={employerId} value={v?.id} onChange={id => setActiveVacancy(id)} style={{ flex: "0 1 340px" }} selectStyle={{ height: 46 }} />
          <div style={{ display: "flex", flexDirection: "column", gap: 6, flex: "0 1 240px", minWidth: 200 }}>
            <Label>Sort by</Label>
            <Select value={sort} onChange={x => setSort(x as SortKey)} options={SORTS} style={{ height: 46 }} />
          </div>
        </div>
        <div className="rc-row rc-wrap" style={{ gap: 18, marginTop: 16, paddingTop: 14, borderTop: "1px solid var(--border)" }}>
          <MarketLine icon="users" text={<>Showing <b style={{ color: "var(--ink)" }}>{list.length}</b> of {pool.length} sample profiles. <b style={{ color: "var(--ink)" }}>{num(MARKET.discoverableCandidates)}</b> discoverable professionals in the simulated marketplace.</>} />
          {v && <MarketLine icon="target" text={<><b style={{ color: "var(--ink)" }}>{num(v.marketMatches)}</b> potentially relevant professionals for {v.title} in the simulated marketplace; {strong} of the sample profiles align at 60% or more.</>} />}
          <span style={{ marginLeft: "auto" }}><DemoTag>Simulated marketplace</DemoTag></span>
        </div>
      </Card>

      <div ref={areaRef}>
        {wide ? (
          <Grid cols="rc-g-side" gap={16}>
            <Card pad={0} style={{ alignSelf: "start", overflow: "hidden" }}>
              {filterHeader}
              {filterGroups}
            </Card>
            {results}
          </Grid>
        ) : (
          <div className="rc-col" style={{ gap: 14 }}>
            <Card pad={0} style={{ overflow: "hidden" }}>
              {filterHeader}
              {showFilters && <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))", gap: 10, padding: "0 14px 14px" }}>{filterGroups}</div>}
            </Card>
            {results}
          </div>
        )}
      </div>

      {s.compare.length > 0 && <CompareTray s={s} employerId={employerId} onOpen={() => nav.go("emp.talent", "compare")} />}
    </Page>
  );
}

/* ── pieces ─────────────────────────────────────────────────────────────── */

/** Width of the results area, so the filters can sit beside or above the results. */
function useWidth<T extends HTMLElement>(): [React.RefObject<T>, number] {
  const ref = useRef<T>(null);
  const [w, setW] = useState(() => (typeof window === "undefined" ? 1200 : window.innerWidth - 360));
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setW(el.clientWidth);
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, w];
}

function Group({ title, sub, right, children, boxed }: { title: ReactNode; sub?: ReactNode; right?: ReactNode; children: ReactNode; boxed?: boolean }) {
  return (
    <div style={boxed ? { padding: "13px 14px 14px", border: "1px solid var(--border)", borderRadius: "var(--r-sm, 12px)", background: "var(--surface-faint)", minWidth: 0 } : { padding: "15px 18px 16px", borderTop: "1px solid var(--border)" }}>
      <div className="rc-row" style={{ gap: 8, marginBottom: sub ? 3 : 10 }}>
        <span className="rc-grow" style={{ fontSize: 12.5, fontWeight: 600, color: "var(--ink)" }}>{title}</span>
        {right}
      </div>
      {sub && <div style={{ fontSize: 11.5, color: "var(--dim)", marginBottom: 10, lineHeight: 1.45 }}>{sub}</div>}
      {children}
    </div>
  );
}

const Count = ({ n }: { n: number }) => <span style={{ fontSize: 10.5, color: "var(--faint)", fontVariantNumeric: "tabular-nums" }}>{n}</span>;

function MarketLine({ icon, text }: { icon: string; text: ReactNode }) {
  return (
    <span className="rc-row" style={{ gap: 8, fontSize: 12.5, color: "var(--dim)", alignItems: "flex-start", maxWidth: 560 }}>
      <span style={{ color: "var(--accent)", marginTop: 1 }}><Icon name={icon} size={14} /></span>
      <span style={{ lineHeight: 1.5 }}>{text}</span>
    </span>
  );
}

function TalentCard({ s, c, m, v, employerId, index }: { s: RecruitState; c: Candidate; m: Match | null; v?: Vacancy; employerId: string; index: number }) {
  const who = identity(s, employerId, c);
  const vis = visibilityOf(c.id, s);
  const reqSet = new Set((v?.required || []).map(x => x.toLowerCase()));
  const skills = c.skills.slice().sort((a, b) =>
    Number(reqSet.has(b.name.toLowerCase())) - Number(reqSet.has(a.name.toLowerCase())) || Number(b.verification === "verified") - Number(a.verification === "verified") || b.level - a.level);
  const fit = v ? budgetFit(c.salaryExpectation, v.salary) : null;
  const elsewhere = s.pipeline.find(p => p.candidateId === c.id && p.vacancyId !== v?.id && vacancyById(p.vacancyId, s)?.employerId === employerId);
  const elsewhereRole = elsewhere ? vacancyById(elsewhere.vacancyId, s) : undefined;
  const open = () => openDrawer("candidate", c.id, v ? { vacancyId: v.id } : undefined);

  return (
    <Card pad={0} onClick={open} className="rc-rise" style={{ animationDelay: Math.min(index, 8) * 35 + "ms" }}>
      <div style={{ display: "flex", gap: 16, alignItems: "flex-start", padding: "18px 20px 14px" }}>
        <PersonAvatar c={c} anon={who.anon} size={46} />
        <div className="rc-grow">
          <div className="rc-row rc-wrap" style={{ gap: 8 }}>
            <span style={{ fontSize: 16, fontWeight: 600, letterSpacing: "-.3px", color: "var(--ink)" }}>{who.name}</span>
            {who.anon && <Badge tone="neutral" icon="eyeOff">Anonymous</Badge>}
            {who.shared && <Badge tone="teal" icon="check">Contact shared</Badge>}
            {s.savedCandidates.includes(c.id) && <span title="Saved" style={{ color: "var(--accent)", display: "flex" }}><Icon name="bookmark" size={13} /></span>}
          </div>
          <div style={{ fontSize: 13, color: "var(--body)", marginTop: 4 }}>{c.title}, {c.years} years' experience</div>
          <div className="rc-ellipsis" style={{ fontSize: 12, color: "var(--dim)", marginTop: 3 }}><Icon name="pin" size={11} style={{ verticalAlign: "-1px", marginRight: 5 }} />{who.place}. Currently: {who.org}</div>
        </div>
        {m && v && (
          <div className="rc-row" style={{ gap: 12, flex: "none" }}>
            <div className="rc-hide-sm" style={{ textAlign: "right" }}>
              <Label>Role alignment</Label>
              <div className="rc-ellipsis" style={{ fontSize: 12, color: "var(--dim)", marginTop: 5, maxWidth: 170 }}>{v.title}</div>
            </div>
            <ScoreRing score={m.score} size={60} />
          </div>
        )}
      </div>

      <div className="rc-grid rc-g4" style={{ gap: 14, padding: "4px 20px 14px" }}>
        <Fact label="Salary expectation" value={vis.showSalary ? kRange(c.salaryExpectation) : "Shared on request"}
          sub={fit && vis.showSalary ? <span style={{ color: toneVar(fit.tone) }}>{fit.label}</span> : "Illustrative"} />
        <Fact label="Availability" value={c.availability} sub={noticeText(c.noticeWeeks)} />
        <Fact label="Evidence" value={c.verifiedCredentials + " verified credentials"} sub={"Profile " + c.completeness + "% complete"} />
        <Fact label="Recruit Index" value={<span style={{ fontVariantNumeric: "tabular-nums" }}>{c.recruitIndex} <span style={{ color: "var(--faint)", fontSize: 11.5 }}>of 1,000</span></span>}
          sub={<Progress value={c.recruitIndex} max={1000} height={4} tone="teal" style={{ marginTop: 6 }} />} />
      </div>

      <div className="rc-row rc-wrap" style={{ gap: 6, padding: "0 20px 14px" }}>
        {skills.slice(0, 5).map(x => <SkillTag key={x.name} name={x.name} verified={x.verification === "verified"} hit={reqSet.has(x.name.toLowerCase())} />)}
        {skills.length > 5 && <span style={{ fontSize: 11.5, color: "var(--faint)", alignSelf: "center" }}>+{skills.length - 5} more</span>}
      </div>

      {(m && v) || c.achievements[0] ? (
        <div className="rc-grid rc-g2" style={{ gap: 10, padding: "0 20px" }}>
          {m && v && (
            <div className="rc-col" style={{ gap: 7, padding: "11px 13px", borderRadius: "var(--r-sm, 12px)", background: "var(--surface-faint)", border: "1px solid var(--border)" }}>
              <ReasonLine icon="check" color="var(--teal, var(--ok))">{topReason(c, v, m)}</ReasonLine>
              {m.considerations[0]
                ? <ReasonLine icon="info" color="var(--warn)">Consider: {lowerSkill(m.considerations[0])}</ReasonLine>
                : <ReasonLine icon="info" color="var(--dim)">No specific gaps against the stated requirements</ReasonLine>}
            </div>
          )}
          {c.achievements[0] && (
            <div className="rc-row" style={{ alignItems: "flex-start", gap: 9, padding: "11px 13px", borderRadius: "var(--r-sm, 12px)", background: "var(--surface-faint)", border: "1px solid var(--border)" }}>
              <span style={{ color: "var(--warn)", marginTop: 1 }}><Icon name="award" size={14} /></span>
              <div>
                <Label style={{ fontSize: 8.5 }}>Relevant achievement</Label>
                <div style={{ fontSize: 12.5, color: "var(--ink)", marginTop: 4, lineHeight: 1.45 }}>{c.achievements[0]}</div>
              </div>
            </div>
          )}
        </div>
      ) : null}

      <div className="rc-row rc-wrap" style={{ gap: 8, padding: "12px 20px", marginTop: 14, borderTop: "1px solid var(--border)" }}>
        <span className="rc-grow rc-ellipsis" style={{ fontSize: 11.5, color: "var(--faint)", minWidth: 140 }}>
          {elsewhere && elsewhereRole ? <>Also in your {elsewhereRole.title} pipeline: {elsewhere.stage === "identified" ? "identified" : elsewhere.stage}</> : c.industry + ", " + c.joined.toLowerCase()}
        </span>
        <Button size="sm" variant="ghost" iconRight="arrowRight" onClick={e => { e.stopPropagation(); open(); }}>View profile</Button>
        <CompareButton s={s} id={c.id} />
        <SaveButton s={s} id={c.id} />
        <ShortlistButton s={s} vacancyId={v?.id} candidateId={c.id} />
      </div>
    </Card>
  );
}

function ReasonLine({ icon, color, children }: { icon: string; color: string; children: ReactNode }) {
  return (
    <div className="rc-row" style={{ alignItems: "flex-start", gap: 8, fontSize: 12.5, lineHeight: 1.45, color: "var(--body)" }}>
      <span style={{ color, marginTop: 1, display: "flex" }}><Icon name={icon} size={13} stroke={2.2} /></span>
      <span>{children}</span>
    </div>
  );
}

function CompareTray({ s, employerId, onOpen }: { s: RecruitState; employerId: string; onOpen: () => void }) {
  return (
    <div style={{ position: "sticky", bottom: 18, zIndex: 6, display: "flex", justifyContent: "center", pointerEvents: "none", marginTop: 4 }}>
      <div className="rc-row rc-wrap rc-fade" style={{ pointerEvents: "auto", gap: 12, padding: "9px 10px 9px 16px", borderRadius: 16, background: "var(--overlay)", border: "1px solid var(--border-strong)", boxShadow: "0 18px 50px rgba(0,0,0,.45)", backdropFilter: "blur(20px)" }}>
        <span className="rc-row" style={{ gap: 7, fontSize: 12.5, color: "var(--body)" }}><Icon name="compare" size={14} />Compare</span>
        <span className="rc-row" style={{ gap: 0 }}>
          {s.compare.map((id, i) => {
            const c = candidate(s, id);
            const who = identity(s, employerId, c);
            return <span key={id} title={who.name} style={{ marginLeft: i ? -8 : 0, borderRadius: 999, boxShadow: "0 0 0 2px var(--overlay)", display: "flex" }}><PersonAvatar c={c} anon={who.anon} size={28} /></span>;
          })}
        </span>
        <span style={{ fontSize: 12, color: "var(--dim)" }}>{s.compare.length} of 3</span>
        <Button size="sm" variant="ghost" onClick={clearCompare}>Clear</Button>
        <Button size="sm" variant="primary" iconRight="arrowRight" onClick={onOpen}>Compare side by side</Button>
      </div>
    </div>
  );
}
