import { useState, type ReactNode } from "react";
import { Avatar, Badge, Button, Card, Chip, DemoTag, Field, Grid, Label, Note, Page, Progress, Select, Slider, TextArea, TextInput, VerifyBadge } from "../../ui";
import { RangeBar, StackBar } from "../../charts";
import { Icon } from "../../icons";
import { useNav } from "../../nav";
import { update, updateProfile, useRecruit, visibilityOf, type ProfileEdits, type RecruitState, type VisibilitySettings } from "../../store";
import { candidate } from "../../selectors";
import { CANDIDATE_BY_ID, CAREER_PATHS, INDEX_ACTIONS } from "../../data";
import type { Availability, Candidate, Verification } from "../../data";
import { eur, eurK, num } from "../../format";
import { niceAxis } from "../../shared/CourseDrawer";

/* My profile. Every section has an edit mode. Edits save to the shared store,
   log to activity and refresh matching and market value. Verified facts stay
   locked: only an issuer, a referee or the verification team changes them. */

/* ── shared profile helpers (also used by the CV, verification, settings and
      development pages) ─────────────────────────────────────────────────── */

export interface EvidenceNote { label: string; note: string; file?: string; date: string; kind: "evidence" | "reminder" }
export interface AddedRole { role: string; org: string; from: string; to: string; summary: string }
export interface AddedQual { name: string; issuer: string; year: number }
export interface PrivacyRequest { id: string; type: string; detail: string; status: string; date: string }
/** Profile sections the shared ProfileEdits type does not model. They ride in
    the same store record (s.profiles[id]) so they persist with the demo. */
export interface ProfileExtra {
  addedRoles?: AddedRole[];
  roleAchievements?: Record<string, string[]>;
  addedEducation?: AddedQual[];
  addedCerts?: AddedQual[];
  addedLeadership?: string[];
  addedAchievements?: string[];
  addedResponsibilities?: string[];
  addedIndustries?: string[];
  addedVolunteer?: string[];
  evidence?: Record<string, EvidenceNote>;
  requests?: PrivacyRequest[];
  plan?: string[];
}
export type FullEdits = ProfileEdits & ProfileExtra;
export type IndexAction = { id: string; label: string; area: string; points: number; effort: string };
export type ItemState = "verified" | "pending" | "self" | "evidence";

export const extraOf = (s: RecruitState, id: string): FullEdits => (s.profiles[id] || {}) as FullEdits;

/** Quiet save for records that are not profile content (evidence notes, requests, plans). */
export function patchExtra(id: string, patch: ProfileExtra | ((cur: FullEdits) => ProfileExtra)) {
  update(s => {
    const cur = (s.profiles[id] || {}) as FullEdits;
    const next: FullEdits = { ...cur, ...(typeof patch === "function" ? patch(cur) : patch) };
    return { profiles: { ...s.profiles, [id]: next } };
  });
}

/** How an index action gets done: a course, a third party, or evidence you add yourself. */
export const actionKind = (a: IndexAction): "course" | "reference" | "verify" | "evidence" =>
  /^complete the /i.test(a.label) ? "course" : /reference/i.test(a.label) ? "reference" : /verif/i.test(a.label) ? "verify" : "evidence";
/** Instant evidence counts now; anything a third party confirms waits. */
export const actionMode = (a: IndexAction): "done" | "pending" => (actionKind(a) === "evidence" ? "done" : "pending");

/** The index action, if any, that evidences a named skill or qualification. */
export function actionForItem(name: string, actions: IndexAction[]): IndexAction | undefined {
  const full = name.split(",")[0].toLowerCase().trim();
  const first = full.split(/[^a-z]+/).find(w => w.length >= 6);
  return actions.filter(a => actionKind(a) === "evidence" || actionKind(a) === "verify")
    .find(a => { const l = a.label.toLowerCase(); return l.includes(full) || (!!first && l.includes(first)); });
}

export function itemState(base: Verification, key: string, extra: FullEdits, action: IndexAction | undefined, done: Record<string, "done" | "pending">): ItemState {
  if (base === "verified") return "verified";
  if (action && done[action.id] === "done") return "evidence";
  if (base === "pending") return "pending";
  if ((action && done[action.id] === "pending") || extra.evidence?.[key]?.kind === "evidence") return "pending";
  return "self";
}

export function StateBadge({ state, compact }: { state: ItemState; compact?: boolean }) {
  if (state === "evidence") return <Badge tone="accent" icon="file">{compact ? "Evidence" : "Evidence added"}</Badge>;
  return <VerifyBadge status={state} compact={compact} />;
}
export const stateColor = (st: ItemState) =>
  st === "verified" ? "var(--teal, var(--ok))" : st === "pending" ? "var(--warn)" : st === "evidence" ? "var(--accent)" : "var(--faint)";

export const isCertificate = (q: { name: string }) => /certificate|certification|level \d|first aid|safety/i.test(q.name);

export interface VItem { key: string; group: "Skills" | "Qualifications" | "Experience"; name: string; meta: string; base: Verification; state: ItemState; action?: IndexAction; issuer?: string; added?: boolean; evidence?: EvidenceNote }

/** Every skill, qualification and role with its live verification state. */
export function verificationItems(s: RecruitState, c: Candidate): VItem[] {
  const base = CANDIDATE_BY_ID[c.id];
  const extra = extraOf(s, c.id);
  const actions = INDEX_ACTIONS[c.id] || [];
  const mk = (group: VItem["group"], key: string, name: string, meta: string, v: Verification, issuer?: string, added?: boolean): VItem => {
    const action = v === "verified" ? undefined : actionForItem(name, actions);
    return { key, group, name, meta, base: v, state: itemState(v, key, extra, action, s.indexActions), action, issuer, added, evidence: extra.evidence?.[key] };
  };
  const skills = base.skills.map(k => mk("Skills", "skill:" + k.name, k.name, "Level " + k.level, k.verification))
    .concat((extra.addedSkills || []).map(n => mk("Skills", "skill:" + n, n, "Added by you", "self", undefined, true)));
  const quals = base.qualifications.map(q => mk("Qualifications", "qual:" + q.name, q.name, q.issuer + " · " + q.year, q.verification, q.issuer))
    .concat((extra.addedEducation || []).concat(extra.addedCerts || []).map(q => mk("Qualifications", "qual:" + q.name, q.name, q.issuer + " · " + q.year + " · added by you", "self", q.issuer, true)));
  const roles = base.experience.map(e => mk("Experience", "exp:" + e.role + "|" + e.from, e.role, e.org + " · " + e.from + " to " + e.to, e.verification, e.org))
    .concat((extra.addedRoles || []).map(r => mk("Experience", "exp:" + r.role + "|" + r.from, r.role, r.org + " · " + r.from + " to " + r.to + " · added by you", "self", r.org, true)));
  return skills.concat(quals, roles);
}

