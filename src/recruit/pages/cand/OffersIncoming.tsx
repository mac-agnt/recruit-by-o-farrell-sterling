import { Avatar, Badge, Button, Card, Empty, Grid, KV, Label, Note, Page, Stat, Timeline, toneColor } from "../../ui";
import { Icon } from "../../icons";
import { useNav } from "../../nav";
import { openDrawer, respondIntroduction, useRecruit, vacancyById, visibilityOf } from "../../store";
import { candidate, offersFor } from "../../selectors";
import { EMPLOYER_BY_ID, EMPLOYER_INTEREST } from "../../data";
import type { Candidate, Offer } from "../../data/types";
import { eur, eurK, plural } from "../../format";
import { EVENT_TONE, OFFER_STATUS, OfferResponseActions, daysUntil, noticeFit, offerIsLive, offerTerms, parseDemoDate } from "../../shared/opportunityKit";

/* Offers, incoming. Every offer a professional has received, with the full
   package, its latest movement and their own controls. Recruit never decides
   for them, and employers never see each other's offers. */

export default function OffersIncoming() {
  const s = useRecruit();
  return <IncomingView key={s.persona} />;
}

const VIS_LABEL = { discoverable: "Discoverable", anonymous: "Anonymous", hidden: "Hidden" } as const;

function IncomingView() {
  const s = useRecruit();
  const nav = useNav();
  const c = candidate(s, s.persona);
  const offers = offersFor(s, c.id);
  if (!offers.length) return <NoOffers c={c} />;

  const live = offers.filter(offerIsLive);
  const accepted = offers.find(o => o.status === "accepted");
  const pool = live.length ? live : offers;
  const top = pool.reduce((a, b) => (b.salary > a.salary ? b : a));
  const soonest = live.slice().sort((a, b) => (daysUntil(a.expires) ?? 99) - (daysUntil(b.expires) ?? 99))[0];
  const soonDays = soonest ? daysUntil(soonest.expires) : null;
  const ordered = offers.slice().sort((a, b) => Number(offerIsLive(b)) - Number(offerIsLive(a)));
  const vis = visibilityOf(c.id, s);

  // Every event on every offer, newest first.
  const events = offers.flatMap(o => o.history.map((e, i) => ({ e, i, o, at: parseDemoDate(e.when)?.date.getTime() ?? 0 })))
    .sort((a, b) => b.at - a.at || b.i - a.i).slice(0, 8);

  return (
    <Page wide eyebrow="OFFERS" title="Your offers, on your terms."
      sub="You choose who sees your profile and which offers to consider. Employers can't bid for you or see each other's offers."
      actions={<>
        <Button icon="messages" onClick={() => nav.go("cand.offers", "messages")}>Messages</Button>
        {offers.length > 1 && <Button variant="primary" icon="compare" onClick={() => nav.go("cand.offers", "compare")}>Compare side by side</Button>}
      </>}>

      <Grid cols="rc-g4">
        <Stat icon="offers" tone="accent" label="Waiting for your answer" value={live.length} sub={plural(offers.length, "offer") + " received in total"} />
        <Stat icon="euro" tone="teal" label={live.length ? "Highest base on the table" : "Highest base offered"} value={eur(top.salary)} sub={EMPLOYER_BY_ID[top.employerId]?.short} />
        <Stat icon="clock" tone="warn" label="Next response due" value={soonest ? soonest.expires : "None"} sub={soonest ? (soonDays === 0 ? "Today" : soonDays !== null && soonDays > 0 ? plural(soonDays, "day") + " left, " + EMPLOYER_BY_ID[soonest.employerId]?.short : EMPLOYER_BY_ID[soonest.employerId]?.short) : "No open offers"} />
        <Stat icon="target" label="Your expectation" value={eurK(c.salaryExpectation[0]) + " to " + eurK(c.salaryExpectation[1])} sub={"Notice: " + plural(c.noticeWeeks, "week")} />
      </Grid>

      {accepted && live.length > 0 && (
        <Note tone="ok" icon="check">
          You accepted {EMPLOYER_BY_ID[accepted.employerId]?.name}'s offer. {live.map(o => EMPLOYER_BY_ID[o.employerId]?.short).join(" and ")} {live.length === 1 ? "is" : "are"} still waiting for an answer: decline below when you're ready, so nobody is left waiting.
        </Note>
      )}

      <Grid cols="rc-g2">
        {ordered.map(o => <OfferCard key={o.id} o={o} c={c} />)}
      </Grid>

      <Grid cols="rc-g-3-2">
        <Card title="Offer activity" sub="Every movement on your offers, newest first" action={<Button size="sm" variant="ghost" iconRight="arrowRight" onClick={() => nav.go("cand.offers", "messages")}>Messages</Button>}>
          <Timeline items={events.map(({ e, o }) => ({ when: e.when, title: (EMPLOYER_BY_ID[o.employerId]?.short || "Employer") + ": " + e.text, body: e.who, tone: EVENT_TONE[e.kind] }))} />
        </Card>
        <Card title="You're in control" sub="How Recruit handles offers" action={<Badge tone="teal" icon="shield">{VIS_LABEL[vis.mode]} profile</Badge>}>
          <div className="rc-col" style={{ gap: 11 }}>
            {[["eye", "You choose who sees your profile: discoverable, anonymous or hidden."],
              ["lock", "Employers see your contact details only after you accept an introduction."],
              ["users", "Each employer sees its own offer only. There is no bidding and no auction."],
              ["check", "Nothing is accepted, declined or negotiated on your behalf."]].map(([icon, text]) => (
              <div key={text} className="rc-row" style={{ alignItems: "flex-start", gap: 10, fontSize: 12.5, lineHeight: 1.5, color: "var(--body)" }}>
                <span style={{ color: "var(--accent)", marginTop: 2, display: "inline-flex" }}><Icon name={icon} size={13} /></span>{text}
              </div>
            ))}
          </div>
          <Button size="sm" style={{ marginTop: 16 }} icon="settings" onClick={() => nav.go("cand.settings", "visibility")}>Visibility settings</Button>
        </Card>
      </Grid>
    </Page>
  );
}

