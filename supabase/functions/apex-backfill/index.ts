import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const jsonHeaders = {
  "Content-Type": "application/json",
  Allow: "POST",
};

const OPENF1_BASE_URL = "https://api.openf1.org/v1";
const SEASON = 2026;
const BACKFILL_BATCH_SIZE = 3;

type OpenF1Session = {
  session_key: number;
  meeting_key: number;
  session_name: string;
  date_end: string | null;
};

type OpenF1ChampionshipDriver = {
  driver_number: number;
  meeting_key: number;
  session_key: number;
  position_current: number;
  points_current: number;
  points_start?: number | null;
};

type OpenF1SessionResult = {
  dnf: boolean;
  dns: boolean;
  dsq: boolean;
  driver_number: number;
  meeting_key: number;
  session_key: number;
  position: number | null;
  number_of_laps: number | null;
  gap_to_leader: number | string | null;
};

type DbDriver = {
  id: string;
  driver_number: number;
  current_team_id: string | null;
};

type DbMeeting = {
  meeting_key: number;
  meeting_name: string;
};

type ProcessedMeeting = {
  meetingKey: number;
  meetingName: string;
  raceSessionKey: number;
  qualifyingSessionKey: number | null;
  recordsUpserted: number;
  pointsFallbackRows: number;
};

type SkippedMeeting = {
  meetingKey: number;
  meetingName: string;
  reason: string;
};

