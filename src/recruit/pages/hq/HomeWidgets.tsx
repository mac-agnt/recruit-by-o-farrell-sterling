import type { CSSProperties, ReactNode } from "react";
import AgentFace from "../../../components/AgentFace";
import { Icon } from "../../icons";
import { useNav } from "../../nav";
import { useRecruit } from "../../store";
import { MARKET, RECRUIT_AGENTS, SERIES } from "../../data";
import { num, pct, plural } from "../../format";

/* Compact Recruit widgets for the top of the HQ Home right rail (352px).
   Styled like the rail's own widgets; the centre column stays untouched. */

const CARD: CSSProperties = {
  background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--card-r, 18px)", backdropFilter: "blur(20px) saturate(1.3)",
  boxShadow: "var(--card-shadow)", padding: "20px 22px",
};
const TITLE: CSSProperties = { flex: 1, minWidth: 0, fontSize: 13.5, fontWeight: 500 };
const last = SERIES.registered.length - 1;
const delta = (k: keyof typeof SERIES) => SERIES[k][last] - SERIES[k][last - 1];

export default function HomeWidgets() {
  const s = useRecruit();
  const nav = useNav();
  const briefing = RECRUIT_AGENTS.find(a => a.id === "briefing");
  const gmOffers = s.offers.filter(o => o.vacancyId === "v-hv-gm" && !["accepted", "declined", "withdrawn"].includes(o.status)).length;
  const gmFilled = s.offers.some(o => o.vacancyId === "v-hv-gm" && o.status === "accepted");
  const renewals = MARKET.renewalsDue30;
  const ask = (q: string) => nav.ask?.(q);

  const lines: { icon: string; tone: string; text: ReactNode }[] = [
    { icon: "placement", tone: "var(--teal, var(--ok))", text: <><b style={{ fontWeight: 600 }}>{MARKET.placementsThisMonth} placements</b> this month in the simulated operating model, {plural(MARKET.openVacancies, "open role")} live.</> },
    { icon: "offers", tone: "var(--accent)", text: gmFilled
      ? <>Harbourview's General Manager offer was accepted. The placement and success fee are recorded.</>
      : <>Harbourview has <b style={{ fontWeight: 600 }}>{gmOffers ? plural(gmOffers, "offer") : "no offers"}</b> in progress for its General Manager vacancy.</> },
    { icon: "verified", tone: "var(--warn)", text: <><b style={{ fontWeight: 600 }}>{num(MARKET.verificationBacklog)}</b> profiles wait on verification.</> },
    { icon: "calendar", tone: "#c8b4f0", text: <><b style={{ fontWeight: 600 }}>{renewals} memberships</b> renew in the next 30 days.</> },
  ];

  const health: { label: string; value: number; d: number }[] = [
    { label: "Professionals", value: MARKET.registeredProfessionals, d: delta("registered") },
    { label: "Verified", value: MARKET.verifiedProfiles, d: delta("verified") },
    { label: "Open roles", value: MARKET.openVacancies, d: delta("vacancies") },
    { label: "Placements", value: MARKET.placementsThisMonth, d: delta("placements") },
  ];

  const passed = MARKET.registeredProfessionals >= MARKET.talentTarget;
  const verifiedShare = MARKET.verifiedProfiles / MARKET.talentTarget;

  return (
    <>
      <div style={CARD}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {briefing && <AgentFace shape={briefing.shape} state={briefing.state} tint={briefing.tint} size="24" />}
          <div style={TITLE}>Morning briefing</div>
          <span style={{ fontSize: 11, color: "var(--faint)" }}>{briefing ? "07:00, " + briefing.name : "07:00"}</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 14 }}>
          {lines.map((l, i) => (
            <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
              <span style={{ width: 22, height: 22, flex: "none", borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center", background: "var(--surface-2)", color: l.tone }}>
                <Icon name={l.icon} size={12} />
              </span>
              <div style={{ fontSize: 12.5, lineHeight: 1.5, color: "var(--body)", paddingTop: 2 }}>{l.text}</div>
            </div>
          ))}
        </div>
        <div style={{ fontSize: 10.5, color: "var(--faint)", marginTop: 12 }}>Demo briefing from illustrative future-state data.</div>
        <div style={{ fontSize: 11.5, color: "var(--dim)", marginTop: 14 }}>Ask about this</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
          <AskChip onClick={() => ask("Which vacancies need attention?")}>Which vacancies need attention?</AskChip>
          <AskChip onClick={() => ask("Where do the Harbourview General Manager offers stand?")}>Harbourview offers</AskChip>
          <AskChip onClick={() => ask("Which memberships renew this month?")}>Renewals due</AskChip>
        </div>
      </div>

      <div style={CARD}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={TITLE}>Marketplace health</div>
          <button onClick={() => nav.go("Dashboard", "marketplace")} className="rc-link" style={{ fontSize: 11.5 }}>Dashboard</button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 14 }}>
          {health.map(h => (
            <div key={h.label} style={{ padding: "12px 13px", background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: "var(--card-r, 18px)", minWidth: 0 }}>
              <div style={{ fontSize: 11.5, color: "var(--dim)" }}>{h.label}</div>
              <div style={{ fontSize: 19, fontWeight: 500, letterSpacing: "-.6px", marginTop: 6, fontVariantNumeric: "tabular-nums" }}>{num(h.value)}</div>
              <div style={{ fontSize: 11, color: h.d >= 0 ? "var(--teal, var(--ok))" : "var(--bad)", marginTop: 4 }}>{h.d >= 0 ? "+" : ""}{num(h.d)} this month</div>
            </div>
          ))}
        </div>
        <div style={{ fontSize: 10.5, color: "var(--faint)", marginTop: 10 }}>Simulated operating model, scenario year 2.</div>
      </div>

      <div style={CARD}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={TITLE}>Talent network target</div>
          {passed && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 5, height: 22, padding: "0 9px", borderRadius: "var(--chip-r, 8px)", background: "var(--teal-soft, var(--ok-soft))",
              color: "var(--teal, var(--ok))", border: "1px solid color-mix(in oklab, var(--teal, var(--ok)) 40%, transparent)", fontSize: 11, fontWeight: 500 }}>
              <Icon name="check" size={11} stroke={2.4} />Passed
            </span>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginTop: 12 }}>
          <span style={{ fontSize: 24, fontWeight: 600, letterSpacing: "-.8px" }}>{num(MARKET.registeredProfessionals)}</span>
          <span style={{ fontSize: 12, color: "var(--dim)" }}>of {num(MARKET.talentTarget)} registered</span>
        </div>
        <Bar label="Registered" value={Math.min(1, MARKET.registeredProfessionals / MARKET.talentTarget)} right={pct(MARKET.registeredProfessionals / MARKET.talentTarget)} color="var(--teal, #16B8A6)" />
        <Bar label="Verified" value={verifiedShare} right={num(MARKET.verifiedProfiles) + ", " + pct(verifiedShare)} color="var(--accent-fill, var(--accent))" />
        <div style={{ fontSize: 10.5, color: "var(--faint)", marginTop: 10 }}>John's 100,000 target, in the illustrative scenario.</div>
      </div>

      <div style={CARD}>
        <div style={TITLE}>Explore the product</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 12 }}>
          <Entry icon="discover" label="Discover Recruit" sub="The public product story" onClick={() => nav.switchRole("public")} />
          <Entry icon="candidate" label="Candidate view" sub="Aoife's career dashboard" onClick={() => nav.switchRole("candidate")} />
          <Entry icon="employer" label="Employer view" sub="Harbourview Grand Hotel" onClick={() => nav.switchRole("employer")} />
        </div>
      </div>
    </>
  );
}