/** Rewrites activity text written about a person into the second person, for their own view. */
export function personalise(text: string, name: string) {
  let t = text;
  if (t.startsWith(name + ": ") || t.startsWith(name + ", ")) t = t.slice(name.length + 2);
  else if (t.startsWith(name + " ")) t = "You " + t.slice(name.length + 1).replace(/^(\S+ )(her|his|their) /, "$1your ");
  t = t.split(name + "'s").join("your").split(name).join("you");
  t = t.replace("until they agree", "until you agree");
  return t.charAt(0).toUpperCase() + t.slice(1);
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
/** The demo's today: the date the seed data is written around. */
export const DEMO_TODAY = new Date(2026, 10, 18);
export const fmtDay = (d: Date, year = false) => WEEKDAYS[d.getDay()] + " " + d.getDate() + " " + MONTHS[d.getMonth()] + (year ? " " + d.getFullYear() : "");
export const fmtMonth = (d: Date) => MONTHS[d.getMonth()] + " " + d.getFullYear();

export function monthIndex(t: string): number | null {
  if (/present/i.test(t)) return DEMO_TODAY.getFullYear() * 12 + DEMO_TODAY.getMonth();
  const m = /([A-Za-z]{3})[a-z]*\.?\s+(\d{4})/.exec(t);
  if (m) {
    const i = MONTHS.indexOf(m[1][0].toUpperCase() + m[1].slice(1, 3).toLowerCase());
    if (i >= 0) return Number(m[2]) * 12 + i;
  }
  const y = /(\d{4})/.exec(t);
  return y ? Number(y[1]) * 12 : null;
}
export function spanText(from: string, to: string) {
  const a = monthIndex(from), b = monthIndex(to);
  if (a === null || b === null || b < a) return "";
  const n = b - a, y = Math.floor(n / 12), m = n % 12;
  return [y ? y + (y === 1 ? " year" : " years") : "", m ? m + (m === 1 ? " month" : " months") : ""].filter(Boolean).join(" ") || "Under a month";
}

/* ── page ─────────────────────────────────────────────────────────────── */

type Save = (patch: FullEdits, label: string) => void;
type StateOf = (key: string) => ItemState;

export const LEADERSHIP = /team|staff|train|turnover|promot|retain|kept|heads of department|mentor|supervisors/i;
const MODE_LABEL: Record<VisibilitySettings["mode"], string> = { discoverable: "Discoverable", anonymous: "Anonymous to employers", hidden: "Hidden from search" };
const availTone = (a: Availability) => (a === "Actively looking" ? "teal" : a === "Open to offers" ? "accent" : "neutral");
const AVAILABILITY: Availability[] = ["Actively looking", "Open to offers", "Passive", "Not looking"];

export default function Profile() {
  const s = useRecruit();
  const c = candidate(s, s.persona);
  return <ProfileScreen key={c.id} s={s} c={c} />;
}

function ProfileScreen({ s, c }: { s: RecruitState; c: Candidate }) {
  const nav = useNav();
  const base = CANDIDATE_BY_ID[c.id];
  const extra = extraOf(s, c.id);
  const items = verificationItems(s, c);
  const stateOf: StateOf = key => items.find(i => i.key === key)?.state || "self";
  const vis = visibilityOf(c.id, s);
  const save: Save = (patch, label) => updateProfile(c.id, patch, label);
  const current = base.experience[0];
  const roleKey = (e: { role: string; from: string }) => "exp:" + e.role + "|" + e.from;
  const allAch = base.experience.flatMap(e => e.achievements.map(a => ({ a, e })));

  const leadership: Row[] = [
    { key: "lead-team", text: "Leads a team of " + num(c.teamSize) + " as " + current.role, meta: current.org + ", current role", state: stateOf(roleKey(current)) },
    ...allAch.filter(x => LEADERSHIP.test(x.a)).map(x => ({ key: "la:" + x.a, text: x.a, meta: x.e.role + ", " + x.e.org, state: stateOf(roleKey(x.e)) })),
  ];
  const achievements: Row[] = allAch.filter(x => !LEADERSHIP.test(x.a)).map(x => ({ key: "oa:" + x.a, text: x.a, meta: x.e.role + ", " + x.e.org, state: stateOf(roleKey(x.e)) }));
  const responsibilities: Row[] = base.experience.map(e => ({ key: "rs:" + roleKey(e), text: e.summary, meta: e.role + " · " + e.from + " to " + e.to, state: stateOf(roleKey(e)) }))
    .concat((extra.addedRoles || []).filter(r => r.summary).map(r => ({ key: "rs:" + roleKey(r), text: r.summary, meta: r.role + " · added by you", state: "self" as ItemState })));
  const qualRow = (q: { name: string; issuer: string; year: number }): Row => ({ key: "q:" + q.name, text: q.name, meta: q.issuer + " · " + q.year, state: stateOf("qual:" + q.name) });
  const settingTypes = Array.from(new Set(base.experience.map(e => e.orgPublic.split(",")[0])));
  const anyVerifiedRole = base.experience.some(e => e.verification === "verified");
  const adjacent = (CAREER_PATHS[c.id] || []).filter(p => p.adjacent);

  return (
    <Page wide eyebrow="MY PROFILE" title="Your professional profile"
      sub="Edit any section. Changes save straight away, refresh your matches and market value, and show as self-reported until they are verified."
      actions={<>
        <Button icon="eye" onClick={() => nav.go("cand.settings", "visibility")}>What employers see</Button>
        <Button icon="upload" onClick={() => nav.go("cand.profile", "cv")}>Update from a CV</Button>
        <Button variant="primary" icon="verified" onClick={() => nav.go("cand.profile", "verification")}>Verify my profile</Button>
      </>}>

      <HeadlineCard c={c} items={items} vis={vis} save={save} />

      <Grid cols="rc-g-side-r">
        <div className="rc-col" style={{ gap: 14 }}>
          <SummaryCard c={c} save={save} />
          <ExperienceCard c={c} extra={extra} stateOf={stateOf} save={save} />
          <Grid cols="rc-g2">
            <ItemsCard title="Leadership experience" icon="users" sub="Teams led and people developed" rows={leadership}
              added={extra.addedLeadership || []} placeholder="For example, led the pre-opening team"
              onSave={v => save({ addedLeadership: v }, "Leadership experience updated")}
              footer={<SkillChips label="Leadership skills" skills={c.skills.filter(k => /leadership|training|stakeholder|owner|coaching|talent/i.test(k.name))} stateOf={stateOf} />} />
            <ItemsCard title="Operational achievements" icon="award" sub="Results with figures, by role" rows={achievements}
              added={extra.addedAchievements || []} placeholder="A result, ideally with a figure"
              onSave={v => save({ addedAchievements: v }, "Achievements updated")} />
          </Grid>
          <ItemsCard title="Responsibilities" icon="layers" sub="The scope of each role you have held" rows={responsibilities}
            added={extra.addedResponsibilities || []} placeholder="For example, owner reporting each month"
            onSave={v => save({ addedResponsibilities: v }, "Responsibilities updated")} />
          <Grid cols="rc-g2">
            <QualCard kind="education" title="Education" icon="learning" rows={base.qualifications.filter(q => !isCertificate(q)).map(qualRow)}
              added={extra.addedEducation || []} save={save} />
            <QualCard kind="certs" title="Certifications" icon="award" rows={base.qualifications.filter(isCertificate).map(qualRow)}
              added={extra.addedCerts || []} save={save} />
          </Grid>
          <Grid cols="rc-g2">
            <ItemsCard title="Industry experience" icon="hq" sub="Sectors and settings you have worked in"
              rows={[{ key: "ind", text: c.industry + ": " + c.sector.toLowerCase(), meta: c.years + " years across " + base.experience.length + " roles", state: anyVerifiedRole ? "verified" : "self" }]}
              added={extra.addedIndustries || []} placeholder="Another sector you have worked in"
              onSave={v => save({ addedIndustries: v }, "Industry experience updated")}
              footer={<>
                <ChipGroup label="Settings" chips={settingTypes} />
                {adjacent.length > 0 && <ChipGroup label="Where your skills also travel" chips={adjacent.map(p => p.industry + " · " + p.alignment + "%")} onClick={() => nav.go("cand.explorer", "paths")} />}
              </>} />
            <ItemsCard title="Volunteer and community" icon="globe" sub="Voluntary work, mentoring and boards"
              rows={c.volunteer.map(v => ({ key: "vol:" + v, text: v, meta: "Voluntary", state: "self" as ItemState }))}
              added={extra.addedVolunteer || []} placeholder="Voluntary role and organisation"
              onSave={v => save({ addedVolunteer: v }, "Volunteer experience updated")} empty="Nothing added yet." />
          </Grid>
        </div>

        <div className="rc-col" style={{ gap: 14 }}>
          <SkillsCard c={c} extra={extra} stateOf={stateOf} save={save} />
          <ChipListCard title="Preferred roles" icon="target" sub="Roles you want to be matched with" values={c.preferredRoles}
            suggestions={(CAREER_PATHS[c.id] || []).map(p => p.title)} placeholder="Add a role title"
            onSave={v => save({ preferredRoles: v }, "Preferred roles updated")} />
          <SalaryCard c={c} vis={vis} save={save} />
          <AvailabilityCard c={c} save={save} />
          <ChipListCard title="Career interests" icon="sparkle" sub="What you would like your next move to include" values={c.interests}
            suggestions={[]} placeholder="Add an interest" onSave={v => save({ interests: v }, "Career interests updated")} />
        </div>
      </Grid>

      <div style={{ fontSize: 11.5, color: "var(--faint)", padding: "4px 4px 0" }}>
        Edits are saved to this demo profile and refresh matching and market value. Verified items only change when an issuer, a referee or the Recruit verification team confirms them.
      </div>
    </Page>
  );
}

/* ── headline ─────────────────────────────────────────────────────────── */

function HeadlineCard({ c, items, vis, save }: { c: Candidate; items: VItem[]; vis: VisibilitySettings; save: Save }) {
  const nav = useNav();
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(c.title);
  const [loc, setLoc] = useState(c.location);
  const n = (st: ItemState) => items.filter(i => i.state === st).length;
  const parts = [
    { label: "Verified", value: n("verified"), color: "var(--teal, #16B8A6)" },
    { label: "Evidence added", value: n("evidence"), color: "var(--accent)" },
    { label: "Pending", value: n("pending"), color: "var(--warn)" },
    { label: "Self-reported", value: n("self"), color: "var(--neutral)" },
  ];
  return (
    <Card pad={24} tone={editing ? "accent" : undefined} style={{ background: "linear-gradient(140deg, color-mix(in oklab, #4263EB 16%, var(--surface)) 0%, var(--surface) 55%)" }}>
      <div className="rc-row rc-wrap" style={{ gap: 24, alignItems: "flex-start" }}>
        <Avatar initials={c.initials} tint={c.tint} size={72} />
        <div className="rc-grow" style={{ minWidth: 260 }}>
          {editing ? (
            <div className="rc-col" style={{ gap: 12, maxWidth: 520 }}>
              <Field label="Professional title"><TextInput value={title} onChange={e => setTitle(e.target.value)} autoFocus /></Field>
              <Field label="Location" hint="Shown to employers as your region before you share contact details."><TextInput value={loc} onChange={e => setLoc(e.target.value)} /></Field>
              <div className="rc-row" style={{ gap: 8 }}>
                <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>
                <Button size="sm" variant="primary" icon="check" disabled={!title.trim() || !loc.trim() || (title.trim() === c.title && loc.trim() === c.location)}
                  onClick={() => { save({ title: title.trim(), location: loc.trim() }, "Headline updated"); setEditing(false); }}>Save headline</Button>
              </div>
            </div>
          ) : (
            <>
              <div className="rc-row rc-wrap" style={{ gap: 10 }}>
                <div style={{ fontSize: 26, fontWeight: 600, letterSpacing: "-.8px" }}>{c.name}</div>
                <Button size="sm" variant="ghost" icon="edit" onClick={() => { setTitle(c.title); setLoc(c.location); setEditing(true); }}>Edit headline</Button>
              </div>
              <div style={{ fontSize: 15.5, color: "var(--body)", marginTop: 2 }}>{c.title}</div>
              <div className="rc-row rc-wrap" style={{ gap: 16, marginTop: 12, fontSize: 12.5, color: "var(--dim)" }}>
                <span className="rc-row" style={{ gap: 6 }}><Icon name="pin" size={13} />{c.location}</span>
                <span className="rc-row" style={{ gap: 6 }}><Icon name="clock" size={13} />{c.years} years' experience</span>
                <span className="rc-row" style={{ gap: 6 }}><Icon name="users" size={13} />Leads {num(c.teamSize)} people</span>
                <span className="rc-row" style={{ gap: 6 }}><Icon name="globe" size={13} />{c.languages.join(", ")}</span>
              </div>
              <div style={{ fontSize: 12.5, color: "var(--dim)", marginTop: 10, lineHeight: 1.55 }}>
                <span style={{ color: "var(--body)" }}>{c.currentOrg}</span>. Employers see “{c.currentOrgPublic}” until you agree to share your details.
              </div>
              <div className="rc-row rc-wrap" style={{ gap: 6, marginTop: 12 }}>
                <Badge tone={availTone(c.availability)} dot>{c.availability}</Badge>
                <Badge tone={vis.mode === "hidden" ? "warn" : vis.mode === "anonymous" ? "accent" : "teal"} icon={vis.mode === "hidden" ? "eyeOff" : "eye"}>{MODE_LABEL[vis.mode]}</Badge>
                <Badge>{c.joined}</Badge>
              </div>
            </>
          )}
        </div>
        <div style={{ width: 290, maxWidth: "100%", flex: "none", padding: 16, borderRadius: "var(--r-md, 16px)", background: "var(--surface-2)", border: "1px solid var(--border)" }}>
          <div className="rc-row">
            <Label>Profile strength</Label>
            <span className="rc-grow" />
            <button className="rc-link" style={{ fontSize: 12 }} onClick={() => nav.go("cand.value", "breakdown")}>Recruit Index {num(c.recruitIndex)}</button>
          </div>
          <div className="rc-row" style={{ alignItems: "baseline", gap: 8, marginTop: 8 }}>
            <span style={{ fontSize: 30, fontWeight: 600, letterSpacing: "-1px" }}>{c.completeness}%</span>
            <span style={{ fontSize: 12, color: "var(--dim)" }}>complete</span>
          </div>
          <Progress value={c.completeness} style={{ marginTop: 8 }} />
          <div style={{ marginTop: 14 }}><StackBar parts={parts.filter(p => p.value > 0)} height={8} /></div>
          <div className="rc-grid rc-g2" style={{ gap: "7px 12px", marginTop: 10 }}>
            {parts.map(p => (
              <div key={p.label} className="rc-row" style={{ gap: 7, fontSize: 11.5 }}>
                <span style={{ width: 7, height: 7, borderRadius: 2, background: p.color, flex: "none" }} />
                <span className="rc-grow rc-ellipsis" style={{ color: "var(--dim)" }}>{p.label}</span>
                <b style={{ fontWeight: 600 }}>{p.value}</b>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
}

/* ── editable building blocks ─────────────────────────────────────────── */

function EditCard({ title, sub, icon, editing, onEdit, onCancel, onSave, dirty, children, footer }: {
  title: string; sub?: string; icon: string; editing: boolean; onEdit: () => void; onCancel: () => void; onSave: () => void; dirty: boolean; children: ReactNode; footer?: ReactNode;
}) {
  return (
    <Card tone={editing ? "accent" : undefined}
      title={<span className="rc-row" style={{ gap: 8 }}><Icon name={icon} size={14} style={{ color: "var(--dim)" }} />{title}</span>} sub={sub}
      action={editing ? <Badge tone="accent" icon="edit">Editing</Badge> : <Button size="sm" variant="ghost" icon="edit" onClick={onEdit}>Edit</Button>}>
      {children}
      {footer}
      {editing && (
        <div className="rc-row" style={{ justifyContent: "flex-end", gap: 8, marginTop: 14, paddingTop: 12, borderTop: "1px solid var(--border)" }}>
          <Button size="sm" variant="ghost" onClick={onCancel}>Cancel</Button>
          <Button size="sm" variant="primary" icon="check" onClick={onSave} disabled={!dirty}>Save</Button>
        </div>
      )}
    </Card>
  );
}

function AddRow({ placeholder, onAdd, suggestions = [], compact }: { placeholder: string; onAdd: (v: string) => void; suggestions?: string[]; compact?: boolean }) {
  const [v, setV] = useState("");
  const add = () => { const t = v.trim(); if (t) { onAdd(t); setV(""); } };
  return (
    <div className="rc-col" style={{ gap: 8 }}>
      <div className="rc-row" style={{ gap: 8 }}>
        <TextInput value={v} placeholder={placeholder} onChange={e => setV(e.target.value)} style={compact ? { height: 34, fontSize: 12.5 } : undefined}
          onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); add(); } }} />
        <Button size="sm" icon="plus" onClick={add} disabled={!v.trim()}>Add</Button>
      </div>
      {suggestions.length > 0 && (
        <div className="rc-row rc-wrap" style={{ gap: 6 }}>
          <span style={{ fontSize: 11.5, color: "var(--faint)", marginRight: 2 }}>Suggestions</span>
          {suggestions.map(x => <Chip key={x} onClick={() => onAdd(x)}><Icon name="plus" size={10} stroke={2.4} />{x}</Chip>)}
        </div>
      )}
    </div>
  );
}

interface Row { key: string; text: ReactNode; meta?: ReactNode; state: ItemState }

function ItemLine({ text, meta, state, first, locked, onRemove }: { text: ReactNode; meta?: ReactNode; state: ItemState; first?: boolean; locked?: boolean; onRemove?: () => void }) {
  return (
    <div className="rc-row" style={{ alignItems: "flex-start", gap: 10, padding: "10px 0", borderTop: first ? 0 : "1px solid var(--border)" }}>
      <span style={{ width: 7, height: 7, borderRadius: 2, flex: "none", marginTop: 7, background: stateColor(state) }} />
      <div className="rc-grow">
        <div style={{ fontSize: 13, lineHeight: 1.5, color: "var(--ink)" }}>{text}</div>
        {meta && <div style={{ fontSize: 11.5, color: "var(--faint)", marginTop: 2 }}>{meta}</div>}
      </div>
      {locked ? <span title="Verified items are locked" style={{ color: "var(--faint)", marginTop: 3 }}><Icon name="lock" size={13} /></span> : <StateBadge state={state} />}
      {onRemove && <Button size="sm" variant="ghost" icon="trash" title="Remove" onClick={onRemove} />}
    </div>
  );
}

function ItemsCard({ title, sub, icon, rows, added, onSave, placeholder, empty, footer }: {
  title: string; sub?: string; icon: string; rows: Row[]; added: string[]; onSave: (next: string[]) => void; placeholder: string; empty?: string; footer?: ReactNode;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<string[]>(added);
  const list = editing ? draft : added;
  return (
    <EditCard title={title} sub={sub} icon={icon} editing={editing} onEdit={() => { setDraft(added); setEditing(true); }} onCancel={() => setEditing(false)}
      onSave={() => { onSave(draft); setEditing(false); }} dirty={JSON.stringify(draft) !== JSON.stringify(added)} footer={footer}>
      <div>
        {rows.map((r, i) => <ItemLine key={r.key} text={r.text} meta={r.meta} state={r.state} first={i === 0} locked={editing && r.state === "verified"} />)}
        {list.map((t, i) => <ItemLine key={"a" + i + t} text={t} meta="Added by you" state="self" first={!rows.length && i === 0}
          onRemove={editing ? () => setDraft(draft.filter((_, j) => j !== i)) : undefined} />)}
        {!rows.length && !list.length && <div style={{ fontSize: 12.5, color: "var(--dim)", padding: "4px 0" }}>{empty || "Nothing here yet."}</div>}
      </div>
      {editing && <div style={{ marginTop: 12 }}><AddRow placeholder={placeholder} onAdd={v => setDraft(draft.concat([v]))} /></div>}
      {editing && rows.some(r => r.state === "verified") && <Note icon="lock" style={{ marginTop: 10 }}>Verified items are locked. To change one, request a correction in Settings, Privacy.</Note>}
    </EditCard>
  );
}

function ChipGroup({ label, chips, onClick }: { label: string; chips: string[]; onClick?: () => void }) {
  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ fontSize: 11.5, color: "var(--faint)", marginBottom: 7 }}>{label}</div>
      <div className="rc-row rc-wrap" style={{ gap: 6 }}>{chips.map(x => <Chip key={x} onClick={onClick}>{x}</Chip>)}</div>
    </div>
  );
}

