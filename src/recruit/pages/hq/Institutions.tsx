import { useState } from "react";
import { Avatar, Badge, Button, Card, Grid, KV, Label, ListRow, Note, Page, Progress, Stat, Table, type Col } from "../../ui";
import { Icon } from "../../icons";
import { useNav } from "../../nav";
import { openDrawer, useRecruit } from "../../store";
import { partnerStats } from "../../selectors";
import { CAMPAIGNS, CANDIDATES, CANDIDATE_BY_ID, COURSES, CREDENTIAL_CHECKS, PARTNERS, PARTNER_STATUS_NOTE, RECRUIT_AGENTS, SENIORITY_MIX } from "../../data";
import { eur, num, pct, pctRaw } from "../../format";

/* HQ learning partners: the education partner pipeline. Every institution is
   fictional and none is signed; a status only says where a partner would sit
   in a partnership pipeline. */

type Row = ReturnType<typeof partnerStats>[number];
type Tone = "accent" | "ok" | "warn" | "bad" | "neutral" | "teal";

const STAGES = [
  { label: "Concept", hint: "Named as a fit, not approached" },
  { label: "Proposed", hint: "Proposal drafted for the founder" },
  { label: "Pilot, simulated", hint: "Demo verification pilot only" },
  { label: "Signed", hint: "Commercial agreement in place" },
];
const stageOf = (status: string) => (status.startsWith("Concept") ? 0 : status.startsWith("Proposed") ? 1 : /pilot/i.test(status) ? 2 : 3);
const stageTone = (status: string): Tone => (["neutral", "accent", "teal", "ok"] as Tone[])[stageOf(status)];

