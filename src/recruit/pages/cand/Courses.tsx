import { useState } from "react";
import { Avatar, Badge, Button, Card, Chip, DemoTag, Empty, Grid, Page, Segmented, Stat } from "../../ui";
import { Icon } from "../../icons";
import { useNav } from "../../nav";
import { openDrawer, useRecruit } from "../../store";
import { candidate } from "../../selectors";
import { COURSES, PARTNER_BY_ID, PARTNERS, PARTNER_STATUS_NOTE } from "../../data";
import type { Course } from "../../data";
import { eur } from "../../format";
import { impactText, memberPrice, recommendedCourses } from "../../shared/CourseDrawer";

/* The course marketplace. Recommended courses first, each with the reason
   it fits; then everything else. Partners are fictional, prices indicative
   and opportunity effects illustrative. */

const CATS = ["All"].concat(Array.from(new Set(COURSES.map(x => x.category))));

export default function Courses() {
  const s = useRecruit();
  const nav = useNav();
  const c = candidate(s, s.persona);
  const [cat, setCat] = useState("All");
  const recs = recommendedCourses(c);
  const recIds = new Set(recs.map(r => r.course.id));
  const enrolled = new Set(s.enrolments.filter(e => e.candidateId === c.id).map(e => e.courseId));
  const inCat = (x: Course) => cat === "All" || x.category === cat;
  const recShown = recs.filter(r => inCat(r.course));
  const others = COURSES.filter(x => !recIds.has(x.id) && inCat(x));
  const maxDiscount = Math.max(...COURSES.map(x => x.memberDiscount));

  return (
    <Page wide eyebrow="LEARNING" title="Recommended courses"
      sub="Courses from education partners, chosen for the roles you are aiming at. Members pay less; every effect shown is illustrative."
      actions={<Button variant="primary" icon="route" onClick={() => nav.go("cand.learning", "development")}>My development plan</Button>}>

      <Grid cols="rc-g4">
        <Stat icon="learning" label="Courses available" value={COURSES.length} sub={"from " + PARTNERS.length + " fictional partners"} />
        <Stat icon="sparkle" tone="accent" label="Recommended for you" value={recs.length} sub="with a reason for each" />
        <Stat icon="check" tone="teal" label="Your enrolments" value={enrolled.size} sub={enrolled.size ? "see your plan" : "none yet"} onClick={() => nav.go("cand.learning", "development")} />
        <Stat icon="euro" label="Member discount" value={"Up to " + Math.round(maxDiscount * 100) + "%"} sub="indicative pricing" />
      </Grid>

      <div className="rc-scroll-x" style={{ padding: "2px 0" }}>
        <Segmented value={cat} onChange={setCat} options={CATS.map(x => ({ id: x, label: x }))} />
      </div>

      <div className="rc-row" style={{ padding: "6px 4px 0", alignItems: "flex-end" }}>
        <div className="rc-grow">
          <div style={{ fontSize: 17, fontWeight: 600, letterSpacing: "-.3px" }}>Recommended for you</div>
          <div style={{ fontSize: 13, color: "var(--dim)", marginTop: 4 }}>Linked to your career paths, your index actions and what you have told us you want next</div>
        </div>
        <DemoTag />
      </div>
      {recShown.length ? (
        <Grid cols="rc-g2">
          {recShown.map(r => <FeatureCard key={r.course.id} x={r.course} reason={r.reason} enrolled={enrolled.has(r.course.id)} />)}
        </Grid>
      ) : (
        <Card><Empty icon="learning" title={"No recommended courses in " + cat.toLowerCase()} body="Switch category or browse everything below." action={<Button size="sm" onClick={() => setCat("All")}>Show all categories</Button>} /></Card>
      )}

      {others.length > 0 && (
        <>
          <div style={{ padding: "10px 4px 0" }}>
            <div style={{ fontSize: 17, fontWeight: 600, letterSpacing: "-.3px" }}>More courses</div>
            <div style={{ fontSize: 13, color: "var(--dim)", marginTop: 4 }}>The rest of the marketplace{cat === "All" ? "" : " in " + cat.toLowerCase()}</div>
          </div>
          <Grid cols="rc-g3">
            {others.map(x => <CompactCard key={x.id} x={x} enrolled={enrolled.has(x.id)} />)}
          </Grid>
        </>
      )}

      <div style={{ fontSize: 11.5, color: "var(--faint)", padding: "4px 4px 0" }}>
        {PARTNER_STATUS_NOTE} Prices are indicative and no payment is taken in this demo. Opportunity effects are illustrative, in selected relevant roles, and never guaranteed.
      </div>
    </Page>
  );
}

