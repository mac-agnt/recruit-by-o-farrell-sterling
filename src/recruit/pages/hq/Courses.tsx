import { useMemo, useState } from "react";
import { Avatar, Badge, Button, Card, Chip, Grid, Note, Page, Select, Stat, Table, TextInput, type Col } from "../../ui";
import { BarList, SERIES_COLORS } from "../../charts";
import { Icon } from "../../icons";
import { useNav } from "../../nav";
import { openDrawer, useRecruit } from "../../store";
import { CANDIDATE_BY_ID, COURSES, PARTNERS, PARTNER_BY_ID, type Course } from "../../data";
import { eur, num, pct } from "../../format";

/* HQ learning partners: the full course catalogue from the fictional partners,
   with live enrolments from the demo folded into the counts. */

type Sort = "enrolled" | "rating" | "price" | "recommended";
interface Row { c: Course; enrolled: number; live: number; memberPrice: number }

const CATEGORIES = Array.from(new Set(COURSES.map(c => c.category)));

export default function Courses() {
  const s = useRecruit();
  const nav = useNav();
  const [cat, setCat] = useState("All");
  const [partner, setPartner] = useState("all");
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<Sort>("enrolled");

  const all: Row[] = useMemo(() => COURSES.map(c => {
    const live = s.enrolments.filter(e => e.courseId === c.id && e.date === "Today").length;
    return { c, live, enrolled: c.enrolled + live, memberPrice: c.price * (1 - c.memberDiscount) };
  }), [s.enrolments]);

  const rows = all
    .filter(r => cat === "All" || r.c.category === cat)
    .filter(r => partner === "all" || r.c.partnerId === partner)
    .filter(r => !q.trim() || (r.c.title + " " + r.c.skills.join(" ") + " " + r.c.roles.join(" ")).toLowerCase().includes(q.trim().toLowerCase()))
    .sort((a, b) => sort === "rating" ? b.c.rating - a.c.rating : sort === "price" ? b.c.price - a.c.price
      : sort === "recommended" ? b.c.recommendedFor.length - a.c.recommendedFor.length : b.enrolled - a.enrolled);

  const totalEnrolled = all.reduce((t, r) => t + r.enrolled, 0);
  const liveTotal = all.reduce((t, r) => t + r.live, 0);
  const avgRating = all.reduce((t, r) => t + r.c.rating * r.enrolled, 0) / (totalEnrolled || 1);
  const avgDiscount = COURSES.reduce((t, c) => t + c.memberDiscount, 0) / COURSES.length;
  const byCategory = CATEGORIES.map((label, i) => ({ label, value: all.filter(r => r.c.category === label).reduce((t, r) => t + r.enrolled, 0), color: SERIES_COLORS[i % SERIES_COLORS.length] }))
    .sort((a, b) => b.value - a.value);
  const mostRecommended = all.slice().sort((a, b) => b.c.recommendedFor.length - a.c.recommendedFor.length).slice(0, 4);

  const cols: Col<Row>[] = [
    { key: "course", label: "Course", width: "minmax(230px, 2.6fr)", render: r => (
      <div style={{ minWidth: 0 }}>
        <div className="rc-ellipsis" style={{ fontSize: 13.5, fontWeight: 500, color: "var(--ink)" }}>{r.c.title}</div>
        <div className="rc-ellipsis" style={{ fontSize: 11.5, color: "var(--dim)", marginTop: 2 }}>{r.c.level}, {r.c.duration}</div>
      </div>
    ) },
    { key: "cat", label: "Category", width: "118px", render: r => <Badge tone={r.c.category === "Career change" ? "accent" : r.c.category === "Leadership" ? "teal" : "neutral"}>{r.c.category}</Badge> },
    { key: "provider", label: "Provider", width: "150px", render: r => {
      const p = PARTNER_BY_ID[r.c.partnerId];
      return <span className="rc-row" style={{ gap: 8 }}><Avatar initials={p?.initials || "?"} tint={p?.tint} size={22} square /><span className="rc-ellipsis">{p?.short}</span></span>;
    } },
    { key: "price", label: "Price", width: "84px", align: "right", render: r => eur(r.c.price) },
    { key: "disc", label: "Member price", width: "118px", align: "right", render: r => (
      <div>
        <div>{eur(r.memberPrice)}</div>
        <div style={{ fontSize: 11, color: "var(--teal, var(--ok))", marginTop: 2 }}>{pct(r.c.memberDiscount)} off</div>
      </div>
    ) },
    { key: "enrolled", label: "Enrolled", width: "100px", align: "right", render: r => (
      <span className="rc-row" style={{ justifyContent: "flex-end", gap: 6 }}>{r.live > 0 && <Badge tone="teal">+{r.live}</Badge>}{num(r.enrolled)}</span>
    ) },
    { key: "rating", label: "Rating", width: "72px", align: "right", render: r => (
      <span className="rc-row" style={{ justifyContent: "flex-end", gap: 4 }}><Icon name="star" size={12} color="#f0a33e" />{r.c.rating.toFixed(1)}</span>
    ) },
    { key: "rec", label: "Suggested for", width: "124px", render: r => r.c.recommendedFor.length ? (
      <span className="rc-row" style={{ gap: 0 }} title={r.c.recommendedFor.map(id => CANDIDATE_BY_ID[id]?.name).join(", ")}>
        {r.c.recommendedFor.slice(0, 3).map((id, i) => {
          const c = CANDIDATE_BY_ID[id];
          return <Avatar key={id} initials={c?.initials || "?"} tint={c?.tint} size={22} style={{ marginLeft: i ? -6 : 0, boxShadow: "0 0 0 2px var(--surface)" }} />;
        })}
        <span style={{ marginLeft: 8, fontSize: 12, color: "var(--dim)", whiteSpace: "nowrap" }}>{r.c.recommendedFor.length}</span>
      </span>
    ) : <span style={{ fontSize: 12, color: "var(--faint)" }}>Open to all</span> },
  ];

  return (
    <Page wide eyebrow="LEARNING PARTNERS" title="Course catalogue"
      sub="Twelve courses from five fictional partners. Recruit members get a discount, and every course links to the roles it leads to."
      actions={<>
        <Button icon="partners" onClick={() => nav.setTab("institutions")}>Institutions</Button>
        <Button variant="primary" iconRight="arrowRight" onClick={() => nav.setTab("referrals")}>Referrals</Button>
      </>}>

      <Grid cols="rc-g4">
        <Stat icon="learning" label="Courses" value={rows.length === COURSES.length ? COURSES.length : rows.length + " of " + COURSES.length} sub={CATEGORIES.length + " categories"} />
        <Stat icon="users" tone="teal" label="Total enrolled" value={num(totalEnrolled)} delta={liveTotal ? "+" + liveTotal + " today" : undefined} sub="All sources, illustrative" />
        <Stat icon="star" label="Average rating" value={avgRating.toFixed(2)} sub="Weighted by enrolments" />
        <Stat icon="euro" label="Average member discount" value={pct(avgDiscount, 1)} sub="Off the list price" />
      </Grid>

      <Card pad="14px 16px">
        <div className="rc-row rc-wrap" style={{ gap: 10 }}>
          <div className="rc-row rc-wrap" style={{ gap: 6, flex: "1 1 420px" }}>
            {["All"].concat(CATEGORIES).map(c => (
              <Chip key={c} active={cat === c} onClick={() => setCat(c)}>
                {c}<span style={{ color: "var(--faint)", fontSize: 11 }}>{c === "All" ? COURSES.length : COURSES.filter(x => x.category === c).length}</span>
              </Chip>
            ))}
          </div>
          <div style={{ width: 200 }}>
            <Select value={partner} onChange={setPartner} options={[{ value: "all", label: "All providers" }].concat(PARTNERS.map(p => ({ value: p.id, label: p.short })))} />
          </div>
          <div style={{ width: 170 }}>
            <Select value={sort} onChange={v => setSort(v as Sort)} options={[{ value: "enrolled", label: "Most enrolled" }, { value: "rating", label: "Highest rated" }, { value: "price", label: "Highest price" }, { value: "recommended", label: "Most recommended" }]} />
          </div>
          <div style={{ position: "relative", width: 230 }}>
            <span style={{ position: "absolute", left: 12, top: 12, color: "var(--faint)", pointerEvents: "none" }}><Icon name="search" size={15} /></span>
            <TextInput value={q} onChange={e => setQ(e.target.value)} placeholder="Search courses, skills, roles" style={{ paddingLeft: 36 }} />
          </div>
        </div>
      </Card>

      <Table cols={cols} rows={rows} onRow={r => openDrawer("course", r.c.id)}
        empty={<div style={{ padding: "30px 20px", textAlign: "center", fontSize: 13, color: "var(--dim)" }}>No courses match these filters. <button className="rc-link" onClick={() => { setCat("All"); setPartner("all"); setQ(""); }}>Clear filters</button></div>}
        caption="Select a course to open it. Partners are fictional; prices, discounts and ratings are illustrative." />

      <Grid cols="rc-g-1-2">
        <Card title="Enrolments by category" sub="Including today's demo enrolments">
          <BarList items={byCategory.map(c => ({ label: c.label, value: c.value, color: c.color }))} format={num} />
        </Card>
        <Card title="Recommended most often" sub="Courses the agents suggest to the most profiles">
          {mostRecommended.map(r => (
            <div key={r.c.id} onClick={() => openDrawer("course", r.c.id)} className="rc-rowhover"
              style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 8px", margin: "0 -8px", borderRadius: 10 }}>
              <div className="rc-grow">
                <div className="rc-ellipsis" style={{ fontSize: 13, color: "var(--ink)" }}>{r.c.title}</div>
                <div style={{ fontSize: 11.5, color: "var(--dim)", marginTop: 3 }}>{PARTNER_BY_ID[r.c.partnerId]?.short}, {r.c.recommendedFor.length} profiles</div>
              </div>
              <span className="rc-row" style={{ gap: 0 }}>
                {r.c.recommendedFor.slice(0, 3).map((id, i) => {
                  const c = CANDIDATE_BY_ID[id];
                  return <Avatar key={id} initials={c?.initials || "?"} tint={c?.tint} size={22} style={{ marginLeft: i ? -6 : 0, boxShadow: "0 0 0 2px var(--surface)" }} />;
                })}
              </span>
            </div>
          ))}
        </Card>
      </Grid>
      <Note icon="info">Recommendations come from the Career Pathfinder and Market Value agents. They are suggestions for the professional, never a requirement from an employer.</Note>
    </Page>
  );
}
