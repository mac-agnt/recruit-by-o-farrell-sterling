import { useMemo, useState } from "react";
import { Badge, Button, Card, Chip, Empty, Grid, Label, Note, Page, Select, Stat, TextInput } from "../../ui";
import { BarList } from "../../charts";
import { Icon } from "../../icons";
import { useNav } from "../../nav";
import { useRecruit } from "../../store";
import { employerVacancies } from "../../selectors";
import { CANDIDATES, EMPLOYER_BY_ID, EMPLOYER_TEAM, type ActivityEvent } from "../../data";
import { num } from "../../format";
import { ActivityItem, KIND_META, KIND_ORDER, PipelineBar, activityKind, dayGroup, employerEvents, lowerWhen, maskNames, roleName, stageCounts, type ActKind } from "../../shared/talentKit";

/* Everything that moved on Harbourview's roles, newest first: shortlists,
   introductions, interviews, offers, applications and fees. Actions taken
   anywhere in the demo (including by candidates in their own portal) land
   here straight away. */

type Who = "all" | "team" | "candidates" | "recruit";
const WHO_LABEL: Record<Who, string> = { all: "Everyone", team: "Your team", candidates: "Candidates", recruit: "Recruit and agents" };
const GROUPS = ["Today", "Yesterday", "Earlier this week", "Earlier"];

