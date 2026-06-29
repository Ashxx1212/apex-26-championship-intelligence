APEX — Global Intelligence Context (Phase 1)

Replace these existing files in your actual project:
- src/App.tsx
- src/components/CommandCentrePanel.tsx

Add this new file:
- src/components/ActiveContextDock.tsx

Then run:
npm run build

What this phase adds:
- A persistent Active Intelligence Context Dock across every APEX page.
- Driver selection from Timing Tower, Grid Signals, Drivers' Leader and Championship Gap.
- Team selection from Constructors' Leader.
- Race Weekend selection from Race Radar.
- Selected context persists across navigation.
- Context actions open Driver Intel, Team Performance, Circuit Matrix and Scenario Lab.
- No new data is invented: it uses only the verified application snapshot.

Important:
Phase 1 stores and displays the selected team and selected event globally. The next phase will make Team Performance, Circuit Matrix, and Scenario Lab actively filter/preload themselves from that same context.
