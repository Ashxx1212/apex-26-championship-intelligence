import { useEffect, useMemo, useState } from 'react';
import {
  BarChart3,
  ChevronRight,
  Flag,
  Gauge,
  Sparkles,
  Target,
  Users,
} from 'lucide-react';
import {
  calculateAverageRaceFinish,
  calculateDNFCount,
  calculateRaceCompletionRate,
} from '../../utils/championshipMetrics';
import { formatPointsGap } from '../../utils/formatters';
import type {
  ChampionshipDataSnapshot,
  TeamStanding,
} from '../../types/f1';

interface TeamPerformancePageProps {
  data: ChampionshipDataSnapshot | null;
  isLoading: boolean;
  selectedTeamName?: string | null;
  selectedDriverNumber?: number | null;
  onTeamSelect?: (teamName: string) => void;
  onDriverSelect?: (driverNumber: number) => void;
}

function TeamRow({
  team,
  selected,
  onSelect,
}: {
  team: TeamStanding;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full border px-4 py-3 text-left transition-all duration-200 ${
        selected
          ? 'border-cyan/50 bg-cyan/[0.05] shadow-[inset_3px_0_0_rgba(0,212,255,0.95)]'
          : 'border-white/10 bg-black/10 hover:border-white/20'
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-[0.18em] text-white/40">
            {team.position === 1 ? 'Leader' : `P${team.position}`}
          </p>
          <p className="mt-2 truncate text-sm font-semibold text-white">
            {team.teamName}
          </p>
        </div>

        <div className="text-right">
          <p className="text-lg font-bold text-cyan">{team.points}</p>
          <p className="text-[10px] text-white/40">
            {team.performanceIndex !== null
              ? `Perf ${team.performanceIndex}`
              : 'Perf pending'}
          </p>
        </div>
      </div>
    </button>
  );
}

export function TeamPerformancePage({
  data,
  isLoading,
  selectedTeamName = null,
  selectedDriverNumber = null,
  onTeamSelect,
  onDriverSelect,
}: TeamPerformancePageProps) {
  const standings = data?.teamStandings ?? [];
  const [localSelectedTeamName, setLocalSelectedTeamName] = useState<
    string | null
  >(null);

  useEffect(() => {
    const incomingTeamIsValid =
      selectedTeamName !== null &&
      standings.some((team) => team.teamName === selectedTeamName);

    if (incomingTeamIsValid) {
      setLocalSelectedTeamName(selectedTeamName);
      return;
    }

    if (!localSelectedTeamName && standings.length > 0) {
      setLocalSelectedTeamName(standings[0].teamName);
    }
  }, [localSelectedTeamName, selectedTeamName, standings]);

  const activeTeamName =
    selectedTeamName &&
    standings.some((team) => team.teamName === selectedTeamName)
      ? selectedTeamName
      : localSelectedTeamName;

  const selectedTeam =
    standings.find((team) => team.teamName === activeTeamName) ??
    standings[0] ??
    null;

  const chooseTeam = (teamName: string) => {
    setLocalSelectedTeamName(teamName);
    onTeamSelect?.(teamName);
  };

  const teamDrivers = useMemo(() => {
    if (!data || !selectedTeam) return [];

    const drivers = data.driversByTeam.get(selectedTeam.teamName) ?? [];

    return drivers.map((driver) => {
      const standing = data.driverStandings.find(
        (item) => item.driverNumber === driver.driver_number
      );

      return {
        driver,
        standing,
        averageFinish: calculateAverageRaceFinish(
          data.raceResults,
          driver.driver_number
        ),
        completionRate: calculateRaceCompletionRate(
          data.raceResults,
          driver.driver_number
        ),
        dnfCount: calculateDNFCount(data.raceResults, driver.driver_number),
      };
    });
  }, [data, selectedTeam]);

  const archiveCoverageLabel = data
    ? `${data.analyticsCoverage.indexedRaceResults}/${data.analyticsCoverage.totalCompletedRaceSessions} indexed rounds`
    : 'Coverage pending';

  const teamObservationLines = useMemo(() => {
    if (!selectedTeam) return [];

    const observations: string[] = [];

    if (selectedTeam.position === 1) {
      observations.push(
        `${selectedTeam.teamName} leads the Constructors' Championship with ${selectedTeam.points} points.`
      );
    } else {
      const leader = standings[0];

      if (leader) {
        observations.push(
          `${selectedTeam.teamName} sits P${selectedTeam.position}, ${formatPointsGap(
            selectedTeam.gapToLeader
          )} behind the leader.`
        );
      }
    }

    if (teamDrivers.length === 2) {
      const [driverA, driverB] = teamDrivers;
      const driverAPoints = driverA.standing?.points ?? 0;
      const driverBPoints = driverB.standing?.points ?? 0;

      observations.push(
        `Driver points split: ${driverA.driver.name_acronym || driverA.driver.broadcast_name} ${driverAPoints} vs ${driverB.driver.name_acronym || driverB.driver.broadcast_name} ${driverBPoints}.`
      );

      if (
        driverA.averageFinish !== null &&
        driverB.averageFinish !== null &&
        driverA.averageFinish !== driverB.averageFinish
      ) {
        const strongerDriver =
          driverA.averageFinish < driverB.averageFinish ? driverA : driverB;

        observations.push(
          `Average classified finish is stronger for ${
            strongerDriver.driver.name_acronym ||
            strongerDriver.driver.broadcast_name
          } across indexed races.`
        );
      }
    }

    observations.push(`Archive coverage is ${archiveCoverageLabel}.`);

    return observations;
  }, [archiveCoverageLabel, selectedTeam, standings, teamDrivers]);

  if (isLoading) {
    return (
      <div className="rounded-sm border border-white/10 bg-graphite-light/50 p-8 text-center text-sm text-white/50">
        Synchronising constructor intelligence...
      </div>
    );
  }

  if (!data) {
    return (
      <div className="rounded-sm border border-white/10 bg-graphite-light/50 p-8 text-center text-sm text-white/50">
        Constructor performance requires verified championship data.
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1800px] space-y-4">
      <section className="relative overflow-hidden border border-white/10 bg-graphite-light/40 p-5">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_90%_0%,rgba(0,212,255,0.06),transparent_28%)]" />

        <div className="relative flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-[0.24em] text-white/40">
              TEAM PERFORMANCE
            </p>
            <h1 className="mt-2 text-2xl font-black tracking-[0.08em] text-white">
              Constructor Intelligence
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-white/50">
              Team-specific evidence, driver contribution, reliability, and
              verified archive coverage for every constructor.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <div className="rounded-sm border border-cyan/20 bg-cyan/[0.03] px-4 py-3">
              <p className="text-[9px] uppercase tracking-[0.2em] text-cyan">
                Active Team Context
              </p>
              <p className="mt-2 text-sm font-bold text-white">
                {selectedTeam?.teamName || 'Awaiting selection'}
              </p>
            </div>

            <div className="rounded-sm border border-white/10 bg-black/20 px-4 py-3">
              <p className="text-[9px] uppercase tracking-[0.2em] text-white/40">
                Archive Coverage
              </p>
              <p className="mt-2 text-sm text-white">{archiveCoverageLabel}</p>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-[0.85fr_1.15fr]">
        <div className="space-y-4">
          <section className="overflow-hidden border border-white/10 bg-black/20">
            <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
              <div className="flex items-center gap-2 text-white/70">
                <BarChart3 className="h-4 w-4 text-cyan" />
                <p className="text-sm uppercase tracking-[0.18em]">
                  Constructor Ranking
                </p>
              </div>

              <p className="text-[10px] uppercase tracking-[0.24em] text-white/40">
                {standings.length} teams
              </p>
            </div>

            <div className="divide-y divide-white/5">
              {standings.map((team) => (
                <TeamRow
                  key={team.teamName}
                  team={team}
                  selected={team.teamName === selectedTeam?.teamName}
                  onSelect={() => chooseTeam(team.teamName)}
                />
              ))}
            </div>
          </section>

          <section className="border border-white/10 bg-black/20 p-4">
            <div className="flex items-center gap-2 text-white/70">
              <Target className="h-4 w-4 text-crimson" />
              <p className="text-sm uppercase tracking-[0.18em]">
                Context Link
              </p>
            </div>

            <p className="mt-3 text-[11px] leading-relaxed text-white/50">
              Selecting a constructor here updates the persistent APEX
              intelligence context. Driver selections remain available for a
              cross-module comparison.
            </p>
          </section>
        </div>

        <div className="space-y-4">
          <section className="border border-white/10 bg-graphite-light/30 p-4">
            <div className="flex items-center gap-2 text-white/70">
              <Users className="h-4 w-4 text-cyan" />
              <p className="text-sm uppercase tracking-[0.18em]">
                Team Evidence Board
              </p>
            </div>

            {selectedTeam ? (
              <div className="mt-4 grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
                <div className="space-y-3">
                  <div className="rounded-sm border border-white/10 bg-black/20 p-4">
                    <p className="text-[10px] uppercase tracking-[0.24em] text-white/40">
                      Constructor Focus
                    </p>
                    <h2 className="mt-2 text-xl font-semibold text-white">
                      {selectedTeam.teamName}
                    </h2>
                    <p className="mt-2 text-[10px] text-white/40">
                      P{selectedTeam.position} · {selectedTeam.points} points ·{' '}
                      {selectedTeam.wins} wins
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-sm border border-white/10 bg-black/20 p-4">
                      <p className="text-[9px] uppercase tracking-[0.18em] text-white/40">
                        Performance Index
                      </p>
                      <p className="mt-2 text-xl font-bold text-cyan">
                        {selectedTeam.performanceIndex ?? '—'}
                      </p>
                    </div>

                    <div className="rounded-sm border border-white/10 bg-black/20 p-4">
                      <p className="text-[9px] uppercase tracking-[0.18em] text-white/40">
                        Gap to Leader
                      </p>
                      <p className="mt-2 text-xl font-bold text-white">
                        {formatPointsGap(selectedTeam.gapToLeader)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-sm border border-white/10 bg-black/20 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-[10px] uppercase tracking-[0.24em] text-white/40">
                      Driver Contribution
                    </p>
                    <p className="text-[9px] uppercase tracking-[0.16em] text-cyan">
                      Open Driver Intel
                    </p>
                  </div>

                  <div className="mt-3 space-y-3">
                    {teamDrivers.length > 0 ? (
                      teamDrivers.map((driverData) => {
                        const isFocusedDriver =
                          selectedDriverNumber ===
                          driverData.driver.driver_number;

                        return (
                          <button
                            type="button"
                            key={driverData.driver.driver_number}
                            onClick={() =>
                              onDriverSelect?.(
                                driverData.driver.driver_number
                              )
                            }
                            className={`w-full rounded-sm border p-3 text-left transition-colors ${
                              isFocusedDriver
                                ? 'border-cyan/45 bg-cyan/[0.05]'
                                : 'border-white/10 bg-graphite-light/30 hover:border-cyan/25'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-3">
                              <div className="min-w-0">
                                <p className="text-xs uppercase tracking-[0.18em] text-white/40">
                                  {driverData.driver.name_acronym ||
                                    driverData.driver.broadcast_name}
                                </p>
                                <p className="mt-1 truncate text-sm font-semibold text-white">
                                  {driverData.driver.full_name}
                                </p>
                              </div>

                              <div className="flex shrink-0 items-center gap-2 text-right">
                                {isFocusedDriver && (
                                  <span className="border border-cyan/25 bg-cyan/[0.05] px-1.5 py-1 text-[8px] font-semibold tracking-[0.12em] text-cyan">
                                    FOCUS
                                  </span>
                                )}
                                <ChevronRight className="h-4 w-4 text-cyan" />
                              </div>
                            </div>

                            <div className="mt-3 grid grid-cols-4 gap-2 text-[10px] text-white/40">
                              <div>
                                <p className="text-[8px] uppercase tracking-[0.14em] text-white/30">
                                  Points
                                </p>
                                <p className="mt-1 text-white">
                                  {driverData.standing?.points ?? '—'}
                                </p>
                              </div>
                              <div>
                                <p className="text-[8px] uppercase tracking-[0.14em] text-white/30">
                                  Position
                                </p>
                                <p className="mt-1 text-white">
                                  P{driverData.standing?.position ?? '—'}
                                </p>
                              </div>
                              <div>
                                <p className="text-[8px] uppercase tracking-[0.14em] text-white/30">
                                  Avg Finish
                                </p>
                                <p className="mt-1 text-white">
                                  {driverData.averageFinish ?? '—'}
                                </p>
                              </div>
                              <div>
                                <p className="text-[8px] uppercase tracking-[0.14em] text-white/30">
                                  Completion
                                </p>
                                <p className="mt-1 text-white">
                                  {driverData.completionRate !== null
                                    ? `${driverData.completionRate}%`
                                    : '—'}
                                </p>
                              </div>
                            </div>
                          </button>
                        );
                      })
                    ) : (
                      <p className="text-sm text-white/50">
                        No team driver data available.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <p className="mt-4 text-sm text-white/50">
                Select a constructor to view its evidence board.
              </p>
            )}
          </section>

          <div className="grid gap-4 lg:grid-cols-2">
            <section className="rounded-sm border border-white/10 bg-black/20 p-4">
              <div className="flex items-center gap-2 text-white/70">
                <Flag className="h-4 w-4 text-cyan" />
                <p className="text-sm uppercase tracking-[0.18em]">
                  Performance Snapshot
                </p>
              </div>

              <div className="mt-3 grid gap-3 text-[10px] text-white/40">
                <div className="rounded-sm border border-white/10 bg-graphite-light/30 p-3">
                  <p className="uppercase tracking-[0.18em]">
                    Verified Snapshot Date
                  </p>
                  <p className="mt-2 text-sm text-white">{data.lastUpdated}</p>
                </div>

                <div className="rounded-sm border border-white/10 bg-graphite-light/30 p-3">
                  <p className="uppercase tracking-[0.18em]">
                    Season Rounds Complete
                  </p>
                  <p className="mt-2 text-sm text-white">
                    {data.completedRounds} of {data.totalGrandPrix}
                  </p>
                </div>
              </div>
            </section>

            <section className="rounded-sm border border-white/10 bg-black/20 p-4">
              <div className="flex items-center gap-2 text-white/70">
                <Sparkles className="h-4 w-4 text-cyan" />
                <p className="text-sm uppercase tracking-[0.18em]">
                  Evidence Notes
                </p>
              </div>

              <div className="mt-3 space-y-2">
                {teamObservationLines.length > 0 ? (
                  teamObservationLines.map((note) => (
                    <div
                      key={note}
                      className="rounded-sm border border-white/10 bg-graphite-light/30 p-3 text-sm text-white/60"
                    >
                      {note}
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-white/50">
                    No observations available until more verified race results
                    are indexed.
                  </p>
                )}
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
