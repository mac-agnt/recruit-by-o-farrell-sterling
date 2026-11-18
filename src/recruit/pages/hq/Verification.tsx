import { useMemo, useState } from "react";
import { Avatar, Badge, Button, Card, DemoTag, Empty, Grid, KV, Note, Page, Segmented, Select, Stat, TextInput, Timeline } from "../../ui";
import { BarChart, BarList } from "../../charts";
import { Icon } from "../../icons";
import { useNav } from "../../nav";
import { logActivity, notify, openDrawer, recordVerification, useRecruit, type RecruitState } from "../../store";
import { candidate } from "../../selectors";
import { AGENT_RUNS, CANDIDATES, CANDIDATE_BY_ID, CREDENTIAL_CHECKS, MARKET, QUALITY, SERIES, VERIFICATION_QUEUE } from "../../data";
import type { ActivityEvent } from "../../data/types";
import { num, pctRaw } from "../../format";

/* Recruit HQ, Verification: the sampled queue behind the 1,284-item backlog.
   Agents route and chase checks; only a confirmed reply, recorded by a
   person, makes anything verified. Every action is written to the shared
   activity log, and each row's status is read back from that log, so the
   queue survives navigation and shows up on the Activity page. */

type Tone = "accent" | "ok" | "warn" | "bad" | "neutral" | "teal";
type VType = "Qualification" | "Certificate" | "Reference" | "Employment" | "Skill evidence";
type Phase = "open" | "chased" | "candidate" | "verified" | "rejected";
type View = "open" | "replied" | "verified" | "rejected" | "all";

interface Item {
  id: string; candidateId: string; item: string; type: VType; issuer: string; party: "issuer" | "employer" | "referee";
  age: string; ageDays: number; owner: string; baseStatus: string; reply?: string; closed?: boolean; source: string;
}
interface Row { it: Item; events: ActivityEvent[]; phase: Phase; status: { label: string; tone: Tone } }

const ACTOR = "John O'Farrell";

/** Who confirms each sampled check. */
const PARTIES: Record<string, { issuer: string; party: Item["party"] }> = {
  vq1: { issuer: "Opera PMS training provider", party: "issuer" },
  vq2: { issuer: "Universidade do Tejo", party: "issuer" },
  vq3: { issuer: "Corrib Hospitality Academy", party: "issuer" },
  vq4: { issuer: "Liffey Institute of Hospitality Leadership", party: "issuer" },
  vq5: { issuer: "Parnell Square Hotel", party: "referee" },
  vq6: { issuer: "Swords Airport Hotel, HR", party: "employer" },
  vq7: { issuer: "Corrib Hospitality Academy", party: "issuer" },
};

/** Checks where the issuer has replied in the demo (simulated replies). Only these can be recorded as verified. */
const REPLIES: Record<string, string> = {
  vq1: "The Opera PMS training provider confirmed Aoife Byrne's Opera PMS certificate, issued 2025.",
  vq3: "Corrib Hospitality Academy confirmed the Higher Certificate in Hospitality, awarded 2019.",
  vq6: "Swords Airport Hotel HR confirmed employment as Hotel Operations Manager from Feb 2021 to the present.",
  vq7: "Corrib Hospitality Academy confirmed the Diploma in Spa Management, awarded 2018.",
};

/** Backlog by age and by type (illustrative). Both add up to the 1,284 backlog. */
const AGEING = [
  { label: "<1 day", value: 342 },
  { label: "1-2 days", value: 418 },
  { label: "3-5 days", value: 314 },
  { label: "6-10 days", value: 162 },
  { label: ">10 days", value: 48 },
];
const TYPE_MIX = [
  { label: "Qualifications", value: 412 },
  { label: "Certificates", value: 296 },
  { label: "Employment history", value: 268 },
  { label: "References", value: 214 },
  { label: "Skill evidence", value: 94 },
];

const REASONS = ["Issuer could not confirm the award", "Document unreadable or incomplete", "Details do not match the profile", "Credential has expired"];
const ACTIONS: Record<string, Phase> = { "Issuer chased": "chased", "Document requested": "candidate", "Credential verified": "verified", "Evidence rejected": "rejected" };

const ageDays = (a: string) => (/today|new/i.test(a) ? 0 : /yesterday/i.test(a) ? 1 : parseInt(a, 10) || 0);
const ago = (a: string) => (/^\d/.test(a) ? a + " ago" : a === "New" ? "Today" : a);
const norm = (x: string) => x.toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
const sameItem = (a: Item, candidateId: string, name: string) =>
  a.candidateId === candidateId && (norm(a.item).includes(norm(name)) || norm(name).includes(norm(a.item)));
