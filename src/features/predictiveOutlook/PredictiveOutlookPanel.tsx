import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  CloudSun,
  Droplets,
  Loader2,
  ShieldCheck,
  Sparkles,
  Trophy,
  Wind,
} from 'lucide-react';

import type { ChampionshipDataSnapshot, OpenF1Meeting } from '../../types/f1';
import type { WeatherOutlook } from '../../types/forecast';
import { getWeatherOutlook } from '../../services/weatherForecastService';
import { buildRaceForecast } from '../../utils/raceForecast';

interface PredictiveOutlookPanelProps {
  data: ChampionshipDataSnapshot | null;
  meeting: OpenF1Meeting | null;
  onDriverSelect?: (driverNumber: number) => void;
}

function probabilityWidth(probability: number): string {
  return `${Math.max(4, Math.min(100, probability)).toFixed(1)}%`;
}

function confidenceClass(value: string): string {
  if (value === 'HIGH') return 'border-green-400/30 bg-green-400/[0.06] text-green-400';
  if (value === 'MODERATE') return 'border-amber/30 bg-amber/[0.06] text-amber';
  return 'border-crimson/30 bg-crimson/[0.06] text-crimson';
}

function volatilityClass(value: string): string {
  if (value === 'LOW') return 'text-green-400';
  if (value === 'HIGH') return 'text-crimson';
  return 'text-amber';
}

function temperatureRange(weather: WeatherOutlook | null): string {
  if (!weather || weather.status !== 'AVAILABLE') return '—';
  if (weather.temperatureMin === null || weather.temperatureMax === null) return '—';
  return `${weather.temperatureMin.toFixed(0)}–${weather.temperatureMax.toFixed(0)}°C`;
}

