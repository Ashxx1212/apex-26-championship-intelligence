import {
  CheckCircle2,
  ChevronRight,
  Flag,
  Lock,
  Radio,
  Trophy,
} from 'lucide-react';
import type {
  ChampionshipDataSnapshot,
  RaceWeekendSnapshot,
} from '../types/f1';

interface RaceTimelineProps {
  data: ChampionshipDataSnapshot | null;
  isLoading: boolean;
  selectedMeetingKey?: number | null;
  onMeetingSelect?: (meetingKey: number) => void;
}

interface RaceCardProps {
  meetingKey: number;
  round: number;
  name: string;
  country: string;
  circuitType: string;
  status: 'completed' | 'active' | 'upcoming';
  raceWinner: RaceWeekendSnapshot['raceWinner'];
  isNext?: boolean;
  isSelected?: boolean;
  onSelect?: () => void;
}

function RaceCard({
  round,
  name,
  country,
  circuitType,
  status,
  raceWinner,
  isNext,
  isSelected = false,
  onSelect,
}: RaceCardProps) {
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
    <button
      type="button"
      onClick={onSelect}
      disabled={!onSelect}
      title={`Open ${name} in Circuit Matrix`}
      className={`
        group relative w-44 flex-shrink-0 overflow-hidden rounded-sm border
        bg-graphite-light/30 text-left transition-all duration-300
        hover:border-cyan/40 hover:bg-cyan/[0.035]
        disabled:cursor-default
        ${config.borderColor}
        ${
          isSelected
            ? 'border-cyan/60 bg-cyan/[0.07] shadow-[0_0_18px_rgba(0,212,255,0.14)]'
            : ''
        }
        ${status === 'active' ? 'animate-[pulse_3s_ease-in-out_infinite]' : ''}
      `}
    >
      {isSelected && (
        <div className="absolute inset-y-0 left-0 w-[3px] bg-cyan shadow-[0_0_12px_rgba(0,212,255,0.9)]" />
      )}

      <div className="flex items-center justify-between border-b border-white/10 bg-white/[0.02] px-3 py-2">
        <span className="text-[10px] tracking-wider text-white/40">RND</span>

        <span
          className={`text-xs font-bold ${
            status === 'active' ? 'text-amber' : 'text-cyan'
          }`}
        >
          {String(round).padStart(2, '0')}
        </span>
      </div>

      <div className="p-3">
        <div className="mb-1 truncate text-xs font-semibold text-white/80">
          {name}
        </div>

        <div className="mb-2 text-[10px] text-white/40">{country}</div>

        <div className="inline-block rounded bg-white/[0.05] px-2 py-0.5 text-[8px] uppercase tracking-wider text-white/40">
          {circuitType || 'Circuit'}
        </div>

        {status === 'completed' && (
          <div className="mt-2 border-t border-white/10 pt-2">
            <div className="mb-1 flex items-center gap-1 text-[9px] text-white/40">
              <Trophy className="h-2.5 w-2.5 text-amber" />
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
              <div className="text-[10px] text-white/40">
                RESULT VERIFICATION PENDING
              </div>
            )}
          </div>
        )}
      </div>

      <div className={`border-t border-white/10 px-3 py-2 ${config.bgColor}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <StatusIcon className={`h-3 w-3 ${config.color}`} />

            <span className={`text-[9px] tracking-wider ${config.color}`}>
              {config.label}
            </span>
          </div>

          <ChevronRight
            className={`h-3 w-3 transition-colors ${
              isSelected
                ? 'text-cyan'
                : 'text-white/20 group-hover:text-cyan'
            }`}
          />
        </div>

        <span
          className={`mt-2 block text-[8px] font-semibold tracking-[0.12em] transition-colors ${
            isSelected
              ? 'text-cyan'
              : 'text-cyan/0 group-hover:text-cyan/75'
          }`}
        >
          OPEN CIRCUIT MATRIX
        </span>
      </div>
    </button>
  );
}

export function RaceTimeline({
  data,
  isLoading,
  selectedMeetingKey = null,
  onMeetingSelect,
}: RaceTimelineProps) {
  const raceWeekends = data?.raceWeekends || [];
  const totalRounds = raceWeekends.length;

  const nextRoundIndex = raceWeekends.findIndex(
    (race) => race.status === 'upcoming'
  );

  if (isLoading && raceWeekends.length === 0) {
    return (
      <div className="overflow-hidden rounded-sm border border-white/10 bg-graphite-light/50">
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <div className="flex items-center gap-2">
            <Flag className="h-4 w-4 text-crimson" />

            <h2 className="text-sm font-bold tracking-[0.2em] text-white">
              SEASON VECTOR
            </h2>
          </div>

          <span className="text-[10px] uppercase tracking-wider text-white/30">
            Loading...
          </span>
        </div>

        <div className="flex items-center justify-center py-8 text-xs text-white/40">
          Reading 2026 race calendar...
        </div>
      </div>
    );
  }

  if (raceWeekends.length === 0) {
    return (
      <div className="overflow-hidden rounded-sm border border-white/10 bg-graphite-light/50">
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <div className="flex items-center gap-2">
            <Flag className="h-4 w-4 text-crimson" />

            <h2 className="text-sm font-bold tracking-[0.2em] text-white">
              SEASON VECTOR
            </h2>
          </div>

          <span className="text-[10px] uppercase tracking-wider text-white/30">
            Calendar Pending
          </span>
        </div>

        <div className="flex items-center justify-center py-8 text-xs text-white/40">
          No verified race calendar is currently indexed.
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-sm border border-white/10 bg-graphite-light/50">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <div className="flex items-center gap-2">
          <Flag className="h-4 w-4 text-crimson" />

          <h2 className="text-sm font-bold tracking-[0.2em] text-white">
            SEASON VECTOR
          </h2>
        </div>

        <span className="text-[10px] uppercase tracking-wider text-white/30">
          {totalRounds} ROUNDS
        </span>
      </div>

      <div className="relative p-4">
        <div className="absolute left-4 right-4 top-1/2 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

        <div className="relative flex snap-x gap-4 overflow-x-auto pb-2 pt-6">
          {raceWeekends.map((race, index) => (
            <div key={race.meetingKey} className="snap-start">
              <RaceCard
                meetingKey={race.meetingKey}
                round={race.round}
                name={race.meetingName}
                country={race.country}
                circuitType={race.circuitType}
                status={race.status}
                raceWinner={race.raceWinner}
                isNext={index === nextRoundIndex}
                isSelected={selectedMeetingKey === race.meetingKey}
                onSelect={() => onMeetingSelect?.(race.meetingKey)}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-center gap-1 px-4 pb-3">
        {raceWeekends.slice(0, 10).map((race) => (
          <div
            key={race.meetingKey}
            className={`h-1 rounded-full transition-all ${
              selectedMeetingKey === race.meetingKey
                ? 'w-8 bg-cyan'
                : 'w-1 bg-white/20'
            }`}
          />
        ))}

        {raceWeekends.length > 10 && (
          <span className="ml-2 text-[10px] text-white/30">
            +{raceWeekends.length - 10} more
          </span>
        )}
      </div>
    </div>
  );
}