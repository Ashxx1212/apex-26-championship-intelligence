/**
 * Forecast Engine
 *
 * Pure functions for championship forecasting.
 * Currently in CALIBRATION mode - no predictions are generated.
 *
 * The forecast engine will activate only after:
 * - Sufficient completed rounds have been processed
 * - Required performance factors have been calculated
 * - Historical data quality has been validated
 */

import type { DriverStanding, RaceResult, TeamStanding } from '../../types/f1';
import type {
  ForecastReadinessStatus,
  DriverForecastInput,
  ForecastRequirements,
  ChampionshipForecast,
  ForecastFactor,
  ForecastEngineConfig,
} from './forecastTypes';

/**
 * Default forecast engine configuration
 */
const DEFAULT_CONFIG: ForecastEngineConfig = {
  minimumCompletedRounds: 6,
  simulationCount: 10000,
  confidenceInterval: 0.95,
  factorWeights: {
    currentPointsPosition: 0.30,
    averageRaceFinish: 0.15,
    qualifyingPace: 0.10,
    raceConsistency: 0.15,
    reliability: 0.10,
    teamPerformance: 0.10,
    teammateDelta: 0.05,
    circuitFit: 0.05,
  },
};

const engineConfig = DEFAULT_CONFIG;

/**
 * Get the current forecast readiness status
 */
export function getForecastReadiness(
  completedRounds: number,
  driverStandings: DriverStanding[],
  raceResults: RaceResult[]
): ForecastReadinessStatus {
  // Check minimum rounds
  if (completedRounds < engineConfig.minimumCompletedRounds) {
    return 'NOT_READY';
  }

  // Check if we have standings data
  if (driverStandings.length === 0) {
    return 'NOT_READY';
  }

  // Check if we have historical results
  if (raceResults.length === 0) {
    return 'INSUFFICIENT_DATA';
  }

  // Check if drivers have full data
  const driversWithFullData = driverStandings.filter(
    (s) =>
      s.averageRaceFinish !== null &&
      s.raceCompletionRate !== null &&
      s.recentForm.length > 0
  ).length;

  if (driversWithFullData < driverStandings.length * 0.8) {
    return 'CALIBRATING';
  }

  return 'READY';
}

/**
 * Get detailed forecast requirements and current progress
 */
export function getForecastRequirements(
  completedRounds: number,
  driverStandings: DriverStanding[],
  raceResults: RaceResult[]
): ForecastRequirements {
  const requiredFactors = [
    'currentPointsPosition',
    'averageRaceFinish',
    'qualifyingPace',
    'raceConsistency',
    'reliability',
    'teamPerformance',
  ];

  const driversWithFullData = driverStandings.filter(
    (s) =>
      s.averageRaceFinish !== null &&
      s.raceCompletionRate !== null &&
      s.dnfCount !== null &&
      s.recentForm.length >= 3
  );

  const availableFactors = requiredFactors.filter((factor) => {
    if (factor === 'currentPointsPosition') return true;
    if (factor === 'averageRaceFinish') return driverStandings.some(s => s.averageRaceFinish !== null);
    if (factor === 'raceConsistency') return driverStandings.some(s => s.raceCompletionRate !== null);
    if (factor === 'reliability') return driverStandings.some(s => s.dnfCount !== null);
    if (factor === 'qualifyingPace') return raceResults.some(r => r.driverResults.size > 0);
    if (factor === 'teamPerformance') return true;
    return false;
  });

  return {
    minimumCompletedRounds: engineConfig.minimumCompletedRounds,
    minimumDriversWithData: Math.ceil(driverStandings.length * 0.8),
    requiredFactors,
    currentProgress: {
      completedRounds,
      driversWithFullData: driversWithFullData.length,
      availableFactors,
    },
  };
}

/**
 * Validate that forecast inputs are available
 */
export function validateForecastInputs(
  driverStandings: DriverStanding[],
  teamStandings: TeamStanding[],
  raceResults: RaceResult[]
): { isValid: boolean; missingData: string[] } {
  const missingData: string[] = [];

  if (driverStandings.length === 0) {
    missingData.push('Driver standings');
  }

  if (teamStandings.length === 0) {
    missingData.push('Team standings');
  }

  if (raceResults.length === 0) {
    missingData.push('Race results');
  }

  const driversWithPoints = driverStandings.filter(s => s.points > 0).length;
  if (driversWithPoints === 0) {
    missingData.push('Points data');
  }

  return {
    isValid: missingData.length === 0,
    missingData,
  };
}

/**
 * Build forecast inputs from standings and results
 * Returns null for values that cannot be calculated
 */
export function buildForecastInputs(
  driverStandings: DriverStanding[]
): DriverForecastInput[] {
  return driverStandings.map((standing) => ({
    driverNumber: standing.driverNumber,
    driverName: standing.driverName,
    teamName: standing.teamName,
    teamColour: standing.teamColour,
    currentPosition: standing.position,
    currentPoints: standing.points,
    averageRaceFinish: standing.averageRaceFinish,
    averageQualifyingPosition: null, // Would need quali data
    raceCompletionRate: standing.raceCompletionRate,
    dnfCount: standing.dnfCount,
    teammateGap: standing.teammateGap ?? null,
    recentForm: standing.recentForm,
  }));
}

