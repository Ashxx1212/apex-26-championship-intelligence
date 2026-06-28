import { openF1Client, OpenF1Error } from './openF1Client';
import type { OpenF1Meeting, OpenF1Session } from '../types/f1';
import type {
  OpenF1Interval,
  OpenF1Lap,
  OpenF1Pit,
  OpenF1Position,
  OpenF1RaceControl,
  OpenF1Stint,
  OpenF1Weather,
  ReplayEvent,
  SessionReplayDataset,
} from '../types/liveSession';
import type { OpenF1Driver } from '../types/f1';

function toTimestamp(value: string): number {
  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
}

function formatDuration(seconds: number | null): string {
  if (seconds === null || !Number.isFinite(seconds)) return '—';
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds - minutes * 60;
  return `${minutes}:${remainingSeconds.toFixed(3).padStart(6, '0')}`;
}

function getEventTone(
  kind: ReplayEvent['kind'],
  message = ''
): ReplayEvent['tone'] {
  const upper = message.toUpperCase();

  if (kind === 'pit') return 'amber';
  if (kind === 'weather') return 'cyan';
  if (kind === 'position') return 'green';
  if (
    upper.includes('RED FLAG') ||
    upper.includes('SAFETY CAR') ||
    upper.includes('VIRTUAL SAFETY CAR')
  ) {
    return 'crimson';
  }

  if (upper.includes('YELLOW')) return 'amber';
  return kind === 'race_control' ? 'cyan' : 'muted';
}

function normaliseRaceControlEvent(item: OpenF1RaceControl): ReplayEvent {
  const label = [item.flag, item.category].filter(Boolean).join(' · ') || 'RACE CONTROL';
  const driverText = item.driver_number ? `DRIVER #${item.driver_number}` : 'TRACK CONTROL';

  return {
    id: `rc-${item.date}-${item.driver_number ?? 'track'}-${item.message}`,
    date: item.date,
    kind: 'race_control',
    driverNumber: item.driver_number ?? null,
    headline: label.toUpperCase(),
    detail: item.message || driverText,
    tone: getEventTone('race_control', `${label} ${item.message}`),
  };
}

function buildReplayEvents(
  laps: OpenF1Lap[],
  pits: OpenF1Pit[],
  raceControl: OpenF1RaceControl[],
  positions: OpenF1Position[],
  weather: OpenF1Weather[]
): ReplayEvent[] {
  const events: ReplayEvent[] = [];

  raceControl.forEach((item) => events.push(normaliseRaceControlEvent(item)));

  pits.forEach((item) => {
    events.push({
      id: `pit-${item.date}-${item.driver_number}`,
      date: item.date,
      kind: 'pit',
      driverNumber: item.driver_number,
      headline: `PIT EVENT · #${item.driver_number}`,
      detail: item.stop_duration
        ? `Stationary stop ${item.stop_duration.toFixed(1)}s · lap ${item.lap_number ?? '—'}`
        : `Pit-lane activity · lap ${item.lap_number ?? '—'}`,
      tone: 'amber',
    });
  });

  laps.forEach((item) => {
    if (!item.lap_duration) return;

    const eventTime = new Date(
      toTimestamp(item.date_start) + item.lap_duration * 1000
    ).toISOString();

    events.push({
      id: `lap-${item.driver_number}-${item.lap_number}-${item.date_start}`,
      date: eventTime,
      kind: 'lap',
      driverNumber: item.driver_number,
      headline: `LAP ${item.lap_number} RECORDED · #${item.driver_number}`,
      detail: `Lap time ${formatDuration(item.lap_duration)}${
        item.is_pit_out_lap ? ' · pit-out lap' : ''
      }`,
      tone: 'muted',
    });
  });

  positions.forEach((item) => {
    events.push({
      id: `position-${item.date}-${item.driver_number}-${item.position}`,
      date: item.date,
      kind: 'position',
      driverNumber: item.driver_number,
      headline: `POSITION SIGNAL · #${item.driver_number}`,
      detail: `Running P${item.position}`,
      tone: 'green',
    });
  });

  weather.forEach((item) => {
    const fields = [
      item.track_temperature !== null
        ? `track ${item.track_temperature.toFixed(1)}°C`
        : null,
      item.air_temperature !== null
        ? `air ${item.air_temperature.toFixed(1)}°C`
        : null,
      item.rainfall ? 'rainfall detected' : null,
    ].filter(Boolean);

    if (fields.length === 0) return;

    events.push({
      id: `weather-${item.date}`,
      date: item.date,
      kind: 'weather',
      driverNumber: null,
      headline: 'WEATHER SIGNAL',
      detail: fields.join(' · '),
      tone: 'cyan',
    });
  });

  return events
    .sort((a, b) => toTimestamp(a.date) - toTimestamp(b.date))
    .filter((event, index, source) => {
      if (event.kind !== 'position') return true;
      const prior = source[index - 1];
      return !prior || prior.driverNumber !== event.driverNumber || prior.detail !== event.detail;
    });
}

