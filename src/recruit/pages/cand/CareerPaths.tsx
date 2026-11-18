import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { Badge, Button, Card, Checkbox, Chip, DemoTag, Empty, Grid, KV, Label, Note, Page, Section, Table, toneColor, type Col } from "../../ui";
import { RangeBar } from "../../charts";
import { Icon } from "../../icons";
import { useNav } from "../../nav";
import { openDrawer, useRecruit, vacancyById } from "../../store";
import { candidate } from "../../selectors";
import { CANDIDATE_BY_ID, CAREER_PATHS, COURSE_BY_ID, EMPLOYER_BY_ID, PARTNER_BY_ID, PLACEMENTS, type CareerPath } from "../../data";
import type { Candidate } from "../../data/types";
import { eur, eurK, num } from "../../format";
import { alignmentTone } from "../../match";
import { bucketOf, industriesOf, parseMonths, pathSkills, simulatorHandoff } from "./explorerKit";

/* Career explorer, career paths. John's idea in one screen: a professional's
   experience traced, skill by skill, into adjacent industries and roles, with
   the gaps worth closing. Career Pathfinder suggests options; it never
   predicts outcomes. */

export default function CareerPaths() {
  const s = useRecruit();
  return <PathsView key={s.persona} />;
}

const delta = (n: number) => (n >= 0 ? "+" : "") + eur(n);
const range = (r: [number, number]) => eur(r[0]) + " to " + eur(r[1]);
const DEMAND_TONE = { High: "ok", Growing: "teal", Steady: "accent", Limited: "warn" } as const;

