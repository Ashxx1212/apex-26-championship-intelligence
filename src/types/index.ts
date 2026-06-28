// Re-export all F1 types from f1.ts
export * from './f1';

// Re-export app types
export * from './app';

// Legacy types (kept for backwards compatibility)
export interface ForecastFactor {
  id: string;
  name: string;
  description: string;
  weight: number;
  value?: number;
  status: 'active' | 'pending_data';
}

export interface ChampionshipForecast {
  driverId: number;
  probability: number;
  confidence: number;
  factors: ForecastFactor[];
}
