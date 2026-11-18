import { useState, type ReactNode } from "react";
import { Avatar, Badge, Button, Chip, Drawer, Empty, KV, Label, Note, toneColor } from "../ui";
import { Icon } from "../icons";
import { useNav, type Role } from "../nav";
import { openDrawer, respondIntroduction, setActiveVacancy, toggleSavedJob, useRecruit, vacancyById } from "../store";
import { candidate, displayName } from "../selectors";
import { CAREER_PATHS, EMPLOYER_BY_ID, STAGES } from "../data";
import type { Vacancy } from "../data/types";
import { alignmentTone, matchScore } from "../match";
import { eur, num, plural } from "../format";
import { ApplyModal, OFFER_STATUS, Reasons, VISIBLE_STAGES, activeApplication, noticeFit, postedLabel, savedStyle, type Tone } from "./opportunityKit";

/* The one vacancy detail view, opened from candidate, employer and HQ pages.
   Candidates see their own match and can save or apply; the employer that
   owns the role sees its pipeline; HQ gets a read-only operating view. */

const STATUS_TONE: Record<Vacancy["status"], Tone> = { open: "ok", paused: "warn", filled: "accent", draft: "neutral" };
const STATUS_LABEL: Record<Vacancy["status"], string> = { open: "Open", paused: "Paused", filled: "Filled", draft: "Draft" };

function Block({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <div style={{ marginTop: 22 }}>
      <div className="rc-row" style={{ marginBottom: 10 }}><Label style={{ flex: 1 }}>{title}</Label>{action}</div>
      {children}
    </div>
  );
}

