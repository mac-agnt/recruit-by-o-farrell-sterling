import { useState } from "react";
import { Avatar, Badge, Button, Card, DemoTag, Grid, KV, Label, Note, Section, Slider, Table, TextInput, Toggle, type Col } from "../../ui";
import { StackBar } from "../../charts";
import { Icon } from "../../icons";
import { useNav } from "../../nav";
import { notify, setCommissionRate, setTierPrice, toggleGovernance, useRecruit } from "../../store";
import { membershipTotals } from "../../selectors";
import { COMMISSION_RULES, GOVERNANCE, HQ_TEAM, HQ_TEAMS, INTEGRATIONS_ROADMAP, MARKET, ORG, PRIVACY_REQUESTS, TIERS } from "../../data";
import { eur, eurK, num } from "../../format";

/* Recruit sections mounted under the Pulse Settings view, one per top-bar
   tab. Pricing edits change the shared store, so revenue, the employer
   calculator and the membership pages all move together. */

type Tab = "organisation" | "team" | "pricing" | "integrations" | "governance";
const TABS: Tab[] = ["organisation", "team", "pricing", "integrations", "governance"];
type Tone = "accent" | "ok" | "warn" | "bad" | "neutral" | "teal";

export default function SettingsPanels() {
  const nav = useNav();
  const tab: Tab = (TABS as string[]).includes(nav.tab) ? (nav.tab as Tab) : "organisation";
  return (
    <div style={{ maxWidth: 1364, boxSizing: "border-box", padding: "0 22px 38px" }}>
      <div key={tab} className="rc-col rc-rise" style={{ gap: 14 }}>
        {tab === "organisation" && <Organisation />}
        {tab === "team" && <Team />}
        {tab === "pricing" && <Pricing />}
        {tab === "integrations" && <Integrations />}
        {tab === "governance" && <Governance />}
      </div>
    </div>
  );
}

/* ── organisation ───────────────────────────────────────────────────────── */

function Organisation() {
  const nav = useNav();
  const real = [
    "Company name, founder and Dublin base",
    "Incorporated in " + ORG.incorporated,
    "Membership prices for tiers 1, 2 and 5 (founder-provided)",
    "A founder network of about " + num(MARKET.founderLinkedInFollowers) + " LinkedIn followers (founder-provided context)",
  ];
  const illustrative = [
    "Every marketplace number: professionals, employers, vacancies, placements, revenue",
    "Candidates, employers and education partners, all fictional",
    "HQ staff other than John O'Farrell",
    "Agent runs, verification checks and integrations, all simulated",
  ];
  return (
    <Section title="Recruit organisation" sub="The company behind Recruit, and what in this demo is real.">
      <Grid cols="rc-g-3-2">
        <Card pad={22}>
          <div className="rc-row" style={{ gap: 14, alignItems: "flex-start" }}>
            <Avatar initials="OS" tint="#9fb4ff" size={46} square />
            <div className="rc-grow">
              <div style={{ fontSize: 18, fontWeight: 600, letterSpacing: "-.4px" }}>{ORG.legalName}</div>
              <div style={{ fontSize: 13, color: "var(--dim)", marginTop: 4 }}>Trading as {ORG.product}. {ORG.location}.</div>
            </div>
            <Badge tone="teal" icon="check">Incorporated {ORG.incorporated}</Badge>
          </div>
          <div style={{ marginTop: 18 }}>
            <KV cols={3} items={[
              { k: "Legal name", v: ORG.legalName },
              { k: "Product", v: ORG.product },
              { k: "Location", v: ORG.location },
              { k: "Founder", v: ORG.founder },
              { k: "Role", v: ORG.founderRole },
              { k: "Incorporated", v: ORG.incorporated },
              { k: "Currency", v: ORG.currency },
              { k: "Time zone", v: ORG.timezone },
              { k: "HQ staff", v: HQ_TEAMS.reduce((t, x) => t + x.members, 0) + " (demo)" },
            ]} />
          </div>
          <div className="rc-row" style={{ gap: 12, alignItems: "flex-start", marginTop: 16, padding: "13px 14px", borderRadius: "var(--r-sm, 12px)", background: "var(--surface-2)", border: "1px solid var(--border)" }}>
            <Avatar initials="JO" tint="#7fe0d2" size={34} />
            <div className="rc-grow">
              <div style={{ fontSize: 13, fontWeight: 500 }}>{ORG.founder}, {ORG.founderRole}</div>
              <div style={{ fontSize: 12.5, color: "var(--dim)", marginTop: 4, lineHeight: 1.55 }}>{ORG.founderBio}</div>
            </div>
          </div>
        </Card>
        <Card title="Real and illustrative" sub="So nobody mistakes the scenario for results"
          action={<Button size="sm" variant="ghost" iconRight="arrowRight" onClick={() => nav.go("Work", "launch")}>Launch plan</Button>}>
          <Label>From the business</Label>
          <div className="rc-col" style={{ gap: 8, marginTop: 8 }}>
            {real.map(r => <Line key={r} icon="check" color="var(--teal, var(--ok))" text={r} />)}
          </div>
          <Label style={{ marginTop: 16 }}>Illustrative future state</Label>
          <div className="rc-col" style={{ gap: 8, marginTop: 8 }}>
            {illustrative.map(r => <Line key={r} icon="info" color="var(--warn)" text={r} />)}
          </div>
        </Card>
      </Grid>
    </Section>
  );
}

