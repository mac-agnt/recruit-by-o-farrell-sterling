import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { Badge, Button, Card, Chip, DemoTag, KV, Label, Note, Page, Progress, Section, Segmented, Spinner, Table, Timeline, VerifyBadge, toneColor, useInterval, type Col } from "../../ui";
import { RangeBar, SERIES_COLORS, StackBar } from "../../charts";
import { Icon } from "../../icons";
import { useNav } from "../../nav";
import { openDrawer, useRecruit, vacancyById, type RecruitState } from "../../store";
import { candidate, relevantRoles, searchableCandidates } from "../../selectors";
import { alignmentTone, matchScore } from "../../match";
import { CANDIDATES, CANDIDATE_BY_ID, CAREER_PATHS, COURSE_BY_ID, EMPLOYER_BY_ID, INDEX_LABELS, INDEX_MAX, MARKET, QUALITY } from "../../data";
import type { Offer } from "../../data/types";
import { eur, eurK, num, pct } from "../../format";

/* How it works: the two journeys through Recruit, each step shown with a
   small working preview built from the shared demo state. */

type Journey = "pro" | "emp";
type Tone = "accent" | "ok" | "warn" | "bad" | "neutral" | "teal";
interface Step { id: string; icon: string; title: string; body: string; link: { label: string; page: string; tab: string } }

const PRO_ID = "c-aoife";      // anonymised professional for the candidate journey
const EMP_ROLE = "v-hv-gm";    // Harbourview's general manager search
const REVIEW_ID = "c-sarah";   // the strongest match for that role
const INTRO_ID = "c-ciaran";   // an anonymous profile with an introduction pending

const PRO: Step[] = [
  { id: "upload", icon: "upload", title: "Upload CV", body: "Start with the CV you already have. Recruit reads it into a structured draft and flags what can be verified.",
    link: { label: "Open the CV screen", page: "cand.profile", tab: "cv" } },
  { id: "profile", icon: "profile", title: "Build intelligent profile", body: "Experience, skills and qualifications become evidence, each marked verified, pending or self-reported.",
    link: { label: "Open the profile", page: "cand.profile", tab: "profile" } },
  { id: "value", icon: "value", title: "Understand market value", body: "An estimated market range, and a Recruit Index that shows the evidence behind it area by area.",
    link: { label: "Open market value", page: "cand.value", tab: "value" } },
  { id: "discover", icon: "jobs", title: "Discover opportunities", body: "Open roles ranked by explained alignment, including adjacent industries the skills travel to.",
    link: { label: "Open opportunities", page: "cand.jobs", tab: "recommended" } },
  { id: "progress", icon: "route", title: "Progress your career", body: "See the next role, the gaps between here and there, and the courses that close them.",
    link: { label: "Open career explorer", page: "cand.explorer", tab: "paths" } },
];

const EMP: Step[] = [
  { id: "vacancy", icon: "vacancies", title: "Create vacancy", body: "Describe the role once. Required skills, the salary band and the start date drive the matching.",
    link: { label: "Create a vacancy", page: "emp.vacancies", tab: "create" } },
  { id: "search", icon: "search", title: "Search available professionals", body: "Verified, available people ranked by alignment as soon as the role is live.",
    link: { label: "Open discover talent", page: "emp.talent", tab: "discover" } },
  { id: "review", icon: "verified", title: "Review verified experience", body: "Every match explains itself: what lines up, what to check, and what has been verified.",
    link: { label: "Review in discover talent", page: "emp.talent", tab: "discover" } },
  { id: "connect", icon: "lock", title: "Connect", body: "Request an introduction. Name and contact details stay hidden until the professional agrees.",
    link: { label: "Open shortlists", page: "emp.hiring", tab: "shortlists" } },
  { id: "interview", icon: "calendar", title: "Interview", body: "Book rounds, panels and formats in one place, against the same shortlist.",
    link: { label: "Open interviews", page: "emp.hiring", tab: "interviews" } },
  { id: "offer", icon: "offers", title: "Make offer", body: "Draft, approve and send offers, with every change and response kept on the record.",
    link: { label: "Open offers", page: "emp.hiring", tab: "offers" } },
];

const JOURNEYS: Record<Journey, { steps: Step[]; title: string; sub: string; other: Journey; otherLabel: string }> = {
  pro: { steps: PRO, title: "The professional's journey", sub: "Shown with an anonymised deputy general manager in Dublin", other: "emp", otherLabel: "See the employer journey" },
  emp: { steps: EMP, title: "The employer's journey", sub: "Shown with Harbourview Grand Hotel hiring a general manager", other: "pro", otherLabel: "See the professional journey" },
};

/* Public pages never show names (same derivation as the other public pages). */
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
const fixCase = (t: string) => t.replace(/\bp&l\b/g, "P&L");
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

export default function HowItWorks() {
  const reduce = useReducedMotion();
  const [view, setView] = useState<Journey | "both">("pro");
  const [at, setAt] = useState<Record<Journey, number>>({ pro: 0, emp: 0 });
  const open = (j: Journey, i: number) => { setAt(a => ({ ...a, [j]: i })); setView(j); };

  return (
    <Page wide eyebrow="HOW IT WORKS" title="Two journeys. One marketplace."
      sub="Professionals turn experience into evidence and see their value. Employers find verified people and hire with consent at every step."
      actions={<Segmented value={view} onChange={setView}
        options={[{ id: "pro", label: "Professionals" }, { id: "emp", label: "Employers" }, { id: "both", label: "Both journeys" }]} />}>

      {view === "both"
        ? <BothJourneys onOpen={open} />
        : <JourneyTour key={view} journey={view} index={at[view]} reduce={reduce}
            onIndex={i => setAt(a => ({ ...a, [view]: i }))} onOther={() => open(JOURNEYS[view].other, 0)} />}

      <Difference />
    </Page>
  );
}

