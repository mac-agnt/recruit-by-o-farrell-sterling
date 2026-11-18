import { useMemo, useState } from "react";
import { Avatar, Badge, Button, Card, DemoTag, Empty, Grid, Label, Note, Page, Stat } from "../../ui";
import { BarList, Funnel } from "../../charts";
import { useNav } from "../../nav";
import { allVacancies, openDrawer, useRecruit } from "../../store";
import { candidate } from "../../selectors";
import { EMPLOYER_BY_ID, MARKET, QUALITY, STAGES, STAGE_ORDER } from "../../data";
import type { Offer, PipelineEntry, Stage, Vacancy } from "../../data/types";
import { eur, num } from "../../format";

/* Recruit HQ, Pipelines: every sample pipeline across the marketplace as a
   vacancy-by-stage matrix. Select a cell to see who is in it. Conversion
   between stages is the illustrative marketplace month. */

type Tone = "accent" | "ok" | "warn" | "bad" | "neutral" | "teal";
interface Sel { v: string; st: Stage }
interface MRow { v: Vacancy; entries: PipelineEntry[]; counts: number[] }

const HV_GM = "v-hv-gm";
const ALL = "*";
const TEMPLATE = "minmax(220px, 2.4fr) repeat(6, minmax(66px, 1fr)) 62px";
const STAGE_LABEL = Object.fromEntries(STAGES.map(st => [st.id, st.label])) as Record<string, string>;
const SOURCE_LABEL: Record<PipelineEntry["source"], string> = { search: "Search", applied: "Applied", agent: "Agent suggestion", referral: "Referral" };
const OFFER_TONE: Record<Offer["status"], Tone> = {
  draft: "neutral", "awaiting approval": "warn", approved: "accent", sent: "accent", "changes requested": "warn", accepted: "ok", declined: "bad", withdrawn: "neutral",
};
const cap = (x: string) => x.charAt(0).toUpperCase() + x.slice(1);

/** Stage-to-stage conversion for the marketplace month. Two rates come from
    the quality metrics; the others are illustrative assumptions. */
const RATES = [
  { rate: 0.38, source: "Illustrative" },
  { rate: 0.54, source: "Illustrative" },
  { rate: QUALITY.introAcceptance / 100, source: "Introduction acceptance" },
  { rate: 0.31, source: "Illustrative" },
  { rate: QUALITY.offerAcceptance / 100, source: "Offer acceptance" },
];
const VOLUMES = (() => {
  const v = new Array<number>(STAGES.length).fill(0);
  v[STAGES.length - 1] = MARKET.placementsThisMonth;
  for (let i = STAGES.length - 2; i >= 0; i--) v[i] = Math.round(v[i + 1] / RATES[i].rate);
  return v;
})();

