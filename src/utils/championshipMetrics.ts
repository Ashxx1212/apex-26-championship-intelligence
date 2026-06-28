import type { RaceResult, DriverStanding, TeamStanding } from '../types/f1';

// DNF, DNS, DSQ are not valid finishing positions
const INVALID_FINISH_STATUSES = ['dnf', 'dns', 'dsq'];

/**
 * Calculate average race finishing position from race results
 * Returns null if insufficient valid finishes exist
 */
export function calculateAverageRaceFinish(
  raceResults: RaceResult[],
  driverNumber: number
): number | null {
  const validFinishes: number[] = [];

  for (const race of raceResults) {
    const result = race.driverResults.get(driverNumber);
    if (
      result &&
      result.racePosition !== null &&
      !INVALID_FINISH_STATUSES.includes(result.raceStatus.toLowerCase())
    ) {
      validFinishes.push(result.racePosition);
    }
  }

  if (validFinishes.length === 0) return null;

  const sum = validFinishes.reduce((acc, pos) => acc + pos, 0);
  return Math.round((sum / validFinishes.length) * 10) / 10;
}

/**
 * Calculate average qualifying position from race results
 * Returns null if insufficient qualifying data exists
 */
export function calculateAverageQualifyingPosition(
  raceResults: RaceResult[],
  driverNumber: number
): number | null {
  const validQuali: number[] = [];

  for (const race of raceResults) {
    const result = race.driverResults.get(driverNumber);
    if (result && result.qualifyingPosition !== null) {
      validQuali.push(result.qualifyingPosition);
    }
  }

  if (validQuali.length === 0) return null;

  const sum = validQuali.reduce((acc, pos) => acc + pos, 0);
  return Math.round((sum / validQuali.length) * 10) / 10;
}

/**
 * Count DNF, DNS, DSQ occurrences (Did Not Finish)
 */
export function calculateDNFCount(
  raceResults: RaceResult[],
  driverNumber: number
): number | null {
  if (raceResults.length === 0) return null;

  let dnfCount = 0;

  for (const race of raceResults) {
    const result = race.driverResults.get(driverNumber);
    if (result && INVALID_FINISH_STATUSES.includes(result.raceStatus.toLowerCase())) {
      dnfCount++;
    }
  }

  return dnfCount;
}

/**
 * Calculate race completion rate (percentage of races finished)
 */
export function calculateRaceCompletionRate(
  raceResults: RaceResult[],
  driverNumber: number
): number | null {
  if (raceResults.length === 0) return null;

  let completed = 0;
  let entered = 0;

  for (const race of raceResults) {
    const result = race.driverResults.get(driverNumber);
    if (result) {
      entered++;
      if (!INVALID_FINISH_STATUSES.includes(result.raceStatus.toLowerCase())) {
        completed++;
      }
    }
  }

  if (entered === 0) return null;

  return Math.round((completed / entered) * 100);
}

/**
 * Calculate recent form score from last 3 completed races
 * W = Win, P = Podium, D = Points finish, R = Retire/non-points
 */
export function calculateRecentFormScore(
  raceResults: RaceResult[],
  driverNumber: number
): ('W' | 'P' | 'D' | 'R')[] {
  if (raceResults.length === 0) return [];

  // Get last 3 races
  const last3Races = raceResults.slice(-3);

  const form: ('W' | 'P' | 'D' | 'R')[] = [];

  for (const race of last3Races) {
    const result = race.driverResults.get(driverNumber);
    if (!result || result.racePosition === null) {
      form.push('R');
      continue;
    }

    if (INVALID_FINISH_STATUSES.includes(result.raceStatus.toLowerCase())) {
      form.push('R');
      continue;
    }

    if (result.racePosition === 1) {
      form.push('W');
    } else if (result.racePosition <= 3) {
      form.push('P');
    } else if (result.points > 0) {
      form.push('D');
    } else {
      form.push('R');
    }
  }

  return form;
}

