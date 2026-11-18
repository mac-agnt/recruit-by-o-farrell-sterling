import { useMemo } from "react";
import { Avatar, Badge, Button, Card, Empty, Grid, Page, Section, Table, toneColor, type Col } from "../../ui";
import { Icon } from "../../icons";
import { useNav } from "../../nav";
import { openDrawer, toggleSavedJob, useRecruit, vacancyById } from "../../store";
import { candidate, relevantRoles } from "../../selectors";
import { EMPLOYER_BY_ID } from "../../data";
import type { Vacancy } from "../../data/types";
import { alignmentTone, matchScore, type Match } from "../../match";
import { eurK } from "../../format";
import { JobCard, VISIBLE_STAGES, activeApplication, noticeFit, savedStyle } from "../../shared/opportunityKit";

/* Opportunities, saved jobs. The roles a professional is weighing up, side by
   side, with the same save and apply actions as the marketplace. Saving is
   private: employers never see it. */

export default function JobsSaved() {
  const s = useRecruit();
  return <SavedView key={s.persona} />;
}

interface Item { v: Vacancy; m: Match }

function SavedView() {
  const s = useRecruit();
  const nav = useNav();
  const c = candidate(s, s.persona);
  const ids = s.savedJobs[c.id] || [];
  const saved: Item[] = ids.map(id => vacancyById(id, s)).filter((v): v is Vacancy => !!v).map(v => ({ v, m: matchScore(c, v) }));
  const roles = useMemo(() => relevantRoles(s, c.id), [s, c.id]);
  const engaged = (vid: string) => !!activeApplication(s, c.id, vid)
    || s.offers.some(o => o.candidateId === c.id && o.vacancyId === vid && o.visibleToCandidate)
    || s.pipeline.some(p => p.candidateId === c.id && p.vacancyId === vid && VISIBLE_STAGES.includes(p.stage));
  const suggestions = roles.filter(({ v }) => !ids.includes(v.id) && !engaged(v.id)).slice(0, saved.length ? 3 : 6);
  const first = c.name.split(" ")[0];
  const best = saved.length ? saved.reduce((a, b) => (b.m.score > a.m.score ? b : a)) : null;

  const cols: Col<Item>[] = [
    { key: "role", label: "Role", width: "1.6fr", render: ({ v }) => (
      <button className="rc-link" style={{ textAlign: "left", color: "var(--ink)", fontWeight: 500 }} onClick={() => openDrawer("vacancy", v.id)}>{v.title}
        <span style={{ display: "block", fontSize: 11.5, color: "var(--dim)", fontWeight: 400, marginTop: 2 }}>{EMPLOYER_BY_ID[v.employerId]?.short}, {v.location}</span>
      </button>
    ) },
    { key: "salary", label: "Salary", width: "1fr", render: ({ v }) => eurK(v.salary[0]) + " to " + eurK(v.salary[1]) },
    { key: "match", label: "Match", width: "0.7fr", render: ({ m }) => <Badge tone={alignmentTone(m.score)}>{m.score}%</Badge> },
    { key: "fit", label: "Salary fit", width: "0.9fr", hideSm: true, render: ({ m }) => <span style={{ color: m.salaryFit === "within" ? "var(--teal, var(--ok))" : "var(--warn)" }}>{m.salaryFit === "within" ? "Within budget" : m.salaryFit === "above" ? "Above budget" : "Below your level"}</span> },
    { key: "start", label: "Start", width: "1.2fr", render: ({ v }) => { const f = noticeFit(c.noticeWeeks, v.start); return <span>{v.start}<span style={{ display: "block", fontSize: 11, color: toneColor(f.tone), marginTop: 2 }}>{f.label}</span></span>; } },
    { key: "status", label: "Status", width: "0.9fr", render: ({ v }) => {
      const app = activeApplication(s, c.id, v.id);
      return v.status !== "open" ? <Badge tone="neutral">No longer open</Badge> : app ? <Badge tone="teal" icon="check">Applied</Badge> : <Badge tone="accent">Not applied</Badge>;
    } },
  ];

  return (
    <Page wide eyebrow="OPPORTUNITIES" title={saved.length ? "Roles you're weighing up." : "Nothing saved yet."}
      sub={saved.length ? "Your saved roles, side by side. Saving is private: employers never see what you save." : "Save roles from your recommendations and they collect here, ready to compare. Employers never see what you save."}
      actions={<Button variant="primary" icon="jobs" onClick={() => nav.go("cand.jobs", "recommended")}>Browse recommended</Button>}>

      {saved.length > 1 && (
        <Section title="Side by side" sub={best ? "Strongest match: " + best.v.title + " at " + EMPLOYER_BY_ID[best.v.employerId]?.short + ", " + best.m.score + "%." : undefined}>
          <Table cols={cols} rows={saved} onRow={r => openDrawer("vacancy", r.v.id)} caption="Select a row for the full role. Salary ranges are as advertised in this demo (illustrative)." />
        </Section>
      )}

      {saved.length > 0 ? (
        <Section title={saved.length === 1 ? "Your saved role" : "Your " + saved.length + " saved roles"} sub="Remove a role at any time. Your application history is kept separately.">
          <div className="rc-col" style={{ gap: 14 }}>
            {saved.map(({ v, m }) => (
              <JobCard key={v.id} v={v} m={m} onRemove={() => toggleSavedJob(c.id, v.id)}
                footnote={<span className="rc-row" style={{ gap: 6 }}><Icon name="bookmark" size={12} />Saved by {first}</span>} />
            ))}
          </div>
        </Section>
      ) : (
        <Card>
          <Empty icon="bookmark" title={"No saved roles for " + first}
            body={c.id === "c-sarah"
              ? "You're already weighing two offers, so nothing is saved yet. If you want a wider view first, the roles below fit your profile."
              : "Save a role from your recommendations and it appears here with its match, salary and start date."}
            action={<Button size="sm" icon="jobs" onClick={() => nav.go("cand.jobs", "recommended")}>See all recommended roles</Button>} />
        </Card>
      )}

      {suggestions.length > 0 && (
        <Section title={saved.length ? "More roles like these" : "Suggested to save"} sub="From your recommendations, not yet saved or applied to">
          <Grid cols={suggestions.length % 3 === 0 ? "rc-g3" : "rc-g2"}>
            {suggestions.map(({ v, m }) => <Suggestion key={v.id} v={v} m={m} candidateId={c.id} />)}
          </Grid>
        </Section>
      )}
    </Page>
  );
}