function resolveReplayEnd(
  session: OpenF1Session,
  positions: OpenF1Position[],
  laps: OpenF1Lap[],
  raceControl: OpenF1RaceControl[],
  weather: OpenF1Weather[]
): string {
  const candidateDates = [
    session.date_end,
    ...positions.map((item) => item.date),
    ...laps.map((item) => item.date_start),
    ...raceControl.map((item) => item.date),
    ...weather.map((item) => item.date),
  ].filter(Boolean);

  const latest = candidateDates.reduce((latestValue, value) => {
    return toTimestamp(value) > toTimestamp(latestValue) ? value : latestValue;
  }, session.date_start);

  return latest;
}

export const sessionReplayService = {
  async getRaceSession(meetingKey: number): Promise<OpenF1Session> {
    const sessions = await openF1Client.get<OpenF1Session[]>(
      `/sessions?meeting_key=${meetingKey}`
    );

    const race = sessions.find((session) => session.session_name === 'Race');
    if (!race) {
      throw OpenF1Error.noData();
    }

    return race;
  },

  async loadReplayForMeeting(meeting: OpenF1Meeting): Promise<SessionReplayDataset> {
    const session = await this.getRaceSession(meeting.meeting_key);

    const [
      drivers,
      positions,
      intervals,
      laps,
      pits,
      raceControl,
      stints,
      weather,
    ] = await Promise.all([
      openF1Client.get<OpenF1Driver[]>(`/drivers?session_key=${session.session_key}`),
      openF1Client.get<OpenF1Position[]>(`/position?session_key=${session.session_key}`),
      openF1Client.get<OpenF1Interval[]>(`/intervals?session_key=${session.session_key}`),
      openF1Client.get<OpenF1Lap[]>(`/laps?session_key=${session.session_key}`),
      openF1Client.get<OpenF1Pit[]>(`/pit?session_key=${session.session_key}`),
      openF1Client.get<OpenF1RaceControl[]>(`/race_control?session_key=${session.session_key}`),
      openF1Client.get<OpenF1Stint[]>(`/stints?session_key=${session.session_key}`),
      openF1Client.get<OpenF1Weather[]>(`/weather?session_key=${session.session_key}`),
    ]);

    const events = buildReplayEvents(laps, pits, raceControl, positions, weather);
    const endTime = resolveReplayEnd(session, positions, laps, raceControl, weather);

    return {
      session,
      drivers,
      positions: [...positions].sort((a, b) => toTimestamp(a.date) - toTimestamp(b.date)),
      intervals: [...intervals].sort((a, b) => toTimestamp(a.date) - toTimestamp(b.date)),
      laps: [...laps].sort((a, b) => toTimestamp(a.date_start) - toTimestamp(b.date_start)),
      pits: [...pits].sort((a, b) => toTimestamp(a.date) - toTimestamp(b.date)),
      raceControl: [...raceControl].sort((a, b) => toTimestamp(a.date) - toTimestamp(b.date)),
      stints,
      weather: [...weather].sort((a, b) => toTimestamp(a.date) - toTimestamp(b.date)),
      events,
      startTime: session.date_start,
      endTime,
    };
  },
};
