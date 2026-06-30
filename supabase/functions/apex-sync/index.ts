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
  position_current: number;
  points_current: number;
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

      // Keeps sequential OpenF1 requests comfortably below its rate limit.
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

    // OpenF1 can return this while a valid optional dataset
    // has not yet been published for a race session.
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

      const openF1Drivers = await fetchJson<OpenF1Driver[]>(
        "drivers",
        `${OPENF1_BASE_URL}/drivers?session_key=${latestRaceSession.session_key}`,
      );

      const openF1DriverStandings =
        await fetchOptionalJson<OpenF1ChampionshipDriver[]>(
          "championship_drivers",
          `${OPENF1_BASE_URL}/championship_drivers?session_key=${latestRaceSession.session_key}`,
        );

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

        teamMap.set(driver.team_name, {
          team_name: driver.team_name,
          team_colour: driver.team_colour ?? null,
        });
      }

      const meetingsToInsert = meetings.map((meeting) => ({
        season: SEASON,
        meeting_key: meeting.meeting_key,
        meeting_name: meeting.meeting_name,
        meeting_official_name: meeting.meeting_official_name,
        location: meeting.location,
        country_code: meeting.country_code,
        country_name: meeting.country_name,
        circuit_key: meeting.circuit_key,
        circuit_short_name: meeting.circuit_short_name,
        date_start: meeting.date_start,
        date_end: meeting.date_end,
      }));

      const teamsToInsert = Array.from(teamMap.values()).map((team) => ({
        season: SEASON,
        team_name: team.team_name,
        team_colour: team.team_colour,
      }));

      // Delete child rows before parent rows because of UUID foreign keys.
      const { error: driverStandingsDeleteError } = await supabase
        .from("driver_standings")
        .delete()
        .eq("season", SEASON);

      if (driverStandingsDeleteError) {
        throw new Error(
          `Driver standings delete failed: ${driverStandingsDeleteError.message}`,
        );
      }

      const { error: driversDeleteError } = await supabase
        .from("drivers")
        .delete()
        .eq("season", SEASON);

      if (driversDeleteError) {
        throw new Error(`Drivers delete failed: ${driversDeleteError.message}`);
      }

      const { error: teamsDeleteError } = await supabase
        .from("teams")
        .delete()
        .eq("season", SEASON);

      if (teamsDeleteError) {
        throw new Error(`Teams delete failed: ${teamsDeleteError.message}`);
      }

      const { error: meetingsDeleteError } = await supabase
        .from("meetings")
        .delete()
        .eq("season", SEASON);

      if (meetingsDeleteError) {
        throw new Error(
          `Meetings delete failed: ${meetingsDeleteError.message}`,
        );
      }

      const { error: meetingsInsertError } = await supabase
        .from("meetings")
        .insert(meetingsToInsert);

      if (meetingsInsertError) {
        throw new Error(
          `Meetings insert failed: ${meetingsInsertError.message}`,
        );
      }

      const { error: teamsInsertError } = await supabase
        .from("teams")
        .insert(teamsToInsert);

      if (teamsInsertError) {
        throw new Error(`Teams insert failed: ${teamsInsertError.message}`);
      }

      const { data: insertedTeams, error: teamsSelectError } = await supabase
        .from("teams")
        .select("id, team_name")
        .eq("season", SEASON);

      if (teamsSelectError) {
        throw new Error(`Teams select failed: ${teamsSelectError.message}`);
      }

      const teamIdByName = new Map(
        (insertedTeams ?? []).map((team) => [team.team_name, team.id]),
      );

      const driversToInsert = openF1Drivers.map((driver) => ({
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
          ? teamIdByName.get(driver.team_name) ?? null
          : null,
      }));

      const { error: driversInsertError } = await supabase
        .from("drivers")
        .insert(driversToInsert);

      if (driversInsertError) {
        throw new Error(
          `Drivers insert failed: ${driversInsertError.message}`,
        );
      }

      const { data: insertedDrivers, error: driversSelectError } = await supabase
        .from("drivers")
        .select("id, driver_number")
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

      const standingsSnapshotAt = new Date().toISOString();

      const driverStandingsToInsert = (openF1DriverStandings ?? []).flatMap(
        (standing) => {
          const driverId = driverIdByNumber.get(standing.driver_number);

          if (!driverId) {
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
              source_meeting_key: null,
              snapshot_at: standingsSnapshotAt,
            },
          ];
        },
      );

      if (driverStandingsToInsert.length > 0) {
        const { error: driverStandingsInsertError } = await supabase
          .from("driver_standings")
          .insert(driverStandingsToInsert);

        if (driverStandingsInsertError) {
          throw new Error(
            `Driver standings insert failed: ${driverStandingsInsertError.message}`,
          );
        }
      }

      const driverStandingsStatus = openF1DriverStandings
        ? "SYNCED"
        : "NOT_YET_AVAILABLE_FROM_OPENF1";

      const recordsUpserted =
        meetingsToInsert.length +
        teamsToInsert.length +
        driversToInsert.length +
        driverStandingsToInsert.length;

      const { error: syncRunSuccessUpdateError } = await supabase
        .from("sync_runs")
        .update({
          run_status: "success",
          finished_at: new Date().toISOString(),
          records_upserted: recordsUpserted,
          details: {
            season: SEASON,
            latestRaceSessionKey: latestRaceSession.session_key,
            meetingsSynced: meetingsToInsert.length,
            teamsSynced: teamsToInsert.length,
            driversSynced: driversToInsert.length,
            driverStandingsSynced: driverStandingsToInsert.length,
            driverStandingsStatus,
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
          latestRaceSessionKey: latestRaceSession.session_key,
          meetingsSynced: meetingsToInsert.length,
          teamsSynced: teamsToInsert.length,
          driversSynced: driversToInsert.length,
          driverStandingsSynced: driverStandingsToInsert.length,
          driverStandingsStatus,
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