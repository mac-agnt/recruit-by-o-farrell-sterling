import { useState } from "react";
import { Avatar, Badge, Button, Card, Empty, Grid, Label, Note, Page, Segmented } from "../../ui";
import { Icon } from "../../icons";
import { useNav } from "../../nav";
import { openDrawer, respondIntroduction, useRecruit, vacancyById, type RecruitState } from "../../store";
import { candidate, offersFor } from "../../selectors";
import { COURSE_BY_ID, EMPLOYER_BY_ID, EMPLOYER_INTEREST } from "../../data";
import type { ActivityEvent, Application, Candidate } from "../../data";
import { DEMO_TODAY, fmtDay, personalise, verificationItems } from "./Profile";

/* My activity. The person's own timeline: what they did, what employers did
   that they are entitled to see, and what is coming up. Employer-internal
   steps (drafts, approvals, pipeline moves) never appear here. */

type Kind = "applications" | "profile" | "learning" | "offers";
type Filter = "all" | Kind;
interface Item { id: string; at: number; day: number; kind: Kind; icon: string; title: string; detail: string; who: string; when?: string; status?: string; tone?: "warn" | "teal" | "accent" | "neutral"; open?: () => void }

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DAY = 86400000;
const INTERNAL = /^(Offer drafted|Offer sent for approval|Offer approved|Offer edited|Contingency offer drafted|Pipeline stage changed|Candidate shortlisted|Added to pipeline|Pipeline suggestion|Vacancy )/;
const APP_STATUS: Record<Application["status"], string> = {
  submitted: "Submitted", viewed: "Viewed by the employer", interview: "Interviewing", offer: "Offer stage", unsuccessful: "Not progressed", withdrawn: "Withdrawn",
};