const nameOf = (id: string) => CANDIDATE_BY_ID[id]?.name || "A candidate";
const firstOf = (id: string) => nameOf(id).split(" ")[0];

/** The sampled queue: the verification queue, issuer checks, and anything still pending on a sample profile. */
function buildItems(s: RecruitState): Item[] {
  const items: Item[] = VERIFICATION_QUEUE.map(q => ({
    id: q.id, candidateId: q.candidateId, item: q.item, type: q.type as VType,
    issuer: PARTIES[q.id]?.issuer || "Issuer", party: PARTIES[q.id]?.party || "issuer",
    age: q.age, ageDays: ageDays(q.age), owner: q.owner, baseStatus: q.status, reply: REPLIES[q.id], source: "Verification queue",
  }));
  CREDENTIAL_CHECKS.forEach(c => {
    const dup = items.find(i => sameItem(i, c.candidateId, c.credential));
    if (dup) { dup.issuer = c.issuer; return; }
    items.push({ id: c.id, candidateId: c.candidateId, item: c.credential, type: "Qualification", issuer: c.issuer, party: "issuer",
      age: c.age, ageDays: ageDays(c.age), owner: "Verification Agent", baseStatus: c.status === "verified" ? "Verified by issuer" : "Sent to issuer",
      closed: c.status === "verified", source: "Issuer check" });
  });
  CANDIDATES.forEach(base => {
    const c = candidate(s, base.id);
    const pending = [
      ...c.skills.filter(k => k.verification === "pending").map(k => ({ name: k.name, issuer: "Evidence provider", type: "Skill evidence" as VType })),
      ...c.qualifications.filter(k => k.verification === "pending").map(k => ({ name: k.name, issuer: k.issuer, type: "Qualification" as VType })),
    ];
    pending.forEach(p => {
      if (items.some(i => sameItem(i, c.id, p.name))) return;
      items.push({ id: "pv-" + c.id + "-" + norm(p.name).replace(/ /g, "-"), candidateId: c.id, item: p.name, type: p.type, issuer: p.issuer, party: "issuer",
        age: "New", ageDays: 0, owner: "Verification Agent", baseStatus: "Not yet sent", source: "Profile" });
    });
  });
  return items;
}

function statusOf(it: Item, phase: Phase): { label: string; tone: Tone } {
  if (phase === "verified") return { label: "Verified by " + it.party, tone: "teal" };
  if (phase === "rejected") return { label: "Evidence rejected", tone: "bad" };
  if (it.reply) return { label: "Ready to record", tone: "teal" };
  if (phase === "candidate") return { label: "Waiting on candidate", tone: "warn" };
  if (phase === "chased") return { label: "Chased, awaiting reply", tone: "accent" };
  return { label: it.baseStatus, tone: it.baseStatus === "Not yet sent" ? "neutral" : "accent" };
}

const isOpen = (p: Phase) => p !== "verified" && p !== "rejected";

