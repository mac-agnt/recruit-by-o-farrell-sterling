import { Badge, Button, Card, Grid, KV, Label, Note, Page, Progress } from "../../ui";
import { Icon } from "../../icons";
import { useNav } from "../../nav";
import { setCalc, setMembershipTier, useRecruit } from "../../store";
import { employerVacancies } from "../../selectors";
import { EMPLOYER_BY_ID, EMPLOYER_TEAM, tierFor, type Tier } from "../../data";
import { eur } from "../../format";
import { AGENCY_RATE, HV_MEMBERSHIP, allowance, yearTotals } from "./hiringKit";

/* Membership: the five size-based plans, Harbourview's band, and a simulated
   subscription summary. Prices are set in Recruit HQ and read live here. */

export default function Membership() {
  const s = useRecruit();
  const nav = useNav();
  const emp = EMPLOYER_BY_ID[s.employerId];
  const tiers = s.tiers;
  const band = tierFor(emp?.employees || 0, tiers);
  const plan = tiers.find(t => t.id === s.membershipTier) || band;
  const billed = tiers.find(t => t.label === HV_MEMBERSHIP.plan);
  const changed = plan.label !== HV_MEMBERSHIP.plan;
  const seats = allowance(tiers, plan.id, /seat/i);
  const vacs = allowance(tiers, plan.id, /vacanc/i);
  const openRoles = employerVacancies(s, s.employerId).filter(v => v.status === "open").length;
  const team = EMPLOYER_TEAM.length;
  const rate = s.commissionRules[0]?.rate ?? 0.08;
  const renewal = (emp?.renewal || "12 Jan") + " 2027";
  const switchTo = (t: Tier) => { setMembershipTier(t.id); setCalc({ membership: t.price }); };
  const employees = emp?.employees || 0;
  const year = yearTotals(s);

  return (
    <Page wide eyebrow="COSTS AND MEMBERSHIP" title="Your membership"
      sub="One annual fee set by company size, then a success fee only when a hire starts."
      actions={<>
        <Button icon="file" onClick={() => nav.go("emp.costs", "billing")}>Billing</Button>
        <Button variant="primary" icon="costs" onClick={() => nav.go("emp.costs", "calculator")}>Cost calculator</Button>
      </>}>

      <Grid cols="rc-g-3-2">
        <Card pad={24} style={{ background: "linear-gradient(140deg, color-mix(in oklab, #4263EB 15%, var(--surface)) 0%, var(--surface) 62%)" }}>
          <div className="rc-row rc-wrap" style={{ gap: 8 }}>
            <Label>{changed ? "Plan preview" : "Current plan"}</Label>
            <span className="rc-grow" />
            <Badge tone="warn" icon="info">Simulated: no payment is taken</Badge>
          </div>
          <div className="rc-row rc-wrap" style={{ gap: 14, alignItems: "baseline", marginTop: 12 }}>
            <span style={{ fontSize: 34, fontWeight: 600, letterSpacing: "-1.4px" }}>{plan.label}</span>
            <span style={{ fontSize: 22, fontWeight: 600, letterSpacing: "-.6px", color: "var(--accent)", fontVariantNumeric: "tabular-nums" }}>{eur(plan.price)}</span>
            <span style={{ fontSize: 13, color: "var(--dim)" }}>a year · {plan.band}</span>
          </div>
          <div className="rc-row rc-wrap" style={{ gap: 6, marginTop: 10 }}>
            <Badge tone="ok" icon="check">{emp?.membershipStatus === "active" ? "Active" : emp?.membershipStatus || "Active"}</Badge>
            {plan.id === band.id ? <Badge tone="teal">Matches your size band</Badge> : <Badge tone="warn">Your size band is {band.label}</Badge>}
            <Badge>{plan.confirmed ? "Founder pricing" : "Concept assumption"}</Badge>
          </div>
          <div style={{ marginTop: 18 }}>
            <KV cols={3} items={[
              { k: "Renews", v: renewal },
              { k: "Member for", v: (emp?.memberSince || "").replace("Member for ", "") },
              { k: "Success fee", v: Math.round(rate * 100) + "% of first-year salary" },
              { k: "Team seats", v: seats ? (seats.n === Infinity ? "Unlimited" : seats.n + " seats") : "Not included" },
              { k: "Active vacancies", v: vacs ? (vacs.n === Infinity ? "Unlimited" : vacs.n + " included") : "Not listed" },
              { k: "Next invoice", v: eur(plan.price) + " on " + renewal },
            ]} />
          </div>
          <div className="rc-grid rc-g2" style={{ gap: 16, marginTop: 18 }}>
            <Usage label="Active vacancies" used={openRoles} cap={vacs?.n ?? null} />
            <Usage label="Team members" used={team} cap={seats?.n ?? null} />
          </div>
          <div className="rc-row rc-wrap" style={{ gap: 12, marginTop: 18, padding: "12px 14px", borderRadius: 14, background: "var(--surface-faint)", border: "1px solid var(--border)" }}>
            <span style={{ width: 28, height: 28, flex: "none", borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", background: "var(--surface-2)", color: "var(--teal, var(--ok))" }}><Icon name="placement" size={14} /></span>
            <div className="rc-grow" style={{ minWidth: 200, fontSize: 12.5, lineHeight: 1.5, color: "var(--body)" }}>
              This year on Recruit: {year.count} placements, {eur(year.fees)} in success fees and an estimated <b style={{ color: "var(--teal, var(--ok))", fontWeight: 600 }}>{eur(year.net)}</b> saved after membership.
            </div>
            <Button size="sm" variant="ghost" iconRight="arrowRight" onClick={() => nav.go("emp.hiring", "placements")}>Placements</Button>
          </div>
          {changed && (
            <Note tone="warn" icon="info" style={{ marginTop: 16 }}>
              You're previewing {plan.label}. This year's billed plan is {HV_MEMBERSHIP.plan} ({eur(billed?.price ?? HV_MEMBERSHIP.amount)} paid on {HV_MEMBERSHIP.date}); a change would apply from {renewal}. Simulated: no payment is taken.{" "}
              <button className="rc-link" onClick={() => billed && switchTo(billed)}>Go back to {HV_MEMBERSHIP.plan}</button>
            </Note>
          )}
        </Card>

        <div className="rc-col" style={{ gap: 14 }}>
          <Card title="Your size band" sub={(emp?.name || "Your organisation") + " has " + employees + " employees."}>
            <BandScale tiers={tiers} employees={employees} bandId={band.id} planId={plan.id} />
            <div style={{ fontSize: 12.5, color: "var(--dim)", marginTop: 14, lineHeight: 1.55 }}>
              Plans follow company size, so a growing hotel moves up a band at renewal. Prices are set by Recruit HQ and update here live.
            </div>
          </Card>
          <Card title="The success fee" sub="Charged only when a hire starts">
            <div className="rc-row" style={{ gap: 18, alignItems: "flex-end" }}>
              <div>
                <div style={{ fontSize: 28, fontWeight: 600, letterSpacing: "-1px", color: "var(--accent)" }}>{Math.round(rate * 100)}%</div>
                <div style={{ fontSize: 12, color: "var(--dim)", marginTop: 2 }}>of first-year base salary</div>
              </div>
              <div className="rc-grow" style={{ fontSize: 12.5, color: "var(--body)", lineHeight: 1.55 }}>
                At {eur(120000)} that's {eur(120000 * rate)}, against {eur(120000 * AGENCY_RATE)} at a 25% agency rate.
              </div>
            </div>
            <Button size="sm" variant="ghost" iconRight="arrowRight" style={{ marginTop: 12, marginLeft: -10 }} onClick={() => nav.go("emp.costs", "calculator")}>Try your own numbers</Button>
          </Card>
        </div>
      </Grid>

      <div className="rc-row rc-wrap" style={{ gap: 10, padding: "6px 4px 0" }}>
        <span style={{ fontSize: 17, fontWeight: 600, letterSpacing: "-.3px" }}>All plans</span>
        <span className="rc-grow" />
        <span style={{ fontSize: 12, color: "var(--faint)" }}>Annual prices. Read-only here; set in Recruit HQ.</span>
      </div>
      <Grid cols="rc-g5" gap={12}>
        {tiers.map(t => {
          const cur = t.id === plan.id;
          const fits = t.id === band.id;
          return (
            <Card key={t.id} pad={18} tone={cur ? "accent" : undefined}
              style={{ display: "flex", flexDirection: "column", background: cur ? "var(--accent-faint)" : "var(--surface)" }}>
              <div className="rc-row rc-wrap" style={{ gap: 6, minHeight: 22 }}>
                {cur && <Badge tone="accent" icon="check">{changed ? "Previewing" : "Current"}</Badge>}
                {fits && <Badge tone="teal">Your band</Badge>}
              </div>
              <div style={{ fontSize: 17, fontWeight: 600, letterSpacing: "-.3px", marginTop: 10 }}>{t.label}</div>
              <div style={{ fontSize: 12, color: "var(--dim)", marginTop: 3 }}>{t.band}</div>
              <div className="rc-row" style={{ alignItems: "baseline", gap: 6, marginTop: 14 }}>
                <span style={{ fontSize: 28, fontWeight: 600, letterSpacing: "-1px", fontVariantNumeric: "tabular-nums" }}>{eur(t.price)}</span>
                <span style={{ fontSize: 12, color: "var(--faint)" }}>a year</span>
              </div>
              <div style={{ marginTop: 6 }}>
                <span title={t.confirmed ? "Price provided by the founder" : "A concept assumption for the demo, not a confirmed price"}
                  style={{ fontSize: 10.5, fontFamily: "var(--mono)", letterSpacing: ".06em", textTransform: "uppercase", color: t.confirmed ? "var(--teal, var(--ok))" : "var(--warn)" }}>
                  {t.confirmed ? "Founder pricing" : "Concept assumption"}
                </span>
              </div>
              <div className="rc-col" style={{ gap: 8, marginTop: 14, flex: 1 }}>
                {t.perks.map(p => (
                  <div key={p} className="rc-row" style={{ gap: 8, alignItems: "flex-start", fontSize: 12.5, color: "var(--body)", lineHeight: 1.45 }}>
                    <span style={{ color: "var(--accent)", marginTop: 2 }}><Icon name="check" size={12} stroke={2.4} /></span>{p}
                  </div>
                ))}
              </div>
              <Button size="sm" full variant={cur ? "secondary" : fits ? "primary" : "secondary"} disabled={cur} style={{ marginTop: 16 }}
                onClick={() => switchTo(t)}>{cur ? (changed ? "Previewing" : "Current plan") : "Switch to " + t.label}</Button>
            </Card>
          );
        })}
      </Grid>

      <Note icon="info">
        Tiers 1, 2 and 5 (1-50, 51-100 and 501+ employees) come from the founder. Tiers 3 and 4 (101-250 and 251-500 employees) are concept assumptions for this demo.
        Switching plans here is a simulation: no payment is taken and nothing is billed.
      </Note>
    </Page>
  );
}

function Usage({ label, used, cap }: { label: string; used: number; cap: number | null }) {
  const unlimited = cap === Infinity;
  const over = cap !== null && !unlimited && used > cap;
  return (
    <div>
      <div className="rc-row" style={{ gap: 8, fontSize: 12.5 }}>
        <span className="rc-grow" style={{ color: "var(--body)" }}>{label}</span>
        <span style={{ fontWeight: 600, fontVariantNumeric: "tabular-nums", color: over ? "var(--warn)" : "var(--ink)" }}>
          {used}{cap === null ? "" : unlimited ? " of unlimited" : " of " + cap}
        </span>
      </div>
      {cap !== null && <Progress value={unlimited ? 8 : used} max={unlimited ? 100 : Math.max(cap, 1)} tone={over ? "warn" : "accent"} style={{ marginTop: 8 }} />}
      {cap === null && <div style={{ fontSize: 11.5, color: "var(--faint)", marginTop: 6 }}>Team seats start on Professional.</div>}
    </div>
  );
}

function BandScale({ tiers, employees, bandId, planId }: { tiers: Tier[]; employees: number; bandId: number; planId: number }) {
  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(" + tiers.length + ", minmax(0, 1fr))", gap: 4 }}>
        {tiers.map(t => {
          const here = t.id === bandId;
          const span = (t.max ?? Math.max(t.min * 2, employees)) - t.min;
          const at = here ? Math.max(4, Math.min(96, ((employees - t.min) / Math.max(1, span)) * 100)) : 0;
          return (
            <div key={t.id} style={{ minWidth: 0 }}>
              <div style={{ position: "relative", height: 34 }}>
                {here && (
                  <div style={{ position: "absolute", left: at + "%", top: 0, transform: "translateX(-50%)", display: "flex", flexDirection: "column", alignItems: "center" }}>
                    <span style={{ fontSize: 10.5, fontWeight: 600, color: "var(--ink)", whiteSpace: "nowrap" }}>{employees}</span>
                    <span style={{ width: 2, height: 14, background: "var(--ink)", borderRadius: 2, marginTop: 3 }} />
                  </div>
                )}
              </div>
              <div style={{ height: 10, borderRadius: 999, background: here ? "linear-gradient(90deg, #4263EB, var(--teal, #16B8A6))" : t.id === planId ? "var(--accent-soft)" : "var(--track)" }} />
              <div style={{ fontSize: 11, fontWeight: here ? 600 : 500, color: here ? "var(--ink)" : "var(--dim)", marginTop: 7 }} className="rc-ellipsis">{t.label}</div>
              <div style={{ fontSize: 10, color: "var(--faint)", fontFamily: "var(--mono)", marginTop: 2 }} className="rc-ellipsis">{t.band.replace(" employees", "")}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
