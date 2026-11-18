import { useState } from "react";
import { Badge, Button, Card, DemoTag, Empty, Grid, Label, Note, Page, Segmented, Stat } from "../../ui";
import { Icon } from "../../icons";
import { useNav } from "../../nav";
import { openDrawer, setActiveVacancy, setVacancyStatus, useRecruit, type RecruitState } from "../../store";
import { employerVacancies } from "../../selectors";
import { STAGE_ORDER, type Vacancy } from "../../data";
import { alignmentTone } from "../../match";
import { num, plural } from "../../format";
import { PersonAvatar, STAGE_COLOR, STAGE_LABEL, SkillTag, identity, kRange, rankFor, stageCounts, toneVar } from "../../shared/talentKit";

/* Active roles: every Harbourview vacancy with its age, applicants, market
   depth and pipeline by stage. Status changes, "Find matching talent" and
   new roles from Create vacancy all flow through the shared store, so HQ
   and the candidate portal see the same roles. */

type Filter = "all" | "open" | "paused" | "filled";
const STATUS_ORDER: Record<Vacancy["status"], number> = { open: 0, paused: 1, draft: 2, filled: 3 };

export default function ActiveRoles() {
  const s = useRecruit();
  const nav = useNav();
  const employerId = s.employerId;
  const vacs = employerVacancies(s, employerId).slice().sort((a, b) =>
    STATUS_ORDER[a.status] - STATUS_ORDER[b.status] || Number(!!b.created) - Number(!!a.created) || a.postedDays - b.postedDays);
  const [filter, setFilter] = useState<Filter>("all");
  const count = (st: Filter) => (st === "all" ? vacs.length : vacs.filter(v => v.status === st).length);
  const list = filter === "all" ? vacs : vacs.filter(v => v.status === filter);
  const open = vacs.filter(v => v.status === "open");
  const pipelineOpen = s.pipeline.filter(p => open.some(v => v.id === p.vacancyId)).length;

  const findTalent = (v: Vacancy) => { setActiveVacancy(v.id); nav.go("emp.talent", "discover"); };

  return (
    <Page wide eyebrow="VACANCIES" title="Active roles"
      sub={plural(open.length, "role") + " open at Harbourview. Each one is matched against the marketplace as profiles change; status changes show up in HQ and for candidates straight away."}
      actions={<>
        <Button icon="file" onClick={() => nav.go("emp.vacancies", "applications")}>Applications</Button>
        <Button variant="primary" icon="plus" onClick={() => nav.go("emp.vacancies", "create")}>Create vacancy</Button>
      </>}>

      <Grid cols="rc-g4">
        <Stat icon="vacancies" label="Open roles" value={num(open.length)} sub={vacs.length - open.length ? (vacs.length - open.length) + " paused or filled" : "All roles live"} />
        <Stat icon="file" label="Applicants" value={num(open.reduce((t, v) => t + v.applicants, 0))} sub="Across open roles" onClick={() => nav.go("emp.vacancies", "applications")} />
        <Stat icon="hiring" label="In your pipelines" value={num(pipelineOpen)} sub="Identified to offer" onClick={() => nav.go("emp.hiring", "shortlists")} />
        <Stat icon="users" label="Potentially relevant" value={num(open.reduce((t, v) => t + v.marketMatches, 0))} sub="Simulated marketplace" tone="accent" onClick={() => nav.go("emp.talent", "discover")} />
      </Grid>

      <div className="rc-row rc-wrap" style={{ gap: 12 }}>
        <Segmented value={filter} onChange={setFilter}
          options={[{ id: "all", label: "All " + count("all") }, { id: "open", label: "Open " + count("open") }, { id: "paused", label: "Paused " + count("paused") }, { id: "filled", label: "Filled " + count("filled") }]} />
        <span style={{ fontSize: 12, color: "var(--faint)" }}>Market matches are aggregates from the simulated marketplace; sample profiles are a subset you can open.</span>
      </div>

      {list.map((v, i) => <RoleCard key={v.id} s={s} v={v} employerId={employerId} index={i} onFind={() => findTalent(v)} onPipeline={() => nav.go("emp.hiring", "shortlists")} />)}

      {!list.length && (
        <Card>
          <Empty icon="vacancies" title={filter === "all" ? "No roles yet" : "No " + filter + " roles"} body="Create a vacancy and Recruit matches it against the marketplace straight away."
            action={<Button variant="primary" icon="plus" onClick={() => nav.go("emp.vacancies", "create")}>Create vacancy</Button>} />
        </Card>
      )}

      <Note icon="info">Pausing a role keeps its pipeline and hides it from candidates' recommendations. Marking it filled closes it in every portal. You can reopen either at any time.</Note>
    </Page>
  );
}

