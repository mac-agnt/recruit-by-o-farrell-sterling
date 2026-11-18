import { useEffect, useState } from "react";
import { Badge, Button, Card, DemoTag, Empty, Field, Grid, KV, Label, Modal, Note, Page, Segmented, Select, Stat, Timeline } from "../../ui";
import { RangeBar } from "../../charts";
import { Icon } from "../../icons";
import { useNav } from "../../nav";
import { approveOffer, openDrawer, sendOffer, submitOffer, useRecruit, vacancyById, visibilityOf, withdrawOffer, type RecruitState } from "../../store";
import { employerVacancies } from "../../selectors";
import type { Offer, OfferEvent } from "../../data/types";
import { eur, eurK } from "../../format";
import {
  FOCUS_OFFER, FOCUS_THREAD, OFFER_STATUS, OfferEditorModal, PersonAvatar, isLiveOffer, lc1, offerFor, teamMember, threadFor, who, type Tone,
} from "./hiringKit";

/* Senior talent offers. Packages, the approval chain, the negotiation history
   and the candidate's side of it. The candidate stays in control: employers
   never see another employer's terms and cannot bid against them. */

const ORDER: Offer["status"][] = ["changes requested", "awaiting approval", "draft", "approved", "sent", "accepted", "declined", "withdrawn"];
const STEPS = ["Draft", "Awaiting approval", "Approved", "Sent"];
const KIND_TONE: Record<OfferEvent["kind"], Tone> = { employer: "accent", candidate: "teal", approval: "ok", system: "neutral" };
const pronoun = (story?: string) => (story === "sarah" || story === "aoife" ? "she" : story === "mark" ? "he" : "they");

function stepIndex(o: Offer) {
  switch (o.status) {
    case "draft": return 0;
    case "awaiting approval": return 1;
    case "approved": return 2;
    case "sent": case "changes requested": return 3;
    case "accepted": case "declined": return 4;
    default:
      return o.visibleToCandidate ? 3 : o.history.some(h => h.kind === "approval") ? 2 : o.history.some(h => /for approval/i.test(h.text)) ? 1 : 0;
  }
}

