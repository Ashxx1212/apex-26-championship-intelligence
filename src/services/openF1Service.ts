/**
 * OpenF1 Service
 *
 * High-level service for fetching and processing championship data.
 * Uses the rate-limited openF1Client and versioned cacheService.
 *
 * Two-phase loading model:
 * - Phase A (Core): Minimum data for dashboard display
 * - Phase B (Analytics): Historical race results for deep metrics
 */

import { openF1Client, OpenF1Error } from './openF1Client';
import { cacheService } from './cacheService';
import { OPENF1_CONFIG } from '../config/dataConfig';
import type {
  OpenF1Meeting,
  OpenF1Session,
  OpenF1Driver,
  OpenF1ChampionshipDriver,
  OpenF1ChampionshipTeam,
  OpenF1SessionResult,
  DriverStanding,
  TeamStanding,
  RaceWeekendSnapshot,
  RaceResult,
  ChampionshipDataSnapshot,
} from '../types/f1';

// ============================================================================
// Phase A: Core Snapshot
// ============================================================================

interface RawCoreData {
  meetings: OpenF1Meeting[];
  sessions: OpenF1Session[];
  latestRaceSession: OpenF1Session | null;
  drivers: OpenF1Driver[];
  championshipDrivers: OpenF1ChampionshipDriver[];
  championshipTeams: OpenF1ChampionshipTeam[];
  latestRaceResults: OpenF1SessionResult[];
}

/**
 * Check if a session is a completed Race
 */
function isCompletedRaceSession(session: OpenF1Session): boolean {
  if (session.session_name !== 'Race') return false;

  if (!session.date_end) return false;

  const sessionEnd = new Date(session.date_end);
  const now = new Date();
  const bufferMs = OPENF1_CONFIG.sessionCompletionBufferMinutes * 60 * 1000;

  return sessionEnd.getTime() < now.getTime() - bufferMs;
}

/**
 * Filter out testing meetings from championship data
 */
function filterChampionshipMeetings(meetings: OpenF1Meeting[]): OpenF1Meeting[] {
  return meetings.filter(
    (m) =>
      !m.meeting_name.toLowerCase().includes('test') &&
      !m.meeting_official_name.toLowerCase().includes('test')
  );
}

/**
 * Check if a meeting is currently active
 */
function isMeetingActive(meeting: OpenF1Meeting): boolean {
  const now = new Date();
  const start = new Date(meeting.date_start);
  const end = new Date(meeting.date_end);
  return now >= start && now <= end;
}

/**
 * Check if a meeting is upcoming
 */
function isMeetingUpcoming(meeting: OpenF1Meeting): boolean {
  const now = new Date();
  const start = new Date(meeting.date_start);
  return now < start;
}

/**
 * Fetch Phase A core data sequentially
 */
async function fetchCoreData(
  year: number,
  onProgress?: (message: string) => void
): Promise<RawCoreData> {
  onProgress?.('Reading 2026 meetings...');
  const meetings = (await openF1Client.getMeetings(year)) as OpenF1Meeting[];

  onProgress?.('Indexing 2026 sessions...');
  const sessions = (await openF1Client.getSessions(year)) as OpenF1Session[];

  // Filter to championship meetings only
  const championshipMeetings = filterChampionshipMeetings(meetings);

  // Find latest completed Race session
  const raceSessions = sessions.filter(isCompletedRaceSession);

  if (raceSessions.length === 0) {
    return {
      meetings: championshipMeetings,
      sessions,
      latestRaceSession: null,
      drivers: [],
      championshipDrivers: [],
      championshipTeams: [],
      latestRaceResults: [],
    };
  }

  // Sort by date_end and get most recent
  raceSessions.sort(
    (a, b) => new Date(b.date_end).getTime() - new Date(a.date_end).getTime()
  );
  const latestRaceSession = raceSessions[0];

  onProgress?.('Reconciling driver standings...');
  // Fetch driver metadata
  const drivers = (await openF1Client.getDrivers(
    latestRaceSession.session_key
  )) as OpenF1Driver[];

  // Fetch championship data
  const championshipDrivers = (await openF1Client.getChampionshipDrivers(
    latestRaceSession.session_key
  )) as OpenF1ChampionshipDriver[];

  const championshipTeams = (await openF1Client.getChampionshipTeams(
    latestRaceSession.session_key
  )) as OpenF1ChampionshipTeam[];

  onProgress?.('Fetching latest race results...');
  const latestRaceResults = (await openF1Client.getSessionResults(
    latestRaceSession.session_key
  )) as OpenF1SessionResult[];

  return {
    meetings: championshipMeetings,
    sessions,
    latestRaceSession,
    drivers,
    championshipDrivers,
    championshipTeams,
    latestRaceResults,
  };
}

