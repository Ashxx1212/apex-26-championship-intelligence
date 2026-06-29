import { useEffect, useMemo, useState } from 'react';
import {
  ChevronRight,
  Flag,
  MapPin,
  Radio,
  ShieldCheck,
  Sparkles,
  Trophy,
} from 'lucide-react';
import {
  formatCircuitType,
  formatDateRange,
} from '../../utils/formatters';
import type {
  ChampionshipDataSnapshot,
  RaceWeekendSnapshot,
} from '../../types/f1';

interface CircuitMatrixPageProps {
  data: ChampionshipDataSnapshot | null;
  isLoading: boolean;
  selectedMeetingKey?: number | null;
  onMeetingSelect?: (meetingKey: number) => void;
  onOpenScenarioLab?: () => void;
}

function RoundCard({
  weekend,
  isSelected,
  onSelect,
}: {
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
      className={`w-full rounded-sm border p-4 text-left transition-all duration-200 ${
        statusStyles[weekend.status]
      } ${
        isSelected
          ? 'ring-2 ring-cyan/40 shadow-[inset_3px_0_0_rgba(0,212,255,0.95)]'
          : 'hover:border-cyan/30'
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[9px] uppercase tracking-[0.24em]">
            Round {String(weekend.round).padStart(2, '0')}
          </p>
          <p className="mt-2 truncate text-sm font-semibold text-white">
            {weekend.meetingName}
          </p>
        </div>

        <div className="text-right text-[10px] uppercase tracking-[0.18em] text-white/40">
          {weekend.status}
        </div>
      </div>

      <p className="mt-3 text-[10px] text-white/40">
        {weekend.circuitShortName} · {weekend.country}
      </p>

      <p className="mt-2 text-[10px] text-white/30">
        {weekend.status === 'completed'
          ? weekend.raceWinner
            ? `Winner: ${weekend.raceWinner.driverAcronym}`
            : 'RESULT VERIFICATION PENDING'
          : weekend.status === 'active'
            ? 'ACTIVE CALENDAR WINDOW'
            : 'Calendar data only'}
      </p>
    </button>
  );
}

export function CircuitMatrixPage({
  data,
  isLoading,
  selectedMeetingKey = null,
  onMeetingSelect,
  onOpenScenarioLab,
}: CircuitMatrixPageProps) {
  const [localSelectedMeetingKey, setLocalSelectedMeetingKey] = useState<
    number | null
  >(null);

  const raceWeekends = data?.raceWeekends ?? [];

  useEffect(() => {
    const incomingMeetingIsValid =
      selectedMeetingKey !== null &&
      raceWeekends.some(
        (weekend) => weekend.meetingKey === selectedMeetingKey
      );

    if (incomingMeetingIsValid) {
      setLocalSelectedMeetingKey(selectedMeetingKey);
      return;
    }

    if (!localSelectedMeetingKey && raceWeekends.length > 0) {
      const activeWeekend =
        raceWeekends.find((weekend) => weekend.status === 'active') ??
        raceWeekends[0];

      setLocalSelectedMeetingKey(activeWeekend.meetingKey);
    }
  }, [localSelectedMeetingKey, raceWeekends, selectedMeetingKey]);

  const activeMeetingKey =
    selectedMeetingKey !== null &&
    raceWeekends.some(
      (weekend) => weekend.meetingKey === selectedMeetingKey
    )
      ? selectedMeetingKey
      : localSelectedMeetingKey;

  const selectedWeekend = useMemo(() => {
    if (!data) return null;

    return (
      raceWeekends.find(
        (weekend) => weekend.meetingKey === activeMeetingKey
      ) ??
      raceWeekends.find((weekend) => weekend.status === 'active') ??
      raceWeekends[0] ??
      null
    );
  }, [activeMeetingKey, data, raceWeekends]);

  const liveWeekend =
    raceWeekends.find((weekend) => weekend.status === 'active') ?? null;

  const completedCount = raceWeekends.filter(
    (weekend) => weekend.status === 'completed'
  ).length;
  const activeCount = raceWeekends.filter(
    (weekend) => weekend.status === 'active'
  ).length;
  const upcomingCount = raceWeekends.filter(
    (weekend) => weekend.status === 'upcoming'
  ).length;

  const chooseMeeting = (meetingKey: number) => {
    setLocalSelectedMeetingKey(meetingKey);
    onMeetingSelect?.(meetingKey);
  };

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
        Circuit intelligence requires a verified championship snapshot.
      </div>
    );
  }

  const selectedIsDifferentFromLive =
    selectedWeekend &&
    liveWeekend &&
    selectedWeekend.meetingKey !== liveWeekend.meetingKey;

  return (
    <div className="mx-auto max-w-[1800px] space-y-4">
      <section className="relative overflow-hidden border border-white/10 bg-graphite-light/40 p-5">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_88%_0%,rgba(251,191,36,0.08),transparent_28%)]" />

        <div className="relative flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-[0.24em] text-white/40">
              CIRCUIT MATRIX
            </p>
            <h1 className="mt-2 text-2xl font-black tracking-[0.08em] text-white">
              Event and Track Intelligence
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-white/50">
              Calendar status, event readiness, and verified result confirmation
              for every championship round.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3 text-[10px] text-white/40">
            <div className="rounded-sm border border-white/10 bg-black/20 p-3 text-center">
              <p className="uppercase tracking-[0.18em]">Completed</p>
              <p className="mt-2 text-xl font-bold text-green-300">
                {completedCount}
              </p>
            </div>

            <div className="rounded-sm border border-white/10 bg-black/20 p-3 text-center">
              <p className="uppercase tracking-[0.18em]">Active</p>
              <p className="mt-2 text-xl font-bold text-amber">{activeCount}</p>
            </div>

            <div className="rounded-sm border border-white/10 bg-black/20 p-3 text-center">
              <p className="uppercase tracking-[0.18em]">Upcoming</p>
              <p className="mt-2 text-xl font-bold text-white">
                {upcomingCount}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="border border-cyan/20 bg-cyan/[0.03] p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3">
            <Radio className="mt-0.5 h-4 w-4 shrink-0 text-cyan" />
            <div>
              <p className="text-[9px] uppercase tracking-[0.18em] text-cyan">
                Selected Event Context
              </p>
              <p className="mt-1 text-sm font-semibold text-white">
                {selectedWeekend?.meetingName || 'No selected event'}
              </p>
              <p className="mt-1 text-[10px] text-white/45">
                {selectedWeekend
                  ? `${selectedWeekend.circuitShortName} · ${selectedWeekend.country}`
                  : 'Choose a calendar round to establish the context.'}
              </p>
            </div>
          </div>

          {selectedIsDifferentFromLive && (
            <div className="border border-amber/25 bg-amber/[0.05] px-3 py-2">
              <p className="text-[8px] uppercase tracking-[0.16em] text-amber">
                Live Calendar Focus
              </p>
              <p className="mt-1 text-[10px] text-white/70">
                {liveWeekend?.meetingName} remains active.
              </p>
            </div>
          )}
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
        <section className="border border-white/10 bg-black/20 p-4">
          <div className="mb-4 flex items-center gap-2 text-white/70">
            <MapPin className="h-4 w-4 text-cyan" />
            <p className="text-sm uppercase tracking-[0.18em]">Event Matrix</p>
          </div>

          <div className="grid gap-3">
            {raceWeekends.map((weekend) => (
              <RoundCard
                key={weekend.meetingKey}
                weekend={weekend}
                isSelected={selectedWeekend?.meetingKey === weekend.meetingKey}
                onSelect={() => chooseMeeting(weekend.meetingKey)}
              />
            ))}
          </div>
        </section>

        <div className="space-y-4">
          <section className="border border-white/10 bg-graphite-light/30 p-4">
            <div className="mb-3 flex items-center gap-2 text-white/70">
              <Trophy className="h-4 w-4 text-crimson" />
              <p className="text-sm uppercase tracking-[0.18em]">
                Selected Event Brief
              </p>
            </div>

            {selectedWeekend ? (
              <div className="grid gap-4 lg:grid-cols-[0.85fr_1.15fr]">
                <div className="rounded-sm border border-white/10 bg-black/20 p-4">
                  <p className="text-[10px] uppercase tracking-[0.24em] text-white/40">
                    {selectedWeekend.meetingName}
                  </p>
                  <p className="mt-2 text-lg font-semibold text-white">
                    Round {String(selectedWeekend.round).padStart(2, '0')}
                  </p>
                  <p className="mt-1 text-[10px] text-white/40">
                    {selectedWeekend.circuitShortName} · {selectedWeekend.country}
                  </p>

                  <div className="mt-5 border-t border-white/10 pt-4">
                    <p className="text-[9px] uppercase tracking-[0.18em] text-white/35">
                      Event Status
                    </p>
                    <p
                      className={`mt-2 text-sm font-semibold uppercase ${
                        selectedWeekend.status === 'completed'
                          ? 'text-green-400'
                          : selectedWeekend.status === 'active'
                            ? 'text-amber'
                            : 'text-cyan'
                      }`}
                    >
                      {selectedWeekend.status === 'active'
                        ? 'Active Weekend'
                        : selectedWeekend.status}
                    </p>
                  </div>
                </div>

                <div className="rounded-sm border border-white/10 bg-black/20 p-4">
                  <div className="grid gap-4 text-[10px] text-white/40 sm:grid-cols-2">
                    <div>
                      <p className="uppercase tracking-[0.18em]">Dates</p>
                      <p className="mt-1 text-white">
                        {formatDateRange(
                          selectedWeekend.dateStart,
                          selectedWeekend.dateEnd
                        )}
                      </p>
                    </div>

                    <div>
                      <p className="uppercase tracking-[0.18em]">Circuit Type</p>
                      <p className="mt-1 text-white">
                        {formatCircuitType(selectedWeekend.circuitType)}
                      </p>
                    </div>

                    <div>
                      <p className="uppercase tracking-[0.18em]">Result State</p>
                      <p className="mt-1 text-white">
                        {selectedWeekend.status === 'completed'
                          ? selectedWeekend.raceWinner
                            ? `Verified winner · ${selectedWeekend.raceWinner.driverAcronym}`
                            : 'Result verification pending'
                          : selectedWeekend.status === 'active'
                            ? 'Calendar monitoring only'
                            : 'Calendar data only'}
                      </p>
                    </div>

                    <div>
                      <p className="uppercase tracking-[0.18em]">Readiness</p>
                      <p className="mt-1 text-white">
                        {selectedWeekend.status === 'completed'
                          ? 'Archive-ready'
                          : selectedWeekend.status === 'active'
                            ? 'Source restricted during live window'
                            : 'Awaiting event window'}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={onOpenScenarioLab}
                    className="mt-5 inline-flex items-center gap-2 border border-green-400/30 px-3 py-2 text-[9px] font-semibold tracking-[0.13em] text-green-400 transition-colors hover:bg-green-400/[0.07]"
                  >
                    OPEN SCENARIO LAB WITH THIS WEEKEND
                    <ChevronRight className="h-3 w-3" />
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-white/50">No event selected.</p>
            )}
          </section>

          <section className="rounded-sm border border-white/10 bg-black/20 p-4">
            <div className="mb-3 flex items-center gap-2 text-white/70">
              <Sparkles className="h-4 w-4 text-cyan" />
              <p className="text-sm uppercase tracking-[0.18em]">
                Verification Protocol
              </p>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-sm border border-white/10 bg-graphite-light/30 p-4">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-3.5 w-3.5 text-green-400" />
                  <p className="text-[10px] uppercase tracking-[0.18em] text-white/40">
                    Completed Events
                  </p>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-white/60">
                  Completed rounds display a winner only after a verified P1
                  result has been indexed.
                </p>
              </div>

              <div className="rounded-sm border border-white/10 bg-graphite-light/30 p-4">
                <div className="flex items-center gap-2">
                  <Flag className="h-3.5 w-3.5 text-amber" />
                  <p className="text-[10px] uppercase tracking-[0.18em] text-white/40">
                    Active / Upcoming
                  </p>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-white/60">
                  These rounds show calendar and readiness information only;
                  timing and race outcomes are never fabricated.
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