/**
 * Calculate average gap to teammate in race finishing position
 * Positive = teammate finished ahead on average
 * Negative = driver finished ahead on average
 */
export function calculateTeammateGap(
  raceResults: RaceResult[],
  driverNumber: number,
  teammateNumber: number
): number | null {
  const gaps: number[] = [];

  for (const race of raceResults) {
    const driverResult = race.driverResults.get(driverNumber);
    const teammateResult = race.driverResults.get(teammateNumber);

    if (
      driverResult &&
      teammateResult &&
      driverResult.racePosition !== null &&
      teammateResult.racePosition !== null &&
      !INVALID_FINISH_STATUSES.includes(driverResult.raceStatus.toLowerCase()) &&
      !INVALID_FINISH_STATUSES.includes(teammateResult.raceStatus.toLowerCase())
    ) {
      gaps.push(driverResult.racePosition - teammateResult.racePosition);
    }
  }

  if (gaps.length === 0) return null;

  const sum = gaps.reduce((acc, gap) => acc + gap, 0);
  return Math.round((sum / gaps.length) * 10) / 10;
}

/**
 * Calculate team performance index
 * Based on average points per race and finishing rate
 * Scale: 0-100
 */
export function calculateTeamPerformanceIndex(
  teamStandings: TeamStanding[],
  teamName: string,
  completedRounds: number
): number | null {
  if (completedRounds === 0) return null;

  const team = teamStandings.find((t) => t.teamName === teamName);
  if (!team) return null;

  // Points per race as base metric
  const avgPoints = team.points / completedRounds;

  // Scale to 0-100 (max ~50 points per race for a team, normalize)
  const index = Math.min(100, Math.round((avgPoints / 44) * 100));

  return index;
}

/**
 * Format position with ordinal suffix
 */
export function formatPosition(position: number | null): string {
  if (position === null) return '—';

  const ordinals = ['th', 'st', 'nd', 'rd'];
  const remainder = position % 100;

  if (remainder >= 11 && remainder <= 13) {
    return `${position}th`;
  }

  const ordinal = ordinals[remainder % 10] || 'th';
  return `${position}${ordinal}`;
}

/**
 * Format points gap with sign
 */
export function formatPointsGap(gap: number | null): string {
  if (gap === null) return '—';
  if (gap === 0) return '0';
  return `+${gap}`;
}

/**
 * Calculate driver standings with metrics
 */
export function enrichDriverStandings(
  standings: DriverStanding[],
  raceResults: RaceResult[],
  driversByTeam: Map<string, { driver_number: number }[]>
): DriverStanding[] {
  return standings.map((standing) => {
    const recentForm = calculateRecentFormScore(raceResults, standing.driverNumber);
    const avgRaceFinish = calculateAverageRaceFinish(raceResults, standing.driverNumber);
    const completionRate = calculateRaceCompletionRate(raceResults, standing.driverNumber);
    const dnfCount = calculateDNFCount(raceResults, standing.driverNumber);

    // Find teammate
    let teammateGap: number | null = null;
    const teamDrivers = driversByTeam.get(standing.teamName);
    if (teamDrivers && teamDrivers.length === 2) {
      const teammate = teamDrivers.find((d) => d.driver_number !== standing.driverNumber);
      if (teammate) {
        teammateGap = calculateTeammateGap(raceResults, standing.driverNumber, teammate.driver_number);
      }
    }

    return {
      ...standing,
      recentForm,
      averageRaceFinish: avgRaceFinish,
      raceCompletionRate: completionRate,
      dnfCount,
      teammateGap,
    };
  });
}

/**
 * Enrich team standings with performance index
 */
export function enrichTeamStandings(
  standings: TeamStanding[],
  completedRounds: number
): TeamStanding[] {
  return standings.map((standing) => ({
    ...standing,
    performanceIndex: calculateTeamPerformanceIndex(
      standings,
      standing.teamName,
      completedRounds
    ),
  }));
}
