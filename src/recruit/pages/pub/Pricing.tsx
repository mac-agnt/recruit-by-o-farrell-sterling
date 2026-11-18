import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { Badge, Button, Card, DemoTag, KV, Note, Page, Section, Slider } from "../../ui";
import { Donut, Legend, SERIES_COLORS, StackBar } from "../../charts";
import { Icon } from "../../icons";
import { useNav } from "../../nav";
import { DEFAULT_CALC, useRecruit } from "../../store";
import { membershipTotals } from "../../selectors";
import { EMPLOYER_BY_ID, MARKET, tierFor, type Tier } from "../../data";
import { eur, eurK, eurM, num, pct } from "../../format";

/* Membership and pricing: the five annual tiers (live from the shared state,
   so HQ price edits show here), the proposed success fee, and a worked
   example. Everything is a proposed model, not contractual pricing. */

const SIZE_MAX = 800;
const and = (list: string[]) => (list.length < 2 ? list.join("") : list.slice(0, -1).join(", ") + " and " + list[list.length - 1]);
const sizeFor = (t: Tier) => (t.max === null ? t.min + 149 : Math.round((t.min + t.max) / 2));

export default function Pricing() {
  const s = useRecruit();
  const nav = useNav();
  const [employees, setEmployees] = useState(EMPLOYER_BY_ID["e-harbourview"]?.employees ?? 220);
  const [salary, setSalary] = useState(DEFAULT_CALC.salary);
  const [hires, setHires] = useState(1);

  const tier = tierFor(employees, s.tiers);
  const rate = s.commissionRules.find(r => r.id === "cr1")?.rate ?? MARKET.recruitDefaultRate;
  const agencyRate = MARKET.agencyBenchmarkRate;
  const agencyTotal = salary * agencyRate * hires;
  const feeTotal = salary * rate * hires;
  const recruitTotal = feeTotal + tier.price;
  const gross = agencyTotal - feeTotal;
  const net = gross - tier.price;
  const scaleMax = Math.max(agencyTotal, recruitTotal);
  const exec = s.commissionRules.find(r => r.id === "cr3");
  const execFrom = exec ? Number(exec.applies.replace(/[^0-9]/g, "")) : NaN;
  const confirmed = s.tiers.filter(t => t.confirmed);
  const assumed = s.tiers.filter(t => !t.confirmed);

  return (
    <Page wide eyebrow="MEMBERSHIP AND PRICING" title="Annual membership. A fairer success fee."
      sub="Employers pay an annual membership by company size, and a success fee only when a hire starts. This is a proposed model, not final contractual pricing."
      actions={<Button variant="primary" icon="costs" onClick={() => nav.go("emp.costs", "membership")}>Employer membership</Button>}>

      {/* Tiers */}
      <Card title="Annual membership" sub="Five tiers by company size. Drag to your headcount or pick a tier."
        action={<span className="rc-row rc-wrap" style={{ gap: 6, justifyContent: "flex-end" }}><SourceBadge confirmed /><SourceBadge confirmed={false} /></span>}>
        <div style={{ maxWidth: 560 }}>
          <Slider label="Your company size" value={employees} min={1} max={SIZE_MAX} onChange={setEmployees}
            display={(employees >= SIZE_MAX ? num(SIZE_MAX) + "+" : num(employees)) + " employees"} />
        </div>
        <TierGrid>
          {s.tiers.map(t => <TierCard key={t.id} t={t} active={t.id === tier.id} onPick={() => setEmployees(sizeFor(t))} />)}
        </TierGrid>
        <div style={{ fontSize: 12, color: "var(--dim)", marginTop: 14, lineHeight: 1.55 }}>
          {and(confirmed.map(t => t.label))} prices come from the founder. {and(assumed.map(t => t.label))} {assumed.length === 1 ? "is a concept assumption" : "are concept assumptions"} for this demo, set between the founder's tiers.
        </div>
      </Card>

      {/* Success fee */}
      <Row>
        <Cell basis={400} grow={3}>
          <Card title="Success fee, worked through" sub={"Against a typical agency fee, with the " + tier.label + " membership for " + tier.band + "."} action={<DemoTag />} style={{ flex: 1 }}>
            <div className="rc-col" style={{ gap: 16 }}>
              <Slider label="Salary of the hire" value={salary} min={40000} max={200000} step={1000} onChange={setSalary} display={eur(salary)} />
              <Slider label="Hires in the first year" value={hires} min={1} max={10} onChange={setHires} display={hires === 1 ? "1 hire" : hires + " hires"} />
            </div>
            <div style={{ marginTop: 22 }}>
              <CompareRow label={"Typical agency at " + pct(agencyRate)} value={eur(agencyTotal)}>
                <StackBar height={12} total={scaleMax} parts={[{ label: "Agency fees", value: agencyTotal, color: "color-mix(in oklab, var(--warn) 75%, transparent)" }]} />
              </CompareRow>
              <CompareRow label={"Recruit at " + pct(rate) + ", plus membership"} value={eur(recruitTotal)}>
                <StackBar height={12} total={scaleMax} parts={[
                  { label: "Success fees", value: feeTotal, color: "var(--accent)" },
                  { label: tier.label + " membership", value: tier.price, color: "var(--teal, #16B8A6)" },
                ]} />
              </CompareRow>
              <div className="rc-row rc-wrap" style={{ gap: 16, marginTop: 10, fontSize: 11.5, color: "var(--dim)" }}>
                <Key color="color-mix(in oklab, var(--warn) 75%, transparent)" label="Agency fee" />
                <Key color="var(--accent)" label="Recruit success fee" />
                <Key color="var(--teal, #16B8A6)" label={tier.label + " membership, " + eur(tier.price) + " a year"} />
              </div>
            </div>
            <div className="rc-row rc-wrap" style={{ gap: 20, marginTop: 20, paddingTop: 16, borderTop: "1px solid var(--border)", alignItems: "flex-end" }}>
              <div style={{ flex: "1 1 200px" }}>
                <div style={{ fontSize: 34, fontWeight: 600, letterSpacing: "-1.3px", lineHeight: 1, fontVariantNumeric: "tabular-nums", color: net >= 0 ? "var(--teal, var(--ok))" : "var(--warn)" }}>{eur(Math.abs(net))}</div>
                <div style={{ fontSize: 12.5, color: "var(--dim)", marginTop: 7 }}>{net >= 0 ? "Net saving in the first year, after membership" : "More than the agency route in the first year"}</div>
              </div>
              <div style={{ flex: "2 1 300px" }}>
                <KV cols={2} items={[
                  { k: "Agency fee per hire", v: eur(salary * agencyRate) },
                  { k: "Recruit fee per hire", v: eur(salary * rate) },
                  { k: "Gross saving", v: eur(gross) },
                  { k: "Membership", v: eur(tier.price) + " (" + tier.label + ")" },
                ]} />
              </div>
            </div>
            {exec && Number.isFinite(execFrom) && salary > execFrom && (
              <Note icon="info" tone="warn" style={{ marginTop: 14 }}>
                {exec.applies} may carry a {pct(exec.rate)} executive rate ({exec.note.toLowerCase()}). This example keeps the standard {pct(rate)}.
              </Note>
            )}
          </Card>
        </Cell>
        <Cell basis={320} grow={2}>
          <Card title="How the fee compares" sub="Recruit's proposed rate against the range agencies typically charge." style={{ flex: 1 }}>
            <FeeScale rate={rate} benchmark={agencyRate} />
            <div style={{ fontSize: 12.5, color: "var(--body)", lineHeight: 1.6, marginTop: 4 }}>
              In the founder's experience, agencies charge 15 to 35% of first-year salary. Recruit proposes {pct(rate)}, charged only when a hire starts.
            </div>
            <div style={{ marginTop: 16 }}>
              {s.commissionRules.filter(r => r.id !== "cr4").map(r => {
                const proposed = /^proposed/i.test(r.note);
                const rest = r.note.replace(/^proposed,?\s*/i, "");
                return (
                  <div key={r.id} className="rc-row" style={{ gap: 12, padding: "11px 0", borderTop: "1px solid var(--border)", alignItems: "flex-start" }}>
                    <div className="rc-grow">
                      <div className="rc-row" style={{ gap: 8 }}>
                        <span style={{ fontSize: 13, color: "var(--ink)", fontWeight: 500 }}>{r.label}</span>
                        {proposed && <Badge tone="warn">Proposed</Badge>}
                      </div>
                      <div style={{ fontSize: 11.5, color: "var(--dim)", marginTop: 3, lineHeight: 1.45 }}>
                        {r.applies}.{rest && " " + rest.charAt(0).toUpperCase() + rest.slice(1) + "."}
                      </div>
                    </div>
                    <span style={{ fontSize: 18, fontWeight: 600, letterSpacing: "-.5px", color: r.id === "cr1" ? "var(--accent)" : "var(--ink)", fontVariantNumeric: "tabular-nums" }}>{pct(r.rate)}</span>
                  </div>
                );
              })}
            </div>
          </Card>
        </Cell>
      </Row>

      {/* Provenance and scale */}
      <Section title="Where these numbers come from" sub="What is confirmed, what is assumed and what is proposed.">
        <Row>
          <Cell basis={380} grow={3}>
            <Card style={{ flex: 1 }}>
              <Source icon="verified" tone="var(--teal, var(--ok))" title="From the founder"
                body={and(confirmed.map(t => t.label + " (" + t.band + ", " + eur(t.price) + ")")) + "."} />
              <Source icon="info" tone="var(--warn)" title="Concept assumptions"
                body={and(assumed.map(t => t.label + " (" + t.band + ", " + eur(t.price) + ")")) + ", set between the founder's tiers for the demo."} />
              <Source icon="euro" tone="var(--accent)" title="Proposed success fee"
                body={pct(rate) + " as standard. Volume and executive variations are under review."} />
              <Source icon="clock" tone="var(--dim)" title="Typical agency fees"
                body="15 to 35% of first-year salary, from the founder's experience of the market." />
              <Source icon="lock" tone="var(--dim)" title="No payment is taken in this demo"
                body="Plan changes in the employer portal are simulated and logged as previews." last />
            </Card>
          </Cell>
          <Cell basis={320} grow={2}>
            <ScaleCard />
          </Cell>
        </Row>
      </Section>
    </Page>
  );
}

