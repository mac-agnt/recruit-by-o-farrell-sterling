import { useMemo, useState } from "react";
import { Avatar, Badge, Button, Card, Empty, Grid, Page, Progress, Segmented, Select, Stat, Table, TextInput, type Col } from "../../ui";
import { Donut, Legend, SERIES_COLORS } from "../../charts";
import { Icon } from "../../icons";
import { useNav } from "../../nav";
import { allVacancies, openDrawer, useRecruit, type RecruitState } from "../../store";
import { EMPLOYERS, MARKET } from "../../data";
import type { Employer, Stage, Vacancy } from "../../data/types";
import type { Tier } from "../../data/metrics";
import { eur, num, plural } from "../../format";

/* Recruit HQ, Employer accounts: the commercial view of every sample
   account. Live placements recorded in the demo add to spend and
   placements, and Harbourview's tier follows its plan in the employer
   portal. Marketplace totals are illustrative. */

type Tone = "accent" | "ok" | "warn" | "bad" | "neutral" | "teal";
type HealthView = "all" | Employer["health"];
type SortKey = "health" | "spend" | "engagement" | "renewal" | "placements";

const DEMO_TODAY = new Date(2026, 10, 18);
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
/** Days from the demo date (18 Nov 2026) to a "6 Dec" style date. */
function daysUntil(label: string): number | null {
  const m = label.match(/(\d{1,2})\s+([A-Z][a-z]{2})/);
  if (!m || MON.indexOf(m[2]) < 0) return null;
  const d = new Date(DEMO_TODAY.getFullYear(), MON.indexOf(m[2]), Number(m[1]));
  if (d < DEMO_TODAY) d.setFullYear(d.getFullYear() + 1);
  return Math.round((d.getTime() - DEMO_TODAY.getTime()) / 86400000);
}

const PAST_SHORTLIST: Stage[] = ["shortlisted", "contact", "interview", "offer", "hired"];
const HEALTH_TONE: Record<Employer["health"], Tone> = { healthy: "ok", watch: "warn", "at risk": "bad" };
const HEALTH_RANK: Record<Employer["health"], number> = { "at risk": 0, watch: 1, healthy: 2 };
const STATUS_TONE: Record<Employer["membershipStatus"], Tone> = { active: "teal", "renewal due": "warn", trial: "accent", lapsed: "bad" };
const cap = (x: string) => x.charAt(0).toUpperCase() + x.slice(1);

interface AccountRow { e: Employer; tier: Tier; open: Vacancy[]; stale: Vacancy[]; spend: number; placements: number; live: number; days: number | null; reason: string }

function accountRow(s: RecruitState, e: Employer): AccountRow {
  const tierId = e.id === s.employerId ? s.membershipTier : e.tier;
  const tier = s.tiers.find(t => t.id === tierId) || s.tiers[0];
  const open = allVacancies(s).filter(v => v.employerId === e.id && v.status === "open");
  const stale = open.filter(v => v.postedDays > 21 && !s.pipeline.some(p => p.vacancyId === v.id && PAST_SHORTLIST.includes(p.stage)));
  const live = s.placements.filter(p => p.employerId === e.id && p.date === "Today");
  const spend = e.spendYtd + live.reduce((t, p) => t + p.salary * p.feeRate, 0);
  const placements = e.placementsYtd + live.length;
  const days = daysUntil(e.renewal);
  const risks: string[] = [];
  stale.forEach(v => risks.push(v.title + " open " + v.postedDays + " days without a shortlist"));
  if (e.membershipStatus === "trial") risks.push(e.note.replace(/\.$/, ""), e.renewal + (placements ? "" : ", no hires yet"));
  if (e.membershipStatus === "renewal due" && days !== null) risks.push("Renewal due in " + days + " days");
  if (e.engagement < 60) risks.push("Engagement " + e.engagement + " of 100");
  if (!placements && e.membershipStatus !== "trial") risks.push("No placements yet this year");
  if (e.health === "healthy") risks.push("Engagement " + e.engagement + ", " + plural(placements, "placement") + " this year");
  return { e, tier, open, stale, spend, placements, live: live.length, days, reason: risks.join(". ") + "." };
}

