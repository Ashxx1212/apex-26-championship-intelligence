import { ArrowRight, CalendarRange, MapPin } from 'lucide-react';
import type { DriverIntelSnapshot } from '../driverIntelTypes';

interface DriverIntelTimelineProps {
  snapshot: DriverIntelSnapshot;
  onOpenRace?: (round: number) => void;
}

function formatPosition(position: number | null): string {
  return position === null ? '—' : `P${position}`;
}

export function DriverIntelTimeline({
  snapshot,
  onOpenRace,
}: DriverIntelTimelineProps) {
  return (
    <div className="rounded-sm border border-white/10 bg-graphite-light/50 p-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-white/45">
          <CalendarRange className="h-3.5 w-3.5 text-cyan" />
          RECENT RACE FORM
        </div>

        <span className="text-[9px] uppercase tracking-[0.14em] text-white/30">
          SELECT A RACE FOR CIRCUIT INTEL
        </span>
      </div>

      <div className="space-y-3">
        {snapshot.raceHistory.length > 0 ? (
          snapshot.raceHistory.map((entry) => (
            <button
              type="button"
              key={`${entry.round}-${entry.meetingName}`}
              onClick={() => onOpenRace?.(entry.round)}
              className="group flex w-full flex-col gap-3 rounded-sm border border-white/10 bg-black/10 p-3 text-left transition-all duration-200 hover:border-cyan/45 hover:bg-cyan/[0.035] md:flex-row md:items-center md:justify-between"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold text-white">
                    R{entry.round} · {entry.meetingName}
                  </p>

                  {entry.isWinner && (
                    <span className="rounded-full border border-crimson/20 bg-crimson/10 px-2 py-1 text-[8px] font-semibold uppercase tracking-[0.12em] text-crimson">
                      Winner
                    </span>
                  )}
                </div>

                <div className="mt-1 flex items-center gap-1.5 text-xs uppercase tracking-[0.16em] text-white/45">
                  <MapPin className="h-3 w-3 text-cyan" />
                  {entry.circuitName}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs text-white/60">
                <span className="rounded-full border border-white/10 px-2 py-1">
                  Finish {formatPosition(entry.racePosition)}
                </span>

                <span className="rounded-full border border-white/10 px-2 py-1">
                  Quali {formatPosition(entry.qualifyingPosition)}
                </span>

                <span className="rounded-full border border-white/10 px-2 py-1">
                  {entry.raceStatus}
                </span>

                <span className="inline-flex items-center gap-1 border border-cyan/20 bg-cyan/[0.03] px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.12em] text-cyan">
                  Circuit Intel
                  <ArrowRight className="h-3 w-3 transition-transform duration-200 group-hover:translate-x-1" />
                </span>
              </div>
            </button>
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