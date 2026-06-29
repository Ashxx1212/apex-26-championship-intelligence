import { ChevronRight, Users } from 'lucide-react';
import type { DriverIntelSnapshot } from '../driverIntelTypes';

interface DriverIntelTeammateProps {
  snapshot: DriverIntelSnapshot;
  onSelectTeammate?: (driverNumber: number) => void;
}

function formatTeammateGap(gap: number | null): string {
  if (gap === null) {
    return 'Teammate comparison unavailable';
  }

  if (gap === 0) {
    return 'Average classified finish is level with teammate';
  }

  const places = Math.abs(gap);
  const placeLabel = places === 1 ? 'place' : 'places';

  return gap < 0
    ? `Averaged ${places} ${placeLabel} ahead of teammate`
    : `Averaged ${places} ${placeLabel} behind teammate`;
}

export function DriverIntelTeammate({
  snapshot,
  onSelectTeammate,
}: DriverIntelTeammateProps) {
  if (!snapshot.teammate) {
    return null;
  }

  const teammate = snapshot.teammate;

  return (
    <div className="rounded-sm border border-white/10 bg-graphite-light/50 p-4">
      <div className="mb-4 flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-white/45">
        <Users className="h-3.5 w-3.5 text-cyan" />
        TEAMMATE COMPARISON
      </div>

      <div className="grid gap-3 md:grid-cols-[1fr_auto_1fr] md:items-center">
        <div className="rounded-sm border border-white/10 bg-black/10 p-3">
          <p className="text-sm font-semibold text-white">
            {snapshot.driverName}
          </p>

          <p className="mt-1 text-xs uppercase tracking-[0.2em] text-white/45">
            P{snapshot.position} · {snapshot.points} pts
          </p>

          <p className="mt-3 text-[9px] uppercase tracking-[0.15em] text-cyan">
            Current dossier
          </p>
        </div>

        <div className="text-center text-xs uppercase tracking-[0.25em] text-white/40">
          VS
        </div>

        <button
          type="button"
          onClick={() => onSelectTeammate?.(teammate.driverNumber)}
          className="group rounded-sm border border-cyan/25 bg-cyan/[0.025] p-3 text-left transition-all duration-200 hover:border-cyan/60 hover:bg-cyan/[0.07]"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white">
                {teammate.driverName}
              </p>

              <p className="mt-1 text-xs uppercase tracking-[0.2em] text-white/45">
                P{teammate.position ?? '—'} · {teammate.points} pts
              </p>

              <p className="mt-3 text-[9px] uppercase tracking-[0.15em] text-cyan">
                Open teammate dossier
              </p>
            </div>

            <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-cyan transition-transform duration-200 group-hover:translate-x-1" />
          </div>
        </button>
      </div>

      <div className="mt-4 border-t border-white/10 pt-3 text-sm text-white/60">
        {formatTeammateGap(snapshot.teammateGap)}
      </div>
    </div>
  );
}