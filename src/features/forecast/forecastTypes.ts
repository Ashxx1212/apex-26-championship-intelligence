/**
 * Forecast Types
 *
 * Type definitions for championship forecasting engine.
 * Currently in calibration mode - no predictions are generated yet.
 */

import type { DriverStanding } from '../../types/f1';

/**
 * Forecast readiness status
 */
export type ForecastReadinessStatus =
  | 'NOT_READY'
  | 'CALIBRATING'
  | 'READY'
  | 'INSUFFICIENT_DATA';

/**
 * Input required for generating a driver forecast
 */
export interface DriverForecastInput {
  driverNumber: number;
  driverName: string;
  teamName: string;
  teamColour: string;
  currentPosition: number;
  currentPoints: number;
  averageRaceFinish: number | null;
  averageQualifyingPosition: number | null;
  raceCompletionRate: number | null;
  dnfCount: number | null;
  teammateGap: number | null;
  recentForm: ('W' | 'P' | 'D' | 'R')[];
}

/**
 * A single forecast factor with weight
 */
export interface ForecastFactor {
  id: string;
  name: string;
  weight: number;
  description: string;
  value: number | null;
  normalizedScore: number | null;
  dataSource: 'verified' | 'calibrated' | 'unavailable';
}

/**
 * A driver's championship forecast
 */
export interface ChampionshipForecast {
  driverNumber: number;
  driverName: string;
  driverAcronym: string;
  teamName: string;
  teamColour: string;
  /** Probability of winning the championship (0-100) - not yet active */
  probability: number | null;
  /** Confidence level for the forecast */
  confidence: number | null;
  /** Current championship position */
  currentPosition: number;
  /** Factors used to calculate the forecast */
  factors: ForecastFactor[];
  /** Whether the forecast is active */
  isActive: false;
}

/**
 * A race simulation scenario
 */
export interface ForecastScenario {
  id: string;
  name: string;
  description: string;
  /** Modifications to apply (e.g., "Driver X wins remaining races") */
  modifications: ScenarioModification[];
}

/**
 * A modification to apply in a scenario
 */
export interface ScenarioModification {
  type: 'driver_finish' | 'driver_dnf' | 'weather' | 'safety_car';
  driverNumber?: number;
  position?: number;
  value?: string | number;
}

/**
 * Result of a single Monte Carlo simulation run
 */
export interface SimulationResult {
  runId: number;
  driverPoints: Map<number, number>;
  winner: number | null;
}

/**
 * Aggregate results from Monte Carlo simulations
 */
export interface SimulationResults {
  totalRuns: number;
  driverWinCounts: Map<number, number>;
  driverProbabilities: Map<number, number>;
  averagePoints: Map<number, number>;
  confidenceInterval: number;
}

/**
 * Requirements for activating the forecast engine
 */
export interface ForecastRequirements {
  minimumCompletedRounds: number;
  minimumDriversWithData: number;
  requiredFactors: string[];
  currentProgress: {
    completedRounds: number;
    driversWithFullData: number;
    availableFactors: string[];
  };
}

/**
 * Forecast engine configuration
 */
export interface ForecastEngineConfig {
  /** Minimum completed rounds before activating */
  minimumCompletedRounds: number;
  /** Number of Monte Carlo simulations to run */
  simulationCount: number;
  /** Confidence interval for results */
  confidenceInterval: number;
  /** Factor weights */
  factorWeights: Record<string, number>;
}

/**
 * Convert a DriverStanding to a DriverForecastInput
 */
export function toForecastInput(
  standing: DriverStanding
): DriverForecastInput {
  return {
    driverNumber: standing.driverNumber,
    driverName: standing.driverName,
    teamName: standing.teamName,
    teamColour: standing.teamColour,
    currentPosition: standing.position,
    currentPoints: standing.points,
    averageRaceFinish: standing.averageRaceFinish,
    averageQualifyingPosition: null, // Would need to calculate
    raceCompletionRate: standing.raceCompletionRate,
    dnfCount: standing.dnfCount,
    teammateGap: standing.teammateGap ?? null,
    recentForm: standing.recentForm,
  };
}

/**
 * Check if standings can produce any forecast input
 */
export function canProduceForecastInput(
  standings: DriverStanding[]
): boolean {
  return standings.length > 0 && standings.some(s => s.points > 0);
}
