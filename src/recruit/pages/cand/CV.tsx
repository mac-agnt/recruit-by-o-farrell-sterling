import { useState, type DragEvent, type ReactNode } from "react";
import { Badge, Button, Card, Chip, Grid, Label, Note, Page, Progress, Spinner, useInterval } from "../../ui";
import { Icon } from "../../icons";
import { useNav } from "../../nav";
import { advanceCv, resetCv, startCv, useRecruit } from "../../store";
import { candidate } from "../../selectors";
import { CANDIDATE_BY_ID } from "../../data";
import type { Candidate } from "../../data";
import { monthIndex, spanText, StateBadge, verificationItems, type VItem } from "./Profile";

/* Intelligent CV analysis. A scripted walk through six stages that turns a
   CV into a structured, verifiable profile. The output comes from the
   persona's prepared record: no file is read and nothing is sent anywhere. */

const STAGES = [
  { id: "experience", label: "Extracting experience", icon: "jobs" },
  { id: "skills", label: "Identifying professional skills", icon: "sparkle" },
  { id: "quals", label: "Recognising qualifications", icon: "award" },
  { id: "timeline", label: "Building career timeline", icon: "route" },
  { id: "transferable", label: "Identifying transferable skills", icon: "explorer" },
  { id: "verify", label: "Preparing verification checklist", icon: "verified" },
] as const;
type StageId = (typeof STAGES)[number]["id"];

const DEMO_NOTE = "Demo analysis from prepared structured data. No AI service or upload processing is used.";
const demoFile = (c: Candidate) => c.name.replace(/\s+/g, "_") + "_CV_2026.pdf";

export default function CV() {
  const s = useRecruit();
  const c = candidate(s, s.persona);
  const cv = s.cv;
  useInterval(() => advanceCv(STAGES.length), cv.status === "running" ? 1100 : null);
  return (
    <Page wide eyebrow="MY PROFILE" title="Intelligent CV analysis"
      sub="Turn a CV into a structured, verifiable profile: roles, skills, qualifications and a checklist of what to verify next.">
      {cv.status === "idle" && <Idle c={c} />}
      {cv.status === "running" && <Running c={c} stage={cv.stage} file={cv.fileName || demoFile(c)} source={cv.source} items={verificationItems(s, c)} />}
      {cv.status === "done" && <Done c={c} file={cv.fileName || demoFile(c)} source={cv.source} items={verificationItems(s, c)} />}
    </Page>
  );
}

/* ── idle: choose a CV ────────────────────────────────────────────────── */

