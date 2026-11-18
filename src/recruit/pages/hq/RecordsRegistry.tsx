import { useMemo, useState, type ReactNode } from "react";
import { Avatar, Badge, Button, Card, Grid, Label, Page, Segmented, Table, TextInput, VerifyBadge, type Col } from "../../ui";
import { Icon } from "../../icons";
import { useNav } from "../../nav";
import { allVacancies, openDrawer, useRecruit } from "../../store";
import { matchScore } from "../../match";
import {
  CANDIDATES, CANDIDATE_BY_ID, COURSES, CREDENTIAL_CHECKS, EMPLOYERS, EMPLOYER_BY_ID, MARKET, PARTNERS, PARTNER_BY_ID, VERIFICATION_QUEUE,
  type Candidate, type Course, type Employer, type Offer, type Partner, type Placement, type Vacancy,
} from "../../data";
import { eur, eurK, num, pct } from "../../format";

/* Records > Records: a registry of the marketplace data model. Sample records
   open in the shared drawers; aggregate counts come from the simulated
   operating model. The explore button hands a record to the relationship
   explorer on the next tab. */

type Entity = "candidates" | "employers" | "vacancies" | "offers" | "placements" | "courses" | "partners" | "verifications";
type Tone = "accent" | "ok" | "warn" | "bad" | "neutral" | "teal";
interface VerRow { id: string; candidateId: string; item: string; type: string; owner: string; status: string; age: string; done: boolean }

const EXPLORER_KEY = "recruit-explorer-focus";
const ENTITY_META: Record<Entity, { label: string; icon: string; singular: string }> = {
  candidates: { label: "Candidates", icon: "candidate", singular: "Candidate" },
  employers: { label: "Employers", icon: "employer", singular: "Employer" },
  vacancies: { label: "Vacancies", icon: "vacancies", singular: "Vacancy" },
  offers: { label: "Offers", icon: "offers", singular: "Offer" },
  placements: { label: "Placements", icon: "placement", singular: "Placement" },
  courses: { label: "Courses", icon: "learning", singular: "Course" },
  partners: { label: "Partners", icon: "partners", singular: "Education Partner" },
  verifications: { label: "Verifications", icon: "verified", singular: "Verification" },
};
const ORDER: Entity[] = ["candidates", "employers", "vacancies", "offers", "placements", "courses", "partners", "verifications"];

const VERIFICATIONS: VerRow[] = VERIFICATION_QUEUE.map(v => ({ id: v.id, candidateId: v.candidateId, item: v.item, type: v.type, owner: v.owner, status: v.status, age: v.age, done: false }))
  .concat(CREDENTIAL_CHECKS.map(c => ({ id: c.id, candidateId: c.candidateId, item: c.credential, type: "Credential check", owner: c.issuer, status: c.status === "verified" ? "Verified by issuer" : "Waiting on issuer", age: c.age, done: c.status === "verified" })));

const OFFER_TONE = (st: Offer["status"]): Tone => st === "accepted" ? "ok" : st === "declined" || st === "withdrawn" ? "bad" : st === "sent" ? "accent" : st === "changes requested" ? "warn" : "neutral";
const INVOICE_TONE: Record<Placement["invoice"], Tone> = { paid: "ok", invoiced: "accent", pending: "neutral", overdue: "bad" };

