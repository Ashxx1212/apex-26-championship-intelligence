import { Clock, RefreshCw, Radio } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { formatTime } from '../utils/formatters';
import { DATA_STATUS_LABELS } from '../config/dataConfig';
import type { DataSourceState, AppError } from '../types/app';

interface TopStatusBarProps {
  isLoading: boolean;
  error: AppError | null;
  dataSource: string;
  completedRounds: number;
  totalRounds: number;
  lastSync: string | null;
  onRefresh: () => void;
  loadingMessage?: string;
  cooldownSeconds: number;
  sourceState: DataSourceState;
  isFromCache: boolean;
}

export function TopStatusBar({
  isLoading,
  error,
  dataSource,
  completedRounds,
  totalRounds,
  lastSync,
  onRefresh,
  loadingMessage,
  cooldownSeconds,
  sourceState,
  isFromCache,
}: TopStatusBarProps) {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const interval = window.setInterval(() => {
      setTime(new Date());
    }, 1000);

    return () => window.clearInterval(interval);
  }, []);

  const status = useMemo(() => {
    if (isLoading && sourceState !== 'cached') {
      return {
        label: loadingMessage || DATA_STATUS_LABELS.loading,
        accent: 'text-cyan',
        dot: 'bg-cyan',
        detail: 'SYNC IN PROGRESS',
      };
    }

    if (sourceState === 'rate_limited') {
      return {
        label: 'RATE LIMIT PROTECTION',
        accent: 'text-amber',
        dot: 'bg-amber',
        detail:
          cooldownSeconds > 0
            ? `COOLDOWN ${cooldownSeconds}s`
            : 'REFRESH PAUSED',
      };
    }

    if (sourceState === 'offline' || (error && !isFromCache)) {
      return {
        label: DATA_STATUS_LABELS.offline,
        accent: 'text-red-400',
        dot: 'bg-red-400',
        detail: 'SOURCE UNAVAILABLE',
      };
    }

    if (isFromCache) {
      return {
        label: 'CACHED VERIFIED SNAPSHOT',
        accent: 'text-green-400/85',
        dot: 'bg-green-400',
        detail: 'LOCAL DATA LAYER',
      };
    }

    return {
      label: 'VERIFIED DATA',
      accent: 'text-green-400',
      dot: 'bg-green-400',
      detail: 'AUTO-SYNC READY',
    };
  }, [
    cooldownSeconds,
    error,
    isFromCache,
    isLoading,
    loadingMessage,
    sourceState,
  ]);

  const canRefresh = !isLoading && cooldownSeconds === 0;

  return (
    <header className="relative flex h-[62px] min-h-[62px] shrink-0 items-center border-b border-white/[0.09] bg-[#090a0d]/90 px-4 backdrop-blur-xl md:px-6">
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />

      {/* Season identity */}
      <div className="flex min-w-0 items-center gap-3">
        <div className="hidden h-5 w-px bg-white/10 md:block" />

        <div className="flex items-center gap-2 rounded-sm border border-crimson/35 bg-crimson/[0.08] px-3 py-1.5">
          <span className="text-[10px] font-bold tracking-[0.14em] text-crimson">
            2026 SEASON
          </span>
        </div>

        <div className="hidden items-center gap-2 md:flex">
          <span className="text-[9px] tracking-[0.15em] text-white/35">
            ROUNDS
          </span>
          <span className="text-xs font-bold text-cyan">{completedRounds}</span>
          <span className="text-xs text-white/20">/</span>
          <span className="text-xs text-white/45">{totalRounds}</span>
        </div>
      </div>

      {/* Desktop intelligence status */}
      <div className="ml-auto hidden min-w-0 items-center gap-5 lg:flex">
        <div className="flex items-center gap-2.5">
          <div className="relative h-2 w-2">
            <div
              className={`absolute inset-0 rounded-full ${status.dot} shadow-[0_0_10px_rgba(74,222,128,0.65)]`}
            />
            {!error && (
              <div
                className={`absolute inset-0 rounded-full ${status.dot}/40 animate-ping`}
              />
            )}
          </div>

          <div>
            <p className={`text-[10px] font-medium tracking-[0.14em] ${status.accent}`}>
              {status.label}
            </p>
            <p className="mt-0.5 text-[8px] tracking-[0.14em] text-white/25">
              {status.detail}
            </p>
          </div>
        </div>

        <div className="h-7 w-px bg-white/[0.08]" />

        <div className="flex items-center gap-2">
          <span className="text-[9px] tracking-[0.14em] text-white/30">
            SOURCE
          </span>
          <span
            className={`text-[10px] font-medium tracking-[0.12em] ${
              isFromCache ? 'text-green-400/85' : 'text-cyan'
            }`}
          >
            {dataSource}
          </span>
        </div>

        <div className="h-7 w-px bg-white/[0.08]" />

        <div className="flex items-center gap-2">
          <span className="text-[9px] tracking-[0.14em] text-white/30">
            {isFromCache ? 'CACHE TIME' : 'LAST SYNC'}
          </span>
          <span className="font-mono text-[10px] tracking-[0.08em] text-white/65">
            {formatTime(lastSync)}
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="ml-auto flex shrink-0 items-center gap-3 lg:ml-5">
        <button
          onClick={onRefresh}
          disabled={!canRefresh}
          title={
            cooldownSeconds > 0
              ? `Cooldown: ${cooldownSeconds}s`
              : 'Refresh verified data'
          }
          className="
            group flex items-center gap-2 rounded-sm border border-white/15
            bg-white/[0.02] px-3 py-2 text-[10px] tracking-[0.12em] text-white/60
            transition-all duration-200
            hover:border-cyan/45 hover:bg-cyan/[0.05] hover:text-cyan
            disabled:cursor-not-allowed disabled:opacity-40
          "
        >
          <RefreshCw
            className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : 'group-hover:rotate-90 transition-transform duration-300'}`}
          />
          <span className="hidden sm:inline">REFRESH</span>
        </button>

        <div className="hidden items-center gap-2 xl:flex">
          <Clock className="h-3.5 w-3.5 text-white/30" />
          <span className="font-mono text-[10px] tracking-[0.1em] text-white/55">
            {time.toLocaleTimeString('en-GB', {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            })}
          </span>
        </div>

        <div className="relative flex h-6 w-6 items-center justify-center">
          <Radio
            className={`h-3.5 w-3.5 ${
              error && !isFromCache
                ? 'text-red-400'
                : isLoading
                  ? 'text-amber'
                  : 'text-cyan'
            }`}
          />
          <div
            className={`absolute bottom-0.5 right-0.5 h-1.5 w-1.5 rounded-full ${
              error && !isFromCache
                ? 'bg-red-400'
                : isLoading
                  ? 'bg-amber'
                  : isFromCache
                    ? 'bg-green-400'
                    : 'bg-cyan'
            } shadow-[0_0_8px_rgba(0,255,255,0.75)]`}
          />
        </div>
      </div>
    </header>
  );
}