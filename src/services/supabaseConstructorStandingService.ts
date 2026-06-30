import { supabase } from '../supabaseClient';
import type { OpenF1ChampionshipTeam } from '../types/f1';

export const supabaseConstructorStandingService = {
  async getConstructorStandings(): Promise<OpenF1ChampionshipTeam[]> {
    const { data, error } = await supabase
      .from('team_standings')
      .select('*')
      .order('position_current', { ascending: true });

    if (error) {
      console.warn('[Supabase Constructor Standings] Read failed:', error.message);
      return [];
    }

    if (!data || data.length === 0) {
      console.info('[Supabase Constructor Standings] No rows found, fallback required');
      return [];
    }

    console.info(`[Supabase Constructor Standings] Loaded ${data.length} standings`);
    return data as OpenF1ChampionshipTeam[];
  },
};