function Line({ icon, color, text }: { icon: string; color: string; text: string }) {
  return (
    <div className="rc-row" style={{ gap: 9, alignItems: "flex-start", fontSize: 12.5, color: "var(--body)", lineHeight: 1.5 }}>
      <span style={{ color, marginTop: 2 }}><Icon name={icon} size={13} stroke={2} /></span>{text}
    </div>
  );
}

/* ── team ───────────────────────────────────────────────────────────────── */

type Member = (typeof HQ_TEAM)[number];

function Team() {
  const headcount = HQ_TEAMS.reduce((t, x) => t + x.members, 0);
  const max = Math.max(...HQ_TEAMS.map(t => t.members));
  const cols: Col<Member>[] = [
    { key: "who", label: "Person", width: "minmax(220px, 2fr)", render: m => (
      <span className="rc-row" style={{ gap: 10 }}>
        <Avatar initials={m.initials} tint={m.tint} size={30} />
        <span className="rc-grow">
          <span className="rc-ellipsis" style={{ display: "block", fontSize: 13, fontWeight: 500, color: "var(--ink)" }}>{m.name}</span>
          <span className="rc-ellipsis" style={{ display: "block", fontSize: 11.5, color: "var(--dim)", marginTop: 2 }}>{m.role}</span>
        </span>
      </span>
    ) },
    { key: "team", label: "Team", width: "minmax(150px, 1.2fr)", render: m => m.team },
    { key: "access", label: "Access", width: "100px", render: m => <Badge tone={m.access === "Owner" ? "accent" : m.access === "Admin" ? "teal" : "neutral"}>{m.access}</Badge> },
    { key: "real", label: "Record", width: "118px", render: m => m.fictional ? <DemoTag title="A fictional staff member for the demo">Fictional</DemoTag> : <Badge tone="teal" icon="check">Real founder</Badge> },
  ];
  return (
    <Section title="HQ team" sub={"John O'Farrell and a demo team of " + (headcount - 1) + ". Everyone other than John is fictional."}>
      <Grid cols="rc-g-3-2">
        <Table cols={cols} rows={HQ_TEAM} caption="Team leads shown. Access levels control what each person can change in Recruit HQ." />
        <Card title="Teams" sub={HQ_TEAMS.length + " teams, " + headcount + " people in the demo organisation"}>
          {HQ_TEAMS.map((t, i) => (
            <div key={t.name} style={{ padding: "10px 0", borderTop: i ? "1px solid var(--border)" : 0 }}>
              <div className="rc-row" style={{ gap: 10 }}>
                <span className="rc-grow" style={{ fontSize: 13, fontWeight: 500, color: "var(--ink)" }}>{t.name}</span>
                <span style={{ fontSize: 11.5, color: "var(--dim)" }}>{t.lead}</span>
                <span style={{ width: 54, textAlign: "right", fontSize: 12.5, fontWeight: 600 }}>{t.members}</span>
              </div>
              <div style={{ height: 4, borderRadius: 999, background: "var(--track)", marginTop: 7, overflow: "hidden" }}>
                <div style={{ width: (t.members / max) * 100 + "%", height: "100%", borderRadius: 999, background: "var(--accent-fill, var(--accent))" }} />
              </div>
              <div style={{ fontSize: 11.5, color: "var(--faint)", marginTop: 6 }}>{t.remit}</div>
            </div>
          ))}
        </Card>
      </Grid>
    </Section>
  );
}

/* ── pricing ────────────────────────────────────────────────────────────── */

