import {
  calculateAverageQualifyingPosition,
  calculateAverageRaceFinish,
  calculateDNFCount,
  calculateRaceCompletionRate,
  calculateRecentFormScore,
  calculateTeammateGap,
} from '../../utils/championshipMetrics';
import type { ChampionshipDataSnapshot } from '../../types/f1';
import type { DriverIntelSnapshot } from './driverIntelTypes';

function formatOrdinal(position: number): string {
  const ordinals = ['th', 'st', 'nd', 'rd'];
  const remainder = position % 100;
  if (remainder >= 11 && remainder <= 13) {
    return `${position}th`;
  }
  const suffix = ordinals[remainder % 10] || 'th';
  return `${position}${suffix}`;
}

export function selectDriverIntelSnapshot(
  data: ChampionshipDataSnapshot | null,
  selectedDriverNumber: number | null
): DriverIntelSnapshot | null {
  if (!data) {
    return null;
  }

  const standing = data.driverStandings.find((item) => item.driverNumber === selectedDriverNumber)
    || data.driverStandings[0];

  if (!standing) {
    return null;
  }

  const driver = data.allDrivers.get(standing.driverNumber);
  const teamDrivers = data.driversByTeam.get(standing.teamName) || [];
  const teammateDriver = teamDrivers.find((item) => item.driver_number !== standing.driverNumber);
  const teammateStanding = teammateDriver
    ? data.driverStandings.find((item) => item.driverNumber === teammateDriver.driver_number)
    : null;

  const raceHistory = data.raceResults
    .filter((result) => result.driverResults.has(standing.driverNumber))
    .slice(-6)
    .map((result) => {
      const driverResult = result.driverResults.get(standing.driverNumber);
      return {
        round: result.round,
        meetingName: result.meetingName,
        circuitName: result.circuitName,
        racePosition: driverResult?.racePosition ?? null,
        qualifyingPosition: driverResult?.qualifyingPosition ?? null,
        raceStatus: driverResult?.raceStatus ?? 'finished',
        isWinner: result.winner?.driverNumber === standing.driverNumber,
      };
    });

  const averageRaceFinish = calculateAverageRaceFinish(data.raceResults, standing.driverNumber);
  const averageQualifyingPosition = calculateAverageQualifyingPosition(data.raceResults, standing.driverNumber);
  const raceCompletionRate = calculateRaceCompletionRate(data.raceResults, standing.driverNumber);
  const dnfCount = calculateDNFCount(data.raceResults, standing.driverNumber);
  const recentForm = calculateRecentFormScore(data.raceResults, standing.driverNumber);
  const teammateGap = teammateStanding
    ? calculateTeammateGap(data.raceResults, standing.driverNumber, teammateStanding.driverNumber)
    : null;

  const observations: string[] = [];

  if (averageRaceFinish !== null) {
    observations.push(`Average race finish ${averageRaceFinish}${formatOrdinal(Math.round(averageRaceFinish))}`);
  }

  if (averageQualifyingPosition !== null) {
    observations.push(`Average qualifying position ${averageQualifyingPosition}${formatOrdinal(Math.round(averageQualifyingPosition))}`);
  }

  if (raceCompletionRate !== null) {
    observations.push(`${raceCompletionRate}% of starts converted into a classified finish`);
  }

  if (teammateGap !== null) {
    observations.push(
      teammateGap < 0
        ? `Averaged ${Math.abs(teammateGap)} place${Math.abs(teammateGap) === 1 ? '' : 's'} ahead of the teammate comparison`
        : `Averaged ${teammateGap} place${teammateGap === 1 ? '' : 's'} behind the teammate comparison`
    );
  }

  if (data.analyticsArchive.hasPendingWork) {
    observations.push(`Archive coverage remains partial at ${data.analyticsCoverage.indexedRaceResults}/${data.analyticsCoverage.totalCompletedRaceSessions} completed rounds`);
  }

  return {
    driverNumber: standing.driverNumber,
    driverName: standing.driverName,
    driverAcronym: standing.driverAcronym,
    teamName: standing.teamName,
    teamColour: standing.teamColour,
    position: standing.position,
    points: standing.points,
    gapToLeader: standing.gapToLeader,
    recentForm,
    averageRaceFinish,
    averageQualifyingPosition,
    raceCompletionRate,
    dnfCount,
    teammateGap,
    teammate: teammateStanding
      ? {
          driverNumber: teammateStanding.driverNumber,
          driverName: teammateStanding.driverName,
          driverAcronym: teammateStanding.driverAcronym,
          teamName: teammateStanding.teamName,
          position: teammateStanding.position,
          points: teammateStanding.points,
          recentForm: teammateStanding.recentForm,
        }
      : null,
    raceHistory,
    archiveCoverage: {
      indexedRaceResults: data.analyticsCoverage.indexedRaceResults,
      totalCompletedRaceSessions: data.analyticsCoverage.totalCompletedRaceSessions,
      hasPendingWork: data.analyticsArchive.hasPendingWork,
    },
    observations,
  };
}
