import { supabaseMeetingService } from '../services/supabaseMeetingService';
import { openF1Client } from '../services/openF1Client';
import type { OpenF1Meeting } from '../types/f1';

export const meetingRepository = {
  async getMeetings(year: number): Promise<OpenF1Meeting[]> {
    const supabaseMeetings = await supabaseMeetingService.getMeetings();

    if (supabaseMeetings.length > 0) {
      return supabaseMeetings;
    }

    return (await openF1Client.getMeetings(year)) as OpenF1Meeting[];
  },
};