import { useMemo, useState, type ReactNode } from "react";
import { Avatar, Badge, Button, Card, DemoTag, Grid, Note, Page, Section, Stat } from "../../ui";
import { BarList, LineChart } from "../../charts";
import { Icon } from "../../icons";
import { useNav } from "../../nav";
import { allVacancies, openDrawer, useRecruit, type RecruitState } from "../../store";
import { candidate } from "../../selectors";
import { CANDIDATES, CANDIDATE_BY_ID, CAREER_PATHS, EMPLOYER_BY_ID, GEO_SALARY, MARKET, MONTHS, SCENARIO_CAPTION, SERIES, STAGES } from "../../data";
import type { Candidate } from "../../data/types";
import { eur, eurK, num } from "../../format";

/* Recruit HQ, Market intelligence: salary benchmarks, skills demand, the
   career moves the marketplace is seeing and how fast employers get a
   shortlist. Benchmarks are illustrative demo data, never salary advice. */

type Tone = "accent" | "ok" | "warn" | "bad" | "neutral" | "teal";

const FAMILIES: { id: string; label: string; test: RegExp }[] = [
  { id: "retail", label: "Retail and facilities", test: /store|retail|facilities/i },
  { id: "events", label: "Events and conferences", test: /event|conference|banquet/i },
  { id: "fb", label: "Food, beverage and kitchen", test: /food|beverage|chef/i },
  { id: "commercial", label: "Revenue and sales", test: /revenue|sales/i },
  { id: "rooms", label: "Rooms and guest experience", test: /rooms|front office|guest|housekeep|accommodation/i },
  { id: "hotel", label: "Deputy, hotel and duty managers", test: /deputy|hotel manager|hotel operations|duty manager/i },
  { id: "gm", label: "General and group management", test: /general manager|director of operations/i },
  { id: "people", label: "People and wellness", test: /\bhr\b|spa/i },
];
const familyOf = (c: Candidate) => (FAMILIES.find(f => f.test.test(c.title)) || { id: "other" }).id;

const TRANSITIONS: { id: string; from: string; to: string; candidateId: string; pathId?: string; vacancyId?: string; also?: string; why: string }[] = [
  { id: "fb-events", from: "Hotel food and beverage", to: "Events operations", candidateId: "c-mark", pathId: "pm-eod", vacancyId: "v-nl-eod",
    why: "Procurement, budgets and 410 events a year carry straight across. The gaps employers raise are festival-scale safety and production suppliers." },
  { id: "hotel-retail", from: "Hotel operations", to: "Retail operations", candidateId: "c-mark", pathId: "pm-rrom", vacancyId: "v-bw-rrom", also: "c-ben",
    why: "Running several outlets maps onto multi-store retail. Brightwater's cross-industry pilot is testing this move with real vacancies." },
  { id: "banq-events", from: "Hotel banqueting", to: "Events operations", candidateId: "c-peter",
    why: "Large-team event delivery transferred directly into a live-events company. The first sample placement across industries." },
  { id: "hotel-cx", from: "Hotel guest experience", to: "Customer experience, other sectors", candidateId: "c-aoife", pathId: "pa-cxd", vacancyId: "v-qc-cxd", also: "c-orla",
    why: "Service recovery and review-score results travel into venue and retail CX roles. Measurement frameworks are the usual gap." },
];

const STAGE_LABEL = Object.fromEntries(STAGES.map(st => [st.id, st.label])) as Record<string, string>;
const shortRange = (r: [number, number] | number[]) => eurK(r[0]).replace(/k$/, "") + "-" + eurK(r[1]).slice(1);
/** Average, rounded to the nearest €1,000 so estimates do not look more precise than they are. */
const avg = (xs: number[]) => (xs.length ? Math.round(xs.reduce((t, x) => t + x, 0) / xs.length / 1000) * 1000 : 0);

