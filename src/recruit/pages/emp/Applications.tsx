import { useState } from "react";
import { Badge, Button, Card, Chip, Empty, Grid, Note, Page, Segmented, Stat, Table, type Col } from "../../ui";
import { useNav } from "../../nav";
import { openDrawer, pipelineFor, update, useRecruit, vacancyById, type RecruitState } from "../../store";
import { candidate, employerVacancies } from "../../selectors";
import { APPLICATIONS, type Application, type PipelineEntry, type Vacancy } from "../../data";
import { alignmentTone, matchScore } from "../../match";
import { num, plural } from "../../format";
import { PersonAvatar, STAGE_LABEL, ShortlistButton, StagePill, identity, noticeText, stageRank, toneVar } from "../../shared/talentKit";

/* Applications to Harbourview's roles. Seeded applications and any made live
   in the candidate portal (Aoife applying, for example) appear together;
   opening one marks it reviewed, which the candidate sees in their own
   Applications view. */

type StatusFilter = "all" | Application["status"];
interface Row { key: string; appId?: string; candidateId: string; vacancyId: string; status: Application["status"]; date: string; note?: string; live: boolean; entry?: PipelineEntry; score: number }

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const dateKey = (d: string) => {
  if (/today|just now/i.test(d)) return 100000;
  if (/yesterday/i.test(d)) return 99999;
  const m = d.match(/(\d{1,2}) ([A-Z][a-z]{2})/);
  return m ? MONTHS.indexOf(m[2]) * 40 + Number(m[1]) : 0;
};
const STATUS_META: Record<Application["status"], { label: string; tone: "accent" | "ok" | "warn" | "neutral" | "teal" }> = {
  submitted: { label: "Awaiting review", tone: "warn" },
  viewed: { label: "Reviewed", tone: "neutral" },
  interview: { label: "Interview", tone: "accent" },
  offer: { label: "Offer", tone: "teal" },
  unsuccessful: { label: "Closed", tone: "neutral" },
  withdrawn: { label: "Withdrawn", tone: "neutral" },
};

function buildRows(s: RecruitState, vacs: Vacancy[]): Row[] {
  const ids = new Set(vacs.map(v => v.id));
  const seeded = new Set(APPLICATIONS.map(a => a.id));
  const rows: Row[] = s.applications.filter(a => ids.has(a.vacancyId)).map(a => {
    const v = vacancyById(a.vacancyId, s)!;
    return { key: a.id, appId: a.id, candidateId: a.candidateId, vacancyId: a.vacancyId, status: a.status, date: seeded.has(a.id) ? a.date : "Today", note: a.note,
      live: !seeded.has(a.id), entry: pipelineFor(a.vacancyId, a.candidateId, s), score: matchScore(candidate(s, a.candidateId), v).score };
  });
  /* Applied pipeline entries without an application record still count. */
  s.pipeline.filter(p => p.source === "applied" && ids.has(p.vacancyId) && !rows.some(r => r.candidateId === p.candidateId && r.vacancyId === p.vacancyId)).forEach(p => {
    const v = vacancyById(p.vacancyId, s)!;
    rows.push({ key: p.id, candidateId: p.candidateId, vacancyId: p.vacancyId, status: p.stage === "interview" ? "interview" : p.stage === "offer" ? "offer" : p.stage === "identified" ? "submitted" : "viewed",
      date: p.updated, note: p.note, live: false, entry: p, score: matchScore(candidate(s, p.candidateId), v).score });
  });
  return rows;
}

