import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  ChevronRight,
  Flag,
  Gauge,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  Users,
  Zap,
} from 'lucide-react';
import {
  calculateAverageRaceFinish,
  calculateDNFCount,
  calculateRaceCompletionRate,
  calculateRecentFormScore,
  calculateTeammateGap,
} from '../../utils/championshipMetrics';
import { formatPointsGap, formatTimestamp } from '../../utils/formatters';
import type {
  ChampionshipDataSnapshot,
  DriverStanding,
  OpenF1Driver,
  TeamStanding,
} from '../../types/f1';

interface TeamPerformancePageProps {
  data: ChampionshipDataSnapshot | null;
  isLoading: boolean;
  selectedTeamName?: string | null;
  selectedDriverNumber?: number | null;
  onTeamSelect?: (teamName: string) => void;
  onDriverSelect?: (driverNumber: number) => void;
  onOpenRace?: (meetingKey: number) => void;
}

interface DriverContribution {
  driver: OpenF1Driver;
  standing: DriverStanding | undefined;
  averageFinish: number | null;
  completionRate: number | null;
  dnfCount: number | null;
  recentForm: ('W' | 'P' | 'D' | 'R')[];
  contributionPercentage: number | null;
  teammateGap: number | null;
}

interface TeamMetrics {
  avgFinishComparison: string | null;
  reliabilityRate: number | null;
  teammateAdvantage: {
    driver: string;
    gap: number;
  } | null;
  latestVerifiedImpact: {
    meetingName: string;
    pointsScored: number;
    positions: { driver: string; position: number | null }[];
  } | null;
  archiveCoveragePercent: number;
  missingRounds: number;
}

function FormBadge({ form }: { form: ('W' | 'P' | 'D' | 'R') }) {
  const config = {
    W: 'bg-crimson text-white',
    P: 'bg-amber text-black',
    D: 'bg-cyan text-black',
    R: 'bg-white/15 text-white/60',
  };

  return (
    <span className={`inline-flex h-4 w-4 items-center justify-center rounded-sm text-[9px] font-bold ${config[form]}`}>
      {form}
    </span>
  );
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
      className={`group w-full border-b border-white/5 px-4 py-3.5 text-left transition-all duration-200 last:border-b-0 ${
        selected
          ? 'bg-cyan/[0.05] shadow-[inset_3px_0_0_#00d4ff,0_0_0_#00d4ff]'
          : 'bg-transparent hover:bg-white/[0.025]'
      }`}
    >
      <div className="flex items-center gap-3">
        {/* Team colour bar */}
        <div
          className="h-8 w-1 rounded-sm"
          style={{
            backgroundColor: `#${team.teamColour || 'ffffff'}`,
            boxShadow: selected ? `0 0 8px #${team.teamColour || 'ffffff'}` : 'none',
          }}
        />

        <div className="min-w-0 flex-1">
          <p className="text-[9px] uppercase tracking-[0.2em] text-white/40">
            {team.position === 1 ? 'LEADER' : `P${team.position}`}
          </p>
          <p className="mt-1.5 truncate text-sm font-semibold tracking-wide text-white">
            {team.teamName}
          </p>
        </div>

        <div className="text-right">
          <p className={`text-lg font-bold tracking-tight ${selected ? 'text-cyan' : 'text-white/80'}`}>
            {team.points}
          </p>
          <p className="text-[9px] text-white/30">
            {team.wins > 0 ? `${team.wins}W` : '—'}
          </p>
        </div>

        {selected && (
          <div className="flex h-6 w-6 items-center justify-center rounded-full border border-cyan/30 bg-cyan/10">
            <ChevronRight className="h-3 w-3 text-cyan" />
          </div>
        )}
      </div>
    </button>
  );
}

