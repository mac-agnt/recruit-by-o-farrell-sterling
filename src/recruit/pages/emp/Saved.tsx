import { useState } from "react";
import { Badge, Button, Card, Empty, Grid, Label, Note, Page, Segmented, TextArea } from "../../ui";
import { useNav } from "../../nav";
import { notify, openDrawer, pipelineFor, setActiveVacancy, toggleSavedCandidate, update, useRecruit, vacancyById, visibilityOf } from "../../store";
import { candidate } from "../../selectors";
import { matchScore } from "../../match";
import { num } from "../../format";
import {
  CompareButton, Fact, PersonAvatar, ScoreRing, ShortlistButton, VacancyPicker, budgetFit, contextVacancy, identity, kRange, lowerSkill, lowerWhen, noticeText, toneVar, topReason,
} from "../../shared/talentKit";

/* Saved candidates: a private bench of people worth another look, each with
   the team's notes. Shortlisting, comparing and removing all write to the
   shared store; notes stay on this page for the demo. */

type SortKey = "alignment" | "index" | "notice";

/* Notes live for the browser session. A few are seeded so the bench reads as in use. */
const NOTES: Record<string, string> = {
  "c-sarah": "Turnaround record fits the owners' brief. Confirm timing of a move from Cork.",
  "c-niamh": "Year-round resort operations. Ask about scale of P&L against a 240-room city hotel.",
  "c-priya": "Revenue Manager candidate. First interview Mon 23 Nov by video.",
};