function Pricing() {
  const s = useRecruit();
  const mt = membershipTotals(s);
  const [draft, setDraft] = useState<Record<number, string>>({});
  const std = s.commissionRules.find(r => r.id === "cr1");
  const stdRate = std?.rate ?? MARKET.recruitDefaultRate;
  const monthFees = MARKET.placementsThisMonth * MARKET.avgPlacementSalary * stdRate;
  const pricesChanged = s.tiers.some(t => TIERS.find(x => x.id === t.id)?.price !== t.price);
  const ratesChanged = s.commissionRules.some(r => COMMISSION_RULES.find(x => x.id === r.id)?.rate !== r.rate);
  const rateLabel = (r: number) => { const v = Math.round(r * 1000) / 10; return (Number.isInteger(v) ? v.toFixed(0) : v.toFixed(1)) + "%"; };

  const onPrice = (id: number, raw: string) => {
    setDraft(d => ({ ...d, [id]: raw }));
    const v = Number(raw);
    if (raw.trim() !== "" && Number.isFinite(v) && v >= 0 && v <= 20000) setTierPrice(id, Math.round(v));
  };
  const resetPrices = () => { TIERS.forEach(t => setTierPrice(t.id, t.price)); setDraft({}); notify("Membership prices reset to the founder and concept defaults", "accent"); };
  const resetRates = () => { COMMISSION_RULES.forEach(r => setCommissionRate(r.id, r.rate)); notify("Commission rules reset to the defaults", "accent"); };

  return (
    <Section title="Pricing" sub="Membership tiers and commission rules. Changes apply straight away to revenue in HQ and to the employer view.">
      <Grid cols="rc-g-3-2">
        <Card title="Membership tiers" sub="Annual price per employer account. Edit a price to see revenue move."
          action={<Button size="sm" variant="ghost" icon="refresh" disabled={!pricesChanged} onClick={resetPrices}>Reset</Button>}>
          <div className="rc-col">
            {s.tiers.map((t, i) => (
              <div key={t.id} className="rc-row rc-wrap" style={{ gap: 12, padding: "12px 0", borderTop: i ? "1px solid var(--border)" : 0 }}>
                <div style={{ flex: "1 1 190px", minWidth: 0 }}>
                  <div className="rc-row" style={{ gap: 8 }}>
                    <span style={{ fontSize: 13.5, fontWeight: 500, color: "var(--ink)" }}>{t.label}</span>
                    {t.confirmed ? <Badge tone="teal">Founder-provided</Badge> : <Badge tone="warn">Concept assumption</Badge>}
                  </div>
                  <div style={{ fontSize: 11.5, color: "var(--dim)", marginTop: 3 }}>{t.band}, {num(t.accounts)} accounts</div>
                </div>
                <label style={{ position: "relative", width: 128, flex: "none" }}>
                  <span style={{ position: "absolute", left: 12, top: 11, fontSize: 13.5, color: "var(--faint)", pointerEvents: "none" }}>€</span>
                  <TextInput type="number" min={0} step={5} aria-label={t.label + " price"} value={draft[t.id] ?? String(t.price)}
                    onChange={e => onPrice(t.id, e.target.value)} onBlur={() => setDraft(d => { const n = { ...d }; delete n[t.id]; return n; })}
                    style={{ paddingLeft: 26, fontVariantNumeric: "tabular-nums" }} />
                </label>
                <div style={{ width: 96, textAlign: "right", flex: "none" }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{eurK(t.price * t.accounts)}</div>
                  <div style={{ fontSize: 11, color: "var(--faint)", marginTop: 2 }}>a year</div>
                </div>
              </div>
            ))}
          </div>
          <div className="rc-row rc-wrap" style={{ gap: 14, marginTop: 6, padding: "14px 16px", borderRadius: "var(--r-sm, 12px)", background: "var(--accent-faint)", border: "1px solid var(--accent-line)" }}>
            <div className="rc-grow" style={{ minWidth: 180 }}>
              <Label>Live membership total</Label>
              <div style={{ fontSize: 26, fontWeight: 600, letterSpacing: "-.9px", marginTop: 6 }}>{eur(mt.revenue)}</div>
              <div style={{ fontSize: 12, color: "var(--dim)", marginTop: 3 }}>simulated annualised, {num(mt.accounts)} accounts, {eur(mt.revenue / (mt.accounts || 1))} average</div>
            </div>
            <div style={{ flex: "1 1 200px", minWidth: 0 }}>
              <StackBar height={10} parts={s.tiers.map(t => ({ label: t.label + ": " + eur(t.price * t.accounts), value: t.price * t.accounts }))} />
              <div style={{ fontSize: 11.5, color: "var(--faint)", marginTop: 8 }}>Share of revenue by tier, Starter to Enterprise</div>
            </div>
          </div>
          <Note style={{ marginTop: 12 }}>Starter (€395), Growth (€595) and Enterprise (about €2,500) came from the founder. Professional and Group, for 101-250 and 251-500 employees, are concept assumptions for the demo.</Note>
        </Card>

        <Card title="Commission rules" sub="Success fee rates, 5% to 12%. New placements use the standard rate."
          action={<Button size="sm" variant="ghost" icon="refresh" disabled={!ratesChanged} onClick={resetRates}>Reset</Button>}>
          <div className="rc-col" style={{ gap: 18 }}>
            {s.commissionRules.map((r, i) => (
              <div key={r.id}>
                <Slider value={Math.round(r.rate * 1000) / 10} min={5} max={12} step={0.5} onChange={v => setCommissionRate(r.id, v / 100)} display={rateLabel(r.rate)}
                  label={<span className="rc-row" style={{ gap: 8 }}>
                    <span style={{ color: "var(--ink)" }}>{r.label}</span>
                    {i === 0 ? <Badge tone="teal">Standard</Badge> : /concept/i.test(r.note) ? <Badge tone="warn">Concept</Badge> : <Badge tone="neutral">Proposed</Badge>}
                  </span>} />
                <div style={{ fontSize: 11.5, color: "var(--faint)", marginTop: 6 }}>{r.applies}. {r.note}.</div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 16, padding: "12px 14px", borderRadius: "var(--r-sm, 12px)", background: "var(--surface-2)", border: "1px solid var(--border)" }}>
            <Label>At the standard rate</Label>
            <div style={{ fontSize: 13, color: "var(--body)", marginTop: 6, lineHeight: 1.55 }}>
              {num(MARKET.placementsThisMonth)} placements x {eur(MARKET.avgPlacementSalary)} x {rateLabel(stdRate)} = <b style={{ color: "var(--ink)", fontWeight: 600 }}>{eur(monthFees)}</b> in success fees this month, against {eur(MARKET.placementsThisMonth * MARKET.avgPlacementSalary * MARKET.agencyBenchmarkRate)} at a 25% agency fee.
            </div>
          </div>
        </Card>
      </Grid>
    </Section>
  );
}

/* ── integrations ───────────────────────────────────────────────────────── */

const STATUS: Record<string, { tone: Tone; icon: string }> = {
  "Planned": { tone: "accent", icon: "calendar" },
  "Demo simulation": { tone: "warn", icon: "play" },
  "Not connected": { tone: "neutral", icon: "x" },
};
const CATEGORY_ICON: Record<string, string> = {
  Profiles: "profile", Communication: "mail", Hiring: "calendar", Finance: "euro", Verification: "verified", Employers: "employer", Insight: "chart", Outreach: "send",
};

function Integrations() {
  const statuses = Object.keys(STATUS);
  const count = (st: string) => INTEGRATIONS_ROADMAP.filter(i => i.status === st).length;
  return (
    <Section title="Integrations roadmap" sub="What Recruit would connect to. Nothing in this demo is connected to a live system.">
      <Card pad="16px 18px">
        <div className="rc-row rc-wrap" style={{ gap: 18 }}>
          {statuses.map(st => (
            <div key={st} className="rc-row" style={{ gap: 9 }}>
              <Badge tone={STATUS[st].tone} icon={STATUS[st].icon}>{st}</Badge>
              <span style={{ fontSize: 18, fontWeight: 600 }}>{count(st)}</span>
            </div>
          ))}
          <span className="rc-grow" style={{ minWidth: 200, fontSize: 12, color: "var(--dim)", textAlign: "right" }}>0 live connections. No data leaves the browser in this demo.</span>
        </div>
      </Card>
      <div className="rc-grid rc-g2" style={{ gap: 12 }}>
        {INTEGRATIONS_ROADMAP.map(it => {
          const st = STATUS[it.status] || STATUS["Planned"];
          const linkedIn = it.name === "LinkedIn";
          return (
            <Card key={it.name} pad="16px 18px" style={linkedIn ? { borderStyle: "dashed" } : undefined}>
              <div className="rc-row" style={{ gap: 12, alignItems: "flex-start" }}>
                <span style={{ width: 34, height: 34, flex: "none", borderRadius: 11, display: "flex", alignItems: "center", justifyContent: "center", background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--dim)" }}>
                  <Icon name={CATEGORY_ICON[it.category] || "link"} size={15} />
                </span>
                <div className="rc-grow">
                  <div className="rc-row rc-wrap" style={{ gap: 8 }}>
                    <span style={{ fontSize: 13.5, fontWeight: 500, color: "var(--ink)" }}>{it.name}</span>
                    <span style={{ fontSize: 11, color: "var(--faint)" }}>{it.category}</span>
                  </div>
                  <div style={{ fontSize: 12.5, color: "var(--dim)", marginTop: 4, lineHeight: 1.5 }}>{it.detail}</div>
                  {linkedIn && (
                    <div style={{ fontSize: 11.5, color: "var(--body)", marginTop: 8, lineHeight: 1.5 }}>
                      Founder network of about {num(MARKET.founderLinkedInFollowers)} followers: founder-provided context only. No LinkedIn data is read or used.
                    </div>
                  )}
                </div>
                <Badge tone={st.tone} icon={st.icon}>{it.status}</Badge>
              </div>
            </Card>
          );
        })}
      </div>
    </Section>
  );
}

/* ── governance ─────────────────────────────────────────────────────────── */

const PRINCIPLES = [
  { icon: "users", title: "Hiring stays with people", body: "Recruit suggests and explains. Employers and professionals make every decision." },
  { icon: "sparkle", title: "AI output is decision support", body: "Salary estimates, Recruit Index scores and matches inform a person; they are never a verdict." },
  { icon: "x", title: "No automated rejection", body: "Nobody is filtered out or turned down by a score or an agent." },
  { icon: "shield", title: "No sensitive-trait scoring", body: "The Recruit Index uses professional evidence and profile completeness only." },
  { icon: "info", title: "No compliance claims", body: "These safeguards are design choices for the demo, not a statement of regulatory compliance." },
];

function Governance() {
  const s = useRecruit();
  const on = GOVERNANCE.filter(g => s.governance[g.id]).length;
  const requestTone = (st: string): Tone => st === "Completed" ? "teal" : st === "In progress" ? "accent" : "warn";
  return (
    <Section title="Governance" sub={"Safeguards for candidate data and hiring decisions. " + on + " of " + GOVERNANCE.length + " on; locked ones cannot be switched off."}>
      <Grid cols="rc-g-3-2">
        <Card title="Safeguards" sub="Toggles save straight away">
          {GOVERNANCE.map((g, i) => (
            <div key={g.id} style={{ padding: "12px 0", borderTop: i ? "1px solid var(--border)" : 0 }}>
              <Toggle on={!!s.governance[g.id]} disabled={g.locked} onChange={() => { if (!g.locked) toggleGovernance(g.id); }}
                label={<span className="rc-row rc-wrap" style={{ gap: 8 }}>{g.label}{g.locked && <Badge tone="neutral" icon="lock">Locked</Badge>}</span>}
                sub={g.note} />
            </div>
          ))}
        </Card>
        <div className="rc-col" style={{ gap: 14 }}>
          <Card title="Principles" sub="How Recruit treats people and AI output">
            <div className="rc-col" style={{ gap: 12 }}>
              {PRINCIPLES.map(p => (
                <div key={p.title} className="rc-row" style={{ gap: 11, alignItems: "flex-start" }}>
                  <span style={{ width: 28, height: 28, flex: "none", borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", background: "var(--accent-soft)", color: "var(--accent)" }}>
                    <Icon name={p.icon} size={13} />
                  </span>
                  <div className="rc-grow">
                    <div style={{ fontSize: 13, fontWeight: 500, color: "var(--ink)" }}>{p.title}</div>
                    <div style={{ fontSize: 12, color: "var(--dim)", marginTop: 2, lineHeight: 1.5 }}>{p.body}</div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
          <Card title="Privacy requests" sub="Requests from professionals, handled within 30 days">
            {PRIVACY_REQUESTS.map((r, i) => (
              <div key={r.id} className="rc-row" style={{ gap: 10, padding: "9px 0", borderTop: i ? "1px solid var(--border)" : 0 }}>
                <div className="rc-grow">
                  <div style={{ fontSize: 12.5, color: "var(--ink)" }}>{r.type}</div>
                  <div style={{ fontSize: 11.5, color: "var(--dim)", marginTop: 2 }}>{r.who}, {r.age === "Today" ? "today" : r.age + " ago"}</div>
                </div>
                <Badge tone={requestTone(r.status)}>{r.status}</Badge>
              </div>
            ))}
            <div style={{ fontSize: 11.5, color: "var(--faint)", marginTop: 8 }}>Requesters are shown by profile number only.</div>
          </Card>
        </div>
      </Grid>
    </Section>
  );
}