export default function VacancyDrawer({ id, onClose, ctx }: { id: string; onClose: () => void; ctx?: Record<string, string> }) {
  const s = useRecruit();
  const nav = useNav();
  const [applyOpen, setApplyOpen] = useState(false);
  const role = (ctx?.role as Role | undefined) || nav.role;
  const v = vacancyById(id, s);

  if (!v) {
    return (
      <Drawer open onClose={onClose} eyebrow="VACANCY" title="Vacancy not found">
        <Empty icon="vacancies" title="This vacancy is no longer available" body="The employer may have removed it. Nothing else has changed." />
      </Drawer>
    );
  }

  const emp = EMPLOYER_BY_ID[v.employerId];
  const isCand = role === "candidate";
  const isEmp = role === "employer";
  const ownRole = isEmp && v.employerId === s.employerId;
  const isHq = role === "hq";
  const showPipeline = ownRole || isHq;

  const c = candidate(s, s.persona);
  const m = matchScore(c, v);
  const saved = (s.savedJobs[c.id] || []).includes(v.id);
  const app = activeApplication(s, c.id, v.id);
  const myOffer = s.offers.find(o => o.candidateId === c.id && o.vacancyId === v.id && o.visibleToCandidate);
  const intro = s.intros.find(i => i.candidateId === c.id && i.vacancyId === v.id && i.status === "pending");
  const proc = s.pipeline.find(p => p.candidateId === c.id && p.vacancyId === v.id && VISIBLE_STAGES.includes(p.stage));
  const path = (CAREER_PATHS[c.id] || []).find(p => p.vacancyId === v.id);
  const fit = noticeFit(c.noticeWeeks, v.start);
  const open = v.status === "open";

  const entries = s.pipeline.filter(p => p.vacancyId === v.id);
  const offers = s.offers.filter(o => o.vacancyId === v.id);
  const liveApps = s.applications.filter(a => a.vacancyId === v.id && a.status !== "withdrawn");
  const matched = new Set(m.matchedSkills.map(x => x.toLowerCase()));
  const close = (fn: () => void) => () => { fn(); onClose(); };

  const description = [emp?.sector, emp?.location, emp ? num(emp.employees) + " employees" : null, emp?.hotels ? plural(emp.hotels, "hotel") : null].filter(Boolean).join(" · ");

  let footer: ReactNode = null;
  if (isCand) {
    footer = (
      <>
        <Button icon="bookmark" onClick={() => toggleSavedJob(c.id, v.id)}
          style={saved ? savedStyle : undefined}>{saved ? "Saved" : "Save job"}</Button>
        <span className="rc-grow" />
        {myOffer ? <Button variant="primary" icon="offers" onClick={() => openDrawer("offer", myOffer.id, { role: "candidate" })}>View your offer</Button>
          : app ? <><Badge tone="teal" icon="check" style={{ height: 34, padding: "0 13px", fontSize: 12.5 }}>{app.date === "Today" ? "Applied today" : "Applied " + app.date}</Badge>
            <Button onClick={close(() => nav.go("cand.jobs", "applications"))}>Track application</Button></>
          : proc ? <Badge tone="accent" icon="users" style={{ height: 34, padding: "0 13px", fontSize: 12.5 }}>In process with {emp?.short}</Badge>
          : open ? <Button variant="primary" icon="send" onClick={() => setApplyOpen(true)}>Apply now</Button>
          : <Badge tone="neutral" style={{ height: 34, padding: "0 13px" }}>No longer accepting applications</Badge>}
      </>
    );
  } else if (ownRole) {
    footer = (
      <>
        <Button icon="hiring" onClick={close(() => { setActiveVacancy(v.id); nav.go("emp.hiring", "shortlists"); })}>Open pipeline</Button>
        <span className="rc-grow" />
        <Button variant="primary" icon="search" onClick={close(() => { setActiveVacancy(v.id); nav.go("emp.talent", "discover"); })}>Find matching talent</Button>
      </>
    );
  } else if (isHq) {
    footer = (
      <>
        <span style={{ fontSize: 12, color: "var(--faint)" }}>Read-only in Recruit HQ</span>
        <span className="rc-grow" />
        <Button icon="jobs" onClick={close(() => nav.go("hq.roles", "vacancies"))}>All vacancies</Button>
      </>
    );
  } else if (role === "public") {
    footer = (
      <>
        <span style={{ fontSize: 12, color: "var(--faint)" }}>Preview of a live role (demo data)</span>
        <span className="rc-grow" />
        <Button variant="primary" icon="candidate" onClick={close(() => nav.switchRole("candidate"))}>Explore as a candidate</Button>
      </>
    );
  }

  return (
    <>
      <Drawer open onClose={onClose} width={640} eyebrow="VACANCY" title={v.title}
        badge={<Badge tone={STATUS_TONE[v.status]} dot>{STATUS_LABEL[v.status]}</Badge>}
        sub={(emp?.name || "Employer") + ", " + v.location} footer={footer}>

        {/* Employer */}
        <div className="rc-row" style={{ gap: 12, padding: "13px 14px", borderRadius: "var(--r-sm, 12px)", background: "var(--surface-2)", border: "1px solid var(--border)" }}>
          <Avatar initials={emp?.initials || "?"} tint={emp?.tint} size={40} square />
          <div className="rc-grow">
            <div className="rc-row rc-wrap" style={{ gap: 8 }}>
              <span style={{ fontSize: 14, fontWeight: 600 }}>{emp?.name}</span>
              {emp?.verified && <Badge tone="teal" icon="verified">Verified employer</Badge>}
            </div>
            <div style={{ fontSize: 12, color: "var(--dim)", marginTop: 4 }}>{description}</div>
            {isHq && emp && <div style={{ fontSize: 12, color: "var(--faint)", marginTop: 4 }}>Account note: {emp.note}</div>}
          </div>
          {emp && <Button size="sm" variant="ghost" iconRight="arrowRight" onClick={() => openDrawer("employer", emp.id, ctx)}>Employer</Button>}
        </div>

        {/* The candidate's own match */}
        {isCand && (
          <div style={{ marginTop: 16, padding: "16px 16px 14px", borderRadius: "var(--r-sm, 12px)", border: "1px solid var(--accent-line)",
            background: "linear-gradient(140deg, color-mix(in oklab, #4263EB 14%, var(--surface)) 0%, var(--surface) 70%)" }}>
            <div className="rc-row" style={{ alignItems: "flex-start", gap: 14 }}>
              <div className="rc-grow">
                <Label>Your match</Label>
                <div className="rc-row" style={{ alignItems: "baseline", gap: 8, marginTop: 6 }}>
                  <span style={{ fontSize: 34, fontWeight: 600, letterSpacing: "-1.3px", color: toneColor(alignmentTone(m.score)) }}>{m.score}%</span>
                  <span style={{ fontSize: 12.5, color: "var(--dim)" }}>alignment for {c.name.split(" ")[0]}</span>
                </div>
              </div>
              <Badge tone={m.salaryFit === "within" ? "teal" : "warn"} icon="euro">{m.salaryFit === "within" ? "Salary fits your expectation" : m.salaryFit === "above" ? "Expectation above budget" : "Budget above your level"}</Badge>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16, marginTop: 14 }}>
              <Reasons title="Why it matches" icon="check" tone="teal" items={m.reasons} />
              <Reasons title="Worth knowing" icon="info" tone="warn" items={m.considerations.length ? m.considerations : ["Nothing flagged for this role"]} />
            </div>
            {path && (
              <button className="rc-rowhover rc-focus" onClick={close(() => nav.go("cand.explorer", "paths"))}
                style={{ marginTop: 14, width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "9px 11px", borderRadius: 10, border: "1px solid var(--border)", background: "var(--surface-2)", color: "var(--body)", fontSize: 12.5, cursor: "pointer", textAlign: "left" }}>
                <Icon name="explorer" size={14} style={{ color: "var(--accent)" }} />
                <span className="rc-grow">Part of your <b style={{ fontWeight: 600, color: "var(--ink)" }}>{path.title}</b> career path, {path.alignment}% transferable-skills alignment</span>
                <Icon name="arrowRight" size={13} />
              </button>
            )}
            <div style={{ fontSize: 11, color: "var(--faint)", marginTop: 12 }}>Alignment is decision support from your profile evidence. It never filters you out; the employer decides.</div>
          </div>
        )}

        {isCand && intro && (
          <Note tone="accent" icon="users" style={{ marginTop: 12 }}>
            <div>{emp?.short} has asked for an introduction for this role. Your contact details stay hidden unless you agree.</div>
            <div className="rc-row" style={{ gap: 8, marginTop: 9 }}>
              <Button size="sm" variant="primary" icon="check" onClick={() => respondIntroduction(intro.id, "accepted")}>Share my details</Button>
              <Button size="sm" variant="ghost" onClick={() => respondIntroduction(intro.id, "declined")}>Decline</Button>
            </div>
          </Note>
        )}

        <Block title="The role">
          <KV cols={2} items={[
            { k: "Salary", v: eur(v.salary[0]) + " to " + eur(v.salary[1]) },
            { k: "Location", v: v.location.includes(v.region) ? v.location : v.location + ", " + v.region },
            { k: "Contract", v: v.type },
            { k: "Level", v: v.seniority === v.department ? v.seniority : v.seniority + ", " + v.department },
            { k: "Start", v: isCand ? <span>{v.start} <span style={{ color: toneColor(fit.tone), fontSize: 11.5 }}>({fit.label.toLowerCase()})</span></span> : v.start },
            { k: "Experience", v: v.minYears ? v.minYears + "+ years" : "Open" },
          ]} />
          <div style={{ fontSize: 13, color: "var(--body)", lineHeight: 1.6, marginTop: 14 }}>{v.summary}</div>
          {v.responsibilities.length > 0 && (
            <div className="rc-col" style={{ gap: 7, marginTop: 12 }}>
              {v.responsibilities.map(r => (
                <div key={r} className="rc-row" style={{ alignItems: "flex-start", gap: 9, fontSize: 12.5, color: "var(--body)", lineHeight: 1.5 }}>
                  <span style={{ width: 5, height: 5, borderRadius: 2, background: "var(--accent)", marginTop: 7, flex: "none" }} />{r}
                </div>
              ))}
            </div>
          )}
        </Block>

        <Block title="Skills and qualifications" action={isCand ? <span style={{ fontSize: 11.5, color: "var(--dim)" }}>{m.matchedSkills.length} on your profile</span> : undefined}>
          <div style={{ fontSize: 12, color: "var(--dim)", marginBottom: 8 }}>Required</div>
          <div className="rc-row rc-wrap" style={{ gap: 7 }}>
            {v.required.map(r => {
              const has = isCand && matched.has(r.toLowerCase());
              return <Chip key={r} tone={has ? "teal" : undefined}>{has && <Icon name="check" size={11} stroke={2.6} />}{r}</Chip>;
            })}
          </div>
          {v.preferred.length > 0 && <>
            <div style={{ fontSize: 12, color: "var(--dim)", margin: "14px 0 8px" }}>Preferred</div>
            <div className="rc-row rc-wrap" style={{ gap: 7 }}>
              {v.preferred.map(r => {
                const has = isCand && matched.has(r.toLowerCase());
                return <Chip key={r} tone={has ? "teal" : undefined} style={{ opacity: has ? 1 : 0.85 }}>{has && <Icon name="check" size={11} stroke={2.6} />}{r}</Chip>;
              })}
            </div>
          </>}
          {v.qualifications.length > 0 && <>
            <div style={{ fontSize: 12, color: "var(--dim)", margin: "14px 0 8px" }}>Qualifications</div>
            <div className="rc-row rc-wrap" style={{ gap: 7 }}>{v.qualifications.map(q => <Chip key={q}><Icon name="award" size={12} />{q}</Chip>)}</div>
          </>}
        </Block>

        <Block title="Marketplace">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 10 }}>
            <MiniFigure label="Relevant profiles" value={num(v.marketMatches)} />
            <MiniFigure label="Applicants" value={num(Math.max(v.applicants, liveApps.length))} />
            <MiniFigure label="Listed" value={v.postedDays <= 0 ? "Today" : v.postedDays === 1 ? "Yesterday" : v.postedDays + " days ago"} hint={postedLabel(v.postedDays)} />
          </div>
          {isCand && <div style={{ fontSize: 11.5, color: "var(--faint)", marginTop: 8 }}>Other applicants are never shown to you, and your application is never shown to them.</div>}
        </Block>

        {showPipeline && (
          <Block title="Hiring pipeline" action={<span style={{ fontSize: 11.5, color: "var(--dim)" }}>{plural(entries.length, "person", "people")} in process</span>}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 10 }}>
              {STAGES.map(st => <MiniFigure key={st.id} label={st.label} value={String(entries.filter(e => e.stage === st.id).length)} hint={st.hint} />)}
            </div>
            {offers.length > 0 && (
              <div className="rc-col" style={{ gap: 8, marginTop: 14 }}>
                {offers.map(o => {
                  const who = candidate(s, o.candidateId);
                  const shown = isHq ? who.name : displayName(s, s.employerId, who);
                  return (
                    <button key={o.id} className="rc-rowhover rc-focus" onClick={() => openDrawer("offer", o.id, ctx)}
                      style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 10, border: "1px solid var(--border)", background: "var(--surface-2)", color: "var(--body)", cursor: "pointer", textAlign: "left", fontSize: 12.5 }}>
                      <Icon name="offers" size={14} style={{ color: "var(--accent)" }} />
                      <span className="rc-grow">Offer to {shown}: {eur(o.salary)}</span>
                      {o.contingency && <Badge tone="warn">Contingency</Badge>}
                      <Badge tone={OFFER_STATUS[o.status].tone}>{OFFER_STATUS[o.status].label}</Badge>
                    </button>
                  );
                })}
              </div>
            )}
            {isHq && <div style={{ fontSize: 11.5, color: "var(--faint)", marginTop: 10 }}>HQ view is read-only. Pipeline changes are made by the employer.</div>}
          </Block>
        )}

        {isEmp && !ownRole && (
          <Note icon="lock" style={{ marginTop: 18 }}>This role belongs to {emp?.name}. Its pipeline and offers are private to them.</Note>
        )}
      </Drawer>
      {isCand && <ApplyModal open={applyOpen} onClose={() => setApplyOpen(false)} vacancyId={v.id} />}
    </>
  );
}

function MiniFigure({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div title={hint} style={{ padding: "11px 13px", borderRadius: "var(--r-sm, 12px)", background: "var(--surface-2)", border: "1px solid var(--border)", minWidth: 0 }}>
      <div className="rc-ellipsis" style={{ fontSize: 11, color: "var(--faint)" }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 600, letterSpacing: "-.5px", marginTop: 5 }}>{value}</div>
    </div>
  );
}
