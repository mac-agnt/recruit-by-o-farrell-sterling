import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { Avatar, Badge, Button, Card, Chip, DemoTag, Label, Page, Progress, Section, useInterval } from "../../ui";
import { BarList, Gauge, LineChart, RangeBar, Sparkline } from "../../charts";
import { Icon } from "../../icons";
import { ROLE_META, useNav } from "../../nav";
import { DEFAULT_CALC, useRecruit, vacancyById, type RecruitState } from "../../store";
import { candidate, searchableCandidates } from "../../selectors";
import { alignmentTone, matchScore } from "../../match";
import {
  CANDIDATES, CAREER_PATHS, COURSE_BY_ID, EMPLOYER_BY_ID, HQ_TEAM, INDEX_ACTIONS, MARKET, ORG, PARTNER_BY_ID, SALARY_HISTORY, SERIES, placementEconomics,
} from "../../data";
import { eur, eurK, num, pct } from "../../format";

/* Discover Recruit: the public front door. Every figure comes from the shared
   state or the fixtures, people are anonymised, and anything that reads as a
   result is labelled illustrative. */

const HERO = "c-aoife";        // the anonymised professional in the hero preview
const HERO_ROLE = "v-ch-rged";  // the role she leads the marketplace for
const CHANGER = "c-mark";       // the career-change story
const GM = "c-sarah";           // the market value story

/* Public pages never show names. Same derivation as the employer portal's
   anonymous profiles, nudged on collision so every id is unique and stable. */
const PUBLIC_IDS: Record<string, number> = (() => {
  const used = new Set<number>();
  const out: Record<string, number> = {};
  CANDIDATES.forEach(c => {
    let n = 40000 + (c.recruitIndex * 37) % 9999;
    while (used.has(n)) n++;
    used.add(n);
    out[c.id] = n;
  });
  return out;
})();
const pid = (id: string) => "#" + (PUBLIC_IDS[id] ?? 40000);

const standardRate = (s: RecruitState) => s.commissionRules.find(r => r.id === "cr1")?.rate ?? MARKET.recruitDefaultRate;

