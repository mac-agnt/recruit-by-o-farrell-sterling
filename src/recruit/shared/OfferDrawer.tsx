import { useState, type ReactNode } from "react";
import { Avatar, Badge, Button, Chip, DemoTag, Drawer, Empty, Field, KV, Label, Note, TextArea, TextInput, Timeline, toneColor } from "../ui";
import { Icon } from "../icons";
import { useNav, type Role } from "../nav";
import { approveOffer, editOffer, openDrawer, sendOffer, submitOffer, useRecruit, vacancyById, withdrawOffer } from "../store";
import { candidate, displayName } from "../selectors";
import { EMPLOYER_BY_ID, EMPLOYER_TEAM, MARKET } from "../data";
import type { Offer } from "../data/types";
import { eur, eurK } from "../format";
import { EVENT_TONE, OFFER_STATUS, OfferResponseActions, PortalModal, daysUntil, noticeFit, noticeLabel, offerIsLive, offerTerms } from "./opportunityKit";

/* The one offer detail view. The candidate responds to it, the employer that
   made it edits, approves and sends it, and HQ reads it with a fee preview.
   Drafts and contingency offers never reach the candidate until sent. */

const KIND_LABEL: Record<string, string> = { system: "Recruit", employer: "Employer", candidate: "Candidate", approval: "Approval" };

function Section({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <div style={{ marginTop: 22 }}>
      <div className="rc-row" style={{ marginBottom: 10 }}><Label style={{ flex: 1 }}>{title}</Label>{action}</div>
      {children}
    </div>
  );
}

function approverLabel(o: Offer) {
  const member = EMPLOYER_TEAM.find(t => t.name === o.approver);
  return "Approve as " + (o.approver || "the approver") + (member ? ", " + member.role : "") + " (demo)";
}

