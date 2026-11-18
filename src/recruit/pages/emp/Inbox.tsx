import { useEffect, useMemo, useRef, useState } from "react";
import { Avatar, Badge, Button, Card, Chip, Empty, Grid, Label, Note, Page, Segmented, TextArea, TextInput } from "../../ui";
import { Icon } from "../../icons";
import { useNav } from "../../nav";
import { markThreadRead, offerById, openDrawer, sendMessage, setActiveVacancy, update, useRecruit, vacancyById, type RecruitState } from "../../store";
import { CANDIDATE_BY_ID, EMPLOYER_BY_ID, STAGES } from "../../data";
import type { MessageThread } from "../../data/types";
import { eur, initials } from "../../format";
import { FOCUS_OFFER, FOCUS_THREAD, OFFER_STATUS, PersonAvatar, consentState, offerFor, who } from "./hiringKit";

/* The employer inbox: conversations with candidates and the Recruit team.
   Replies to story candidates also land in their own portal. */

/* How many messages each thread had when it was last opened this session,
   so a reply that arrives later shows as unread again. */
const seen: Record<string, number> = {};

const isUnread = (s: RecruitState, t: MessageThread) => {
  if (seen[t.id] !== undefined) return t.messages.length > seen[t.id] && t.messages[t.messages.length - 1]?.from === "them";
  return t.unread && !s.readThreads.includes(t.id);
};
const candidateRef = (t: MessageThread) => t.refs.find(r => !!CANDIDATE_BY_ID[r]);

function suggestions(s: RecruitState, t: MessageThread) {
  const first = t.with.split(" ")[0];
  const cid = candidateRef(t);
  if (!cid) return ["Thanks " + first + ". Could you send the year summary to Deirdre Foley as well?", "Happy to walk through it. Does Thursday afternoon suit?"];
  const offer = s.offers.find(o => o.candidateId === cid && o.employerId === s.employerId && (o.status === "sent" || o.status === "changes requested"));
  if (offer) return ["Thanks " + first + ". Happy to talk through any part of the package before " + offer.expires + ".", "Would a call with Conall Hegarty, our interim general manager, help with your decision?"];
  if (s.interviews.some(i => i.candidateId === cid && i.status === "scheduled")) return ["See you then, " + first + ". Reception will call me when you arrive.", "Thanks " + first + ". I'll send the panel's names and an agenda the day before."];
  return ["Thanks " + first + ". I'll come back to you this week.", "Would a short call this week suit you?"];
}