function FeatureCard({ x, reason, enrolled }: { x: Course; reason: string; enrolled: boolean }) {
  const p = PARTNER_BY_ID[x.partnerId];
  return (
    <Card pad={20} onClick={() => openDrawer("course", x.id)} style={{ display: "flex", flexDirection: "column" }}>
      <div className="rc-row" style={{ gap: 10 }}>
        <Avatar initials={p?.initials || "?"} tint={p?.tint} size={34} square />
        <div className="rc-grow" style={{ minWidth: 0 }}>
          <div className="rc-ellipsis" style={{ fontSize: 12, color: "var(--body)" }}>{p?.name}</div>
          <div style={{ fontSize: 11, color: "var(--faint)", marginTop: 2 }}>{x.level} · {x.category}</div>
        </div>
        {enrolled ? <Badge tone="teal" icon="check">Enrolled</Badge> : <Badge tone="warn" icon="trendUp">{impactText(x.impact)}</Badge>}
      </div>
      <div style={{ fontSize: 16, fontWeight: 600, letterSpacing: "-.3px", marginTop: 14, lineHeight: 1.3 }}>{x.title}</div>
      <div className="rc-row" style={{ gap: 6, fontSize: 12, color: "var(--dim)", marginTop: 6 }}>
        <Icon name="clock" size={12} /><span className="rc-ellipsis">{x.duration} · {x.format}</span>
      </div>
      <div className="rc-row" style={{ gap: 9, alignItems: "flex-start", marginTop: 12, padding: "9px 11px", borderRadius: 12, background: "var(--accent-faint)", border: "1px solid var(--accent-line)" }}>
        <span style={{ color: "var(--accent)", marginTop: 1 }}><Icon name="sparkle" size={12} /></span>
        <span style={{ fontSize: 12.5, color: "var(--body)", lineHeight: 1.45 }}>{reason}</span>
      </div>
      <div className="rc-row rc-wrap" style={{ gap: 6, marginTop: 12 }}>
        {x.skills.slice(0, 3).map(k => <Chip key={k}>{k}</Chip>)}
        {x.skills.length > 3 && <Chip>+{x.skills.length - 3}</Chip>}
      </div>
      <div className="rc-ellipsis" style={{ fontSize: 11.5, color: "var(--faint)", marginTop: 10 }}>For: {x.roles.slice(0, 3).join(", ")}</div>
      <div className="rc-row" style={{ gap: 10, marginTop: "auto", paddingTop: 14, alignItems: "baseline" }}>
        <span style={{ fontSize: 17, fontWeight: 600 }}>{eur(memberPrice(x))}</span>
        <span style={{ fontSize: 12, color: "var(--faint)", textDecoration: "line-through" }}>{eur(x.price)}</span>
        <span style={{ fontSize: 11.5, color: "var(--teal, var(--ok))" }}>member price, {Math.round(x.memberDiscount * 100)}% off</span>
        <span className="rc-grow" />
        <span className="rc-row" style={{ gap: 4, fontSize: 12, color: "var(--dim)" }}><Icon name="star" size={12} style={{ color: "#f0a33e" }} />{x.rating.toFixed(1)}</span>
      </div>
    </Card>
  );
}

function CompactCard({ x, enrolled }: { x: Course; enrolled: boolean }) {
  const p = PARTNER_BY_ID[x.partnerId];
  return (
    <Card pad={16} onClick={() => openDrawer("course", x.id)} style={{ display: "flex", flexDirection: "column" }}>
      <div className="rc-row" style={{ gap: 8 }}>
        <Avatar initials={p?.initials || "?"} tint={p?.tint} size={26} square />
        <span className="rc-grow rc-ellipsis" style={{ fontSize: 11.5, color: "var(--dim)" }}>{p?.short}</span>
        {enrolled ? <Badge tone="teal" icon="check">Enrolled</Badge> : <span className="rc-row" style={{ gap: 4, fontSize: 11.5, color: "var(--dim)" }}><Icon name="star" size={11} style={{ color: "#f0a33e" }} />{x.rating.toFixed(1)}</span>}
      </div>
      <div style={{ fontSize: 13.5, fontWeight: 600, marginTop: 11, lineHeight: 1.35 }}>{x.title}</div>
      <div className="rc-ellipsis" style={{ fontSize: 11.5, color: "var(--dim)", marginTop: 4 }}>{x.category} · {x.duration}</div>
      <div className="rc-row rc-wrap" style={{ gap: 8, marginTop: "auto", paddingTop: 12 }}>
        <span style={{ fontSize: 13, fontWeight: 600 }}>{eur(memberPrice(x))}</span>
        <span className="rc-grow" style={{ fontSize: 11, color: "var(--faint)" }}>member</span>
        <Badge>{impactText(x.impact)}</Badge>
      </div>
    </Card>
  );
}