export default function Offers() {
  const s = useRecruit();
  const nav = useNav();
  const mine = s.offers.filter(o => o.employerId === s.employerId);
  const [filter, setFilter] = useState<"live" | "all">("live");
  const [sel, setSel] = useState<string | null>(() => FOCUS_OFFER.get());
  const [editing, setEditing] = useState<Offer | null>(null);
  const [confirmWithdraw, setConfirmWithdraw] = useState<Offer | null>(null);
  const [choosing, setChoosing] = useState(false);
  const [newTarget, setNewTarget] = useState<{ vacancyId: string; candidateId: string } | null>(null);
  useEffect(() => { FOCUS_OFFER.set(null); }, []);

  const sorted = mine.slice().sort((a, b) => ORDER.indexOf(a.status) - ORDER.indexOf(b.status) || b.salary - a.salary);
  const list = sorted.filter(o => filter === "all" || isLiveOffer(o) || o.id === sel);
  const current = mine.find(o => o.id === sel) || mine.find(o => o.id === "o-hv-sarah") || list[0] || null;
  const live = mine.filter(o => isLiveOffer(o) && o.status !== "accepted");
  const awaiting = mine.filter(o => o.status === "awaiting approval");
  const withCandidates = mine.filter(o => o.status === "sent" || o.status === "changes requested");

  const vacIds = new Set(employerVacancies(s, s.employerId).map(v => v.id));
  const eligible = s.pipeline.filter(p => vacIds.has(p.vacancyId) && (p.stage === "interview" || p.stage === "offer")
    && !(offerFor(s, s.employerId, p.vacancyId, p.candidateId) && isLiveOffer(offerFor(s, s.employerId, p.vacancyId, p.candidateId) as Offer)));

  return (
    <Page wide eyebrow="HIRING" title="Offers"
      sub="Senior hires, handled with care: build the package, route it for approval, then send it. Every step is recorded, and the candidate decides."
      actions={<>
        <Button icon="hiring" onClick={() => nav.go("emp.hiring", "shortlists")}>Pipeline</Button>
        <Button variant="primary" icon="plus" onClick={() => setChoosing(true)}>Create offer</Button>
      </>}>

      <Note tone="accent" icon="shield">
        <b style={{ fontWeight: 600, color: "var(--ink)" }}>Candidates stay in control.</b> Senior candidates choose which offers to consider. You can't see other employers' offers or bid for a person; Recruit shows that a candidate is considering more than one opportunity only when they opt in.
      </Note>

      <Grid cols="rc-g4">
        <Stat icon="offers" tone="accent" label="Offers in progress" value={live.length} sub={live.length ? eurK(Math.min(...live.map(o => o.salary))) + " to " + eurK(Math.max(...live.map(o => o.salary))) + " base" : "None open"} />
        <Stat icon="clock" tone="warn" label="Awaiting approval" value={awaiting.length} sub={awaiting.length ? "With " + (awaiting[0].approver || "the approver") : "Nothing waiting"} />
        <Stat icon="send" label="With candidates" value={withCandidates.length} sub={withCandidates[0] ? "Next expiry " + withCandidates.map(o => o.expires)[0] : "Nothing sent"} />
        <Stat icon="placement" tone="ok" label="Accepted" value={mine.filter(o => o.status === "accepted").length} sub="Placements follow acceptance" />
      </Grid>

      {!mine.length ? (
        <Card>
          <Empty icon="offers" title="No offers yet" body="Offers start from the pipeline once interviews are done. Drafts stay invisible to the candidate until they are approved and sent."
            action={<Button variant="primary" icon="hiring" onClick={() => nav.go("emp.hiring", "shortlists")}>Open the pipeline</Button>} />
        </Card>
      ) : (
        <Grid cols="rc-g-side">
          <div className="rc-col" style={{ gap: 10 }}>
            <Segmented size="sm" value={filter} onChange={setFilter} options={[{ id: "live", label: "In progress" }, { id: "all", label: "All offers" }]} />
            {list.map(o => {
              const p = who(s, s.employerId, o.candidateId);
              const on = current?.id === o.id;
              const st = OFFER_STATUS[o.status];
              return (
                <button key={o.id} onClick={() => setSel(o.id)} className="rc-card rc-click rc-focus" aria-pressed={on}
                  style={{ textAlign: "left", padding: 14, borderRadius: 18, cursor: "pointer", color: "inherit", background: on ? "var(--accent-faint)" : "var(--surface)", border: "1px solid " + (on ? "var(--accent-line)" : "var(--border)") }}>
                  <div className="rc-row" style={{ gap: 10, alignItems: "flex-start" }}>
                    <PersonAvatar c={p.c} hidden={p.hidden} size={34} />
                    <div className="rc-grow">
                      <div className="rc-row" style={{ gap: 6 }}>
                        <span className="rc-ellipsis" style={{ fontSize: 13.5, fontWeight: 600, color: "var(--ink)" }}>{p.name}</span>
                      </div>
                      <div className="rc-ellipsis" style={{ fontSize: 12, color: "var(--dim)", marginTop: 2 }}>{o.title} · {eur(o.salary)}</div>
                      <div className="rc-row rc-wrap" style={{ gap: 5, marginTop: 8 }}>
                        <Badge tone={st.tone}>{st.label}</Badge>
                        {o.contingency && <Badge>Contingency</Badge>}
                        {!o.visibleToCandidate && isLiveOffer(o) && <Badge icon="eyeOff">Hidden</Badge>}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
            {!list.length && <div style={{ fontSize: 12.5, color: "var(--dim)", padding: 8 }}>No offers in progress. Switch to All offers to see closed ones.</div>}
          </div>

          {current ? (
            <OfferDetail key={current.id} o={current} s={s}
              onEdit={() => setEditing(current)} onWithdraw={() => setConfirmWithdraw(current)}
              onMessage={() => { const t = threadFor(s, [current.id, current.candidateId]); if (t) FOCUS_THREAD.set(t.id); nav.go("emp.messages", "inbox"); }}
              onPlacements={() => nav.go("emp.hiring", "placements")}
              onNew={() => setNewTarget({ vacancyId: current.vacancyId, candidateId: current.candidateId })} />
          ) : <Card><Empty title="Pick an offer" body="Choose an offer on the left to see its package and history." /></Card>}
        </Grid>
      )}

      <OfferEditorModal open={!!editing} onClose={() => setEditing(null)} offer={editing || undefined} />
      <OfferEditorModal open={!!newTarget} onClose={() => setNewTarget(null)} vacancyId={newTarget?.vacancyId} candidateId={newTarget?.candidateId} onCreated={id => setSel(id)} />
      <ChooseCandidate open={choosing} onClose={() => setChoosing(false)}
        options={eligible.map(p => ({ value: p.vacancyId + "|" + p.candidateId, label: who(s, s.employerId, p.candidateId).name + " · " + (vacancyById(p.vacancyId, s)?.title || "") }))}
        onPick={(vacancyId, candidateId) => { setChoosing(false); setNewTarget({ vacancyId, candidateId }); }} onPipeline={() => { setChoosing(false); nav.go("emp.hiring", "shortlists"); }} />
      <Modal open={!!confirmWithdraw} onClose={() => setConfirmWithdraw(null)} width={480} title="Withdraw this offer?"
        sub={confirmWithdraw ? (confirmWithdraw.visibleToCandidate ? who(s, s.employerId, confirmWithdraw.candidateId).first + " will see the offer as withdrawn. This can't be undone." : "The draft is closed. The candidate never saw it.") : undefined}
        footer={<>
          <Button onClick={() => setConfirmWithdraw(null)}>Keep the offer</Button>
          <Button variant="danger" icon="x" onClick={() => { if (confirmWithdraw) withdrawOffer(confirmWithdraw.id); setConfirmWithdraw(null); }}>Withdraw offer</Button>
        </>}>
        <Note>The withdrawal is added to the negotiation history and to Recruit HQ's offer log.</Note>
      </Modal>
    </Page>
  );
}

function OfferDetail({ o, s, onEdit, onWithdraw, onMessage, onPlacements, onNew }: {
  o: Offer; s: RecruitState; onEdit: () => void; onWithdraw: () => void; onMessage: () => void; onPlacements: () => void; onNew: () => void;
}) {
  const p = who(s, s.employerId, o.candidateId);
  const c = p.c;
  const v = vacancyById(o.vacancyId, s);
  const st = OFFER_STATUS[o.status];
  const step = stepIndex(o);
  const approver = teamMember(o.approver || "");
  const vis = visibilityOf(c.id, s);
  const exp = c.salaryExpectation;
  const others = s.offers.filter(x => x.candidateId === c.id && x.employerId !== s.employerId && x.visibleToCandidate && (x.status === "sent" || x.status === "changes requested"));
  const considering = vis.seniorOffers && others.length > 0;
  const thread = threadFor(s, [o.id, c.id]);
  const lastFromThem = thread ? thread.messages.filter(m => m.from === "them").pop() : undefined;
  const asks = o.history.filter(h => h.kind === "candidate");
  const lastAsk = asks[asks.length - 1];
  const lo = Math.floor((Math.min(c.marketRange[0], exp[0], v ? v.salary[0] : o.salary, o.salary) * 0.92) / 5000) * 5000;
  const hi = Math.ceil((Math.max(c.marketRange[1], exp[1], v ? v.salary[1] : o.salary, o.salary) * 1.06) / 5000) * 5000;
  const position = !vis.showSalary ? null
    : o.salary < exp[0] ? { tone: "warn" as Tone, text: eur(exp[0] - o.salary) + " below " + p.first + "'s stated minimum" }
    : o.salary > exp[1] ? { tone: "accent" as Tone, text: "Above " + p.first + "'s stated range" }
    : { tone: "ok" as Tone, text: "Inside " + p.first + "'s stated expectation" };
  const live = isLiveOffer(o) && o.status !== "accepted";
  const final = o.status === "accepted" ? "Accepted" : o.status === "declined" ? "Declined" : "Decision";

  return (
    <div className="rc-col" style={{ gap: 14, minWidth: 0 }}>
      <Card pad={22} style={{ background: "linear-gradient(140deg, color-mix(in oklab, #4263EB 13%, var(--surface)) 0%, var(--surface) 60%)" }}>
        <div className="rc-row rc-wrap" style={{ gap: 14, alignItems: "flex-start" }}>
          <PersonAvatar c={c} hidden={p.hidden} size={48} />
          <div className="rc-grow" style={{ minWidth: 220 }}>
            <div className="rc-row rc-wrap" style={{ gap: 7 }}>
              <span style={{ fontSize: 20, fontWeight: 600, letterSpacing: "-.5px" }}>{p.name}</span>
              <Badge tone={st.tone}>{st.label}</Badge>
              {o.contingency && <Badge>Contingency</Badge>}
              {o.visibleToCandidate ? <Badge tone="teal" icon="eye">Visible to {p.first}</Badge> : <Badge icon="eyeOff">Not visible to {p.first}</Badge>}
            </div>
            <div style={{ fontSize: 13, color: "var(--dim)", marginTop: 4 }}>{o.title} · {o.location} · {c.title}, {c.currentOrgPublic}</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 30, fontWeight: 600, letterSpacing: "-1.2px", lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>{eur(o.salary)}</div>
            <div style={{ fontSize: 12, color: "var(--dim)", marginTop: 5 }}>base salary · {lc1(o.bonus)}</div>
          </div>
        </div>

        <Stepper step={step} status={o.status} final={final} />

        <div className="rc-row rc-wrap" style={{ gap: 10, marginTop: 18, padding: "14px 16px", borderRadius: 16, background: "var(--surface-faint)", border: "1px solid var(--border)" }}>
          <div className="rc-grow" style={{ minWidth: 240, fontSize: 12.5, lineHeight: 1.55, color: "var(--body)" }}>
            {o.status === "draft" && <>Drafts are invisible to {p.first}. {o.approver || "The approver"} signs off before anything is sent.</>}
            {o.status === "awaiting approval" && <>Waiting on {o.approver}{approver ? ", " + approver.role : ""}. In the live product the approver signs off from their own login; this demo lets you approve on their behalf.</>}
            {o.status === "approved" && (o.contingency
              ? <>Approved as a contingency. Sending it makes it visible to {p.first} and turns it into a live offer.</>
              : <>Approved. Send it when you're ready; {p.first} sees it in their portal straight away.</>)}
            {o.status === "sent" && <>With {p.first}. The offer expires {o.expires}. You can revise the package; each change is added to the history.</>}
            {o.status === "changes requested" && <>{p.first} asked for changes{lastAsk ? ": " + lastAsk.text.replace(/^Requested changes:\s*/, "") : "."} Revise the package to resend it.</>}
            {o.status === "accepted" && <>Accepted. The placement and the {Math.round((s.commissionRules[0]?.rate ?? 0.08) * 100)}% success fee are recorded.</>}
            {o.status === "declined" && <>{p.first} declined this offer. You can make a new one if the conversation continues.</>}
            {o.status === "withdrawn" && <>This offer was withdrawn.</>}
          </div>
          <div className="rc-row rc-wrap" style={{ gap: 8 }}>
            {o.status === "draft" && <Button variant="primary" icon="send" onClick={() => submitOffer(o.id)}>Send for approval</Button>}
            {o.status === "awaiting approval" && (
              <Button variant="primary" icon="check" onClick={() => approveOffer(o.id)}>
                Approve as {o.approver || "the approver"}{approver ? ", " + approver.role : ""} (demo)
              </Button>
            )}
            {o.status === "approved" && <Button variant="primary" icon="send" onClick={() => sendOffer(o.id)}>Send to {p.first}</Button>}
            {o.status === "changes requested" && <Button variant="primary" icon="edit" onClick={onEdit}>Revise and resend</Button>}
            {o.status === "accepted" && <Button variant="primary" icon="placement" onClick={onPlacements}>View placement</Button>}
            {o.status === "declined" && <Button icon="plus" onClick={onNew}>New offer</Button>}
            {live && o.status !== "changes requested" && <Button icon="edit" onClick={onEdit}>Edit package</Button>}
            {live && <Button variant="ghost" icon="x" onClick={onWithdraw}>Withdraw</Button>}
          </div>
        </div>
      </Card>

      <Grid cols="rc-g2">
        <Card title="The package" action={<Button size="sm" variant="ghost" iconRight="arrowRight" onClick={() => openDrawer("offer", o.id)}>Open detail</Button>}>
          <KV items={[
            { k: "Base salary", v: eur(o.salary) },
            { k: "Bonus", v: o.bonus },
            { k: "Start date", v: o.start },
            { k: "Offer expires", v: o.expires },
            { k: "Location", v: o.location },
            { k: "Approver", v: o.approver || "Not set" },
          ]} />
          <Label style={{ marginTop: 16 }}>Benefits</Label>
          <div className="rc-col" style={{ gap: 7, marginTop: 9 }}>
            {o.benefits.map(b => (
              <div key={b} className="rc-row" style={{ gap: 9, fontSize: 12.5, color: "var(--body)" }}>
                <span style={{ width: 18, height: 18, flex: "none", borderRadius: 6, background: "var(--teal-soft, var(--ok-soft))", color: "var(--teal, var(--ok))", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="check" size={10} stroke={3} /></span>
                {b}
              </div>
            ))}
            {!o.benefits.length && <div style={{ fontSize: 12.5, color: "var(--dim)" }}>No benefits listed.</div>}
          </div>
        </Card>

        <Card title="Against expectations" sub="Where the base salary sits" action={<DemoTag />}>
          <RangeBar min={lo} max={hi} band={c.marketRange} scenario={vis.showSalary ? exp : null} marker={o.salary} markerLabel="Offer" format={eurK} />
          <div className="rc-row rc-wrap" style={{ gap: 14, fontSize: 11.5, color: "var(--faint)", marginTop: 2 }}>
            <span className="rc-row" style={{ gap: 6 }}><span style={{ width: 14, height: 6, borderRadius: 3, background: "linear-gradient(90deg, #4263EB, var(--teal, #16B8A6))" }} />Market range (illustrative)</span>
            {vis.showSalary && <span className="rc-row" style={{ gap: 6 }}><span style={{ width: 14, height: 8, borderRadius: 4, border: "1.5px dashed var(--warn)" }} />{p.first}'s stated expectation</span>}
          </div>
          {position && <div style={{ marginTop: 12 }}><Badge tone={position.tone} icon={position.tone === "ok" ? "check" : "info"}>{position.text}</Badge></div>}
          <div className="rc-col" style={{ gap: 8, marginTop: 14, fontSize: 12.5 }}>
            <Line k={p.first + "'s stated expectation"} v={vis.showSalary ? eur(exp[0]) + " to " + eur(exp[1]) : "Not shared by the candidate"} />
            <Line k="Market range (illustrative)" v={eur(c.marketRange[0]) + " to " + eur(c.marketRange[1])} />
            {v && <Line k="Role budget" v={eur(v.salary[0]) + " to " + eur(v.salary[1])} />}
          </div>
        </Card>
      </Grid>

      <Grid cols="rc-g-3-2">
        <Card title="Negotiation history" sub="Oldest first. Every change, approval and response is logged.">
          <Timeline items={o.history.map(h => ({ when: h.when, title: h.who, body: h.text, tone: KIND_TONE[h.kind] }))} />
        </Card>
        <div className="rc-col" style={{ gap: 14 }}>
          <Card title={p.first + "'s responses"} sub={o.visibleToCandidate ? undefined : "Nothing yet. " + p.first + " hasn't seen this offer."}>
            {asks.length ? (
              <div className="rc-col" style={{ gap: 9 }}>
                {asks.map((h, i) => (
                  <div key={i} style={{ padding: "10px 12px", borderRadius: 12, background: "var(--surface-2)", border: "1px solid var(--border)", fontSize: 12.5, lineHeight: 1.5 }}>
                    <div className="rc-row" style={{ gap: 8 }}><span className="rc-grow" style={{ color: "var(--ink)" }}>{h.text}</span><span style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--faint)", whiteSpace: "nowrap" }}>{h.when}</span></div>
                  </div>
                ))}
              </div>
            ) : o.visibleToCandidate ? <div style={{ fontSize: 12.5, color: "var(--dim)" }}>No questions or requests yet.</div> : null}
            {lastFromThem && o.visibleToCandidate && (
              <div style={{ marginTop: 12 }}>
                <Label>Latest message</Label>
                <div style={{ marginTop: 7, fontSize: 13, lineHeight: 1.55, color: "var(--body)", padding: "10px 12px", borderLeft: "2px solid var(--teal, var(--ok))", background: "var(--surface-faint)", borderRadius: "0 12px 12px 0" }}>
                  {lastFromThem.text}
                  <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--faint)", marginTop: 5 }}>{lastFromThem.when}</div>
                </div>
              </div>
            )}
            {o.visibleToCandidate && <Button size="sm" icon="messages" style={{ marginTop: 12 }} onClick={onMessage}>{thread ? "Reply in inbox" : "Open inbox"}</Button>}
          </Card>
          {considering && (
            <Note icon="info">
              {p.first} has indicated {pronoun(c.story)} is considering more than one opportunity. Recruit doesn't share other employers' terms, and nobody else sees yours.
            </Note>
          )}
          {o.contingency && !o.visibleToCandidate && (
            <Note icon="eyeOff">A contingency offer is held privately in case the first-choice offer is declined. {p.first} sees nothing until it is sent.</Note>
          )}
        </div>
      </Grid>
    </div>
  );
}

function Line({ k, v }: { k: string; v: string }) {
  return (
    <div className="rc-row" style={{ gap: 10 }}>
      <span className="rc-grow" style={{ color: "var(--dim)" }}>{k}</span>
      <span style={{ color: "var(--ink)", fontVariantNumeric: "tabular-nums", textAlign: "right" }}>{v}</span>
    </div>
  );
}

function Stepper({ step, status, final }: { step: number; status: Offer["status"]; final: string }) {
  const labels = STEPS.concat([final]);
  const endTone = status === "declined" ? "var(--bad)" : status === "accepted" ? "var(--ok)" : "var(--accent)";
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(5, minmax(0, 1fr))", marginTop: 22 }} aria-label="Approval workflow">
      {labels.map((l, i) => {
        const done = i < step || (i === step && (status === "accepted"));
        const cur = i === step && status !== "accepted";
        const warn = cur && (status === "changes requested" || status === "awaiting approval");
        const bad = cur && status === "declined";
        const withdrawn = status === "withdrawn" && i === step;
        const color = bad ? "var(--bad)" : withdrawn ? "var(--dim)" : warn ? "var(--warn)" : done || cur ? (i === 4 ? endTone : "var(--accent)") : "var(--track)";
        return (
          <div key={l} style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center", minWidth: 0 }}>
            {i > 0 && <span style={{ position: "absolute", top: 11, right: "50%", width: "100%", height: 2, background: i <= step ? "var(--accent)" : "var(--track)", opacity: i <= step ? 0.7 : 1 }} />}
            <span style={{ position: "relative", width: 24, height: 24, borderRadius: 999, display: "flex", alignItems: "center", justifyContent: "center",
              background: done ? color : "var(--surface)", border: "2px solid " + color, color: done ? "var(--on-accent)" : color,
              boxShadow: cur ? "0 0 0 4px color-mix(in oklab, " + color + " 18%, transparent)" : "none" }}>
              {done ? <Icon name="check" size={11} stroke={3} /> : withdrawn ? <Icon name="x" size={10} stroke={3} /> : <span style={{ fontSize: 10.5, fontWeight: 600 }}>{i + 1}</span>}
            </span>
            <span style={{ fontSize: 11.5, marginTop: 7, textAlign: "center", lineHeight: 1.3, padding: "0 4px", color: cur || done ? "var(--ink)" : "var(--faint)", fontWeight: cur ? 600 : 500 }}>
              {i === 3 && status === "changes requested" ? "Changes requested" : withdrawn ? "Withdrawn" : l}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function ChooseCandidate({ open, onClose, options, onPick, onPipeline }: {
  open: boolean; onClose: () => void; options: { value: string; label: string }[];
  onPick: (vacancyId: string, candidateId: string) => void; onPipeline: () => void;
}) {
  const [pick, setPick] = useState("");
  const value = pick || options[0]?.value || "";
  return (
    <Modal open={open} onClose={onClose} width={520} title="Create an offer" sub="Offers start from people at the interview or offer stage."
      footer={options.length ? <>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="primary" iconRight="arrowRight" onClick={() => { const [vid, cid] = value.split("|"); onPick(vid, cid); }}>Build the package</Button>
      </> : <Button variant="primary" icon="hiring" onClick={onPipeline}>Open the pipeline</Button>}>
      {options.length ? (
        <Field label="Candidate">
          <Select value={value} onChange={setPick} options={options} />
        </Field>
      ) : (
        <Note>Everyone at the interview or offer stage already has an offer in progress. Move someone forward on the pipeline first.</Note>
      )}
    </Modal>
  );
}