/**
 * Get forecast factors for a single driver
 * Returns factors with null values where data is unavailable
 */
export function getForecastFactors(input: DriverForecastInput): ForecastFactor[] {
  return [
    {
      id: 'currentPointsPosition',
      name: 'Points Position',
      weight: engineConfig.factorWeights.currentPointsPosition,
      description: 'Current championship standing by points',
      value: input.currentPosition,
      normalizedScore: null, // Would normalize across all drivers
      dataSource: 'verified',
    },
    {
      id: 'averageRaceFinish',
      name: 'Average Race Finish',
      weight: engineConfig.factorWeights.averageRaceFinish,
      description: 'Mean finishing position across completed races',
      value: input.averageRaceFinish,
      normalizedScore: null,
      dataSource: input.averageRaceFinish !== null ? 'verified' : 'unavailable',
    },
    {
      id: 'raceConsistency',
      name: 'Race Consistency',
      weight: engineConfig.factorWeights.raceConsistency,
      description: 'Percentage of races completed without DNF',
      value: input.raceCompletionRate,
      normalizedScore: null,
      dataSource: input.raceCompletionRate !== null ? 'verified' : 'unavailable',
    },
    {
      id: 'reliability',
      name: 'Reliability Exposure',
      weight: engineConfig.factorWeights.reliability,
      description: 'Number of DNFs this season',
      value: input.dnfCount,
      normalizedScore: null,
      dataSource: input.dnfCount !== null ? 'verified' : 'unavailable',
    },
    {
      id: 'teammateDelta',
      name: 'Teammate Delta',
      weight: engineConfig.factorWeights.teammateDelta,
      description: 'Average gap to teammate in finishing position',
      value: input.teammateGap,
      normalizedScore: null,
      dataSource: input.teammateGap !== null ? 'verified' : 'unavailable',
    },
    {
      id: 'recentForm',
      name: 'Recent Form',
      weight: engineConfig.factorWeights.circuitFit,
      description: 'Performance in last 3 races',
      value: input.recentForm.length > 0 ? input.recentForm.length : null,
      normalizedScore: null,
      dataSource: input.recentForm.length > 0 ? 'verified' : 'unavailable',
    },
  ];
}

/**
 * Generate championship forecasts
 * Currently returns NOT_READY status with no predictions
 */
export function generateChampionshipForecasts(
  driverStandings: DriverStanding[],
  teamStandings: TeamStanding[],
  raceResults: RaceResult[],
  completedRounds: number
): {
  status: ForecastReadinessStatus;
  forecasts: ChampionshipForecast[];
  requirements: ForecastRequirements;
} {
  const status = getForecastReadiness(completedRounds, driverStandings, raceResults);
  const requirements = getForecastRequirements(completedRounds, driverStandings, raceResults);

  // Do not generate forecasts if not ready
  if (status === 'NOT_READY' || status === 'INSUFFICIENT_DATA' || status === 'CALIBRATING') {
    return {
      status,
      forecasts: [],
      requirements,
    };
  }

  // Even when READY, we don't activate forecasts yet
  // This is a deliberate choice to show the architecture without predictions
  const forecasts: ChampionshipForecast[] = driverStandings.slice(0, 5).map((standing) => ({
    driverNumber: standing.driverNumber,
    driverName: standing.driverName,
    driverAcronym: standing.driverAcronym,
    teamName: standing.teamName,
    teamColour: standing.teamColour,
    probability: null,
    confidence: null,
    currentPosition: standing.position,
    factors: getForecastFactors({
      driverNumber: standing.driverNumber,
      driverName: standing.driverName,
      teamName: standing.teamName,
      teamColour: standing.teamColour,
      currentPosition: standing.position,
      currentPoints: standing.points,
      averageRaceFinish: standing.averageRaceFinish,
      averageQualifyingPosition: null,
      raceCompletionRate: standing.raceCompletionRate,
      dnfCount: standing.dnfCount,
      teammateGap: standing.teammateGap ?? null,
      recentForm: standing.recentForm,
    }),
    isActive: false,
  }));

  return {
    status: 'CALIBRATING', // Always calibrating until explicitly activated
    forecasts,
    requirements,
  };
}

/**
 * Format readiness status for display
 */
export function formatReadinessStatus(status: ForecastReadinessStatus): string {
  const labels: Record<ForecastReadinessStatus, string> = {
    NOT_READY: 'Not Ready',
    CALIBRATING: 'Calibrating',
    READY: 'Ready',
    INSUFFICIENT_DATA: 'Insufficient Data',
  };
  return labels[status];
}

// Re-export types
export type {
  ForecastReadinessStatus,
  DriverForecastInput,
  ForecastRequirements,
  ChampionshipForecast,
  ForecastFactor,
  ForecastEngineConfig,
};