export default function RecordsRegistry() {
  const s = useRecruit();
  const nav = useNav();
  const [entity, setEntity] = useState<Entity>("candidates");
  const [q, setQ] = useState("");
  const vacancies = allVacancies(s);
  const needle = q.trim().toLowerCase();
  const has = (...parts: (string | undefined)[]) => !needle || parts.join(" ").toLowerCase().includes(needle);

  const explore = (id: string) => {
    try { sessionStorage.setItem(EXPLORER_KEY, id); } catch { /* storage blocked: the explorer opens on its default */ }
    nav.go("Records", "relationships");
  };
  const exploreCol = <R,>(id: (r: R) => string): Col<R> => ({ key: "explore", label: "", width: "52px", align: "right", render: r => <ExploreBtn onClick={() => explore(id(r))} /> });

  /* Relationship counts in the sample data. */
  const matches = useMemo(() => {
    const open = allVacancies(s).filter(v => v.status === "open");
    return CANDIDATES.filter(c => c.status === "active").reduce((t, c) => t + open.filter(v => matchScore(c, v).score >= 70).length, 0);
    // Vacancy edits are the only inputs that change the count.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s.vacancyStatus, s.createdVacancies]);
  const rels: { s: Entity | null; sl: string; p: string; o: Entity | null; ol: string; n: number }[] = [
    { s: "candidates", sl: "Candidate", p: "HAS_SKILL", o: null, ol: "Skill", n: CANDIDATES.reduce((t, c) => t + c.skills.length, 0) },
    { s: "candidates", sl: "Candidate", p: "HAS_EXPERIENCE", o: null, ol: "Professional Experience", n: CANDIDATES.reduce((t, c) => t + c.experience.length, 0) },
    { s: "candidates", sl: "Candidate", p: "HOLDS_QUALIFICATION", o: null, ol: "Qualification", n: CANDIDATES.reduce((t, c) => t + c.qualifications.length, 0) },
    { s: "candidates", sl: "Candidate", p: "MATCHES", o: "vacancies", ol: "Vacancy", n: matches },
    { s: "candidates", sl: "Candidate", p: "APPLIES_TO", o: "vacancies", ol: "Vacancy", n: s.applications.filter(a => a.status !== "withdrawn").length },
    { s: "employers", sl: "Employer", p: "POSTS", o: "vacancies", ol: "Vacancy", n: vacancies.length },
    { s: "employers", sl: "Employer", p: "SENDS_OFFER", o: "candidates", ol: "Candidate", n: s.offers.length },
    { s: "placements", sl: "Placement", p: "FILLS", o: "vacancies", ol: "Vacancy", n: s.placements.length },
    { s: "placements", sl: "Placement", p: "GENERATES", o: null, ol: "Commission", n: s.placements.length },
    { s: "partners", sl: "Education Partner", p: "PROVIDES", o: "courses", ol: "Course", n: COURSES.length },
    { s: "candidates", sl: "Candidate", p: "ENROLS_IN", o: "courses", ol: "Course", n: s.enrolments.length },
  ];

  const counts: Record<Entity, { sample: number; aggregate: string | null }> = {
    candidates: { sample: CANDIDATES.length, aggregate: num(MARKET.registeredProfessionals) + " registered professionals" },
    employers: { sample: EMPLOYERS.length, aggregate: num(MARKET.employerAccounts) + " employer accounts" },
    vacancies: { sample: vacancies.length, aggregate: num(MARKET.openVacancies) + " open vacancies" },
    offers: { sample: s.offers.length, aggregate: null },
    placements: { sample: s.placements.length, aggregate: num(MARKET.placementsThisMonth) + " placements this month" },
    courses: { sample: COURSES.length, aggregate: null },
    partners: { sample: PARTNERS.length, aggregate: null },
    verifications: { sample: VERIFICATIONS.length, aggregate: num(MARKET.verificationBacklog) + " profiles in the backlog" },
  };
  const meta = ENTITY_META[entity];
  const c = counts[entity];

  let table: ReactNode = null;
  if (entity === "candidates") {
    const rows = CANDIDATES.filter(x => has(x.name, x.title, x.location, x.currentOrg));
    const cols: Col<Candidate>[] = [
      { key: "n", label: "Professional", width: "minmax(200px, 2fr)", render: x => <Person name={x.name} sub={x.title} initials={x.initials} tint={x.tint} /> },
      { key: "loc", label: "Location", width: "minmax(100px, 1fr)", render: x => <span className="rc-ellipsis" style={{ display: "block" }}>{x.location}</span> },
      { key: "idx", label: "Index", width: "76px", align: "right", render: x => <b style={{ fontWeight: 600, color: "var(--ink)" }}>{num(x.recruitIndex)}</b> },
      { key: "av", label: "Availability", width: "134px", render: x => <span style={{ fontSize: 12, color: "var(--dim)" }}>{x.availability}</span> },
      { key: "st", label: "Status", width: "112px", render: x => x.status === "placed" ? <Badge tone="teal">Placed</Badge> : x.visibility === "hidden" ? <Badge tone="neutral" icon="eyeOff">Hidden</Badge> : x.visibility === "anonymous" ? <Badge tone="neutral">Anonymous</Badge> : <Badge tone="accent">Discoverable</Badge> },
      exploreCol<Candidate>(x => "candidate:" + x.id),
    ];
    table = <Table cols={cols} rows={rows} onRow={x => openDrawer("candidate", x.id)} empty={<NoMatch />} caption="HQ sees every record. Employers only see discoverable or anonymised profiles, and contact details only after consent." />;
  } else if (entity === "employers") {
    const rows = EMPLOYERS.filter(x => has(x.name, x.sector, x.location, x.contact));
    const cols: Col<Employer>[] = [
      { key: "n", label: "Employer", width: "minmax(200px, 2fr)", render: x => <Person name={x.name} sub={x.sector + ", " + x.location} initials={x.initials} tint={x.tint} square /> },
      { key: "tier", label: "Tier", width: "90px", render: x => s.tiers.find(t => t.id === x.tier)?.label || "" },
      { key: "ms", label: "Membership", width: "110px", render: x => <Badge tone={x.membershipStatus === "active" ? "teal" : x.membershipStatus === "trial" ? "accent" : "warn"}>{x.membershipStatus}</Badge> },
      { key: "h", label: "Health", width: "84px", render: x => <Badge tone={x.health === "healthy" ? "ok" : x.health === "watch" ? "warn" : "bad"}>{x.health}</Badge> },
      { key: "pl", label: "Placed YTD", width: "84px", align: "right", render: x => x.placementsYtd },
      { key: "sp", label: "Spend YTD", width: "92px", align: "right", render: x => eur(x.spendYtd) },
      exploreCol<Employer>(x => "employer:" + x.id),
    ];
    table = <Table cols={cols} rows={rows} onRow={x => openDrawer("employer", x.id)} empty={<NoMatch />} caption="Fictional employer accounts. Spend and placements are simulated." />;
  } else if (entity === "vacancies") {
    const rows = vacancies.filter(x => has(x.title, EMPLOYER_BY_ID[x.employerId]?.name, x.location, x.department));
    const cols: Col<Vacancy>[] = [
      { key: "n", label: "Vacancy", width: "minmax(200px, 2fr)", render: x => (
        <div style={{ minWidth: 0 }}>
          <div className="rc-ellipsis" style={{ fontSize: 13, fontWeight: 500, color: "var(--ink)" }}>{x.title}</div>
          <div className="rc-ellipsis" style={{ fontSize: 11.5, color: "var(--dim)", marginTop: 2 }}>{EMPLOYER_BY_ID[x.employerId]?.name}, {x.location}</div>
        </div>
      ) },
      { key: "sal", label: "Salary", width: "112px", render: x => eurK(x.salary[0]) + "-" + eurK(x.salary[1]).slice(1) },
      { key: "st", label: "Status", width: "92px", render: x => <Badge tone={x.status === "open" ? "teal" : x.status === "filled" ? "ok" : "neutral"}>{x.status}</Badge> },
      { key: "age", label: "Posted", width: "84px", align: "right", render: x => x.postedDays + "d ago" },
      { key: "mm", label: "Matches", width: "84px", align: "right", render: x => x.marketMatches || "" },
      { key: "pipe", label: "Pipeline", width: "84px", align: "right", render: x => s.pipeline.filter(p => p.vacancyId === x.id).length || "" },
      exploreCol<Vacancy>(x => "vacancy:" + x.id),
    ];
    table = <Table cols={cols} rows={rows} onRow={x => openDrawer("vacancy", x.id)} empty={<NoMatch />} caption="Matches are aggregate counts in the simulated marketplace; pipeline counts are sample records." />;
  } else if (entity === "offers") {
    const rows = s.offers.filter(x => has(x.title, CANDIDATE_BY_ID[x.candidateId]?.name, EMPLOYER_BY_ID[x.employerId]?.name));
    const cols: Col<Offer>[] = [
      { key: "n", label: "Offer", width: "minmax(210px, 2fr)", render: x => {
        const cand = CANDIDATE_BY_ID[x.candidateId];
        return <Person name={(cand?.name || "") + " for " + x.title} sub={EMPLOYER_BY_ID[x.employerId]?.name || ""} initials={cand?.initials || "?"} tint={cand?.tint} />;
      } },
      { key: "sal", label: "Salary", width: "100px", align: "right", render: x => eur(x.salary) },
      { key: "st", label: "Status", width: "128px", render: x => <Badge tone={OFFER_TONE(x.status)}>{x.status}</Badge> },
      { key: "vis", label: "Candidate sees it", width: "110px", render: x => x.visibleToCandidate ? <span style={{ color: "var(--teal, var(--ok))" }}>Yes</span> : <span style={{ color: "var(--faint)" }}>Not yet</span> },
      { key: "exp", label: "Expires", width: "100px", render: x => <span style={{ fontSize: 12, color: "var(--dim)" }}>{x.expires}</span> },
      exploreCol<Offer>(x => "offer:" + x.id),
    ];
    table = <Table cols={cols} rows={rows} onRow={x => openDrawer("offer", x.id)} empty={<NoMatch />} caption="Draft and contingency offers stay invisible to the candidate until they are sent." />;
  } else if (entity === "placements") {
    const rows = s.placements.filter(x => has(CANDIDATE_BY_ID[x.candidateId]?.name, EMPLOYER_BY_ID[x.employerId]?.name));
    const cols: Col<Placement>[] = [
      { key: "n", label: "Placement", width: "minmax(210px, 2fr)", render: x => {
        const cand = CANDIDATE_BY_ID[x.candidateId];
        return <Person name={cand?.name || ""} sub={(vacancies.find(v => v.id === x.vacancyId)?.title || "") + ", " + (EMPLOYER_BY_ID[x.employerId]?.short || "")} initials={cand?.initials || "?"} tint={cand?.tint} />;
      } },
      { key: "sal", label: "Salary", width: "96px", align: "right", render: x => eur(x.salary) },
      { key: "fee", label: "Commission", width: "104px", align: "right", render: x => <span>{eur(x.salary * x.feeRate)} <span style={{ color: "var(--faint)", fontSize: 11 }}>{pct(x.feeRate)}</span></span> },
      { key: "inv", label: "Invoice", width: "96px", render: x => <Badge tone={INVOICE_TONE[x.invoice]}>{x.invoice}</Badge> },
      { key: "start", label: "Starts", width: "80px", render: x => <span style={{ fontSize: 12, color: "var(--dim)" }}>{x.startDate}</span> },
      exploreCol<Placement>(x => "placement:" + x.id),
    ];
    table = <Table cols={cols} rows={rows} onRow={x => openDrawer("candidate", x.candidateId)} empty={<NoMatch />} caption="Each placement fills a vacancy and generates a commission, charged on the start date." />;
  } else if (entity === "courses") {
    const rows = COURSES.filter(x => has(x.title, x.category, PARTNER_BY_ID[x.partnerId]?.name));
    const cols: Col<Course>[] = [
      { key: "n", label: "Course", width: "minmax(220px, 2fr)", render: x => (
        <div style={{ minWidth: 0 }}>
          <div className="rc-ellipsis" style={{ fontSize: 13, fontWeight: 500, color: "var(--ink)" }}>{x.title}</div>
          <div className="rc-ellipsis" style={{ fontSize: 11.5, color: "var(--dim)", marginTop: 2 }}>{PARTNER_BY_ID[x.partnerId]?.short}, {x.duration}</div>
        </div>
      ) },
      { key: "cat", label: "Category", width: "116px", render: x => <Badge tone="neutral">{x.category}</Badge> },
      { key: "price", label: "Price", width: "84px", align: "right", render: x => eur(x.price) },
      { key: "enr", label: "Enrolled", width: "88px", align: "right", render: x => num(x.enrolled + s.enrolments.filter(e => e.courseId === x.id && e.date === "Today").length) },
      { key: "rate", label: "Rating", width: "68px", align: "right", render: x => x.rating.toFixed(1) },
      exploreCol<Course>(x => "course:" + x.id),
    ];
    table = <Table cols={cols} rows={rows} onRow={x => openDrawer("course", x.id)} empty={<NoMatch />} caption="The full catalogue from the fictional partners." />;
  } else if (entity === "partners") {
    const rows = PARTNERS.filter(x => has(x.name, x.kind, x.location, x.status));
    const cols: Col<Partner>[] = [
      { key: "n", label: "Education partner", width: "minmax(230px, 2fr)", render: x => <Person name={x.name} sub={x.kind + ", " + x.location} initials={x.initials} tint={x.tint} square /> },
      { key: "st", label: "Status", width: "minmax(150px, 1.1fr)", render: x => <span style={{ fontSize: 12, color: "var(--dim)" }}>{x.status}</span> },
      { key: "c", label: "Courses", width: "76px", align: "right", render: x => x.courses },
      { key: "r", label: "Referrals", width: "88px", align: "right", render: x => num(x.referrals) },
      { key: "e", label: "Enrolments", width: "96px", align: "right", render: x => num(x.enrolments + s.enrolments.filter(e => e.date === "Today" && COURSES.find(k => k.id === e.courseId)?.partnerId === x.id).length) },
      exploreCol<Partner>(x => "partner:" + x.id),
    ];
    table = <Table cols={cols} rows={rows} onRow={() => nav.go("hq.learning", "institutions")} empty={<NoMatch />} caption="All five institutions are fictional. No partnership has been signed." />;
  } else {
    const rows = VERIFICATIONS.filter(x => has(x.item, x.type, CANDIDATE_BY_ID[x.candidateId]?.name, x.owner));
    const cols: Col<VerRow>[] = [
      { key: "n", label: "Item", width: "minmax(200px, 2fr)", render: x => {
        const cand = CANDIDATE_BY_ID[x.candidateId];
        return <Person name={x.item} sub={cand?.name || ""} initials={cand?.initials || "?"} tint={cand?.tint} />;
      } },
      { key: "t", label: "Type", width: "110px", render: x => <span style={{ fontSize: 12, color: "var(--dim)" }}>{x.type}</span> },
      { key: "o", label: "With", width: "minmax(130px, 1.2fr)", render: x => <span className="rc-ellipsis" style={{ display: "block", fontSize: 12 }}>{x.owner}</span> },
      { key: "s", label: "Status", width: "150px", render: x => x.done ? <VerifyBadge status="verified" /> : <Badge tone="warn" icon="clock">{x.status}</Badge> },
      { key: "a", label: "Age", width: "64px", align: "right", render: x => <span style={{ fontSize: 12, color: "var(--faint)" }}>{x.age}</span> },
      exploreCol<VerRow>(x => "candidate:" + x.candidateId),
    ];
    table = <Table cols={cols} rows={rows} onRow={x => openDrawer("candidate", x.candidateId)} empty={<NoMatch />} caption="Issuer and employer checks are simulated. Agents never mark a fact as verified on their own." />;
  }

  return (
    <Page wide eyebrow="RECORDS" title="Entity registry"
      sub="The marketplace data model, record by record. Open any sample record, or follow it into the relationship explorer."
      actions={<Button variant="primary" icon="graph" onClick={() => nav.go("Records", "relationships")}>Relationship explorer</Button>}>

      <div className="rc-scroll-x" style={{ padding: "2px 0" }}>
        <Segmented size="sm" value={entity} onChange={v => { setEntity(v); setQ(""); }} options={ORDER.map(id => ({ id, label: ENTITY_META[id].label }))} />
      </div>

      <Grid cols="rc-g-side-r">
        <div className="rc-col" style={{ gap: 12, minWidth: 0 }}>
          <Card pad="14px 16px">
            <div className="rc-row rc-wrap" style={{ gap: 14 }}>
              <span style={{ width: 36, height: 36, flex: "none", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", background: "var(--accent-soft)", color: "var(--accent)" }}>
                <Icon name={meta.icon} size={17} />
              </span>
              <div className="rc-grow" style={{ minWidth: 200 }}>
                <div style={{ fontSize: 15, fontWeight: 600 }}>{num(c.sample)} sample {meta.label.toLowerCase()}</div>
                <div style={{ fontSize: 12, color: "var(--dim)", marginTop: 3 }}>
                  {c.aggregate ? "Of " + c.aggregate + " in the simulated marketplace" : "Every record in the demo"}
                </div>
              </div>
              <div style={{ position: "relative", width: 240, maxWidth: "100%" }}>
                <span style={{ position: "absolute", left: 12, top: 12, color: "var(--faint)", pointerEvents: "none" }}><Icon name="search" size={15} /></span>
                <TextInput value={q} onChange={e => setQ(e.target.value)} placeholder={"Search " + meta.label.toLowerCase()} style={{ paddingLeft: 36 }} />
              </div>
            </div>
          </Card>
          <div key={entity} className="rc-fade">{table}</div>
        </div>

        <Card title="The data model" sub="Core entities and how they relate. Counts are sample records.">
          <Label>Entities</Label>
          <div className="rc-col" style={{ gap: 2, marginTop: 8 }}>
            {ORDER.map(id => (
              <button key={id} onClick={() => { setEntity(id); setQ(""); }} className="rc-rowhover rc-focus"
                style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 8px", margin: "0 -8px", border: 0, borderRadius: 10, cursor: "pointer", textAlign: "left",
                  background: entity === id ? "var(--accent-soft)" : "transparent", color: "inherit" }}>
                <Icon name={ENTITY_META[id].icon} size={14} color={entity === id ? "var(--accent)" : "var(--dim)"} />
                <span className="rc-grow" style={{ fontSize: 12.5, color: entity === id ? "var(--ink)" : "var(--body)" }}>{ENTITY_META[id].singular}</span>
                <span style={{ fontSize: 11.5, color: "var(--faint)", fontVariantNumeric: "tabular-nums" }}>{num(counts[id].sample)}</span>
              </button>
            ))}
          </div>
          <Label style={{ marginTop: 16 }}>Relationships</Label>
          <div className="rc-col" style={{ gap: 7, marginTop: 10 }}>
            {rels.map(r => (
              <div key={r.sl + r.p + r.ol} className="rc-row" style={{ gap: 6, fontSize: 11.5, flexWrap: "wrap", rowGap: 4 }}>
                <EntityTag label={r.sl} onClick={r.s ? () => { setEntity(r.s as Entity); setQ(""); } : undefined} />
                <span style={{ fontFamily: "var(--mono)", fontSize: 9.5, letterSpacing: ".06em", padding: "2px 6px", borderRadius: 6, background: "var(--accent-faint)", border: "1px solid var(--accent-line)", color: "var(--accent)" }}>{r.p}</span>
                <Icon name="arrowRight" size={11} color="var(--faint)" />
                <EntityTag label={r.ol} onClick={r.o ? () => { setEntity(r.o as Entity); setQ(""); } : undefined} />
                <span style={{ marginLeft: "auto", color: "var(--faint)", fontVariantNumeric: "tabular-nums" }}>{num(r.n)}</span>
              </div>
            ))}
          </div>
          <Button full style={{ marginTop: 16 }} icon="graph" onClick={() => explore("candidate:c-aoife")}>Follow Aoife through the graph</Button>
        </Card>
      </Grid>
    </Page>
  );
}

function ExploreBtn({ onClick }: { onClick: () => void }) {
  return (
    <button title="Explore connections" aria-label="Explore connections" className="rc-btn rc-btn-ghost rc-focus"
      onClick={e => { e.stopPropagation(); onClick(); }}
      style={{ width: 28, height: 28, border: "1px solid var(--border)", borderRadius: 9, background: "var(--surface-2)", color: "var(--dim)", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", padding: 0 }}>
      <Icon name="graph" size={13} />
    </button>
  );
}

function Person({ name, sub, initials, tint, square }: { name: string; sub: string; initials: string; tint?: string; square?: boolean }) {
  return (
    <span className="rc-row" style={{ gap: 10 }}>
      <Avatar initials={initials} tint={tint} size={28} square={square} />
      <span className="rc-grow">
        <span className="rc-ellipsis" style={{ display: "block", fontSize: 13, fontWeight: 500, color: "var(--ink)" }}>{name}</span>
        <span className="rc-ellipsis" style={{ display: "block", fontSize: 11.5, color: "var(--dim)", marginTop: 2 }}>{sub}</span>
      </span>
    </span>
  );
}

function EntityTag({ label, onClick }: { label: string; onClick?: () => void }) {
  return (
    <span onClick={onClick} className={onClick ? "rc-chip-btn" : undefined}
      style={{ padding: "2px 7px", borderRadius: 6, background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--body)", whiteSpace: "nowrap" }}>{label}</span>
  );
}

function NoMatch() {
  return <div style={{ padding: "28px 20px", textAlign: "center", fontSize: 13, color: "var(--dim)" }}>No records match that search.</div>;
}
