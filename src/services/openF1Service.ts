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
import { CACHE_CONFIG, OPENF1_CONFIG } from '../config/dataConfig';
import { driverRepository } from '../repositories/driverRepository';
import { teamRepository } from '../repositories/teamRepository';
import { meetingRepository } from '../repositories/meetingRepository';
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
  HistoricalRaceSessionDescriptor,
  AnalyticsArchiveStatus,
  ArchiveDescriptorStatus,
  AnalyticsCoverageSummary,
} from '../types/f1';
import { mapOpenF1RaceStatus } from '../types/f1';

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

export function buildHistoricalRaceSessionDescriptors(
  meetings: OpenF1Meeting[],
  sessions: OpenF1Session[]
): HistoricalRaceSessionDescriptor[] {
  const championshipMeetings = filterChampionshipMeetings(meetings);
  const completedRaceSessions = sessions
    .filter((session) => session.session_name === 'Race' && isCompletedRaceSession(session))
    .sort((a, b) => new Date(a.date_end).getTime() - new Date(b.date_end).getTime());

  const descriptors: HistoricalRaceSessionDescriptor[] = completedRaceSessions.map((raceSession) => {
    const meeting = championshipMeetings.find((item) => item.meeting_key === raceSession.meeting_key);
    const qualifyingSession = sessions.find(
      (session) =>
        session.meeting_key === raceSession.meeting_key &&
        session.session_name === 'Qualifying'
    );

    return {
      round: 0,
      meetingKey: raceSession.meeting_key,
      meetingName: meeting?.meeting_name || raceSession.location,
      circuitName: meeting?.circuit_short_name || raceSession.location,
      country: meeting?.country_name || raceSession.country_name,
      raceSessionKey: raceSession.session_key,
      qualifyingSessionKey: qualifyingSession?.session_key || null,
      raceEndDate: raceSession.date_end,
    };
  });

  return descriptors
    .sort((a, b) => new Date(a.raceEndDate).getTime() - new Date(b.raceEndDate).getTime())
    .map((descriptor, index) => ({ ...descriptor, round: index + 1 }));
}

function buildArchiveStatus(
  totalCompletedRaceSessions: number,
  successfullyIndexedRaceSessions: number,
  raceSessionsWithVerifiedWinner: number,
  qualifyingSessionsIndexed: number,
  pendingDescriptors: ArchiveDescriptorStatus[],
  skippedDescriptors: ArchiveDescriptorStatus[],
  errors: OpenF1Error[]
): AnalyticsArchiveStatus {
  const incompleteMeetingNames = Array.from(
    new Set([
      ...pendingDescriptors.map((descriptor) => descriptor.meetingName),
      ...skippedDescriptors.map((descriptor) => descriptor.meetingName),
    ].filter(Boolean))
  );

  return {
    totalCompletedRaceSessions,
    successfullyIndexedRaceSessions,
    raceSessionsWithVerifiedWinner,
    qualifyingSessionsIndexed,
    pendingDescriptors,
    skippedDescriptors,
    incompleteMeetingNames,
    errors: errors.map((error) => ({ type: error.type, message: error.message, retryAfter: error.retryAfter })),
    isComplete: totalCompletedRaceSessions > 0 && raceSessionsWithVerifiedWinner === totalCompletedRaceSessions,
    hasPendingWork: pendingDescriptors.length > 0 || skippedDescriptors.length > 0,
  };
}