function useReducedMotion() {
  const query = "(prefers-reduced-motion: reduce)";
  const [reduce, setReduce] = useState(() => typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia(query).matches);
  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const mq = window.matchMedia(query);
    const on = () => setReduce(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return reduce;
}

/* ── page ───────────────────────────────────────────────────────────────── */

export default function Overview() {
  const nav = useNav();
  const reduce = useReducedMotion();
  const founder = HQ_TEAM.find(m => !m.fictional) || HQ_TEAM[0];
  const years = ORG.founderBio.split(", including")[0];
  const city = ORG.location.split(",")[0];

  return (
    <Page wide eyebrow="DISCOVER RECRUIT"
      title={<span style={{ display: "block", fontSize: "clamp(32px, 3.6vw, 50px)", letterSpacing: "-1.8px", lineHeight: 1.06 }}>Your career is worth more than your CV.</span>}
      sub="A new way to understand your value, discover opportunity and connect with the right people.">

      {/* Hero: the three ways in, next to a live preview built from real components */}
      <Row>
        <Cell basis={290} grow={1}>
          <Card pad={18} style={{ flex: 1, display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 14, fontWeight: 600, letterSpacing: "-.2px" }}>Three ways in</div>
            <div style={{ fontSize: 12.5, color: "var(--dim)", marginTop: 4, lineHeight: 1.5 }}>Connected experiences over one set of sample data. A change made in one shows up in the others.</div>
            <div className="rc-col" style={{ gap: 10, marginTop: 16 }}>
              <Entry primary icon="candidate" title="Explore as a candidate"
                sub={"Market value, matches and career paths, seen as a " + ROLE_META.candidate.whoRole.toLowerCase() + "."}
                onClick={() => nav.switchRole("candidate")} />
              <Entry icon="employer" title="Explore as an employer"
                sub={"Search verified talent and hire as " + ROLE_META.employer.blurb + "."}
                onClick={() => nav.switchRole("employer")} />
              <Entry icon="hq" title="Explore Recruit HQ"
                sub="Run the marketplace: talent, employers, revenue and agents."
                onClick={() => nav.switchRole("hq")} />
            </div>
            <div style={{ flex: 1, minHeight: 16 }} />
            <div className="rc-row" style={{ gap: 11, paddingTop: 14, borderTop: "1px solid var(--border)", alignItems: "flex-start" }}>
              <Avatar initials={founder.initials} tint={founder.tint} size={32} />
              <div className="rc-grow" style={{ fontSize: 12, lineHeight: 1.55, color: "var(--dim)" }}>
                Founded by <span style={{ color: "var(--ink)", fontWeight: 500 }}>{ORG.founder}</span> after {years.charAt(0).toLowerCase() + years.slice(1)}.
                {" "}{ORG.legalName}, {city}, incorporated {ORG.incorporated}.
              </div>
            </div>
          </Card>
        </Cell>
        {/* 580px keeps the two preview panes side by side whenever the cell sits beside the entry card */}
        <Cell basis={580} grow={2}>
          <HeroPreview reduce={reduce} />
        </Cell>
      </Row>

      {/* The five propositions, each proven with a different piece of sample data */}
      <Section title="Five ideas behind Recruit" sub="Each one shown with anonymised sample data from this demo.">
        <Row>
          <Cell basis={440} grow={3}><MoreThanCv /></Cell>
          <Cell basis={320} grow={2}>
            <MarketValueIdea />
            <TalentIdea />
          </Cell>
        </Row>
        {/* Wraps below ~1000px so the four-step flow always keeps one line */}
        <Row>
          <Cell basis={340} grow={2}><CostIdea /></Cell>
          <Cell basis={640} grow={3}><DevelopmentIdea /></Cell>
        </Row>
      </Section>

      <ScaleStrip />
      <EmployerBand />

      {/* Close */}
      <Card pad={28} style={{ marginTop: 6, background: "linear-gradient(115deg, color-mix(in oklab, #4263EB 12%, var(--surface)) 0%, var(--surface) 48%, color-mix(in oklab, #16B8A6 9%, var(--surface)) 100%)" }}>
        <div className="rc-row rc-wrap" style={{ gap: 22, alignItems: "flex-end" }}>
          <div style={{ flex: "1 1 420px", minWidth: 0 }}>
            <div style={{ fontSize: "clamp(24px, 2.5vw, 34px)", fontWeight: 500, letterSpacing: "-1.1px", lineHeight: 1.15, color: "var(--ink)", textWrap: "balance" as CSSProperties["textWrap"] }}>
              Discover your value. Find your people. Move forward.
            </div>
            <div style={{ fontSize: 13, color: "var(--dim)", marginTop: 10, lineHeight: 1.55 }}>
              {ORG.product} is a marketplace for hospitality careers first, built to travel to the industries those skills reach.
            </div>
          </div>
          <div className="rc-row rc-wrap" style={{ gap: 8 }}>
            <Button icon="route" onClick={() => nav.setTab("how")}>How it works</Button>
            <Button variant="primary" iconRight="arrowRight" onClick={() => nav.setTab("preview")}>Marketplace preview</Button>
          </div>
        </div>
      </Card>

      <div style={{ fontSize: 11.5, color: "var(--faint)", padding: "4px 4px 0", lineHeight: 1.55 }}>
        The Recruit Index is evidence-based decision support. It is not a credit score or a judgement of a person's worth, and it never rejects anyone automatically.
        Salary ranges are estimates and marketplace figures are illustrative future-state data.
      </div>
    </Page>
  );
}

/* ── hero ───────────────────────────────────────────────────────────────── */

function Entry({ icon, title, sub, primary, onClick }: { icon: string; title: string; sub: string; primary?: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className="rc-card rc-click rc-focus"
      style={{ display: "flex", alignItems: "center", gap: 13, width: "100%", textAlign: "left", padding: "13px 14px", borderRadius: 16, cursor: "pointer", color: "inherit",
        background: primary ? "linear-gradient(120deg, color-mix(in oklab, #4263EB 22%, var(--surface-2)) 0%, var(--surface-2) 75%)" : "var(--surface-2)",
        border: "1px solid " + (primary ? "var(--accent-line)" : "var(--border)") }}>
      <span style={{ width: 38, height: 38, borderRadius: 12, flex: "none", display: "flex", alignItems: "center", justifyContent: "center",
        background: primary ? "var(--accent-fill, var(--accent))" : "var(--surface)", color: primary ? "var(--on-accent)" : "var(--accent)",
        border: primary ? "1px solid transparent" : "1px solid var(--border)", boxShadow: primary ? "var(--accent-glow, none)" : "none" }}>
        <Icon name={icon} size={17} />
      </span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: "block", fontSize: 13.5, fontWeight: 600, color: "var(--ink)" }}>{title}</span>
        <span style={{ display: "block", fontSize: 11.5, color: "var(--dim)", marginTop: 3, lineHeight: 1.45 }}>{sub}</span>
      </span>
      <Icon name="arrowRight" size={15} style={{ color: primary ? "var(--accent)" : "var(--faint)" }} />
    </button>
  );
}

