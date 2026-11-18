import { useEffect, useRef, useState } from "react";
import { Avatar, Badge, Button, Card, Chip, DemoTag, Empty, Grid, Label, Note, Page, Spinner, TextArea } from "../../ui";
import { Icon } from "../../icons";
import { useNav } from "../../nav";
import { markThreadRead, openDrawer, sendMessage, update, useRecruit, vacancyById, type RecruitState } from "../../store";
import { candidate } from "../../selectors";
import { CAREER_PATHS, COURSE_BY_ID, EMPLOYER_BY_ID, PARTNER_BY_ID, type CareerPath } from "../../data";
import type { Candidate, MessageThread } from "../../data/types";
import { eur, eurK } from "../../format";
import { OFFER_STATUS, OfferResponseActions, offerIsLive } from "../../shared/opportunityKit";

/* Offers, messages. The candidate's conversations with employers and with
   Recruit. Employers can only write once the candidate has applied or agreed
   to an introduction. Agent replies are scripted demo responses. */

export default function Messages() {
  const s = useRecruit();
  return <MessagesView key={s.persona} />;
}

const isAgent = (t: MessageThread) => /agent/i.test(t.withRole);
const unreadOf = (t: MessageThread, s: RecruitState) => t.unread && !s.readThreads.includes(t.id);

interface Ref { key: string; label: string; icon: string; open: () => void }

