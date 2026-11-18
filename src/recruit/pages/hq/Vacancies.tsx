import { useMemo, useState } from "react";
import { Avatar, Badge, Button, Card, Checkbox, Empty, Grid, Page, Segmented, Select, Stat, Table, TextInput, type Col } from "../../ui";
import { SERIES_COLORS, StackBar } from "../../charts";
import { Icon } from "../../icons";
import { useNav } from "../../nav";
import { allVacancies, openDrawer, useRecruit } from "../../store";
import { EMPLOYERS, EMPLOYER_BY_ID, MARKET, RECRUIT_AGENTS, STAGES, STAGE_ORDER } from "../../data";
import type { PipelineEntry, Stage, Vacancy } from "../../data/types";
import { eurK, num, plural } from "../../format";

/* Recruit HQ, Vacancies: every role on the marketplace sample, including
   vacancies employers create during the demo. Exceptions follow the Ops
   Watchdog rule: an open role older than 21 days without a shortlisted
   candidate. */

type Tone = "accent" | "ok" | "warn" | "bad" | "neutral" | "teal";
type StatusView = "open" | "filled" | "other" | "all";
interface Flag { tone: "bad" | "warn"; text: string }
interface VRow { v: Vacancy; entries: PipelineEntry[]; counts: number[]; flag: Flag | null }

const PAST_SHORTLIST: Stage[] = ["shortlisted", "contact", "interview", "offer", "hired"];
const STATUS_TONE: Record<Vacancy["status"], Tone> = { open: "accent", paused: "warn", filled: "ok", draft: "neutral" };
const STAGE_COLORS = ["var(--faint)", SERIES_COLORS[5], SERIES_COLORS[3], SERIES_COLORS[0], SERIES_COLORS[2], SERIES_COLORS[1]];
const STAGE_LABEL = Object.fromEntries(STAGES.map(st => [st.id, st.label])) as Record<string, string>;
const cap = (x: string) => x.charAt(0).toUpperCase() + x.slice(1);

/** Exception rule: open more than 21 days with nobody shortlisted. A softer watch flag from 15 days. */
function flagFor(v: Vacancy, entries: PipelineEntry[]): Flag | null {
  if (v.status !== "open" || entries.some(p => PAST_SHORTLIST.includes(p.stage))) return null;
  if (v.postedDays > 21) return { tone: "bad", text: v.postedDays + " days open, no shortlist" };
  if (v.postedDays > 14) return { tone: "warn", text: v.postedDays + " days, no shortlist yet" };
  return null;
}

