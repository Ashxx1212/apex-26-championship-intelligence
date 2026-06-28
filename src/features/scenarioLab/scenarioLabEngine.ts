/**
 * Scenario Lab Engine
 *
 * Pure deterministic title-path scoring based only on verified
 * championship standings and indexed archive data.
 *
 * Important:
 * - Produces a Title Path Index from 0–100.
 * - Does NOT produce title-win probabilities.
 * - Does NOT run Monte Carlo simulations.
 * - Makes no API requests.
 */

import type {
  ChampionshipDataSnapshot,
  DriverStanding,
  RaceResult,
  TeamStanding,
} from '../../types/f1';

import type {
  ScenarioContender,
  ScenarioCoverage,
  ScenarioFactorId,
  ScenarioFactorScore,
  ScenarioLabConfig,
  ScenarioLabReadiness,
  ScenarioLabSnapshot,
} from './scenarioLabTypes';

// -----------------------------------------------------------------------------
// Configuration
// -----------------------------------------------------------------------------

export const SCENARIO_LAB_CONFIG: ScenarioLabConfig = {
  contenderLimit: 5,
  minimumIndexedRaceResults: 3,
  factorWeights: {
    championshipPosition: 0.30,
    racePace: 0.18,
    qualifyingPace: 0.12,
    reliability: 0.14,
    recentForm: 0.10,
    teamPerformance: 0.10,
    teammateDelta: 0.06,
  },
};

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

const FORM_SCORES: Record<'W' | 'P' | 'D' | 'R', number> = {
  W: 100,
  P: 75,
  D: 45,
  R: 0,
};

// -----------------------------------------------------------------------------
// Internal Types
// -----------------------------------------------------------------------------

interface DriverScenarioMetrics {
  standing: DriverStanding;
  averageQualifyingPosition: number | null;
  teamPerformanceIndex: number | null;
  recentFormScore: number | null;
}

type RawFactorValues = Record<ScenarioFactorId, number | null>;

// -----------------------------------------------------------------------------
// General Helpers
// -----------------------------------------------------------------------------

function roundToOneDecimal(value: number): number {
  return Math.round(value * 10) / 10;
}

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, value));
}

function getCoverage(
  data: ChampionshipDataSnapshot
): ScenarioCoverage {
  const completedRounds =
    data.analyticsArchive?.totalCompletedRaceSessions ??
    data.completedRounds;

  const indexedRaceResults =
    data.analyticsCoverage?.indexedRaceResults ??
    data.raceResults.length;

  const indexedQualifyingSessions =
    data.analyticsCoverage?.indexedQualifyingSessions ??
    0;

  const remainingRounds = Math.max(
    0,
    data.totalGrandPrix - completedRounds
  );

  const archiveCoveragePercent =
    completedRounds > 0
      ? roundToOneDecimal((indexedRaceResults / completedRounds) * 100)
      : null;

  return {
    indexedRaceResults,
    indexedQualifyingSessions,
    completedRounds,
    remainingRounds,
    archiveCoveragePercent,
  };
}

function getReadiness(
  data: ChampionshipDataSnapshot,
  coverage: ScenarioCoverage
): ScenarioLabReadiness {
  if (
    data.driverStandings.length === 0 ||
    coverage.completedRounds === 0 ||
    coverage.indexedRaceResults <
      SCENARIO_LAB_CONFIG.minimumIndexedRaceResults
  ) {
    return 'INSUFFICIENT_DATA';
  }

  if (coverage.indexedRaceResults < coverage.completedRounds) {
    return 'PARTIAL_ARCHIVE';
  }

  return 'MODEL_READY';
}

// -----------------------------------------------------------------------------
// Metric Derivation
// -----------------------------------------------------------------------------

function calculateAverageQualifyingPosition(
  raceResults: RaceResult[],
  driverNumber: number
): number | null {
  const qualifyingPositions: number[] = [];

  for (const race of raceResults) {
    const result = race.driverResults.get(driverNumber);

    if (result?.qualifyingPosition !== null && result?.qualifyingPosition !== undefined) {
      qualifyingPositions.push(result.qualifyingPosition);
    }
  }

  if (qualifyingPositions.length === 0) {
    return null;
  }

  const total = qualifyingPositions.reduce(
    (sum, position) => sum + position,
    0
  );

  return roundToOneDecimal(total / qualifyingPositions.length);
}