function MessagesView() {
  const s = useRecruit();
  const nav = useNav();
  const c = candidate(s, s.persona);
  const threads = s.candidateThreads[c.id] || [];
  const [activeId, setActiveId] = useState<string | null>(() => (threads.find(t => unreadOf(t, s)) || threads[0])?.id || null);
  const [draft, setDraft] = useState("");
  const [typing, setTyping] = useState<string | null>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const active = threads.find(t => t.id === activeId) || threads[0];

  useEffect(() => { if (active) markThreadRead(active.id); }, [active?.id]);
  useEffect(() => { const el = scroller.current; if (el) el.scrollTop = el.scrollHeight; }, [active?.id, active?.messages.length, typing]);

  const unread = threads.filter(t => unreadOf(t, s)).length;

  if (!active) {
    return (
      <Page eyebrow="OFFERS" title="Your conversations." sub="Employers can message you only after you apply or accept an introduction.">
        <Card><Empty icon="messages" title="No conversations yet" body="When you apply for a role or accept an introduction, the employer can message you here."
          action={<Button size="sm" icon="jobs" onClick={() => nav.go("cand.jobs", "recommended")}>Recommended roles</Button>} /></Card>
      </Page>
    );
  }

  const refs = active.refs.map(r => resolveRef(r, active, c, s, nav.go)).filter((r): r is Ref => !!r);
  const who = isAgent(active) || /^recruit/i.test(active.with) ? active.with : active.with.split(" ")[0];
  const offer = s.offers.find(o => active.refs.includes(o.id) && o.candidateId === c.id && o.visibleToCandidate);
  const ideas = suggestions(active, s);

  const send = (text: string) => {
    const tx = text.trim();
    if (!tx) return;
    const tid = active.id;
    sendMessage(tid, tx, "candidate", c.id);
    setDraft("");
    if (isAgent(active)) {
      const reply = agentReply(c, tx);
      setTyping(tid);
      setTimeout(() => {
        update(st => ({ candidateThreads: { ...st.candidateThreads, [c.id]: (st.candidateThreads[c.id] || []).map(t => (t.id === tid ? { ...t, messages: t.messages.concat([{ from: "them", text: reply, when: "Just now" }]) } : t)) } }));
        setTyping(cur => (cur === tid ? null : cur));
      }, 1500);
    }
  };

  return (
    <Page wide eyebrow="OFFERS" title="Your conversations."
      sub="Messages with employers and with Recruit. Employers can write to you only after you apply or accept an introduction."
      actions={<Button icon="offers" onClick={() => nav.go("cand.offers", "incoming")}>Incoming offers</Button>}>
      <Grid cols="rc-g-side">
        <div className="rc-col" style={{ gap: 14, minWidth: 0 }}>
          <Card pad="14px 10px 10px">
            <div className="rc-row" style={{ padding: "0 8px 10px" }}>
              <span className="rc-grow" style={{ fontSize: 14, fontWeight: 600 }}>Inbox</span>
              {unread > 0 ? <Badge tone="accent">{unread} unread</Badge> : <span style={{ fontSize: 11.5, color: "var(--faint)" }}>All read</span>}
            </div>
            <div className="rc-col" style={{ gap: 4 }}>
              {threads.map(t => {
                const last = t.messages[t.messages.length - 1];
                const on = t.id === active.id;
                const isUnread = unreadOf(t, s);
                return (
                  <button key={t.id} className="rc-focus" onClick={() => { setActiveId(t.id); setDraft(""); }}
                    style={{ display: "flex", alignItems: "flex-start", gap: 10, width: "100%", padding: "10px 10px", borderRadius: 12, cursor: "pointer", textAlign: "left", font: "inherit", color: "inherit",
                      border: "1px solid " + (on ? "var(--accent-line)" : "transparent"), background: on ? "var(--accent-faint)" : "transparent", transition: "background .2s var(--ease)" }}>
                    <Avatar initials={t.initials} tint={t.tint} size={34} />
                    <span className="rc-grow">
                      <span className="rc-row" style={{ gap: 6 }}>
                        <span className="rc-grow rc-ellipsis" style={{ fontSize: 13, fontWeight: isUnread ? 650 : 500, color: "var(--ink)" }}>{t.with}</span>
                        <span style={{ fontFamily: "var(--mono)", fontSize: 9.5, color: "var(--faint)", whiteSpace: "nowrap" }}>{last?.when}</span>
                      </span>
                      <span className="rc-ellipsis" style={{ display: "block", fontSize: 12, color: "var(--body)", marginTop: 2 }}>{t.subject}</span>
                      <span className="rc-ellipsis" style={{ display: "block", fontSize: 11.5, color: "var(--dim)", marginTop: 2 }}>{last ? (last.from === "me" ? "You: " : "") + last.text : ""}</span>
                    </span>
                    {isUnread && <span style={{ width: 8, height: 8, borderRadius: 3, background: "var(--accent)", marginTop: 6, flex: "none" }} />}
                  </button>
                );
              })}
            </div>
          </Card>
          <Card pad="14px 16px">
            <Label>Who can message you</Label>
            <div className="rc-col" style={{ gap: 8, marginTop: 10 }}>
              {["Employers you applied to", "Employers whose introduction you accepted", "Recruit's team and agents, about your profile"].map(x => (
                <div key={x} className="rc-row" style={{ gap: 8, fontSize: 12, color: "var(--body)" }}>
                  <span style={{ color: "var(--teal, var(--ok))", display: "inline-flex" }}><Icon name="check" size={12} stroke={2.4} /></span>{x}
                </div>
              ))}
            </div>
            <Button size="sm" variant="ghost" icon="settings" style={{ marginTop: 10 }} onClick={() => nav.go("cand.settings", "privacy")}>Privacy settings</Button>
          </Card>
        </div>

        <Card pad={0} style={{ display: "flex", flexDirection: "column", minHeight: 560 }}>
          <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)" }}>
            <div className="rc-row" style={{ gap: 12, alignItems: "flex-start" }}>
              <Avatar initials={active.initials} tint={active.tint} size={40} />
              <div className="rc-grow">
                <div className="rc-row rc-wrap" style={{ gap: 8 }}>
                  <span style={{ fontSize: 15, fontWeight: 600 }}>{active.with}</span>
                  {isAgent(active) && <DemoTag>Scripted agent replies</DemoTag>}
                </div>
                <div style={{ fontSize: 12.5, color: "var(--dim)", marginTop: 3 }}>{active.withRole}</div>
                <div style={{ fontSize: 12.5, color: "var(--body)", marginTop: 6 }}>{active.subject}</div>
              </div>
              {offer && <Badge tone={OFFER_STATUS[offer.status].tone} dot>{OFFER_STATUS[offer.status].candidate}</Badge>}
            </div>
            {refs.length > 0 && (
              <div className="rc-row rc-wrap" style={{ gap: 7, marginTop: 12 }}>
                {refs.map(r => <Chip key={r.key} onClick={r.open}><Icon name={r.icon} size={12} />{r.label}<Icon name="arrowUpRight" size={11} /></Chip>)}
              </div>
            )}
            {offer && offerIsLive(offer) && (
              <div style={{ marginTop: 12, padding: "11px 12px", borderRadius: "var(--r-sm, 12px)", background: "var(--surface-2)", border: "1px solid var(--border)" }}>
                <div style={{ fontSize: 12, color: "var(--dim)", marginBottom: 9 }}>Respond to this {eur(offer.salary)} offer without leaving the conversation</div>
                <OfferResponseActions offer={offer} />
              </div>
            )}
          </div>

          <div ref={scroller} style={{ flex: 1, minHeight: 260, maxHeight: 460, overflowY: "auto", padding: "18px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
            {active.messages.map((m, i) => {
              const mine = m.from === "me";
              return (
                <div key={i} className="rc-rise" style={{ alignSelf: mine ? "flex-end" : "flex-start", maxWidth: "78%" }}>
                  <div style={{ padding: "10px 14px", borderRadius: mine ? "16px 16px 4px 16px" : "16px 16px 16px 4px", fontSize: 13, lineHeight: 1.55, color: "var(--ink)",
                    background: mine ? "var(--accent-soft)" : "var(--surface-2)", border: "1px solid " + (mine ? "var(--accent-line)" : "var(--border)"), whiteSpace: "pre-wrap" }}>{m.text}</div>
                  <div style={{ fontFamily: "var(--mono)", fontSize: 9.5, color: "var(--faint)", marginTop: 5, textAlign: mine ? "right" : "left" }}>{mine ? "You" : who} · {m.when}</div>
                </div>
              );
            })}
            {typing === active.id && (
              <div className="rc-row rc-fade" style={{ gap: 8, fontSize: 12, color: "var(--dim)" }}><Spinner size={12} />{active.with} is writing</div>
            )}
          </div>

          <div style={{ padding: "12px 20px 16px", borderTop: "1px solid var(--border)" }}>
            {ideas.length > 0 && (
              <div className="rc-row rc-wrap" style={{ gap: 7, marginBottom: 10 }}>
                {ideas.map(x => <Chip key={x} onClick={() => setDraft(x)}>{x}</Chip>)}
              </div>
            )}
            <div className="rc-row" style={{ gap: 10, alignItems: "flex-end" }}>
              <TextArea rows={2} value={draft} placeholder={"Write to " + who + "..."} onChange={e => setDraft(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(draft); } }} style={{ resize: "none" }} />
              <Button variant="primary" icon="send" disabled={!draft.trim()} onClick={() => send(draft)}>Send</Button>
            </div>
            <div style={{ fontSize: 11, color: "var(--faint)", marginTop: 7 }}>Enter to send, Shift and Enter for a new line.</div>
          </div>
        </Card>
      </Grid>
      <Note icon="lock">Your email address and phone number are never shown in messages. Employers see them only after you accept an introduction.</Note>
    </Page>
  );
}

