import { useState, type ReactNode } from "react";
import { Avatar, Badge, Button, Card, Chip, Empty, Field, Grid, KV, Label, Modal, Note, Page, TextArea, TextInput, Toggle } from "../../ui";
import { Icon } from "../../icons";
import { useNav } from "../../nav";
import { contactVisible, introFor, logActivity, notify, setPersona, setVisibility, useRecruit, visibilityOf, type RecruitState, type VisibilitySettings } from "../../store";
import { candidate, offersFor } from "../../selectors";
import { CANDIDATE_BY_ID, EMPLOYERS, EMPLOYER_BY_ID, EMPLOYER_INTEREST, MARKET, PERSONAS } from "../../data";
import type { Candidate } from "../../data";
import { eurK, num } from "../../format";
import { extraOf, patchExtra, type PrivacyRequest } from "./Profile";

/* Candidate settings: one screen, three tabs. Visibility decides how
   employers find you; privacy covers consent and your data; account holds
   the demo profile, contact details and notifications. No real sign-in. */

type Mode = VisibilitySettings["mode"];
const MODES: { id: Mode; icon: string; title: string; body: string; sees: string }[] = [
  { id: "discoverable", icon: "eye", title: "Discoverable", body: "Employers can find you and see your name, role and evidence.", sees: "Your name and profile. Never your contact details." },
  { id: "anonymous", icon: "shield", title: "Anonymous", body: "Employers can find you, but your name and employer stay hidden.", sees: "A profile number, role level, evidence and region." },
  { id: "hidden", icon: "eyeOff", title: "Hidden", body: "You do not appear in search. Applications you send still reach the employer.", sees: "Nothing, unless you apply to them." },
];
const MODE_TEXT: Record<Mode, string> = { discoverable: "discoverable", anonymous: "anonymous", hidden: "hidden from search" };
const anonId = (c: Candidate) => "Professional #" + (40000 + (c.recruitIndex * 37) % 9999);

/* Account details and notification choices live for this session only. */
const CONTACT: Record<string, { email?: string; phone?: string }> = {};
const NOTIFY_DEFAULT = { matches: true, interest: true, intros: true, offers: true, courses: false, weekly: true };
const NOTIFY: Record<string, typeof NOTIFY_DEFAULT> = {};

export default function Settings() {
  const s = useRecruit();
  const nav = useNav();
  const c = candidate(s, s.persona);
  const tab = nav.tab === "privacy" || nav.tab === "account" ? nav.tab : "visibility";
  if (tab === "privacy") return <Privacy s={s} c={c} />;
  if (tab === "account") return <Account c={c} />;
  return <Visibility s={s} c={c} />;
}

/* ── visibility ───────────────────────────────────────────────────────── */