function getTeamPerformanceIndex(
  teamStandings: TeamStanding[],
  teamName: string
): number | null {
  const matchingTeam = teamStandings.find(
    (team) => team.teamName === teamName
  );

  return matchingTeam?.performanceIndex ?? null;
}

function calculateRecentFormScore(
  recentForm: DriverStanding['recentForm']
): number | null {
  if (recentForm.length === 0) {
    return null;
  }

  const total = recentForm.reduce(
    (sum, result) => sum + FORM_SCORES[result],
    0
  );

  return roundToOneDecimal(total / recentForm.length);
}

function buildDriverMetrics(
  standings: DriverStanding[],
  teamStandings: TeamStanding[],
  raceResults: RaceResult[]
): DriverScenarioMetrics[] {
  return standings.map((standing) => ({
    standing,
    averageQualifyingPosition: calculateAverageQualifyingPosition(
      raceResults,
      standing.driverNumber
    ),
    teamPerformanceIndex: getTeamPerformanceIndex(
      teamStandings,
      standing.teamName
    ),
    recentFormScore: calculateRecentFormScore(standing.recentForm),
  }));
}

// -----------------------------------------------------------------------------
// Score Normalisation
// -----------------------------------------------------------------------------

/**
 * Converts a list where HIGHER is better into 0–100 scores.
 * null values remain null.
 */
function normalizeHigherIsBetter(
  values: Array<number | null>
): Array<number | null> {
  const validValues = values.filter(
    (value): value is number => value !== null
  );

  if (validValues.length === 0) {
    return values.map(() => null);
  }

  const minimum = Math.min(...validValues);
  const maximum = Math.max(...validValues);

  if (minimum === maximum) {
    return values.map((value) => (value === null ? null : 100));
  }

  return values.map((value) => {
    if (value === null) {
      return null;
    }

    return clampScore(((value - minimum) / (maximum - minimum)) * 100);
  });
}

/**
 * Converts a list where LOWER is better into 0–100 scores.
 * null values remain null.
 */
function normalizeLowerIsBetter(
  values: Array<number | null>
): Array<number | null> {
  const validValues = values.filter(
    (value): value is number => value !== null
  );

  if (validValues.length === 0) {
    return values.map(() => null);
  }

  const minimum = Math.min(...validValues);
  const maximum = Math.max(...validValues);

  if (minimum === maximum) {
    return values.map((value) => (value === null ? null : 100));
  }

  return values.map((value) => {
    if (value === null) {
      return null;
    }

    return clampScore(((maximum - value) / (maximum - minimum)) * 100);
  });
}

function buildRawFactorValues(
  metrics: DriverScenarioMetrics
): RawFactorValues {
  return {
    championshipPosition: metrics.standing.points,
    racePace: metrics.standing.averageRaceFinish,
    qualifyingPace: metrics.averageQualifyingPosition,
    reliability: metrics.standing.raceCompletionRate,
    recentForm: metrics.recentFormScore,
    teamPerformance: metrics.teamPerformanceIndex,
    teammateDelta: metrics.standing.teammateGap ?? null,
  };
}

function getFactorMetadata(
  factorId: ScenarioFactorId
): Pick<ScenarioFactorScore, 'label' | 'description'> {
  const metadata: Record<
    ScenarioFactorId,
    Pick<ScenarioFactorScore, 'label' | 'description'>
  > = {
    championshipPosition: {
      label: 'Championship Position',
      description: 'Current points position relative to title contenders',
    },
    racePace: {
      label: 'Race Pace',
      description: 'Average classified race finishing position',
    },
    qualifyingPace: {
      label: 'Qualifying Pace',
      description: 'Average qualifying position from indexed sessions',
    },
    reliability: {
      label: 'Reliability',
      description: 'Classified race completion rate',
    },
    recentForm: {
      label: 'Recent Form',
      description: 'Recent indexed race outcomes using W / P / D / R form',
    },
    teamPerformance: {
      label: 'Team Performance',
      description: 'Constructor performance index from verified standings',
    },
    teammateDelta: {
      label: 'Teammate Delta',
      description: 'Average finish-position difference versus teammate',
    },
  };

  return metadata[factorId];
}