function OfferCard({ o, c }: { o: Offer; c: Candidate }) {
  const emp = EMPLOYER_BY_ID[o.employerId];
  const t = offerTerms(o);
  const st = OFFER_STATUS[o.status];
  const left = daysUntil(o.expires);
  const last = o.history[o.history.length - 1];
  const fit = noticeFit(c.noticeWeeks, o.start);
  const live = offerIsLive(o);
  const exp = c.salaryExpectation;
  const vs = o.salary >= exp[0] && o.salary <= exp[1] ? { tone: "teal" as const, text: "Inside your expectation" }
    : o.salary > exp[1] ? { tone: "teal" as const, text: "Above your expectation" } : { tone: "warn" as const, text: eurK(exp[0] - o.salary) + " below your expectation" };

  return (
    <Card pad={0} tone={o.status === "accepted" ? "ok" : undefined} style={{ opacity: live || o.status === "accepted" ? 1 : 0.72 }}>
      <div style={{ padding: "20px 22px 18px", background: live ? "linear-gradient(150deg, color-mix(in oklab, #4263EB 12%, var(--surface)) 0%, var(--surface) 62%)" : undefined, borderRadius: "var(--card-r, 18px) var(--card-r, 18px) 0 0" }}>
        <div className="rc-row" style={{ alignItems: "flex-start", gap: 12 }}>
          <Avatar initials={emp?.initials || "?"} tint={emp?.tint} size={42} square />
          <div className="rc-grow">
            <div className="rc-row rc-wrap" style={{ gap: 6 }}>
              <span style={{ fontSize: 14, fontWeight: 600 }}>{emp?.name}</span>
              {emp?.verified && <span title="Verified employer" style={{ color: "var(--teal, var(--ok))", display: "inline-flex" }}><Icon name="verified" size={14} /></span>}
            </div>
            <div style={{ fontSize: 12.5, color: "var(--dim)", marginTop: 3 }}>{o.title}</div>
          </div>
          <Badge tone={st.tone} dot>{st.candidate}</Badge>
        </div>

        <div className="rc-row rc-wrap" style={{ alignItems: "baseline", gap: 10, marginTop: 18 }}>
          <span style={{ fontSize: 34, fontWeight: 600, letterSpacing: "-1.4px" }}>{eur(o.salary)}</span>
          <span style={{ fontSize: 12.5, color: "var(--dim)" }}>base salary</span>
          <Badge tone={vs.tone}>{vs.text}</Badge>
        </div>

        <div style={{ marginTop: 16 }}>
          <KV cols={2} items={[
            { k: "Bonus", v: <span>{o.bonus}{t.bonusMax > 0 && <span style={{ display: "block", fontSize: 11.5, color: "var(--dim)", marginTop: 2 }}>Up to {eur(t.bonusMax)}, illustrative</span>}</span> },
            { k: "Location", v: <span>{o.location}<span style={{ display: "block", fontSize: 11.5, color: "var(--dim)", marginTop: 2 }}>{locationNote(c, o)}</span></span> },
            { k: "Start", v: <span>{o.start}<span style={{ display: "block", fontSize: 11.5, color: toneColor(fit.tone), marginTop: 2 }}>{fit.label}</span></span> },
            { k: "Respond by", v: <span>{o.expires}<span style={{ display: "block", fontSize: 11.5, color: live && left !== null && left <= 3 ? "var(--warn)" : "var(--dim)", marginTop: 2 }}>{live && left !== null && left >= 0 ? (left === 0 ? "Due today" : plural(left, "day") + " left") : st.candidate}</span></span> },
          ]} />
        </div>

        <Label style={{ marginTop: 16 }}>Benefits</Label>
        <div className="rc-col" style={{ gap: 6, marginTop: 8 }}>
          {o.benefits.map(b => (
            <div key={b} className="rc-row" style={{ gap: 8, fontSize: 12.5, color: "var(--body)" }}>
              <span style={{ color: "var(--teal, var(--ok))", display: "inline-flex" }}><Icon name="check" size={12} stroke={2.4} /></span>{b}
            </div>
          ))}
        </div>

        {last && (
          <div className="rc-row" style={{ alignItems: "flex-start", gap: 9, marginTop: 16, padding: "10px 12px", borderRadius: "var(--r-sm, 12px)", background: "var(--surface-2)", border: "1px solid var(--border)" }}>
            <span style={{ color: toneColor(EVENT_TONE[last.kind]), marginTop: 2, display: "inline-flex" }}><Icon name="activity" size={13} /></span>
            <div className="rc-grow" style={{ fontSize: 12, lineHeight: 1.5 }}>
              <span style={{ color: "var(--faint)" }}>Latest, {last.when}: </span>
              <span style={{ color: "var(--body)" }}>{last.text}</span>
              <span style={{ color: "var(--faint)" }}> ({last.who})</span>
            </div>
          </div>
        )}
      </div>
      <div style={{ padding: "13px 22px", borderTop: "1px solid var(--border)" }}>
        <OfferResponseActions offer={o} />
      </div>
    </Card>
  );
}

