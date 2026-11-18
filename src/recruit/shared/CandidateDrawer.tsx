import { useState, type ReactNode } from "react";
import { Badge, Button, Drawer, Empty, Label, Note, Progress, Select, VerifyBadge } from "../ui";
import { SERIES_COLORS, StackBar } from "../charts";
import { Icon } from "../icons";
import { useNav } from "../nav";
import { introFor, pipelineFor, requestIntroduction, useRecruit, vacancyById, visibilityOf, type RecruitState } from "../store";
import { candidate } from "../selectors";
import { CANDIDATE_BY_ID, EMPLOYER_BY_ID, INDEX_LABELS, INDEX_MAX, VERIFICATION_QUEUE, type Candidate, type Vacancy } from "../data";
import { matchScore, type Match } from "../match";
import { eur, num } from "../format";
import {
  CompareButton, PersonAvatar, SaveButton, ScoreRing, ShortlistButton, SkillTag, StagePill, contextVacancy, identity, interviewQuestions, kRange,
  lowerWhen, noticeText, openRoles, requiredCoverage, roleName,
} from "./talentKit";

/* The shared professional profile. Employers see what consent allows: an
   anonymous profile stays anonymous, the current employer stays described
   rather than named, and contact details unlock only after an introduction
   is accepted. HQ (ctx.from === "hq") sees the marketplace view instead:
   pipelines, offers, applications, verification and visibility. */

type Ctx = Record<string, string> | undefined;
const INDEX_KEYS = ["experience", "skills", "leadership", "qualifications", "evidence"] as const;

export default function CandidateDrawer({ id, onClose, ctx }: { id: string; onClose: () => void; ctx?: Ctx }) {
  const s = useRecruit();
  const hq = ctx?.from === "hq";
  const [vacId, setVacId] = useState<string | undefined>(() =>
    hq ? ctx?.vacancyId : contextVacancy(s, s.employerId, ctx?.vacancyId)?.id);

  if (!CANDIDATE_BY_ID[id]) {
    return (
      <Drawer open onClose={onClose} eyebrow="PROFESSIONAL PROFILE" title="Profile not available">
        <Empty icon="candidate" title="This profile is not in the marketplace" body="The professional may have hidden their profile, or the record is not part of this demo." />
      </Drawer>
    );
  }
  const c = candidate(s, id);
  return hq
    ? <HqView s={s} c={c} vacId={vacId} onClose={onClose} />
    : <EmployerView s={s} c={c} vacId={vacId} setVacId={setVacId} onClose={onClose} />;
}

/* ── employer view ──────────────────────────────────────────────────────── */