export default function Inbox() {
  const s = useRecruit();
  const nav = useNav();
  const [filter, setFilter] = useState<"all" | "unread" | "candidates" | "recruit">("all");
  const [q, setQ] = useState("");
  const [sel, setSel] = useState<string | null>(() => FOCUS_THREAD.get() || s.employerThreads.find(t => isUnread(s, t))?.id || s.employerThreads[0]?.id || null);
  const [text, setText] = useState("");
  useEffect(() => { FOCUS_THREAD.set(null); }, []);

  const threads = s.employerThreads;
  const current = threads.find(t => t.id === sel) || null;
  const msgCount = current?.messages.length || 0;

  /* Opening a thread marks it read in the shared store and remembers how far we've read. */
  useEffect(() => {
    if (!current) return;
    seen[current.id] = current.messages.length;
    markThreadRead(current.id);
    if (current.unread) update(st => ({ employerThreads: st.employerThreads.map(t => (t.id === current.id ? { ...t, unread: false } : t)) }));
  }, [current?.id, msgCount]); // eslint-disable-line react-hooks/exhaustive-deps

  const shown = useMemo(() => threads.filter(t => {
    if (filter === "unread" && !isUnread(s, t) && t.id !== sel) return false;
    if (filter === "candidates" && !candidateRef(t)) return false;
    if (filter === "recruit" && candidateRef(t)) return false;
    if (q.trim()) {
      const hay = (t.with + " " + t.subject + " " + t.messages.map(m => m.text).join(" ")).toLowerCase();
      if (!hay.includes(q.trim().toLowerCase())) return false;
    }
    return true;
  }), [threads, filter, q, s, sel]);
  const unreadCount = threads.filter(t => isUnread(s, t)).length;

  const send = () => {
    if (!current || !text.trim()) return;
    const body = text.trim();
    sendMessage(current.id, body, "employer");
    mirrorToCandidate(current, body);
    seen[current.id] = current.messages.length + 1;
    setText("");
  };

  return (
    <Page wide eyebrow="MESSAGES" title="Inbox"
      sub={unreadCount ? unreadCount + (unreadCount === 1 ? " conversation needs" : " conversations need") + " a reply. Contact details stay private until a candidate shares them." : "You're up to date. Contact details stay private until a candidate shares them."}
      actions={<Button icon="bell" onClick={() => nav.go("emp.messages", "notifications")}>Notifications</Button>}>

      {!threads.length ? (
        <Card><Empty icon="messages" title="No conversations yet" body="Messages start when a candidate accepts an introduction or replies to an offer." /></Card>
      ) : (
        <Grid cols="rc-g-side">
          <div className="rc-col" style={{ gap: 10, minWidth: 0 }}>
            <div style={{ position: "relative" }}>
              <span style={{ position: "absolute", left: 12, top: 12, color: "var(--faint)" }}><Icon name="search" size={15} /></span>
              <TextInput value={q} onChange={e => setQ(e.target.value)} placeholder="Search messages" aria-label="Search messages" style={{ paddingLeft: 36 }} />
            </div>
            <Segmented size="sm" value={filter} onChange={setFilter} style={{ width: "100%" }}
              options={[{ id: "all", label: "All" }, { id: "unread", label: "Unread" }, { id: "candidates", label: "People" }, { id: "recruit", label: "Recruit" }]} />
            <Card pad={6}>
              {shown.map(t => {
                const unread = isUnread(s, t);
                const on = t.id === current?.id;
                const last = t.messages[t.messages.length - 1];
                const cid = candidateRef(t);
                const p = cid ? who(s, s.employerId, cid) : null;
                return (
                  <button key={t.id} onClick={() => setSel(t.id)} className="rc-rowhover rc-focus" aria-current={on}
                    style={{ width: "100%", display: "flex", gap: 10, padding: "11px 10px", border: 0, borderRadius: 14, textAlign: "left", cursor: "pointer", color: "inherit",
                      background: on ? "var(--accent-faint)" : "transparent", boxShadow: on ? "inset 0 0 0 1px var(--accent-line)" : "none" }}>
                    {p ? <PersonAvatar c={p.c} hidden={p.hidden} size={34} /> : <Avatar initials={t.initials} tint={t.tint} size={34} />}
                    <div className="rc-grow">
                      <div className="rc-row" style={{ gap: 6 }}>
                        <span className="rc-ellipsis rc-grow" style={{ fontSize: 13, fontWeight: unread ? 650 : 500, color: "var(--ink)" }}>{p ? p.name : t.with}</span>
                        <span style={{ fontFamily: "var(--mono)", fontSize: 10, color: unread ? "var(--accent)" : "var(--faint)", whiteSpace: "nowrap" }}>{last?.when}</span>
                      </div>
                      <div className="rc-ellipsis" style={{ fontSize: 12, color: unread ? "var(--body)" : "var(--dim)", marginTop: 2, fontWeight: unread ? 500 : 400 }}>{t.subject}</div>
                      <div className="rc-row" style={{ gap: 6, marginTop: 3 }}>
                        <span className="rc-ellipsis rc-grow" style={{ fontSize: 11.5, color: "var(--faint)" }}>{last ? (last.from === "me" ? "You: " : "") + last.text : ""}</span>
                        {unread && <span aria-label="Unread" style={{ width: 8, height: 8, borderRadius: 999, background: "var(--accent)", flex: "none" }} />}
                      </div>
                    </div>
                  </button>
                );
              })}
              {!shown.length && <div style={{ padding: 16, fontSize: 12.5, color: "var(--dim)", textAlign: "center" }}>No conversations match.</div>}
            </Card>
          </div>

          {current ? (
            <Grid cols="rc-g-side-r">
              <Conversation key={current.id} t={current} s={s} text={text} setText={setText} onSend={send} />
              <ThreadContext t={current} s={s}
                onOffer={id => { FOCUS_OFFER.set(id); nav.go("emp.hiring", "offers"); }}
                onPipeline={vid => { setActiveVacancy(vid); nav.go("emp.hiring", "shortlists"); }}
                onCosts={tab => nav.go("emp.costs", tab)} />
            </Grid>
          ) : (
            <Card><Empty icon="messages" title="Pick a conversation" /></Card>
          )}
        </Grid>
      )}
    </Page>
  );
}