function PathsView() {
  const s = useRecruit();
  const nav = useNav();
  const c = candidate(s, s.persona);
  const paths = CAREER_PATHS[c.id] || [];
  const industries = useMemo(() => industriesOf(paths), [paths]);
  const [selId, setSelId] = useState(paths[0]?.id || "");
  const [compare, setCompare] = useState<string[]>(paths.slice(0, 3).map(p => p.id));
  const [full, setFull] = useState(false);
  const mapRef = useRef<HTMLDivElement>(null);
  const sel = paths.find(p => p.id === selId) || paths[0];

  if (!sel) {
    return (
      <Page eyebrow="CAREER EXPLORER" title="You've built the experience. Discover where else it can take you.">
        <Card><Empty icon="explorer" title="Career Pathfinder is still reading your profile" body="Add your experience and skills, and your career map appears here." /></Card>
      </Page>
    );
  }

  const simulate = (id: string) => { simulatorHandoff.pathId = id; nav.go("cand.explorer", "simulator"); };
  const showOnMap = (id: string) => { setSelId(id); mapRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }); };
  const toggleCompare = (id: string) => {
    if (compare.includes(id)) { setCompare(compare.filter(x => x !== id)); setFull(false); return; }
    if (compare.length >= 3) { setFull(true); return; }
    setFull(false);
    setCompare(compare.concat([id]));
  };

  const adjacent = industries.filter(g => g.adjacent).length;
  const totalRoles = paths.reduce((t, p) => t + p.openRoles, 0);
  const vac = sel.vacancyId ? vacancyById(sel.vacancyId, s) : undefined;
  const vacEmp = vac ? EMPLOYER_BY_ID[vac.employerId] : undefined;
  const courses = sel.courseIds.map(id => COURSE_BY_ID[id]).filter(Boolean);
  const story = memberStory(sel);
  const lo = Math.floor((Math.min(c.salaryCurrent, c.marketRange[0], sel.salary[0]) * 0.88) / 5000) * 5000;
  const hi = Math.ceil((Math.max(c.marketRange[1], sel.salary[1]) * 1.08) / 5000) * 5000;

  return (
    <Page wide eyebrow="CAREER EXPLORER" title="You've built the experience. Discover where else it can take you."
      sub={"Career Pathfinder traced your " + c.years + " years of experience into " + paths.length + " paths across " + industries.length + " industries. They are options to explore, not guaranteed outcomes."}
      actions={<>
        <Button icon="layers" onClick={() => nav.go("cand.explorer", "skills")}>Transferable skills</Button>
        <Button variant="primary" icon="route" onClick={() => simulate(sel.id)}>Simulate a move</Button>
      </>}>

      <div ref={mapRef} style={{ scrollMarginTop: 16 }}>
        <Card title="Your career map" sub="Select a role to trace how your skills carry into it. Hover any skill or industry to follow its connections."
          action={<DemoTag>Demo analysis</DemoTag>} pad="20px 20px 16px">
          <CareerMap c={c} paths={paths} selected={sel.id} onSelect={setSelId} />
          <div className="rc-row rc-wrap" style={{ gap: 16, marginTop: 14, paddingTop: 12, borderTop: "1px solid var(--border)", fontSize: 11.5, color: "var(--dim)" }}>
            <span className="rc-row" style={{ gap: 7 }}><span style={{ width: 22, height: 3, borderRadius: 2, background: "linear-gradient(90deg, #4263EB, var(--teal, #16B8A6))" }} />Selected route</span>
            <span className="rc-row" style={{ gap: 7 }}><span style={{ width: 22, height: 2, borderRadius: 2, background: "var(--border-strong)" }} />Other routes</span>
            <span className="rc-row" style={{ gap: 7 }}><Icon name="check" size={12} style={{ color: "var(--teal, var(--ok))" }} />Skill used by the selected role</span>
            <span className="rc-grow" />
            <span style={{ color: "var(--faint)" }}>{paths.length} paths · {adjacent} adjacent {adjacent === 1 ? "industry" : "industries"} · {num(totalRoles)} open roles across them</span>
          </div>
        </Card>
      </div>

      <Grid cols="rc-g-3-2">
        <Card title="Career Pathfinder (demo explanation)" sub={sel.title + ", " + sel.industry.toLowerCase()}
          action={<Badge tone={alignmentTone(sel.alignment)} style={{ height: 26, fontSize: 12, fontWeight: 600 }}>{sel.alignment}% transferable-skills alignment</Badge>}
          style={{ background: "linear-gradient(150deg, color-mix(in oklab, #4263EB 13%, var(--surface)) 0%, var(--surface) 60%)" }}>
          <div key={sel.id} className="rc-fade rc-row" style={{ alignItems: "flex-start", gap: 12 }}>
            <span style={{ width: 30, height: 30, flex: "none", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", background: "var(--accent-soft)", color: "var(--accent)", border: "1px solid var(--accent-line)" }}>
              <Icon name="sparkle" size={14} />
            </span>
            <div style={{ fontSize: 14.5, lineHeight: 1.65, color: "var(--ink)", paddingTop: 3 }}>{sel.explanation}</div>
          </div>

          <Label style={{ marginTop: 20 }}>Skills that carry over</Label>
          <div className="rc-row rc-wrap" style={{ gap: 7, marginTop: 9 }}>
            {sel.matched.map(m => <Chip key={m} tone="teal"><Icon name="check" size={11} stroke={2.6} />{m}</Chip>)}
          </div>

          <Label style={{ marginTop: 18 }}>{sel.gaps.length ? "Gaps to close" : "Gaps to close: none flagged"}</Label>
          <div className="rc-col" style={{ gap: 9, marginTop: 9 }}>
            {sel.gaps.map(g => (
              <div key={g.label} className="rc-row" style={{ alignItems: "flex-start", gap: 10, padding: "10px 12px", borderRadius: "var(--r-sm, 12px)", background: "var(--surface-2)", border: "1px solid var(--border)" }}>
                <span style={{ color: "var(--warn)", marginTop: 1, display: "inline-flex" }}><Icon name="target" size={14} /></span>
                <div className="rc-grow">
                  <div style={{ fontSize: 13, color: "var(--ink)", fontWeight: 500 }}>{g.label}</div>
                  <div style={{ fontSize: 12, color: "var(--dim)", marginTop: 3 }}>{g.how}</div>
                </div>
              </div>
            ))}
            {!sel.gaps.length && <div style={{ fontSize: 12.5, color: "var(--dim)" }}>Your verified evidence already covers what this role asks for.</div>}
          </div>

          {story && <div className="rc-row" style={{ gap: 9, marginTop: 14, fontSize: 12.5, color: "var(--body)" }}><Icon name="users" size={14} style={{ color: "var(--teal, var(--ok))" }} />{story}</div>}

          <div className="rc-row rc-wrap" style={{ gap: 8, marginTop: 18 }}>
            {vac && <Button size="sm" variant="primary" icon="jobs" onClick={() => openDrawer("vacancy", vac.id)}>Open the role at {vacEmp?.short}</Button>}
            {courses.map(x => <Button key={x.id} size="sm" icon="learning" onClick={() => openDrawer("course", x.id)}>{x.title}</Button>)}
            <Button size="sm" icon="route" onClick={() => simulate(sel.id)}>Simulate this move</Button>
            {!compare.includes(sel.id) && <Button size="sm" variant="ghost" icon="compare" onClick={() => toggleCompare(sel.id)}>Add to compare</Button>}
          </div>
          <Note style={{ marginTop: 16 }}>Paths are options, not guaranteed outcomes. Career Pathfinder explains where your evidence may transfer; employers make hiring decisions.</Note>
        </Card>

        <Card title="The move in numbers" sub="Illustrative estimates from demo benchmarks" action={<DemoTag />}>
          <Label>Estimated salary range</Label>
          <div style={{ fontSize: 26, fontWeight: 600, letterSpacing: "-1px", marginTop: 6 }}>{range(sel.salary)}</div>
          <div style={{ fontSize: 12.5, color: "var(--dim)", marginTop: 4 }}>{delta(sel.salary[0] - c.salaryCurrent)} to {delta(sel.salary[1] - c.salaryCurrent)} against your {eur(c.salaryCurrent)} today</div>
          <RangeBar min={lo} max={hi} band={c.marketRange} scenario={sel.salary} marker={c.salaryCurrent} markerLabel="You" format={eurK} />
          <div className="rc-row rc-wrap" style={{ gap: 14, fontSize: 11.5, color: "var(--dim)", marginTop: 2 }}>
            <span className="rc-row" style={{ gap: 6 }}><span style={{ width: 16, height: 8, borderRadius: 999, background: "linear-gradient(90deg, #4263EB, var(--teal, #16B8A6))" }} />Your market range today</span>
            <span className="rc-row" style={{ gap: 6 }}><span style={{ width: 16, height: 8, borderRadius: 999, border: "1.5px dashed var(--warn)" }} />This path</span>
          </div>
          <div style={{ marginTop: 16 }}>
            <KV cols={2} items={[
              { k: "Open roles", v: num(sel.openRoles) + " in the marketplace" },
              { k: "Demand", v: <span style={{ color: toneColor(DEMAND_TONE[sel.demand]) }}>{sel.demand}</span> },
              { k: "Time to move", v: sel.timeToMove },
              { k: "Industry", v: sel.adjacent ? "Adjacent" : "Same sector" },
            ]} />
          </div>
        </Card>
      </Grid>

      <Section title="Compare paths side by side" sub="Tick up to three paths. The strongest value in each row is marked."
        action={<Button size="sm" variant="ghost" icon="refresh" onClick={() => { setCompare(paths.slice(0, 3).map(p => p.id)); setFull(false); }}>Reset</Button>}>
        <Card pad="12px 16px">
          <div className="rc-row rc-wrap" style={{ gap: "4px 18px" }}>
            {paths.map(p => <Checkbox key={p.id} on={compare.includes(p.id)} onChange={() => toggleCompare(p.id)} label={<span>{p.title} <span style={{ color: "var(--faint)" }}>{p.alignment}%</span></span>} />)}
          </div>
          {full && <div style={{ fontSize: 12, color: "var(--warn)", marginTop: 6 }}>Compare holds three paths. Untick one first.</div>}
        </Card>
        <CompareTable c={c} paths={compare.map(id => paths.find(p => p.id === id)).filter((p): p is CareerPath => !!p)} onShow={showOnMap} />
      </Section>

      <div style={{ fontSize: 11.5, color: "var(--faint)", padding: "4px 4px 0", lineHeight: 1.55 }}>
        Career Pathfinder suggests options from illustrative demo benchmarks and your profile evidence. Salary ranges are estimates, not offers. Nothing here filters you out of any role.
      </div>
    </Page>
  );
}

/** A Recruit member who made a comparable move, from this month's placements. */
function memberStory(p: CareerPath): string | null {
  const bucket = bucketOf(p.industry);
  for (const pl of PLACEMENTS) {
    const emp = EMPLOYER_BY_ID[pl.employerId];
    const who = CANDIDATE_BY_ID[pl.candidateId];
    if (!emp || !who || !/^moved from/i.test(who.summary)) continue;
    if (bucketOf(emp.industry) === bucket) return "A Recruit member " + who.summary.charAt(0).toLowerCase() + who.summary.slice(1);
  }
  return null;
}

/* ── the comparison table ───────────────────────────────────────────────── */

function CompareTable({ c, paths, onShow }: { c: Candidate; paths: CareerPath[]; onShow: (id: string) => void }) {
  const s = useRecruit();
  if (!paths.length) return <Card><Empty icon="compare" title="Pick a path to compare" body="Tick up to three paths above to see them side by side." /></Card>;
  const best = (vals: number[], higher = true) => {
    const t = higher ? Math.max(...vals) : Math.min(...vals);
    return vals.map(v => vals.length > 1 && v === t && vals.some(x => x !== t));
  };
  const mark = (node: ReactNode, on: boolean) => (
    <span className="rc-row rc-wrap" style={{ gap: 6 }}>{node}{on && <Badge tone="teal" icon="star">Best</Badge>}</span>
  );
  const mid = (p: CareerPath) => (p.salary[0] + p.salary[1]) / 2;
  const months = (p: CareerPath) => { const [a, b] = parseMonths(p.timeToMove); return (a + b) / 2; };
  const bSalary = best(paths.map(mid));
  const bAlign = best(paths.map(p => p.alignment));
  const bRoles = best(paths.map(p => p.openRoles));
  const bTime = best(paths.map(months), false);
  const bGaps = best(paths.map(p => p.gaps.length), false);

  type Row = { label: string; cells: ReactNode[] };
  const rows: Row[] = [
    { label: "Industry", cells: paths.map(p => <span>{p.industry}<span style={{ color: "var(--faint)" }}>{p.adjacent ? ", adjacent" : ", same sector"}</span></span>) },
    { label: "Salary range (illustrative)", cells: paths.map((p, i) => mark(<b style={{ fontWeight: 600, color: "var(--ink)" }}>{eurK(p.salary[0])} to {eurK(p.salary[1])}</b>, bSalary[i])) },
    { label: "Change against today", cells: paths.map(p => <span>{delta(p.salary[0] - c.salaryCurrent)} to {delta(p.salary[1] - c.salaryCurrent)}</span>) },
    { label: "Transferable-skills alignment", cells: paths.map((p, i) => mark(<Badge tone={alignmentTone(p.alignment)}>{p.alignment}%</Badge>, bAlign[i])) },
    { label: "Open roles", cells: paths.map((p, i) => mark(<span>{num(p.openRoles)}</span>, bRoles[i])) },
    { label: "Demand", cells: paths.map(p => <span style={{ color: toneColor(DEMAND_TONE[p.demand]) }}>{p.demand}</span>) },
    { label: "Time to move", cells: paths.map((p, i) => mark(<span>{p.timeToMove}</span>, bTime[i])) },
    { label: "Gaps to close", cells: paths.map((p, i) => mark(<span>{p.gaps.length ? p.gaps.map(g => g.label).join("; ") : "None flagged"}</span>, bGaps[i])) },
    { label: "Linked course", cells: paths.map(p => {
      const crs = p.courseIds.map(id => COURSE_BY_ID[id]).filter(Boolean);
      return crs.length ? <span className="rc-col" style={{ gap: 4 }}>{crs.map(x => <button key={x.id} className="rc-link" style={{ textAlign: "left", fontSize: 12.5 }} onClick={() => openDrawer("course", x.id)}>{x.title}<span style={{ color: "var(--faint)" }}> · {PARTNER_BY_ID[x.partnerId]?.short}</span></button>)}</span>
        : <span style={{ color: "var(--faint)" }}>None needed</span>;
    }) },
    { label: "Live role", cells: paths.map(p => {
      const v = p.vacancyId ? vacancyById(p.vacancyId, s) : undefined;
      return v ? <button className="rc-link" style={{ textAlign: "left", fontSize: 12.5 }} onClick={() => openDrawer("vacancy", v.id)}>{v.title}, {EMPLOYER_BY_ID[v.employerId]?.short}</button>
        : <span style={{ color: "var(--faint)" }}>{p.openRoles} similar roles listed</span>;
    }) },
    { label: "", cells: paths.map(p => <Button size="sm" variant="ghost" icon="explorer" onClick={() => onShow(p.id)}>Show on map</Button>) },
  ];
  const cols: Col<Row>[] = [
    { key: "label", label: "", width: "minmax(150px, 0.8fr)", render: r => <span style={{ fontSize: 12, color: "var(--dim)" }}>{r.label}</span> },
    ...paths.map((p, i): Col<Row> => ({ key: p.id, label: <span style={{ color: "var(--ink)", fontWeight: 600, fontSize: 12.5 }}>{p.title}</span>, render: r => <span style={{ fontSize: 12.5 }}>{r.cells[i]}</span> })),
  ];
  return <Table cols={cols} rows={rows} dense caption="Estimates are illustrative and come from demo benchmarks. Open roles are marketplace counts today." />;
}

/* ── the career map ─────────────────────────────────────────────────────── */

interface Box { x: number; y: number; w: number; h: number }
type Focus = { kind: "path" | "skill" | "industry"; id: string };
interface Edge { id: string; from: string; to: string; hot: boolean; ok?: boolean }

const MIN_W = 640;
const HEAD = 30;
const SZ = { current: 196, skill: 46, industry: 72, job: 82, gap: 86 };
const GAP = { skill: 8, industry: 14, job: 12, gap: 12 };
const NO_GAPS = [{ label: "No major gaps", how: "Your verified evidence already covers what this role asks for." }];

function useWidth(): [React.RefObject<HTMLDivElement>, number] {
  const ref = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(0);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    setW(el.clientWidth);
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => setW(el.clientWidth));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, w];
}

