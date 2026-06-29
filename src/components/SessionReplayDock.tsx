import { useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  CloudSun,
  FastForward,
  Loader2,
  Pause,
  Play,
  Radio,
  RotateCcw,
  TimerReset,
} from 'lucide-react';

import type { OpenF1Meeting } from '../types/f1';
import type { ReplayDriverState, SessionReplayDataset } from '../types/liveSession';
import { sessionReplayService } from '../services/sessionReplayService';
import {
  isOpenF1PublicAccessRestriction,
  OpenF1Error,
} from '../services/openF1Client';
import { useSessionReplay, type ReplaySpeed } from '../hooks/useSessionReplay';

interface SessionReplayDockProps {
  meeting: OpenF1Meeting | null;
  activeMeeting?: OpenF1Meeting | null;
  onDriverSelect?: (driverNumber: number) => void;
  onTeamSelect?: (teamName: string) => void;
  onOpenCircuit?: (meetingKey: number) => void;
}

function formatReplayTime(value: string | null): string {
  if (!value) return '—';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';

  return date.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function formatGap(value: number | string | null): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'string') return value;
  return value === 0 ? 'LEADER' : `+${value.toFixed(3)}`;
}

function formatLap(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return '—';

  const minutes = Math.floor(value / 60);
  const seconds = value - minutes * 60;
  return `${minutes}:${seconds.toFixed(3).padStart(6, '0')}`;
}

function compoundClass(compound: string | null): string {
  if (compound === 'SOFT') return 'border-red-400/35 bg-red-400/[0.07] text-red-300';
  if (compound === 'MEDIUM') return 'border-amber/35 bg-amber/[0.07] text-amber';
  if (compound === 'HARD') return 'border-white/25 bg-white/[0.06] text-white/70';
  if (compound === 'INTERMEDIATE') return 'border-green-400/35 bg-green-400/[0.07] text-green-300';
  if (compound === 'WET') return 'border-cyan/35 bg-cyan/[0.07] text-cyan';
  return 'border-white/10 bg-white/[0.03] text-white/35';
}

function timingTone(driver: ReplayDriverState): string {
  if (driver.position === 1) return 'border-cyan/30 bg-cyan/[0.04]';
  if (driver.pitOutLap) return 'border-amber/30 bg-amber/[0.035]';
  return 'border-white/[0.09] bg-black/[0.16]';
}