function Conversation({ t, s, text, setText, onSend }: {
  t: MessageThread; s: RecruitState; text: string; setText: (v: string) => void; onSend: () => void;
}) {
  const listRef = useRef<HTMLDivElement>(null);
  useEffect(() => { const el = listRef.current; if (el) el.scrollTop = el.scrollHeight; }, [t.messages.length]);
  const cid = candidateRef(t);
  const p = cid ? who(s, s.employerId, cid) : null;
  const refs = t.refs.filter(r => r !== cid);
  return (
    <Card pad={0} style={{ display: "flex", flexDirection: "column", minHeight: 520 }}>
      <div className="rc-row rc-wrap" style={{ gap: 12, padding: "16px 20px", borderBottom: "1px solid var(--border)" }}>
        {p ? <PersonAvatar c={p.c} hidden={p.hidden} size={38} /> : <Avatar initials={t.initials} tint={t.tint} size={38} />}
        <div className="rc-grow" style={{ minWidth: 180 }}>
          <div style={{ fontSize: 15, fontWeight: 600 }}>{p ? p.name : t.with}</div>
          <div style={{ fontSize: 12, color: "var(--dim)", marginTop: 2 }}>{t.withRole} · {t.subject}</div>
        </div>
        <div className="rc-row rc-wrap" style={{ gap: 6 }}>
          {cid && <Chip onClick={() => openDrawer("candidate", cid)}><Icon name="candidate" size={12} />Profile</Chip>}
          {refs.map(r => <RefChip key={r} id={r} s={s} />)}
        </div>
      </div>
      <div ref={listRef} style={{ flex: 1, padding: "18px 20px", display: "flex", flexDirection: "column", gap: 12, overflowY: "auto", maxHeight: 460 }}>
        {t.messages.map((m, i) => {
          const me = m.from === "me";
          return (
            <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: me ? "flex-end" : "flex-start", animation: "rcRise .35s cubic-bezier(.16,1,.3,1) both" }}>
              <div style={{ maxWidth: "78%", padding: "10px 14px", borderRadius: me ? "16px 16px 4px 16px" : "16px 16px 16px 4px", fontSize: 13, lineHeight: 1.55,
                background: me ? "var(--accent-soft)" : "var(--surface-2)", border: "1px solid " + (me ? "var(--accent-line)" : "var(--border)"), color: "var(--ink)" }}>
                {m.text}
              </div>
              <span style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--faint)", marginTop: 5 }}>{me ? "Rachel Moran" : (p ? p.name : t.with)} · {m.when}</span>
            </div>
          );
        })}
      </div>
      <div style={{ padding: "12px 16px 16px", borderTop: "1px solid var(--border)" }}>
        <div className="rc-row rc-wrap" style={{ gap: 6, marginBottom: 10 }}>
          {suggestions(s, t).map(x => (
            <button key={x} onClick={() => setText(x)} className="rc-chip-btn rc-focus"
              style={{ maxWidth: "100%", height: "auto", minHeight: 28, padding: "5px 11px", borderRadius: 12, border: "1px solid var(--border)", background: "var(--surface-faint)", color: "var(--dim)", fontSize: 11.5, textAlign: "left", cursor: "pointer", lineHeight: 1.4 }}>
              {x}
            </button>
          ))}
        </div>
        <div className="rc-row" style={{ gap: 10, alignItems: "flex-end" }}>
          <TextArea rows={2} value={text} onChange={e => setText(e.target.value)} placeholder={"Reply to " + (p ? p.first : t.with.split(" ")[0])} aria-label="Reply"
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onSend(); } }} style={{ flex: 1 }} />
          <Button variant="primary" icon="send" disabled={!text.trim()} onClick={onSend}>Send</Button>
        </div>
        <div style={{ fontSize: 11, color: "var(--faint)", marginTop: 7 }}>Enter sends, Shift and Enter adds a line. Messages stay inside Recruit.</div>
      </div>
    </Card>
  );
}

