import { useMemo, useState } from "react";
import { Avatar, Badge, Button, Card, Empty, Grid, ListRow, Page, Section, Segmented, Select, Stat, Table, TextInput, type Col } from "../../ui";
import { SERIES_COLORS, StackBar } from "../../charts";
import { Icon } from "../../icons";
import { useNav } from "../../nav";
import { allVacancies, logActivity, notify, openDrawer, useRecruit, type RecruitState } from "../../store";
import { CANDIDATE_BY_ID, EMPLOYERS, EMPLOYER_BY_ID, STAGES, STAGE_ORDER, SUPPORT_TICKETS } from "../../data";
import type { ActivityEvent, Employer } from "../../data/types";
import { num } from "../../format";

/* Recruit HQ, Employer hiring activity: what each sample account is doing
   right now (roles, pipelines, offers, placements), the live hiring feed
   from the shared activity log, and employer support tickets. */

type Tone = "accent" | "ok" | "warn" | "bad" | "neutral" | "teal";
type FeedView = "hiring" | "financial" | "all";

const ACTOR = "John O'Farrell";
const STAGE_COLORS = ["var(--faint)", SERIES_COLORS[5], SERIES_COLORS[3], SERIES_COLORS[0], SERIES_COLORS[2], SERIES_COLORS[1]];
const PRIORITY_TONE: Record<string, Tone> = { High: "bad", Medium: "warn", Low: "neutral" };
const DOT: Record<string, string> = { awaiting: "var(--warn)", failed: "var(--bad)", working: "var(--accent)", completed: "var(--teal, var(--ok))" };

interface HireRow {
  e: Employer; open: number; byStage: number[]; entries: number; interviews: number;
  offersLive: number; offersAll: number; placements: number; refs: Set<string>; last?: ActivityEvent;
}

const touches = (ev: ActivityEvent, e: Employer, refs: Set<string>) =>
  ev.refs.some(r => refs.has(r)) || ev.actor === e.name || ev.actor === e.short;

function hireRow(s: RecruitState, e: Employer): HireRow {
  const vacs = allVacancies(s).filter(v => v.employerId === e.id);
  const ids = new Set(vacs.map(v => v.id));
  const entries = s.pipeline.filter(p => ids.has(p.vacancyId));
  const offers = s.offers.filter(o => o.employerId === e.id);
  const placements = s.placements.filter(p => p.employerId === e.id);
  const refs = new Set<string>([e.id, ...ids, ...offers.map(o => o.id), ...placements.map(p => p.id)]);
  return {
    e, refs,
    open: vacs.filter(v => v.status === "open").length,
    byStage: STAGE_ORDER.map(st => entries.filter(p => p.stage === st).length),
    entries: entries.length,
    interviews: s.interviews.filter(i => ids.has(i.vacancyId) && i.status === "scheduled").length,
    offersLive: offers.filter(o => !["declined", "withdrawn", "accepted"].includes(o.status)).length,
    offersAll: offers.length,
    placements: placements.length,
    last: s.activity.find(ev => touches(ev, e, refs)),
  };
}