export default function HiringActivity() {
  const s = useRecruit();
  const nav = useNav();
  const employerId = s.employerId;
  const emp = EMPLOYER_BY_ID[employerId];
  const all = useMemo(() => employerEvents(s, employerId), [s, employerId]);
  const vacs = employerVacancies(s, employerId);
  const [kind, setKind] = useState<ActKind | "all">("all");
  const [roleId, setRoleId] = useState("all");
  const [who, setWho] = useState<Who>("all");
  const [q, setQ] = useState("");

  const team = new Set([...EMPLOYER_TEAM.map(t => t.name), emp?.name || "", emp?.short || "", emp?.contact || "", "Owners' board"]);
  const candidateNames = new Set(CANDIDATES.map(c => c.name));
  const whoOf = (e: ActivityEvent): Who => (team.has(e.actor) ? "team" : candidateNames.has(e.actor) ? "candidates" : "recruit");

  const words = q.trim().toLowerCase();
  const scoped = all.filter(e => (roleId === "all" || e.refs.includes(roleId)) && (who === "all" || whoOf(e) === who)
    && (!words || (maskNames(s, employerId, e.title + " " + e.detail) + " " + e.actor).toLowerCase().includes(words)));
  const kindOf = activityKind;
  const shown = scoped.filter(e => kind === "all" || kindOf(e) === kind);
  const countKind = (k: ActKind, list: ActivityEvent[] = scoped) => list.filter(e => kindOf(e) === k).length;
  const grouped = GROUPS.map(g => ({ g, items: shown.filter(e => dayGroup(e.at) === g) })).filter(x => x.items.length);
  const whoCounts = (["team", "candidates", "recruit"] as Who[]).map(w => ({ w, n: all.filter(e => whoOf(e) === w).length }));
  const filtered = kind !== "all" || roleId !== "all" || who !== "all" || !!words;
  const clear = () => { setKind("all"); setRoleId("all"); setWho("all"); setQ(""); };

  return (
    <Page wide eyebrow="OVERVIEW" title="Hiring activity"
      sub={"Everything that moved on " + (emp?.short || "your") + "'s roles, newest first. Actions taken anywhere in Recruit, including by candidates in their own portal, appear here straight away."}
      actions={<>
        <Button icon="vacancies" onClick={() => nav.go("emp.vacancies", "active")}>Active roles</Button>
        <Button variant="primary" icon="search" onClick={() => nav.go("emp.talent", "discover")}>Discover talent</Button>
      </>}>

      <Grid cols="rc-g4">
        {(["pipeline", "introductions", "interviews", "offers"] as ActKind[]).map(k => (
          <Stat key={k} icon={KIND_META[k].icon} label={KIND_META[k].label} value={num(countKind(k, all))}
            sub={kind === k ? "Showing these below" : "Click to show only these"} tone={kind === k ? "accent" : undefined}
            onClick={() => setKind(kind === k ? "all" : k)} style={kind === k ? { borderColor: "var(--accent-line)" } : undefined} />
        ))}
      </Grid>

      <Grid cols="rc-g-side-r" gap={16}>
        <Card pad={0}>
          <div style={{ padding: "16px 20px 14px", borderBottom: "1px solid var(--border)" }}>
            <div className="rc-row rc-wrap" style={{ gap: 10 }}>
              <div style={{ position: "relative", flex: "1 1 240px", minWidth: 0 }}>
                <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--faint)", display: "flex", pointerEvents: "none" }}><Icon name="search" size={14} /></span>
                <TextInput value={q} onChange={e => setQ(e.target.value)} placeholder="Search activity" aria-label="Search activity" style={{ paddingLeft: 34, height: 36, fontSize: 13 }} />
              </div>
              <Select value={roleId} onChange={setRoleId} style={{ height: 36, fontSize: 12.5, flex: "0 1 230px", width: "auto" }}
                options={[{ value: "all", label: "All roles" }].concat(vacs.map(v => ({ value: v.id, label: roleName(v) + (v.status !== "open" ? " (" + v.status + ")" : "") })))} />
              <Select value={who} onChange={x => setWho(x as Who)} style={{ height: 36, fontSize: 12.5, flex: "0 1 190px", width: "auto" }}
                options={(Object.keys(WHO_LABEL) as Who[]).map(w => ({ value: w, label: WHO_LABEL[w] }))} />
            </div>
            <div className="rc-row rc-wrap" style={{ gap: 6, marginTop: 12 }}>
              <Chip active={kind === "all"} onClick={() => setKind("all")}>All <span style={{ fontSize: 10.5, color: "var(--faint)" }}>{scoped.length}</span></Chip>
              {KIND_ORDER.map(k => {
                const n = countKind(k);
                return (
                  <Chip key={k} active={kind === k} onClick={() => setKind(kind === k ? "all" : k)} style={n ? undefined : { opacity: 0.55 }}>
                    <span style={{ width: 7, height: 7, borderRadius: 2, background: KIND_META[k].color }} />{KIND_META[k].label} <span style={{ fontSize: 10.5, color: "var(--faint)" }}>{n}</span>
                  </Chip>
                );
              })}
            </div>
          </div>

          <div style={{ padding: "4px 20px 18px" }}>
            {grouped.map(({ g, items }) => (
              <div key={g} style={{ marginTop: 14 }}>
                <div className="rc-row" style={{ gap: 10, marginBottom: 2 }}>
                  <Label>{g}</Label>
                  <span style={{ flex: 1, height: 1, background: "var(--border)" }} />
                  <span style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--faint)" }}>{items.length}</span>
                </div>
                {items.map((e, i) => <ActivityItem key={e.id} s={s} employerId={employerId} e={e} first={i === 0} />)}
              </div>
            ))}
            {!shown.length && (
              <Empty icon="activity" title="Nothing matches these filters" body="Try another role, a different kind of activity or clear the search."
                action={filtered ? <Button icon="refresh" onClick={clear}>Clear filters</Button> : undefined} />
            )}
          </div>
        </Card>

        <div className="rc-col" style={{ gap: 14 }}>
          <Card title="By role" sub="Activity and pipeline for each vacancy"
            action={roleId !== "all" ? <Button size="sm" variant="ghost" onClick={() => setRoleId("all")}>All roles</Button> : undefined}>
            {vacs.map((v, i) => {
              const evs = all.filter(e => e.refs.includes(v.id));
              const on = roleId === v.id;
              return (
                <div key={v.id} onClick={() => setRoleId(on ? "all" : v.id)} className="rc-rowhover"
                  style={{ padding: "12px 10px", margin: "0 -10px", borderRadius: 12, borderTop: i ? "1px solid var(--border)" : 0, background: on ? "var(--accent-faint)" : undefined }}>
                  <div className="rc-row" style={{ gap: 8 }}>
                    <span className="rc-grow rc-ellipsis" style={{ fontSize: 13, fontWeight: 500, color: on ? "var(--accent)" : "var(--ink)" }}>{v.title}</span>
                    {v.status !== "open" && <Badge tone={v.status === "filled" ? "ok" : "neutral"}>{v.status.charAt(0).toUpperCase() + v.status.slice(1)}</Badge>}
                    <span style={{ fontSize: 12, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{evs.length}</span>
                  </div>
                  <div style={{ fontSize: 11.5, color: "var(--faint)", margin: "4px 0 8px" }}>{evs[0] ? "Last: " + maskNames(s, employerId, evs[0].title).toLowerCase() + ", " + lowerWhen(evs[0].when) : "No activity yet"}</div>
                  <PipelineBar counts={stageCounts(s, v.id)} height={6} />
                </div>
              );
            })}
          </Card>

          <Card title="Who moved things" sub="Click a group to filter the timeline">
            <BarList items={whoCounts.map(x => ({ label: <span onClick={() => setWho(who === x.w ? "all" : x.w)} style={{ cursor: "pointer", color: who === x.w ? "var(--accent)" : undefined }}>{WHO_LABEL[x.w]}</span>, value: x.n, color: who === x.w ? "var(--accent)" : x.w === "candidates" ? "var(--teal, #16B8A6)" : x.w === "team" ? "var(--accent)" : "var(--faint)" }))} />
            <div className="rc-row rc-wrap" style={{ gap: 6, marginTop: 14 }}>
              {whoCounts.map(x => <Chip key={x.w} active={who === x.w} onClick={() => setWho(who === x.w ? "all" : x.w)}>{WHO_LABEL[x.w]}</Chip>)}
            </div>
          </Card>

          <Note icon="lock">Anonymous professionals stay anonymous here until they accept an introduction.</Note>
        </div>
      </Grid>
    </Page>
  );
}