function HeroPreview({ reduce }: { reduce: boolean }) {
  const s = useRecruit();
  const c = candidate(s, HERO);
  const v = vacancyById(HERO_ROLE, s);
  const emp = v ? EMPLOYER_BY_ID[v.employerId] : undefined;
  const matches = useMemo(() => (v
    ? searchableCandidates(s, v.employerId).map(x => ({ c: x, m: matchScore(x, v) })).sort((a, b) => b.m.score - a.m.score).slice(0, 4)
    : []), [s, v]);
  const [focus, setFocus] = useState(0);
  const [pinned, setPinned] = useState(false);
  useInterval(() => setFocus(f => (f + 1) % Math.max(1, matches.length)), reduce || pinned || matches.length < 2 ? null : 3800);
  const current = matches[Math.min(focus, Math.max(0, matches.length - 1))];
  const skills = c.skills.slice().sort((a, b) => Number(b.verification === "verified") - Number(a.verification === "verified") || b.level - a.level).slice(0, 3);
  const lo = Math.floor((Math.min(c.salaryCurrent, c.marketRange[0]) * 0.8) / 5000) * 5000;
  const hi = Math.ceil((c.marketRange[1] * 1.15) / 5000) * 5000;

  return (
    <Card pad={0} style={{ flex: 1, overflow: "hidden",
      background: "linear-gradient(150deg, color-mix(in oklab, #4263EB 16%, var(--surface)) 0%, var(--surface) 44%, color-mix(in oklab, #16B8A6 8%, var(--surface)) 100%)" }}>
      <div className="rc-row rc-wrap" style={{ gap: 10, padding: "15px 18px 13px" }}>
        <span className="rc-row" style={{ gap: 9, fontSize: 13, fontWeight: 600, color: "var(--ink)" }}><LiveDot reduce={reduce} />Live product preview</span>
        <span style={{ fontSize: 12, color: "var(--dim)" }}>One professional, seen from both sides</span>
        <span style={{ marginLeft: "auto" }}><DemoTag>Sample data</DemoTag></span>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, padding: "0 12px 12px" }}>
        {/* What the professional sees */}
        <div style={PANE}>
          <div className="rc-row" style={{ gap: 8 }}>
            <Label>Professional view</Label>
            <span style={{ marginLeft: "auto" }}><Badge tone="teal" icon="verified">{c.verifiedCredentials} verified</Badge></span>
          </div>
          <div className="rc-row" style={{ gap: 11, marginTop: 14, alignItems: "flex-start" }}>
            <AnonAvatar size={40} />
            <div className="rc-grow">
              <div style={{ fontSize: 14.5, fontWeight: 600, color: "var(--ink)" }}>Professional {pid(c.id)}</div>
              <div style={{ fontSize: 12.5, color: "var(--body)", marginTop: 2 }}>{c.title}, {c.years} years</div>
              <div className="rc-ellipsis" style={{ fontSize: 11.5, color: "var(--faint)", marginTop: 2 }}>{c.currentOrgPublic}</div>
            </div>
          </div>
          <div className="rc-row rc-wrap" style={{ gap: 14, marginTop: 12, alignItems: "center" }}>
            <Gauge value={c.recruitIndex} size={146} thickness={11} label="Recruit Index" />
            <div style={{ flex: "1 1 120px", minWidth: 0 }}>
              <Label>Market value</Label>
              <div style={{ fontSize: 21, fontWeight: 600, letterSpacing: "-.7px", marginTop: 7, color: "var(--ink)" }}>{eurK(c.marketRange[0])} to {eurK(c.marketRange[1])}</div>
              <div style={{ fontSize: 11.5, color: "var(--dim)", marginTop: 4, lineHeight: 1.45 }}>Estimated range, against {eurK(c.salaryCurrent)} today</div>
              <div style={{ marginTop: 9 }}><DemoTag /></div>
            </div>
          </div>
          <RangeBar min={lo} max={hi} band={c.marketRange} marker={c.salaryCurrent} markerLabel="Now" format={eurK} height={66} />
          <div className="rc-row rc-wrap" style={{ gap: 6 }}>
            {skills.map(sk => (
              <Chip key={sk.name} style={{ height: 26, fontSize: 11.5 }}>
                <Icon name={sk.verification === "verified" ? "check" : "edit"} size={11} stroke={2.4} style={{ color: sk.verification === "verified" ? "var(--teal, var(--ok))" : "var(--faint)" }} />
                {sk.name}
              </Chip>
            ))}
          </div>
        </div>

        {/* What an employer sees for a live role */}
        <div style={PANE}>
          <div className="rc-row" style={{ gap: 8 }}>
            <Label>Employer view</Label>
            {v && <span style={{ marginLeft: "auto" }}><Badge tone="accent" icon="users">{num(v.marketMatches)} matches</Badge></span>}
          </div>
          {v ? (
            <>
              <div style={{ marginTop: 14 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)", lineHeight: 1.3 }}>{v.title}</div>
                <div style={{ fontSize: 11.5, color: "var(--dim)", marginTop: 4 }}>{emp?.name}, {v.location}, {eurK(v.salary[0])} to {eurK(v.salary[1])}</div>
              </div>
              <div className="rc-col" style={{ gap: 3, marginTop: 10 }}>
                {matches.map((x, i) => (
                  <MatchRow key={x.c.id} id={pid(x.c.id)} title={x.c.title} years={x.c.years} score={x.m.score} same={x.c.id === c.id}
                    active={i === focus} onClick={() => { setFocus(i); setPinned(true); }} />
                ))}
              </div>
              {current && (
                <div key={current.c.id} className="rc-fade" style={{ marginTop: 10, minHeight: 50, fontSize: 11.5, lineHeight: 1.5 }}>
                  <div className="rc-row" style={{ gap: 7, alignItems: "flex-start", color: "var(--body)" }}>
                    <Icon name="check" size={12} stroke={2.4} style={{ color: "var(--teal, var(--ok))", marginTop: 2 }} />
                    <span><span style={{ color: "var(--faint)" }}>Why {pid(current.c.id)}: </span>{current.m.reasons[0]}</span>
                  </div>
                  {current.m.considerations[0] && (
                    <div className="rc-row" style={{ gap: 7, alignItems: "flex-start", color: "var(--dim)", marginTop: 3 }}>
                      <Icon name="info" size={12} style={{ marginTop: 2 }} />
                      <span>Worth checking: {current.m.considerations[0].charAt(0).toLowerCase() + current.m.considerations[0].slice(1)}</span>
                    </div>
                  )}
                </div>
              )}
              <div className="rc-row" style={{ gap: 8, marginTop: 10, padding: "9px 11px", borderRadius: 12, background: "var(--surface-faint)", border: "1px dashed var(--border-strong)", fontSize: 11.5, lineHeight: 1.45, color: "var(--dim)", alignItems: "flex-start" }}>
                <Icon name="lock" size={13} style={{ marginTop: 1, color: "var(--accent)" }} />
                Names and contact details stay hidden until the professional accepts an introduction.
              </div>
            </>
          ) : (
            <div style={{ fontSize: 12.5, color: "var(--dim)", marginTop: 14 }}>This sample role is not available right now.</div>
          )}
        </div>
      </div>
    </Card>
  );
}