export default function Pipelines() {
  const s = useRecruit();
  const nav = useNav();
  const [sel, setSel] = useState<Sel>({ v: HV_GM, st: "offer" });

  const vacs = useMemo(() => allVacancies(s), [s]);
  const rows: MRow[] = useMemo(() => vacs
    .map(v => {
      const entries = s.pipeline.filter(p => p.vacancyId === v.id);
      return { v, entries, counts: STAGE_ORDER.map(st => entries.filter(p => p.stage === st).length) };
    })
    .filter(r => r.entries.length)
    .sort((a, b) => Number(b.v.id === HV_GM) - Number(a.v.id === HV_GM) || b.entries.length - a.entries.length), [vacs, s.pipeline]);
  const totals = STAGE_ORDER.map(st => rows.reduce((t, r) => t + r.counts[STAGE_ORDER.indexOf(st)], 0));
  const entriesIn = (x: Sel) => s.pipeline.filter(p => p.stage === x.st && (x.v === ALL || p.vacancyId === x.v));
  const selected = entriesIn(sel);
  const selVac = sel.v === ALL ? undefined : vacs.find(v => v.id === sel.v);

  const hv = rows.find(r => r.v.id === HV_GM);
  const hvAtOffer = hv ? hv.entries.filter(p => p.stage === "offer" || p.stage === "hired") : [];
  const hvOffers = s.offers.filter(o => o.vacancyId === HV_GM);
  const competing = s.offers.filter(o => o.vacancyId !== HV_GM && hvAtOffer.some(p => p.candidateId === o.candidateId) && o.visibleToCandidate && !["declined", "withdrawn"].includes(o.status));
  const sources = (Object.keys(SOURCE_LABEL) as PipelineEntry["source"][]).map(src => ({ src, n: s.pipeline.filter(p => p.source === src).length })).filter(x => x.n);

  return (
    <Page wide eyebrow="RECRUIT HQ · ROLES AND PLACEMENTS" title="Pipelines across the marketplace"
      sub={"Every sample pipeline by vacancy and stage: " + s.pipeline.length + " entries across " + rows.length + " vacancies. Select any cell to see the people behind the number."}
      actions={<>
        <Button icon="vacancies" onClick={() => nav.setTab("vacancies")}>Vacancies</Button>
        <Button variant="primary" icon="offers" onClick={() => nav.setTab("offers")}>Offers</Button>
      </>}>

      {hv && (
        <Card tone="accent" title={"Harbourview's General Manager search"}
          sub={"The most advanced pipeline in the sample: " + hv.entries.length + " people, " + hvAtOffer.length + " at offer stage or beyond."}
          action={<Button size="sm" iconRight="arrowRight" onClick={() => openDrawer("vacancy", HV_GM)}>Open vacancy</Button>}
          style={{ background: "linear-gradient(140deg, color-mix(in oklab, #4263EB 12%, var(--surface)) 0%, var(--surface) 60%)" }}>
          <div className="rc-grid rc-g6" style={{ gap: 8 }}>
            {STAGES.map((st, i) => (
              <button key={st.id} onClick={() => setSel({ v: HV_GM, st: st.id })} className="rc-focus rc-card rc-click"
                style={{ textAlign: "left", padding: "10px 12px", borderRadius: 12, cursor: "pointer", color: "inherit",
                  background: sel.v === HV_GM && sel.st === st.id ? "var(--accent-soft)" : "var(--surface-2)",
                  border: "1px solid " + (sel.v === HV_GM && sel.st === st.id ? "var(--accent-line)" : "var(--border)") }}>
                <div className="rc-ellipsis" style={{ fontSize: 11, color: "var(--dim)" }}>{st.label}</div>
                <div style={{ fontSize: 20, fontWeight: 600, letterSpacing: "-.6px", marginTop: 4 }}>{hv.counts[i]}</div>
              </button>
            ))}
          </div>
          <div className="rc-col" style={{ gap: 8, marginTop: 14 }}>
            {hvOffers.map(o => {
              const c = candidate(s, o.candidateId);
              return (
                <div key={o.id} onClick={() => openDrawer("offer", o.id)} className="rc-rowhover"
                  style={{ display: "flex", alignItems: "center", gap: 11, padding: "9px 12px", borderRadius: 12, background: "var(--surface-faint)", border: "1px solid var(--border)" }}>
                  <Avatar initials={c.initials} tint={c.tint} size={30} />
                  <div className="rc-grow">
                    <div style={{ fontSize: 13, fontWeight: 500, color: "var(--ink)" }}>{c.name}, {eur(o.salary)}{o.contingency ? " (contingency)" : ""}</div>
                    <div className="rc-ellipsis" style={{ fontSize: 11.5, color: "var(--dim)", marginTop: 2 }}>{o.history[o.history.length - 1]?.text}</div>
                  </div>
                  {!o.visibleToCandidate && <Badge tone="neutral" icon="eyeOff">Not visible to candidate</Badge>}
                  <Badge tone={OFFER_TONE[o.status]}>{cap(o.status)}</Badge>
                </div>
              );
            })}
          </div>
          {competing.map(o => (
            <Note key={o.id} icon="compare" style={{ marginTop: 10 }}>
              {candidate(s, o.candidateId).name.split(" ")[0]} also holds {EMPLOYER_BY_ID[o.employerId]?.short}'s {eur(o.salary)} offer for {o.title}, expiring {o.expires}. The decision stays with the candidate.
            </Note>
          ))}
        </Card>
      )}

      <Grid cols="rc-g6">
        {STAGES.map((st, i) => (
          <Stat key={st.id} label={st.label} value={String(totals[i])} sub={st.hint} tone={i === 4 ? "accent" : i === 5 ? "ok" : undefined}
            icon={i === 5 ? "check" : i === 4 ? "offers" : i === 3 ? "calendar" : i === 2 ? "mail" : i === 1 ? "bookmark" : "search"}
            onClick={() => setSel({ v: ALL, st: st.id })} />
        ))}
      </Grid>

      <Grid cols="rc-g-side-r">
        <Card title="Pipeline matrix" sub={rows.length + " vacancies with sample entries. Darker cells hold more people."}>
          <div className="rc-scroll-x">
            <div style={{ minWidth: 780 }}>
              <div style={{ display: "grid", gridTemplateColumns: TEMPLATE, alignItems: "end", paddingBottom: 8, borderBottom: "1px solid var(--border)" }}>
                <span style={{ fontSize: 11.5, color: "var(--faint)", padding: "0 8px" }}>Vacancy</span>
                {STAGES.map(st => <span key={st.id} style={{ fontSize: 11, color: "var(--faint)", textAlign: "center", lineHeight: 1.25, padding: "0 2px" }}>{st.label}</span>)}
                <span style={{ fontSize: 11.5, color: "var(--faint)", textAlign: "center" }}>Total</span>
              </div>
              {rows.map(r => {
                const e = EMPLOYER_BY_ID[r.v.employerId];
                const atOffer = r.counts[4];
                return (
                  <div key={r.v.id} style={{ display: "grid", gridTemplateColumns: TEMPLATE, alignItems: "center", padding: "6px 0", borderBottom: "1px solid var(--border)",
                    background: r.v.id === HV_GM ? "var(--accent-faint)" : undefined }}>
                    <div style={{ minWidth: 0, padding: "0 8px" }}>
                      <div className="rc-row" style={{ gap: 6 }}>
                        <button className="rc-link rc-ellipsis" style={{ color: "var(--ink)", fontSize: 12.5, fontWeight: 500, textAlign: "left", minWidth: 0 }} onClick={() => openDrawer("vacancy", r.v.id)}>{r.v.title}</button>
                        {atOffer >= 2 && <Badge tone="accent" style={{ height: 19, fontSize: 10, padding: "0 6px" }}>{atOffer} at offer</Badge>}
                      </div>
                      <div className="rc-ellipsis" style={{ fontSize: 11, color: "var(--faint)", marginTop: 2 }}>{e?.short}{r.v.created ? ", created in demo" : ""}</div>
                    </div>
                    {STAGE_ORDER.map((st, i) => (
                      <Cell key={st} n={r.counts[i]} on={sel.v === r.v.id && sel.st === st} onClick={() => setSel({ v: r.v.id, st })} />
                    ))}
                    <div style={{ textAlign: "center", fontSize: 13, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{r.entries.length}</div>
                  </div>
                );
              })}
              <div style={{ display: "grid", gridTemplateColumns: TEMPLATE, alignItems: "center", padding: "8px 0 0" }}>
                <span style={{ fontSize: 12, fontWeight: 600, padding: "0 8px" }}>All sample vacancies</span>
                {STAGE_ORDER.map((st, i) => <Cell key={st} n={totals[i]} on={sel.v === ALL && sel.st === st} onClick={() => setSel({ v: ALL, st })} strong />)}
                <div style={{ textAlign: "center", fontSize: 13, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{s.pipeline.length}</div>
              </div>
            </div>
          </div>
          {!rows.length && <Empty icon="hiring" title="No pipeline entries" body="Employers add people to pipelines from search or applications." />}
        </Card>

        <Card title={STAGE_LABEL[sel.st] + (sel.v === ALL ? ", all vacancies" : "")}
          sub={selVac ? selVac.title + ", " + (EMPLOYER_BY_ID[selVac.employerId]?.name || "") : "Everyone at this stage across the sample"}
          action={<Badge tone="accent">{selected.length}</Badge>}>
          {selected.map((p, i) => {
            const c = candidate(s, p.candidateId);
            const v = vacs.find(x => x.id === p.vacancyId);
            const offer = s.offers.find(o => o.candidateId === p.candidateId && o.vacancyId === p.vacancyId);
            return (
              <div key={p.id} style={{ padding: "11px 0", borderTop: i ? "1px solid var(--border)" : 0 }}>
                <div className="rc-row" style={{ gap: 10 }}>
                  <Avatar initials={c.initials} tint={c.tint} size={32} />
                  <div className="rc-grow">
                    <button className="rc-link" style={{ fontSize: 13, fontWeight: 600, textAlign: "left" }} onClick={() => openDrawer("candidate", c.id, { from: "hq" })}>{c.name}</button>
                    <div className="rc-ellipsis" style={{ fontSize: 11.5, color: "var(--dim)", marginTop: 2 }}>{c.title}, index {c.recruitIndex}</div>
                  </div>
                  <Badge tone={p.source === "agent" ? "accent" : "neutral"}>{SOURCE_LABEL[p.source]}</Badge>
                </div>
                {sel.v === ALL && v && <div className="rc-ellipsis" style={{ fontSize: 12, color: "var(--body)", marginTop: 7 }}>{v.title}, {EMPLOYER_BY_ID[v.employerId]?.short}</div>}
                {p.note && <div style={{ fontSize: 12, color: "var(--dim)", marginTop: 6, lineHeight: 1.45 }}>{p.note}</div>}
                <div className="rc-row" style={{ gap: 8, marginTop: 8 }}>
                  <span style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--faint)" }}>Updated: {p.updated}</span>
                  <span className="rc-grow" />
                  {offer && <Button size="sm" icon="offers" onClick={() => openDrawer("offer", offer.id)}>Offer: {offer.status}</Button>}
                </div>
              </div>
            );
          })}
          {!selected.length && <Empty icon="users" title="Nobody at this stage" body="Pick another cell in the matrix." />}
        </Card>
      </Grid>

      <Grid cols="rc-g-3-2">
        <Card title="Conversion between stages" sub="A marketplace month, worked back from 48 placements" action={<DemoTag />}>
          <Funnel stages={STAGES.map((st, i) => ({ label: st.label, value: VOLUMES[i], note: i ? RATES[i - 1].source : st.hint }))} format={num} />
          <Note style={{ marginTop: 14 }}>
            Contact to interview uses the {QUALITY.introAcceptance}% introduction acceptance rate and offer to hired the {QUALITY.offerAcceptance}% offer acceptance rate.
            The other conversion rates are illustrative assumptions, not measured results.
          </Note>
        </Card>
        <Card title="Where pipeline entries come from" sub={"All " + s.pipeline.length + " sample entries, by source"}>
          <BarList items={sources.map(x => ({ label: SOURCE_LABEL[x.src], value: x.n, display: String(x.n), color: x.src === "agent" ? "var(--teal, #16B8A6)" : "var(--accent)" }))} />
          <div style={{ marginTop: 16, padding: "12px 13px", borderRadius: "var(--r-sm, 12px)", background: "var(--surface-2)", border: "1px solid var(--border)" }}>
            <Label style={{ fontSize: 8.5 }}>Agent suggestions</Label>
            <div style={{ fontSize: 12.5, color: "var(--body)", marginTop: 6, lineHeight: 1.5 }}>
              Talent Matchmaker suggests people with the evidence for each suggestion. An employer decides whether anyone moves forward; nobody is rejected automatically.
            </div>
          </div>
        </Card>
      </Grid>
    </Page>
  );
}

function Cell({ n, on, onClick, strong }: { n: number; on: boolean; onClick: () => void; strong?: boolean }) {
  return (
    <button onClick={onClick} disabled={!n} className="rc-focus"
      style={{ height: 34, margin: "0 3px", borderRadius: 9, border: "1px solid " + (on ? "var(--accent)" : "transparent"),
        background: n ? "color-mix(in oklab, var(--accent) " + Math.min(56, (strong ? 8 : 14) + n * (strong ? 4 : 14)) + "%, transparent)" : "transparent",
        color: n ? "var(--ink)" : "var(--faint)", fontSize: 13, fontWeight: n ? 600 : 400, cursor: n ? "pointer" : "default", fontVariantNumeric: "tabular-nums",
        boxShadow: on ? "0 0 0 3px var(--accent-soft)" : "none", transition: "box-shadow .2s var(--ease), border-color .2s var(--ease)" }}>
      {n}
    </button>
  );
}
