import { useMemo, useState } from "react";
import { Avatar, Badge, Button, Card, Empty, Grid, Page, Progress, Segmented, Select, Stat, Table, TextInput, type Col } from "../../ui";
import { Icon } from "../../icons";
import { useNav } from "../../nav";
import { openDrawer, useRecruit } from "../../store";
import { candidate } from "../../selectors";
import { CANDIDATES, MARKET, STAGES, STAGE_ORDER } from "../../data";
import type { Candidate } from "../../data/types";
import { num } from "../../format";

/* Recruit HQ, Talent database: every sample professional record, with the
   candidate's own edits applied, so HQ sees the same people the candidate and
   employer portals show. HQ is the operator and sees real names; the
   visibility column says what employers see. */

type Tone = "accent" | "ok" | "warn" | "bad" | "neutral" | "teal";
type SortKey = "index" | "name" | "complete" | "years";

const BANDS: { id: string; label: string; test: (n: number) => boolean }[] = [
  { id: "all", label: "Any Recruit Index", test: () => true },
  { id: "900", label: "900 and above", test: n => n >= 900 },
  { id: "850", label: "850 to 899", test: n => n >= 850 && n < 900 },
  { id: "800", label: "800 to 849", test: n => n >= 800 && n < 850 },
  { id: "750", label: "750 to 799", test: n => n >= 750 && n < 800 },
  { id: "low", label: "Below 750", test: n => n < 750 },
];

const AVAIL_TONE: Record<Candidate["availability"], Tone> = { "Actively looking": "ok", "Open to offers": "accent", Passive: "neutral", "Not looking": "neutral" };
const VIS: Record<Candidate["visibility"], { label: string; tone: Tone; icon: string }> = {
  discoverable: { label: "Discoverable", tone: "teal", icon: "eye" },
  anonymous: { label: "Anonymous", tone: "accent", icon: "eyeOff" },
  hidden: { label: "Hidden", tone: "neutral", icon: "lock" },
};
const STAGE_LABEL = Object.fromEntries(STAGES.map(st => [st.id, st.label])) as Record<string, string>;
const uniq = (list: string[]) => Array.from(new Set(list)).sort();

