import { useState, type ReactNode } from "react";
import { Avatar, Badge, Button, Card, Checkbox, Field, Grid, KV, Label, Note, Page, Progress, Segmented, Select, TextInput, Toggle } from "../../ui";
import { Icon } from "../../icons";
import { useNav } from "../../nav";
import { notify, useRecruit } from "../../store";
import { EMPLOYER_BY_ID, EMPLOYER_TEAM } from "../../data";
import type { Interview } from "../../data/types";
import { initials } from "../../format";
import {
  ACCESS_LEVELS, DEFAULT_PREFS, Group, PANEL_EXTRA, PREFS, allowance, teamMember, usePrefs, type Access, type HiringPrefs, type NotifyKind,
} from "./hiringKit";

/* Organisation settings for Harbourview: who is on the hiring team and what
   each person can do, plus the hiring preferences other screens read. */

export default function Org() {
  const { tab } = useNav();
  return tab === "preferences" ? <Preferences /> : <Team />;
}

/* ── team ───────────────────────────────────────────────────────────────── */

type Perm = "view" | "intro" | "create" | "approve" | "billing";
const PERMS: { id: Perm; label: string; sub: string }[] = [
  { id: "view", label: "View candidates", sub: "Profiles, Index and fit scores" },
  { id: "intro", label: "Request introductions", sub: "Asks a candidate to share details" },
  { id: "create", label: "Create offers", sub: "Draft and edit packages" },
  { id: "approve", label: "Approve offers", sub: "Sign off before anything is sent" },
  { id: "billing", label: "Billing", sub: "Invoices, plan and payment" },
];
const DEFAULT_MATRIX: Record<Access, Record<Perm, boolean>> = {
  Admin: { view: true, intro: true, create: true, approve: false, billing: true },
  "Hiring manager": { view: true, intro: true, create: true, approve: false, billing: false },
  "Offer approver": { view: true, intro: false, create: false, approve: true, billing: true },
  Interviewer: { view: true, intro: false, create: false, approve: false, billing: false },
};
/** Cells that can't change: admins always manage the account, approvers always approve. */
const LOCKED: Partial<Record<Access, Perm[]>> = { Admin: ["view", "billing"], "Offer approver": ["approve"] };

interface Invite { id: string; name: string; email: string; access: Access; sent: string }

/* Session-only team edits (no store field exists for them). */
let invitesMem: Invite[] = [];
let accessMem: Record<string, Access> = {};
let matrixMem: Record<Access, Record<Perm, boolean>> = DEFAULT_MATRIX;

