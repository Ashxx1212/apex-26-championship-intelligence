# APEX Session Replay OS — integration steps

1. Copy the four folders from this download into your existing `src` folder:

- `src/types/liveSession.ts`
- `src/services/sessionReplayService.ts`
- `src/hooks/useSessionReplay.ts`
- `src/components/SessionReplayDock.tsx`

2. In `src/components/CommandCentrePanel.tsx`, add this import immediately below the Lucide import:

```tsx
import { SessionReplayDock } from './SessionReplayDock';
```

3. Find this comment in `CommandCentrePanel.tsx`:

```tsx
{/* Verified classification + event operations */}
```

4. Paste this directly ABOVE that comment:

```tsx
      <SessionReplayDock meeting={latestMeeting} />
```

5. Build:

```powershell
npm run build
```

6. In Command Centre, use the new "LOAD RACE REPLAY" button. It loads historical session data from the latest completed Grand Prix and turns it into an interactive, time-driven replay system.

Notes:
- This is Replay Mode. It uses real historical timing/event data.
- It is intentionally user-triggered, so the dashboard does not request many API endpoints every time the Command Centre opens.
- Live Mode can later reuse the same UI with authenticated WebSocket/MQTT data.