export default function Vacancies() {
  const s = useRecruit();
  const nav = useNav();
  const [view, setView] = useState<StatusView>("open");
  const [q, setQ] = useState("");
  const [emp, setEmp] = useState("all");
  const [seniority, setSeniority] = useState("all");
  const [region, setRegion] = useState("all");
  const [onlyFlags, setOnlyFlags] = useState(false);

  const all: VRow[] = useMemo(() => allVacancies(s).map(v => {
    const entries = s.pipeline.filter(p => p.vacancyId === v.id);
    return { v, entries, counts: STAGE_ORDER.map(st => entries.filter(p => p.stage === st).length), flag: flagFor(v, entries) };
  }), [s]);

  const inView = (r: VRow, w: StatusView) =>
    w === "all" ? true : w === "open" ? r.v.status === "open" : w === "filled" ? r.v.status === "filled" : r.v.status === "paused" || r.v.status === "draft";
  const regions = Array.from(new Set(all.map(r => r.v.region))).sort();
  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const rank = (r: VRow) => (r.flag?.tone === "bad" ? 0 : r.flag ? 1 : 2);
    return all.filter(r => {
      if (!inView(r, view)) return false;
      if (emp !== "all" && r.v.employerId !== emp) return false;
      if (seniority !== "all" && r.v.seniority !== seniority) return false;
      if (region !== "all" && r.v.region !== region) return false;
      if (onlyFlags && !r.flag) return false;
      if (needle && ![r.v.title, r.v.department, r.v.location, EMPLOYER_BY_ID[r.v.employerId]?.name || ""].join(" ").toLowerCase().includes(needle)) return false;
      return true;
    }).sort((a, b) => rank(a) - rank(b) || Number(!!b.v.created) - Number(!!a.v.created) || b.v.postedDays - a.v.postedDays);
  }, [all, view, q, emp, seniority, region, onlyFlags]);

  const open = all.filter(r => r.v.status === "open");
  const flagged = all.filter(r => r.flag).sort((a, b) => (a.flag?.tone === "bad" ? 0 : 1) - (b.flag?.tone === "bad" ? 0 : 1) || b.v.postedDays - a.v.postedDays);
  const ages = open.map(r => r.v.postedDays).sort((a, b) => a - b);
  const median = ages.length ? (ages.length % 2 ? ages[(ages.length - 1) / 2] : Math.round((ages[ages.length / 2 - 1] + ages[ages.length / 2]) / 2)) : 0;
  const matches = open.reduce((t, r) => t + r.v.marketMatches, 0);
  const created = all.filter(r => r.v.created).length;
  const watchdog = RECRUIT_AGENTS.find(a => a.id === "ops");
  const filtered = q || emp !== "all" || seniority !== "all" || region !== "all" || onlyFlags;
  const reset = () => { setQ(""); setEmp("all"); setSeniority("all"); setRegion("all"); setOnlyFlags(false); };

  const cols: Col<VRow>[] = [
    { key: "role", label: "Role", width: "minmax(230px, 2fr)", render: r => (
      <div style={{ minWidth: 0 }}>
        <div className="rc-row" style={{ gap: 7 }}>
          <span className="rc-ellipsis" style={{ fontWeight: 500, color: "var(--ink)" }}>{r.v.title}</span>
          {r.v.created && <Badge tone="teal">New in demo</Badge>}
        </div>
        <div className="rc-ellipsis" style={{ fontSize: 11.5, color: "var(--faint)", marginTop: 2 }}>
          {r.v.department}, {r.v.location}{r.v.seniority !== r.v.department ? " · " + r.v.seniority : ""}
        </div>
      </div>
    ) },
    { key: "emp", label: "Employer", width: "minmax(160px, 1.2fr)", render: r => {
      const e = EMPLOYER_BY_ID[r.v.employerId];
      return (
        <div className="rc-row" style={{ gap: 8 }}>
          <Avatar initials={e?.initials || "?"} tint={e?.tint} size={24} square />
          <button className="rc-link rc-ellipsis" style={{ textAlign: "left", fontSize: 12.5 }} onClick={ev => { ev.stopPropagation(); openDrawer("employer", r.v.employerId); }}>{e?.short || "Employer"}</button>
        </div>
      );
    } },
    { key: "sal", label: "Salary", width: "112px", render: r => <span style={{ fontVariantNumeric: "tabular-nums" }}>{eurK(r.v.salary[0])}-{eurK(r.v.salary[1]).slice(1)}</span> },
    { key: "age", label: "Age", width: "70px", align: "right", render: r => (
      <span style={{ fontVariantNumeric: "tabular-nums", color: r.flag?.tone === "bad" ? "var(--bad)" : r.flag ? "var(--warn)" : "var(--body)" }}>{r.v.postedDays}d</span>
    ) },
    { key: "match", label: "Matches", width: "84px", align: "right", render: r => r.v.status === "open"
      ? <span style={{ fontVariantNumeric: "tabular-nums", color: "var(--ink)" }}>{r.v.marketMatches}</span>
      : <span style={{ color: "var(--faint)", fontSize: 12 }}>closed</span> },
    { key: "pipe", label: "Pipeline (sample)", width: "minmax(170px, 1.3fr)", render: r => r.entries.length ? (
      <div>
        <StackBar parts={STAGES.map((st, i) => ({ label: st.label, value: r.counts[i], color: STAGE_COLORS[i] }))} height={7} />
        <div className="rc-ellipsis" style={{ fontSize: 11, color: "var(--faint)", marginTop: 5 }}>
          {r.entries.length} in pipeline, furthest: {STAGE_LABEL[STAGE_ORDER[Math.max(...r.entries.map(p => STAGE_ORDER.indexOf(p.stage)))]].toLowerCase()}
        </div>
      </div>
    ) : <span style={{ fontSize: 12, color: r.v.status === "open" ? "var(--warn)" : "var(--faint)" }}>{r.v.status === "open" ? "Nobody yet" : "Placed through Recruit"}</span> },
    { key: "status", label: "Status", width: "minmax(150px, 1.1fr)", render: r => (
      <div>
        <Badge tone={STATUS_TONE[r.v.status]}>{cap(r.v.status)}</Badge>
        {r.flag && <div className="rc-row" style={{ gap: 5, fontSize: 11, color: r.flag.tone === "bad" ? "var(--bad)" : "var(--warn)", marginTop: 5 }}><Icon name="alert" size={11} />{r.flag.text}</div>}
      </div>
    ) },
  ];

  return (
    <Page wide eyebrow="RECRUIT HQ · ROLES AND PLACEMENTS" title="Every vacancy on the marketplace"
      sub={"The sample behind " + num(MARKET.openVacancies) + " open vacancies, including roles employers create in this demo. Market matches are marketplace aggregates; pipelines are sample records."}
      actions={<>
        <Button icon="hiring" onClick={() => nav.setTab("pipelines")}>Pipelines</Button>
        <Button variant="primary" icon="employer" onClick={() => nav.go("hq.employers", "accounts")}>Employer accounts</Button>
      </>}>

      <Grid cols="rc-g4">
        <Stat icon="vacancies" tone="accent" label="Open roles (sample)" value={open.length + " of " + num(MARKET.openVacancies)} sub={created ? created + " created live in this demo" : "marketplace open vacancies"} onClick={() => setView("open")} />
        <Stat icon="alert" tone={flagged.some(r => r.flag?.tone === "bad") ? "bad" : "warn"} label="Exceptions" value={String(flagged.length)}
          sub={flagged.filter(r => r.flag?.tone === "bad").length + " past 21 days without a shortlist"} onClick={() => { setView("open"); setOnlyFlags(true); }} />
        <Stat icon="clock" label="Median age, open roles" value={median + " days"} sub={"oldest " + (ages[ages.length - 1] || 0) + " days"} />
        <Stat icon="users" tone="teal" label="Market matches" value={num(matches)} sub={"across open roles, " + (open.length ? Math.round(matches / open.length) : 0) + " per role"} />
      </Grid>

      {flagged.length > 0 && (
        <Card tone="bad" title="Exceptions" sub={"Open roles with nobody shortlisted. " + (watchdog ? watchdog.name + " checks " + watchdog.schedule.toLowerCase() + ", last run " + watchdog.lastRun + "." : "")}>
          {flagged.map((r, i) => {
            const e = EMPLOYER_BY_ID[r.v.employerId];
            return (
              <div key={r.v.id} className="rc-row rc-wrap" style={{ gap: 12, padding: "11px 0", borderTop: i ? "1px solid var(--border)" : 0 }}>
                <span style={{ width: 30, height: 30, flex: "none", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center",
                  background: r.flag?.tone === "bad" ? "var(--bad-soft)" : "var(--warn-soft)", color: r.flag?.tone === "bad" ? "var(--bad)" : "var(--warn)" }}>
                  <Icon name="alert" size={14} />
                </span>
                <div className="rc-grow" style={{ minWidth: 220 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 500, color: "var(--ink)" }}>{r.v.title}, {e?.name}</div>
                  <div style={{ fontSize: 12, color: "var(--dim)", marginTop: 3 }}>
                    {r.flag?.text}. {r.v.marketMatches} market matches, {plural(r.v.applicants, "applicant")}, {r.entries.length ? r.entries.length + " identified in the sample" : "no sample pipeline yet"}.
                  </div>
                </div>
                <Badge tone={r.flag?.tone || "warn"}>{r.flag?.tone === "bad" ? "Exception" : "Watch"}</Badge>
                <Button size="sm" onClick={() => openDrawer("employer", r.v.employerId)}>Account</Button>
                <Button size="sm" variant="primary" iconRight="arrowRight" onClick={() => openDrawer("vacancy", r.v.id)}>Open role</Button>
              </div>
            );
          })}
        </Card>
      )}

      <Card pad={16}>
        <div className="rc-row rc-wrap" style={{ gap: 10, marginBottom: 12 }}>
          <Segmented size="sm" value={view} onChange={setView} options={[
            { id: "open", label: "Open " + all.filter(r => inView(r, "open")).length },
            { id: "filled", label: "Filled " + all.filter(r => inView(r, "filled")).length },
            { id: "other", label: "Paused or draft " + all.filter(r => inView(r, "other")).length },
            { id: "all", label: "All " + all.length },
          ]} />
          <span className="rc-grow" />
          <Checkbox on={onlyFlags} onChange={setOnlyFlags} label="Exceptions only" />
          {filtered && <Button size="sm" variant="ghost" icon="x" onClick={reset}>Clear filters</Button>}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))", gap: 10 }}>
          <div style={{ position: "relative", gridColumn: "span 2", minWidth: 0 }}>
            <span style={{ position: "absolute", left: 13, top: 0, bottom: 0, display: "flex", alignItems: "center", color: "var(--faint)", pointerEvents: "none" }}><Icon name="search" size={14} /></span>
            <TextInput value={q} onChange={e => setQ(e.target.value)} placeholder="Search role, department, location or employer" style={{ paddingLeft: 36 }} />
          </div>
          <Select value={emp} onChange={setEmp} options={[{ value: "all", label: "All employers" }, ...EMPLOYERS.map(e => ({ value: e.id, label: e.name }))]} />
          <Select value={seniority} onChange={setSeniority} options={[{ value: "all", label: "Any seniority" }, "Executive", "Senior", "Manager", "Supervisor"]} />
          <Select value={region} onChange={setRegion} options={[{ value: "all", label: "Any region" }, ...regions]} />
        </div>
      </Card>

      <Table cols={cols} rows={rows} onRow={r => openDrawer("vacancy", r.v.id)}
        empty={<Empty icon="vacancies" title="No vacancies match" body="Change the status view or clear a filter." action={<Button size="sm" onClick={() => { reset(); setView("all"); }}>Show everything</Button>} />}
        caption={"Showing " + rows.length + " of " + all.length + " sample vacancies (" + open.length + " open of " + num(MARKET.openVacancies) + " on the marketplace, illustrative). Exceptions: open more than 21 days with nobody shortlisted."} />
    </Page>
  );
}
