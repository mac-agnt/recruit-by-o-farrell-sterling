# Recruit by O'Farrell Sterling

A frontend demonstration of **Recruit**, a recruitment marketplace concept from John O'Farrell (O'Farrell Sterling Limited, Dublin), built on the Pulse v4/v5 Glass UI.

Everything is mock data in the browser. There is no backend, no authentication, no payments, no live AI and no external integration. All marketplace figures describe one illustrative future-state scenario, not actual results.

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
npm run typecheck
npm run build
```

## Four views, one shared state

Switch views with the **Demo view** control at the top of the side rail.

| View | Who it is for | Where |
| --- | --- | --- |
| Discover Recruit | Investors, partners, first-time visitors | `src/recruit/pages/pub/` |
| Candidate | Aoife Byrne, Mark Doyle or Sarah Kavanagh (persona picker in the rail) | `src/recruit/pages/cand/` |
| Employer | Harbourview Grand Hotel (Rachel Moran, HR Director) | `src/recruit/pages/emp/` |
| Recruit HQ | John O'Farrell and the founding team | Pulse pages in `src/views/pages/` plus `src/recruit/pages/hq/` |

The **DEMO** marker at the bottom left opens the presenter guide: eight scenes in the sales-demo order, each of which opens the right view and sets up its story. It also resets the demo data.

## How it fits together

- `src/recruit/data/` holds every fixture with stable ids (candidates, employers, vacancies, pipelines, offers, placements, courses, partners, agents, HQ). Marketplace totals live in `data/metrics.ts`.
- `src/recruit/store.ts` is the one shared store. Actions (shortlist, request an introduction, schedule an interview, create and approve an offer, accept an offer, apply, enrol, change visibility, switch membership) update every view at once and write to the activity log. State persists in this browser's localStorage only.
- `src/recruit/selectors.ts` and `src/recruit/match.ts` derive views and explainable match scores. Scores are decision support; nothing is rejected automatically.
- `src/recruit/nav.tsx` defines each view's side rail and top-bar tabs. `src/logic/PulseLogic.js` owns navigation state and keeps the Pulse locked layout (Home first, Agents under Home; Records opens on Ontology).
- `src/recruit/ui.tsx` and `src/recruit/charts.tsx` are the UI kit, built only from the Pulse theme tokens. The `recruit` theme lives in `src/styles/pulse.css`.

Read `CLAUDE.md` before customising: it lists the layout rules every copy keeps.

## Do not re-import from Claude Design

`npm run import-design` regenerates `src/views/`, `src/styles/pulse.css`, `src/styles/interactions.css` and `src/logic/`, which would wipe the Recruit customisation.