function resolveRef(ref: string, t: MessageThread, c: Candidate, s: RecruitState, go: (page: string, tab?: string) => void): Ref | null {
  const o = s.offers.find(x => x.id === ref);
  if (o) return o.candidateId === c.id && o.visibleToCandidate
    ? { key: ref, label: "Offer: " + (EMPLOYER_BY_ID[o.employerId]?.short || "Employer") + ", " + eur(o.salary), icon: "offers", open: () => openDrawer("offer", ref, { role: "candidate" }) } : null;
  const v = vacancyById(ref, s);
  if (v) return { key: ref, label: v.title + ", " + (EMPLOYER_BY_ID[v.employerId]?.short || ""), icon: "jobs", open: () => openDrawer("vacancy", ref) };
  const e = EMPLOYER_BY_ID[ref];
  if (e) return { key: ref, label: e.name, icon: "employer", open: () => openDrawer("employer", ref) };
  const crs = COURSE_BY_ID[ref];
  if (crs) return { key: ref, label: crs.title, icon: "learning", open: () => openDrawer("course", ref) };
  if (ref === c.id) {
    if (isAgent(t)) return { key: ref, label: "Career explorer", icon: "explorer", open: () => go("cand.explorer", "paths") };
    if (/verification/i.test(t.with)) return { key: ref, label: "Your verification", icon: "verified", open: () => go("cand.profile", "verification") };
    return { key: ref, label: "Your profile", icon: "profile", open: () => go("cand.profile", "profile") };
  }
  return null;
}

