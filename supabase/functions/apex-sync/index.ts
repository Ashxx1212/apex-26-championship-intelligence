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
  country_key: number;
  country_code: string;
  country_name: string;
  circuit_key: number;
  circuit_short_name: string;
  date_start: string;
  date_end: string;
  gmt_offset: string;
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

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`OpenF1 request failed: ${response.status} ${response.statusText}`);
  }

  return await response.json();
}

function getLatestRaceSession(sessions: OpenF1Session[]) {
  const raceSessions = sessions
    .filter((session) => session.session_name === "Race" && session.date_end)
    .sort(
      (a, b) =>
        new Date(b.date_end ?? 0).getTime() -
        new Date(a.date_end ?? 0).getTime(),
    );

  return raceSessions[0] ?? null;
}

export default {
  fetch: async (req: Request) => {
    if (req.method !== "POST") {
      return Response.json(
        { ok: false, error: "Method not allowed. Use POST." },
        { status: 405, headers: jsonHeaders },
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
        { status: 500, headers: jsonHeaders },
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    try {
      const meetings = await fetchJson<OpenF1Meeting[]>(
  `${OPENF1_BASE_URL}/meetings?year=${SEASON}`,
);
      const sessions = await fetchJson<OpenF1Session[]>(
        `${OPENF1_BASE_URL}/sessions?year=${SEASON}`,
      );

      const latestRaceSession = getLatestRaceSession(sessions);

      if (!latestRaceSession) {
        return Response.json(
          {
            ok: false,
            error: "No completed race session found for season.",
            season: SEASON,
          },
          { status: 404, headers: jsonHeaders },
        );
      }

      const openF1Drivers = await fetchJson<OpenF1Driver[]>(
        `${OPENF1_BASE_URL}/drivers?session_key=${latestRaceSession.session_key}`,
      );

      const teamMap = new Map<string, { team_name: string; team_colour: string | null }>();

      for (const driver of openF1Drivers) {
        if (!driver.team_name) continue;

        teamMap.set(driver.team_name, {
          team_name: driver.team_name,
          team_colour: driver.team_colour ?? null,
        });
      }

      const teamsToInsert = Array.from(teamMap.values()).map((team) => ({
        season: SEASON,
        team_name: team.team_name,
        team_colour: team.team_colour,
      }));

      await supabase.from("drivers").delete().eq("season", SEASON);
await supabase.from("teams").delete().eq("season", SEASON);
await supabase.from("meetings").delete().eq("season", SEASON);

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

const { error: meetingsInsertError } = await supabase
  .from("meetings")
  .insert(meetingsToInsert);

if (meetingsInsertError) {
  throw new Error(`Meetings insert failed: ${meetingsInsertError.message}`);
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
        insertedTeams?.map((team) => [team.team_name, team.id]) ?? [],
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
        throw new Error(`Drivers insert failed: ${driversInsertError.message}`);
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
        },
        { status: 200, headers: jsonHeaders },
      );
    } catch (error) {
      return Response.json(
        {
          ok: false,
          error: error instanceof Error ? error.message : "Unknown sync error",
        },
        { status: 500, headers: jsonHeaders },
      );
    }
  },
};