/** Where a person stands on a move, read from the shared store. */
function progressOf(s: RecruitState, candidateId: string, vacancyId?: string): { label: string; tone: Tone } {
  const placed = s.placements.find(p => p.candidateId === candidateId);
  if (placed) return { label: "Placed " + placed.date, tone: "ok" };
  if (!vacancyId) return { label: "Exploring", tone: "neutral" };
  const offer = s.offers.find(o => o.candidateId === candidateId && o.vacancyId === vacancyId && o.visibleToCandidate);
  if (offer) return { label: "Offer " + offer.status, tone: "accent" };
  const entry = s.pipeline.find(p => p.candidateId === candidateId && p.vacancyId === vacancyId);
  if (entry && entry.stage !== "identified") return { label: STAGE_LABEL[entry.stage], tone: "accent" };
  const app = s.applications.find(a => a.candidateId === candidateId && a.vacancyId === vacancyId && a.status !== "withdrawn");
  if (app) return { label: "Applied " + app.date, tone: "accent" };
  if (entry) return { label: "Identified", tone: "accent" };
  if ((s.savedJobs[candidateId] || []).includes(vacancyId)) return { label: "Saved the role", tone: "neutral" };
  return { label: "Exploring", tone: "neutral" };
}

export default function MarketIntel() {
  const s = useRecruit();
  const nav = useNav();
  const [fam, setFam] = useState("gm");
  const people = useMemo(() => CANDIDATES.map(c => candidate(s, c.id)), [s]);
  const open = useMemo(() => allVacancies(s).filter(v => v.status === "open"), [s]);

  const families = useMemo(() => FAMILIES.map(f => {
    const list = people.filter(c => familyOf(c) === f.id);
    return {
      ...f, list,
      market: [avg(list.map(c => c.marketRange[0])), avg(list.map(c => c.marketRange[1]))] as [number, number],
      current: avg(list.map(c => c.salaryCurrent)),
    };
  }).filter(f => f.list.length).sort((a, b) => b.market[1] - a.market[1]), [people]);
  const selected = families.find(f => f.id === fam) || families[0];

  const skills = useMemo(() => {
    const counts = new Map<string, number>();
    open.forEach(v => v.required.forEach(k => counts.set(k, (counts.get(k) || 0) + 1)));
    const active = people.filter(c => c.status === "active");
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 10).map(([name, roles]) => ({
      name, roles, supply: active.filter(c => c.skills.some(k => k.name === name && k.verification === "verified")).length,
    }));
  }, [open, people]);

  const hours = SERIES.hoursToShortlist;
  const dublin = GEO_SALARY[0];

  return (
    <Page wide eyebrow="RECRUIT HQ · TALENT" title="Market intelligence"
      sub="Salary benchmarks, skills in demand and the career moves the marketplace is seeing. Every benchmark is an illustrative estimate from demo data."
      actions={<>
        <Button icon="vacancies" onClick={() => nav.go("hq.roles", "vacancies")}>Open vacancies</Button>
        <Button variant="primary" icon="talent" onClick={() => nav.setTab("candidates")}>Talent database</Button>
      </>}>

      <Grid cols="rc-g4">
        <Stat icon="clock" tone="teal" label="Median hours to shortlist" value={MARKET.medianHoursToShortlist + " h"}
          delta={"-" + (hours[0] - hours[hours.length - 1]).toFixed(1) + " h"} sub="since month 1" />
        <Stat icon="euro" tone="accent" label="Dublin GM benchmark" value={shortRange(dublin.gm)} sub="general manager, illustrative" />
        <Stat icon="vacancies" label="Open roles analysed" value={open.length + " of " + num(MARKET.openVacancies)} sub="sample vacancies" onClick={() => nav.go("hq.roles", "vacancies")} />
        <Stat icon="target" label="Most requested skill" value={skills[0]?.name || "None"} sub={skills[0] ? "required in " + skills[0].roles + " of " + open.length + " open roles" : ""} />
      </Grid>

      <Grid cols="rc-g2">
        <Card title="Salary bands by region" sub="Hotel general manager and deputy general manager, base salary" action={<DemoTag />}>
          <Bands min={60000} max={180000}
            legend={[{ name: "Deputy general manager", color: "var(--teal, #16B8A6)" }, { name: "General manager", color: "var(--accent)" }]}
            rows={GEO_SALARY.map(r => ({
              key: r.region, label: r.region, sub: "DGM " + shortRange(r.dgm) + ", regional index " + r.index.toFixed(2),
              bands: [
                { name: "Deputy general manager", range: [r.dgm[0], r.dgm[1]] as [number, number], color: "var(--teal, #16B8A6)" },
                { name: "General manager", range: [r.gm[0], r.gm[1]] as [number, number], color: "var(--accent)" },
              ],
              right: shortRange(r.gm),
            }))} />
        </Card>

        <Card title="Benchmarks by role family" sub={"Average market range and current salary across the " + people.length + " sample profiles. Select a family to see who is in it."} action={<DemoTag />}>
          <Bands min={40000} max={160000}
            legend={[{ name: "Average market range", color: "linear-gradient(90deg, #4263EB, var(--teal, #16B8A6))" }, { name: "Average current salary", color: "var(--ink)", marker: true }]}
            rows={families.map(f => ({
              key: f.id, label: f.label, sub: f.list.length + " profiles, current average " + eurK(f.current),
              bands: [{ name: "Average market range", range: f.market, color: "linear-gradient(90deg, #4263EB, var(--teal, #16B8A6))" }],
              marker: { name: "Average current salary", value: f.current },
              right: shortRange(f.market), active: f.id === selected?.id, onClick: () => setFam(f.id),
            }))} />
          {selected && (
            <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid var(--border)" }}>
              <div style={{ fontSize: 12, color: "var(--dim)", marginBottom: 10 }}>{selected.label}: the sample behind this band</div>
              <div className="rc-row rc-wrap" style={{ gap: 8 }}>
                {selected.list.map(c => (
                  <button key={c.id} onClick={() => openDrawer("candidate", c.id, { from: "hq" })} className="rc-chip-btn rc-focus"
                    style={{ display: "inline-flex", alignItems: "center", gap: 7, height: 30, padding: "0 10px 0 4px", borderRadius: 999, border: "1px solid var(--border)", background: "var(--surface-2)", color: "var(--body)", fontSize: 12 }}>
                    <Avatar initials={c.initials} tint={c.tint} size={22} />{c.name}
                    <span style={{ color: "var(--faint)", fontVariantNumeric: "tabular-nums" }}>{shortRange(c.marketRange)}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </Card>
      </Grid>

      <Grid cols="rc-g-3-2">
        <Card title="Skills in demand" sub={"Required skills across the " + open.length + " open sample vacancies, against sample profiles with verified evidence"}>
          <BarList items={skills.map(k => ({
            label: k.name, value: k.roles, display: k.roles + (k.roles === 1 ? " role" : " roles"),
            sub: k.supply + " verified", color: k.supply < k.roles ? "var(--warn)" : "var(--accent)",
          }))} />
          <div className="rc-row rc-wrap" style={{ gap: 14, marginTop: 14, fontSize: 11.5, color: "var(--dim)" }}>
            <span className="rc-row" style={{ gap: 6 }}><span style={{ width: 14, height: 6, borderRadius: 999, background: "var(--accent)" }} />Verified supply covers demand</span>
            <span className="rc-row" style={{ gap: 6 }}><span style={{ width: 14, height: 6, borderRadius: 999, background: "var(--warn)" }} />Fewer verified profiles than roles</span>
          </div>
        </Card>
        <Card title="Time to shortlist" sub={SCENARIO_CAPTION + ". Median hours from vacancy posted to first shortlist."} action={<DemoTag />}>
          <LineChart height={214} labels={MONTHS} yMin={0} yMax={12}
            yFormat={v => (Number.isInteger(v) ? String(v) : v.toFixed(1)) + " h"}
            series={[{ name: "Hours to shortlist", values: hours, color: "var(--teal, #16B8A6)", area: true }]} />
          <div style={{ fontSize: 12, color: "var(--dim)", marginTop: 10, lineHeight: 1.5 }}>
            Down from {hours[0]} hours in month 1 to {hours[hours.length - 1]}, as ranked matches and verified profiles replace manual screening.
          </div>
        </Card>
      </Grid>

      <Section title="Career transitions observed" sub="Moves across sectors in the sample records, with where each person stands today">
        <Grid cols="rc-g2">
          {TRANSITIONS.map(t => {
            const c = CANDIDATE_BY_ID[t.candidateId];
            const path = t.pathId ? (CAREER_PATHS[t.candidateId] || []).find(p => p.id === t.pathId) : undefined;
            const placement = s.placements.find(p => p.candidateId === t.candidateId);
            const prog = progressOf(s, t.candidateId, t.vacancyId);
            const also = t.also ? CANDIDATE_BY_ID[t.also] : undefined;
            const alsoEntry = also
              ? s.pipeline.find(p => p.candidateId === also.id && p.vacancyId === t.vacancyId) || s.pipeline.find(p => p.candidateId === also.id)
              : undefined;
            const alsoVac = alsoEntry ? allVacancies(s).find(v => v.id === alsoEntry.vacancyId) : undefined;
            return (
              <Card key={t.id} pad={18}>
                <div className="rc-row rc-wrap" style={{ gap: 8, fontSize: 14, fontWeight: 600, letterSpacing: "-.2px", color: "var(--ink)" }}>
                  <span>{t.from}</span><Icon name="arrowRight" size={14} color="var(--accent)" /><span>{t.to}</span>
                </div>
                <div style={{ fontSize: 12.5, color: "var(--dim)", marginTop: 7, lineHeight: 1.55 }}>{t.why}</div>
                <div onClick={() => openDrawer("candidate", t.candidateId, { from: "hq" })} className="rc-rowhover"
                  style={{ display: "flex", alignItems: "center", gap: 11, marginTop: 14, padding: "10px 12px", borderRadius: 12, background: "var(--surface-2)", border: "1px solid var(--border)" }}>
                  <Avatar initials={c?.initials || "?"} tint={c?.tint} size={32} />
                  <div className="rc-grow">
                    <div style={{ fontSize: 13, fontWeight: 500, color: "var(--ink)" }}>{c?.name}</div>
                    <div className="rc-ellipsis" style={{ fontSize: 11.5, color: "var(--dim)", marginTop: 2 }}>
                      {placement
                        ? (EMPLOYER_BY_ID[placement.employerId]?.name || "") + ", " + eur(placement.salary)
                        : c?.title + (path ? ", target " + shortRange(path.salary) + " (estimate)" : "")}
                    </div>
                  </div>
                  <div className="rc-col" style={{ gap: 5, alignItems: "flex-end", flex: "none" }}>
                    {path && <Badge tone="ok">{path.alignment}% aligned</Badge>}
                    <Badge tone={prog.tone}>{prog.label}</Badge>
                  </div>
                </div>
                {also && (
                  <div style={{ fontSize: 12, color: "var(--dim)", marginTop: 10, lineHeight: 1.5 }}>
                    Also in the sample: <button className="rc-link" onClick={() => openDrawer("candidate", also.id, { from: "hq" })}>{also.name}</button>
                    {alsoEntry && alsoVac ? ", at the " + STAGE_LABEL[alsoEntry.stage].toLowerCase() + " stage for " + alsoVac.title + " at " + (EMPLOYER_BY_ID[alsoVac.employerId]?.short || "") + "." : "."}
                  </div>
                )}
              </Card>
            );
          })}
        </Grid>
      </Section>

      <Note icon="info">
        Benchmarks, ranges and alignment scores are illustrative estimates built from demo data. They are decision support, not salary advice, and never a guaranteed outcome.
      </Note>
    </Page>
  );
}

interface BandRow {
  key: string; label: string; sub?: string; right?: ReactNode; active?: boolean; onClick?: () => void;
  bands: { name: string; range: [number, number]; color: string }[];
  marker?: { name: string; value: number };
}

/** Salary bands on one shared axis, so regions and families compare at a glance. */
function Bands({ rows, min, max, legend }: { rows: BandRow[]; min: number; max: number; legend: { name: string; color: string; marker?: boolean }[] }) {
  const pos = (v: number) => Math.max(0, Math.min(100, ((v - min) / (max - min)) * 100));
  const ticks = [0, 1, 2, 3, 4].map(i => min + ((max - min) / 4) * i);
  const template = "minmax(120px, 200px) minmax(0, 1fr) 76px";
  return (
    <div>
      <div className="rc-row rc-wrap" style={{ gap: 14, marginBottom: 12 }}>
        {legend.map(l => (
          <span key={l.name} className="rc-row" style={{ gap: 7, fontSize: 11.5, color: "var(--dim)" }}>
            {l.marker
              ? <span style={{ width: 2, height: 12, borderRadius: 2, background: l.color }} />
              : <span style={{ width: 16, height: 7, borderRadius: 999, background: l.color }} />}
            {l.name}
          </span>
        ))}
      </div>
      <div className="rc-col" style={{ gap: 2 }}>
        {rows.map(r => (
          <div key={r.key} onClick={r.onClick} className={r.onClick ? "rc-rowhover" : undefined}
            style={{ display: "grid", gridTemplateColumns: template, gap: 14, alignItems: "center", padding: "7px 8px", margin: "0 -8px", borderRadius: 10,
              background: r.active ? "var(--accent-faint)" : undefined, border: "1px solid " + (r.active ? "var(--accent-line)" : "transparent") }}>
            <div style={{ minWidth: 0 }}>
              <div className="rc-ellipsis" style={{ fontSize: 12.5, color: "var(--ink)" }}>{r.label}</div>
              {r.sub && <div className="rc-ellipsis" style={{ fontSize: 11, color: "var(--faint)", marginTop: 2 }}>{r.sub}</div>}
            </div>
            <div style={{ position: "relative", height: 24 }}>
              <div style={{ position: "absolute", left: 0, right: 0, top: 10, height: 4, borderRadius: 999, background: "var(--track)" }} />
              {r.bands.map(b => (
                <div key={b.name} title={b.name + ": " + eurK(b.range[0]) + " to " + eurK(b.range[1])}
                  style={{ position: "absolute", top: 6, height: 12, left: pos(b.range[0]) + "%", width: Math.max(1, pos(b.range[1]) - pos(b.range[0])) + "%",
                    borderRadius: 999, background: b.color, transformOrigin: "left", animation: "rcGrow .8s cubic-bezier(.16,1,.3,1) both" }} />
              ))}
              {r.marker && (
                <div title={r.marker.name + ": " + eurK(r.marker.value)}
                  style={{ position: "absolute", top: 2, height: 20, width: 2, borderRadius: 2, left: "calc(" + pos(r.marker.value) + "% - 1px)", background: "var(--ink)" }} />
              )}
            </div>
            <div style={{ textAlign: "right", fontSize: 12, color: "var(--body)", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>{r.right}</div>
          </div>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: template, gap: 14, marginTop: 6 }}>
        <span />
        <div style={{ position: "relative", height: 14 }}>
          {ticks.map((t, i) => (
            <span key={i} style={{ position: "absolute", left: (i / 4) * 100 + "%", transform: "translateX(" + (i === 0 ? "0" : i === 4 ? "-100%" : "-50%") + ")",
              fontFamily: "var(--mono)", fontSize: 10, color: "var(--faint)", whiteSpace: "nowrap" }}>{eurK(t)}</span>
          ))}
        </div>
        <span />
      </div>
    </div>
  );
}
