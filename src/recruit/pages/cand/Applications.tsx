import { useMemo, useState, type ReactNode } from "react";
import { Avatar, Badge, Button, Card, Empty, Grid, Page, Section, Stat, toneColor } from "../../ui";
import { Icon } from "../../icons";
import { useNav } from "../../nav";
import { openDrawer, respondIntroduction, useRecruit, vacancyById, withdrawApplication } from "../../store";
import { candidate, offersFor, relevantRoles } from "../../selectors";
import { EMPLOYER_BY_ID } from "../../data";
import type { Application, Interview, Offer, PipelineEntry } from "../../data/types";
import { alignmentTone } from "../../match";
import { eur, eurK, plural } from "../../format";
import { ApplyModal, OFFER_STATUS, PortalModal, VISIBLE_STAGES, activeApplication, daysUntil, type Tone } from "../../shared/opportunityKit";

/* Opportunities, applications. Every process a professional is in, whether
   they applied or an employer approached them, with the stage, the next step
   and the controls they need. Employer-side stage changes show up here. */

export default function Applications() {
  const s = useRecruit();
  return <AppsView key={s.persona} />;
}

const APP_STEPS = ["Submitted", "Viewed", "Interview", "Offer"];
const APP_INDEX: Partial<Record<Application["status"], number>> = { submitted: 0, viewed: 1, interview: 2, offer: 3 };
const LED_STEPS = ["Introduction", "Interview", "Offer", "Hired"];
const LED_INDEX: Partial<Record<PipelineEntry["stage"], number>> = { contact: 0, interview: 1, offer: 2, hired: 3 };
const STATUS_BADGE: Record<Application["status"], { label: string; tone: Tone }> = {
  submitted: { label: "Submitted", tone: "neutral" }, viewed: { label: "Viewed", tone: "accent" }, interview: { label: "Interviewing", tone: "accent" },
  offer: { label: "Offer stage", tone: "ok" }, unsuccessful: { label: "Not progressed", tone: "neutral" }, withdrawn: { label: "Withdrawn", tone: "neutral" },
};

const inDays = (when: string) => {
  const d = daysUntil(when);
  return d === null ? "" : d === 0 ? "today" : d === 1 ? "tomorrow" : d > 1 ? "in " + d + " days" : -d + " days ago";
};

