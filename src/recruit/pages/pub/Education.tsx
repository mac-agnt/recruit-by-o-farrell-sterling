import { useState, type ReactNode } from "react";
import { Avatar, Badge, Button, Card, Chip, DemoTag, KV, Label, Note, Page, Section, Timeline } from "../../ui";
import { BarList, SERIES_COLORS } from "../../charts";
import { Icon } from "../../icons";
import { useNav } from "../../nav";
import { openDrawer, useRecruit } from "../../store";
import { partnerStats } from "../../selectors";
import { COURSES, COURSE_BY_ID, CREDENTIAL_CHECKS, INDEX_ACTIONS, PARTNERS, PARTNER_BY_ID, PARTNER_STATUS_NOTE, VALUE_SCENARIOS } from "../../data";
import { eur, num, pct, plural } from "../../format";

/* Education partners: how learning becomes verified evidence on a profile.
   Every institution is fictional and none is signed; partner economics are a
   concept model and labelled as such. */

const FEATURED = "crs-wine";
const LEARNER = "c-aoife"; // the professional the featured diploma is recommended for

export default function Education() {
  const s = useRecruit();
  const nav = useNav();
  const partners = partnerStats(s);
  const [sel, setSel] = useState(partners[0]?.id || "");
  const selected = partners.find(p => p.id === sel) || partners[0];
  const course = COURSE_BY_ID[FEATURED];
  const partner = course ? PARTNER_BY_ID[course.partnerId] : undefined;
  const action = (INDEX_ACTIONS[LEARNER] || []).find(a => a.id === "ia-wine");
  const scenario = (VALUE_SCENARIOS[LEARNER] || []).find(v => v.id === "qual");
  /* Live enrolments made in the candidate view during this session. */
  const enrolledToday = s.enrolments.filter(e => e.courseId === FEATURED && e.date === "Today").length;

  return (
    <Page wide eyebrow="EDUCATION PARTNERS" title="Learning that employers can see."
      sub="Partners offer courses, recognised credentials and member discounts. A completed credential becomes verified evidence on a professional's profile."
      actions={<Button icon="hq" onClick={() => nav.go("hq.learning", "institutions")}>See partners in Recruit HQ</Button>}>

      <Note icon="info" tone="warn">
        <b style={{ color: "var(--ink)", fontWeight: 600 }}>{PARTNER_STATUS_NOTE}</b>{" "}
        The institutions, courses, prices and statuses below show how a partnership would work. Credential checks with issuers are simulated.
      </Note>

      {/* The ecosystem, end to end */}
      {course && (
        <Card title="From course to opportunity" sub="How learning moves through the marketplace, shown with the featured diploma." action={<DemoTag />}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            <FlowStep icon="learning" k="Learn" v={course.title} sub={course.duration + (partner ? ", " + partner.short : "")} />
            <FlowStep icon="verified" k="Verify the credential" v={course.credential} sub="The issuer confirms it. Simulated in this demo." />
            <FlowStep icon="trendUp" k="Profile evidence rises" v={"+" + (action?.points ?? 0) + " Recruit Index points"} sub={(action?.area || "Qualifications") + " evidence, once verified"} />
            <FlowStep last icon="search" k="Employers find you" v={(scenario?.roles ?? 0) + " more relevant roles"} sub={scenario ? scenario.note.split(". ")[0] : "Roles that ask for the credential"} />
          </div>
        </Card>
      )}

      {/* Featured course */}
      {course && partner && (
        <Card pad={0} style={{ overflow: "hidden", background: "linear-gradient(150deg, color-mix(in oklab, #4263EB 13%, var(--surface)) 0%, var(--surface) 50%, color-mix(in oklab, #16B8A6 9%, var(--surface)) 100%)" }}>
          <div style={{ display: "flex", flexWrap: "wrap" }}>
            <div style={{ flex: "3 1 420px", minWidth: 0, padding: 24 }}>
              <div className="rc-row rc-wrap" style={{ gap: 8 }}>
                <Badge tone="accent" icon="star">Featured example</Badge>
                <StatusBadge status={partner.status} />
                {enrolledToday > 0 && <Badge tone="teal" icon="users">{plural(enrolledToday, "enrolment")} today</Badge>}
              </div>
              <div style={{ fontSize: "clamp(22px, 2.2vw, 28px)", fontWeight: 600, letterSpacing: "-.9px", marginTop: 14, lineHeight: 1.15, color: "var(--ink)" }}>{course.title}</div>
              <div className="rc-row" style={{ gap: 10, marginTop: 10 }}>
                <Avatar initials={partner.initials} tint={partner.tint} size={26} square />
                <span style={{ fontSize: 13, color: "var(--body)" }}>{partner.name}</span>
              </div>
              <div style={{ fontSize: 13.5, color: "var(--dim)", lineHeight: 1.65, marginTop: 14, maxWidth: "64ch" }}>{course.summary}</div>
              <div style={{ marginTop: 18 }}>
                <KV cols={3} items={[
                  { k: "Provider", v: partner.short },
                  { k: "Duration", v: course.duration },
                  { k: "Next intake", v: course.starts },
                  { k: "Indicative cost", v: eur(course.price) },
                  { k: "Member discount", v: pct(course.memberDiscount) + ", illustrative" },
                  { k: "Member price", v: eur(course.price * (1 - course.memberDiscount)) },
                ]} />
              </div>
              <Label style={{ marginTop: 18 }}>Skills gained</Label>
              <div className="rc-row rc-wrap" style={{ gap: 6, marginTop: 10 }}>
                {course.skills.map(sk => <Chip key={sk} tone="accent" style={{ height: 26, fontSize: 11.5 }}>{sk}</Chip>)}
              </div>
              <Label style={{ marginTop: 16 }}>Relevant roles</Label>
              <div className="rc-row rc-wrap" style={{ gap: 6, marginTop: 10 }}>
                {course.roles.map(r => <Chip key={r} style={{ height: 26, fontSize: 11.5 }}><Icon name="jobs" size={12} style={{ color: "var(--dim)" }} />{r}</Chip>)}
              </div>
              <div className="rc-row rc-wrap" style={{ gap: 8, marginTop: 22 }}>
                <Button variant="primary" icon="book" onClick={() => openDrawer("course", course.id)}>View course details</Button>
                <Button icon="candidate" onClick={() => nav.go("cand.learning", "courses")}>Open in the candidate view</Button>
              </div>
            </div>
            <div style={{ flex: "2 1 300px", minWidth: 0, padding: 24, background: "color-mix(in oklab, var(--surface-faint) 72%, transparent)" }}>
              <Label>Possible salary effect</Label>
              <div style={{ fontSize: "clamp(26px, 2.6vw, 34px)", fontWeight: 600, letterSpacing: "-1.2px", marginTop: 10, lineHeight: 1.1, color: "var(--teal, var(--ok))", fontVariantNumeric: "tabular-nums" }}>
                +{eur(course.impact[0])} to {eur(course.impact[1])}
              </div>
              <div style={{ fontSize: 13, color: "var(--body)", marginTop: 6 }}>in selected relevant roles</div>
              <div className="rc-row" style={{ gap: 8, marginTop: 10 }}>
                <DemoTag>Illustrative scenario</DemoTag>
                <span style={{ fontSize: 11.5, color: "var(--faint)" }}>Not a guarantee</span>
              </div>
              <div style={{ height: 1, background: "var(--border)", margin: "20px 0 16px" }} />
              <Label>What the diploma covers</Label>
              <div style={{ marginTop: 12 }}>
                <Timeline items={course.modules.map(m => ({ when: "", title: m }))} />
              </div>
              <div style={{ fontSize: 11.5, color: "var(--faint)", marginTop: 14, lineHeight: 1.5 }}>
                Rated {course.rating} by {num(course.enrolled)} members in the illustrative scenario. Leads to the {course.credential}.
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Directory */}
      {selected && (
        <Section title="Partner institutions" sub={PARTNERS.length + " fictional institutions at different stages of a partnership pipeline. Select one to see its courses."}>
          <Row>
            <Cell basis={380} grow={3}>
              <Card pad={8} style={{ flex: 1 }}>
                {partners.map(p => {
                  const on = p.id === selected.id;
                  return (
                    <button key={p.id} onClick={() => setSel(p.id)} className="rc-rowhover rc-focus" aria-pressed={on}
                      style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", textAlign: "left", padding: "12px", borderRadius: 14, cursor: "pointer", color: "inherit",
                        border: "1px solid " + (on ? "var(--accent-line)" : "transparent"), background: on ? "var(--accent-faint)" : "transparent" }}>
                      <Avatar initials={p.initials} tint={p.tint} size={36} square />
                      <span style={{ flex: 1, minWidth: 0 }}>
                        <span className="rc-ellipsis" style={{ display: "block", fontSize: 13.5, fontWeight: 500, color: "var(--ink)" }}>{p.name}</span>
                        <span className="rc-ellipsis" style={{ display: "block", fontSize: 11.5, color: "var(--dim)", marginTop: 2 }}>{p.kind}, {p.location}</span>
                      </span>
                      <span className="rc-hide-sm"><StatusBadge status={p.status} /></span>
                      <span style={{ width: 70, flex: "none", textAlign: "right", fontSize: 12, color: "var(--faint)" }}>{plural(p.courses, "course")}</span>
                    </button>
                  );
                })}
              </Card>
            </Cell>
            <Cell basis={320} grow={2}>
              <PartnerDetail p={selected} />
            </Cell>
          </Row>
        </Section>
      )}

      {/* The model for partners */}
      <Row>
        <Cell basis={340} grow={2}>
          <Card title="How partners take part" sub="Three ways a course reaches a professional's profile." style={{ flex: 1 }}>
            <Mechanism icon="book" title="Courses"
              body="Listed against the gaps they close, so they reach the professionals who need them."
              metric={COURSES.length + " courses from " + PARTNERS.length + " institutions"} />
            <Mechanism icon="award" title="Recognised credentials"
              body="Completed credentials are confirmed with the issuer and shown on the profile as verified evidence."
              metric={CREDENTIAL_CHECKS.length + " checks in the sample queue, simulated"} />
            <Mechanism icon="euro" title="Member discounts" last
              body="Recruit members pay less for courses linked to their profile and career goals."
              metric={range(COURSES.map(c => c.memberDiscount)) + " off, illustrative"} />
          </Card>
        </Cell>
        <Cell basis={380} grow={3}>
          <PartnerBenefits />
        </Cell>
      </Row>
    </Page>
  );
}

