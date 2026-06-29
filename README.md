# APEX 26 — Championship Intelligence
**Live Demo:** https://apex-26-championship-intelligence.vercel.app/
A cinematic motorsport intelligence portfolio system built with **React, TypeScript, Vite, and OpenF1-derived public data**.

APEX 26 turns verified championship, event, driver, constructor, weather, and historical-session information into a connected race-operations interface. It combines a Command Centre, Driver Intelligence dossiers, Constructor Intelligence, Circuit Matrix, transparent Scenario Lab, historical replay capability, Predictive Outlook, local caching, archive recovery, and explicit data-integrity controls.

> **Portfolio project:** APEX 26 is an unofficial motorsport analytics demonstration. It is not affiliated with Formula 1, the FIA, any racing team, driver, or commercial rights holder.

---

## Highlights

* **Cinematic Command Centre** for championship state, latest verified results, event focus, operational watchlists, and data status.
* **Shared Intelligence Context** that carries selected driver, constructor, and race weekend across modules.
* **Driver Intelligence** dossiers with recent race form, qualifying and finish metrics, completion rate, DNF count, teammate comparison, and verified observations.
* **Constructor Intelligence** with team rankings, driver contribution split, evidence board, reliability signals, latest verified race detail, and archive coverage.
* **Circuit Matrix** for season event navigation, verified race-result state, event readiness, and Scenario Lab routing.
* **Scenario Lab** with a transparent Title Path Index based on current points and verified historical evidence—not title-win probability or betting advice.
* **Session Intelligence Replay** for verified historical race review, replay event logs, timing order, race-control events, stint and weather observations when supported by verified historical data.
* **Predictive Outlook** for the next indexed Grand Prix, combining verified completed-race evidence, transparent Top 5 projected-winner estimates, model confidence, evidence coverage, reliability/form inputs, and external weather context when available.
* **Model Trust Console** documenting architecture, source policy, archive rules, metric definitions, replay integrity, scenario guardrails, and build record.
* **Data Integrity Protocol** with local cache awareness, partial archive status, missing-round recovery, rate-limit handling, and no fabricated data.

---

## Product Modules

### Command Centre

The central operating view for:

* Current championship and calendar status
* Latest verified Grand Prix result
* Selected event priority
* Championship pressure and signal watchlists
* Historical replay gateway
* Data integrity controls
* Cache, source, archive, and refresh status

### Championship

A championship-state workspace featuring:

* Drivers’ standings
* Constructors’ standings
* Recent form markers
* Championship momentum board
* Season Vector race timeline
* Race Radar for completed and upcoming events
* Forecast calibration status
* Data integrity and archive coverage controls

### Driver Intel

A driver-level intelligence dossier including:

* Championship position and points gap
* Recent form markers
* Average classified finish
* Average qualifying position
* Completion rate and DNF count
* Recent verified race history
* Teammate comparison
* Verified observations derived from indexed race records
* Navigation to Constructor Intelligence, Circuit Matrix, and Scenario Lab

### Team Performance

A constructor intelligence workspace featuring:

* Constructor ranking navigator
* Driver contribution split
* Team performance index
* Reliability and completion metrics
* Teammate advantage comparison
* Latest verified team result
* Archive coverage and evidence limitations
* Routing to Driver Intel and Circuit Matrix

### Circuit Matrix

A season event and track intelligence module featuring:

* Completed, active, and upcoming event states
* Verified race winner display only after result indexing
* Selected event context
* Circuit type and calendar information
* Archive readiness and result-verification state
* Routing into Scenario Lab with the selected weekend preserved

### Scenario Lab

A transparent contender-analysis workspace.

The Scenario Lab provides a **Title Path Index** based on:

* Current championship position
* Points gap to leader
* Indexed race and qualifying evidence
* Reliability and completion signals
* Recent form
* Archive coverage limitations

It does **not** provide title-win probability, betting advice, financial advice, or fabricated race predictions.

### Session Intelligence Replay

A historical replay environment for indexed, verified sessions.

Capabilities include:

* Historical race-position order
* Replay event bus
* Race-control event review
* Lap and timing progression
* Verified stint and weather observations where available
* Playback controls and replay speed selection
* Explicit distinction between replay data and live timing

---
### Predictive Outlook

An evidence-weighted race-estimation panel for the next indexed Grand Prix.

Capabilities include:

* Top 5 projected race-winner outlook
* Transparent probability-style model estimates
* Model confidence and completed-race evidence coverage
* Recent form, race pace, qualifying, team-performance, and reliability inputs
* Weather context including temperature, rain risk, precipitation, and wind when the event falls inside the supported forecast window
* Automatic event recalculation when the next upcoming Grand Prix changes
* Explicit distinction between verified historical evidence, external weather signals, and model-estimated outcomes

Predictive Outlook is a portfolio-model feature. It does not present projections as official timing, betting advice, financial advice, guarantees, or driver-specific wet-weather performance claims.

## Data Integrity Principles

APEX follows strict data-discipline rules:

1. **Verified inputs only**
   Championship standings, session metadata, driver data, and race records are sourced from OpenF1-derived public data or a previously verified local cache.

2. **No fabricated verified data**
   Missing results, unavailable metrics, unindexed rounds, tyre state, weather observations, timing, and strategy calls are never presented as verified facts.

   Predictive Outlook outputs are clearly labelled as evidence-weighted model estimates. They are separated from verified historical records and never presented as guaranteed race outcomes.

