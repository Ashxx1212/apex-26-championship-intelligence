import { useEffect, useMemo, useState } from 'react';
import {
  BarChart3,
  Trophy,
  Users,
  Flag,
  Gauge,
  Sparkles,
  Circle,
  Activity,
} from 'lucide-react';
import { calculateAverageRaceFinish, calculateRaceCompletionRate, calculateDNFCount } from '../../utils/championshipMetrics';
import { formatDateRange, formatPercentage, formatPointsGap } from '../../utils/formatters';
import type { ChampionshipDataSnapshot, DriverStanding, OpenF1Driver, TeamStanding } from '../../types/f1';

interface TeamPerformancePageProps {
  data: ChampionshipDataSnapshot | null;
  isLoading: boolean;
}

function TeamRow({ team, selected, onSelect }: {
  team: TeamStanding;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full text-left border px-4 py-3 transition-all duration-200 ${selected ? 'border-cyan/50 bg-cyan/5' : 'border-white/10 bg-black/10 hover:border-white/20'}`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs tracking-[0.18em] text-white/40 uppercase">{team.position === 1 ? 'Leader' : `P${team.position}`}</p>
          <p className="mt-2 text-sm font-semibold text-white truncate">{team.teamName}</p>
        </div>
        <div className="text-right">
          <p className="text-lg font-bold text-cyan">{team.points}</p>
          <p className="text-[10px] text-white/40">{team.performanceIndex !== null ? `Perf ${team.performanceIndex}` : 'Perf pending'}</p>
        </div>
      </div>
    </button>
  );
}

export function TeamPerformancePage({ data, isLoading }: TeamPerformancePageProps) {
  const standings = data?.teamStandings ?? [];
  const [selectedTeamName, setSelectedTeamName] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedTeamName && standings.length > 0) {
      setSelectedTeamName(standings[0].teamName);
    }
  }, [standings, selectedTeamName]);

  const selectedTeam = standings.find((team) => team.teamName === selectedTeamName) ?? standings[0] ?? null;

  const teamDrivers = useMemo(() => {
    if (!data || !selectedTeam) return [];
    const list = data.driversByTeam.get(selectedTeam.teamName) ?? [];
    return list.map((driver) => {
      const standing = data.driverStandings.find((item) => item.driverNumber === driver.driver_number);
      return {
        driver,
        standing,
        averageFinish: calculateAverageRaceFinish(data.raceResults, driver.driver_number),
        completionRate: calculateRaceCompletionRate(data.raceResults, driver.driver_number),
        dnfCount: calculateDNFCount(data.raceResults, driver.driver_number),
      };
    });
  }, [data, selectedTeam]);

  const archiveCoverageLabel = data
    ? `${data.analyticsCoverage.indexedRaceResults}/${data.analyticsCoverage.totalCompletedRaceSessions} indexed rounds`
    : 'Coverage pending';

  const selectedDriverSummary = teamDrivers.length > 0 ? teamDrivers.map((item) => ({
    driverAcronym: item.driver.name_acronym || item.driver.broadcast_name,
    points: item.standing?.points ?? 0,
    position: item.standing?.position ?? 0,
    averageFinish: item.averageFinish,
    completionRate: item.completionRate,
    dnfCount: item.dnfCount,
  })) : [];

  const teamObservationLines: string[] = [];
  if (selectedTeam) {
    if (selectedTeam.position === 1) {
      teamObservationLines.push(`${selectedTeam.teamName} currently leads the Constructors' Championship with ${selectedTeam.points} points.`);
    } else {
      const leader = standings[0];
      if (leader) {
        teamObservationLines.push(`${selectedTeam.teamName} sits P${selectedTeam.position}, ${formatPointsGap(selectedTeam.gapToLeader)} behind the leader.`);
      }
    }

    if (selectedDriverSummary.length === 2) {
      const [driverA, driverB] = selectedDriverSummary;
      teamObservationLines.push(`Driver points split: ${driverA.points} vs ${driverB.points}.`);
      if (driverA.averageFinish !== null && driverB.averageFinish !== null) {
        if (driverA.averageFinish < driverB.averageFinish) {
          teamObservationLines.push(`Average classified finish is stronger for ${driverA.driverAcronym} across indexed races.`);
        } else if (driverB.averageFinish < driverA.averageFinish) {
          teamObservationLines.push(`Average classified finish is stronger for ${driverB.driverAcronym} across indexed races.`);
        }
      }
    }

    if (data) {
      teamObservationLines.push(`Archive coverage is ${archiveCoverageLabel}.`);
    }
  }

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
    <div className="space-y-4 max-w-[1800px] mx-auto">
      <div className="border border-white/10 bg-graphite-light/40 p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-[10px] tracking-[0.24em] text-white/40 uppercase">TEAM PERFORMANCE</p>
            <h1 className="mt-2 text-2xl font-black tracking-[0.08em] text-white">Constructor Intelligence</h1>
            <p className="mt-2 max-w-2xl text-sm text-white/50">Season performance observations, team-specific insights, and verified archive coverage for every constructor.</p>
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <div className="rounded-sm border border-white/10 bg-black/20 px-4 py-3">
              <p className="text-[10px] tracking-[0.24em] text-white/40 uppercase">Source state</p>
              <p className="mt-2 text-sm text-white">{data.analyticsCoverage.totalCompletedRaceSessions > 0 ? 'Verified championship snapshot' : 'Verified data pending'}</p>
            </div>
            <div className="rounded-sm border border-white/10 bg-black/20 px-4 py-3">
              <p className="text-[10px] tracking-[0.24em] text-white/40 uppercase">Archive coverage</p>
              <p className="mt-2 text-sm text-white">{archiveCoverageLabel}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.85fr_1.15fr]">
        <div className="space-y-4">
          <div className="border border-white/10 bg-black/20 overflow-hidden">
            <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
              <div className="flex items-center gap-2 text-white/70">
                <BarChart3 className="w-4 h-4 text-cyan" />
                <p className="text-sm tracking-[0.18em] uppercase">Constructor ranking</p>
              </div>
              <p className="text-[10px] tracking-[0.24em] uppercase text-white/40">{standings.length} teams</p>
            </div>
            <div className="divide-y divide-white/5">
              {standings.map((team) => (
                <TeamRow
                  key={team.teamName}
                  team={team}
                  selected={team.teamName === selectedTeam?.teamName}
                  onSelect={() => setSelectedTeamName(team.teamName)}
                />
              ))}
            </div>
          </div>

          <div className="border border-white/10 bg-black/20 p-4">
            <div className="flex items-center gap-2 text-white/70 mb-3">
              <Users className="w-4 h-4 text-cyan" />
              <p className="text-sm tracking-[0.18em] uppercase">Team details</p>
            </div>
            {selectedTeam ? (
              <div className="grid gap-4 lg:grid-cols-2">
                <div className="space-y-3">
                  <div className="rounded-sm border border-white/10 bg-graphite-light/30 p-4">
                    <p className="text-[10px] tracking-[0.24em] text-white/40 uppercase">Team</p>
                    <h2 className="mt-2 text-xl font-semibold text-white">{selectedTeam.teamName}</h2>
                    <p className="text-[10px] text-white/40 mt-2">P{selectedTeam.position} · {selectedTeam.points} points · {selectedTeam.wins} wins</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-sm border border-white/10 bg-black/20 p-4">
                      <p className="text-[10px] text-white/40 uppercase tracking-[0.24em]">Performance index</p>
                      <p className="mt-2 text-xl font-bold text-cyan">{selectedTeam.performanceIndex ?? '—'}</p>
                    </div>
                    <div className="rounded-sm border border-white/10 bg-black/20 p-4">
                      <p className="text-[10px] text-white/40 uppercase tracking-[0.24em]">Gap to leader</p>
                      <p className="mt-2 text-xl font-bold text-white">{formatPointsGap(selectedTeam.gapToLeader)}</p>
                    </div>
                  </div>
                </div>

                <div className="rounded-sm border border-white/10 bg-graphite-light/30 p-4">
                  <p className="text-[10px] text-white/40 uppercase tracking-[0.24em]">Team drivers</p>
                  <div className="mt-3 space-y-3">
                    {teamDrivers.length > 0 ? teamDrivers.map((driverData) => (
                      <div key={driverData.driver.driver_number} className="rounded-sm border border-white/10 bg-black/20 p-3">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-xs text-white/40 uppercase tracking-[0.18em]">{driverData.driver.name_acronym || driverData.driver.broadcast_name}</p>
                            <p className="mt-1 text-sm font-semibold text-white truncate">{driverData.driver.full_name}</p>
                          </div>
                          <div className="text-right text-[10px] text-white/40">
                            <p>{driverData.standing?.points ?? '—'} pts</p>
                            <p>P{driverData.standing?.position ?? '—'}</p>
                          </div>
                        </div>
                        <div className="mt-3 grid grid-cols-3 gap-2 text-[10px] text-white/40">
                          <div>
                            <div className="text-[9px] uppercase tracking-[0.18em] text-white/30">Avg finish</div>
                            <div className="mt-1 text-white">{driverData.averageFinish ?? '—'}</div>
                          </div>
                          <div>
                            <div className="text-[9px] uppercase tracking-[0.18em] text-white/30">Completion</div>
                            <div className="mt-1 text-white">{driverData.completionRate !== null ? `${driverData.completionRate}%` : '—'}</div>
                          </div>
                          <div>
                            <div className="text-[9px] uppercase tracking-[0.18em] text-white/30">DNFs</div>
                            <div className="mt-1 text-white">{driverData.dnfCount ?? '—'}</div>
                          </div>
                        </div>
                      </div>
                    )) : (
                      <p className="text-sm text-white/50">No team driver data available.</p>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-white/50">Select a constructor to view details.</p>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-sm border border-white/10 bg-black/20 p-4">
            <div className="flex items-center gap-2 text-white/70 mb-3">
              <Flag className="w-4 h-4 text-cyan" />
              <p className="text-sm tracking-[0.18em] uppercase">Performance snapshot</p>
            </div>
            <div className="grid gap-3 text-[10px] text-white/40">
              <div className="rounded-sm border border-white/10 bg-graphite-light/30 p-3">
                <p className="uppercase tracking-[0.18em]">Archive coverage</p>
                <p className="mt-2 text-sm text-white">{archiveCoverageLabel}</p>
              </div>
              <div className="rounded-sm border border-white/10 bg-graphite-light/30 p-3">
                <p className="uppercase tracking-[0.18em]">Verified snapshot date</p>
                <p className="mt-2 text-sm text-white">{data.lastUpdated}</p>
              </div>
              <div className="rounded-sm border border-white/10 bg-graphite-light/30 p-3">
                <p className="uppercase tracking-[0.18em]">Season rounds complete</p>
                <p className="mt-2 text-sm text-white">{data.completedRounds} of {data.totalGrandPrix}</p>
              </div>
            </div>
          </div>

          <div className="rounded-sm border border-white/10 bg-black/20 p-4">
            <div className="flex items-center gap-2 text-white/70 mb-3">
              <Sparkles className="w-4 h-4 text-cyan" />
              <p className="text-sm tracking-[0.18em] uppercase">Evidence notes</p>
            </div>
            <div className="space-y-2">
              {teamObservationLines.length > 0 ? (
                teamObservationLines.map((note) => (
                  <div key={note} className="rounded-sm border border-white/10 bg-graphite-light/30 p-3 text-sm text-white/60">
                    {note}
                  </div>
                ))
              ) : (
                <p className="text-sm text-white/50">No observations available until more verified race results are indexed.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
