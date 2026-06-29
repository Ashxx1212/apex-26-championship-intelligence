APEX context routing + Scenario selection fix

Replace these files:
- src/App.tsx
- src/features/circuitMatrix/CircuitMatrixPage.tsx
- src/components/ScenarioSimulatorPanel.tsx

Then run:
npm run build

Fixes:
1) Circuit Matrix now calls a required callback with the selected meetingKey, and App explicitly saves that key before opening Scenario Lab.
2) Scenario contender clicks no longer get immediately reset by the global context seed effect.
3) When the archive is not sufficiently indexed, the Scenario Lab now still shows the top five verified standings as selectable contender focus cards. The Title Path Index remains honestly paused until enough archive coverage exists.
