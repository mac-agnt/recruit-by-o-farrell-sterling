import { useState, type CSSProperties, type ReactNode } from "react";
import { Avatar, Badge, Button, Card, Chip, DemoTag, Empty, Grid, Label, Note, Page, Progress, Segmented, Slider, toneColor } from "../../ui";
import { Icon } from "../../icons";
import { useNav } from "../../nav";
import { openDrawer, useRecruit, vacancyById } from "../../store";
import { candidate, offersFor } from "../../selectors";
import { EMPLOYER_BY_ID } from "../../data";
import type { Candidate, Offer } from "../../data/types";
import { eur, eurK, plural } from "../../format";
import { DEMO_TODAY, OFFER_STATUS, OfferResponseActions, daysUntil, noticeFit, offerIsLive, offerTerms, parseDemoDate } from "../../shared/opportunityKit";

/* Offers, compare. Two (or more) offers in one view: every term side by side,
   an illustrative first-year package with its assumptions on show, and a
   "what matters to me" weighting that re-ranks the offers as you move it.
   The ranking reflects the candidate's own priorities. It is not advice. */

export default function OffersCompare() {
  const s = useRecruit();
  return <CompareView key={s.persona} />;
}

type Weights = { salary: number; bonus: number; relocation: number; start: number };
type BonusMode = "max" | "half" | "none";
const CRITERIA: { id: keyof Weights; label: string; hint: string }[] = [
  { id: "salary", label: "Base salary", hint: "Guaranteed pay" },
  { id: "bonus", label: "Bonus potential", hint: "Upside if targets are met" },
  { id: "relocation", label: "Relocation support", hint: "Help with the move" },
  { id: "start", label: "Earlier start date", hint: "How soon you begin" },
];
const PRESETS: { id: string; label: string; w: Weights }[] = [
  { id: "balanced", label: "Balanced", w: { salary: 5, bonus: 5, relocation: 5, start: 5 } },
  { id: "base", label: "Base pay first", w: { salary: 10, bonus: 4, relocation: 2, start: 2 } },
  { id: "bonus", label: "Bonus upside", w: { salary: 3, bonus: 10, relocation: 1, start: 2 } },
  { id: "move", label: "Smoothest move", w: { salary: 3, bonus: 2, relocation: 10, start: 5 } },
];

interface Col {
  o: Offer; short: string; live: boolean; t: ReturnType<typeof offerTerms>; bonusCounted: number; pkg: number;
  startDays: number; expiry: number | null; moveNeeded: boolean; region: string;
}