const PANE: CSSProperties = { flex: "1 1 270px", minWidth: 0, display: "flex", flexDirection: "column", gap: 0, padding: 16, borderRadius: 18,
  background: "var(--surface)", border: "1px solid var(--border)" };

function MatchRow({ id, title, years, score, same, active, onClick }: { id: string; title: string; years: number; score: number; same: boolean; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className="rc-focus" aria-pressed={active}
      style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "7px 8px", borderRadius: 12, cursor: "pointer", color: "inherit", textAlign: "left",
        background: active ? "var(--accent-faint)" : "transparent", border: "1px solid " + (active ? "var(--accent-line)" : "transparent"),
        transition: "background .3s var(--ease), border-color .3s var(--ease)" }}>
      <AnonAvatar size={28} />
      <span style={{ flex: 1, minWidth: 0 }}>
        <span className="rc-row" style={{ gap: 6 }}>
          <span style={{ fontSize: 12.5, fontWeight: 500, color: "var(--ink)" }}>{id}</span>
          {same && <span style={{ fontSize: 10, color: "var(--accent)", whiteSpace: "nowrap" }}>Same professional</span>}
        </span>
        <span className="rc-ellipsis" style={{ display: "block", fontSize: 11, color: "var(--dim)", marginTop: 2 }}>{title}, {years} yrs</span>
      </span>
      <span style={{ width: 46, flex: "none" }}><Progress value={score} tone={alignmentTone(score)} height={4} /></span>
      <Badge tone={alignmentTone(score)}>{score}%</Badge>
    </button>
  );
}