/* ── pieces ─────────────────────────────────────────────────────────────── */

const range = (values: number[]) => {
  const lo = Math.min(...values), hi = Math.max(...values);
  return lo === hi ? pct(lo) : pct(lo) + " to " + pct(hi);
};

function StatusBadge({ status }: { status: string }) {
  const pilot = /pilot/i.test(status);
  return <Badge tone={pilot ? "teal" : "neutral"} icon={pilot ? "verified" : "info"}>{status}</Badge>;
}

function FlowStep({ icon, k, v, sub, last }: { icon: string; k: string; v: string; sub: string; last?: boolean }) {
  return (
    <div style={{ flex: "1 1 150px", minWidth: 0, display: "flex", alignItems: "stretch", gap: 8 }}>
      <div style={{ flex: 1, minWidth: 0, padding: "14px 15px", borderRadius: 16, background: last ? "var(--accent-faint)" : "var(--surface-2)", border: "1px solid " + (last ? "var(--accent-line)" : "var(--border)") }}>
        <div className="rc-row" style={{ gap: 9 }}>
          <span style={{ width: 28, height: 28, borderRadius: 9, flex: "none", display: "flex", alignItems: "center", justifyContent: "center", background: last ? "var(--accent-soft)" : "var(--surface)", color: "var(--accent)" }}>
            <Icon name={icon} size={14} />
          </span>
          <span style={{ fontSize: 12, color: last ? "var(--accent)" : "var(--dim)" }}>{k}</span>
        </div>
        <div style={{ fontSize: 14, fontWeight: 500, color: "var(--ink)", marginTop: 12, lineHeight: 1.35 }}>{v}</div>
        <div style={{ fontSize: 12, color: "var(--dim)", marginTop: 5, lineHeight: 1.45 }}>{sub}</div>
      </div>
      {!last && <span style={{ alignSelf: "center", color: "var(--faint)", flex: "none" }}><Icon name="chevronRight" size={15} /></span>}
    </div>
  );
}