function CompareView() {
  const s = useRecruit();
  const nav = useNav();
  const c = candidate(s, s.persona);
  const offers = offersFor(s, c.id);
  const [w, setW] = useState<Weights>(PRESETS[0].w);
  const [bonusMode, setBonusMode] = useState<BonusMode>("max");
  if (!offers.length) return <CompareEmpty c={c} />;

  const cols: Col[] = offers.map(o => {
    const t = offerTerms(o);
    const bonusCounted = bonusMode === "max" ? t.bonusMax : bonusMode === "half" ? Math.round(t.bonusMax / 2) : 0;
    const start = parseDemoDate(o.start)?.date;
    const v = vacancyById(o.vacancyId, s);
    return {
      o, t, bonusCounted, short: EMPLOYER_BY_ID[o.employerId]?.short || "Employer", live: offerIsLive(o),
      pkg: o.salary + bonusCounted + t.pension + t.relocation,
      startDays: start ? Math.round((start.getTime() - DEMO_TODAY.getTime()) / 86400000) : 999,
      expiry: daysUntil(o.expires), moveNeeded: !!v && v.region !== c.region, region: v?.region || "",
    };
  }).sort((a, b) => Number(b.live) - Number(a.live));
  const live = cols.filter(x => x.live);
  const accepted = cols.find(x => x.o.status === "accepted");
  const pool = live.length >= 2 ? live : cols;

  // Priority ranking: each criterion scaled against the best offer, then weighted.
  const scale = (vals: number[], higher = true) => {
    const mx = Math.max(...vals), mn = Math.min(...vals);
    return vals.map(v => (higher ? (mx > 0 ? v / mx : 1) : (v > 0 ? mn / v : 1)));
  };
  const n = {
    salary: scale(live.map(x => x.o.salary)),
    bonus: scale(live.map(x => x.t.bonusMax)),
    relocation: scale(live.map(x => x.t.relocation)),
    start: scale(live.map(x => Math.max(1, x.startDays)), false),
  };
  const wsum = w.salary + w.bonus + w.relocation + w.start;
  const scored = live.map((x, i) => ({
    x, score: wsum ? Math.round(((w.salary * n.salary[i] + w.bonus * n.bonus[i] + w.relocation * n.relocation[i] + w.start * n.start[i]) / wsum) * 100) : 0,
  })).sort((a, b) => b.score - a.score || b.x.pkg - a.x.pkg);
  const lead = scored[0];
  const close = scored.length > 1 && lead.score - scored[1].score < 3;
  const leadsOn = (i: number) => CRITERIA.filter(k => live.length > 1 && w[k.id] > 0 && n[k.id][i] === 1 && n[k.id].some(v => v < 1)).map(k => k.label.toLowerCase());
  const preset = PRESETS.find(p => CRITERIA.every(k => p.w[k.id] === w[k.id]))?.id;

  // Who is best on each row (among the offers still open).
  const winner = (vals: number[], higher = true): number => {
    if (pool.length < 2) return -1;
    const pv = pool.map(x => vals[cols.indexOf(x)]);
    const t = higher ? Math.max(...pv) : Math.min(...pv);
    if (pv.every(v => v === t)) return -1;
    const hits = pool.filter(x => vals[cols.indexOf(x)] === t);
    return hits.length === 1 ? cols.indexOf(hits[0]) : -1;
  };
  const best = {
    salary: winner(cols.map(x => x.o.salary)),
    bonus: winner(cols.map(x => x.t.bonusMax)),
    pension: winner(cols.map(x => x.t.pension)),
    health: winner(cols.map(x => (x.t.family ? 1 : x.t.healthLine ? 0.5 : 0))),
    relocation: winner(cols.map(x => x.t.relocation)),
    start: winner(cols.map(x => x.startDays), false),
    expiry: winner(cols.map(x => x.expiry ?? -99)),
    pkg: winner(cols.map(x => x.pkg)),
  };

  // Plain-language differences between the top two open offers.
  const diffs: { icon: string; text: string }[] = [];
  if (pool.length >= 2) {
    const [a, b] = pool;
    const pair = (va: number, vb: number) => (va >= vb ? { hi: a, lo: b, d: va - vb } : { hi: b, lo: a, d: vb - va });
    const sal = pair(a.o.salary, b.o.salary);
    if (sal.d) diffs.push({ icon: "euro", text: sal.hi.short + " pays " + eur(sal.d) + " more in base salary." });
    const bon = pair(a.t.bonusMax, b.t.bonusMax);
    if (bon.d) diffs.push({ icon: "trendUp", text: bon.hi.short + "'s bonus can reach " + eur(bon.d) + " more (" + Math.round(bon.hi.t.bonusPct * 100) + "% against " + Math.round(bon.lo.t.bonusPct * 100) + "%)." });
    const pen = pair(a.t.pension, b.t.pension);
    if (pen.d) diffs.push({ icon: "shield", text: pen.hi.short + "'s pension is worth about " + eur(pen.d) + " more a year." });
    if (a.t.family !== b.t.family) diffs.push({ icon: "users", text: (a.t.family ? a : b).short + "'s healthcare covers your family." });
    const rel = pair(a.t.relocation, b.t.relocation);
    if (rel.d) diffs.push({ icon: "pin", text: rel.lo.t.relocation ? rel.hi.short + " offers " + eur(rel.d) + " more relocation support." : "Only " + rel.hi.short + " offers relocation support (" + eur(rel.hi.t.relocation) + ")." });
    const st = a.startDays === b.startDays ? null : a.startDays < b.startDays ? { x: a, d: b.startDays - a.startDays } : { x: b, d: a.startDays - b.startDays };
    if (st) diffs.push({ icon: "calendar", text: st.x.short + " starts " + plural(st.d, "day") + " sooner." });
    const pk = pair(a.pkg, b.pkg);
    if (pk.d) diffs.push({ icon: "layers", text: pk.hi.short + "'s first-year package is about " + eur(pk.d) + " higher on these assumptions." });
  }

  const ROW_LABEL_W = 190;
  const grid: CSSProperties = { display: "grid", gridTemplateColumns: ROW_LABEL_W + "px repeat(" + cols.length + ", minmax(230px, 1fr))", minWidth: ROW_LABEL_W + cols.length * 240 };
  const liveFlags = cols.map(x => x.live);

  return (
    <Page wide eyebrow="OFFERS" title="Compare your offers side by side."
      sub="Every term in one view. Figures beyond base salary are illustrative estimates read from the offer terms, and the ranking only reflects the priorities you set."
      actions={<>
        <Button icon="offers" onClick={() => nav.go("cand.offers", "incoming")}>Incoming offers</Button>
        <Button icon="messages" onClick={() => nav.go("cand.offers", "messages")}>Messages</Button>
      </>}>

      <Grid cols="rc-g-3-2">
        <Card title="Best fit for your priorities" sub={live.length > 1 ? "Ranked live by the weights you set" : "Ranking needs two open offers"}
          action={<DemoTag>Your weighting</DemoTag>}
          style={{ background: "linear-gradient(150deg, color-mix(in oklab, #4263EB 13%, var(--surface)) 0%, var(--surface) 62%)" }}>
          {live.length > 1 ? (
            <>
              <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: "-.7px", lineHeight: 1.25 }}>
                {close ? "Too close to call on these priorities." : lead.x.short + " leads on what matters to you."}
              </div>
              <div style={{ fontSize: 13, color: "var(--dim)", marginTop: 6, lineHeight: 1.55 }}>
                {scored.map(({ x }) => { const on = leadsOn(live.indexOf(x)); return on.length ? x.short + " is ahead on " + joinWords(on) + "." : ""; }).filter(Boolean).join(" ")}
              </div>
              <div className="rc-col" style={{ gap: 12, marginTop: 18 }}>
                {scored.map(({ x, score }, r) => {
                  const emp = EMPLOYER_BY_ID[x.o.employerId];
                  return (
                    <div key={x.o.id} className="rc-row" style={{ gap: 12 }}>
                      <span style={{ width: 24, height: 24, flex: "none", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11.5, fontWeight: 600,
                        background: r === 0 && !close ? "var(--accent-fill, var(--accent))" : "var(--surface-2)", color: r === 0 && !close ? "var(--on-accent)" : "var(--dim)", border: "1px solid var(--border)" }}>{r + 1}</span>
                      <Avatar initials={emp?.initials || "?"} tint={emp?.tint} size={30} square />
                      <div className="rc-grow">
                        <div className="rc-row" style={{ gap: 8 }}>
                          <span className="rc-grow rc-ellipsis" style={{ fontSize: 13, fontWeight: 600 }}>{x.short}<span style={{ color: "var(--dim)", fontWeight: 400 }}>, {eur(x.o.salary)}</span></span>
                          <span style={{ fontSize: 13, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{score}</span>
                        </div>
                        <Progress value={score} tone={r === 0 ? "accent" : "neutral"} style={{ marginTop: 7 }} />
                      </div>
                    </div>
                  );
                })}
              </div>
              <div style={{ fontSize: 11.5, color: "var(--faint)", marginTop: 14 }}>Priority fit out of 100. It reflects your weights, not a recommendation. The decision is yours.</div>
            </>
          ) : (
            <div style={{ fontSize: 13, color: "var(--dim)", lineHeight: 1.6 }}>
              {accepted
                ? "You accepted " + accepted.short + "'s offer." + (live.length ? " " + live.map(x => x.short).join(" and ") + (live.length === 1 ? " is" : " are") + " still waiting for your answer: decline below when you're ready, so nobody is left waiting." : " Its final terms stay here for your records.")
                : live.length === 1 ? "Only " + live[0].short + "'s offer is still open, so there is nothing to rank against. Its terms are compared with your closed offers below."
                : "None of your offers is open any more. Their final terms stay here for your records."}
            </div>
          )}
        </Card>

        <Card title="What matters to me" sub="Move a slider and the ranking updates" action={<Button size="sm" variant="ghost" icon="refresh" disabled={preset === "balanced"} onClick={() => setW(PRESETS[0].w)}>Reset</Button>}>
          <div className="rc-row rc-wrap" style={{ gap: 7, marginBottom: 16 }}>
            {PRESETS.map(p => <Chip key={p.id} active={preset === p.id} onClick={() => setW(p.w)}>{p.label}</Chip>)}
          </div>
          <div className="rc-col" style={{ gap: 16 }}>
            {CRITERIA.map(k => (
              <Slider key={k.id} label={<span>{k.label} <span style={{ color: "var(--faint)", fontSize: 11.5 }}>{k.hint}</span></span>} value={w[k.id]} min={0} max={10}
                onChange={v => setW({ ...w, [k.id]: v })} display={w[k.id] === 0 ? "Ignore" : w[k.id] + " / 10"} />
            ))}
          </div>
        </Card>
      </Grid>

      {diffs.length > 0 && (
        <Card title="The differences that matter" sub={"Between " + pool[0].short + " and " + pool[1].short + ", from the offer terms"}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 10 }}>
            {diffs.map(d => (
              <div key={d.text} className="rc-row" style={{ alignItems: "flex-start", gap: 10, padding: "11px 13px", borderRadius: "var(--r-sm, 12px)", background: "var(--surface-2)", border: "1px solid var(--border)" }}>
                <span style={{ color: "var(--accent)", marginTop: 1, display: "inline-flex" }}><Icon name={d.icon} size={14} /></span>
                <span style={{ fontSize: 12.5, lineHeight: 1.5, color: "var(--body)" }}>{d.text}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card pad={0}>
        <div className="rc-row rc-wrap" style={{ gap: 12, padding: "16px 18px", borderBottom: "1px solid var(--border)" }}>
          <div className="rc-grow">
            <div style={{ fontSize: 14, fontWeight: 600 }}>Side by side</div>
            <div style={{ fontSize: 12.5, color: "var(--dim)", marginTop: 3 }}>Best value in each row is highlighted among your open offers.</div>
          </div>
          <span style={{ fontSize: 12, color: "var(--dim)" }}>Count bonus at</span>
          <Segmented size="sm" value={bonusMode} onChange={setBonusMode} options={[{ id: "max", label: "Maximum" }, { id: "half", label: "Half" }, { id: "none", label: "None" }]} />
        </div>
        <div className="rc-scroll-x">
          <div style={{ ...grid }}>
            <div style={{ padding: "16px", background: "var(--surface-faint)", display: "flex", alignItems: "flex-end" }}><Label>Offer</Label></div>
            {cols.map(x => {
              const emp = EMPLOYER_BY_ID[x.o.employerId];
              const st = OFFER_STATUS[x.o.status];
              const rank = scored.findIndex(r => r.x.o.id === x.o.id);
              return (
                <div key={x.o.id} style={{ padding: "16px", borderLeft: "1px solid var(--border)", minWidth: 0, opacity: x.live ? 1 : 0.7 }}>
                  <div className="rc-row" style={{ gap: 10, alignItems: "flex-start" }}>
                    <Avatar initials={emp?.initials || "?"} tint={emp?.tint} size={36} square />
                    <div className="rc-grow">
                      <div className="rc-row" style={{ gap: 6, fontSize: 14, fontWeight: 600 }}>
                        <span className="rc-ellipsis">{emp?.name}</span>
                        {emp?.verified && <span title="Verified employer" style={{ color: "var(--teal, var(--ok))", display: "inline-flex", flex: "none" }}><Icon name="verified" size={13} /></span>}
                      </div>
                      <div style={{ fontSize: 12, color: "var(--dim)", marginTop: 3, lineHeight: 1.4 }}>{x.o.title}</div>
                    </div>
                  </div>
                  <div className="rc-row rc-wrap" style={{ gap: 6, marginTop: 10 }}>
                    <Badge tone={st.tone} dot>{st.candidate}</Badge>
                    {x.live && live.length > 1 && rank >= 0 && <Badge tone={rank === 0 && !close ? "accent" : "neutral"}>{rank === 0 && !close ? "Top for your priorities" : "#" + (rank + 1) + " for you"}</Badge>}
                  </div>
                </div>
              );
            })}
          </div>

          <CompareRow grid={grid} live={liveFlags} label="Base salary" hint="Guaranteed, before tax" win={best.salary} winLabel="Higher"
            cells={cols.map(x => <span style={{ fontSize: 20, fontWeight: 600, letterSpacing: "-.6px" }}>{eur(x.o.salary)}</span>)} />
          <CompareRow grid={grid} live={liveFlags} label="Bonus potential" hint="Maximum read from the bonus terms" win={best.bonus} winLabel="More upside"
            cells={cols.map(x => <span>{x.o.bonus}<span style={{ display: "block", fontSize: 12, color: "var(--dim)", marginTop: 3 }}>{x.t.bonusMax ? "Up to " + eur(x.t.bonusMax) + " a year, illustrative" : "No bonus stated"}</span></span>)} />
          <CompareRow grid={grid} live={liveFlags} label="Pension" hint="Employer contribution" win={best.pension} winLabel="Worth more"
            cells={cols.map(x => <span>{x.t.pensionPct ? Math.round(x.t.pensionPct * 100) + "% employer contribution" : x.t.pensionLine || "Not stated"}<span style={{ display: "block", fontSize: 12, color: "var(--dim)", marginTop: 3 }}>{x.t.pension ? "About " + eur(x.t.pension) + " a year, illustrative" : ""}</span></span>)} />
          <CompareRow grid={grid} live={liveFlags} label="Healthcare" win={best.health} winLabel="Covers family"
            cells={cols.map(x => <span>{x.t.healthLine || "Not included"}</span>)} />
          <CompareRow grid={grid} live={liveFlags} label="Relocation" hint="One-off, before tax" win={best.relocation} winLabel={pool.filter(p => p.t.relocation > 0).length === 1 ? "Only offer" : "More support"}
            cells={cols.map(x => x.t.relocation ? <span>{eur(x.t.relocation)} allowance</span> : <span style={{ color: "var(--dim)" }}>Not included</span>)} />
          <CompareRow grid={grid} live={liveFlags} label="Location" hint={"From " + c.location}
            cells={cols.map(x => <span>{x.o.location}<span style={{ display: "block", fontSize: 12, color: x.moveNeeded ? "var(--warn)" : "var(--dim)", marginTop: 3 }}>{x.moveNeeded ? "Daily commute from " + c.location + " isn't practical: a move is needed" : "Commutable from " + c.location}</span></span>)} />
          <CompareRow grid={grid} live={liveFlags} label="Start date" hint={"Your notice: " + plural(c.noticeWeeks, "week")} win={best.start} winLabel="Sooner"
            cells={cols.map(x => { const f = noticeFit(c.noticeWeeks, x.o.start); return <span>{x.o.start}<span style={{ display: "block", fontSize: 12, color: toneColor(f.tone), marginTop: 3 }}>{f.label}</span></span>; })} />
          <CompareRow grid={grid} live={liveFlags} label="Respond by" win={best.expiry} winLabel="More time"
            cells={cols.map(x => <span>{x.o.expires}<span style={{ display: "block", fontSize: 12, color: x.live && x.expiry !== null && x.expiry <= 3 ? "var(--warn)" : "var(--dim)", marginTop: 3 }}>{x.live && x.expiry !== null && x.expiry >= 0 ? (x.expiry === 0 ? "Due today" : plural(x.expiry, "day") + " left") : OFFER_STATUS[x.o.status].candidate}</span></span>)} />
          <CompareRow grid={grid} live={liveFlags} label={<span className="rc-row" style={{ gap: 6 }}>First-year package <DemoTag>Illustrative</DemoTag></span>} hint={"Base, bonus at " + (bonusMode === "max" ? "its maximum" : bonusMode === "half" ? "half its maximum" : "nothing") + ", employer pension, relocation"}
            win={best.pkg} winLabel="Highest"
            cells={cols.map(x => (
              <span>
                <span style={{ display: "block", fontSize: 22, fontWeight: 600, letterSpacing: "-.7px" }}>{eur(x.pkg)}</span>
                <span style={{ display: "block", fontSize: 11.5, color: "var(--dim)", marginTop: 4, lineHeight: 1.55 }}>
                  {eurK(x.o.salary)} base + {eurK(x.bonusCounted)} bonus + {eurK(x.t.pension)} pension{x.t.relocation ? " + " + eurK(x.t.relocation) + " relocation" : ""}
                </span>
              </span>
            ))} />
          <div style={{ ...grid, borderTop: "1px solid var(--border)" }}>
            <div style={{ padding: "13px 16px", background: "var(--surface-faint)", fontSize: 12.5, fontWeight: 500, color: "var(--body)" }}>Respond</div>
            {cols.map(x => (
              <div key={x.o.id} style={{ padding: "13px 16px", borderLeft: "1px solid var(--border)", minWidth: 0 }}>
                {x.live ? <OfferResponseActions offer={x.o} /> : (
                  <div className="rc-row rc-wrap" style={{ gap: 8 }}>
                    <span style={{ fontSize: 12.5, color: "var(--dim)" }}>{OFFER_STATUS[x.o.status].candidate}</span>
                    <Button size="sm" variant="ghost" icon="eye" onClick={() => openDrawer("offer", x.o.id, { role: "candidate" })}>View details</Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
        <div style={{ padding: "12px 18px", borderTop: "1px solid var(--border)", background: "var(--surface-faint)", fontSize: 11.5, color: "var(--faint)", lineHeight: 1.55 }}>
          Assumptions: bonus counted at {bonusMode === "max" ? "its maximum" : bonusMode === "half" ? "half its maximum" : "zero"}; actual payout depends on each employer's scorecard. Pension is the employer contribution only. Healthcare isn't costed. Relocation is a one-off payment. All figures before tax.
        </div>
      </Card>

      <Note icon="shield">You choose who sees your profile and which offers to consider. Employers can't bid for you or see each other's offers, and Recruit never responds on your behalf.</Note>
    </Page>
  );
}

const joinWords = (list: string[]) => (list.length <= 1 ? list.join("") : list.slice(0, -1).join(", ") + " and " + list[list.length - 1]);

/* ── nothing to compare yet ─────────────────────────────────────────────── */

function CompareEmpty({ c }: { c: Candidate }) {
  const s = useRecruit();
  const nav = useNav();
  const apps = s.applications.filter(a => a.candidateId === c.id && a.status !== "withdrawn" && a.status !== "unsuccessful");
  const iv = s.interviews.find(i => i.candidateId === c.id && i.status === "scheduled");
  return (
    <Page wide eyebrow="OFFERS" title="Compare your offers side by side."
      sub="When you hold two or more offers, they line up here: base, bonus, pension, relocation, start date and an illustrative first-year package.">
      <Card>
        <Empty icon="compare" title="No offers to compare yet"
          body={apps.length
            ? "You have " + plural(apps.length, "application") + " in progress" + (iv ? ", with an interview " + iv.when : "") + ". Comparison opens as soon as an employer sends you an offer."
            : "Comparison opens as soon as an employer sends you an offer. Until then, keep your applications moving."}
          action={<div className="rc-row" style={{ gap: 8 }}>
            <Button size="sm" variant="primary" icon="send" onClick={() => nav.go("cand.jobs", "applications")}>View my applications</Button>
            <Button size="sm" icon="jobs" onClick={() => nav.go("cand.jobs", "recommended")}>Recommended roles</Button>
          </div>} />
      </Card>
      <Grid cols="rc-g4">
        {[["layers", "Every term side by side", "Base, bonus, pension, healthcare and relocation, with the best value in each row highlighted."],
          ["euro", "An honest package figure", "An illustrative first-year total, with every assumption written underneath it."],
          ["sliders", "Weight what matters", "Tell Recruit how much salary, bonus, relocation and start date matter, and the ranking follows."],
          ["shield", "Decide on your terms", "Ask, negotiate, accept or decline from the same view. Employers never see each other's offers."]].map(([icon, title, body]) => (
          <Card key={title} pad="16px 18px">
            <span style={{ width: 30, height: 30, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", background: "var(--accent-soft)", color: "var(--accent)" }}><Icon name={icon} size={15} /></span>
            <div style={{ fontSize: 13.5, fontWeight: 600, marginTop: 12 }}>{title}</div>
            <div style={{ fontSize: 12.5, color: "var(--dim)", marginTop: 5, lineHeight: 1.55 }}>{body}</div>
          </Card>
        ))}
      </Grid>
      <Note icon="info">The comparison shows offers that employers have approved and sent to you. Drafts and backup offers stay invisible until they are sent.</Note>
    </Page>
  );
}

interface RowProps { grid: CSSProperties; live: boolean[]; label: ReactNode; hint?: ReactNode; cells: ReactNode[]; win?: number; winLabel?: string }

function CompareRow({ grid, live, label, hint, cells, win, winLabel }: RowProps) {
  return (
    <div style={{ ...grid, borderTop: "1px solid var(--border)" }}>
      <div style={{ padding: "13px 16px", background: "var(--surface-faint)" }}>
        <div style={{ fontSize: 12.5, color: "var(--body)", fontWeight: 500 }}>{label}</div>
        {hint && <div style={{ fontSize: 11, color: "var(--faint)", marginTop: 3, lineHeight: 1.4 }}>{hint}</div>}
      </div>
      {cells.map((cell, i) => {
        const on = win === i;
        return (
          <div key={i} style={{ padding: "13px 16px", borderLeft: "1px solid var(--border)", minWidth: 0, opacity: live[i] ? 1 : 0.6,
            background: on ? "color-mix(in oklab, var(--teal, #16B8A6) 9%, transparent)" : "transparent", transition: "background .3s var(--ease)" }}>
            <div className="rc-row rc-wrap" style={{ gap: 8, alignItems: "flex-start" }}>
              <div className="rc-grow" style={{ fontSize: 13, color: "var(--ink)", lineHeight: 1.45, minWidth: 0 }}>{cell}</div>
              {on && winLabel && <Badge tone="teal" icon="check">{winLabel}</Badge>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
