import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  CircleDot,
  Clock3,
  Crosshair,
  Database,
  Flag,
  Gauge,
  Layers3,
  Loader2,
  MapPin,
  Radio,
  ShieldCheck,
  TimerReset,
  Trophy,
  WifiOff,
} from 'lucide-react';

import type {
  ChampionshipDataSnapshot,
  DriverStanding,
  RaceWeekendSnapshot,
} from '../types/f1';
import type { AppError, DataSourceState } from '../types/app';

interface CommandCentrePanelProps {
  data: ChampionshipDataSnapshot | null;
  isLoading: boolean;
  error: AppError | null;
  loadingMessage?: string;
  sourceState: DataSourceState;
  isFromCache: boolean;
  lastSyncTime: string | null;
  autoSyncLabel: string;
  cooldownSeconds: number;
}

type OperationTone = 'cyan' | 'amber' | 'crimson' | 'green';

interface OperationEntry {
  time: string;
  title: string;
  description: string;
  tone: OperationTone;
}

function formatEventDate(date: string | undefined): string {
  if (!date) return 'SCHEDULE PENDING';

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return 'SCHEDULE PENDING';
  }

  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(parsedDate);
}

function formatSyncTime(value: string | null): string {
  if (!value) return '—';

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) return '—';

  return parsed.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function getWeekendStatusLabel(
  meetingType: 'active' | 'upcoming' | 'interval'
): string {
  if (meetingType === 'active') return 'ACTIVE WEEKEND';
  if (meetingType === 'upcoming') return 'NEXT GRAND PRIX';
  return 'SEASON INTERVAL';
}

function getWeekendStatusClasses(
  meetingType: 'active' | 'upcoming' | 'interval'
): string {
  if (meetingType === 'active') {
    return 'border-amber/40 bg-amber/[0.10] text-amber';
  }

  if (meetingType === 'upcoming') {
    return 'border-cyan/35 bg-cyan/[0.08] text-cyan';
  }

  return 'border-white/10 bg-white/[0.04] text-white/45';
}

function getFormClasses(form: 'W' | 'P' | 'D' | 'R'): string {
  if (form === 'W') return 'bg-crimson text-white';
  if (form === 'P') return 'bg-amber text-black';
  if (form === 'D') return 'bg-cyan text-graphite';
  return 'bg-white/15 text-white/70';
}

function getRoundStatusClasses(status: RaceWeekendSnapshot['status']): string {
  if (status === 'completed') {
    return 'border-green-400/25 bg-green-400/[0.04]';
  }

  if (status === 'active') {
    return 'border-amber/40 bg-amber/[0.06]';
  }

  return 'border-white/10 bg-white/[0.02]';
}

function getRoundStatusLabel(status: RaceWeekendSnapshot['status']): string {
  if (status === 'completed') return 'COMPLETED';
  if (status === 'active') return 'ACTIVE WEEKEND';
  return 'UPCOMING';
}

function getRoundStatusTextClasses(
  status: RaceWeekendSnapshot['status']
): string {
  if (status === 'completed') return 'text-green-400';
  if (status === 'active') return 'text-amber';
  return 'text-white/40';
}

function getOperationToneClasses(tone: OperationTone): string {
  if (tone === 'amber') return 'bg-amber text-amber border-amber/25';
  if (tone === 'crimson') return 'bg-crimson text-crimson border-crimson/25';
  if (tone === 'green') return 'bg-green-400 text-green-400 border-green-400/25';

  return 'bg-cyan text-cyan border-cyan/25';
}

function getDataState(
  sourceState: DataSourceState,
  isFromCache: boolean,
  error: AppError | null
) {
  if (sourceState === 'rate_limited') {
    return {
      label: 'LINK PROTECTED',
      detail: 'RATE LIMIT COOLDOWN ACTIVE',
      accent: 'amber',
      dot: 'bg-amber',
    };
  }

  if (sourceState === 'offline' || (error && !isFromCache)) {
    return {
      label: 'SOURCE UNAVAILABLE',
      detail: 'NO NEW VERIFIED DATA AVAILABLE',
      accent: 'crimson',
      dot: 'bg-crimson',
    };
  }

  if (isFromCache) {
    return {
      label: 'CACHED VERIFIED SNAPSHOT',
      detail: 'LOCAL VERIFIED DATA LAYER ACTIVE',
      accent: 'green',
      dot: 'bg-green-400',
    };
  }

  return {
    label: 'VERIFIED DATA LAYER',
    detail: 'SOURCE LINK READY FOR REFRESH',
    accent: 'cyan',
    dot: 'bg-cyan',
  };
}

