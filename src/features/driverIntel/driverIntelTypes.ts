export type DriverIntelForm = 'W' | 'P' | 'D' | 'R';

export interface DriverIntelTeammateSummary {
  driverNumber: number;
  driverName: string;
  driverAcronym: string;
  teamName: string;
  position: number | null;
  points: number;
  recentForm: DriverIntelForm[];
}

export interface DriverIntelRaceHistoryItem {
  round: number;
  meetingName: string;
  circuitName: string;
  racePosition: number | null;
  qualifyingPosition: number | null;
  raceStatus: string;
  isWinner: boolean;
}

export interface DriverIntelSnapshot {
  driverNumber: number;
  driverName: string;
  driverAcronym: string;
  teamName: string;
  teamColour: string;
  position: number;
  points: number;
  gapToLeader: number | null;
  recentForm: DriverIntelForm[];
  averageRaceFinish: number | null;
  averageQualifyingPosition: number | null;
  raceCompletionRate: number | null;
  dnfCount: number | null;
  teammateGap: number | null;
  teammate: DriverIntelTeammateSummary | null;
  raceHistory: DriverIntelRaceHistoryItem[];
  archiveCoverage: {
    indexedRaceResults: number;
    totalCompletedRaceSessions: number;
    hasPendingWork: boolean;
  };
  observations: string[];
}