function SkillChips({ label, skills, stateOf }: { label: string; skills: Candidate["skills"]; stateOf: StateOf }) {
  if (!skills.length) return null;
  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ fontSize: 11.5, color: "var(--faint)", marginBottom: 7 }}>{label}</div>
      <div className="rc-row rc-wrap" style={{ gap: 6 }}>
        {skills.map(k => (
          <Chip key={k.name}><span style={{ width: 6, height: 6, borderRadius: 2, background: stateColor(stateOf("skill:" + k.name)) }} />{k.name}</Chip>
        ))}
      </div>
    </div>
  );
}

/* ── sections ─────────────────────────────────────────────────────────── */

function SummaryCard({ c, save }: { c: Candidate; save: Save }) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(c.summary);
  return (
    <EditCard title="Summary" sub="In your own words. Employers read this first." icon="profile" editing={editing}
      onEdit={() => { setText(c.summary); setEditing(true); }} onCancel={() => setEditing(false)}
      onSave={() => { save({ summary: text.trim() }, "Summary updated"); setEditing(false); }} dirty={!!text.trim() && text.trim() !== c.summary}>
      {editing ? (
        <Field label="Professional summary" hint={text.length + " characters. Plain, specific statements with figures work best."}>
          <TextArea rows={5} value={text} onChange={e => setText(e.target.value)} autoFocus />
        </Field>
      ) : (
        <p style={{ margin: 0, fontSize: 14, lineHeight: 1.7, color: "var(--body)", maxWidth: "76ch" }}>{c.summary}</p>
      )}
    </EditCard>
  );
}

