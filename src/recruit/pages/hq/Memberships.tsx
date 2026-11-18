import { useMemo } from "react";
import { Avatar, Badge, Button, Card, DemoTag, Grid, Label, Note, Page, Progress, Stat } from "../../ui";
import { Donut, Legend, SERIES_COLORS, StackBar } from "../../charts";
import { useNav } from "../../nav";
import { openDrawer, useRecruit } from "../../store";
import { membershipTotals } from "../../selectors";
import { EMPLOYERS, TIERS, membershipRevenue } from "../../data";
import type { Employer } from "../../data/types";
import { eur, eurM, num, pctRaw } from "../../format";

/* Recruit HQ, Memberships: the membership book at the prices set in HQ
   settings. Revenue recalculates from s.tiers, so a price change in
   Settings shows up here straight away. Account counts and renewal windows
   are the illustrative scenario. */

type Tone = "accent" | "ok" | "warn" | "bad" | "neutral" | "teal";

const DEMO_TODAY = new Date(2026, 10, 18);
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
function daysUntil(label: string): number | null {
  const m = label.match(/(\d{1,2})\s+([A-Z][a-z]{2})/);
  if (!m || MON.indexOf(m[2]) < 0) return null;
  const d = new Date(DEMO_TODAY.getFullYear(), MON.indexOf(m[2]), Number(m[1]));
  if (d < DEMO_TODAY) d.setFullYear(d.getFullYear() + 1);
  return Math.round((d.getTime() - DEMO_TODAY.getTime()) / 86400000);
}

/** Renewal windows across all paying accounts (illustrative). */
const WINDOWS: { label: string; accounts: number; tone: Tone }[] = [
  { label: "Next 30 days", accounts: 23, tone: "warn" },
  { label: "31 to 60 days", accounts: 41, tone: "accent" },
  { label: "61 to 90 days", accounts: 57, tone: "neutral" },
];
const TIER_COLS = "minmax(190px, 1.6fr) 100px 80px 100px minmax(120px, 1fr)";

/** Accounts outside the paid total (illustrative). */
const OUTSIDE = { trials: 26, lapsed: 9 };

const STATUS_TONE: Record<Employer["membershipStatus"], Tone> = { active: "teal", "renewal due": "warn", trial: "accent", lapsed: "bad" };
const cap = (x: string) => x.charAt(0).toUpperCase() + x.slice(1);

