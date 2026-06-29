import type { OpenF1Meeting } from '../types/f1';
import type { WeatherOutlook } from '../types/forecast';

interface GeoResult {
  latitude: number;
  longitude: number;
  name: string;
  country?: string;
}

interface GeocodingResponse {
  results?: GeoResult[];
}

interface WeatherResponse {
  daily?: {
    time: string[];
    temperature_2m_min?: number[];
    temperature_2m_max?: number[];
    precipitation_probability_max?: number[];
    precipitation_sum?: number[];
    wind_speed_10m_max?: number[];
    weather_code?: number[];
  };
}

const WEATHER_CACHE_TTL_MS = 15 * 60 * 1000;

const weatherCache = new Map<
  number,
  { expiresAt: number; value: WeatherOutlook }
>();

function weatherLabel(code: number | null | undefined): string {
  if (code === null || code === undefined) return 'CONDITIONS PENDING';
  if ([0, 1].includes(code)) return 'CLEAR / MAINLY CLEAR';
  if ([2, 3].includes(code)) return 'PARTLY CLOUDY / OVERCAST';
  if ([45, 48].includes(code)) return 'FOG RISK';
  if ([51, 53, 55, 56, 57].includes(code)) return 'DRIZZLE RISK';
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return 'RAIN RISK';
  if ([71, 73, 75, 77, 85, 86].includes(code)) return 'SNOW RISK';
  if ([95, 96, 99].includes(code)) return 'THUNDERSTORM RISK';
  return 'VARIABLE CONDITIONS';
}

function getForecastDate(meeting: OpenF1Meeting): string {
  // The meeting end date is used as a transparent race-day proxy until
  // a dedicated upcoming Race session timestamp is available.
  return meeting.date_end.slice(0, 10);
}

function daysUntil(dateText: string): number {
  const target = new Date(`${dateText}T12:00:00Z`).getTime();
  const now = Date.now();
  return Math.ceil((target - now) / 86_400_000);
}

function unavailable(
  status: WeatherOutlook['status'],
  meeting: OpenF1Meeting,
  detail: string
): WeatherOutlook {
  return {
    status,
    forecastDate: getForecastDate(meeting),
    locationLabel: `${meeting.location}, ${meeting.country_name}`,
    conditionLabel:
      status === 'OUTSIDE_FORECAST_WINDOW'
        ? 'FORECAST WINDOW NOT OPEN'
        : 'WEATHER SIGNAL UNAVAILABLE',
    temperatureMin: null,
    temperatureMax: null,
    rainProbability: null,
    precipitationMm: null,
    windSpeed: null,
    sourceLabel: 'Open-Meteo',
    updatedAt: null,
    detail,
  };
}

async function resolveCoordinates(meeting: OpenF1Meeting): Promise<GeoResult | null> {
  const query = `${meeting.location}, ${meeting.country_name}`;
  const url = new URL('https://geocoding-api.open-meteo.com/v1/search');
  url.searchParams.set('name', query);
  url.searchParams.set('count', '1');
  url.searchParams.set('language', 'en');
  url.searchParams.set('format', 'json');

  const response = await fetch(url.toString());
  if (!response.ok) return null;

  const payload = (await response.json()) as GeocodingResponse;
  return payload.results?.[0] ?? null;
}

/**
 * Fetches a daily weather outlook only when the event is inside the provider's
 * public forecast window. Failures return a truthful unavailable state.
 */
export async function getWeatherOutlook(
  meeting: OpenF1Meeting
): Promise<WeatherOutlook> {
  const cached = weatherCache.get(meeting.meeting_key);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }

  const forecastDate = getForecastDate(meeting);
  const leadDays = daysUntil(forecastDate);

  if (leadDays < -1 || leadDays > 16) {
    return unavailable(
      'OUTSIDE_FORECAST_WINDOW',
      meeting,
      'A provider forecast is shown only when the event is within the public 16-day window.'
    );
  }

  try {
    const coordinates = await resolveCoordinates(meeting);

    if (!coordinates) {
      return unavailable(
        'UNAVAILABLE',
        meeting,
        'Circuit-area coordinates could not be resolved from the weather provider.'
      );
    }

    const url = new URL('https://api.open-meteo.com/v1/forecast');
    url.searchParams.set('latitude', String(coordinates.latitude));
    url.searchParams.set('longitude', String(coordinates.longitude));
    url.searchParams.set(
      'daily',
      [
        'temperature_2m_min',
        'temperature_2m_max',
        'precipitation_probability_max',
        'precipitation_sum',
        'wind_speed_10m_max',
        'weather_code',
      ].join(',')
    );
    url.searchParams.set('timezone', 'auto');
    url.searchParams.set('forecast_days', '16');

    const response = await fetch(url.toString());
    if (!response.ok) {
      return unavailable(
        'UNAVAILABLE',
        meeting,
        'The weather provider did not return a usable forecast response.'
      );
    }

    const payload = (await response.json()) as WeatherResponse;
    const index = payload.daily?.time.indexOf(forecastDate) ?? -1;

    if (index < 0 || !payload.daily) {
      return unavailable(
        'UNAVAILABLE',
        meeting,
        'No daily weather record is available for the race-day estimate.'
      );
    }

    const outlook: WeatherOutlook = {
      status: 'AVAILABLE',
      forecastDate,
      locationLabel: `${coordinates.name}${coordinates.country ? `, ${coordinates.country}` : ''}`,
      conditionLabel: weatherLabel(payload.daily.weather_code?.[index]),
      temperatureMin: payload.daily.temperature_2m_min?.[index] ?? null,
      temperatureMax: payload.daily.temperature_2m_max?.[index] ?? null,
      rainProbability:
        payload.daily.precipitation_probability_max?.[index] ?? null,
      precipitationMm: payload.daily.precipitation_sum?.[index] ?? null,
      windSpeed: payload.daily.wind_speed_10m_max?.[index] ?? null,
      sourceLabel: 'Open-Meteo',
      updatedAt: new Date().toISOString(),
      detail:
        'Daily circuit-area outlook matched to the event end-date as a race-day estimate.',
    };

    weatherCache.set(meeting.meeting_key, {
      value: outlook,
      expiresAt: Date.now() + WEATHER_CACHE_TTL_MS,
    });

    return outlook;
  } catch {
    return unavailable(
      'UNAVAILABLE',
      meeting,
      'Weather forecast could not be retrieved. The win model remains based on verified season results only.'
    );
  }
}