function PartnerDetail({ p }: { p: ReturnType<typeof partnerStats>[number] }) {
  const courses = COURSES.filter(c => c.partnerId === p.id);
  return (
    <Card style={{ flex: 1 }} title={p.name} sub={p.note} action={<StatusBadge status={p.status} />}>
      <KV cols={3} items={[
        { k: "Referrals", v: num(p.referrals) },
        { k: "Enrolments", v: num(p.enrolments) },
        { k: "Revenue share", v: pct(p.revenueShare) },
      ]} />
      <div className="rc-row" style={{ gap: 8, marginTop: 10 }}>
        <DemoTag>Concept figures</DemoTag>
        {p.live > 0 && <span style={{ fontSize: 11.5, color: "var(--teal, var(--ok))" }}>{plural(p.live, "enrolment")} added today</span>}
      </div>
      <Label style={{ marginTop: 18 }}>Courses</Label>
      <div style={{ marginTop: 6 }}>
        {courses.map((co, i) => (
          <button key={co.id} onClick={() => openDrawer("course", co.id)} className="rc-rowhover rc-focus"
            style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", textAlign: "left", padding: "11px 8px", margin: "0 -8px", borderRadius: 12, border: 0, borderTop: i ? "1px solid var(--border)" : 0, background: "none", cursor: "pointer", color: "inherit" }}>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span className="rc-ellipsis" style={{ display: "block", fontSize: 13, color: "var(--ink)" }}>{co.title}</span>
              <span className="rc-ellipsis" style={{ display: "block", fontSize: 11.5, color: "var(--dim)", marginTop: 2 }}>{co.level}, {co.duration}</span>
            </span>
            <span style={{ textAlign: "right", flex: "none" }}>
              <span style={{ display: "block", fontSize: 12.5, color: "var(--ink)", fontVariantNumeric: "tabular-nums" }}>{eur(co.price)}</span>
              <span style={{ display: "block", fontSize: 11, color: "var(--teal, var(--ok))", marginTop: 2 }}>{pct(co.memberDiscount)} member discount</span>
            </span>
            <Icon name="chevronRight" size={14} style={{ color: "var(--faint)" }} />
          </button>
        ))}
        {!courses.length && <div style={{ fontSize: 12.5, color: "var(--dim)", padding: "8px 0" }}>No courses listed yet.</div>}
      </div>
    </Card>
  );
}

