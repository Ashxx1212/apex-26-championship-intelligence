import type {
  ChampionshipDataSnapshot,
  DriverStanding,
  OpenF1Meeting,
  RaceResult,
} from '../types/f1';
import type {
  ForecastConfidence,
  ForecastFactorBreakdown,
  RaceForecast,
  RaceForecastCandidate,
  WeatherOutlook,
} from '../types/forecast';

const INVALID_FINISH_STATUSES = new Set(['dnf', 'dns', 'dsq']);
const MAX_GRID_SIZE = 20;

function clamp(value: number, min = 0, max = 100): number {
  return Math.min(max, Math.max(min, value));
}

function positionToScore(position: number | null): number {
  if (position === null || !Number.isFinite(position)) return 0;

  return clamp(100 - ((position - 1) / (MAX_GRID_SIZE - 1)) * 100);
}

function getRecentResults(
  raceResults: RaceResult[],
  driverNumber: number,
  limit = 3
) {
  return raceResults
    .slice(-limit)
    .map((race) => race.driverResults.get(driverNumber))
    .filter((result): result is NonNullable<typeof result> => Boolean(result));
}

function calculateRecentFormScore(
  raceResults: RaceResult[],
  driverNumber: number
): number {
  const recent = getRecentResults(raceResults, driverNumber);

  if (recent.length === 0) return 0;

  const scores = recent.map((result) => {
    if (
      result.racePosition === null ||
      INVALID_FINISH_STATUSES.has(result.raceStatus.toLowerCase())
    ) {
      return 0;
    }

    return positionToScore(result.racePosition);
  });

  return scores.reduce((sum, score) => sum + score, 0) / scores.length;
}

function calculateRacePaceScore(standing: DriverStanding): number {
  return positionToScore(standing.averageRaceFinish);
}

function calculateQualifyingScore(
  raceResults: RaceResult[],
  driverNumber: number
): number {
  const qualifyingPositions = raceResults
    .map((race) => race.driverResults.get(driverNumber)?.qualifyingPosition)
    .filter((position): position is number => position !== null && position !== undefined);

  if (qualifyingPositions.length === 0) return 0;

  const average =
    qualifyingPositions.reduce((sum, position) => sum + position, 0) /
    qualifyingPositions.length;

  return positionToScore(average);
}

function calculateTeamScore(
  data: ChampionshipDataSnapshot,
  standing: DriverStanding
): number {
  const team = data.teamStandings.find(
    (candidate) => candidate.teamName === standing.teamName
  );

  if (!team) return 0;

  if (team.performanceIndex !== null && team.performanceIndex !== undefined) {
    return clamp(team.performanceIndex);
  }

  const pointsPerRound =
    data.completedRounds > 0 ? team.points / data.completedRounds : 0;

  return clamp((pointsPerRound / 44) * 100);
}

function calculateReliabilityScore(standing: DriverStanding): number {
  if (
    standing.raceCompletionRate !== null &&
    standing.raceCompletionRate !== undefined
  ) {
    return clamp(standing.raceCompletionRate);
  }

  return 50;
}

function calculateFactors(
  data: ChampionshipDataSnapshot,
  standing: DriverStanding
): ForecastFactorBreakdown {
  return {
    recentForm: Math.round(
      calculateRecentFormScore(data.raceResults, standing.driverNumber)
    ),
    racePace: Math.round(calculateRacePaceScore(standing)),
    qualifying: Math.round(
      calculateQualifyingScore(data.raceResults, standing.driverNumber)
    ),
    teamPerformance: Math.round(calculateTeamScore(data, standing)),
    reliability: Math.round(calculateReliabilityScore(standing)),
  };
}

function calculateModelScore(factors: ForecastFactorBreakdown): number {
  return (
    factors.recentForm * 0.3 +
    factors.racePace * 0.22 +
    factors.qualifying * 0.16 +
    factors.teamPerformance * 0.18 +
    factors.reliability * 0.14
  );
}

