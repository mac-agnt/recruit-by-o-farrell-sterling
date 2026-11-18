import { useMemo, useState, type ReactNode } from "react";
import { Avatar, Badge, Button, Card, Chip, Empty, Field, Grid, Label, Note, Page, Segmented, Select, Slider, Stat, Toggle } from "../../ui";
import { Icon } from "../../icons";
import { useNav } from "../../nav";
import { useRecruit } from "../../store";
import { candidate, relevantRoles } from "../../selectors";
import { EMPLOYER_BY_ID, EMPLOYER_INTEREST } from "../../data";
import type { Vacancy } from "../../data/types";
import { eurK } from "../../format";
import { JobCard, activeApplication, noticeFit, noticeLabel } from "../../shared/opportunityKit";

/* Opportunities, recommended. A jobs marketplace ranked for this person, with
   the reasons behind every match and the filters a working manager needs:
   where, how much, what level, and whether the start date fits their notice. */

export default function JobsRecommended() {
  const s = useRecruit();
  return <JobsView key={s.persona} />;
}

type Sort = "match" | "salary" | "newest";
const LEVELS: Vacancy["seniority"][] = ["Executive", "Senior", "Manager", "Supervisor"];

function JobsView() {
  const s = useRecruit();
  const nav = useNav();
  const c = candidate(s, s.persona);
  const roles = useMemo(() => relevantRoles(s, c.id), [s, c.id]);
  const [loc, setLoc] = useState("any");
  const [level, setLevel] = useState("any");
  const [type, setType] = useState("any");
  const [notice, setNotice] = useState(false);
  const [sort, setSort] = useState<Sort>("match");

  const tops = roles.map(r => r.v.salary[1]);
  const sMin = tops.length ? Math.max(0, Math.floor(Math.min(...tops) / 5000) * 5000 - 5000) : 0;
  const sMax = tops.length ? Math.ceil(Math.max(...tops) / 5000) * 5000 : 100000;
  const [floor, setFloor] = useState(sMin);

  const regions = Array.from(new Set(roles.map(r => r.v.region)));
  const hasDublin = roles.some(r => /dublin/i.test(r.v.location));
  const locOptions = [{ value: "any", label: "Any location" }]
    .concat(hasDublin ? [{ value: "dublin", label: "Dublin" }] : [])
    .concat(regions.map(r => ({ value: "r:" + r, label: r })));
  const levels = LEVELS.filter(l => roles.some(r => r.v.seniority === l));
  const types = Array.from(new Set(roles.map(r => r.v.type)));

  const filtered = roles.filter(({ v }) =>
    (loc === "any" || (loc === "dublin" ? /dublin/i.test(v.location) : v.region === loc.slice(2)))
    && (floor <= sMin || v.salary[1] >= floor)
    && (level === "any" || v.seniority === level)
    && (type === "any" || v.type === type)
    && (!notice || ["ok", "flex"].includes(noticeFit(c.noticeWeeks, v.start).level)));
  const sorted = filtered.slice().sort((a, b) =>
    sort === "salary" ? b.v.salary[1] - a.v.salary[1] || b.v.salary[0] - a.v.salary[0]
      : sort === "newest" ? a.v.postedDays - b.v.postedDays || b.m.score - a.m.score
      : b.m.score - a.m.score);
  const anyFilter = loc !== "any" || floor > sMin || level !== "any" || type !== "any" || notice;
  const clear = () => { setLoc("any"); setFloor(sMin); setLevel("any"); setType("any"); setNotice(false); };

  const strong = roles.filter(r => r.m.score >= 85).length;
  const savedCount = (s.savedJobs[c.id] || []).length;
  const applied = s.applications.filter(a => a.candidateId === c.id && a.status !== "withdrawn" && a.status !== "unsuccessful").length;
  const fits = roles.filter(r => ["ok", "flex"].includes(noticeFit(c.noticeWeeks, r.v.start).level)).length;
  const interest = EMPLOYER_INTEREST[c.id] || [];
  const first = c.name.split(" ")[0];

  return (
    <Page wide eyebrow="OPPORTUNITIES" title={roles.length + " roles that fit your experience."}
      sub={"Ranked for " + first + " from your verified skills, experience, salary expectation and location. Every match explains itself, and nothing is hidden from you."}
      actions={<>
        <Button icon="bookmark" onClick={() => nav.go("cand.jobs", "saved")}>Saved jobs</Button>
        <Button variant="primary" icon="explorer" onClick={() => nav.go("cand.explorer", "paths")}>Explore other careers</Button>
      </>}>

      <Grid cols="rc-g4">
        <Stat icon="jobs" tone="accent" label="Relevant roles" value={roles.length} sub="Open in the marketplace now" />
        <Stat icon="target" tone="teal" label="Strong matches" value={strong} sub="85% alignment or higher" />
        <Stat icon="bookmark" label="Saved" value={savedCount} sub="Open saved jobs" onClick={() => nav.go("cand.jobs", "saved")} />
        <Stat icon="send" label="Applications" value={applied} sub="Track progress" onClick={() => nav.go("cand.jobs", "applications")} />
      </Grid>

      <Grid cols="rc-g-side-r">
        <div className="rc-col" style={{ gap: 14, minWidth: 0 }}>
          <Card pad="16px 18px">
            <div className="rc-row" style={{ marginBottom: 12 }}>
              <span className="rc-row rc-grow" style={{ gap: 8, fontSize: 13, fontWeight: 600 }}><Icon name="filter" size={14} style={{ color: "var(--accent)" }} />Filters</span>
              {anyFilter && <Button size="sm" variant="ghost" icon="x" onClick={clear}>Clear filters</Button>}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 14, alignItems: "end" }}>
              <Field label="Location"><Select value={loc} onChange={setLoc} options={locOptions} /></Field>
              <Field label="Seniority"><Select value={level} onChange={setLevel} options={[{ value: "any", label: "Any level" }].concat(levels.map(l => ({ value: l, label: l })))} /></Field>
              <Field label="Employment type"><Select value={type} onChange={setType} options={[{ value: "any", label: "Any type" }].concat(types.map(t => ({ value: t, label: t })))} /></Field>
              <div style={{ minWidth: 0 }}>
                <Slider label="Salary at least" value={floor} min={sMin} max={sMax} step={5000} onChange={setFloor} display={floor <= sMin ? "Any" : eurK(floor)} />
              </div>
            </div>
            <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid var(--border)" }}>
              <Toggle on={notice} onChange={setNotice} label="Fits my notice period"
                sub={"Hide roles that start before your " + noticeLabel(c.noticeWeeks) + " ends. " + fits + " of " + roles.length + " roles fit."} />
            </div>
          </Card>

          <div className="rc-row rc-wrap" style={{ gap: 10, padding: "0 4px" }}>
            <span className="rc-grow" style={{ fontSize: 13, color: "var(--dim)" }}>Showing <b style={{ color: "var(--ink)", fontWeight: 600 }}>{sorted.length}</b> of {roles.length} roles</span>
            <Segmented size="sm" value={sort} onChange={setSort} options={[{ id: "match", label: "Best match" }, { id: "salary", label: "Salary" }, { id: "newest", label: "Newest" }]} />
          </div>

          {sorted.map(({ v, m }) => (
            <JobCard key={v.id} v={v} m={m} footnote={v.id === roles[0]?.v.id ? <span className="rc-row" style={{ gap: 6, color: "var(--teal, var(--ok))" }}><Icon name="star" size={12} />Your strongest match today</span> : undefined} />
          ))}
          {!sorted.length && (
            <Card>
              <Empty icon="filter" title="No roles match these filters" body="Loosen a filter to see more. Recruit never removes a role from your view on its own."
                action={<Button size="sm" onClick={clear}>Clear filters</Button>} />
            </Card>
          )}
          <div style={{ fontSize: 11.5, color: "var(--faint)", padding: "2px 4px" }}>
            Salary ranges are as advertised by employers in this demo marketplace (illustrative). Match percentages are decision support, not a judgement of you.
          </div>
        </div>

        <div className="rc-col" style={{ gap: 14, minWidth: 0 }}>
          <Card title="Your search profile" sub="What the ranking uses" action={<Button size="sm" variant="ghost" iconRight="arrowRight" onClick={() => nav.go("cand.profile", "profile")}>Edit</Button>}>
            <div className="rc-col" style={{ gap: 12 }}>
              <ProfileLine label="Looking for" value={<div className="rc-row rc-wrap" style={{ gap: 6 }}>{c.preferredRoles.map(r => <Chip key={r} style={{ height: 24, fontSize: 11.5 }}>{r}</Chip>)}</div>} />
              <ProfileLine label="Salary expectation" value={eurK(c.salaryExpectation[0]) + " to " + eurK(c.salaryExpectation[1])} />
              <ProfileLine label="Notice period" value={noticeLabel(c.noticeWeeks)} />
              <ProfileLine label="Based in" value={c.location} />
              <ProfileLine label="Status" value={<Badge tone={c.availability === "Actively looking" ? "ok" : "accent"}>{c.availability}</Badge>} />
            </div>
          </Card>

          <Card title="Employer interest" sub="Who looked at your profile, and why">
            {interest.map((it, i) => {
              const emp = EMPLOYER_BY_ID[it.employerId];
              return (
                <div key={i} className="rc-row" style={{ alignItems: "flex-start", gap: 10, padding: "9px 0", borderTop: i ? "1px solid var(--border)" : 0 }}>
                  <Avatar initials={emp?.initials || "?"} tint={emp?.tint} size={28} square />
                  <div className="rc-grow" style={{ fontSize: 12.5, lineHeight: 1.45 }}>
                    <span style={{ color: "var(--ink)", fontWeight: 500 }}>{emp?.short}</span> <span style={{ color: "var(--dim)" }}>{it.text}</span>
                    <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--faint)", marginTop: 3 }}>{it.when}</div>
                  </div>
                </div>
              );
            })}
            {!interest.length && <div style={{ fontSize: 12.5, color: "var(--dim)" }}>No employer views this week.</div>}
          </Card>

          <Card title="How matching works">
            <div className="rc-col" style={{ gap: 9 }}>
              {["Required skills, weighted up when verified", "Years of experience against what the role asks", "Salary expectation against the budget", "Location and your stated preferences"].map(t => (
                <div key={t} className="rc-row" style={{ alignItems: "flex-start", gap: 9, fontSize: 12.5, color: "var(--body)", lineHeight: 1.45 }}>
                  <span style={{ color: "var(--accent)", marginTop: 2, display: "inline-flex" }}><Icon name="check" size={12} stroke={2.4} /></span>{t}
                </div>
              ))}
            </div>
            <Note style={{ marginTop: 12 }}>Sensitive characteristics are never used. The score ranks and explains; it never hides a role or rejects anyone.</Note>
          </Card>
          <ApplicationNudge />
        </div>
      </Grid>
    </Page>
  );
}

