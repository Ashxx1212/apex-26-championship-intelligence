import { supabase } from '../supabaseClient';
import type {
  AnalyticsArchiveStatus,
  AnalyticsCoverageSummary,
  ChampionshipDataSnapshot,
  DriverStanding,
  OpenF1Driver,
  OpenF1Meeting,
  RaceResult,
  RaceStatus,
  RaceWeekendSnapshot,
  TeamStanding,
} from '../types/f1';

type DbMeeting = {
  meeting_key: number;
  season: number;
  round_number: number | null;
  meeting_name: string;
  meeting_official_name: string | null;
  location: string | null;
  country_name: string | null;
  country_code: string | null;
  circuit_key: number | null;
  circuit_short_name: string | null;
  circuit_type: string | null;
  date_start: string | null;
  date_end: string | null;
  source_updated_at: string | null;
  updated_at: string | null;
};

type DbTeam = {
  id: string;
  season: number;
  team_name: string;
  team_colour: string | null;
  updated_at: string | null;
};

type DbDriver = {
  id: string;
  season: number;
  driver_number: number;
  full_name: string;
  broadcast_name: string | null;
  name_acronym: string | null;
  first_name: string | null;
  last_name: string | null;
  country_code: string | null;
  headshot_url: string | null;
  current_team_id: string | null;
  updated_at: string | null;
};

type DbDriverStanding = {
  season: number;
  driver_id: string;
  championship_position: number;
  points: number | string;
  wins: number | null;
  gap_to_leader: number | string | null;
  source_meeting_key: number | null;
  snapshot_at: string | null;
};

type DbTeamStanding = {
  season: number;
  team_id: string;
  championship_position: number;
  points: number | string;
  wins: number;
  gap_to_leader: number | string | null;
  performance_index: number | string | null;
  source_meeting_key: number | null;
  snapshot_at: string | null;
  updated_at: string | null;
};

type DbRaceResult = {
  meeting_key: number;
  driver_id: string;
  team_id: string | null;
  race_session_key: number;
  qualifying_session_key: number | null;
  race_position: number | null;
  qualifying_position: number | null;
  race_status: string;
  points: number | string;
  laps_completed: number | null;
  gap_to_leader: string | null;
  source_verified_at: string | null;
  updated_at: string | null;
};

function toNumber(value: number | string | null | undefined): number {
  const parsed = typeof value === 'number' ? value : Number(value);

  return Number.isFinite(parsed) ? parsed : 0;
}

function getTimestamp(value: string | null | undefined): number | null {
  if (!value) return null;

  const timestamp = Date.parse(value);

  return Number.isNaN(timestamp) ? null : timestamp;
}

function safeDate(value: string | null | undefined): string {
  return value ?? new Date(0).toISOString();
}

function normaliseTeamName(value: string) {
  return value.trim().toLowerCase();
}

function toRaceStatus(value: string): RaceStatus {
  if (value === 'dnf' || value === 'dns' || value === 'dsq') {
    return value;
  }

  return 'finished';
}

function getMeetingStatus(
  meeting: DbMeeting,
  now: number,
): 'completed' | 'active' | 'upcoming' {
  const startTime = getTimestamp(meeting.date_start);
  const endTime = getTimestamp(meeting.date_end);

  if (endTime !== null && endTime < now) {
    return 'completed';
  }

  if (
    startTime !== null &&
    endTime !== null &&
    startTime <= now &&
    endTime >= now
  ) {
    return 'active';
  }

  return 'upcoming';
}

function toOpenF1Meeting(meeting: DbMeeting): OpenF1Meeting {
  return {
    meeting_key: meeting.meeting_key,
    meeting_name: meeting.meeting_name,
    meeting_official_name:
      meeting.meeting_official_name ?? meeting.meeting_name,
    location: meeting.location ?? '',
    country_name: meeting.country_name ?? '',
    country_code: meeting.country_code ?? '',
    circuit_key: meeting.circuit_key ?? 0,
    circuit_short_name: meeting.circuit_short_name ?? meeting.meeting_name,
    date_start: safeDate(meeting.date_start),
    date_end: safeDate(meeting.date_end),
    year: meeting.season,
    meeting_code: String(meeting.meeting_key),
    circuit_type: meeting.circuit_type ?? 'road',
  };
}

