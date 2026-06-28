// OpenF1 API response types

export interface OpenF1Meeting {
  meeting_key: number;
  meeting_name: string;
  meeting_official_name: string;
  location: string;
  country_name: string;
  country_code: string;
  circuit_key: number;
  circuit_short_name: string;
  date_start: string;
  date_end: string;
  year: number;
  meeting_code: string;
  circuit_type: 'street' | 'permanent' | 'semi_permanent' | 'road' | string;
}

export interface OpenF1Session {
  session_key: number;
  meeting_key: number;
  session_name: string;
  session_type: string;
  date_start: string;
  date_end: string;
  location: string;
  country_name: string;
  country_code: string;
  year: number;
}

export interface OpenF1Driver {
  driver_number: number;
  broadcast_name: string;
  full_name: string;
  name_acronym: string;
  team_name: string;
  team_colour: string;
  first_name: string;
  last_name: string;
  headshot_url: string | null;
  country_code: string;
  session_key: number;
  meeting_key: number;
}

export type RaceStatus = 'finished' | 'dnf' | 'dns' | 'dsq';

export interface OpenF1SessionResult {
  driver_number: number;
  meeting_key: number;
  session_key: number;
  position: number | null;
  dnf: boolean | null;
  dns: boolean | null;
  dsq: boolean | null;
  duration: string | null;
  gap_to_leader: string | null;
  number_of_laps: number | null;
}

export function mapOpenF1RaceStatus(result: OpenF1SessionResult): RaceStatus {
  if (result.dnf) return 'dnf';
  if (result.dns) return 'dns';
  if (result.dsq) return 'dsq';
  return 'finished';
}

export interface OpenF1ChampionshipDriver {
  position_current: number;
  driver_number: number;
  points_current: number;
  wins_current: number;
  session_key: number;
  meeting_key: number;
}

export interface OpenF1ChampionshipTeam {
  position_current: number;
  team_name: string;
  team_colour: string;
  points_current: number;
  wins_current: number;
  session_key: number;
  meeting_key: number;
}

// Derived application types

export interface DriverStanding {
  position: number;
  driverNumber: number;
  driverName: string;
  driverAcronym: string;
  teamName: string;
  teamColour: string;
  points: number;
  wins: number;
  gapToLeader: number | null;
  recentForm: ('W' | 'P' | 'D' | 'R')[];
  averageRaceFinish: number | null;
  raceCompletionRate: number | null;
  dnfCount: number | null;
  teammateGap?: number | null;
}

export interface TeamStanding {
  position: number;
  teamName: string;
  teamColour: string;
  points: number;
  wins: number;
  gapToLeader: number | null;
  performanceIndex: number | null;
}

export interface HistoricalRaceSessionDescriptor {
  round: number;
  meetingKey: number;
  meetingName: string;
  circuitName: string;
  country: string;
  raceSessionKey: number;
  qualifyingSessionKey: number | null;
  raceEndDate: string;
}

export interface RaceResult {
  round: number;
  meetingKey: number;
  meetingName: string;
  circuitName: string;
  country: string;
  date: string;
  winner: {
    driverNumber: number;
    driverName: string;
    driverAcronym: string;
    teamName: string;
  } | null;
  polePosition: {
    driverNumber: number;
    driverName: string;
    driverAcronym: string;
    teamName: string;
  } | null;
  driverResults: Map<number, {
    racePosition: number | null;
    raceStatus: RaceStatus;
    qualifyingPosition: number | null;
  }>;
}

export type ArchiveReasonCode = 'empty_race_result' | 'missing_winner_position' | 'request_failed' | 'rate_limited' | 'qualifying_unavailable';

export interface ArchiveDescriptorStatus {
  round: number;
  meetingKey: number;
  meetingName: string;
  raceSessionKey: number;
  reason: ArchiveReasonCode;
}

export interface AnalyticsArchiveStatus {
  totalCompletedRaceSessions: number;
  successfullyIndexedRaceSessions: number;
  raceSessionsWithVerifiedWinner: number;
  qualifyingSessionsIndexed: number;
  pendingDescriptors: ArchiveDescriptorStatus[];
  skippedDescriptors: ArchiveDescriptorStatus[];
  incompleteMeetingNames: string[];
  errors: Array<{ type: string; message: string; retryAfter?: number }>;
  isComplete: boolean;
  hasPendingWork: boolean;
}

export interface AnalyticsCoverageSummary {
  indexedRaceResults: number;
  indexedQualifyingSessions: number;
  totalCompletedRaceSessions: number;
}

export interface RaceWeekendSnapshot {
  round: number;
  meetingKey: number;
  meetingName: string;
  meetingOfficialName: string;
  country: string;
  countryCode: string;
  circuitShortName: string;
  circuitType: string;
  dateStart: string;
  dateEnd: string;
  status: 'completed' | 'active' | 'upcoming';
  raceSessionKey: number | null;
  raceWinner: {
    driverNumber: number;
    driverName: string;
    driverAcronym: string;
    teamName: string;
  } | null;
}

export interface ChampionshipDataSnapshot {
  lastUpdated: string;
  year: number;
  completedRounds: number;
  totalGrandPrix: number;
  latestCompletedMeeting: OpenF1Meeting | null;
  nextUpcomingMeeting: OpenF1Meeting | null;
  currentMeeting: OpenF1Meeting | null;
  driverStandings: DriverStanding[];
  teamStandings: TeamStanding[];
  raceWeekends: RaceWeekendSnapshot[];
  raceResults: RaceResult[];
  analyticsArchive: AnalyticsArchiveStatus;
  analyticsCoverage: AnalyticsCoverageSummary;
  allDrivers: Map<number, OpenF1Driver>;
  driversByTeam: Map<string, OpenF1Driver[]>;
  dataSource: 'openf1';
}

export interface DataLoadState {
  status: 'idle' | 'loading' | 'success' | 'error';
  error: string | null;
  loadingMessage: string;
}

export interface ChampionshipLeaderInfo {
  driverName: string;
  driverAcronym: string;
  teamName: string;
  teamColour: string;
  points: number;
  gapToSecond: number | null;
}