const BLANK_ROLE: AddedRole = { role: "", org: "", from: "", to: "Present", summary: "" };

function ExperienceCard({ c, extra, stateOf, save }: { c: Candidate; extra: FullEdits; stateOf: StateOf; save: Save }) {
  const base = CANDIDATE_BY_ID[c.id].experience;
  const savedRoles = extra.addedRoles || [];
  const savedAch = extra.roleAchievements || {};
  const [editing, setEditing] = useState(false);
  const [roles, setRoles] = useState<AddedRole[]>(savedRoles);
  const [ach, setAch] = useState<Record<string, string[]>>(savedAch);
  const [form, setForm] = useState<AddedRole>(BLANK_ROLE);
  const R = editing ? roles : savedRoles;
  const A = editing ? ach : savedAch;
  const keyOf = (r: { role: string; from: string }) => "exp:" + r.role + "|" + r.from;
  const rows = base.map(e => ({ key: keyOf(e), role: e.role, org: e.org, where: e.location, from: e.from, to: e.to, achievements: e.achievements, added: false, orgPublic: e.orgPublic }))
    .concat(R.map(r => ({ key: keyOf(r), role: r.role, org: r.org, where: "", from: r.from, to: r.to || "Present", achievements: [] as string[], added: true, orgPublic: "" })))
    .sort((a, b) => (monthIndex(b.from) ?? 999999) - (monthIndex(a.from) ?? 999999));
  const formOk = !!form.role.trim() && !!form.org.trim() && !!form.from.trim();
  const set = (k: keyof AddedRole) => (e: { target: { value: string } }) => setForm({ ...form, [k]: e.target.value });
  return (
    <EditCard title="Work experience" icon="jobs" sub={base.length + " roles across " + c.years + " years. Achievements sit under each role."}
      editing={editing} onEdit={() => { setRoles(savedRoles); setAch(savedAch); setForm(BLANK_ROLE); setEditing(true); }} onCancel={() => setEditing(false)}
      onSave={() => { save({ addedRoles: roles, roleAchievements: ach }, "Work experience updated"); setEditing(false); }}
      dirty={JSON.stringify([roles, ach]) !== JSON.stringify([savedRoles, savedAch])}>
      <div>
        {rows.map((r, i) => {
          const st: ItemState = r.added ? "self" : stateOf(r.key);
          const extraAch = A[r.key] || [];
          const span = spanText(r.from, r.to);
          return (
            <div key={r.key + i} style={{ display: "flex", gap: 14 }}>
              <div style={{ width: 12, display: "flex", flexDirection: "column", alignItems: "center", flex: "none" }}>
                <span style={{ width: 10, height: 10, borderRadius: 3, marginTop: 5, background: stateColor(st), boxShadow: "0 0 0 3px var(--surface-2)" }} />
                {i < rows.length - 1 && <span style={{ flex: 1, width: 1, background: "var(--border)", marginTop: 4 }} />}
              </div>
              <div className="rc-grow" style={{ paddingBottom: i < rows.length - 1 ? 22 : 0 }}>
                <div className="rc-row" style={{ gap: 8, alignItems: "flex-start" }}>
                  <div className="rc-grow">
                    <div style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)" }}>{r.role}</div>
                    <div style={{ fontSize: 12.5, color: "var(--body)", marginTop: 3 }}>{r.org}{r.where ? " · " + r.where : ""}</div>
                    <div style={{ fontFamily: "var(--mono)", fontSize: 10.5, color: "var(--faint)", marginTop: 4 }}>{r.from} to {r.to}{span ? " · " + span : ""}</div>
                  </div>
                  <StateBadge state={st} />
                  {editing && r.added && <Button size="sm" variant="ghost" icon="trash" title="Remove role" onClick={() => setRoles(roles.filter(x => keyOf(x) !== r.key))} />}
                </div>
                {(r.achievements.length > 0 || extraAch.length > 0) && (
                  <div className="rc-col" style={{ gap: 7, marginTop: 10 }}>
                    {r.achievements.map(a => <Achievement key={a} text={a} state={st} />)}
                    {extraAch.map((a, j) => <Achievement key={"x" + j + a} text={a} state="self" added
                      onRemove={editing ? () => setAch({ ...ach, [r.key]: extraAch.filter((_, k) => k !== j) }) : undefined} />)}
                  </div>
                )}
                {editing && <div style={{ marginTop: 10 }}><AddRow compact placeholder={"Add an achievement for this role"} onAdd={v => setAch({ ...ach, [r.key]: (ach[r.key] || []).concat([v]) })} /></div>}
                {!editing && r.orgPublic && (
                  <div className="rc-row" style={{ gap: 6, marginTop: 9, fontSize: 11.5, color: "var(--faint)" }}>
                    <Icon name="eye" size={12} />Before consent, employers see “{r.orgPublic}”
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      {editing && (
        <div style={{ marginTop: 16, padding: 14, borderRadius: "var(--r-md, 16px)", background: "var(--surface-2)", border: "1px dashed var(--border-strong)" }}>
          <div style={{ fontSize: 13, fontWeight: 600 }}>Add a role</div>
          <div style={{ fontSize: 12, color: "var(--dim)", marginTop: 3 }}>New roles show as self-reported until a reference or the employer confirms them.</div>
          <div className="rc-grid rc-g2" style={{ gap: 10, marginTop: 12 }}>
            <Field label="Role title"><TextInput value={form.role} onChange={set("role")} placeholder="Assistant Manager" /></Field>
            <Field label="Organisation"><TextInput value={form.org} onChange={set("org")} placeholder="Employer name" /></Field>
            <Field label="From"><TextInput value={form.from} onChange={set("from")} placeholder="Jun 2011" /></Field>
            <Field label="To"><TextInput value={form.to} onChange={set("to")} placeholder="Present" /></Field>
          </div>
          <Field label="Scope of the role" style={{ marginTop: 10 }}><TextArea rows={2} value={form.summary} onChange={set("summary")} placeholder="What you ran, for whom, and at what scale" /></Field>
          <div className="rc-row" style={{ justifyContent: "flex-end", marginTop: 10 }}>
            <Button size="sm" icon="plus" disabled={!formOk}
              onClick={() => { setRoles(roles.concat([{ role: form.role.trim(), org: form.org.trim(), from: form.from.trim(), to: form.to.trim() || "Present", summary: form.summary.trim() }])); setForm(BLANK_ROLE); }}>Add role</Button>
          </div>
        </div>
      )}
    </EditCard>
  );
}

function Achievement({ text, state, added, onRemove }: { text: string; state: ItemState; added?: boolean; onRemove?: () => void }) {
  return (
    <div className="rc-row" style={{ gap: 9, alignItems: "flex-start" }}>
      <span style={{ color: stateColor(state), marginTop: 2 }}><Icon name="check" size={13} stroke={2.4} /></span>
      <span className="rc-grow" style={{ fontSize: 12.5, lineHeight: 1.55, color: "var(--body)" }}>
        {text}
        {added && <span style={{ fontSize: 10.5, color: "var(--faint)", marginLeft: 8 }}>Self-reported</span>}
      </span>
      {onRemove && <Button size="sm" variant="ghost" icon="trash" title="Remove" onClick={onRemove} />}
    </div>
  );
}

function QualCard({ kind, title, icon, rows, added, save }: { kind: "education" | "certs"; title: string; icon: string; rows: Row[]; added: AddedQual[]; save: Save }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<AddedQual[]>(added);
  const [f, setF] = useState({ name: "", issuer: "", year: "" });
  const list = editing ? draft : added;
  const year = Number(f.year);
  const ok = !!f.name.trim() && !!f.issuer.trim() && year >= 1970 && year <= 2027;
  const persist = (v: AddedQual[]) => save(kind === "education" ? { addedEducation: v } : { addedCerts: v }, title + " updated");
  return (
    <EditCard title={title} icon={icon} sub={kind === "education" ? "Degrees, diplomas and programmes" : "Certificates and compliance training"}
      editing={editing} onEdit={() => { setDraft(added); setEditing(true); }} onCancel={() => setEditing(false)}
      onSave={() => { persist(draft); setEditing(false); }} dirty={JSON.stringify(draft) !== JSON.stringify(added)}>
      <div>
        {rows.map((r, i) => <ItemLine key={r.key} text={r.text} meta={r.meta} state={r.state} first={i === 0} locked={editing && r.state === "verified"} />)}
        {list.map((q, i) => <ItemLine key={"a" + i + q.name} text={q.name} meta={q.issuer + " · " + q.year + " · added by you"} state="self" first={!rows.length && i === 0}
          onRemove={editing ? () => setDraft(draft.filter((_, j) => j !== i)) : undefined} />)}
        {!rows.length && !list.length && <div style={{ fontSize: 12.5, color: "var(--dim)" }}>Nothing listed yet.</div>}
      </div>
      {editing && (
        <div className="rc-col" style={{ gap: 8, marginTop: 12 }}>
          <TextInput value={f.name} onChange={e => setF({ ...f, name: e.target.value })} placeholder={kind === "education" ? "Qualification name" : "Certificate name"} />
          <div className="rc-row" style={{ gap: 8 }}>
            <TextInput value={f.issuer} onChange={e => setF({ ...f, issuer: e.target.value })} placeholder="Issuer" />
            <TextInput value={f.year} onChange={e => setF({ ...f, year: e.target.value.replace(/\D/g, "").slice(0, 4) })} placeholder="Year" style={{ width: 84, flex: "none" }} />
            <Button size="sm" icon="plus" disabled={!ok} onClick={() => { setDraft(draft.concat([{ name: f.name.trim(), issuer: f.issuer.trim(), year }])); setF({ name: "", issuer: "", year: "" }); }}>Add</Button>
          </div>
          <div style={{ fontSize: 11.5, color: "var(--faint)" }}>Recruit asks the issuer to confirm new items. They show as self-reported until then.</div>
        </div>
      )}
    </EditCard>
  );
}

function SkillsCard({ c, extra, stateOf, save }: { c: Candidate; extra: FullEdits; stateOf: StateOf; save: Save }) {
  const nav = useNav();
  const base = CANDIDATE_BY_ID[c.id].skills;
  const saved = extra.addedSkills || [];
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<string[]>(saved);
  const list = editing ? draft : saved;
  const names = base.map(k => k.name.toLowerCase()).concat(list.map(n => n.toLowerCase()));
  const suggestions = c.transferable.filter(t => !names.includes(t.toLowerCase())).slice(0, 4);
  const rows = base.map(k => ({ name: k.name, level: k.level, state: stateOf("skill:" + k.name), added: false }))
    .concat(list.map(n => ({ name: n, level: 70, state: "self" as ItemState, added: true })));
  const order: ItemState[] = ["verified", "evidence", "pending", "self"];
  rows.sort((a, b) => order.indexOf(a.state) - order.indexOf(b.state) || b.level - a.level);
  const verified = rows.filter(r => r.state === "verified").length;
  return (
    <EditCard title="Skills and competencies" icon="sparkle" sub={verified + " of " + rows.length + " verified. New skills show as self-reported."}
      editing={editing} onEdit={() => { setDraft(saved); setEditing(true); }} onCancel={() => setEditing(false)}
      onSave={() => { save({ addedSkills: draft }, draft.length > saved.length ? "Skill added" : "Skills updated"); setEditing(false); }}
      dirty={JSON.stringify(draft) !== JSON.stringify(saved)}
      footer={!editing ? (
        <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid var(--border)" }}>
          <div className="rc-row" style={{ marginBottom: 8 }}>
            <span className="rc-grow" style={{ fontSize: 11.5, color: "var(--faint)" }}>Transferable skills</span>
            <button className="rc-link" style={{ fontSize: 12 }} onClick={() => nav.go("cand.explorer", "skills")}>Where they travel</button>
          </div>
          <div className="rc-row rc-wrap" style={{ gap: 6 }}>{c.transferable.map(t => <Chip key={t} tone="accent">{t}</Chip>)}</div>
        </div>
      ) : undefined}>
      <div className="rc-col" style={{ gap: 10 }}>
        {rows.map(r => (
          <div key={r.name} className="rc-row" style={{ gap: 10 }}>
            <div className="rc-grow">
              <div className="rc-ellipsis" style={{ fontSize: 12.5, color: "var(--ink)" }}>{r.name}</div>
              <Progress value={r.level} height={4} tone={r.state === "verified" ? "teal" : "accent"} style={{ marginTop: 5, opacity: r.state === "self" ? 0.55 : 1 }} />
            </div>
            <StateBadge state={r.state} />
            {editing && r.added && <Button size="sm" variant="ghost" icon="trash" title="Remove skill" onClick={() => setDraft(draft.filter(x => x !== r.name))} />}
          </div>
        ))}
      </div>
      {editing && (
        <div style={{ marginTop: 14 }}>
          <AddRow placeholder="Add a skill" suggestions={suggestions}
            onAdd={v => { if (!names.includes(v.toLowerCase())) setDraft(draft.concat([v])); }} />
        </div>
      )}
    </EditCard>
  );
}

function ChipListCard({ title, sub, icon, values, suggestions, placeholder, onSave }: {
  title: string; sub: string; icon: string; values: string[]; suggestions: string[]; placeholder: string; onSave: (v: string[]) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<string[]>(values);
  const list = editing ? draft : values;
  const lower = list.map(x => x.toLowerCase());
  return (
    <EditCard title={title} sub={sub} icon={icon} editing={editing} onEdit={() => { setDraft(values); setEditing(true); }} onCancel={() => setEditing(false)}
      onSave={() => { onSave(draft); setEditing(false); }} dirty={!!draft.length && JSON.stringify(draft) !== JSON.stringify(values)}>
      <div className="rc-row rc-wrap" style={{ gap: 6 }}>
        {list.map(v => <Chip key={v} active={!editing} onRemove={editing ? () => setDraft(draft.filter(x => x !== v)) : undefined}>{v}</Chip>)}
        {!list.length && <span style={{ fontSize: 12.5, color: "var(--dim)" }}>Add at least one.</span>}
      </div>
      {editing && (
        <div style={{ marginTop: 12 }}>
          <AddRow placeholder={placeholder} suggestions={suggestions.filter(x => !lower.includes(x.toLowerCase())).slice(0, 3)}
            onAdd={v => { if (!lower.includes(v.toLowerCase())) setDraft(draft.concat([v])); }} />
        </div>
      )}
    </EditCard>
  );
}

function SalaryCard({ c, vis, save }: { c: Candidate; vis: VisibilitySettings; save: Save }) {
  const nav = useNav();
  const [editing, setEditing] = useState(false);
  const [lo, setLo] = useState(c.salaryExpectation[0]);
  const [hi, setHi] = useState(c.salaryExpectation[1]);
  const exp: [number, number] = editing ? [lo, hi] : c.salaryExpectation;
  const min = Math.floor((c.salaryCurrent * 0.8) / 1000) * 1000;
  const max = Math.ceil((c.salaryCurrent * 1.7) / 1000) * 1000;
  const [axisLo, axisHi] = editing ? niceAxis(Math.min(min, c.marketRange[0]), Math.max(max, c.marketRange[1]))
    : niceAxis(Math.min(c.salaryCurrent, c.marketRange[0], exp[0]) * 0.9, Math.max(c.marketRange[1], exp[1]) * 1.05);
  const verdict = exp[0] > c.marketRange[1] ? "Sits above your estimated market range." : exp[1] < c.marketRange[0] ? "Sits below your estimated market range." : "Overlaps your estimated market range.";
  return (
    <EditCard title="Salary expectations" icon="euro" sub="Used for matching. Employers only see it if you allow it."
      editing={editing} onEdit={() => { setLo(c.salaryExpectation[0]); setHi(c.salaryExpectation[1]); setEditing(true); }} onCancel={() => setEditing(false)}
      onSave={() => { save({ salaryExpectation: [lo, hi] }, "Salary expectation updated"); setEditing(false); }}
      dirty={lo !== c.salaryExpectation[0] || hi !== c.salaryExpectation[1]}>
      <div className="rc-row" style={{ alignItems: "baseline", gap: 8 }}>
        <span style={{ fontSize: 22, fontWeight: 600, letterSpacing: "-.7px" }}>{eur(exp[0])} to {eur(exp[1])}</span>
      </div>
      <div style={{ fontSize: 12, color: "var(--dim)", marginTop: 4 }}>{verdict} <DemoTag /></div>
      <RangeBar min={axisLo} max={axisHi} band={c.marketRange} scenario={exp} marker={c.salaryCurrent} markerLabel="Now" format={eurK} />
      <div style={{ fontSize: 11.5, color: "var(--faint)" }}>Solid: estimated market {eurK(c.marketRange[0])} to {eurK(c.marketRange[1])}. Dashed: your expectation.</div>
      {editing ? (
        <div className="rc-col" style={{ gap: 14, marginTop: 14 }}>
          <Slider label="From" display={eur(lo)} value={lo} min={min} max={max} step={1000} onChange={v => { setLo(v); if (v > hi) setHi(v); }} />
          <Slider label="To" display={eur(hi)} value={hi} min={min} max={max} step={1000} onChange={v => { setHi(v); if (v < lo) setLo(v); }} />
        </div>
      ) : (
        <div className="rc-row" style={{ gap: 8, marginTop: 12, fontSize: 12, color: "var(--dim)" }}>
          <Icon name={vis.showSalary ? "eye" : "eyeOff"} size={13} />
          <span className="rc-grow">{vis.showSalary ? "Shown to employers with your profile" : "Hidden from employers"}</span>
          <button className="rc-link" style={{ fontSize: 12 }} onClick={() => nav.go("cand.settings", "visibility")}>Change</button>
        </div>
      )}
    </EditCard>
  );
}

function AvailabilityCard({ c, save }: { c: Candidate; save: Save }) {
  const [editing, setEditing] = useState(false);
  const [avail, setAvail] = useState<Availability>(c.availability);
  const [weeks, setWeeks] = useState(c.noticeWeeks);
  const w = editing ? weeks : c.noticeWeeks;
  const start = new Date(DEMO_TODAY.getTime() + w * 7 * 86400000);
  return (
    <EditCard title="Availability and notice" icon="calendar" sub="Helps employers plan start dates"
      editing={editing} onEdit={() => { setAvail(c.availability); setWeeks(c.noticeWeeks); setEditing(true); }} onCancel={() => setEditing(false)}
      onSave={() => { save({ availability: avail, noticeWeeks: weeks }, "Availability updated"); setEditing(false); }}
      dirty={avail !== c.availability || weeks !== c.noticeWeeks}>
      {editing ? (
        <div className="rc-col" style={{ gap: 14 }}>
          <Field label="Status"><Select value={avail} onChange={v => setAvail(v as Availability)} options={AVAILABILITY} /></Field>
          <Slider label="Notice period" display={weeks + (weeks === 1 ? " week" : " weeks")} value={weeks} min={0} max={16} onChange={setWeeks} />
        </div>
      ) : (
        <div className="rc-row rc-wrap" style={{ gap: 8 }}>
          <Badge tone={availTone(c.availability)} dot>{c.availability}</Badge>
          <Badge icon="clock">{c.noticeWeeks ? c.noticeWeeks + " weeks' notice" : "No notice period"}</Badge>
        </div>
      )}
      <div style={{ fontSize: 12.5, color: "var(--dim)", marginTop: 12, lineHeight: 1.5 }}>
        If you accepted an offer today, the earliest start would be around <span style={{ color: "var(--ink)" }}>{fmtDay(start, true)}</span>.
      </div>
    </EditCard>
  );
}
