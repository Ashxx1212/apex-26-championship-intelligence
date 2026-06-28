import { Clock, RefreshCw } from 'lucide-react';
import { useEffect, useState } from 'react';
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
    const interval = setInterval(() => {
      setTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const getStatusDisplay = () => {
    if (isLoading && sourceState !== 'cached') {
      return (
        <span className="text-xs tracking-wider text-cyan animate-pulse">
          {loadingMessage || DATA_STATUS_LABELS.loading}
        </span>
      );
    }

    if (sourceState === 'rate_limited') {
      return (
        <div className="flex items-center gap-2">
          <span className="text-xs tracking-wider text-amber">
            {DATA_STATUS_LABELS.rateLimited}
          </span>
          {cooldownSeconds > 0 && (
            <span className="text-xs text-amber/60">
              COOLDOWN: {cooldownSeconds}s
            </span>
          )}
        </div>
      );
    }

    if (sourceState === 'offline' || (error && !isFromCache)) {
      return (
        <span className="text-xs tracking-wider text-red-400">
          {DATA_STATUS_LABELS.offline}
        </span>
      );
    }

    if (isFromCache) {
      return (
        <div className="flex items-center gap-2">
          <span className="text-xs tracking-wider text-green-400/80">
            {DATA_STATUS_LABELS.cached}
          </span>
        </div>
      );
    }

    return (
      <span className="text-xs tracking-wider text-green-400">
        {DATA_STATUS_LABELS.live}
      </span>
    );
  };

  const canRefresh = !isLoading && cooldownSeconds === 0;

  return (
    <header className="flex items-center justify-between h-14 px-4 md:px-6 border-b border-white/10 bg-graphite/80 backdrop-blur-sm">
      {/* Season badge */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 px-3 py-1 bg-crimson/10 border border-crimson/30 rounded">
          <span className="text-xs tracking-wider text-crimson font-bold">
            2026 SEASON
          </span>
        </div>

        {/* Rounds complete */}
        <div className="hidden md:flex items-center gap-2 text-xs text-white/60">
          <span className="tracking-wider">ROUNDS:</span>
          <span className="text-cyan font-bold">{completedRounds}</span>
          <span className="text-white/30">/</span>
          <span className="text-white/40">{totalRounds}</span>
        </div>
      </div>

      {/* Status indicators */}
      <div className="flex items-center gap-4 md:gap-6 overflow-x-auto">
        {/* Data core status */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {getStatusDisplay()}
        </div>

        {/* Divider - hidden on mobile */}
        <div className="hidden md:block w-[1px] h-4 bg-white/10" />

        {/* Source */}
        <div className="hidden md:flex items-center gap-2 flex-shrink-0">
          <span className="text-xs tracking-wider text-white/40">
            SOURCE:
          </span>
          <span className={`text-xs tracking-wider ${isFromCache ? 'text-green-400/80' : 'text-cyan'}`}>
            {dataSource}
          </span>
        </div>

        {/* Divider - hidden on mobile */}
        <div className="hidden md:block w-[1px] h-4 bg-white/10" />

        {/* Last sync */}
        <div className="hidden md:flex items-center gap-2 flex-shrink-0">
          <span className="text-xs tracking-wider text-white/40">
            {isFromCache ? 'CACHE TIME:' : 'LAST SYNC:'}
          </span>
          <span className="text-xs tracking-wider text-white/70 font-mono">
            {formatTime(lastSync)}
          </span>
        </div>

        {/* Refresh button */}
        <button
          onClick={() => onRefresh()}
          disabled={!canRefresh}
          className="flex items-center gap-1.5 px-3 py-1.5 border border-white/20 rounded text-xs tracking-wider text-white/60 hover:text-white hover:border-cyan/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
          title={cooldownSeconds > 0 ? `Cooldown: ${cooldownSeconds}s` : 'Refresh data'}
        >
          <RefreshCw
            className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`}
          />
          <span className="hidden sm:inline">REFRESH</span>
        </button>

        {/* Current time */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <Clock className="w-4 h-4 text-white/40" />
          <span className="text-xs tracking-wider text-white/70 font-mono">
            {time.toLocaleTimeString('en-GB', {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            })}
          </span>
        </div>

        {/* Connection indicator */}
        <div className="relative flex-shrink-0">
          <div
            className={`w-2 h-2 rounded-full ${
              error && !isFromCache
                ? 'bg-red-400'
                : isLoading
                  ? 'bg-amber'
                  : isFromCache
                    ? 'bg-green-400/70'
                    : 'bg-cyan'
            }`}
            style={{
              boxShadow: error && !isFromCache
                ? '0 0 8px rgba(248, 113, 113, 0.5)'
                : isLoading
                  ? '0 0 8px rgba(251, 191, 36, 0.5)'
                  : isFromCache
                    ? '0 0 8px rgba(74, 222, 128, 0.5)'
                    : '0 0 8px rgba(0, 255, 255, 0.5)',
            }}
          />
          <div
            className={`absolute inset-0 w-2 h-2 rounded-full animate-ping ${
              error && !isFromCache
                ? 'bg-red-400/50'
                : isLoading
                  ? 'bg-amber/50'
                  : isFromCache
                    ? 'bg-green-400/30'
                    : 'bg-cyan/50'
            }`}
          />
        </div>
      </div>
    </header>
  );
}
