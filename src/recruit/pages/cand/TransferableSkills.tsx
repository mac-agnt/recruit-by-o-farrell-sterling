import { Fragment, useMemo, useState, type CSSProperties } from "react";
import { Badge, Button, Card, Chip, DemoTag, Grid, Label, Note, Page, Progress, Stat, VerifyBadge } from "../../ui";
import { Icon } from "../../icons";
import { useNav } from "../../nav";
import { updateProfile, useRecruit } from "../../store";
import { candidate } from "../../selectors";
import { CAREER_PATHS, type CareerPath } from "../../data";
import type { Candidate, Verification } from "../../data/types";
import { alignmentTone } from "../../match";
import { findEvidence, industriesOf, norm, skillStanding, skillValuedBy, translateSkill, type Bucket, type IndustryGroup } from "./explorerKit";

/* Career explorer, transferable skills. The same experience, read the way an
   employer in another industry would read it: a skills by industries matrix,
   the evidence behind each skill, and the words other sectors use for it. */

export default function TransferableSkills() {
  const s = useRecruit();
  return <SkillsView key={s.persona} />;
}

interface Row { name: string; kind: "transferable" | "skill"; level: number; verification: Verification; linked: string[] }
interface Cell { value: number; used: boolean; paths: CareerPath[] }

const SHORT: Record<Bucket, string> = { events: "Events", retail: "Retail", cx: "Customer experience", procurement: "Procurement", hotels: "Hotels", groups: "Hotel groups", investment: "Hotel investment" };

function buildRows(c: Candidate): Row[] {
  const rows: Row[] = c.transferable.map(t => ({ name: t, kind: "transferable" as const, ...skillStanding(c, t) }));
  const have = new Set(rows.map(r => norm(r.name)));
  const top = c.skills.filter(x => x.verification === "verified" && !have.has(norm(x.name)))
    .sort((a, b) => b.level - a.level).slice(0, rows.length >= 7 ? 3 : 4);
  return rows.concat(top.map(x => ({ name: x.name, kind: "skill" as const, level: x.level, verification: x.verification, linked: [x.name] })));
}

function cellFor(row: Row, g: IndustryGroup): Cell {
  const users = g.paths.filter(p => skillValuedBy(row.name, p));
  if (users.length) return { value: Math.round(0.5 * Math.max(...users.map(p => p.alignment)) + 0.5 * row.level), used: true, paths: users };
  if (!g.adjacent) return { value: Math.round(row.level * 0.72), used: false, paths: [] };
  if (translateSkill(row.name, g.bucket)) return { value: Math.round(row.level * 0.5), used: false, paths: [] };
  return { value: 0, used: false, paths: [] };
}

const band = (v: number) => (v >= 80 ? { label: "Strong", mix: 36 } : v >= 65 ? { label: "Good", mix: 20 } : v > 0 ? { label: "Some", mix: 8 } : { label: "Not used", mix: 0 });
const fill = (mix: number) => (mix ? "color-mix(in oklab, var(--teal, #16B8A6) " + mix + "%, var(--surface-2))" : "var(--surface-faint)");