function AnonAvatar({ size = 36 }: { size?: number }) {
  return (
    <span aria-hidden="true" style={{ width: size, height: size, flex: "none", borderRadius: Math.round(size * 0.32), display: "inline-flex", alignItems: "center", justifyContent: "center",
      background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--dim)" }}>
      <Icon name="candidate" size={Math.round(size * 0.5)} />
    </span>
  );
}

function LiveDot({ reduce }: { reduce: boolean }) {
  return (
    <span style={{ width: 8, height: 8, flex: "none", borderRadius: 99, background: "var(--teal, var(--ok))", boxShadow: "0 0 0 3px var(--teal-soft, var(--ok-soft))",
      animation: reduce ? undefined : "rcPulse 1.8s ease-in-out infinite" }} />
  );
}

/* ── propositions ───────────────────────────────────────────────────────── */

function IdeaHead({ icon, title, body, tag, big }: { icon: string; title: string; body: string; tag?: ReactNode; big?: boolean }) {
  return (
    <div>
      <div className="rc-row" style={{ gap: 10 }}>
        <span style={{ width: 30, height: 30, borderRadius: 10, flex: "none", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--accent-soft)", color: "var(--accent)" }}>
          <Icon name={icon} size={15} />
        </span>
        <span className="rc-grow" />
        {tag}
      </div>
      <div style={{ fontSize: big ? 22 : 18, fontWeight: 600, letterSpacing: big ? "-.7px" : "-.45px", marginTop: 14, color: "var(--ink)", lineHeight: 1.2 }}>{title}</div>
      <div style={{ fontSize: 13, lineHeight: 1.6, color: "var(--dim)", marginTop: 6, maxWidth: "54ch" }}>{body}</div>
    </div>
  );
}

function Foot({ children }: { children: ReactNode }) {
  return <div style={{ fontSize: 11.5, color: "var(--faint)", marginTop: "auto", paddingTop: 14, lineHeight: 1.5 }}>{children}</div>;
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return <span className="rc-row" style={{ gap: 6 }}><span style={{ width: 8, height: 8, borderRadius: 3, background: color }} />{label}</span>;
}

function MoreThanCv() {
  const s = useRecruit();
  const c = candidate(s, CHANGER);
  const paths = (CAREER_PATHS[CHANGER] || []).slice().sort((a, b) => b.alignment - a.alignment);
  const other = paths.filter(p => p.adjacent).length;
  return (
    <Card pad={22} style={{ flex: 1, display: "flex", flexDirection: "column" }}>
      <IdeaHead big icon="profile" title="People are more than their CVs"
        body="Recruit reads experience as evidence. Transferable skills point to roles a job title would never suggest." />
      <div style={{ marginTop: 16, padding: "12px 14px", borderRadius: 14, background: "var(--surface-2)", border: "1px solid var(--border)", fontSize: 12.5, lineHeight: 1.5 }}>
        <div className="rc-row rc-wrap" style={{ gap: 8 }}>
          <span style={{ color: "var(--faint)", width: 118, flex: "none" }}>The CV says</span>
          <span style={{ color: "var(--ink)", fontWeight: 500 }}>{c.title}, {c.years} years</span>
        </div>
        <div className="rc-row rc-wrap" style={{ gap: 8, marginTop: 6 }}>
          <span style={{ color: "var(--faint)", width: 118, flex: "none" }}>The evidence says</span>
          <span style={{ color: "var(--ink)", fontWeight: 500 }}>{paths.length} credible paths, {other} of them in other industries</span>
        </div>
      </div>
      <div style={{ marginTop: 18 }}>
        <BarList max={100} items={paths.map(p => ({ label: p.title, value: p.alignment, display: p.alignment + "%", color: p.adjacent ? "var(--accent)" : "var(--teal, #16B8A6)" }))} />
      </div>
      <div className="rc-row rc-wrap" style={{ gap: 16, marginTop: 12, fontSize: 11.5, color: "var(--dim)" }}>
        <LegendDot color="var(--teal, #16B8A6)" label="Same sector" />
        <LegendDot color="var(--accent)" label="Another industry" />
        <span style={{ marginLeft: "auto", color: "var(--faint)" }}>Transferable-skills alignment</span>
      </div>
      <div className="rc-row rc-wrap" style={{ gap: 6, marginTop: 16 }}>
        {c.transferable.map(t => <Chip key={t} style={{ height: 26, fontSize: 11.5 }}>{t}</Chip>)}
      </div>
      <Foot>A sample professional, anonymised. Alignment is decision support, never a hiring decision.</Foot>
    </Card>
  );
}

function MarketValueIdea() {
  const s = useRecruit();
  const c = candidate(s, GM);
  const hist = SALARY_HISTORY[GM] || [];
  const last = hist[hist.length - 1];
  const gap = last ? last.market - last.salary : 0;
  return (
    <Card pad={20} style={{ flex: 1, display: "flex", flexDirection: "column" }}>
      <IdeaHead icon="value" title="Know your market value" tag={<DemoTag />}
        body={"A general manager with " + c.years + " years, paid " + eurK(gap) + " below the benchmark for her level. Recruit makes that gap visible."} />
      <LineChart height={150} labels={hist.map(h => h.year)} yFormat={v => eurK(v)} yMin={20000} yMax={140000} style={{ marginTop: 14 }}
        series={[
          { name: "Salary", values: hist.map(h => h.salary), color: "var(--accent)", area: true },
          { name: "Market benchmark", values: hist.map(h => h.market), color: "var(--teal, #16B8A6)", dashed: true },
        ]} />
    </Card>
  );
}

function TalentIdea() {
  const hours = SERIES.hoursToShortlist;
  return (
    <Card pad={20} style={{ flex: 1, display: "flex", flexDirection: "column" }}>
      <IdeaHead icon="bolt" title="Immediate access to talent" tag={<DemoTag />}
        body="Employers search verified, available people on the day a role opens." />
      <div className="rc-row" style={{ alignItems: "flex-end", gap: 14, marginTop: 16 }}>
        <div>
          <div style={{ fontSize: 40, fontWeight: 600, letterSpacing: "-1.6px", lineHeight: 1, color: "var(--ink)", fontVariantNumeric: "tabular-nums" }}>
            {MARKET.medianHoursToShortlist}<span style={{ fontSize: 20, color: "var(--dim)", marginLeft: 3, letterSpacing: 0 }}>h</span>
          </div>
          <div style={{ fontSize: 12, color: "var(--dim)", marginTop: 7 }}>median time to a shortlist</div>
        </div>
        <div style={{ marginLeft: "auto" }}><Sparkline values={hours} width={124} height={46} color="var(--teal, #16B8A6)" /></div>
      </div>
      <Foot>Down from {hours[0]}h at the start of the scenario year, across {num(MARKET.discoverableCandidates)} discoverable professionals.</Foot>
    </Card>
  );
}

function CostIdea() {
  const s = useRecruit();
  const rate = standardRate(s);
  const econ = placementEconomics(MARKET.placementsThisMonth, MARKET.avgPlacementSalary, MARKET.agencyBenchmarkRate, rate);
  return (
    <Card pad={20} style={{ flex: 1, display: "flex", flexDirection: "column", background: "linear-gradient(160deg, color-mix(in oklab, #16B8A6 10%, var(--surface)) 0%, var(--surface) 62%)" }}>
      <IdeaHead icon="euro" title="Recruitment should cost less" tag={<DemoTag />}
        body={"A proposed " + pct(rate) + " success fee, against the 15 to 35% agencies typically charge."} />
      <FeeScale rate={rate} />
      <div style={{ marginTop: 6, fontSize: 12.5, color: "var(--body)", lineHeight: 1.6 }}>
        At {econ.placements} placements a month and a {eurK(econ.avgSalary)} average salary, about <b style={{ color: "var(--ink)", fontWeight: 600 }}>{eur(econ.saving)}</b> a month stays with employers.
      </div>
      <Foot>Compared with a {pct(MARKET.agencyBenchmarkRate)} agency benchmark. Proposed model, not final pricing.</Foot>
    </Card>
  );
}

/** Agency fee band against the proposed Recruit rate, on a 0 to 35% axis. */
function FeeScale({ rate }: { rate: number }) {
  const max = 0.35;
  const x = (v: number) => (Math.min(v, max) / max) * 100;
  return (
    <div style={{ position: "relative", height: 74, marginTop: 18 }}>
      <div style={{ position: "absolute", left: 0, right: 0, top: 30, height: 8, borderRadius: 999, background: "var(--track)" }} />
      <div title="Typical agency fees" style={{ position: "absolute", top: 28, height: 12, left: x(0.15) + "%", width: x(0.35) - x(0.15) + "%", borderRadius: 999,
        background: "repeating-linear-gradient(135deg, color-mix(in oklab, var(--warn) 62%, transparent) 0 5px, color-mix(in oklab, var(--warn) 24%, transparent) 5px 10px)" }} />
      <span style={{ position: "absolute", top: 4, left: x(0.25) + "%", transform: "translateX(-50%)", fontSize: 11, color: "var(--warn)", whiteSpace: "nowrap" }}>Agencies 15 to 35%</span>
      <div style={{ position: "absolute", top: 0, left: x(rate) + "%", transform: "translateX(-50%)", display: "flex", flexDirection: "column", alignItems: "center" }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: "var(--accent)", whiteSpace: "nowrap" }}>Recruit {pct(rate)}</span>
        <span style={{ width: 3, height: 26, marginTop: 4, borderRadius: 2, background: "var(--accent)", boxShadow: "0 0 10px var(--accent-soft)" }} />
      </div>
      {[0, 0.1, 0.2, 0.3].map(t => (
        <span key={t} style={{ position: "absolute", top: 50, left: x(t) + "%", transform: t ? "translateX(-50%)" : "none", fontFamily: "var(--mono)", fontSize: 10, color: "var(--faint)" }}>{pct(t)}</span>
      ))}
    </div>
  );
}

function DevelopmentIdea() {
  const course = COURSE_BY_ID["crs-events"];
  const partner = course ? PARTNER_BY_ID[course.partnerId] : undefined;
  const action = (INDEX_ACTIONS[CHANGER] || []).find(a => a.id === "im-evt");
  const path = (CAREER_PATHS[CHANGER] || []).find(p => p.id === "pm-eod");
  const steps = [
    { icon: "learning", k: "Learn", v: course?.title, sub: [partner?.short, course?.duration].filter(Boolean).join(", ") },
    { icon: "verified", k: "Verify", v: course?.credential, sub: "Issuer check, simulated in this demo" },
    { icon: "trendUp", k: "Evidence rises", v: "+" + (action?.points ?? 0) + " Recruit Index points", sub: "Added once the credential is verified" },
    { icon: "jobs", k: "New roles in reach", v: path?.title, sub: path ? path.alignment + "% alignment, " + path.openRoles + " open roles" : "" },
  ];
  return (
    <Card pad={20} style={{ flex: 1, display: "flex", flexDirection: "column" }}>
      <IdeaHead icon="learning" title="Development creates opportunity" tag={<DemoTag />}
        body="A course becomes a verified credential. The credential lifts the evidence, and the evidence opens new roles." />
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 18 }}>
        {steps.map((st, i) => {
          const last = i === steps.length - 1;
          return (
            <div key={st.k} style={{ flex: "1 1 148px", minWidth: 0, display: "flex", alignItems: "stretch", gap: 8 }}>
              <div style={{ flex: 1, minWidth: 0, padding: "12px 13px", borderRadius: 14, background: last ? "var(--accent-faint)" : "var(--surface-2)", border: "1px solid " + (last ? "var(--accent-line)" : "var(--border)") }}>
                <div className="rc-row" style={{ gap: 7, color: last ? "var(--accent)" : "var(--dim)", fontSize: 11.5 }}><Icon name={st.icon} size={13} />{st.k}</div>
                <div style={{ fontSize: 13, fontWeight: 500, color: "var(--ink)", marginTop: 8, lineHeight: 1.35 }}>{st.v}</div>
                <div style={{ fontSize: 11.5, color: "var(--dim)", marginTop: 4, lineHeight: 1.4 }}>{st.sub}</div>
              </div>
              {!last && <span style={{ alignSelf: "center", color: "var(--faint)", flex: "none" }}><Icon name="chevronRight" size={14} /></span>}
            </div>
          );
        })}
      </div>
      <Foot>The same food and beverage manager as above. Course provider is a fictional education partner; effects are illustrative.</Foot>
    </Card>
  );
}