function Visibility({ s, c }: { s: RecruitState; c: Candidate }) {
  const vis = visibilityOf(c.id, s);
  const memberEmployer = EMPLOYERS.find(e => e.name === c.currentOrg);
  const reach = vis.mode === "hidden" ? 0 : MARKET.employerAccounts - (vis.blockCurrentEmployer && memberEmployer ? 1 : 0);
  const change = (patch: Partial<VisibilitySettings>, title: string, detail: string) => {
    setVisibility(c.id, patch);
    logActivity({ category: "profiles", actor: c.name, title, detail, refs: [c.id] });
  };
  return (
    <Page wide eyebrow="SETTINGS" title="Who can see you" sub="Choose how employers find you. Contact details are never shared without your agreement, whichever option you pick.">
      <Grid cols="rc-g-side-r">
        <div className="rc-col" style={{ gap: 14 }}>
          <Card title="Profile visibility" sub={vis.mode === "hidden" ? "You are not in employer search right now" : "Visible to " + num(reach) + " employer accounts on Recruit"}>
            <div className="rc-grid rc-g3" style={{ gap: 10 }}>
              {MODES.map(m => {
                const on = vis.mode === m.id;
                return (
                  <button key={m.id} aria-pressed={on} className="rc-card rc-click rc-focus"
                    onClick={() => !on && change({ mode: m.id }, "Visibility changed", c.name + " set their profile to " + MODE_TEXT[m.id] + ".")}
                    style={{ textAlign: "left", padding: 16, borderRadius: 16, cursor: on ? "default" : "pointer", color: "inherit",
                      background: on ? "var(--accent-faint)" : "var(--surface-2)", border: "1px solid " + (on ? "var(--accent-line)" : "var(--border)") }}>
                    <div className="rc-row" style={{ gap: 9 }}>
                      <span style={{ width: 30, height: 30, borderRadius: 10, background: on ? "var(--accent-soft)" : "var(--surface)", color: on ? "var(--accent)" : "var(--dim)", display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}><Icon name={m.icon} size={15} /></span>
                      <span className="rc-grow" style={{ fontSize: 13.5, fontWeight: 600 }}>{m.title}</span>
                      {on && <span style={{ color: "var(--accent)" }}><Icon name="check" size={15} stroke={2.4} /></span>}
                    </div>
                    <div style={{ fontSize: 12.5, color: "var(--body)", marginTop: 10, lineHeight: 1.5 }}>{m.body}</div>
                    <div style={{ fontSize: 11.5, color: "var(--faint)", marginTop: 8, lineHeight: 1.45 }}>Employers see: {m.sees}</div>
                  </button>
                );
              })}
            </div>
          </Card>

          <Card title="Controls" sub="Fine-tune who sees what">
            <div className="rc-col" style={{ gap: 18 }}>
              <Toggle on={vis.blockCurrentEmployer} label={"Hide me from " + c.currentOrg}
                sub={memberEmployer ? memberEmployer.name + " is a Recruit member. While this is on they never see your profile, even anonymised." : "If your current employer joins Recruit, they will never see your profile, even anonymised."}
                onChange={v => change({ blockCurrentEmployer: v }, v ? "Current employer blocked" : "Current employer unblocked", c.name + (v ? " hid their profile from " : " allowed their profile to be seen by ") + c.currentOrg + ".")} />
              <Toggle on={vis.showSalary} label="Show my salary expectation to employers"
                sub={"Employers would see " + eurK(c.salaryExpectation[0]) + " to " + eurK(c.salaryExpectation[1]) + ". Matching uses it either way, to avoid roles below your range."}
                onChange={v => change({ showSalary: v }, v ? "Salary expectation shown" : "Salary expectation hidden", c.name + (v ? " chose to show" : " chose to hide") + " their salary expectation from employers.")} />
              <Toggle on={vis.seniorOffers} label="Senior talent offers"
                sub="Let Enterprise members invite you to confidential senior roles before they are advertised. You still decide on every introduction."
                onChange={v => change({ seniorOffers: v }, v ? "Senior talent offers on" : "Senior talent offers off", c.name + (v ? " opted in to" : " opted out of") + " senior talent offers.")} />
            </div>
          </Card>
        </div>

        <div className="rc-col" style={{ gap: 14 }}>
          <Card title="What an employer sees" sub="A live preview of your search card">
            <EmployerPreview c={c} vis={vis} />
          </Card>
          <Note icon="lock">Your email and phone number are never shown in search. An employer only receives them after you accept their introduction.</Note>
        </div>
      </Grid>
    </Page>
  );
}

function EmployerPreview({ c, vis }: { c: Candidate; vis: VisibilitySettings }) {
  if (vis.mode === "hidden") {
    return <Empty icon="eyeOff" title="You are hidden from search" body="Employers cannot find you. Any employer you apply to still sees your application and profile." />;
  }
  const anon = vis.mode === "anonymous";
  const top = c.skills.filter(k => k.verification === "verified").sort((a, b) => b.level - a.level).slice(0, 3);
  return (
    <div style={{ padding: 16, borderRadius: "var(--r-md, 16px)", background: "var(--surface-2)", border: "1px solid var(--border)" }}>
      <div className="rc-row" style={{ gap: 11 }}>
        {anon ? <span style={{ width: 40, height: 40, borderRadius: 999, background: "var(--track)", color: "var(--dim)", display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}><Icon name="shield" size={17} /></span>
          : <Avatar initials={c.initials} tint={c.tint} size={40} />}
        <div className="rc-grow" style={{ minWidth: 0 }}>
          <div className="rc-ellipsis" style={{ fontSize: 14, fontWeight: 600 }}>{anon ? anonId(c) : c.name}</div>
          <div className="rc-ellipsis" style={{ fontSize: 12, color: "var(--dim)", marginTop: 2 }}>{c.title}</div>
        </div>
        <Badge tone="teal">{num(c.recruitIndex)}</Badge>
      </div>
      <div className="rc-col" style={{ gap: 7, marginTop: 14, fontSize: 12.5, color: "var(--body)" }}>
        <span className="rc-row" style={{ gap: 7 }}><Icon name="hq" size={13} style={{ color: "var(--faint)" }} />{c.currentOrgPublic}</span>
        <span className="rc-row" style={{ gap: 7 }}><Icon name="pin" size={13} style={{ color: "var(--faint)" }} />{anon ? c.region : c.location}</span>
        <span className="rc-row" style={{ gap: 7 }}><Icon name="clock" size={13} style={{ color: "var(--faint)" }} />{c.years} years' experience · {c.availability.toLowerCase()}</span>
        <span className="rc-row" style={{ gap: 7 }}><Icon name="euro" size={13} style={{ color: "var(--faint)" }} />{vis.showSalary ? "Expects " + eurK(c.salaryExpectation[0]) + " to " + eurK(c.salaryExpectation[1]) : "Salary expectation hidden"}</span>
      </div>
      <div className="rc-row rc-wrap" style={{ gap: 6, marginTop: 12 }}>{top.map(k => <Chip key={k.name}>{k.name}</Chip>)}</div>
      <div className="rc-row" style={{ gap: 7, marginTop: 14, paddingTop: 12, borderTop: "1px solid var(--border)", fontSize: 11.5, color: "var(--faint)" }}>
        <Icon name="lock" size={12} />{anon ? "Name, employer and contact details hidden" : "Employer name and contact details hidden until you agree"}
      </div>
    </div>
  );
}

/* ── privacy ──────────────────────────────────────────────────────────── */

function Privacy({ s, c }: { s: RecruitState; c: Candidate }) {
  const [modal, setModal] = useState<"correction" | "deletion" | null>(null);
  const [text, setText] = useState("");
  const extra = extraOf(s, c.id);
  const requests = extra.requests || [];
  const deletion = requests.find(r => r.type === "Deletion request" && r.status !== "Cancelled");
  const interest = EMPLOYER_INTEREST[c.id] || [];
  const shared = EMPLOYERS.filter(e => contactVisible(e.id, c.id, s)).map(e => {
    const intro = introFor(e.id, c.id, s);
    const offer = offersFor(s, c.id).find(o => o.employerId === e.id);
    return { e, why: intro?.status === "accepted" ? "You accepted their introduction" + (intro.date && intro.date !== "Just now" ? " on " + intro.date : "") : offer ? "Sent you an offer for " + offer.title : "Introduction accepted" };
  });
  const addRequest = (type: string, detail: string, status: string) =>
    patchExtra(c.id, cur => ({ requests: [{ id: "pr" + Date.now().toString(36), type, detail, status, date: "Today" } as PrivacyRequest].concat(cur.requests || []) }));

  const exportData = () => {
    const payload = {
      exported: new Date().toISOString(),
      notice: "Recruit by O'Farrell Sterling. Demo export of illustrative data.",
      profile: c,
      profileEdits: extraOf(s, c.id),
      visibility: visibilityOf(c.id, s),
      applications: s.applications.filter(a => a.candidateId === c.id),
      enrolments: s.enrolments.filter(e => e.candidateId === c.id),
      introductions: s.intros.filter(i => i.candidateId === c.id),
      offers: offersFor(s, c.id),
      activity: s.activity.filter(e => e.refs.includes(c.id)).map(e => ({ when: e.when, title: e.title, detail: e.detail })),
    };
    const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "recruit-data-" + c.name.toLowerCase().replace(/[^a-z]+/g, "-") + ".json";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
    addRequest("Data export", "JSON file downloaded to this device", "Completed");
    logActivity({ category: "profiles", actor: c.name, title: "Data export downloaded", detail: c.name + " downloaded a copy of their profile data.", refs: [c.id] });
    notify("Your data downloaded as a JSON file");
  };
  const submitCorrection = () => {
    addRequest("Profile correction", text.trim(), "In progress");
    logActivity({ category: "profiles", actor: c.name, title: "Correction requested", detail: c.name + " asked Recruit to correct their profile: " + text.trim(), refs: [c.id], status: "awaiting" });
    notify("Correction request sent. You will hear back within 30 days.", "accent");
    setModal(null); setText("");
  };
  const submitDeletion = () => {
    addRequest("Deletion request", "Delete my profile and data", "Scheduled, within 30 days");
    logActivity({ category: "profiles", actor: c.name, title: "Deletion requested", detail: c.name + " asked Recruit to delete their profile and data within 30 days.", refs: [c.id], status: "awaiting" });
    notify("Deletion request recorded. Nothing is deleted in this demo.", "warn");
    setModal(null);
  };
  const cancelDeletion = () => {
    if (!deletion) return;
    patchExtra(c.id, cur => ({ requests: (cur.requests || []).map(r => (r.id === deletion.id ? { ...r, status: "Cancelled" } : r)) }));
    logActivity({ category: "profiles", actor: c.name, title: "Deletion request cancelled", detail: c.name + " cancelled their deletion request.", refs: [c.id] });
    notify("Deletion request cancelled", "accent");
  };

  return (
    <Page wide eyebrow="SETTINGS" title="Your data and consent"
      sub="You decide who gets your contact details. You can also download everything Recruit holds about you, correct it, or ask for it to be deleted.">
      <Grid cols="rc-g-side-r">
        <div className="rc-col" style={{ gap: 14 }}>
          <Card title="Consent" sub="How your details are protected">
            <Toggle on disabled label="Share my contact details only after I agree"
              sub="Always on. It is one of Recruit's fixed rules: employers never receive your email or phone until you accept their introduction." onChange={() => {}} />
            <div style={{ marginTop: 18 }}><Label>How anonymous previews work</Label></div>
            <div className="rc-grid rc-g2" style={{ gap: 12, marginTop: 10 }}>
              <PreviewList title="Employers can see" ok items={["Role level and years of experience", "Verified skills and qualifications", "Region, not your address", "Recruit Index and its breakdown", "Salary expectation, if you allow it"]} />
              <PreviewList title="Employers cannot see" items={["Your email address and phone number", "Your name, in anonymous mode", "Your current employer's name", "Your activity on Recruit", "Anything at all, if you have blocked them"]} />
            </div>
          </Card>

          <Card title="Contact details shared with" sub="Employers who can contact you directly">
            {shared.map(({ e, why }, i) => (
              <div key={e.id} className="rc-row" style={{ gap: 11, padding: "10px 0", borderTop: i ? "1px solid var(--border)" : 0 }}>
                <Avatar initials={e.initials} tint={e.tint} size={30} square />
                <div className="rc-grow">
                  <div style={{ fontSize: 13 }}>{e.name}</div>
                  <div style={{ fontSize: 11.5, color: "var(--dim)", marginTop: 2 }}>{why}</div>
                </div>
                <Badge tone="teal" icon="check">Consent given</Badge>
              </div>
            ))}
            {!shared.length && <div style={{ fontSize: 12.5, color: "var(--dim)" }}>No employer has your contact details. They appear here once you accept an introduction.</div>}
          </Card>

          <Card title="Who has accessed your profile" sub="Recent employer views and searches, newest first">
            {interest.map((it, i) => {
              const emp = EMPLOYER_BY_ID[it.employerId];
              return (
                <div key={i} className="rc-row" style={{ gap: 11, padding: "10px 0", borderTop: i ? "1px solid var(--border)" : 0 }}>
                  <Avatar initials={emp?.initials || "?"} tint={emp?.tint} size={30} square />
                  <div className="rc-grow" style={{ fontSize: 12.5, lineHeight: 1.45 }}>
                    <span style={{ color: "var(--ink)", fontWeight: 500 }}>{emp?.name}</span> <span style={{ color: "var(--dim)" }}>{it.text}</span>
                  </div>
                  <span style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--faint)", whiteSpace: "nowrap" }}>{it.when}</span>
                </div>
              );
            })}
            {!interest.length && <div style={{ fontSize: 12.5, color: "var(--dim)" }}>No employer has viewed your profile yet.</div>}
          </Card>
        </div>

        <div className="rc-col" style={{ gap: 14 }}>
          <Card title="Your data">
            <DataAction icon="download" title="Download my data" body="Everything Recruit holds about you, as a JSON file." action={<Button size="sm" icon="download" onClick={exportData}>Download</Button>} />
            <DataAction icon="edit" title="Request a correction" body="Something wrong that you cannot edit, such as a verified item." action={<Button size="sm" onClick={() => setModal("correction")}>Request</Button>} />
            <DataAction icon="trash" title="Delete my profile and data" body="Handled within 30 days. You can cancel until then." last
              action={deletion ? <Button size="sm" variant="ghost" onClick={cancelDeletion}>Cancel request</Button> : <Button size="sm" variant="danger" onClick={() => setModal("deletion")}>Request</Button>} />
          </Card>
          <Card title="Your requests" sub={requests.length ? requests.length + " on record" : "None yet"}>
            {requests.map((r, i) => (
              <div key={r.id} style={{ padding: "9px 0", borderTop: i ? "1px solid var(--border)" : 0 }}>
                <div className="rc-row" style={{ gap: 8 }}>
                  <span className="rc-grow" style={{ fontSize: 13 }}>{r.type}</span>
                  <Badge tone={r.status === "Completed" ? "teal" : r.status === "Cancelled" ? "neutral" : "warn"}>{r.status}</Badge>
                </div>
                <div className="rc-ellipsis" style={{ fontSize: 11.5, color: "var(--dim)", marginTop: 3 }}>{r.date} · {r.detail}</div>
              </div>
            ))}
            {!requests.length && <div style={{ fontSize: 12.5, color: "var(--dim)" }}>Exports, corrections and deletion requests appear here with their status.</div>}
          </Card>
          <Note>Demo: requests are recorded here and in your activity, but not processed.</Note>
        </div>
      </Grid>

      <Modal open={modal === "correction"} onClose={() => setModal(null)} title="Request a correction"
        sub="Tell us what is wrong. The verification team checks it with the source, then updates your profile and re-runs matching."
        footer={<><Button variant="ghost" onClick={() => setModal(null)}>Cancel</Button><Button variant="primary" icon="send" disabled={!text.trim()} onClick={submitCorrection}>Send request</Button></>}>
        <Field label="What needs correcting">
          <TextArea rows={4} value={text} onChange={e => setText(e.target.value)} placeholder="For example, the end date of a role or the issuer of a qualification" autoFocus />
        </Field>
      </Modal>
      <Modal open={modal === "deletion"} onClose={() => setModal(null)} title="Delete your profile and data"
        sub="Your profile leaves search straight away. Everything else is deleted within 30 days; you can cancel until then."
        footer={<><Button variant="ghost" onClick={() => setModal(null)}>Keep my profile</Button><Button variant="danger" icon="trash" onClick={submitDeletion}>Request deletion</Button></>}>
        <div className="rc-col" style={{ gap: 10, fontSize: 13, color: "var(--body)", lineHeight: 1.55 }}>
          <span>This covers your profile, CV data, evidence, applications and messages. Records an employer must keep for a hire they made stay with that employer.</span>
          <Note icon="info">Demo: the request is recorded, but nothing is deleted.</Note>
        </div>
      </Modal>
    </Page>
  );
}

function PreviewList({ title, items, ok }: { title: string; items: string[]; ok?: boolean }) {
  return (
    <div style={{ padding: 14, borderRadius: "var(--r-md, 16px)", background: "var(--surface-2)", border: "1px solid var(--border)" }}>
      <div style={{ fontSize: 12.5, fontWeight: 600, marginBottom: 10 }}>{title}</div>
      <div className="rc-col" style={{ gap: 8 }}>
        {items.map(t => (
          <div key={t} className="rc-row" style={{ gap: 9, alignItems: "flex-start", fontSize: 12.5, color: "var(--body)", lineHeight: 1.45 }}>
            <span style={{ color: ok ? "var(--teal, var(--ok))" : "var(--faint)", marginTop: 2 }}><Icon name={ok ? "eye" : "eyeOff"} size={12} /></span>{t}
          </div>
        ))}
      </div>
    </div>
  );
}

function DataAction({ icon, title, body, action, last }: { icon: string; title: string; body: string; action: ReactNode; last?: boolean }) {
  return (
    <div className="rc-row" style={{ gap: 11, alignItems: "flex-start", padding: "11px 0", borderBottom: last ? 0 : "1px solid var(--border)" }}>
      <span style={{ width: 28, height: 28, borderRadius: 9, background: "var(--surface-2)", color: "var(--dim)", display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}><Icon name={icon} size={14} /></span>
      <div className="rc-grow">
        <div style={{ fontSize: 13 }}>{title}</div>
        <div style={{ fontSize: 11.5, color: "var(--dim)", marginTop: 2, lineHeight: 1.45 }}>{body}</div>
      </div>
      {action}
    </div>
  );
}

/* ── account ──────────────────────────────────────────────────────────── */

const maskEmail = (e: string) => {
  const [u, d] = e.split("@");
  return (u?.[0] || "") + "•".repeat(Math.max(3, (u?.length || 0) - 2)) + (u && u.length > 1 ? u[u.length - 1] : "") + "@" + (d || "");
};
const maskPhone = (p: string) => p.slice(0, 4) + " •• ••• " + p.replace(/\D/g, "").slice(-2);

function Account({ c }: { c: Candidate }) {
  const [, force] = useState(0);
  const [editing, setEditing] = useState(false);
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [saved, setSaved] = useState("");
  const local = CONTACT[c.id] || {};
  const prefs = NOTIFY[c.id] || NOTIFY_DEFAULT;
  const curEmail = local.email || c.email, curPhone = local.phone || c.phone;
  const emailOk = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim());
  const phoneOk = phone.replace(/\D/g, "").length >= 7;
  const setPref = (k: keyof typeof NOTIFY_DEFAULT, v: boolean) => {
    NOTIFY[c.id] = { ...prefs, [k]: v };
    setSaved(k);
    force(n => n + 1);
  };
  const PREFS: { k: keyof typeof NOTIFY_DEFAULT; label: string; sub: string }[] = [
    { k: "matches", label: "New matching roles", sub: "When a role above your match threshold opens" },
    { k: "interest", label: "Employer interest", sub: "When an employer views or saves your profile" },
    { k: "intros", label: "Introduction requests", sub: "When an employer asks for your contact details" },
    { k: "offers", label: "Offers and messages", sub: "Offers, changes and replies from employers" },
    { k: "courses", label: "Course recommendations", sub: "New courses linked to your next roles" },
    { k: "weekly", label: "Weekly market value summary", sub: "Your range, roles and index, every Monday" },
  ];
  return (
    <Page wide eyebrow="SETTINGS" title="Account" sub="Your demo profile, contact details and how Recruit keeps you informed.">
      <Grid cols="rc-g-side-r">
        <div className="rc-col" style={{ gap: 14 }}>
          <Card title="Profile details" action={<Badge tone="accent">Demo profile</Badge>}>
            <div className="rc-row" style={{ gap: 14, marginBottom: 16 }}>
              <Avatar initials={c.initials} tint={c.tint} size={52} />
              <div>
                <div style={{ fontSize: 17, fontWeight: 600 }}>{c.name}</div>
                <div style={{ fontSize: 12.5, color: "var(--dim)", marginTop: 3 }}>{c.title} · {c.location}</div>
              </div>
            </div>
            <KV cols={3} items={[
              { k: "Member", v: c.joined.replace(/^Member for /, "") },
              { k: "Anonymous ID", v: anonId(c).replace("Professional ", "") },
              { k: "Profile", v: c.completeness + "% complete" },
            ]} />
          </Card>

          <Card title="Contact details" sub="Hidden from employers until you accept an introduction"
            action={<Button size="sm" variant="ghost" icon="edit" onClick={() => { setEmail(curEmail); setPhone(curPhone); setEditing(true); }}>Edit</Button>}>
            <div className="rc-col" style={{ gap: 2 }}>
              <ContactRow icon="mail" label="Email" value={maskEmail(curEmail)} changed={!!local.email} />
              <ContactRow icon="phone" label="Phone" value={maskPhone(curPhone)} changed={!!local.phone} last />
            </div>
          </Card>

          <Card title="Notifications" sub="Choose what Recruit tells you about">
            <div className="rc-col" style={{ gap: 16 }}>
              {PREFS.map(p => (
                <Toggle key={p.k} on={prefs[p.k]} label={<span className="rc-row" style={{ gap: 8 }}>{p.label}{saved === p.k && <span className="rc-fade" style={{ fontSize: 11, color: "var(--teal, var(--ok))" }}>Saved</span>}</span>}
                  sub={p.sub} onChange={v => setPref(p.k, v)} />
              ))}
            </div>
          </Card>
        </div>

        <div className="rc-col" style={{ gap: 14 }}>
          <Card title="Sign-in" action={<Badge tone="warn" icon="info">Demo</Badge>}>
            <div className="rc-row" style={{ gap: 11 }}>
              <span style={{ width: 32, height: 32, borderRadius: 10, background: "var(--surface-2)", color: "var(--dim)", display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}><Icon name="lock" size={15} /></span>
              <div className="rc-grow">
                <div style={{ fontSize: 13 }}>Demo, no real authentication</div>
                <div style={{ fontSize: 11.5, color: "var(--dim)", marginTop: 2 }}>This profile opens without a password. A live product would use secure sign-in.</div>
              </div>
            </div>
            <div className="rc-col" style={{ gap: 8, marginTop: 14, fontSize: 12.5 }}>
              <div className="rc-row"><span className="rc-grow" style={{ color: "var(--dim)" }}>Email sign-in</span><Badge>Demo simulation</Badge></div>
              <div className="rc-row"><span className="rc-grow" style={{ color: "var(--dim)" }}>LinkedIn import</span><Badge>Not connected</Badge></div>
            </div>
          </Card>

          <Card title="Demo profiles" sub="Switch to see the same product through another professional">
            {PERSONAS.map((id, i) => {
              const p = CANDIDATE_BY_ID[id];
              const on = id === c.id;
              return (
                <div key={id} className="rc-row" style={{ gap: 11, padding: "10px 0", borderTop: i ? "1px solid var(--border)" : 0 }}>
                  <Avatar initials={p.initials} tint={p.tint} size={30} />
                  <div className="rc-grow" style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13 }}>{p.name}</div>
                    <div className="rc-ellipsis" style={{ fontSize: 11.5, color: "var(--dim)", marginTop: 2 }}>{p.title}</div>
                  </div>
                  {on ? <Badge tone="accent" icon="check">Viewing</Badge>
                    : <Button size="sm" onClick={() => { setPersona(id); notify("Now viewing as " + p.name); }}>Switch</Button>}
                </div>
              );
            })}
          </Card>
        </div>
      </Grid>

      <Modal open={editing} onClose={() => setEditing(false)} title="Edit contact details" width={520}
        sub="Saved for this demo session only. Employers still cannot see them until you accept an introduction."
        footer={<><Button variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>
          <Button variant="primary" icon="check" disabled={!emailOk || !phoneOk}
            onClick={() => { CONTACT[c.id] = { email: email.trim(), phone: phone.trim() }; setEditing(false); force(n => n + 1); notify("Contact details saved for this demo session"); }}>Save</Button></>}>
        <div className="rc-col" style={{ gap: 14 }}>
          <Field label="Email" error={email && !emailOk ? "Enter a valid email address" : undefined}><TextInput type="email" value={email} onChange={e => setEmail(e.target.value)} /></Field>
          <Field label="Phone" error={phone && !phoneOk ? "Enter a phone number with at least seven digits" : undefined}><TextInput type="tel" value={phone} onChange={e => setPhone(e.target.value)} /></Field>
        </div>
      </Modal>
    </Page>
  );
}

function ContactRow({ icon, label, value, changed, last }: { icon: string; label: string; value: string; changed: boolean; last?: boolean }) {
  return (
    <div className="rc-row" style={{ gap: 11, padding: "10px 0", borderBottom: last ? 0 : "1px solid var(--border)" }}>
      <span style={{ width: 28, height: 28, borderRadius: 9, background: "var(--surface-2)", color: "var(--dim)", display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}><Icon name={icon} size={14} /></span>
      <span style={{ width: 60, fontSize: 12, color: "var(--dim)" }}>{label}</span>
      <span className="rc-grow" style={{ fontSize: 13, fontFamily: "var(--mono)", letterSpacing: ".02em" }}>{value}</span>
      {changed ? <Badge tone="warn">Unconfirmed</Badge> : <Badge tone="teal" icon="check">Confirmed</Badge>}
    </div>
  );
}