export default function Saved() {
  const s = useRecruit();
  const nav = useNav();
  const employerId = s.employerId;
  const v = contextVacancy(s, employerId);
  const [sort, setSort] = useState<SortKey>("alignment");
  const [notes, setNotes] = useState<Record<string, string>>(() => ({ ...NOTES }));
  const writeNote = (id: string, text: string) => { NOTES[id] = text; setNotes(n => ({ ...n, [id]: text })); };

  const list = s.savedCandidates.map(id => {
    const c = candidate(s, id);
    return { c, m: v ? matchScore(c, v) : null, who: identity(s, employerId, c) };
  }).sort((a, b) => sort === "index" ? b.c.recruitIndex - a.c.recruitIndex
    : sort === "notice" ? a.c.noticeWeeks - b.c.noticeWeeks
    : (b.m?.score ?? 0) - (a.m?.score ?? 0));

  const inPipeline = list.filter(x => s.pipeline.some(p => p.candidateId === x.c.id && vacancyById(p.vacancyId, s)?.employerId === employerId)).length;
  const avg = list.length && v ? Math.round(list.reduce((t, x) => t + (x.m?.score ?? 0), 0) / list.length) : 0;
  const quickest = list.slice().sort((a, b) => a.c.noticeWeeks - b.c.noticeWeeks)[0];
  const strongest = list.slice().sort((a, b) => (b.m?.score ?? 0) - (a.m?.score ?? 0)).slice(0, 3);

  const compareSaved = () => {
    const ids = strongest.map(x => x.c.id);
    update(() => ({ compare: ids }));
    notify("Comparing " + ids.length + " saved " + (ids.length === 1 ? "profile" : "profiles"));
    nav.go("emp.talent", "compare");
  };

  return (
    <Page wide eyebrow="TALENT MARKETPLACE" title="Saved candidates"
      sub="People you have set aside for another look, with your team's notes. Shortlist them for a role or compare up to three side by side."
      actions={<>
        <Button icon="search" onClick={() => nav.go("emp.talent", "discover")}>Discover talent</Button>
        {list.length > 0 && <Button variant="primary" icon="compare" onClick={compareSaved}>Compare top {Math.min(3, list.length)}</Button>}
      </>}>

      <Card pad={18}>
        <div className="rc-row rc-wrap" style={{ gap: 18, alignItems: "flex-end" }}>
          <VacancyPicker s={s} employerId={employerId} value={v?.id} onChange={id => setActiveVacancy(id)} style={{ flex: "1 1 280px" }} />
          <Summary label="Saved" value={num(list.length)} />
          <Summary label="In a pipeline" value={num(inPipeline)} />
          <Summary label="Average alignment" value={v && list.length ? avg + "%" : "None"} />
          <Summary label="Shortest notice" value={quickest ? noticeText(quickest.c.noticeWeeks) : "None"} />
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <Label>Sort by</Label>
            <Segmented size="sm" value={sort} onChange={setSort} options={[{ id: "alignment", label: "Alignment" }, { id: "index", label: "Index" }, { id: "notice", label: "Notice" }]} />
          </div>
        </div>
      </Card>

      {list.length ? list.map(({ c, m, who }, i) => {
        const entry = v ? pipelineFor(v.id, c.id, s) : undefined;
        const vis = visibilityOf(c.id, s);
        const fit = v ? budgetFit(c.salaryExpectation, v.salary) : null;
        const note = notes[c.id] || "";
        return (
          <Card key={c.id} pad={0} className="rc-rise" style={{ animationDelay: Math.min(i, 6) * 40 + "ms" }}>
            <div className="rc-row rc-wrap" style={{ gap: 16, padding: "18px 20px 14px", alignItems: "flex-start" }}>
              <PersonAvatar c={c} anon={who.anon} size={46} />
              <div className="rc-grow" style={{ minWidth: 220 }}>
                <div className="rc-row rc-wrap" style={{ gap: 8 }}>
                  <button className="rc-link" onClick={() => openDrawer("candidate", c.id, v ? { vacancyId: v.id } : undefined)} style={{ fontSize: 16, fontWeight: 600, letterSpacing: "-.3px", color: "var(--ink)" }}>{who.name}</button>
                  {who.anon && <Badge tone="neutral" icon="eyeOff">Anonymous</Badge>}
                  {who.shared && <Badge tone="teal" icon="check">Contact shared</Badge>}
                </div>
                <div style={{ fontSize: 13, color: "var(--body)", marginTop: 3 }}>{c.title}, {c.years} years. {who.place}.</div>
                {m && v && <div style={{ fontSize: 12, color: "var(--dim)", marginTop: 4 }}>{topReason(c, v, m)}{m.considerations[0] ? ". Consider: " + lowerSkill(m.considerations[0]) : ""}</div>}
              </div>
              {m && <ScoreRing score={m.score} size={54} />}
            </div>

            <div className="rc-grid rc-g-3-2" style={{ gap: 16, padding: "0 20px 16px" }}>
              <div className="rc-grid rc-g2" style={{ gap: 14, alignContent: "start" }}>
                <Fact label="Salary expectation" value={vis.showSalary ? kRange(c.salaryExpectation) : "Shared on request"} sub={fit && vis.showSalary ? <span style={{ color: toneVar(fit.tone) }}>{fit.label}</span> : "Illustrative"} />
                <Fact label="Availability" value={c.availability} sub={noticeText(c.noticeWeeks)} />
                <Fact label="Recruit Index" value={num(c.recruitIndex)} sub={c.verifiedCredentials + " verified credentials"} />
                <Fact label={v ? "Pipeline for " + v.title : "Pipeline"} value={entry ? entry.stage.charAt(0).toUpperCase() + entry.stage.slice(1) : "Not in this pipeline"}
                  sub={entry ? "Updated " + lowerWhen(entry.updated) : "Shortlist to start"} />
              </div>
              <div>
                <div className="rc-row" style={{ marginBottom: 6 }}>
                  <Label>Team notes</Label>
                  <span style={{ marginLeft: "auto", fontSize: 10.5, color: "var(--faint)" }}>{note ? note.length + " characters" : "Private to your team"}</span>
                </div>
                <TextArea rows={3} value={note} onChange={e => writeNote(c.id, e.target.value)} placeholder="Why this person, and what to ask them" aria-label={"Notes on " + who.name} />
              </div>
            </div>

            <div className="rc-row rc-wrap" style={{ gap: 8, padding: "12px 20px", borderTop: "1px solid var(--border)" }}>
              <Button size="sm" variant="ghost" icon="trash" onClick={() => toggleSavedCandidate(c.id)}>Remove</Button>
              <span className="rc-grow" />
              <Button size="sm" variant="ghost" iconRight="arrowRight" onClick={() => openDrawer("candidate", c.id, v ? { vacancyId: v.id } : undefined)}>View profile</Button>
              <CompareButton s={s} id={c.id} />
              <ShortlistButton s={s} vacancyId={v?.id} candidateId={c.id} />
            </div>
          </Card>
        );
      }) : (
        <Card>
          <Empty icon="bookmark" title="No saved candidates yet" body="Save people from Discover talent to build a bench you can come back to, with notes for your team."
            action={<Button variant="primary" icon="search" onClick={() => nav.go("emp.talent", "discover")}>Discover talent</Button>} />
        </Card>
      )}

      {list.length > 0 && (
        <Grid cols="rc-g2">
          <Note icon="lock">Saving is private to Harbourview. The professional is not told, and contact details stay hidden until they accept an introduction.</Note>
          <Note icon="info">Notes stay in this browser session for the demo. Alignment follows the role selected above.</Note>
        </Grid>
      )}
    </Page>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ minWidth: 110 }}>
      <Label>{label}</Label>
      <div style={{ fontSize: 20, fontWeight: 600, letterSpacing: "-.6px", marginTop: 6, whiteSpace: "nowrap" }}>{value}</div>
    </div>
  );
}