3. **Partial archive is visible**
   Archive coverage is displayed across the system. Metrics derived from indexed race records are clearly labelled as partial when completed rounds remain pending.

4. **Replay is not presented as live timing**
   Historical session replay is explicitly labelled as replay intelligence. Live timing is shown only when a verified current timing source is available.

5. **Scenario Lab is evidence-based**
   The Title Path Index ranks current contender evidence; it is not a prediction engine or probability model.

6. **Forecast and weather signals are labelled separately**
   Weather information is treated as external forecast context when available within the provider’s supported time window. Model estimates show evidence coverage and confidence so uncertainty remains visible.

7. **Source restrictions are handled safely**
   During provider restrictions, rate limits, or unavailable access, APEX preserves available verified cache data and pauses unsupported refresh behaviour.

---

## Data Architecture

```text
OpenF1-derived public source
        ↓
Rate-limited API client
        ↓
Versioned local cache and archive recovery
        ↓
Championship standings and verified race records
        ↓
Driver Intel / Team Performance / Circuit Matrix
        ↓
Scenario Lab / Session Intelligence Replay / Model Trust Console
```

---

## Cache and Archive Strategy

### Core Snapshot

The primary championship snapshot includes:

* 2026 calendar and event state
* Driver standings
* Constructor standings
* Driver metadata
* Latest verified result
* Shared championship context

Core data is cached locally to allow fast re-entry and graceful fallback when public source access is temporarily unavailable.

### Analytics Archive

The analytics archive indexes completed race and qualifying data progressively.

It supports:

* Recent-form calculations
* Average finish and qualifying metrics
* Completion and reliability rates
* Teammate comparisons
* Driver contribution analysis
* Historical replay inputs
* Transparent archive coverage reporting

Partially indexed rounds remain visibly marked as pending rather than being estimated.

### Rate-Limit and Restriction Handling

The application uses controlled request behaviour to reduce avoidable source pressure:

* Serial API request processing
* Delayed historical archive requests
* Retry and cooldown handling for restricted access
* Cached-data fallback
* Visible source and archive status
* Manual recovery controls for missing rounds

---

## Technology Stack

* **React**
* **TypeScript**
* **Vite**
* **Tailwind CSS**
* **Lucide React**
* **OpenF1 public API**
* **LocalStorage-based versioned caching**
* **Git and GitHub**
* **External weather forecast service**
* **Evidence-weighted predictive modelling**

---

## Project Structure

```text
src/
├── components/                  # Shared dashboard UI
│   ├── AppShell.tsx
│   ├── BootSequence.tsx
│   ├── CommandCentrePanel.tsx
│   ├── DataIntegrityPanel.tsx
│   ├── SessionReplayDock.tsx
│   ├── SideNavigation.tsx
│   └── TopStatusBar.tsx
│
├── features/
│   ├── championship/            # Championship state and standings
│   ├── circuitMatrix/           # Event and track intelligence
│   ├── driverIntel/             # Driver dossiers and comparisons
│   ├── forecast/                # Calibration framework
│   ├── notes/                   # Model Trust Console
│   ├── scenarioLab/             # Transparent contender model
│   └── teamPerformance/         # Constructor intelligence
│   ├── features/
│   ├── predictiveOutlook/       # Evidence-weighted race estimation
│
├── hooks/
│   ├── useChampionshipData.ts
│   └── useSessionReplay.ts
│
├── services/
│   ├── cacheService.ts
│   ├── openF1Client.ts
│   ├── openF1Service.ts
│   └── sessionReplayService.ts
│
├── types/
│   ├── app.ts
│   ├── f1.ts
│   └── liveSession.ts
│
├── utils/
│   ├── championshipMetrics.ts
│   └── formatters.ts
│
└── config/
    ├── appConfig.ts
    └── dataConfig.ts
```

---

## Run Locally

### Prerequisites

* Node.js 18 or later
* npm

### Installation

```bash
git clone <repository-url>
cd apex-26-championship-intelligence
npm install
```

### Start Development Server

```bash
npm run dev
```

The application will normally be available at:

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
npm run dev       # Start local development server
npm run build     # Create production build
npm run lint      # Run ESLint checks
npm run typecheck # Run TypeScript type checking
```

---

## Environment Variables

| Variable               | Description         | Default                     |
| ---------------------- | ------------------- | --------------------------- |
| `VITE_OPENF1_BASE_URL` | OpenF1 API base URL | `https://api.openf1.org/v1` |

No private API key is required for the public-source workflow.

---

## Current Scope and Limitations

* Public source access may be temporarily restricted during active sessions.
* Analytics archive coverage can be partial while historical rounds are being indexed.
* Missing historical records remain pending instead of being estimated.
* Predictive Outlook is an explainable, evidence-weighted portfolio model, not a trained machine-learning system.
* Forecast estimates remain deliberately cautious when completed-race evidence is limited or weather conditions increase uncertainty.
* External weather signals are available only when the upcoming event falls inside the weather provider’s supported forecast window.
* The application does not provide betting, financial, race-strategy, or title-win prediction advice.

---

## Portfolio Disclaimer

APEX 26 is an unofficial motorsport analytics portfolio project created for educational and demonstration purposes.

It is not affiliated with Formula 1, the FIA, OpenF1, any racing team, driver, commercial rights holder, or motorsport organisation. All displayed intelligence should be treated as a portfolio demonstration of data architecture, UI engineering, analytics presentation, and responsible source-handling design.

---

## License

MIT License.