/* ── pieces ─────────────────────────────────────────────────────────────── */

function SourceBadge({ confirmed }: { confirmed: boolean }) {
  return confirmed
    ? <Badge tone="teal" icon="verified">From the founder</Badge>
    : <Badge tone="warn" icon="info">Concept assumption</Badge>;
}

/** Five tiers in one row when there is room, otherwise three over two with no empty cell. */
function TierGrid({ children }: { children: ReactNode[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(0);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    setW(el.clientWidth);
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => setW(el.clientWidth));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const mode = w === 0 || w >= 940 ? "row" : w >= 520 ? "split" : "stack";
  const cols = mode === "row" ? "repeat(" + children.length + ", minmax(0, 1fr))" : mode === "split" ? "repeat(6, minmax(0, 1fr))" : "minmax(0, 1fr)";
  return (
    <div ref={ref} style={{ display: "grid", gridTemplateColumns: cols, gap: 12, marginTop: 18 }}>
      {children.map((child, i) => (
        <div key={i} style={{ display: "flex", minWidth: 0, gridColumn: mode === "split" ? (i < 3 ? "span 2" : "span 3") : undefined }}>{child}</div>
      ))}
    </div>
  );
}

function TierCard({ t, active, onPick }: { t: Tier; active: boolean; onPick: () => void }) {
  return (
    <button onClick={onPick} className="rc-card rc-click rc-focus" aria-pressed={active}
      style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", textAlign: "left", padding: 18, borderRadius: "var(--card-r, 18px)", cursor: "pointer", color: "inherit",
        background: active ? "linear-gradient(165deg, color-mix(in oklab, #4263EB 20%, var(--surface-2)) 0%, var(--surface-2) 70%)" : "var(--surface-2)",
        border: "1px solid " + (active ? "var(--accent-line)" : "var(--border)"), boxShadow: active ? "0 0 0 1px var(--accent-line), 0 14px 34px rgba(0,0,0,.14)" : "none" }}>
      <div style={{ height: 22, marginBottom: 8 }}>
        {active ? <Badge tone="accent" icon="check">Your size</Badge> : <span style={{ fontFamily: "var(--mono)", fontSize: 9.5, letterSpacing: ".12em", color: "var(--faint)", lineHeight: "22px" }}>TIER {t.id}</span>}
      </div>
      <div style={{ fontSize: 15, fontWeight: 600, color: "var(--ink)" }}>{t.label}</div>
      <div style={{ fontSize: 12, color: "var(--dim)", marginTop: 3 }}>{t.band}</div>
      <div className="rc-row" style={{ alignItems: "baseline", gap: 5, marginTop: 16 }}>
        <span style={{ fontSize: 28, fontWeight: 600, letterSpacing: "-1px", color: "var(--ink)", fontVariantNumeric: "tabular-nums" }}>{eur(t.price)}</span>
        <span style={{ fontSize: 12, color: "var(--faint)" }}>a year</span>
      </div>
      <div style={{ marginTop: 10 }}><SourceBadge confirmed={t.confirmed} /></div>
      <div style={{ height: 1, background: "var(--border)", margin: "14px 0 12px" }} />
      <div className="rc-col" style={{ gap: 8 }}>
        {t.perks.map(p => (
          <div key={p} className="rc-row" style={{ gap: 8, alignItems: "flex-start", fontSize: 12.5, color: "var(--body)", lineHeight: 1.4 }}>
            <Icon name="check" size={13} stroke={2.3} style={{ color: "var(--teal, var(--ok))", marginTop: 2 }} />{p}
          </div>
        ))}
      </div>
    </button>
  );
}