function RoleCard({ s, v, employerId, index, onFind, onPipeline }: { s: RecruitState; v: Vacancy; employerId: string; index: number; onFind: () => void; onPipeline: () => void }) {
  const counts = stageCounts(s, v.id);
  const inPipe = STAGE_ORDER.reduce((t, st) => t + counts[st], 0);
  const top = v.status === "filled" ? [] : rankFor(s, employerId, v).slice(0, 3);
  const statusTone = v.status === "open" ? "ok" : v.status === "filled" ? "teal" : "neutral";
  const sample = rankFor(s, employerId, v).filter(x => x.m.score >= 60).length;
  return (
    <Card pad={0} className="rc-rise" style={{ animationDelay: Math.min(index, 6) * 40 + "ms", opacity: v.status === "filled" ? 0.86 : 1 }}>
      <div className="rc-row rc-wrap" style={{ gap: 14, padding: "20px 22px 16px", alignItems: "flex-start" }}>
        <div className="rc-grow" style={{ minWidth: 260 }}>
          <div className="rc-row rc-wrap" style={{ gap: 9 }}>
            <button className="rc-link" onClick={() => openDrawer("vacancy", v.id)} style={{ fontSize: 19, fontWeight: 600, letterSpacing: "-.4px", color: "var(--ink)", textAlign: "left" }}>{v.title}</button>
            <Badge tone={statusTone} dot>{v.status.charAt(0).toUpperCase() + v.status.slice(1)}</Badge>
            {v.created && <Badge tone="accent" icon="sparkle">Created in this demo</Badge>}
          </div>
          <div style={{ fontSize: 13, color: "var(--dim)", marginTop: 6, lineHeight: 1.5 }}>
            {v.department}, {v.location}. {v.type}. Budget {kRange(v.salary)}. Start: {v.start}.
          </div>
        </div>
        <div className="rc-col" style={{ gap: 6, alignItems: "flex-end" }}>
          <Label>Status</Label>
          <Segmented size="sm" value={v.status === "draft" ? "paused" : v.status}
            onChange={x => { if (x !== v.status) setVacancyStatus(v.id, x); }}
            options={[{ id: "open" as const, label: "Open" }, { id: "paused" as const, label: "Paused" }, { id: "filled" as const, label: "Filled" }]} />
        </div>
      </div>

      <div className="rc-grid rc-g4" style={{ gap: 12, padding: "0 22px 16px" }}>
        <Metric icon="clock" label="Vacancy age" value={v.postedDays === 0 ? "Today" : v.postedDays + (v.postedDays === 1 ? " day" : " days")} sub={v.postedDays >= 21 ? "Older than three weeks" : "Posted " + (v.postedDays === 0 ? "today" : v.postedDays + " days ago")} warn={v.postedDays >= 21} />
        <Metric icon="file" label="Applicants" value={num(v.applicants)} sub={v.applicants ? "Applied through Recruit" : "None yet"} />
        <Metric icon="users" label="Market matches" value={num(v.marketMatches)} sub={<span className="rc-row" style={{ gap: 6 }}>{sample} sample profiles at 60%+ <DemoTag>Sim</DemoTag></span>} />
        <Metric icon="hiring" label="In pipeline" value={num(inPipe)} sub={counts.offer ? plural(counts.offer, "offer") + " in progress" : counts.interview ? plural(counts.interview, "person", "people") + " interviewing" : "Shortlist to begin"} />
      </div>

      <div style={{ padding: "0 22px 16px" }}>
        <Label style={{ marginBottom: 8 }}>Pipeline by stage</Label>
        <div className="rc-grid rc-g6" style={{ gap: 8 }}>
          {STAGE_ORDER.map(st => (
            <div key={st} style={{ padding: "10px 12px", borderRadius: "var(--r-sm, 12px)", background: counts[st] ? "color-mix(in oklab, " + STAGE_COLOR[st] + " 10%, var(--surface-2))" : "var(--surface-faint)",
              border: "1px solid " + (counts[st] ? "color-mix(in oklab, " + STAGE_COLOR[st] + " 35%, transparent)" : "var(--border)") }}>
              <div className="rc-row" style={{ gap: 6 }}>
                <span style={{ width: 7, height: 7, borderRadius: 2, background: STAGE_COLOR[st], opacity: counts[st] ? 1 : 0.35 }} />
                <span className="rc-ellipsis" style={{ fontSize: 11.5, color: "var(--dim)" }}>{STAGE_LABEL[st]}</span>
              </div>
              <div style={{ fontSize: 20, fontWeight: 600, marginTop: 6, color: counts[st] ? "var(--ink)" : "var(--faint)", fontVariantNumeric: "tabular-nums" }}>{counts[st]}</div>
            </div>
          ))}
        </div>
      </div>

      {(top.length > 0 || v.required.length > 0) && (
        <div className="rc-grid rc-g2" style={{ gap: 16, padding: "0 22px 18px" }}>
          {top.length > 0 && (
            <div>
              <Label style={{ marginBottom: 8 }}>Strongest sample alignment</Label>
              <div className="rc-col" style={{ gap: 2 }}>
                {top.map(({ c, m }) => {
                  const who = identity(s, employerId, c);
                  return (
                    <div key={c.id} className="rc-row rc-rowhover" onClick={() => openDrawer("candidate", c.id, { vacancyId: v.id })} style={{ gap: 10, padding: "6px 8px", margin: "0 -8px", borderRadius: 10 }}>
                      <PersonAvatar c={c} anon={who.anon} size={26} />
                      <span className="rc-grow rc-ellipsis" style={{ fontSize: 12.5, color: "var(--ink)" }}>{who.name}<span style={{ color: "var(--dim)" }}>, {c.title}</span></span>
                      <span style={{ fontSize: 12.5, fontWeight: 600, color: toneVar(alignmentTone(m.score)), fontVariantNumeric: "tabular-nums" }}>{m.score}%</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          {v.required.length > 0 && (
            <div>
              <Label style={{ marginBottom: 8 }}>Required skills</Label>
              <div className="rc-row rc-wrap" style={{ gap: 6 }}>
                {v.required.map(r => <SkillTag key={r} name={r} hit />)}
                {v.preferred.map(r => <SkillTag key={r} name={r} />)}
              </div>
              <div style={{ fontSize: 11, color: "var(--faint)", marginTop: 8 }}>{v.minYears ? v.minYears + "+ years asked for. " : ""}Highlighted skills are required; the rest are preferred.</div>
            </div>
          )}
        </div>
      )}

      <div className="rc-row rc-wrap" style={{ gap: 8, padding: "12px 22px", borderTop: "1px solid var(--border)" }}>
        <Button size="sm" variant="ghost" icon="eye" onClick={() => openDrawer("vacancy", v.id)}>View details</Button>
        <span className="rc-grow" />
        <Button size="sm" icon="hiring" onClick={onPipeline}>View pipeline</Button>
        <Button size="sm" variant="primary" icon="search" onClick={onFind} disabled={v.status === "filled"} title={v.status === "filled" ? "This role is filled" : "Rank the marketplace against this role"}>Find matching talent</Button>
      </div>
    </Card>
  );
}

function Metric({ icon, label, value, sub, warn }: { icon: string; label: string; value: string; sub: React.ReactNode; warn?: boolean }) {
  return (
    <div style={{ padding: "12px 14px", borderRadius: "var(--r-sm, 12px)", background: "var(--surface-2)", border: "1px solid var(--border)", minWidth: 0 }}>
      <div className="rc-row" style={{ gap: 7, fontSize: 11.5, color: "var(--dim)" }}><span style={{ color: warn ? "var(--warn)" : "var(--faint)", display: "flex" }}><Icon name={icon} size={13} /></span>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 600, letterSpacing: "-.5px", marginTop: 7, fontVariantNumeric: "tabular-nums" }}>{value}</div>
      <div style={{ fontSize: 11.5, color: warn ? "var(--warn)" : "var(--faint)", marginTop: 4 }}>{sub}</div>
    </div>
  );
}