/** Days before the demo's today for labels like "Fri 13 Nov" or "6 Nov". */
function daysBefore(label: string): number | null {
  const m = /(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/.exec(label);
  if (!m) return null;
  let d = new Date(DEMO_TODAY.getFullYear(), MONTHS.indexOf(m[2]), Number(m[1]));
  if (d > DEMO_TODAY) d = new Date(d.getFullYear() - 1, d.getMonth(), d.getDate());
  return Math.round((DEMO_TODAY.getTime() - d.getTime()) / DAY);
}
function eventDay(e: ActivityEvent) {
  if (/^(just now|today)|min ago|h ago/i.test(e.when)) return 0;
  if (/^yesterday/i.test(e.when)) return 1;
  const d = daysBefore(e.when);
  if (d !== null) return d;
  const start = new Date(); start.setHours(0, 0, 0, 0);
  return e.at >= start.getTime() ? 0 : Math.ceil((start.getTime() - e.at) / DAY);
}
function dayLabel(n: number) {
  if (n === 0) return "Today";
  if (n === 1) return "Yesterday";
  const d = new Date(DEMO_TODAY); d.setDate(d.getDate() - n);
  return fmtDay(d);
}
const atFor = (day: number) => Date.now() - day * DAY - 3600000;

function buildItems(s: RecruitState, c: Candidate): Item[] {
  const offerIds = s.offers.filter(o => o.candidateId === c.id).map(o => o.id);
  const visibleOffers = new Set(s.offers.filter(o => o.candidateId === c.id && o.visibleToCandidate).map(o => o.id));
  const fromLog: Item[] = s.activity
    .filter(e => e.category !== "financial" && !INTERNAL.test(e.title))
    .filter(e => {
      const offerRef = e.refs.find(r => offerIds.includes(r));
      if (offerRef) return visibleOffers.has(offerRef);
      return e.refs.includes(c.id);
    })
    .map(e => {
      const kind: Kind = e.category === "learning" ? "learning" : e.category === "profiles" || /^Profile viewed/.test(e.title) ? "profile"
        : /offer/i.test(e.title) || e.refs.some(r => offerIds.includes(r)) ? "offers" : "applications";
      const icon = /interview/i.test(e.title) ? "calendar" : /introduction/i.test(e.title) ? "userPlus" : /viewed/i.test(e.title) ? "eye"
        : /cv|upload/i.test(e.title) ? "upload" : /verif|evidence|remind|reference/i.test(e.title + " " + e.detail) ? "verified"
          : /visib|privacy|consent|export|deletion|correction/i.test(e.title) ? "lock" : kind === "offers" ? "offers" : kind === "learning" ? "learning" : kind === "profile" ? "profile" : "jobs";
      const vac = e.refs.map(r => vacancyById(r, s)).find(Boolean);
      const course = e.refs.map(r => COURSE_BY_ID[r]).find(Boolean);
      const offer = e.refs.find(r => visibleOffers.has(r));
      return {
        id: e.id, at: e.at, day: eventDay(e), kind, icon, title: e.title, detail: personalise(e.detail, c.name), who: e.actor === c.name ? "You" : e.actor, when: e.when,
        status: e.status === "awaiting" ? "Waiting" : undefined, tone: e.status === "awaiting" ? "warn" : undefined,
        open: offer ? () => openDrawer("offer", offer) : course ? () => openDrawer("course", course.id) : vac ? () => openDrawer("vacancy", vac.id) : undefined,
      } as Item;
    });

  const apps: Item[] = s.applications.filter(a => a.candidateId === c.id && a.date !== "Today").map(a => {
    const v = vacancyById(a.vacancyId, s);
    const emp = EMPLOYER_BY_ID[v?.employerId || ""];
    const day = daysBefore(a.date) ?? 7;
    return { id: "app-" + a.id, at: atFor(day), day, kind: "applications", icon: "jobs", title: "Applied for " + (v?.title || "a role"), who: "You",
      detail: (emp?.name || "Employer") + ". " + (a.note || "Application received."), status: APP_STATUS[a.status], tone: a.status === "interview" ? "teal" : a.status === "viewed" ? "accent" : "neutral",
      open: () => openDrawer("vacancy", a.vacancyId) };
  });

  const interviews: Item[] = s.interviews.filter(i => i.candidateId === c.id && i.status === "completed").map(i => {
    const v = vacancyById(i.vacancyId, s);
    const emp = EMPLOYER_BY_ID[v?.employerId || ""];
    const day = daysBefore(i.when) ?? 10;
    return { id: "iv-" + i.id, at: atFor(day), day, kind: "applications", icon: "calendar", title: (i.round === 1 ? "First" : i.round === 2 ? "Second" : "Round " + i.round) + " interview: " + (v?.title || "a role"),
      who: emp?.short || "Employer", detail: (emp?.name || "Employer") + ", " + i.format.toLowerCase() + ", with " + i.panel.join(", ") + ".", status: "Completed", tone: "neutral", open: () => openDrawer("vacancy", i.vacancyId) };
  });

  const intros: Item[] = s.intros.filter(i => i.candidateId === c.id && i.status !== "pending" && i.date !== "Just now").map(i => {
    const v = vacancyById(i.vacancyId, s);
    const emp = EMPLOYER_BY_ID[v?.employerId || ""];
    const day = daysBefore(i.date) ?? 14;
    return { id: "in-" + i.id, at: atFor(day), day, kind: "applications", icon: "userPlus", who: "You",
      title: i.status === "accepted" ? "Shared your details with " + (emp?.short || "an employer") : "Declined an introduction",
      detail: (i.status === "accepted" ? (emp?.name || "The employer") + " can now contact you about " : "You chose not to share your details for ") + (v?.title || "a role") + ".",
      open: () => openDrawer("vacancy", i.vacancyId) };
  });

  const offerNotes: Item[] = offersFor(s, c.id).flatMap(o => {
    const emp = EMPLOYER_BY_ID[o.employerId];
    const sentAt = o.history.findIndex(h => h.kind === "system" && /^Sent to/.test(h.text));
    return o.history.map((h, idx) => ({ h, idx })).filter(({ h, idx }) => !/^Today/.test(h.when) && idx > sentAt && sentAt > -1 && (h.kind === "candidate" || h.kind === "employer"))
      .map(({ h, idx }) => {
        const day = daysBefore(h.when) ?? 3;
        const mine = h.kind === "candidate";
        return { id: "of-" + o.id + "-" + idx, at: atFor(day) - idx, day, kind: "offers" as Kind, icon: mine ? "messages" : "offers", who: mine ? "You" : h.who,
          title: mine ? "Question on the " + (emp?.short || "") + " offer" : (emp?.short || "The employer") + " replied about the offer",
          detail: mine ? h.text + "." : h.who + ": " + h.text + ".", open: () => openDrawer("offer", o.id) };
      });
  });

  const learning: Item[] = s.enrolments.filter(e => e.candidateId === c.id && e.date !== "Today").map(e => {
    const course = COURSE_BY_ID[e.courseId];
    const day = daysBefore(e.date) ?? 30;
    return { id: "en-" + e.id, at: atFor(day), day, kind: "learning", icon: "learning", who: "You", title: "Enrolled in " + (course?.title || "a course"),
      detail: e.progress + "% complete.", status: e.status, tone: "accent", open: () => openDrawer("course", e.courseId) };
  });

  return fromLog.concat(apps, interviews, intros, offerNotes, learning).sort((a, b) => a.day - b.day || b.at - a.at);
}

export default function MyActivity() {
  const s = useRecruit();
  const nav = useNav();
  const c = candidate(s, s.persona);
  const [filter, setFilter] = useState<Filter>("all");
  const items = buildItems(s, c);
  const shown = items.filter(i => filter === "all" || i.kind === filter);
  const days = Array.from(new Set(shown.map(i => i.day)));
  const count = (k: Kind) => items.filter(i => i.kind === k).length;

  const upcoming = s.interviews.filter(i => i.candidateId === c.id && i.status === "scheduled");
  const openOffers = offersFor(s, c.id).filter(o => o.status === "sent" || o.status === "changes requested");
  const pendingIntros = s.intros.filter(i => i.candidateId === c.id && i.status === "pending");
  const waiting = verificationItems(s, c).filter(i => i.state === "pending").length;
  const interest = EMPLOYER_INTEREST[c.id] || [];
  const nothingNext = !upcoming.length && !openOffers.length && !pendingIntros.length && !waiting;

  const label = (text: string, k?: Kind) => <>{text}{k && <span style={{ color: "var(--faint)", marginLeft: 6, fontWeight: 500 }}>{count(k)}</span>}</>;

  return (
    <Page wide eyebrow="MY DASHBOARD" title="My activity"
      sub="Everything that has happened on your profile: your applications, profile changes, learning and offers, with what is coming up next."
      actions={<Button icon="lock" onClick={() => nav.go("cand.settings", "privacy")}>Privacy and data</Button>}>
      <Grid cols="rc-g-side-r">
        <Card title="Timeline" sub={items.length + " events"}
          action={<div className="rc-scroll-x" style={{ maxWidth: "100%" }}><Segmented size="sm" value={filter} onChange={setFilter} options={[
            { id: "all", label: label("All") }, { id: "applications", label: label("Applications", "applications") }, { id: "profile", label: label("Profile", "profile") },
            { id: "learning", label: label("Learning", "learning") }, { id: "offers", label: label("Offers", "offers") }]} /></div>}
          headerStyle={{ flexWrap: "wrap" }}>
          {days.map(d => {
            const list = shown.filter(i => i.day === d);
            return (
              <div key={d} style={{ marginTop: 8 }}>
                <div className="rc-row" style={{ padding: "10px 0 4px" }}>
                  <Label>{dayLabel(d)}</Label>
                  <span style={{ flex: 1, height: 1, background: "var(--border)" }} />
                </div>
                {list.map(i => <Row key={i.id} item={i} />)}
              </div>
            );
          })}
          {!shown.length && (
            <Empty icon="activity" title="Nothing here yet"
              body={filter === "learning" ? "Enrol in a course and it will show here." : filter === "offers" ? "Offers and your replies will show here." : filter === "applications" ? "Apply for a role and it will show here." : "Profile changes and verification steps will show here."}
              action={<Button size="sm" iconRight="arrowRight" onClick={() => nav.go(filter === "learning" ? "cand.learning" : filter === "offers" ? "cand.offers" : filter === "applications" ? "cand.jobs" : "cand.profile")}>
                {filter === "learning" ? "Browse courses" : filter === "offers" ? "Open offers" : filter === "applications" ? "See matching roles" : "Open my profile"}</Button>} />
          )}
        </Card>

        <div className="rc-col" style={{ gap: 14 }}>
          <Card title="Coming up" sub="What needs you next">
            <div className="rc-col" style={{ gap: 2 }}>
              {upcoming.map(i => {
                const v = vacancyById(i.vacancyId, s);
                const emp = EMPLOYER_BY_ID[v?.employerId || ""];
                return <NextRow key={i.id} icon="calendar" tone="var(--accent)" title={(i.round === 2 ? "Second" : i.round === 1 ? "First" : "Round " + i.round) + " interview, " + i.when}
                  sub={(v?.title || "Role") + " · " + (emp?.name || "") + " · " + i.format} onClick={() => openDrawer("vacancy", i.vacancyId)} />;
              })}
              {openOffers.map(o => (
                <NextRow key={o.id} icon="offers" tone="var(--teal, #16B8A6)" title={"Offer from " + (EMPLOYER_BY_ID[o.employerId]?.short || "an employer") + ": reply by " + o.expires}
                  sub={o.title} onClick={() => nav.go("cand.offers", "incoming")} />
              ))}
              {pendingIntros.map(i => {
                const v = vacancyById(i.vacancyId, s);
                const emp = EMPLOYER_BY_ID[v?.employerId || ""];
                return (
                  <div key={i.id} style={{ padding: "10px 0", borderTop: "1px solid var(--border)" }}>
                    <div className="rc-row" style={{ gap: 10 }}>
                      <Avatar initials={emp?.initials || "?"} tint={emp?.tint} size={28} square />
                      <div className="rc-grow" style={{ fontSize: 12.5, lineHeight: 1.45 }}><b style={{ fontWeight: 500 }}>{emp?.short}</b> would like an introduction for {v?.title}</div>
                    </div>
                    <div className="rc-row" style={{ justifyContent: "flex-end", gap: 8, marginTop: 8 }}>
                      <Button size="sm" variant="ghost" onClick={() => respondIntroduction(i.id, "declined")}>Decline</Button>
                      <Button size="sm" variant="primary" icon="check" onClick={() => respondIntroduction(i.id, "accepted")}>Share my details</Button>
                    </div>
                  </div>
                );
              })}
              {waiting > 0 && <NextRow icon="clock" tone="var(--warn)" title={waiting + (waiting === 1 ? " item is" : " items are") + " waiting on verification"} sub="Issuers and referees confirm these" onClick={() => nav.go("cand.profile", "verification")} />}
              {nothingNext && <div style={{ fontSize: 12.5, color: "var(--dim)", padding: "4px 0" }}>Nothing scheduled. New interviews and offers will appear here.</div>}
            </div>
          </Card>

          <Card title="At a glance">
            <div className="rc-grid rc-g2" style={{ gap: 10 }}>
              <Tile label="Applications" value={s.applications.filter(a => a.candidateId === c.id && a.status !== "withdrawn").length} onClick={() => nav.go("cand.jobs", "applications")} />
              <Tile label="Interviews" value={s.interviews.filter(i => i.candidateId === c.id).length} onClick={() => nav.go("cand.jobs", "applications")} />
              <Tile label="Employer views" value={interest.length} onClick={() => nav.go("cand.dashboard", "overview")} />
              <Tile label="Profile updates" value={items.filter(i => i.kind === "profile" && i.who === "You").length} onClick={() => nav.go("cand.profile", "profile")} />
            </div>
          </Card>

          <Note icon="lock">Only you see this timeline. Employers never see your activity, and they only see your contact details once you agree.</Note>
        </div>
      </Grid>
    </Page>
  );
}

function Row({ item }: { item: Item }) {
  return (
    <div onClick={item.open} className={item.open ? "rc-rowhover" : undefined}
      style={{ display: "flex", gap: 12, alignItems: "flex-start", padding: "11px 8px", margin: "0 -8px", borderRadius: 10 }}>
      <span style={{ width: 30, height: 30, borderRadius: 10, flex: "none", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--surface-2)", border: "1px solid var(--border)",
        color: item.kind === "offers" ? "var(--teal, #16B8A6)" : item.kind === "learning" ? "#f0a33e" : item.kind === "profile" ? "#c8b4f0" : "var(--accent)" }}>
        <Icon name={item.icon} size={14} />
      </span>
      <div className="rc-grow" style={{ minWidth: 0 }}>
        <div className="rc-row" style={{ gap: 8, alignItems: "baseline" }}>
          <span className="rc-grow" style={{ fontSize: 13, fontWeight: 500, color: "var(--ink)", lineHeight: 1.4 }}>{item.title}</span>
          {item.when && <span style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--faint)", whiteSpace: "nowrap" }}>{item.when}</span>}
        </div>
        <div style={{ fontSize: 12.5, color: "var(--dim)", marginTop: 3, lineHeight: 1.5 }}>{item.detail}</div>
        <div className="rc-row" style={{ gap: 8, marginTop: 6 }}>
          <span style={{ fontSize: 11, color: "var(--faint)" }}>{item.who}</span>
          {item.status && <Badge tone={item.tone || "neutral"}>{item.status}</Badge>}
        </div>
      </div>
    </div>
  );
}

