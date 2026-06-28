import {
  ArrowRight,
  Database,
  FlaskConical,
  Flag,
  ShieldCheck,
  Sparkles,
  Target,
  Users,
} from 'lucide-react';
import { DriverIntelHero } from './components/DriverIntelHero';
import { DriverIntelBreakdown } from './components/DriverIntelBreakdown';
import { DriverIntelTimeline } from './components/DriverIntelTimeline';
import { DriverIntelTeammate } from './components/DriverIntelTeammate';
import type { DriverIntelSnapshot } from './driverIntelTypes';
import type { DriverStanding } from '../../types/f1';

interface DriverIntelPageProps {
  onOpenRace?: (round: number) => void;
  snapshot: DriverIntelSnapshot | null;
  availableDrivers?: DriverStanding[];
  selectedWeekendName?: string | null;
  onDriverSelect?: (driverNumber: number) => void;
  onOpenTeam?: (teamName: string) => void;
  onOpenScenarioLab?: () => void;
}

function formatGap(gapToLeader: number | null): string {
  if (gapToLeader === null) return 'LEADER';

  return `+${gapToLeader} PTS`;
}

export function DriverIntelPage({
  snapshot,
  availableDrivers = [],
  selectedWeekendName = null,
    onDriverSelect,
  onOpenTeam,
  onOpenScenarioLab,
  onOpenRace,
}: DriverIntelPageProps) {
  if (!snapshot) {
    return (
      <div className="rounded-sm border border-white/10 bg-graphite-light/50 p-8 text-center text-sm text-white/50">
        Select a driver from Command Centre or Championship to open a verified
        Driver Intel dossier.
      </div>
    );
  }

  const driverRoster = availableDrivers.slice(0, 10);

  return (
    <div className="mx-auto max-w-[1800px] space-y-4">
      <section className="relative overflow-hidden border border-white/10 bg-[#0b0d12]/85 p-5">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_90%_10%,rgba(0,212,255,0.08),transparent_30%),radial-gradient(circle_at_12%_100%,rgba(220,20,60,0.06),transparent_30%)]" />

        <div className="pointer-events-none absolute bottom-[-44px] right-5 text-[120px] font-black leading-none tracking-[-0.12em] text-white/[0.025]">
          {snapshot.driverAcronym}
        </div>

        <div className="relative flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-cyan" />
              <p className="text-[10px] uppercase tracking-[0.24em] text-cyan">
                Driver Intelligence Dossier
              </p>
            </div>

            <h1 className="mt-3 text-3xl font-black tracking-[0.08em] text-white md:text-4xl">
              {snapshot.driverName.toUpperCase()}
            </h1>

            <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-[10px] uppercase tracking-[0.16em] text-white/45">
              <span className="flex items-center gap-2">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{
                    backgroundColor: `#${snapshot.teamColour || 'ffffff'}`,
                    boxShadow: `0 0 10px #${snapshot.teamColour || 'ffffff'}`,
                  }}
                />
                {snapshot.teamName}
              </span>

              <span>
                CHAMPIONSHIP P{snapshot.position} · {snapshot.points} PTS
              </span>

              <span>{formatGap(snapshot.gapToLeader)}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <div className="border border-white/10 bg-black/20 px-4 py-3">
              <div className="flex items-center gap-2">
                <Flag className="h-3.5 w-3.5 text-amber" />
                <p className="text-[8px] uppercase tracking-[0.16em] text-white/35">
                  Weekend Context
                </p>
              </div>

              <p className="mt-2 max-w-[180px] truncate text-[11px] font-bold text-white">
                {selectedWeekendName || 'Calendar focus pending'}
              </p>
            </div>

            <div className="border border-white/10 bg-black/20 px-4 py-3">
              <div className="flex items-center gap-2">
                <Database className="h-3.5 w-3.5 text-cyan" />
                <p className="text-[8px] uppercase tracking-[0.16em] text-white/35">
                  Archive Coverage
                </p>
              </div>

              <p className="mt-2 text-[11px] font-bold text-white">
                {snapshot.archiveCoverage.indexedRaceResults}/
                {snapshot.archiveCoverage.totalCompletedRaceSessions} ROUNDS
              </p>
            </div>

            <div className="border border-white/10 bg-black/20 px-4 py-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-3.5 w-3.5 text-green-400" />
                <p className="text-[8px] uppercase tracking-[0.16em] text-white/35">
                  Latest Verified
                </p>
              </div>

              <p className="mt-2 max-w-[185px] truncate text-[11px] font-bold text-white">
                {snapshot.latestVerifiedResult?.racePosition !== null &&
                snapshot.latestVerifiedResult
                  ? `P${snapshot.latestVerifiedResult.racePosition} · ${snapshot.latestVerifiedResult.meetingName}`
                  : snapshot.latestVerifiedResult?.meetingName ||
                    'Result pending'}
              </p>
            </div>
          </div>
        </div>

        <div className="relative mt-5 flex flex-wrap items-center gap-2 border-t border-white/10 pt-4">
          <button
            type="button"
            onClick={() => onOpenTeam?.(snapshot.teamName)}
            className="inline-flex items-center gap-2 border border-cyan/30 bg-cyan/[0.03] px-3 py-2 text-[9px] font-semibold tracking-[0.14em] text-cyan transition-colors hover:bg-cyan/[0.08]"
          >
            <Users className="h-3.5 w-3.5" />
            OPEN {snapshot.teamName.toUpperCase()} PERFORMANCE
            <ArrowRight className="h-3 w-3" />
          </button>

          <button
            type="button"
            onClick={onOpenScenarioLab}
            className="inline-flex items-center gap-2 border border-green-400/30 bg-green-400/[0.03] px-3 py-2 text-[9px] font-semibold tracking-[0.14em] text-green-400 transition-colors hover:bg-green-400/[0.08]"
          >
            <FlaskConical className="h-3.5 w-3.5" />
            OPEN SCENARIO LAB WITH DRIVER CONTEXT
            <ArrowRight className="h-3 w-3" />
          </button>

          <span className="ml-auto text-[9px] uppercase tracking-[0.13em] text-white/30">
            {snapshot.archiveCoverage.hasPendingWork
              ? 'PARTIAL ARCHIVE · VERIFIED INPUTS ONLY'
              : 'ARCHIVE VERIFIED'}
          </span>
        </div>
      </section>

      {driverRoster.length > 0 && (
        <section className="overflow-hidden border border-white/10 bg-black/[0.20]">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-3.5 w-3.5 text-crimson" />
              <p className="text-[10px] uppercase tracking-[0.18em] text-white/70">
                Quick Driver Switch
              </p>
            </div>

            <p className="text-[9px] uppercase tracking-[0.14em] text-white/30">
              TOP 10 VERIFIED STANDINGS
            </p>
          </div>

          <div className="flex gap-2 overflow-x-auto p-3">
            {driverRoster.map((driver) => {
              const isSelected = driver.driverNumber === snapshot.driverNumber;

              return (
                <button
                  type="button"
                  key={driver.driverNumber}
                  onClick={() => onDriverSelect?.(driver.driverNumber)}
                  className={`min-w-[142px] border px-3 py-2 text-left transition-colors ${
                    isSelected
                      ? 'border-cyan/55 bg-cyan/[0.06]'
                      : 'border-white/10 bg-graphite-light/30 hover:border-cyan/30'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-bold text-white">
                      P{driver.position}
                    </span>

                    {isSelected && (
                      <span className="text-[8px] font-semibold tracking-[0.12em] text-cyan">
                        ACTIVE
                      </span>
                    )}
                  </div>

                  <p className="mt-2 text-sm font-black tracking-[0.1em] text-white">
                    {driver.driverAcronym}
                  </p>

                  <p className="mt-1 truncate text-[9px] text-white/40">
                    {driver.teamName} · {driver.points} pts
                  </p>
                </button>
              );
            })}
          </div>
        </section>
      )}

      <DriverIntelHero snapshot={snapshot} />

      <DriverIntelBreakdown snapshot={snapshot} />

      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <DriverIntelTimeline
  snapshot={snapshot}
  onOpenRace={onOpenRace}
/>

        <div className="space-y-4">
          <DriverIntelTeammate
  snapshot={snapshot}
  onSelectTeammate={onDriverSelect}
/>

          <div className="rounded-sm border border-white/10 bg-graphite-light/50 p-4">
            <div className="mb-4 flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-white/45">
              <Sparkles className="h-3.5 w-3.5 text-cyan" />
              VERIFIED OBSERVATIONS
            </div>

            <ul className="space-y-2 text-sm text-white/60">
              {snapshot.observations.length > 0 ? (
                snapshot.observations.map((observation) => (
                  <li
                    key={observation}
                    className="rounded-sm border border-white/10 bg-black/10 px-3 py-2"
                  >
                    {observation}
                  </li>
                ))
              ) : (
                <li className="rounded-sm border border-dashed border-white/10 px-3 py-2 text-white/40">
                  No observations are available until verified data is indexed.
                </li>
              )}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}