function toRacePerson(driver: OpenF1Driver | null) {
  if (!driver) {
    return null;
  }

  return {
    driverNumber: driver.driver_number,
    driverName: driver.full_name,
    driverAcronym: driver.name_acronym,
    teamName: driver.team_name,
  };
}

function getLatestTimestamp(values: Array<string | null | undefined>) {
  const validValues = values.filter(
    (value): value is string =>
      Boolean(value) && getTimestamp(value) !== null,
  );

  if (validValues.length === 0) {
    return new Date().toISOString();
  }

  return validValues.sort(
    (left, right) => (getTimestamp(right) ?? 0) - (getTimestamp(left) ?? 0),
  )[0];
}

export const supabaseChampionshipService = {
  async fetchSnapshot(
    season: number = 2026,
    onProgress?: (message: string) => void,
  ): Promise<{
    data: ChampionshipDataSnapshot | null;
    error: Error | null;
  }> {
    try {
      onProgress?.('Reading synced Supabase championship data...');

      const [
        meetingsResponse,
        teamsResponse,
        driversResponse,
        driverStandingsResponse,
        teamStandingsResponse,
        raceResultsResponse,
      ] = await Promise.all([
        supabase
          .from('meetings')
          .select('*')
          .eq('season', season)
          .order('date_start', { ascending: true }),
        supabase
          .from('teams')
          .select('*')
          .eq('season', season)
          .order('team_name', { ascending: true }),
        supabase
          .from('drivers')
          .select('*')
          .eq('season', season)
          .order('driver_number', { ascending: true }),
        supabase
          .from('driver_standings')
          .select('*')
          .eq('season', season)
          .order('championship_position', { ascending: true }),
        supabase
          .from('team_standings')
          .select('*')
          .eq('season', season)
          .order('championship_position', { ascending: true }),
        supabase
          .from('race_results')
          .select('*')
          .order('meeting_key', { ascending: true }),
      ]);

      const firstError =
        meetingsResponse.error ??
        teamsResponse.error ??
        driversResponse.error ??
        driverStandingsResponse.error ??
        teamStandingsResponse.error ??
        raceResultsResponse.error;

      if (firstError) {
        throw new Error(firstError.message);
      }

      const meetings = (meetingsResponse.data ?? []) as DbMeeting[];
      const teams = (teamsResponse.data ?? []) as DbTeam[];
      const drivers = (driversResponse.data ?? []) as DbDriver[];
      const driverStandings = (
        driverStandingsResponse.data ?? []
      ) as DbDriverStanding[];
      const teamStandings = (teamStandingsResponse.data ??
        []) as DbTeamStanding[];
      const raceResultsRows = (raceResultsResponse.data ??
        []) as DbRaceResult[];

      const coreTablesAreIncomplete =
        meetings.length === 0 ||
        teams.length === 0 ||
        drivers.length === 0 ||
        driverStandings.length === 0 ||
        teamStandings.length === 0;

      if (coreTablesAreIncomplete) {
        return {
          data: null,
          error: new Error(
            'Supabase core championship tables are not populated yet.',
          ),
        };
      }

      const now = Date.now();

      const sortedMeetings = [...meetings].sort(
        (left, right) =>
          (getTimestamp(left.date_start) ?? 0) -
          (getTimestamp(right.date_start) ?? 0),
      );

      const meetingByKey = new Map<number, DbMeeting>();
      const roundByMeetingKey = new Map<number, number>();

      sortedMeetings.forEach((meeting, index) => {
        meetingByKey.set(meeting.meeting_key, meeting);
        roundByMeetingKey.set(
          meeting.meeting_key,
          meeting.round_number ?? index + 1,
        );
      });

      const teamById = new Map<string, DbTeam>();

      teams.forEach((team) => {
        teamById.set(team.id, team);
      });

      const raceRowsByMeetingKey = new Map<number, DbRaceResult[]>();

      raceResultsRows.forEach((result) => {
        const existing = raceRowsByMeetingKey.get(result.meeting_key) ?? [];

        existing.push(result);
        raceRowsByMeetingKey.set(result.meeting_key, existing);
      });

      const raceResultMeetingKeys = new Set(raceRowsByMeetingKey.keys());

      const completedMeetingRows = sortedMeetings.filter(
        (meeting) => getMeetingStatus(meeting, now) === 'completed',
      );

      const latestResultMeetingRow = [...completedMeetingRows]
        .reverse()
        .find((meeting) => raceResultMeetingKeys.has(meeting.meeting_key));

      const latestRaceRows = latestResultMeetingRow
        ? raceRowsByMeetingKey.get(latestResultMeetingRow.meeting_key) ?? []
        : [];

      const latestRaceSessionKey =
        latestRaceRows[0]?.race_session_key ?? 0;

      const latestRaceMeetingKey =
        latestResultMeetingRow?.meeting_key ?? 0;

      const driverById = new Map<string, OpenF1Driver>();
      const driverByNumber = new Map<number, OpenF1Driver>();
      const driversByTeam = new Map<string, OpenF1Driver[]>();

      drivers.forEach((driverRow) => {
        const team =
          teamById.get(driverRow.current_team_id ?? '') ?? null;

        const teamName = team?.team_name ?? 'Unknown Team';
        const teamColour = team?.team_colour ?? 'ffffff';

        const driver: OpenF1Driver = {
          driver_number: driverRow.driver_number,
          broadcast_name: driverRow.broadcast_name ?? driverRow.full_name,
          full_name: driverRow.full_name,
          name_acronym:
            driverRow.name_acronym ?? String(driverRow.driver_number),
          team_name: teamName,
          team_colour: teamColour,
          first_name: driverRow.first_name ?? '',
          last_name: driverRow.last_name ?? '',
          headshot_url: driverRow.headshot_url,
          country_code: driverRow.country_code ?? '',
          session_key: latestRaceSessionKey,
          meeting_key: latestRaceMeetingKey,
        };

        driverById.set(driverRow.id, driver);
        driverByNumber.set(driver.driver_number, driver);

        const existingTeamDrivers = driversByTeam.get(teamName) ?? [];
        existingTeamDrivers.push(driver);
        driversByTeam.set(teamName, existingTeamDrivers);
      });

      const transformedDriverStandings: DriverStanding[] = driverStandings
        .flatMap((standing) => {
          const driver = driverById.get(standing.driver_id);

          if (!driver) {
            return [];
          }

          return [
            {
              position: standing.championship_position,
              driverNumber: driver.driver_number,
              driverName: driver.full_name,
              driverAcronym: driver.name_acronym,
              teamName: driver.team_name,
              teamColour: driver.team_colour ?? 'ffffff',
              points: toNumber(standing.points),
              wins: standing.wins ?? 0,
              gapToLeader: null,
              recentForm: [],
              averageRaceFinish: null,
              raceCompletionRate: null,
              dnfCount: null,
              teammateGap: null,
            },
          ];
        })
        .sort((left, right) => left.position - right.position);

      const driverLeaderPoints = transformedDriverStandings[0]?.points ?? 0;

      transformedDriverStandings.forEach((standing) => {
        standing.gapToLeader =
          standing.position === 1
            ? null
            : Number((driverLeaderPoints - standing.points).toFixed(3));
      });

      const transformedTeamStandings: TeamStanding[] = teamStandings
        .flatMap((standing) => {
          const team = teamById.get(standing.team_id);

          if (!team) {
            return [];
          }

          return [
            {
              position: standing.championship_position,
              teamName: team.team_name,
              teamColour: team.team_colour ?? 'ffffff',
              points: toNumber(standing.points),
              wins: standing.wins ?? 0,
              gapToLeader: null,
              performanceIndex:
                standing.performance_index === null
                  ? null
                  : toNumber(standing.performance_index),
            },
          ];
        })
        .sort((left, right) => left.position - right.position);

      const teamLeaderPoints = transformedTeamStandings[0]?.points ?? 0;

      transformedTeamStandings.forEach((standing) => {
        standing.gapToLeader =
          standing.position === 1
            ? null
            : Number((teamLeaderPoints - standing.points).toFixed(3));
      });

      const raceResults: RaceResult[] = Array.from(
        raceRowsByMeetingKey.entries(),
      )
        .flatMap(([meetingKey, rows]) => {
          const meeting = meetingByKey.get(meetingKey);

          if (!meeting) {
            return [];
          }

          const driverResults = new Map<
            number,
            {
              racePosition: number | null;
              raceStatus: RaceStatus;
              qualifyingPosition: number | null;
            }
          >();

          rows.forEach((row) => {
            const driver = driverById.get(row.driver_id);

            if (!driver) {
              return;
            }

            driverResults.set(driver.driver_number, {
              racePosition: row.race_position,
              raceStatus: toRaceStatus(row.race_status),
              qualifyingPosition: row.qualifying_position,
            });
          });

          const winnerRow = rows.find(
            (row) => row.race_position === 1,
          );

          const poleRow = rows.find(
            (row) => row.qualifying_position === 1,
          );

          const winnerDriver = winnerRow
            ? driverById.get(winnerRow.driver_id) ?? null
            : null;

          const poleDriver = poleRow
            ? driverById.get(poleRow.driver_id) ?? null
            : null;

          return [
            {
              round: roundByMeetingKey.get(meetingKey) ?? 0,
              meetingKey,
              meetingName: meeting.meeting_name,
              circuitName:
                meeting.circuit_short_name ?? meeting.meeting_name,
              country: meeting.country_name ?? '',
              date: meeting.date_end ?? new Date().toISOString(),
              winner: toRacePerson(winnerDriver),
              polePosition: toRacePerson(poleDriver),
              driverResults,
            },
          ];
        })
        .sort((left, right) => left.round - right.round);

      const raceResultByMeetingKey = new Map<number, RaceResult>();

      raceResults.forEach((raceResult) => {
        raceResultByMeetingKey.set(
          raceResult.meetingKey,
          raceResult,
        );
      });

      const raceWeekends: RaceWeekendSnapshot[] = sortedMeetings.map(
        (meeting) => {
          const status = getMeetingStatus(meeting, now);
          const result = raceResultByMeetingKey.get(meeting.meeting_key);
          const meetingRaceRows =
            raceRowsByMeetingKey.get(meeting.meeting_key) ?? [];

          return {
            round: roundByMeetingKey.get(meeting.meeting_key) ?? 0,
            meetingKey: meeting.meeting_key,
            meetingName: meeting.meeting_name,
            meetingOfficialName:
              meeting.meeting_official_name ?? meeting.meeting_name,
            country: meeting.country_name ?? '',
            countryCode: meeting.country_code ?? '',
            circuitShortName:
              meeting.circuit_short_name ?? meeting.meeting_name,
            circuitType: meeting.circuit_type ?? 'road',
            dateStart: safeDate(meeting.date_start),
            dateEnd: safeDate(meeting.date_end),
            status,
            raceSessionKey:
              meetingRaceRows[0]?.race_session_key ?? null,
            raceWinner: result?.winner ?? null,
          };
        },
      );

      const completedRounds = raceWeekends.filter(
        (weekend) => weekend.status === 'completed',
      ).length;

      const pendingDescriptors = raceWeekends
        .filter(
          (weekend) =>
            weekend.status === 'completed' &&
            !raceResultByMeetingKey.has(weekend.meetingKey),
        )
        .map((weekend) => ({
          round: weekend.round,
          meetingKey: weekend.meetingKey,
          meetingName: weekend.meetingName,
          raceSessionKey: weekend.raceSessionKey ?? 0,
          reason: 'empty_race_result' as const,
        }));

      const raceSessionsWithVerifiedWinner = raceResults.filter(
        (result) => result.winner !== null,
      ).length;

      const qualifyingSessionsIndexed = raceResults.filter((result) =>
        Array.from(result.driverResults.values()).some(
          (driverResult) =>
            driverResult.qualifyingPosition !== null,
        ),
      ).length;

      const analyticsArchive: AnalyticsArchiveStatus = {
        totalCompletedRaceSessions: completedRounds,
        successfullyIndexedRaceSessions: raceResults.length,
        raceSessionsWithVerifiedWinner,
        qualifyingSessionsIndexed,
        pendingDescriptors,
        skippedDescriptors: [],
        incompleteMeetingNames: pendingDescriptors.map(
          (descriptor) => descriptor.meetingName,
        ),
        errors: [],
        isComplete:
          completedRounds > 0 &&
          raceSessionsWithVerifiedWinner === completedRounds,
        hasPendingWork: pendingDescriptors.length > 0,
      };

      const analyticsCoverage: AnalyticsCoverageSummary = {
        indexedRaceResults: raceResults.length,
        indexedQualifyingSessions: qualifyingSessionsIndexed,
        totalCompletedRaceSessions: completedRounds,
      };

      const latestCompletedMeetingRow =
        completedMeetingRows[completedMeetingRows.length - 1] ?? null;

      const nextUpcomingMeetingRow = sortedMeetings.find(
        (meeting) => getMeetingStatus(meeting, now) === 'upcoming',
      ) ?? null;

      const currentMeetingRow = sortedMeetings.find(
        (meeting) => getMeetingStatus(meeting, now) === 'active',
      ) ?? null;

      const snapshot: ChampionshipDataSnapshot = {
        lastUpdated: getLatestTimestamp([
          ...meetings.map((meeting) => meeting.source_updated_at),
          ...meetings.map((meeting) => meeting.updated_at),
          ...driverStandings.map((standing) => standing.snapshot_at),
          ...teamStandings.map((standing) => standing.snapshot_at),
          ...raceResultsRows.map(
            (result) => result.source_verified_at,
          ),
          ...raceResultsRows.map((result) => result.updated_at),
        ]),
        year: season,
        completedRounds,
        totalGrandPrix: sortedMeetings.length,
        latestCompletedMeeting: latestCompletedMeetingRow
          ? toOpenF1Meeting(latestCompletedMeetingRow)
          : null,
        nextUpcomingMeeting: nextUpcomingMeetingRow
          ? toOpenF1Meeting(nextUpcomingMeetingRow)
          : null,
        currentMeeting: currentMeetingRow
          ? toOpenF1Meeting(currentMeetingRow)
          : null,
        driverStandings: transformedDriverStandings,
        teamStandings: transformedTeamStandings,
        raceWeekends,
        raceResults,
        analyticsArchive,
        analyticsCoverage,
        allDrivers: driverByNumber,
        driversByTeam,
        // Data entered Supabase through the OpenF1 Edge Function pipeline.
        dataSource: 'openf1',
      };

      console.info(
        `[Supabase Snapshot] Loaded ${drivers.length} drivers, ` +
          `${transformedDriverStandings.length} driver standings, ` +
          `${transformedTeamStandings.length} team standings, ` +
          `${raceResults.length} indexed race weekends.`,
      );

      onProgress?.('Supabase championship snapshot ready.');

      return {
        data: snapshot,
        error: null,
      };
    } catch (caughtError) {
      const error =
        caughtError instanceof Error
          ? caughtError
          : new Error('Unknown Supabase snapshot error.');

      console.warn('[Supabase Snapshot] Read failed:', error.message);

      return {
        data: null,
        error,
      };
    }
  },
};