import { supabaseRaceResultService } from '../services/supabaseRaceResultService';
import { openF1Client } from '../services/openF1Client';
import type { OpenF1SessionResult } from '../types/f1';

export const raceResultRepository = {
  async getRaceResults(sessionKey: number): Promise<OpenF1SessionResult[]> {
    const supabaseResults = await supabaseRaceResultService.getRaceResults(sessionKey);

    if (supabaseResults.length > 0) {
      return supabaseResults;
    }

    return (await openF1Client.getSessionResults(sessionKey)) as OpenF1SessionResult[];
  },
};