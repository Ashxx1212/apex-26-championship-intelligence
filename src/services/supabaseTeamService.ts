import { supabase } from '../supabaseClient';
import type { OpenF1ChampionshipTeam } from '../types/f1';

export const supabaseTeamService = {
  async getTeams(): Promise<OpenF1ChampionshipTeam[]> {
    const { data, error } = await supabase
      .from('team_standings')
      .select('*');

    if (error) {
      console.warn('[Supabase Teams] Read failed:', error.message);
      return [];
    }

    if (!data || data.length === 0) {
      console.info('[Supabase Teams] No rows found, fallback required');
      return [];
    }

    console.info(`[Supabase Teams] Loaded ${data.length} teams`);
    return data as OpenF1ChampionshipTeam[];
  },
};