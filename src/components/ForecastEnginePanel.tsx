import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Database,
  Flag,
  Gauge,
  ShieldCheck,
  Trophy,
  Users,
} from 'lucide-react';
import type { ChampionshipDataSnapshot } from '../types/f1';

interface ForecastEnginePanelProps {
  data: ChampionshipDataSnapshot | null;
  isLoading: boolean;
  onDriverSelect?: (driverNumber: number) => void;
  onTeamSelect?: (teamName: string) => void;
}

type FormMarker = 'W' | 'P' | 'D' | 'R';

function formatGap(gap: number | null | undefined): string {
  if (gap === null || gap === undefined || gap === 0) {
    return 'LEADER';
  }

  return `+${gap} PTS`;
}

function getFormClasses(form: FormMarker): string {
  if (form === 'W') {
    return 'border-crimson/30 bg-crimson/15 text-crimson';
  }

  if (form === 'P') {
    return 'border-amber/35 bg-amber/15 text-amber';
  }

  if (form === 'D') {
    return 'border-cyan/30 bg-cyan/15 text-cyan';
  }

  return 'border-white/10 bg-white/[0.06] text-white/55';
}

function getDriverStatus(
  index: number,
  gapToLeader: number | null | undefined
): string {
  if (index === 0) {
    return 'CHAMPIONSHIP LEADER';
  }

  if (index === 1) {
    return gapToLeader === null || gapToLeader === 0
      ? 'CLOSEST CHALLENGER'
      : `${gapToLeader} POINT GAP`;
  }

  return 'TOP FIVE PRESSURE';
}

function getArchiveStatus(
  indexed: number,
  completed: number,
  hasPendingWork: boolean
): {
  label: string;
  detail: string;
  tone: string;
} {
  if (completed === 0) {
    return {
      label: 'AWAITING RESULTS',
      detail: 'Completed race records have not been indexed yet.',
      tone: 'text-white/40',
    };
  }

  if (hasPendingWork) {
    return {
      label: 'PARTIAL ARCHIVE',
      detail: `${Math.max(0, completed - indexed)} completed record${
        completed - indexed === 1 ? '' : 's'
      } still await indexing.`,
      tone: 'text-amber',
    };
  }

  return {
    label: 'ARCHIVE VERIFIED',
    detail: 'All completed race records are available for analysis.',
    tone: 'text-green-400',
  };
}