function suggestions(t: MessageThread, s: RecruitState): string[] {
  if (isAgent(t)) return ["Which path pays best?", "Which course closes the biggest gap?", "Tell me about retail operations"];
  const o = s.offers.find(x => t.refs.includes(x.id));
  if (o) return offerIsLive(o)
    ? ["Thank you. I'm reviewing everything this week.", "Could we talk through the start date?", "Could you share the bonus scorecard in writing?"]
    : ["Thank you for your time throughout the process."];
  if (t.refs.some(r => vacancyById(r, s))) return ["Thursday at 10:00 works well. See you then.", "Could we move it to the afternoon?", "Is there anything I should prepare?"];
  if (/verification/i.test(t.with)) return ["Thanks. Is there anything else you need from me?", "Can I upload the certificate again?"];
  return ["Thanks, that's helpful."];
}

/** Career Pathfinder's scripted replies, built from the persona's own paths. */
function agentReply(c: Candidate, text: string): string {
  const paths = CAREER_PATHS[c.id] || [];
  if (!paths.length) return "Thanks. I'll add that to your Career explorer report.";
  const t = text.toLowerCase();
  const desc = (p: CareerPath) => p.title + ": " + p.alignment + "% transferable-skills alignment, " + eurK(p.salary[0]) + " to " + eurK(p.salary[1]) + " (illustrative), " + p.openRoles + " open roles.";
  if (/course|qualif|learn|certif|gap/.test(t)) {
    const p = paths.find(x => x.courseIds.length && x.gaps.length) || paths[0];
    const crs = COURSE_BY_ID[p.courseIds[0]];
    if (crs && p.gaps[0]) return "For " + p.title + ", the biggest gap is " + p.gaps[0].label.toLowerCase() + ". " + crs.title + " (" + (PARTNER_BY_ID[crs.partnerId]?.short || "partner") + ", " + crs.duration + ") covers it. You'll find it under Learning.";
  }
  const words = (p: CareerPath) => (p.title + " " + p.industry).toLowerCase().split(/[^a-z]+/).filter(w => w.length > 4);
  const scored = paths.map(p => ({ p, n: words(p).filter(w => t.includes(w)).length })).sort((a, b) => b.n - a.n);
  if (scored[0].n > 0) {
    const p = scored[0].p;
    return desc(p) + " " + p.explanation.split(". ")[0].replace(/\.$/, "") + ".";
  }
  if (/pay|salary|money|earn|best/.test(t)) {
    const top = paths.slice().sort((a, b) => b.salary[1] - a.salary[1])[0];
    return "The highest ceiling is " + top.title + ", up to " + eurK(top.salary[1]) + " (illustrative), with " + (top.gaps.length ? top.gaps.length + (top.gaps.length === 1 ? " gap" : " gaps") + " to close first." : "no major gaps.") + " Estimates only: employers set the pay.";
  }
  const top = paths.find(p => p.adjacent) || paths[0];
  return "Your strongest adjacent path is " + desc(top) + " Career explorer compares it side by side with the others.";
}