function Team() {
  const s = useRecruit();
  const nav = useNav();
  const emp = EMPLOYER_BY_ID[s.employerId];
  const plan = s.tiers.find(t => t.id === s.membershipTier);
  const seats = plan ? allowance(s.tiers, plan.id, /seat/i) : null;
  const [invites, setInvitesState] = useState<Invite[]>(invitesMem);
  const [access, setAccessState] = useState<Record<string, Access>>(accessMem);
  const [matrix, setMatrixState] = useState(matrixMem);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [level, setLevel] = useState<Access>("Interviewer");
  const [tried, setTried] = useState(false);

  const setInvites = (v: Invite[]) => { invitesMem = v; setInvitesState(v); };
  const setAccess = (v: Record<string, Access>) => { accessMem = v; setAccessState(v); };
  const setMatrix = (v: Record<Access, Record<Perm, boolean>>) => { matrixMem = v; setMatrixState(v); };

  const used = EMPLOYER_TEAM.length + invites.length;
  const cap = seats ? seats.n : 0;
  const full = !!seats && cap !== Infinity && used >= cap;
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const nameErr = tried && !name.trim() ? "Add a name." : undefined;
  const emailErr = tried && !emailOk ? "Add a valid work email." : tried && [...invites.map(i => i.email.toLowerCase())].includes(email.trim().toLowerCase()) ? "That person already has an invite." : undefined;
  const send = () => {
    setTried(true);
    if (!name.trim() || !emailOk || full || invites.some(i => i.email.toLowerCase() === email.trim().toLowerCase())) return;
    setInvites(invites.concat([{ id: "inv" + Date.now().toString(36), name: name.trim(), email: email.trim(), access: level, sent: "Just now" }]));
    setName(""); setEmail(""); setLevel("Interviewer"); setTried(false);
  };
  const accessOf = (n: string, base: string) => (access[n] || base) as Access;
  const counts = ACCESS_LEVELS.map(a => ({ a, n: EMPLOYER_TEAM.filter(m => accessOf(m.name, m.access) === a).length + invites.filter(i => i.access === a).length }));

  return (
    <Page wide eyebrow="ORGANISATION" title="Team and access"
      sub="Who works on hiring at Harbourview, and what each person can see and do."
      actions={<Button icon="costs" onClick={() => nav.go("emp.costs", "membership")}>Membership</Button>}>

      <Card pad="16px 20px">
        <div className="rc-row rc-wrap" style={{ gap: 18 }}>
          <div className="rc-row" style={{ gap: 12, flex: "1 1 280px" }}>
            <Avatar initials={emp?.initials || "HG"} tint={emp?.tint} size={42} square />
            <div className="rc-grow">
              <div className="rc-row rc-wrap" style={{ gap: 8 }}><span style={{ fontSize: 15, fontWeight: 600 }}>{emp?.name}</span>{emp?.verified && <Badge tone="teal" icon="verified">Verified employer</Badge>}</div>
              <div style={{ fontSize: 12.5, color: "var(--dim)", marginTop: 3 }}>{emp?.location} · {emp?.sector}</div>
            </div>
          </div>
          <div className="rc-row rc-wrap" style={{ gap: 22 }}>
            {[["Employees", String(emp?.employees || "")], ["Plan", plan ? plan.label : ""], ["Member for", (emp?.memberSince || "").replace("Member for ", "")], ["Renews", emp?.renewal || ""]].map(([k, v]) => (
              <div key={k}><Label>{k}</Label><div style={{ fontSize: 14, fontWeight: 500, marginTop: 5 }}>{v}</div></div>
            ))}
          </div>
        </div>
      </Card>

      <Grid cols="rc-g-2-1">
        <div className="rc-col" style={{ gap: 14 }}>
          <Card title="Hiring team" sub={EMPLOYER_TEAM.length + " members" + (invites.length ? " and " + invites.length + " pending " + (invites.length === 1 ? "invite" : "invites") : "")} pad={0} headerStyle={{ padding: "18px 20px 0" }}>
          <div style={{ marginTop: 10 }}>
            {EMPLOYER_TEAM.map(m => {
              const me = m.name === "Rachel Moran";
              const a = accessOf(m.name, m.access);
              return (
                <div key={m.name} className="rc-row rc-wrap" style={{ gap: 12, padding: "13px 20px", borderTop: "1px solid var(--border)" }}>
                  <Avatar initials={m.initials} tint={m.tint} size={36} />
                  <div className="rc-grow" style={{ minWidth: 160 }}>
                    <div className="rc-row" style={{ gap: 7 }}>
                      <span style={{ fontSize: 13.5, fontWeight: 500, color: "var(--ink)" }}>{m.name}</span>
                      {me && <Badge tone="accent">You</Badge>}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--dim)", marginTop: 2 }}>{m.role} · active {m.lastActive.toLowerCase()}</div>
                  </div>
                  {me ? (
                    <span title="You can't change your own access" className="rc-row" style={{ gap: 6, fontSize: 12.5, color: "var(--dim)", width: 180, justifyContent: "flex-end" }}><Icon name="lock" size={12} />{a}</span>
                  ) : (
                    <div style={{ width: 180 }}>
                      <Select value={a} onChange={v => setAccess({ ...access, [m.name]: v as Access })} options={[...ACCESS_LEVELS]} style={{ height: 34 }} />
                    </div>
                  )}
                </div>
              );
            })}
            {invites.map(i => (
              <div key={i.id} className="rc-row rc-wrap rc-rise" style={{ gap: 12, padding: "13px 20px", borderTop: "1px solid var(--border)", background: "var(--surface-faint)" }}>
                <span style={{ width: 36, height: 36, flex: "none", borderRadius: 999, border: "1px dashed var(--border-strong)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 600, color: "var(--dim)" }}>{initials(i.name)}</span>
                <div className="rc-grow" style={{ minWidth: 160 }}>
                  <div className="rc-row" style={{ gap: 7 }}>
                    <span style={{ fontSize: 13.5, fontWeight: 500, color: "var(--ink)" }}>{i.name}</span>
                    <Badge tone="warn" icon="clock">Invite pending</Badge>
                  </div>
                  <div style={{ fontSize: 12, color: "var(--dim)", marginTop: 2 }}>{i.email} · {i.access} · sent {i.sent.toLowerCase()}</div>
                </div>
                <Button size="sm" variant="ghost" icon="refresh" onClick={() => setInvites(invites.map(x => (x.id === i.id ? { ...x, sent: "Resent just now" } : x)))}>Resend</Button>
                <Button size="sm" variant="ghost" icon="x" onClick={() => setInvites(invites.filter(x => x.id !== i.id))}>Cancel</Button>
              </div>
            ))}
          </div>
        </Card>

        <Card title="What each access level can do" sub="Changes apply to everyone at that level. Locked cells protect the account and the approval step."
          action={<Button size="sm" variant="ghost" icon="refresh" onClick={() => setMatrix(DEFAULT_MATRIX)}>Reset</Button>}>
          <div className="rc-scroll-x">
            <div style={{ minWidth: 560 }}>
              <div style={{ display: "grid", gridTemplateColumns: "minmax(170px, 1.6fr) repeat(4, minmax(90px, 1fr))", alignItems: "center", padding: "0 0 8px", borderBottom: "1px solid var(--border)" }}>
                <span />
                {ACCESS_LEVELS.map(a => <span key={a} style={{ fontSize: 11.5, fontWeight: 500, color: "var(--faint)", textAlign: "center" }}>{a}</span>)}
              </div>
              {PERMS.map(p => (
                <div key={p.id} style={{ display: "grid", gridTemplateColumns: "minmax(170px, 1.6fr) repeat(4, minmax(90px, 1fr))", alignItems: "center", padding: "10px 0", borderBottom: "1px solid var(--border)" }}>
                  <div>
                    <div style={{ fontSize: 13, color: "var(--ink)" }}>{p.label}</div>
                    <div style={{ fontSize: 11.5, color: "var(--faint)", marginTop: 2 }}>{p.sub}</div>
                  </div>
                  {ACCESS_LEVELS.map(a => {
                    const on = matrix[a][p.id];
                    const locked = !!LOCKED[a]?.includes(p.id);
                    return (
                      <div key={a} style={{ display: "flex", justifyContent: "center" }}>
                        <button role="switch" aria-checked={on} aria-label={a + ": " + p.label} disabled={locked} title={locked ? "Locked" : on ? "Allowed" : "Not allowed"}
                          onClick={() => setMatrix({ ...matrix, [a]: { ...matrix[a], [p.id]: !on } })} className="rc-focus"
                          style={{ width: 28, height: 28, borderRadius: 9, cursor: locked ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 0,
                            background: on ? "var(--accent-soft)" : "var(--surface-faint)", border: "1px solid " + (on ? "var(--accent-line)" : "var(--border)"), color: on ? "var(--accent)" : "var(--faint)" }}>
                          {locked ? <Icon name="lock" size={11} /> : on ? <Icon name="check" size={12} stroke={2.6} /> : <Icon name="minus" size={11} />}
                        </button>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
          <Note icon="shield" style={{ marginTop: 14 }}>Offers need two people: whoever drafts an offer can't approve it. That's why admins don't approve by default.</Note>
        </Card>

        </div>

        <div className="rc-col" style={{ gap: 14 }}>
          <Card title="Invite a colleague" sub="They join with the access level you choose.">
            <div style={{ marginBottom: 14 }}>
              <div className="rc-row" style={{ gap: 8, fontSize: 12.5 }}>
                <span className="rc-grow" style={{ color: "var(--body)" }}>Seats on {plan?.label || "your plan"}</span>
                <b style={{ fontWeight: 600, color: full ? "var(--warn)" : "var(--ink)" }}>{used}{seats ? (cap === Infinity ? " of unlimited" : " of " + cap) : ""}</b>
              </div>
              {seats && <Progress value={cap === Infinity ? 10 : used} max={cap === Infinity ? 100 : cap} tone={full ? "warn" : "accent"} style={{ marginTop: 8 }} />}
              <div style={{ fontSize: 11.5, color: "var(--faint)", marginTop: 7 }}>{counts.filter(c => c.n).map(c => c.n + " " + c.a.toLowerCase()).join(" · ")}</div>
            </div>
            <div className="rc-col" style={{ gap: 12 }}>
              <Field label="Name" error={nameErr}><TextInput value={name} onChange={e => setName(e.target.value)} placeholder="For example, Ian Mulligan" /></Field>
              <Field label="Work email" error={emailErr}><TextInput type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="name@harbourviewgrand.example" /></Field>
              <Field label="Access level"><Select value={level} onChange={v => setLevel(v as Access)} options={[...ACCESS_LEVELS]} /></Field>
              {full ? (
                <Note tone="warn" icon="users">
                  All {cap} seats on {plan?.label} are in use. <button className="rc-link" onClick={() => nav.go("emp.costs", "membership")}>Compare plans</button> for more seats.
                </Note>
              ) : !seats ? (
                <Note icon="users">Team seats start on the Professional plan.</Note>
              ) : null}
              <Button variant="primary" icon="userPlus" disabled={full || !seats} onClick={send}>Send invite</Button>
              <div style={{ fontSize: 11.5, color: "var(--faint)" }}>Email delivery is planned. In this demo the invite appears in the team list.</div>
            </div>
          </Card>
          <Card title="Offer approval chain" sub="How an offer leaves Harbourview">
            <div className="rc-col" style={{ gap: 0 }}>
              {[
                { who: "Rachel Moran", what: "Drafts the package", icon: "edit" },
                { who: "Deirdre Foley", what: "Approves as Finance Director", icon: "check" },
                { who: "Recruit", what: "Sends it to the candidate", icon: "send" },
                { who: "The candidate", what: "Decides, in their own time", icon: "candidate" },
              ].map((st, i, arr) => {
                const m = teamMember(st.who);
                return (
                  <div key={st.who} className="rc-row" style={{ gap: 12, alignItems: "stretch" }}>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 30, flex: "none" }}>
                      {m ? <Avatar initials={m.initials} tint={m.tint} size={30} /> : <span style={{ width: 30, height: 30, borderRadius: 999, display: "flex", alignItems: "center", justifyContent: "center", background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--accent)" }}><Icon name={st.icon} size={13} /></span>}
                      {i < arr.length - 1 && <span style={{ flex: 1, width: 1, minHeight: 14, background: "var(--border-strong)", margin: "4px 0" }} />}
                    </div>
                    <div style={{ paddingBottom: i < arr.length - 1 ? 14 : 0, paddingTop: 5 }}>
                      <div style={{ fontSize: 13, fontWeight: 500 }}>{st.who}</div>
                      <div style={{ fontSize: 12, color: "var(--dim)", marginTop: 2 }}>{st.what}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      </Grid>
    </Page>
  );
}

/* ── preferences ────────────────────────────────────────────────────────── */

const NOTIFY_LABELS: { id: NotifyKind; label: string; sub: string }[] = [
  { id: "offers", label: "Offers", sub: "Approvals, questions, acceptances and declines" },
  { id: "consent", label: "Consent", sub: "Introductions accepted or declined" },
  { id: "interviews", label: "Interviews", sub: "Bookings and confirmations" },
  { id: "applications", label: "Applications", sub: "New applications to your roles" },
  { id: "pipeline", label: "Pipeline", sub: "Talent Matchmaker suggestions and stage changes" },
  { id: "membership", label: "Membership and billing", sub: "Renewals, plan changes and invoices" },
];

function Preferences() {
  const nav = useNav();
  const saved = usePrefs();
  const [draft, setDraft] = useState<HiringPrefs>(saved);
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);
  const set = (patch: Partial<HiringPrefs>) => setDraft(d => ({ ...d, ...patch }));
  const save = () => { PREFS.set(draft); notify("Hiring preferences saved"); };
  const panelOptions = EMPLOYER_TEAM.map(m => m.name).concat([PANEL_EXTRA]);
  const togglePanel = (n: string) => set({ interviewPanel: draft.interviewPanel.includes(n) ? draft.interviewPanel.filter(x => x !== n) : draft.interviewPanel.concat([n]) });
  const isDefault = JSON.stringify(draft) === JSON.stringify(DEFAULT_PREFS);

  return (
    <Page wide eyebrow="ORGANISATION" title="Hiring preferences"
      sub="Defaults for your team. The pipeline, interview booking and notifications all read these."
      actions={<>
        <Button icon="refresh" disabled={isDefault} onClick={() => setDraft(DEFAULT_PREFS)}>Restore defaults</Button>
        <Button variant="primary" icon="check" disabled={!dirty} onClick={save}>Save preferences</Button>
      </>}>

      {dirty && (
        <Note tone="warn" icon="edit" style={{ animation: "rcRise .3s cubic-bezier(.16,1,.3,1) both" }}>
          You have unsaved changes. <button className="rc-link" onClick={save}>Save them</button> or <button className="rc-link" onClick={() => setDraft(saved)}>discard</button>.
        </Note>
      )}

      <Grid cols="rc-g2">
        <Card title="Candidates" sub="How the pipeline weighs and presents people">
          <div className="rc-col" style={{ gap: 18 }}>
            <Group label="Notice period tolerance" hint="Cards with a longer notice period are flagged on the pipeline. Nobody is filtered out.">
              <Segmented value={String(draft.noticeWeeks)} onChange={v => set({ noticeWeeks: Number(v) })}
                options={[{ id: "4", label: "4 weeks" }, { id: "8", label: "8 weeks" }, { id: "12", label: "12 weeks" }, { id: "26", label: "Any" }]} />
            </Group>
            <Group label="Salary transparency" hint="What candidates see on your vacancies.">
              <Segmented value={draft.salaryTransparency} onChange={v => set({ salaryTransparency: v })}
                options={[{ id: "range", label: "Full range" }, { id: "from", label: "Starting figure" }, { id: "hidden", label: "On request" }]} />
            </Group>
            <Toggle on={draft.suggestions} onChange={v => set({ suggestions: v })} label="Talent Matchmaker suggestions"
              sub="Show ranked profiles under each pipeline. Suggestions are decision support; they never add or reject anyone on their own." />
          </div>
        </Card>

        <Card title="Interview defaults" sub="Prefilled when anyone books an interview">
          <div className="rc-col" style={{ gap: 18 }}>
            <Group label="Format">
              <Segmented value={draft.interviewFormat} onChange={v => set({ interviewFormat: v as Interview["format"] })}
                options={[{ id: "In person", label: "In person" }, { id: "Video", label: "Video" }, { id: "Phone", label: "Phone" }]} />
            </Group>
            <Group label="Length">
              <Segmented value={String(draft.interviewLength)} onChange={v => set({ interviewLength: Number(v) })}
                options={[{ id: "45", label: "45 min" }, { id: "60", label: "60 min" }, { id: "90", label: "90 min" }]} />
            </Group>
            <Group label="Default panel" hint={draft.interviewPanel.length ? draft.interviewPanel.length + " selected" : "Pick at least one person"}>
              <div className="rc-row rc-wrap" style={{ gap: 6 }}>
                {panelOptions.map(n => {
                  const m = teamMember(n);
                  const on = draft.interviewPanel.includes(n);
                  return (
                    <PanelChip key={n} on={on} onClick={() => togglePanel(n)}>
                      {m ? <Avatar initials={m.initials} tint={m.tint} size={20} /> : <Icon name="users" size={12} />}{n}
                    </PanelChip>
                  );
                })}
              </div>
            </Group>
          </div>
        </Card>
      </Grid>

      <Grid cols="rc-g-3-2">
        <Card title="Notifications" sub="Muted categories are hidden from your notifications list">
          <div className="rc-grid rc-g2" style={{ gap: "4px 16px" }}>
            {NOTIFY_LABELS.map(n => (
              <div key={n.id} style={{ padding: "6px 0" }}>
                <Checkbox on={draft.notify[n.id]} onChange={v => set({ notify: { ...draft.notify, [n.id]: v } })} label={<span style={{ color: "var(--ink)" }}>{n.label}</span>} />
                <div style={{ fontSize: 11.5, color: "var(--faint)", marginLeft: 26, marginTop: 1 }}>{n.sub}</div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 16, paddingTop: 14, borderTop: "1px solid var(--border)" }}>
            <Toggle on={draft.emailDigest} onChange={v => set({ emailDigest: v })} disabled label="Daily email digest" sub="Email delivery is planned. In-app notifications are always on." />
          </div>
        </Card>
        <Card title="Where these apply">
          <div className="rc-col" style={{ gap: 11 }}>
            {[
              ["hiring", "Notice tolerance flags cards on the pipeline", "shortlists", "emp.hiring"],
              ["sparkle", "Suggestions appear under each pipeline", "shortlists", "emp.hiring"],
              ["calendar", "Interview defaults prefill every booking", "interviews", "emp.hiring"],
              ["bell", "Muted categories leave your notifications", "notifications", "emp.messages"],
            ].map(([icon, text, tab, page]) => (
              <Applies key={tab + text} icon={icon} onClick={() => nav.go(page, tab)}>{text}</Applies>
            ))}
          </div>
          <div style={{ fontSize: 11.5, color: "var(--faint)", marginTop: 14 }}>Preferences last for this demo session.</div>
        </Card>
      </Grid>
    </Page>
  );
}

function PanelChip({ on, onClick, children }: { on: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button onClick={onClick} aria-pressed={on} className="rc-chip-btn rc-focus"
      style={{ display: "inline-flex", alignItems: "center", gap: 7, height: 30, padding: "0 11px 0 6px", borderRadius: "var(--r-ctl, 10px)", cursor: "pointer", fontSize: 12,
        background: on ? "var(--accent-soft)" : "var(--surface-2)", border: "1px solid " + (on ? "var(--accent-line)" : "var(--border)"), color: on ? "var(--ink)" : "var(--body)" }}>
      {children}
    </button>
  );
}

function Applies({ icon, children, onClick }: { icon: string; children: ReactNode; onClick: () => void }) {
  return (
    <button onClick={onClick} className="rc-rowhover rc-focus"
      style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "8px 8px", margin: "0 -8px", border: 0, borderRadius: 10, background: "transparent", color: "inherit", textAlign: "left", cursor: "pointer" }}>
      <span style={{ width: 26, height: 26, flex: "none", borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", background: "var(--surface-2)", color: "var(--accent)" }}><Icon name={icon} size={13} /></span>
      <span className="rc-grow" style={{ fontSize: 12.5, color: "var(--body)" }}>{children}</span>
      <Icon name="arrowRight" size={13} style={{ color: "var(--faint)" }} />
    </button>
  );
}