/**
 * Transform raw core data into application snapshot
 */
function transformCoreData(raw: RawCoreData): ChampionshipDataSnapshot {
  const { meetings, sessions, latestRaceSession, drivers, championshipDrivers, championshipTeams, latestRaceResults } = raw;

  // Sort meetings chronologically
  const sortedMeetings = [...meetings].sort(
    (a, b) => new Date(a.date_start).getTime() - new Date(b.date_start).getTime()
  );

  // Assign round numbers
  const meetingRounds = new Map<number, number>();
  sortedMeetings.forEach((m, i) => {
    meetingRounds.set(m.meeting_key, i + 1);
  });

  // Build driver map
  const allDrivers = new Map<number, OpenF1Driver>();
  const driversByTeam = new Map<string, OpenF1Driver[]>();

  drivers.forEach((d) => {
    allDrivers.set(d.driver_number, d);
    const existing = driversByTeam.get(d.team_name) || [];
    existing.push(d);
    driversByTeam.set(d.team_name, existing);
  });

  // Build driver standings
  const driverStandings: DriverStanding[] = championshipDrivers
    .map((cd) => {
      const driver = allDrivers.get(cd.driver_number);
      return {
        position: cd.position_current,
        driverNumber: cd.driver_number,
        driverName: driver?.full_name || `Driver #${cd.driver_number}`,
        driverAcronym: driver?.name_acronym || String(cd.driver_number),
        teamName: driver?.team_name || 'Unknown Team',
        teamColour: driver?.team_colour || 'ffffff',
        points: cd.points_current,
        wins: cd.wins_current,
        gapToLeader: null,
        recentForm: [],
        averageRaceFinish: null,
        raceCompletionRate: null,
        dnfCount: null,
        teammateGap: null,
      };
    })
    .sort((a, b) => a.position - b.position);

  // Calculate gaps
  const leaderPoints = driverStandings[0]?.points || 0;
  driverStandings.forEach((ds) => {
    if (ds.position > 1) {
      ds.gapToLeader = leaderPoints - ds.points;
    }
  });

  // Build team standings
  const teamStandings: TeamStanding[] = championshipTeams
    .map((ct) => ({
      position: ct.position_current,
      teamName: ct.team_name,
      teamColour: ct.team_colour || 'ffffff',
      points: ct.points_current,
      wins: ct.wins_current,
      gapToLeader: null,
      performanceIndex: null,
    }))
    .sort((a, b) => a.position - b.position);

  const teamLeaderPoints = teamStandings[0]?.points || 0;
  teamStandings.forEach((ts) => {
    if (ts.position > 1) {
      ts.gapToLeader = teamLeaderPoints - ts.points;
    }
  });

  // Build race weekend snapshots
  const raceWeekends: RaceWeekendSnapshot[] = sortedMeetings.map((meeting) => {
    const meetingSessions = sessions.filter(
      (s) => s.meeting_key === meeting.meeting_key
    );
    const raceSession = meetingSessions.find((s) => s.session_name === 'Race');
    const round = meetingRounds.get(meeting.meeting_key) || 0;

    let status: 'completed' | 'active' | 'upcoming' = 'upcoming';
    let raceWinner: RaceWeekendSnapshot['raceWinner'] = null;

    if (isMeetingActive(meeting)) {
      status = 'active';
    } else if (raceSession && isCompletedRaceSession(raceSession)) {
      status = 'completed';
      // Find winner from results
      const winner = latestRaceResults.find((r) => r.position === 1);
      const winnerDriver = winner ? allDrivers.get(winner.driver_number) : null;
      if (winnerDriver) {
        raceWinner = {
          driverNumber: winnerDriver.driver_number,
          driverName: winnerDriver.full_name,
          driverAcronym: winnerDriver.name_acronym,
          teamName: winnerDriver.team_name,
        };
      }
    }

    return {
      round,
      meetingKey: meeting.meeting_key,
      meetingName: meeting.meeting_name,
      meetingOfficialName: meeting.meeting_official_name,
      country: meeting.country_name,
      countryCode: meeting.country_code,
      circuitShortName: meeting.circuit_short_name,
      circuitType: meeting.circuit_type,
      dateStart: meeting.date_start,
      dateEnd: meeting.date_end,
      status,
      raceSessionKey: raceSession?.session_key || null,
      raceWinner,
    };
  });

  // Find latest completed, current, and next meeting
  const latestCompletedMeeting = latestRaceSession
    ? meetings.find((m) => m.meeting_key === latestRaceSession.meeting_key) || null
    : null;

  const currentMeeting = sortedMeetings.find(isMeetingActive) || null;

  const upcomingMeetings = sortedMeetings
    .filter(isMeetingUpcoming)
    .sort((a, b) => new Date(a.date_start).getTime() - new Date(b.date_start).getTime());
  const nextUpcomingMeeting = upcomingMeetings[0] || null;

  // Count completed rounds
  const completedRounds = raceWeekends.filter((rw) => rw.status === 'completed').length;

  // Build minimal race results for latest race
  const raceResults: RaceResult[] = [];
  if (latestRaceSession && latestCompletedMeeting) {
    const driverResultsMap = new Map<
      number,
      { racePosition: number | null; raceStatus: string; qualifyingPosition: number | null; points: number }
    >();

    latestRaceResults.forEach((r) => {
      driverResultsMap.set(r.driver_number, {
        racePosition: r.position,
        raceStatus: r.status || 'finished',
        qualifyingPosition: null,
        points: r.points || 0,
      });
    });

    const winner = latestRaceResults.find((r) => r.position === 1);
    const winnerDriver = winner ? allDrivers.get(winner.driver_number) : null;

    raceResults.push({
      round: meetingRounds.get(latestCompletedMeeting.meeting_key) || 0,
      meetingKey: latestCompletedMeeting.meeting_key,
      meetingName: latestCompletedMeeting.meeting_name,
      circuitName: latestCompletedMeeting.circuit_short_name,
      country: latestCompletedMeeting.country_name,
      date: latestRaceSession.date_end,
      winner: winnerDriver
        ? {
            driverNumber: winnerDriver.driver_number,
            driverName: winnerDriver.full_name,
            driverAcronym: winnerDriver.name_acronym,
            teamName: winnerDriver.team_name,
          }
        : null,
      polePosition: null,
      driverResults: driverResultsMap,
    });
  }

  return {
    lastUpdated: new Date().toISOString(),
    year: 2026,
    completedRounds,
    totalGrandPrix: sortedMeetings.length,
    latestCompletedMeeting,
    nextUpcomingMeeting,
    currentMeeting,
    driverStandings,
    teamStandings,
    raceWeekends,
    raceResults,
    allDrivers,
    driversByTeam,
    dataSource: 'openf1',
  };
}

