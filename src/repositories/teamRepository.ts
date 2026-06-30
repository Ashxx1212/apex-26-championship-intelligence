import { supabaseTeamService } from '../services/supabaseTeamService';
import { openF1Client } from '../services/openF1Client';
import type { OpenF1ChampionshipTeam } from '../types/f1';

export const teamRepository = {
  async getChampionshipTeams(sessionKey: number): Promise<OpenF1ChampionshipTeam[]> {
    const supabaseTeams = await supabaseTeamService.getTeams();

    if (supabaseTeams.length > 0) {
      return supabaseTeams;
    }

    return (await openF1Client.getChampionshipTeams(sessionKey)) as OpenF1ChampionshipTeam[];
  },
};