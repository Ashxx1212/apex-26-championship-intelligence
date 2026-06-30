import {
  Activity,
  AlertTriangle,
  CalendarDays,
  Circle,
  Crosshair,
  Flag,
  Loader2,
  ShieldCheck,
  Trophy,
} from 'lucide-react';
import type { ChampionshipDataSnapshot } from '../types/f1';
import type { DataSourceState } from '../types/app';

interface ChampionshipHeroProps {
  isLoading: boolean;
  error: { type: string; message: string } | null;
  data: ChampionshipDataSnapshot | null;
  loadingMessage?: string;
  sourceState: DataSourceState;
}

function formatGap(gap: number | null | undefined): string {
  if (gap === null || gap === undefined) return '—';
  return `+${gap}`;
}

export function ChampionshipHero({
  isLoading,
  error,
  data,
  loadingMessage,
  sourceState,
}: ChampionshipHeroProps) {
  const leader = data?.driverStandings?.[0];
  const second = data?.driverStandings?.[1];
  const constructorLeader = data?.teamStandings?.[0];

  const latestMeeting = data?.latestCompletedMeeting;
const completedRounds = data?.completedRounds ?? 0;
const totalRounds = data?.totalGrandPrix ?? 0;

const indexedRaceRounds =
  data?.analyticsCoverage?.indexedRaceResults ?? 0;

const completedRaceRounds =
  data?.analyticsCoverage?.totalCompletedRaceSessions ?? completedRounds;

const pendingRaceRounds = Math.max(
  0,
  completedRaceRounds - indexedRaceRounds,
);

const archiveCoveragePercent =
  completedRaceRounds > 0
    ? Math.round((indexedRaceRounds / completedRaceRounds) * 100)
    : 0;

const archiveIsComplete =
  completedRaceRounds > 0 &&
  indexedRaceRounds >= completedRaceRounds;

  const seasonProgress =
    totalRounds > 0
      ? Math.min(100, Math.round((completedRounds / totalRounds) * 100))
      : 0;

  const leaderAcronym = leader?.driverAcronym || '—';
  const leaderPoints = leader?.points ?? 0;
  const leaderName = leader?.driverName || 'Awaiting verified standings';
  const leaderTeam = leader?.teamName || '—';
  const teamColour = leader?.teamColour
    ? `#${leader.teamColour}`
    : '#dc143c';

  const verifiedThrough =
    latestMeeting?.meeting_name?.toUpperCase() || 'CURRENT VERIFIED SNAPSHOT';

  const dataState =
  sourceState === 'cached'
    ? {
        label: 'CACHED VERIFIED SNAPSHOT',
        detail: 'LOCAL VERIFIED DATA LAYER ACTIVE',
        accent: 'text-green-400',
        dot: 'bg-green-400',
      }
    : archiveIsComplete
      ? {
          label: 'VERIFIED DATA LAYER',
          detail: 'COMPLETE RACE ARCHIVE INDEXED',
          accent: 'text-cyan',
          dot: 'bg-cyan',
        }
      : {
          label: 'VERIFIED DATA LAYER',
          detail: `${indexedRaceRounds}/${completedRaceRounds} RACE RECORDS INDEXED`,
          accent: 'text-cyan',
          dot: 'bg-cyan',
        };

  if (isLoading && !data) {
    return (
      <section className="relative flex min-h-[520px] flex-col items-center justify-center overflow-hidden border border-cyan/20 bg-[#0a0d12]/80 px-6 text-center">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,rgba(0,255,255,0.10),transparent_38%)]" />

        <div className="relative">
          <div className="absolute -inset-10 rounded-full bg-cyan/[0.08] blur-2xl" />
          <Loader2 className="relative mx-auto h-10 w-10 animate-spin text-cyan" />
        </div>

        <p className="relative mt-6 text-xs font-bold tracking-[0.22em] text-cyan uppercase">
          Championship Command Map Initialising
        </p>

        <p className="relative mt-3 text-[10px] tracking-[0.12em] text-white/40">
          {loadingMessage || 'SYNCING VERIFIED CHAMPIONSHIP ARCHIVE...'}
        </p>
      </section>
    );
  }

  if (error && !data) {
    return (
      <section className="relative flex min-h-[520px] flex-col items-center justify-center overflow-hidden border border-red-400/20 bg-red-400/[0.03] px-6 text-center">
        <AlertTriangle className="h-10 w-10 text-red-400" />

        <p className="mt-6 text-sm font-black tracking-[0.20em] text-red-400 uppercase">
          Championship Data Core Offline
        </p>

        <p className="mt-3 max-w-xl text-xs leading-relaxed text-white/50">
          Unable to retrieve a verified championship snapshot.
        </p>

        <p className="mt-2 max-w-xl text-[10px] leading-relaxed tracking-wide text-red-400/70">
          {error.message}
        </p>
      </section>
    );
  }

  if (!data || data.driverStandings.length === 0) {
    return (
      <section className="relative flex min-h-[520px] flex-col items-center justify-center overflow-hidden border border-white/[0.10] bg-[#0a0c10]/85 px-6 text-center">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,rgba(255,255,255,0.035),transparent_38%)]" />

        <Circle className="relative h-11 w-11 text-white/20" />

        <p className="relative mt-5 text-sm font-black tracking-[0.18em] text-white uppercase">
          Championship Standings Pending
        </p>

        <p className="relative mt-3 max-w-lg text-xs leading-relaxed text-white/45">
          No verified driver standings are currently indexed. The Season Command
          Map will activate after completed race sessions are available.
        </p>
      </section>
    );
  }

  return (
    <section className="relative overflow-hidden border border-white/[0.10] bg-[#090c10]/90 shadow-[0_24px_70px_rgba(0,0,0,0.28)]">
      {/* Atmosphere */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_18%,rgba(220,20,60,0.11),transparent_31%),radial-gradient(circle_at_82%_72%,rgba(0,255,255,0.09),transparent_30%)]" />

        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.20) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.20) 1px, transparent 1px)',
            backgroundSize: '44px 44px',
          }}
        />

        <div className="absolute left-0 top-0 h-px w-full bg-gradient-to-r from-crimson/70 via-white/15 to-transparent" />

        <div className="absolute bottom-0 left-0 h-px w-full bg-gradient-to-r from-transparent via-cyan/45 to-transparent" />

        <svg
          className="absolute -bottom-24 right-[7%] h-[430px] w-[740px] text-cyan/[0.13]"
          viewBox="0 0 740 430"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M93 278C60 225 105 161 168 171C217 179 210 228 265 228C323 228 334 132 419 126C493 121 506 194 563 188C621 182 635 117 679 144C724 172 697 268 634 282C563 297 546 246 483 252C407 259 400 337 317 335C237 334 220 261 168 287C137 302 108 301 93 278Z"
            stroke="currentColor"
            strokeWidth="2"
          />
          <path
            d="M119 246C151 222 187 205 222 219C267 237 285 282 344 275C410 267 415 204 470 183C524 163 560 209 624 205"
            stroke="currentColor"
            strokeWidth="1"
            strokeDasharray="8 12"
          />
          <circle cx="93" cy="278" r="6" fill="currentColor" />
          <circle cx="419" cy="126" r="6" fill="currentColor" />
          <circle cx="634" cy="282" r="7" fill="currentColor" />
        </svg>

        <div className="absolute right-7 top-7 text-[9px] tracking-[0.18em] text-cyan/40">
          SEASON INTELLIGENCE TRACE
        </div>
      </div>

      <div className="relative grid min-h-[530px] grid-cols-1 xl:grid-cols-[1.35fr_0.65fr]">
        {/* Main championship stage */}
        <div className="relative flex flex-col justify-between overflow-hidden p-5 md:p-7 lg:p-8">
          <div className="pointer-events-none absolute bottom-0 right-6 select-none text-[150px] font-black leading-none tracking-[-0.14em] text-white/[0.025] md:text-[220px]">
            {leaderAcronym}
          </div>

          <div className="relative">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="relative flex h-5 w-5 items-center justify-center">
                  <span className="absolute h-2 w-2 rounded-full bg-crimson shadow-[0_0_12px_rgba(220,20,60,0.85)]" />
                  <span className="absolute h-5 w-5 rounded-full border border-crimson/40 animate-ping" />
                </span>

                <span className="text-[10px] font-bold tracking-[0.24em] text-white/75 uppercase">
                  Championship Command Map
                </span>
              </div>

              <span className="border border-green-400/25 bg-green-400/[0.05] px-2.5 py-1 text-[9px] font-semibold tracking-[0.15em] text-green-400 uppercase">
                Verified Archive
              </span>
            </div>

            <div className="mt-8 max-w-4xl">
              <p className="text-[10px] font-medium tracking-[0.20em] text-cyan/75 uppercase">
                2026 Formula Championship // Season State
              </p>

              <h1 className="mt-3 text-3xl font-black leading-[0.96] tracking-[0.07em] text-white md:text-5xl xl:text-6xl">
                DRIVERS&apos; CHAMPIONSHIP
              </h1>

              <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-3 text-[11px] text-white/55">
                <span className="flex items-center gap-2">
                  <Flag className="h-3.5 w-3.5 text-cyan" />
                  {indexedRaceRounds} OF {completedRaceRounds} RACE RESULTS INDEXED
                </span>

                <span className="flex items-center gap-2">
                  <CalendarDays className="h-3.5 w-3.5 text-cyan" />
                  VERIFIED THROUGH {verifiedThrough}
                </span>
              </div>
            </div>

            <div className="mt-8 flex max-w-3xl flex-col gap-5 border-l-2 border-crimson/55 pl-4 sm:flex-row sm:items-center">
              <div
                className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full border-2 bg-black/25 text-2xl font-black tracking-[0.08em] text-white shadow-[0_0_28px_rgba(220,20,60,0.10)]"
                style={{
                  borderColor: `${teamColour}90`,
                  boxShadow: `0 0 28px ${teamColour}22`,
                }}
              >
                {leaderAcronym}
              </div>

              <div>
                <p className="text-[9px] tracking-[0.17em] text-white/35 uppercase">
                  Current Championship Leader
                </p>

                <p className="mt-2 text-2xl font-black tracking-[0.04em] text-white">
                  {leaderName}
                </p>

                <p className="mt-1 text-[11px] text-white/45">
                  {leaderTeam} · {leaderPoints} points · P1
                </p>

                <p className="mt-3 text-[10px] leading-relaxed text-white/50">
                  Leaderboard position is supplied by the latest verified
