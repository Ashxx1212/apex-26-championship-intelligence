import { supabase } from '../supabaseClient';
import type { OpenF1Driver } from '../types/f1';

export const supabaseDriverService = {
  async getDrivers(): Promise<OpenF1Driver[]> {
    const { data, error } = await supabase
      .from('drivers')
      .select('*');

    if (error) {
      console.warn('[Supabase Drivers] Read failed:', error.message);
      return [];
    }

    if (!data || data.length === 0) {
      console.info('[Supabase Drivers] No rows found, fallback required');
      return [];
    }

    console.info(`[Supabase Drivers] Loaded ${data.length} drivers`);

    return data as OpenF1Driver[];
  },
};