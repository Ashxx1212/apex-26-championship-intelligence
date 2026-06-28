import { CalendarRange } from 'lucide-react';
import type { DriverIntelSnapshot } from '../driverIntelTypes';

interface DriverIntelTimelineProps {
  snapshot: DriverIntelSnapshot;
}

export function DriverIntelTimeline({ snapshot }: DriverIntelTimelineProps) {
  return (
    <div className="rounded-sm border border-white/10 bg-graphite-light/50 p-4">
      <div className="mb-4 flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-white/45">
        <CalendarRange className="h-3.5 w-3.5 text-cyan" />
        RECENT RACE FORM
      </div>
      <div className="space-y-3">
        {snapshot.raceHistory.length > 0 ? (
          snapshot.raceHistory.map((entry) => (
            <div key={`${entry.round}-${entry.meetingName}`} className="flex flex-col gap-2 rounded-sm border border-white/10 bg-black/10 p-3 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="text-sm font-semibold text-white">R{entry.round} • {entry.meetingName}</div>
                <div className="text-xs uppercase tracking-[0.2em] text-white/45">{entry.circuitName}</div>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-white/60">
                <span className="rounded-full border border-white/10 px-2 py-1">Finish {entry.racePosition ?? '—'}</span>
                <span className="rounded-full border border-white/10 px-2 py-1">Quali {entry.qualifyingPosition ?? '—'}</span>
                <span className="rounded-full border border-white/10 px-2 py-1">{entry.raceStatus}</span>
                {entry.isWinner && <span className="rounded-full border border-crimson/20 bg-crimson/10 px-2 py-1 text-crimson">Winner</span>}
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-sm border border-dashed border-white/10 p-4 text-sm text-white/40">
            Historical race results will appear here once the archive is indexed.
          </div>
        )}
      </div>
    </div>
  );
}
