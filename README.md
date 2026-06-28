# APEX 26 — Championship Intelligence

A premium cinematic motorsport analytics portfolio project built with React, TypeScript, and the OpenF1 public API.

## Project Overview

APEX 26 is an unofficial motorsport analytics dashboard that displays verified 2026 championship data from the OpenF1 public API. The application features a cinematic command-centre interface with real-time data synchronization, intelligent caching, and a rate-limited request architecture.

**Note:** This is a portfolio project for educational and analytical purposes. It is not affiliated with Formula 1, the FIA, or any racing team.

## Features Currently Implemented

### Core Features
- **Cinematic Boot Sequence**: Full-screen initialization with speech synthesis narration
- **Command Centre Dashboard**: Dark telemetry-style interface with scan lines and grid textures
- **Drivers' Championship Standings**: Real standings from OpenF1 API with team colors and form indicators
- **Constructors' Championship**: Team standings with performance metrics
- **Season Timeline**: 2026 race calendar with completed/active/upcoming status
- **Performance Factors**: Calculated metrics for championship analysis

### Data Architecture
- **Two-Phase Loading Model**: Core data loads first, analytics archive loads on demand
- **Rate-Limited API Client**: Serial request queue to prevent HTTP 429 errors
- **Versioned LocalStorage Cache**: 30-minute cache with expiry validation
- **Error Recovery**: Graceful fallback to cached data when API unavailable

### Forecast Framework
- **Calibration Mode**: Forecast engine shows "CALIBRATING" until sufficient data collected
- **Pure Functions**: All analytics calculations are deterministic, testable functions
- **No Fabricated Data**: Missing metrics show "CALIBRATING" instead of fake values

## Architecture Overview

```
src/
├── components/          # React UI components
│   ├── AppShell.tsx     # Main layout wrapper
│   ├── BootSequence.tsx # Initial loading animation
│   ├── SideNavigation.tsx
│   ├── TopStatusBar.tsx
│   ├── ChampionshipHero.tsx
│   ├── DriverStandingsPanel.tsx
│   ├── ConstructorsPanel.tsx
│   ├── RaceTimeline.tsx
│   ├── ForecastEnginePanel.tsx
│   ├── MethodologyPanel.tsx
│   └── DataIntegrityPanel.tsx
├── config/              # Application configuration
│   ├── appConfig.ts     # App-level settings
│   └── dataConfig.ts    # API and cache settings
├── features/            # Feature modules
│   └── forecast/        # Forecast engine (calibration mode)
│       ├── forecastTypes.ts
│       └── forecastEngine.ts
├── hooks/               # React hooks
│   └── useChampionshipData.ts
├── services/            # API and caching
│   ├── openF1Client.ts  # Rate-limited API client
│   ├── openF1Service.ts # High-level data fetching
│   └── cacheService.ts  # LocalStorage caching
├── types/               # TypeScript types
│   ├── f1.ts           # OpenF1 API types
│   └── app.ts          # Application types
└── utils/               # Utility functions
    ├── formatters.ts    # Data formatting
    └── championshipMetrics.ts
```

## Data Source and Integrity Rules

### OpenF1 API
- Base URL: `https://api.openf1.org/v1`
- Uses only public, historical session data
- No live timing or real-time data streams
- Completed sessions only (session ended 15+ minutes ago)

### Request Queue Architecture
- Serial processing: only one request at a time
- Minimum 1.2 seconds between requests
- Exponential backoff for 429 errors: 4s → 8s → 16s
- Maximum 3 retries per request
- Automatic cooldown after rate limits

### Caching Strategy
- Core snapshot: 30-minute cache lifetime
- Raw meetings/sessions/results: 60-minute cache lifetime
- Versioned cache envelope with expiry validation
- Never cache failed API responses
- Graceful fallback to expired cache on API failure

### Data Integrity
- No fabricated standings, results, or predictions
- "CALIBRATING" shown for metrics with insufficient data
- Clear indication of cached vs live data
- Timestamp shown for all data syncs

## Current Limitations

1. **Forecast Engine**: In calibration mode, not generating predictions
2. **Driver Intel Module**: Locked, pending development
3. **Team Performance Module**: Locked, pending development
4. **Circuit Matrix**: Locked, pending development
5. **Scenario Lab**: Locked, pending development
6. **Analytics Archive**: Loads on demand, not automatically on initial load

## How Live and Cached Data Work

### Initial Load (Phase A)
1. Check for valid cached core snapshot
2. If cache valid, display immediately
3. If cache expired/missing, fetch from OpenF1:
   - Fetch 2026 meetings sequentially
   - Fetch 2026 sessions sequentially
   - Find latest completed Race session
   - Fetch championship drivers
   - Fetch championship teams
   - Fetch driver metadata
   - Fetch latest race results
4. Cache successful response

### Analytics Archive (Phase B)
- Click "LOAD ANALYTICS ARCHIVE" in Data Integrity panel
- Indexes completed Race and standard Qualifying session results progressively from OpenF1
- Sprint sessions are intentionally excluded from the initial reliability and form metrics
- 2.5-second delay between historical requests
- Progress shown: "INDEXING ROUND X OF Y"
- Stops gracefully on rate limit, preserving collected data
- Can resume later with same button

### Rate Limit Handling
- 429 triggers automatic cooldown
- Cooldown persisted across sessions
- Cached data displayed during cooldown
- Force refresh disabled during cooldown

## Project Structure

Key files:
- `src/config/` - Configuration constants
- `src/services/` - API client and caching
- `src/hooks/` - React data hooks
- `src/components/` - UI components
- `src/features/` - Feature modules (forecast)
- `src/types/` - TypeScript definitions

## Local Setup Instructions

### Prerequisites
- Node.js 18+
- npm or pnpm

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd apex-26

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Start development server
npm run dev
```

### Available Scripts

```bash
npm run dev       # Start development server
npm run build     # Build for production
npm run lint      # Run ESLint
npm run typecheck # Run TypeScript type checking
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_OPENF1_BASE_URL` | OpenF1 API base URL | `https://api.openf1.org/v1` |

No API keys or secrets required. The OpenF1 API is public.

## Future Roadmap

### Short Term
- [ ] Complete analytics archive automation
- [ ] Add qualifying data integration
- [ ] Implement teammate comparison charts

### Medium Term
- [ ] Driver Intelligence module
- [ ] Team Performance module
- [ ] Circuit Matrix with characteristics
- [ ] Scenario Lab for what-if analysis

### Long Term
- [ ] Monte Carlo championship simulation
- [ ] Deployment with scheduled data refresh
- [ ] Test coverage (unit, integration)
- [ ] Performance optimization

## Disclaimer

APEX 26 is an unofficial motorsport analytics portfolio project. It is not affiliated with Formula 1, the FIA, any racing team, driver, or commercial rights holder. Data is displayed for educational and analytical purposes only. Forecasts are not betting advice.

## License

MIT License - See LICENSE file for details.
