import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Badge, Button, Card, Chip, DemoTag, Empty, Label, Page, Progress, Segmented, Timeline } from "../../ui";
import { SERIES_COLORS, StackBar } from "../../charts";
import { Icon } from "../../icons";
import { useNav } from "../../nav";
import { useRecruit } from "../../store";
import { searchableCandidates } from "../../selectors";
import { CANDIDATES, GOVERNANCE, MARKET, QUALITY, REGION_MIX } from "../../data";
import type { Availability, Candidate } from "../../data/types";
import { num, plural } from "../../format";

/* Marketplace preview: a public, anonymised sample of the professionals an
   employer can discover. No names, no contact details and no current
   employer names: identity is revealed only when a professional accepts an
   introduction. */

const EMPLOYER = "e-harbourview";

type Family = "all" | "gm" | "rooms" | "fb" | "commercial" | "events";
type Sort = "index" | "available" | "experience";
type Tone = "accent" | "ok" | "warn" | "bad" | "neutral" | "teal";

const FAMILIES: { id: Family; label: string }[] = [
  { id: "all", label: "All roles" },
  { id: "gm", label: "General management" },
  { id: "rooms", label: "Rooms and guest experience" },
  { id: "fb", label: "Food and beverage" },
  { id: "commercial", label: "Commercial" },
  { id: "events", label: "Events" },
];
const REGION_ORDER = ["Leinster", "Munster", "Connacht", "International"];
const AVAILABILITY_RANK: Record<Availability, number> = { "Actively looking": 0, "Open to offers": 1, Passive: 2, "Not looking": 3 };
const AVAILABILITY_TONE: Record<Availability, Tone> = { "Actively looking": "teal", "Open to offers": "accent", Passive: "neutral", "Not looking": "neutral" };
const PROMISES = ["g-consent", "g-discover", "g-block", "g-human"];

/** Role family from the professional's title. Adjacent sectors only show under "All roles". */
function familyOf(c: Candidate): Family | null {
  if (c.industry !== "Hospitality") return null;
  const t = c.title.toLowerCase();
  if (/event|conference|banquet/.test(t)) return "events";
  if (/revenue|sales|commercial|marketing/.test(t)) return "commercial";
  if (/food|beverage|chef|\bbar\b|sommelier/.test(t)) return "fb";
  if (/rooms|front office|guest|housekeep|spa|concierge|accommodation/.test(t)) return "rooms";
  if (/general manager|hotel manager|director of operations|operations manager|duty manager/.test(t)) return "gm";
  return null;
}

/* Public pages never show names. Same derivation as the employer portal's
   anonymous profiles, nudged on collision so every id is unique and stable. */
const PUBLIC_IDS: Record<string, number> = (() => {
  const used = new Set<number>();
  const out: Record<string, number> = {};
  CANDIDATES.forEach(c => {
    let n = 40000 + (c.recruitIndex * 37) % 9999;
    while (used.has(n)) n++;
    used.add(n);
    out[c.id] = n;
  });
  return out;
})();
const pid = (id: string) => "#" + (PUBLIC_IDS[id] ?? 40000);

const topSkills = (c: Candidate, n = 3) => c.skills.slice()
  .sort((a, b) => Number(b.verification === "verified") - Number(a.verification === "verified") || b.level - a.level).slice(0, n);

