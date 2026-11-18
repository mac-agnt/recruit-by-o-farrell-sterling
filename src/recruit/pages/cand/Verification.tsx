import { useId, useState } from "react";
import { Badge, Button, Card, Empty, Field, Grid, Label, ListRow, Modal, Note, Page, Progress, Segmented, Select, TextArea, TextInput } from "../../ui";
import { StackBar } from "../../charts";
import { Icon } from "../../icons";
import { useNav } from "../../nav";
import { completeIndexAction, logActivity, notify, openDrawer, useRecruit } from "../../store";
import { candidate } from "../../selectors";
import { COURSES, CREDENTIAL_CHECKS, INDEX_ACTIONS, VERIFICATION_QUEUE } from "../../data";
import type { Candidate } from "../../data";
import { num } from "../../format";
import { lowerFirst } from "../../shared/CourseDrawer";
import { actionKind, actionMode, patchExtra, personalise, StateBadge, stateColor, verificationItems, type IndexAction, type ItemState, type VItem } from "./Profile";

/* Verification. What is confirmed, what is waiting and what the candidate
   can do about it. Nothing here marks an item verified: only an issuer, a
   referee or the Recruit verification team does that. */

type Filter = "all" | "action" | "pending" | "verified";
const GROUPS: VItem["group"][] = ["Skills", "Qualifications", "Experience"];