function Bar({ label, value, right, color }: { label: string; value: number; right: string; color: string }) {
  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ display: "flex", fontSize: 11.5 }}>
        <span style={{ flex: 1, color: "var(--dim)" }}>{label}</span>
        <span style={{ color: "var(--body)", fontVariantNumeric: "tabular-nums" }}>{right}</span>
      </div>
      <div style={{ height: 6, borderRadius: 999, background: "var(--track)", marginTop: 6, overflow: "hidden" }}>
        <div style={{ width: Math.max(0, Math.min(1, value)) * 100 + "%", height: "100%", borderRadius: 999, background: color, transition: "width .5s var(--ease)" }} />
      </div>
    </div>
  );
}

function AskChip({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button onClick={onClick} className="rc-btn rc-btn-secondary rc-focus"
      style={{ display: "inline-flex", alignItems: "center", gap: 6, height: 28, padding: "0 11px", borderRadius: "var(--r-ctl, 10px)", background: "var(--surface-2)",
        border: "1px solid var(--border)", color: "var(--body)", fontSize: 11.5, cursor: "pointer", whiteSpace: "nowrap" }}>
      <Icon name="sparkle" size={11} color="var(--accent)" />{children}
    </button>
  );
}

function Entry({ icon, label, sub, onClick }: { icon: string; label: string; sub: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="rc-rowhover rc-focus"
      style={{ display: "flex", alignItems: "center", gap: 11, width: "100%", padding: "9px 10px", margin: 0, border: "1px solid var(--border)", borderRadius: 14,
        background: "var(--surface-2)", color: "inherit", cursor: "pointer", textAlign: "left" }}>
      <span style={{ width: 30, height: 30, flex: "none", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", background: "var(--accent-soft)", color: "var(--accent)" }}>
        <Icon name={icon} size={15} />
      </span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: "block", fontSize: 13, color: "var(--ink)" }}>{label}</span>
        <span style={{ display: "block", fontSize: 11.5, color: "var(--dim)", marginTop: 2 }}>{sub}</span>
      </span>
      <Icon name="arrowRight" size={14} color="var(--faint)" />
    </button>
  );
}
