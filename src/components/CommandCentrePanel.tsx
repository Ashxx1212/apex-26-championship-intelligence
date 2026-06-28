import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  Flag,
  Gauge,
  Loader2,
  MapPin,
  Radio,
  Trophy,
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
    return 'border-amber/40 bg-amber/10 text-amber';
  }

  if (meetingType === 'upcoming') {
    return 'border-cyan/30 bg-cyan/10 text-cyan';
  }

  return 'border-white/10 bg-white/5 text-white/40';
}

function getFormClasses(form: 'W' | 'P' | 'D' | 'R'): string {
  if (form === 'W') return 'bg-crimson text-white';
  if (form === 'P') return 'bg-amber text-black';
  if (form === 'D') return 'bg-cyan text-graphite';
  return 'bg-white/15 text-white/70';
}

function getRoundStatusClasses(status: RaceWeekendSnapshot['status']): string {
  if (status === 'completed') {
    return 'border-green-400/25 bg-green-400/[0.05]';
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

function LeaderCard({
  title,
  value,
  detail,
  accent = 'cyan',
}: {
  title: string;
  value: string;
  detail: string;
  accent?: 'cyan' | 'crimson' | 'amber';
}) {
  const accentClasses = {
    cyan: 'text-cyan border-cyan/20',
    crimson: 'text-crimson border-crimson/20',
    amber: 'text-amber border-amber/20',
  };

  return (
    <div className={`border bg-black/20 px-4 py-3 ${accentClasses[accent]}`}>
      <p className="text-[9px] tracking-[0.16em] text-white/35 uppercase">
        {title}
      </p>

      <p className={`mt-2 text-lg font-bold ${accentClasses[accent].split(' ')[0]}`}>
        {value}
      </p>

      <p className="mt-1 text-[10px] text-white/45 truncate">
        {detail}
      </p>
    </div>
  );
}

function DriverSignal({ driver }: { driver: DriverStanding }) {
  return (
    <div className="border border-white/10 bg-black/20 px-3 py-3">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[10px] text-white/35">
            P{driver.position} · {driver.driverAcronym}
          </p>

          <p className="mt-1 truncate text-xs font-semibold text-white">
            {driver.driverName}
          </p>

          <p className="mt-1 text-[10px] text-white/40">
            {driver.points} pts · {driver.teamName}
          </p>
        </div>

        <div className="flex gap-1 shrink-0">
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
    (currentMeeting ? (data?.completedRounds ?? 0) + 1 : data?.completedRounds ?? 0);

  const completedRounds = data?.completedRounds ?? 0;
  const latestResult = data?.raceResults?.[data.raceResults.length - 1] ?? null;

  const syncAge = useMemo(() => {
    if (!lastSyncTime) return '—';
    const lastSyncDate = new Date(lastSyncTime);
    if (Number.isNaN(lastSyncDate.getTime())) return '—';
    const seconds = Math.max(0, Math.floor((now.getTime() - lastSyncDate.getTime()) / 1000));
    if (seconds < 60) return `${seconds}s`;
    return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  }, [lastSyncTime, now]);

  const timingEntries = useMemo(() => {
    if (!latestResult) return [];
    return Array.from(latestResult.driverResults.entries())
      .filter(([, result]) => result.racePosition !== null)
      .sort((a, b) => (a[1].racePosition ?? 999) - (b[1].racePosition ?? 999))
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

  const sessionStateLabel = currentMeeting
  ? 'ACTIVE WEEKEND'
  : nextMeeting
    ? 'UPCOMING EVENT'
    : 'NO LIVE SESSION';

const sessionStateDetail = currentMeeting
  ? 'SESSION WINDOW ACTIVE — LIVE TIMING NOT AVAILABLE FROM CURRENT DATA SOURCE'
  : nextMeeting
    ? 'NEXT GRAND PRIX — CALENDAR DATA ONLY'
    : 'SEASON INTERVAL — NO ACTIVE TRACK SESSION';

  const sessionCountdown = useMemo(() => {
    const target = currentMeeting?.date_start || nextMeeting?.date_start;
    if (!target) return null;
    const targetDate = new Date(target);
    if (Number.isNaN(targetDate.getTime())) return null;
    const delta = targetDate.getTime() - now.getTime();
    if (delta <= 0) return null;
    const minutes = Math.floor(delta / 60000);
    const seconds = Math.floor((delta % 60000) / 1000);
    return `${minutes}m ${String(seconds).padStart(2, '0')}s`;
  }, [currentMeeting, nextMeeting, now]);

  const operationsFeed = useMemo(() => {
    const timestamp = new Intl.DateTimeFormat('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(now);
    const entries: Array<{ time: string; title: string; description: string; }> = [];

    if (sourceState === 'rate_limited') {
      entries.push({
        time: timestamp,
        title: 'DATA LINK DEGRADED',
        description: 'OpenF1 rate limit cooldown active',
      });
    }

    if (isFromCache && sourceState === 'cached') {
      entries.push({
        time: timestamp,
        title: 'DATA CORE',
        description: 'Cached verified snapshot restored',
      });
    }

    if (currentMeeting) {
      entries.push({
        time: timestamp,
        title: 'WEEKEND MONITOR',
        description: `${currentMeeting.meeting_name} active weekend detected`,
      });
    } else if (nextMeeting) {
      entries.push({
        time: timestamp,
        title: 'WEEKEND MONITOR',
        description: `${nextMeeting.meeting_name} next Grand Prix scheduled`,
      });
    }

    if (latestMeeting) {
      entries.push({
        time: timestamp,
        title: 'VERIFIED RESULT',
        description: `Latest completed round: ${latestMeeting.meeting_name}`,
      });
    }

    if (cooldownSeconds > 0) {
      entries.push({
        time: timestamp,
        title: 'COOLDOWN',
        description: `Rate limit cooldown ${cooldownSeconds}s`,
      });
    }

    entries.push({
      time: timestamp,
      title: 'SYNC STATUS',
      description: `Sync age: ${syncAge}`,
    });

    return entries.slice(0, 5);
  }, [cooldownSeconds, currentMeeting, isFromCache, latestMeeting, nextMeeting, now, sourceState, syncAge]);
  const remainingRounds = Math.max(
    0,
    (data?.totalGrandPrix ?? 0) - completedRounds
  );

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

  if (isLoading && !data) {
    return (
      <section className="flex min-h-[580px] flex-col items-center justify-center border border-white/10 bg-graphite-light/40">
        <Loader2 className="h-8 w-8 animate-spin text-cyan" />

        <p className="mt-4 text-xs tracking-[0.16em] text-cyan uppercase">
          Race Control Initialising
        </p>

        <p className="mt-2 text-[10px] text-white/40">
          {loadingMessage || 'Reading verified championship feed...'}
        </p>
      </section>
    );
  }

  if (error && !data) {
    return (
      <section className="flex min-h-[580px] flex-col items-center justify-center border border-red-400/20 bg-red-400/[0.03] px-6 text-center">
        <AlertTriangle className="h-8 w-8 text-red-400" />

        <p className="mt-4 text-sm font-bold tracking-[0.18em] text-red-400 uppercase">
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
      {/* Race Control hero */}
      <div className="relative overflow-hidden border border-white/10 bg-graphite-light/40">
        <div className="pointer-events-none absolute inset-0 opacity-[0.06]">
          <div
            className="h-full w-full"
            style={{
              backgroundImage:
                'linear-gradient(rgba(255,255,255,0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.15) 1px, transparent 1px)',
              backgroundSize: '36px 36px',
            }}
          />
        </div>

        <div className="relative grid grid-cols-1 gap-6 p-5 lg:grid-cols-[1.4fr_0.6fr] lg:p-6">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <Radio className="h-4 w-4 text-crimson" />

                <span className="text-[10px] font-bold tracking-[0.2em] text-white/70 uppercase">
                  Race Control
                </span>
              </div>

              <span
                className={`border px-2 py-1 text-[9px] tracking-[0.14em] uppercase ${getWeekendStatusClasses(
                  meetingType
                )}`}
              >
                {getWeekendStatusLabel(meetingType)}
              </span>
            </div>

            <h1 className="mt-5 text-2xl font-black tracking-[0.12em] text-white md:text-4xl">
              {focusMeeting?.meeting_name?.toUpperCase() || 'SEASON OPERATIONS'}
            </h1>

            <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-white/50">
              <span className="flex items-center gap-2">
                <Flag className="h-3.5 w-3.5 text-cyan" />
                ROUND {String(focusRound).padStart(2, '0')} /{' '}
                {String(data?.totalGrandPrix ?? 0).padStart(2, '0')}
              </span>

              <span className="flex items-center gap-2">
                <MapPin className="h-3.5 w-3.5 text-cyan" />
                {focusMeeting?.location || 'Location pending'} ·{' '}
                {focusMeeting?.country_name || 'Verified calendar'}
              </span>

              <span className="flex items-center gap-2">
                <CalendarDays className="h-3.5 w-3.5 text-cyan" />
                {formatEventDate(focusMeeting?.date_start)}
              </span>
            </div>

            <p className="mt-5 max-w-2xl text-[11px] leading-relaxed text-white/45">
              APEX Race Control surfaces the current verified championship
              state, upcoming race context, and indexed grid signals. It does
              not display fabricated live telemetry, strategy, or weather data.
            </p>
          </div>

          <div className="border border-cyan/20 bg-cyan/[0.03] p-4">
            <p className="text-[9px] tracking-[0.16em] text-cyan uppercase">
              Season Operations
            </p>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <div>
                <p className="text-[9px] text-white/35 uppercase">
                  Completed
                </p>

                <p className="mt-1 text-2xl font-bold text-white">
                  {completedRounds}
                </p>

                <p className="text-[10px] text-white/35">verified rounds</p>
              </div>

              <div>
                <p className="text-[9px] text-white/35 uppercase">
                  Remaining
                </p>

                <p className="mt-1 text-2xl font-bold text-cyan">
                  {remainingRounds}
                </p>

                <p className="text-[10px] text-white/35">rounds ahead</p>
              </div>
            </div>

            <div className="mt-5 border-t border-white/10 pt-3">
              <p className="text-[9px] text-white/35 uppercase">
                Data state
              </p>

              <p className="mt-1 text-xs font-semibold text-green-400">
                {sourceState === 'cached'
                  ? 'CACHED VERIFIED SNAPSHOT'
                  : 'LIVE VERIFIED DATA'}
              </p>
            </div>
          </div>
        </div>
      </div>
      {/* Live operations strip */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        {/* Session monitor */}
        <div className="border border-cyan/20 bg-cyan/[0.03]">
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
            <div className="flex items-center gap-2">
              <Radio className="h-4 w-4 text-cyan" />
              <h2 className="text-[11px] font-bold tracking-[0.18em] text-white uppercase">
                Session Monitor
              </h2>
            </div>

            <span className="text-[9px] tracking-wider text-cyan uppercase">
              Verified Operations
            </span>
          </div>

          <div className="space-y-4 p-4">
            <div>
              <p className="text-[9px] tracking-[0.14em] text-white/35 uppercase">
                Track status
              </p>

              <p className="mt-2 text-sm font-bold text-white">
                {sessionStateLabel}
              </p>

              <p className="mt-2 text-[10px] leading-relaxed text-white/45">
                {sessionStateDetail}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 border-t border-white/10 pt-3">
              <div>
                <p className="text-[9px] text-white/35 uppercase">
                  Last sync
                </p>
                <p className="mt-1 text-xs font-mono text-white/75">
                  {lastSyncTime
                    ? new Date(lastSyncTime).toLocaleTimeString('en-GB', {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })
                    : '—'}
                </p>
              </div>

              <div>
                <p className="text-[9px] text-white/35 uppercase">
                  Sync age
                </p>
                <p className="mt-1 text-xs font-mono text-cyan">
                  {syncAge}
                </p>
              </div>
            </div>

            {sessionCountdown && (
              <div className="border-t border-white/10 pt-3">
                <p className="text-[9px] text-white/35 uppercase">
                  Event countdown
                </p>
                <p className="mt-1 text-sm font-bold text-amber">
                  {sessionCountdown}
                </p>
              </div>
            )}

            <div className="border-t border-white/10 pt-3">
              <p className="text-[9px] text-white/35 uppercase">
                Auto-sync
              </p>
              <p className="mt-1 text-[10px] tracking-wide text-green-400">
                {autoSyncLabel}
              </p>
            </div>
          </div>
        </div>

        {/* Verified timing tower */}
        <div className="border border-white/10 bg-graphite-light/30">
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-amber" />
              <h2 className="text-[11px] font-bold tracking-[0.18em] text-white uppercase">
                Timing Tower
              </h2>
            </div>

            <span className="text-[9px] tracking-wider text-amber uppercase">
              Last verified classification
            </span>
          </div>

          <div className="p-3">
            <div className="mb-3 border border-amber/20 bg-amber/[0.04] px-3 py-2">
              <p className="text-[10px] font-semibold text-amber">
                LIVE TIMING UNAVAILABLE
              </p>
              <p className="mt-1 text-[9px] leading-relaxed text-white/40">
                Displaying the latest verified race classification where available.
              </p>
            </div>

            {timingEntries.length > 0 ? (
              <div className="space-y-2">
                {timingEntries.map((entry) => (
                  <div
                    key={`${entry.position}-${entry.acronym}`}
                    className="flex items-center gap-3 border border-white/10 bg-black/20 px-3 py-2"
                  >
                    <span className="w-6 text-sm font-bold text-cyan">
                      P{entry.position}
                    </span>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-semibold text-white">
                        {entry.acronym}
                      </p>
                      <p className="truncate text-[9px] text-white/40">
                        {entry.teamName}
                      </p>
                    </div>

                    <span className="text-[9px] tracking-wider text-white/30">
                      VERIFIED
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center">
                <p className="text-[10px] text-white/35">
                  No verified classification is currently indexed.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Operations feed */}
        <div className="border border-white/10 bg-graphite-light/30">
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
            <div className="flex items-center gap-2">
              <Gauge className="h-4 w-4 text-crimson" />
              <h2 className="text-[11px] font-bold tracking-[0.18em] text-white uppercase">
                Operations Feed
              </h2>
            </div>

            <span className="text-[9px] tracking-wider text-white/30 uppercase">
              Source events
            </span>
          </div>

          <div className="divide-y divide-white/10">
            {operationsFeed.map((entry, index) => (
              <div
                key={`${entry.time}-${entry.title}-${index}`}
                className="flex gap-3 px-4 py-3"
              >
                <span className="shrink-0 font-mono text-[9px] text-cyan">
                  {entry.time}
                </span>

                <div className="min-w-0">
                  <p className="text-[10px] font-semibold tracking-wide text-white">
                    {entry.title}
                  </p>

                  <p className="mt-1 text-[10px] leading-relaxed text-white/45">
                    {entry.description}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="border-t border-white/10 px-4 py-3">
            <p className="text-[9px] tracking-wide text-white/35">
              {cooldownSeconds > 0
                ? `RATE LIMIT COOLDOWN ACTIVE · ${cooldownSeconds}s REMAINING`
                : isFromCache
                  ? 'CACHED VERIFIED SNAPSHOT ACTIVE'
                  : 'LIVE VERIFIED DATA SOURCE ACTIVE'}
            </p>
          </div>
        </div>
      </div>
      
      {/* Championship pulse */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <LeaderCard
          title="Drivers' Leader"
          value={leader?.driverAcronym || '—'}
          detail={
            leader
              ? `${leader.driverName} · ${leader.points} points`
              : 'Awaiting standings'
          }
          accent="crimson"
        />

        <LeaderCard
          title="Championship Gap"
          value={
            second?.gapToLeader !== null && second?.gapToLeader !== undefined
              ? `+${second.gapToLeader}`
              : '—'
          }
          detail={second ? `${second.driverAcronym} currently P2` : 'Awaiting P2'}
          accent="amber"
        />

        <LeaderCard
          title="Constructors' Leader"
          value={constructorLeader?.teamName || '—'}
          detail={
            constructorLeader
              ? `${constructorLeader.points} points · P${constructorLeader.position}`
              : 'Awaiting team standings'
          }
          accent="cyan"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.25fr_0.75fr]">
        {/* Latest verified debrief */}
        <div className="border border-white/10 bg-graphite-light/30">
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
            <div className="flex items-center gap-2">
              <Trophy className="h-4 w-4 text-amber" />

              <h2 className="text-[11px] font-bold tracking-[0.18em] text-white uppercase">
                Latest Verified Debrief
              </h2>
            </div>

            <span className="text-[9px] tracking-wider text-white/30 uppercase">
              Officially completed
            </span>
          </div>

          <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2">
            <div>
              <p className="text-[9px] tracking-[0.14em] text-white/35 uppercase">
                Last Grand Prix
              </p>

              <p className="mt-2 text-lg font-semibold text-white">
                {latestMeeting?.meeting_name || 'No completed race yet'}
              </p>

              <p className="mt-1 text-[10px] text-white/40">
                {latestMeeting
                  ? `${latestMeeting.location}, ${latestMeeting.country_name}`
                  : 'Results are awaiting verified ingestion.'}
              </p>
            </div>

            <div className="border border-white/10 bg-black/20 px-4 py-3">
              <p className="text-[9px] tracking-[0.14em] text-white/35 uppercase">
                Winner status
              </p>

              {latestWeekend?.raceWinner ? (
                <>
                  <p className="mt-2 text-lg font-bold text-cyan">
                    {latestWeekend.raceWinner.driverAcronym}
                  </p>

                  <p className="mt-1 text-[10px] text-white/50">
                    {latestWeekend.raceWinner.driverName} ·{' '}
                    {latestWeekend.raceWinner.teamName}
                  </p>
                </>
              ) : (
                <>
                  <p className="mt-2 text-sm font-semibold text-amber">
                    PENDING VERIFICATION
                  </p>

                  <p className="mt-1 text-[10px] text-white/40">
                    No winner is displayed until a verified P1 result is indexed.
                  </p>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Grid signals */}
        <div className="border border-white/10 bg-graphite-light/30">
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-cyan" />

              <h2 className="text-[11px] font-bold tracking-[0.18em] text-white uppercase">
                Grid Signals
              </h2>
            </div>

            <span className="text-[9px] tracking-wider text-white/30 uppercase">
              Recent form
            </span>
          </div>

          <div className="grid grid-cols-1 gap-2 p-3">
            {gridSignals.length > 0 ? (
              gridSignals.map((driver) => (
                <DriverSignal key={driver.driverNumber} driver={driver} />
              ))
            ) : (
              <p className="px-2 py-6 text-center text-[10px] text-white/35">
                Awaiting verified standings.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Compact race radar */}
      <div className="border border-white/10 bg-graphite-light/30">
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <div className="flex items-center gap-2">
            <Gauge className="h-4 w-4 text-crimson" />

            <h2 className="text-[11px] font-bold tracking-[0.18em] text-white uppercase">
              Race Radar
            </h2>
          </div>

          <span className="text-[9px] tracking-wider text-white/30 uppercase">
            Recent + next events
          </span>
        </div>

        <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 xl:grid-cols-4">
          {radarRounds.length > 0 ? (
            radarRounds.map((weekend) => (
              <div
                key={weekend.meetingKey}
                className={`border p-3 ${getRoundStatusClasses(weekend.status)}`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[9px] tracking-wider text-white/35">
                    ROUND {String(weekend.round).padStart(2, '0')}
                  </span>

                  <span className={`text-[9px] font-bold ${getRoundStatusTextClasses(weekend.status)}`}>
                    {getRoundStatusLabel(weekend.status)}
                  </span>
                </div>

                <p className="mt-3 text-sm font-semibold text-white">
                  {weekend.meetingName}
                </p>

                <p className="mt-1 text-[10px] text-white/40">
                  {weekend.circuitShortName} · {weekend.country}
                </p>

                <p className="mt-3 text-[10px] text-white/45">
                  {weekend.status === 'completed' && weekend.raceWinner
                    ? `Winner: ${weekend.raceWinner.driverAcronym}`
                    : weekend.status === 'completed'
                      ? 'Result verification pending'
                      : formatEventDate(weekend.dateStart)}
                </p>
              </div>
            ))
          ) : (
            <p className="col-span-full py-8 text-center text-[10px] text-white/35">
              Race calendar is awaiting verified ingestion.
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 border-t border-white/10 px-4 py-3">
          <CheckCircle2 className="h-3.5 w-3.5 text-green-400" />

          <p className="text-[9px] tracking-wide text-white/35">
            COMPLETED EVENTS REQUIRE VERIFIED RESULTS. UPCOMING EVENTS DISPLAY
            CALENDAR INFORMATION ONLY.
          </p>
        </div>
      </div>
    </section>
  );
}