export default function Verification() {
  const s = useRecruit();
  const nav = useNav();
  const c = candidate(s, s.persona);
  const [filter, setFilter] = useState<Filter>("all");
  const [evItem, setEvItem] = useState<VItem | null>(null);
  const items = verificationItems(s, c);
  const actions = INDEX_ACTIONS[c.id] || [];
  const n = (st: ItemState) => items.filter(i => i.state === st).length;
  const verifiedPct = Math.round((n("verified") / Math.max(1, items.length)) * 100);
  const pts = (st: "done" | "pending" | undefined) => actions.filter(a => s.indexActions[a.id] === st).reduce((t, a) => t + a.points, 0);
  const shown = items.filter(i => filter === "all" || (filter === "action" && i.state === "self") || (filter === "pending" && i.state === "pending")
    || (filter === "verified" && (i.state === "verified" || i.state === "evidence")));
  const recent = s.activity.filter(e => e.refs.includes(c.id) && e.category === "profiles" && /verif|evidence|remind|reference|certificate|cv|correction|sent for/i.test(e.title)).slice(0, 5);
  const parts = [
    { label: "Verified", value: n("verified"), color: "var(--teal, #16B8A6)" },
    { label: "Evidence added", value: n("evidence"), color: "var(--accent)" },
    { label: "Pending", value: n("pending"), color: "var(--warn)" },
    { label: "Self-reported", value: n("self"), color: "var(--neutral)" },
  ];

  return (
    <Page wide eyebrow="MY PROFILE" title="Verification"
      sub="Verified evidence carries the most weight with employers and lifts your Recruit Index. Here is what is confirmed, what is waiting and what you can do next."
      actions={<>
        <Button icon="profile" onClick={() => nav.go("cand.profile", "profile")}>Edit my profile</Button>
        <Button variant="primary" icon="chart" onClick={() => nav.go("cand.value", "breakdown")}>See my Recruit Index</Button>
      </>}>

      <Grid cols="rc-g-3-2">
        <Card pad={22} style={{ background: "linear-gradient(140deg, color-mix(in oklab, #16B8A6 12%, var(--surface)) 0%, var(--surface) 55%)" }}>
          <div className="rc-row rc-wrap" style={{ gap: 28, alignItems: "flex-start" }}>
            <div style={{ minWidth: 180 }}>
              <Label>Verification progress</Label>
              <div className="rc-row" style={{ alignItems: "baseline", gap: 8, marginTop: 8 }}>
                <span style={{ fontSize: 40, fontWeight: 600, letterSpacing: "-1.6px", lineHeight: 1 }}>{verifiedPct}%</span>
                <span style={{ fontSize: 12.5, color: "var(--dim)" }}>verified</span>
              </div>
              <div style={{ fontSize: 12.5, color: "var(--dim)", marginTop: 8 }}>{n("verified")} of {items.length} items confirmed · {c.verifiedCredentials} verified credentials</div>
            </div>
            <div className="rc-grow" style={{ minWidth: 240 }}>
              <StackBar parts={parts.filter(p => p.value > 0)} height={12} />
              <div className="rc-grid rc-g4" style={{ gap: 8, marginTop: 12 }}>
                {parts.map(p => (
                  <div key={p.label} style={{ minWidth: 0 }}>
                    <div className="rc-row" style={{ gap: 6, fontSize: 11.5, color: "var(--dim)" }}><span style={{ width: 7, height: 7, borderRadius: 2, background: p.color, flex: "none" }} /><span className="rc-ellipsis">{p.label}</span></div>
                    <div style={{ fontSize: 20, fontWeight: 600, marginTop: 3 }}>{p.value}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="rc-grid rc-g3" style={{ gap: 10, marginTop: 18 }}>
            {GROUPS.map(g => {
              const list = items.filter(i => i.group === g);
              const v = list.filter(i => i.state === "verified").length;
              return (
                <div key={g} style={{ padding: "11px 13px", borderRadius: "var(--r-sm, 12px)", background: "var(--surface-2)", border: "1px solid var(--border)" }}>
                  <div className="rc-row" style={{ fontSize: 12 }}><span className="rc-grow" style={{ color: "var(--dim)" }}>{g}</span><b style={{ fontWeight: 600 }}>{v}/{list.length}</b></div>
                  <Progress value={v} max={Math.max(1, list.length)} tone="teal" height={5} style={{ marginTop: 8 }} />
                </div>
              );
            })}
          </div>
        </Card>

        <Card title="What it means for your index" sub="Points only apply once evidence is confirmed or added">
          <div className="rc-row" style={{ alignItems: "baseline", gap: 8 }}>
            <span style={{ fontSize: 34, fontWeight: 600, letterSpacing: "-1.2px" }}>{num(c.recruitIndex)}</span>
            <span style={{ fontSize: 12.5, color: "var(--dim)" }}>Recruit Index out of 1,000</span>
          </div>
          <div className="rc-col" style={{ gap: 9, marginTop: 14 }}>
            <PointsLine color="var(--teal, #16B8A6)" label="Added from your evidence" value={"+" + pts("done")} />
            <PointsLine color="var(--warn)" label="Waiting on confirmation" value={String(pts("pending"))} />
            <PointsLine color="var(--accent)" label="Still available" value={String(pts(undefined))} />
          </div>
          <Note icon="shield" style={{ marginTop: 14 }}>Only an issuer, a referee or the Recruit verification team can mark an item verified. Agents never do.</Note>
        </Card>
      </Grid>

      <Grid cols="rc-g-side-r">
        <Card title="Everything on your profile" sub="Each skill, qualification and role with its status"
          action={<Segmented size="sm" value={filter} onChange={setFilter} options={[
            { id: "all", label: "All" }, { id: "action", label: "Needs evidence" }, { id: "pending", label: "Pending" }, { id: "verified", label: "Confirmed" }]} />}>
          {GROUPS.map(g => {
            const list = shown.filter(i => i.group === g);
            if (!list.length) return null;
            return (
              <div key={g} style={{ marginTop: 6 }}>
                <div className="rc-row" style={{ padding: "8px 0 6px" }}><Label>{g}</Label><span style={{ fontSize: 11, color: "var(--faint)" }}>{list.length}</span></div>
                {list.map(i => <ItemRow key={i.key} item={i} c={c} onEvidence={() => setEvItem(i)} />)}
              </div>
            );
          })}
          {!shown.length && <Empty icon="verified" title="Nothing in this view" body={filter === "action" ? "Every item has evidence or is confirmed." : "Try another filter."} />}
        </Card>

        <div className="rc-col" style={{ gap: 14 }}>
          <Card title="Ways to strengthen your profile" sub="Points shown are the Recruit Index effect once each one counts">
            {actions.map((a, i) => (
              <div key={a.id} style={{ padding: "11px 0", borderTop: i ? "1px solid var(--border)" : 0 }}>
                <div className="rc-row" style={{ alignItems: "flex-start", gap: 10 }}>
                  <span style={{ minWidth: 38, height: 24, padding: "0 7px", borderRadius: 8, background: "var(--accent-soft)", color: "var(--accent)", fontSize: 11.5, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}>+{a.points}</span>
                  <div className="rc-grow">
                    <div style={{ fontSize: 13, lineHeight: 1.45, color: "var(--ink)" }}>{a.label}</div>
                    <div style={{ fontSize: 11.5, color: "var(--faint)", marginTop: 3 }}>{a.area} · {a.effort}</div>
                  </div>
                </div>
                <div className="rc-row" style={{ justifyContent: "flex-end", marginTop: 8 }}><StrengthenAction a={a} c={c} /></div>
              </div>
            ))}
          </Card>
          <Card title="Recent verification activity">
            {recent.map(e => (
              <ListRow key={e.id} dot={e.status === "awaiting" ? "var(--warn)" : "var(--teal, #16B8A6)"} title={e.title} sub={personalise(e.detail, c.name)} meta={e.when} />
            ))}
            {!recent.length && <div style={{ fontSize: 12.5, color: "var(--dim)", lineHeight: 1.5 }}>No verification activity yet. Evidence you send and replies from issuers show here.</div>}
          </Card>
        </div>
      </Grid>

      {evItem && <EvidenceModal item={evItem} c={c} onClose={() => setEvItem(null)} />}
    </Page>
  );
}

function PointsLine({ color, label, value }: { color: string; label: string; value: string }) {
  return (
    <div className="rc-row" style={{ fontSize: 13 }}>
      <span style={{ width: 8, height: 8, borderRadius: 3, background: color, flex: "none" }} />
      <span className="rc-grow" style={{ color: "var(--body)" }}>{label}</span>
      <b style={{ fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{value}</b>
    </div>
  );
}

function ItemRow({ item, c, onEvidence }: { item: VItem; c: Candidate; onEvidence: () => void }) {
  const s = useRecruit();
  const queue = VERIFICATION_QUEUE.find(q => q.candidateId === c.id && q.item.toLowerCase().startsWith(item.name.toLowerCase().split(",")[0]));
  const check = CREDENTIAL_CHECKS.find(x => x.candidateId === c.id && x.credential === item.name);
  const reminded = item.evidence?.kind === "reminder" || (item.base === "pending" && !!item.action && !!s.indexActions[item.action.id]);
  let status: string;
  if (item.state === "verified") status = item.group === "Qualifications" ? "Confirmed by " + item.issuer : item.group === "Experience" ? "Confirmed with the employer" : "Evidence checked by Recruit";
  else if (item.state === "evidence") status = "Your evidence counts now" + (item.action ? ", +" + item.action.points + " points" : "");
  else if (item.base === "pending") status = check ? "Waiting on " + check.issuer + ", sent " + check.age + " ago" : queue ? queue.status + ", " + queue.age + " ago" : "Waiting on the issuer";
  else if (item.state === "pending") status = item.evidence ? "Evidence sent " + (item.evidence.date === "Today" ? "today" : item.evidence.date) + ", waiting on review" : "Sent for verification, points apply once confirmed";
  else status = queue ? "Recruit is waiting on evidence from you" : "Self-reported. Add evidence to strengthen it" + (item.action ? " (+" + item.action.points + " points)" : "");
  if (reminded) status += ". Reminder sent";

  const remind = () => {
    if (item.action && !s.indexActions[item.action.id]) { completeIndexAction(item.action.id, "pending", c.id, "Reminder sent to the issuer for " + item.name); return; }
    patchExtra(c.id, cur => ({ evidence: { ...(cur.evidence || {}), [item.key]: { label: item.name, note: "Reminder sent to the issuer", date: "Today", kind: "reminder" } } }));
    logActivity({ category: "profiles", actor: c.name, title: "Issuer reminded", detail: c.name + " asked Recruit to chase " + (item.issuer || "the issuer") + " about " + item.name + ".", refs: [c.id], status: "awaiting" });
    notify("Reminder sent to " + (item.issuer || "the issuer") + ". It stays pending until they confirm.", "accent");
  };

  return (
    <div className="rc-row rc-wrap" style={{ gap: 12, padding: "11px 0", borderTop: "1px solid var(--border)" }}>
      <span style={{ width: 8, height: 8, borderRadius: 3, flex: "none", background: stateColor(item.state) }} />
      <div className="rc-grow" style={{ minWidth: 200 }}>
        <div className="rc-row" style={{ gap: 8 }}>
          <span style={{ fontSize: 13, color: "var(--ink)", fontWeight: 500 }}>{item.name}</span>
          {item.added && <span style={{ fontSize: 10.5, color: "var(--faint)" }}>added by you</span>}
        </div>
        <div style={{ fontSize: 11.5, color: "var(--faint)", marginTop: 2 }}>{item.meta}</div>
        <div style={{ fontSize: 12, color: item.state === "self" ? "var(--dim)" : "var(--body)", marginTop: 4 }}>{status}</div>
      </div>
      <StateBadge state={item.state} />
      <div style={{ width: 128, display: "flex", justifyContent: "flex-end", flex: "none" }}>
        {item.state === "self" && <Button size="sm" variant="primary" icon="plus" onClick={onEvidence}>Add evidence</Button>}
        {item.base === "pending" && item.state === "pending" && (reminded ? <span style={{ fontSize: 11.5, color: "var(--faint)" }}>Chased today</span>
          : <Button size="sm" icon="send" onClick={remind}>Remind issuer</Button>)}
        {item.state === "verified" && <span style={{ color: "var(--teal, var(--ok))" }}><Icon name="check" size={15} stroke={2.4} /></span>}
      </div>
    </div>
  );
}

/** A file picker that only ever reads the chosen file's name. */
export function FilePick({ value, onChange, accept }: { value: string; onChange: (name: string) => void; accept?: string }) {
  const id = useId();
  return (
    <div className="rc-row" style={{ gap: 10 }}>
      <label htmlFor={id} className="rc-btn rc-btn-secondary" style={{ height: 32, padding: "0 12px", display: "inline-flex", alignItems: "center", gap: 7, borderRadius: "var(--cta-r, 12px)", background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--body)", fontSize: 12, cursor: "pointer", flex: "none" }}>
        <Icon name="upload" size={13} />{value ? "Change file" : "Choose a file"}
      </label>
      <input id={id} type="file" accept={accept} style={{ display: "none" }}
        onChange={e => { const f = e.target.files?.[0]; onChange(f ? f.name : ""); e.target.value = ""; }} />
      <span className="rc-grow rc-ellipsis" style={{ fontSize: 12.5, color: value ? "var(--ink)" : "var(--faint)" }}>{value || "No file chosen"}</span>
      {value && <Button size="sm" variant="ghost" icon="x" title="Remove file" onClick={() => onChange("")} />}
    </div>
  );
}

function EvidenceModal({ item, c, onClose }: { item: VItem; c: Candidate; onClose: () => void }) {
  const [note, setNote] = useState("");
  const [file, setFile] = useState("");
  const ok = !!note.trim() || !!file;
  const submit = () => {
    patchExtra(c.id, cur => ({ evidence: { ...(cur.evidence || {}), [item.key]: { label: item.name, note: note.trim(), file: file || undefined, date: "Today", kind: "evidence" } } }));
    if (item.action) completeIndexAction(item.action.id, "pending", c.id, "Evidence sent for " + item.name);
    else {
      logActivity({ category: "profiles", actor: c.name, title: "Evidence submitted", detail: c.name + " sent evidence for " + item.name + " to the verification team.", refs: [c.id], status: "awaiting" });
      notify("Evidence sent. " + item.name + " shows as pending until it is checked.", "accent");
    }
    onClose();
  };
  return (
    <Modal open onClose={onClose} title={"Add evidence: " + item.name}
      sub="Describe the evidence or attach a document. The Recruit verification team or the issuer checks it; nothing is marked verified automatically."
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant="primary" icon="send" disabled={!ok} onClick={submit}>Send for review</Button></>}>
      <div className="rc-col" style={{ gap: 14 }}>
        <Field label="What shows this" hint="Figures, dates and who can confirm it help the check go quickly.">
          <TextArea rows={4} value={note} onChange={e => setNote(e.target.value)} autoFocus
            placeholder={item.group === "Experience" ? "Who you reported to, and who can confirm your dates" : "Where you used it, with a result and a figure if you have one"} />
        </Field>
        <div className="rc-col" style={{ gap: 7 }}>
          <span style={{ fontSize: 12, fontWeight: 500, color: "var(--body)" }}>Supporting document (optional)</span>
          <FilePick value={file} onChange={setFile} accept=".pdf,.doc,.docx,.png,.jpg" />
          <span style={{ fontSize: 11.5, color: "var(--faint)" }}>Demo: only the file name is kept. The file is never read, uploaded or sent.</span>
        </div>
        {item.action && <Note tone="accent" icon="trendUp">Linked to “{item.action.label}”: +{item.action.points} Recruit Index points once confirmed.</Note>}
      </div>
    </Modal>
  );
}

/* ── index actions, shared with the value breakdown and development pages ── */

/** The right control for one index action: a course link, an issuer reminder or an evidence form. */
export function StrengthenAction({ a, c }: { a: IndexAction; c: Candidate }) {
  const s = useRecruit();
  const [open, setOpen] = useState(false);
  const state = s.indexActions[a.id];
  const kind = actionKind(a);
  if (state === "done") return <Badge tone="teal" icon="check">+{a.points} added</Badge>;
  if (state === "pending") return <Badge tone="warn" icon="clock">Awaiting confirmation</Badge>;
  if (kind === "course") {
    const course = COURSES.find(x => a.label.toLowerCase().includes(x.title.toLowerCase()));
    const enrolled = !!course && s.enrolments.some(e => e.candidateId === c.id && e.courseId === course.id);
    if (enrolled) return <Badge tone="accent" icon="learning">Enrolled, counts on completion</Badge>;
    return <Button size="sm" iconRight="arrowRight" onClick={() => course && openDrawer("course", course.id)}>View course</Button>;
  }
  if (/^finish/i.test(a.label)) {
    return <Button size="sm" icon="send" onClick={() => completeIndexAction(a.id, "pending", c.id, "Reminder sent to the issuer: " + lowerFirst(a.label))}>Remind issuer</Button>;
  }
  return (
    <>
      <Button size="sm" variant={kind === "evidence" ? "primary" : "secondary"} icon={kind === "reference" ? "userPlus" : kind === "verify" ? "upload" : "plus"} onClick={() => setOpen(true)}>
        {kind === "reference" ? "Request reference" : kind === "verify" ? "Send for checking" : "Add evidence"}
      </Button>
      {open && <ActionModal a={a} c={c} onClose={() => setOpen(false)} />}
    </>
  );
}

const RELATIONS = ["Line manager", "Client", "Board member", "Colleague"];

function ActionModal({ a, c, onClose }: { a: IndexAction; c: Candidate; onClose: () => void }) {
  const kind = actionKind(a);
  const [note, setNote] = useState("");
  const [file, setFile] = useState("");
  const [referee, setReferee] = useState("");
  const [relation, setRelation] = useState(/client/i.test(a.label) ? "Client" : /board/i.test(a.label) ? "Board member" : "Line manager");
  const ok = kind === "reference" ? !!referee.trim() : !!file || !!note.trim();
  const sub = kind === "reference" ? "Recruit asks your referee to confirm your role and results. Points apply once they reply."
    : kind === "verify" ? "Recruit asks the issuer to confirm it. Points apply once they reply."
      : "This adds evidence you provide. It counts now and is shown as your own evidence, not as verified.";
  const submit = () => {
    const label = kind === "reference" ? "Reference requested from " + referee.trim() + " (" + relation.toLowerCase() + ")"
      : kind === "verify" ? "“" + a.label + "” sent for checking" : "Evidence added for “" + a.label + "”";
    patchExtra(c.id, cur => ({ evidence: { ...(cur.evidence || {}), ["action:" + a.id]: { label: a.label, note: kind === "reference" ? referee.trim() + ", " + relation.toLowerCase() : note.trim(), file: file || undefined, date: "Today", kind: "evidence" } } }));
    completeIndexAction(a.id, actionMode(a), c.id, label);
    onClose();
  };
  return (
    <Modal open onClose={onClose} title={a.label} sub={sub} width={560}
      footer={<>
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button variant="primary" icon={kind === "evidence" ? "check" : "send"} disabled={!ok} onClick={submit}>
          {kind === "reference" ? "Request reference" : kind === "verify" ? "Send for checking" : "Add evidence, +" + a.points}
        </Button>
      </>}>
      <div className="rc-col" style={{ gap: 14 }}>
        {kind === "reference" && (
          <div className="rc-grid rc-g2" style={{ gap: 12 }}>
            <Field label="Referee name"><TextInput value={referee} onChange={e => setReferee(e.target.value)} placeholder="Full name" autoFocus /></Field>
            <Field label="Relationship"><Select value={relation} onChange={setRelation} options={RELATIONS} /></Field>
          </div>
        )}
        {kind !== "reference" && (
          <Field label={kind === "evidence" ? "Your evidence" : "Note for the checker (optional)"}>
            <TextArea rows={4} value={note} onChange={e => setNote(e.target.value)} autoFocus={kind === "evidence"}
              placeholder={/budget/i.test(a.label) ? "What you own, the figures and the period it covers" : "What happened, when, and the result in figures"} />
          </Field>
        )}
        {kind !== "reference" && (
          <div className="rc-col" style={{ gap: 7 }}>
            <span style={{ fontSize: 12, fontWeight: 500, color: "var(--body)" }}>{kind === "verify" ? "Certificate or report" : "Supporting document (optional)"}</span>
            <FilePick value={file} onChange={setFile} accept=".pdf,.doc,.docx,.png,.jpg" />
          </div>
        )}
        <Note icon="info">Demo: nothing is sent and only a file name is kept. {actionMode(a) === "done" ? "The " + a.points + " points apply straight away." : "The request shows as pending; no one confirms it in the demo."}</Note>
      </div>
    </Modal>
  );
}
