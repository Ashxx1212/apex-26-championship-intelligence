import { supabaseDriverService } from '../services/supabaseDriverService';
import { openF1Client } from '../services/openF1Client';
import type { OpenF1Driver } from '../types/f1';

export const driverRepository = {
  async getDrivers(sessionKey: number): Promise<OpenF1Driver[]> {
    const supabaseDrivers = await supabaseDriverService.getDrivers();

    if (supabaseDrivers.length > 0) {
      return supabaseDrivers;
    }

    return (await openF1Client.getDrivers(sessionKey)) as OpenF1Driver[];
  },
};