export default function Preview() {
  const s = useRecruit();
  const nav = useNav();
  const [family, setFamily] = useState<Family>("all");
  const [region, setRegion] = useState("all");
  const [sort, setSort] = useState<Sort>("index");
  const [picked, setPicked] = useState<string | null>(null);

  const pool = useMemo(() => searchableCandidates(s, EMPLOYER), [s]);
  const inFamily = (c: Candidate) => family === "all" || familyOf(c) === family;
  const inRegion = (c: Candidate) => region === "all" || c.region === region;
  const list = pool.filter(c => inFamily(c) && inRegion(c)).sort((a, b) => {
    if (sort === "available") return AVAILABILITY_RANK[a.availability] - AVAILABILITY_RANK[b.availability] || a.noticeWeeks - b.noticeWeeks || b.recruitIndex - a.recruitIndex;
    if (sort === "experience") return b.years - a.years || b.recruitIndex - a.recruitIndex;
    return b.recruitIndex - a.recruitIndex;
  });
  const selected = list.find(c => c.id === picked) || list[0] || null;
  const regions = REGION_ORDER.filter(r => pool.some(c => c.region === r));
  const familyCount = (f: Family) => pool.filter(c => inRegion(c) && (f === "all" || familyOf(c) === f)).length;
  const regionCount = (r: string) => pool.filter(c => inFamily(c) && (r === "all" || c.region === r)).length;
  const clear = () => { setFamily("all"); setRegion("all"); };
  /* Matches the rc-g-side-r breakpoint: side by side above 1180px, stacked below. */
  const wide = useMinWidth(1181);

  const filters = (
    <Card pad={18}>
      <div className="rc-row rc-wrap" style={{ gap: 12 }}>
        <div className="rc-grow" style={{ minWidth: 240 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)" }}>
            Showing {plural(list.length, "sample profile")} of {num(MARKET.discoverableCandidates)} discoverable professionals
          </div>
          <div className="rc-row" style={{ gap: 8, marginTop: 6 }}>
            <DemoTag />
            <span style={{ fontSize: 11.5, color: "var(--faint)" }}>Sample records from the illustrative future-state marketplace</span>
          </div>
        </div>
        <Segmented size="sm" value={sort} onChange={setSort}
          options={[{ id: "index", label: "Recruit Index" }, { id: "available", label: "Availability" }, { id: "experience", label: "Experience" }]} />
      </div>
      <Label style={{ marginTop: 18 }}>Role family</Label>
      <div className="rc-row rc-wrap" style={{ gap: 6, marginTop: 9 }}>
        {FAMILIES.map(f => (
          <Chip key={f.id} active={family === f.id} onClick={() => setFamily(f.id)}>
            {f.label}<span style={{ color: "var(--faint)", fontVariantNumeric: "tabular-nums" }}>{familyCount(f.id)}</span>
          </Chip>
        ))}
      </div>
      <Label style={{ marginTop: 14 }}>Region</Label>
      <div className="rc-row rc-wrap" style={{ gap: 6, marginTop: 9 }}>
        {["all"].concat(regions).map(r => (
          <Chip key={r} active={region === r} onClick={() => setRegion(r)}>
            {r === "all" ? "All regions" : r}<span style={{ color: "var(--faint)", fontVariantNumeric: "tabular-nums" }}>{regionCount(r)}</span>
          </Chip>
        ))}
      </div>
      <div style={{ marginTop: 18, paddingTop: 14, borderTop: "1px solid var(--border)" }}>
        <div className="rc-row" style={{ gap: 10, marginBottom: 9 }}>
          <span style={{ fontSize: 12, color: "var(--dim)" }}>Where the wider marketplace is based</span>
        </div>
        <StackBar height={8} parts={REGION_MIX.map((r, i) => ({ label: r.label, value: r.value, color: SERIES_COLORS[i % SERIES_COLORS.length] }))} />
        <div className="rc-row rc-wrap" style={{ gap: "6px 14px", marginTop: 10, fontSize: 11.5, color: "var(--dim)" }}>
          {REGION_MIX.map((r, i) => (
            <span key={r.label} className="rc-row" style={{ gap: 6 }}>
              <span style={{ width: 8, height: 8, borderRadius: 3, background: SERIES_COLORS[i % SERIES_COLORS.length] }} />{r.label} {r.value}%
            </span>
          ))}
        </div>
      </div>
    </Card>
  );

  const profiles = list.length ? (
    <div className="rc-grid rc-g2" style={{ gap: 12 }}>
      {list.map(c => <AnonCard key={c.id} c={c} selected={selected?.id === c.id} onSelect={() => setPicked(c.id)} />)}
    </div>
  ) : (
    <Card>
      <Empty icon="search" title="No sample profiles match"
        body={"Try another role family or region. The full marketplace holds " + num(MARKET.discoverableCandidates) + " discoverable professionals in the scenario."}
        action={<Button size="sm" icon="refresh" onClick={clear}>Clear filters</Button>} />
    </Card>
  );

  return (
    <Page wide eyebrow="MARKETPLACE PREVIEW" title="Verified talent, revealed only with consent."
      sub="A live sample of the professionals employers can discover. Names, contact details and current employers stay hidden until a professional accepts an introduction."
      actions={<Button variant="primary" icon="search" onClick={() => nav.go("emp.talent", "discover")}>Search as an employer</Button>}>
      {wide ? (
        <div className="rc-grid rc-g-side-r" style={{ gap: 14, alignItems: "start" }}>
          <div className="rc-col" style={{ gap: 14 }}>{filters}{profiles}</div>
          {/* Sticky so the panel follows whichever card is selected */}
          <div style={{ position: "sticky", top: 12, minWidth: 0, maxHeight: "calc(100vh - 132px)", overflowY: "auto", borderRadius: "var(--card-r, 18px)" }}>
            <ConsentPanel c={selected} />
          </div>
        </div>
      ) : (
        <>
          {filters}
          <ConsentPanel c={selected} />
          {profiles}
        </>
      )}
    </Page>
  );
}

function useMinWidth(px: number) {
  const query = "(min-width: " + px + "px)";
  const [on, setOn] = useState(() => typeof window === "undefined" || typeof window.matchMedia !== "function" || window.matchMedia(query).matches);
  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const mq = window.matchMedia(query);
    const sync = () => setOn(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, [query]);
  return on;
}

/* ── the anonymised card ────────────────────────────────────────────────── */

function AnonCard({ c, selected, onSelect }: { c: Candidate; selected: boolean; onSelect: () => void }) {
  return (
    <button onClick={onSelect} className="rc-card rc-click rc-focus" aria-pressed={selected}
      style={{ display: "flex", flexDirection: "column", width: "100%", minWidth: 0, textAlign: "left", padding: 16, borderRadius: "var(--card-r, 18px)", cursor: "pointer", color: "inherit",
        background: selected ? "linear-gradient(160deg, color-mix(in oklab, #4263EB 15%, var(--surface)) 0%, var(--surface) 65%)" : "var(--surface)",
        border: "1px solid " + (selected ? "var(--accent-line)" : "var(--border)"), boxShadow: selected ? "0 0 0 1px var(--accent-line)" : "var(--card-shadow)" }}>
      <div className="rc-row" style={{ gap: 11, width: "100%" }}>
        <AnonAvatar size={36} />
        <div className="rc-grow">
          <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--ink)" }}>Professional {pid(c.id)}</div>
          <div className="rc-ellipsis" style={{ fontSize: 11.5, color: "var(--faint)", marginTop: 2 }}>{c.currentOrgPublic}</div>
        </div>
        <Badge tone={AVAILABILITY_TONE[c.availability]}>{c.availability}</Badge>
      </div>
      <div style={{ fontSize: 15, fontWeight: 500, letterSpacing: "-.2px", marginTop: 13, color: "var(--ink)" }}>{c.title}</div>
      <div className="rc-row rc-wrap" style={{ gap: "6px 14px", marginTop: 7, fontSize: 12, color: "var(--dim)" }}>
        <Meta icon="clock" text={c.years + " years"} />
        <Meta icon="pin" text={c.region} />
        <Meta icon="calendar" text={c.noticeWeeks + " weeks' notice"} />
      </div>
      <div className="rc-row" style={{ gap: 12, marginTop: 14, width: "100%" }}>
        <div style={{ flex: "none" }}>
          <div style={{ fontSize: 21, fontWeight: 600, letterSpacing: "-.6px", lineHeight: 1, color: "var(--ink)", fontVariantNumeric: "tabular-nums" }}>{c.recruitIndex}</div>
          <div style={{ fontSize: 10.5, color: "var(--faint)", marginTop: 4 }}>Recruit Index</div>
        </div>
        <div className="rc-grow"><Progress value={c.recruitIndex} max={1000} height={5} /></div>
        <span className="rc-row" style={{ gap: 5, fontSize: 11.5, color: "var(--teal, var(--ok))", flex: "none" }}>
          <Icon name="verified" size={13} />{c.verifiedCredentials} verified
        </span>
      </div>
      <div className="rc-col" style={{ gap: 6, marginTop: 13, paddingTop: 12, borderTop: "1px solid var(--border)", width: "100%" }}>
        {topSkills(c).map(sk => (
          <div key={sk.name} className="rc-row" style={{ gap: 8, fontSize: 12, color: "var(--body)" }}>
            <Icon name={sk.verification === "verified" ? "check" : sk.verification === "pending" ? "clock" : "edit"} size={12} stroke={2.2}
              style={{ color: sk.verification === "verified" ? "var(--teal, var(--ok))" : sk.verification === "pending" ? "var(--warn)" : "var(--faint)" }} />
            <span className="rc-ellipsis">{sk.name}</span>
          </div>
        ))}
      </div>
    </button>
  );
}

