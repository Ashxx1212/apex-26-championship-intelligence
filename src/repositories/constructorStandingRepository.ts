import { supabaseConstructorStandingService } from '../services/supabaseConstructorStandingService';
import { openF1Client } from '../services/openF1Client';
import type { OpenF1ChampionshipTeam } from '../types/f1';

export const constructorStandingRepository = {
  async getConstructorStandings(sessionKey: number): Promise<OpenF1ChampionshipTeam[]> {
    const supabaseStandings =
      await supabaseConstructorStandingService.getConstructorStandings();

    if (supabaseStandings.length > 0) {
      return supabaseStandings;
    }

    return (await openF1Client.getChampionshipTeams(sessionKey)) as OpenF1ChampionshipTeam[];
  },
};