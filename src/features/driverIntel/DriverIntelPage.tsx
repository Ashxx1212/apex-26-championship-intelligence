import { Sparkles } from 'lucide-react';
import { DriverIntelHero } from './components/DriverIntelHero';
import { DriverIntelBreakdown } from './components/DriverIntelBreakdown';
import { DriverIntelTimeline } from './components/DriverIntelTimeline';
import { DriverIntelTeammate } from './components/DriverIntelTeammate';
import type { DriverIntelSnapshot } from './driverIntelTypes';

interface DriverIntelPageProps {
  snapshot: DriverIntelSnapshot | null;
}

export function DriverIntelPage({ snapshot }: DriverIntelPageProps) {
  if (!snapshot) {
    return (
      <div className="rounded-sm border border-white/10 bg-graphite-light/50 p-8 text-center text-sm text-white/50">
        Select a driver from the standings table to inspect the live telemetry summary.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <DriverIntelHero snapshot={snapshot} />
      <DriverIntelBreakdown snapshot={snapshot} />

      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <DriverIntelTimeline snapshot={snapshot} />
        <div className="space-y-4">
          <DriverIntelTeammate snapshot={snapshot} />
          <div className="rounded-sm border border-white/10 bg-graphite-light/50 p-4">
            <div className="mb-4 flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-white/45">
              <Sparkles className="h-3.5 w-3.5 text-cyan" />
              OBSERVATIONS
            </div>
            <ul className="space-y-2 text-sm text-white/60">
              {snapshot.observations.length > 0 ? (
                snapshot.observations.map((observation) => (
                  <li key={observation} className="rounded-sm border border-white/10 bg-black/10 px-3 py-2">
                    {observation}
                  </li>
                ))
              ) : (
                <li className="rounded-sm border border-dashed border-white/10 px-3 py-2 text-white/40">
                  No observations available yet.
                </li>
              )}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