export default function EmployerActivity() {
  const s = useRecruit();
  const nav = useNav();
  const [feedView, setFeedView] = useState<FeedView>("hiring");
  const [feedQ, setFeedQ] = useState("");
  const [feedEmp, setFeedEmp] = useState("all");
  const [limit, setLimit] = useState(12);

  const rows = useMemo(() => EMPLOYERS.map(e => hireRow(s, e)).sort((a, b) => b.entries - a.entries || b.open - a.open), [s]);
  const byId = useMemo(() => Object.fromEntries(rows.map(r => [r.e.id, r])), [rows]);

  const feed = useMemo(() => {
    const needle = feedQ.trim().toLowerCase();
    const emp = feedEmp !== "all" ? byId[feedEmp] : null;
    return s.activity.filter(ev => {
      if (feedView === "all" ? !(ev.category === "hiring" || ev.category === "financial") : ev.category !== feedView) return false;
      if (emp && !touches(ev, emp.e, emp.refs)) return false;
      if (needle && ![ev.title, ev.detail, ev.actor].join(" ").toLowerCase().includes(needle)) return false;
      return true;
    });
  }, [s.activity, feedView, feedQ, feedEmp, byId]);

  const openFor = (ev: ActivityEvent) => {
    const offer = ev.refs.find(r => s.offers.some(o => o.id === r));
    if (offer) return openDrawer("offer", offer);
    const cand = ev.refs.find(r => CANDIDATE_BY_ID[r]);
    if (cand) return openDrawer("candidate", cand, { from: "hq" });
    const vac = ev.refs.find(r => allVacancies(s).some(v => v.id === r));
    if (vac) return openDrawer("vacancy", vac);
    const emp = ev.refs.find(r => EMPLOYER_BY_ID[r]);
    if (emp) return openDrawer("employer", emp);
  };
  const canOpen = (ev: ActivityEvent) => ev.refs.some(r => CANDIDATE_BY_ID[r] || EMPLOYER_BY_ID[r] || s.offers.some(o => o.id === r) || allVacancies(s).some(v => v.id === r));

  const ticketState = (id: string) => s.activity.find(ev => ev.refs[0] === id && ev.title === "Support ticket resolved");
  const resolve = (t: typeof SUPPORT_TICKETS[number]) => {
    const emp = EMPLOYER_BY_ID[t.employerId];
    logActivity({ category: /invoice/i.test(t.subject) ? "financial" : "hiring", actor: ACTOR, title: "Support ticket resolved", refs: [t.id, t.employerId],
      detail: (emp?.name || "An employer") + ": " + t.subject + ". Closed by " + ACTOR + " (owner " + t.owner + ")." });
    notify("Ticket closed for " + (emp?.short || "the employer"));
  };

  const hiring = rows.filter(r => r.open > 0).length;
  const liveOffers = s.offers.filter(o => !["declined", "withdrawn", "accepted"].includes(o.status)).length;
  const scheduled = s.interviews.filter(i => i.status === "scheduled").length;
  const advanced = s.pipeline.filter(p => p.stage !== "identified").length;
  const openTickets = SUPPORT_TICKETS.filter(t => !ticketState(t.id)).length;

  const cols: Col<HireRow>[] = [
    { key: "emp", label: "Employer", width: "minmax(220px, 2fr)", render: r => (
      <div className="rc-row" style={{ gap: 10 }}>
        <Avatar initials={r.e.initials} tint={r.e.tint} size={30} square />
        <div className="rc-grow">
          <div className="rc-ellipsis" style={{ fontWeight: 500, color: "var(--ink)" }}>{r.e.name}</div>
          <div className="rc-ellipsis" style={{ fontSize: 11.5, color: "var(--faint)", marginTop: 2 }}>{r.e.contact}, {r.e.contactRole}</div>
        </div>
      </div>
    ) },
    { key: "open", label: "Open roles", width: "92px", align: "right", render: r => <span style={{ fontVariantNumeric: "tabular-nums", color: "var(--ink)" }}>{r.open}</span> },
    { key: "pipe", label: "Pipeline by stage", width: "minmax(190px, 1.6fr)", render: r => r.entries ? (
      <div>
        <StackBar parts={STAGES.map((st, i) => ({ label: st.label, value: r.byStage[i], color: STAGE_COLORS[i] }))} height={8} />
        <div style={{ fontSize: 11, color: "var(--faint)", marginTop: 5 }}>
          {r.entries} {r.entries === 1 ? "entry" : "entries"}{r.byStage[4] ? ", " + r.byStage[4] + " at offer" : r.byStage[3] ? ", " + r.byStage[3] + " at interview" : ""}
        </div>
      </div>
    ) : <span style={{ fontSize: 12, color: "var(--faint)" }}>No sample entries</span> },
    { key: "iv", label: "Interviews", width: "92px", align: "right", render: r => <span style={{ fontVariantNumeric: "tabular-nums" }}>{r.interviews}</span> },
    { key: "offers", label: "Offers", width: "92px", align: "right", render: r => (
      <span style={{ fontVariantNumeric: "tabular-nums", color: r.offersLive ? "var(--accent)" : "var(--body)" }}>{r.offersLive}<span style={{ color: "var(--faint)" }}> / {r.offersAll}</span></span>
    ) },
    { key: "placed", label: "Placements", width: "94px", align: "right", render: r => <span style={{ fontVariantNumeric: "tabular-nums" }}>{r.placements}</span> },
    { key: "last", label: "Latest activity", width: "minmax(170px, 1.5fr)", render: r => r.last ? (
      <div style={{ minWidth: 0 }}>
        <div className="rc-ellipsis" style={{ fontSize: 12.5, color: "var(--ink)" }}>{r.last.title}</div>
        <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--faint)", marginTop: 3 }}>{r.last.when}</div>
      </div>
    ) : <span style={{ fontSize: 12, color: "var(--faint)" }}>Nothing logged yet</span> },
  ];

  return (
    <Page wide eyebrow="RECRUIT HQ · EMPLOYERS" title="Employer hiring activity"
      sub="Roles, pipelines, offers and placements for every sample account, with the live hiring feed and open support tickets."
      actions={<>
        <Button icon="hiring" onClick={() => nav.go("hq.roles", "pipelines")}>Pipelines</Button>
        <Button variant="primary" icon="activity" onClick={() => nav.go("Activity", "hiring")}>Full activity log</Button>
      </>}>

      <Grid cols="rc-g4">
        <Stat icon="employer" tone="accent" label="Employers hiring (sample)" value={hiring + " of " + rows.length} sub="with at least one open role" onClick={() => nav.go("hq.roles", "vacancies")} />
        <Stat icon="hiring" tone="teal" label="Pipeline entries" value={num(s.pipeline.length)} sub={advanced + " past the identified stage"} onClick={() => nav.go("hq.roles", "pipelines")} />
        <Stat icon="offers" label="Offers in play" value={String(liveOffers)} sub={"of " + s.offers.length + " offers in the sample"} onClick={() => nav.go("hq.roles", "offers")} />
        <Stat icon="calendar" label="Interviews scheduled" value={String(scheduled)} sub={s.interviews.length - scheduled + " already held"} />
      </Grid>

      <Section title="Hiring by account" sub="Sample pipeline entries by stage. Select an account for its full record."
        action={
          <div className="rc-row rc-wrap rc-hide-sm" style={{ gap: 12 }}>
            {STAGES.map((st, i) => (
              <span key={st.id} className="rc-row" style={{ gap: 6, fontSize: 11, color: "var(--dim)" }}>
                <span style={{ width: 8, height: 8, borderRadius: 3, background: STAGE_COLORS[i] }} />{st.label}
              </span>
            ))}
          </div>
        }>
        <Table cols={cols} rows={rows} onRow={r => openDrawer("employer", r.e.id)} dense
          caption={"Sample of " + rows.length + " accounts. Pipeline entries are the sample records; each vacancy's marketplace matches are larger."} />
      </Section>

      <Grid cols="rc-g-3-2">
        <Card title="Hiring feed" sub={feed.length + " events from the shared activity log"}
          action={<Segmented size="sm" value={feedView} onChange={v => { setFeedView(v); setLimit(12); }}
            options={[{ id: "hiring", label: "Hiring" }, { id: "financial", label: "Financial" }, { id: "all", label: "Both" }]} />}>
          <div className="rc-grid rc-g2" style={{ gap: 10, marginBottom: 8 }}>
            <div style={{ position: "relative", minWidth: 0 }}>
              <span style={{ position: "absolute", left: 13, top: 0, bottom: 0, display: "flex", alignItems: "center", color: "var(--faint)", pointerEvents: "none" }}><Icon name="search" size={14} /></span>
              <TextInput value={feedQ} onChange={e => { setFeedQ(e.target.value); setLimit(12); }} placeholder="Search the feed" style={{ paddingLeft: 36 }} />
            </div>
            <Select value={feedEmp} onChange={v => { setFeedEmp(v); setLimit(12); }}
              options={[{ value: "all", label: "All employers" }, ...EMPLOYERS.map(e => ({ value: e.id, label: e.name }))]} />
          </div>
          {feed.slice(0, limit).map(ev => (
            <ListRow key={ev.id} title={ev.title} sub={ev.detail} meta={ev.when} dot={DOT[ev.status || "completed"]}
              onClick={canOpen(ev) ? () => openFor(ev) : undefined} />
          ))}
          {!feed.length && <Empty icon="search" title="No events match" body="Try another search, employer or feed." />}
          {feed.length > limit && (
            <div style={{ marginTop: 8 }}>
              <Button size="sm" variant="ghost" icon="plus" onClick={() => setLimit(l => l + 12)}>Show {Math.min(12, feed.length - limit)} more</Button>
            </div>
          )}
        </Card>

        <Card title="Support tickets" sub={openTickets + " open of " + SUPPORT_TICKETS.length + ". Owned by Employer Success, Finance and Marketplace Operations."}>
          {SUPPORT_TICKETS.map((t, i) => {
            const emp = EMPLOYER_BY_ID[t.employerId];
            const done = ticketState(t.id);
            return (
              <div key={t.id} style={{ padding: "12px 0", borderTop: i ? "1px solid var(--border)" : 0, opacity: done ? 0.72 : 1 }}>
                <div className="rc-row" style={{ gap: 8, alignItems: "flex-start" }}>
                  <div className="rc-grow">
                    <div style={{ fontSize: 13, fontWeight: 500, color: "var(--ink)", lineHeight: 1.4 }}>{t.subject}</div>
                    <div className="rc-row rc-wrap" style={{ gap: 6, marginTop: 5, fontSize: 11.5, color: "var(--dim)" }}>
                      <button className="rc-link" onClick={() => openDrawer("employer", t.employerId)}>{emp?.name}</button>
                      <span>· {t.owner} · {t.age}</span>
                    </div>
                  </div>
                  <Badge tone={PRIORITY_TONE[t.priority] || "neutral"}>{t.priority}</Badge>
                </div>
                <div className="rc-row" style={{ gap: 8, marginTop: 9 }}>
                  <Badge tone={done ? "ok" : "neutral"} icon={done ? "check" : "clock"}>{done ? "Resolved " + done.when.toLowerCase() : t.status}</Badge>
                  <span className="rc-grow" />
                  {!done && <Button size="sm" icon="check" onClick={() => resolve(t)}>Mark resolved</Button>}
                </div>
              </div>
            );
          })}
        </Card>
      </Grid>
    </Page>
  );
}