export default function Verification() {
  const s = useRecruit();
  const nav = useNav();
  const [view, setView] = useState<View>("open");
  const [type, setType] = useState("all");
  const [selId, setSelId] = useState("vq3");

  const rows: Row[] = useMemo(() => buildItems(s).map(it => {
    const events = s.activity.filter(e => e.refs[0] === it.id && ACTIONS[e.title] !== undefined);
    const phase: Phase = events[0] ? ACTIONS[events[0].title] : it.closed ? "verified" : /candidate/i.test(it.baseStatus) ? "candidate" : "open";
    return { it, events, phase, status: statusOf(it, phase) };
  }), [s]);

  const inView = (r: Row, v: View) =>
    v === "all" ? true : v === "open" ? isOpen(r.phase) : v === "replied" ? isOpen(r.phase) && !!r.it.reply : r.phase === v;
  const list = rows
    .filter(r => inView(r, view) && (type === "all" || r.it.type === type))
    .sort((a, b) => Number(isOpen(b.phase)) - Number(isOpen(a.phase)) || b.it.ageDays - a.it.ageDays);
  const current = list.find(r => r.it.id === selId) || list[0];
  const count = (v: View) => rows.filter(r => inView(r, v)).length;
  const openCount = count("open");
  const older = AGEING.slice(3).reduce((t, b) => t + b.value, 0);
  const runRouted = AGENT_RUNS.find(r => r.agentId === "verify" && r.result === "partial");
  const runFailed = AGENT_RUNS.find(r => r.agentId === "verify" && r.result === "failed");
  const governed = s.governance["g-verify"] !== false;
  const types = Array.from(new Set(rows.map(r => r.it.type)));

  return (
    <Page wide eyebrow="RECRUIT HQ · TALENT" title="Verification queue"
      sub={num(MARKET.verificationBacklog) + " credentials wait on a check across the marketplace. The sample below is live: every action is logged to Activity."}
      actions={<>
        <Button icon="shield" onClick={() => nav.go("Settings", "governance")}>Governance</Button>
        <Button variant="primary" icon="talent" onClick={() => nav.setTab("candidates")}>Talent database</Button>
      </>}>

      <Card tone="accent" pad={18}>
        <div className="rc-row rc-wrap" style={{ alignItems: "flex-start", gap: 14 }}>
          <span style={{ width: 40, height: 40, flex: "none", borderRadius: 13, display: "flex", alignItems: "center", justifyContent: "center", background: "var(--accent-soft)", color: "var(--accent)" }}>
            <Icon name="shield" size={19} />
          </span>
          <div className="rc-grow" style={{ minWidth: 240 }}>
            <div style={{ fontSize: 15.5, fontWeight: 600, letterSpacing: "-.2px", color: "var(--ink)" }}>Agents never mark facts as verified</div>
            <div style={{ fontSize: 13, color: "var(--dim)", marginTop: 5, lineHeight: 1.55, maxWidth: "78ch" }}>
              Only a confirmed check from an issuer, employer or referee, recorded by a person, changes a status. The Verification Agent routes and chases checks.
              Until a reply arrives, a fact stays self-reported and earns no verified points in the Recruit Index.
            </div>
          </div>
          <Badge tone={governed ? "ok" : "warn"} icon="lock">{governed ? "Governance rule on, locked" : "Rule switched off"}</Badge>
        </div>
      </Card>

      <Grid cols="rc-g5">
        <Stat icon="clock" tone="warn" label="Verification backlog" value={num(MARKET.verificationBacklog)} sub="marketplace, illustrative" />
        <Stat icon="bolt" tone="accent" label="Turnaround" value={QUALITY.verificationSlaHours + " h"} sub="median, request to decision" />
        <Stat icon="alert" tone="bad" label="Older than five days" value={num(older)} sub={pctRaw((older / MARKET.verificationBacklog) * 100) + " of the backlog"} />
        <Stat icon="verified" tone="teal" label="Verified this month" value={num(SERIES.verified[SERIES.verified.length - 1] - SERIES.verified[SERIES.verified.length - 2])} sub="new verified profiles" />
        <Stat icon="target" label="Profile accuracy" value={QUALITY.profileAccuracy + "%"} sub="audited sample" />
      </Grid>

      <Grid cols="rc-g-side-r">
        <Card title="Sampled checks" sub={"Showing " + list.length + " of " + rows.length + " sampled checks. " + openCount + " open, from a backlog of " + num(MARKET.verificationBacklog) + " (illustrative)."}
          action={<DemoTag>Sample</DemoTag>}>
          <div className="rc-row rc-wrap" style={{ gap: 10, marginBottom: 12 }}>
            <Segmented size="sm" value={view} onChange={setView}
              options={[
                { id: "open", label: "Open " + openCount },
                { id: "replied", label: "Replied " + count("replied") },
                { id: "verified", label: "Verified " + count("verified") },
                { id: "rejected", label: "Rejected " + count("rejected") },
                { id: "all", label: "All" },
              ]} />
            <Select value={type} onChange={setType} style={{ width: 190 }}
              options={[{ value: "all", label: "All check types" }, ...types.map(t => ({ value: t, label: t }))]} />
          </div>
          <div className="rc-col" style={{ gap: 4 }}>
            {list.map(r => <QueueRow key={r.it.id} row={r} selected={r.it.id === current?.it.id} onSelect={() => setSelId(r.it.id)} />)}
          </div>
          {!list.length && <Empty icon="verified" title="Nothing in this view" body="Switch view or check type to see the rest of the sampled queue." />}
          {runRouted && (
            <Note icon="sparkle" style={{ marginTop: 14 }}>
              Verification Agent, {runRouted.started}: {runRouted.records} routed. {runRouted.output}.{runFailed ? " " + runFailed.output : ""}
            </Note>
          )}
        </Card>

        {current
          ? <Detail key={current.it.id} row={current} />
          : <Card title="Check detail"><Empty icon="info" title="Select a check" body="Pick a row to see its history and the actions available." /></Card>}
      </Grid>

      <Grid cols="rc-g2">
        <Card title="Backlog by age" sub={num(older) + " of " + num(MARKET.verificationBacklog) + " items have waited more than five days"} action={<DemoTag />}>
          <BarChart data={AGEING} height={196} yFormat={v => num(v)} color="var(--warn)" />
        </Card>
        <Card title="Backlog by check type" sub="What is waiting, across the whole marketplace" action={<DemoTag />}>
          <BarList items={TYPE_MIX.map(t => ({ label: t.label, value: t.value, display: num(t.value), sub: pctRaw((t.value / MARKET.verificationBacklog) * 100) }))} />
        </Card>
      </Grid>
    </Page>
  );
}

