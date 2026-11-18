import { useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { Badge, Button, Card, Empty, Label, Note, Page, Progress, Select, TextInput, Toggle, VerifyBadge } from "../../ui";
import { Icon } from "../../icons";
import { useNav } from "../../nav";
import { clearCompare, openDrawer, setActiveVacancy, toggleCompare, useRecruit, visibilityOf, type RecruitState } from "../../store";
import { candidate, searchableCandidates } from "../../selectors";
import { EMPLOYER_BY_ID, INDEX_MAX, type Candidate, type Vacancy } from "../../data";
import { matchScore, type Match } from "../../match";
import { eurK, num } from "../../format";
import {
  PersonAvatar, ScoreRing, ShortlistButton, SkillTag, VacancyPicker, budgetFit, contextVacancy, identity, interviewQuestions, kRange, lowerSkill,
  noticeText, requiredCoverage, toneVar, topReason,
} from "../../shared/talentKit";

/* Compare up to three professionals side by side against one role. Each row
   shows evidence; the strongest value on a row can be highlighted, and the
   columns can be ordered by one requirement. There is no overall winner and
   nobody is rejected: the decision stays with the hiring team. */

interface Col {
  c: Candidate; m: Match; who: ReturnType<typeof identity>; cov: ReturnType<typeof requiredCoverage>;
  fit: ReturnType<typeof budgetFit>; showSalary: boolean; qs: string[]; verifiedQuals: number; sectorRoles: number;
}
interface Row { key: string; label: string; hint?: string; focus?: string[]; best?: (cols: Col[]) => string[]; cell: (col: Col) => ReactNode }

const LABEL_W = 196;
const COL_W = 236;
const mid = (r: readonly number[]) => (r[0] + r[1]) / 2;
const bestBy = (cols: Col[], f: (c: Col) => number) => {
  if (cols.length < 2) return [];
  const top = Math.max(...cols.map(f));
  const winners = cols.filter(c => f(c) === top);
  return winners.length === cols.length ? [] : winners.map(c => c.c.id);
};

export default function Compare() {
  const s = useRecruit();
  const nav = useNav();
  const employerId = s.employerId;
  const v = contextVacancy(s, employerId);
  const [focusRaw, setFocus] = useState("alignment");
  const [highlight, setHighlight] = useState(true);
  const [orderByFocus, setOrderByFocus] = useState(true);
  const sectorRx = (EMPLOYER_BY_ID[employerId]?.industry || "Hospitality") === "Hospitality" ? /hotel|resort|lodge|castle|spa/i : /./;

  const cols: Col[] = useMemo(() => {
    if (!v) return [];
    return s.compare.map(id => {
      const c = candidate(s, id);
      const m = matchScore(c, v);
      return {
        c, m, who: identity(s, employerId, c), cov: requiredCoverage(c, v), fit: budgetFit(c.salaryExpectation, v.salary),
        showSalary: visibilityOf(c.id, s).showSalary, qs: interviewQuestions(c, v, m),
        verifiedQuals: c.qualifications.filter(q => q.verification === "verified").length,
        sectorRoles: c.experience.filter(x => sectorRx.test(x.orgPublic)).length,
      };
    });
  }, [s, v, employerId]);

  if (!v) {
    return (
      <Page eyebrow="TALENT MARKETPLACE" title="Compare professionals">
        <Card><Empty icon="vacancies" title="Open a role to compare against" body="Comparison is always against a role's requirements. Create a vacancy or reopen a paused one."
          action={<Button variant="primary" icon="plus" onClick={() => nav.go("emp.vacancies", "create")}>Create vacancy</Button>} /></Card>
      </Page>
    );
  }

  const focusValue = (key: string, col: Col): { value: number; text: string; sub?: string; tone?: string } => {
    if (key.startsWith("skill:")) {
      const name = key.slice(6);
      const sk = col.c.skills.find(x => x.name.toLowerCase() === name.toLowerCase());
      if (!sk) {
        const t = col.c.transferable.find(x => x.toLowerCase().includes(name.toLowerCase().split(" ")[0]));
        return { value: t ? 15 : 0, text: t ? "Transferable evidence" : "No direct evidence", sub: t ? t : "Worth exploring at interview", tone: "var(--faint)" };
      }
      return { value: sk.level + (sk.verification === "verified" ? 5 : 0), text: sk.level + " of 100", sub: sk.verification === "verified" ? "Verified" : sk.verification === "pending" ? "Verification pending" : "Self-reported",
        tone: sk.verification === "verified" ? "var(--teal, var(--ok))" : "var(--accent)" };
    }
    if (key === "salary") return { value: col.fit.rank * 1e6 - Math.abs(mid(col.c.salaryExpectation) - mid(v.salary)), text: col.showSalary ? col.fit.label : "Shared on request", sub: col.showSalary ? kRange(col.c.salaryExpectation) : undefined, tone: toneVar(col.fit.tone) };
    if (key === "notice") return { value: -col.c.noticeWeeks, text: noticeText(col.c.noticeWeeks), sub: col.c.availability };
    if (key === "leadership") return { value: col.c.teamSize, text: "Leads " + num(col.c.teamSize) + " people", sub: "Leadership evidence " + col.c.breakdown.leadership + " of " + INDEX_MAX.leadership };
    if (key === "evidence") return { value: col.c.verifiedCredentials, text: col.c.verifiedCredentials + " verified credentials", sub: "Profile " + col.c.completeness + "% complete" };
    if (key === "experience") return { value: col.c.years, text: col.c.years + " years", sub: v.minYears + " asked for" };
    return { value: col.m.score, text: col.m.score + "% alignment", sub: topReason(col.c, v, col.m) };
  };


  const focusOptions = [
    { value: "alignment", label: "Role alignment" },
    { value: "salary", label: "Salary fit with the budget" },
    { value: "notice", label: "Notice period" },
    { value: "leadership", label: "Leadership scale" },
    { value: "experience", label: "Years of experience" },
    { value: "evidence", label: "Verified evidence" },
  ].concat(v.required.map(r => ({ value: "skill:" + r, label: "Required: " + r })), v.preferred.map(r => ({ value: "skill:" + r, label: "Preferred: " + r })));
  /* A skill focus from another role falls back to alignment when the role changes. */
  const focus = focusOptions.some(o => o.value === focusRaw) ? focusRaw : "alignment";
  const ordered = orderByFocus ? cols.slice().sort((a, b) => focusValue(focus, b).value - focusValue(focus, a).value) : cols;
  const n = ordered.length;
  const slots = n + (n < 3 ? 1 : 0);
  const skillFocus = focus.startsWith("skill:") ? focus.slice(6) : null;

  const allExp = cols.flatMap(c => [c.c.salaryExpectation[0], c.c.salaryExpectation[1]]);
  const axis: [number, number] = [Math.min(v.salary[0], ...allExp) * 0.94, Math.max(v.salary[1], ...allExp) * 1.04];

  const rows: Row[] = [
    { key: "alignment", label: "Role alignment", hint: "Explainable match against " + v.title, focus: ["alignment"], best: cs => bestBy(cs, c => c.m.score),
      cell: col => (
        <div className="rc-row" style={{ gap: 12, alignItems: "flex-start" }}>
          <ScoreRing score={col.m.score} size={46} />
          <div style={{ fontSize: 12.5, color: "var(--body)", lineHeight: 1.5 }}>{topReason(col.c, v, col.m)}</div>
        </div>
      ) },
    { key: "experience", label: "Professional experience", focus: ["experience"], best: cs => bestBy(cs, c => c.c.years),
      cell: col => (
        <div>
          <Big>{col.c.years} years</Big>
          <div style={{ fontSize: 12.5, color: "var(--body)", marginTop: 4 }}>{col.c.title}</div>
          <div style={{ fontSize: 12, color: "var(--dim)", marginTop: 2 }}>{col.c.experience.length} roles on record. {v.minYears} years asked for.</div>
        </div>
      ) },
    { key: "sector", label: "Relevant sector experience", hint: "Hotel, resort and venue roles on record", best: cs => bestBy(cs, c => c.sectorRoles),
      cell: col => (
        <div>
          <Big>{col.sectorRoles} of {col.c.experience.length}</Big>
          <div style={{ fontSize: 12, color: "var(--dim)", marginTop: 2 }}>{col.c.industry}, {col.c.sector.toLowerCase()}</div>
          <div className="rc-col" style={{ gap: 3, marginTop: 7 }}>
            {col.c.experience.slice(0, 3).map((x, i) => <span key={i} className="rc-ellipsis" style={{ fontSize: 11.5, color: "var(--body)" }}>{x.orgPublic}</span>)}
          </div>
        </div>
      ) },
    { key: "leadership", label: "Leadership experience", hint: "Largest team led", focus: ["leadership"], best: cs => bestBy(cs, c => c.c.teamSize),
      cell: col => (
        <div>
          <Big>{col.c.teamSize ? "Leads " + num(col.c.teamSize) : "No direct reports"}</Big>
          <div style={{ fontSize: 12, color: "var(--dim)", marginTop: 4 }}>Leadership evidence {col.c.breakdown.leadership} of {INDEX_MAX.leadership}</div>
          <Progress value={col.c.breakdown.leadership} max={INDEX_MAX.leadership} height={4} style={{ marginTop: 7 }} />
        </div>
      ) },
    { key: "salary", label: "Salary expectation", hint: "Against the " + kRange(v.salary) + " budget", focus: ["salary"],
      best: cs => { const w = cs.filter(c => c.showSalary && c.fit.rank === 2); return cs.length > 1 && w.length && w.length < cs.length ? w.map(c => c.c.id) : []; },
      cell: col => col.showSalary ? (
        <div>
          <Big>{kRange(col.c.salaryExpectation)}</Big>
          <div style={{ fontSize: 12, color: toneVar(col.fit.tone), marginTop: 4 }}>{col.fit.label}</div>
          <SalaryBar exp={col.c.salaryExpectation} budget={v.salary} axis={axis} tone={toneVar(col.fit.tone)} />
          <div style={{ fontSize: 10.5, color: "var(--faint)", marginTop: 2 }}>Dashed band: role budget. Illustrative.</div>
        </div>
      ) : <div style={{ fontSize: 12.5, color: "var(--dim)" }}>The professional shares salary after an introduction.</div> },
    { key: "notice", label: "Availability and notice", focus: ["notice"], best: cs => bestBy(cs, c => -c.c.noticeWeeks),
      cell: col => (
        <div>
          <Big>{noticeText(col.c.noticeWeeks)}</Big>
          <div style={{ fontSize: 12, color: "var(--dim)", marginTop: 4 }}>{col.c.availability}. Earliest start about {col.c.noticeWeeks} weeks after an accepted offer.</div>
        </div>
      ) },
    { key: "quals", label: "Verified qualifications", best: cs => bestBy(cs, c => c.verifiedQuals),
      cell: col => (
        <div>
          <div style={{ fontSize: 12.5, color: "var(--dim)", marginBottom: 7 }}>{col.verifiedQuals} of {col.c.qualifications.length} verified</div>
          <div className="rc-col" style={{ gap: 7 }}>
            {col.c.qualifications.map(q => (
              <div key={q.name} className="rc-row" style={{ gap: 8, alignItems: "flex-start" }}>
                <span className="rc-grow" style={{ fontSize: 12, color: "var(--body)", lineHeight: 1.4 }}>{q.name}</span>
                <VerifyBadge status={q.verification} compact />
              </div>
            ))}
          </div>
        </div>
      ) },
    { key: "skills", label: "Relevant skills", hint: v.required.length + " required for this role", focus: v.required.concat(v.preferred).map(x => "skill:" + x), best: cs => bestBy(cs, c => c.cov.matched.length * 10 + c.cov.verified.length),
      cell: col => (
        <div>
          <div style={{ fontSize: 12.5, color: "var(--dim)", marginBottom: 8 }}>{col.cov.matched.length} of {col.cov.total} required evidenced{col.cov.matched.length ? ", " + col.cov.verified.length + " verified" : ""}</div>
          <div className="rc-row rc-wrap" style={{ gap: 5 }}>
            {v.required.map(r => <SkillTag key={r} name={r} hit={col.cov.matched.includes(r)} verified={col.cov.verified.includes(r)} missing={!col.cov.matched.includes(r)} />)}
          </div>
          {v.preferred.some(p => col.c.skills.some(x => x.name === p)) && (
            <div style={{ fontSize: 11.5, color: "var(--dim)", marginTop: 8 }}>Also evidences {v.preferred.filter(p => col.c.skills.some(x => x.name === p)).map(lowerSkill).join(", ")}</div>
          )}
        </div>
      ) },
    { key: "evidence", label: "Profile evidence", focus: ["evidence"], best: cs => bestBy(cs, c => c.c.verifiedCredentials),
      cell: col => (
        <div>
          <Big>{col.c.verifiedCredentials} verified credentials</Big>
          <div style={{ fontSize: 12, color: "var(--dim)", marginTop: 4 }}>Profile {col.c.completeness}% complete. Recruit Index {num(col.c.recruitIndex)}.</div>
          <Progress value={col.c.completeness} height={4} tone="teal" style={{ marginTop: 7 }} />
        </div>
      ) },
    { key: "considerations", label: "Areas requiring judgement",
      cell: col => col.m.considerations.length ? (
        <div className="rc-col" style={{ gap: 6 }}>
          {col.m.considerations.map((x, i) => (
            <div key={i} className="rc-row" style={{ gap: 7, alignItems: "flex-start", fontSize: 12, lineHeight: 1.45, color: "var(--body)" }}>
              <span style={{ color: "var(--warn)", marginTop: 1, display: "flex" }}><Icon name="info" size={12} /></span>{x}
            </div>
          ))}
        </div>
      ) : <div style={{ fontSize: 12, color: "var(--dim)" }}>No specific gaps against the stated requirements.</div> },
    { key: "questions", label: "Potential interview questions", hint: "Drafted from each profile's gaps",
      cell: col => (
        <ol style={{ margin: 0, paddingLeft: 16, display: "flex", flexDirection: "column", gap: 7 }}>
          {col.qs.map((q, i) => <li key={i} style={{ fontSize: 12, lineHeight: 1.5, color: "var(--body)" }}>{q}</li>)}
        </ol>
      ) },
  ];
  const focusRow = rows.find(r => r.focus?.includes(focus));

  return (
    <Page wide eyebrow="TALENT MARKETPLACE" title="Compare professionals"
      sub="Up to three people, side by side against one role. Highlights mark the strongest evidence on each row; they do not pick a winner or rule anyone out."
      actions={<>
        <Button icon="discover" onClick={() => nav.go("emp.talent", "discover")}>Discover talent</Button>
        {n > 0 && <Button variant="ghost" icon="x" onClick={clearCompare}>Clear compare</Button>}
      </>}>

      <Card pad={18}>
        <div className="rc-row rc-wrap" style={{ gap: 16, alignItems: "flex-end" }}>
          <VacancyPicker s={s} employerId={employerId} value={v.id} onChange={id => setActiveVacancy(id)} label="Comparing against" style={{ flex: "1 1 260px" }} />
          <div style={{ display: "flex", flexDirection: "column", gap: 6, flex: "1 1 260px", minWidth: 220 }}>
            <Label>Focus requirement</Label>
            <Select value={focus} onChange={setFocus} options={focusOptions} />
          </div>
          <div className="rc-col" style={{ gap: 10, flex: "1 1 260px", minWidth: 240, paddingBottom: 2 }}>
            <Toggle on={orderByFocus} onChange={setOrderByFocus} label="Order columns by the focus requirement" />
            <Toggle on={highlight} onChange={setHighlight} label="Highlight the strongest evidence on each row" />
          </div>
        </div>
      </Card>

      {n === 0 ? (
        <Card pad={0}>
          <Empty icon="compare" title="Nobody in compare yet" body={"Add up to three professionals to see them side by side against " + v.title + ". You can also add people from Discover or Saved candidates."} />
          <div style={{ borderTop: "1px solid var(--border)" }}><Picker s={s} employerId={employerId} v={v} wide /></div>
        </Card>
      ) : (
        <Card pad={0} style={{ overflow: "hidden" }}>
          <div className="rc-scroll-x">
            <div style={{ display: "grid", gridTemplateColumns: LABEL_W + "px repeat(" + slots + ", minmax(" + COL_W + "px, 1fr))", minWidth: LABEL_W + slots * COL_W }}>
              {/* Header row */}
              <Cell row={1} col={1} style={{ background: "var(--surface-faint)", display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
                <Label>Professional</Label>
                <div style={{ fontSize: 12, color: "var(--dim)", marginTop: 6, lineHeight: 1.45 }}>{n} of 3 selected</div>
              </Cell>
              {ordered.map((col, i) => (
                <Cell key={col.c.id} row={1} col={i + 2} style={{ background: "var(--surface-faint)", borderLeft: "1px solid var(--border)" }}>
                  <ColumnHead s={s} col={col} v={v} focusText={focus !== "alignment" ? focusValue(focus, col) : null} />
                </Cell>
              ))}

              {/* Focus row for a single skill */}
              {skillFocus && (
                <>
                  <Cell row={2} col={1} style={{ borderTop: "1px solid var(--border)", background: "var(--accent-faint)" }}>
                    <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--accent)" }}>Focus: {skillFocus}</div>
                    <div style={{ fontSize: 11.5, color: "var(--dim)", marginTop: 3 }}>Skill level and evidence</div>
                  </Cell>
                  {ordered.map((col, i) => {
                    const fv = focusValue(focus, col);
                    const top = highlight && bestBy(ordered, c => focusValue(focus, c).value).includes(col.c.id);
                    return (
                      <Cell key={col.c.id} row={2} col={i + 2} best={top} style={{ borderTop: "1px solid var(--border)", borderLeft: "1px solid var(--border)", ...(top ? {} : { background: "var(--accent-faint)" }) }}>
                        <Big>{fv.text}</Big>
                        {fv.sub && <div style={{ fontSize: 12, color: fv.tone || "var(--dim)", marginTop: 4 }}>{fv.sub}</div>}
                        <Progress value={Math.max(0, fv.value - (fv.sub === "Verified" ? 5 : 0))} height={4} tone={fv.sub === "Verified" ? "teal" : "accent"} style={{ marginTop: 8 }} />
                      </Cell>
                    );
                  })}
                </>
              )}

              {rows.map((r, ri) => {
                const row = ri + (skillFocus ? 3 : 2);
                const winners = highlight && r.best ? r.best(ordered) : [];
                const focused = focusRow?.key === r.key;
                return (
                  <RowCells key={r.key}>
                    <Cell row={row} col={1} style={{ borderTop: "1px solid var(--border)" }}>
                      <div style={{ fontSize: 12.5, fontWeight: 600, color: focused ? "var(--accent)" : "var(--ink)" }}>{r.label}</div>
                      {r.hint && <div style={{ fontSize: 11.5, color: "var(--dim)", marginTop: 3, lineHeight: 1.45 }}>{r.hint}</div>}
                      {focused && <div style={{ marginTop: 7 }}><Badge tone="accent" icon="target">Focus</Badge></div>}
                    </Cell>
                    {ordered.map((col, i) => (
                      <Cell key={col.c.id} row={row} col={i + 2} best={winners.includes(col.c.id)} style={{ borderTop: "1px solid var(--border)", borderLeft: "1px solid var(--border)" }}>
                        {r.cell(col)}
                      </Cell>
                    ))}
                  </RowCells>
                );
              })}

              {n < 3 && (
                <div style={{ gridColumn: n + 2, gridRow: "1 / span " + (rows.length + (skillFocus ? 2 : 1)), borderLeft: "1px dashed var(--border-strong)", background: "var(--surface-faint)", minWidth: 0 }}>
                  <Picker s={s} employerId={employerId} v={v} />
                </div>
              )}
            </div>
          </div>
        </Card>
      )}

      <Note icon="shield">
        Compare shows evidence, not a verdict. Highlights mark the strongest value on a single row and switch off when everyone is level. Hiring decisions, and the reasons for them, stay with Harbourview's team.
      </Note>
    </Page>
  );
}

/* ── pieces ─────────────────────────────────────────────────────────────── */

const RowCells = ({ children }: { children: ReactNode }) => <>{children}</>;

const Big = ({ children }: { children: ReactNode }) => <div style={{ fontSize: 15, fontWeight: 600, letterSpacing: "-.3px", color: "var(--ink)", lineHeight: 1.25 }}>{children}</div>;

function Cell({ row, col, best, style, children }: { row: number; col: number; best?: boolean; style?: CSSProperties; children: ReactNode }) {
  return (
    <div style={{ gridRow: row, gridColumn: col, padding: "15px 16px", minWidth: 0, position: "relative",
      background: best ? "color-mix(in oklab, var(--teal, var(--ok)) 8%, transparent)" : undefined, transition: "background .3s var(--ease)", ...style }}>
      {best && (
        <div className="rc-row" style={{ gap: 5, marginBottom: 8, fontFamily: "var(--mono)", fontSize: 9, letterSpacing: ".12em", textTransform: "uppercase", color: "var(--teal, var(--ok))" }}>
          <Icon name="check" size={10} stroke={2.6} />Strongest here
        </div>
      )}
      {children}
    </div>
  );
}

function ColumnHead({ s, col, v, focusText }: { s: RecruitState; col: Col; v: Vacancy; focusText: { text: string; sub?: string; tone?: string } | null }) {
  const { c, who } = col;
  return (
    <div className="rc-col" style={{ gap: 10, height: "100%" }}>
      <div className="rc-row" style={{ gap: 11, alignItems: "flex-start" }}>
        <PersonAvatar c={c} anon={who.anon} size={40} />
        <div className="rc-grow">
          <div className="rc-ellipsis" style={{ fontSize: 14.5, fontWeight: 600, letterSpacing: "-.2px", color: "var(--ink)" }}>{who.name}</div>
          <div className="rc-ellipsis" style={{ fontSize: 12, color: "var(--body)", marginTop: 2 }}>{c.title}</div>
          <div className="rc-ellipsis" style={{ fontSize: 11.5, color: "var(--dim)", marginTop: 2 }}>{who.place}</div>
        </div>
        <button onClick={() => toggleCompare(c.id)} aria-label="Remove from compare" title="Remove from compare" className="rc-btn rc-btn-secondary rc-focus"
          style={{ width: 26, height: 26, flex: "none", border: "1px solid var(--border)", borderRadius: 9, background: "none", color: "var(--dim)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }}>
          <Icon name="x" size={10} stroke={2.4} />
        </button>
      </div>
      {focusText && (
        <div style={{ fontSize: 11.5, color: "var(--dim)" }}>Focus: <span style={{ color: focusText.tone || "var(--ink)" }}>{focusText.text}</span></div>
      )}
      <div className="rc-row rc-wrap" style={{ gap: 6, marginTop: "auto" }}>
        <ShortlistButton s={s} vacancyId={v.id} candidateId={c.id} />
        <Button size="sm" variant="secondary" icon="eye" onClick={() => openDrawer("candidate", c.id, { vacancyId: v.id })}>Profile</Button>
      </div>
    </div>
  );
}

function SalaryBar({ exp, budget, axis, tone }: { exp: readonly number[]; budget: readonly number[]; axis: [number, number]; tone: string }) {
  const pos = (x: number) => ((x - axis[0]) / (axis[1] - axis[0])) * 100;
  return (
    <div style={{ position: "relative", height: 24, marginTop: 10 }}>
      <div style={{ position: "absolute", left: 0, right: 0, top: 10, height: 4, borderRadius: 99, background: "var(--track)" }} />
      <div title={"Role budget " + kRange(budget)} style={{ position: "absolute", top: 3, height: 18, left: pos(budget[0]) + "%", width: pos(budget[1]) - pos(budget[0]) + "%", borderRadius: 6, border: "1px dashed var(--accent-line)", background: "var(--accent-faint)" }} />
      <div title={"Expectation " + kRange(exp)} style={{ position: "absolute", top: 8, height: 8, left: pos(exp[0]) + "%", width: Math.max(2, pos(exp[1]) - pos(exp[0])) + "%", borderRadius: 99, background: tone }} />
    </div>
  );
}

/** Add people to compare, ranked by alignment with the role. */
function Picker({ s, employerId, v, wide }: { s: RecruitState; employerId: string; v: Vacancy; wide?: boolean }) {
  const nav = useNav();
  const [q, setQ] = useState("");
  const words = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const options = searchableCandidates(s, employerId).filter(c => !s.compare.includes(c.id))
    .filter(c => !words.length || words.every(w => [c.title, c.skills.map(x => x.name).join(" "), c.preferredRoles.join(" ")].join(" ").toLowerCase().includes(w)))
    .map(c => ({ c, score: matchScore(c, v).score })).sort((a, b) => b.score - a.score).slice(0, wide ? 8 : 6);
  const free = 3 - s.compare.length;
  return (
    <div style={{ padding: wide ? "18px 22px 22px" : 16 }}>
      <div className="rc-row" style={{ gap: 8 }}>
        <span style={{ width: 26, height: 26, borderRadius: 9, background: "var(--accent-soft)", color: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="plus" size={13} stroke={2.2} /></span>
        <span style={{ fontSize: 13.5, fontWeight: 600 }}>Add a professional</span>
      </div>
      <div style={{ fontSize: 12, color: "var(--dim)", marginTop: 6, lineHeight: 1.45 }}>{free} {free === 1 ? "place" : "places"} free. Ranked by alignment with {v.title}.</div>
      <TextInput value={q} onChange={e => setQ(e.target.value)} placeholder="Filter by title or skill" style={{ marginTop: 12, height: 36, fontSize: 12.5 }} />
      <div className={wide ? "rc-grid rc-g2" : "rc-col"} style={{ gap: wide ? 8 : 4, marginTop: 10 }}>
        {options.map(({ c, score }) => {
          const who = identity(s, employerId, c);
          return (
            <div key={c.id} className="rc-row rc-rowhover" onClick={() => toggleCompare(c.id)} style={{ gap: 10, padding: "8px 8px", margin: wide ? 0 : "0 -8px", borderRadius: 10 }}>
              <PersonAvatar c={c} anon={who.anon} size={30} />
              <div className="rc-grow">
                <div className="rc-ellipsis" style={{ fontSize: 12.5, color: "var(--ink)" }}>{who.name}</div>
                <div className="rc-ellipsis" style={{ fontSize: 11, color: "var(--dim)", marginTop: 1 }}>{c.title}, {eurK(c.salaryExpectation[0])}+</div>
              </div>
              <Badge tone={score >= 85 ? "ok" : score >= 70 ? "accent" : score >= 55 ? "warn" : "neutral"}>{score}%</Badge>
              <span style={{ color: "var(--accent)", display: "flex" }}><Icon name="plus" size={13} stroke={2.2} /></span>
            </div>
          );
        })}
        {!options.length && <div style={{ fontSize: 12, color: "var(--faint)", padding: "6px 0" }}>No one matches that filter.</div>}
      </div>
      <button className="rc-link" style={{ fontSize: 12, marginTop: 12 }} onClick={() => nav.go("emp.talent", "discover")}>Browse everyone in Discover</button>
    </div>
  );
}