function calculateConfidence(
  data: ChampionshipDataSnapshot,
  weather: WeatherOutlook | null
): { confidence: ForecastConfidence; reason: string } {
  const indexedResults = data.raceResults.length;
  const totalCompleted = Math.max(data.completedRounds, indexedResults);

  let confidence: ForecastConfidence =
    indexedResults >= 12 ? 'HIGH' : indexedResults >= 6 ? 'MODERATE' : 'LIMITED';

  let reason = `${indexedResults}/${totalCompleted || indexedResults} completed race results are available to the model.`;

  if (weather?.status === 'AVAILABLE' && (weather.rainProbability ?? 0) >= 60) {
    if (confidence === 'HIGH') confidence = 'MODERATE';
    if (confidence === 'MODERATE') confidence = 'LIMITED';
    reason += ' Elevated rain risk increases race-outcome uncertainty.';
  }

  return { confidence, reason };
}

function calculateWeatherVolatility(
  weather: WeatherOutlook | null
): { level: 'LOW' | 'MEDIUM' | 'HIGH'; reason: string } {
  if (!weather || weather.status !== 'AVAILABLE') {
    return {
      level: 'MEDIUM',
      reason: 'Weather signal is not yet available, so no condition-specific adjustment is applied.',
    };
  }

  const rainRisk = weather.rainProbability ?? 0;
  const wind = weather.windSpeed ?? 0;

  if (rainRisk >= 60 || wind >= 35) {
    return {
      level: 'HIGH',
      reason: 'Rain probability or wind conditions indicate a higher-variance race.',
    };
  }

  if (rainRisk >= 30 || wind >= 20) {
    return {
      level: 'MEDIUM',
      reason: 'Mixed conditions may increase race variance.',
    };
  }

  return {
    level: 'LOW',
    reason: 'Forecast conditions currently indicate a lower-variance race.',
  };
}

function toProbabilities(
  candidates: Array<{
    standing: DriverStanding;
    factors: ForecastFactorBreakdown;
    score: number;
  }>
): RaceForecastCandidate[] {
  const maxScore = Math.max(...candidates.map((candidate) => candidate.score), 1);
  const temperature = 10;

  const weighted = candidates.map((candidate) => ({
    ...candidate,
    weight: Math.exp((candidate.score - maxScore) / temperature),
  }));

  const totalWeight = weighted.reduce((sum, candidate) => sum + candidate.weight, 0);

  return weighted
    .map((candidate) => ({
      driverNumber: candidate.standing.driverNumber,
      driverName: candidate.standing.driverName,
      driverAcronym: candidate.standing.driverAcronym,
      teamName: candidate.standing.teamName,
      teamColour: candidate.standing.teamColour,
      winProbability:
        totalWeight > 0 ? (candidate.weight / totalWeight) * 100 : 0,
      modelScore: Math.round(candidate.score * 10) / 10,
      factors: candidate.factors,
    }))
    .sort((a, b) => b.winProbability - a.winProbability);
}

/**
 * Produces a transparent, evidence-weighted win outlook.
 *
 * Important: this is a portfolio-model estimate based on completed current-season
 * results. It is not a betting product, an official F1 forecast, or a guarantee.
 */
export function buildRaceForecast(
  data: ChampionshipDataSnapshot,
  meeting: OpenF1Meeting,
  weather: WeatherOutlook | null
): RaceForecast {
  const candidateInputs = data.driverStandings
    .filter((standing) => standing.points > 0 || standing.averageRaceFinish !== null)
    .map((standing) => {
      const factors = calculateFactors(data, standing);

      return {
        standing,
        factors,
        score: calculateModelScore(factors),
      };
    });

  const { confidence, reason } = calculateConfidence(data, weather);
  const weatherVolatility = calculateWeatherVolatility(weather);

  return {
    meetingKey: meeting.meeting_key,
    meetingName: meeting.meeting_name,
    generatedAt: new Date().toISOString(),
    completedRounds: data.completedRounds,
    indexedResults: data.raceResults.length,
    confidence,
    confidenceReason: reason,
    weatherVolatility: weatherVolatility.level,
    weatherVolatilityReason: weatherVolatility.reason,
    candidates: toProbabilities(candidateInputs).slice(0, 5),
  };
}
