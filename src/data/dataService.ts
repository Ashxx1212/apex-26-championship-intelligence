import type { Driver, Team, RaceWeekend, ChampionshipStanding, ConstructorStanding, DataStatus } from '../types';

// ============================================================================
// PLACEHOLDER DATA SERVICE
// Real data integration will use OpenF1 API when available
// All functions return empty/demo data for the 2026 season placeholder
// ============================================================================

const DATA_STATUS: DataStatus = {
  core: 'awaiting_verified_ingestion',
  forecastModel: 'standby',
  lastSync: null,
};

export async function getDataStatus(): Promise<DataStatus> {
  // TODO: Integrate with real API health check
  return DATA_STATUS;
}

export async function getDrivers(): Promise<Driver[]> {
  // TODO: Fetch from OpenF1 API
  // Endpoint: /v1/drivers?season=2026
  return [];
}

export async function getTeams(): Promise<Team[]> {
  // TODO: Fetch from OpenF1 API
  // Endpoint: /v1/constructors?season=2026
  return [];
}

export async function getRaceCalendar(): Promise<RaceWeekend[]> {
  // TODO: Fetch from OpenF1 API
  // Endpoint: /v1/races?season=2026
  return [];
}

export async function getDriverStandings(): Promise<ChampionshipStanding[]> {
  // TODO: Fetch from OpenF1 API
  // Endpoint: /v1/driver_standings?season=2026
  return [];
}

export async function getConstructorStandings(): Promise<ConstructorStanding[]> {
  // TODO: Fetch from OpenF1 API
  // Endpoint: /v1/constructor_standings?season=2026
  return [];
}

export async function getCurrentRound(): Promise<number> {
  // TODO: Calculate based on current date and race calendar
  return 0;
}

// Export status for immediate use in components
export const currentDataStatus = DATA_STATUS;