function Mechanism({ icon, title, body, metric, last }: { icon: string; title: string; body: string; metric: string; last?: boolean }) {
  return (
    <div className="rc-row" style={{ gap: 12, alignItems: "flex-start", padding: "13px 0", borderBottom: last ? 0 : "1px solid var(--border)" }}>
      <span style={{ width: 32, height: 32, flex: "none", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", background: "var(--accent-soft)", color: "var(--accent)" }}>
        <Icon name={icon} size={15} />
      </span>
      <div className="rc-grow">
        <div style={{ fontSize: 13.5, fontWeight: 500, color: "var(--ink)" }}>{title}</div>
        <div style={{ fontSize: 12.5, color: "var(--dim)", marginTop: 3, lineHeight: 1.5 }}>{body}</div>
        <div style={{ fontSize: 11.5, color: "var(--faint)", marginTop: 6 }}>{metric}</div>
      </div>
    </div>
  );
}

function PartnerBenefits() {
  const s = useRecruit();
  const partners = partnerStats(s);
  const referrals = partners.reduce((t, p) => t + p.referrals, 0);
  const rule = s.commissionRules.find(r => r.id === "cr4");
  return (
    <Card title="What partners get" sub="A concept model. Nothing here is agreed with any institution." action={<Badge tone="warn" icon="info">Concept</Badge>} style={{ flex: 1 }}>
      <div className="rc-row rc-wrap" style={{ gap: 26 }}>
        <Figure value={num(referrals)} label="Qualified referrals in the scenario" />
        <Figure value={range(PARTNERS.map(p => p.revenueShare))} label="Revenue share on referred course fees" />
      </div>
      <Label style={{ marginTop: 20 }}>Illustrative referrals by partner</Label>
      <div style={{ marginTop: 12 }}>
        <BarList items={partners.map((p, i) => ({ label: p.short, value: p.referrals, display: num(p.referrals), color: SERIES_COLORS[i % SERIES_COLORS.length] }))} />
      </div>
      <div style={{ fontSize: 11.5, color: "var(--faint)", marginTop: 14, lineHeight: 1.5 }}>
        {rule ? "The draft commission rules hold a " + pct(rule.rate) + " referral rate (" + rule.note.toLowerCase() + "). " : ""}
        Partners also gain graduates whose credentials are verified and visible to employers.
      </div>
    </Card>
  );
}

function Figure({ value, label }: { value: ReactNode; label: string }) {
  return (
    <div style={{ minWidth: 0 }}>
      <div style={{ fontSize: 28, fontWeight: 600, letterSpacing: "-1px", lineHeight: 1, color: "var(--ink)", fontVariantNumeric: "tabular-nums" }}>{value}</div>
      <div style={{ fontSize: 12, color: "var(--dim)", marginTop: 7 }}>{label}</div>
    </div>
  );
}

/* ── layout helpers ─────────────────────────────────────────────────────── */

function Row({ children }: { children: ReactNode }) {
  return <div style={{ display: "flex", flexWrap: "wrap", gap: 14, alignItems: "stretch" }}>{children}</div>;
}
function Cell({ basis, grow = 1, children }: { basis: number; grow?: number; children: ReactNode }) {
  return <div style={{ flex: grow + " 1 " + basis + "px", minWidth: 0, display: "flex", flexDirection: "column", gap: 14 }}>{children}</div>;
}