function EmployerView({ s, c, vacId, setVacId, onClose }: { s: RecruitState; c: Candidate; vacId?: string; setVacId: (id: string) => void; onClose: () => void }) {
  const nav = useNav();
  const employerId = s.employerId;
  const who = identity(s, employerId, c);
  const v = vacId ? vacancyById(vacId, s) : undefined;
  const m = v ? matchScore(c, v) : null;
  const entry = v ? pipelineFor(v.id, c.id, s) : undefined;
  const intro = introFor(employerId, c.id, s);
  const vis = visibilityOf(c.id, s);
  const roles = openRoles(s, employerId);
  const roleOptions = v && !roles.some(r => r.id === v.id) ? [v].concat(roles) : roles;
  const late = entry && (entry.stage === "interview" || entry.stage === "offer" || entry.stage === "hired");

  const footer = (
    <>
      {who.shared
        ? <Button icon="check" disabled>Contact details shared</Button>
        : intro?.status === "pending"
          ? <Button icon="clock" disabled>Introduction pending</Button>
          : intro?.status === "declined"
            ? <Button icon="x" disabled>Introduction declined</Button>
            : <Button variant="primary" icon="send" disabled={!v || v.status !== "open"} onClick={() => v && requestIntroduction(v.id, c.id)}
                title={v ? "Ask " + who.first + " to share contact details for " + v.title : "Choose an open role first"}>Request introduction</Button>}
      <ShortlistButton s={s} vacancyId={v?.id} candidateId={c.id} size="md" variant="secondary" />
      <SaveButton s={s} id={c.id} size="md" />
      <CompareButton s={s} id={c.id} size="md" />
      {late && <Button iconRight="arrowRight" onClick={() => { onClose(); nav.go("emp.hiring", "shortlists"); }} style={{ marginLeft: "auto" }}>Go to hiring</Button>}
    </>
  );

  return (
    <Drawer open onClose={onClose} width={700} eyebrow="PROFESSIONAL PROFILE"
      badge={who.shared ? <Badge tone="teal" icon="check">Contact shared</Badge> : who.anon ? <Badge tone="neutral" icon="eyeOff">Anonymous profile</Badge> : <Badge tone="accent" icon="eye">Discoverable</Badge>}
      title={<span className="rc-row" style={{ gap: 13 }}><PersonAvatar c={c} anon={who.anon} size={44} /><span>{who.name}</span></span>}
      sub={<>{c.title}, {c.years} years in {c.industry.toLowerCase()}. {who.place}. Currently: {who.org}.</>}
      footer={footer}>
      <div className="rc-col" style={{ gap: 22 }}>
        <div className="rc-grid rc-g2" style={{ gap: 12 }}>
          <IndexBlock c={c} />
          <div className="rc-col" style={{ gap: 10 }}>
            <Tile label="Availability" value={c.availability} sub={noticeText(c.noticeWeeks) + ". Start date agreed after an offer."} icon="clock" />
            <Tile label="Salary expectation" value={vis.showSalary ? kRange(c.salaryExpectation) : "Shared after an introduction"}
              sub={vis.showSalary ? "Illustrative, set by the professional" : "The professional keeps this private"} icon="euro" />
            <Tile label="Leadership" value={c.teamSize ? "Leads " + num(c.teamSize) + " people" : "Individual contributor"} sub={c.verifiedCredentials + " verified credentials, profile " + c.completeness + "% complete"} icon="users" />
          </div>
        </div>

        {v && m && (
          <AlignmentBlock c={c} v={v} m={m} first={who.first}
            picker={roleOptions.length > 1 ? (
              <Select value={v.id} onChange={setVacId} style={{ height: 32, fontSize: 12.5, width: "auto", maxWidth: 240 }}
                options={roleOptions.map(r => ({ value: r.id, label: roleName(r) }))} />
            ) : null}
            stage={entry && entry.stage !== "identified" ? <StagePill stage={entry.stage} /> : null} />
        )}

        <Block title="Summary">
          <div style={{ fontSize: 13.5, lineHeight: 1.65, color: "var(--body)" }}>{c.summary}</div>
        </Block>

        <Block title="Career history" sub={c.experience.filter(x => x.verification === "verified").length + " of " + c.experience.length + " roles verified"}>
          <CareerHistory c={c} named={who.shared} />
        </Block>

        <Block title="Leadership achievements">
          <Achievements c={c} />
        </Block>

        <Block title="Skills" sub={c.skills.filter(x => x.verification === "verified").length + " of " + c.skills.length + " verified" + (v ? ". Required for " + v.title + " shown first." : "")}>
          <SkillList c={c} v={v} />
        </Block>

        <Block title="Qualifications">
          <Qualifications c={c} />
        </Block>

        <Block title="Also on the profile">
          <MoreChips c={c} />
        </Block>

        <Block title="Contact details">
          {who.shared ? (
            <div className="rc-grid rc-g2" style={{ gap: 10 }}>
              <ContactLine icon="mail" label="Email" value={c.email} />
              <ContactLine icon="phone" label="Phone" value={c.phone} />
              <div style={{ gridColumn: "1 / -1", fontSize: 11.5, color: "var(--faint)" }}>Shared with consent. {c.name.split(" ")[0]} accepted an introduction or has an offer from you.</div>
            </div>
          ) : (
            <div className="rc-row" style={{ gap: 14, padding: "16px 18px", borderRadius: "var(--r-sm, 12px)", border: "1px dashed var(--border-strong)", background: "var(--surface-faint)" }}>
              <span style={{ width: 38, height: 38, flex: "none", borderRadius: 12, background: "var(--surface-2)", color: "var(--dim)", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="lock" size={16} /></span>
              <div className="rc-grow">
                <div style={{ fontSize: 13.5, fontWeight: 500 }}>Hidden until {who.first} accepts an introduction</div>
                <div style={{ fontSize: 12, color: "var(--dim)", marginTop: 3, lineHeight: 1.5 }}>
                  {intro?.status === "pending"
                    ? "Introduction requested " + lowerWhen(intro.date) + ". The professional decides whether to share their email and phone."
                    : intro?.status === "declined"
                      ? "The professional declined an introduction. Their profile stays visible; contact details stay private."
                      : "Request an introduction and Recruit asks on your behalf. Nothing is shared without their agreement."}
                </div>
              </div>
            </div>
          )}
        </Block>
      </div>
    </Drawer>
  );
}

/* ── HQ marketplace view ────────────────────────────────────────────────── */

function HqView({ s, c, vacId, onClose }: { s: RecruitState; c: Candidate; vacId?: string; onClose: () => void }) {
  const nav = useNav();
  const vis = visibilityOf(c.id, s);
  const v = vacId ? vacancyById(vacId, s) : undefined;
  const m = v ? matchScore(c, v) : null;
  const pipes = s.pipeline.filter(p => p.candidateId === c.id);
  const offers = s.offers.filter(o => o.candidateId === c.id);
  const apps = s.applications.filter(a => a.candidateId === c.id);
  const intros = s.intros.filter(i => i.candidateId === c.id);
  const placements = s.placements.filter(p => p.candidateId === c.id);
  const queue = VERIFICATION_QUEUE.filter(q => q.candidateId === c.id);
  const items = [...c.skills.map(x => ({ name: x.name, kind: "Skill", status: x.verification })), ...c.qualifications.map(q => ({ name: q.name, kind: "Qualification", status: q.verification })),
    ...c.experience.map(x => ({ name: x.role + ", " + x.orgPublic, kind: "Experience", status: x.verification }))];
  const count = (st: string) => items.filter(i => i.status === st).length;
  const empName = (vid: string) => { const vac = vacancyById(vid, s); return vac ? (EMPLOYER_BY_ID[vac.employerId]?.short || "") : ""; };
  const modeLabel = vis.mode === "discoverable" ? "Discoverable" : vis.mode === "anonymous" ? "Anonymous to employers" : "Hidden from search";

  const go = (page: string, tab: string) => { onClose(); nav.go(page, tab); };
  return (
    <Drawer open onClose={onClose} width={700} eyebrow="MARKETPLACE VIEW"
      badge={<Badge tone={c.status === "placed" ? "ok" : vis.mode === "discoverable" ? "accent" : "neutral"} icon={c.status === "placed" ? "placement" : vis.mode === "discoverable" ? "eye" : "eyeOff"}>{c.status === "placed" ? "Placed" : modeLabel}</Badge>}
      title={<span className="rc-row" style={{ gap: 13 }}><PersonAvatar c={c} size={44} /><span>{c.name}</span></span>}
      sub={<>{c.title}, {c.years} years. {c.location}. {c.joined}. Employers see {vis.mode === "anonymous" ? "an anonymised profile" : vis.mode === "hidden" || c.status === "placed" ? "nothing in search" : "a discoverable profile"}.</>}
      footer={<>
        <Button icon="talent" onClick={() => go("hq.talent", "candidates")}>Talent registry</Button>
        <Button icon="verified" onClick={() => go("hq.talent", "verification")}>Verification queue</Button>
        <Button icon="hiring" onClick={() => go("hq.roles", "pipelines")} style={{ marginLeft: "auto" }}>Pipelines</Button>
      </>}>
      <div className="rc-col" style={{ gap: 22 }}>
        <Note icon="shield">Recruit HQ view. Employers never see this panel; they see the profile under the candidate's own visibility and consent settings.</Note>

        <Block title="Visibility and consent">
          <div className="rc-grid rc-g2" style={{ gap: 10 }}>
            <Tile icon="eye" label="Search visibility" value={c.status === "placed" ? "Hidden, placed through Recruit" : modeLabel} />
            <Tile icon="lock" label="Contact details" value={vis.contactAfterConsent ? "Only after consent" : "Shared on request"} sub={intros.filter(i => i.status === "accepted").length + " employer" + (intros.filter(i => i.status === "accepted").length === 1 ? "" : "s") + " given access"} />
            <Tile icon="employer" label="Current employer" value={vis.blockCurrentEmployer ? "Blocked from seeing the profile" : "Not blocked"} sub={c.currentOrg} />
            <Tile icon="euro" label="Salary expectation" value={kRange(c.salaryExpectation)} sub={vis.showSalary ? "Shown to employers" : "Hidden from employers"} />
          </div>
          {intros.length > 0 && (
            <div style={{ marginTop: 12 }}>
              {intros.map((i, k) => {
                const vac = vacancyById(i.vacancyId, s);
                return (
                  <Line key={i.id} first={k === 0} title={(EMPLOYER_BY_ID[vac?.employerId || ""]?.name || "Employer") + " asked for an introduction"} sub={(vac?.title || "") + ", " + i.date}
                    right={<Badge tone={i.status === "accepted" ? "teal" : i.status === "pending" ? "warn" : "neutral"}>{i.status === "accepted" ? "Accepted" : i.status === "pending" ? "Awaiting reply" : "Declined"}</Badge>} />
                );
              })}
            </div>
          )}
        </Block>

        <Block title="Pipelines" sub={pipes.length ? pipes.length + " active " + (pipes.length === 1 ? "pipeline" : "pipelines") + " across the marketplace" : undefined}>
          {pipes.length ? pipes.map((p, k) => {
            const vac = vacancyById(p.vacancyId, s);
            const score = vac ? matchScore(c, vac).score : null;
            return (
              <Line key={p.id} first={k === 0} title={(vac?.title || "Vacancy") + ", " + empName(p.vacancyId)}
                sub={"Source: " + (p.source === "applied" ? "applied" : p.source === "agent" ? "suggested by an agent" : p.source) + ". Updated " + lowerWhen(p.updated) + (p.note ? ". " + p.note : "") + (score !== null ? ". Alignment " + score + "%" : "")}
                right={<StagePill stage={p.stage} />} />
            );
          }) : <Quiet>Not in any employer pipeline right now.</Quiet>}
        </Block>

        <Block title="Offers">
          {offers.length ? offers.map((o, k) => (
            <Line key={o.id} first={k === 0} title={o.title + ", " + (EMPLOYER_BY_ID[o.employerId]?.short || "")}
              sub={eur(o.salary) + ". Start " + o.start + ". " + (o.visibleToCandidate ? "Visible to the candidate" : "Not yet visible to the candidate") + (o.contingency ? ". Contingency offer" : "")}
              right={<Badge tone={o.status === "accepted" ? "ok" : o.status === "sent" ? "accent" : o.status === "declined" || o.status === "withdrawn" ? "neutral" : "warn"}>{o.status.charAt(0).toUpperCase() + o.status.slice(1)}</Badge>} />
          )) : <Quiet>No offers in progress.</Quiet>}
        </Block>

        <Block title="Applications">
          {apps.length ? apps.map((a, k) => {
            const vac = vacancyById(a.vacancyId, s);
            return <Line key={a.id} first={k === 0} title={(vac?.title || "Role") + ", " + empName(a.vacancyId)} sub={"Applied " + a.date + (a.note ? ". " + a.note : "")}
              right={<Badge tone={a.status === "interview" || a.status === "offer" ? "accent" : a.status === "withdrawn" || a.status === "unsuccessful" ? "neutral" : "teal"}>{a.status.charAt(0).toUpperCase() + a.status.slice(1)}</Badge>} />;
          }) : <Quiet>No applications submitted.</Quiet>}
        </Block>

        {placements.length > 0 && (
          <Block title="Placements">
            {placements.map((p, k) => (
              <Line key={p.id} first={k === 0} title={(EMPLOYER_BY_ID[p.employerId]?.name || "Employer") + ", " + eur(p.salary)} sub={"Placed " + p.date + ". Starts " + p.startDate + ". Success fee " + eur(p.salary * p.feeRate) + " (" + Math.round(p.feeRate * 100) + "%), invoice " + p.invoice + "."}
                right={<Badge tone="ok" icon="placement">Placed</Badge>} />
            ))}
          </Block>
        )}

        <Block title="Verification" sub={count("verified") + " verified, " + count("pending") + " pending, " + count("self") + " self-reported across skills, qualifications and roles"}>
          <StackBar height={8} parts={[{ label: "Verified", value: count("verified"), color: "var(--teal, var(--ok))" }, { label: "Pending", value: count("pending"), color: "var(--warn)" }, { label: "Self-reported", value: count("self"), color: "var(--faint)" }]} />
          <div style={{ marginTop: 10 }}>
            {queue.map((q, k) => <Line key={q.id} first={k === 0} title={q.item} sub={q.type + ", " + q.age + " in queue. Owner: " + q.owner} right={<Badge tone="warn" icon="clock">{q.status}</Badge>} />)}
            {items.filter(i => i.status === "pending" && !queue.some(q => i.name.includes(q.item) || q.item.includes(i.name))).map((i, k) => (
              <Line key={i.name} first={!queue.length && k === 0} title={i.name} sub={i.kind + " awaiting confirmation"} right={<VerifyBadge status="pending" compact />} />
            ))}
            {!queue.length && !count("pending") && <Quiet>Nothing waiting on verification.</Quiet>}
          </div>
        </Block>

        {v && m && <AlignmentBlock c={c} v={v} m={m} first={c.name.split(" ")[0]} picker={null} stage={null} hq />}

        <div className="rc-grid rc-g2" style={{ gap: 12 }}>
          <IndexBlock c={c} />
          <div className="rc-col" style={{ gap: 10 }}>
            <Tile icon="clock" label="Availability" value={c.availability} sub={c.status === "placed" ? "Placed through Recruit" : noticeText(c.noticeWeeks)} />
            <Tile icon="users" label="Leadership" value={c.teamSize ? "Leads " + num(c.teamSize) + " people" : "Individual contributor"} sub={c.verifiedCredentials + " verified credentials"} />
            <Tile icon="profile" label="Profile" value={c.completeness + "% complete"} sub={<Progress value={c.completeness} height={4} style={{ marginTop: 6 }} />} />
          </div>
        </div>

        <Block title="Summary"><div style={{ fontSize: 13.5, lineHeight: 1.65, color: "var(--body)" }}>{c.summary}</div></Block>
        <Block title="Career history"><CareerHistory c={c} named /></Block>
        <Block title="Skills"><SkillList c={c} v={v} /></Block>
        <Block title="Qualifications"><Qualifications c={c} /></Block>
      </div>
    </Drawer>
  );
}

/* ── shared sections ────────────────────────────────────────────────────── */

function Block({ title, sub, right, children }: { title: ReactNode; sub?: ReactNode; right?: ReactNode; children: ReactNode }) {
  return (
    <section>
      <div className="rc-row" style={{ alignItems: "flex-end", marginBottom: 10, gap: 10 }}>
        <div className="rc-grow">
          <div style={{ fontSize: 14, fontWeight: 600, letterSpacing: "-.2px" }}>{title}</div>
          {sub && <div style={{ fontSize: 12, color: "var(--dim)", marginTop: 3 }}>{sub}</div>}
        </div>
        {right}
      </div>
      {children}
    </section>
  );
}

function Tile({ label, value, sub, icon }: { label: ReactNode; value: ReactNode; sub?: ReactNode; icon: string }) {
  return (
    <div className="rc-row" style={{ alignItems: "flex-start", gap: 11, padding: "11px 13px", borderRadius: "var(--r-sm, 12px)", background: "var(--surface-2)", border: "1px solid var(--border)", minWidth: 0 }}>
      <span style={{ color: "var(--dim)", marginTop: 1 }}><Icon name={icon} size={14} /></span>
      <div className="rc-grow">
        <Label style={{ fontSize: 8.5 }}>{label}</Label>
        <div style={{ fontSize: 13.5, color: "var(--ink)", marginTop: 4, fontWeight: 500 }}>{value}</div>
        {sub && <div style={{ fontSize: 11.5, color: "var(--dim)", marginTop: 2, lineHeight: 1.45 }}>{sub}</div>}
      </div>
    </div>
  );
}

function Line({ title, sub, right, first }: { title: ReactNode; sub?: ReactNode; right?: ReactNode; first?: boolean }) {
  return (
    <div className="rc-row" style={{ gap: 12, padding: "10px 0", borderTop: first ? 0 : "1px solid var(--border)", alignItems: "center" }}>
      <div className="rc-grow">
        <div style={{ fontSize: 13, color: "var(--ink)" }}>{title}</div>
        {sub && <div style={{ fontSize: 12, color: "var(--dim)", marginTop: 2, lineHeight: 1.45 }}>{sub}</div>}
      </div>
      {right}
    </div>
  );
}

const Quiet = ({ children }: { children: ReactNode }) => <div style={{ fontSize: 12.5, color: "var(--faint)", padding: "4px 0" }}>{children}</div>;

function IndexBlock({ c }: { c: Candidate }) {
  return (
    <div style={{ padding: "16px 18px", borderRadius: "var(--card-r, 18px)", border: "1px solid var(--border)", background: "linear-gradient(150deg, color-mix(in oklab, #4263EB 14%, var(--surface)) 0%, var(--surface) 70%)" }}>
      <div className="rc-row" style={{ alignItems: "baseline", gap: 8 }}>
        <Label>Recruit Index</Label>
        <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--faint)" }}>out of 1,000</span>
      </div>
      <div style={{ fontSize: 40, fontWeight: 600, letterSpacing: "-1.6px", lineHeight: 1, marginTop: 8, fontVariantNumeric: "tabular-nums" }}>{num(c.recruitIndex)}</div>
      <div style={{ marginTop: 14 }}>
        <StackBar height={9} total={1000} parts={INDEX_KEYS.map((k, i) => ({ label: INDEX_LABELS[k], value: c.breakdown[k], color: SERIES_COLORS[i] }))} />
      </div>
      <div className="rc-col" style={{ gap: 6, marginTop: 12 }}>
        {INDEX_KEYS.map((k, i) => (
          <div key={k} className="rc-row" style={{ gap: 8, fontSize: 11.5 }}>
            <span style={{ width: 7, height: 7, borderRadius: 2, background: SERIES_COLORS[i], flex: "none" }} />
            <span className="rc-grow rc-ellipsis" style={{ color: "var(--dim)" }}>{INDEX_LABELS[k]}</span>
            <span style={{ fontVariantNumeric: "tabular-nums", color: "var(--body)" }}>{c.breakdown[k]}<span style={{ color: "var(--faint)" }}>/{INDEX_MAX[k]}</span></span>
          </div>
        ))}
      </div>
      <div style={{ fontSize: 11, color: "var(--faint)", marginTop: 12, lineHeight: 1.5 }}>One contextual indicator among several. It reflects professional evidence and profile completeness, never a pass or fail.</div>
    </div>
  );
}

function AlignmentBlock({ c, v, m, first, picker, stage, hq }: { c: Candidate; v: Vacancy; m: Match; first: string; picker: ReactNode; stage: ReactNode; hq?: boolean }) {
  const cov = requiredCoverage(c, v);
  const qs = interviewQuestions(c, v, m);
  return (
    <div style={{ padding: "18px 18px 16px", borderRadius: "var(--card-r, 18px)", border: "1px solid var(--accent-line)", background: "color-mix(in oklab, var(--accent) 6%, var(--surface))" }}>
      <div className="rc-row rc-wrap" style={{ gap: 14, alignItems: "center" }}>
        <ScoreRing score={m.score} size={58} />
        <div className="rc-grow" style={{ minWidth: 200 }}>
          <div style={{ fontSize: 14.5, fontWeight: 600, letterSpacing: "-.2px" }}>Why this profile may match {v.title}</div>
          <div style={{ fontSize: 12, color: "var(--dim)", marginTop: 3 }}>{m.score}% role alignment. Explainable decision support, not a recommendation to hire.</div>
        </div>
        {stage}
        {picker}
      </div>
      <div className="rc-col" style={{ gap: 7, marginTop: 14 }}>
        {m.reasons.map((r, i) => (
          <div key={i} className="rc-row" style={{ alignItems: "flex-start", gap: 9, fontSize: 13, lineHeight: 1.5, color: "var(--body)" }}>
            <span style={{ color: "var(--teal, var(--ok))", marginTop: 2 }}><Icon name="check" size={13} stroke={2.4} /></span>{r}
          </div>
        ))}
      </div>
      {cov.total > 0 && (
        <div style={{ marginTop: 14 }}>
          <Label style={{ fontSize: 8.5 }}>Required skills, {cov.matched.length} of {cov.total} evidenced</Label>
          <div className="rc-row rc-wrap" style={{ gap: 6, marginTop: 8 }}>
            {v.required.map(r => <SkillTag key={r} name={r} hit={cov.matched.includes(r)} verified={cov.verified.includes(r)} missing={!cov.matched.includes(r)} />)}
          </div>
        </div>
      )}
      <div style={{ marginTop: 16, paddingTop: 14, borderTop: "1px solid var(--border)" }}>
        <div style={{ fontSize: 13, fontWeight: 600 }}>Areas requiring employer judgement</div>
        <div className="rc-col" style={{ gap: 7, marginTop: 9 }}>
          {m.considerations.length ? m.considerations.map((x, i) => (
            <div key={i} className="rc-row" style={{ alignItems: "flex-start", gap: 9, fontSize: 13, lineHeight: 1.5, color: "var(--body)" }}>
              <span style={{ color: "var(--warn)", marginTop: 2 }}><Icon name="info" size={13} /></span>{x}
            </div>
          )) : <div style={{ fontSize: 12.5, color: "var(--dim)" }}>No specific gaps against this role's stated requirements. Interviews still decide.</div>}
        </div>
      </div>
      {!hq && (
        <div style={{ marginTop: 16, paddingTop: 14, borderTop: "1px solid var(--border)" }}>
          <div style={{ fontSize: 13, fontWeight: 600 }}>Questions worth asking {first}</div>
          <ol style={{ margin: "9px 0 0", paddingLeft: 18, display: "flex", flexDirection: "column", gap: 6 }}>
            {qs.map((q, i) => <li key={i} style={{ fontSize: 12.5, lineHeight: 1.55, color: "var(--body)" }}>{q}</li>)}
          </ol>
        </div>
      )}
    </div>
  );
}

function CareerHistory({ c, named }: { c: Candidate; named: boolean }) {
  return (
    <div>
      {c.experience.map((x, i) => (
        <div key={i} style={{ display: "flex", gap: 13 }}>
          <div style={{ width: 12, display: "flex", flexDirection: "column", alignItems: "center", flex: "none" }}>
            <span style={{ width: 9, height: 9, borderRadius: 3, marginTop: 6, background: i === 0 ? "var(--accent)" : "var(--border-strong)", boxShadow: i === 0 ? "0 0 0 3px var(--accent-soft)" : "none" }} />
            {i < c.experience.length - 1 && <span style={{ flex: 1, width: 1, background: "var(--border)", marginTop: 4 }} />}
          </div>
          <div style={{ flex: 1, minWidth: 0, paddingBottom: i < c.experience.length - 1 ? 18 : 0 }}>
            <div className="rc-row rc-wrap" style={{ gap: 8 }}>
              <span style={{ fontSize: 13.5, fontWeight: 600, color: "var(--ink)" }}>{x.role}</span>
              <VerifyBadge status={x.verification} compact />
              <span style={{ marginLeft: "auto", fontFamily: "var(--mono)", fontSize: 10, color: "var(--faint)", whiteSpace: "nowrap" }}>{x.from} to {x.to}</span>
            </div>
            <div style={{ fontSize: 12.5, color: "var(--dim)", marginTop: 3 }}>{named ? x.org + ", " + x.location : x.orgPublic}</div>
            <div style={{ fontSize: 12.5, color: "var(--body)", marginTop: 6, lineHeight: 1.55 }}>{x.summary}</div>
            {x.achievements.length > 0 && (
              <div className="rc-col" style={{ gap: 5, marginTop: 8 }}>
                {x.achievements.map((a, k) => (
                  <div key={k} className="rc-row" style={{ alignItems: "flex-start", gap: 8, fontSize: 12.5, lineHeight: 1.5, color: "var(--body)" }}>
                    <span style={{ color: "var(--accent)", marginTop: 2 }}><Icon name="trendUp" size={12} /></span>{a}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function Achievements({ c }: { c: Candidate }) {
  return (
    <div className="rc-col" style={{ gap: 8 }}>
      {c.achievements.map((a, i) => (
        <div key={i} className="rc-row" style={{ alignItems: "flex-start", gap: 10, padding: "10px 12px", borderRadius: "var(--r-sm, 12px)", background: "var(--surface-2)", border: "1px solid var(--border)" }}>
          <span style={{ color: "var(--warn)", marginTop: 1 }}><Icon name="award" size={14} /></span>
          <span style={{ fontSize: 13, lineHeight: 1.5, color: "var(--ink)" }}>{a}</span>
        </div>
      ))}
      <div className="rc-row" style={{ gap: 10, fontSize: 12, color: "var(--dim)", marginTop: 2 }}>
        <span>Leadership evidence {c.breakdown.leadership} of {INDEX_MAX.leadership}</span>
        <Progress value={c.breakdown.leadership} max={INDEX_MAX.leadership} height={4} style={{ flex: 1 }} />
        <span>{c.teamSize ? "Team of " + num(c.teamSize) : "No direct reports"}</span>
      </div>
    </div>
  );
}

function SkillList({ c, v }: { c: Candidate; v?: Vacancy }) {
  const key = (n: string) => n.toLowerCase();
  const req = new Set((v?.required || []).map(key));
  const pref = new Set((v?.preferred || []).map(key));
  const rank = (n: string) => (req.has(key(n)) ? 0 : pref.has(key(n)) ? 1 : 2);
  const list = c.skills.slice().sort((a, b) => rank(a.name) - rank(b.name) || b.level - a.level);
  return (
    <div className="rc-col" style={{ gap: 0 }}>
      {list.map((x, i) => (
        <div key={x.name} className="rc-row" style={{ gap: 12, padding: "8px 0", borderTop: i ? "1px solid var(--border)" : 0 }}>
          <span className="rc-grow rc-ellipsis" style={{ fontSize: 13, color: "var(--ink)" }}>
            {x.name}
            {rank(x.name) === 0 && <span style={{ marginLeft: 8, fontSize: 10.5, color: "var(--accent)" }}>Required</span>}
            {rank(x.name) === 1 && <span style={{ marginLeft: 8, fontSize: 10.5, color: "var(--dim)" }}>Preferred</span>}
          </span>
          <Progress value={x.level} height={4} style={{ width: 90, flex: "none" }} tone={x.verification === "verified" ? "teal" : "accent"} />
          <span style={{ width: 26, textAlign: "right", fontSize: 11.5, color: "var(--dim)", fontVariantNumeric: "tabular-nums" }}>{x.level}</span>
          <span style={{ width: 92, display: "flex", justifyContent: "flex-end" }}><VerifyBadge status={x.verification} compact /></span>
        </div>
      ))}
    </div>
  );
}

function Qualifications({ c }: { c: Candidate }) {
  return (
    <div className="rc-col">
      {c.qualifications.map((q, i) => (
        <div key={q.name} className="rc-row" style={{ gap: 12, padding: "10px 0", borderTop: i ? "1px solid var(--border)" : 0 }}>
          <span style={{ color: "var(--dim)" }}><Icon name="learning" size={15} /></span>
          <div className="rc-grow">
            <div style={{ fontSize: 13, color: "var(--ink)" }}>{q.name}</div>
            <div style={{ fontSize: 12, color: "var(--dim)", marginTop: 2 }}>{q.issuer}, {q.year}</div>
          </div>
          <VerifyBadge status={q.verification} />
        </div>
      ))}
      {!c.qualifications.length && <Quiet>No qualifications listed.</Quiet>}
    </div>
  );
}

function MoreChips({ c }: { c: Candidate }) {
  const group = (label: string, xs: string[]) => xs.length ? (
    <div>
      <Label style={{ fontSize: 8.5 }}>{label}</Label>
      <div className="rc-row rc-wrap" style={{ gap: 6, marginTop: 7 }}>{xs.map(x => <SkillTag key={x} name={x} />)}</div>
    </div>
  ) : null;
  return (
    <div className="rc-col" style={{ gap: 14 }}>
      {group("Transferable skills", c.transferable)}
      {group("Roles they are open to", c.preferredRoles)}
      {group("Languages", c.languages)}
    </div>
  );
}

function ContactLine({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="rc-row" style={{ gap: 11, padding: "11px 13px", borderRadius: "var(--r-sm, 12px)", background: "var(--surface-2)", border: "1px solid var(--accent-line)" }}>
      <span style={{ color: "var(--accent)" }}><Icon name={icon} size={15} /></span>
      <div className="rc-grow">
        <Label style={{ fontSize: 8.5 }}>{label}</Label>
        <div style={{ fontSize: 13, marginTop: 3, color: "var(--ink)" }}>{value}</div>
      </div>
    </div>
  );
}
