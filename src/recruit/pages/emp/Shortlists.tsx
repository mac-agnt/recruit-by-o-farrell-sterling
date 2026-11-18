import { useEffect, useMemo, useRef, useState, type DragEvent } from "react";
import { Badge, Button, Card, Grid, Label, Note, Page } from "../../ui";
import { StackBar } from "../../charts";
import { Icon } from "../../icons";
import { useNav } from "../../nav";
import { addToPipeline, moveStage, openDrawer, removeFromPipeline, setActiveVacancy, useRecruit } from "../../store";
import { employerVacancies, searchableCandidates } from "../../selectors";
import { STAGES, STAGE_ORDER } from "../../data";
import type { PipelineEntry, Stage, Vacancy } from "../../data/types";
import { alignmentTone, matchScore } from "../../match";
import { eur, eurK } from "../../format";
import {
  ConsentBadge, FOCUS_OFFER, OFFER_STATUS, OfferEditorModal, PersonAvatar, STAGE_COLOR, ScheduleInterviewModal, consentState,
  dayDiff, isLiveOffer, offerFor, parseWhen, relDay, usePrefs, useWidth, who,
} from "./hiringKit";

/* The hiring pipeline. One board per vacancy: drag people between stages or
   use the arrows. Every move goes through the shared store, so the candidate's
   portal and Recruit HQ change at the same moment. */

const EMPTY_HINT: Record<Stage, string> = {
  identified: "Add people from Discover talent, or accept a Talent Matchmaker suggestion below.",
  shortlisted: "Drag people here when they deserve a closer look.",
  contact: "Moving someone here asks for an introduction. They decide whether to share details.",
  interview: "Book interviews once people agree to talk.",
  offer: "Create an offer after the interviews.",
  hired: "Accepted offers land here, with the placement recorded.",
};
const SHORT: Record<Stage, string> = { identified: "Identified", shortlisted: "Shortlisted", contact: "Contact", interview: "Interview", offer: "Offer", hired: "Hired" };
const SOURCE: Record<PipelineEntry["source"], { icon: string; text: string }> = {
  search: { icon: "search", text: "Found in search" },
  applied: { icon: "file", text: "Applied through Recruit" },
  agent: { icon: "sparkle", text: "Suggested by Talent Matchmaker" },
  referral: { icon: "link", text: "Referral" },
};