/** Places boxes as close to their ideal tops as possible without overlap. */
function spread(ideal: number[], h: number, gap: number, top: number, bottom: number) {
  const order = ideal.map((_, i) => i).sort((a, b) => ideal[a] - ideal[b]);
  const pos = ideal.slice();
  let cursor = top;
  order.forEach(i => { pos[i] = Math.max(ideal[i], cursor); cursor = pos[i] + h + gap; });
  let limit = bottom;
  for (let k = order.length - 1; k >= 0; k--) { const i = order[k]; pos[i] = Math.min(pos[i], limit - h); limit = pos[i] - gap; }
  return pos;
}

const clamp2 = (lines: number): CSSProperties => ({ display: "-webkit-box", WebkitLineClamp: lines, WebkitBoxOrient: "vertical", overflow: "hidden" });

function CareerMap({ c, paths, selected, onSelect }: { c: Candidate; paths: CareerPath[]; selected: string; onSelect: (id: string) => void }) {
  const [ref, measured] = useWidth();
  const [hover, setHover] = useState<Focus | null>(null);
  const leaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (leaveTimer.current) clearTimeout(leaveTimer.current); }, []);
  const gid = "cm" + useId().replace(/:/g, "");
  const reduce = useMemo(() => typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches, []);
  const W = Math.max(MIN_W, measured || MIN_W);

  const uses = useMemo(() => Object.fromEntries(paths.map(p => [p.id, pathSkills(c, p)])) as Record<string, string[]>, [c, paths]);
  const industries = useMemo(() => industriesOf(paths), [paths]);
  const focus: Focus = hover || { kind: "path", id: selected };
  const gapPath = paths.find(p => p.id === (hover?.kind === "path" ? hover.id : selected)) || paths[0];

  const L = useMemo(() => {
    const skills = c.transferable;
    const maxGaps = Math.max(1, ...paths.map(p => p.gaps.length));
    const colH = [
      SZ.current,
      skills.length * SZ.skill + (skills.length - 1) * GAP.skill,
      industries.length * SZ.industry + (industries.length - 1) * GAP.industry,
      paths.length * SZ.job + (paths.length - 1) * GAP.job,
      maxGaps * SZ.gap + (maxGaps - 1) * GAP.gap,
    ];
    const inner = Math.max(300, ...colH);
    const top = HEAD, bottom = HEAD + inner;
    const tight = W < 900;
    const G = W >= 1000 ? 46 : tight ? 28 : 34;
    const weights = tight ? [0.95, 1.05, 1, 1.2, 1.1] : [1, 1.06, 0.98, 1.2, 1.16];
    const unit = (W - 4 * G) / weights.reduce((a, b) => a + b, 0);
    const cw = weights.map(w => w * unit);
    const cx = cw.map((_, i) => cw.slice(0, i).reduce((a, b) => a + b, 0) + i * G);
    const mid = (b: Box) => b.y + b.h / 2;

    const job: Record<string, Box> = {};
    const jobTop = top + (inner - colH[3]) / 2;
    paths.forEach((p, i) => { job[p.id] = { x: cx[3], y: jobTop + i * (SZ.job + GAP.job), w: cw[3], h: SZ.job }; });

    const ind: Record<string, Box> = {};
    const indY = spread(industries.map(g => g.paths.reduce((t, p) => t + mid(job[p.id]), 0) / g.paths.length - SZ.industry / 2), SZ.industry, GAP.industry, top, bottom);
    industries.forEach((g, i) => { ind[g.name] = { x: cx[2], y: indY[i], w: cw[2], h: SZ.industry }; });

    const bary = (sk: string) => {
      const ys = paths.filter(p => uses[p.id].includes(sk)).map(p => mid(ind[p.industry]));
      return ys.length ? ys.reduce((a, b) => a + b, 0) / ys.length : 1e6;
    };
    const order = skills.slice().sort((a, b) => bary(a) - bary(b));
    const sk: Record<string, Box> = {};
    const skTop = top + (inner - colH[1]) / 2;
    order.forEach((name, i) => { sk[name] = { x: cx[1], y: skTop + i * (SZ.skill + GAP.skill), w: cw[1], h: SZ.skill }; });

    const cur: Box = { x: cx[0], y: top + (inner - SZ.current) / 2, w: cw[0], h: SZ.current };
    return { inner, H: HEAD + inner + 4, cx, cw, job, ind, sk, cur, order, top, bottom, narrow: tight || cw[3] < 150 };
  }, [W, c.transferable, paths, industries, uses]);

  // Gap boxes follow whichever role is in focus.
  const gapItems = gapPath.gaps.length ? gapPath.gaps : NO_GAPS;
  const gH = gapItems.length * SZ.gap + (gapItems.length - 1) * GAP.gap;
  const jb = L.job[gapPath.id];
  const gTop = Math.min(Math.max(jb.y + jb.h / 2 - gH / 2, L.top), L.bottom - gH);
  const gapBox = gapItems.map((_, i): Box => ({ x: L.cx[4], y: gTop + i * (SZ.gap + GAP.gap), w: L.cw[4], h: SZ.gap }));

  // What is in focus.
  const chainPaths = focus.kind === "path" ? paths.filter(p => p.id === focus.id)
    : focus.kind === "skill" ? paths.filter(p => uses[p.id].includes(focus.id))
    : paths.filter(p => p.industry === focus.id);
  const onSk = new Set(focus.kind === "skill" ? [focus.id] : chainPaths.flatMap(p => uses[p.id]));
  const onInd = new Set(chainPaths.map(p => p.industry));
  const onJob = new Set(chainPaths.map(p => p.id));
  const gapsOn = onJob.has(gapPath.id);
  const chainKey = focus.kind + ":" + focus.id;

  // Edges, with endpoints spread along each box edge so bundles stay legible.
  const boxOf = (key: string): Box => {
    const [kind, ...rest] = key.split(":");
    const id = rest.join(":");
    if (kind === "cur") return L.cur;
    if (kind === "sk") return L.sk[id];
    if (kind === "ind") return L.ind[id];
    if (kind === "job") return L.job[id];
    return gapBox[Number(id)];
  };
  const edges: Edge[] = [];
  L.order.forEach(name => edges.push({ id: "c-" + name, from: "cur", to: "sk:" + name, hot: onSk.has(name) }));
  const seen = new Set<string>();
  paths.forEach(p => uses[p.id].forEach(name => {
    const key = name + "|" + p.industry;
    if (seen.has(key)) return;
    seen.add(key);
    const hot = onSk.has(name) && onInd.has(p.industry) && chainPaths.some(cp => cp.industry === p.industry && uses[cp.id].includes(name));
    edges.push({ id: "s-" + key, from: "sk:" + name, to: "ind:" + p.industry, hot });
  }));
  paths.forEach(p => edges.push({ id: "i-" + p.id, from: "ind:" + p.industry, to: "job:" + p.id, hot: onJob.has(p.id) }));
  gapItems.forEach((_, i) => edges.push({ id: "g-" + gapPath.id + i, from: "job:" + gapPath.id, to: "gap:" + i, hot: gapsOn, ok: !gapPath.gaps.length }));

  const outs: Record<string, Edge[]> = {};
  const ins: Record<string, Edge[]> = {};
  edges.forEach(e => { (outs[e.from] = outs[e.from] || []).push(e); (ins[e.to] = ins[e.to] || []).push(e); });
  const centreY = (key: string) => { const b = boxOf(key); return b.y + b.h / 2; };
  const slot = (b: Box, i: number, n: number) => {
    if (n <= 1) return b.y + b.h / 2;
    const pad = Math.min(16, b.h * 0.22);
    return b.y + pad + ((i + 0.5) * (b.h - 2 * pad)) / n;
  };
  const yOut: Record<string, number> = {};
  const yIn: Record<string, number> = {};
  Object.entries(outs).forEach(([k, list]) => list.slice().sort((a, b) => centreY(a.to) - centreY(b.to)).forEach((e, i, arr) => { yOut[e.id] = slot(boxOf(k), i, arr.length); }));
  Object.entries(ins).forEach(([k, list]) => list.slice().sort((a, b) => centreY(a.from) - centreY(b.from)).forEach((e, i, arr) => { yIn[e.id] = slot(boxOf(k), i, arr.length); }));
  const pathD = (e: Edge) => {
    const a = boxOf(e.from), b = boxOf(e.to);
    const x1 = a.x + a.w, y1 = yOut[e.id], x2 = b.x, y2 = yIn[e.id];
    const dx = (x2 - x1) * 0.55;
    return "M" + x1.toFixed(1) + " " + y1.toFixed(1) + " C" + (x1 + dx).toFixed(1) + " " + y1.toFixed(1) + " " + (x2 - dx).toFixed(1) + " " + y2.toFixed(1) + " " + x2.toFixed(1) + " " + y2.toFixed(1);
  };
  const cold = edges.filter(e => !e.hot);
  const hot = edges.filter(e => e.hot);

  const bestBy = (list: CareerPath[]) => list.slice().sort((a, b) => b.alignment - a.alignment)[0];
  const node = (b: Box, on: boolean, strong = false, border?: string): CSSProperties => ({
    position: "absolute", left: 0, top: 0, transform: "translate(" + b.x + "px, " + b.y + "px)", width: b.w, height: b.h, boxSizing: "border-box",
    borderRadius: 14, padding: "9px 11px", overflow: "hidden", textAlign: "left", color: "var(--ink)", font: "inherit",
    border: border || "1px solid " + (strong ? "var(--accent)" : on ? "var(--accent-line)" : "var(--border)"),
    background: strong ? "color-mix(in oklab, #4263EB 22%, var(--surface-2))" : on ? "color-mix(in oklab, #4263EB 9%, var(--surface-2))" : "var(--surface-2)",
    boxShadow: strong ? "0 0 0 3px var(--accent-faint), 0 12px 30px rgba(0,0,0,.28)" : "none",
    opacity: on ? 1 : 0.46,
    transition: reduce ? undefined : "opacity .3s var(--ease), border-color .3s var(--ease), background .3s var(--ease), box-shadow .3s var(--ease), transform .45s cubic-bezier(.16,1,.3,1)",
  });
  const enter = (f: Focus) => () => { if (leaveTimer.current) clearTimeout(leaveTimer.current); setHover(f); };
  const leave = () => { if (leaveTimer.current) clearTimeout(leaveTimer.current); leaveTimer.current = setTimeout(() => setHover(null), 90); };
  const heads = ["Current career", "Transferable skills", "Adjacent industries", "Potential jobs", gapPath.id === selected ? "Development gaps" : "Gaps (preview)"];

  return (
    <div className="rc-scroll-x" style={{ margin: "0 -2px" }}>
      <div ref={ref} onMouseLeave={leave} style={{ position: "relative", minWidth: MIN_W, height: L.H }}>
        {measured > 0 && <>
        <svg width={W} height={L.H} style={{ position: "absolute", left: 0, top: 0, overflow: "visible", pointerEvents: "none" }} aria-hidden="true">
          <defs>
            <linearGradient id={gid} gradientUnits="userSpaceOnUse" x1={0} y1={0} x2={W} y2={0}>
              <stop offset="0%" style={{ stopColor: "#4263EB" }} />
              <stop offset="100%" style={{ stopColor: "var(--teal, #16B8A6)" }} />
            </linearGradient>
          </defs>
          {cold.map(e => <path key={e.id} d={pathD(e)} fill="none" stroke="var(--border-strong)" strokeWidth={1.1} opacity={0.55} />)}
          {hot.map(e => (
            <g key={chainKey + e.id}>
              <path d={pathD(e)} fill="none" stroke={e.ok ? "var(--teal, #16B8A6)" : "url(#" + gid + ")"} strokeWidth={7} strokeLinecap="round" opacity={0.13} />
              <path d={pathD(e)} pathLength={1} fill="none" stroke={e.ok ? "var(--teal, #16B8A6)" : "url(#" + gid + ")"} strokeWidth={2} strokeLinecap="round"
                style={reduce ? undefined : { strokeDasharray: 1, animation: "rcDrawN .75s cubic-bezier(.4,0,.2,1) both" }} />
            </g>
          ))}
          {hot.map(e => {
            const a = boxOf(e.from), b = boxOf(e.to);
            return (
              <g key={"d" + e.id}>
                <circle cx={a.x + a.w} cy={yOut[e.id]} r={2.6} fill="#4263EB" />
                <circle cx={b.x} cy={yIn[e.id]} r={2.6} fill="var(--teal, #16B8A6)" />
              </g>
            );
          })}
        </svg>

        {heads.map((h, i) => (
          <div key={i} style={{ position: "absolute", top: 4, left: L.cx[i], width: L.cw[i] }}>
            <Label style={{ fontSize: 9, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{h}</Label>
          </div>
        ))}

        {/* Current career */}
        <div style={node(L.cur, true)}>
          <Label style={{ fontSize: 8.5 }}>Today</Label>
          <div title={c.title} style={{ fontSize: L.narrow ? 12.5 : 14, fontWeight: 600, lineHeight: 1.28, marginTop: 7, letterSpacing: "-.2px", ...clamp2(L.narrow ? 4 : 3) }}>{c.title}</div>
          <div style={{ fontSize: 11.5, color: "var(--dim)", marginTop: 6 }}>{c.years} years' experience</div>
          <div style={{ fontSize: 19, fontWeight: 600, letterSpacing: "-.6px", marginTop: 10 }}>{eur(c.salaryCurrent)}</div>
          <div style={{ fontSize: 10.5, color: "var(--faint)" }}>current salary</div>
          <div className="rc-row" style={{ gap: 6, marginTop: 9, fontSize: 11, color: "var(--dim)" }}><Icon name="award" size={12} />Recruit Index {c.recruitIndex}</div>
        </div>

        {/* Transferable skills */}
        {L.order.map(name => {
          const on = onSk.has(name);
          const users = paths.filter(p => uses[p.id].includes(name));
          return (
            <button key={name} className="rc-focus" style={{ ...node(L.sk[name], on), padding: "0 10px", display: "flex", alignItems: "center", gap: 7, cursor: users.length ? "pointer" : "default" }}
              onMouseEnter={enter({ kind: "skill", id: name })} onFocus={enter({ kind: "skill", id: name })} onBlur={leave}
              onClick={() => { const b = bestBy(users); if (b) onSelect(b.id); }}
              title={users.length ? name + ": used by " + users.map(p => p.title).join(", ") : name}>
              <span style={{ flex: "none", width: 14, display: "inline-flex", justifyContent: "center", color: "var(--teal, var(--ok))" }}>
                {on ? <Icon name="check" size={11} stroke={2.4} /> : <span style={{ width: 5, height: 5, borderRadius: 2, background: "var(--faint)" }} />}
              </span>
              <span style={{ fontSize: L.narrow ? 11 : 11.5, lineHeight: 1.25, ...clamp2(L.narrow ? 3 : 2) }}>{name}</span>
            </button>
          );
        })}

        {/* Industries */}
        {industries.map(g => {
          const on = onInd.has(g.name);
          return (
            <button key={g.name} className="rc-focus" style={{ ...node(L.ind[g.name], on), cursor: "pointer" }}
              onMouseEnter={enter({ kind: "industry", id: g.name })} onFocus={enter({ kind: "industry", id: g.name })} onBlur={leave}
              onClick={() => onSelect(bestBy(g.paths).id)}>
              <div title={g.name} style={{ fontSize: L.narrow ? 11.5 : 12, fontWeight: 500, lineHeight: 1.28, ...clamp2(L.narrow ? 3 : 2) }}>{g.name}</div>
              <div style={{ fontSize: 10.5, color: g.adjacent ? "var(--teal, var(--ok))" : "var(--faint)", marginTop: 4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {g.adjacent ? "Adjacent" : "Same sector"} · {num(g.roles)} roles
              </div>
            </button>
          );
        })}

        {/* Potential jobs */}
        {paths.map(p => {
          const on = onJob.has(p.id);
          const isSel = p.id === selected;
          return (
            <button key={p.id} className="rc-focus" aria-pressed={isSel} style={{ ...node(L.job[p.id], on, isSel), cursor: "pointer", display: "flex", flexDirection: "column" }}
              onMouseEnter={enter({ kind: "path", id: p.id })} onFocus={enter({ kind: "path", id: p.id })} onBlur={leave}
              onClick={() => onSelect(p.id)}>
              <div title={p.title} style={{ fontSize: L.narrow ? 12 : 12.5, fontWeight: 600, lineHeight: 1.28, letterSpacing: "-.1px", ...clamp2(2) }}>{p.title}</div>
              <div className="rc-row" style={{ marginTop: "auto", gap: 6 }}>
                <span className="rc-grow rc-ellipsis" style={{ fontSize: 11, color: "var(--dim)" }}>{eurK(p.salary[0])} to {eurK(p.salary[1])}</span>
                <span style={{ flex: "none", fontSize: 11, fontWeight: 600, padding: "2px 7px", borderRadius: 999, color: toneColor(alignmentTone(p.alignment)),
                  background: "color-mix(in oklab, " + toneColor(alignmentTone(p.alignment)) + " 14%, transparent)" }}>{p.alignment}%</span>
              </div>
            </button>
          );
        })}

        {/* Development gaps for the role in focus */}
        {gapItems.map((g, i) => (
          <div key={gapPath.id + g.label} style={node(gapBox[i], gapsOn, false, "1px " + (gapPath.gaps.length ? "dashed " : "solid ")
            + (gapsOn ? (gapPath.gaps.length ? "color-mix(in oklab, var(--warn) 55%, transparent)" : "color-mix(in oklab, var(--teal, #16B8A6) 55%, transparent)") : "var(--border)"))}>
            <div className={reduce ? undefined : "rc-fade"}>
            <div className="rc-row" style={{ gap: 6, alignItems: "flex-start" }}>
              <span style={{ flex: "none", display: "inline-flex", marginTop: 1, color: gapPath.gaps.length ? "var(--warn)" : "var(--teal, var(--ok))" }}><Icon name={gapPath.gaps.length ? "target" : "check"} size={12} /></span>
              <span style={{ fontSize: 12, fontWeight: 500, lineHeight: 1.28, ...clamp2(2) }}>{g.label}</span>
            </div>
            <div style={{ fontSize: 11, color: "var(--dim)", lineHeight: 1.35, marginTop: 5, ...clamp2(2) }}>{g.how}</div>
            </div>
          </div>
        ))}
        </>}
      </div>
    </div>
  );
}