export default function OfferDrawer({ id, onClose, ctx }: { id: string; onClose: () => void; ctx?: Record<string, string> }) {
  const s = useRecruit();
  const nav = useNav();
  const [editOpen, setEditOpen] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const role = (ctx?.role as Role | undefined) || nav.role;
  const o = s.offers.find(x => x.id === id);

  if (!o) {
    return <Drawer open onClose={onClose} eyebrow="OFFER" title="Offer not found"><Empty icon="offers" title="This offer is no longer available" /></Drawer>;
  }
  const isCand = role === "candidate" || role === "public";
  const isEmp = role === "employer";
  const isHq = role === "hq";
  if (isCand && (!o.visibleToCandidate || o.candidateId !== s.persona)) {
    return (
      <Drawer open onClose={onClose} eyebrow="OFFER" title="Offer not available">
        <Empty icon="lock" title="This offer isn't available to you" body="Offers appear here only once the employer has approved and sent them." />
      </Drawer>
    );
  }
  if (isEmp && o.employerId !== s.employerId) {
    return (
      <Drawer open onClose={onClose} eyebrow="OFFER" title="Private offer">
        <Empty icon="lock" title="Offer details are private" body="Only the employer that made an offer and the candidate who received it can see its terms. Employers never see each other's offers." />
      </Drawer>
    );
  }

  const emp = EMPLOYER_BY_ID[o.employerId];
  const v = vacancyById(o.vacancyId, s);
  const c = candidate(s, o.candidateId);
  const shownName = isHq || isCand ? c.name : displayName(s, s.employerId, c);
  const t = offerTerms(o);
  const st = OFFER_STATUS[o.status];
  const left = daysUntil(o.expires);
  const live = offerIsLive(o);
  const closed = o.status === "accepted" || o.status === "declined" || o.status === "withdrawn";
  const fit = noticeFit(c.noticeWeeks, o.start);
  const first = isCand || isHq || !shownName.startsWith("Professional") ? c.name.split(" ")[0] : "the candidate";
  const startNote = isCand ? fit.label.charAt(0).toLowerCase() + fit.label.slice(1)
    : fit.level === "clash" ? "before " + first + "'s notice ends" : "fits " + first + "'s " + noticeLabel(c.noticeWeeks);
  const total = o.salary + t.bonusMax + t.pension + t.relocation;
  const rate = s.commissionRules[0]?.rate ?? MARKET.recruitDefaultRate;
  const exp = c.salaryExpectation;
  const vsExp = o.salary >= exp[0] && o.salary <= exp[1] ? { tone: "ok" as const, text: "Inside your " + eurK(exp[0]) + " to " + eurK(exp[1]) + " expectation" }
    : o.salary > exp[1] ? { tone: "ok" as const, text: "Above your " + eurK(exp[0]) + " to " + eurK(exp[1]) + " expectation" }
    : { tone: "warn" as const, text: eur(exp[0] - o.salary) + " below your expectation" };

  let footer: ReactNode = null;
  if (isCand && role === "candidate") {
    footer = live ? <OfferResponseActions offer={o} size="md" showView={false} />
      : <span style={{ fontSize: 12.5, color: "var(--dim)" }}>{st.candidate}. No further action is needed.</span>;
  } else if (isEmp) {
    footer = closed ? <span style={{ fontSize: 12.5, color: "var(--dim)" }}>This offer is {o.status}. No further action is needed.</span> : (
      <>
        <Button variant="ghost" icon="x" onClick={() => setWithdrawOpen(true)}>Withdraw</Button>
        <span className="rc-grow" />
        {o.status !== "changes requested" && <Button icon="edit" onClick={() => setEditOpen(true)}>Edit</Button>}
        {o.status === "draft" && <Button variant="primary" icon="send" onClick={() => submitOffer(o.id)}>Submit for approval</Button>}
        {o.status === "awaiting approval" && <Button variant="primary" icon="check" onClick={() => approveOffer(o.id)}>{approverLabel(o)}</Button>}
        {o.status === "approved" && <Button variant="primary" icon="send" onClick={() => sendOffer(o.id)}>Send to {first}</Button>}
        {o.status === "changes requested" && <Button variant="primary" icon="edit" onClick={() => setEditOpen(true)}>Revise and resend</Button>}
      </>
    );
  } else if (isHq) {
    footer = (
      <>
        <span style={{ fontSize: 12, color: "var(--faint)" }}>Read-only in Recruit HQ</span>
        <span className="rc-grow" />
        <Button icon="jobs" onClick={() => openDrawer("vacancy", o.vacancyId, ctx)}>View vacancy</Button>
      </>
    );
  }

  const lastCandidateAsk = [...o.history].reverse().find(e => e.kind === "candidate");

  return (
    <>
      <Drawer open onClose={onClose} width={640} eyebrow="OFFER" title={o.title}
        badge={<><Badge tone={st.tone} dot>{isCand ? st.candidate : st.label}</Badge>{o.contingency && !isCand && <Badge tone="warn" icon="layers">Contingency</Badge>}</>}
        sub={(emp?.name || "Employer") + ", " + o.location} footer={footer}>

        {o.contingency && !isCand && (
          <Note tone="warn" icon="alert" style={{ marginBottom: 14 }}>
            Contingency offer: prepared in case the first-choice offer is declined. It stays invisible to {first} until it is approved and sent.
          </Note>
        )}
        {isEmp && o.status === "changes requested" && lastCandidateAsk && (
          <Note tone="accent" icon="messages" style={{ marginBottom: 14 }}>{shownName} asked for changes: {lastCandidateAsk.text.replace(/^Requested changes: /, "")}</Note>
        )}

        {/* Parties */}
        <div style={{ display: "grid", gridTemplateColumns: isCand ? "1fr" : "repeat(auto-fit, minmax(240px, 1fr))", gap: 10 }}>
          <div className="rc-row" style={{ gap: 11, padding: "12px 13px", borderRadius: "var(--r-sm, 12px)", background: "var(--surface-2)", border: "1px solid var(--border)" }}>
            <Avatar initials={emp?.initials || "?"} tint={emp?.tint} size={36} square />
            <div className="rc-grow">
              <div className="rc-row" style={{ gap: 6, fontSize: 13.5, fontWeight: 500 }}>
                <span className="rc-ellipsis">{emp?.name}</span>
                {emp?.verified && <span title="Verified employer" style={{ color: "var(--teal, var(--ok))", display: "inline-flex" }}><Icon name="verified" size={13} /></span>}
              </div>
              <div style={{ fontSize: 11.5, color: "var(--dim)", marginTop: 2 }}>{emp?.contact}, {emp?.contactRole}</div>
            </div>
          </div>
          {!isCand && (
            <button className="rc-rowhover rc-focus" onClick={() => openDrawer("candidate", c.id, ctx)}
              style={{ display: "flex", alignItems: "center", gap: 11, padding: "12px 13px", borderRadius: "var(--r-sm, 12px)", background: "var(--surface-2)", border: "1px solid var(--border)", color: "inherit", cursor: "pointer", textAlign: "left" }}>
              <Avatar initials={c.initials} tint={c.tint} size={36} />
              <div className="rc-grow">
                <div className="rc-ellipsis" style={{ fontSize: 13.5, fontWeight: 500 }}>{shownName}</div>
                <div className="rc-ellipsis" style={{ fontSize: 11.5, color: "var(--dim)", marginTop: 2 }}>{c.title}, Recruit Index {c.recruitIndex}</div>
              </div>
              <Icon name="arrowRight" size={13} style={{ color: "var(--faint)" }} />
            </button>
          )}
        </div>

        {/* Package */}
        <Section title="The package" action={<DemoTag>Values illustrative</DemoTag>}>
          <div className="rc-row rc-wrap" style={{ alignItems: "baseline", gap: 10 }}>
            <span style={{ fontSize: 34, fontWeight: 600, letterSpacing: "-1.3px" }}>{eur(o.salary)}</span>
            <span style={{ fontSize: 13, color: "var(--dim)" }}>base salary a year</span>
            {isCand && <Badge tone={vsExp.tone}>{vsExp.text}</Badge>}
          </div>
          <div style={{ marginTop: 14 }}>
            <KV cols={2} items={[
              { k: "Bonus", v: <span>{o.bonus}{t.bonusMax > 0 && <span style={{ color: "var(--dim)" }}>, up to {eur(t.bonusMax)}</span>}</span> },
              { k: "Pension", v: t.pensionLine ? <span>{t.pensionLine}{t.pension > 0 && <span style={{ color: "var(--dim)" }}>, about {eur(t.pension)} a year</span>}</span> : "Not stated" },
              { k: "Healthcare", v: t.healthLine || "Not included" },
              { k: "Relocation", v: t.relocation ? eur(t.relocation) + " allowance, one-off" : "Not included" },
              { k: "Start", v: <span>{o.start}<span style={{ color: toneColor(fit.tone), fontSize: 11.5 }}> ({startNote})</span></span> },
              { k: "Respond by", v: <span>{o.expires}{left !== null && left >= 0 && !closed && <span style={{ color: left <= 3 ? "var(--warn)" : "var(--dim)" }}>, {left === 0 ? "today" : left === 1 ? "1 day left" : left + " days left"}</span>}</span> },
            ]} />
          </div>
          {t.others.length > 0 && (
            <div className="rc-row rc-wrap" style={{ gap: 7, marginTop: 12 }}>{t.others.map(b => <Chip key={b}><Icon name="check" size={11} stroke={2.4} />{b}</Chip>)}</div>
          )}
          <div className="rc-row rc-wrap" style={{ gap: 12, marginTop: 14, padding: "13px 14px", borderRadius: "var(--r-sm, 12px)", border: "1px dashed var(--border-strong)" }}>
            <div className="rc-grow" style={{ minWidth: 200 }}>
              <div style={{ fontSize: 12, color: "var(--dim)" }}>Illustrative first-year package</div>
              <div style={{ fontSize: 11.5, color: "var(--faint)", marginTop: 4, lineHeight: 1.5 }}>Base, bonus at its maximum, employer pension and any relocation allowance. Healthcare isn't costed. Before tax.</div>
            </div>
            <span style={{ fontSize: 22, fontWeight: 600, letterSpacing: "-.7px" }}>{eur(total)}</span>
          </div>
          <div style={{ fontSize: 11.5, color: "var(--faint)", marginTop: 8 }}>Approval: {o.approver || "Not required"}{v ? " · Vacancy: " + v.title : ""}</div>
        </Section>

        {isHq && (
          <Section title="Recruit fee preview" action={<DemoTag>Simulated</DemoTag>}>
            <KV cols={3} items={[
              { k: "Success fee if accepted", v: eur(o.salary * rate) + " (" + Math.round(rate * 100) + "%)" },
              { k: "Agency benchmark", v: eur(o.salary * MARKET.agencyBenchmarkRate) + " (" + Math.round(MARKET.agencyBenchmarkRate * 100) + "%)" },
              { k: "Employer saving", v: eur(o.salary * (MARKET.agencyBenchmarkRate - rate)) },
            ]} />
            <div style={{ fontSize: 11.5, color: "var(--faint)", marginTop: 8 }}>Invoiced on the start date if the offer is accepted. Rate from the standard commission rule.</div>
          </Section>
        )}

        {!isCand && (
          <div className="rc-row" style={{ gap: 8, marginTop: 14, fontSize: 12, color: "var(--dim)" }}>
            <Icon name={o.visibleToCandidate ? "eye" : "eyeOff"} size={13} />
            {o.visibleToCandidate ? "Visible to " + first + " since it was sent" : "Not visible to the candidate yet"}
          </div>
        )}

        <Section title="Negotiation history" action={<span style={{ fontSize: 11.5, color: "var(--dim)" }}>{o.history.length} events</span>}>
          <div className="rc-row rc-wrap" style={{ gap: 12, marginBottom: 14 }}>
            {(["employer", "candidate", "approval", "system"] as const).map(k => (
              <span key={k} className="rc-row" style={{ gap: 6, fontSize: 11.5, color: "var(--dim)" }}>
                <span style={{ width: 8, height: 8, borderRadius: 3, background: toneColor(EVENT_TONE[k]) }} />{KIND_LABEL[k]}
              </span>
            ))}
          </div>
          <Timeline items={o.history.map(e => ({ when: e.when, title: e.text, body: e.who === KIND_LABEL[e.kind] ? e.who : e.who + ", " + KIND_LABEL[e.kind].toLowerCase(), tone: EVENT_TONE[e.kind] }))} />
        </Section>

        {isCand && (
          <Note icon="shield" style={{ marginTop: 20 }}>
            You choose who sees your profile and which offers to consider. Employers can't bid for you or see each other's offers.
          </Note>
        )}
      </Drawer>

      {isEmp && <EditOfferModal key={o.id + o.history.length} offer={o} open={editOpen} onClose={() => setEditOpen(false)} />}
      {isEmp && (
        <PortalModal open={withdrawOpen} onClose={() => setWithdrawOpen(false)} width={520} title="Withdraw this offer?"
          sub={o.visibleToCandidate ? shownName + " will see that the offer was withdrawn." : "The candidate never saw this offer, so they won't be told."}
          footer={<><Button variant="ghost" onClick={() => setWithdrawOpen(false)}>Keep offer</Button><Button variant="danger" icon="x" onClick={() => { withdrawOffer(o.id); setWithdrawOpen(false); }}>Withdraw offer</Button></>}>
          <div style={{ fontSize: 13, color: "var(--body)", lineHeight: 1.55 }}>{o.title}, {eur(o.salary)}. The withdrawal is added to the offer history.</div>
        </PortalModal>
      )}
    </>
  );
}

