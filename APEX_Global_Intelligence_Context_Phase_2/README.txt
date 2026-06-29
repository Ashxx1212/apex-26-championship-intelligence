APEX — Global Intelligence Context (Phase 2)

Replace these files in the actual project:
- src/App.tsx
- src/components/ActiveContextDock.tsx
- src/features/teamPerformance/TeamPerformancePage.tsx
- src/features/circuitMatrix/CircuitMatrixPage.tsx
- src/components/ScenarioSimulatorPanel.tsx

Then run:
npm run build

What this phase does:
- Team Performance automatically opens on the selected team from the global context.
- Team driver cards now open Driver Intel and preserve focus.
- Circuit Matrix automatically opens on the selected weekend from the global context.
- Circuit Matrix labels selected context separately from a different active calendar weekend.
- Circuit Matrix can open Scenario Lab while keeping the selected weekend.
- Scenario Lab receives selected driver, team, and weekend context; it highlights/preloads the matching contender where that contender is in the transparent model.
- The Active Intelligence Context Dock now says SELECTED WEEKEND when the user has picked a different event than the live calendar focus.

No racing outcomes, telemetry, or predictions are fabricated. All context is derived from the application's verified/cache snapshot.
