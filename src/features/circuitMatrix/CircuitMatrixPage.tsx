import { useMemo, useState } from 'react';
import { Flag, MapPin, Trophy, Radio, Lock, Sparkles } from 'lucide-react';
import { formatDateRange, formatCircuitType } from '../../utils/formatters';
import type { ChampionshipDataSnapshot, RaceWeekendSnapshot } from '../../types/f1';

interface CircuitMatrixPageProps {
  data: ChampionshipDataSnapshot | null;
  isLoading: boolean;
}

function RoundCard({ weekend, isSelected, onSelect }: {
  weekend: RaceWeekendSnapshot;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const statusStyles = {
    completed: 'border-green-400/20 bg-green-400/[0.06] text-green-300',
    active: 'border-amber/30 bg-amber/[0.08] text-amber',
    upcoming: 'border-white/10 bg-white/[0.04] text-white/40',
  } as const;

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full rounded-sm border p-4 text-left transition-all duration-200 ${statusStyles[weekend.status]} ${isSelected ? 'ring-2 ring-cyan/40' : 'hover:border-cyan/30'}`}
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[9px] tracking-[0.24em] uppercase">Round {String(weekend.round).padStart(2, '0')}</p>
          <p className="mt-2 text-sm font-semibold text-white">{weekend.meetingName}</p>
        </div>
        <div className="text-right text-[10px] uppercase tracking-[0.24em] text-white/40">{weekend.status}</div>
      </div>
      <p className="mt-3 text-[10px] text-white/40">{weekend.circuitShortName} · {weekend.country}</p>
      <p className="mt-2 text-[10px] text-white/30">{weekend.status === 'completed' ? weekend.raceWinner ? `Winner: ${weekend.raceWinner.driverAcronym}` : 'RESULT VERIFICATION PENDING' : 'Calendar data only'}</p>
    </button>
  );
}

export function CircuitMatrixPage({ data, isLoading }: CircuitMatrixPageProps) {
  const [selectedMeetingKey, setSelectedMeetingKey] = useState<number | null>(null);

  const raceWeekends = data?.raceWeekends ?? [];
  const selectedWeekend = useMemo(() => {
    if (!data) return null;
    if (selectedMeetingKey !== null) {
      return raceWeekends.find((weekend) => weekend.meetingKey === selectedMeetingKey) ?? raceWeekends[0] ?? null;
    }
    return raceWeekends[0] ?? null;
  }, [data, raceWeekends, selectedMeetingKey]);

  const completedCount = raceWeekends.filter((weekend) => weekend.status === 'completed').length;
  const activeCount = raceWeekends.filter((weekend) => weekend.status === 'active').length;
  const upcomingCount = raceWeekends.filter((weekend) => weekend.status === 'upcoming').length;

  if (isLoading) {
    return (
      <div className="rounded-sm border border-white/10 bg-graphite-light/50 p-8 text-center text-sm text-white/50">
        Loading circuit matrix...
      </div>
    );
  }

  if (!data) {
    return (
      <div className="rounded-sm border border-white/10 bg-graphite-light/50 p-8 text-center text-sm text-white/50">
        Circuit intelligence requires verified championship snapshot.
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-[1800px] mx-auto">
      <div className="border border-white/10 bg-graphite-light/40 p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-[10px] tracking-[0.24em] text-white/40 uppercase">CIRCUIT MATRIX</p>
            <h1 className="mt-2 text-2xl font-black tracking-[0.08em] text-white">Event and track intelligence</h1>
            <p className="mt-2 max-w-2xl text-sm text-white/50">Season calendar, event status, and verified result confirmation for every round.</p>
          </div>
          <div className="grid grid-cols-3 gap-3 text-[10px] text-white/40">
            <div className="rounded-sm border border-white/10 bg-black/20 p-3 text-center">
              <p className="uppercase tracking-[0.24em]">Completed</p>
              <p className="mt-2 text-xl font-bold text-green-300">{completedCount}</p>
            </div>
            <div className="rounded-sm border border-white/10 bg-black/20 p-3 text-center">
              <p className="uppercase tracking-[0.24em]">Active</p>
              <p className="mt-2 text-xl font-bold text-amber">{activeCount}</p>
            </div>
            <div className="rounded-sm border border-white/10 bg-black/20 p-3 text-center">
              <p className="uppercase tracking-[0.24em]">Upcoming</p>
              <p className="mt-2 text-xl font-bold text-white">{upcomingCount}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
        <div className="border border-white/10 bg-black/20 p-4">
          <div className="flex items-center gap-2 text-white/70 mb-4">
            <MapPin className="w-4 h-4 text-cyan" />
            <p className="text-sm tracking-[0.18em] uppercase">Event matrix</p>
          </div>
          <div className="grid gap-3">
            {raceWeekends.map((weekend) => (
              <RoundCard
                key={weekend.meetingKey}
                weekend={weekend}
                isSelected={selectedWeekend?.meetingKey === weekend.meetingKey}
                onSelect={() => setSelectedMeetingKey(weekend.meetingKey)}
              />
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div className="border border-white/10 bg-graphite-light/30 p-4">
            <div className="flex items-center gap-2 text-white/70 mb-3">
              <Trophy className="w-4 h-4 text-crimson" />
              <p className="text-sm tracking-[0.18em] uppercase">Selected event</p>
            </div>
            {selectedWeekend ? (
              <div className="space-y-3">
                <div className="rounded-sm border border-white/10 bg-black/20 p-4">
                  <p className="text-[10px] tracking-[0.24em] uppercase text-white/40">{selectedWeekend.meetingName}</p>
                  <p className="mt-2 text-lg font-semibold text-white">Round {String(selectedWeekend.round).padStart(2, '0')}</p>
                  <p className="mt-1 text-[10px] text-white/40">{selectedWeekend.circuitShortName} · {selectedWeekend.country}</p>
                </div>
                <div className="rounded-sm border border-white/10 bg-black/20 p-4">
                  <div className="grid gap-2 text-[10px] text-white/40">
                    <div>
                      <p className="uppercase tracking-[0.24em]">Dates</p>
                      <p className="mt-1 text-white">{formatDateRange(selectedWeekend.dateStart, selectedWeekend.dateEnd)}</p>
                    </div>
                    <div>
                      <p className="uppercase tracking-[0.24em]">Circuit type</p>
                      <p className="mt-1 text-white">{formatCircuitType(selectedWeekend.circuitType)}</p>
                    </div>
                    <div>
                      <p className="uppercase tracking-[0.24em]">Status</p>
                      <p className="mt-1 text-white uppercase">{selectedWeekend.status}</p>
                    </div>
                    <div>
                      <p className="uppercase tracking-[0.24em]">Winner</p>
                      <p className="mt-1 text-white">{selectedWeekend.status === 'completed' ? (selectedWeekend.raceWinner ? `${selectedWeekend.raceWinner.driverAcronym} (${selectedWeekend.raceWinner.teamName})` : 'RESULT VERIFICATION PENDING') : selectedWeekend.status === 'active' ? 'ACTIVE WEEKEND — SESSION RESULTS PENDING' : 'UPCOMING EVENT — CALENDAR DATA ONLY'}</p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-white/50">No event selected.</p>
            )}
          </div>

          <div className="rounded-sm border border-white/10 bg-black/20 p-4">
            <div className="flex items-center gap-2 text-white/70 mb-3">
              <Sparkles className="w-4 h-4 text-cyan" />
              <p className="text-sm tracking-[0.18em] uppercase">Season progression</p>
            </div>
            <div className="grid gap-3">
              <div className="rounded-sm border border-white/10 bg-graphite-light/30 p-4">
                <p className="text-[10px] uppercase tracking-[0.24em] text-white/40">Progress distribution</p>
                <div className="mt-3 grid grid-cols-3 gap-3 text-center text-xs text-white/70">
                  <div className="rounded-sm border border-white/10 bg-green-400/[0.08] p-3">
                    <p className="text-2xl font-bold text-green-300">{completedCount}</p>
                    <p className="mt-1 uppercase">Completed</p>
                  </div>
                  <div className="rounded-sm border border-white/10 bg-amber/[0.08] p-3">
                    <p className="text-2xl font-bold text-amber">{activeCount}</p>
                    <p className="mt-1 uppercase">Active</p>
                  </div>
                  <div className="rounded-sm border border-white/10 bg-white/[0.04] p-3">
                    <p className="text-2xl font-bold text-white">{upcomingCount}</p>
                    <p className="mt-1 uppercase">Upcoming</p>
                  </div>
                </div>
              </div>
              <div className="rounded-sm border border-white/10 bg-graphite-light/30 p-4">
                <p className="text-[10px] uppercase tracking-[0.24em] text-white/40">Event confirmation</p>
                <p className="mt-2 text-sm text-white/60">Completed events display verified winner data only. Active and upcoming weekends show calendar data without fabricated race details.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
