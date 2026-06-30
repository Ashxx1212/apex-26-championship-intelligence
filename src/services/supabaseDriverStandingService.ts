import { supabase } from '../supabaseClient';
import type { OpenF1ChampionshipDriver } from '../types/f1';

export const supabaseDriverStandingService = {
  async getDriverStandings(): Promise<OpenF1ChampionshipDriver[]> {
    const { data, error } = await supabase
      .from('driver_standings')
      .select('*')
      .order('position_current', { ascending: true });

    if (error) {
      console.warn('[Supabase Driver Standings] Read failed:', error.message);
      return [];
    }

    if (!data || data.length === 0) {
      console.info('[Supabase Driver Standings] No rows found, fallback required');
      return [];
    }

    console.info(`[Supabase Driver Standings] Loaded ${data.length} standings`);
    return data as OpenF1ChampionshipDriver[];
  },
};