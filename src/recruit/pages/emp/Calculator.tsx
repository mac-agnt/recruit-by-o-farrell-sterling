import { useState, type ReactNode } from "react";
import { Badge, Button, Card, Chip, DemoTag, Field, Grid, Label, Note, Page, Select, Slider, Toggle } from "../../ui";
import { Icon } from "../../icons";
import { useNav } from "../../nav";
import { DEFAULT_CALC, setCalc, useRecruit } from "../../store";
import { calcResult } from "../../selectors";
import { EMPLOYER_BY_ID, tierFor } from "../../data";
import { eur, eurK } from "../../format";
import { HV_MEMBERSHIP, yearTotals } from "./hiringKit";

/* The business model in one screen: a traditional agency fee against Recruit's
   success fee and membership, for one hire and for a year of hiring. */

const pctLabel = (r: number) => { const v = Math.round(r * 1000) / 10; return (Number.isInteger(v) ? v : v.toFixed(1)) + "%"; };
const PRESETS = [15, 20, 25, 30, 35];
const HATCH = "repeating-linear-gradient(135deg, color-mix(in oklab, var(--teal, #16B8A6) 30%, transparent) 0 6px, color-mix(in oklab, var(--teal, #16B8A6) 12%, transparent) 6px 12px)";

interface CompRow { label: string; agency: ReactNode; recruit: ReactNode; strong?: boolean }