function rebuildArchiveResultsFromCache(
  descriptors: HistoricalRaceSessionDescriptor[],
  driverLookup: Map<number, OpenF1Driver>
): { results: RaceResult[]; archiveStatus: AnalyticsArchiveStatus; coverage: AnalyticsCoverageSummary } {
  const results: RaceResult[] = [];
  const pendingDescriptors: ArchiveDescriptorStatus[] = [];
  const skippedDescriptors: ArchiveDescriptorStatus[] = [];
  let qualifyingSessionsIndexed = 0;

  descriptors.forEach((descriptor) => {
    const cachedRace = cacheService.getRaceResult<OpenF1SessionResult[]>(descriptor.raceSessionKey);
    if (cachedRace.status !== 'valid' || !cachedRace.data || cachedRace.data.length === 0) {
      skippedDescriptors.push({
        round: descriptor.round,
        meetingKey: descriptor.meetingKey,
        meetingName: descriptor.meetingName,
        raceSessionKey: descriptor.raceSessionKey,
        reason: 'empty_race_result',
      });
      return;
    }

    let qualifyingResults: OpenF1SessionResult[] | null = null;
    if (descriptor.qualifyingSessionKey) {
      const cachedQualifying = cacheService.getQualifyingResult<OpenF1SessionResult[]>(descriptor.qualifyingSessionKey);
      if (cachedQualifying.status === 'valid' && cachedQualifying.data && cachedQualifying.data.length > 0) {
        qualifyingResults = cachedQualifying.data;
        qualifyingSessionsIndexed += 1;
      }
    }

    const raceResults = cachedRace.data;
    const driverResultsMap = new Map<number, { racePosition: number | null; raceStatus: 'finished' | 'dnf' | 'dns' | 'dsq'; qualifyingPosition: number | null }>();

    raceResults.forEach((result) => {
      const raceStatus = mapOpenF1RaceStatus(result);
      const qualifyingPosition = qualifyingResults?.find((q) => q.driver_number === result.driver_number)?.position ?? null;
      driverResultsMap.set(result.driver_number, {
        racePosition: result.position,
        raceStatus,
        qualifyingPosition,
      });
    });

    const winner = raceResults.find((result) => result.position === 1);
    const winnerDriver = winner ? driverLookup.get(winner.driver_number) ?? null : null;

    if (!winner) {
      pendingDescriptors.push({
        round: descriptor.round,
        meetingKey: descriptor.meetingKey,
        meetingName: descriptor.meetingName,
        raceSessionKey: descriptor.raceSessionKey,
        reason: 'missing_winner_position',
      });
    }

    results.push({
      round: descriptor.round,
      meetingKey: descriptor.meetingKey,
      meetingName: descriptor.meetingName,
      circuitName: descriptor.circuitName,
      country: descriptor.country,
      date: descriptor.raceEndDate,
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
  });

  const archiveStatus = buildArchiveStatus(
    descriptors.length,
    results.length,
    results.filter((result) => result.winner !== null).length,
    qualifyingSessionsIndexed,
    pendingDescriptors,
    skippedDescriptors,
    []
  );

  return {
    results,
    archiveStatus,
    coverage: {
      indexedRaceResults: results.length,
      indexedQualifyingSessions: qualifyingSessionsIndexed,
      totalCompletedRaceSessions: descriptors.length,
    },
  };
}

/**
 * Fetch Phase A core data sequentially
 */
async function fetchCoreData(
  year: number,
  onProgress?: (message: string) => void
): Promise<RawCoreData> {
  onProgress?.('Reading 2026 meetings...');
  const cachedMeetings = cacheService.getMeetings<OpenF1Meeting[]>();
  const meetings = cachedMeetings.status === 'valid' && cachedMeetings.data
  ? cachedMeetings.data
  : await meetingRepository.getMeetings(year);

  if (meetings.length > 0 && cachedMeetings.status !== 'valid') {
    cacheService.setMeetings(meetings);
  }

  onProgress?.('Indexing 2026 sessions...');
  const cachedSessions = cacheService.getSessions<OpenF1Session[]>();
  const sessions = cachedSessions.status === 'valid' && cachedSessions.data
    ? cachedSessions.data
    : ((await openF1Client.getSessions(year)) as OpenF1Session[]);

  if (sessions.length > 0 && cachedSessions.status !== 'valid') {
    cacheService.setSessions(sessions);
  }

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
  const drivers = await driverRepository.getDrivers(latestRaceSession.session_key);

  // Fetch championship data
  const championshipDrivers = (await openF1Client.getChampionshipDrivers(
    latestRaceSession.session_key
  )) as OpenF1ChampionshipDriver[];

 const championshipTeams = await teamRepository.getChampionshipTeams(
  latestRaceSession.session_key
);

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

  const latestCompletedMeeting = latestRaceSession
    ? meetings.find((meeting) => meeting.meeting_key === latestRaceSession.meeting_key) ?? null
    : null;

  const currentMeeting = sortedMeetings.find(isMeetingActive) || null;

  const upcomingMeetings = sortedMeetings
    .filter(isMeetingUpcoming)
    .sort((a, b) => new Date(a.date_start).getTime() - new Date(b.date_start).getTime());
  const nextUpcomingMeeting = upcomingMeetings[0] || null;

  // Build race weekend snapshots
  const raceWeekends: RaceWeekendSnapshot[] = sortedMeetings.map((meeting) => {
    const meetingSessions = sessions.filter(
      (session) => session.meeting_key === meeting.meeting_key
    );
    const raceSession = meetingSessions.find((session) => session.session_name === 'Race');
    const round = meetingRounds.get(meeting.meeting_key) || 0;

    let status: 'completed' | 'active' | 'upcoming' = 'upcoming';
    let raceWinner: RaceWeekendSnapshot['raceWinner'] = null;

    if (isMeetingActive(meeting)) {
      status = 'active';
    } else if (raceSession && isCompletedRaceSession(raceSession)) {
      status = 'completed';
      const isLatestCompletedWeekend = latestCompletedMeeting?.meeting_key === meeting.meeting_key;
      const hasVerifiedLatestWinner =
        isLatestCompletedWeekend &&
        latestRaceResults.some((result) => result.position === 1);

      if (hasVerifiedLatestWinner) {
        const winner = latestRaceResults.find((result) => result.position === 1);
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

  // Count completed rounds
  const completedRounds = raceWeekends.filter((rw) => rw.status === 'completed').length;

  // Build minimal race results for latest race
  const raceResults: RaceResult[] = [];
  if (latestRaceSession && latestCompletedMeeting) {
    const driverResultsMap = new Map<
      number,
      { racePosition: number | null; raceStatus: 'finished' | 'dnf' | 'dns' | 'dsq'; qualifyingPosition: number | null }
    >();

    latestRaceResults.forEach((r) => {
      driverResultsMap.set(r.driver_number, {
        racePosition: r.position,
        raceStatus: mapOpenF1RaceStatus(r),
        qualifyingPosition: null,
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

  const archiveDescriptors = buildHistoricalRaceSessionDescriptors(meetings, sessions);

  const analyticsArchive: AnalyticsArchiveStatus = buildArchiveStatus(
    archiveDescriptors.length,
    0,
    0,
    0,
    [],
    [],
    []
  );

  const analyticsCoverage: AnalyticsCoverageSummary = {
    indexedRaceResults: 0,
    indexedQualifyingSessions: 0,
    totalCompletedRaceSessions: archiveDescriptors.length,
  };

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
    analyticsArchive,
    analyticsCoverage,
    allDrivers,
    driversByTeam,
    dataSource: 'openf1',
  };
}

function applyArchiveReconstruction(
  snapshot: ChampionshipDataSnapshot,
  descriptors: HistoricalRaceSessionDescriptor[]
): ChampionshipDataSnapshot {
  if (descriptors.length === 0) {
    return snapshot;
  }

  const rebuiltArchive = rebuildArchiveResultsFromCache(descriptors, snapshot.allDrivers);
  if (rebuiltArchive.results.length === 0 && !rebuiltArchive.archiveStatus.hasPendingWork) {
    return snapshot;
  }

  const mergedResults = [...snapshot.raceResults];
  rebuiltArchive.results.forEach((archiveResult) => {
    const index = mergedResults.findIndex((existing) => existing.meetingKey === archiveResult.meetingKey);
    if (index >= 0) {
      mergedResults[index] = archiveResult;
    } else {
      mergedResults.push(archiveResult);
    }
  });

  const sortedResults = mergedResults.sort((a, b) => a.round - b.round);

  if (import.meta.env.DEV) {
    console.info(
      `[APEX Archive] descriptors=${descriptors.length} indexed=${rebuiltArchive.archiveStatus.successfullyIndexedRaceSessions} pending=${rebuiltArchive.archiveStatus.pendingDescriptors.length + rebuiltArchive.archiveStatus.skippedDescriptors.length} reconstructedFromCache=${rebuiltArchive.results.length}`
    );
  }

  return {
    ...snapshot,
    raceResults: sortedResults,
    analyticsArchive: rebuiltArchive.archiveStatus,
    analyticsCoverage: rebuiltArchive.coverage,
  };
}

// ============================================================================
// Public Service API
// ============================================================================

export const openF1Service = {
  buildHistoricalRaceSessionDescriptors,
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
        const cachedMeetings = cacheService.getMeetings<OpenF1Meeting[]>();
        const cachedSessions = cacheService.getSessions<OpenF1Session[]>();
        const meetings = cachedMeetings.status === 'valid' && cachedMeetings.data ? cachedMeetings.data : [];
        const sessions = cachedSessions.status === 'valid' && cachedSessions.data ? cachedSessions.data : [];
        const descriptors = buildHistoricalRaceSessionDescriptors(meetings, sessions);
        const reconstructed = descriptors.length > 0
          ? applyArchiveReconstruction(cached.data, descriptors)
          : cached.data;

        if (reconstructed !== cached.data) {
          cacheService.setCoreSnapshot(reconstructed);
        }

        return { data: reconstructed, error: null, fromCache: true };
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
      const archivedDescriptors = buildHistoricalRaceSessionDescriptors(raw.meetings, raw.sessions);
      const reconstructedSnapshot = archivedDescriptors.length > 0
        ? applyArchiveReconstruction(snapshot, archivedDescriptors)
        : snapshot;

      // Cache the result
      cacheService.setCoreSnapshot(reconstructedSnapshot);

      return { data: reconstructedSnapshot, error: null, fromCache: false };
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
    descriptors: HistoricalRaceSessionDescriptor[],
    onProgress?: (current: number, total: number) => void,
    signal?: AbortSignal,
    driverLookup?: Map<number, OpenF1Driver>,
    options: { totalCompletedRaceSessions?: number; isResume?: boolean; existingArchiveStatus?: AnalyticsArchiveStatus } = {}
  ): Promise<{
    results: RaceResult[];
    errors: OpenF1Error[];
    processedCount: number;
    archiveStatus: AnalyticsArchiveStatus;
  }> {
    const results: RaceResult[] = [];
    const errors: OpenF1Error[] = [];
    const pendingDescriptors: ArchiveDescriptorStatus[] = [];
    const skippedDescriptors: ArchiveDescriptorStatus[] = [];
    const totalCompletedRaceSessions = options.totalCompletedRaceSessions ?? descriptors.length;
    const mode = options.isResume ? 'resume' : 'initial';
    let successfullyIndexedRaceSessions = options.existingArchiveStatus?.successfullyIndexedRaceSessions ?? 0;
    let raceSessionsWithVerifiedWinner = options.existingArchiveStatus?.raceSessionsWithVerifiedWinner ?? 0;
    let qualifyingSessionsIndexed = options.existingArchiveStatus?.qualifyingSessionsIndexed ?? 0;

    if (import.meta.env.DEV) {
      console.info(
        `[APEX Archive] mode=${mode} totalDescriptors=${totalCompletedRaceSessions} workList=${descriptors.length} meetings=${descriptors.map((descriptor) => descriptor.meetingName).join(', ')}`
      );
    }

    if (descriptors.length === 0) {
      return {
        results: [],
        errors: [],
        processedCount: 0,
        archiveStatus: buildArchiveStatus(
          totalCompletedRaceSessions,
          successfullyIndexedRaceSessions,
          raceSessionsWithVerifiedWinner,
          qualifyingSessionsIndexed,
          pendingDescriptors,
          skippedDescriptors,
          errors
        ),
      };
    }

    for (let i = 0; i < descriptors.length; i++) {
      if (signal?.aborted) break;

      const descriptor = descriptors[i];
      onProgress?.(i + 1, descriptors.length);

      if (this.isInCooldown()) {
        errors.push(OpenF1Error.rateLimited(this.getCooldownRemaining()));
        break;
      }

      try {
        const cachedRace = cacheService.getRaceResult<OpenF1SessionResult[]>(descriptor.raceSessionKey);
        let raceResults: OpenF1SessionResult[];
        if (cachedRace.status === 'valid' && cachedRace.data) {
          raceResults = cachedRace.data;
        } else {
          raceResults = (await openF1Client.getSessionResults(descriptor.raceSessionKey)) as OpenF1SessionResult[];
          if (raceResults.length === 0) {
            cacheService.remove(CACHE_CONFIG.keys.raceResult(descriptor.raceSessionKey));
            skippedDescriptors.push({
              round: descriptor.round,
              meetingKey: descriptor.meetingKey,
              meetingName: descriptor.meetingName,
              raceSessionKey: descriptor.raceSessionKey,
              reason: 'empty_race_result',
            });
            continue;
          }
          cacheService.setRaceResult(descriptor.raceSessionKey, raceResults);
        }

        if (raceResults.length === 0) {
          skippedDescriptors.push({
            round: descriptor.round,
            meetingKey: descriptor.meetingKey,
            meetingName: descriptor.meetingName,
            raceSessionKey: descriptor.raceSessionKey,
            reason: 'empty_race_result',
          });
          continue;
        }

        let qualifyingResults: OpenF1SessionResult[] | null = null;
        if (descriptor.qualifyingSessionKey) {
          const cachedQualifying = cacheService.getQualifyingResult<OpenF1SessionResult[]>(descriptor.qualifyingSessionKey);
          if (cachedQualifying.status === 'valid' && cachedQualifying.data) {
            qualifyingResults = cachedQualifying.data;
          } else {
            qualifyingResults = (await openF1Client.getSessionResults(descriptor.qualifyingSessionKey)) as OpenF1SessionResult[];
            if (qualifyingResults.length > 0) {
              cacheService.setQualifyingResult(descriptor.qualifyingSessionKey, qualifyingResults);
              qualifyingSessionsIndexed += 1;
            }
          }
        }

        const driverResultsMap = new Map<number, { racePosition: number | null; raceStatus: 'finished' | 'dnf' | 'dns' | 'dsq'; qualifyingPosition: number | null }>();

        raceResults.forEach((r) => {
          const raceStatus = mapOpenF1RaceStatus(r);
          const qualifyingPosition = qualifyingResults?.find((q) => q.driver_number === r.driver_number)?.position ?? null;
          driverResultsMap.set(r.driver_number, {
            racePosition: r.position,
            raceStatus,
            qualifyingPosition,
          });
        });

        const winner = raceResults.find((result) => result.position === 1);
        const polePosition = qualifyingResults?.find((result) => result.position === 1) ?? null;

        const winnerDriver = winner ? driverLookup?.get(winner.driver_number) ?? null : null;
        const poleDriver = polePosition ? driverLookup?.get(polePosition.driver_number) ?? null : null;

        if (!winner) {
          pendingDescriptors.push({
            round: descriptor.round,
            meetingKey: descriptor.meetingKey,
            meetingName: descriptor.meetingName,
            raceSessionKey: descriptor.raceSessionKey,
            reason: 'missing_winner_position',
          });
        } else {
          raceSessionsWithVerifiedWinner += 1;
        }

        successfullyIndexedRaceSessions += 1;

        results.push({
          round: descriptor.round,
          meetingKey: descriptor.meetingKey,
          meetingName: descriptor.meetingName,
          circuitName: descriptor.circuitName,
          country: descriptor.country,
          date: descriptor.raceEndDate,
          winner: winnerDriver
            ? {
                driverNumber: winnerDriver.driver_number,
                driverName: winnerDriver.full_name,
                driverAcronym: winnerDriver.name_acronym,
                teamName: winnerDriver.team_name,
              }
            : null,
          polePosition: poleDriver
            ? {
                driverNumber: poleDriver.driver_number,
                driverName: poleDriver.full_name,
                driverAcronym: poleDriver.name_acronym,
                teamName: poleDriver.team_name,
              }
            : null,
          driverResults: driverResultsMap,
        });
      } catch (error) {
        const apiError = error instanceof OpenF1Error ? error : OpenF1Error.unknown(error);
        errors.push(apiError);
        skippedDescriptors.push({
          round: descriptor.round,
          meetingKey: descriptor.meetingKey,
          meetingName: descriptor.meetingName,
          raceSessionKey: descriptor.raceSessionKey,
          reason: apiError.type === 'rate_limited' ? 'rate_limited' : 'request_failed',
        });
        if (apiError.type === 'rate_limited') {
          break;
        }
      }

      if (i < descriptors.length - 1 && !this.isInCooldown()) {
        await new Promise((resolve) => setTimeout(resolve, OPENF1_CONFIG.analyticsRequestInterval));
      }
    }

    return {
      results,
      errors,
      processedCount: results.length,
      archiveStatus: buildArchiveStatus(
        totalCompletedRaceSessions,
        successfullyIndexedRaceSessions,
        raceSessionsWithVerifiedWinner,
        qualifyingSessionsIndexed,
        pendingDescriptors,
        skippedDescriptors,
        errors
      ),
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
