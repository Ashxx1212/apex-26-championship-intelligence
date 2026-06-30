// ============================================================================
// PLACEHOLDER DATA SERVICE
// Real app data is handled by src/services/openF1Service.ts
// This file is kept only for compatibility with older imports.
// ============================================================================

const DATA_STATUS = {
  core: 'awaiting_verified_ingestion',
  forecastModel: 'standby',
  lastSync: null,
};

export async function getDataStatus() {
  return DATA_STATUS;
}

export async function getDrivers() {
  return [];
}

export async function getTeams() {
  return [];
}

export async function getRaceCalendar() {
  return [];
}

export async function getDriverStandings() {
  return [];
}

export async function getConstructorStandings() {
  return [];
}

export async function getCurrentRound() {
  return 0;
}

export const currentDataStatus = DATA_STATUS;