function QueueRow({ row, selected, onSelect }: { row: Row; selected: boolean; onSelect: () => void }) {
  const { it, status } = row;
  const c = CANDIDATE_BY_ID[it.candidateId];
  const replied = !!it.reply && isOpen(row.phase);
  return (
    <div onClick={onSelect} className="rc-rowhover"
      style={{ display: "grid", gridTemplateColumns: "32px minmax(0, 1fr) auto", gap: 12, alignItems: "center", padding: "10px 12px", borderRadius: 12,
        border: "1px solid " + (selected ? "var(--accent-line)" : "transparent"), background: selected ? "var(--accent-faint)" : undefined }}>
      <Avatar initials={c?.initials || "?"} tint={c?.tint} size={32} />
      <div style={{ minWidth: 0 }}>
        <div className="rc-row" style={{ gap: 8 }}>
          <span className="rc-ellipsis" style={{ fontSize: 13, fontWeight: 500, color: "var(--ink)" }}>{it.item}</span>
          {replied && <Badge tone="teal" icon="mail">{it.party === "employer" ? "Employer replied" : "Issuer replied"}</Badge>}
        </div>
        <div className="rc-ellipsis" style={{ fontSize: 11.5, color: "var(--dim)", marginTop: 3 }}>{c?.name} · {it.type} · {it.issuer}</div>
      </div>
      <div style={{ textAlign: "right" }}>
        <Badge tone={status.tone}>{status.label}</Badge>
        <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--faint)", marginTop: 5 }}>{it.age === "New" ? "new" : it.age}</div>
      </div>
    </div>
  );
}

