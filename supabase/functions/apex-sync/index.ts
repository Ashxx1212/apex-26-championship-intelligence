import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const jsonHeaders = {
  "Content-Type": "application/json",
  Allow: "POST",
};

const OPENF1_BASE_URL = "https://api.openf1.org/v1";
const SEASON = 2026;

type OpenF1Meeting = {
  meeting_key: number;
  meeting_name: string;
  meeting_official_name: string;
  location: string;
  country_code: string;
  country_name: string;
  circuit_key: number;
  circuit_short_name: string;
  date_start: string;
  date_end: string;
};

type OpenF1Session = {
  session_key: number;
  meeting_key: number;
  session_name: string;
  date_end: string | null;
};

type OpenF1Driver = {
  driver_number: number;
  full_name: string;
  broadcast_name?: string;
  name_acronym?: string;
  first_name?: string;
  last_name?: string;
  country_code?: string;
  headshot_url?: string;
  team_name?: string;
  team_colour?: string;
};

type OpenF1ChampionshipDriver = {
  driver_number: number;
  meeting_key: number;
  session_key: number;
  position_current: number;
  points_current: number;
  points_start: number;
};

type OpenF1ChampionshipTeam = {
  meeting_key: number;
  session_key: number;
  team_name: string;
  position_current: number;
  points_current: number;
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

function sleep(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function normaliseName(value: string) {
  return value.trim().toLowerCase();
}

function isPositivePosition(value: number | null | undefined) {
  return typeof value === "number" && value > 0;
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

      // Keep sequential requests below OpenF1's public rate limit.
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

    // OpenF1 returns this when valid data has not yet been published.
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

function getLatestCompletedRaceSession(sessions: OpenF1Session[]) {
  const now = Date.now();

  const completedRaceSessions = sessions
    .filter(
      (session) =>
        session.session_name === "Race" &&
        session.date_end !== null &&
        new Date(session.date_end).getTime() <= now,
    )
    .sort(
      (a, b) =>
        new Date(b.date_end ?? 0).getTime() -
        new Date(a.date_end ?? 0).getTime(),
    );

  return completedRaceSessions[0] ?? null;
}

function getLatestCompletedQualifyingSession(
  sessions: OpenF1Session[],
  meetingKey: number,
) {
  const now = Date.now();

  const completedQualifyingSessions = sessions
    .filter(
      (session) =>
        session.meeting_key === meetingKey &&
        session.session_name === "Qualifying" &&
        session.date_end !== null &&
        new Date(session.date_end).getTime() <= now,
    )
    .sort(
      (a, b) =>
        new Date(b.date_end ?? 0).getTime() -
        new Date(a.date_end ?? 0).getTime(),
    );

  return completedQualifyingSessions[0] ?? null;
}

function calculatePerformanceIndex(
  teamPoints: number,
  leaderPoints: number,
) {
  if (leaderPoints <= 0) {
    return 0;
  }

  return Number(((teamPoints / leaderPoints) * 100).toFixed(2));
}

function calculateRacePoints(
  standing: OpenF1ChampionshipDriver | undefined,
) {
  if (!standing) {
    return 0;
  }

  const currentPoints = Number(standing.points_current ?? 0);
  const startingPoints = Number(standing.points_start ?? currentPoints);

  return Math.max(
    0,
    Number((currentPoints - startingPoints).toFixed(3)),
  );
}

function getRaceStatus(result: OpenF1SessionResult) {
  if (result.dsq) {
    return "dsq";
  }

  if (result.dns) {
    return "dns";
  }

  if (result.dnf) {
    return "dnf";
  }

  return "finished";
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

      // 1. Download source data.
      const meetings = await fetchJson<OpenF1Meeting[]>(
        "meetings",
        `${OPENF1_BASE_URL}/meetings?year=${SEASON}`,
      );

      const sessions = await fetchJson<OpenF1Session[]>(
        "sessions",
        `${OPENF1_BASE_URL}/sessions?year=${SEASON}`,
      );

      const latestRaceSession = getLatestCompletedRaceSession(sessions);

      if (!latestRaceSession) {
        throw new Error(
          `No completed Race session found for the ${SEASON} season.`,
        );
      }

      const latestQualifyingSession = getLatestCompletedQualifyingSession(
        sessions,
        latestRaceSession.meeting_key,
      );

      const openF1Drivers = await fetchJson<OpenF1Driver[]>(
        "drivers",
        `${OPENF1_BASE_URL}/drivers?session_key=${latestRaceSession.session_key}`,
      );

      const openF1DriverStandings =
        await fetchOptionalJson<OpenF1ChampionshipDriver[]>(
          "championship_drivers",
          `${OPENF1_BASE_URL}/championship_drivers?session_key=${latestRaceSession.session_key}`,
        );

      const openF1TeamStandings =
        await fetchOptionalJson<OpenF1ChampionshipTeam[]>(
          "championship_teams",
          `${OPENF1_BASE_URL}/championship_teams?session_key=${latestRaceSession.session_key}`,
        );

      const openF1RaceResults =
        await fetchOptionalJson<OpenF1SessionResult[]>(
          "race session_result",
          `${OPENF1_BASE_URL}/session_result?session_key=${latestRaceSession.session_key}`,
        );

      const openF1QualifyingResults = latestQualifyingSession
        ? await fetchOptionalJson<OpenF1SessionResult[]>(
          "qualifying session_result",
          `${OPENF1_BASE_URL}/session_result?session_key=${latestQualifyingSession.session_key}`,
        )
        : null;

      // 2. Build unique constructors from driver data.
      const teamMap = new Map<
        string,
        {
          team_name: string;
          team_colour: string | null;
        }
      >();

      for (const driver of openF1Drivers) {
        if (!driver.team_name) {
          continue;
        }

        teamMap.set(normaliseName(driver.team_name), {
          team_name: driver.team_name,
          team_colour: driver.team_colour ?? null,
        });
      }

      const syncTimestamp = new Date().toISOString();

      const meetingsToUpsert = meetings.map((meeting) => ({
        meeting_key: meeting.meeting_key,
        season: SEASON,
        meeting_name: meeting.meeting_name,
        meeting_official_name: meeting.meeting_official_name,
        location: meeting.location,
        country_code: meeting.country_code,
        country_name: meeting.country_name,
        circuit_key: meeting.circuit_key,
        circuit_short_name: meeting.circuit_short_name,
        date_start: meeting.date_start,
        date_end: meeting.date_end,
        source_updated_at: syncTimestamp,
        updated_at: syncTimestamp,
      }));

      const teamsToUpsert = Array.from(teamMap.values()).map((team) => ({
        season: SEASON,
        team_name: team.team_name,
        team_colour: team.team_colour,
        updated_at: syncTimestamp,
      }));

      // 3. Upsert core records to preserve their existing UUIDs.
      const { error: meetingsUpsertError } = await supabase
        .from("meetings")
        .upsert(meetingsToUpsert, {
          onConflict: "meeting_key",
        });

      if (meetingsUpsertError) {
        throw new Error(
          `Meetings upsert failed: ${meetingsUpsertError.message}`,
        );
      }

      const { error: teamsUpsertError } = await supabase
        .from("teams")
        .upsert(teamsToUpsert, {
          onConflict: "season,team_name",
        });

      if (teamsUpsertError) {
        throw new Error(`Teams upsert failed: ${teamsUpsertError.message}`);
      }

      const { data: insertedTeams, error: teamsSelectError } = await supabase
        .from("teams")
        .select("id, team_name")
        .eq("season", SEASON);

      if (teamsSelectError) {
        throw new Error(`Teams select failed: ${teamsSelectError.message}`);
      }

      const teamIdByNormalisedName = new Map(
        (insertedTeams ?? []).map((team) => [
          normaliseName(team.team_name),
          team.id,
        ]),
      );

      const driversToUpsert = openF1Drivers.map((driver) => ({
        season: SEASON,
        driver_number: driver.driver_number,
        full_name: driver.full_name,
        broadcast_name: driver.broadcast_name ?? null,
        name_acronym: driver.name_acronym ?? null,
        first_name: driver.first_name ?? null,
        last_name: driver.last_name ?? null,
        country_code: driver.country_code ?? null,
        headshot_url: driver.headshot_url ?? null,
        current_team_id: driver.team_name
          ? teamIdByNormalisedName.get(normaliseName(driver.team_name)) ?? null
          : null,
        updated_at: syncTimestamp,
      }));

      const { error: driversUpsertError } = await supabase
        .from("drivers")
        .upsert(driversToUpsert, {
          onConflict: "season,driver_number",
        });

      if (driversUpsertError) {
        throw new Error(
          `Drivers upsert failed: ${driversUpsertError.message}`,
        );
      }

      const { data: insertedDrivers, error: driversSelectError } = await supabase
        .from("drivers")
        .select("id, driver_number, current_team_id")
        .eq("season", SEASON);

      if (driversSelectError) {
        throw new Error(
          `Drivers select failed: ${driversSelectError.message}`,
        );
      }

      const driverIdByNumber = new Map(
        (insertedDrivers ?? []).map((driver) => [
          driver.driver_number,
          driver.id,
        ]),
      );

      const driverTeamIdByNumber = new Map(
        (insertedDrivers ?? []).map((driver) => [
          driver.driver_number,
          driver.current_team_id,
        ]),
      );

      // 4. Refresh driver standings.
      const driverStandingsToUpsert = (openF1DriverStandings ?? []).flatMap(
        (standing) => {
          const driverId = driverIdByNumber.get(standing.driver_number);

          if (!driverId || standing.position_current <= 0) {
            return [];
          }

          return [
            {
              season: SEASON,
              driver_id: driverId,
              championship_position: standing.position_current,
              points: standing.points_current,
              wins: null,
              gap_to_leader: null,
              source_meeting_key: standing.meeting_key,
              snapshot_at: syncTimestamp,
            },
          ];
        },
      );

      if (driverStandingsToUpsert.length > 0) {
        const { error: driverStandingsUpsertError } = await supabase
          .from("driver_standings")
          .upsert(driverStandingsToUpsert, {
            onConflict: "season,driver_id",
          });

        if (driverStandingsUpsertError) {
          throw new Error(
            `Driver standings upsert failed: ${driverStandingsUpsertError.message}`,
          );
        }
      }

      // 5. Refresh constructor standings.
      const leaderTeamPoints = Math.max(
        ...(openF1TeamStandings ?? []).map(
          (standing) => standing.points_current,
        ),
        0,
      );

      const teamStandingsToUpsert = (openF1TeamStandings ?? []).flatMap(
        (standing) => {
          const teamId = teamIdByNormalisedName.get(
            normaliseName(standing.team_name),
          );

          if (!teamId || standing.position_current <= 0) {
            return [];
          }

          return [
            {
              season: SEASON,
              team_id: teamId,
              championship_position: standing.position_current,
              points: standing.points_current,
              wins: 0,
              gap_to_leader: Number(
                (leaderTeamPoints - standing.points_current).toFixed(3),
              ),
              performance_index: calculatePerformanceIndex(
                standing.points_current,
                leaderTeamPoints,
              ),
              source_meeting_key: standing.meeting_key,
              snapshot_at: syncTimestamp,
              updated_at: syncTimestamp,
            },
          ];
        },
      );

      if (teamStandingsToUpsert.length > 0) {
        const { error: teamStandingsUpsertError } = await supabase
          .from("team_standings")
          .upsert(teamStandingsToUpsert, {
            onConflict: "season,team_id",
          });

        if (teamStandingsUpsertError) {
          throw new Error(
            `Team standings upsert failed: ${teamStandingsUpsertError.message}`,
          );
        }
      }

      // 6. Save the latest completed Grand Prix results.
      const qualifyingResultByDriverNumber = new Map(
        (openF1QualifyingResults ?? []).map((result) => [
          result.driver_number,
          result,
        ]),
      );

      const championshipStandingByDriverNumber = new Map(
        (openF1DriverStandings ?? []).map((standing) => [
          standing.driver_number,
          standing,
        ]),
      );

      const raceResultsToUpsert = (openF1RaceResults ?? []).flatMap(
        (raceResult) => {
          const driverId = driverIdByNumber.get(raceResult.driver_number);

          if (!driverId) {
            return [];
          }

          const qualifyingResult = qualifyingResultByDriverNumber.get(
            raceResult.driver_number,
          );

          const championshipStanding = championshipStandingByDriverNumber.get(
            raceResult.driver_number,
          );

          return [
            {
              meeting_key: raceResult.meeting_key,
              driver_id: driverId,
              team_id: driverTeamIdByNumber.get(raceResult.driver_number) ?? null,
              race_session_key: raceResult.session_key,
              qualifying_session_key: latestQualifyingSession?.session_key ?? null,
              race_position: isPositivePosition(raceResult.position)
                ? raceResult.position
                : null,
              qualifying_position: isPositivePosition(qualifyingResult?.position)
                ? qualifyingResult?.position
                : null,
              race_status: getRaceStatus(raceResult),
              points: calculateRacePoints(championshipStanding),
              laps_completed:
                typeof raceResult.number_of_laps === "number"
                  ? raceResult.number_of_laps
                  : null,
              gap_to_leader:
                raceResult.gap_to_leader === null ||
                raceResult.gap_to_leader === undefined
                  ? null
                  : String(raceResult.gap_to_leader),
              source_verified_at: syncTimestamp,
              updated_at: syncTimestamp,
            },
          ];
        },
      );

      if (raceResultsToUpsert.length > 0) {
        const { error: raceResultsUpsertError } = await supabase
          .from("race_results")
          .upsert(raceResultsToUpsert, {
            onConflict: "meeting_key,driver_id",
          });

        if (raceResultsUpsertError) {
          throw new Error(
            `Race results upsert failed: ${raceResultsUpsertError.message}`,
          );
        }
      }

      const driverStandingsStatus = openF1DriverStandings
        ? "SYNCED"
        : "NOT_YET_AVAILABLE_FROM_OPENF1";

      const teamStandingsStatus = openF1TeamStandings
        ? "SYNCED"
        : "NOT_YET_AVAILABLE_FROM_OPENF1";

      const raceResultsStatus = openF1RaceResults
        ? "SYNCED"
        : "NOT_YET_AVAILABLE_FROM_OPENF1";

      const qualifyingResultsStatus = latestQualifyingSession
        ? openF1QualifyingResults
          ? "SYNCED"
          : "NOT_YET_AVAILABLE_FROM_OPENF1"
        : "NO_QUALIFYING_SESSION_FOUND";

      const recordsUpserted =
        meetingsToUpsert.length +
        teamsToUpsert.length +
        driversToUpsert.length +
        driverStandingsToUpsert.length +
        teamStandingsToUpsert.length +
        raceResultsToUpsert.length;

      const { error: syncRunSuccessUpdateError } = await supabase
        .from("sync_runs")
        .update({
          run_status: "success",
          finished_at: new Date().toISOString(),
          records_upserted: recordsUpserted,
          details: {
            season: SEASON,
            syncStrategy: "UPSERT_CORE_ENTITIES_AND_LATEST_RACE_RESULT",
            latestRaceSessionKey: latestRaceSession.session_key,
            latestQualifyingSessionKey:
              latestQualifyingSession?.session_key ?? null,
            meetingsSynced: meetingsToUpsert.length,
            teamsSynced: teamsToUpsert.length,
            driversSynced: driversToUpsert.length,
            driverStandingsSynced: driverStandingsToUpsert.length,
            driverStandingsStatus,
            teamStandingsSynced: teamStandingsToUpsert.length,
            teamStandingsStatus,
            raceResultsSynced: raceResultsToUpsert.length,
            raceResultsStatus,
            qualifyingResultsStatus,
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
          function: "apex-sync",
          season: SEASON,
          source: "OpenF1",
          syncStrategy: "UPSERT_CORE_ENTITIES_AND_LATEST_RACE_RESULT",
          latestRaceSessionKey: latestRaceSession.session_key,
          latestQualifyingSessionKey: latestQualifyingSession?.session_key ?? null,
          meetingsSynced: meetingsToUpsert.length,
          teamsSynced: teamsToUpsert.length,
          driversSynced: driversToUpsert.length,
          driverStandingsSynced: driverStandingsToUpsert.length,
          driverStandingsStatus,
          teamStandingsSynced: teamStandingsToUpsert.length,
          teamStandingsStatus,
          raceResultsSynced: raceResultsToUpsert.length,
          raceResultsStatus,
          qualifyingResultsStatus,
        },
        {
          status: 200,
          headers: jsonHeaders,
        },
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown sync error";

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