function Meta({ icon, text }: { icon: string; text: string }) {
  return <span className="rc-row" style={{ gap: 5 }}><Icon name={icon} size={12} style={{ color: "var(--faint)" }} />{text}</span>;
}

function AnonAvatar({ size = 36 }: { size?: number }) {
  return (
    <span aria-hidden="true" style={{ width: size, height: size, flex: "none", borderRadius: Math.round(size * 0.32), display: "inline-flex", alignItems: "center", justifyContent: "center",
      background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--dim)" }}>
      <Icon name="candidate" size={Math.round(size * 0.5)} />
    </span>
  );
}

/* ── consent ────────────────────────────────────────────────────────────── */

function ConsentPanel({ c }: { c: Candidate | null }) {
  const s = useRecruit();
  const nav = useNav();
  const promises = GOVERNANCE.filter(g => PROMISES.includes(g.id) && s.governance[g.id] !== false);
  const visible = ["Role and sector", "Experience and region", "Index and evidence", "Skills, with checks", "Availability"];
  const hidden = [{ k: "Name", w: 44 }, { k: "Email", w: 52 }, { k: "Phone", w: 48 }, { k: "Current employer", w: 0 }];
  return (
    <Card title="Consent comes first" sub="Employers see evidence first. Identity follows only when the professional says yes."
      action={<Badge tone="teal" icon="shield">Protected</Badge>}>
      {c && (
        <div key={c.id} className="rc-row rc-fade" style={{ gap: 11, padding: "11px 12px", borderRadius: 14, background: "var(--surface-2)", border: "1px solid var(--border)" }}>
          <AnonAvatar size={34} />
          <div className="rc-grow">
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>Professional {pid(c.id)}</div>
            <div className="rc-ellipsis" style={{ fontSize: 11.5, color: "var(--dim)", marginTop: 2 }}>{c.title}, {c.years} years</div>
          </div>
          <span style={{ fontSize: 11, color: "var(--faint)", flex: "none" }}>Selected</span>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(128px, 1fr))", gap: "16px 18px", marginTop: 16 }}>
        <div style={{ minWidth: 0 }}>
          <Label>Visible now</Label>
          <div className="rc-col" style={{ gap: 7, marginTop: 10 }}>
            {visible.map(v => <Line key={v} icon="eye" color="var(--teal, var(--ok))">{v}</Line>)}
          </div>
        </div>
        <div style={{ minWidth: 0 }}>
          <Label>After consent</Label>
          <div className="rc-col" style={{ gap: 7, marginTop: 10 }}>
            {hidden.map(h => (
              <div key={h.k} className="rc-row" style={{ gap: 9, fontSize: 12.5, color: "var(--body)", lineHeight: 1.45 }}>
                <Icon name="lock" size={13} style={{ color: "var(--dim)" }} />
                <span style={{ whiteSpace: "nowrap" }}>{h.k}</span>
                {h.w > 0 && <span aria-hidden="true" style={{ width: h.w, height: 7, borderRadius: 999, background: "var(--track)", flex: "none" }} />}
              </div>
            ))}
          </div>
        </div>
      </div>

      <Label style={{ marginTop: 18 }}>How an introduction works</Label>
      <div style={{ marginTop: 12 }}>
        <Timeline items={[
          { when: "", title: "An employer asks", body: "For a specific role, with the salary band shown." },
          { when: "", title: "The professional decides", body: "Accept or decline. Declining shares nothing.", tone: "warn" as const },
          { when: "", title: "Identity is shared", body: "Name and contact details go to that employer only.", tone: "teal" as const },
        ]} />
      </div>

      {promises.length > 0 && (
        <div className="rc-col" style={{ gap: 7, marginTop: 16, paddingTop: 14, borderTop: "1px solid var(--border)" }}>
          {promises.map(g => <Line key={g.id} icon="check" color="var(--accent)">{g.label}</Line>)}
        </div>
      )}

      <div className="rc-row rc-wrap" style={{ gap: 10, marginTop: 16 }}>
        <span className="rc-grow" style={{ fontSize: 11.5, color: "var(--faint)", lineHeight: 1.5, minWidth: 150 }}>
          {QUALITY.introAcceptance}% of introductions are accepted in the illustrative scenario.
        </span>
        <Button size="sm" icon="eyeOff" onClick={() => nav.go("cand.settings", "visibility")}>Privacy controls</Button>
      </div>
    </Card>
  );
}

function Line({ icon, color, children }: { icon: string; color: string; children: ReactNode }) {
  return (
    <div className="rc-row" style={{ gap: 9, alignItems: "flex-start", fontSize: 12.5, color: "var(--body)", lineHeight: 1.45 }}>
      <Icon name={icon} size={13} stroke={2} style={{ color, marginTop: 2 }} />
      <span>{children}</span>
    </div>
  );
}