function RefChip({ id, s }: { id: string; s: RecruitState }) {
  const offer = offerById(id, s);
  if (offer) return <Chip onClick={() => openDrawer("offer", id)}><Icon name="offers" size={12} />Offer {eur(offer.salary)}</Chip>;
  if (CANDIDATE_BY_ID[id]) return <Chip onClick={() => openDrawer("candidate", id)}><Icon name="candidate" size={12} />{who(s, s.employerId, id).name}</Chip>;
  const v = vacancyById(id, s);
  if (v) return <Chip onClick={() => openDrawer("vacancy", id)}><Icon name="vacancies" size={12} />{v.title}</Chip>;
  const e = EMPLOYER_BY_ID[id];
  if (e) return <Chip onClick={() => openDrawer("employer", id)}><Icon name="employer" size={12} />{e.short}</Chip>;
  return null;
}

function ThreadContext({ t, s, onOffer, onPipeline, onCosts }: {
  t: MessageThread; s: RecruitState; onOffer: (id: string) => void; onPipeline: (vacancyId: string) => void; onCosts: (tab: string) => void;
}) {
  const cid = candidateRef(t);
  if (!cid) {
    const plan = s.tiers.find(x => x.id === s.membershipTier);
    return (
      <Card title="Your account" sub="Context for this conversation" style={{ alignSelf: "start" }}>
        <div className="rc-col" style={{ gap: 9, fontSize: 12.5 }}>
          <Row k="Plan" v={(plan?.label || "") + " · " + eur(plan?.price || 0) + " a year"} />
          <Row k="Renews" v={(EMPLOYER_BY_ID[s.employerId]?.renewal || "") + " 2027"} />
          <Row k="Placements this year" v={String((EMPLOYER_BY_ID[s.employerId]?.placementsYtd || 0) + s.placements.filter(p => p.employerId === s.employerId).length)} />
        </div>
        <div className="rc-row rc-wrap" style={{ gap: 8, marginTop: 14 }}>
          <Button size="sm" icon="placement" onClick={() => onCosts("billing")}>Billing</Button>
          <Button size="sm" variant="ghost" iconRight="arrowRight" onClick={() => onCosts("calculator")}>Calculator</Button>
        </div>
      </Card>
    );
  }
  const p = who(s, s.employerId, cid);
  const entries = s.pipeline.filter(e => e.candidateId === cid && vacancyById(e.vacancyId, s)?.employerId === s.employerId);
  const consent = consentState(s, s.employerId, cid);
  return (
    <Card title="About this person" sub={p.c.title} style={{ alignSelf: "start" }}>
      <div className="rc-row" style={{ gap: 10 }}>
        <PersonAvatar c={p.c} hidden={p.hidden} size={40} />
        <div className="rc-grow">
          <div style={{ fontSize: 14, fontWeight: 600 }}>{p.name}</div>
          <div style={{ fontSize: 12, color: "var(--dim)", marginTop: 2 }}>{p.c.currentOrgPublic}</div>
        </div>
      </div>
      <div className="rc-row rc-wrap" style={{ gap: 6, marginTop: 12 }}>
        <Badge>Index {p.c.recruitIndex}</Badge>
        <Badge tone={consent === "shared" ? "teal" : consent === "pending" ? "warn" : "neutral"} icon={consent === "shared" ? "check" : "lock"}>{consent === "shared" ? "Details shared" : consent === "pending" ? "Awaiting consent" : "Contact hidden"}</Badge>
      </div>
      <Label style={{ marginTop: 16 }}>With Harbourview</Label>
      <div className="rc-col" style={{ gap: 8, marginTop: 8 }}>
        {entries.map(e => {
          const v = vacancyById(e.vacancyId, s);
          const o = offerFor(s, s.employerId, e.vacancyId, cid);
          return (
            <div key={e.id} style={{ padding: "10px 12px", borderRadius: 12, background: "var(--surface-2)", border: "1px solid var(--border)" }}>
              <div className="rc-row" style={{ gap: 6 }}>
                <span className="rc-grow rc-ellipsis" style={{ fontSize: 12.5, color: "var(--ink)" }}>{v?.title}</span>
                <Badge>{STAGES.find(st => st.id === e.stage)?.label}</Badge>
              </div>
              {o && <div className="rc-row" style={{ gap: 6, marginTop: 7 }}><Badge tone={OFFER_STATUS[o.status].tone}>{OFFER_STATUS[o.status].label}</Badge><span style={{ fontSize: 12, color: "var(--dim)" }}>{eur(o.salary)}</span></div>}
              <div className="rc-row rc-wrap" style={{ gap: 6, marginTop: 9 }}>
                {o && <Button size="sm" icon="offers" onClick={() => onOffer(o.id)}>Offer</Button>}
                <Button size="sm" variant="ghost" icon="hiring" onClick={() => onPipeline(e.vacancyId)}>Pipeline</Button>
              </div>
            </div>
          );
        })}
        {!entries.length && <div style={{ fontSize: 12.5, color: "var(--dim)" }}>Not on a Harbourview pipeline.</div>}
      </div>
      <Note icon="shield" style={{ marginTop: 14 }}>Recruit doesn't show other employers' conversations or offers.</Note>
    </Card>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return <div className="rc-row" style={{ gap: 8 }}><span className="rc-grow" style={{ color: "var(--dim)" }}>{k}</span><span style={{ color: "var(--ink)" }}>{v}</span></div>;
}

/** Story candidates have their own inbox: put Rachel's reply in the matching thread there too. */
function mirrorToCandidate(t: MessageThread, text: string) {
  const cid = candidateRef(t);
  if (!cid || !CANDIDATE_BY_ID[cid]?.story) return;
  update(st => {
    const emp = EMPLOYER_BY_ID[st.employerId];
    const list = (st.candidateThreads[cid] || []).slice();
    const at = list.findIndex(x => x.refs.some(r => t.refs.includes(r)) || x.with === emp?.contact);
    const msg = { from: "them" as const, text, when: "Just now" };
    if (at > -1) list[at] = { ...list[at], unread: true, messages: list[at].messages.concat([msg]) };
    else list.unshift({ id: "ct" + Date.now().toString(36), with: emp?.contact || "Employer", withRole: (emp?.contactRole || "") + ", " + (emp?.name || ""), initials: initials(emp?.contact || "Employer"),
      tint: emp?.tint || "#9fb4ff", subject: t.subject, unread: true, refs: t.refs.filter(r => r !== cid), messages: [msg] });
    return { candidateThreads: { ...st.candidateThreads, [cid]: list } };
  });
}