function EditOfferModal({ offer, open, onClose }: { offer: Offer; open: boolean; onClose: () => void }) {
  const [salary, setSalary] = useState(String(offer.salary));
  const [bonus, setBonus] = useState(offer.bonus);
  const [benefits, setBenefits] = useState(offer.benefits.join("\n"));
  const [start, setStart] = useState(offer.start);
  const [expires, setExpires] = useState(offer.expires);
  const [note, setNote] = useState("");
  const resend = offer.status === "changes requested";
  const n = Math.round(Number(salary.replace(/[^\d.]/g, "")));
  const valid = Number.isFinite(n) && n >= 20000 && n <= 500000;

  const save = () => {
    const list = benefits.split("\n").map(x => x.trim()).filter(Boolean);
    const patch: Partial<Pick<Offer, "salary" | "bonus" | "benefits" | "start" | "expires">> = {};
    const changes: string[] = [];
    if (n !== offer.salary) { patch.salary = n; changes.push("base " + eur(n)); }
    if (bonus.trim() !== offer.bonus) { patch.bonus = bonus.trim(); changes.push("bonus updated"); }
    if (list.join("|") !== offer.benefits.join("|")) { patch.benefits = list; changes.push("benefits updated"); }
    if (start.trim() !== offer.start) { patch.start = start.trim(); changes.push("start " + start.trim()); }
    if (expires.trim() !== offer.expires) { patch.expires = expires.trim(); changes.push("respond by " + expires.trim()); }
    const summary = note.trim() || (changes.length ? "Revised: " + changes.join(", ") : resend ? "Resent without changes" : "Offer reviewed, no changes");
    editOffer(offer.id, patch, summary);
    onClose();
  };

  return (
    <PortalModal open={open} onClose={onClose} width={620} title={resend ? "Revise and resend" : "Edit offer"}
      sub={resend ? "Your revision goes straight back to the candidate with a note in the history." : "Changes are logged in the offer history."}
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant="primary" icon={resend ? "send" : "check"} disabled={!valid} onClick={save}>{resend ? "Revise and resend" : "Save changes"}</Button></>}>
      <div className="rc-col" style={{ gap: 14 }}>
        <div className="rc-grid rc-g2" style={{ gap: 12 }}>
          <Field label="Base salary (EUR)" error={valid ? undefined : "Enter a salary between €20,000 and €500,000"}>
            <TextInput inputMode="numeric" value={salary} onChange={e => setSalary(e.target.value)} />
          </Field>
          <Field label="Bonus"><TextInput value={bonus} onChange={e => setBonus(e.target.value)} /></Field>
          <Field label="Start date"><TextInput value={start} onChange={e => setStart(e.target.value)} /></Field>
          <Field label="Respond by"><TextInput value={expires} onChange={e => setExpires(e.target.value)} /></Field>
        </div>
        <Field label="Benefits" hint="One per line, for example: Pension, 8% employer contribution">
          <TextArea rows={4} value={benefits} onChange={e => setBenefits(e.target.value)} />
        </Field>
        <Field label="Note for the history (optional)" hint="Left blank, Recruit writes a summary of what changed.">
          <TextInput value={note} onChange={e => setNote(e.target.value)} placeholder="For example: relocation support added as requested" />
        </Field>
      </div>
    </PortalModal>
  );
}
