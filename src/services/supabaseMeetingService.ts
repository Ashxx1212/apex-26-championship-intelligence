import { supabase } from '../supabaseClient';
import type { OpenF1Meeting } from '../types/f1';

export const supabaseMeetingService = {
  async getMeetings(): Promise<OpenF1Meeting[]> {
    const { data, error } = await supabase
      .from('meetings')
      .select('*')
      .order('date_start', { ascending: true });

    if (error) {
      console.warn('[Supabase Meetings] Read failed:', error.message);
      return [];
    }

    if (!data || data.length === 0) {
      console.info('[Supabase Meetings] No rows found, fallback required');
      return [];
    }

    console.info(`[Supabase Meetings] Loaded ${data.length} meetings`);
    return data as OpenF1Meeting[];
  },
};