// ============================================================================
// Public Service API
// ============================================================================

export const openF1Service = {
  /**
   * Check if the API is in cooldown
   */
  isInCooldown(): boolean {
    return openF1Client.isInCooldown();
  },

  /**
   * Get remaining cooldown time
   */
  getCooldownRemaining(): number {
    return openF1Client.getCooldownRemaining();
  },

  /**
   * Fetch core championship snapshot (Phase A)
   * Uses cache if valid, otherwise fetches from API
   */
  async fetchCoreSnapshot(
    year: number = 2026,
    options: { forceRefresh?: boolean; onProgress?: (message: string) => void } = {}
  ): Promise<{
    data: ChampionshipDataSnapshot | null;
    error: OpenF1Error | null;
    fromCache: boolean;
  }> {
    const { forceRefresh = false, onProgress } = options;

    // Check cache first if not forcing refresh
    if (!forceRefresh) {
      const cached = cacheService.getCoreSnapshot<ChampionshipDataSnapshot>();
      if (cached.status === 'valid' && cached.data) {
        return { data: cached.data, error: null, fromCache: true };
      }
    }

    // Check cooldown
    if (this.isInCooldown()) {
      const remaining = this.getCooldownRemaining();
      return {
        data: null,
        error: OpenF1Error.rateLimited(remaining),
        fromCache: false,
      };
    }

    // Fetch from API
    try {
      const raw = await fetchCoreData(year, onProgress);
      const snapshot = transformCoreData(raw);

      // Cache the result
      cacheService.setCoreSnapshot(snapshot);

      return { data: snapshot, error: null, fromCache: false };
    } catch (error) {
      const apiError =
        error instanceof OpenF1Error ? error : OpenF1Error.unknown(error);

      // If we have expired cache, still show it
      if (!forceRefresh) {
        const expired = cacheService.getCoreSnapshot<ChampionshipDataSnapshot>();
        if (expired.data) {
          return { data: expired.data, error: apiError, fromCache: true };
        }
      }

      return { data: null, error: apiError, fromCache: false };
    }
  },

  /**
   * Fetch historical race results for analytics (Phase B)
   * This should be called explicitly, not on initial load
   */
  async fetchAnalyticsArchive(
    sessions: OpenF1Session[],
    onProgress?: (current: number, total: number) => void,
    signal?: AbortSignal
  ): Promise<{
    results: RaceResult[];
    errors: OpenF1Error[];
    processedCount: number;
  }> {
    const completedRaceSessions = sessions
      .filter(isCompletedRaceSession)
      .sort((a, b) => new Date(a.date_end).getTime() - new Date(b.date_end).getTime());

    const results: RaceResult[] = [];
    const errors: OpenF1Error[] = [];

    for (let i = 0; i < completedRaceSessions.length; i++) {
      if (signal?.aborted) break;

      const session = completedRaceSessions[i];
      onProgress?.(i + 1, completedRaceSessions.length);

      // Check cooldown before each request
      if (this.isInCooldown()) {
        errors.push(OpenF1Error.rateLimited(this.getCooldownRemaining()));
        break;
      }

      try {
        // Check cache first
        const cached = cacheService.getRaceResult<OpenF1SessionResult[]>(
          session.session_key
        );

        let raceResults: OpenF1SessionResult[];
        if (cached.status === 'valid' && cached.data) {
          raceResults = cached.data;
        } else {
          raceResults = (await openF1Client.getHistorical(
            session.session_key,
            'race'
          )) as OpenF1SessionResult[];
          cacheService.setRaceResult(session.session_key, raceResults);
        }

        // Build race result entry
        const driverResultsMap = new Map<
          number,
          { racePosition: number | null; raceStatus: string; qualifyingPosition: number | null; points: number }
        >();

        raceResults.forEach((r) => {
          driverResultsMap.set(r.driver_number, {
            racePosition: r.position,
            raceStatus: r.status || 'finished',
            qualifyingPosition: null,
            points: r.points || 0,
          });
        });

        results.push({
          round: i + 1,
          meetingKey: session.meeting_key,
          meetingName: session.location,
          circuitName: session.location,
          country: session.country_name,
          date: session.date_end,
          winner: null, // Would need driver data to resolve
          polePosition: null,
          driverResults: driverResultsMap,
        });
      } catch (error) {
        errors.push(error instanceof OpenF1Error ? error : OpenF1Error.unknown(error));
        // Stop on rate limit
        if (error instanceof OpenF1Error && error.type === 'rate_limited') {
          break;
        }
      }
    }

    return {
      results,
      errors,
      processedCount: results.length,
    };
  },

  /**
   * Clear all cached data
   */
  clearCache(): void {
    cacheService.clearAll();
  },
};

// Re-export types and utilities
export { OpenF1Error };
export type { OpenF1Meeting, OpenF1Session, OpenF1Driver };
