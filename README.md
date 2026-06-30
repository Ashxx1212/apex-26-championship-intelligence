# APEX 26 — Championship Intelligence

**Live Demo:** https://apex-26-championship-intelligence.vercel.app/

APEX 26 is a full-stack motorsport intelligence portfolio platform built with **React, TypeScript, Vite, Supabase, and OpenF1-derived public data**.

It turns championship standings, calendar context, indexed race records, qualifying evidence, and reliability signals into a connected command-centre experience for driver, team, circuit, scenario, and next-event analysis.

> **Portfolio project:** APEX 26 is an unofficial motorsport analytics demonstration. It is not affiliated with Formula 1, the FIA, OpenF1, any racing team, driver, commercial rights holder, or motorsport organisation.

---

## System at a Glance

| Area | What APEX 26 Does |
| --- | --- |
| **Purpose** | Presents verified championship intelligence through a connected motorsport operations interface. |
| **Data flow** | OpenF1 → Supabase Edge Functions → Supabase PostgreSQL → React dashboard. |
| **Persistence** | Stores championship entities, standings, indexed race results, qualifying evidence, and sync-run audit records in Supabase. |
| **Transparency** | Separates completed calendar rounds, verified indexed race records, source-pending records, model estimates, and unavailable data. |
| **Model discipline** | Uses transparent, evidence-weighted portfolio estimates. It does not present model output as official results, betting advice, or guarantees. |

---

## Key Features

- **Command Centre** for the current championship state, next-event focus, verified standings, archive coverage, latest verified result, watchlists, and operational context.
- **Shared Intelligence Context** that keeps driver, team, and selected race-weekend context aligned across modules.
- **Driver Intelligence** with form, qualifying, classified finish, completion rate, DNF count, teammate comparison, and indexed historical evidence.
- **Team Performance** with constructor standing, driver contribution, performance signals, reliability, latest verified result, and coverage limitations.
- **Circuit Matrix** for season event navigation, track context, completed/upcoming status, verified winner state, and pending-result visibility.
- **Scenario Lab** with a transparent Title Path Index based on current standings, indexed results, qualifying evidence, reliability, and remaining calendar context.
- **Predictive Outlook** for the next indexed Grand Prix, using labelled evidence-weighted Top 5 portfolio estimates.
- **Model Notes** documenting architecture, source policy, replay limitations, metric definitions, model guardrails, and data-integrity controls.
- **Data Integrity Protocol** with refresh controls, archive coverage, rate-limit awareness, source-access handling, and explicit pending states.

---

## Production Architecture

```text
OpenF1 Public API
        ↓
Supabase Edge Functions
  ├── apex-health
  ├── apex-sync
  └── apex-backfill
        ↓
Supabase PostgreSQL
  ├── meetings
  ├── teams
  ├── drivers
  ├── driver_standings
  ├── team_standings
  ├── race_results
  └── sync_runs
        ↓
Supabase-first ChampionshipDataSnapshot
        ↓
React + TypeScript Dashboard
  ├── Command Centre
  ├── Championship
  ├── Driver Intel
  ├── Team Performance
  ├── Circuit Matrix
  ├── Scenario Lab
  └── Model Notes
```

### Backend Design

- **`apex-sync`** ingests current calendar, teams, drivers, standings, latest race results, and qualifying results.
- **`apex-backfill`** extends verified historical result coverage in controlled batches.
- **`apex-health`** supports backend health visibility.
- Core entities use upserts to preserve stable UUID relationships.
- `sync_runs` provides audit logging for ingestion activity.
- Public read-only policies support the dashboard’s browser-side data access.
- The React application reads a **Supabase-first** snapshot and uses OpenF1 only as a controlled fallback.

---

## Data Transparency Rules

APEX deliberately distinguishes between several different states:

| State | Meaning |
| --- | --- |
| **Completed calendar round** | A Grand Prix has passed on the official calendar. |
| **Verified race record indexed** | A race result has been retrieved, validated, and stored for analysis. |
| **Source record pending** | A completed event exists, but an eligible source result is not yet available or indexed. |
| **Verified historical metric** | A value derived from stored standings, results, qualifying, or driver/team metadata. |
| **Model estimate** | A transparent analytical output, clearly separated from verified race facts. |
| **Unavailable data** | Displayed as pending or unavailable rather than fabricated. |

This means a completed round is not automatically treated as a verified indexed result.

---

## Product Modules

### Command Centre

The primary operating view includes:

- Current event and next-event context
- Championship leader and closest challenger
- Latest verified Grand Prix debrief
- Archive-readiness and source-pending visibility
- Verified classification snapshot
- Operational watchlist
- Predictive Outlook
- Live Refresh status
- Data Integrity controls

### Championship

A championship workspace featuring:

- Drivers’ standings
- Constructors’ standings
- Recent form markers
- Race timeline and calendar progression
- Verified archive coverage
- Explicit forecasting guardrails

### Driver Intel

A driver dossier including:

- Championship position and points gap
- Recent classified race form
- Average classified finish
- Indexed qualifying position
- Completion rate and DNF count
- Teammate comparison
- Driver contribution and historical observations
- Navigation into Team Performance, Circuit Matrix, and Scenario Lab

### Team Performance

A constructor intelligence workspace featuring:

- Constructor rankings
- Driver contribution split
- Team performance index
- Reliability and completion evidence
- Latest verified result
- Archive coverage and evidence limitations

### Circuit Matrix

A season event and track intelligence module featuring:

- Completed, upcoming, and active calendar states
- Selected event context
- Circuit and calendar information
- Verified winner display only after result indexing
- Amber pending status for completed rounds without a verified source record
- Routing into Scenario Lab while preserving the selected weekend

### Scenario Lab

Scenario Lab provides a transparent **Title Path Index** based on:

- Current championship position
- Points gap to the leader
- Indexed race and qualifying evidence
- Reliability and completion signals
- Recent form
- Remaining calendar context
- Archive coverage limitations

It does **not** provide title-win probability, betting advice, financial advice, or fabricated race outcomes.

### Predictive Outlook

Predictive Outlook is an evidence-weighted portfolio model for the next indexed Grand Prix.

It includes:

- Ranked Top 5 next-race outlook
- Probability-style model estimates
- Completed-race evidence coverage
- Recent form and classified finish signals
- Indexed qualifying evidence
- Team-performance and completion-reliability inputs
- External weather context when available within the provider window

Predictive Outlook is clearly labelled as a model estimate. It is not official timing, a trained machine-learning system, betting advice, financial advice, or a guaranteed outcome.

### Session Intelligence Replay

Replay is an optional historical session-review feature.

- Verified archive context includes classified results, qualifying, laps, and gap data where indexed.
- Optional historical replay enrichment can request additional OpenF1 signals on demand.
- Pit, stint, race-control, and weather signals are **not** represented as a complete Supabase-persisted replay archive.
- Source availability can affect replay loading.
- Replay is never presented as live timing.

---

## Technology Stack

- **React**
- **TypeScript**
- **Vite**
- **Tailwind CSS**
- **Lucide React**
- **Supabase PostgreSQL**
- **Supabase Edge Functions**
- **Supabase Row Level Security**
- **OpenF1 public API**
- **External weather forecast context**
- **Vercel**
- **Git and GitHub**

---

## Project Structure

```text
src/
├── components/                  # Shared dashboard UI
├── features/
│   ├── circuitMatrix/           # Event and track intelligence
│   ├── driverIntel/             # Driver dossiers and comparisons
│   ├── notes/                   # Model Trust Console
│   ├── predictiveOutlook/       # Evidence-weighted race outlook
│   ├── scenarioLab/             # Transparent contender model
│   └── teamPerformance/         # Constructor intelligence
├── hooks/
│   ├── useChampionshipData.ts
│   └── useSessionReplay.ts
├── repositories/                # Supabase read-layer repositories
├── services/                    # Snapshot, OpenF1, Supabase, replay services
├── types/                       # Shared application types
├── utils/                       # Formatting and analytics helpers
└── supabaseClient.ts             # Browser-side Supabase client

supabase/
└── functions/
    ├── apex-health/
    ├── apex-sync/
    └── apex-backfill/
```

---

## Run Locally

### Prerequisites

- Node.js 18 or later
- npm
- A Supabase project configured with the required tables, RLS policies, and Edge Functions

### Installation

```bash
git clone https://github.com/Ashxx1212/apex-26-championship-intelligence.git
cd apex-26-championship-intelligence
npm install
```

### Environment Variables

Create a `.env.local` file:

```env
VITE_OPENF1_BASE_URL=https://api.openf1.org/v1
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_key
```

> Never place a Supabase service-role key in the frontend or in `VITE_` variables.

### Start Development Server

```bash
npm run dev
```

The application is normally available at:

```text
http://localhost:5173
```

### Production Build

```bash
npm run build
```

---

## Available Scripts

```bash
npm run dev        # Start local development server
npm run build      # Create production build
npm run lint       # Run ESLint checks
npm run typecheck  # Run TypeScript type checking
```

---

## Current Scope and Limitations

- OpenF1 public-source access can be restricted or rate-limited during active sessions.
- Historical race coverage may be partial while completed records are being indexed.
- Completed calendar rounds and verified race records are intentionally displayed separately.
- Missing historical records remain pending rather than being estimated.
- Predictive Outlook remains an explainable portfolio model, not a trained machine-learning system.
- Title-win probabilities are deliberately withheld.
- External weather context is available only inside the provider’s supported forecast window.
- The application does not provide betting, financial, race-strategy, or title-win prediction advice.

---

## Portfolio Disclaimer

APEX 26 is an unofficial motorsport analytics portfolio project created for educational and demonstration purposes.

It demonstrates full-stack data integration, responsive dashboard design, source-aware data handling, transparent analytical modelling, and recruiter-facing technical documentation.

---

## License

MIT License.