function SkillsView() {
  const s = useRecruit();
  const nav = useNav();
  const c = candidate(s, s.persona);
  const paths = CAREER_PATHS[c.id] || [];
  const inds = useMemo(() => industriesOf(paths), [paths]);
  const rows = useMemo(() => buildRows(c), [c]);
  const cells = useMemo(() => rows.map(r => inds.map(g => cellFor(r, g))), [rows, inds]);
  const [sel, setSel] = useState(rows[0]?.name || "");
  const [ind, setInd] = useState(inds.find(g => g.adjacent)?.name || inds[0]?.name || "");
  const [hoverCol, setHoverCol] = useState<string | null>(null);

  const ri = Math.max(0, rows.findIndex(r => r.name === sel));
  const row = rows[ri];
  const gi = Math.max(0, inds.findIndex(g => g.name === ind));
  const group = inds[gi];
  const added = s.profiles[c.id]?.addedSkills || [];
  const onProfile = (term: string) => c.skills.some(x => norm(x.name) === norm(term));
  const addTerms = (terms: string[]) => {
    const fresh = terms.filter(t => !onProfile(t));
    if (!fresh.length) return;
    updateProfile(c.id, { addedSkills: added.concat(fresh) }, fresh.length === 1 ? "\"" + fresh[0] + "\" added to your profile" : fresh.length + " terms added to your profile");
  };

  if (!row || !group) {
    return (
      <Page eyebrow="CAREER EXPLORER" title="Your skills, in other industries' words.">
        <Card><Note>Add skills to your profile and Career Pathfinder maps them here.</Note></Card>
      </Page>
    );
  }

  const colAvg = inds.map((_, j) => Math.round(rows.reduce((t, _r, i) => t + cells[i][j].value, 0) / rows.length));
  const bestCol = colAvg.indexOf(Math.max(...colAvg));
  const strongPairs = cells.flat().filter(x => x.value >= 80).length;
  const verified = rows.filter(r => r.verification === "verified").length;
  const evidence = findEvidence(c, row.name);
  const rowCells = cells[ri];
  const bestJ = rowCells.indexOf(rowCells.slice().sort((a, b) => b.value - a.value)[0]);
  const phrasebook = rows.map((r, i) => ({ r, cell: cells[i][gi], term: translateSkill(r.name, group.bucket) }));
  const strongTerms = phrasebook.filter(x => x.term && x.cell.value >= 65 && !onProfile(x.term)).map(x => x.term as string).slice(0, 4);

  const head: CSSProperties = { padding: "10px 10px", borderTop: 0, borderRight: 0, borderLeft: 0, borderBottom: "1px solid var(--border)", background: "var(--surface-faint)" };

  return (
    <Page wide eyebrow="CAREER EXPLORER" title="Your skills, in other industries' words."
      sub="Each row is a skill you can evidence. Each column is an industry your career paths lead into. Stronger cells mean employers there ask for the skill and your evidence backs it up."
      actions={<>
        <Button icon="explorer" onClick={() => nav.go("cand.explorer", "paths")}>Career paths</Button>
        <Button variant="primary" icon="route" onClick={() => nav.go("cand.explorer", "simulator")}>Simulate a move</Button>
      </>}>

      <Grid cols="rc-g4">
        <Stat icon="layers" label="Skills mapped" value={rows.length} sub={c.transferable.length + " transferable, " + (rows.length - c.transferable.length) + " top skills"} />
        <Stat icon="verified" tone="teal" label="Backed by verified evidence" value={verified + " of " + rows.length} sub="Verified skills carry more weight" />
        <Stat icon="target" tone="accent" label="Strongest industry for you" value={SHORT[inds[bestCol].bucket]} sub={"Average strength " + colAvg[bestCol] + " of 100"} />
        <Stat icon="bolt" tone="warn" label="Strong transfers" value={strongPairs} sub="Skill and industry pairs scoring 80+" />
      </Grid>

      <Grid cols="rc-g-side-r">
        <Card title="Skills by industry" sub="Select a cell to see the evidence behind it and how that industry describes the skill."
          action={<div className="rc-row" style={{ gap: 10 }}>
            {[80, 65, 1].map(v => <span key={v} className="rc-row rc-hide-sm" style={{ gap: 5, fontSize: 11, color: "var(--dim)" }}><span style={{ width: 11, height: 11, borderRadius: 4, background: fill(band(v).mix), border: "1px solid var(--border)" }} />{band(v).label}</span>)}
            <DemoTag />
          </div>}>
          <div className="rc-scroll-x">
            <div style={{ display: "grid", gridTemplateColumns: "minmax(210px, 1.5fr) repeat(" + inds.length + ", minmax(104px, 1fr))", minWidth: 210 + inds.length * 112,
              border: "1px solid var(--border)", borderRadius: "var(--r-sm, 12px)", overflow: "hidden" }}>
              <div style={{ ...head, display: "flex", alignItems: "flex-end" }}><Label>Skill</Label></div>
              {inds.map((g, j) => {
                const on = j === gi;
                return (
                  <button key={g.name} className="rc-focus" onClick={() => setInd(g.name)} onMouseEnter={() => setHoverCol(g.name)} onMouseLeave={() => setHoverCol(null)}
                    style={{ ...head, borderLeft: "1px solid var(--border)", textAlign: "left", cursor: "pointer", color: "inherit", font: "inherit",
                      background: on ? "var(--accent-faint)" : hoverCol === g.name ? "var(--surface-2)" : "var(--surface-faint)", boxShadow: on ? "inset 0 -2px 0 var(--accent)" : "none" }}>
                    <div style={{ fontSize: 12, fontWeight: on ? 600 : 500, color: "var(--ink)", lineHeight: 1.3 }}>{SHORT[g.bucket]}</div>
                    <div style={{ fontSize: 10.5, marginTop: 4, color: g.adjacent ? "var(--teal, var(--ok))" : "var(--faint)" }}>{g.adjacent ? "Adjacent" : "Same sector"}</div>
                  </button>
                );
              })}
              {rows.map((r, i) => {
                const rowOn = i === ri;
                return (
                  <Fragment key={r.name}>
                    <button className="rc-focus" onClick={() => setSel(r.name)}
                      style={{ padding: "9px 12px", borderTop: i ? "1px solid var(--border)" : 0, borderRight: 0, borderBottom: 0, borderLeft: 0, textAlign: "left", cursor: "pointer", font: "inherit", color: "inherit",
                        background: rowOn ? "var(--accent-faint)" : "transparent", boxShadow: rowOn ? "inset 3px 0 0 var(--accent)" : "none", display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                      <span className="rc-grow">
                        <span className="rc-ellipsis" style={{ display: "block", fontSize: 12.5, fontWeight: rowOn ? 600 : 500, color: "var(--ink)" }}>{r.name}</span>
                        <span style={{ display: "block", fontSize: 10.5, color: "var(--faint)", marginTop: 2 }}>{r.kind === "transferable" ? "Transferable skill" : "Top profile skill"} · level {r.level}</span>
                      </span>
                      <span title={r.verification === "verified" ? "Verified" : r.verification === "pending" ? "Verification pending" : "Self-reported"}
                        style={{ flex: "none", display: "inline-flex", color: r.verification === "verified" ? "var(--teal, var(--ok))" : r.verification === "pending" ? "var(--warn)" : "var(--faint)" }}>
                        <Icon name={r.verification === "verified" ? "verified" : r.verification === "pending" ? "clock" : "edit"} size={13} />
                      </span>
                    </button>
                    {inds.map((g, j) => {
                      const cell = cells[i][j];
                      const b = band(cell.value);
                      const on = rowOn && j === gi;
                      return (
                        <button key={g.name} className="rc-focus" onClick={() => { setSel(r.name); setInd(g.name); }}
                          title={cell.used ? "Asked for in " + cell.paths.map(p => p.title).join(", ") : b.label + " transfer"}
                          style={{ borderTop: i ? "1px solid var(--border)" : 0, borderLeft: "1px solid var(--border)", borderRight: 0, borderBottom: 0, padding: "8px 10px", cursor: "pointer", font: "inherit", textAlign: "left",
                            background: fill(b.mix), color: "var(--ink)", outline: on ? "2px solid var(--accent)" : "none", outlineOffset: -2,
                            opacity: (hoverCol && hoverCol !== g.name) ? 0.62 : 1, transition: "opacity .2s var(--ease), background .2s var(--ease)" }}>
                          <div className="rc-row" style={{ gap: 6 }}>
                            <span style={{ fontSize: 14, fontWeight: 600, letterSpacing: "-.3px", color: cell.value ? "var(--ink)" : "var(--faint)" }}>{cell.value || "0"}</span>
                            {cell.used && <Icon name="check" size={11} stroke={2.6} style={{ color: "var(--teal, var(--ok))" }} />}
                          </div>
                          <div style={{ fontSize: 10, color: cell.value >= 65 ? "var(--body)" : "var(--faint)", marginTop: 1 }}>{b.label}</div>
                        </button>
                      );
                    })}
                  </Fragment>
                );
              })}
              <div style={{ padding: "9px 12px", borderTop: "1px solid var(--border)", background: "var(--surface-faint)", fontSize: 11.5, color: "var(--dim)" }}>Average strength</div>
              {colAvg.map((v, j) => (
                <div key={j} style={{ padding: "9px 10px", borderTop: "1px solid var(--border)", borderLeft: "1px solid var(--border)", background: "var(--surface-faint)", fontSize: 12.5, fontWeight: 600, color: j === bestCol ? "var(--teal, var(--ok))" : "var(--body)" }}>{v}</div>
              ))}
            </div>
          </div>
          <div style={{ fontSize: 11.5, color: "var(--faint)", marginTop: 10, lineHeight: 1.5 }}>
            Strength blends how strongly the industry's roles ask for the skill with the level your evidence supports. A tick means a live path or vacancy asks for it directly.
          </div>
        </Card>

        <Card title={row.name} sub={row.kind === "transferable" ? "Transferable skill" : "Top profile skill"} action={<VerifyBadge status={row.verification} compact />}>
          <div className="rc-row" style={{ alignItems: "baseline", gap: 8 }}>
            <span style={{ fontSize: 26, fontWeight: 600, letterSpacing: "-.9px" }}>{row.level}</span>
            <span style={{ fontSize: 12, color: "var(--dim)" }}>evidence level out of 100</span>
          </div>
          <Progress value={row.level} tone={row.verification === "verified" ? "teal" : "accent"} style={{ marginTop: 8 }} />
          {row.kind === "transferable" && row.linked.length > 0 && (
            <div style={{ fontSize: 11.5, color: "var(--dim)", marginTop: 8 }}>Built from {row.linked.join(", ").toLowerCase()} on your profile.</div>
          )}

          <Label style={{ marginTop: 18 }}>Your evidence</Label>
          <div className="rc-col" style={{ gap: 8, marginTop: 9 }}>
            {evidence.map(e => (
              <div key={e.text} style={{ padding: "9px 11px", borderRadius: "var(--r-sm, 12px)", background: "var(--surface-2)", border: "1px solid var(--border)" }}>
                <div style={{ fontSize: 12.5, color: "var(--ink)", lineHeight: 1.45 }}>{e.text}</div>
                <div className="rc-row" style={{ gap: 6, marginTop: 5, fontSize: 11, color: "var(--faint)" }}>
                  <span className="rc-grow rc-ellipsis">{e.source}</span>
                  <span style={{ color: e.verification === "verified" ? "var(--teal, var(--ok))" : "var(--faint)" }}>{e.verification === "verified" ? "Verified" : e.verification === "pending" ? "Pending" : "Self-reported"}</span>
                </div>
              </div>
            ))}
            {!evidence.length && (
              <div style={{ fontSize: 12.5, color: "var(--dim)", lineHeight: 1.5 }}>
                No direct evidence yet. An example with figures or a reference makes this skill count with employers.
                <div style={{ marginTop: 8 }}><Button size="sm" icon="upload" onClick={() => nav.go("cand.profile", "verification")}>Add evidence</Button></div>
              </div>
            )}
          </div>

          <Label style={{ marginTop: 18 }}>How other sectors describe it</Label>
          <div className="rc-col" style={{ gap: 2, marginTop: 6 }}>
            {inds.map((g, j) => {
              const term = translateSkill(row.name, g.bucket);
              const has = term ? onProfile(term) : false;
              return (
                <div key={g.name} className="rc-row" style={{ gap: 10, padding: "8px 0", borderTop: j ? "1px solid var(--border)" : 0 }}>
                  <div className="rc-grow">
                    <div style={{ fontSize: 10.5, color: "var(--faint)" }}>{SHORT[g.bucket]}</div>
                    <div style={{ fontSize: 12.5, color: term ? "var(--ink)" : "var(--dim)", marginTop: 2 }}>{term || row.name + " (same term)"}</div>
                  </div>
                  {term && (has ? <Badge tone="teal" icon="check">On profile</Badge>
                    : <Button size="sm" variant="ghost" icon="plus" onClick={() => addTerms([term])} title="Add this wording to your profile as a self-reported skill">Add</Button>)}
                </div>
              );
            })}
          </div>

          <Label style={{ marginTop: 16 }}>Where it carries furthest</Label>
          <div style={{ fontSize: 12.5, color: "var(--body)", marginTop: 8 }}>
            {SHORT[inds[bestJ].bucket]}, strength {rowCells[bestJ].value}.
          </div>
          {rowCells[bestJ].paths.length > 0 && (
            <div className="rc-row rc-wrap" style={{ gap: 6, marginTop: 8 }}>
              {rowCells[bestJ].paths.map(p => <Chip key={p.id} onClick={() => nav.go("cand.explorer", "paths")}>{p.title}<Badge tone={alignmentTone(p.alignment)}>{p.alignment}%</Badge></Chip>)}
            </div>
          )}
        </Card>
      </Grid>

      <Card title={"Your CV, in " + SHORT[group.bucket].toLowerCase() + " language"} sub="The same experience, in the words hiring managers in that industry search for. Add the strongest terms to your profile so matching picks them up."
        action={strongTerms.length > 0
          ? <Button size="sm" variant="primary" icon="plus" onClick={() => addTerms(strongTerms)}>Add {strongTerms.length} strongest {strongTerms.length === 1 ? "term" : "terms"}</Button>
          : <Badge tone="teal" icon="check">Strongest terms on your profile</Badge>}>
        <div className="rc-row rc-wrap" style={{ gap: 7, marginBottom: 14 }}>
          {inds.map(g => <Chip key={g.name} active={g.name === group.name} onClick={() => setInd(g.name)}>{SHORT[g.bucket]}</Chip>)}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 10 }}>
          {phrasebook.map(({ r, cell, term }) => (
            <div key={r.name} className="rc-row" style={{ gap: 10, padding: "10px 12px", borderRadius: "var(--r-sm, 12px)", border: "1px solid var(--border)", background: "var(--surface-2)" }}>
              <div className="rc-grow">
                <div className="rc-ellipsis" style={{ fontSize: 11.5, color: "var(--faint)" }}>You say: {r.name}</div>
                <div className="rc-row" style={{ gap: 6, marginTop: 4 }}>
                  <Icon name="arrowRight" size={12} style={{ color: "var(--accent)" }} />
                  <span style={{ fontSize: 13, color: "var(--ink)", fontWeight: 500 }}>{term || r.name}</span>
                </div>
              </div>
              <span style={{ flex: "none", fontSize: 11, fontWeight: 600, padding: "3px 8px", borderRadius: 999, background: fill(band(cell.value).mix), color: "var(--ink)", border: "1px solid var(--border)" }}>{band(cell.value).label}</span>
            </div>
          ))}
        </div>
        <Note style={{ marginTop: 14 }}>Added terms are saved as self-reported skills. Verify them with evidence to give them full weight in matching.</Note>
      </Card>
    </Page>
  );
}