function CompareRow({ label, value, children }: { label: string; value: string; children: ReactNode }) {
  return (
    <div style={{ marginTop: 14 }}>
      <div className="rc-row" style={{ fontSize: 12.5, marginBottom: 8 }}>
        <span className="rc-grow" style={{ color: "var(--body)" }}>{label}</span>
        <b style={{ fontWeight: 600, color: "var(--ink)", fontVariantNumeric: "tabular-nums" }}>{value}</b>
      </div>
      {children}
    </div>
  );
}

function Key({ color, label }: { color: string; label: string }) {
  return <span className="rc-row" style={{ gap: 6 }}><span style={{ width: 9, height: 9, borderRadius: 3, background: color, flex: "none" }} />{label}</span>;
}

/** Agency fee band, the agency benchmark and Recruit's proposed rate on a 0 to 35% axis. */
function FeeScale({ rate, benchmark }: { rate: number; benchmark: number }) {
  const max = 0.35;
  const x = (v: number) => (Math.min(v, max) / max) * 100;
  return (
    <div style={{ position: "relative", height: 86, margin: "14px 0 8px" }}>
      <div style={{ position: "absolute", left: 0, right: 0, top: 34, height: 8, borderRadius: 999, background: "var(--track)" }} />
      <div title="Typical agency fees" style={{ position: "absolute", top: 32, height: 12, left: x(0.15) + "%", width: x(0.35) - x(0.15) + "%", borderRadius: 999,
        background: "repeating-linear-gradient(135deg, color-mix(in oklab, var(--warn) 62%, transparent) 0 5px, color-mix(in oklab, var(--warn) 24%, transparent) 5px 10px)" }} />
      <span style={{ position: "absolute", top: 6, left: x(0.25) + "%", transform: "translateX(-50%)", fontSize: 11, color: "var(--warn)", whiteSpace: "nowrap" }}>Agencies 15 to 35%</span>
      <span title="Agency benchmark used in the examples" style={{ position: "absolute", top: 28, left: x(benchmark) + "%", width: 2, height: 20, marginLeft: -1, borderRadius: 2, background: "var(--warn)" }} />
      <span style={{ position: "absolute", top: 52, left: x(benchmark) + "%", transform: "translateX(-50%)", fontSize: 10.5, color: "var(--dim)", whiteSpace: "nowrap" }}>Benchmark {pct(benchmark)}</span>
      <div style={{ position: "absolute", top: 0, left: x(rate) + "%", transform: "translateX(-50%)", display: "flex", flexDirection: "column", alignItems: "center" }}>
        <span style={{ fontSize: 11.5, fontWeight: 600, color: "var(--accent)", whiteSpace: "nowrap" }}>Recruit {pct(rate)}</span>
        <span style={{ width: 3, height: 30, marginTop: 4, borderRadius: 2, background: "var(--accent)", boxShadow: "0 0 10px var(--accent-soft)" }} />
      </div>
      {[0, 0.1, 0.2, 0.3].map(t => (
        <span key={t} style={{ position: "absolute", top: 70, left: x(t) + "%", transform: t ? "translateX(-50%)" : "none", fontFamily: "var(--mono)", fontSize: 10, color: "var(--faint)" }}>{pct(t)}</span>
      ))}
    </div>
  );
}

