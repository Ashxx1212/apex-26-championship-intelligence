import { Users } from 'lucide-react';
import type { DriverIntelSnapshot } from '../driverIntelTypes';

interface DriverIntelTeammateProps {
  snapshot: DriverIntelSnapshot;
}

export function DriverIntelTeammate({ snapshot }: DriverIntelTeammateProps) {
  if (!snapshot.teammate) {
    return null;
  }

  return (
    <div className="rounded-sm border border-white/10 bg-graphite-light/50 p-4">
      <div className="mb-4 flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-white/45">
        <Users className="h-3.5 w-3.5 text-cyan" />
        TEAMMATE COMPARISON
      </div>
      <div className="grid gap-3 md:grid-cols-[1fr_auto_1fr] md:items-center">
        <div className="rounded-sm border border-white/10 bg-black/10 p-3">
          <div className="text-sm font-semibold text-white">{snapshot.driverName}</div>
          <div className="text-xs uppercase tracking-[0.2em] text-white/45">P{snapshot.position} • {snapshot.points} pts</div>
        </div>
        <div className="text-center text-xs uppercase tracking-[0.25em] text-white/40">vs</div>
        <div className="rounded-sm border border-white/10 bg-black/10 p-3">
          <div className="text-sm font-semibold text-white">{snapshot.teammate.driverName}</div>
          <div className="text-xs uppercase tracking-[0.2em] text-white/45">P{snapshot.teammate.position ?? '—'} • {snapshot.teammate.points} pts</div>
        </div>
      </div>
      <div className="mt-4 text-sm text-white/60">
        {snapshot.teammateGap !== null ? `Gap to teammate: ${snapshot.teammateGap > 0 ? '+' : ''}${snapshot.teammateGap} places` : 'Teammate comparison unavailable'}
      </div>
    </div>
  );
}