export default function Applications() {
  const s = useRecruit();
  const nav = useNav();
  const employerId = s.employerId;
  const vacs = employerVacancies(s, employerId);
  const [roleId, setRoleId] = useState("all");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [sort, setSort] = useState<"newest" | "alignment">("newest");

  const all = buildRows(s, vacs);
  const scoped = all.filter(r => roleId === "all" || r.vacancyId === roleId);
  const rows = scoped.filter(r => status === "all" || r.status === status)
    .sort((a, b) => sort === "alignment" ? b.score - a.score : dateKey(b.date) - dateKey(a.date) || b.score - a.score);

  const received = vacs.reduce((t, v) => t + v.applicants, 0) + all.filter(r => r.live).length;
  const awaiting = all.filter(r => r.status === "submitted").length;
  const progressed = all.filter(r => r.entry && stageRank(r.entry.stage) >= stageRank("shortlisted")).length;
  const interviewing = all.filter(r => r.status === "interview" || r.entry?.stage === "interview").length;

  const review = (r: Row) => {
    if (r.appId && r.status === "submitted") update(st => ({ applications: st.applications.map(a => (a.id === r.appId ? { ...a, status: "viewed" as const } : a)) }));
    openDrawer("candidate", r.candidateId, { vacancyId: r.vacancyId });
  };

  const cols: Col<Row>[] = [
    { key: "who", label: "Professional", width: "minmax(0, 2.1fr)", render: r => {
      const c = candidate(s, r.candidateId);
      const who = identity(s, employerId, c);
      return (
        <div className="rc-row" style={{ gap: 11 }}>
          <PersonAvatar c={c} anon={who.anon} size={34} />
          <div className="rc-grow">
            <div className="rc-row" style={{ gap: 7 }}>
              <span className="rc-ellipsis" style={{ fontSize: 13.5, fontWeight: 500, color: "var(--ink)" }}>{who.name}</span>
              {r.live && <Badge tone="accent">New</Badge>}
            </div>
            <div className="rc-ellipsis" style={{ fontSize: 12, color: "var(--dim)", marginTop: 2 }}>{c.title}. {noticeText(c.noticeWeeks)}</div>
          </div>
        </div>
      );
    } },
    { key: "role", label: "Role", width: "minmax(0, 1.5fr)", render: r => {
      const v = vacancyById(r.vacancyId, s);
      return (
        <div style={{ minWidth: 0 }}>
          <div className="rc-ellipsis" style={{ fontSize: 13, color: "var(--ink)" }}>{v?.title}</div>
          <div className="rc-ellipsis" style={{ fontSize: 11.5, color: "var(--faint)", marginTop: 2 }}>Applied {r.date === "Today" ? "today" : r.date}{r.note ? ". " + r.note : ""}</div>
        </div>
      );
    } },
    { key: "status", label: "Status", width: "minmax(0, 1.3fr)", render: r => (
      <div className="rc-col" style={{ gap: 5, alignItems: "flex-start" }}>
        <Badge tone={STATUS_META[r.status].tone} dot>{STATUS_META[r.status].label}</Badge>
        <span style={{ fontSize: 11.5, color: "var(--faint)" }}>{r.entry ? "Pipeline: " + STAGE_LABEL[r.entry.stage].toLowerCase() : "Not in a pipeline"}</span>
      </div>
    ) },
    { key: "align", label: "Alignment", width: "92px", align: "right", render: r => (
      <span style={{ fontSize: 15, fontWeight: 600, color: toneVar(alignmentTone(r.score)), fontVariantNumeric: "tabular-nums" }}>{r.score}%</span>
    ) },
    { key: "act", label: "", width: "236px", align: "right", render: r => (
      <div className="rc-row" style={{ gap: 6, justifyContent: "flex-end" }} onClick={e => e.stopPropagation()}>
        <Button size="sm" variant="ghost" onClick={() => review(r)}>{r.status === "submitted" ? "Review" : "Profile"}</Button>
        {r.status === "withdrawn" ? <Badge tone="neutral">Withdrawn</Badge>
          : r.entry && stageRank(r.entry.stage) >= stageRank("shortlisted") ? <StagePill stage={r.entry.stage} />
          : <ShortlistButton s={s} vacancyId={r.vacancyId} candidateId={r.candidateId} />}
      </div>
    ) },
  ];

  const statusOptions: { id: StatusFilter; label: string }[] = [
    { id: "all", label: "All" }, { id: "submitted", label: "Awaiting review" }, { id: "viewed", label: "Reviewed" }, { id: "interview", label: "Interview" }, { id: "offer", label: "Offer" }, { id: "withdrawn", label: "Withdrawn" },
  ];

  return (
    <Page wide eyebrow="VACANCIES" title="Applications"
      sub={num(received) + " applications received across " + plural(vacs.filter(v => v.status === "open").length, "open role") + ". Sample records are listed here; alignment is decision support, never a screen."}
      actions={<>
        <Button icon="vacancies" onClick={() => nav.go("emp.vacancies", "active")}>Active roles</Button>
        <Button variant="primary" icon="search" onClick={() => nav.go("emp.talent", "discover")}>Discover talent</Button>
      </>}>

      <Grid cols="rc-g4">
        <Stat icon="file" label="Applications received" value={num(received)} sub="All roles, aggregate" />
        <Stat icon="clock" label="Awaiting review" value={num(awaiting)} sub={awaiting ? "Opening one marks it reviewed" : "All reviewed"} tone={awaiting ? "warn" : undefined} onClick={() => setStatus(status === "submitted" ? "all" : "submitted")} />
        <Stat icon="check" label="Shortlisted or later" value={num(progressed)} sub="From these applications" />
        <Stat icon="calendar" label="Interviewing" value={num(interviewing)} sub="Applied, now interviewing" onClick={() => setStatus(status === "interview" ? "all" : "interview")} />
      </Grid>

      <Grid cols="rc-g-side-r" gap={16}>
        <div className="rc-col" style={{ gap: 12, minWidth: 0 }}>
          <div className="rc-row rc-wrap" style={{ gap: 8 }}>
            {statusOptions.map(o => {
              const n = o.id === "all" ? scoped.length : scoped.filter(r => r.status === o.id).length;
              return <Chip key={o.id} active={status === o.id} onClick={() => setStatus(o.id)} style={!n && o.id !== "all" ? { opacity: 0.55 } : undefined}>{o.label} <span style={{ fontSize: 10.5, color: "var(--faint)" }}>{n}</span></Chip>;
            })}
            <span className="rc-grow" />
            <Segmented size="sm" value={sort} onChange={setSort} options={[{ id: "newest", label: "Newest" }, { id: "alignment", label: "Alignment" }]} />
          </div>
          <Table cols={cols} rows={rows} onRow={review}
            empty={<Empty icon="file" title={all.length ? "No applications match" : "No applications yet"} body={all.length ? "Try another status or role." : "When professionals apply through Recruit they appear here, with their alignment to the role."} />}
            caption={rows.length + " of " + all.length + " sample applications shown. Anonymous professionals stay anonymous until they accept an introduction."} />
        </div>

        <div className="rc-col" style={{ gap: 14 }}>
          <Card title="By role" sub="Click a role to filter" action={roleId !== "all" ? <Button size="sm" variant="ghost" onClick={() => setRoleId("all")}>All roles</Button> : undefined}>
            {vacs.map((v, i) => {
              const mine = all.filter(r => r.vacancyId === v.id);
              const on = roleId === v.id;
              return (
                <div key={v.id} onClick={() => setRoleId(on ? "all" : v.id)} className="rc-rowhover"
                  style={{ padding: "11px 10px", margin: "0 -10px", borderRadius: 12, borderTop: i ? "1px solid var(--border)" : 0, background: on ? "var(--accent-faint)" : undefined }}>
                  <div className="rc-row" style={{ gap: 8 }}>
                    <span className="rc-grow rc-ellipsis" style={{ fontSize: 13, fontWeight: 500, color: on ? "var(--accent)" : "var(--ink)" }}>{v.title}</span>
                    <span style={{ fontSize: 14, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{num(v.applicants + mine.filter(r => r.live).length)}</span>
                  </div>
                  <div style={{ fontSize: 11.5, color: "var(--faint)", marginTop: 3 }}>
                    {mine.length} sample {mine.length === 1 ? "record" : "records"}, {mine.filter(r => r.status === "submitted").length} awaiting review{v.status !== "open" ? ". Role " + v.status : ""}
                  </div>
                </div>
              );
            })}
          </Card>
          <Note icon="link">Applications come from the candidate portal. Reviewing or shortlisting here updates the status the professional sees in their own Applications view.</Note>
        </div>
      </Grid>
    </Page>
  );
}