championship standings. Race-level analysis is limited to
indexed result records.
                </p>
              </div>
            </div>
          </div>

          <div className="relative mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <div className="border border-white/[0.10] bg-black/[0.20] px-4 py-4">
              <p className="text-[9px] tracking-[0.15em] text-white/35 uppercase">
                Leader Points
              </p>

              <p className="mt-2 text-2xl font-black text-crimson">
                {leaderPoints}
              </p>

              <p className="mt-1 text-[9px] text-white/35">
                current verified total
              </p>
            </div>

            <div className="border border-white/[0.10] bg-black/[0.20] px-4 py-4">
              <p className="text-[9px] tracking-[0.15em] text-white/35 uppercase">
                P2 Gap
              </p>

              <p className="mt-2 text-2xl font-black text-amber">
                {formatGap(second?.gapToLeader)}
              </p>

              <p className="mt-1 truncate text-[9px] text-white/35">
                {second ? `${second.driverAcronym} in P2` : 'awaiting P2'}
              </p>
            </div>

            <div className="border border-white/[0.10] bg-black/[0.20] px-4 py-4">
              <p className="text-[9px] tracking-[0.15em] text-white/35 uppercase">
                Season Stage
              </p>

              <p className="mt-2 text-2xl font-black text-cyan">
                {seasonProgress}%
              </p>

              <p className="mt-1 text-[9px] text-white/35">
                completed calendar share
              </p>
            </div>

            <div className="border border-white/[0.10] bg-black/[0.20] px-4 py-4">
              <p className="text-[9px] tracking-[0.15em] text-white/35 uppercase">
                Constructors
              </p>

              <p className="mt-2 truncate text-lg font-black text-white">
                {constructorLeader?.teamName || '—'}
              </p>

              <p className="mt-1 text-[9px] text-white/35">
                {constructorLeader
                  ? `${constructorLeader.points} pts · P1`
                  : 'awaiting team standings'}
              </p>
            </div>
          </div>
        </div>

        {/* Title race operations rail */}
        <aside className="relative border-t border-white/[0.10] bg-black/[0.20] xl:border-l xl:border-t-0">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-crimson/45 to-transparent xl:inset-y-0 xl:left-0 xl:h-full xl:w-px xl:bg-gradient-to-b" />

          <div className="flex h-full flex-col">
            <div className="border-b border-white/[0.10] px-5 py-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Crosshair className="h-4 w-4 text-crimson" />
                  <p className="text-[10px] font-bold tracking-[0.18em] text-white uppercase">
                    Title Race State
                  </p>
                </div>

                <Trophy className="h-4 w-4 text-amber" />
              </div>

              <div className="mt-6 flex items-center gap-4">
                <div className="relative flex h-20 w-20 shrink-0 items-center justify-center rounded-full border border-cyan/30 bg-cyan/[0.03]">
                  <div className="absolute inset-2 rounded-full border border-dashed border-cyan/30 animate-[spin_24s_linear_infinite]" />

                  <div className="relative text-center">
                    <p className="text-xl font-black text-cyan">
                      {seasonProgress}%
                    </p>
                    <p className="text-[8px] tracking-[0.14em] text-white/35">
  CALENDAR STAGE