function locationNote(c: Candidate, o: Offer) {
  const v = vacancyById(o.vacancyId);
  if (v && v.region !== c.region) return "A move from " + c.location + (/relocation/i.test(o.benefits.join(" ")) ? ", relocation support offered" : ", no relocation support listed");
  return "Within reach of " + c.location;
}

/* ── no offers yet ──────────────────────────────────────────────────────── */

function NoOffers({ c }: { c: Candidate }) {
  const s = useRecruit();
  const nav = useNav();
  const intros = s.intros.filter(i => i.candidateId === c.id);
  const pending = intros.filter(i => i.status === "pending");
  const decided = intros.filter(i => i.status !== "pending");
  const apps = s.applications.filter(a => a.candidateId === c.id && a.status !== "withdrawn");
  const interest = EMPLOYER_INTEREST[c.id] || [];
  const APP_LABEL: Record<string, string> = { submitted: "Submitted", viewed: "Viewed", interview: "Interviewing", offer: "Offer stage", unsuccessful: "Not progressed" };

  return (
    <Page wide eyebrow="OFFERS" title="No offers yet. Here's what's moving."
      sub="You choose who sees your profile and which offers to consider. Employers can't bid for you or see each other's offers."
      actions={<>
        <Button icon="send" onClick={() => nav.go("cand.jobs", "applications")}>My applications</Button>
        <Button variant="primary" icon="jobs" onClick={() => nav.go("cand.jobs", "recommended")}>Recommended roles</Button>
      </>}>

      <Card style={{ background: "linear-gradient(150deg, color-mix(in oklab, #4263EB 12%, var(--surface)) 0%, var(--surface) 60%)" }}>
        <Empty icon="offers" title="Offers land here, on your terms"
          body="When an employer sends you an offer, it appears here with the full package and its history. You decide whether to accept, negotiate or decline." />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 10, marginTop: 4 }}>
          {[["users", "Agree to an introduction", "Employers see your details only after you say yes."],
            ["calendar", "Meet the team", "Interviews are booked and tracked in Recruit."],
            ["verified", "Receive an approved offer", "Offers reach you only once the employer has signed them off."],
            ["check", "Decide on your terms", "Accept, ask, negotiate or decline. Nobody bids for you."]].map(([icon, title, body]) => (
            <div key={title} style={{ padding: "13px 14px", borderRadius: "var(--r-sm, 12px)", background: "var(--surface-2)", border: "1px solid var(--border)" }}>
              <span style={{ color: "var(--accent)", display: "inline-flex" }}><Icon name={icon} size={15} /></span>
              <div style={{ fontSize: 13, fontWeight: 600, marginTop: 8 }}>{title}</div>
              <div style={{ fontSize: 12, color: "var(--dim)", marginTop: 4, lineHeight: 1.5 }}>{body}</div>
            </div>
          ))}
        </div>
      </Card>

      <Grid cols="rc-g3">
        <Card title="Introduction requests" sub="Your contact details stay hidden until you agree">
          {pending.map((it, i) => {
            const v = vacancyById(it.vacancyId, s);
            const emp = v ? EMPLOYER_BY_ID[v.employerId] : undefined;
            return (
              <div key={it.id} style={{ padding: "10px 0", borderTop: i ? "1px solid var(--border)" : 0 }}>
                <div className="rc-row" style={{ gap: 10 }}>
                  <Avatar initials={emp?.initials || "?"} tint={emp?.tint} size={30} square />
                  <div className="rc-grow" style={{ fontSize: 12.5, lineHeight: 1.45 }}>
                    <b style={{ fontWeight: 600 }}>{emp?.name}</b>
                    <div style={{ color: "var(--dim)" }}>{v?.title}{v ? ", " + eurK(v.salary[0]) + " to " + eurK(v.salary[1]) : ""}</div>
                  </div>
                </div>
                <div className="rc-row rc-wrap" style={{ gap: 6, marginTop: 9 }}>
                  <Button size="sm" variant="primary" icon="check" onClick={() => respondIntroduction(it.id, "accepted")}>Share my details</Button>
                  <Button size="sm" variant="ghost" onClick={() => respondIntroduction(it.id, "declined")}>Decline</Button>
                  <Button size="sm" variant="ghost" onClick={() => openDrawer("vacancy", it.vacancyId)}>Role</Button>
                </div>
              </div>
            );
          })}
          {decided.slice(0, 3).map((it, i) => {
            const v = vacancyById(it.vacancyId, s);
            return (
              <div key={it.id} className="rc-row" style={{ gap: 8, padding: "9px 0", borderTop: pending.length || i ? "1px solid var(--border)" : 0, fontSize: 12.5 }}>
                <Icon name={it.status === "accepted" ? "check" : "x"} size={13} style={{ color: it.status === "accepted" ? "var(--teal, var(--ok))" : "var(--faint)" }} />
                <span className="rc-grow" style={{ color: "var(--body)" }}>{v ? EMPLOYER_BY_ID[v.employerId]?.short : "Employer"}, {v?.title}</span>
                <span style={{ fontSize: 11, color: "var(--faint)" }}>{it.status === "accepted" ? "Shared" : "Declined"}</span>
              </div>
            );
          })}
          {!intros.length && <div style={{ fontSize: 12.5, color: "var(--dim)", lineHeight: 1.55 }}>No requests right now. When an employer wants to contact you about a role, you'll decide here whether to share your details.</div>}
        </Card>

        <Card title="Active applications" sub={apps.length ? plural(apps.length, "application") + " in progress" : "None in progress"}
          action={<Button size="sm" variant="ghost" iconRight="arrowRight" onClick={() => nav.go("cand.jobs", "applications")}>All</Button>}>
          {apps.map((a, i) => {
            const v = vacancyById(a.vacancyId, s);
            const emp = v ? EMPLOYER_BY_ID[v.employerId] : undefined;
            const iv = s.interviews.find(x => x.candidateId === c.id && x.vacancyId === a.vacancyId && x.status === "scheduled");
            return (
              <button key={a.id} className="rc-rowhover rc-focus" onClick={() => nav.go("cand.jobs", "applications")}
                style={{ width: "100%", display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 8px", margin: "0 -8px", borderTop: i ? "1px solid var(--border)" : 0, borderRight: 0, borderBottom: 0, borderLeft: 0, borderRadius: 0, background: "none", color: "inherit", font: "inherit", cursor: "pointer", textAlign: "left", boxSizing: "content-box" }}>
                <Avatar initials={emp?.initials || "?"} tint={emp?.tint} size={28} square />
                <span className="rc-grow">
                  <span style={{ display: "block", fontSize: 12.5, fontWeight: 500, color: "var(--ink)" }}>{v?.title}</span>
                  <span style={{ display: "block", fontSize: 11.5, color: "var(--dim)", marginTop: 2 }}>{emp?.short}{iv ? ", interview " + iv.when : ""}</span>
                </span>
                <Badge tone={a.status === "interview" ? "accent" : a.status === "offer" ? "ok" : "neutral"}>{APP_LABEL[a.status] || a.status}</Badge>
              </button>
            );
          })}
          {!apps.length && <div style={{ fontSize: 12.5, color: "var(--dim)", lineHeight: 1.55 }}>Apply to a recommended role and it shows here until it turns into an offer.</div>}
        </Card>

        <Card title="Employer interest" sub="Recent views and searches">
          {interest.map((it, i) => {
            const emp = EMPLOYER_BY_ID[it.employerId];
            return (
              <div key={i} className="rc-row" style={{ alignItems: "flex-start", gap: 10, padding: "9px 0", borderTop: i ? "1px solid var(--border)" : 0 }}>
                <Avatar initials={emp?.initials || "?"} tint={emp?.tint} size={28} square />
                <div className="rc-grow" style={{ fontSize: 12.5, lineHeight: 1.45 }}>
                  <span style={{ color: "var(--ink)", fontWeight: 500 }}>{emp?.short}</span> <span style={{ color: "var(--dim)" }}>{it.text}</span>
                </div>
                <span style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--faint)", whiteSpace: "nowrap" }}>{it.when}</span>
              </div>
            );
          })}
          {!interest.length && <div style={{ fontSize: 12.5, color: "var(--dim)" }}>No employer activity this week.</div>}
        </Card>
      </Grid>
    </Page>
  );
}