// -----------------------------------------------------------------------------
// Factor Scoring
// -----------------------------------------------------------------------------

function buildNormalizedFactorScores(
  metrics: DriverScenarioMetrics[]
): Array<Record<ScenarioFactorId, number | null>> {
  const rawFactors = metrics.map(buildRawFactorValues);

  const championshipPosition = normalizeHigherIsBetter(
    rawFactors.map((factor) => factor.championshipPosition)
  );

  const racePace = normalizeLowerIsBetter(
    rawFactors.map((factor) => factor.racePace)
  );

  const qualifyingPace = normalizeLowerIsBetter(
    rawFactors.map((factor) => factor.qualifyingPace)
  );

  const reliability = normalizeHigherIsBetter(
    rawFactors.map((factor) => factor.reliability)
  );

  const recentForm = normalizeHigherIsBetter(
    rawFactors.map((factor) => factor.recentForm)
  );

  const teamPerformance = normalizeHigherIsBetter(
    rawFactors.map((factor) => factor.teamPerformance)
  );

  /**
   * Negative teammate gap means the selected driver tends to finish
   * ahead of their teammate. Lower is therefore better.
   */
  const teammateDelta = normalizeLowerIsBetter(
    rawFactors.map((factor) => factor.teammateDelta)
  );

  return metrics.map((_, index) => ({
    championshipPosition: championshipPosition[index],
    racePace: racePace[index],
    qualifyingPace: qualifyingPace[index],
    reliability: reliability[index],
    recentForm: recentForm[index],
    teamPerformance: teamPerformance[index],
    teammateDelta: teammateDelta[index],
  }));
}

function buildFactorScores(
  rawValues: RawFactorValues,
  normalizedScores: Record<ScenarioFactorId, number | null>
): ScenarioFactorScore[] {
  const factorIds = Object.keys(
    SCENARIO_LAB_CONFIG.factorWeights
  ) as ScenarioFactorId[];

  return factorIds.map((factorId) => {
    const normalizedScore = normalizedScores[factorId];
    const weight = SCENARIO_LAB_CONFIG.factorWeights[factorId];
    const metadata = getFactorMetadata(factorId);

    return {
      id: factorId,
      label: metadata.label,
      description: metadata.description,
      weight,
      rawValue: rawValues[factorId],
      normalizedScore:
        normalizedScore === null ? null : roundToOneDecimal(normalizedScore),
      contribution:
        normalizedScore === null
          ? null
          : roundToOneDecimal(normalizedScore * weight),
      dataState:
        rawValues[factorId] === null
          ? 'unavailable'
          : factorId === 'championshipPosition'
            ? 'verified'
            : 'calculated',
    };
  });
}

function calculateTitlePathIndex(
  factorScores: ScenarioFactorScore[]
): number | null {
  const usableFactors = factorScores.filter(
    (factor): factor is ScenarioFactorScore & {
      contribution: number;
    } => factor.contribution !== null
  );

  if (usableFactors.length === 0) {
    return null;
  }

  const availableWeight = usableFactors.reduce(
    (sum, factor) => sum + factor.weight,
    0
  );

  if (availableWeight === 0) {
    return null;
  }

  const weightedTotal = usableFactors.reduce(
    (sum, factor) => sum + factor.contribution,
    0
  );

  /**
   * Re-scales only the verified/calculated factors available for
   * this driver. Missing data never becomes an artificial zero.
   */
  return roundToOneDecimal(weightedTotal / availableWeight);
}

// -----------------------------------------------------------------------------
// Transparent Observations
// -----------------------------------------------------------------------------