export default function Institutions() {
  const s = useRecruit();
  const nav = useNav();
  const rows = partnerStats(s);
  const [sel, setSel] = useState<string>("pt-liffey");
  const p = rows.find(r => r.id === sel) || rows[0];

  const referrals = rows.reduce((t, r) => t + r.referrals, 0);
  const enrolments = rows.reduce((t, r) => t + r.enrolments, 0);
  const live = rows.reduce((t, r) => t + r.live, 0);
  const pending = CREDENTIAL_CHECKS.filter(c => c.status === "pending").length;
  const partnerByName = new Map(PARTNERS.map(x => [x.name, x]));

  const courses = COURSES.filter(c => c.partnerId === p.id);
  const checks = CREDENTIAL_CHECKS.filter(c => c.issuer === p.name);
  const alumni = CANDIDATES.filter(c => c.qualifications.some(q => q.issuer === p.name));

  const leeside = rows.find(r => r.id === "pt-leeside");
  const student = CAMPAIGNS.find(c => c.id === "cp4");
  const growthRec = RECRUIT_AGENTS.find(a => a.id === "growth")?.recommendations[0];
  const early = SENIORITY_MIX.find(m => m.label === "Early career")?.value ?? 0;
  const leesideAlumni = CANDIDATES.filter(c => c.qualifications.some(q => q.issuer === leeside?.name)).length;

  const cols: Col<Row>[] = [
    { key: "name", label: "Institution", width: "minmax(230px, 2.4fr)", render: r => (
      <div className="rc-row" style={{ gap: 11 }}>
        <Avatar initials={r.initials} tint={r.tint} size={32} square />
        <div className="rc-grow">
          <div className="rc-ellipsis" style={{ fontSize: 13.5, fontWeight: 500, color: r.id === sel ? "var(--accent)" : "var(--ink)" }}>{r.name}</div>
          <div className="rc-ellipsis" style={{ fontSize: 11.5, color: "var(--dim)", marginTop: 2 }}>{r.kind}, {r.location}</div>
        </div>
      </div>
    ) },
    { key: "stage", label: "Stage", width: "118px", render: r => <Badge tone={stageTone(r.status)}>{STAGES[stageOf(r.status)].label}</Badge> },
    { key: "courses", label: "Courses", width: "76px", align: "right", render: r => r.courses },
    { key: "ref", label: "Referrals", width: "92px", align: "right", render: r => num(r.referrals) },
    { key: "enr", label: "Enrolments", width: "116px", align: "right", render: r => (
      <span className="rc-row" style={{ justifyContent: "flex-end", gap: 6 }}>
        {r.live > 0 && <Badge tone="teal">+{r.live} today</Badge>}{num(r.enrolments)}
      </span>
    ) },
    { key: "conv", label: "Conversion", width: "124px", render: r => (
      <div>
        <div style={{ fontSize: 12.5, fontVariantNumeric: "tabular-nums" }}>{pct(r.enrolments / r.referrals, 1)}</div>
        <Progress value={r.enrolments} max={r.referrals} tone="teal" height={4} style={{ marginTop: 5 }} />
      </div>
    ) },
    { key: "share", label: "Share, concept", width: "112px", align: "right", render: r => pct(r.revenueShare) },
  ];

  return (
    <Page eyebrow="LEARNING PARTNERS" title="Education partners"
      sub="Five fictional institutions in a concept pipeline. Partners would supply courses, verify credentials and bring graduates onto Recruit."
      actions={<>
        <Button icon="learning" onClick={() => nav.setTab("courses")}>Course catalogue</Button>
        <Button variant="primary" iconRight="arrowRight" onClick={() => nav.setTab("referrals")}>Referral activity</Button>
      </>}>

      <Note tone="warn" icon="alert">
        <b style={{ fontWeight: 600, color: "var(--ink)" }}>{PARTNER_STATUS_NOTE}</b> No real institution is a confirmed partner. Every status on this page describes where a partner would sit in a partnership pipeline, and all activity figures are illustrative.
      </Note>

      <Grid cols="rc-g4">
        <Stat icon="partners" label="Institutions in the pipeline" value={rows.length} sub="All fictional, none signed" />
        <Stat icon="learning" label="Courses listed" value={COURSES.length} sub={"Across " + rows.length + " partners"} />
        <Stat icon="send" label="Partner referrals" value={num(referrals)} sub="Simulated, all time" />
        <Stat icon="check" tone="teal" label="Enrolments" value={num(enrolments)} delta={live ? "+" + live + " today" : undefined} sub={pct(enrolments / referrals, 1) + " of referrals"} />
      </Grid>

      <Card title="Partnership pipeline" sub="Where each fictional institution would sit. Select one to see its detail."
        action={<Badge tone="neutral" icon="lock">0 signed</Badge>}>
        <div className="rc-grid rc-g4" style={{ gap: 10 }}>
          {STAGES.map((st, i) => {
            const here = rows.filter(r => stageOf(r.status) === i);
            const signed = i === 3;
            return (
              <div key={st.label} style={{ padding: "14px 14px 12px", borderRadius: "var(--r-sm, 12px)", minWidth: 0,
                background: signed ? "transparent" : "var(--surface-2)", border: "1px " + (signed ? "dashed var(--border-strong)" : "solid var(--border)") }}>
                <div className="rc-row" style={{ gap: 8 }}>
                  <Label style={{ flex: 1 }}>{st.label}</Label>
                  <span style={{ fontSize: 20, fontWeight: 600, letterSpacing: "-.6px", color: signed ? "var(--faint)" : "var(--ink)" }}>{here.length}</span>
                </div>
                <div style={{ fontSize: 11.5, color: "var(--faint)", marginTop: 4 }}>{st.hint}</div>
                <div className="rc-row rc-wrap" style={{ gap: 6, marginTop: 10, minHeight: 28 }}>
                  {here.map(r => (
                    <span key={r.id} onClick={() => setSel(r.id)} className="rc-chip-btn"
                      style={{ display: "inline-flex", alignItems: "center", gap: 6, height: 28, padding: "0 10px 0 4px", borderRadius: "var(--r-ctl, 10px)",
                        background: r.id === sel ? "var(--accent-soft)" : "var(--surface)", border: "1px solid " + (r.id === sel ? "var(--accent-line)" : "var(--border)"), fontSize: 12, color: "var(--body)" }}>
                      <Avatar initials={r.initials} tint={r.tint} size={20} square />{r.short}
                    </span>
                  ))}
                  {signed && <span style={{ fontSize: 12, color: "var(--dim)" }}>No partnership has been signed.</span>}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <Table cols={cols} rows={rows} onRow={r => setSel(r.id)}
        caption="Referrals and enrolments are simulated. Revenue shares are concept assumptions for discussion, not agreed terms." />

      <Card pad={22} style={{ background: "linear-gradient(140deg, color-mix(in oklab, " + p.tint + " 9%, var(--surface)) 0%, var(--surface) 50%)" }}>
        <div className="rc-row rc-wrap" style={{ gap: 14, alignItems: "flex-start" }}>
          <Avatar initials={p.initials} tint={p.tint} size={46} square />
          <div className="rc-grow" style={{ minWidth: 240 }}>
            <div className="rc-row rc-wrap" style={{ gap: 8 }}>
              <span style={{ fontSize: 18, fontWeight: 600, letterSpacing: "-.4px" }}>{p.name}</span>
              <Badge tone={stageTone(p.status)}>{p.status}</Badge>
              <Badge tone="neutral" icon="info">Fictional</Badge>
            </div>
            <div style={{ fontSize: 13, color: "var(--dim)", marginTop: 6, lineHeight: 1.55, maxWidth: "70ch" }}>{p.note}</div>
          </div>
          <Button size="sm" iconRight="arrowRight" onClick={() => nav.setTab("referrals")}>Referral economics</Button>
        </div>

        <div className="rc-grid rc-g3" style={{ gap: 14, marginTop: 18 }}>
          <div className="rc-col" style={{ gap: 10 }}>
            <KV cols={2} items={[
              { k: "Type", v: p.kind },
              { k: "Location", v: p.location },
              { k: "Revenue share", v: pct(p.revenueShare) + ", concept" },
              { k: "Conversion", v: pct(p.enrolments / p.referrals, 1) },
              { k: "Referrals", v: num(p.referrals) },
              { k: "Enrolments", v: num(p.enrolments) + (p.live ? " (+" + p.live + " today)" : "") },
            ]} />
          </div>
          <div style={{ minWidth: 0 }}>
            <Label>Courses on Recruit</Label>
            <div style={{ marginTop: 6 }}>
              {courses.map(c => (
                <ListRow key={c.id} onClick={() => openDrawer("course", c.id)} title={c.title}
                  sub={eur(c.price) + ", " + pct(c.memberDiscount) + " member discount, " + num(c.enrolled) + " enrolled"}
                  right={<Icon name="chevronRight" size={14} color="var(--faint)" />} />
              ))}
            </div>
          </div>
          <div style={{ minWidth: 0 }}>
            <Label>Credential checks and graduates</Label>
            <div style={{ marginTop: 6 }}>
              {checks.map(c => (
                <ListRow key={c.id} onClick={() => openDrawer("candidate", c.candidateId)} title={c.credential}
                  sub={(CANDIDATE_BY_ID[c.candidateId]?.name || "") + ", requested " + c.age.toLowerCase()}
                  right={c.status === "verified" ? <Badge tone="teal" icon="verified">Verified</Badge> : <Badge tone="warn" icon="clock">Pending</Badge>} />
              ))}
              {!checks.length && <div style={{ fontSize: 12.5, color: "var(--dim)", padding: "10px 0" }}>No verification requests are open with this issuer.</div>}
            </div>
            <div style={{ fontSize: 12.5, color: "var(--body)", marginTop: 10, lineHeight: 1.5 }}>
              {alumni.length} sample professionals hold a qualification from this institution.
            </div>
            <div className="rc-row rc-wrap" style={{ gap: 6, marginTop: 8 }}>
              {alumni.slice(0, 6).map(c => (
                <span key={c.id} title={c.name} onClick={() => openDrawer("candidate", c.id)} style={{ cursor: "pointer" }}>
                  <Avatar initials={c.initials} tint={c.tint} size={26} />
                </span>
              ))}
              {alumni.length > 6 && <span style={{ fontSize: 11.5, color: "var(--faint)" }}>+{alumni.length - 6} more</span>}
            </div>
          </div>
        </div>
      </Card>

      <Grid cols="rc-g2">
        <Card title="Credential verification requests" sub={CREDENTIAL_CHECKS.length + " requests, " + pending + " pending. Issuer checks are simulated; no institution is connected."}
          action={<Button size="sm" variant="ghost" iconRight="arrowRight" onClick={() => nav.go("hq.talent", "verification")}>Verification</Button>}>
          {CREDENTIAL_CHECKS.map((c, i) => {
            const cand = CANDIDATE_BY_ID[c.candidateId];
            const partner = partnerByName.get(c.issuer);
            return (
              <div key={c.id} className="rc-row rc-rowhover" onClick={() => openDrawer("candidate", c.candidateId)}
                style={{ gap: 11, padding: "10px 8px", margin: "0 -8px", borderTop: i ? "1px solid var(--border)" : 0, borderRadius: 10 }}>
                <Avatar initials={cand?.initials || "?"} tint={cand?.tint} size={30} />
                <div className="rc-grow">
                  <div className="rc-ellipsis" style={{ fontSize: 13, color: "var(--ink)" }}>{c.credential}</div>
                  <div className="rc-ellipsis" style={{ fontSize: 11.5, color: "var(--dim)", marginTop: 2 }}>{cand?.name}, issuer {c.issuer}</div>
                </div>
                {partner && <Badge tone="accent">Partner issuer</Badge>}
                {c.status === "verified" ? <Badge tone="teal" icon="verified">Verified</Badge> : <Badge tone="warn" icon="clock">Pending</Badge>}
                <span className="rc-hide-sm" style={{ width: 62, textAlign: "right", fontSize: 11, color: "var(--faint)" }}>{c.age}</span>
              </div>
            );
          })}
        </Card>

        {leeside && (
          <Card title="Graduate pipeline with Leeside College" sub="The student acquisition angle: profiles built before graduation"
            action={<Badge tone="accent">{leeside.status}</Badge>}>
            <div style={{ fontSize: 13, color: "var(--body)", lineHeight: 1.6 }}>
              Final-year students build a Recruit profile before they graduate. Employers see verified early-career talent sooner, and the college sees where its graduates go. Early-career professionals are {pctRaw(early)} of the network today.
            </div>
            <div className="rc-grid rc-g3" style={{ gap: 10, marginTop: 14 }}>
              <MiniFigure label="Student referrals" value={num(leeside.referrals)} />
              <MiniFigure label="Course enrolments" value={num(leeside.enrolments)} />
              <MiniFigure label="Graduates on Recruit" value={String(leesideAlumni)} hint="sample" />
            </div>
            {student && (
              <div style={{ marginTop: 14, padding: "12px 14px", borderRadius: "var(--r-sm, 12px)", background: "var(--surface-2)", border: "1px solid var(--border)" }}>
                <div className="rc-row" style={{ gap: 8 }}>
                  <span className="rc-grow" style={{ fontSize: 13, fontWeight: 500 }}>{student.name}</span>
                  <Badge tone="neutral">{student.status}</Badge>
                </div>
                <div style={{ fontSize: 12, color: "var(--dim)", marginTop: 4, lineHeight: 1.5 }}>{student.note}</div>
                <div className="rc-row rc-wrap" style={{ gap: 16, marginTop: 10, fontSize: 12, color: "var(--body)" }}>
                  <span>Reach <b style={{ fontWeight: 600 }}>{num(student.reach)}</b></span>
                  <span>Sign-ups <b style={{ fontWeight: 600 }}>{num(student.signups)}</b></span>
                  <span>Conversion <b style={{ fontWeight: 600 }}>{pctRaw(student.conv, 1)}</b></span>
                  <span>Cost <b style={{ fontWeight: 600 }}>{eur(student.cost)}</b></span>
                </div>
              </div>
            )}
            {growthRec && (
              <div className="rc-row" style={{ gap: 10, marginTop: 14, alignItems: "flex-start" }}>
                <span style={{ width: 26, height: 26, flex: "none", borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", background: "var(--accent-soft)", color: "var(--accent)" }}><Icon name="sparkle" size={13} /></span>
                <div className="rc-grow" style={{ fontSize: 12.5, color: "var(--body)", lineHeight: 1.5, paddingTop: 3 }}>
                  <span style={{ color: "var(--ink)", fontWeight: 500 }}>Growth & Partnerships:</span> {growthRec.text}
                </div>
              </div>
            )}
            <div className="rc-row rc-wrap" style={{ gap: 8, marginTop: 14 }}>
              <Button size="sm" onClick={() => setSel("pt-leeside")}>Show Leeside detail</Button>
              <Button size="sm" variant="ghost" iconRight="arrowRight" onClick={() => nav.go("Dashboard", "growth")}>Growth funnels</Button>
            </div>
          </Card>
        )}
      </Grid>
    </Page>
  );
}

function MiniFigure({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div style={{ padding: "11px 12px", borderRadius: 14, background: "var(--surface-2)", border: "1px solid var(--border)", minWidth: 0 }}>
      <div className="rc-ellipsis" style={{ fontSize: 11.5, color: "var(--dim)" }}>{label}</div>
      <div className="rc-row" style={{ gap: 6, alignItems: "baseline", marginTop: 6 }}>
        <span style={{ fontSize: 19, fontWeight: 600, letterSpacing: "-.6px" }}>{value}</span>
        {hint && <span style={{ fontSize: 10.5, color: "var(--faint)" }}>{hint}</span>}
      </div>
    </div>
  );
}