export default function Calculator() {
  const s = useRecruit();
  const nav = useNav();
  const [hires, setHires] = useState(3);
  const { salary, agencyRate, recruitRate, membership, includeMembership } = s.calc;
  const r = calcResult(s);
  const mem = includeMembership ? membership : 0;
  const recruitTotal = r.recruitFee + mem;
  const scale = Math.max(r.agencyFee, recruitTotal, 1);
  const cheaper = r.net >= 0;
  const emp = EMPLOYER_BY_ID[s.employerId];
  const band = tierFor(emp?.employees || 0, s.tiers);
  const plan = s.tiers.find(t => t.price === membership);
  const planName = plan ? plan.label : "Custom";
  const tierOptions = s.tiers.map(t => ({ value: String(t.price), label: t.label + " · " + eur(t.price) }));
  if (!s.tiers.some(t => t.price === membership)) tierOptions.unshift({ value: String(membership), label: "Custom · " + eur(membership) });

  const annual = (n: number) => n * r.gross - mem;
  const yearly = Array.from({ length: 12 }, (_, i) => Math.max(0, annual(i + 1)));
  const year = yearTotals(s);

  const rows: CompRow[] = [
    { label: "Annual salary", agency: eur(salary), recruit: eur(salary) },
    { label: "Commission", agency: pctLabel(agencyRate), recruit: pctLabel(recruitRate) + " success fee" },
    { label: "Recruitment fee", agency: eur(r.agencyFee), recruit: eur(r.recruitFee), strong: true },
    { label: "Membership, first year", agency: <span style={{ color: "var(--faint)" }}>None</span>, recruit: includeMembership ? eur(membership) + " (" + planName + ")" : <span style={{ color: "var(--faint)" }}>Not included</span> },
    { label: "First-year cost of this hire", agency: eur(r.agencyFee), recruit: eur(recruitTotal), strong: true },
  ];

  return (
    <Page wide eyebrow="COSTS AND MEMBERSHIP" title="What a hire really costs"
      sub="A traditional agency charges a share of the salary on every hire. Recruit charges a smaller success fee and one annual membership."
      actions={<>
        <Button icon="refresh" onClick={() => { setCalc({ ...DEFAULT_CALC }); setHires(3); }}>Reset</Button>
        <Button variant="primary" icon="costs" onClick={() => nav.go("emp.costs", "membership")}>See membership plans</Button>
      </>}>

      <Grid cols="rc-g-1-2">
        <Card title="Your hire" sub="Move the sliders to match the role you're filling.">
          <div className="rc-col" style={{ gap: 22 }}>
            <Slider label="Annual salary" display={eur(salary)} min={30000} max={250000} step={1000} value={salary} onChange={v => setCalc({ salary: v })} />
            <div className="rc-col" style={{ gap: 10 }}>
              <Slider label="Traditional agency rate" display={pctLabel(agencyRate)} min={15} max={35} step={1} value={Math.round(agencyRate * 100)} onChange={v => setCalc({ agencyRate: v / 100 })} />
              <div className="rc-row rc-wrap" style={{ gap: 6 }}>
                {PRESETS.map(p => <Chip key={p} active={Math.round(agencyRate * 100) === p} onClick={() => setCalc({ agencyRate: p / 100 })}>{p}%</Chip>)}
              </div>
            </div>
            <Slider label="Recruit success fee" display={pctLabel(recruitRate)} min={5} max={12} step={0.5} value={Math.round(recruitRate * 1000) / 10} onChange={v => setCalc({ recruitRate: v / 100 })} />
            <Field label="Membership plan" hint={"Harbourview's size band (" + (emp?.employees || 0) + " employees) is " + band.label + ". Tiers 1, 2 and 5 come from the founder; tiers 3 and 4 are concept assumptions."}>
              <Select value={String(membership)} onChange={v => setCalc({ membership: Number(v) })} options={tierOptions} />
            </Field>
            <Toggle on={includeMembership} onChange={v => setCalc({ includeMembership: v })} label="Include membership in first-year cost"
              sub="One membership covers every hire in the year, so it's counted once." />
          </div>
        </Card>

        <Card pad={24} style={{ display: "flex", flexDirection: "column", background: "linear-gradient(150deg, color-mix(in oklab, #4263EB 14%, var(--surface)) 0%, var(--surface) 46%, color-mix(in oklab, #16B8A6 9%, var(--surface)) 100%)" }}>
          <div className="rc-row" style={{ gap: 8 }}>
            <Label>For one hire at {eur(salary)}</Label>
            <span className="rc-grow" />
            <DemoTag>Proposed pricing</DemoTag>
          </div>
          <div className="rc-grid rc-g2" style={{ gap: 12, marginTop: 14 }}>
            <div style={{ padding: "16px 18px", borderRadius: 18, border: "1px solid var(--accent-line)", background: "var(--accent-faint)" }}>
              <div style={{ fontSize: 12, color: "var(--dim)" }}>Gross estimated saving</div>
              <div style={{ fontSize: "clamp(30px, 3.4vw, 42px)", fontWeight: 600, letterSpacing: "-1.6px", lineHeight: 1.05, marginTop: 8, color: r.gross >= 0 ? "var(--accent)" : "var(--warn)", fontVariantNumeric: "tabular-nums" }}>{eur(r.gross)}</div>
              <div style={{ fontSize: 12, color: "var(--faint)", marginTop: 8 }}>Agency fee minus Recruit's success fee</div>
            </div>
            <div style={{ padding: "16px 18px", borderRadius: 18, border: "1px solid color-mix(in oklab, var(--teal, #16B8A6) 45%, transparent)", background: "color-mix(in oklab, var(--teal, #16B8A6) 14%, var(--surface))" }}>
              <div style={{ fontSize: 12, color: "var(--body)" }}>First-year saving after membership</div>
              <div style={{ fontSize: "clamp(30px, 3.4vw, 42px)", fontWeight: 600, letterSpacing: "-1.6px", lineHeight: 1.05, marginTop: 8, color: cheaper ? "var(--teal, var(--ok))" : "var(--warn)", fontVariantNumeric: "tabular-nums" }}>{eur(r.net)}</div>
              <div style={{ fontSize: 12, color: "var(--dim)", marginTop: 8 }}>{includeMembership ? "After the " + eur(membership) + " " + planName + " membership" : "Membership not included"}</div>
            </div>
          </div>

          <div className="rc-col" style={{ gap: 20, margin: "26px 0 6px", flex: 1, justifyContent: "center" }}>
            <BarRow label={"Traditional agency at " + pctLabel(agencyRate)} value={eur(r.agencyFee)}
              layers={[{ from: 0, to: r.agencyFee / scale, bg: "color-mix(in oklab, var(--warn) 78%, var(--surface))" }]} />
            <BarRow label={"Recruit at " + pctLabel(recruitRate) + (includeMembership ? " plus membership" : "")} value={eur(recruitTotal)} accent
              layers={[
                ...(cheaper ? [{ from: recruitTotal / scale, to: r.agencyFee / scale, bg: HATCH }] : []),
                { from: 0, to: r.recruitFee / scale, bg: "var(--accent-fill, var(--accent))" },
                { from: r.recruitFee / scale, to: recruitTotal / scale, bg: "var(--teal, #16B8A6)" },
              ]} />
            <div className="rc-row rc-wrap" style={{ gap: 16, fontSize: 11.5, color: "var(--dim)" }}>
              <Key bg="color-mix(in oklab, var(--warn) 78%, var(--surface))">Agency fee</Key>
              <Key bg="var(--accent)">Recruit success fee</Key>
              {includeMembership && <Key bg="var(--teal, #16B8A6)">Membership</Key>}
              {cheaper && <Key bg={HATCH}>What you keep</Key>}
            </div>
          </div>

          <div className="rc-row rc-wrap" style={{ gap: 10, marginTop: 20, paddingTop: 16, borderTop: "1px solid var(--border)" }}>
            {cheaper ? (
              <>
                <span style={{ fontSize: 15, fontWeight: 600, color: "var(--ink)" }}>You keep {eur(r.net)} on this hire.</span>
                <span style={{ fontSize: 13, color: "var(--dim)" }}>Recruit costs {Math.round((recruitTotal / r.agencyFee) * 100)}% of the agency fee.</span>
              </>
            ) : (
              <span style={{ fontSize: 13, color: "var(--warn)" }}>At these settings the agency fee is lower for a single hire. Membership pays back across more hires.</span>
            )}
          </div>
        </Card>
      </Grid>

      <Grid cols="rc-g-3-2">
        <div className="rc-col" style={{ gap: 10 }}>
          <CompareTable rows={rows} caption="Fees are worked out on first-year base salary. Proposed pricing, not a quote." />
          <div className="rc-grid rc-g2" style={{ gap: 10 }}>
            <Outcome label="All-in rate on this hire" value={pctLabel(recruitTotal / salary)} sub={"Against " + pctLabel(agencyRate) + " for a traditional agency"} tone="var(--accent)" />
            <Outcome label="Membership pays for itself" value={r.gross > 0 ? (Math.ceil(membership / r.gross) <= 1 ? "On the first hire" : "After " + Math.ceil(membership / r.gross) + " hires") : "Not at these rates"}
              sub={r.gross > 0 ? "One hire saves " + eur(r.gross) + " before membership" : "The success fee is above the agency rate"} tone="var(--teal, var(--ok))" />
          </div>
        </div>
        <Card title="Hiring more than once" sub="Membership is paid once a year, however many people you hire.">
          <Slider label="Hires per year" display={hires + (hires === 1 ? " hire" : " hires")} min={1} max={12} value={hires} onChange={setHires} />
          <div className="rc-row" style={{ alignItems: "baseline", gap: 10, marginTop: 16 }}>
            <span style={{ fontSize: 30, fontWeight: 600, letterSpacing: "-1px", color: annual(hires) >= 0 ? "var(--teal, var(--ok))" : "var(--warn)", fontVariantNumeric: "tabular-nums" }}>{eur(annual(hires))}</span>
            <span style={{ fontSize: 12.5, color: "var(--dim)" }}>estimated annual saving</span>
          </div>
          <div style={{ fontSize: 12, color: "var(--faint)", marginTop: 4, lineHeight: 1.5 }}>
            Agency {eur(hires * r.agencyFee)} against Recruit {eur(hires * r.recruitFee + mem)} for {hires} {hires === 1 ? "hire" : "hires"} at {eurK(salary)}{includeMembership ? ", membership counted once" : ""}.
          </div>
          <SavingBars values={yearly} pick={hires} onPick={setHires} />
          <div style={{ fontSize: 11, color: "var(--faint)", textAlign: "center", marginTop: 6 }}>Annual saving by number of hires. Click a bar to choose.</div>
        </Card>
      </Grid>

      <Grid cols="rc-g2">
        <Card title="Harbourview so far this year" sub={year.count + " placements, " + eur(year.salaries) + " in combined salaries"}
          action={<Button size="sm" variant="ghost" iconRight="arrowRight" onClick={() => nav.go("emp.hiring", "placements")}>Placements</Button>}>
          <div className="rc-row rc-wrap" style={{ gap: 22, alignItems: "flex-end" }}>
            <div>
              <div style={{ fontSize: 30, fontWeight: 600, letterSpacing: "-1px", color: "var(--teal, var(--ok))", fontVariantNumeric: "tabular-nums" }}>{eur(year.net)}</div>
              <div style={{ fontSize: 12.5, color: "var(--dim)", marginTop: 4 }}>estimated saved after the {eur(HV_MEMBERSHIP.amount)} membership</div>
            </div>
            <div className="rc-col" style={{ gap: 4, fontSize: 12.5, color: "var(--dim)" }}>
              <span>Success fees at 8%: <b style={{ color: "var(--ink)", fontWeight: 600 }}>{eur(year.fees)}</b></span>
              <span>A 25% agency would have charged: <b style={{ color: "var(--ink)", fontWeight: 600 }}>{eur(year.agency)}</b></span>
            </div>
          </div>
        </Card>
        <Card title="How Recruit charges" action={<Badge tone="accent">Proposed</Badge>}>
          <div className="rc-col" style={{ gap: 10 }}>
            {[
              ["costs", "One annual membership, priced by company size, for the marketplace and your hiring tools."],
              ["placement", "A success fee only when someone you hired starts. No fee for searching or interviewing."],
              ["shield", "Candidates never pay to be found, and see who is interested before sharing contact details."],
            ].map(([icon, text]) => (
              <div key={icon} className="rc-row" style={{ alignItems: "flex-start", gap: 10 }}>
                <span style={{ width: 26, height: 26, flex: "none", borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", background: "var(--surface-2)", color: "var(--accent)" }}><Icon name={icon} size={13} /></span>
                <span style={{ fontSize: 12.5, lineHeight: 1.55, color: "var(--body)", paddingTop: 4 }}>{text}</span>
              </div>
            ))}
          </div>
        </Card>
      </Grid>

      <Note icon="info">
        Proposed commercial comparison. Pricing is not final and nothing here is a contractual quote. The 25% agency rate is a market benchmark, not a quote from any agency.{" "}
        <button className="rc-link" onClick={() => nav.go("emp.costs", "membership")}>Compare membership plans</button>
      </Note>
    </Page>
  );
}

/** A full-width track with clipped layers, so changes animate on clip-path rather than layout. */
function BarRow({ label, value, layers, accent }: { label: string; value: string; layers: { from: number; to: number; bg: string }[]; accent?: boolean }) {
  return (
    <div>
      <div className="rc-row" style={{ gap: 10 }}>
        <span className="rc-grow" style={{ fontSize: 13, color: "var(--body)" }}>{label}</span>
        <span style={{ fontSize: 16, fontWeight: 600, letterSpacing: "-.3px", color: accent ? "var(--ink)" : "var(--body)", fontVariantNumeric: "tabular-nums" }}>{value}</span>
      </div>
      <div style={{ position: "relative", height: 36, marginTop: 8, borderRadius: 11, background: "var(--track)", overflow: "hidden" }}>
        {layers.map((l, i) => {
          const a = Math.max(0, Math.min(1, l.from)), b = Math.max(a, Math.min(1, l.to));
          return (
            <span key={i} style={{ position: "absolute", inset: 0, background: l.bg, clipPath: "inset(0 " + (100 - b * 100).toFixed(3) + "% 0 " + (a * 100).toFixed(3) + "%)",
              transition: "clip-path .5s cubic-bezier(.16,1,.3,1)" }} />
          );
        })}
      </div>
    </div>
  );
}

/** Side-by-side comparison as a fixed three-column grid, so both columns stay visible at any width. */
function CompareTable({ rows, caption }: { rows: CompRow[]; caption: string }) {
  const grid = { display: "grid", gridTemplateColumns: "minmax(0, 1.25fr) minmax(0, 1fr) minmax(0, 1.15fr)", columnGap: 12, alignItems: "center" } as const;
  return (
    <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--card-r, 18px)", overflow: "hidden", boxShadow: "var(--card-shadow)" }}>
      <div style={{ ...grid, padding: "10px 18px", background: "var(--surface-faint)", borderBottom: "1px solid var(--border)", fontSize: 11.5, fontWeight: 500, color: "var(--faint)" }}>
        <span />
        <span style={{ textAlign: "right" }}>Traditional agency</span>
        <span style={{ textAlign: "right", color: "var(--accent)" }}>Recruit</span>
      </div>
      {rows.map((x, i) => (
        <div key={x.label} style={{ ...grid, padding: "12px 18px", borderTop: i ? "1px solid var(--border)" : 0, fontSize: 13, background: x.strong ? "var(--surface-faint)" : undefined }}>
          <span style={{ color: x.strong ? "var(--ink)" : "var(--dim)", fontWeight: x.strong ? 600 : 400 }}>{x.label}</span>
          <span style={{ textAlign: "right", fontVariantNumeric: "tabular-nums", fontWeight: x.strong ? 600 : 400, color: "var(--body)" }}>{x.agency}</span>
          <span style={{ textAlign: "right", fontVariantNumeric: "tabular-nums", fontWeight: x.strong ? 600 : 400, color: x.strong ? "var(--accent)" : "var(--body)" }}>{x.recruit}</span>
        </div>
      ))}
      <div style={{ padding: "11px 18px", borderTop: "1px solid var(--border)", background: "var(--surface-faint)", fontSize: 11.5, color: "var(--faint)" }}>{caption}</div>
    </div>
  );
}

/** Twelve bars, one per hire count, scaled to the largest so the strip uses its full height. */
function SavingBars({ values, pick, onPick }: { values: number[]; pick: number; onPick: (n: number) => void }) {
  const max = Math.max(...values, 1);
  return (
    <div style={{ marginTop: 16 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(" + values.length + ", minmax(0, 1fr))", gap: 5, alignItems: "end", height: 132 }}>
        {values.map((v, i) => {
          const on = i + 1 === pick;
          return (
            <button key={i} onClick={() => onPick(i + 1)} aria-label={(i + 1) + (i ? " hires: " : " hire: ") + eur(v)} title={(i + 1) + (i ? " hires: " : " hire: ") + eur(v)} className="rc-focus"
              style={{ position: "relative", height: "100%", padding: 0, border: 0, background: "none", cursor: "pointer", display: "flex", alignItems: "flex-end" }}>
              {on && <span style={{ position: "absolute", left: "50%", bottom: "calc(" + Math.max(4, (v / max) * 100) + "% + 6px)", transform: "translateX(-50%)", fontSize: 10.5, fontWeight: 600, color: "var(--ink)", whiteSpace: "nowrap" }}>{eurK(v)}</span>}
              <span style={{ width: "100%", height: "100%", borderRadius: 6, background: on ? "var(--teal, #16B8A6)" : "color-mix(in oklab, var(--teal, #16B8A6) 30%, var(--surface-2))",
                transform: "scaleY(" + Math.max(0.03, v / max) + ")", transformOrigin: "bottom", transition: "transform .45s cubic-bezier(.16,1,.3,1), background .2s var(--ease)" }} />
            </button>
          );
        })}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(" + values.length + ", minmax(0, 1fr))", gap: 5, marginTop: 6 }}>
        {values.map((_, i) => <span key={i} style={{ textAlign: "center", fontFamily: "var(--mono)", fontSize: 10, color: i + 1 === pick ? "var(--ink)" : "var(--faint)" }}>{i + 1}</span>)}
      </div>
    </div>
  );
}

function Key({ bg, children }: { bg: string; children: ReactNode }) {
  return <span className="rc-row" style={{ gap: 6 }}><span style={{ width: 14, height: 8, borderRadius: 3, background: bg }} />{children}</span>;
}

function Outcome({ label, value, sub, tone }: { label: string; value: string; sub: string; tone: string }) {
  return (
    <div style={{ padding: "13px 15px", borderRadius: 16, background: "var(--surface)", border: "1px solid var(--border)" }}>
      <div className="rc-row" style={{ gap: 7, fontSize: 12, color: "var(--dim)" }}><span style={{ width: 7, height: 7, borderRadius: 2, background: tone }} />{label}</div>
      <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: "-.7px", marginTop: 6, color: tone, fontVariantNumeric: "tabular-nums" }}>{value}</div>
      <div style={{ fontSize: 11.5, color: "var(--faint)", marginTop: 3 }}>{sub}</div>
    </div>
  );
}