function PulseMetric({
  label,
  value,
  detail,
  accent = 'cyan',
}: {
  label: string;
  value: string;
  detail: string;
  accent?: 'cyan' | 'crimson' | 'amber';
}) {
  const accentClasses = {
    cyan: {
      value: 'text-cyan',
      line: 'bg-cyan',
      glow: 'shadow-[0_0_18px_rgba(0,255,255,0.16)]',
    },
    crimson: {
      value: 'text-crimson',
      line: 'bg-crimson',
      glow: 'shadow-[0_0_18px_rgba(220,20,60,0.15)]',
    },
    amber: {
      value: 'text-amber',
      line: 'bg-amber',
      glow: 'shadow-[0_0_18px_rgba(251,191,36,0.15)]',
    },
  };

  const activeAccent = accentClasses[accent];

  return (
    <div
      className={`relative overflow-hidden border border-white/[0.09] bg-black/[0.18] px-4 py-4 ${activeAccent.glow}`}
    >
      <div
        className={`absolute inset-y-0 left-0 w-[2px] ${activeAccent.line}`}
      />

      <p className="text-[9px] font-medium tracking-[0.18em] text-white/35 uppercase">
        {label}
      </p>

      <p className={`mt-2 text-xl font-black tracking-[0.04em] ${activeAccent.value}`}>
        {value}
      </p>

      <p className="mt-1 truncate text-[10px] text-white/45">{detail}</p>
    </div>
  );
}

function DriverSignal({ driver }: { driver: DriverStanding }) {
  return (
    <div className="group relative overflow-hidden border border-white/[0.09] bg-black/[0.20] px-3 py-3 transition-colors duration-200 hover:border-cyan/25">
      <div className="absolute inset-y-0 left-0 w-px bg-gradient-to-b from-transparent via-white/20 to-transparent" />

      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="w-6 text-sm font-black text-cyan">
            P{driver.position}
          </span>

          <div className="min-w-0">
            <p className="text-[9px] tracking-[0.12em] text-white/35">
              {driver.driverAcronym} · {driver.teamName}
            </p>

            <p className="mt-1 truncate text-xs font-semibold text-white">
              {driver.driverName}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <span className="mr-1 text-[9px] font-mono text-white/35">
            {driver.points}
          </span>

          {driver.recentForm.length > 0 ? (
            driver.recentForm.slice(-3).map((form, index) => (
              <span
                key={`${driver.driverNumber}-${index}-${form}`}
                className={`flex h-5 w-5 items-center justify-center rounded-sm text-[9px] font-bold ${getFormClasses(
                  form
                )}`}
              >
                {form}
              </span>
            ))
          ) : (
            <span className="text-[10px] text-white/25">—</span>
          )}
        </div>
      </div>
    </div>
  );
}

