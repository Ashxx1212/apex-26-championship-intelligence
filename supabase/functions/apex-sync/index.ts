import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createSupabaseContext } from "@supabase/server";

const jsonHeaders = {
  "Content-Type": "application/json",
  Allow: "POST",
};

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

    // Diagnostic mode only:
    // validates a Supabase secret key but does not call OpenF1
    // and does not write anything to your database.
    const { data: ctx, error: authError } = await createSupabaseContext(req, {
      auth: "secret",
    });

    if (authError) {
      return Response.json(
        {
          ok: false,
          stage: "secret_key_authentication",
          code: authError.code ?? "unknown",
          message: authError.message,
        },
        {
          status: authError.status ?? 401,
          headers: jsonHeaders,
        },
      );
    }

    return Response.json(
      {
        ok: true,
        service: "APEX 26 backend",
        function: "apex-sync",
        status: "secret_key_verified",
        auth_mode: ctx.authMode,
      },
      {
        status: 200,
        headers: jsonHeaders,
      },
    );
  },
};