export default function Shortlists() {
  const s = useRecruit();
  const nav = useNav();
  const prefs = usePrefs();
  const [wrapRef, width] = useWidth<HTMLDivElement>();
  const [dragId, setDragId] = useState<string | null>(null);
  const [over, setOver] = useState<Stage | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [schedule, setSchedule] = useState<{ vacancyId: string; candidateId: string } | null>(null);
  const [offerFor_, setOfferFor] = useState<{ vacancyId: string; candidateId: string } | null>(null);

  const vacs = employerVacancies(s, s.employerId).filter(v => v.status !== "draft");
  const vac = vacs.find(v => v.id === s.activeVacancy) || vacs[0];
  const entries = useMemo(() => (vac ? s.pipeline.filter(p => p.vacancyId === vac.id) : []), [s.pipeline, vac]);

  const suggestions = useMemo(() => {
    if (!vac) return [];
    const inPipe = new Set(entries.map(e => e.candidateId));
    return searchableCandidates(s, s.employerId).filter(c => !inPipe.has(c.id))
      .map(c => ({ c, m: matchScore(c, vac) })).filter(x => x.m.score >= 60)
      .sort((a, b) => b.m.score - a.m.score).slice(0, 4);
  }, [s, vac, entries]);

  useEffect(() => {
    if (!flash) return;
    const t = setTimeout(() => setFlash(null), 4200);
    return () => clearTimeout(t);
  }, [flash]);

  if (!vac) {
    return (
      <Page eyebrow="HIRING" title="Hiring pipeline">
        <Card><EmptyState onGo={() => nav.go("emp.vacancies", "create")} /></Card>
      </Page>
    );
  }

  const count = (st: Stage) => entries.filter(e => e.stage === st).length;
  const nextIv = s.interviews.filter(i => i.vacancyId === vac.id && i.status === "scheduled")
    .map(i => ({ i, d: parseWhen(i.when) })).filter(x => x.d && dayDiff(x.d) >= 0)
    .sort((a, b) => (a.d as Date).getTime() - (b.d as Date).getTime())[0];
  const wide = width === 0 || width >= 980;
  const mid = !wide && width >= 600;
  const cols = width === 0 || width >= 1040 ? 6 : width >= 560 ? 3 : 2;
  const strip = wide ? { cols: "minmax(0,1.15fr) minmax(0,1.7fr) minmax(0,1fr)", areas: '"a b c"' }
    : mid ? { cols: "minmax(0,1fr) minmax(0,1fr)", areas: '"a c" "b b"' } : { cols: "minmax(0,1fr)", areas: '"a" "b" "c"' };

  const attemptMove = (entryId: string, stage: Stage) => {
    const entry = s.pipeline.find(p => p.id === entryId);
    if (!entry || entry.stage === stage) return;
    if (s.placements.some(pl => pl.vacancyId === entry.vacancyId && pl.candidateId === entry.candidateId)) {
      setFlash(who(s, s.employerId, entry.candidateId).first + " is placed. The placement and its success fee are recorded, so the card stays in Hired.");
      return;
    }
    if (stage === "hired" && offerFor(s, s.employerId, entry.vacancyId, entry.candidateId)?.status !== "accepted") {
      const p = who(s, s.employerId, entry.candidateId);
      setFlash("Hired follows an accepted offer. " + p.first + " decides, and the placement is recorded then.");
      return;
    }
    moveStage(entryId, stage);
  };
  const onDrop = (e: DragEvent<HTMLDivElement>, stage: Stage) => {
    e.preventDefault();
    const id = e.dataTransfer.getData("text/plain") || dragId;
    setOver(null); setDragId(null);
    if (id) attemptMove(id, stage);
  };
  const ordered = (st: Stage) => entries.filter(e => e.stage === st)
    .map(e => ({ e, score: matchScore(who(s, s.employerId, e.candidateId).c, vac).score }))
    .sort((a, b) => (a.e.updated === "Just now" ? -1 : 0) - (b.e.updated === "Just now" ? -1 : 0) || b.score - a.score)
    .map(x => x.e);
  const nextP = nextIv ? who(s, s.employerId, nextIv.i.candidateId) : null;

  return (
    <Page wide eyebrow="HIRING" title="Hiring pipeline"
      sub="Move people through each stage. Every change reaches the candidate's portal and Recruit HQ straight away."
      actions={<>
        <Button icon="vacancies" onClick={() => openDrawer("vacancy", vac.id)}>Role details</Button>
        <Button variant="primary" icon="search" onClick={() => nav.go("emp.talent", "discover")}>Find talent</Button>
      </>}>

      {/* Vacancy picker */}
      <div className="rc-row rc-wrap" style={{ gap: 8 }} role="tablist" aria-label="Vacancies">
        {vacs.map(v => {
          const on = v.id === vac.id;
          const n = s.pipeline.filter(p => p.vacancyId === v.id).length;
          return (
            <button key={v.id} role="tab" aria-selected={on} onClick={() => setActiveVacancy(v.id)} className="rc-card rc-click rc-focus"
              style={{ textAlign: "left", minWidth: 200, padding: "11px 14px", borderRadius: 16, cursor: "pointer", color: "inherit",
                background: on ? "var(--accent-faint)" : "var(--surface)", border: "1px solid " + (on ? "var(--accent-line)" : "var(--border)") }}>
              <div className="rc-row" style={{ gap: 8 }}>
                <span className="rc-ellipsis" style={{ fontSize: 13.5, fontWeight: 600, color: "var(--ink)" }}>{v.title}</span>
                {v.status !== "open" && <Badge tone={v.status === "filled" ? "ok" : "neutral"}>{v.status === "filled" ? "Filled" : "Paused"}</Badge>}
                {v.created && <Badge tone="accent">New</Badge>}
              </div>
              <div style={{ fontSize: 11.5, color: on ? "var(--body)" : "var(--dim)", marginTop: 4 }}>{n} in pipeline · open {v.postedDays} {v.postedDays === 1 ? "day" : "days"}</div>
            </button>
          );
        })}
      </div>

      {/* Summary strip */}
      <div ref={wrapRef}>
        <Card pad={0} style={{ overflow: "hidden" }}>
          <div style={{ display: "grid", gridTemplateColumns: strip.cols, gridTemplateAreas: strip.areas }}>
            <div style={{ gridArea: "a", padding: "18px 20px", background: "linear-gradient(140deg, color-mix(in oklab, #4263EB 14%, var(--surface)) 0%, var(--surface) 70%)" }}>
              <Label>Active role</Label>
              <div style={{ fontSize: 21, fontWeight: 600, letterSpacing: "-.6px", marginTop: 7, color: "var(--ink)" }}>{vac.title}</div>
              <div style={{ fontSize: 12.5, color: "var(--dim)", marginTop: 4 }}>{vac.location} · {eurK(vac.salary[0])} to {eurK(vac.salary[1])} · {vac.seniority}</div>
              <div className="rc-row rc-wrap" style={{ gap: 6, marginTop: 12 }}>
                <Badge tone={vac.postedDays > 21 ? "warn" : "neutral"} icon="clock">Open {vac.postedDays} days</Badge>
                <Badge tone="accent" icon="sparkle">{vac.marketMatches} matched</Badge>
                <Badge icon="file">{vac.applicants} applicants</Badge>
              </div>
            </div>
            <div style={{ gridArea: "b", padding: "18px 20px", borderLeft: wide ? "1px solid var(--border)" : 0, borderTop: wide ? 0 : "1px solid var(--border)" }}>
              <div className="rc-row"><Label>People at each stage</Label><span className="rc-grow" /><span style={{ fontSize: 11.5, color: "var(--faint)" }}>{entries.length} in total</span></div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(6, minmax(0, 1fr))", gap: 6, marginTop: 10 }}>
                {STAGES.map(st => (
                  <div key={st.id} style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: "-.6px", fontVariantNumeric: "tabular-nums", color: count(st.id) ? "var(--ink)" : "var(--faint)" }}>{count(st.id)}</div>
                    <div className="rc-row" style={{ gap: 5, marginTop: 3 }}>
                      <span style={{ width: 6, height: 6, borderRadius: 2, flex: "none", background: STAGE_COLOR[st.id] }} />
                      <span className="rc-ellipsis" style={{ fontSize: 11, color: "var(--dim)" }} title={st.label}>{SHORT[st.id]}</span>
                    </div>
                  </div>
                ))}
              </div>
              {entries.length > 0 && (
                <div style={{ marginTop: 12 }}>
                  <StackBar height={8} parts={STAGES.map(st => ({ label: st.label, value: count(st.id), color: STAGE_COLOR[st.id] }))} />
                </div>
              )}
            </div>
            <div style={{ gridArea: "c", padding: "18px 20px", borderLeft: wide || mid ? "1px solid var(--border)" : 0, borderTop: wide || mid ? 0 : "1px solid var(--border)" }}>
              <Label>Next interview</Label>
              {nextIv && nextP ? (
                <>
                  <div className="rc-row" style={{ gap: 8, marginTop: 8 }}>
                    <span style={{ fontSize: 16, fontWeight: 600, letterSpacing: "-.3px" }}>{nextIv.i.when}</span>
                    <Badge tone="accent">{relDay(nextIv.d as Date)}</Badge>
                  </div>
                  <div className="rc-row" style={{ gap: 8, marginTop: 10 }}>
                    <PersonAvatar c={nextP.c} hidden={nextP.hidden} size={26} />
                    <div className="rc-grow" style={{ fontSize: 12.5, lineHeight: 1.4 }}>
                      <div className="rc-ellipsis" style={{ color: "var(--ink)" }}>{nextP.name}</div>
                      <div style={{ color: "var(--dim)" }}>Round {nextIv.i.round} · {nextIv.i.format}</div>
                    </div>
                  </div>
                </>
              ) : (
                <div style={{ fontSize: 12.5, color: "var(--dim)", marginTop: 8, lineHeight: 1.5 }}>Nothing booked for this role yet. Book one from a card in the Interview column.</div>
              )}
              <Button size="sm" variant="ghost" iconRight="arrowRight" style={{ marginTop: 10, marginLeft: -10 }} onClick={() => nav.go("emp.hiring", "interviews")}>All interviews</Button>
            </div>
          </div>
        </Card>
      </div>

      {/* Board */}
      <div className="rc-row rc-wrap" style={{ gap: 10, padding: "6px 4px 0" }}>
        <span style={{ fontSize: 15, fontWeight: 600, letterSpacing: "-.2px" }}>{vac.title} pipeline</span>
        <span className="rc-grow" />
        <span className="rc-row" style={{ gap: 6, fontSize: 12, color: "var(--faint)" }}><Icon name="grip" size={13} />Drag cards between stages, or use the arrows on each card</span>
      </div>
      {flash && <Note tone="warn" icon="lock" style={{ animation: "rcRise .35s cubic-bezier(.16,1,.3,1) both" }}>{flash}</Note>}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(" + cols + ", minmax(0, 1fr))", gap: 10, alignItems: "stretch" }}>
        {STAGES.map((st, si) => {
          const list = ordered(st.id);
          const isOver = over === st.id && !!dragId;
          return (
            <div key={st.id} aria-label={st.label + " column"}
              onDragEnter={() => setOver(st.id)}
              onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; if (over !== st.id) setOver(st.id); }}
              onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOver(o => (o === st.id ? null : o)); }}
              onDrop={e => onDrop(e, st.id)}
              style={{ display: "flex", flexDirection: "column", gap: 8, minHeight: 300, padding: 6, borderRadius: 20, minWidth: 0,
                background: isOver ? "var(--accent-faint)" : "var(--surface-faint)", border: "1px " + (isOver ? "dashed var(--accent-line)" : "solid var(--border)"),
                transition: "background .2s var(--ease), border-color .2s var(--ease)" }}>
              <div style={{ padding: "7px 7px 4px", minHeight: cols === 6 ? 80 : undefined }}>
                <div className="rc-row" style={{ gap: 7, alignItems: "flex-start" }}>
                  <span style={{ width: 8, height: 8, borderRadius: 3, flex: "none", marginTop: 5, background: STAGE_COLOR[st.id] }} />
                  <span className="rc-grow" style={{ fontSize: 12, fontWeight: 600, color: "var(--ink)", lineHeight: 1.35, letterSpacing: "-.1px" }}>{st.label}</span>
                  <span style={{ minWidth: 22, height: 20, padding: "0 6px", borderRadius: 999, background: "var(--surface-2)", border: "1px solid var(--border)", fontSize: 11, fontWeight: 600, display: "inline-flex", alignItems: "center", justifyContent: "center", fontVariantNumeric: "tabular-nums" }}>{list.length}</span>
                </div>
                <div style={{ fontSize: 11, color: "var(--faint)", marginTop: 4, lineHeight: 1.4 }}>{st.hint}</div>
              </div>
              {list.map(e => (
                <PipelineCard key={e.id} entry={e} vac={vac} noticeLimit={prefs.noticeWeeks} dragging={dragId === e.id} menuLeft={si % cols === 0}
                  onDragStart={() => setDragId(e.id)} onDragEnd={() => { setDragId(null); setOver(null); }}
                  onMove={stage => attemptMove(e.id, stage)}
                  onSchedule={() => setSchedule({ vacancyId: vac.id, candidateId: e.candidateId })}
                  onCreateOffer={() => setOfferFor({ vacancyId: vac.id, candidateId: e.candidateId })}
                  onOpenOffer={id => { FOCUS_OFFER.set(id); nav.go("emp.hiring", "offers"); }} />
              ))}
              {!list.length && (
                <div style={{ padding: "16px 12px", borderRadius: 14, border: "1px dashed var(--border-strong)", fontSize: 11.5, color: "var(--faint)", lineHeight: 1.5, textAlign: "center" }}>
                  {isOver ? "Drop to move here" : EMPTY_HINT[st.id]}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <Grid cols="rc-g-2-1">
        <Card title="More people worth a look" sub={"Talent Matchmaker ranks discoverable profiles against " + vac.title + ". Anonymous profiles stay anonymous until they agree."}
          action={<Badge tone="accent" icon="sparkle">Talent Matchmaker</Badge>}>
          {!prefs.suggestions ? (
            <Note icon="sliders">
              Suggestions are switched off in your organisation preferences. <button className="rc-link" onClick={() => nav.go("emp.org", "preferences")}>Turn them back on</button>.
            </Note>
          ) : suggestions.length ? (
            <div className="rc-col">
              {suggestions.map(({ c, m }, i) => {
                const p = who(s, s.employerId, c.id);
                return (
                  <div key={c.id} className="rc-row rc-wrap" style={{ gap: 11, padding: "10px 0", borderTop: i ? "1px solid var(--border)" : 0 }}>
                    <PersonAvatar c={c} hidden={p.hidden} size={32} />
                    <button className="rc-grow rc-focus" onClick={() => openDrawer("candidate", c.id, { vacancyId: vac.id })}
                      style={{ textAlign: "left", background: "none", border: 0, padding: 0, color: "inherit", cursor: "pointer", minWidth: 160 }}>
                      <div className="rc-ellipsis" style={{ fontSize: 13, fontWeight: 500, color: "var(--ink)" }}>{p.name}</div>
                      <div className="rc-ellipsis" style={{ fontSize: 12, color: "var(--dim)", marginTop: 2 }}>{c.title} · {c.location}{m.matchedSkills.length ? " · evidence for " + m.matchedSkills.slice(0, 2).join(", ") : ""}</div>
                    </button>
                    <Badge>Index {c.recruitIndex}</Badge>
                    <Badge tone={alignmentTone(m.score)}>{m.score}% fit</Badge>
                    <Button size="sm" icon="plus" onClick={() => addToPipeline(vac.id, c.id, "identified", "agent")}>Add</Button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ fontSize: 12.5, color: "var(--dim)" }}>Everyone with a strong match is already on the board.</div>
          )}
          {prefs.suggestions && (
            <Note icon="shield" style={{ marginTop: 14 }}>
              Ranked on verified skills, experience, salary fit and location. Sensitive characteristics are never used, and adding someone here only puts them in Identified: nobody is contacted until you ask.
            </Note>
          )}
        </Card>
        <Card title="How this board works">
          <div className="rc-col" style={{ gap: 11 }}>
            {[
              ["grip", "Drag cards, or use the arrows and the stage menu on each card."],
              ["lock", "Contact requested sends an introduction. Details stay hidden until the person agrees."],
              ["calendar", "Interview cards book rounds. Offer cards draft packages for approval."],
              ["placement", "Hired follows an accepted offer, which records the placement and the success fee."],
              ["shield", "Index and fit scores are decision support. People make every hiring decision."],
            ].map(([icon, text]) => (
              <div key={icon} className="rc-row" style={{ alignItems: "flex-start", gap: 10 }}>
                <span style={{ width: 24, height: 24, flex: "none", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", background: "var(--surface-2)", color: "var(--accent)" }}><Icon name={icon} size={12} /></span>
                <span style={{ fontSize: 12.5, lineHeight: 1.5, color: "var(--body)", paddingTop: 3 }}>{text}</span>
              </div>
            ))}
          </div>
        </Card>
      </Grid>

      <ScheduleInterviewModal open={!!schedule} onClose={() => setSchedule(null)} vacancyId={schedule?.vacancyId} candidateId={schedule?.candidateId} />
      <OfferEditorModal open={!!offerFor_} onClose={() => setOfferFor(null)} vacancyId={offerFor_?.vacancyId} candidateId={offerFor_?.candidateId} />
    </Page>
  );
}

function EmptyState({ onGo }: { onGo: () => void }) {
  return (
    <div style={{ padding: "36px 20px", textAlign: "center" }}>
      <div style={{ fontSize: 15, fontWeight: 500 }}>No vacancies yet</div>
      <div style={{ fontSize: 12.5, color: "var(--dim)", marginTop: 6 }}>Post a role and Talent Matchmaker starts ranking people for it.</div>
      <Button variant="primary" icon="plus" style={{ marginTop: 14 }} onClick={onGo}>Create a vacancy</Button>
    </div>
  );
}

function PipelineCard({ entry, vac, noticeLimit, dragging, menuLeft, onDragStart, onDragEnd, onMove, onSchedule, onCreateOffer, onOpenOffer }: {
  entry: PipelineEntry; vac: Vacancy; noticeLimit: number; dragging: boolean; menuLeft: boolean; onDragStart: () => void; onDragEnd: () => void;
  onMove: (stage: Stage) => void; onSchedule: () => void; onCreateOffer: () => void; onOpenOffer: (id: string) => void;
}) {
  const s = useRecruit();
  const [menu, setMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!menu) return;
    const off = (e: MouseEvent) => { if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenu(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setMenu(false); };
    window.addEventListener("mousedown", off);
    window.addEventListener("keydown", esc);
    return () => { window.removeEventListener("mousedown", off); window.removeEventListener("keydown", esc); };
  }, [menu]);

  const p = who(s, s.employerId, entry.candidateId);
  const c = p.c;
  const m = matchScore(c, vac);
  const idx = STAGE_ORDER.indexOf(entry.stage);
  const consent = consentState(s, s.employerId, c.id);
  const offer = offerFor(s, s.employerId, vac.id, c.id);
  const ivs = s.interviews.filter(i => i.vacancyId === vac.id && i.candidateId === c.id);
  const next = ivs.filter(i => i.status === "scheduled").map(i => ({ i, d: parseWhen(i.when) }))
    .sort((a, b) => (a.d?.getTime() || 0) - (b.d?.getTime() || 0))[0];
  const held = ivs.filter(i => i.status === "completed").sort((a, b) => b.round - a.round)[0];
  const placement = s.placements.find(pl => pl.vacancyId === vac.id && pl.candidateId === c.id);
  const canHire = offer?.status === "accepted";
  const placed = !!placement;
  const src = SOURCE[entry.source];
  const showConsent = entry.stage === "contact" || (idx > 2 && consent !== "shared");
  const stageLine = showConsent || entry.stage === "interview" || entry.stage === "offer" || entry.stage === "hired";
  const note = entry.note && entry.updated !== "Just now" && !stageLine ? entry.note.replace(/^Suggested by Talent Matchmaker\.?\s*/, "") : "";
  const open = () => openDrawer("candidate", c.id, { vacancyId: vac.id });
  const stop = (fn: () => void) => (e: React.MouseEvent) => { e.stopPropagation(); fn(); };
  const prev = idx > 0 ? STAGES[idx - 1] : null;
  const nxt = idx < STAGES.length - 1 ? STAGES[idx + 1] : null;
  const nextBlocked = nxt?.id === "hired" && !canHire;

  return (
    <div draggable={!placed} role="button" tabIndex={0} aria-label={"Open " + p.name + ", " + c.title}
      onDragStart={e => { e.dataTransfer.setData("text/plain", entry.id); e.dataTransfer.effectAllowed = "move"; onDragStart(); }}
      onDragEnd={onDragEnd} onClick={open}
      onKeyDown={e => { if (e.target === e.currentTarget && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); open(); } }}
      className="rc-card rc-click rc-focus rc-rise"
      style={{ position: "relative", padding: 11, borderRadius: 16, background: "var(--surface)", border: "1px solid var(--border)", boxShadow: "var(--card-shadow)",
        cursor: placed ? "pointer" : "grab", opacity: dragging ? 0.42 : 1, zIndex: menu ? 6 : undefined }}>
      <div className="rc-row" style={{ gap: 8, paddingRight: 26, minHeight: 28 }}>
        <PersonAvatar c={c} hidden={p.hidden} size={28} />
        <span className="rc-grow" />
        <span style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--faint)", whiteSpace: "nowrap" }}>{entry.updated}</span>
      </div>
      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)", letterSpacing: "-.1px", marginTop: 9, lineHeight: 1.3, overflowWrap: "anywhere" }}>{p.name}</div>
      <div style={{ fontSize: 11.5, color: "var(--dim)", marginTop: 2, lineHeight: 1.35 }}>{c.title}</div>

      <div ref={menuRef}>
        <button aria-label="Move to stage" aria-expanded={menu} title="Move to stage" onClick={stop(() => setMenu(o => !o))} className="rc-btn rc-btn-ghost rc-focus"
          style={{ position: "absolute", top: 13, right: 8, width: 24, height: 24, borderRadius: 8, border: 0, background: menu ? "var(--track)" : "transparent", color: "var(--dim)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }}>
          <Icon name="chevronDown" size={13} stroke={2.2} />
        </button>
        {menu && (
          <div role="menu" onClick={e => e.stopPropagation()}
            style={{ position: "absolute", top: 41, ...(menuLeft ? { left: 8 } : { right: 8 }), width: 214, padding: 5, zIndex: 20, background: "var(--overlay)", border: "1px solid var(--border-strong)", borderRadius: 14, boxShadow: "0 18px 44px rgba(0,0,0,.45)", backdropFilter: "blur(20px)", cursor: "default", animation: "rcRise .2s cubic-bezier(.16,1,.3,1) both" }}>
            <div style={{ padding: "6px 9px 5px" }}><Label>Move to</Label></div>
            {STAGES.map(st => {
              const blocked = placed || (st.id === "hired" && !canHire && entry.stage !== "hired");
              const here = st.id === entry.stage;
              return (
                <button key={st.id} role="menuitem" disabled={here || blocked} onClick={() => { setMenu(false); onMove(st.id); }} className="rc-rowhover rc-focus"
                  title={blocked ? (placed ? "Placed: the card stays in Hired" : "Set when the candidate accepts an offer") : undefined}
                  style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "7px 9px", border: 0, borderRadius: 9, background: here ? "var(--surface-2)" : "transparent",
                    color: blocked ? "var(--faint)" : "var(--body)", fontSize: 12.5, textAlign: "left", cursor: here || blocked ? "default" : "pointer" }}>
                  <span style={{ width: 7, height: 7, borderRadius: 2, flex: "none", background: STAGE_COLOR[st.id] }} />
                  <span className="rc-grow">{st.label}</span>
                  {here && <Icon name="check" size={12} stroke={2.4} />}
                  {blocked && <Icon name="lock" size={11} />}
                </button>
              );
            })}
            <div style={{ height: 1, background: "var(--border)", margin: "5px 4px" }} />
            <button role="menuitem" onClick={() => { setMenu(false); open(); }} className="rc-rowhover rc-focus"
              style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "7px 9px", border: 0, borderRadius: 9, background: "transparent", color: "var(--body)", fontSize: 12.5, cursor: "pointer" }}>
              <Icon name="candidate" size={13} />Open profile
            </button>
            <button role="menuitem" disabled={placed} onClick={() => { setMenu(false); removeFromPipeline(vac.id, c.id); }} className="rc-rowhover rc-focus"
              style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "7px 9px", border: 0, borderRadius: 9, background: "transparent", color: placed ? "var(--faint)" : "var(--bad)", fontSize: 12.5, cursor: placed ? "default" : "pointer" }}>
              <Icon name="trash" size={13} />Remove from pipeline
            </button>
          </div>
        )}
      </div>

      <div className="rc-row rc-wrap" style={{ gap: 5, marginTop: 10 }}>
        <Badge style={{ height: 20, padding: "0 7px" }}>Index {c.recruitIndex}</Badge>
        <Badge tone={alignmentTone(m.score)} style={{ height: 20, padding: "0 7px" }}>{m.score}% fit</Badge>
      </div>
      <div className="rc-row" style={{ gap: 6, marginTop: 8, fontSize: 11, color: entry.source === "agent" ? "var(--accent)" : "var(--faint)", alignItems: "flex-start" }}>
        <Icon name={src.icon} size={11} style={{ marginTop: 2 }} /><span style={{ lineHeight: 1.4 }}>{src.text}</span>
      </div>

      {stageLine && (
        <div className="rc-col" style={{ gap: 7, marginTop: 9 }}>
          {showConsent && <div><ConsentBadge state={consent} /></div>}
          {entry.stage === "interview" && (
            <>
              {next ? (
                <div style={{ fontSize: 11.5, color: "var(--body)", lineHeight: 1.45 }}>
                  <div className="rc-row" style={{ gap: 5, color: "var(--dim)" }}><Icon name="calendar" size={11} />Round {next.i.round}</div>
                  <div style={{ color: "var(--ink)" }}>{next.i.when}</div>
                  <div style={{ color: "var(--faint)" }}>{next.i.format}{next.d ? " · " + relDay(next.d).toLowerCase() : ""}</div>
                </div>
              ) : held ? (
                <div style={{ fontSize: 11.5, color: "var(--dim)" }}>Round {held.round} held {held.when.split(",")[0]}</div>
              ) : null}
              <Button size="sm" icon="calendar" variant={next ? "secondary" : "primary"} full style={{ height: 28 }} onClick={stop(onSchedule)}>
                {next || held ? "Book another round" : "Schedule interview"}
              </Button>
            </>
          )}
          {entry.stage === "offer" && (offer && isLiveOffer(offer) ? (
            <>
              <div className="rc-row rc-wrap" style={{ gap: 5 }}>
                <Badge tone={OFFER_STATUS[offer.status].tone}>{OFFER_STATUS[offer.status].label}</Badge>
                {offer.contingency && <Badge tone="neutral">Contingency</Badge>}
              </div>
              <div style={{ fontSize: 12, color: "var(--body)", fontVariantNumeric: "tabular-nums" }}>
                {eur(offer.salary)}
                <span style={{ color: "var(--faint)" }}>{offer.visibleToCandidate ? (offer.status === "sent" ? " · expires " + offer.expires : "") : " · hidden from " + p.first}</span>
              </div>
              <Button size="sm" icon="offers" full style={{ height: 28 }} onClick={stop(() => onOpenOffer(offer.id))}>Open offer</Button>
            </>
          ) : (
            <>
              {offer && <div><Badge tone={OFFER_STATUS[offer.status].tone}>Last offer {OFFER_STATUS[offer.status].label.toLowerCase()}</Badge></div>}
              <Button size="sm" variant="primary" icon="plus" full style={{ height: 28 }} onClick={stop(onCreateOffer)}>{offer ? "Create a new offer" : "Create offer"}</Button>
            </>
          ))}
          {entry.stage === "hired" && (placement ? (
            <div style={{ fontSize: 11.5, lineHeight: 1.5, color: "var(--body)" }}>
              <Badge tone="ok" icon="placement">Placement recorded</Badge>
              <div style={{ marginTop: 6 }}>Starts {placement.startDate}</div>
              <div style={{ color: "var(--dim)" }}>Success fee {eur(placement.salary * placement.feeRate)} at {Math.round(placement.feeRate * 100)}%</div>
            </div>
          ) : (
            <div><Badge tone="ok" icon="check">Hired</Badge></div>
          ))}
        </div>
      )}
      {note && <div style={{ fontSize: 11.5, color: "var(--dim)", marginTop: 8, lineHeight: 1.45 }}>{note}</div>}

      <div className="rc-row" style={{ gap: 6, marginTop: 10, paddingTop: 9, borderTop: "1px solid var(--border)" }}>
        <span className="rc-grow rc-ellipsis" style={{ fontSize: 11, color: c.noticeWeeks > noticeLimit ? "var(--warn)" : "var(--faint)" }}
          title={c.noticeWeeks > noticeLimit ? "Longer than your " + noticeLimit + "-week notice tolerance" : undefined}>
          {c.noticeWeeks} wks notice
        </span>
        <ArrowBtn icon="chevronLeft" label={placed ? "Placed: the card stays in Hired" : prev ? "Move back to " + prev.label : "First stage"} disabled={!prev || placed} onClick={stop(() => prev && onMove(prev.id))} />
        <ArrowBtn icon="chevronRight" label={nxt ? (nextBlocked ? "Moves to Hired when " + p.first + " accepts an offer" : "Move to " + nxt.label) : "Last stage"}
          disabled={!nxt || nextBlocked} onClick={stop(() => nxt && onMove(nxt.id))} />
      </div>
    </div>
  );
}

function ArrowBtn({ icon, label, disabled, onClick }: { icon: string; label: string; disabled: boolean; onClick: (e: React.MouseEvent) => void }) {
  return (
    <button aria-label={label} title={label} disabled={disabled} onClick={onClick} className="rc-btn rc-btn-secondary rc-focus"
      style={{ width: 26, height: 24, flex: "none", padding: 0, borderRadius: 8, border: "1px solid var(--border)", background: "var(--surface-2)", color: "var(--dim)", cursor: disabled ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <Icon name={icon} size={12} stroke={2.4} />
    </button>
  );
}