/* ── the guided tour ────────────────────────────────────────────────────── */

function JourneyTour({ journey, index, onIndex, onOther, reduce }: { journey: Journey; index: number; onIndex: (i: number) => void; onOther: () => void; reduce: boolean }) {
  const nav = useNav();
  const j = JOURNEYS[journey];
  const st = j.steps[index] || j.steps[0];
  const last = index >= j.steps.length - 1;
  return (
    <Card pad={0} style={{ overflow: "hidden", background: "linear-gradient(160deg, color-mix(in oklab, #4263EB 12%, var(--surface)) 0%, var(--surface) 46%, color-mix(in oklab, #16B8A6 7%, var(--surface)) 100%)" }}>
      <div style={{ padding: "18px 20px 4px" }}>
        <div className="rc-row rc-wrap" style={{ gap: 10 }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)" }}>{j.title}</span>
          <span style={{ fontSize: 12, color: "var(--dim)" }}>{j.sub}</span>
          <span style={{ marginLeft: "auto" }}><DemoTag>Sample data</DemoTag></span>
        </div>
        <StepRail steps={j.steps} index={index} onPick={onIndex} />
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 22, padding: "10px 20px 20px" }}>
        <div style={{ flex: "1 1 260px", minWidth: 0, display: "flex", flexDirection: "column" }}>
          <div style={{ fontFamily: "var(--mono)", fontSize: 10.5, letterSpacing: ".08em", color: "var(--faint)" }}>{index + 1} OF {j.steps.length}</div>
          <div style={{ fontSize: 25, fontWeight: 600, letterSpacing: "-.8px", marginTop: 8, lineHeight: 1.15, color: "var(--ink)" }}>{st.title}</div>
          <div style={{ fontSize: 13.5, lineHeight: 1.65, color: "var(--dim)", marginTop: 10, maxWidth: "44ch" }}>{st.body}</div>
          <div style={{ marginTop: 20 }}>
            <Button variant="primary" iconRight="arrowUpRight" onClick={() => nav.go(st.link.page, st.link.tab)}>{st.link.label}</Button>
          </div>
          <div style={{ flex: 1, minHeight: 20 }} />
          <div className="rc-row rc-wrap" style={{ gap: 8 }}>
            <Button size="sm" variant="ghost" icon="arrowLeft" disabled={index === 0} onClick={() => onIndex(index - 1)}>Back</Button>
            {last
              ? <Button size="sm" iconRight="arrowRight" onClick={onOther}>{j.otherLabel}</Button>
              : <Button size="sm" iconRight="arrowRight" onClick={() => onIndex(index + 1)}>Next: {j.steps[index + 1].title}</Button>}
          </div>
        </div>
        <div key={st.id} className="rc-rise" style={{ flex: "2 1 400px", minWidth: 0, minHeight: 340, padding: 18, borderRadius: 18, background: "var(--surface)", border: "1px solid var(--border)", boxShadow: "0 18px 40px rgba(0,0,0,.14)" }}>
          <StepPreview id={st.id} reduce={reduce} />
        </div>
      </div>
    </Card>
  );
}

