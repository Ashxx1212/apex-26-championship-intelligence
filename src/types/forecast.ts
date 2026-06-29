export type ForecastConfidence = 'LIMITED' | 'MODERATE' | 'HIGH';

export type WeatherOutlookStatus =
  | 'AVAILABLE'
  | 'OUTSIDE_FORECAST_WINDOW'
  | 'UNAVAILABLE';

export interface WeatherOutlook {
  status: WeatherOutlookStatus;
  forecastDate: string;
  locationLabel: string;
  conditionLabel: string;
  temperatureMin: number | null;
  temperatureMax: number | null;
  rainProbability: number | null;
  precipitationMm: number | null;
  windSpeed: number | null;
  sourceLabel: string;
  updatedAt: string | null;
  detail: string;
}

export interface ForecastFactorBreakdown {
  recentForm: number;
  racePace: number;
  qualifying: number;
  teamPerformance: number;
  reliability: number;
}

export interface RaceForecastCandidate {
  driverNumber: number;
  driverName: string;
  driverAcronym: string;
  teamName: string;
  teamColour: string;
  winProbability: number;
  modelScore: number;
  factors: ForecastFactorBreakdown;
}

export interface RaceForecast {
  meetingKey: number;
  meetingName: string;
  generatedAt: string;
  completedRounds: number;
  indexedResults: number;
  confidence: ForecastConfidence;
  confidenceReason: string;
  weatherVolatility: 'LOW' | 'MEDIUM' | 'HIGH';
  weatherVolatilityReason: string;
  candidates: RaceForecastCandidate[];
}
