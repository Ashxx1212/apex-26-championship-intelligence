import { supabase } from '../supabaseClient';
import type { OpenF1Session } from '../types/f1';

export const supabaseSessionService = {
  async getSessions(): Promise<OpenF1Session[]> {
    const { data, error } = await supabase
      .from('sessions')
      .select('*')
      .order('date_start', { ascending: true });

    if (error) {
      console.warn('[Supabase Sessions] Read failed:', error.message);
      return [];
    }

    if (!data || data.length === 0) {
      console.info('[Supabase Sessions] No rows found, fallback required');
      return [];
    }

    console.info(`[Supabase Sessions] Loaded ${data.length} sessions`);
    return data as OpenF1Session[];
  },
};