import type { OpenF1Driver, OpenF1Session } from './f1';

export interface OpenF1Position {
  date: string;
  driver_number: number;
  meeting_key: number;
  position: number;
  session_key: number;
}

export interface OpenF1Interval {
  date: string;
  driver_number: number;
  gap_to_leader: number | string | null;
  interval: number | string | null;
  meeting_key: number;
  session_key: number;
}

export interface OpenF1Lap {
  date_start: string;
  driver_number: number;
  duration_sector_1: number | null;
  duration_sector_2: number | null;
  duration_sector_3: number | null;
  i1_speed: number | null;
  i2_speed: number | null;
  is_pit_out_lap: boolean | null;
  lap_duration: number | null;
  lap_number: number;
  meeting_key: number;
  session_key: number;
  st_speed: number | null;
}

export interface OpenF1Pit {
  date: string;
  driver_number: number;
  lane_duration: number | null;
  lap_number: number | null;
  meeting_key: number;
  pit_duration?: number | null;
  session_key: number;
  stop_duration: number | null;
}

export interface OpenF1RaceControl {
  category?: string | null;
  date: string;
  driver_number?: number | null;
  flag?: string | null;
  lap_number?: number | null;
  meeting_key: number;
  message: string;
  scope?: string | null;
  sector?: number | null;
  session_key: number;
}

export interface OpenF1Stint {
  compound: string;
  driver_number: number;
  lap_end: number | null;
  lap_start: number;
  meeting_key: number;
  session_key: number;
  stint_number: number;
  tyre_age_at_start: number | null;
}

export interface OpenF1Weather {
  air_temperature: number | null;
  date: string;
  humidity: number | null;
  meeting_key: number;
  pressure: number | null;
  rainfall: number | null;
  session_key: number;
  track_temperature: number | null;
  wind_direction: number | null;
  wind_speed: number | null;
}

export type ReplayEventKind =
  | 'lap'
  | 'pit'
  | 'race_control'
  | 'position'
  | 'weather';

export interface ReplayEvent {
  id: string;
  date: string;
  kind: ReplayEventKind;
  driverNumber: number | null;
  headline: string;
  detail: string;
  tone: 'cyan' | 'amber' | 'crimson' | 'green' | 'muted';
}

export interface ReplayDriverState {
  driverNumber: number;
  acronym: string;
  driverName: string;
  teamName: string;
  teamColour: string;
  position: number | null;
  gapToLeader: number | string | null;
  interval: number | string | null;
  currentLap: number | null;
  lastLapDuration: number | null;
  compound: string | null;
  stintNumber: number | null;
  pitOutLap: boolean;
}

export interface SessionReplayDataset {
  session: OpenF1Session;
  drivers: OpenF1Driver[];
  positions: OpenF1Position[];
  intervals: OpenF1Interval[];
  laps: OpenF1Lap[];
  pits: OpenF1Pit[];
  raceControl: OpenF1RaceControl[];
  stints: OpenF1Stint[];
  weather: OpenF1Weather[];
  events: ReplayEvent[];
  startTime: string;
  endTime: string;
}

export interface SessionReplayFrame {
  currentTime: string;
  progress: number;
  elapsedMs: number;
  totalMs: number;
  driverStates: ReplayDriverState[];
  latestEvents: ReplayEvent[];
  latestWeather: OpenF1Weather | null;
  currentLap: number;
}