function Source({ icon, tone, title, body, last }: { icon: string; tone: string; title: string; body: string; last?: boolean }) {
  return (
    <div className="rc-row" style={{ gap: 12, alignItems: "flex-start", padding: "12px 0", borderBottom: last ? 0 : "1px solid var(--border)" }}>
      <span style={{ width: 28, height: 28, flex: "none", borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", background: "var(--surface-2)", border: "1px solid var(--border)", color: tone }}>
        <Icon name={icon} size={14} />
      </span>
      <div className="rc-grow">
        <div style={{ fontSize: 13, fontWeight: 500, color: "var(--ink)" }}>{title}</div>
        <div style={{ fontSize: 12, color: "var(--dim)", marginTop: 3, lineHeight: 1.5 }}>{body}</div>
      </div>
    </div>
  );
}

function ScaleCard() {
  const s = useRecruit();
  const { revenue, accounts } = membershipTotals(s);
  const color = (i: number) => SERIES_COLORS[i % SERIES_COLORS.length];
  return (
    <Card title="Membership at scale" sub={num(accounts) + " member employers in the illustrative future-state scenario"} action={<DemoTag />} style={{ flex: 1 }}>
      <div className="rc-row rc-wrap" style={{ gap: 22, alignItems: "center" }}>
        <Donut size={156} thickness={16} center={eurM(revenue)} sub="a year"
          segments={s.tiers.map((t, i) => ({ label: t.label, value: t.price * t.accounts, color: color(i) }))} />
        <div style={{ flex: "1 1 170px", minWidth: 0 }}>
          <Legend items={s.tiers.map((t, i) => ({ label: t.label + ", " + num(t.accounts), value: eurK(t.price * t.accounts), color: color(i) }))} />
        </div>
      </div>
      <div style={{ fontSize: 11.5, color: "var(--faint)", marginTop: 14, lineHeight: 1.5 }}>
        Annual membership revenue only, before success fees. Account numbers per tier are scenario assumptions.
      </div>
    </Card>
  );
}

/* ── layout helpers ─────────────────────────────────────────────────────── */

function Row({ children }: { children: ReactNode }) {
  return <div style={{ display: "flex", flexWrap: "wrap", gap: 14, alignItems: "stretch" }}>{children}</div>;
}
function Cell({ basis, grow = 1, children }: { basis: number; grow?: number; children: ReactNode }) {
  return <div style={{ flex: grow + " 1 " + basis + "px", minWidth: 0, display: "flex", flexDirection: "column", gap: 14 }}>{children}</div>;
}