function AppsView() {
  const s = useRecruit();
  const nav = useNav();
  const c = candidate(s, s.persona);
  const [withdrawId, setWithdrawId] = useState<string | null>(null);
  const [applyId, setApplyId] = useState<string | null>(null);
  const roles = useMemo(() => relevantRoles(s, c.id), [s, c.id]);

  const apps = s.applications.filter(a => a.candidateId === c.id);
  const active = apps.filter(a => a.status !== "withdrawn" && a.status !== "unsuccessful");
  const closed = apps.filter(a => a.status === "withdrawn" || a.status === "unsuccessful");
  const appliedTo = new Set(active.map(a => a.vacancyId));
  const led = s.pipeline.filter(p => p.candidateId === c.id && !appliedTo.has(p.vacancyId) && VISIBLE_STAGES.includes(p.stage));
  const intros = s.intros.filter(i => i.candidateId === c.id && i.status === "pending");
  const interviews = s.interviews.filter(i => i.candidateId === c.id);
  const upcoming = interviews.filter(i => i.status === "scheduled");
  const offers = offersFor(s, c.id);
  const liveOffers = offers.filter(o => o.status === "sent" || o.status === "changes requested");
  const engaged = (vid: string) => !!activeApplication(s, c.id, vid) || s.pipeline.some(p => p.candidateId === c.id && p.vacancyId === vid && VISIBLE_STAGES.includes(p.stage));
  const next = roles.filter(r => !engaged(r.v.id)).slice(0, 3);
  const withdrawing = apps.find(a => a.id === withdrawId);
  const wv = withdrawing ? vacancyById(withdrawing.vacancyId, s) : undefined;
  const first = c.name.split(" ")[0];

  const threadFor = (vacancyId: string, offer?: Offer) => (s.candidateThreads[c.id] || []).find(t => t.refs.includes(vacancyId) || (offer ? t.refs.includes(offer.id) : false));
  const interviewFor = (vacancyId: string): Interview | undefined =>
    interviews.filter(i => i.vacancyId === vacancyId).sort((a, b) => (a.status === b.status ? b.round - a.round : a.status === "scheduled" ? -1 : 1))[0];

  return (
    <Page wide eyebrow="OPPORTUNITIES" title="Where every application stands."
      sub={"Your applications and the processes employers started with you. Stages update the moment an employer moves you on, and you can withdraw at any time."}
      actions={<Button variant="primary" icon="jobs" onClick={() => nav.go("cand.jobs", "recommended")}>Find more roles</Button>}>

      <Grid cols="rc-g4">
        <Stat icon="send" tone="accent" label="Active applications" value={active.length} sub={closed.length ? closed.length + " closed" : "None closed"} />
        <Stat icon="calendar" tone="teal" label="Interviews booked" value={upcoming.length} sub={upcoming[0] ? "Next " + inDays(upcoming[0].when) : "None scheduled"} />
        <Stat icon="offers" tone="ok" label="Offers to answer" value={liveOffers.length} sub={offers.length ? plural(offers.length, "offer") + " received" : "None yet"} onClick={offers.length ? () => nav.go("cand.offers", "incoming") : undefined} />
        <Stat icon="users" label="Employer approaches" value={led.length} sub="Processes employers started" />
      </Grid>

      <Grid cols="rc-g-side-r">
        <div className="rc-col" style={{ gap: 14, minWidth: 0 }}>
          {active.length > 0 && (
            <Section title="Your applications" sub="Roles you applied to through Recruit">
              <div className="rc-col" style={{ gap: 14 }}>
                {active.map(a => {
                  const v = vacancyById(a.vacancyId, s);
                  const offer = offers.find(o => o.vacancyId === a.vacancyId);
                  const iv = interviewFor(a.vacancyId);
                  const emp = v ? EMPLOYER_BY_ID[v.employerId] : undefined;
                  const step = nextForApplication(a, emp?.short || "The employer", offer, iv);
                  const thread = threadFor(a.vacancyId, offer);
                  const fresh = a.date === "Today";
                  return (
                    <ProcessCard key={a.id} vacancyId={a.vacancyId} badge={STATUS_BADGE[a.status]} meta={"Applied " + (fresh ? "today" : a.date)}
                      steps={APP_STEPS} current={APP_INDEX[a.status] ?? 0} step={step}
                      note={a.note ? (fresh ? "Your cover note: " : "Latest: ") + a.note : undefined}
                      actions={<>
                        {thread && <Button size="sm" icon="messages" onClick={() => nav.go("cand.offers", "messages")}>Message {thread.with.split(" ")[0]}</Button>}
                        {offer && <Button size="sm" variant="primary" icon="offers" onClick={() => openDrawer("offer", offer.id, { role: "candidate" })}>Review offer</Button>}
                        {a.status !== "offer" && <Button size="sm" variant="ghost" icon="x" onClick={() => setWithdrawId(a.id)}>Withdraw</Button>}
                      </>} />
                  );
                })}
              </div>
            </Section>
          )}

          {led.length > 0 && (
            <Section title="Processes employers started" sub="You agreed to an introduction, so these employers can see your details">
              <div className="rc-col" style={{ gap: 14 }}>
                {led.map(p => {
                  const offer = offers.find(o => o.vacancyId === p.vacancyId);
                  const iv = interviewFor(p.vacancyId);
                  const v = vacancyById(p.vacancyId, s);
                  const emp = v ? EMPLOYER_BY_ID[v.employerId] : undefined;
                  const thread = threadFor(p.vacancyId, offer);
                  const step = nextForProcess(p, emp?.short || "The employer", offer, iv);
                  return (
                    <ProcessCard key={p.id} vacancyId={p.vacancyId} badge={offer ? { label: OFFER_STATUS[offer.status].candidate, tone: OFFER_STATUS[offer.status].tone } : { label: "In process", tone: "accent" }}
                      meta={"Approached by " + (emp?.short || "the employer") + ", updated " + (/^(today|yesterday|just now)$/i.test(p.updated) || /ago$/.test(p.updated) ? p.updated.toLowerCase() : p.updated)} steps={LED_STEPS} current={LED_INDEX[p.stage] ?? 0} step={step}
                      note={iv && iv.status === "completed" ? "Interviewed " + iv.when + ", round " + iv.round + ", with " + iv.panel.join(", ") + "." : undefined}
                      actions={<>
                        {thread && <Button size="sm" icon="messages" onClick={() => nav.go("cand.offers", "messages")}>Message {thread.with.split(" ")[0]}</Button>}
                        {offer && <Button size="sm" variant="primary" icon="offers" onClick={() => openDrawer("offer", offer.id, { role: "candidate" })}>Review offer</Button>}
                      </>} />
                  );
                })}
              </div>
            </Section>
          )}

          {!active.length && !led.length && (
            <Card>
              <Empty icon="send" title={"No active applications for " + first}
                body="Apply from your recommendations and each application appears here with its stage and next step."
                action={<Button size="sm" icon="jobs" onClick={() => nav.go("cand.jobs", "recommended")}>See recommended roles</Button>} />
            </Card>
          )}

          {closed.length > 0 && (
            <Section title="Closed" sub="Withdrawn or not progressed">
              <Card pad="6px 18px">
                {closed.map((a, i) => {
                  const v = vacancyById(a.vacancyId, s);
                  return (
                    <div key={a.id} className="rc-row" style={{ gap: 11, padding: "11px 0", borderTop: i ? "1px solid var(--border)" : 0 }}>
                      <Icon name={a.status === "withdrawn" ? "x" : "info"} size={14} style={{ color: "var(--faint)" }} />
                      <button className="rc-grow rc-link" style={{ textAlign: "left", color: "var(--body)", fontSize: 13 }} onClick={() => openDrawer("vacancy", a.vacancyId)}>
                        {v?.title}<span style={{ color: "var(--faint)" }}>, {v ? EMPLOYER_BY_ID[v.employerId]?.short : ""}</span>
                      </button>
                      <Badge tone="neutral">{STATUS_BADGE[a.status].label}</Badge>
                      {a.status === "withdrawn" && v?.status === "open" && <Button size="sm" variant="ghost" onClick={() => setApplyId(a.vacancyId)}>Apply again</Button>}
                    </div>
                  );
                })}
              </Card>
            </Section>
          )}
        </div>

        <div className="rc-col" style={{ gap: 14, minWidth: 0 }}>
          <Card title="Interviews" sub={upcoming.length ? plural(upcoming.length, "interview") + " coming up" : "Nothing booked right now"}>
            {interviews.length ? interviews.slice().sort((a, b) => (a.status === b.status ? 0 : a.status === "scheduled" ? -1 : 1)).map((iv, i) => {
              const v = vacancyById(iv.vacancyId, s);
              const done = iv.status === "completed";
              return (
                <div key={iv.id} className="rc-row" style={{ alignItems: "flex-start", gap: 11, padding: "10px 0", borderTop: i ? "1px solid var(--border)" : 0, opacity: done ? 0.7 : 1 }}>
                  <span style={{ width: 30, height: 30, flex: "none", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", background: done ? "var(--surface-2)" : "var(--accent-soft)", color: done ? "var(--dim)" : "var(--accent)" }}>
                    <Icon name={done ? "check" : "calendar"} size={14} />
                  </span>
                  <div className="rc-grow">
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{iv.when}</div>
                    <div style={{ fontSize: 12, color: "var(--dim)", marginTop: 2, lineHeight: 1.45 }}>{v?.title}, round {iv.round}, {iv.format.toLowerCase()}. {done ? "Completed." : "With " + iv.panel.join(" and ") + "."}</div>
                  </div>
                  {!done && <span style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--faint)", whiteSpace: "nowrap" }}>{inDays(iv.when)}</span>}
                </div>
              );
            }) : <div style={{ fontSize: 12.5, color: "var(--dim)", lineHeight: 1.5 }}>When an employer books an interview, the time, format and panel appear here.</div>}
          </Card>

          <Card title="Introduction requests" sub="Employers can't see your contact details until you agree">
            {intros.map((it, i) => {
              const v = vacancyById(it.vacancyId, s);
              const emp = v ? EMPLOYER_BY_ID[v.employerId] : undefined;
              return (
                <div key={it.id} style={{ padding: "10px 0", borderTop: i ? "1px solid var(--border)" : 0 }}>
                  <div className="rc-row" style={{ gap: 10 }}>
                    <Avatar initials={emp?.initials || "?"} tint={emp?.tint} size={28} square />
                    <div className="rc-grow" style={{ fontSize: 12.5, lineHeight: 1.45 }}><b style={{ fontWeight: 600 }}>{emp?.short}</b> <span style={{ color: "var(--dim)" }}>for {v?.title}</span></div>
                  </div>
                  <div className="rc-row" style={{ gap: 6, marginTop: 9 }}>
                    <Button size="sm" variant="primary" icon="check" onClick={() => respondIntroduction(it.id, "accepted")}>Share my details</Button>
                    <Button size="sm" variant="ghost" onClick={() => respondIntroduction(it.id, "declined")}>Decline</Button>
                    <Button size="sm" variant="ghost" onClick={() => openDrawer("vacancy", it.vacancyId)}>Role</Button>
                  </div>
                </div>
              );
            })}
            {!intros.length && <div style={{ fontSize: 12.5, color: "var(--dim)", lineHeight: 1.5 }}>No requests waiting. When an employer asks to contact you, you decide here whether to share your details.</div>}
          </Card>

          <Card title="Worth applying to next" sub="Strong matches you haven't acted on">
            {next.map(({ v, m }, i) => {
              const emp = EMPLOYER_BY_ID[v.employerId];
              return (
                <div key={v.id} className="rc-row" style={{ gap: 10, padding: "10px 0", borderTop: i ? "1px solid var(--border)" : 0 }}>
                  <button className="rc-grow rc-focus" onClick={() => openDrawer("vacancy", v.id)} style={{ background: "none", border: 0, padding: 0, textAlign: "left", cursor: "pointer", color: "inherit", font: "inherit", minWidth: 0 }}>
                    <span className="rc-ellipsis" style={{ display: "block", fontSize: 12.5, fontWeight: 500, color: "var(--ink)" }}>{v.title}</span>
                    <span className="rc-ellipsis" style={{ display: "block", fontSize: 11.5, color: "var(--dim)", marginTop: 2 }}>{emp?.short}, {eurK(v.salary[0])} to {eurK(v.salary[1])}</span>
                  </button>
                  <Badge tone={alignmentTone(m.score)}>{m.score}%</Badge>
                  <Button size="sm" onClick={() => setApplyId(v.id)}>Apply</Button>
                </div>
              );
            })}
            {!next.length && <div style={{ fontSize: 12.5, color: "var(--dim)" }}>You've acted on every strong match. New roles appear as employers post them.</div>}
          </Card>
        </div>
      </Grid>

      <PortalModal open={!!withdrawing} onClose={() => setWithdrawId(null)} width={520} title="Withdraw this application?"
        sub={wv ? wv.title + ", " + (EMPLOYER_BY_ID[wv.employerId]?.name || "") : undefined}
        footer={<><Button variant="ghost" onClick={() => setWithdrawId(null)}>Keep it</Button>
          <Button variant="danger" icon="x" onClick={() => { if (withdrawing) withdrawApplication(withdrawing.id); setWithdrawId(null); }}>Withdraw application</Button></>}>
        <div style={{ fontSize: 13, color: "var(--body)", lineHeight: 1.6 }}>
          {wv ? EMPLOYER_BY_ID[wv.employerId]?.short : "The employer"} will see the application as withdrawn. You can apply again while the role is open, and nothing else on your profile changes.
        </div>
      </PortalModal>
      {applyId && <ApplyModal open onClose={() => setApplyId(null)} vacancyId={applyId} />}
    </Page>
  );
}

interface Step { icon: string; tone: Tone; text: string }

function nextForApplication(a: Application, who: string, offer: Offer | undefined, iv: Interview | undefined): Step {
  if (a.status === "offer" && offer) return offerStep(offer);
  if (a.status === "offer") return { icon: "offers", tone: "ok", text: who + " is preparing an offer. You'll see it here as soon as it's sent." };
  if (a.status === "interview" && iv && iv.status === "scheduled") return { icon: "calendar", tone: "accent", text: "Round " + iv.round + " interview " + inDays(iv.when) + ": " + iv.when + ", " + iv.format.toLowerCase() + ", with " + iv.panel.join(" and ") + "." };
  if (a.status === "interview") return { icon: "calendar", tone: "accent", text: "You're at interview stage. " + who + " proposes times through Recruit." };
  if (a.status === "viewed") return { icon: "eye", tone: "accent", text: who + " has viewed your application. The usual next step is an interview request." };
  if (a.status === "submitted") return { icon: "clock", tone: "neutral", text: "Waiting for " + who + " to review it. You'll be told the moment it's viewed." };
  if (a.status === "withdrawn") return { icon: "x", tone: "neutral", text: "You withdrew this application." };
  return { icon: "info", tone: "neutral", text: who + " decided not to progress this time. Your profile stays visible to other employers." };
}

function nextForProcess(p: PipelineEntry, who: string, offer: Offer | undefined, iv: Interview | undefined): Step {
  if (offer) return offerStep(offer);
  if (p.stage === "hired") return { icon: "placement", tone: "ok", text: "You accepted. Recruit has recorded the placement." };
  if (p.stage === "interview" && iv && iv.status === "scheduled") return { icon: "calendar", tone: "accent", text: "Round " + iv.round + " interview " + inDays(iv.when) + ": " + iv.when + ", " + iv.format.toLowerCase() + "." };
  if (p.stage === "interview") return { icon: "calendar", tone: "accent", text: who + " wants to interview you and will propose times." };
  if (p.stage === "offer") return { icon: "offers", tone: "ok", text: who + " is preparing an offer." };
  return { icon: "users", tone: "accent", text: "You shared your details with " + who + ". They'll be in touch about next steps." };
}

function offerStep(o: Offer): Step {
  if (o.status === "accepted") return { icon: "placement", tone: "ok", text: "You accepted this offer at " + eur(o.salary) + ". Recruit has recorded the placement." };
  if (o.status === "declined") return { icon: "x", tone: "neutral", text: "You declined this offer." };
  if (o.status === "withdrawn") return { icon: "info", tone: "neutral", text: "The employer withdrew this offer." };
  if (o.status === "changes requested") return { icon: "clock", tone: "warn", text: "You asked for changes to the " + eur(o.salary) + " offer. Waiting for the employer's reply." };
  const d = daysUntil(o.expires);
  return { icon: "offers", tone: "ok", text: "Offer received: " + eur(o.salary) + " base. Respond by " + o.expires + (d !== null && d >= 0 ? " (" + (d === 0 ? "today" : plural(d, "day") + " left") + ")." : ".") };
}

function ProcessCard({ vacancyId, badge, meta, steps, current, step, note, actions }: {
  vacancyId: string; badge: { label: string; tone: Tone }; meta: string; steps: string[]; current: number; step: Step; note?: string; actions: ReactNode;
}) {
  const s = useRecruit();
  const v = vacancyById(vacancyId, s);
  const emp = v ? EMPLOYER_BY_ID[v.employerId] : undefined;
  const stopped = badge.label === "Withdrawn";
  return (
    <Card pad={0}>
      <div style={{ padding: "18px 20px 16px" }}>
        <div className="rc-row" style={{ alignItems: "flex-start", gap: 13 }}>
          <Avatar initials={emp?.initials || "?"} tint={emp?.tint} size={40} square />
          <div className="rc-grow">
            <button className="rc-focus" onClick={() => openDrawer("vacancy", vacancyId)}
              style={{ background: "none", border: 0, padding: 0, cursor: "pointer", color: "var(--ink)", fontSize: 15, fontWeight: 600, letterSpacing: "-.3px", textAlign: "left" }}>{v?.title || "Role"}</button>
            <div className="rc-row rc-wrap" style={{ gap: 6, marginTop: 4, fontSize: 12.5, color: "var(--dim)" }}>
              <span style={{ color: "var(--body)", fontWeight: 500 }}>{emp?.short}</span>
              {emp?.verified && <span title="Verified employer" style={{ color: "var(--teal, var(--ok))", display: "inline-flex" }}><Icon name="verified" size={13} /></span>}
              {v && <><span style={{ color: "var(--faint)" }}>·</span><span>{eurK(v.salary[0])} to {eurK(v.salary[1])}</span></>}
              <span style={{ color: "var(--faint)" }}>·</span><span>{meta}</span>
            </div>
          </div>
          <Badge tone={badge.tone} dot>{badge.label}</Badge>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(" + steps.length + ", minmax(0, 1fr))", gap: 6, marginTop: 18 }}>
          {steps.map((label, i) => {
            const state = stopped ? "todo" : i < current ? "done" : i === current ? "now" : "todo";
            return (
              <div key={label}>
                <div style={{ height: 6, borderRadius: 999, background: state === "todo" ? "var(--track)" : state === "done" ? "var(--teal, #16B8A6)" : "linear-gradient(90deg, #4263EB, var(--teal, #16B8A6))",
                  boxShadow: state === "now" ? "0 0 12px var(--accent-soft)" : "none" }} />
                <div className="rc-row" style={{ gap: 5, marginTop: 7, fontSize: 11.5, color: state === "todo" ? "var(--faint)" : "var(--ink)", fontWeight: state === "now" ? 600 : 400 }}>
                  {state === "done" && <Icon name="check" size={11} stroke={2.6} style={{ color: "var(--teal, var(--ok))" }} />}
                  {label}
                </div>
              </div>
            );
          })}
        </div>

        <div className="rc-row" style={{ alignItems: "flex-start", gap: 10, marginTop: 16, padding: "11px 13px", borderRadius: "var(--r-sm, 12px)", background: "var(--surface-2)", border: "1px solid var(--border)" }}>
          <span style={{ color: toneColor(step.tone), marginTop: 1, display: "inline-flex" }}><Icon name={step.icon} size={14} /></span>
          <div className="rc-grow">
            <div style={{ fontSize: 11, color: "var(--faint)" }}>Next step</div>
            <div style={{ fontSize: 13, color: "var(--ink)", marginTop: 3, lineHeight: 1.5 }}>{step.text}</div>
            {note && <div style={{ fontSize: 12, color: "var(--dim)", marginTop: 6, lineHeight: 1.5 }}>{note}</div>}
          </div>
        </div>
      </div>
      <div className="rc-row rc-wrap" style={{ gap: 8, padding: "12px 20px", borderTop: "1px solid var(--border)" }}>
        <Button size="sm" variant="ghost" icon="eye" onClick={() => openDrawer("vacancy", vacancyId)}>View role</Button>
        <span className="rc-grow" />
        {actions}
      </div>
    </Card>
  );
}
