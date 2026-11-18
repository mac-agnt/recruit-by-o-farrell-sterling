import { useMemo, useState } from "react";
import { Avatar, Badge, Button, Card, Chip, Empty, Grid, Label, Note, Page, Stat, TextArea } from "../../ui";
import { BarList } from "../../charts";
import { Icon } from "../../icons";
import { useNav } from "../../nav";
import { logActivity, openDrawer, setActiveVacancy, update, useRecruit, vacancyById } from "../../store";
import { employerVacancies } from "../../selectors";
import { EMPLOYER_TEAM, STAGES } from "../../data";
import type { Interview } from "../../data/types";
import {
  DEMO_TODAY, FOCUS_OFFER, OUTCOMES, OfferEditorModal, PANEL_EXTRA, PersonAvatar, ScheduleInterviewModal, dayDiff, fmtDay,
  isLiveOffer, offerFor, parseWhen, relDay, teamMember, useOutcomes, who, type ScheduleChoice,
} from "./hiringKit";

/* Interviews across Harbourview's roles: what's coming up, who sits on each
   panel, and what each held round concluded. Notes stay with the employer. */

const FORMAT_ICON: Record<Interview["format"], string> = { "In person": "pin", Video: "play", Phone: "phone" };

export default function Interviews() {
  const s = useRecruit();
  const nav = useNav();
  const outcomes = useOutcomes();
  const [role, setRole] = useState<string>("all");
  const [scheduling, setScheduling] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [offerTarget, setOfferTarget] = useState<{ vacancyId: string; candidateId: string } | null>(null);

  const vacs = employerVacancies(s, s.employerId);
  const vacIds = new Set(vacs.map(v => v.id));
  const all = s.interviews.filter(i => vacIds.has(i.vacancyId)).map(i => ({ i, d: parseWhen(i.when) || DEMO_TODAY }));
  const shown = all.filter(x => role === "all" || x.i.vacancyId === role);
  const upcoming = shown.filter(x => x.i.status === "scheduled").sort((a, b) => a.d.getTime() - b.d.getTime());
  const held = shown.filter(x => x.i.status === "completed").sort((a, b) => b.d.getTime() - a.d.getTime());
  const thisWeek = all.filter(x => x.i.status === "scheduled" && dayDiff(x.d) >= -2 && dayDiff(x.d) <= 4).length;
  const panelNames = new Set(all.filter(x => x.i.status === "scheduled").flatMap(x => x.i.panel));

  const groups: { key: string; d: Date; items: typeof upcoming }[] = [];
  upcoming.forEach(x => {
    const key = fmtDay(x.d);
    const g = groups.find(gr => gr.key === key);
    if (g) g.items.push(x); else groups.push({ key, d: x.d, items: [x] });
  });

  const choices: ScheduleChoice[] = s.pipeline
    .filter(p => vacIds.has(p.vacancyId) && (p.stage === "shortlisted" || p.stage === "contact" || p.stage === "interview"))
    .map(p => {
      const v = vacancyById(p.vacancyId, s);
      const stage = STAGES.find(st => st.id === p.stage)?.label || p.stage;
      return { vacancyId: p.vacancyId, candidateId: p.candidateId, label: who(s, s.employerId, p.candidateId).name + " · " + (v?.title || "") + " (" + stage.toLowerCase() + ")" };
    });

  const markHeld = (iv: Interview) => {
    const p = who(s, s.employerId, iv.candidateId);
    const v = vacancyById(iv.vacancyId, s);
    update(st => ({ interviews: st.interviews.map(i => (i.id === iv.id ? { ...i, status: "completed" as const } : i)) }));
    logActivity({ category: "hiring", actor: "Rachel Moran", title: "Interview held", detail: p.name + ", " + (v?.title || "a role") + ", round " + iv.round + ". The panel is recording its outcome.", refs: [iv.candidateId, iv.vacancyId] });
    setEditing(iv.id);
    setDraft(outcomes[iv.id] || "");
  };
  const saveNote = (id: string) => {
    OUTCOMES.set(o => ({ ...o, [id]: draft.trim() }));
    setEditing(null);
  };
  const load = EMPLOYER_TEAM.map(m => m.name).concat([PANEL_EXTRA]).map(n => ({
    n, count: all.filter(x => x.i.status === "scheduled" && x.i.panel.includes(n)).length,
  }));
  const week = useMemo(() => {
    const start = new Date(DEMO_TODAY);
    start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
    return Array.from({ length: 10 }, (_, k) => {
      const d = new Date(start);
      d.setDate(start.getDate() + k + (k >= 5 ? 2 : 0));
      return d;
    });
  }, []);

  return (
    <Page wide eyebrow="HIRING" title="Interviews"
      sub="Every interview for Harbourview roles, grouped by day. Record what each round concluded while it is fresh."
      actions={<>
        <Button icon="hiring" onClick={() => nav.go("emp.hiring", "shortlists")}>Pipeline</Button>
        <Button variant="primary" icon="calendar" onClick={() => setScheduling(true)}>Schedule interview</Button>
      </>}>

      <Grid cols="rc-g4">
        <Stat icon="calendar" tone="accent" label="Upcoming" value={all.filter(x => x.i.status === "scheduled").length}
          sub={upcoming[0] ? "Next " + upcoming[0].i.when : "Nothing booked"} />
        <Stat icon="clock" label="This week" value={thisWeek} sub={"Week of " + fmtDay(week[0])} />
        <Stat icon="check" tone="ok" label="Rounds held" value={all.filter(x => x.i.status === "completed").length} sub="Outcomes recorded below" />
        <Stat icon="users" label="Panel members booked" value={panelNames.size} sub={"From a team of " + EMPLOYER_TEAM.length} />
      </Grid>

      <div className="rc-row rc-wrap" style={{ gap: 7 }}>
        <Chip active={role === "all"} onClick={() => setRole("all")}>All roles</Chip>
        {vacs.filter(v => all.some(x => x.i.vacancyId === v.id) || v.status === "open").map(v => (
          <Chip key={v.id} active={role === v.id} onClick={() => setRole(v.id)}>
            {v.title}<span style={{ color: "var(--faint)" }}>{all.filter(x => x.i.vacancyId === v.id).length}</span>
          </Chip>
        ))}
      </div>

      <Grid cols="rc-g-side-r">
        <div className="rc-col" style={{ gap: 14 }}>
          <Card title="Upcoming" sub={upcoming.length ? upcoming.length + " booked, earliest first" : undefined}>
            {groups.length ? groups.map((g, gi) => (
              <div key={g.key} style={{ marginTop: gi ? 18 : 0 }}>
                <div className="rc-row" style={{ gap: 8, marginBottom: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{g.key}</span>
                  <Badge tone={dayDiff(g.d) < 0 ? "warn" : dayDiff(g.d) <= 1 ? "accent" : "neutral"}>{dayDiff(g.d) < 0 ? "Outcome due" : relDay(g.d)}</Badge>
                </div>
                {g.items.map(({ i: iv }) => {
                  const p = who(s, s.employerId, iv.candidateId);
                  const v = vacancyById(iv.vacancyId, s);
                  return (
                    <div key={iv.id} className="rc-row rc-wrap" style={{ alignItems: "flex-start", gap: 14, padding: "12px 0", borderTop: "1px solid var(--border)" }}>
                      <div style={{ width: 54, flex: "none", fontFamily: "var(--mono)", fontSize: 15, fontWeight: 600, letterSpacing: "-.3px", paddingTop: 4, fontVariantNumeric: "tabular-nums" }}>{iv.when.split(", ")[1] || ""}</div>
                      <PersonAvatar c={p.c} hidden={p.hidden} size={36} />
                      <div className="rc-grow" style={{ minWidth: 220 }}>
                        <div className="rc-row rc-wrap" style={{ gap: 7 }}>
                          <span style={{ fontSize: 14, fontWeight: 500, color: "var(--ink)" }}>{p.name}</span>
                          <Badge tone="accent">Round {iv.round}</Badge>
                          <Badge icon={FORMAT_ICON[iv.format]}>{iv.format}</Badge>
                        </div>
                        <div style={{ fontSize: 12.5, color: "var(--dim)", marginTop: 3 }}>For {v?.title} · {p.c.title}, {p.c.currentOrgPublic}</div>
                        <PanelRow panel={iv.panel} />
                        <div className="rc-row rc-wrap" style={{ gap: 6, marginTop: 10 }}>
                          <Button size="sm" icon="candidate" onClick={() => openDrawer("candidate", iv.candidateId, { vacancyId: iv.vacancyId })}>Profile</Button>
                          <Button size="sm" icon="hiring" variant="ghost" onClick={() => { setActiveVacancy(iv.vacancyId); nav.go("emp.hiring", "shortlists"); }}>Pipeline</Button>
                          <Button size="sm" icon="check" variant="ghost" onClick={() => markHeld(iv)}>Mark as held</Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )) : (
              <Empty icon="calendar" title="No interviews booked" body="Book a round with anyone shortlisted or waiting to talk."
                action={<Button variant="primary" icon="calendar" onClick={() => setScheduling(true)}>Schedule interview</Button>} />
            )}
          </Card>

          <Card title="Held" sub="Outcome notes are for your team. Candidates never see them.">
            {held.length ? held.map(({ i: iv }, k) => {
              const p = who(s, s.employerId, iv.candidateId);
              const v = vacancyById(iv.vacancyId, s);
              const offer = offerFor(s, s.employerId, iv.vacancyId, iv.candidateId);
              const entry = s.pipeline.find(e => e.vacancyId === iv.vacancyId && e.candidateId === iv.candidateId);
              const note = outcomes[iv.id];
              return (
                <div key={iv.id} style={{ padding: "13px 0", borderTop: k ? "1px solid var(--border)" : 0 }}>
                  <div className="rc-row rc-wrap" style={{ gap: 11 }}>
                    <PersonAvatar c={p.c} hidden={p.hidden} size={32} />
                    <div className="rc-grow" style={{ minWidth: 200 }}>
                      <div style={{ fontSize: 13.5, fontWeight: 500 }}>{p.name}</div>
                      <div style={{ fontSize: 12, color: "var(--dim)", marginTop: 2 }}>{v?.title} · round {iv.round} · {iv.when} · {iv.format.toLowerCase()}</div>
                    </div>
                    {offer && isLiveOffer(offer)
                      ? <Button size="sm" icon="offers" onClick={() => { FOCUS_OFFER.set(offer.id); nav.go("emp.hiring", "offers"); }}>Open offer</Button>
                      : entry && (entry.stage === "interview" || entry.stage === "contact" || entry.stage === "shortlisted")
                        ? <Button size="sm" variant="primary" icon="plus" onClick={() => setOfferTarget({ vacancyId: iv.vacancyId, candidateId: iv.candidateId })}>Make an offer</Button>
                        : null}
                  </div>
                  {editing === iv.id ? (
                    <div className="rc-col" style={{ gap: 8, marginTop: 10, marginLeft: 43 }}>
                      <TextArea value={draft} onChange={e => setDraft(e.target.value)} placeholder="What did the panel conclude? Strengths, concerns, next step." autoFocus />
                      <div className="rc-row" style={{ gap: 8 }}>
                        <Button size="sm" variant="primary" icon="check" disabled={!draft.trim()} onClick={() => saveNote(iv.id)}>Save note</Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
                      </div>
                    </div>
                  ) : (
                    <div className="rc-row" style={{ alignItems: "flex-start", gap: 10, marginTop: 9, marginLeft: 43 }}>
                      <div className="rc-grow" style={{ fontSize: 12.5, lineHeight: 1.55, color: note ? "var(--body)" : "var(--faint)", padding: "9px 12px", borderRadius: "var(--r-sm, 12px)", background: "var(--surface-faint)", border: "1px solid var(--border)" }}>
                        {note || "No outcome recorded yet."}
                      </div>
                      <Button size="sm" variant="ghost" icon="edit" onClick={() => { setEditing(iv.id); setDraft(note || ""); }}>{note ? "Edit" : "Add note"}</Button>
                    </div>
                  )}
                </div>
              );
            }) : (
              <div style={{ fontSize: 12.5, color: "var(--dim)" }}>No rounds held for this role yet.</div>
            )}
          </Card>
        </div>

        <div className="rc-col" style={{ gap: 14 }}>
          <Card title="Two weeks at a glance" sub="Booked rounds by day">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5, minmax(0, 1fr))", gap: 6 }}>
              {week.map(d => {
                const n = all.filter(x => x.i.status === "scheduled" && fmtDay(x.d) === fmtDay(d)).length;
                const today = dayDiff(d) === 0;
                return (
                  <div key={d.toISOString()} title={fmtDay(d) + ": " + n + (n === 1 ? " interview" : " interviews")}
                    style={{ padding: "8px 6px", borderRadius: 12, textAlign: "center", background: n ? "var(--accent-faint)" : "var(--surface-faint)",
                      border: "1px solid " + (today ? "var(--accent-line)" : "var(--border)"), opacity: dayDiff(d) < 0 ? 0.55 : 1 }}>
                    <div style={{ fontFamily: "var(--mono)", fontSize: 9.5, color: "var(--faint)", letterSpacing: ".08em" }}>{fmtDay(d).slice(0, 3).toUpperCase()}</div>
                    <div style={{ fontSize: 15, fontWeight: 600, marginTop: 3, color: today ? "var(--accent)" : "var(--ink)" }}>{d.getDate()}</div>
                    <div style={{ display: "flex", justifyContent: "center", gap: 3, marginTop: 5, height: 6 }}>
                      {Array.from({ length: Math.min(3, n) }, (_, k) => <span key={k} style={{ width: 6, height: 6, borderRadius: 2, background: "var(--accent)" }} />)}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="rc-row" style={{ gap: 6, marginTop: 12, fontSize: 11.5, color: "var(--faint)" }}>
              <span style={{ width: 10, height: 10, borderRadius: 3, border: "1px solid var(--accent-line)" }} />Today, {fmtDay(DEMO_TODAY)}
            </div>
          </Card>
          <Card title="Panel load" sub="Upcoming interviews per person">
            <BarList max={Math.max(1, ...load.map(l => l.count))} items={load.map(l => {
              const m = teamMember(l.n);
              return { label: <span className="rc-row" style={{ gap: 7 }}>{m ? <Avatar initials={m.initials} tint={m.tint} size={20} /> : <span style={{ width: 20, display: "inline-flex", justifyContent: "center" }}><Icon name="users" size={13} /></span>}<span className="rc-ellipsis">{l.n}</span></span>, value: l.count, display: String(l.count) };
            })} />
          </Card>
          <Note icon="calendar">Calendar sync is planned. Bookings made here reach the candidate's portal and Recruit HQ at once.</Note>
        </div>
      </Grid>

      <ScheduleInterviewModal open={scheduling} onClose={() => setScheduling(false)} choices={choices} />
      <OfferEditorModal open={!!offerTarget} onClose={() => setOfferTarget(null)} vacancyId={offerTarget?.vacancyId} candidateId={offerTarget?.candidateId}
        onCreated={id => { FOCUS_OFFER.set(id); nav.go("emp.hiring", "offers"); }} />
    </Page>
  );
}

function PanelRow({ panel }: { panel: string[] }) {
  return (
    <div className="rc-row rc-wrap" style={{ gap: 6, marginTop: 9 }}>
      <Label style={{ marginRight: 2 }}>Panel</Label>
      {panel.map(n => {
        const m = teamMember(n);
        return (
          <span key={n} className="rc-row" style={{ gap: 6, height: 26, padding: "0 10px 0 3px", borderRadius: 999, background: "var(--surface-2)", border: "1px solid var(--border)", fontSize: 11.5, color: "var(--body)" }}>
            {m ? <Avatar initials={m.initials} tint={m.tint} size={20} /> : <span style={{ width: 20, display: "inline-flex", justifyContent: "center", color: "var(--dim)" }}><Icon name="users" size={11} /></span>}
            {n}
          </span>
        );
      })}
    </div>
  );
}
