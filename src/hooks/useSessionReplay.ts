import { useEffect, useMemo, useState } from 'react';
import type {
  OpenF1Interval,
  OpenF1Lap,
  OpenF1Position,
  OpenF1Stint,
  OpenF1Weather,
  ReplayDriverState,
  SessionReplayDataset,
  SessionReplayFrame,
} from '../types/liveSession';

export type ReplaySpeed = 0.5 | 1 | 2 | 4;

function timestamp(value: string): number {
  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
}

function lastAtOrBefore<T extends { date: string }>(
  source: T[],
  replayMs: number
): T | null {
  let result: T | null = null;

  for (const item of source) {
    if (timestamp(item.date) > replayMs) break;
    result = item;
  }

  return result;
}

function lastLapAtOrBefore(
  source: OpenF1Lap[],
  replayMs: number
): OpenF1Lap | null {
  let result: OpenF1Lap | null = null;

  for (const item of source) {
    if (timestamp(item.date_start) > replayMs) break;
    result = item;
  }

  return result;
}

function findActiveStint(
  stints: OpenF1Stint[],
  lapNumber: number | null
): OpenF1Stint | null {
  if (lapNumber === null) return null;

  return (
    stints.find(
      (stint) =>
        stint.lap_start <= lapNumber &&
        (stint.lap_end === null || stint.lap_end >= lapNumber)
    ) ?? null
  );
}

function formatFrame(
  dataset: SessionReplayDataset,
  replayMs: number
): SessionReplayFrame {
  const positionsByDriver = new Map<number, OpenF1Position[]>();
  const intervalsByDriver = new Map<number, OpenF1Interval[]>();
  const lapsByDriver = new Map<number, OpenF1Lap[]>();
  const stintsByDriver = new Map<number, OpenF1Stint[]>();

  dataset.positions.forEach((item) => {
    const list = positionsByDriver.get(item.driver_number) ?? [];
    list.push(item);
    positionsByDriver.set(item.driver_number, list);
  });

  dataset.intervals.forEach((item) => {
    const list = intervalsByDriver.get(item.driver_number) ?? [];
    list.push(item);
    intervalsByDriver.set(item.driver_number, list);
  });

  dataset.laps.forEach((item) => {
    const list = lapsByDriver.get(item.driver_number) ?? [];
    list.push(item);
    lapsByDriver.set(item.driver_number, list);
  });

  dataset.stints.forEach((item) => {
    const list = stintsByDriver.get(item.driver_number) ?? [];
    list.push(item);
    stintsByDriver.set(item.driver_number, list);
  });

  const driverStates: ReplayDriverState[] = dataset.drivers
    .map((driver) => {
      const position = lastAtOrBefore(
        positionsByDriver.get(driver.driver_number) ?? [],
        replayMs
      );
      const interval = lastAtOrBefore(
        intervalsByDriver.get(driver.driver_number) ?? [],
        replayMs
      );
      const lap = lastLapAtOrBefore(
        lapsByDriver.get(driver.driver_number) ?? [],
        replayMs
      );
      const stint = findActiveStint(
        stintsByDriver.get(driver.driver_number) ?? [],
        lap?.lap_number ?? null
      );

      return {
        driverNumber: driver.driver_number,
        acronym: driver.name_acronym || String(driver.driver_number),
        driverName: driver.full_name,
        teamName: driver.team_name,
        teamColour: driver.team_colour || 'ffffff',
        position: position?.position ?? null,
        gapToLeader: interval?.gap_to_leader ?? null,
        interval: interval?.interval ?? null,
        currentLap: lap?.lap_number ?? null,
        lastLapDuration: lap?.lap_duration ?? null,
        compound: stint?.compound ?? null,
        stintNumber: stint?.stint_number ?? null,
        pitOutLap: Boolean(lap?.is_pit_out_lap),
      };
    })
    .filter((driver) => driver.position !== null)
    .sort((a, b) => (a.position ?? 999) - (b.position ?? 999));

  const latestWeather = lastAtOrBefore<OpenF1Weather>(dataset.weather, replayMs);

  const latestEvents = dataset.events
    .filter((event) => timestamp(event.date) <= replayMs)
    .slice(-5)
    .reverse();

  const currentLap = driverStates.reduce(
    (highest, driver) => Math.max(highest, driver.currentLap ?? 0),
    0
  );

  const startMs = timestamp(dataset.startTime);
  const endMs = timestamp(dataset.endTime);
  const totalMs = Math.max(1, endMs - startMs);
  const elapsedMs = Math.max(0, replayMs - startMs);

  return {
    currentTime: new Date(replayMs).toISOString(),
    progress: Math.min(1, elapsedMs / totalMs),
    elapsedMs,
    totalMs,
    driverStates,
    latestEvents,
    latestWeather,
    currentLap,
  };
}

export function useSessionReplay(dataset: SessionReplayDataset | null) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState<ReplaySpeed>(1);
  const [progress, setProgress] = useState(0);

  const startMs = dataset ? timestamp(dataset.startTime) : 0;
  const endMs = dataset ? timestamp(dataset.endTime) : 0;
  const totalMs = Math.max(0, endMs - startMs);

  useEffect(() => {
    setIsPlaying(false);
    setProgress(0);
  }, [dataset?.session.session_key]);

  useEffect(() => {
    if (!dataset || !isPlaying || totalMs <= 0) return;

    const timer = window.setInterval(() => {
      setProgress((current) => {
        const next = current + (250 * speed) / totalMs;
        if (next >= 1) {
          setIsPlaying(false);
          return 1;
        }
        return next;
      });
    }, 250);

    return () => window.clearInterval(timer);
  }, [dataset, isPlaying, speed, totalMs]);

  const frame = useMemo(() => {
    if (!dataset) return null;
    return formatFrame(dataset, startMs + totalMs * progress);
  }, [dataset, progress, startMs, totalMs]);

  return {
    frame,
    isPlaying,
    speed,
    progress,
    play: () => setIsPlaying(true),
    pause: () => setIsPlaying(false),
    toggle: () => setIsPlaying((value) => !value),
    setSpeed,
    seek: (nextProgress: number) =>
      setProgress(Math.min(1, Math.max(0, nextProgress))),
    reset: () => {
      setIsPlaying(false);
      setProgress(0);
    },
  };
}