export default function Accounts() {
  const s = useRecruit();
  const nav = useNav();
  const [q, setQ] = useState("");
  const [health, setHealth] = useState<HealthView>("all");
  const [status, setStatus] = useState("all");
  const [tier, setTier] = useState("all");
  const [industry, setIndustry] = useState("all");
  const [sort, setSort] = useState<SortKey>("health");

  const all = useMemo(() => EMPLOYERS.map(e => accountRow(s, e)), [s]);
  const industries = Array.from(new Set(EMPLOYERS.map(e => e.industry)));

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const by: Record<SortKey, (a: AccountRow, b: AccountRow) => number> = {
      health: (a, b) => HEALTH_RANK[a.e.health] - HEALTH_RANK[b.e.health] || a.e.engagement - b.e.engagement,
      spend: (a, b) => b.spend - a.spend,
      engagement: (a, b) => b.e.engagement - a.e.engagement,
      renewal: (a, b) => (a.days ?? 999) - (b.days ?? 999),
      placements: (a, b) => b.placements - a.placements,
    };
    return all.filter(r => {
      if (health !== "all" && r.e.health !== health) return false;
      if (status !== "all" && r.e.membershipStatus !== status) return false;
      if (tier !== "all" && String(r.tier.id) !== tier) return false;
      if (industry !== "all" && r.e.industry !== industry) return false;
      if (needle && ![r.e.name, r.e.location, r.e.contact, r.e.sector].join(" ").toLowerCase().includes(needle)) return false;
      return true;
    }).sort(by[sort]);
  }, [all, q, health, status, tier, industry, sort]);

  const attention = all.filter(r => r.e.health !== "healthy" || r.e.membershipStatus !== "active")
    .sort((a, b) => HEALTH_RANK[a.e.health] - HEALTH_RANK[b.e.health] || (a.days ?? 999) - (b.days ?? 999));
  const countHealth = (h: Employer["health"]) => all.filter(r => r.e.health === h).length;
  const totalSpend = all.reduce((t, r) => t + r.spend, 0);
  const totalPlacements = all.reduce((t, r) => t + r.placements, 0);
  const avgEngagement = Math.round(all.reduce((t, r) => t + r.e.engagement, 0) / Math.max(1, all.length));
  const filtered = q || health !== "all" || status !== "all" || tier !== "all" || industry !== "all";
  const reset = () => { setQ(""); setHealth("all"); setStatus("all"); setTier("all"); setIndustry("all"); };

  const cols: Col<AccountRow>[] = [
    { key: "acct", label: "Account", width: "minmax(230px, 2.2fr)", render: r => (
      <div className="rc-row" style={{ gap: 10 }}>
        <Avatar initials={r.e.initials} tint={r.e.tint} size={32} square />
        <div className="rc-grow">
          <div className="rc-row" style={{ gap: 6 }}>
            <span className="rc-ellipsis" style={{ fontWeight: 500, color: "var(--ink)" }}>{r.e.name}</span>
            {r.e.verified && <Icon name="verified" size={13} color="var(--teal, var(--ok))" />}
          </div>
          <div className="rc-ellipsis" style={{ fontSize: 11.5, color: "var(--faint)", marginTop: 2 }}>{r.e.sector}, {r.e.location}</div>
        </div>
      </div>
    ) },
    { key: "tier", label: "Tier", width: "132px", render: r => (
      <div>
        <div style={{ color: "var(--ink)" }}>{r.tier.label}</div>
        <div style={{ fontSize: 11, color: "var(--faint)", marginTop: 2 }}>{eur(r.tier.price)} a year{r.tier.confirmed ? "" : ", concept"}</div>
      </div>
    ) },
    { key: "emp", label: "Employees", width: "92px", align: "right", render: r => <span style={{ fontVariantNumeric: "tabular-nums" }}>{num(r.e.employees)}</span> },
    { key: "status", label: "Membership", width: "minmax(150px, 1.2fr)", render: r => (
      <div>
        <Badge tone={STATUS_TONE[r.e.membershipStatus]}>{cap(r.e.membershipStatus)}</Badge>
        <div className="rc-ellipsis" style={{ fontSize: 11, color: r.days !== null && r.days <= 30 ? "var(--warn)" : "var(--faint)", marginTop: 4 }}>
          {/^\d/.test(r.e.renewal) ? "Renews " + r.e.renewal : r.e.renewal}{r.days !== null ? ", " + r.days + " days" : ""}
        </div>
      </div>
    ) },
    { key: "spend", label: "Spend YTD", width: "104px", align: "right", render: r => (
      <div>
        <div style={{ color: "var(--ink)", fontVariantNumeric: "tabular-nums" }}>{eur(r.spend)}</div>
        {r.live > 0 && <div style={{ fontSize: 10.5, color: "var(--teal, var(--ok))", marginTop: 2 }}>incl. live fee</div>}
      </div>
    ) },
    { key: "placed", label: "Placements", width: "94px", align: "right", render: r => <span style={{ fontVariantNumeric: "tabular-nums" }}>{r.placements}</span> },
    { key: "eng", label: "Engagement", width: "112px", render: r => (
      <div>
        <div style={{ fontVariantNumeric: "tabular-nums", color: "var(--ink)" }}>{r.e.engagement}</div>
        <Progress value={r.e.engagement} height={4} tone={r.e.engagement >= 70 ? "teal" : r.e.engagement >= 55 ? "warn" : "bad"} style={{ marginTop: 5, width: 64 }} />
      </div>
    ) },
    { key: "health", label: "Health", width: "98px", render: r => <Badge tone={HEALTH_TONE[r.e.health]}>{cap(r.e.health)}</Badge> },
    { key: "open", label: "Open roles", width: "90px", align: "right", render: r => (
      <span className="rc-row" style={{ gap: 6, justifyContent: "flex-end" }}>
        {r.stale.length > 0 && <span title="Open more than 21 days without a shortlist" style={{ color: "var(--bad)", display: "inline-flex" }}><Icon name="alert" size={13} /></span>}
        <span style={{ fontVariantNumeric: "tabular-nums", color: "var(--ink)" }}>{r.open.length}</span>
      </span>
    ) },
  ];

  return (
    <Page wide eyebrow="RECRUIT HQ · EMPLOYERS" title="Employer accounts"
      sub={"The commercial picture behind " + num(MARKET.employerAccounts) + " employer accounts. These " + all.length + " sample accounts are the ones the demo can open."}
      actions={<>
        <Button icon="costs" onClick={() => nav.setTab("memberships")}>Memberships</Button>
        <Button variant="primary" icon="hiring" onClick={() => nav.setTab("activity")}>Hiring activity</Button>
      </>}>

      <Grid cols="rc-g4">
        <Stat icon="employer" tone="accent" label="Employer accounts" value={num(MARKET.employerAccounts)} sub={all.length + " sample accounts below"} />
        <Stat icon="shield" tone="ok" label="Healthy accounts (sample)" value={countHealth("healthy") + " of " + all.length} sub={countHealth("watch") + " on watch, " + countHealth("at risk") + " at risk"} onClick={() => setHealth("healthy")} />
        <Stat icon="euro" tone="teal" label="Spend YTD (sample)" value={eur(totalSpend)} sub="memberships and success fees" />
        <Stat icon="placement" label="Placements YTD (sample)" value={num(totalPlacements)} sub="across the sample accounts" onClick={() => nav.go("hq.roles", "placements")} />
      </Grid>

      <Grid cols="rc-g-2-1">
        <Card title="Accounts needing attention" sub="Health, renewals and pilots, with the reason for each" action={<Badge tone="warn">{attention.length} accounts</Badge>}>
          {attention.map((r, i) => (
            <div key={r.e.id} onClick={() => openDrawer("employer", r.e.id)} className="rc-rowhover"
              style={{ display: "flex", gap: 12, alignItems: "flex-start", padding: "12px 10px", margin: "0 -10px", borderRadius: 12, borderTop: i ? "1px solid var(--border)" : 0 }}>
              <Avatar initials={r.e.initials} tint={r.e.tint} size={34} square />
              <div className="rc-grow">
                <div className="rc-row rc-wrap" style={{ gap: 7 }}>
                  <span style={{ fontSize: 13.5, fontWeight: 500, color: "var(--ink)" }}>{r.e.name}</span>
                  <Badge tone={HEALTH_TONE[r.e.health]}>{cap(r.e.health)}</Badge>
                  <Badge tone={STATUS_TONE[r.e.membershipStatus]}>{cap(r.e.membershipStatus)}</Badge>
                </div>
                <div style={{ fontSize: 12, color: "var(--dim)", marginTop: 5, lineHeight: 1.5 }}>{r.reason}</div>
              </div>
              <div style={{ textAlign: "right", flex: "none" }}>
                <div style={{ fontSize: 13, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{eur(r.spend)}</div>
                <div style={{ fontSize: 10.5, color: "var(--faint)", marginTop: 2 }}>spend YTD</div>
              </div>
            </div>
          ))}
        </Card>

        <Card title="Account health" sub={"Sample of " + all.length + " accounts. Average engagement " + avgEngagement + " of 100."}>
          <div className="rc-row rc-wrap" style={{ gap: 18, alignItems: "center" }}>
            <Donut size={130} thickness={15} center={String(avgEngagement)} sub="avg engagement"
              segments={[
                { label: "Healthy", value: countHealth("healthy"), color: "var(--ok)" },
                { label: "Watch", value: countHealth("watch"), color: "var(--warn)" },
                { label: "At risk", value: countHealth("at risk"), color: "var(--bad)" },
              ]} />
            <div className="rc-grow" style={{ minWidth: 120 }}>
              <Legend items={[
                { label: "Healthy", value: countHealth("healthy"), color: "var(--ok)" },
                { label: "Watch", value: countHealth("watch"), color: "var(--warn)" },
                { label: "At risk", value: countHealth("at risk"), color: "var(--bad)" },
              ]} />
            </div>
          </div>
          <div style={{ fontSize: 12, fontWeight: 500, color: "var(--dim)", margin: "18px 0 10px" }}>By industry</div>
          <Legend items={industries.map((ind, i) => ({
            label: ind + (ind !== "Hospitality" ? ", cross-industry" : ""), value: all.filter(r => r.e.industry === ind).length,
            color: SERIES_COLORS[i % SERIES_COLORS.length],
          }))} />
        </Card>
      </Grid>

      <Card pad={16}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))", gap: 10 }}>
          <div style={{ position: "relative", gridColumn: "span 2", minWidth: 0 }}>
            <span style={{ position: "absolute", left: 13, top: 0, bottom: 0, display: "flex", alignItems: "center", color: "var(--faint)", pointerEvents: "none" }}><Icon name="search" size={14} /></span>
            <TextInput value={q} onChange={e => setQ(e.target.value)} placeholder="Search account, contact or location" style={{ paddingLeft: 36 }} />
          </div>
          <Select value={status} onChange={setStatus} options={[{ value: "all", label: "Any membership status" }, { value: "active", label: "Active" }, { value: "renewal due", label: "Renewal due" }, { value: "trial", label: "Trial or pilot" }, { value: "lapsed", label: "Lapsed" }]} />
          <Select value={tier} onChange={setTier} options={[{ value: "all", label: "Any tier" }, ...s.tiers.map(t => ({ value: String(t.id), label: t.label + " (" + t.band + ")" }))]} />
          <Select value={industry} onChange={setIndustry} options={[{ value: "all", label: "Any industry" }, ...industries]} />
          <Select value={sort} onChange={v => setSort(v as SortKey)} options={[
            { value: "health", label: "Sort: health first" }, { value: "spend", label: "Sort: spend YTD" }, { value: "engagement", label: "Sort: engagement" },
            { value: "renewal", label: "Sort: next renewal" }, { value: "placements", label: "Sort: placements" },
          ]} />
        </div>
        <div className="rc-row rc-wrap" style={{ gap: 10, marginTop: 12 }}>
          <Segmented size="sm" value={health} onChange={setHealth}
            options={[{ id: "all", label: "All" }, { id: "healthy", label: "Healthy" }, { id: "watch", label: "Watch" }, { id: "at risk", label: "At risk" }]} />
          <span className="rc-grow" />
          {filtered && <Button size="sm" variant="ghost" icon="x" onClick={reset}>Clear filters</Button>}
        </div>
      </Card>

      <Table cols={cols} rows={rows} onRow={r => openDrawer("employer", r.e.id)}
        empty={<Empty icon="employer" title="No accounts match" body="Clear a filter to see every sample account." action={<Button size="sm" onClick={reset}>Clear filters</Button>} />}
        caption={"Showing " + rows.length + " of " + all.length + " sample accounts (of " + num(MARKET.employerAccounts) + " in the illustrative scenario). Tiers 3 and 4 are concept assumptions; tiers 1, 2 and 5 came from the founder."} />
    </Page>
  );
}
