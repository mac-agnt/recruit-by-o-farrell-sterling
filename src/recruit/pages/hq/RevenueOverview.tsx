import { useEffect, useRef, useState, type ReactNode } from "react";
import { Badge, Button, Card, DemoTag, Grid, Label, Note, Page } from "../../ui";
import { BarList, Donut, Legend, SERIES_COLORS, Sparkline } from "../../charts";
import { Icon } from "../../icons";
import { useNav } from "../../nav";
import { useRecruit } from "../../store";
import { membershipTotals } from "../../selectors";
import { MARKET, MONTHS, SCENARIO_CAPTION, SERIES, TIERS, UNCONFIRMED_SERVICES, membershipRevenue, placementEconomics } from "../../data";
import { eur, eurK, eurM, num, pct } from "../../format";

/* HQ revenue: the four streams of the simulated operating model. Membership
   follows the editable tier prices and success fees follow the standard rate
   in Settings, so a pricing change shows up here straight away. Every figure
   is an illustrative future state, never an actual result. */

const COLORS = { membership: SERIES_COLORS[0], fees: SERIES_COLORS[1], edu: SERIES_COLORS[2], referral: SERIES_COLORS[3] };

export default function RevenueOverview() {
  const s = useRecruit();
  const nav = useNav();
  const mt = membershipTotals(s);
  const mScale = mt.revenue / membershipRevenue(TIERS);
  const stdRate = s.commissionRules.find(r => r.id === "cr1")?.rate ?? MARKET.recruitDefaultRate;
  const refShare = s.commissionRules.find(r => r.id === "cr4")?.rate ?? 0.1;
  const fScale = stdRate / MARKET.recruitDefaultRate;

  const membership = SERIES.membershipMrr.map(v => v * mScale);
  const fees = SERIES.successFees.map(v => v * fScale);
  // Education income is split, not added twice: referral commissions are a share of it.
  const edu = SERIES.educationRevenue.map(v => v * (1 - refShare));
  const referral = SERIES.educationRevenue.map(v => v * refShare);
  const last = MONTHS.length - 1;
  const month = membership[last] + fees[last] + edu[last] + referral[last];
  const runRate = mt.revenue + (fees[last] + edu[last] + referral[last]) * 12;
  const econ = placementEconomics(MARKET.placementsThisMonth, MARKET.avgPlacementSalary, MARKET.agencyBenchmarkRate, stdRate);
  const ratePct = (() => { const v = Math.round(stdRate * 1000) / 10; return (Number.isInteger(v) ? v.toFixed(0) : v.toFixed(1)) + "%"; })();

  const streams = [
    { key: "membership", name: "Employer memberships", values: membership, color: COLORS.membership },
    { key: "fees", name: "Recruitment success fees", values: fees, color: COLORS.fees },
    { key: "edu", name: "Education partnerships", values: edu, color: COLORS.edu },
    { key: "referral", name: "Referral commissions", values: referral, color: COLORS.referral },
  ];

  return (
    <Page wide eyebrow="REVENUE" title="Four revenue streams"
      sub="The simulated operating model at scale: memberships, success fees, education partnerships and referral commissions."
      actions={<>
        <DemoTag>Illustrative future state</DemoTag>
        <Button iconRight="arrowRight" onClick={() => nav.setTab("forecast")}>Forecast</Button>
      </>}>

      <Note tone="warn" icon="info">
        Simulated future-state figures for an investor demonstration. O'Farrell Sterling was incorporated in June 2026 and Recruit is not yet operating, so none of these are actual company financial results.
      </Note>

      <Grid cols="rc-g4">
        <StreamCard color={COLORS.membership} title="Employer membership revenue" value={eur(mt.revenue)} unit="a year, simulated annualised"
          formula={num(mt.accounts) + " accounts across five tiers at current prices"} values={membership} onClick={() => nav.setTab("memberships")} />
        <StreamCard color={COLORS.fees} title="Recruitment success fees" value={eur(fees[last])} unit="this month"
          formula={num(MARKET.placementsThisMonth) + " placements x " + eur(MARKET.avgPlacementSalary) + " x " + ratePct} values={fees} onClick={() => nav.setTab("commissions")} />
        <StreamCard color={COLORS.edu} title="Education partnership revenue" value={eur(edu[last])} unit="this month, concept"
          formula="Five fictional partners, none signed. Excludes referral share" values={edu} onClick={() => nav.go("hq.learning", "referrals")} />
        <StreamCard color={COLORS.referral} title="Education referral commissions" value={eur(referral[last])} unit="this month, concept"
          formula={pct(refShare) + " of education income, from Recruit referrals (concept)"} values={referral} onClick={() => nav.go("hq.learning", "referrals")} />
      </Grid>

      <Grid cols="rc-g-2-1">
        <Card title="Monthly revenue by stream" sub={SCENARIO_CAPTION + ". Hover a month for the split."} action={<DemoTag />}>
          <StackedBars labels={MONTHS} series={streams} height={262} format={v => eurK(v)} />
        </Card>
        <Card title="Revenue mix this month" sub="Share of the month's simulated revenue">
          <div className="rc-row rc-wrap" style={{ gap: 20, alignItems: "center" }}>
            <Donut size={150} thickness={16} center={eurK(month)} sub="this month"
              segments={streams.map(x => ({ label: x.name, value: x.values[last], color: x.color }))} />
            <div className="rc-grow" style={{ minWidth: 170 }}>
              <Legend items={streams.map(x => ({ label: x.name, value: pct(x.values[last] / month), color: x.color }))} />
            </div>
          </div>
          <div style={{ marginTop: 18, padding: "12px 14px", borderRadius: "var(--r-sm, 12px)", background: "var(--surface-2)", border: "1px solid var(--border)" }}>
            <Label>Annualised run-rate</Label>
            <div className="rc-row" style={{ alignItems: "baseline", gap: 8, marginTop: 6 }}>
              <span style={{ fontSize: 24, fontWeight: 600, letterSpacing: "-.8px" }}>{eurM(runRate)}</span>
              <span style={{ fontSize: 12, color: "var(--dim)" }}>at this month's pace, simulated</span>
            </div>
            <div style={{ fontSize: 11.5, color: "var(--faint)", marginTop: 4 }}>Membership at its annual value plus twelve months of this month's fees and education revenue.</div>
          </div>
        </Card>
      </Grid>

      <Grid cols="rc-g-3-2">
        <Card title="What employers keep this month" sub="Gross recruitment fee savings against a 25% agency fee. Explicit assumptions, not measured results."
          action={<Badge tone="teal" icon="trendUp">{eur(econ.saving)} saved</Badge>}>
          <div className="rc-row rc-wrap" style={{ gap: 10, alignItems: "stretch" }}>
            <Assumption label="Placements this month" value={num(econ.placements)} />
            <Op>x</Op>
            <Assumption label="Average salary" value={eur(econ.avgSalary)} />
            <Op>x</Op>
            <Assumption label="Agency vs Recruit" value={pct(econ.agencyRate) + " vs " + ratePct} />
          </div>
          <div style={{ marginTop: 18 }}>
            <BarList max={econ.agencyFees} items={[
              { label: "Agency fees at " + pct(econ.agencyRate), value: econ.agencyFees, display: eur(econ.agencyFees), color: "var(--warn)" },
              { label: "Recruit success fees at " + ratePct, value: econ.recruitFees, display: eur(econ.recruitFees), color: "var(--teal, #16B8A6)" },
            ]} />
          </div>
          <div className="rc-row" style={{ marginTop: 16, gap: 12, padding: "12px 14px", borderRadius: "var(--r-sm, 12px)", background: "var(--teal-soft, var(--ok-soft))", border: "1px solid color-mix(in oklab, var(--teal, var(--ok)) 35%, transparent)" }}>
            <Icon name="euro" size={16} color="var(--teal, var(--ok))" />
            <div className="rc-grow" style={{ fontSize: 13, color: "var(--body)" }}>
              Gross recruitment fee savings across employers: <b style={{ color: "var(--ink)", fontWeight: 600 }}>{eur(econ.saving)}</b> this month.
            </div>
          </div>
          <div style={{ fontSize: 11.5, color: "var(--faint)", marginTop: 10 }}>Before membership fees. Savings per employer depend on salary, tier and how many hires they make.</div>
        </Card>

        <Card title="Unconfirmed services" sub="Possible extra revenue lines. Not included in any figure on this page." action={<Badge tone="warn" icon="alert">Unconfirmed</Badge>}>
          {UNCONFIRMED_SERVICES.map((u, i) => (
            <div key={u.label} className="rc-row" style={{ alignItems: "flex-start", gap: 11, padding: "11px 0", borderTop: i ? "1px solid var(--border)" : 0 }}>
              <span style={{ width: 26, height: 26, flex: "none", borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", border: "1px dashed var(--border-strong)", color: "var(--faint)" }}>
                <Icon name="plus" size={12} />
              </span>
              <div className="rc-grow">
                <div style={{ fontSize: 13, fontWeight: 500, color: "var(--ink)" }}>{u.label}</div>
                <div style={{ fontSize: 12, color: "var(--dim)", marginTop: 3, lineHeight: 1.5 }}>{u.note}</div>
              </div>
            </div>
          ))}
          <Note style={{ marginTop: 10 }}>Each is a commercial concept for discussion with the founder. None is priced, sold or modelled in the totals.</Note>
        </Card>
      </Grid>
    </Page>
  );
}

function StreamCard({ color, title, value, unit, formula, values, onClick }: {
  color: string; title: string; value: string; unit: string; formula: string; values: number[]; onClick: () => void;
}) {
  return (
    <Card onClick={onClick} pad="18px 18px 16px">
      <div className="rc-row" style={{ gap: 8, minHeight: 20 }}>
        <span style={{ width: 8, height: 8, borderRadius: 3, background: color, flex: "none" }} />
        <span className="rc-grow rc-ellipsis" style={{ fontSize: 12.5, color: "var(--dim)" }}>{title}</span>
      </div>
      <div style={{ fontSize: 26, fontWeight: 600, letterSpacing: "-1px", marginTop: 12, lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>{value}</div>
      <div style={{ fontSize: 11.5, color: "var(--faint)", marginTop: 5 }}>{unit}</div>
      <div className="rc-row" style={{ marginTop: 12, gap: 10, alignItems: "flex-end" }}>
        <div className="rc-grow" style={{ fontSize: 11.5, color: "var(--body)", lineHeight: 1.45 }}>{formula}</div>
        <Sparkline values={values} color={color} width={78} height={28} />
      </div>
    </Card>
  );
}

function Assumption({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ flex: "1 1 120px", padding: "10px 12px", borderRadius: "var(--r-sm, 12px)", background: "var(--surface-2)", border: "1px solid var(--border)", minWidth: 0 }}>
      <Label style={{ fontSize: 8.5 }}>{label}</Label>
      <div style={{ fontSize: 17, fontWeight: 600, letterSpacing: "-.4px", marginTop: 5 }}>{value}</div>
    </div>
  );
}
const Op = ({ children }: { children: ReactNode }) => <span style={{ alignSelf: "center", color: "var(--faint)", fontSize: 14 }}>{children}</span>;

/* ── stacked monthly bars ───────────────────────────────────────────────── */

const niceMax = (v: number) => {
  if (v <= 0) return 1;
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  const m = v / p;
  return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 2.5 ? 2.5 : m <= 5 ? 5 : 10) * p;
};

function useReducedMotion() {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduce(mq.matches);
    const on = () => setReduce(mq.matches);
    mq.addEventListener?.("change", on);
    return () => mq.removeEventListener?.("change", on);
  }, []);
  return reduce;
}

