import { supabase } from '../supabaseClient';
import type { OpenF1SessionResult } from '../types/f1';

export const supabaseRaceResultService = {
  async getRaceResults(sessionKey: number): Promise<OpenF1SessionResult[]> {
    const { data, error } = await supabase
      .from('race_results')
      .select('*')
      .eq('session_key', sessionKey)
      .order('position', { ascending: true });

    if (error) {
      console.warn('[Supabase Race Results] Read failed:', error.message);
      return [];
    }

    if (!data || data.length === 0) {
      console.info('[Supabase Race Results] No rows found, fallback required');
      return [];
    }

    console.info(`[Supabase Race Results] Loaded ${data.length} results`);
    return data as OpenF1SessionResult[];
  },
};