export function CommandCentrePanel({
  data,
  isLoading,
  error,
  loadingMessage,
  sourceState,
  isFromCache,
  lastSyncTime,
  autoSyncLabel,
  cooldownSeconds,
}: CommandCentrePanelProps) {
  const leader = data?.driverStandings[0];
  const second = data?.driverStandings[1];
  const constructorLeader = data?.teamStandings[0];

  const currentMeeting = data?.currentMeeting ?? null;
  const nextMeeting = data?.nextUpcomingMeeting ?? null;
  const latestMeeting = data?.latestCompletedMeeting ?? null;

  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const interval = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  const meetingType: 'active' | 'upcoming' | 'interval' = currentMeeting
    ? 'active'
    : nextMeeting
      ? 'upcoming'
      : 'interval';

  const focusMeeting = currentMeeting ?? nextMeeting ?? latestMeeting;

  const focusWeekend =
    data?.raceWeekends.find(
      (weekend) => weekend.meetingKey === focusMeeting?.meeting_key
    ) ?? null;

  const latestWeekend =
    data?.raceWeekends.find(
      (weekend) => weekend.meetingKey === latestMeeting?.meeting_key
    ) ?? null;

  const focusRound =
    focusWeekend?.round ??
    (currentMeeting
      ? (data?.completedRounds ?? 0) + 1
      : data?.completedRounds ?? 0);

  const completedRounds = data?.completedRounds ?? 0;
  const totalRounds = data?.totalGrandPrix ?? 0;

  const remainingRounds = Math.max(0, totalRounds - completedRounds);

  const seasonProgress =
    totalRounds > 0
      ? Math.min(100, Math.round((completedRounds / totalRounds) * 100))
      : 0;

  const latestResult = data?.raceResults?.[data.raceResults.length - 1] ?? null;

  const syncAge = useMemo(() => {
    if (!lastSyncTime) return '—';

    const lastSyncDate = new Date(lastSyncTime);

    if (Number.isNaN(lastSyncDate.getTime())) return '—';

    const seconds = Math.max(
      0,
      Math.floor((now.getTime() - lastSyncDate.getTime()) / 1000)
    );

    if (seconds < 60) return `${seconds}s`;

    return `${Math.floor(seconds / 60)}m ${String(seconds % 60).padStart(
      2,
      '0'
    )}s`;
  }, [lastSyncTime, now]);

  const timingEntries = useMemo(() => {
    if (!latestResult) return [];

    return Array.from(latestResult.driverResults.entries())
      .filter(([, result]) => result.racePosition !== null)
      .sort(
        (a, b) =>
          (a[1].racePosition ?? 999) - (b[1].racePosition ?? 999)
      )
      .slice(0, 5)
      .map(([driverNumber, result]) => {
        const driver = data?.allDrivers.get(driverNumber);

        return {
          position: result.racePosition ?? 0,
          acronym: driver?.name_acronym || driver?.broadcast_name || '—',
          teamName: driver?.team_name || '—',
        };
      });
  }, [data, latestResult]);

  const timingLeader = timingEntries[0] ?? null;

  const sessionStateLabel = currentMeeting
    ? 'ACTIVE WEEKEND'
    : nextMeeting
      ? 'UPCOMING EVENT'
      : 'NO LIVE SESSION';

  const sessionStateDetail = currentMeeting
    ? 'Calendar window is active. Current source does not provide live timing telemetry.'
    : nextMeeting
      ? 'Upcoming Grand Prix is indexed from the verified calendar.'
      : 'No active track session is currently available in the verified calendar.';

  const sessionCountdown = useMemo(() => {
    if (currentMeeting || !nextMeeting?.date_start) return null;

    const targetDate = new Date(nextMeeting.date_start);

    if (Number.isNaN(targetDate.getTime())) return null;

    const delta = targetDate.getTime() - now.getTime();

    if (delta <= 0) return null;

    const days = Math.floor(delta / 86400000);
    const hours = Math.floor((delta % 86400000) / 3600000);
    const minutes = Math.floor((delta % 3600000) / 60000);

    if (days > 0) return `${days}D ${hours}H`;
    if (hours > 0) return `${hours}H ${minutes}M`;

    return `${minutes}M`;
  }, [currentMeeting, nextMeeting, now]);

  const dataState = getDataState(sourceState, isFromCache, error);

  const operationsFeed = useMemo(() => {
    const timestamp = new Intl.DateTimeFormat('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(now);

    const entries: OperationEntry[] = [];

    if (sourceState === 'rate_limited') {
      entries.push({
        time: timestamp,
        title: 'DATA LINK PROTECTED',
        description: 'OpenF1 rate limit cooldown is active.',
        tone: 'amber',
      });
    }

    if (sourceState === 'offline' || (error && !isFromCache)) {
      entries.push({
        time: timestamp,
        title: 'SOURCE LINK UNAVAILABLE',
        description: 'No fresh verified update can be retrieved at this time.',
        tone: 'crimson',
      });
    }

    if (isFromCache && sourceState === 'cached') {
      entries.push({
        time: timestamp,
        title: 'VERIFIED SNAPSHOT RESTORED',
        description: 'A cached verified championship snapshot is active.',
        tone: 'green',
      });
    }

    if (currentMeeting) {
      entries.push({
        time: timestamp,
        title: 'WEEKEND MONITOR ACTIVE',
        description: `${currentMeeting.meeting_name} is the current calendar focus.`,
        tone: 'amber',
      });
    } else if (nextMeeting) {
      entries.push({
        time: timestamp,
        title: 'NEXT EVENT INDEXED',
        description: `${nextMeeting.meeting_name} is the next verified Grand Prix.`,
        tone: 'cyan',
      });
    }

    if (latestMeeting) {
      entries.push({
        time: timestamp,
        title: 'LATEST RESULT VERIFIED',
        description: `${latestMeeting.meeting_name} remains the latest indexed completed round.`,
        tone: 'green',
      });
    }

    if (cooldownSeconds > 0) {
      entries.push({
        time: timestamp,
        title: 'REFRESH COOLDOWN',
        description: `${cooldownSeconds}s remaining before another source request.`,
        tone: 'amber',
      });
    }

    entries.push({
      time: timestamp,
      title: 'DATA CORE STATUS',
      description: `Current sync age: ${syncAge}.`,
      tone: 'cyan',
    });

    return entries.slice(0, 5);
  }, [
    cooldownSeconds,
    currentMeeting,
    error,
    isFromCache,
    latestMeeting,
    nextMeeting,
    now,
    sourceState,
    syncAge,
  ]);

  const raceWeekends = data?.raceWeekends ?? [];

  const focusIndex = raceWeekends.findIndex(
    (weekend) => weekend.meetingKey === focusMeeting?.meeting_key
  );

  const radarStart =
    focusIndex >= 0
      ? Math.max(0, focusIndex - 1)
      : Math.max(0, completedRounds - 1);

  const radarRounds = raceWeekends.slice(radarStart, radarStart + 4);
  const gridSignals = data?.driverStandings.slice(0, 5) ?? [];

  const eventLocation =
    [focusMeeting?.location, focusMeeting?.country_name]
      .filter(Boolean)
      .join(', ') || 'Calendar location pending';

  const decorativeBars = [16, 28, 20, 38, 24, 45, 31, 52, 28, 40, 22, 35];

  if (isLoading && !data) {
    return (
      <section className="flex min-h-[640px] flex-col items-center justify-center overflow-hidden border border-cyan/20 bg-[#0a0d12]/80">
        <div className="relative">
          <div className="absolute -inset-8 rounded-full bg-cyan/[0.08] blur-2xl" />
          <Loader2 className="relative h-9 w-9 animate-spin text-cyan" />
        </div>

        <p className="mt-5 text-xs font-bold tracking-[0.22em] text-cyan uppercase">
          Race Control Initialising
        </p>

        <p className="mt-2 text-[10px] tracking-wide text-white/40">
          {loadingMessage || 'Reading verified championship intelligence...'}
        </p>
      </section>
    );
  }

  if (error && !data) {
    return (
      <section className="flex min-h-[640px] flex-col items-center justify-center border border-red-400/20 bg-red-400/[0.03] px-6 text-center">
        <AlertTriangle className="h-9 w-9 text-red-400" />

        <p className="mt-5 text-sm font-black tracking-[0.2em] text-red-400 uppercase">
          Race Control Offline
        </p>

        <p className="mt-3 max-w-lg text-xs leading-relaxed text-white/50">
          {error.message}
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      {/* Command Deck */}
      <div className="relative overflow-hidden border border-white/[0.10] bg-[#0a0c10]/90 shadow-[0_22px_60px_rgba(0,0,0,0.28)]">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_16%,rgba(0,255,255,0.10),transparent_30%),radial-gradient(circle_at_84%_82%,rgba(220,20,60,0.08),transparent_28%)]" />

          <div
            className="absolute inset-0 opacity-[0.045]"
            style={{
              backgroundImage:
                'linear-gradient(rgba(255,255,255,0.22) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.22) 1px, transparent 1px)',
              backgroundSize: '42px 42px',
            }}
          />

          <div className="absolute left-0 top-0 h-px w-full bg-gradient-to-r from-cyan/65 via-white/15 to-transparent" />

          <div className="absolute bottom-0 left-0 h-px w-full bg-gradient-to-r from-transparent via-white/10 to-crimson/45" />

          <svg
            className="absolute -bottom-20 right-[12%] h-[420px] w-[720px] text-cyan/[0.15]"
            viewBox="0 0 720 420"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M116 251C91 206 128 148 188 148C231 148 229 191 272 191C325 191 337 104 417 104C489 104 499 173 554 173C607 173 626 123 663 141C706 162 689 253 631 271C560 293 542 236 479 236C411 236 404 312 327 312C248 312 232 247 180 268C154 278 133 276 116 251Z"
              stroke="currentColor"
              strokeWidth="2"
            />
            <path
              d="M135 238C173 209 195 197 226 206C266 218 282 259 340 257C407 255 411 182 471 169C528 157 559 209 615 202"
              stroke="currentColor"
              strokeWidth="1"
              strokeDasharray="7 11"
            />
            <circle cx="116" cy="251" r="7" fill="currentColor" />
            <circle cx="417" cy="104" r="6" fill="currentColor" />
            <circle cx="631" cy="271" r="7" fill="currentColor" />
          </svg>

          <div className="absolute right-7 top-7 text-[9px] tracking-[0.18em] text-cyan/45">
            VISUAL EVENT SIGNAL TRACE
          </div>
        </div>

        <div className="relative grid min-h-[420px] grid-cols-1 xl:grid-cols-[1.55fr_0.65fr]">
          {/* Hero stage */}
          <div className="relative flex flex-col justify-between overflow-hidden p-5 md:p-7 lg:p-8">
            <div className="pointer-events-none absolute bottom-3 right-6 select-none text-[128px] font-black leading-none tracking-[-0.12em] text-white/[0.025] md:text-[180px]">
              R{String(focusRound).padStart(2, '0')}
            </div>

            <div className="relative">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-5 w-5 items-center justify-center">
                    <span className="absolute h-2 w-2 rounded-full bg-crimson shadow-[0_0_12px_rgba(220,20,60,0.9)]" />
                    <span className="absolute h-5 w-5 rounded-full border border-crimson/40 animate-ping" />
                  </span>

                  <span className="text-[10px] font-bold tracking-[0.24em] text-white/75 uppercase">
                    Race Control
                  </span>
                </div>

                <span
                  className={`border px-2.5 py-1 text-[9px] font-semibold tracking-[0.16em] uppercase ${getWeekendStatusClasses(
                    meetingType
                  )}`}
                >
                  {getWeekendStatusLabel(meetingType)}
                </span>
              </div>

              <div className="mt-8 max-w-4xl">
                <p className="text-[10px] font-medium tracking-[0.20em] text-cyan/75 uppercase">
                  Championship Operations // Event Focus
                </p>

                <h1 className="mt-3 text-3xl font-black leading-[0.95] tracking-[0.07em] text-white md:text-5xl xl:text-6xl">
                  {focusMeeting?.meeting_name?.toUpperCase() ||
                    'SEASON OPERATIONS'}
                </h1>

                <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-3 text-[11px] text-white/55">
                  <span className="flex items-center gap-2">
                    <Flag className="h-3.5 w-3.5 text-cyan" />
                    ROUND {String(focusRound).padStart(2, '0')} /{' '}
                    {String(totalRounds).padStart(2, '0')}
                  </span>

                  <span className="flex items-center gap-2">
                    <MapPin className="h-3.5 w-3.5 text-cyan" />
                    {eventLocation}
                  </span>

                  <span className="flex items-center gap-2">
                    <CalendarDays className="h-3.5 w-3.5 text-cyan" />
                    {formatEventDate(focusMeeting?.date_start)}
                  </span>
                </div>
              </div>

              <div className="mt-7 max-w-2xl border-l-2 border-cyan/55 pl-4">
                <p className="text-[11px] leading-relaxed text-white/50">
                  APEX is displaying verified calendar, standings, and completed
                  result intelligence. Live timing, sector gaps, tyre state,
                  weather, and strategy calls are not shown unless supplied by a
                  verified data source.
                </p>
              </div>
            </div>

            <div className="relative mt-8 grid max-w-3xl grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="border border-white/[0.10] bg-black/[0.20] px-3 py-3">
                <p className="text-[9px] tracking-[0.15em] text-white/35 uppercase">
                  Completed
                </p>
                <p className="mt-1 text-2xl font-black text-white">
                  {completedRounds}
                </p>
                <p className="text-[9px] text-white/35">verified rounds</p>
              </div>

              <div className="border border-white/[0.10] bg-black/[0.20] px-3 py-3">
                <p className="text-[9px] tracking-[0.15em] text-white/35 uppercase">
                  Remaining
                </p>
                <p className="mt-1 text-2xl font-black text-cyan">
                  {remainingRounds}
                </p>
                <p className="text-[9px] text-white/35">calendar rounds</p>
              </div>

              <div className="border border-white/[0.10] bg-black/[0.20] px-3 py-3">
                <p className="text-[9px] tracking-[0.15em] text-white/35 uppercase">
                  Leader
                </p>
                <p className="mt-1 text-2xl font-black text-crimson">
                  {leader?.driverAcronym || '—'}
                </p>
                <p className="truncate text-[9px] text-white/35">
                  {leader ? `${leader.points} pts` : 'awaiting data'}
                </p>
              </div>

              <div className="border border-white/[0.10] bg-black/[0.20] px-3 py-3">
                <p className="text-[9px] tracking-[0.15em] text-white/35 uppercase">
                  Season Index
                </p>
                <p className="mt-1 text-2xl font-black text-amber">
                  {seasonProgress}%
                </p>
                <p className="text-[9px] text-white/35">calendar progress</p>
              </div>
            </div>
          </div>

          {/* Operations rail */}
          <aside className="relative border-t border-white/[0.10] bg-black/[0.20] xl:border-l xl:border-t-0">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan/45 to-transparent xl:inset-y-0 xl:left-0 xl:h-full xl:w-px xl:bg-gradient-to-b" />

            <div className="flex h-full flex-col">
              <div className="border-b border-white/[0.10] px-5 py-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Crosshair className="h-4 w-4 text-cyan" />
                    <p className="text-[10px] font-bold tracking-[0.18em] text-white uppercase">
                      Operations Rail
                    </p>
                  </div>

                  <CircleDot className={`h-4 w-4 ${dataState.accent === 'amber' ? 'text-amber' : dataState.accent === 'crimson' ? 'text-crimson' : dataState.accent === 'green' ? 'text-green-400' : 'text-cyan'}`} />
                </div>

                <div className="mt-5 flex items-start gap-3">
                  <div className="relative mt-1 h-2.5 w-2.5 shrink-0">
                    <div className={`absolute inset-0 rounded-full ${dataState.dot} shadow-[0_0_12px_rgba(0,255,255,0.7)]`} />
                    <div className={`absolute inset-0 rounded-full ${dataState.dot}/40 animate-ping`} />
                  </div>

                  <div>
                    <p
                      className={`text-[11px] font-bold tracking-[0.14em] ${
                        dataState.accent === 'amber'
                          ? 'text-amber'
                          : dataState.accent === 'crimson'
                            ? 'text-crimson'
                            : dataState.accent === 'green'
                              ? 'text-green-400'
                              : 'text-cyan'
                      }`}
                    >
                      {dataState.label}
                    </p>

                    <p className="mt-1 text-[9px] leading-relaxed tracking-[0.08em] text-white/35">
                      {dataState.detail}
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 border-b border-white/[0.10]">
                <div className="border-r border-white/[0.10] px-5 py-4">
                  <p className="text-[9px] tracking-[0.15em] text-white/35 uppercase">
                    Session State
                  </p>
                  <p className="mt-2 text-sm font-bold text-white">
                    {sessionStateLabel}
                  </p>
                </div>

                <div className="px-5 py-4">
                  <p className="text-[9px] tracking-[0.15em] text-white/35 uppercase">
                    Sync Age
                  </p>
                  <p className="mt-2 font-mono text-sm font-bold text-cyan">
                    {syncAge}
                  </p>
                </div>
              </div>

              <div className="border-b border-white/[0.10] px-5 py-4">
                <div className="flex items-center gap-2">
                  <TimerReset className="h-3.5 w-3.5 text-amber" />
                  <p className="text-[9px] tracking-[0.15em] text-white/35 uppercase">
                    Auto-Sync Control
                  </p>
                </div>

                <p className="mt-2 text-[11px] font-semibold tracking-wide text-green-400">
                  {autoSyncLabel}
                </p>

                {sessionCountdown && (
                  <p className="mt-2 text-[10px] text-amber">
                    NEXT EVENT WINDOW · {sessionCountdown}
                  </p>
                )}
              </div>

              <div className="flex-1 px-5 py-4">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-3.5 w-3.5 text-green-400" />
                  <p className="text-[9px] tracking-[0.15em] text-white/35 uppercase">
                    Integrity Guardrail
                  </p>
                </div>

                <p className="mt-3 text-[10px] leading-relaxed text-white/45">
                  {sessionStateDetail}
                </p>

                <div className="mt-5 flex items-end gap-[3px]">
                  {decorativeBars.map((height, index) => (
                    <span
                      key={`${height}-${index}`}
                      className={`w-1 rounded-t-sm ${
                        index % 4 === 0
                          ? 'bg-crimson/70'
                          : index % 3 === 0
                            ? 'bg-amber/65'
                            : 'bg-cyan/55'
                      }`}
                      style={{ height: `${height}px` }}
                    />
                  ))}
                </div>

                <p className="mt-2 text-[8px] tracking-[0.16em] text-white/25">
                  VERIFIED SIGNAL VISUALISATION
                </p>
              </div>

              <div className="border-t border-white/[0.10] px-5 py-4">
                <div className="flex items-center gap-2">
                  <Clock3 className="h-3.5 w-3.5 text-white/35" />
                  <span className="text-[9px] tracking-[0.15em] text-white/35">
                    LAST DATA SYNC
                  </span>
                  <span className="ml-auto font-mono text-[10px] text-white/65">
                    {formatSyncTime(lastSyncTime)}
                  </span>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>

      {/* Verified classification + event operations */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.3fr_0.7fr]">
        <div className="overflow-hidden border border-white/[0.10] bg-[#0b0d12]/75">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.10] px-5 py-4">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-amber" />
              <div>
                <h2 className="text-[11px] font-bold tracking-[0.18em] text-white uppercase">
                  Timing Tower
                </h2>
                <p className="mt-0.5 text-[8px] tracking-[0.14em] text-white/30 uppercase">
                  Latest verified classification only
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 border border-amber/20 bg-amber/[0.05] px-2.5 py-1.5">
              <WifiOff className="h-3 w-3 text-amber" />
              <span className="text-[9px] font-semibold tracking-[0.12em] text-amber">
                LIVE TIMING UNAVAILABLE
              </span>
            </div>
          </div>

          <div className="p-4 md:p-5">
            {timingLeader ? (
              <div className="mb-4 flex flex-col justify-between gap-4 border border-cyan/20 bg-cyan/[0.035] p-4 sm:flex-row sm:items-center">
                <div>
                  <p className="text-[9px] tracking-[0.16em] text-cyan uppercase">
                    Last Verified P1
                  </p>

                  <div className="mt-2 flex items-end gap-3">
                    <span className="text-4xl font-black leading-none text-cyan">
                      P1
                    </span>

                    <div>
                      <p className="text-2xl font-black tracking-[0.08em] text-white">
                        {timingLeader.acronym}
                      </p>
                      <p className="mt-1 text-[10px] text-white/45">
                        {timingLeader.teamName}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="border-l border-white/10 pl-4">
                  <p className="text-[9px] tracking-[0.15em] text-white/35 uppercase">
                    Source Context
                  </p>
                  <p className="mt-2 max-w-[210px] text-[10px] leading-relaxed text-white/45">
                    Position order is taken from the most recently indexed
                    completed race result.
                  </p>
                </div>
              </div>
            ) : null}

            {timingEntries.length > 0 ? (
              <div className="grid gap-2">
                {timingEntries.map((entry, index) => (
                  <div
                    key={`${entry.position}-${entry.acronym}`}
                    className={`group flex items-center gap-4 border px-4 py-3 transition-colors duration-200 ${
                      index === 0
                        ? 'border-cyan/20 bg-cyan/[0.025]'
                        : 'border-white/[0.09] bg-black/[0.18] hover:border-white/20'
                    }`}
                  >
                    <span
                      className={`w-8 text-lg font-black ${
                        index === 0 ? 'text-cyan' : 'text-white/65'
                      }`}
                    >
                      P{entry.position}
                    </span>

                    <div className="h-7 w-px bg-white/10" />

                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold tracking-[0.08em] text-white">
                        {entry.acronym}
                      </p>
                      <p className="mt-0.5 truncate text-[9px] tracking-[0.1em] text-white/35">
                        {entry.teamName}
                      </p>
                    </div>

                    <span className="border border-green-400/20 bg-green-400/[0.04] px-2 py-1 text-[8px] font-semibold tracking-[0.13em] text-green-400">
                      VERIFIED
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex min-h-[230px] items-center justify-center border border-dashed border-white/10">
                <p className="text-[10px] tracking-[0.12em] text-white/35">
                  NO VERIFIED CLASSIFICATION IS CURRENTLY INDEXED
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="overflow-hidden border border-white/[0.10] bg-[#0b0d12]/75">
          <div className="flex items-center justify-between border-b border-white/[0.10] px-5 py-4">
            <div className="flex items-center gap-2">
              <Radio className="h-4 w-4 text-crimson" />
              <div>
                <h2 className="text-[11px] font-bold tracking-[0.18em] text-white uppercase">
                  Operations Feed
                </h2>
                <p className="mt-0.5 text-[8px] tracking-[0.14em] text-white/30 uppercase">
                  Source and system events
                </p>
              </div>
            </div>

            <span className="text-[9px] tracking-[0.14em] text-white/30">
              CONTROL LOG
            </span>
          </div>

          <div className="divide-y divide-white/[0.08]">
            {operationsFeed.map((entry, index) => {
              const toneClasses = getOperationToneClasses(entry.tone);

              return (
                <div
                  key={`${entry.time}-${entry.title}-${index}`}
                  className="flex gap-3 px-5 py-4"
                >
                  <div className="flex flex-col items-center">
                    <span
                      className={`mt-1 h-2 w-2 rounded-full ${toneClasses.split(' ')[0]} shadow-[0_0_10px_rgba(0,255,255,0.45)]`}
                    />
                    {index < operationsFeed.length - 1 && (
                      <span className="mt-2 h-full min-h-[18px] w-px bg-white/[0.09]" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-[10px] font-semibold tracking-[0.11em] text-white">
                        {entry.title}
                      </p>
                      <span className="shrink-0 font-mono text-[9px] text-white/35">
                        {entry.time}
                      </span>
                    </div>

                    <p className="mt-1 text-[10px] leading-relaxed text-white/45">
                      {entry.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="border-t border-white/[0.10] bg-black/[0.18] px-5 py-4">
            <div className="flex items-center gap-2">
              <Database className="h-3.5 w-3.5 text-cyan" />
              <p className="text-[9px] tracking-[0.13em] text-white/35">
                {cooldownSeconds > 0
                  ? `REFRESH CONTROL LOCKED · ${cooldownSeconds}s REMAINING`
                  : 'REFRESH CONTROL READY · VERIFIED DATA PROTOCOL ACTIVE'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Championship intelligence strip */}
      <div className="relative overflow-hidden border border-white/[0.10] bg-[#0b0d12]/70">
        <div className="absolute inset-y-0 left-0 w-[3px] bg-gradient-to-b from-crimson via-cyan to-transparent" />

        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.10] px-5 py-4">
          <div className="flex items-center gap-2">
            <Layers3 className="h-4 w-4 text-cyan" />
            <div>
              <h2 className="text-[11px] font-bold tracking-[0.18em] text-white uppercase">
                Championship Pulse
              </h2>
              <p className="mt-0.5 text-[8px] tracking-[0.14em] text-white/30 uppercase">
                Season state at the current verified snapshot
              </p>
            </div>
          </div>

          <p className="text-[9px] tracking-[0.14em] text-white/30">
            {completedRounds} OF {totalRounds} ROUNDS INDEXED
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 p-4 md:grid-cols-3">
          <PulseMetric
            label="Drivers' Leader"
            value={leader?.driverAcronym || '—'}
            detail={
              leader
                ? `${leader.driverName} · ${leader.points} points`
                : 'Awaiting verified standings'
            }
            accent="crimson"
          />

          <PulseMetric
            label="Championship Gap"
            value={
              second?.gapToLeader !== null && second?.gapToLeader !== undefined
                ? `+${second.gapToLeader}`
                : '—'
            }
            detail={
              second
                ? `${second.driverAcronym} currently holds P2`
                : 'Awaiting verified P2'
            }
            accent="amber"
          />

          <PulseMetric
            label="Constructors' Leader"
            value={constructorLeader?.teamName || '—'}
            detail={
              constructorLeader
                ? `${constructorLeader.points} points · P${constructorLeader.position}`
                : 'Awaiting verified team standings'
            }
            accent="cyan"
          />
        </div>
      </div>

      {/* Debrief + Grid signals */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.18fr_0.82fr]">
        <div className="overflow-hidden border border-white/[0.10] bg-[#0b0d12]/75">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.10] px-5 py-4">
            <div className="flex items-center gap-2">
              <Trophy className="h-4 w-4 text-amber" />
              <div>
                <h2 className="text-[11px] font-bold tracking-[0.18em] text-white uppercase">
                  Latest Verified Debrief
                </h2>
                <p className="mt-0.5 text-[8px] tracking-[0.14em] text-white/30 uppercase">
                  Latest completed official race record
                </p>
              </div>
            </div>

            <CheckCircle2 className="h-4 w-4 text-green-400" />
          </div>

          <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-[1.1fr_0.9fr]">
            <div className="relative overflow-hidden border border-white/[0.09] bg-black/[0.18] p-4">
              <div className="absolute right-3 top-2 text-5xl font-black text-white/[0.025]">
                LAST
              </div>

              <p className="relative text-[9px] tracking-[0.16em] text-white/35 uppercase">
                Last Grand Prix
              </p>

              <p className="relative mt-3 text-xl font-bold leading-tight text-white">
                {latestMeeting?.meeting_name || 'No completed race yet'}
              </p>

              <p className="relative mt-2 text-[10px] text-white/45">
                {latestMeeting
                  ? `${latestMeeting.location}, ${latestMeeting.country_name}`
                  : 'Results are awaiting verified ingestion.'}
              </p>
            </div>

            <div className="relative overflow-hidden border border-cyan/20 bg-cyan/[0.03] p-4">
              <p className="text-[9px] tracking-[0.16em] text-cyan uppercase">
                Winner Status
              </p>

              {latestWeekend?.raceWinner ? (
                <>
                  <p className="mt-4 text-4xl font-black tracking-[0.08em] text-cyan">
                    {latestWeekend.raceWinner.driverAcronym}
                  </p>

                  <p className="mt-2 text-[11px] font-semibold text-white">
                    {latestWeekend.raceWinner.driverName}
                  </p>

                  <p className="mt-1 text-[10px] text-white/45">
                    {latestWeekend.raceWinner.teamName}
                  </p>
                </>
              ) : (
                <>
                  <p className="mt-4 text-sm font-bold tracking-wide text-amber">
                    PENDING VERIFICATION
                  </p>

                  <p className="mt-2 text-[10px] leading-relaxed text-white/45">
                    A winner is not shown until a verified P1 result is indexed.
                  </p>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="overflow-hidden border border-white/[0.10] bg-[#0b0d12]/75">
          <div className="flex items-center justify-between border-b border-white/[0.10] px-5 py-4">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-cyan" />
              <div>
                <h2 className="text-[11px] font-bold tracking-[0.18em] text-white uppercase">
                  Grid Signals
                </h2>
                <p className="mt-0.5 text-[8px] tracking-[0.14em] text-white/30 uppercase">
                  Leading driver form view
                </p>
              </div>
            </div>

            <span className="text-[9px] tracking-[0.14em] text-white/30">
              TOP 5
            </span>
          </div>

          <div className="grid gap-2 p-3">
            {gridSignals.length > 0 ? (
              gridSignals.map((driver) => (
                <DriverSignal key={driver.driverNumber} driver={driver} />
              ))
            ) : (
              <p className="px-2 py-10 text-center text-[10px] tracking-[0.12em] text-white/35">
                AWAITING VERIFIED STANDINGS
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Race radar */}
      <div className="relative overflow-hidden border border-white/[0.10] bg-[#0b0d12]/75">
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-cyan/[0.025] to-transparent" />

        <div className="relative flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.10] px-5 py-4">
          <div className="flex items-center gap-2">
            <Gauge className="h-4 w-4 text-crimson" />
            <div>
              <h2 className="text-[11px] font-bold tracking-[0.18em] text-white uppercase">
                Race Radar
              </h2>
              <p className="mt-0.5 text-[8px] tracking-[0.14em] text-white/30 uppercase">
                Previous, active, and upcoming calendar position
              </p>
            </div>
          </div>

          <span className="text-[9px] tracking-[0.14em] text-white/30">
            EVENT PROGRESSION
          </span>
        </div>

        <div className="relative grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 xl:grid-cols-4">
          {radarRounds.length > 0 ? (
            radarRounds.map((weekend, index) => (
              <div
                key={weekend.meetingKey}
                className={`group relative overflow-hidden border p-4 transition-colors duration-200 hover:border-cyan/30 ${getRoundStatusClasses(
                  weekend.status
                )}`}
              >
                <div className="absolute right-3 top-2 text-4xl font-black text-white/[0.025]">
                  {String(weekend.round).padStart(2, '0')}
                </div>

                <div className="relative flex items-center justify-between gap-3">
                  <span className="text-[9px] tracking-[0.14em] text-white/35">
                    ROUND {String(weekend.round).padStart(2, '0')}
                  </span>

                  <span
                    className={`text-[8px] font-bold tracking-[0.13em] ${getRoundStatusTextClasses(
                      weekend.status
                    )}`}
                  >
                    {getRoundStatusLabel(weekend.status)}
                  </span>
                </div>

                <p className="relative mt-5 text-sm font-bold text-white">
                  {weekend.meetingName}
                </p>

                <p className="relative mt-1 text-[10px] text-white/40">
                  {weekend.circuitShortName} · {weekend.country}
                </p>

                <div className="relative mt-5 border-t border-white/[0.09] pt-3">
                  <p className="text-[10px] text-white/50">
                    {weekend.status === 'completed' && weekend.raceWinner
                      ? `Winner: ${weekend.raceWinner.driverAcronym}`
                      : weekend.status === 'completed'
                        ? 'Result verification pending'
                        : formatEventDate(weekend.dateStart)}
                  </p>

                  <div className="mt-3 h-px w-full bg-white/[0.07]">
                    <div
                      className={`h-px ${
                        weekend.status === 'completed'
                          ? 'w-full bg-green-400/60'
                          : weekend.status === 'active'
                            ? 'w-2/3 bg-amber/70'
                            : index === radarRounds.length - 1
                              ? 'w-1/4 bg-cyan/60'
                              : 'w-1/3 bg-white/20'
                      }`}
                    />
                  </div>
                </div>
              </div>
            ))
          ) : (
            <p className="col-span-full py-12 text-center text-[10px] tracking-[0.12em] text-white/35">
              RACE CALENDAR IS AWAITING VERIFIED INGESTION
            </p>
          )}
        </div>

        <div className="relative flex items-center gap-2 border-t border-white/[0.10] bg-black/[0.16] px-5 py-4">
          <CheckCircle2 className="h-3.5 w-3.5 text-green-400" />

          <p className="text-[9px] tracking-[0.11em] text-white/35">
            COMPLETED EVENTS REQUIRE VERIFIED RESULTS. UPCOMING EVENTS DISPLAY
            CALENDAR INFORMATION ONLY.
          </p>
        </div>
      </div>
    </section>
  );
}