function Idle({ c }: { c: Candidate }) {
  const [choice, setChoice] = useState<"demo" | "upload">("demo");
  const [local, setLocal] = useState("");
  const [over, setOver] = useState(false);
  const demo = demoFile(c);
  const pick = (name: string) => { if (name) { setLocal(name); setChoice("upload"); } };
  const onDrop = (e: DragEvent<HTMLLabelElement>) => { e.preventDefault(); setOver(false); pick(e.dataTransfer.files?.[0]?.name || ""); };
  const start = () => (choice === "upload" && local ? startCv("upload", local) : startCv("demo", demo));
  return (
    <>
      <Note icon="info" tone="accent">{DEMO_NOTE} If you choose a file from this device, only its name is used. Its contents are never read, uploaded or sent.</Note>
      <Grid cols="rc-g-3-2">
        <Card pad={22} title="Choose a CV" sub="Use the prepared demo CV, or pick a file to see the flow with your own file name">
          <div className="rc-grid rc-g2" style={{ gap: 12 }}>
            <button onClick={() => setChoice("demo")} className="rc-card rc-click rc-focus"
              style={{ textAlign: "left", padding: 18, borderRadius: "var(--r-md, 16px)", cursor: "pointer", color: "inherit",
                background: choice === "demo" ? "var(--accent-faint)" : "var(--surface-2)", border: "1px solid " + (choice === "demo" ? "var(--accent-line)" : "var(--border)") }}>
              <div className="rc-row" style={{ gap: 10 }}>
                <span style={{ width: 38, height: 38, borderRadius: 12, background: "var(--accent-soft)", color: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}><Icon name="file" size={18} /></span>
                <div className="rc-grow" style={{ minWidth: 0 }}>
                  <div className="rc-ellipsis" style={{ fontSize: 13, fontWeight: 600 }}>{demo}</div>
                  <div style={{ fontSize: 11.5, color: "var(--dim)", marginTop: 3 }}>Prepared demo CV</div>
                </div>
                {choice === "demo" && <span style={{ color: "var(--accent)" }}><Icon name="check" size={16} stroke={2.4} /></span>}
              </div>
              <div style={{ fontSize: 12, color: "var(--dim)", marginTop: 12, lineHeight: 1.5 }}>{c.name}, {c.title}. {c.years} years across {CANDIDATE_BY_ID[c.id].experience.length} roles.</div>
            </button>

            <label htmlFor="rc-cv-file" onDragOver={e => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)} onDrop={onDrop}
              className="rc-card rc-click" style={{ display: "block", padding: 18, borderRadius: "var(--r-md, 16px)", cursor: "pointer",
                background: choice === "upload" || over ? "var(--accent-faint)" : "transparent", border: "1.5px dashed " + (choice === "upload" || over ? "var(--accent-line)" : "var(--border-strong)") }}>
              <div className="rc-row" style={{ gap: 10 }}>
                <span style={{ width: 38, height: 38, borderRadius: 12, background: "var(--surface-2)", color: "var(--dim)", display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}><Icon name="upload" size={18} /></span>
                <div className="rc-grow" style={{ minWidth: 0 }}>
                  <div className="rc-ellipsis" style={{ fontSize: 13, fontWeight: 600 }}>{local || "Choose a file from this device"}</div>
                  <div style={{ fontSize: 11.5, color: "var(--dim)", marginTop: 3 }}>{local ? "Only the name is used" : "PDF or Word, or drop it here"}</div>
                </div>
                {choice === "upload" && local && <span style={{ color: "var(--accent)" }}><Icon name="check" size={16} stroke={2.4} /></span>}
              </div>
              <div style={{ fontSize: 12, color: "var(--dim)", marginTop: 12, lineHeight: 1.5 }}>The demo matches the name to {c.name.split(" ")[0]}'s prepared profile data. The file itself stays on this device, unread.</div>
              <input id="rc-cv-file" type="file" accept=".pdf,.doc,.docx" style={{ display: "none" }}
                onChange={e => { pick(e.target.files?.[0]?.name || ""); e.target.value = ""; }} />
            </label>
          </div>
          <div className="rc-row rc-wrap" style={{ gap: 10, marginTop: 18 }}>
            <Button variant="primary" size="lg" icon="sparkle" onClick={start}>Analyse {choice === "upload" && local ? "my file" : "the demo CV"}</Button>
            <span style={{ fontSize: 12, color: "var(--faint)" }}>Takes about seven seconds</span>
          </div>
        </Card>

        <Card title="What the analysis does" sub="Six stages, each one adding to your profile">
          <div className="rc-col" style={{ gap: 4 }}>
            {STAGES.map((st, i) => (
              <div key={st.id} className="rc-row" style={{ gap: 11, padding: "8px 0", borderTop: i ? "1px solid var(--border)" : 0 }}>
                <span style={{ width: 28, height: 28, borderRadius: 9, background: "var(--surface-2)", color: "var(--dim)", display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}><Icon name={st.icon} size={14} /></span>
                <div className="rc-grow">
                  <div style={{ fontSize: 13, color: "var(--ink)" }}>{st.label}</div>
                  <div style={{ fontSize: 11.5, color: "var(--faint)", marginTop: 2 }}>{STAGE_HINT[st.id]}</div>
                </div>
                <span style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--faint)" }}>{i + 1}/6</span>
              </div>
            ))}
          </div>
        </Card>
      </Grid>
    </>
  );
}

const STAGE_HINT: Record<StageId, string> = {
  experience: "Roles, employers, dates and scope",
  skills: "Matched to Recruit's hospitality skills library",
  quals: "Degrees, diplomas and certificates with issuers",
  timeline: "Your moves, in order, with time in each role",
  transferable: "Skills that carry into other roles and sectors",
  verify: "What to confirm first, and with whom",
};

/* ── running: stages and live output ──────────────────────────────────── */

function Running({ c, stage, file, source, items }: { c: Candidate; stage: number; file: string; source: string | null; items: VItem[] }) {
  return (
    <Grid cols="rc-g-1-2">
      <Card pad={22}>
        <div className="rc-row" style={{ gap: 12 }}>
          <span style={{ width: 42, height: 42, borderRadius: 13, background: "var(--accent-soft)", color: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}><Icon name="file" size={19} /></span>
          <div className="rc-grow" style={{ minWidth: 0 }}>
            <div className="rc-ellipsis" style={{ fontSize: 14, fontWeight: 600 }}>{file}</div>
            <div style={{ fontSize: 12, color: "var(--dim)", marginTop: 3 }}>{source === "upload" ? "Your file name, matched to prepared data" : "Prepared demo CV"}</div>
          </div>
        </div>
        <div className="rc-row" style={{ marginTop: 18, fontSize: 12.5 }}>
          <span className="rc-grow" style={{ color: "var(--body)" }}>Stage {Math.min(stage + 1, STAGES.length)} of {STAGES.length}</span>
          <b style={{ fontWeight: 600 }}>{Math.round((stage / STAGES.length) * 100)}%</b>
        </div>
        <Progress value={stage} max={STAGES.length} style={{ marginTop: 8 }} />
        <div className="rc-col" style={{ gap: 2, marginTop: 16 }}>
          {STAGES.map((st, i) => {
            const state = i < stage ? "done" : i === stage ? "now" : "next";
            return (
              <div key={st.id} className="rc-row" style={{ gap: 11, padding: "9px 0" }}>
                <span style={{ width: 26, height: 26, borderRadius: 9, flex: "none", display: "flex", alignItems: "center", justifyContent: "center",
                  background: state === "done" ? "var(--teal-soft, var(--ok-soft))" : state === "now" ? "var(--accent-soft)" : "var(--surface-2)",
                  color: state === "done" ? "var(--teal, var(--ok))" : state === "now" ? "var(--accent)" : "var(--faint)", transition: "background .3s var(--ease)" }}>
                  {state === "done" ? <Icon name="check" size={13} stroke={2.6} /> : state === "now" ? <Spinner size={12} /> : <Icon name={st.icon} size={13} />}
                </span>
                <span className="rc-grow" style={{ fontSize: 13, color: state === "next" ? "var(--faint)" : "var(--ink)", fontWeight: state === "now" ? 600 : 400 }}>{st.label}</span>
                {state === "done" && <span style={{ fontSize: 11, color: "var(--dim)" }}>{stageSummary(st.id, c, items)}</span>}
              </div>
            );
          })}
        </div>
        <Note style={{ marginTop: 14 }}>{DEMO_NOTE}</Note>
        <div className="rc-row" style={{ justifyContent: "flex-end", marginTop: 12 }}>
          <Button size="sm" variant="ghost" icon="x" onClick={resetCv}>Cancel</Button>
        </div>
      </Card>

      <Card title="Extracted so far" sub="Each stage adds to your structured profile as it finishes"
        action={<Badge tone="accent" icon="sparkle">Analysing</Badge>}>
        <div className="rc-col" style={{ gap: 12 }}>
          {STAGES.slice(0, stage).map(st => (
            <div key={st.id} className="rc-rise"><OutputBlock id={st.id} c={c} items={items} /></div>
          ))}
          {stage < STAGES.length && (
            <div style={{ padding: 16, borderRadius: "var(--r-md, 16px)", border: "1px dashed var(--border-strong)" }}>
              <div className="rc-row" style={{ gap: 9, fontSize: 12.5, color: "var(--dim)" }}><Spinner size={12} />{STAGES[stage].label}</div>
              {[82, 64, 74].map((w, i) => (
                <div key={i} style={{ height: 8, width: w + "%", borderRadius: 999, background: "var(--track)", marginTop: 12, animation: "rcPulse 1.2s ease-in-out " + i * 0.15 + "s infinite" }} />
              ))}
            </div>
          )}
        </div>
      </Card>
    </Grid>
  );
}

function stageSummary(id: StageId, c: Candidate, items: VItem[]) {
  const base = CANDIDATE_BY_ID[c.id];
  if (id === "experience") return base.experience.length + " roles";
  if (id === "skills") return base.skills.length + " skills";
  if (id === "quals") return base.qualifications.length + " found";
  if (id === "timeline") return c.years + " years";
  if (id === "transferable") return c.transferable.length + " found";
  return items.filter(i => i.state !== "verified").length + " to check";
}

function OutputBlock({ id, c, items }: { id: StageId; c: Candidate; items: VItem[] }) {
  const base = CANDIDATE_BY_ID[c.id];
  const st = STAGES.find(x => x.id === id)!;
  let body: ReactNode = null;
  if (id === "experience") {
    body = (
      <div className="rc-col" style={{ gap: 8 }}>
        {base.experience.map(e => (
          <div key={e.role + e.from} className="rc-row" style={{ gap: 10, alignItems: "baseline" }}>
            <span className="rc-grow" style={{ fontSize: 12.5, color: "var(--ink)" }}>{e.role} <span style={{ color: "var(--dim)" }}>· {e.org}</span></span>
            <span style={{ fontFamily: "var(--mono)", fontSize: 10.5, color: "var(--faint)", whiteSpace: "nowrap" }}>{e.from} to {e.to}</span>
          </div>
        ))}
      </div>
    );
  } else if (id === "skills") {
    body = <div className="rc-row rc-wrap" style={{ gap: 6 }}>{base.skills.map(k => <Chip key={k.name}>{k.name}</Chip>)}</div>;
  } else if (id === "quals") {
    body = (
      <div className="rc-col" style={{ gap: 8 }}>
        {base.qualifications.map(q => (
          <div key={q.name} style={{ fontSize: 12.5, color: "var(--ink)" }}>{q.name} <span style={{ color: "var(--dim)" }}>· {q.issuer}, {q.year}</span></div>
        ))}
      </div>
    );
  } else if (id === "timeline") {
    body = <CareerLine c={c} />;
  } else if (id === "transferable") {
    body = <div className="rc-row rc-wrap" style={{ gap: 6 }}>{c.transferable.map(t => <Chip key={t} tone="accent">{t}</Chip>)}</div>;
  } else {
    const todo = items.filter(i => i.state !== "verified");
    body = (
      <div className="rc-col" style={{ gap: 7 }}>
        {todo.map(i => (
          <div key={i.key} className="rc-row" style={{ gap: 10 }}>
            <span className="rc-grow rc-ellipsis" style={{ fontSize: 12.5, color: "var(--ink)" }}>{i.name} <span style={{ color: "var(--faint)" }}>· {i.group.toLowerCase()}</span></span>
            <StateBadge state={i.state} />
          </div>
        ))}
        {!todo.length && <div style={{ fontSize: 12.5, color: "var(--dim)" }}>Everything on this CV is already verified.</div>}
      </div>
    );
  }
  return (
    <div style={{ padding: 16, borderRadius: "var(--r-md, 16px)", background: "var(--surface-2)", border: "1px solid var(--border)" }}>
      <div className="rc-row" style={{ gap: 9, marginBottom: 12 }}>
        <span style={{ color: "var(--teal, var(--ok))" }}><Icon name="check" size={13} stroke={2.6} /></span>
        <span className="rc-grow" style={{ fontSize: 12.5, fontWeight: 600 }}>{st.label}</span>
        <span style={{ fontSize: 11.5, color: "var(--dim)" }}>{stageSummary(id, c, items)}</span>
      </div>
      {body}
    </div>
  );
}

/** Oldest role first, with time in each. */
function CareerLine({ c }: { c: Candidate }) {
  const roles = CANDIDATE_BY_ID[c.id].experience.slice().sort((a, b) => (monthIndex(a.from) ?? 0) - (monthIndex(b.from) ?? 0));
  return (
    <div className="rc-row rc-wrap" style={{ gap: 0, alignItems: "stretch" }}>
      {roles.map((e, i) => (
        <div key={e.role + e.from} style={{ flex: "1 1 120px", minWidth: 120, position: "relative", paddingRight: 10 }}>
          <div className="rc-row" style={{ gap: 0 }}>
            <span style={{ width: 10, height: 10, borderRadius: 3, background: i === roles.length - 1 ? "var(--accent)" : "var(--teal, #16B8A6)", flex: "none" }} />
            {i < roles.length - 1 && <span style={{ flex: 1, height: 2, background: "var(--border-strong)", marginLeft: 6 }} />}
          </div>
          <div style={{ fontFamily: "var(--mono)", fontSize: 10.5, color: "var(--faint)", marginTop: 8 }}>{(e.from.match(/\d{4}/) || [""])[0]}</div>
          <div style={{ fontSize: 12.5, color: "var(--ink)", marginTop: 3, lineHeight: 1.35 }}>{e.role}</div>
          <div style={{ fontSize: 11, color: "var(--dim)", marginTop: 3 }}>{spanText(e.from, e.to)}</div>
        </div>
      ))}
    </div>
  );
}

/* ── done: the structured profile ─────────────────────────────────────── */

function Done({ c, file, source, items }: { c: Candidate; file: string; source: string | null; items: VItem[] }) {
  const nav = useNav();
  const base = CANDIDATE_BY_ID[c.id];
  const todo = items.filter(i => i.state !== "verified");
  const kpis = [
    { label: "Roles", value: base.experience.length, icon: "jobs" },
    { label: "Skills", value: base.skills.length, icon: "sparkle" },
    { label: "Qualifications", value: base.qualifications.length, icon: "award" },
    { label: "Transferable skills", value: c.transferable.length, icon: "explorer" },
    { label: "To verify", value: todo.length, icon: "verified" },
  ];
  const open = () => { resetCv(); nav.go("cand.profile", "profile"); };
  return (
    <div className="rc-col rc-rise" style={{ gap: 14 }}>
      <Card pad={24} style={{ background: "linear-gradient(140deg, color-mix(in oklab, #16B8A6 14%, var(--surface)) 0%, color-mix(in oklab, #4263EB 8%, var(--surface)) 60%, var(--surface) 100%)" }}>
        <div className="rc-row rc-wrap" style={{ gap: 18, alignItems: "flex-start" }}>
          <span style={{ width: 52, height: 52, borderRadius: 16, background: "var(--teal-soft, var(--ok-soft))", color: "var(--teal, var(--ok))", display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}><Icon name="check" size={24} stroke={2.4} /></span>
          <div className="rc-grow" style={{ minWidth: 260 }}>
            <Label>Analysis complete</Label>
            <div style={{ fontSize: 26, fontWeight: 600, letterSpacing: "-.8px", marginTop: 6 }}>Your profile is structured.</div>
            <div style={{ fontSize: 13, color: "var(--dim)", marginTop: 6, lineHeight: 1.55 }}>
              {file} {source === "upload" ? "(file name only)" : ""} became {base.experience.length} roles, {base.skills.length} skills and a checklist of {todo.length} items to verify.
            </div>
          </div>
          <div className="rc-row rc-wrap" style={{ gap: 8 }}>
            <Button variant="ghost" icon="refresh" onClick={resetCv}>Analyse another CV</Button>
            <Button variant="primary" size="lg" iconRight="arrowRight" onClick={open}>Open my profile</Button>
          </div>
        </div>
        <div className="rc-grid rc-g5" style={{ gap: 10, marginTop: 20 }}>
          {kpis.map((k, i) => (
            <div key={k.label} className="rc-rise" style={{ animationDelay: i * 70 + "ms", padding: "12px 14px", borderRadius: 14, background: "var(--surface-2)", border: "1px solid var(--border)" }}>
              <div className="rc-row" style={{ gap: 6, fontSize: 11.5, color: "var(--dim)" }}><Icon name={k.icon} size={13} />{k.label}</div>
              <div style={{ fontSize: 24, fontWeight: 600, letterSpacing: "-.8px", marginTop: 6 }}>{k.value}</div>
            </div>
          ))}
        </div>
      </Card>

      <Grid cols="rc-g-2-1">
        <Card title="Structured profile summary" sub={c.name + " · " + c.title + " · " + c.location}>
          <p style={{ margin: "0 0 16px", fontSize: 13.5, lineHeight: 1.65, color: "var(--body)" }}>{c.summary}</p>
          <Label>Career timeline</Label>
          <div style={{ marginTop: 12 }}><CareerLine c={c} /></div>
          <div className="rc-grid rc-g2" style={{ gap: 18, marginTop: 20 }}>
            <div>
              <Label>Top skills</Label>
              <div className="rc-row rc-wrap" style={{ gap: 6, marginTop: 10 }}>
                {base.skills.slice().sort((a, b) => b.level - a.level).slice(0, 6).map(k => <Chip key={k.name}>{k.name}</Chip>)}
              </div>
            </div>
            <div>
              <Label>Qualifications</Label>
              <div className="rc-col" style={{ gap: 6, marginTop: 10 }}>
                {base.qualifications.map(q => <div key={q.name} className="rc-ellipsis" style={{ fontSize: 12.5, color: "var(--body)" }}>{q.name} <span style={{ color: "var(--faint)" }}>{q.year}</span></div>)}
              </div>
            </div>
          </div>
          <div style={{ marginTop: 18 }}>
            <Label>Transferable skills</Label>
            <div className="rc-row rc-wrap" style={{ gap: 6, marginTop: 10 }}>{c.transferable.map(t => <Chip key={t} tone="accent">{t}</Chip>)}</div>
          </div>
        </Card>

        <div className="rc-col" style={{ gap: 14 }}>
          <Card title="Verification checklist" sub={todo.length ? todo.length + " items to confirm, most valuable first" : "Nothing left to confirm"}
            action={<Button size="sm" variant="ghost" iconRight="arrowRight" onClick={() => { resetCv(); nav.go("cand.profile", "verification"); }}>Verify</Button>}>
            <div className="rc-col" style={{ gap: 8 }}>
              {todo.slice(0, 6).map(i => (
                <div key={i.key} className="rc-row" style={{ gap: 10 }}>
                  <span className="rc-grow rc-ellipsis" style={{ fontSize: 12.5 }}>{i.name}</span>
                  <StateBadge state={i.state} />
                </div>
              ))}
            </div>
          </Card>
          <Card title="Next steps">
            <NextStep icon="profile" title="Review and edit your profile" body="Check the wording; every section can be edited." onClick={open} />
            <NextStep icon="verified" title="Verify what matters most" body="Verified evidence lifts your Recruit Index." onClick={() => { resetCv(); nav.go("cand.profile", "verification"); }} />
            <NextStep icon="value" title="See your market value" body="Your estimated range, built from this profile." onClick={() => { resetCv(); nav.go("cand.value", "value"); }} last />
          </Card>
        </div>
      </Grid>
      <Note>{DEMO_NOTE}</Note>
    </div>
  );
}

function NextStep({ icon, title, body, onClick, last }: { icon: string; title: string; body: string; onClick: () => void; last?: boolean }) {
  return (
    <div className="rc-rowhover" onClick={onClick} style={{ display: "flex", gap: 11, alignItems: "center", padding: "10px 8px", margin: "0 -8px", borderRadius: 10, borderBottom: last ? 0 : "1px solid var(--border)" }}>
      <span style={{ width: 28, height: 28, borderRadius: 9, background: "var(--surface-2)", color: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}><Icon name={icon} size={14} /></span>
      <div className="rc-grow">
        <div style={{ fontSize: 13, color: "var(--ink)" }}>{title}</div>
        <div style={{ fontSize: 11.5, color: "var(--dim)", marginTop: 2 }}>{body}</div>
      </div>
      <Icon name="chevronRight" size={14} style={{ color: "var(--faint)" }} />
    </div>
  );
}
