import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Content-Type": "application/json",
};

export default {
  fetch: withSupabase({ auth: "none" }, async (req) => {
    if (req.method === "OPTIONS") {
      return new Response("ok", { headers: corsHeaders });
    }

    if (req.method !== "GET") {
      return Response.json(
        {
          ok: false,
          error: "Method not allowed. Use GET.",
        },
        {
          status: 405,
          headers: corsHeaders,
        },
      );
    }

    return Response.json(
      {
        ok: true,
        service: "APEX 26 backend",
        function: "apex-health",
        status: "healthy",
        checked_at: new Date().toISOString(),
      },
      {
        status: 200,
        headers: corsHeaders,
      },
    );
  }),
};