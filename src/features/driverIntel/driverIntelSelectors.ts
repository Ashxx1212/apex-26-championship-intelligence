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

function formatOneDecimal(value: number): string {
  return value.toFixed(1);
}

export function selectDriverIntelSnapshot(
  data: ChampionshipDataSnapshot | null,
  selectedDriverNumber: number | null
): DriverIntelSnapshot | null {
  if (!data) {
    return null;
  }

  const standing =
    data.driverStandings.find(
      (item) => item.driverNumber === selectedDriverNumber
    ) || data.driverStandings[0];

  if (!standing) {
    return null;
  }

  const teamDrivers = data.driversByTeam.get(standing.teamName) || [];
  const teammateDriver = teamDrivers.find(
    (item) => item.driver_number !== standing.driverNumber
  );

  const teammateStanding = teammateDriver
    ? data.driverStandings.find(
        (item) => item.driverNumber === teammateDriver.driver_number
      )
    : null;

  const raceHistory = data.raceResults
    .filter((result) => result.driverResults.has(standing.driverNumber))
    .sort((left, right) => left.round - right.round)
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

  const latestVerifiedResult =
    raceHistory.length > 0 ? raceHistory[raceHistory.length - 1] : null;

  const averageRaceFinish = calculateAverageRaceFinish(
    data.raceResults,
    standing.driverNumber
  );
  const averageQualifyingPosition = calculateAverageQualifyingPosition(
    data.raceResults,
    standing.driverNumber
  );
  const raceCompletionRate = calculateRaceCompletionRate(
    data.raceResults,
    standing.driverNumber
  );
  const dnfCount = calculateDNFCount(data.raceResults, standing.driverNumber);
  const recentForm = calculateRecentFormScore(
    data.raceResults,
    standing.driverNumber
  );
  const teammateGap = teammateStanding
    ? calculateTeammateGap(
        data.raceResults,
        standing.driverNumber,
        teammateStanding.driverNumber
      )
    : null;

  const observations: string[] = [];

  if (latestVerifiedResult) {
    if (latestVerifiedResult.racePosition !== null) {
      observations.push(
        `Latest verified result: P${latestVerifiedResult.racePosition} at ${latestVerifiedResult.meetingName}.`
      );
    } else {
      observations.push(
        `Latest verified result at ${latestVerifiedResult.meetingName} has no classified finish value.`
      );
    }
  }

  if (averageRaceFinish !== null) {
    observations.push(
      `Average classified race finish: ${formatOneDecimal(averageRaceFinish)} across indexed rounds.`
    );
  }

  if (averageQualifyingPosition !== null) {
    observations.push(
      `Average qualifying position: ${formatOneDecimal(averageQualifyingPosition)} across indexed rounds.`
    );
  }

  if (raceCompletionRate !== null) {
    observations.push(
      `${raceCompletionRate}% of indexed starts converted into a classified finish.`
    );
  }

  if (dnfCount !== null && dnfCount > 0) {
    observations.push(`${dnfCount} DNF record${dnfCount === 1 ? '' : 's'} in the indexed archive.`);
  }

  if (teammateGap !== null) {
    const magnitude = Math.abs(teammateGap);
    const placeLabel = magnitude === 1 ? 'place' : 'places';

    observations.push(
      teammateGap < 0
        ? `Averaged ${magnitude} ${placeLabel} ahead of the teammate comparison.`
        : teammateGap > 0
          ? `Averaged ${magnitude} ${placeLabel} behind the teammate comparison.`
          : 'Matched the teammate comparison on average classified finish.'
    );
  }

  if (data.analyticsArchive.hasPendingWork) {
    observations.push(
      `Archive coverage remains partial at ${data.analyticsCoverage.indexedRaceResults}/${data.analyticsCoverage.totalCompletedRaceSessions} completed rounds.`
    );
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
    latestVerifiedResult,
    archiveCoverage: {
      indexedRaceResults: data.analyticsCoverage.indexedRaceResults,
      totalCompletedRaceSessions:
        data.analyticsCoverage.totalCompletedRaceSessions,
      hasPendingWork: data.analyticsArchive.hasPendingWork,
    },
    observations,
  };
}
