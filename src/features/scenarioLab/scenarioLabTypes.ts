/**
 * Scenario Lab Types
 *
 * Transparent, deterministic title-path modelling.
 * This module produces a Title Path Index, not a title-win probability.
 */

export type ScenarioLabReadiness =
  | 'INSUFFICIENT_DATA'
  | 'PARTIAL_ARCHIVE'
  | 'MODEL_READY';

export type ScenarioFactorId =
  | 'championshipPosition'
  | 'racePace'
  | 'qualifyingPace'
  | 'reliability'
  | 'recentForm'
  | 'teamPerformance'
  | 'teammateDelta';

export type ScenarioDataState =
  | 'verified'
  | 'calculated'
  | 'unavailable';

export interface ScenarioFactorScore {
  id: ScenarioFactorId;
  label: string;
  description: string;
  weight: number;
  rawValue: number | null;
  normalizedScore: number | null;
  contribution: number | null;
  dataState: ScenarioDataState;
}

export interface ScenarioCoverage {
  indexedRaceResults: number;
  indexedQualifyingSessions: number;
  completedRounds: number;
  remainingRounds: number;
  archiveCoveragePercent: number | null;
}

export interface ScenarioContender {
  driverNumber: number;
  driverName: string;
  driverAcronym: string;
  teamName: string;
  teamColour: string;
  currentPosition: number;
  currentPoints: number;
  gapToLeader: number | null;

  /**
   * A transparent weighted score from 0–100.
   * It is not a probability and does not claim who will win the title.
   */
  titlePathIndex: number | null;

  factorScores: ScenarioFactorScore[];
  observations: string[];
}

export interface ScenarioLabSnapshot {
  readiness: ScenarioLabReadiness;
  coverage: ScenarioCoverage;
  contenders: ScenarioContender[];
  methodologyNotes: string[];
  modelLabel: 'TITLE PATH INDEX';
  disclaimer: 'Model estimate — not a title-win probability or betting advice.';
}

export interface ScenarioLabConfig {
  contenderLimit: number;
  minimumIndexedRaceResults: number;
  factorWeights: Record<ScenarioFactorId, number>;
}