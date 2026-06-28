APEX — Driver Intel Dossier (Phase 3)

Replace these four files:
- src/App.tsx
- src/features/driverIntel/DriverIntelPage.tsx
- src/features/driverIntel/driverIntelSelectors.ts
- src/features/driverIntel/driverIntelTypes.ts

Then run:
npm run build

What this phase adds:
- A driver dossier header with team, selected weekend, archive coverage, and latest verified result.
- Context actions from Driver Intel into Team Performance and Scenario Lab.
- A quick-switch bar for the top 10 verified drivers.
- Latest verified result in observations.
- Correctly formatted average-finish and qualifying observations.
- Driver selection stays connected through the APEX global context.