function DriverCard({
  contribution,
  isFocused,
  isSelected,
  onSelect,
}: {
  contribution: DriverContribution;
  isFocused: boolean;
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`group w-full rounded-sm border p-4 text-left transition-all duration-200 ${
        isSelected
          ? 'border-cyan/60 bg-cyan/[0.07] shadow-[0_0_18px_rgba(0,212,255,0.16)]'
          : 'border-white/10 bg-graphite-light/30 hover:border-cyan/25 hover:bg-cyan/[0.02]'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="border border-white/10 bg-white/5 px-2 py-0.5 text-xs font-bold tracking-[0.12em] text-white">
              {contribution.driver.name_acronym}
            </span>
            {isFocused && (
              <span className="rounded-sm border border-amber/40 bg-amber/[0.08] px-1.5 py-0.5 text-[8px] font-semibold tracking-[0.12em] text-amber">
                FOCUS
              </span>
            )}
          </div>

          <p className="mt-2 truncate text-sm font-semibold text-white">
            {contribution.driver.full_name}
          </p>

          <p className="mt-1 text-[10px] text-white/40">
            P{contribution.standing?.position ?? '—'} · {contribution.standing?.points ?? 0} PTS
          </p>
        </div>

        <div className="shrink-0 text-right">
          <p className="text-xl font-bold text-cyan">
            {contribution.contributionPercentage !== null
              ? `${contribution.contributionPercentage}%`
              : '—'}
          </p>
          <p className="text-[8px] uppercase tracking-[0.12em] text-white/30">
            Contribution
          </p>
        </div>
      </div>

      {/* Metrics row */}
      <div className="mt-4 grid grid-cols-4 gap-2 text-center">
        <div>
          <p className="text-[8px] uppercase tracking-[0.14em] text-white/30">
            Avg Fin
          </p>
          <p className="mt-1 text-sm font-bold text-white">
            {contribution.averageFinish ?? '—'}
          </p>
        </div>
        <div>
          <p className="text-[8px] uppercase tracking-[0.14em] text-white/30">
            Rel
          </p>
          <p className="mt-1 text-sm font-bold text-white">
            {contribution.completionRate !== null ? `${contribution.completionRate}%` : '—'}
          </p>
        </div>
        <div>
          <p className="text-[8px] uppercase tracking-[0.14em] text-white/30">
            DNFs
          </p>
          <p className="mt-1 text-sm font-bold text-white">
            {contribution.dnfCount ?? '—'}
          </p>
        </div>
        <div>
          <p className="text-[8px] uppercase tracking-[0.14em] text-white/30">
            Form
          </p>
          <div className="mt-1 flex justify-center gap-0.5">
            {contribution.recentForm.length > 0 ? (
              contribution.recentForm.map((f, i) => <FormBadge key={i} form={f} />)
            ) : (
              <span className="text-[10px] text-white/30">—</span>
            )}
          </div>
        </div>
      </div>

      {/* Open driver intel link */}
      <div className="mt-3 flex items-center justify-end gap-1 text-[9px] font-semibold tracking-[0.12em] text-cyan/0 transition-colors group-hover:text-cyan/85">
        <span>OPEN DRIVER INTEL</span>
        <ArrowRight className="h-3 w-3" />
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
  onOpenRace,
}: TeamPerformancePageProps) {
  const standings = useMemo(() => data?.teamStandings ?? [], [data?.teamStandings]);
  const raceResults = useMemo(() => data?.raceResults ?? [], [data?.raceResults]);
  const [localSelectedTeamName, setLocalSelectedTeamName] = useState<string | null>(null);

  // Sync with shared context
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
const latestVerifiedRace =
  raceResults.length > 0 ? raceResults[raceResults.length - 1] : null;

const latestVerifiedMeetingKey =
  latestVerifiedRace
    ? data?.raceWeekends.find(
        (weekend) => weekend.round === latestVerifiedRace.round
      )?.meetingKey ?? null
    : null;

  const chooseTeam = (teamName: string) => {
    setLocalSelectedTeamName(teamName);
    onTeamSelect?.(teamName);
  };

  // Calculate driver contributions
  const driverContributions: DriverContribution[] = useMemo(() => {
    if (!data || !selectedTeam) return [];

    const drivers = data.driversByTeam.get(selectedTeam.teamName) ?? [];

    return drivers.map((driver) => {
      const standing = data.driverStandings.find(
        (item) => item.driverNumber === driver.driver_number
      );

      const avgFinish = calculateAverageRaceFinish(raceResults, driver.driver_number);
      const compRate = calculateRaceCompletionRate(raceResults, driver.driver_number);
      const dnfs = calculateDNFCount(raceResults, driver.driver_number);
      const form = calculateRecentFormScore(raceResults, driver.driver_number);

      // Calculate contribution % from verified team points
      let contribPct: number | null = null;
      if (selectedTeam.points > 0 && standing?.points) {
        contribPct = Math.round((standing.points / selectedTeam.points) * 100);
      }

      // Calculate teammate gap
      let teammateGap: number | null = null;
      if (drivers.length === 2) {
        const teammate = drivers.find((d) => d.driver_number !== driver.driver_number);
        if (teammate) {
          teammateGap = calculateTeammateGap(raceResults, driver.driver_number, teammate.driver_number);
        }
      }

      return {
        driver,
        standing,
        averageFinish: avgFinish,
        completionRate: compRate,
        dnfCount: dnfs,
        recentForm: form,
        contributionPercentage: contribPct,
        teammateGap,
      };
    });
  }, [data, selectedTeam, raceResults]);

  // Archive coverage metrics - computed directly from data.analyticsCoverage
  // This must be derived fresh from the source to match other panels
  const archiveCoverage = useMemo(() => {
    const indexed = data?.analyticsCoverage?.indexedRaceResults ?? 0;
    const total = data?.analyticsCoverage?.totalCompletedRaceSessions ?? 0;
    const coveragePercent = total > 0 ? Math.round((indexed / total) * 100) : 0;
    const missing = Math.max(0, total - indexed);
    return { indexed, total, coveragePercent, missing };
  }, [data?.analyticsCoverage?.indexedRaceResults, data?.analyticsCoverage?.totalCompletedRaceSessions]);

  // Calculate team metrics from verified data only
  const teamMetrics: TeamMetrics = useMemo(() => {
    // Average finish comparison
    let avgFinishComparison: string | null = null;
    if (driverContributions.length === 2) {
      const [a, b] = driverContributions;
      if (a.averageFinish !== null && b.averageFinish !== null) {
        const diff = Math.abs(a.averageFinish - b.averageFinish);
        const leader = a.averageFinish < b.averageFinish ? a.driver.name_acronym : b.driver.name_acronym;
        avgFinishComparison = `${leader} ahead by avg ${diff.toFixed(1)} positions`;
      }
    }

    // Combined reliability
    let reliabilityRate: number | null = null;
    const completionRates = driverContributions
      .map((d) => d.completionRate)
      .filter((r): r is number => r !== null);

    if (completionRates.length > 0) {
      reliabilityRate = Math.round(
        completionRates.reduce((a, b) => a + b, 0) / completionRates.length
      );
    }

    // Teammate advantage
    let teammateAdvantage: TeamMetrics['teammateAdvantage'] = null;
    if (driverContributions.length === 2) {
      const [a, b] = driverContributions;
      if (a.teammateGap !== null) {
        teammateAdvantage = {
          driver: a.teammateGap < 0 ? a.driver.name_acronym : b.driver.name_acronym,
          gap: Math.abs(a.teammateGap),
        };
      }
    }

    // Latest verified race impact
    let latestVerifiedImpact: TeamMetrics['latestVerifiedImpact'] = null;
    if (raceResults.length > 0 && selectedTeam) {
      const latest = raceResults[raceResults.length - 1];
      const positions: { driver: string; position: number | null }[] = [];
      let pointsScored = 0;

      driverContributions.forEach((dc) => {
        const result = latest.driverResults.get(dc.driver.driver_number);
        if (result) {
          positions.push({
            driver: dc.driver.name_acronym,
            position: result.racePosition,
          });
          // Calculate points from position (simplified)
          if (result.racePosition && result.racePosition <= 10) {
            const ptsTable = [25, 18, 15, 12, 10, 8, 6, 4, 2, 1];
            pointsScored += ptsTable[result.racePosition - 1] || 0;
          }
        }
      });

      latestVerifiedImpact = {
        meetingName: latest.meetingName,
        pointsScored,
        positions,
      };
    }

    return {
      avgFinishComparison,
      reliabilityRate,
      teammateAdvantage,
      latestVerifiedImpact,
      archiveCoveragePercent: archiveCoverage.coveragePercent,
      missingRounds: archiveCoverage.missing,
    };
  }, [archiveCoverage, driverContributions, raceResults, selectedTeam]);

  // Constructor battle position
  const constructorBattle = useMemo(() => {
    if (!selectedTeam) return null;

    const idx = standings.findIndex((t) => t.teamName === selectedTeam.teamName);
    const ahead = idx > 0 ? standings[idx - 1] : null;
    const behind = idx < standings.length - 1 ? standings[idx + 1] : null;

    return { ahead, behind };
  }, [selectedTeam, standings]);

  // Driver contribution imbalance
  const contributionImbalance = useMemo(() => {
    if (driverContributions.length !== 2) return null;

    const [a, b] = driverContributions;
    const aPct = a.contributionPercentage ?? 0;
    const bPct = b.contributionPercentage ?? 0;
    const diff = Math.abs(aPct - bPct);

    if (diff <= 5) {
      return { type: 'balanced' as const, message: 'Driver contributions balanced' };
    }

    const leader = aPct > bPct ? a.driver.name_acronym : b.driver.name_acronym;
    return { type: 'imbalanced' as const, message: `${leader} leads contributions by ${diff}%` };
  }, [driverContributions]);

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
      {/* Constructor Intelligence Hero */}
      <section className="relative overflow-hidden border border-white/10 bg-[#0b0d12]/85">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_90%_10%,rgba(0,212,255,0.08),transparent_30%),radial-gradient(circle_at_12%_100%,rgba(220,20,60,0.06),transparent_30%)]" />

        {/* Team colour accent bar */}
        {selectedTeam && (
          <div
            className="pointer-events-none absolute inset-x-0 top-0 h-1"
            style={{
              background: `linear-gradient(90deg, transparent, #${selectedTeam.teamColour || 'ffffff'}, transparent)`,
            }}
          />
        )}

        <div className="relative p-5 md:p-6">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-cyan" />
                <p className="text-[10px] uppercase tracking-[0.24em] text-cyan">
                  Constructor Intelligence Dossier
                </p>
              </div>

              <h1 className="mt-3 text-3xl font-black tracking-[0.08em] text-white md:text-4xl">
                {selectedTeam?.teamName?.toUpperCase() || 'SELECT CONSTRUCTOR'}
              </h1>

              <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-[10px] uppercase tracking-[0.16em] text-white/45">
                {selectedTeam && (
                  <>
                    <span className="flex items-center gap-2">
                      <div
                        className="h-2 w-2 rounded-full"
                        style={{
                          backgroundColor: `#${selectedTeam.teamColour || 'ffffff'}`,
                          boxShadow: `0 0 10px #${selectedTeam.teamColour || 'ffffff'}`,
                        }}
                      />
                      CONSTRUCTOR P{selectedTeam.position}
                    </span>
                    <span>{selectedTeam.points} PTS</span>
                    <span>
                      {selectedTeam.gapToLeader !== null
                        ? `+${selectedTeam.gapToLeader} TO LEADER`
                        : 'CHAMPIONSHIP LEADER'}
                    </span>
                    <span>{selectedTeam.wins > 0 ? `${selectedTeam.wins} WINS` : 'NO WINS'}</span>
                  </>
                )}
              </div>
            </div>

            {/* Status badges */}
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <div className="border border-amber/25 bg-amber/[0.04] px-4 py-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-3.5 w-3.5 text-amber" />
                  <p className="text-[8px] uppercase tracking-[0.16em] text-white/35">
                    Archive Coverage
                  </p>
                </div>
                <p className="mt-2 text-[11px] font-bold text-white">
                  {archiveCoverage.total > 0
                    ? `${archiveCoverage.indexed}/${archiveCoverage.total} VERIFIED`
                    : 'AWAITING COMPLETED-RACE INGESTION'}
                </p>
                {archiveCoverage.missing > 0 && (
                  <p className="mt-1 text-[9px] text-amber/70">
                    {archiveCoverage.missing} ROUNDS PENDING
                  </p>
                )}
              </div>

              <div className="border border-white/10 bg-black/20 px-4 py-3">
                <div className="flex items-center gap-2">
                  <Flag className="h-3.5 w-3.5 text-cyan" />
                  <p className="text-[8px] uppercase tracking-[0.16em] text-white/35">
                    Latest Verified Result
                  </p>
                </div>
                <p className="mt-2 truncate text-[11px] font-bold text-white">
                  {teamMetrics.latestVerifiedImpact
                    ? `${teamMetrics.latestVerifiedImpact.pointsScored} PTS · ${teamMetrics.latestVerifiedImpact.meetingName}`
                    : 'RESULT PENDING'}
                </p>
              </div>

              <div className="border border-white/10 bg-black/20 px-4 py-3">
                <div className="flex items-center gap-2">
                  <Gauge className="h-3.5 w-3.5 text-green-400" />
                  <p className="text-[8px] uppercase tracking-[0.16em] text-white/35">
                    Verified Timestamp
                  </p>
                </div>
                <p className="mt-2 text-[11px] font-bold text-white">
                  {formatTimestamp(data.lastUpdated)}
                </p>
              </div>
            </div>
          </div>

          {/* Data integrity notice */}
          <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-white/10 pt-4">
            <span className="text-[9px] uppercase tracking-[0.13em] text-amber">
              {archiveCoverage.total > 0 && archiveCoverage.missing > 0
                ? `PARTIAL ARCHIVE · ${archiveCoverage.coveragePercent}% VERIFIED`
                : archiveCoverage.total > 0
                  ? 'FULL ARCHIVE · ALL RACES INDEXED'
                  : 'NO COMPLETED RACES INDEXED'}
            </span>
            <span className="text-[9px] uppercase tracking-[0.13em] text-white/30">
              NO PREDICTIONS OR FABRICATED METRICS
            </span>
          </div>
        </div>
      </section>

      {/* Main grid */}
      <div className="grid gap-4 xl:grid-cols-[0.85fr_1.15fr]">
        {/* Left column - Constructor Ranking Navigator */}
        <div className="space-y-4">
          <section className="overflow-hidden border border-white/10 bg-black/20">
            <div className="flex items-center justify-between gap-3 border-b border-white/10 bg-white/[0.02] px-4 py-3">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-cyan" />
                <p className="text-sm uppercase tracking-[0.18em] text-white/70">
                  Constructor Ranking
                </p>
              </div>

              <p className="text-[10px] uppercase tracking-[0.24em] text-white/40">
                {standings.length} TEAMS
              </p>
            </div>

            <div className="max-h-[480px] overflow-y-auto">
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

          {/* Context link */}
          <section className="border border-white/10 bg-black/20 p-4">
            <div className="flex items-center gap-2 text-white/70">
              <Target className="h-4 w-4 text-crimson" />
              <p className="text-sm uppercase tracking-[0.18em]">
                Intelligence Context
              </p>
            </div>

            <p className="mt-3 text-[11px] leading-relaxed text-white/50">
              Selecting a constructor updates the shared APEX context.
              Driver selections remain available for cross-module comparison.
            </p>
          </section>
        </div>

        {/* Right column - Team Evidence Board */}
        <div className="space-y-4">
          {/* Driver Contribution Board */}
          <section className="border border-white/10 bg-graphite-light/30">
            <div className="flex items-center justify-between gap-3 border-b border-white/10 bg-white/[0.02] px-4 py-3">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-cyan" />
                <p className="text-sm uppercase tracking-[0.18em] text-white/70">
                  Driver Contribution Board
                </p>
              </div>

              {driverContributions.length === 2 && (
                <p className="text-[9px] uppercase tracking-[0.14em] text-cyan">
                  {driverContributions[0].driver.name_acronym} & {driverContributions[1].driver.name_acronym}
                </p>
              )}
            </div>

            <div className="p-4">
              {driverContributions.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2">
                  {driverContributions.map((contrib) => (
                    <DriverCard
                      key={contrib.driver.driver_number}
                      contribution={contrib}
                      isFocused={selectedDriverNumber === contrib.driver.driver_number}
                      isSelected={selectedDriverNumber === contrib.driver.driver_number}
                      onSelect={() => onDriverSelect?.(contrib.driver.driver_number)}
                    />
                  ))}
                </div>
              ) : (
                <div className="border border-dashed border-white/10 p-6 text-center">
                  <p className="text-sm text-white/40">
                    No team driver data available for this constructor.
                  </p>
                  <p className="mt-2 text-[10px] text-white/25">
                    Driver metadata may be pending for this session.
                  </p>
                </div>
              )}
            </div>
          </section>

          {/* Team Evidence / Performance Board */}
          <section className="border border-white/10 bg-graphite-light/30">
            <div className="flex items-center gap-2 border-b border-white/10 bg-white/[0.02] px-4 py-3">
              <Sparkles className="h-4 w-4 text-cyan" />
              <p className="text-sm uppercase tracking-[0.18em] text-white/70">
                Team Evidence Board
              </p>
            </div>

            <div className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-3">
              {/* Average finish comparison */}
              <div className="rounded-sm border border-white/10 bg-black/10 p-3">
                <p className="flex items-center gap-2 text-[8px] uppercase tracking-[0.18em] text-white/30">
                  <Zap className="h-3 w-3" />
                  Avg Finish Comparison
                </p>
                <p className="mt-2 text-sm font-bold text-white">
                  {teamMetrics.avgFinishComparison ?? 'VERIFICATION PENDING'}
                </p>
                <p className="mt-1 text-[9px] text-amber/70">
                  {teamMetrics.avgFinishComparison ? 'Derived from indexed races' : 'Insufficient indexed data'}
                </p>
              </div>

              {/* Reliability */}
              <div className="rounded-sm border border-white/10 bg-black/10 p-3">
                <p className="flex items-center gap-2 text-[8px] uppercase tracking-[0.18em] text-white/30">
                  <ShieldCheck className="h-3 w-3" />
                  Team Reliability
                </p>
                <p className="mt-2 text-sm font-bold text-white">
                  {teamMetrics.reliabilityRate !== null
                    ? `${teamMetrics.reliabilityRate}% COMPLETION`
                    : 'VERIFICATION PENDING'}
                </p>
                <p className="mt-1 text-[9px] text-amber/70">
                  {teamMetrics.reliabilityRate !== null ? 'Combined driver finish rate' : 'Insufficient indexed data'}
                </p>
              </div>

              {/* Teammate advantage */}
              <div className="rounded-sm border border-white/10 bg-black/10 p-3">
                <p className="flex items-center gap-2 text-[8px] uppercase tracking-[0.18em] text-white/30">
                  <TrendingUp className="h-3 w-3" />
                  Teammate Advantage
                </p>
                <p className="mt-2 text-sm font-bold text-white">
                  {teamMetrics.teammateAdvantage
                    ? `${teamMetrics.teammateAdvantage.driver} +${teamMetrics.teammateAdvantage.gap} POS`
                    : 'VERIFICATION PENDING'}
                </p>
                <p className="mt-1 text-[9px] text-amber/70">
                  {teamMetrics.teammateAdvantage ? 'Avg position gap' : 'Insufficient indexed data'}
                </p>
              </div>

              {/* Latest race impact */}
              <div className="rounded-sm border border-white/10 bg-black/10 p-3">
                <p className="flex items-center gap-2 text-[8px] uppercase tracking-[0.18em] text-white/30">
                  <Flag className="h-3 w-3" />
                  Latest Verified Impact
                </p>
                <p className="mt-2 text-sm font-bold text-white">
                  {teamMetrics.latestVerifiedImpact
                    ? `${teamMetrics.latestVerifiedImpact.pointsScored} PTS`
                    : 'NO VERIFIED RACES'}
                </p>
                <p className="mt-1 text-[9px] text-white/40">
                  {teamMetrics.latestVerifiedImpact?.meetingName ?? 'Awaiting race data'}
                </p>
              </div>

              {/* Archive coverage */}
              <div className="rounded-sm border border-amber/20 bg-amber/[0.03] p-3">
                <p className="flex items-center gap-2 text-[8px] uppercase tracking-[0.18em] text-amber/60">
                  <AlertTriangle className="h-3 w-3" />
                  Archive Coverage
                </p>
                <p className="mt-2 text-sm font-bold text-white">
                  {archiveCoverage.total > 0
                    ? `${archiveCoverage.coveragePercent}%`
                    : '0%'}
                </p>
                <p className="mt-1 text-[9px] text-amber/70">
                  {archiveCoverage.total > 0
                    ? archiveCoverage.missing > 0
                      ? `${archiveCoverage.missing} rounds pending indexing`
                      : 'All completed rounds indexed'
                    : 'Awaiting completed-race ingestion'}
                </p>
              </div>

              {/* Performance index */}
              <div className="rounded-sm border border-white/10 bg-black/10 p-3">
                <p className="flex items-center gap-2 text-[8px] uppercase tracking-[0.18em] text-white/30">
                  <Gauge className="h-3 w-3" />
                  Performance Index
                </p>
                <p className="mt-2 text-sm font-bold text-white">
                  {selectedTeam?.performanceIndex ?? '—'}
                </p>
                <p className="mt-1 text-[9px] text-white/40">
                  {selectedTeam?.performanceIndex !== null ? 'Points-based index' : 'Requires completed rounds'}
                </p>
              </div>
            </div>
          </section>

          {/* Team Signal Watch */}
          <section className="border border-white/10 bg-graphite-light/30">
            <div className="flex items-center gap-2 border-b border-white/10 bg-white/[0.02] px-4 py-3">
              <Gauge className="h-4 w-4 text-crimson" />
              <p className="text-sm uppercase tracking-[0.18em] text-white/70">
                Team Signal Watch
              </p>
            </div>

            <div className="grid gap-3 p-4 md:grid-cols-3">
              {/* Constructor battle */}
              <div className="rounded-sm border border-white/10 bg-black/10 p-3">
                <p className="text-[8px] uppercase tracking-[0.18em] text-white/30">
                  Constructor Battle
                </p>
                <div className="mt-2">
                  {constructorBattle?.ahead && (
                    <p className="text-[11px] text-white/60">
                      <span className="font-semibold text-white">
                        {formatPointsGap(selectedTeam?.points && constructorBattle.ahead.points
                          ? constructorBattle.ahead.points - selectedTeam.points
                          : null)}
                      </span>
                      {' '}behind P{constructorBattle.ahead.position}
                    </p>
                  )}
                  {constructorBattle?.behind && (
                    <p className="mt-1 text-[11px] text-white/60">
                      <span className="font-semibold text-cyan">
                        {formatPointsGap(selectedTeam?.points && constructorBattle.behind.points
                          ? selectedTeam.points - constructorBattle.behind.points
                          : null)}
                      </span>
                      {' '}ahead of P{constructorBattle.behind.position}
                    </p>
                  )}
                </div>
                <p className="mt-2 text-[9px] text-green-400/70">
                  VERIFIED FROM STANDINGS
                </p>
              </div>

              {/* Driver contribution imbalance */}
              <div className="rounded-sm border border-white/10 bg-black/10 p-3">
                <p className="text-[8px] uppercase tracking-[0.18em] text-white/30">
                  Driver Contribution
                </p>
                <div className="mt-2">
                  {contributionImbalance?.type === 'balanced' ? (
                    <p className="text-[11px] text-white">
                      {contributionImbalance.message}
                    </p>
                  ) : contributionImbalance?.type === 'imbalanced' ? (
                    <p className="text-[11px] text-amber">
                      {contributionImbalance.message}
                    </p>
                  ) : (
                    <p className="text-[11px] text-white/40">
                      VERIFICATION PENDING
                    </p>
                  )}
                </div>
                <p className="mt-2 text-[9px] text-green-400/70">
                  {contributionImbalance ? 'VERIFIED FROM POINTS' : 'AWAITING DRIVER DATA'}
                </p>
              </div>

              {/* Archive gap */}
              <div className="rounded-sm border border-amber/20 bg-amber/[0.03] p-3">
                <p className="text-[8px] uppercase tracking-[0.18em] text-white/30">
                  Archive Gap
                </p>
                <div className="mt-2">
                  {archiveCoverage.total === 0 ? (
                    <p className="text-[11px] text-white/40">
                      NO COMPLETED RACES
                    </p>
                  ) : archiveCoverage.missing > 0 ? (
                    <p className="text-[11px] font-semibold text-amber">
                      {archiveCoverage.missing} ROUNDS UNVERIFIED
                    </p>
                  ) : (
                    <p className="text-[11px] text-green-400">
                      ALL COMPLETED RACES INDEXED
                    </p>
                  )}
                </div>
                <p className="mt-2 text-[9px] text-amber/70">
                  {archiveCoverage.total === 0
                    ? 'AWAITING COMPLETED-RACE INGESTION'
                    : archiveCoverage.missing > 0
                      ? 'LOAD ANALYTICS ARCHIVE TO COMPLETE'
                      : 'ARCHIVE COMPLETE'}
                </p>
              </div>
            </div>
          </section>

          {/* Latest verified race details */}
          {teamMetrics.latestVerifiedImpact && (
            <section className="border border-white/10 bg-graphite-light/30 p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-[10px] uppercase tracking-[0.18em] text-white/40">
                  Latest Verified Race Detail
                </p>
                <button
                  type="button"
                  onClick={() => {
  if (onOpenRace && latestVerifiedMeetingKey !== null) {
    onOpenRace(latestVerifiedMeetingKey);
  }
}}
disabled={!onOpenRace || latestVerifiedMeetingKey === null}
                  className="flex items-center gap-1 text-[9px] font-semibold tracking-[0.12em] text-cyan transition-colors hover:text-white disabled:text-white/20"
                >
                  OPEN IN CIRCUIT MATRIX
                  <ArrowRight className="h-3 w-3" />
                </button>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
                <div>
                  <p className="text-[8px] uppercase tracking-[0.14em] text-white/30">
                    Grand Prix
                  </p>
                  <p className="mt-1 text-sm font-bold text-white">
                    {teamMetrics.latestVerifiedImpact.meetingName}
                  </p>
                </div>
                <div>
                  <p className="text-[8px] uppercase tracking-[0.14em] text-white/30">
                    Team Points
                  </p>
                  <p className="mt-1 text-sm font-bold text-cyan">
                    {teamMetrics.latestVerifiedImpact.pointsScored} PTS
                  </p>
                </div>
                {teamMetrics.latestVerifiedImpact.positions.map((p) => (
                  <div key={p.driver}>
                    <p className="text-[8px] uppercase tracking-[0.14em] text-white/30">
                      {p.driver} Finish
                    </p>
                    <p className="mt-1 text-sm font-bold text-white">
                      {p.position !== null ? `P${p.position}` : 'DNF/TS'}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