function Suggestion({ v, m, candidateId }: { v: Vacancy; m: Match; candidateId: string }) {
  const s = useRecruit();
  const emp = EMPLOYER_BY_ID[v.employerId];
  const saved = (s.savedJobs[candidateId] || []).includes(v.id);
  return (
    <Card pad="16px 18px" onClick={() => openDrawer("vacancy", v.id)}>
      <div className="rc-row" style={{ alignItems: "flex-start", gap: 11 }}>
        <Avatar initials={emp?.initials || "?"} tint={emp?.tint} size={34} square />
        <div className="rc-grow">
          <div style={{ fontSize: 13.5, fontWeight: 600, lineHeight: 1.3 }}>{v.title}</div>
          <div className="rc-row" style={{ gap: 5, fontSize: 12, color: "var(--dim)", marginTop: 3 }}>
            {emp?.short}{emp?.verified && <span style={{ color: "var(--teal, var(--ok))", display: "inline-flex" }}><Icon name="verified" size={12} /></span>}
          </div>
        </div>
        <Badge tone={alignmentTone(m.score)}>{m.score}%</Badge>
      </div>
      <div style={{ fontSize: 12.5, color: "var(--body)", marginTop: 12 }}>{eurK(v.salary[0])} to {eurK(v.salary[1])} · {v.location}</div>
      <div style={{ fontSize: 12, color: "var(--dim)", marginTop: 6, lineHeight: 1.45 }}>{m.reasons[0]}</div>
      <div className="rc-row" style={{ gap: 8, marginTop: 14 }}>
        <Button size="sm" icon="bookmark" onClick={e => { e.stopPropagation(); toggleSavedJob(candidateId, v.id); }} style={saved ? savedStyle : undefined}>{saved ? "Saved" : "Save"}</Button>
        <Button size="sm" variant="ghost" iconRight="arrowRight" onClick={e => { e.stopPropagation(); openDrawer("vacancy", v.id); }}>Details</Button>
      </div>
    </Card>
  );
}
