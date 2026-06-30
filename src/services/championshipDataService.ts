import type { ChampionshipDataSnapshot } from '../types/f1';
import { openF1Service, OpenF1Error } from './openF1Service';
import { supabaseChampionshipService } from './supabaseChampionshipService';

export const championshipDataService = {
  async fetchCoreSnapshot(
    year: number = 2026,
    options: {
      forceRefresh?: boolean;
      onProgress?: (message: string) => void;
    } = {},
  ): Promise<{
    data: ChampionshipDataSnapshot | null;
    error: OpenF1Error | null;
    fromCache: boolean;
  }> {
    const { onProgress } = options;

    const supabaseResult =
      await supabaseChampionshipService.fetchSnapshot(year, onProgress);

    if (supabaseResult.data) {
      return {
        data: supabaseResult.data,
        error: null,
        fromCache: false,
      };
    }

    console.warn(
      '[Championship Data] Supabase snapshot unavailable. Falling back to OpenF1.',
      supabaseResult.error?.message ?? '',
    );

    return openF1Service.fetchCoreSnapshot(year, options);
  },
};