function NextRow({ icon, tone, title, sub, onClick }: { icon: string; tone: string; title: string; sub: string; onClick: () => void }) {
  return (
    <div onClick={onClick} className="rc-rowhover" style={{ display: "flex", gap: 11, alignItems: "flex-start", padding: "10px 8px", margin: "0 -8px", borderRadius: 10 }}>
      <span style={{ width: 28, height: 28, borderRadius: 9, flex: "none", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--surface-2)", color: tone }}><Icon name={icon} size={14} /></span>
      <div className="rc-grow" style={{ minWidth: 0 }}>
        <div style={{ fontSize: 13, color: "var(--ink)", lineHeight: 1.4 }}>{title}</div>
        <div style={{ fontSize: 11.5, color: "var(--dim)", marginTop: 3 }}>{sub}</div>
      </div>
      <Icon name="chevronRight" size={13} style={{ color: "var(--faint)", marginTop: 8 }} />
    </div>
  );
}

function Tile({ label, value, onClick }: { label: string; value: number; onClick: () => void }) {
  return (
    <button onClick={onClick} className="rc-card rc-click rc-focus"
      style={{ textAlign: "left", padding: "11px 12px", borderRadius: 14, background: "var(--surface-2)", border: "1px solid var(--border)", cursor: "pointer", color: "inherit" }}>
      <div style={{ fontSize: 11.5, color: "var(--dim)" }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: "-.6px", marginTop: 5 }}>{value}</div>
    </button>
  );
}