export function ForecastEnginePanel({
  data,
  isLoading,
  onDriverSelect,
  onTeamSelect,
}: ForecastEnginePanelProps) {
  const driverStandings = data?.driverStandings ?? [];
  const teamStandings = data?.teamStandings ?? [];

  const leader = driverStandings[0] ?? null;
  const challenger = driverStandings[1] ?? null;
  const topDrivers = driverStandings.slice(0, 5);

  const constructorLeader = teamStandings[0] ?? null;
  const constructorChallenger = teamStandings[1] ?? null;

  const completedRounds = data?.completedRounds ?? 0;
  const totalRounds = data?.totalGrandPrix ?? 0;
  const remainingRounds = Math.max(0, totalRounds - completedRounds);

  const indexedRaceResults =
    data?.analyticsCoverage.indexedRaceResults ?? 0;

  const totalCompletedRaceSessions =
    data?.analyticsCoverage.totalCompletedRaceSessions ?? completedRounds;

  const hasPendingArchiveWork =
    data?.analyticsArchive.hasPendingWork ?? false;

  const seasonProgress =
    totalRounds > 0
      ? Math.round((completedRounds / totalRounds) * 100)
      : 0;

  const archiveStatus = getArchiveStatus(
    indexedRaceResults,
    totalCompletedRaceSessions,
    hasPendingArchiveWork
  );

  if (isLoading && !data) {
    return (
      <section className="overflow-hidden rounded-sm border border-white/10 bg-graphite-light/50">
        <div className="flex min-h-[320px] flex-col items-center justify-center px-6 text-center">
          <Activity className="h-7 w-7 animate-pulse text-cyan" />

          <p className="mt-4 text-[10px] font-semibold tracking-[0.18em] text-cyan">
            BUILDING MOMENTUM BOARD
          </p>

          <p className="mt-2 text-xs text-white/40">
            Reading verified standings and race archive coverage...
          </p>
        </div>
      </section>
    );
  }

  if (!data || !leader) {
    return (
      <section className="overflow-hidden rounded-sm border border-white/10 bg-graphite-light/50">
        <div className="flex min-h-[320px] flex-col items-center justify-center px-6 text-center">
          <AlertTriangle className="h-7 w-7 text-amber" />

          <p className="mt-4 text-[10px] font-semibold tracking-[0.18em] text-amber">
            MOMENTUM BOARD PENDING
          </p>

          <p className="mt-2 max-w-md text-xs leading-relaxed text-white/40">
            Verified championship standings are required before season momentum
            signals can be assembled.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="relative overflow-hidden rounded-sm border border-white/10 bg-[#0b0d12]/80 shadow-[0_18px_45px_rgba(0,0,0,0.16)]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_8%_0%,rgba(220,20,60,0.07),transparent_28%),radial-gradient(circle_at_92%_100%,rgba(0,212,255,0.07),transparent_30%)]" />

      <div className="relative flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-5 py-4">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-cyan" />

          <div>
            <h2 className="text-[11px] font-bold tracking-[0.18em] text-white uppercase">
              Championship Momentum Board
            </h2>

            <p className="mt-0.5 text-[8px] tracking-[0.14em] text-white/30 uppercase">
              Verified standings, recent form, constructor pressure, and archive state
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 border border-cyan/20 bg-cyan/[0.04] px-3 py-1.5">
          <ShieldCheck className="h-3 w-3 text-cyan" />

          <span className="text-[8px] font-semibold tracking-[0.14em] text-cyan">
            VERIFIED SNAPSHOT ONLY
          </span>
        </div>
      </div>

      <div className="relative grid grid-cols-1 gap-px bg-white/[0.08] xl:grid-cols-[1.25fr_0.75fr]">
        <div className="bg-[#0d1015] p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Trophy className="h-4 w-4 text-crimson" />

              <p className="text-[10px] font-semibold tracking-[0.16em] text-white/65 uppercase">
                Driver Momentum Grid
              </p>
            </div>

            <span className="text-[8px] tracking-[0.13em] text-white/30">
              TOP {topDrivers.length} BY CURRENT POINTS
            </span>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
            {topDrivers.map((driver, index) => {
              const teamColour = driver.teamColour
                ? `#${driver.teamColour}`
                : '#00d4ff';

              return (
                <button
                  key={driver.driverNumber}
                  type="button"
                  onClick={() => onDriverSelect?.(driver.driverNumber)}
                  disabled={!onDriverSelect}
                  title={`Open ${driver.driverName} in Driver Intel`}
                  className={`group relative overflow-hidden border p-4 text-left transition-all duration-200 disabled:cursor-default ${
                    index === 0
                      ? 'border-crimson/35 bg-crimson/[0.035] hover:bg-crimson/[0.07]'
                      : 'border-white/10 bg-black/[0.16] hover:border-cyan/35 hover:bg-cyan/[0.035]'
                  }`}
                >
                  <div
                    className="absolute inset-y-0 left-0 w-[2px]"
                    style={{
                      backgroundColor: teamColour,
                      boxShadow: `0 0 12px ${teamColour}70`,
                    }}
                  />

                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[9px] tracking-[0.15em] text-white/35 uppercase">
                        P{driver.position}
                      </p>

                      <p className="mt-2 text-xl font-black tracking-[0.08em] text-white">
                        {driver.driverAcronym}
                      </p>
                    </div>

                    <span
                      className={`text-[8px] font-semibold tracking-[0.12em] ${
                        index === 0 ? 'text-crimson' : 'text-cyan'
                      }`}
                    >
                      {index === 0 ? 'LEADER' : formatGap(driver.gapToLeader)}
                    </span>
                  </div>

                  <p className="mt-3 truncate text-xs font-semibold text-white/80">
                    {driver.driverName}
                  </p>

                  <p className="mt-1 truncate text-[10px] text-white/40">
                    {driver.teamName}
                  </p>

                  <div className="mt-4 flex items-end justify-between border-t border-white/10 pt-3">
                    <div>
                      <p className="text-[8px] tracking-[0.14em] text-white/30 uppercase">
                        Points
                      </p>

                      <p className="mt-1 text-lg font-black text-white">
                        {driver.points}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="text-[8px] tracking-[0.14em] text-white/30 uppercase">
                        Recent Form
                      </p>

                      <div className="mt-1 flex justify-end gap-1">
                        {driver.recentForm.length > 0 ? (
                          driver.recentForm.slice(-4).map((form, formIndex) => (
                            <span
                              key={`${driver.driverNumber}-${formIndex}-${form}`}
                              className={`flex h-5 w-5 items-center justify-center border text-[8px] font-bold ${getFormClasses(
                                form as FormMarker
                              )}`}
                            >
                              {form}
                            </span>
                          ))
                        ) : (
                          <span className="text-[9px] text-white/30">—</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between gap-2">
                    <p className="text-[8px] tracking-[0.12em] text-white/30">
                      {getDriverStatus(index, driver.gapToLeader)}
                    </p>

                    <span className="inline-flex items-center gap-1 text-[8px] font-semibold tracking-[0.12em] text-cyan/0 transition-colors group-hover:text-cyan/80">
                      DRIVER INTEL
                      <ArrowRight className="h-3 w-3" />
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="bg-[#0d1015] p-5">
          <div className="flex items-center gap-2">
            <Gauge className="h-4 w-4 text-amber" />

            <p className="text-[10px] font-semibold tracking-[0.16em] text-white/65 uppercase">
              Season Pressure Read
            </p>
          </div>

          <div className="mt-5 grid gap-3">
            <div className="border border-white/10 bg-black/[0.16] p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-[8px] tracking-[0.14em] text-white/35 uppercase">
                  Leader / Closest Chase
                </p>

                <Flag className="h-3.5 w-3.5 text-crimson" />
              </div>

              <p className="mt-3 text-2xl font-black text-white">
                {leader.driverAcronym}
                <span className="mx-2 text-white/25">/</span>
                {challenger?.driverAcronym || '—'}
              </p>

              <p className="mt-2 text-[10px] leading-relaxed text-white/50">
                {challenger
                  ? `${leader.driverAcronym} leads ${challenger.driverAcronym} by ${
                      challenger.gapToLeader ?? 0
                    } points in the verified standings.`
                  : 'A closest challenger will appear once P2 standings are available.'}
              </p>

              {challenger && (
                <button
                  type="button"
                  onClick={() => onDriverSelect?.(challenger.driverNumber)}
                  disabled={!onDriverSelect}
                  className="mt-4 inline-flex items-center gap-1 text-[8px] font-semibold tracking-[0.13em] text-cyan transition-colors hover:text-white disabled:cursor-default disabled:opacity-40"
                >
                  OPEN CHALLENGER INTEL
                  <ArrowRight className="h-3 w-3" />
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="border border-white/10 bg-black/[0.16] p-4">
                <p className="text-[8px] tracking-[0.14em] text-white/35 uppercase">
                  Season Indexed
                </p>

                <p className="mt-2 text-2xl font-black text-cyan">
                  {seasonProgress}%
                </p>

                <p className="mt-1 text-[9px] text-white/35">
                  {completedRounds} of {totalRounds} rounds
                </p>
              </div>

              <div className="border border-white/10 bg-black/[0.16] p-4">
                <p className="text-[8px] tracking-[0.14em] text-white/35 uppercase">
                  Rounds Remaining
                </p>

                <p className="mt-2 text-2xl font-black text-amber">
                  {remainingRounds}
                </p>

                <p className="mt-1 text-[9px] text-white/35">
                  calendar opportunities
                </p>
              </div>
            </div>

            <div className="border border-white/10 bg-black/[0.16] p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Users className="h-3.5 w-3.5 text-cyan" />

                  <p className="text-[8px] tracking-[0.14em] text-white/35 uppercase">
                    Constructor Battle
                  </p>
                </div>

                <span className="text-[8px] tracking-[0.12em] text-cyan">
                  VERIFIED TABLE
                </span>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() =>
                    constructorLeader &&
                    onTeamSelect?.(constructorLeader.teamName)
                  }
                  disabled={!constructorLeader || !onTeamSelect}
                  title={
                    constructorLeader
                      ? `Open ${constructorLeader.teamName} Team Performance`
                      : 'Constructor leader unavailable'
                  }
                  className="group min-w-0 border border-white/10 bg-white/[0.02] p-3 text-left transition-colors hover:border-cyan/35 hover:bg-cyan/[0.03] disabled:cursor-default"
                >
                  <p className="text-[8px] tracking-[0.14em] text-white/30 uppercase">
                    P1 Constructor
                  </p>

                  <p className="mt-2 truncate text-sm font-black text-white">
                    {constructorLeader?.teamName || '—'}
                  </p>

                  <p className="mt-1 text-[10px] text-white/40">
                    {constructorLeader
                      ? `${constructorLeader.points} points`
                      : 'Awaiting standings'}
                  </p>

                  <span className="mt-3 inline-flex items-center gap-1 text-[8px] font-semibold tracking-[0.12em] text-cyan/0 transition-colors group-hover:text-cyan/80">
                    TEAM PERFORMANCE
                    <ArrowRight className="h-3 w-3" />
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    constructorChallenger &&
                    onTeamSelect?.(constructorChallenger.teamName)
                  }
                  disabled={!constructorChallenger || !onTeamSelect}
                  title={
                    constructorChallenger
                      ? `Open ${constructorChallenger.teamName} Team Performance`
                      : 'Constructor challenger unavailable'
                  }
                  className="group min-w-0 border border-white/10 bg-white/[0.02] p-3 text-left transition-colors hover:border-amber/35 hover:bg-amber/[0.03] disabled:cursor-default"
                >
                  <p className="text-[8px] tracking-[0.14em] text-white/30 uppercase">
                    P2 Constructor
                  </p>

                  <p className="mt-2 truncate text-sm font-black text-white">
                    {constructorChallenger?.teamName || '—'}
                  </p>

                  <p className="mt-1 text-[10px] text-amber">
                    {constructorChallenger
                      ? formatGap(constructorChallenger.gapToLeader)
                      : '—'}
                  </p>

                  <span className="mt-3 inline-flex items-center gap-1 text-[8px] font-semibold tracking-[0.12em] text-amber/0 transition-colors group-hover:text-amber/80">
                    TEAM PERFORMANCE
                    <ArrowRight className="h-3 w-3" />
                  </span>
                </button>
              </div>
            </div>

            <div className="border border-white/10 bg-black/[0.16] p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Database className="h-3.5 w-3.5 text-amber" />

                  <p className="text-[8px] tracking-[0.14em] text-white/35 uppercase">
                    Evidence Coverage
                  </p>
                </div>

                <span className={`text-[8px] tracking-[0.12em] ${archiveStatus.tone}`}>
                  {archiveStatus.label}
                </span>
              </div>

              <p className="mt-3 text-2xl font-black text-white">
                {indexedRaceResults}/{totalCompletedRaceSessions || '—'}
              </p>

              <p className="mt-2 text-[10px] leading-relaxed text-white/50">
                {archiveStatus.detail}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="relative border-t border-white/10 bg-black/[0.18] px-5 py-4">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-3.5 w-3.5 text-green-400" />

            <p className="text-[9px] tracking-[0.13em] text-white/40">
              FORM MARKERS COME FROM INDEXED RACE HISTORY
            </p>
          </div>

          <p className="text-[9px] tracking-[0.13em] text-white/30">
            THIS BOARD DESCRIBES CURRENT VERIFIED STATE — IT DOES NOT PREDICT THE TITLE WINNER.
          </p>
        </div>
      </div>
    </section>
  );
}