export function PredictiveOutlookPanel({
  data,
  meeting,
  onDriverSelect,
}: PredictiveOutlookPanelProps) {
  const [weather, setWeather] = useState<WeatherOutlook | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(false);

  useEffect(() => {
    let active = true;

    if (!meeting) {
      setWeather(null);
      setWeatherLoading(false);
      return () => {
        active = false;
      };
    }

    setWeatherLoading(true);
    setWeather(null);

    void getWeatherOutlook(meeting)
      .then((nextWeather) => {
        if (active) setWeather(nextWeather);
      })
      .finally(() => {
        if (active) setWeatherLoading(false);
      });

    return () => {
      active = false;
    };
  }, [meeting?.meeting_key, meeting?.date_end, meeting?.location, meeting?.country_name]);

  const forecast = useMemo(() => {
    if (!data || !meeting) return null;
    return buildRaceForecast(data, meeting, weather);
  }, [data, meeting, weather]);

  if (!data || !meeting || !forecast || forecast.candidates.length === 0) {
    return null;
  }

  const leader = forecast.candidates[0];

  return (
    <section className="relative overflow-hidden border border-cyan/20 bg-[#091015]/88 shadow-[0_20px_55px_rgba(0,0,0,0.20)]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_10%_0%,rgba(0,212,255,0.08),transparent_28%),radial-gradient(circle_at_90%_100%,rgba(220,20,60,0.07),transparent_28%)]" />

      <div className="relative flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.10] px-5 py-4">
        <div className="flex items-center gap-2.5">
          <Sparkles className="h-4 w-4 text-cyan" />
          <div>
            <h2 className="text-[11px] font-bold tracking-[0.19em] text-white uppercase">
              Predictive Outlook
            </h2>
            <p className="mt-0.5 text-[8px] tracking-[0.14em] text-white/35 uppercase">
              Evidence-weighted race estimate // not a guaranteed outcome
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className={`border px-2.5 py-1 text-[8px] font-semibold tracking-[0.13em] ${confidenceClass(forecast.confidence)}`}>
            {forecast.confidence} CONFIDENCE
          </span>
          <span className="border border-cyan/20 bg-cyan/[0.04] px-2.5 py-1 text-[8px] font-semibold tracking-[0.13em] text-cyan">
            {forecast.completedRounds} ROUNDS OF EVIDENCE
          </span>
        </div>
      </div>

      <div className="relative grid grid-cols-1 xl:grid-cols-[1.12fr_0.88fr]">
        <div className="border-b border-white/[0.10] p-5 xl:border-b-0 xl:border-r">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-[9px] tracking-[0.15em] text-cyan uppercase">
                Next Grand Prix // {meeting.meeting_name}
              </p>
              <div className="mt-3 flex flex-wrap items-end gap-x-4 gap-y-2">
                <p className="text-4xl font-black tracking-[0.08em] text-white">
                  {leader.driverAcronym}
                </p>
                <p className="pb-1 text-xl font-black text-cyan">
                  {leader.winProbability.toFixed(1)}%
                </p>
              </div>
              <p className="mt-2 text-[10px] text-white/45">
                Current model leader · {leader.teamName}
              </p>
            </div>

            <div className="border border-white/[0.09] bg-black/[0.20] px-3 py-3">
              <p className="text-[8px] tracking-[0.13em] text-white/35">WEATHER VOLATILITY</p>
              <p className={`mt-2 text-sm font-black tracking-[0.12em] ${volatilityClass(forecast.weatherVolatility)}`}>
                {forecast.weatherVolatility}
              </p>
            </div>
          </div>

          <div className="mt-5 space-y-2">
            {forecast.candidates.map((candidate, index) => (
              <button
                key={candidate.driverNumber}
                type="button"
                onClick={() => onDriverSelect?.(candidate.driverNumber)}
                disabled={!onDriverSelect}
                className="group grid w-full grid-cols-[28px_1fr_auto] items-center gap-3 border border-white/[0.08] bg-black/[0.16] px-3 py-3 text-left transition-colors hover:border-cyan/30 disabled:cursor-default"
                title={`Open ${candidate.driverAcronym} in Driver Intel`}
              >
                <span className="text-sm font-black text-cyan">#{index + 1}</span>
                <span className="min-w-0">
                  <span className="block text-[11px] font-bold tracking-[0.08em] text-white">
                    {candidate.driverAcronym}
                    <span className="ml-2 text-[9px] font-normal text-white/35">
                      {candidate.teamName}
                    </span>
                  </span>
                  <span className="mt-2 block h-1 overflow-hidden bg-white/[0.08]">
                    <span
                      className="block h-full bg-gradient-to-r from-cyan via-cyan/80 to-amber"
                      style={{ width: probabilityWidth(candidate.winProbability) }}
                    />
                  </span>
                </span>
                <span className="font-mono text-[11px] font-bold text-cyan">
                  {candidate.winProbability.toFixed(1)}%
                </span>
              </button>
            ))}
          </div>

          <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-5">
            {[
              ['FORM', leader.factors.recentForm],
              ['PACE', leader.factors.racePace],
              ['QUALI', leader.factors.qualifying],
              ['TEAM', leader.factors.teamPerformance],
              ['RELIABILITY', leader.factors.reliability],
            ].map(([label, value]) => (
              <div key={label} className="border border-white/[0.08] bg-black/[0.16] px-2.5 py-2.5">
                <p className="text-[7px] tracking-[0.12em] text-white/35">{label}</p>
                <p className="mt-1 text-sm font-black text-white">{value}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="p-5">
          <div className="flex items-center gap-2">
            <CloudSun className="h-4 w-4 text-cyan" />
            <p className="text-[10px] font-semibold tracking-[0.15em] text-white uppercase">
              Weather Signal
            </p>
          </div>

          {weatherLoading ? (
            <div className="flex min-h-[200px] items-center justify-center border border-dashed border-cyan/20">
              <div className="text-center">
                <Loader2 className="mx-auto h-5 w-5 animate-spin text-cyan" />
                <p className="mt-3 text-[9px] tracking-[0.13em] text-white/35">
                  RETRIEVING CIRCUIT-AREA FORECAST
                </p>
              </div>
            </div>
          ) : weather?.status === 'AVAILABLE' ? (
            <>
              <p className="mt-4 text-xl font-black tracking-[0.05em] text-white">
                {weather.conditionLabel}
              </p>
              <p className="mt-2 text-[9px] tracking-[0.12em] text-white/35">
                {weather.locationLabel} · {weather.forecastDate}
              </p>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="border border-white/[0.09] bg-black/[0.18] p-3">
                  <p className="text-[8px] tracking-[0.13em] text-white/35">TEMPERATURE</p>
                  <p className="mt-2 text-lg font-black text-cyan">{temperatureRange(weather)}</p>
                </div>
                <div className="border border-white/[0.09] bg-black/[0.18] p-3">
                  <p className="text-[8px] tracking-[0.13em] text-white/35">RAIN RISK</p>
                  <p className="mt-2 text-lg font-black text-amber">
                    {weather.rainProbability === null ? '—' : `${weather.rainProbability}%`}
                  </p>
                </div>
                <div className="border border-white/[0.09] bg-black/[0.18] p-3">
                  <p className="text-[8px] tracking-[0.13em] text-white/35">PRECIPITATION</p>
                  <p className="mt-2 text-lg font-black text-white">
                    {weather.precipitationMm === null ? '—' : `${weather.precipitationMm.toFixed(1)} mm`}
                  </p>
                </div>
                <div className="border border-white/[0.09] bg-black/[0.18] p-3">
                  <p className="text-[8px] tracking-[0.13em] text-white/35">MAX WIND</p>
                  <p className="mt-2 text-lg font-black text-white">
                    {weather.windSpeed === null ? '—' : `${weather.windSpeed.toFixed(0)} km/h`}
                  </p>
                </div>
              </div>
            </>
          ) : (
            <div className="mt-5 border border-amber/20 bg-amber/[0.035] p-4">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber" />
                <div>
                  <p className="text-[9px] font-semibold tracking-[0.13em] text-amber">
                    {weather?.conditionLabel || 'FORECAST PENDING'}
                  </p>
                  <p className="mt-2 text-[10px] leading-relaxed text-white/50">
                    {weather?.detail ||
                      'Weather data is not available. The race estimate remains based on completed season evidence.'}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="mt-5 border-t border-white/[0.08] pt-4">
            <div className="flex items-start gap-2">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-green-400" />
              <p className="text-[9px] leading-relaxed text-white/45">
                {forecast.confidenceReason} {forecast.weatherVolatilityReason}
                {' '}Weather is shown as an external forecast signal; it increases uncertainty but does not fabricate driver-specific wet-weather advantage.
              </p>
            </div>
            <div className="mt-3 flex items-center gap-2 text-[8px] tracking-[0.13em] text-white/30">
              <Activity className="h-3.5 w-3.5 text-cyan/70" />
              MODEL FACTORS: FORM · RACE PACE · QUALIFYING · TEAM PERFORMANCE · RELIABILITY
            </div>
          </div>
        </div>
      </div>

      <div className="relative border-t border-white/[0.08] bg-black/[0.16] px-5 py-3">
        <p className="flex items-start gap-2 text-[8px] leading-relaxed tracking-[0.09em] text-white/35">
          <Trophy className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber/80" />
          PORTFOLIO MODEL ESTIMATE ONLY — NOT OFFICIAL TIMING, BETTING ADVICE, OR A GUARANTEED RACE OUTCOME.
        </p>
      </div>
    </section>
  );
}