</p>
                  </div>
                </div>

                <div>
                  <p className="text-[9px] tracking-[0.15em] text-white/35 uppercase">
                    Title Gap
                  </p>

                  <p className="mt-2 text-3xl font-black text-amber">
                    {formatGap(second?.gapToLeader)}
                  </p>

                  <p className="mt-1 text-[10px] text-white/45">
                    {second
                      ? `${leaderAcronym} leads ${second.driverAcronym}`
                      : 'Awaiting verified P2'}
                  </p>
                </div>
              </div>
            </div>

            <div className="border-b border-white/[0.10] px-5 py-5">
              <div className="flex items-center gap-2">
                <Activity className="h-3.5 w-3.5 text-cyan" />
                <p className="text-[9px] tracking-[0.15em] text-white/35 uppercase">
                  Leaderboard Integrity
                </p>
              </div>

              <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
                  <span className="text-[10px] text-white/45">
                    Current leader
                  </span>

                  <span className="text-[10px] font-bold text-crimson">
                    {leaderAcronym}
                  </span>
                </div>

                <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
                  <span className="text-[10px] text-white/45">
                    Closest challenger
                  </span>

                  <span className="text-[10px] font-bold text-amber">
                    {second?.driverAcronym || '—'}
                  </span>
                </div>

                <div className="flex items-center justify-between">
  <span className="text-[10px] text-white/45">
    Indexed race records
  </span>

  <span className="text-[10px] font-bold text-cyan">
    {indexedRaceRounds} / {completedRaceRounds}
  </span>
