# APEX archive-status upgrade

Replace these four files in your project with the matching files in this folder:

- src/components/TopStatusBar.tsx
- src/components/DataStatusBadge.tsx
- src/components/SessionReplayDock.tsx
- src/services/openF1Client.ts

Then make ONE small change in:
src/components/CommandCentrePanel.tsx

Find:

<SessionReplayDock meeting={latestMeeting} />

Replace it with:

<SessionReplayDock
  meeting={latestMeeting}
  activeMeeting={currentMeeting}
/>

Then run:

npm run build

What changes:
- Cached snapshot + source failure now shows ARCHIVE INTELLIGENCE ACTIVE instead of DATA CORE OFFLINE.
- When OpenF1 returns a readable public-access restriction response, the client classifies it correctly.
- During an active weekend, a replay request that is blocked as a network/CORS failure is shown as a queued public-replay state instead of a generic red error.
- The replay module keeps Barcelona queued and offers RETRY REPLAY ACCESS.