/* ── scale and employer economics ───────────────────────────────────────── */

function ScaleStrip() {
  const grow = (series: number[]) => "+" + num(series[series.length - 1] - series[0]) + " in 12 months";
  const items = [
    { label: "Registered professionals", value: num(MARKET.registeredProfessionals), series: SERIES.registered, note: grow(SERIES.registered) },
    { label: "Verified profiles", value: num(MARKET.verifiedProfiles), series: SERIES.verified, note: pct(MARKET.verifiedProfiles / MARKET.registeredProfessionals) + " of registered" },
    { label: "Member employers", value: num(MARKET.employerAccounts), series: SERIES.employers, note: grow(SERIES.employers) },
    { label: "Open roles", value: num(MARKET.openVacancies), series: SERIES.vacancies, note: "Live on the marketplace" },
    { label: "Placements this month", value: num(MARKET.placementsThisMonth), series: SERIES.placements, note: "Up from " + SERIES.placements[0] + " a month" },
    { label: "Median to shortlist", value: MARKET.medianHoursToShortlist + "h", series: SERIES.hoursToShortlist, note: "From " + SERIES.hoursToShortlist[0] + "h", teal: true },
  ];
  return (
    <Card title="The marketplace at scale" sub="One illustrative future-state scenario, scenario year 2. Not actual results: Recruit is not yet operating."
      action={<DemoTag>Illustrative future-state</DemoTag>} style={{ marginTop: 6 }}>
      <div className="rc-grid rc-g6" style={{ gap: "18px 0" }}>
        {items.map(it => (
          <div key={it.label} style={{ padding: "2px 14px", borderLeft: "1px solid var(--border)", minWidth: 0 }}>
            <div className="rc-ellipsis" style={{ fontSize: 11.5, color: "var(--dim)" }}>{it.label}</div>
            <div style={{ fontSize: 25, fontWeight: 600, letterSpacing: "-.9px", marginTop: 8, lineHeight: 1, color: "var(--ink)", fontVariantNumeric: "tabular-nums" }}>{it.value}</div>
            <div style={{ marginTop: 10 }}><Sparkline values={it.series} width={112} height={26} color={it.teal ? "var(--teal, #16B8A6)" : "var(--accent)"} /></div>
            <div className="rc-ellipsis" style={{ fontSize: 11, color: "var(--faint)", marginTop: 6 }}>{it.note}</div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function EmployerBand() {
  const s = useRecruit();
  const nav = useNav();
  const rate = standardRate(s);
  const salary = DEFAULT_CALC.salary;
  const agency = salary * MARKET.agencyBenchmarkRate;
  const ours = salary * rate;
  return (
    <Card pad={0} style={{ overflow: "hidden", background: "linear-gradient(120deg, color-mix(in oklab, #16B8A6 11%, var(--surface)) 0%, var(--surface) 55%, color-mix(in oklab, #4263EB 9%, var(--surface)) 100%)" }}>
      <div style={{ display: "flex", flexWrap: "wrap" }}>
        <div style={{ flex: "3 1 340px", minWidth: 0, padding: 26, display: "flex", flexDirection: "column" }}>
          <div className="rc-row" style={{ gap: 7, fontSize: 12, fontWeight: 500, color: "var(--teal, var(--ok))" }}><Icon name="employer" size={14} />For employers</div>
          <div style={{ fontSize: "clamp(22px, 2.2vw, 28px)", fontWeight: 600, letterSpacing: "-.9px", marginTop: 10, lineHeight: 1.15, color: "var(--ink)" }}>The right talent. Without the wait.</div>
          <div style={{ fontSize: 13.5, color: "var(--dim)", lineHeight: 1.6, marginTop: 10, maxWidth: "50ch" }}>
            Verified professionals are searchable the moment a role goes live. The success fee applies only when a hire starts.
          </div>
          <div className="rc-row rc-wrap" style={{ gap: 8, marginTop: 22 }}>
            <Button variant="primary" icon="costs" onClick={() => nav.go("emp.costs", "calculator")}>Open the cost calculator</Button>
            <Button icon="layers" onClick={() => nav.setTab("pricing")}>Membership and pricing</Button>
          </div>
        </div>
        <div style={{ flex: "2 1 300px", minWidth: 0, padding: 26, background: "color-mix(in oklab, var(--surface-faint) 72%, transparent)" }}>
          <div className="rc-row" style={{ gap: 10 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>One hire at {eur(salary)}</span>
            <span style={{ marginLeft: "auto" }}><DemoTag /></span>
          </div>
          <CostBar label={"Typical agency, " + pct(MARKET.agencyBenchmarkRate)} value={agency} max={agency} color="color-mix(in oklab, var(--warn) 75%, transparent)" />
          <CostBar label={"Recruit, " + pct(rate) + " proposed"} value={ours} max={agency} color="var(--accent-fill, var(--accent))" />
          <div style={{ marginTop: 18, paddingTop: 14, borderTop: "1px solid var(--border)" }}>
            <div style={{ fontSize: 30, fontWeight: 600, letterSpacing: "-1px", color: "var(--teal, var(--ok))", fontVariantNumeric: "tabular-nums" }}>{eur(agency - ours)}</div>
            <div style={{ fontSize: 12, color: "var(--dim)", marginTop: 4, lineHeight: 1.5 }}>Gross saving on one hire, before the annual membership. A proposed model, not final pricing.</div>
          </div>
        </div>
      </div>
    </Card>
  );
}

function CostBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  return (
    <div style={{ marginTop: 14 }}>
      <div className="rc-row" style={{ fontSize: 12.5 }}>
        <span className="rc-grow" style={{ color: "var(--body)" }}>{label}</span>
        <b style={{ fontWeight: 600, color: "var(--ink)", fontVariantNumeric: "tabular-nums" }}>{eur(value)}</b>
      </div>
      <div style={{ height: 10, borderRadius: 999, background: "var(--track)", marginTop: 7, overflow: "hidden" }}>
        <div style={{ height: "100%", width: Math.max(2, Math.min(100, (value / (max || 1)) * 100)) + "%", borderRadius: 999, background: color, transformOrigin: "left", animation: "rcGrow .9s cubic-bezier(.16,1,.3,1) both" }} />
      </div>
    </div>
  );
}

/* ── layout helpers ─────────────────────────────────────────────────────── */

/** A wrapping row: cells sit side by side when they fit and stack when they don't. */
function Row({ children }: { children: ReactNode }) {
  return <div style={{ display: "flex", flexWrap: "wrap", gap: 14, alignItems: "stretch" }}>{children}</div>;
}
function Cell({ basis, grow = 1, children }: { basis: number; grow?: number; children: ReactNode }) {
  return <div style={{ flex: grow + " 1 " + basis + "px", minWidth: 0, display: "flex", flexDirection: "column", gap: 14 }}>{children}</div>;
}