export function SessionReplayDock({
  meeting,
  activeMeeting = null,
  onDriverSelect,
  onTeamSelect,
  onOpenCircuit,
}: SessionReplayDockProps) {
  const [dataset, setDataset] = useState<SessionReplayDataset | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [accessPaused, setAccessPaused] = useState(false);

  const replay = useSessionReplay(dataset);

  const sessionName = dataset?.session.session_name ?? 'RACE REPLAY';
  const currentWeather = replay.frame?.latestWeather ?? null;
  const drivers = replay.frame?.driverStates.slice(0, 8) ?? [];

  const eventStatus = useMemo(() => {
    if (!dataset && accessPaused) {
      return {
        label: 'PUBLIC REPLAY ACCESS PAUSED',
        detail: activeMeeting
          ? `${activeMeeting.meeting_name} is active. The replay is queued until public source access returns.`
          : 'The replay is queued until public source access returns.',
        tone: 'text-amber',
      };
    }

    if (!dataset) {
      return {
        label: 'REPLAY GATEWAY ARMED',
        detail: meeting
          ? `Load the verified ${meeting.meeting_name} race session.`
          : 'A completed Grand Prix is required before replay can load.',
        tone: 'text-cyan',
      };
    }

    if (replay.isPlaying) {
      return {
        label: 'REPLAY STREAM ACTIVE',
        detail: 'Historical session packets are being processed in sequence.',
        tone: 'text-green-400',
      };
    }

    return {
      label: 'REPLAY STREAM PAUSED',
      detail: 'Historical session state is held at the current timestamp.',
      tone: 'text-amber',
    };
  }, [accessPaused, activeMeeting, dataset, meeting, replay.isPlaying]);

  const handleLoad = async () => {
    if (!meeting || loading) return;

    setLoading(true);
    setErrorMessage(null);
    setAccessPaused(false);

    try {
      const nextDataset = await sessionReplayService.loadReplayForMeeting(meeting);
      setDataset(nextDataset);
    } catch (error) {
      const networkBlockedDuringActiveWeekend =
        activeMeeting !== null &&
        error instanceof OpenF1Error &&
        error.type === 'network_unavailable';

      const publicAccessPaused =
        isOpenF1PublicAccessRestriction(error) ||
        networkBlockedDuringActiveWeekend;

      setAccessPaused(publicAccessPaused);

      const message = publicAccessPaused
        ? activeMeeting
          ? `${meeting.meeting_name} replay is queued. Public OpenF1 requests are unavailable while ${activeMeeting.meeting_name} is active. Retry after the live session or when public source access returns.`
          : `${meeting.meeting_name} replay is queued until public OpenF1 source access returns.`
        : error instanceof Error
          ? error.message
          : 'Replay data could not be loaded from the verified source.';

      setErrorMessage(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="relative overflow-hidden border border-cyan/20 bg-[#091015]/88 shadow-[0_20px_55px_rgba(0,0,0,0.22)]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(0,212,255,0.07),transparent_26%),radial-gradient(circle_at_10%_100%,rgba(220,20,60,0.06),transparent_24%)]" />
      <div className="relative border-b border-white/[0.10] px-5 py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Radio className={`h-4 w-4 ${replay.isPlaying ? 'text-green-400 animate-pulse' : 'text-cyan'}`} />
            <div>
              <h2 className="text-[11px] font-bold tracking-[0.19em] text-white uppercase">
                Session Intelligence Replay
              </h2>
              <p className="mt-0.5 text-[8px] tracking-[0.14em] text-white/35 uppercase">
                Real historical timing, race control, pit, stint and weather data
              </p>
            </div>
          </div>

          <span className={`text-[9px] font-semibold tracking-[0.15em] ${eventStatus.tone}`}>
            {eventStatus.label}
          </span>
        </div>
      </div>

      {!dataset ? (
        <div className="relative grid grid-cols-1 gap-5 p-5 lg:grid-cols-[1.25fr_0.75fr]">
          <div className="border border-white/[0.09] bg-black/[0.18] p-5">
            <p className="text-[10px] font-semibold tracking-[0.15em] text-cyan uppercase">
              Historical Session Gateway
            </p>
            <h3 className="mt-3 text-2xl font-black tracking-[0.04em] text-white">
              {meeting?.meeting_name || 'No completed Grand Prix selected'}
            </h3>
            <p className="mt-3 max-w-2xl text-[11px] leading-relaxed text-white/50">
              Load a completed race to drive the Command Centre from real historical
              event data. Playback processes actual position signals, interval
              updates, laps, pit activity, race-control messages, tyre stints and
              weather observations.
            </p>

            {errorMessage && (
              <div
                className={`mt-4 flex items-start gap-2 border p-3 ${
                  accessPaused
                    ? 'border-amber/25 bg-amber/[0.04]'
                    : 'border-red-400/20 bg-red-400/[0.04]'
                }`}
              >
                <AlertTriangle
                  className={`mt-0.5 h-4 w-4 shrink-0 ${
                    accessPaused ? 'text-amber' : 'text-red-400'
                  }`}
                />
                <div>
                  {accessPaused && (
                    <p className="text-[9px] font-semibold tracking-[0.13em] text-amber">
                      LIVE SESSION ACCESS RESTRICTION
                    </p>
                  )}
                  <p
                    className={`text-[10px] leading-relaxed ${
                      accessPaused ? 'mt-1 text-amber/85' : 'text-red-300'
                    }`}
                  >
                    {errorMessage}
                  </p>
                </div>
              </div>
            )}

            <button
              onClick={handleLoad}
              disabled={!meeting || loading}
              className="mt-5 inline-flex items-center gap-2 border border-cyan/35 bg-cyan/[0.07] px-4 py-3 text-[10px] font-semibold tracking-[0.15em] text-cyan transition-colors hover:bg-cyan/[0.12] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Activity className="h-4 w-4" />}
              {loading
                ? 'LOADING VERIFIED SESSION'
                : accessPaused
                  ? 'RETRY REPLAY ACCESS'
                  : 'LOAD RACE REPLAY'}
            </button>
          </div>

          <div className="border border-white/[0.09] bg-black/[0.18] p-5">
            <p className="text-[9px] tracking-[0.15em] text-white/35 uppercase">
              Replay Capabilities
            </p>
            <div className="mt-4 space-y-3">
              {[
                'Timing matrix updates from historical position signals',
                'Session event bus from race-control and pit events',
                'Lap, gap, stint and weather state at each replay timestamp',
                'Playback speed and timeline scrub controls',
              ].map((item) => (
                <div key={item} className="flex gap-2 text-[10px] leading-relaxed text-white/50">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan shadow-[0_0_8px_rgba(0,212,255,0.7)]" />
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="relative">
          <div className="grid grid-cols-1 border-b border-white/[0.10] xl:grid-cols-[1.15fr_0.85fr]">
            <div className="border-b border-white/[0.10] p-5 xl:border-b-0 xl:border-r">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-[9px] tracking-[0.15em] text-cyan uppercase">
                    {sessionName} // verified replay stream
                  </p>
                  <p className="mt-2 text-2xl font-black tracking-[0.04em] text-white">
                    {meeting?.meeting_name}
                  </p>
                  <p className="mt-2 text-[10px] text-white/45">
                    SESSION CLOCK · {formatReplayTime(replay.frame?.currentTime ?? null)}
                    {' · '}LAP {replay.frame?.currentLap || '—'}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={replay.toggle}
                    className="flex h-10 w-10 items-center justify-center border border-cyan/30 bg-cyan/[0.06] text-cyan hover:bg-cyan/[0.12]"
                    title={replay.isPlaying ? 'Pause replay' : 'Play replay'}
                  >
                    {replay.isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  </button>

                  <button
                    onClick={replay.reset}
                    className="flex h-10 w-10 items-center justify-center border border-white/15 text-white/55 hover:border-white/30 hover:text-white"
                    title="Reset replay"
                  >
                    <RotateCcw className="h-4 w-4" />
                  </button>

                  <button
                    onClick={() => setDataset(null)}
                    className="border border-white/15 px-3 py-2.5 text-[9px] tracking-[0.13em] text-white/55 hover:border-white/30 hover:text-white"
                  >
                    CLOSE
                  </button>
                </div>
              </div>

              <input
                aria-label="Replay timeline"
                type="range"
                min="0"
                max="1"
                step="0.001"
                value={replay.progress}
                onChange={(event) => replay.seek(Number(event.target.value))}
                className="mt-6 h-1 w-full cursor-pointer accent-cyan"
              />

              <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                <p className="text-[9px] tracking-[0.14em] text-white/35">
                  PLAYBACK {Math.round(replay.progress * 100)}%
                </p>

                <div className="flex items-center gap-1.5">
                  {([0.5, 1, 2, 4] as ReplaySpeed[]).map((speed) => (
                    <button
                      key={speed}
                      onClick={() => replay.setSpeed(speed)}
                      className={`border px-2.5 py-1 text-[9px] tracking-[0.11em] ${
                        replay.speed === speed
                          ? 'border-amber/40 bg-amber/[0.09] text-amber'
                          : 'border-white/10 text-white/40 hover:text-white'
                      }`}
                    >
                      {speed}x
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-5">
              <div className="flex items-center gap-2">
                <CloudSun className="h-4 w-4 text-cyan" />
                <p className="text-[10px] font-semibold tracking-[0.15em] text-white uppercase">
                  Session Conditions
                </p>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="border border-white/[0.09] bg-black/[0.18] p-3">
                  <p className="text-[8px] tracking-[0.13em] text-white/35">TRACK TEMP</p>
                  <p className="mt-2 text-xl font-black text-cyan">
                    {currentWeather?.track_temperature !== null &&
                    currentWeather?.track_temperature !== undefined
                      ? `${currentWeather.track_temperature.toFixed(1)}°`
                      : '—'}
                  </p>
                </div>

                <div className="border border-white/[0.09] bg-black/[0.18] p-3">
                  <p className="text-[8px] tracking-[0.13em] text-white/35">AIR TEMP</p>
                  <p className="mt-2 text-xl font-black text-white">
                    {currentWeather?.air_temperature !== null &&
                    currentWeather?.air_temperature !== undefined
                      ? `${currentWeather.air_temperature.toFixed(1)}°`
                      : '—'}
                  </p>
                </div>

                <div className="border border-white/[0.09] bg-black/[0.18] p-3">
                  <p className="text-[8px] tracking-[0.13em] text-white/35">RAINFALL</p>
                  <p className={`mt-2 text-sm font-black ${currentWeather?.rainfall ? 'text-amber' : 'text-green-400'}`}>
                    {currentWeather?.rainfall ? 'DETECTED' : 'DRY / NONE'}
                  </p>
                </div>

                <div className="border border-white/[0.09] bg-black/[0.18] p-3">
                  <p className="text-[8px] tracking-[0.13em] text-white/35">WIND</p>
                  <p className="mt-2 text-xl font-black text-white">
                    {currentWeather?.wind_speed !== null &&
                    currentWeather?.wind_speed !== undefined
                      ? `${currentWeather.wind_speed.toFixed(1)}`
                      : '—'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-[1.12fr_0.88fr]">
            <div className="border-b border-white/[0.10] p-4 xl:border-b-0 xl:border-r">
              <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
                <div className="flex items-center gap-2">
                  <TimerReset className="h-4 w-4 text-cyan" />
                  <p className="text-[10px] font-semibold tracking-[0.15em] text-white uppercase">
                    Dynamic Timing Matrix
                  </p>
                </div>
                <p className="text-[8px] tracking-[0.14em] text-white/35">TOP 8 SIGNALS</p>
              </div>

              <div className="mt-3 grid gap-2">
                {drivers.map((driver) => (
  <div
  key={driver.driverNumber}
  className={`grid grid-cols-[52px_1fr_auto] items-center gap-3 border px-3 py-3 ${timingTone(
    driver
  )}`}
>
  <div className="flex items-center gap-2">
    <span className="text-lg font-black text-cyan">
      P{driver.position}
    </span>

    <span className="h-6 w-px bg-white/10" />
  </div>

  <button
    type="button"
    onClick={() => onDriverSelect?.(driver.driverNumber)}
    disabled={!onDriverSelect}
    className="group min-w-0 text-left disabled:cursor-default"
    title={`Open ${driver.acronym} Driver Intel`}
  >
    <p className="text-[11px] font-bold tracking-[0.08em] text-white">
      {driver.acronym}

      <span className="ml-2 text-[9px] font-normal text-white/35">
        {driver.teamName}
      </span>
    </p>

    <p className="mt-1 text-[9px] text-white/40">
      GAP {formatGap(driver.gapToLeader)} · LAST{' '}
      {formatLap(driver.lastLapDuration)}
    </p>

    <span className="mt-1 block text-[8px] font-semibold tracking-[0.12em] text-cyan/75 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
      OPEN DRIVER INTEL
    </span>
  </button>

  <div className="flex items-center gap-2">
    <button
      type="button"
      onClick={() => onTeamSelect?.(driver.teamName)}
      disabled={!onTeamSelect}
      className="border border-crimson/25 bg-crimson/[0.03] px-2 py-1 text-[8px] font-semibold tracking-[0.1em] text-crimson transition-colors hover:bg-crimson/[0.08] disabled:cursor-default disabled:opacity-40"
      title={`Open ${driver.teamName} Team Performance`}
    >
      TEAM
    </button>

    {driver.compound && (
      <span
        className={`border px-2 py-1 text-[8px] font-semibold tracking-[0.1em] ${compoundClass(
          driver.compound
        )}`}
      >
        {driver.compound.slice(0, 1)}
      </span>
    )}

    <span className="font-mono text-[9px] text-white/40">
      L{driver.currentLap ?? '—'}
    </span>
  </div>
</div>
))}
              </div>
            </div>

            <div className="p-4">
              <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
                <div className="flex items-center gap-2">
                  <FastForward className={`h-4 w-4 ${replay.isPlaying ? 'text-green-400 animate-pulse' : 'text-amber'}`} />
                  <p className="text-[10px] font-semibold tracking-[0.15em] text-white uppercase">
                    Replay Event Bus
                  </p>
                </div>
                <p className="text-[8px] tracking-[0.14em] text-white/35">
                  VERIFIED EVENTS
                </p>
              </div>

              <div className="mt-3 space-y-2">
                {replay.frame?.latestEvents.length ? (
                  replay.frame.latestEvents.map((event) => (
                    <button
  key={event.id}
  type="button"
  onClick={() => {
    if (meeting) {
      onOpenCircuit?.(meeting.meeting_key);
    }
  }}
  disabled={!meeting || !onOpenCircuit}
  className="group w-full border border-white/[0.08] bg-black/[0.16] px-3 py-3 text-left transition-colors hover:border-amber/35 hover:bg-amber/[0.025] disabled:cursor-default"
  title={
    meeting
      ? `Open ${meeting.meeting_name} in Circuit Matrix`
      : 'Circuit Matrix unavailable'
  }
>
  <div className="flex items-center justify-between gap-3">
    <p
      className={`text-[9px] font-semibold tracking-[0.12em] ${
        event.tone === 'crimson'
          ? 'text-crimson'
          : event.tone === 'amber'
            ? 'text-amber'
            : event.tone === 'green'
              ? 'text-green-400'
              : 'text-cyan'
      }`}
    >
      {event.headline}
    </p>

    <span className="font-mono text-[8px] text-white/35">
      {formatReplayTime(event.date)}
    </span>
  </div>

  <p className="mt-1 text-[9px] leading-relaxed text-white/45">
    {event.detail}
  </p>

  <span className="mt-2 block text-[8px] font-semibold tracking-[0.12em] text-amber/75 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
    OPEN REPLAY EVENT IN CIRCUIT MATRIX
  </span>
</button>
                  ))
                ) : (
                  <div className="border border-dashed border-white/10 px-4 py-12 text-center">
                    <p className="text-[9px] tracking-[0.13em] text-white/35">
                      PLAY THE REPLAY TO PROCESS VERIFIED SESSION EVENTS
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