function StepRail({ steps, index, onPick }: { steps: Step[]; index: number; onPick: (i: number) => void }) {
  return (
    <div className="rc-scroll-x" style={{ margin: "18px -4px 0", padding: "0 4px 4px" }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(" + steps.length + ", minmax(104px, 1fr))", minWidth: steps.length * 108 }}>
        {steps.map((st, i) => {
          const done = i < index;
          const on = i === index;
          return (
            <button key={st.id} onClick={() => onPick(i)} className="rc-focus" aria-current={on ? "step" : undefined}
              style={{ position: "relative", background: "none", border: 0, padding: "0 6px 10px", cursor: "pointer", color: "inherit", display: "flex", flexDirection: "column", alignItems: "center", gap: 9 }}>
              {i > 0 && <span style={{ position: "absolute", top: 18, right: "50%", width: "100%", height: 2, borderRadius: 2, background: i <= index ? "var(--accent)" : "var(--track)", transition: "background .4s var(--ease)" }} />}
              <span style={{ position: "relative", zIndex: 1, width: 36, height: 36, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center",
                background: on ? "var(--accent-fill, var(--accent))" : done ? "var(--accent-soft)" : "var(--surface-2)",
                color: on ? "var(--on-accent)" : done ? "var(--accent)" : "var(--dim)",
                border: "1px solid " + (on || done ? "var(--accent-line)" : "var(--border)"), boxShadow: on ? "var(--accent-glow, none)" : "none",
                transition: "background .3s var(--ease), color .3s var(--ease), box-shadow .3s var(--ease)" }}>
                <Icon name={done ? "check" : st.icon} size={16} stroke={done ? 2.4 : 1.8} />
              </span>
              <span style={{ fontSize: 12, fontWeight: on ? 600 : 500, color: on ? "var(--ink)" : done ? "var(--body)" : "var(--dim)", textAlign: "center", lineHeight: 1.3 }}>{st.title}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function BothJourneys({ onOpen }: { onOpen: (j: Journey, i: number) => void }) {
  return (
    <>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 14 }}>
        <JourneyColumn journey="pro" icon="candidate" title="Professionals" sub="From a CV to the next move" onOpen={onOpen} />
        <JourneyColumn journey="emp" icon="employer" title="Employers" sub="From a vacancy to an accepted offer" onOpen={onOpen} />
      </div>
      <Note icon="link" tone="accent">
        The two journeys meet at the introduction. The employer asks for a specific role, the professional decides, and only then are name and contact details shared.
      </Note>
    </>
  );
}

function JourneyColumn({ journey, icon, title, sub, onOpen }: { journey: Journey; icon: string; title: string; sub: string; onOpen: (j: Journey, i: number) => void }) {
  const steps = JOURNEYS[journey].steps;
  return (
    <Card pad={20} style={{ flex: "1 1 340px" }}>
      <div className="rc-row" style={{ gap: 11 }}>
        <span style={{ width: 34, height: 34, borderRadius: 11, display: "flex", alignItems: "center", justifyContent: "center", background: "var(--accent-soft)", color: "var(--accent)" }}><Icon name={icon} size={16} /></span>
        <div className="rc-grow">
          <div style={{ fontSize: 15, fontWeight: 600, color: "var(--ink)" }}>{title}</div>
          <div style={{ fontSize: 12, color: "var(--dim)", marginTop: 2 }}>{sub}</div>
        </div>
        <span style={{ fontFamily: "var(--mono)", fontSize: 10.5, color: "var(--faint)" }}>{steps.length} STEPS</span>
      </div>
      <div style={{ marginTop: 16 }}>
        {steps.map((st, i) => (
          <button key={st.id} onClick={() => onOpen(journey, i)} className="rc-rowhover rc-focus"
            style={{ display: "flex", gap: 12, width: "100%", textAlign: "left", background: "none", border: 0, color: "inherit", cursor: "pointer", padding: "0 8px", margin: "0 -8px", borderRadius: 12 }}>
            <span style={{ width: 30, display: "flex", flexDirection: "column", alignItems: "center", flex: "none" }}>
              <span style={{ width: 30, height: 30, marginTop: 8, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--accent)" }}>
                <Icon name={st.icon} size={14} />
              </span>
              {i < steps.length - 1 && <span style={{ flex: 1, width: 2, minHeight: 12, background: "var(--track)", borderRadius: 2 }} />}
            </span>
            <span style={{ flex: 1, minWidth: 0, padding: "10px 0 14px" }}>
              <span style={{ display: "block", fontSize: 13.5, fontWeight: 500, color: "var(--ink)" }}>{st.title}</span>
              <span style={{ display: "block", fontSize: 12, color: "var(--dim)", marginTop: 3, lineHeight: 1.5 }}>{st.body}</span>
            </span>
            <span style={{ alignSelf: "center", color: "var(--faint)", flex: "none" }}><Icon name="chevronRight" size={14} /></span>
          </button>
        ))}
      </div>
    </Card>
  );
}

/* ── step previews ──────────────────────────────────────────────────────── */

function StepPreview({ id, reduce }: { id: string; reduce: boolean }) {
  switch (id) {
    case "upload": return <CvPreview reduce={reduce} />;
    case "profile": return <ProfilePreview />;
    case "value": return <ValuePreview />;
    case "discover": return <RolesPreview />;
    case "progress": return <ProgressPreview />;
    case "vacancy": return <VacancyPreview />;
    case "search": return <SearchPreview />;
    case "review": return <ReviewPreview />;
    case "connect": return <ConnectPreview />;
    case "interview": return <InterviewPreview />;
    case "offer": return <OfferPreview />;
    default: return null;
  }
}

function PreviewHead({ icon, title, sub, right }: { icon: string; title: ReactNode; sub?: ReactNode; right?: ReactNode }) {
  return (
    <div className="rc-row" style={{ gap: 11, alignItems: "flex-start" }}>
      <span style={{ width: 32, height: 32, flex: "none", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--accent)" }}>
        <Icon name={icon} size={15} />
      </span>
      <div className="rc-grow">
        <div style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)", lineHeight: 1.3 }}>{title}</div>
        {sub && <div style={{ fontSize: 12, color: "var(--dim)", marginTop: 3, lineHeight: 1.45 }}>{sub}</div>}
      </div>
      {right && <div style={{ flex: "none" }}>{right}</div>}
    </div>
  );
}

function AnonAvatar({ size = 32 }: { size?: number }) {
  return (
    <span aria-hidden="true" style={{ width: size, height: size, flex: "none", borderRadius: Math.round(size * 0.32), display: "inline-flex", alignItems: "center", justifyContent: "center",
      background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--dim)" }}>
      <Icon name="candidate" size={Math.round(size * 0.5)} />
    </span>
  );
}

function Fine({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return <div style={{ fontSize: 11.5, color: "var(--faint)", lineHeight: 1.5, marginTop: 12, ...style }}>{children}</div>;
}

const rowBtn: CSSProperties = { display: "flex", alignItems: "center", gap: 12, width: "100%", textAlign: "left", background: "none", border: 0, color: "inherit", cursor: "pointer", padding: "10px 8px", margin: "0 -8px", borderRadius: 12 };

/* Professionals */

function CvPreview({ reduce }: { reduce: boolean }) {
  const s = useRecruit();
  const c = candidate(s, PRO_ID);
  const earliest = c.experience[c.experience.length - 1];
  const since = earliest ? earliest.from.split(" ").slice(-1)[0] : "";
  const pending = c.skills.filter(x => x.verification === "pending").length + c.qualifications.filter(q => q.verification === "pending").length;
  const stages = [
    { label: "Reading the document", detail: "cv-deputy-general-manager.pdf" },
    { label: "Mapping experience", detail: c.experience.length + " roles, " + since + " to today" },
    { label: "Extracting skills", detail: c.skills.length + " skills, each with a level" },
    { label: "Matching qualifications", detail: c.qualifications.length + " qualifications and their issuers" },
    { label: "Preparing verification", detail: pending + " items ready to send to issuers" },
  ];
  const total = stages.length;
  const [stage, setStage] = useState(reduce ? total : 0);
  useInterval(() => setStage(x => Math.min(total, x + 1)), !reduce && stage < total ? 780 : null);
  const done = stage >= total;
  return (
    <div>
      <PreviewHead icon="file" title="CV analysis" sub="A structured draft, ready to review"
        right={done ? <Badge tone="teal" icon="check">Draft ready</Badge> : <Badge tone="accent"><Spinner size={10} />Analysing</Badge>} />
      <Progress value={stage} max={total} style={{ marginTop: 16 }} />
      <div style={{ marginTop: 10 }}>
        {stages.map((st, i) => {
          const state = i < stage ? "done" : i === stage ? "run" : "wait";
          return (
            <div key={st.label} className="rc-row" style={{ gap: 12, padding: "10px 0", borderTop: i ? "1px solid var(--border)" : 0, opacity: state === "wait" ? 0.45 : 1, transition: "opacity .3s var(--ease)" }}>
              <span style={{ width: 24, height: 24, flex: "none", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center",
                background: state === "done" ? "var(--teal-soft, var(--ok-soft))" : "var(--surface-2)", color: "var(--teal, var(--ok))", border: "1px solid var(--border)" }}>
                {state === "done" ? <Icon name="check" size={12} stroke={2.6} /> : state === "run" ? <Spinner size={11} /> : <span style={{ width: 5, height: 5, borderRadius: 2, background: "var(--faint)" }} />}
              </span>
              <div className="rc-grow">
                <div style={{ fontSize: 13, color: "var(--ink)" }}>{st.label}</div>
                <div className="rc-ellipsis" style={{ fontSize: 11.5, color: "var(--dim)", marginTop: 2 }}>{st.detail}</div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="rc-row" style={{ gap: 10, marginTop: 8 }}>
        <span className="rc-grow" style={{ fontSize: 11.5, color: "var(--faint)", lineHeight: 1.5 }}>Demo simulation from prepared data. No document leaves the browser.</span>
        {!reduce && <Button size="sm" variant="ghost" icon="refresh" disabled={!done} onClick={() => setStage(0)}>Replay</Button>}
      </div>
    </div>
  );
}

function ProfilePreview() {
  const s = useRecruit();
  const c = candidate(s, PRO_ID);
  const rank = (v: string) => (v === "verified" ? 2 : v === "pending" ? 1 : 0);
  const skills = c.skills.slice().sort((a, b) => rank(b.verification) - rank(a.verification) || b.level - a.level).slice(0, 6);
  const count = (v: "verified" | "self" | "pending") => c.skills.filter(x => x.verification === v).length + c.qualifications.filter(q => q.verification === v).length;
  return (
    <div>
      <PreviewHead icon="profile" title={"Professional " + pid(c.id)} sub={c.title + ", " + c.years + " years, " + c.currentOrgPublic}
        right={<Badge tone="teal" icon="verified">{c.verifiedCredentials} verified</Badge>} />
      <div className="rc-col" style={{ gap: 11, marginTop: 18 }}>
        {skills.map(sk => (
          <div key={sk.name} className="rc-row" style={{ gap: 12 }}>
            <span className="rc-grow rc-ellipsis" style={{ fontSize: 12.5, color: "var(--body)" }}>{sk.name}</span>
            <span style={{ width: 96, flex: "none" }}><Progress value={sk.level} height={5} tone={sk.verification === "verified" ? "teal" : "accent"} /></span>
            <span style={{ width: 92, flex: "none", display: "flex", justifyContent: "flex-end" }}><VerifyBadge status={sk.verification} compact /></span>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 18, paddingTop: 14, borderTop: "1px solid var(--border)" }}>
        <div className="rc-row" style={{ gap: 10, fontSize: 12.5 }}>
          <span className="rc-grow" style={{ color: "var(--body)" }}>Profile evidence</span>
          <b style={{ fontWeight: 600 }}>{c.completeness}%</b>
        </div>
        <Progress value={c.completeness} style={{ marginTop: 8 }} />
        <div className="rc-row rc-wrap" style={{ gap: 16, marginTop: 12, fontSize: 12, color: "var(--dim)" }}>
          <span className="rc-row" style={{ gap: 6 }}><Dot color="var(--teal, var(--ok))" />{count("verified")} verified</span>
          <span className="rc-row" style={{ gap: 6 }}><Dot color="var(--warn)" />{count("pending")} pending</span>
          <span className="rc-row" style={{ gap: 6 }}><Dot color="var(--dim)" />{count("self")} self-reported</span>
        </div>
      </div>
    </div>
  );
}

function Dot({ color }: { color: string }) {
  return <span style={{ width: 8, height: 8, borderRadius: 3, background: color, flex: "none" }} />;
}

function ValuePreview() {
  const s = useRecruit();
  const c = candidate(s, PRO_ID);
  const keys = Object.keys(INDEX_MAX) as (keyof typeof INDEX_MAX)[];
  const parts = keys.map((k, i) => ({ label: INDEX_LABELS[k], value: c.breakdown[k], color: SERIES_COLORS[i % SERIES_COLORS.length] }));
  const lo = Math.floor((Math.min(c.salaryCurrent, c.marketRange[0]) * 0.8) / 5000) * 5000;
  const hi = Math.ceil((c.marketRange[1] * 1.15) / 5000) * 5000;
  return (
    <div>
      <PreviewHead icon="value" title="Market value and the evidence behind it" right={<DemoTag />} />
      <div className="rc-row rc-wrap" style={{ gap: 28, marginTop: 16 }}>
        <div>
          <div style={{ fontSize: 26, fontWeight: 600, letterSpacing: "-.9px", color: "var(--ink)" }}>{eurK(c.marketRange[0])} to {eurK(c.marketRange[1])}</div>
          <div style={{ fontSize: 12, color: "var(--dim)", marginTop: 3 }}>Estimated market range</div>
        </div>
        <div>
          <div style={{ fontSize: 26, fontWeight: 600, letterSpacing: "-.9px", color: "var(--ink)" }}>{c.recruitIndex}</div>
          <div style={{ fontSize: 12, color: "var(--dim)", marginTop: 3 }}>Recruit Index out of 1,000</div>
        </div>
      </div>
      <RangeBar min={lo} max={hi} band={c.marketRange} marker={c.salaryCurrent} markerLabel="Now" format={eurK} height={70} />
      <Label style={{ marginTop: 6 }}>Index breakdown</Label>
      <div style={{ marginTop: 10 }}><StackBar parts={parts} total={1000} height={12} /></div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: "8px 18px", marginTop: 12 }}>
        {keys.map((k, i) => (
          <div key={k} className="rc-row" style={{ gap: 8, fontSize: 12 }}>
            <Dot color={parts[i].color} />
            <span className="rc-grow rc-ellipsis" style={{ color: "var(--body)" }}>{INDEX_LABELS[k]}</span>
            <span style={{ fontVariantNumeric: "tabular-nums", color: "var(--ink)", fontWeight: 600 }}>{c.breakdown[k]}<span style={{ color: "var(--faint)", fontWeight: 400 }}> / {INDEX_MAX[k]}</span></span>
          </div>
        ))}
      </div>
      <Fine>The index is decision support built from professional evidence. It is not a credit score or a judgement of personal worth.</Fine>
    </div>
  );
}

function RolesPreview() {
  const s = useRecruit();
  const roles = relevantRoles(s, PRO_ID);
  return (
    <div>
      <PreviewHead icon="jobs" title={roles.length + " relevant roles, best first"} sub="Ranked and explained from the professional's evidence"
        right={<Badge tone="accent" icon="sparkle">Explained</Badge>} />
      <div style={{ marginTop: 12 }}>
        {roles.slice(0, 4).map(({ v, m }, i) => (
          <button key={v.id} onClick={() => openDrawer("vacancy", v.id)} className="rc-rowhover rc-focus" style={{ ...rowBtn, borderTop: i ? "1px solid var(--border)" : 0, borderRadius: i ? 0 : 12 }}>
            <div className="rc-grow">
              <div className="rc-ellipsis" style={{ fontSize: 13, fontWeight: 500, color: "var(--ink)" }}>{v.title}</div>
              <div className="rc-ellipsis" style={{ fontSize: 11.5, color: "var(--dim)", marginTop: 2 }}>{EMPLOYER_BY_ID[v.employerId]?.short}, {v.location}, {eurK(v.salary[0])} to {eurK(v.salary[1])}</div>
              <div className="rc-ellipsis" style={{ fontSize: 11.5, color: "var(--faint)", marginTop: 3 }}>{fixCase(m.reasons[0] || "")}</div>
            </div>
            <Badge tone={alignmentTone(m.score)}>{m.score}%</Badge>
          </button>
        ))}
      </div>
      <Fine>Select a role to open it. Alignment ranks and explains; it never filters anyone out.</Fine>
    </div>
  );
}

function ProgressPreview() {
  const path = (CAREER_PATHS[PRO_ID] || []).find(p => p.id === "pa-gm");
  if (!path) return <Fine style={{ marginTop: 0 }}>No career path in the sample right now.</Fine>;
  const courses = path.courseIds.map(id => COURSE_BY_ID[id]).filter(Boolean);
  return (
    <div>
      <PreviewHead icon="route" title={"Next: " + path.title} sub={path.industry} right={<DemoTag />} />
      <div style={{ marginTop: 16 }}>
        <KV cols={3} items={[
          { k: "Salary range", v: eurK(path.salary[0]) + " to " + eurK(path.salary[1]) },
          { k: "Alignment today", v: path.alignment + "%" },
          { k: "Typical move", v: path.timeToMove },
        ]} />
      </div>
      <Label style={{ marginTop: 18 }}>Gaps to close</Label>
      <div className="rc-col" style={{ gap: 9, marginTop: 10 }}>
        {path.gaps.map(g => (
          <div key={g.label} className="rc-row" style={{ gap: 10, alignItems: "flex-start", fontSize: 12.5 }}>
            <Icon name="target" size={14} style={{ color: "var(--warn)", marginTop: 2 }} />
            <div className="rc-grow">
              <div style={{ color: "var(--ink)" }}>{g.label}</div>
              <div style={{ color: "var(--dim)", fontSize: 12, marginTop: 2 }}>{g.how}</div>
            </div>
          </div>
        ))}
      </div>
      {courses.length > 0 && (
        <>
          <Label style={{ marginTop: 18 }}>Courses that help</Label>
          <div className="rc-row rc-wrap" style={{ gap: 6, marginTop: 10 }}>
            {courses.map(co => (
              <Chip key={co.id} onClick={() => openDrawer("course", co.id)}>
                <Icon name="learning" size={12} style={{ color: "var(--accent)" }} />{co.title}
                <span style={{ color: "var(--faint)" }}>{pct(co.memberDiscount)} member discount</span>
              </Chip>
            ))}
          </div>
        </>
      )}
      <Fine>Timings and salaries are illustrative estimates, not guarantees.</Fine>
    </div>
  );
}

/* Employers */

function VacancyPreview() {
  const s = useRecruit();
  const v = vacancyById(EMP_ROLE, s);
  if (!v) return <Fine style={{ marginTop: 0 }}>This sample vacancy is not available right now.</Fine>;
  const emp = EMPLOYER_BY_ID[v.employerId];
  return (
    <div>
      <PreviewHead icon="vacancies" title={v.title} sub={(emp?.name || "") + ", " + v.location}
        right={<Badge tone={v.status === "open" ? "teal" : "neutral"} dot>{v.status.charAt(0).toUpperCase() + v.status.slice(1)}</Badge>} />
      <div style={{ marginTop: 16 }}>
        <KV cols={3} items={[
          { k: "Salary band", v: eurK(v.salary[0]) + " to " + eurK(v.salary[1]) },
          { k: "Seniority", v: v.seniority },
          { k: "Experience", v: v.minYears + "+ years" },
        ]} />
      </div>
      <Label style={{ marginTop: 18 }}>Required skills</Label>
      <div className="rc-row rc-wrap" style={{ gap: 6, marginTop: 10 }}>
        {v.required.map(r => <Chip key={r} tone="accent" style={{ height: 26, fontSize: 11.5 }}>{r}</Chip>)}
      </div>
      {v.preferred.length > 0 && (
        <>
          <Label style={{ marginTop: 14 }}>Preferred</Label>
          <div className="rc-row rc-wrap" style={{ gap: 6, marginTop: 10 }}>
            {v.preferred.map(r => <Chip key={r} style={{ height: 26, fontSize: 11.5 }}>{r}</Chip>)}
          </div>
        </>
      )}
      <div className="rc-row rc-wrap" style={{ gap: 20, marginTop: 18, paddingTop: 14, borderTop: "1px solid var(--border)", fontSize: 12.5, color: "var(--dim)" }}>
        <span className="rc-row" style={{ gap: 7 }}><Icon name="users" size={14} style={{ color: "var(--accent)" }} /><b style={{ color: "var(--ink)", fontWeight: 600 }}>{v.marketMatches}</b> marketplace matches</span>
        <span className="rc-row" style={{ gap: 7 }}><Icon name="file" size={14} /><b style={{ color: "var(--ink)", fontWeight: 600 }}>{v.applicants}</b> applicants</span>
        <span className="rc-row" style={{ gap: 7 }}><Icon name="clock" size={14} />Posted {v.postedDays} days ago</span>
      </div>
    </div>
  );
}

function SearchPreview() {
  const s = useRecruit();
  const v = vacancyById(EMP_ROLE, s);
  const [sort, setSort] = useState<"match" | "notice">("match");
  const rows = useMemo(() => (v
    ? searchableCandidates(s, v.employerId).map(c => ({ c, m: matchScore(c, v) })).filter(x => x.m.score >= 65)
    : []), [s, v]);
  if (!v) return <Fine style={{ marginTop: 0 }}>This sample vacancy is not available right now.</Fine>;
  const sorted = rows.slice().sort((a, b) => (sort === "match" ? b.m.score - a.m.score : a.c.noticeWeeks - b.c.noticeWeeks || b.m.score - a.m.score)).slice(0, 4);
  return (
    <div>
      <PreviewHead icon="search" title={rows.length + " strong sample matches"} sub={"For " + v.title + ", " + (EMPLOYER_BY_ID[v.employerId]?.short || "")}
        right={<Segmented size="sm" value={sort} onChange={setSort} options={[{ id: "match", label: "Best match" }, { id: "notice", label: "Soonest" }]} />} />
      <div style={{ marginTop: 12 }}>
        {sorted.map(({ c, m }, i) => (
          <div key={c.id} className="rc-row" style={{ gap: 11, padding: "10px 0", borderTop: i ? "1px solid var(--border)" : 0 }}>
            <AnonAvatar size={32} />
            <div className="rc-grow">
              <div className="rc-row" style={{ gap: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 500, color: "var(--ink)" }}>Professional {pid(c.id)}</span>
                {c.verifiedCredentials > 0 && <span className="rc-row" style={{ gap: 4, fontSize: 11, color: "var(--teal, var(--ok))" }}><Icon name="verified" size={12} />{c.verifiedCredentials} verified</span>}
              </div>
              <div className="rc-ellipsis" style={{ fontSize: 11.5, color: "var(--dim)", marginTop: 2 }}>{c.title}, {c.years} years, {c.region}, {c.noticeWeeks} weeks' notice</div>
            </div>
            <Badge tone={alignmentTone(m.score)}>{m.score}%</Badge>
          </div>
        ))}
      </div>
      <Fine>Sample records from a marketplace of {num(MARKET.discoverableCandidates)} discoverable professionals (illustrative). Hidden profiles never appear.</Fine>
    </div>
  );
}

function ReviewPreview() {
  const s = useRecruit();
  const v = vacancyById(EMP_ROLE, s);
  if (!v) return <Fine style={{ marginTop: 0 }}>This sample vacancy is not available right now.</Fine>;
  const c = candidate(s, REVIEW_ID);
  const m = matchScore(c, v);
  const tone = alignmentTone(m.score);
  const status = (name: string) => c.skills.find(x => x.name === name)?.verification ?? "self";
  return (
    <div>
      <div className="rc-row" style={{ gap: 12, alignItems: "flex-start" }}>
        <AnonAvatar size={40} />
        <div className="rc-grow">
          <div style={{ fontSize: 15, fontWeight: 600, color: "var(--ink)" }}>Professional {pid(c.id)}</div>
          <div style={{ fontSize: 12, color: "var(--dim)", marginTop: 3, lineHeight: 1.45 }}>{c.title}, {c.years} years, {c.currentOrgPublic}</div>
        </div>
        <div style={{ textAlign: "right", flex: "none" }}>
          <div style={{ fontSize: 28, fontWeight: 600, letterSpacing: "-1px", lineHeight: 1, color: toneColor(tone) }}>{m.score}%</div>
          <div style={{ fontSize: 11, color: "var(--faint)", marginTop: 4 }}>alignment for {v.title}</div>
        </div>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 16, marginTop: 18 }}>
        <div style={{ flex: "1 1 220px", minWidth: 0 }}>
          <Label>What lines up</Label>
          <div className="rc-col" style={{ gap: 8, marginTop: 10 }}>
            {m.reasons.map(r => (
              <div key={r} className="rc-row" style={{ gap: 8, alignItems: "flex-start", fontSize: 12.5, color: "var(--body)", lineHeight: 1.45 }}>
                <Icon name="check" size={13} stroke={2.4} style={{ color: "var(--teal, var(--ok))", marginTop: 2 }} />{fixCase(r)}
              </div>
            ))}
          </div>
        </div>
        <div style={{ flex: "1 1 180px", minWidth: 0 }}>
          <Label>Worth checking</Label>
          <div className="rc-col" style={{ gap: 8, marginTop: 10 }}>
            {(m.considerations.length ? m.considerations : ["Nothing flagged"]).map(r => (
              <div key={r} className="rc-row" style={{ gap: 8, alignItems: "flex-start", fontSize: 12.5, color: "var(--dim)", lineHeight: 1.45 }}>
                <Icon name="info" size={13} style={{ color: "var(--warn)", marginTop: 2 }} />{r}
              </div>
            ))}
          </div>
        </div>
      </div>
      <Label style={{ marginTop: 16 }}>Matched skills</Label>
      <div className="rc-row rc-wrap" style={{ gap: 6, marginTop: 10 }}>
        {m.matchedSkills.map(sk => {
          const st = status(sk);
          return (
            <Chip key={sk} style={{ height: 26, fontSize: 11.5 }}>
              <Icon name={st === "verified" ? "verified" : st === "pending" ? "clock" : "edit"} size={12} style={{ color: st === "verified" ? "var(--teal, var(--ok))" : st === "pending" ? "var(--warn)" : "var(--faint)" }} />{sk}
            </Chip>
          );
        })}
      </div>
      <Fine>Decision support only: alignment ranks and explains. People make the hiring decision, and no one is rejected automatically.</Fine>
    </div>
  );
}

function ConnectPreview() {
  const s = useRecruit();
  const v = vacancyById(EMP_ROLE, s);
  const emp = v ? EMPLOYER_BY_ID[v.employerId] : undefined;
  const c = candidate(s, INTRO_ID);
  const [stage, setStage] = useState<"before" | "after">("before");
  const after = stage === "after";
  const fields = [
    { k: "Name", w: 120 },
    { k: "Email address", w: 150 },
    { k: "Phone number", w: 104 },
    { k: "Current employer", w: 136 },
  ];
  return (
    <div>
      <PreviewHead icon="lock" title="Introduction request" sub={(v ? v.title : "A vacancy") + (emp ? ", " + emp.name : "")}
        right={<Segmented size="sm" value={stage} onChange={setStage} options={[{ id: "before", label: "Before consent" }, { id: "after", label: "After consent" }]} />} />
      <div className="rc-row" style={{ gap: 12, marginTop: 16, padding: "12px 14px", borderRadius: 14, background: "var(--surface-2)", border: "1px solid var(--border)" }}>
        <AnonAvatar size={36} />
        <div className="rc-grow">
          <div style={{ fontSize: 13.5, fontWeight: 500, color: "var(--ink)" }}>Professional {pid(c.id)}</div>
          <div className="rc-ellipsis" style={{ fontSize: 11.5, color: "var(--dim)", marginTop: 2 }}>{c.title}, {c.years} years, {c.currentOrgPublic}</div>
        </div>
        {after ? <Badge tone="teal" icon="check">Accepted</Badge> : <Badge tone="warn" icon="clock">Awaiting the professional</Badge>}
      </div>
      <div style={{ marginTop: 8 }}>
        {fields.map((f, i) => (
          <div key={f.k} className="rc-row" style={{ gap: 12, padding: "11px 2px", borderTop: i ? "1px solid var(--border)" : 0 }}>
            <Icon name={after ? "check" : "lock"} size={14} stroke={after ? 2.4 : 1.8} style={{ color: after ? "var(--teal, var(--ok))" : "var(--dim)" }} />
            <span style={{ width: 130, flex: "none", fontSize: 12.5, color: "var(--body)" }}>{f.k}</span>
            {after
              ? <span key="shared" className="rc-fade" style={{ fontSize: 12.5, color: "var(--ink)" }}>Shared with {emp?.short || "the employer"} only</span>
              : <span key="hidden" className="rc-row" style={{ gap: 10 }}>
                  <span aria-hidden="true" style={{ width: f.w, height: 9, borderRadius: 999, background: "var(--track)" }} />
                  <span style={{ fontSize: 11.5, color: "var(--faint)" }}>Hidden</span>
                </span>}
          </div>
        ))}
      </div>
      <div className="rc-row rc-wrap" style={{ gap: 10, marginTop: 12 }}>
        <span className="rc-grow" style={{ fontSize: 11.5, color: "var(--faint)", lineHeight: 1.5 }}>
          If the professional declines, nothing is shared. {QUALITY.introAcceptance}% of introductions are accepted in the scenario.
        </span>
        <DemoTag />
      </div>
    </div>
  );
}

function InterviewPreview() {
  const s = useRecruit();
  const v = vacancyById(EMP_ROLE, s);
  const list = s.interviews.filter(i => i.vacancyId === EMP_ROLE)
    .slice().sort((a, b) => Number(b.status === "scheduled") - Number(a.status === "scheduled")).slice(0, 4);
  return (
    <div>
      <PreviewHead icon="calendar" title={"Interviews for " + (v ? v.title : "the role")} sub={list.length + " rounds on the record, from the live hiring pipeline"} />
      <div style={{ marginTop: 12 }}>
        {list.map((iv, i) => {
          const [day, time] = iv.when.includes(", ") ? iv.when.split(", ") : [iv.when, ""];
          return (
            <div key={iv.id} className="rc-row" style={{ gap: 12, padding: "11px 0", borderTop: i ? "1px solid var(--border)" : 0, alignItems: "flex-start" }}>
              <div style={{ width: 74, flex: "none", padding: "7px 8px", borderRadius: 12, background: "var(--surface-2)", border: "1px solid var(--border)", textAlign: "center" }}>
                <div style={{ fontSize: 11.5, color: "var(--ink)", fontWeight: 500, lineHeight: 1.3 }}>{day}</div>
                {time && <div style={{ fontFamily: "var(--mono)", fontSize: 10.5, color: "var(--dim)", marginTop: 2 }}>{time}</div>}
              </div>
              <div className="rc-grow">
                <div className="rc-row" style={{ gap: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 500, color: "var(--ink)" }}>Professional {pid(iv.candidateId)}</span>
                  <span style={{ fontSize: 11.5, color: "var(--faint)" }}>Round {iv.round}, {iv.format.toLowerCase()}</span>
                </div>
                <div className="rc-ellipsis" style={{ fontSize: 11.5, color: "var(--dim)", marginTop: 3 }}>Panel: {iv.panel.join(", ")}</div>
              </div>
              <Badge tone={iv.status === "scheduled" ? "accent" : "neutral"}>{iv.status === "scheduled" ? "Scheduled" : "Completed"}</Badge>
            </div>
          );
        })}
        {!list.length && <Fine style={{ marginTop: 4 }}>No interviews booked for this role yet.</Fine>}
      </div>
      <Fine>Interviews booked in the employer portal appear here and on the candidate's side.</Fine>
    </div>
  );
}

const OFFER_TONE: Record<Offer["status"], Tone> = {
  draft: "neutral", "awaiting approval": "warn", approved: "teal", sent: "accent", "changes requested": "warn", accepted: "ok", declined: "bad", withdrawn: "neutral",
};

function OfferPreview() {
  const s = useRecruit();
  const o = s.offers.find(x => x.id === "o-hv-sarah") ?? s.offers.find(x => x.employerId === "e-harbourview") ?? null;
  if (!o) return <Fine style={{ marginTop: 0 }}>No offer in the sample right now. Draft one from the employer portal.</Fine>;
  const person = CANDIDATE_BY_ID[o.candidateId];
  const first = person ? person.name.split(" ")[0] : "";
  const scrub = (t: string) => (person ? t.split(person.name).join("the candidate").split(first).join("the candidate") : t);
  const history = o.history.slice(-4).map(h => ({
    when: h.when,
    title: h.who === person?.name ? "Candidate" : h.who,
    body: scrub(h.text),
    tone: h.kind === "approval" ? ("teal" as const) : h.kind === "candidate" ? ("accent" as const) : undefined,
  }));
  return (
    <div>
      <PreviewHead icon="offers" title={o.title + ", " + (EMPLOYER_BY_ID[o.employerId]?.name || "")} sub={"For Professional " + pid(o.candidateId)}
        right={<Badge tone={OFFER_TONE[o.status]}>{o.status.charAt(0).toUpperCase() + o.status.slice(1)}</Badge>} />
      <div style={{ marginTop: 16 }}>
        <KV cols={3} items={[{ k: "Base salary", v: eur(o.salary) }, { k: "Start", v: o.start }, { k: "Respond by", v: o.expires }]} />
      </div>
      <div className="rc-row rc-wrap" style={{ gap: 6, marginTop: 12 }}>
        {o.benefits.map(b => <Chip key={b} style={{ height: 26, fontSize: 11.5 }}>{b}</Chip>)}
      </div>
      <Label style={{ marginTop: 18 }}>On the record</Label>
      <div style={{ marginTop: 12 }}><Timeline items={history} /></div>
    </div>
  );
}

/* ── comparison ─────────────────────────────────────────────────────────── */

interface DiffRow { k: string; icon: string; agency: string; recruit: string; tag?: string }

function Difference() {
  const s = useRecruit();
  const rate = standardRate(s);
  const rows: DiffRow[] = [
    { k: "Time to shortlist", icon: "clock", agency: "Weeks", recruit: MARKET.medianHoursToShortlist + " hours median", tag: "Illustrative" },
    { k: "Fee", icon: "euro", agency: "15 to 35% of first-year salary", recruit: pct(rate) + " success fee", tag: "Proposed" },
    { k: "Evidence", icon: "verified", agency: "CV only", recruit: "Verified experience, skills and credentials" },
    { k: "Contact details", icon: "lock", agency: "Handled by the agency", recruit: "Shared only when the professional agrees" },
    { k: "Salary insight", icon: "value", agency: "Rarely shared with the candidate", recruit: "Estimated range shown to the professional" },
    { k: "Development", icon: "learning", agency: "Outside the process", recruit: "Courses become verified evidence" },
  ];
  const cols: Col<DiffRow>[] = [
    { key: "k", label: "", width: "1fr", render: r => (
      <span className="rc-row" style={{ gap: 10, color: "var(--ink)", fontWeight: 500 }}><Icon name={r.icon} size={15} style={{ color: "var(--dim)" }} />{r.k}</span>
    ) },
    { key: "agency", label: "Traditional agency", width: "1.15fr", render: r => <span style={{ color: "var(--dim)" }}>{r.agency}</span> },
    { key: "recruit", label: "Recruit", width: "1.5fr", render: r => (
      <span className="rc-row rc-wrap" style={{ gap: 8, color: "var(--ink)" }}>
        <Icon name="check" size={14} stroke={2.4} style={{ color: "var(--teal, var(--ok))" }} />{r.recruit}{r.tag && <DemoTag>{r.tag}</DemoTag>}
      </span>
    ) },
  ];
  return (
    <Section title="What makes it different" sub="A traditional agency process next to Recruit, line by line.">
      <Table cols={cols} rows={rows}
        caption={"The agency fee range reflects the founder's experience of the market. Recruit's " + pct(rate) + " fee is a proposed model and the shortlist time comes from the illustrative scenario."} />
    </Section>
  );
}