function Detail({ row }: { row: Row }) {
  const { it, events, phase, status } = row;
  const c = CANDIDATE_BY_ID[it.candidateId];
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState(REASONS[0]);
  const [note, setNote] = useState("");
  const open = isOpen(phase);
  const who = nameOf(it.candidateId);
  const chases = events.filter(e => e.title === "Issuer chased").length;

  const chase = () => {
    logActivity({ category: "profiles", actor: ACTOR, title: "Issuer chased", refs: [it.id, it.candidateId], status: "awaiting",
      detail: "Chased " + it.issuer + " about " + who + "'s " + it.item + ". Reminder sent from the verification inbox (simulated)." });
    notify("Reminder sent to " + it.issuer + " (simulated)", "accent");
  };
  const requestDoc = () => {
    logActivity({ category: "profiles", actor: ACTOR, title: "Document requested", refs: [it.id, it.candidateId], status: "awaiting",
      detail: "Asked " + who + " to upload a copy of " + it.item + " to support the check." });
    notify("Document requested from " + firstOf(it.candidateId), "accent");
  };
  const confirm = () => {
    recordVerification(it.candidateId, it.item, ACTOR);
    logActivity({ category: "profiles", actor: ACTOR, title: "Credential verified", refs: [it.id, it.candidateId], status: "completed",
      detail: it.issuer + " confirmed " + who + "'s " + it.item + ". Recorded by " + ACTOR + " from the " + it.party + "'s reply. No agent changed this status." });
    notify(it.item + " recorded as verified by the " + it.party);
  };
  const reject = () => {
    logActivity({ category: "profiles", actor: ACTOR, title: "Evidence rejected", refs: [it.id, it.candidateId], status: "failed",
      detail: who + "'s " + it.item + ": " + reason + (note.trim() ? ". " + note.trim().replace(/\.$/, "") : "") + ". " + firstOf(it.candidateId) + " can upload new evidence." });
    notify("Evidence rejected. " + firstOf(it.candidateId) + " has been asked for new evidence.", "warn");
    setRejecting(false);
    setNote("");
  };

  const history: { when: string; title: string; body?: string; tone?: Tone }[] = [
    ...events.map(e => ({ when: e.when, title: e.title + " by " + e.actor, body: e.detail,
      tone: (e.title === "Credential verified" ? "teal" : e.title === "Evidence rejected" ? "bad" : "accent") as Tone })),
    ...(it.reply ? [{ when: "Today", title: "Reply received from the " + it.party, body: it.reply + " (simulated reply)", tone: "teal" as Tone }] : []),
    ...(it.closed ? [{ when: ago(it.age), title: "Confirmed by the issuer", body: it.issuer + " confirmed the credential.", tone: "teal" as Tone }] : []),
    { when: ago(it.age), title: it.source === "Profile" ? "Flagged as pending on the profile" : "Check opened", body: "Owner: " + it.owner + ". Source: " + it.source.toLowerCase() + ".", tone: "neutral" },
  ];

  return (
    <Card title="Check detail" sub={it.source}>
      <div className="rc-row" style={{ gap: 11 }}>
        <Avatar initials={c?.initials || "?"} tint={c?.tint} size={38} />
        <div className="rc-grow">
          <button className="rc-link" onClick={() => openDrawer("candidate", it.candidateId, { from: "hq" })} style={{ fontSize: 14, fontWeight: 600, textAlign: "left" }}>{who}</button>
          <div className="rc-ellipsis" style={{ fontSize: 12, color: "var(--dim)", marginTop: 2 }}>{c?.title}</div>
        </div>
        <Badge tone={status.tone}>{status.label}</Badge>
      </div>

      <div style={{ fontSize: 16, fontWeight: 600, letterSpacing: "-.3px", margin: "16px 0 12px", color: "var(--ink)" }}>{it.item}</div>
      <KV items={[
        { k: "Type", v: it.type },
        { k: it.party === "issuer" ? "Issuer" : it.party === "employer" ? "Employer" : "Referee", v: it.issuer },
        { k: "Owner", v: it.owner },
        { k: "Waiting", v: it.age === "New" ? "New today" : it.age + (chases ? ", chased " + chases + "x" : "") },
      ]} />

      {open && it.reply && <Note tone="teal" icon="mail" style={{ marginTop: 12 }}>Reply received (simulated): {it.reply}</Note>}
      {open && !it.reply && <Note icon="clock" style={{ marginTop: 12 }}>No confirmation from the {it.party} yet. The status can only change to verified once one arrives.</Note>}
      {phase === "verified" && <Note tone="teal" icon="verified" style={{ marginTop: 12 }}>Verified from a confirmed {it.party} reply. The Recruit Index counts it as verified evidence.</Note>}
      {phase === "rejected" && <Note tone="bad" icon="alert" style={{ marginTop: 12 }}>Evidence rejected. {firstOf(it.candidateId)} has been asked for new evidence; the item stays self-reported.</Note>}

      {open && !rejecting && (
        <div className="rc-col" style={{ gap: 8, marginTop: 14 }}>
          <Button variant="primary" icon="verified" full disabled={!it.reply} onClick={confirm}
            title={it.reply ? "Record the " + it.party + "'s confirmation" : "No reply yet. Agents cannot record verification."}>
            Record {it.party} confirmation
          </Button>
          <Button icon="send" full onClick={chase}>Chase {it.party}{chases ? " again" : ""}</Button>
          <Button icon="upload" full onClick={requestDoc}>Request document from candidate</Button>
          <Button variant="danger" icon="x" full onClick={() => setRejecting(true)}>Reject evidence</Button>
        </div>
      )}

      {open && rejecting && (
        <div className="rc-col" style={{ gap: 10, marginTop: 14, padding: 14, borderRadius: "var(--r-sm, 12px)", border: "1px solid color-mix(in oklab, var(--bad) 35%, transparent)", background: "var(--bad-soft)" }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: "var(--ink)" }}>Reject this evidence</div>
          <Select value={reason} onChange={setReason} options={REASONS} />
          <TextInput value={note} onChange={e => setNote(e.target.value)} placeholder="Optional note for the candidate" />
          <div className="rc-row" style={{ gap: 8, justifyContent: "flex-end" }}>
            <Button size="sm" variant="ghost" onClick={() => setRejecting(false)}>Cancel</Button>
            <Button size="sm" variant="danger" icon="x" onClick={reject}>Reject with reason</Button>
          </div>
        </div>
      )}

      {it.owner === "Verification Agent" && open && (
        <div style={{ fontSize: 11.5, color: "var(--faint)", marginTop: 12, lineHeight: 1.5 }}>
          Routed by the Verification Agent. It can send and chase checks, but it cannot mark anything verified.
        </div>
      )}

      <div style={{ marginTop: 18 }}>
        <div style={{ fontSize: 12, fontWeight: 500, color: "var(--dim)", marginBottom: 10 }}>History</div>
        <Timeline items={history} />
      </div>
    </Card>
  );
}