function sleep(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function getRetryDelayMilliseconds(response: Response, attempt: number) {
  const retryAfterHeader = response.headers.get("retry-after");
  const retryAfterSeconds = retryAfterHeader
    ? Number(retryAfterHeader)
    : Number.NaN;

  if (Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0) {
    return retryAfterSeconds * 1000;
  }

  return attempt * 5000;
}

async function fetchJson<T>(
  endpointName: string,
  url: string,
): Promise<T> {
  const maximumAttempts = 3;

  for (let attempt = 1; attempt <= maximumAttempts; attempt += 1) {
    const response = await fetch(url);

    if (response.ok) {
      const data = (await response.json()) as T;

      await sleep(750);

      return data;
    }

    if (response.status === 429 && attempt < maximumAttempts) {
      await sleep(getRetryDelayMilliseconds(response, attempt));
      continue;
    }

    const responseText = await response.text();

    throw new Error(
      `OpenF1 ${endpointName} request failed: ` +
        `${response.status} ${response.statusText}. ` +
        `URL: ${url}. ` +
        `Response: ${responseText.slice(0, 300)}`,
    );
  }

  throw new Error(`OpenF1 ${endpointName} request failed after retry attempts.`);
}

async function fetchOptionalJson<T>(
  endpointName: string,
  url: string,
): Promise<T | null> {
  const maximumAttempts = 3;

  for (let attempt = 1; attempt <= maximumAttempts; attempt += 1) {
    const response = await fetch(url);

    if (response.ok) {
      const data = (await response.json()) as T;

      await sleep(750);

      return data;
    }

    const responseText = await response.text();

    if (
      response.status === 404 &&
      responseText.toLowerCase().includes("no results found")
    ) {
      await sleep(750);
      return null;
    }

    if (response.status === 429 && attempt < maximumAttempts) {
      await sleep(getRetryDelayMilliseconds(response, attempt));
      continue;
    }

    throw new Error(
      `OpenF1 ${endpointName} request failed: ` +
        `${response.status} ${response.statusText}. ` +
        `URL: ${url}. ` +
        `Response: ${responseText.slice(0, 300)}`,
    );
  }

  throw new Error(`OpenF1 ${endpointName} request failed after retry attempts.`);
}

function getCompletedRaceSessions(sessions: OpenF1Session[]) {
  const now = Date.now();

  return sessions
    .filter(
      (session) =>
        session.session_name === "Race" &&
        session.date_end !== null &&
        new Date(session.date_end).getTime() <= now,
    )
    .sort(
      (left, right) =>
        new Date(left.date_end ?? 0).getTime() -
        new Date(right.date_end ?? 0).getTime(),
    );
}

function getQualifyingSessionForRace(
  sessions: OpenF1Session[],
  raceSession: OpenF1Session,
) {
  const raceEndTime = new Date(raceSession.date_end ?? 0).getTime();

  return (
    sessions
      .filter(
        (session) =>
          session.meeting_key === raceSession.meeting_key &&
          session.session_name === "Qualifying" &&
          session.date_end !== null &&
          new Date(session.date_end).getTime() <= raceEndTime,
      )
      .sort(
        (left, right) =>
          new Date(right.date_end ?? 0).getTime() -
          new Date(left.date_end ?? 0).getTime(),
      )[0] ?? null
  );
}

function getRaceStatus(result: OpenF1SessionResult) {
  if (result.dsq) return "dsq";
  if (result.dns) return "dns";
  if (result.dnf) return "dnf";

  return "finished";
}

function isPositivePosition(value: number | null | undefined) {
  return typeof value === "number" && value > 0;
}

function calculateFallbackGrandPrixPoints(
  raceResult: OpenF1SessionResult,
) {
  if (raceResult.dnf || raceResult.dns || raceResult.dsq) {
    return 0;
  }

  const pointsByPosition: Record<number, number> = {
    1: 25,
    2: 18,
    3: 15,
    4: 12,
    5: 10,
    6: 8,
    7: 6,
    8: 4,
    9: 2,
    10: 1,
  };

  return pointsByPosition[raceResult.position ?? 0] ?? 0;
}

function calculateRacePoints(
  championshipStanding: OpenF1ChampionshipDriver | undefined,
  raceResult: OpenF1SessionResult,
) {
  const currentPoints = Number(championshipStanding?.points_current);
  const startingPoints = Number(championshipStanding?.points_start);

  if (
    Number.isFinite(currentPoints) &&
    Number.isFinite(startingPoints)
  ) {
    return {
      points: Math.max(
        0,
        Number((currentPoints - startingPoints).toFixed(3)),
      ),
      usedFallback: false,
    };
  }

  return {
    points: calculateFallbackGrandPrixPoints(raceResult),
    usedFallback: true,
  };
}

export default {
  fetch: async (req: Request) => {
    if (req.method !== "POST") {
      return Response.json(
        {
          ok: false,
          error: "Method not allowed. Use POST.",
        },
        {
          status: 405,
          headers: jsonHeaders,
        },
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      return Response.json(
        {
          ok: false,
          error: "Missing Supabase server environment variables.",
        },
        {
          status: 500,
          headers: jsonHeaders,
        },
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    let syncRunId: string | null = null;

    try {
      const syncStartedAt = new Date().toISOString();

      const { data: syncRun, error: syncRunInsertError } = await supabase
        .from("sync_runs")
        .insert({
          sync_type: "snapshot",
          source_name: "OpenF1",
          run_status: "running",
          started_at: syncStartedAt,
        })
        .select("id")
        .single();

      if (syncRunInsertError || !syncRun) {
        throw new Error(
          `Sync audit insert failed: ${
            syncRunInsertError?.message ?? "No audit row returned."
          }`,
        );
      }

      syncRunId = syncRun.id;

      const { data: databaseDrivers, error: databaseDriversError } =
        await supabase
          .from("drivers")
          .select("id, driver_number, current_team_id")
          .eq("season", SEASON);

      if (databaseDriversError) {
        throw new Error(
          `Drivers lookup failed: ${databaseDriversError.message}`,
        );
      }

      if (!databaseDrivers || databaseDrivers.length === 0) {
        throw new Error(
          "No synced drivers found. Run apex-sync successfully before apex-backfill.",
        );
      }

      const { data: databaseMeetings, error: databaseMeetingsError } =
        await supabase
          .from("meetings")
          .select("meeting_key, meeting_name")
          .eq("season", SEASON);

      if (databaseMeetingsError) {
        throw new Error(
          `Meetings lookup failed: ${databaseMeetingsError.message}`,
        );
      }

      const driverByNumber = new Map(
        (databaseDrivers as DbDriver[]).map((driver) => [
          driver.driver_number,
          {
            id: driver.id,
            teamId: driver.current_team_id,
          },
        ]),
      );

      const meetingNameByKey = new Map(
        ((databaseMeetings ?? []) as DbMeeting[]).map((meeting) => [
          meeting.meeting_key,
          meeting.meeting_name,
        ]),
      );

      const sessions = await fetchJson<OpenF1Session[]>(
        "sessions",
        `${OPENF1_BASE_URL}/sessions?year=${SEASON}`,
      );

      const completedRaceSessions = getCompletedRaceSessions(sessions);

      if (completedRaceSessions.length === 0) {
        throw new Error(
          `No completed Race sessions found for the ${SEASON} season.`,
        );
      }

      const latestRaceSession =
        completedRaceSessions[completedRaceSessions.length - 1];

      const historicalRaceSessions = completedRaceSessions.filter(
        (session) => session.session_key !== latestRaceSession.session_key,
      );

      let existingWinnerRows: Array<{ meeting_key: number }> = [];

      if (historicalRaceSessions.length > 0) {
        const historicalMeetingKeys = historicalRaceSessions.map(
          (session) => session.meeting_key,
        );

        const { data, error } = await supabase
          .from("race_results")
          .select("meeting_key")
          .in("meeting_key", historicalMeetingKeys)
          .eq("race_position", 1);

        if (error) {
          throw new Error(
            `Existing race result lookup failed: ${error.message}`,
          );
        }

        existingWinnerRows = (data ?? []) as Array<{ meeting_key: number }>;
      }

      const completedHistoricalMeetingKeys = new Set(
        existingWinnerRows.map((row) => row.meeting_key),
      );

      const missingHistoricalRaceSessions = historicalRaceSessions.filter(
        (session) => !completedHistoricalMeetingKeys.has(session.meeting_key),
      );

      const batchRaceSessions = missingHistoricalRaceSessions.slice(
        0,
        BACKFILL_BATCH_SIZE,
      );

      const processedMeetings: ProcessedMeeting[] = [];
      const skippedMeetings: SkippedMeeting[] = [];
      let raceResultsUpserted = 0;
      let pointsFallbackRows = 0;

      for (const raceSession of batchRaceSessions) {
        const meetingName =
          meetingNameByKey.get(raceSession.meeting_key) ??
          `Meeting ${raceSession.meeting_key}`;

        const raceResults = await fetchOptionalJson<OpenF1SessionResult[]>(
          "historical race session_result",
          `${OPENF1_BASE_URL}/session_result?session_key=${raceSession.session_key}`,
        );

        if (!raceResults || raceResults.length === 0) {
          skippedMeetings.push({
            meetingKey: raceSession.meeting_key,
            meetingName,
            reason: "Race results are not published by OpenF1 yet.",
          });
          continue;
        }

        if (!raceResults.some((result) => result.position === 1)) {
          skippedMeetings.push({
            meetingKey: raceSession.meeting_key,
            meetingName,
            reason: "Race results have no verified winner position yet.",
          });
          continue;
        }

        const qualifyingSession = getQualifyingSessionForRace(
          sessions,
          raceSession,
        );

        const qualifyingResults = qualifyingSession
          ? await fetchOptionalJson<OpenF1SessionResult[]>(
            "historical qualifying session_result",
            `${OPENF1_BASE_URL}/session_result?session_key=${qualifyingSession.session_key}`,
          )
          : null;

        const championshipDrivers =
          await fetchOptionalJson<OpenF1ChampionshipDriver[]>(
            "historical championship_drivers",
            `${OPENF1_BASE_URL}/championship_drivers?session_key=${raceSession.session_key}`,
          );

        const qualifyingResultByDriverNumber = new Map(
          (qualifyingResults ?? []).map((result) => [
            result.driver_number,
            result,
          ]),
        );

        const championshipStandingByDriverNumber = new Map(
          (championshipDrivers ?? []).map((standing) => [
            standing.driver_number,
            standing,
          ]),
        );

        let meetingFallbackRows = 0;

        const raceResultsToUpsert = raceResults.flatMap((raceResult) => {
          const driver = driverByNumber.get(raceResult.driver_number);

          if (!driver) {
            return [];
          }

          const qualifyingResult = qualifyingResultByDriverNumber.get(
            raceResult.driver_number,
          );

          const pointsCalculation = calculateRacePoints(
            championshipStandingByDriverNumber.get(raceResult.driver_number),
            raceResult,
          );

          if (pointsCalculation.usedFallback) {
            meetingFallbackRows += 1;
          }

          return [
            {
              meeting_key: raceResult.meeting_key,
              driver_id: driver.id,
              team_id: driver.teamId,
              race_session_key: raceResult.session_key,
              qualifying_session_key: qualifyingSession?.session_key ?? null,
              race_position: isPositivePosition(raceResult.position)
                ? raceResult.position
                : null,
              qualifying_position: isPositivePosition(
                qualifyingResult?.position,
              )
                ? qualifyingResult?.position
                : null,
              race_status: getRaceStatus(raceResult),
              points: pointsCalculation.points,
              laps_completed:
                typeof raceResult.number_of_laps === "number"
                  ? raceResult.number_of_laps
                  : null,
              gap_to_leader:
                raceResult.gap_to_leader === null ||
                raceResult.gap_to_leader === undefined
                  ? null
                  : String(raceResult.gap_to_leader),
              source_verified_at: syncStartedAt,
              updated_at: syncStartedAt,
            },
          ];
        });

        const hasSavedWinner = raceResultsToUpsert.some(
          (result) => result.race_position === 1,
        );

        if (!hasSavedWinner) {
          skippedMeetings.push({
            meetingKey: raceSession.meeting_key,
            meetingName,
            reason:
              "The winner could not be matched to a synced driver record.",
          });
          continue;
        }

        const { error: raceResultsUpsertError } = await supabase
          .from("race_results")
          .upsert(raceResultsToUpsert, {
            onConflict: "meeting_key,driver_id",
          });

        if (raceResultsUpsertError) {
          throw new Error(
            `Race results upsert failed for ${meetingName}: ` +
              raceResultsUpsertError.message,
          );
        }

        raceResultsUpserted += raceResultsToUpsert.length;
        pointsFallbackRows += meetingFallbackRows;

        processedMeetings.push({
          meetingKey: raceSession.meeting_key,
          meetingName,
          raceSessionKey: raceSession.session_key,
          qualifyingSessionKey: qualifyingSession?.session_key ?? null,
          recordsUpserted: raceResultsToUpsert.length,
          pointsFallbackRows: meetingFallbackRows,
        });
      }

      const remainingHistoricalRaceMeetings = Math.max(
        0,
        missingHistoricalRaceSessions.length - processedMeetings.length,
      );

      const backfillStatus =
        missingHistoricalRaceSessions.length === 0
          ? "COMPLETE"
          : processedMeetings.length === 0
            ? "WAITING_FOR_SOURCE_DATA"
            : remainingHistoricalRaceMeetings === 0
              ? "COMPLETE"
              : "IN_PROGRESS";

      const { error: syncRunSuccessUpdateError } = await supabase
        .from("sync_runs")
        .update({
          run_status: "success",
          finished_at: new Date().toISOString(),
          records_upserted: raceResultsUpserted,
          details: {
            season: SEASON,
            syncStrategy: "HISTORICAL_RACE_BACKFILL_BATCH",
            backfillBatchSize: BACKFILL_BATCH_SIZE,
            latestRaceSessionKey: latestRaceSession.session_key,
            completedHistoricalRaceMeetings:
              historicalRaceSessions.length -
              missingHistoricalRaceSessions.length +
              processedMeetings.length,
            remainingHistoricalRaceMeetings,
            backfillStatus,
            raceResultsUpserted,
            pointsFallbackRows,
            processedMeetings,
            skippedMeetings,
          },
        })
        .eq("id", syncRunId);

      if (syncRunSuccessUpdateError) {
        throw new Error(
          `Sync audit success update failed: ${syncRunSuccessUpdateError.message}`,
        );
      }

      return Response.json(
        {
          ok: true,
          service: "APEX 26 backend",
          function: "apex-backfill",
          season: SEASON,
          source: "OpenF1",
          syncStrategy: "HISTORICAL_RACE_BACKFILL_BATCH",
          backfillBatchSize: BACKFILL_BATCH_SIZE,
          latestRaceSessionKey: latestRaceSession.session_key,
          meetingsBackfilled: processedMeetings.length,
          raceResultsUpserted,
          pointsFallbackRows,
          remainingHistoricalRaceMeetings,
          backfillStatus,
          processedMeetings,
          skippedMeetings,
        },
        {
          status: 200,
          headers: jsonHeaders,
        },
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown backfill error";

      if (syncRunId) {
        await supabase
          .from("sync_runs")
          .update({
            run_status: "failed",
            finished_at: new Date().toISOString(),
            error_message: errorMessage,
          })
          .eq("id", syncRunId);
      }

      return Response.json(
        {
          ok: false,
          error: errorMessage,
        },
        {
          status: 500,
          headers: jsonHeaders,
        },
      );
    }
  },
};