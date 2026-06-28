import { Flag, ChevronRight, Trophy, CheckCircle2, Radio, Lock } from 'lucide-react';
import type { RaceWeekendSnapshot, ChampionshipDataSnapshot } from '../types/f1';

interface RaceTimelineProps {
  data: ChampionshipDataSnapshot | null;
  isLoading: boolean;
}

interface RaceCardProps {
  round: number;
  name: string;
  country: string;
  circuitType: string;
  status: 'completed' | 'active' | 'upcoming';
  raceWinner: RaceWeekendSnapshot['raceWinner'];
  isNext?: boolean;
}

function RaceCard({ round, name, country, circuitType, status, raceWinner, isNext }: RaceCardProps) {
  const statusConfig = {
    completed: {
      label: 'COMPLETED',
      color: 'text-green-400/80',
      bgColor: 'bg-green-400/10',
      borderColor: 'border-green-400/20',
      icon: CheckCircle2,
    },
    active: {
      label: 'ACTIVE WEEKEND',
      color: 'text-amber',
      bgColor: 'bg-amber/10',
      borderColor: 'border-amber/30',
      icon: Radio,
    },
    upcoming: {
      label: 'UPCOMING',
      color: 'text-white/40',
      bgColor: 'bg-white/5',
      borderColor: isNext ? 'border-crimson/50' : 'border-white/10',
      icon: Lock,
    },
  };

  const config = statusConfig[status];
  const StatusIcon = config.icon;

  return (
    <div
      className={`
        flex-shrink-0 w-44 bg-graphite-light/30 border rounded-sm overflow-hidden
        group hover:border-cyan/30 transition-all duration-300
        ${config.borderColor}
        ${status === 'active' ? 'animate-[pulse_3s_ease-in-out_infinite]' : ''}
      `}
    >
      {/* Round badge */}
      <div className="flex items-center justify-between px-3 py-2 bg-white/[0.02] border-b border-white/10">
        <span className="text-[10px] tracking-wider text-white/40">RND</span>
        <span className={`text-xs font-bold ${status === 'active' ? 'text-amber' : 'text-cyan'}`}>
          {String(round).padStart(2, '0')}
        </span>
      </div>

      {/* Content */}
      <div className="p-3">
        <div className="text-xs font-semibold text-white/80 truncate mb-1">
          {name}
        </div>
        <div className="text-[10px] text-white/40 mb-2">{country}</div>

        {/* Circuit type */}
        <div className="inline-block px-2 py-0.5 bg-white/[0.05] rounded text-[8px] tracking-wider text-white/40 uppercase">
          {circuitType || 'Circuit'}
        </div>

        {/* Winner info for completed races */}
        {status === 'completed' && (
          <div className="mt-2 pt-2 border-t border-white/10">
            <div className="text-[9px] text-white/40 mb-1 flex items-center gap-1">
              <Trophy className="w-2.5 h-2.5 text-amber" />
              <span>Winner</span>
            </div>
            {raceWinner ? (
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-white">
                  {raceWinner.driverAcronym}
                </span>
                <span className="text-[10px] text-white/40">
                  {raceWinner.teamName}
                </span>
              </div>
            ) : (
              <div className="text-[10px] text-white/40">RESULT VERIFICATION PENDING</div>
            )}
          </div>
        )}
      </div>

      {/* Status */}
      <div className={`px-3 py-2 border-t border-white/10 ${config.bgColor}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <StatusIcon className={`w-3 h-3 ${config.color}`} />
            <span className={`text-[9px] tracking-wider ${config.color}`}>
              {config.label}
            </span>
          </div>
          <ChevronRight className="w-3 h-3 text-white/20 group-hover:text-cyan transition-colors" />
        </div>
      </div>
    </div>
  );
}

export function RaceTimeline({ data }: RaceTimelineProps) {
  const raceWeekends = data?.raceWeekends || [];
  const totalRounds = raceWeekends.length;
  const nextRoundIndex = raceWeekends.findIndex(r => r.status === 'upcoming');

  if (raceWeekends.length === 0) {
    return (
      <div className="bg-graphite-light/50 border border-white/10 rounded-sm overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Flag className="w-4 h-4 text-crimson" />
            <h2 className="text-sm tracking-[0.2em] text-white font-bold">
              SEASON VECTOR
            </h2>
          </div>
          <span className="text-[10px] tracking-wider text-white/30 uppercase">
            Loading...
          </span>
        </div>

        <div className="flex items-center justify-center py-8 text-xs text-white/40">
          Reading 2026 race calendar...
        </div>
      </div>
    );
  }

  return (
    <div className="bg-graphite-light/50 border border-white/10 rounded-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <div className="flex items-center gap-2">
          <Flag className="w-4 h-4 text-crimson" />
          <h2 className="text-sm tracking-[0.2em] text-white font-bold">
            SEASON VECTOR
          </h2>
        </div>
        <span className="text-[10px] tracking-wider text-white/30 uppercase">
          {totalRounds} ROUNDS
        </span>
      </div>

      {/* Timeline container */}
      <div className="relative p-4">
        {/* Timeline line */}
        <div className="absolute top-1/2 left-4 right-4 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent" />

        {/* Cards */}
        <div className="flex gap-4 overflow-x-auto pb-2 pt-6 relative snap-x">
          {raceWeekends.map((race, idx) => (
            <div key={race.meetingKey} className="snap-start">
              <RaceCard
                round={race.round}
                name={race.meetingName}
                country={race.country}
                circuitType={race.circuitType}
                status={race.status}
                raceWinner={race.raceWinner}
                isNext={idx === nextRoundIndex}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="flex justify-center gap-1 px-4 pb-3">
        {raceWeekends.slice(0, 10).map((_, idx) => (
          <div
            key={idx}
            className={`h-1 rounded-full transition-all ${
              idx === 0 ? 'w-8 bg-cyan' : 'w-1 bg-white/20'
            }`}
          />
        ))}
        {raceWeekends.length > 10 && (
          <span className="text-[10px] text-white/30 ml-2">
            +{raceWeekends.length - 10} more
          </span>
        )}
      </div>
    </div>
  );
}