</div>
{pendingRaceRounds > 0 && (
  <p className="text-[8px] tracking-[0.12em] text-amber/70">
    {pendingRaceRounds} SOURCE RECORDS PENDING
  </p>
)}
              </div>
            </div>

            <div className="flex-1 px-5 py-5">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-3.5 w-3.5 text-green-400" />
                <p className="text-[9px] tracking-[0.15em] text-white/35 uppercase">
                  Model Guardrail
                </p>
              </div>

              <p className="mt-4 text-[10px] leading-relaxed text-white/45">
                This screen presents current championship state, standings, and
                historical race data. It does not present a fabricated title-win
                probability.
              </p>

              <div className="mt-6 border border-amber/20 bg-amber/[0.04] px-4 py-3">
                <p className="text-[9px] font-semibold tracking-[0.14em] text-amber uppercase">
                  Forecast Engine
                </p>

                <p className="mt-2 text-[10px] leading-relaxed text-white/45">
  SCENARIO OUTLOOK ACTIVE — event-level projections use the current
  verified archive. Title-win probabilities remain withheld while
  verified race coverage continues to expand.
</p>
              </div>
            </div>

            <div className="border-t border-white/[0.10] px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="relative h-2.5 w-2.5">
                  <div
                    className={`absolute inset-0 rounded-full ${dataState.dot} shadow-[0_0_10px_rgba(0,255,255,0.75)]`}
                  />
                  <div
                    className={`absolute inset-0 rounded-full ${dataState.dot}/40 animate-ping`}
                  />
                </div>

                <div>
                  <p className={`text-[10px] font-bold tracking-[0.13em] ${dataState.accent}`}>
                    {dataState.label}
                  </p>

                  <p className="mt-1 text-[8px] tracking-[0.13em] text-white/30">
                    {dataState.detail}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}