export default function Memberships() {
  const s = useRecruit();
  const nav = useNav();
  const { revenue, accounts } = membershipTotals(s);
  const baseRevenue = membershipRevenue(TIERS);
  const delta = revenue - baseRevenue;
  const tiers = s.tiers.map((t, i) => ({ t, revenue: t.price * t.accounts, base: TIERS.find(b => b.id === t.id)?.price ?? t.price, color: SERIES_COLORS[i % SERIES_COLORS.length] }));
  const avgPrice = revenue / Math.max(1, accounts);
  const due30 = WINDOWS[0].accounts;

  const sample = useMemo(() => EMPLOYERS.map(e => {
    const tierId = e.id === s.employerId ? s.membershipTier : e.tier;
    const tier = s.tiers.find(t => t.id === tierId) || s.tiers[0];
    return { e, tier, days: daysUntil(e.renewal) };
  }).sort((a, b) => (a.days ?? 999) - (b.days ?? 999)), [s]);

  const statusParts = [
    { label: "Active", value: accounts - due30, color: "var(--teal, #16B8A6)" },
    { label: "Renewal due in 30 days", value: due30, color: "var(--warn)" },
    { label: "Pilots and trials", value: OUTSIDE.trials, color: "var(--accent)" },
    { label: "Lapsed, last 90 days", value: OUTSIDE.lapsed, color: "var(--bad)" },
  ];
  const sampleStatus = (["active", "renewal due", "trial", "lapsed"] as Employer["membershipStatus"][])
    .map(st => ({ st, n: EMPLOYERS.filter(e => e.membershipStatus === st).length })).filter(x => x.n);

  return (
    <Page wide eyebrow="RECRUIT HQ · EMPLOYERS" title="Memberships and renewals"
      sub={"Simulated annualised membership revenue across " + num(accounts) + " paying accounts, at the prices set in HQ settings. Illustrative, not actual revenue."}
      actions={<>
        <Button icon="settings" onClick={() => nav.go("Settings", "pricing")}>Edit prices</Button>
        <Button variant="primary" icon="revenue" onClick={() => nav.go("hq.revenue", "memberships")}>Revenue view</Button>
      </>}>

      <Grid cols="rc-g4">
        <Stat icon="euro" tone="accent" label="Annualised membership revenue" value={eur(revenue)}
          delta={delta ? (delta > 0 ? "+" : "-") + eur(Math.abs(delta)) + " vs default prices" : undefined} deltaTone={delta >= 0 ? "ok" : "bad"}
          sub={delta ? undefined : "simulated, default prices"} />
        <Stat icon="employer" label="Paying accounts" value={num(accounts)} sub="across five tiers" onClick={() => nav.setTab("accounts")} />
        <Stat icon="costs" label="Average membership" value={eur(avgPrice)} sub="per account, per year" />
        <Stat icon="calendar" tone="warn" label="Renewals in 30 days" value={num(due30)} sub={"about " + eur(due30 * avgPrice) + " a year at stake"} />
      </Grid>

      <Grid cols="rc-g-3-2">
        <Card title="Membership mix by tier" sub="Accounts multiplied by the current price. Tiers 3 and 4 are concept assumptions." action={<DemoTag />}>
          <div className="rc-scroll-x">
            <div style={{ minWidth: 560 }}>
              <div style={{ display: "grid", gridTemplateColumns: TIER_COLS, gap: 12, padding: "0 4px 9px", borderBottom: "1px solid var(--border)", fontSize: 11.5, color: "var(--faint)" }}>
                <span>Tier</span><span style={{ textAlign: "right" }}>Price a year</span><span style={{ textAlign: "right" }}>Accounts</span><span style={{ textAlign: "right" }}>Revenue</span><span>Share of revenue</span>
              </div>
              {tiers.map(({ t, revenue: rev, base, color }) => (
                <div key={t.id} style={{ display: "grid", gridTemplateColumns: TIER_COLS, gap: 12, alignItems: "center", padding: "12px 4px", borderBottom: "1px solid var(--border)" }}>
                  <div style={{ minWidth: 0 }}>
                    <div className="rc-row" style={{ gap: 8 }}>
                      <span style={{ width: 8, height: 8, borderRadius: 3, background: color, flex: "none" }} />
                      <span style={{ fontSize: 13, fontWeight: 500, color: "var(--ink)" }}>{t.label}</span>
                      <Badge tone={t.confirmed ? "teal" : "warn"}>{t.confirmed ? "Founder" : "Concept assumption"}</Badge>
                    </div>
                    <div style={{ fontSize: 11, color: "var(--faint)", marginTop: 3, paddingLeft: 16 }}>{t.band}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 13, color: "var(--ink)", fontVariantNumeric: "tabular-nums" }}>{eur(t.price)}</div>
                    {base !== t.price && <div style={{ fontSize: 10.5, color: "var(--faint)", marginTop: 2 }}>default {eur(base)}</div>}
                  </div>
                  <div style={{ textAlign: "right", fontSize: 13, fontVariantNumeric: "tabular-nums" }}>{num(t.accounts)}</div>
                  <div style={{ textAlign: "right", fontSize: 13, fontWeight: 600, color: "var(--ink)", fontVariantNumeric: "tabular-nums" }}>{eur(rev)}</div>
                  <div className="rc-row" style={{ gap: 8 }}>
                    <Progress value={rev} max={revenue} height={6} style={{ flex: 1 }} />
                    <span style={{ fontSize: 11.5, color: "var(--dim)", minWidth: 32, textAlign: "right" }}>{pctRaw((rev / revenue) * 100)}</span>
                  </div>
                </div>
              ))}
              <div style={{ display: "grid", gridTemplateColumns: TIER_COLS, gap: 12, alignItems: "center", padding: "12px 4px 0" }}>
                <span style={{ fontSize: 13, fontWeight: 600 }}>Total</span>
                <span style={{ textAlign: "right", fontSize: 12, color: "var(--dim)" }}>avg {eur(avgPrice)}</span>
                <span style={{ textAlign: "right", fontSize: 13, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{num(accounts)}</span>
                <span style={{ textAlign: "right", fontSize: 13, fontWeight: 600, color: "var(--ink)", fontVariantNumeric: "tabular-nums" }}>{eur(revenue)}</span>
                <span style={{ fontSize: 11.5, color: "var(--faint)" }}>{eur(revenue / 12)} a month</span>
              </div>
            </div>
          </div>
        </Card>

        <Card title="Accounts and revenue by tier" sub="Smaller employers are most accounts; larger tiers carry more revenue per account">
          <div className="rc-row rc-wrap" style={{ gap: 16, justifyContent: "space-around" }}>
            <div className="rc-col" style={{ alignItems: "center", gap: 12 }}>
              <Donut size={128} thickness={16} center={num(accounts)} sub="accounts" segments={tiers.map(x => ({ label: x.t.label, value: x.t.accounts, color: x.color }))} />
              <Label>Accounts</Label>
            </div>
            <div className="rc-col" style={{ alignItems: "center", gap: 12 }}>
              <Donut size={128} thickness={16} center={eurM(revenue)} sub="a year" segments={tiers.map(x => ({ label: x.t.label, value: x.revenue, color: x.color }))} />
              <Label>Revenue</Label>
            </div>
          </div>
          <div style={{ marginTop: 16 }}>
            <Legend items={tiers.map(x => ({ label: x.t.label + ", " + x.t.band, value: pctRaw((x.t.accounts / accounts) * 100) + " / " + pctRaw((x.revenue / revenue) * 100), color: x.color }))} />
            <div style={{ fontSize: 11, color: "var(--faint)", marginTop: 8 }}>Share of accounts / share of revenue</div>
          </div>
        </Card>
      </Grid>

      <Grid cols="rc-g-2-1">
        <Card title="Renewals due" sub="Paying accounts renewing in the next 90 days, with the sample accounts by date" action={<DemoTag />}>
          <div className="rc-grid rc-g3" style={{ gap: 10 }}>
            {WINDOWS.map(w => (
              <div key={w.label} style={{ padding: "13px 14px", borderRadius: "var(--r-sm, 12px)", background: "var(--surface-2)", border: "1px solid var(--border)" }}>
                <Label style={{ fontSize: 8.5 }}>{w.label}</Label>
                <div style={{ fontSize: 24, fontWeight: 600, letterSpacing: "-.8px", marginTop: 7 }}>{num(w.accounts)}</div>
                <div style={{ fontSize: 11, color: "var(--faint)", marginTop: 4 }}>about {eur(w.accounts * avgPrice)} a year</div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 16 }}>
            {sample.map((r, i) => (
              <div key={r.e.id} onClick={() => openDrawer("employer", r.e.id)} className="rc-rowhover"
                style={{ display: "grid", gridTemplateColumns: "30px minmax(0, 1fr) auto auto", gap: 12, alignItems: "center", padding: "9px 8px", margin: "0 -8px", borderRadius: 10, borderTop: i ? "1px solid var(--border)" : 0 }}>
                <Avatar initials={r.e.initials} tint={r.e.tint} size={30} square />
                <div style={{ minWidth: 0 }}>
                  <div className="rc-ellipsis" style={{ fontSize: 13, color: "var(--ink)", fontWeight: 500 }}>{r.e.name}</div>
                  <div className="rc-ellipsis" style={{ fontSize: 11.5, color: "var(--faint)", marginTop: 2 }}>{r.tier.label}, {eur(r.tier.price)} a year{r.tier.confirmed ? "" : " (concept price)"}</div>
                </div>
                <Badge tone={STATUS_TONE[r.e.membershipStatus]}>{cap(r.e.membershipStatus)}</Badge>
                <div style={{ textAlign: "right", minWidth: 116 }}>
                  <div style={{ fontSize: 12.5, color: r.days !== null && r.days <= 30 ? "var(--warn)" : "var(--body)" }}>{r.e.renewal}</div>
                  <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--faint)", marginTop: 2 }}>{r.days !== null ? "in " + r.days + " days" : ""}</div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <div className="rc-col" style={{ gap: 14 }}>
          <Card title="Status breakdown" sub="Paying accounts, plus pilots and lapsed accounts outside the revenue total" action={<DemoTag />}>
            <StackBar parts={statusParts} height={12} />
            <div style={{ marginTop: 14 }}>
              <Legend items={statusParts.map(p => ({ label: p.label, value: num(p.value), color: p.color }))} />
            </div>
            <div style={{ fontSize: 11.5, color: "var(--faint)", marginTop: 10, lineHeight: 1.5 }}>
              {num(accounts)} paying accounts. Pilots and lapsed accounts pay no membership and are not in the {eur(revenue)} total.
            </div>
          </Card>
          <Card title="In the sample" sub={EMPLOYERS.length + " accounts the demo can open"}>
            <div className="rc-row rc-wrap" style={{ gap: 8 }}>
              {sampleStatus.map(x => <Badge key={x.st} tone={STATUS_TONE[x.st]}>{cap(x.st)}: {x.n}</Badge>)}
            </div>
            {s.membershipTier !== EMPLOYERS.find(e => e.id === s.employerId)?.tier && (
              <Note icon="info" style={{ marginTop: 12 }}>Harbourview previewed a plan change in the employer portal. Its tier here follows that choice (simulated, no payment taken).</Note>
            )}
          </Card>
        </div>
      </Grid>

      <Note icon="info">
        Tiers 1 (1-50 employees), 2 (51-100) and 5 (501+) came from the founder. Tiers 3 (101-250) and 4 (251-500) are concept assumptions for this demo.
        Prices are editable in Settings, and every total on this page recalculates.
      </Note>
    </Page>
  );
}