export default function TalentCandidates() {
  const s = useRecruit();
  const nav = useNav();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [vis, setVis] = useState("all");
  const [avail, setAvail] = useState("all");
  const [region, setRegion] = useState("all");
  const [band, setBand] = useState("all");
  const [sector, setSector] = useState("all");
  const [sort, setSort] = useState<SortKey>("index");

  const all = useMemo(() => CANDIDATES.map(c => candidate(s, c.id)), [s]);
  const regions = useMemo(() => uniq(all.map(c => c.region)), [all]);
  const sectors = useMemo(() => uniq(all.map(c => c.sector)), [all]);

  const pipelineOf = (id: string) => s.pipeline.filter(p => p.candidateId === id);
  const liveOffers = (id: string) => s.offers.filter(o => o.candidateId === id && o.visibleToCandidate && !["declined", "withdrawn"].includes(o.status));

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const bandTest = (BANDS.find(b => b.id === band) || BANDS[0]).test;
    const list = all.filter(c => {
      if (status !== "all" && c.status !== status) return false;
      if (vis !== "all" && c.visibility !== vis) return false;
      if (avail !== "all" && c.availability !== avail) return false;
      if (region !== "all" && c.region !== region) return false;
      if (sector !== "all" && c.sector !== sector) return false;
      if (!bandTest(c.recruitIndex)) return false;
      if (needle) {
        const hay = [c.name, c.title, c.location, c.currentOrg, c.sector, ...c.skills.map(k => k.name)].join(" ").toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      return true;
    });
    const by: Record<SortKey, (a: Candidate, b: Candidate) => number> = {
      index: (a, b) => b.recruitIndex - a.recruitIndex,
      name: (a, b) => a.name.localeCompare(b.name),
      complete: (a, b) => b.completeness - a.completeness,
      years: (a, b) => b.years - a.years,
    };
    return list.slice().sort(by[sort]);
  }, [all, q, status, vis, avail, region, sector, band, sort]);

  const filtered = q || [status, vis, avail, region, sector, band].some(v => v !== "all");
  const reset = () => { setQ(""); setStatus("all"); setVis("all"); setAvail("all"); setRegion("all"); setSector("all"); setBand("all"); };
  const avgIndex = rows.length ? Math.round(rows.reduce((t, c) => t + c.recruitIndex, 0) / rows.length) : 0;
  const active = rows.filter(c => c.availability === "Actively looking").length;
  const open = rows.filter(c => c.availability === "Open to offers").length;
  const inPipeline = rows.filter(c => pipelineOf(c.id).length > 0);
  const withOffers = rows.filter(c => liveOffers(c.id).length > 0).length;

  const cols: Col<Candidate>[] = [
    { key: "name", label: "Professional", width: "minmax(220px, 2fr)", render: c => {
      const entries = pipelineOf(c.id);
      const far = entries.reduce((best, p) => Math.max(best, STAGE_ORDER.indexOf(p.stage)), -1);
      const line = c.status === "placed" ? "Placed with " + c.currentOrg
        : entries.length ? entries.length + (entries.length === 1 ? " pipeline" : " pipelines") + ", furthest: " + STAGE_LABEL[STAGE_ORDER[far]].toLowerCase()
        : c.currentOrg;
      return (
        <div className="rc-row" style={{ gap: 10 }}>
          <Avatar initials={c.initials} tint={c.tint} size={30} />
          <div className="rc-grow">
            <div className="rc-ellipsis" style={{ fontWeight: 500, color: "var(--ink)" }}>{c.name}</div>
            <div className="rc-ellipsis" style={{ fontSize: 11.5, color: entries.length && c.status !== "placed" ? "var(--accent)" : "var(--faint)", marginTop: 2 }}>{line}</div>
          </div>
        </div>
      );
    } },
    { key: "title", label: "Title", width: "minmax(170px, 1.5fr)", render: c => <span className="rc-ellipsis" style={{ display: "block" }}>{c.title}</span> },
    { key: "loc", label: "Location", width: "minmax(120px, 1fr)", render: c => <span className="rc-ellipsis" style={{ display: "block", color: "var(--dim)" }}>{c.location}</span> },
    { key: "years", label: "Years", width: "62px", align: "right", render: c => <span style={{ fontVariantNumeric: "tabular-nums" }}>{c.years}</span> },
    { key: "idx", label: "Recruit Index", width: "118px", render: c => (
      <div>
        <div style={{ fontWeight: 600, color: "var(--ink)", fontVariantNumeric: "tabular-nums" }}>{c.recruitIndex}</div>
        <Progress value={c.recruitIndex} max={1000} height={4} style={{ marginTop: 5, width: 72 }} />
      </div>
    ) },
    { key: "avail", label: "Availability", width: "minmax(150px, 1.1fr)", render: c => (
      <div>
        <Badge tone={AVAIL_TONE[c.availability]}>{c.availability}</Badge>
        <div style={{ fontSize: 11, color: "var(--faint)", marginTop: 4 }}>{c.status === "placed" ? "Started new role" : c.noticeWeeks + " weeks' notice"}</div>
      </div>
    ) },
    { key: "vis", label: "Visibility", width: "128px", render: c => <Badge tone={VIS[c.visibility].tone} icon={VIS[c.visibility].icon}>{VIS[c.visibility].label}</Badge> },
    { key: "cred", label: "Verified", width: "86px", align: "right", render: c => (
      <span className="rc-row" style={{ gap: 5, justifyContent: "flex-end", color: "var(--ink)" }}><Icon name="verified" size={13} color="var(--teal, var(--ok))" />{c.verifiedCredentials}</span>
    ) },
    { key: "comp", label: "Complete", width: "112px", render: c => (
      <div>
        <div style={{ fontVariantNumeric: "tabular-nums", color: "var(--ink)" }}>{c.completeness}%</div>
        <Progress value={c.completeness} tone={c.completeness >= 80 ? "teal" : "warn"} height={4} style={{ marginTop: 5, width: 64 }} />
      </div>
    ) },
  ];

  return (
    <Page wide eyebrow="RECRUIT HQ · TALENT" title="Talent database"
      sub={"The " + all.length + " sample profiles behind " + num(MARKET.registeredProfessionals) + " registered professionals. Open anyone to see their full record, pipelines and offers."}
      actions={<>
        <Button icon="verified" onClick={() => nav.setTab("verification")}>Verification queue</Button>
        <Button icon="chart" onClick={() => nav.setTab("overview")}>Marketplace totals</Button>
      </>}>

      <Grid cols="rc-g4">
        <Stat icon="talent" tone="accent" label="Sample profiles shown" value={rows.length + " of " + all.length} sub={num(MARKET.registeredProfessionals) + " registered in the scenario"} />
        <Stat icon="target" label="Average Recruit Index" value={rows.length ? String(avgIndex) : "None"} sub="evidence-based, out of 1,000" />
        <Stat icon="trendUp" tone="ok" label="Actively looking" value={String(active)} sub={open + " more open to offers"} />
        <Stat icon="hiring" tone="teal" label="In a live pipeline" value={String(inPipeline.length)} sub={withOffers + (withOffers === 1 ? " holds an offer" : " hold offers")} onClick={() => nav.go("hq.roles", "pipelines")} />
      </Grid>

      <Card pad={16}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(168px, 1fr))", gap: 10 }}>
          <div style={{ position: "relative", gridColumn: "span 2", minWidth: 0 }}>
            <span style={{ position: "absolute", left: 13, top: 0, bottom: 0, display: "flex", alignItems: "center", color: "var(--faint)", pointerEvents: "none" }}><Icon name="search" size={14} /></span>
            <TextInput value={q} onChange={e => setQ(e.target.value)} placeholder="Search name, title, employer or skill" style={{ paddingLeft: 36 }} />
          </div>
          <Select value={status} onChange={setStatus} options={[{ value: "all", label: "Any status" }, { value: "active", label: "Active" }, { value: "placed", label: "Placed" }]} />
          <Select value={vis} onChange={setVis} options={[{ value: "all", label: "Any visibility" }, { value: "discoverable", label: "Discoverable" }, { value: "anonymous", label: "Anonymous" }, { value: "hidden", label: "Hidden" }]} />
          <Select value={avail} onChange={setAvail} options={[{ value: "all", label: "Any availability" }, "Actively looking", "Open to offers", "Passive", "Not looking"]} />
          <Select value={region} onChange={setRegion} options={[{ value: "all", label: "Any region" }, ...regions]} />
          <Select value={band} onChange={setBand} options={BANDS.map(b => ({ value: b.id, label: b.label }))} />
          <Select value={sector} onChange={setSector} options={[{ value: "all", label: "Any sector" }, ...sectors]} />
        </div>
        <div className="rc-row rc-wrap" style={{ gap: 10, marginTop: 12 }}>
          <span style={{ fontSize: 12, color: "var(--faint)" }}>Sort by</span>
          <Segmented size="sm" value={sort} onChange={setSort}
            options={[{ id: "index", label: "Recruit Index" }, { id: "complete", label: "Completeness" }, { id: "years", label: "Experience" }, { id: "name", label: "Name" }]} />
          <span className="rc-grow" />
          {filtered && <Button size="sm" variant="ghost" icon="x" onClick={reset}>Clear filters</Button>}
        </div>
      </Card>

      <Table cols={cols} rows={rows} onRow={c => openDrawer("candidate", c.id, { from: "hq" })}
        empty={<Empty icon="search" title="No sample profiles match" body="Loosen a filter or clear the search to see the full sample." action={<Button size="sm" onClick={reset}>Clear filters</Button>} />}
        caption={"Showing " + rows.length + " sample profiles of " + num(MARKET.registeredProfessionals) + " (illustrative). The Recruit Index is evidence-based decision support: not a credit score, not a judgement of a person, and it never rejects anyone."} />
    </Page>
  );
}
