import { supabase } from "../supabaseClient";

export async function getDriversFromSupabase() {
  const { data, error } = await supabase
    .from("drivers")
    .select("*")
    .limit(50);

  if (error) {
    console.error("Supabase drivers error:", error);
    return [];
  }

  return data ?? [];
}