import { BadgeCheck, TrendingUp, Trophy } from 'lucide-react';
import type { DriverIntelSnapshot } from '../driverIntelTypes';

interface DriverIntelHeroProps {
  snapshot: DriverIntelSnapshot;
}

export function DriverIntelHero({ snapshot }: DriverIntelHeroProps) {
  return (
    <div className="rounded-sm border border-white/10 bg-gradient-to-br from-graphite-light/80 to-graphite/80 p-6">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.3em] text-cyan">
            <BadgeCheck className="h-3.5 w-3.5" />
            DRIVER INTEL
          </div>
          <div>
            <h2 className="text-2xl font-black uppercase tracking-[0.2em] text-white">
              {snapshot.driverName}
            </h2>
            <p className="mt-2 text-sm uppercase tracking-[0.2em] text-white/60">
              {snapshot.teamName} • {snapshot.driverAcronym}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] uppercase tracking-[0.25em] text-white/70">
              P{snapshot.position}
            </span>
            <span className="rounded-full border border-cyan/20 bg-cyan/10 px-3 py-1 text-[10px] uppercase tracking-[0.25em] text-cyan">
              {snapshot.points} pts
            </span>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] uppercase tracking-[0.25em] text-white/70">
              {snapshot.gapToLeader !== null ? `+${snapshot.gapToLeader}` : 'Gap unavailable'}
            </span>
          </div>
        </div>

        <div className="rounded-sm border border-white/10 bg-black/20 p-4">
          <div className="mb-3 flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-white/45">
            <TrendingUp className="h-3.5 w-3.5 text-crimson" />
            RECENT FORM
          </div>
          <div className="flex gap-2">
            {snapshot.recentForm.length > 0 ? (
              snapshot.recentForm.map((form, index) => (
                <span
                  key={`${form}-${index}`}
                  className={`flex h-8 w-8 items-center justify-center rounded-sm text-xs font-bold ${
                    form === 'W'
                      ? 'bg-crimson text-white'
                      : form === 'P'
                        ? 'bg-amber text-black'
                        : form === 'D'
                          ? 'bg-cyan text-black'
                          : 'bg-white/10 text-white/60'
                  }`}
                >
                  {form}
                </span>
              ))
            ) : (
              <span className="text-sm text-white/40">No recent form available</span>
            )}
          </div>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-white/10 pt-4 text-sm text-white/60">
        <div className="flex items-center gap-2">
          <Trophy className="h-4 w-4 text-amber" />
          <span>Verified archive coverage: {snapshot.archiveCoverage.indexedRaceResults}/{snapshot.archiveCoverage.totalCompletedRaceSessions} rounds</span>
        </div>
      </div>
    </div>
  );
}
