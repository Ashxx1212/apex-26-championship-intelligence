import { supabaseDriverStandingService } from '../services/supabaseDriverStandingService';
import { openF1Client } from '../services/openF1Client';
import type { OpenF1ChampionshipDriver } from '../types/f1';

export const driverStandingRepository = {
  async getDriverStandings(sessionKey: number): Promise<OpenF1ChampionshipDriver[]> {
    const supabaseStandings = await supabaseDriverStandingService.getDriverStandings();

    if (supabaseStandings.length > 0) {
      return supabaseStandings;
    }

    return (await openF1Client.getChampionshipDrivers(sessionKey)) as OpenF1ChampionshipDriver[];
  },
};