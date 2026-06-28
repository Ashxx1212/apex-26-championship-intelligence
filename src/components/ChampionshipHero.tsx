import { Circle, Trophy, AlertTriangle, Loader2 } from 'lucide-react';
import type { ChampionshipDataSnapshot } from '../types/f1';
import type { DataSourceState } from '../types/app';

interface ChampionshipHeroProps {
  isLoading: boolean;
  error: { type: string; message: string } | null;
  data: ChampionshipDataSnapshot | null;
  loadingMessage?: string;
  sourceState: DataSourceState;
}

export function ChampionshipHero({
  isLoading,
  error,
  data,
  loadingMessage,
  sourceState,
}: ChampionshipHeroProps) {
  const leader = data?.driverStandings?.[0];
  const second = data?.driverStandings?.[1];
  const latestMeeting = data?.latestCompletedMeeting;
  const completedRounds = data?.completedRounds || 0;

  const renderContent = () => {
    if (isLoading && !data) {
      return (
        <>
          <div className="text-center mb-8">
            <h1 className="text-2xl md:text-3xl font-black tracking-[0.15em] text-cyan mb-3">
              CHAMPIONSHIP DATA LINK
            </h1>
            <p className="text-sm text-white/50 tracking-wide max-w-xl animate-pulse">
              {loadingMessage || 'SYNCING CHAMPIONSHIP ARCHIVE...'}
            </p>
          </div>

          <div className="relative w-64 h-64 md:w-80 md:h-80 flex items-center justify-center">
            <Loader2 className="w-16 h-16 text-cyan animate-spin" />
          </div>
        </>
      );
    }

    if (error && !data) {
      return (
        <>
          <div className="text-center mb-8">
            <h1 className="text-2xl md:text-3xl font-black tracking-[0.15em] text-red-400 mb-3">
              DATA CORE OFFLINE
            </h1>
            <p className="text-sm text-white/50 tracking-wide max-w-xl">
              Unable to retrieve verified 2026 data.
            </p>
            <p className="text-xs text-red-400/60 mt-2 tracking-wider">
              {error.message}
            </p>
          </div>

          <div className="relative w-64 h-64 md:w-80 md:h-80 flex items-center justify-center">
            <AlertTriangle className="w-16 h-16 text-red-400/50" />
          </div>
        </>
      );
    }

    if (!data || data.driverStandings.length === 0) {
      return (
        <>
          <div className="text-center mb-8">
            <h1 className="text-2xl md:text-3xl font-black tracking-[0.15em] text-white mb-3">
              DRIVERS' CHAMPIONSHIP
            </h1>
            <p className="text-sm text-white/50 tracking-wide max-w-xl">
              No championship standings available yet. Awaiting completed race sessions.
            </p>
          </div>

          <div className="relative w-64 h-64 md:w-80 md:h-80 flex items-center justify-center">
            <div className="text-center">
              <Circle className="w-12 h-12 mx-auto mb-2 text-white/20" />
              <span className="text-xs tracking-wider text-white/30">NO DATA</span>
            </div>
          </div>
        </>
      );
    }

    // Show leader info
    return (
      <>
        <div className="text-center mb-4">
          <h1 className="text-2xl md:text-3xl font-black tracking-[0.15em] text-white mb-2">
            DRIVERS' CHAMPIONSHIP
          </h1>
          <p className="text-xs md:text-sm text-green-400/80 tracking-wide max-w-xl">
            VERIFIED THROUGH {latestMeeting?.meeting_name?.toUpperCase() || '2026 SEASON'}
          </p>
          <p className="text-xs text-white/40 mt-1 tracking-wider">
            {completedRounds} completed rounds analysed. Forecast engine remains in calibration.
          </p>
        </div>

        {/* Championship leader */}
        <div className="relative w-64 h-64 md:w-80 md:h-80">
          {/* Outer rings */}
          {[3, 2, 1].map((ring) => (
            <div
              key={ring}
              className="absolute inset-0 rounded-full border border-white/10"
              style={{
                transform: `scale(${0.33 * ring + 0.33})`,
              }}
            />
          ))}

          {/* Grid lines */}
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className="absolute left-1/2 top-0 w-[1px] h-1/2 bg-white/10 origin-bottom"
              style={{
                transform: `rotate(${i * 45}deg)`,
              }}
            />
          ))}

          {/* Scanning animation */}
          <div className="absolute inset-0 rounded-full overflow-hidden">
            <div
              className="absolute inset-0 bg-gradient-conic from-cyan/20 via-transparent to-transparent animate-radar-sweep"
              style={{
                transformOrigin: 'center center',
              }}
            />
          </div>

          {/* Center hub - Leader info */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="relative">
              {/* Inner glow */}
              <div
                className="absolute inset-0 scale-150 bg-cyan/5 rounded-full blur-xl"
              />

              {/* Leader card */}
              <div className="relative w-36 h-36 md:w-44 md:h-44 rounded-full border-2 border-crimson/40 flex flex-col items-center justify-center bg-graphite-light/90">
                <Trophy className="w-5 h-5 mb-1 text-crimson" />
                <div className="text-[10px] tracking-[0.15em] text-white/40 uppercase">
                  Championship Leader
                </div>

                {/* Team color bar */}
                <div
                  className="w-16 h-1 mt-2 mb-2 rounded"
                  style={{
                    backgroundColor: `#${leader?.teamColour || 'dc143c'}`,
                  }}
                />

                <div className="text-lg md:text-xl font-bold text-white tracking-wider">
                  {leader?.driverAcronym || '—'}
                </div>
                <div className="text-[10px] text-white/50 mt-1 max-w-[120px] text-center truncate">
                  {leader?.driverName || '—'}
                </div>
                <div className="text-xs text-white/40 mt-0.5">
                  {leader?.teamName || '—'}
                </div>

                {/* Points */}
                <div className="mt-2 text-xl font-bold text-cyan">
                  {leader?.points || 0}
                  <span className="text-xs text-white/30 ml-1 font-normal">PTS</span>
                </div>

                {/* Gap */}
                <div className="text-[10px] text-amber mt-0.5">
                  {second && second.gapToLeader !== null
                    ? `+${second.gapToLeader} to P2`
                    : 'Championship leader'}
                </div>
              </div>

              {/* Status ring */}
              <div className="absolute -inset-2 rounded-full border border-dashed border-cyan/30 animate-[spin_20s_linear_infinite]" />
            </div>
          </div>

          {/* Status badge */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1 px-2 py-1 bg-green-500/20 border border-green-500/40 text-[10px] tracking-wider text-green-400">
            {sourceState === 'cached' ? 'CACHED DATA' : 'VERIFIED DATA'}
          </div>
        </div>

        {/* Status indicators */}
        <div className="flex items-center gap-6 mt-6 text-xs tracking-wider">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-400" />
            <span className="text-white/40">VERIFIED</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-amber" />
            <span className="text-white/40">CALIBRATING</span>
          </div>
          <div className="flex items-center gap-2 opacity-30">
            <div className="w-2 h-2 rounded-full bg-white/30" />
            <span className="text-white/40">FORECAST OFF</span>
          </div>
        </div>
      </>
    );
  };

  return (
    <div className="relative flex flex-col items-center py-8 md:py-12 mb-4 md:mb-8">
      {renderContent()}
    </div>
  );
}