function buildObservations(
  metrics: DriverScenarioMetrics,
  coverage: ScenarioCoverage
): string[] {
  const observations: string[] = [];

  if (
    coverage.indexedRaceResults < coverage.completedRounds &&
    coverage.completedRounds > 0
  ) {
    observations.push(
      `Archive coverage is partial: ${coverage.indexedRaceResults} of ${coverage.completedRounds} completed rounds are indexed.`
    );
  }

  if (
    metrics.standing.raceCompletionRate !== null &&
    metrics.standing.raceCompletionRate < 100
  ) {
    observations.push(
      `${metrics.standing.raceCompletionRate}% of indexed starts became classified finishes.`
    );
  }

  const teammateGap = metrics.standing.teammateGap ?? null;

if (teammateGap !== null) {
  const sharedResultText =
    teammateGap < 0
      ? `Finished ${Math.abs(teammateGap)} places ahead of teammate on average.`
      : teammateGap > 0
        ? `Finished ${teammateGap} places behind teammate on average.`
        : 'Evenly matched with teammate across shared classified results.';

  observations.push(sharedResultText);
}

  if (
    metrics.standing.averageRaceFinish !== null &&
    metrics.averageQualifyingPosition !== null
  ) {
    if (
      metrics.standing.averageRaceFinish <
      metrics.averageQualifyingPosition
    ) {
      observations.push(
        'Indexed race finishing average is stronger than indexed qualifying average.'
      );
    } else if (
      metrics.standing.averageRaceFinish >
      metrics.averageQualifyingPosition
    ) {
      observations.push(
        'Indexed qualifying average is stronger than indexed race finishing average.'
      );
    }
  }

  return observations.slice(0, 3);
}

// -----------------------------------------------------------------------------
// Public API
// -----------------------------------------------------------------------------

export function buildScenarioLabSnapshot(
  data: ChampionshipDataSnapshot | null
): ScenarioLabSnapshot {
  const emptyCoverage: ScenarioCoverage = {
    indexedRaceResults: 0,
    indexedQualifyingSessions: 0,
    completedRounds: 0,
    remainingRounds: 0,
    archiveCoveragePercent: null,
  };

  if (!data) {
    return {
      readiness: 'INSUFFICIENT_DATA',
      coverage: emptyCoverage,
      contenders: [],
      methodologyNotes: [
        'Scenario Lab requires verified championship standings and indexed race results.',
      ],
      modelLabel: 'TITLE PATH INDEX',
      disclaimer:
        'Model estimate — not a title-win probability or betting advice.',
    };
  }

  const coverage = getCoverage(data);
  const readiness = getReadiness(data, coverage);

  const contenderStandings = data.driverStandings
    .slice(0, SCENARIO_LAB_CONFIG.contenderLimit);

  const metrics = buildDriverMetrics(
    contenderStandings,
    data.teamStandings,
    data.raceResults
  );

  const normalizedScores = buildNormalizedFactorScores(metrics);

  const leaderPoints = contenderStandings[0]?.points ?? 0;

  const contenders: ScenarioContender[] = metrics.map(
    (driverMetrics, index) => {
      const rawValues = buildRawFactorValues(driverMetrics);

      const factorScores = buildFactorScores(
        rawValues,
        normalizedScores[index]
      );

      return {
        driverNumber: driverMetrics.standing.driverNumber,
        driverName: driverMetrics.standing.driverName,
        driverAcronym: driverMetrics.standing.driverAcronym,
        teamName: driverMetrics.standing.teamName,
        teamColour: driverMetrics.standing.teamColour,
        currentPosition: driverMetrics.standing.position,
        currentPoints: driverMetrics.standing.points,
        gapToLeader:
          driverMetrics.standing.position === 1
            ? 0
            : Math.max(0, leaderPoints - driverMetrics.standing.points),
        titlePathIndex:
          readiness === 'INSUFFICIENT_DATA'
            ? null
            : calculateTitlePathIndex(factorScores),
        factorScores,
        observations: buildObservations(driverMetrics, coverage),
      };
    }
  );

  return {
    readiness,
    coverage,
    contenders,
    methodologyNotes: [
      'The Title Path Index combines current championship position, pace, reliability, recent form, team performance, and teammate comparison.',
      'Scores are normalised only across the current contender set and are not title-win probabilities.',
      'Missing verified data is excluded from a driver’s weighted score rather than being treated as zero.',
      'Scenario Lab does not predict a champion and does not provide betting advice.',
    ],
    modelLabel: 'TITLE PATH INDEX',
    disclaimer:
      'Model estimate — not a title-win probability or betting advice.',
  };
}