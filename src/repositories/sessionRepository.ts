import { supabaseSessionService } from '../services/supabaseSessionService';
import { openF1Client } from '../services/openF1Client';
import type { OpenF1Session } from '../types/f1';

export const sessionRepository = {
  async getSessions(year: number): Promise<OpenF1Session[]> {
    const supabaseSessions = await supabaseSessionService.getSessions();

    if (supabaseSessions.length > 0) {
      return supabaseSessions;
    }

    return (await openF1Client.getSessions(year)) as OpenF1Session[];
  },
};