function StackedBars({ labels, series, height = 250, format }: {
  labels: string[]; series: { name: string; values: number[]; color: string }[]; height?: number; format: (v: number) => string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(0);
  const [hover, setHover] = useState<number | null>(null);
  const reduce = useReducedMotion();
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    setW(el.clientWidth);
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => setW(el.clientWidth));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const totals = labels.map((_, i) => series.reduce((t, x) => t + (x.values[i] || 0), 0));
  const hi = niceMax(Math.max(...totals) * 1.04);
  const padL = 54, padR = 6, padT = 12, padB = 24;
  const iw = Math.max(10, w - padL - padR), ih = height - padT - padB;
  const slot = iw / labels.length;
  const bw = Math.max(8, Math.min(36, slot * 0.58));
  const y = (v: number) => padT + ih - (v / hi) * ih;
  const shown = hover ?? labels.length - 1;
  return (
    <div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 14, marginBottom: 10 }}>
        {series.map(x => (
          <span key={x.name} style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: 11.5, color: "var(--dim)" }}>
            <span style={{ width: 9, height: 9, borderRadius: 3, background: x.color }} />{x.name}
          </span>
        ))}
      </div>
      <div ref={ref} style={{ position: "relative", width: "100%", height }} onMouseLeave={() => setHover(null)}>
        {w > 0 && (
          <svg width={w} height={height} style={{ display: "block" }} role="img" aria-label="Monthly revenue by stream">
            {[0, 0.25, 0.5, 0.75, 1].map(t => (
              <g key={t}>
                <line x1={padL} x2={w - padR} y1={y(hi * t)} y2={y(hi * t)} stroke="var(--border)" strokeDasharray={t ? "3 4" : undefined} />
                <text x={padL - 8} y={y(hi * t) + 3.5} textAnchor="end" fontSize="10" fill="var(--faint)" fontFamily="var(--mono)">{format(hi * t)}</text>
              </g>
            ))}
            {labels.map((l, i) => {
              const cx = padL + slot * (i + 0.5);
              let acc = 0;
              return (
                <g key={l + i} onMouseEnter={() => setHover(i)}>
                  <rect x={padL + slot * i} y={padT} width={slot} height={ih} rx={8} fill={hover === i ? "var(--surface-2)" : "transparent"} />
                  {series.map((x, si) => {
                    const v = x.values[i] || 0;
                    const top = y(acc + v), bottom = y(acc);
                    acc += v;
                    return (
                      <rect key={si} x={cx - bw / 2} y={top} width={bw} height={Math.max(0.5, bottom - top - (si ? 1.5 : 0))} rx={2.5} fill={x.color}
                        opacity={hover === null || hover === i ? 1 : 0.5}
                        style={reduce ? undefined : { transformOrigin: cx + "px " + (padT + ih) + "px", animation: "rcGrowY .8s cubic-bezier(.16,1,.3,1) " + i * 30 + "ms both" }} />
                    );
                  })}
                  <text x={cx} y={height - 6} textAnchor="middle" fontSize="10" fill={hover === i ? "var(--ink)" : "var(--faint)"} fontFamily="var(--mono)">{l}</text>
                </g>
              );
            })}
          </svg>
        )}
        {w > 0 && (
          <div style={{ position: "absolute", top: 0, left: Math.min(Math.max(padL + slot * (shown + 0.5) - 88, 0), Math.max(0, w - 176)), width: 176, pointerEvents: "none",
            padding: "8px 10px", background: "var(--tooltip)", border: "1px solid var(--border)", borderRadius: 10, boxShadow: "0 10px 30px rgba(0,0,0,.35)", fontSize: 11.5,
            opacity: hover === null ? 0 : 1, transition: reduce ? undefined : "opacity .2s var(--ease), left .2s var(--ease)" }}>
            <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--faint)" }}>{labels[shown]}, scenario year 2</div>
            {series.map(x => (
              <div key={x.name} style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4, color: "var(--tooltip-ink, var(--ink))" }}>
                <span style={{ width: 7, height: 7, borderRadius: 2, background: x.color }} />
                <span style={{ flex: 1, color: "var(--dim)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{x.name}</span>
                <b style={{ fontWeight: 600 }}>{format(x.values[shown] || 0)}</b>
              </div>
            ))}
            <div style={{ display: "flex", marginTop: 6, paddingTop: 6, borderTop: "1px solid var(--border)", color: "var(--tooltip-ink, var(--ink))" }}>
              <span style={{ flex: 1, color: "var(--dim)" }}>Total</span><b style={{ fontWeight: 600 }}>{format(totals[shown])}</b>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