function ProfileLine({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <Label style={{ fontSize: 8.5 }}>{label}</Label>
      <div style={{ fontSize: 13, color: "var(--ink)", marginTop: 5 }}>{value}</div>
    </div>
  );
}

/** A quiet prompt when an interview or offer is waiting elsewhere. */
function ApplicationNudge() {
  const s = useRecruit();
  const nav = useNav();
  const c = candidate(s, s.persona);
  const iv = s.interviews.find(i => i.candidateId === c.id && i.status === "scheduled");
  const offers = s.offers.filter(o => o.candidateId === c.id && o.visibleToCandidate && (o.status === "sent" || o.status === "changes requested"));
  if (!iv && !offers.length) return null;
  const app = iv ? activeApplication(s, c.id, iv.vacancyId) : undefined;
  return (
    <Card tone="accent" pad="16px 18px">
      <div className="rc-row" style={{ alignItems: "flex-start", gap: 11 }}>
        <span style={{ color: "var(--accent)", marginTop: 2, display: "inline-flex" }}><Icon name={offers.length ? "offers" : "calendar"} size={16} /></span>
        <div className="rc-grow">
          <div style={{ fontSize: 13, fontWeight: 600 }}>{offers.length ? (offers.length === 1 ? "An offer is waiting for you" : offers.length + " offers are waiting for you") : "Interview coming up"}</div>
          <div style={{ fontSize: 12.5, color: "var(--dim)", marginTop: 4, lineHeight: 1.5 }}>
            {offers.length ? "Review the terms and respond before they expire." : iv!.when + ", round " + iv!.round + (app ? ", for the role you applied to" : "") + "."}
          </div>
          <Button size="sm" style={{ marginTop: 10 }} iconRight="arrowRight" onClick={() => nav.go(offers.length ? "cand.offers" : "cand.jobs", offers.length ? "incoming" : "applications")}>{offers.length ? "Open offers" : "View applications"}</Button>
        </div>
      </div>
    </Card>
  );
}
