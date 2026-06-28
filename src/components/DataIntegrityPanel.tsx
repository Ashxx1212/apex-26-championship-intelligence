import {
  Shield,
  Database,
  RefreshCw,
  Gauge,
  AlertTriangle,
  Archive,
  Loader2,
  LockKeyhole,
} from 'lucide-react';
import { formatTimestamp } from '../utils/formatters';
import type { ChampionshipDataSnapshot } from '../types/f1';
import type { DataSourceState } from '../types/app';

interface DataIntegrityPanelProps {
  data: ChampionshipDataSnapshot | null;
  lastUpdated: string | null;
  isFromCache: boolean;
  sourceState: DataSourceState;
  onRefresh: () => void;
  onLoadAnalytics: () => void;
  isAnalyticsLoading: boolean;
  analyticsProgress: {
    current: number;
    total: number;
    mode: 'initial' | 'resume';
  } | null;
  cooldownSeconds: number;
  isPublicAccessRestricted: boolean;
  sourceAccessRetrySeconds: number;
}

function formatRetry(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  return `${String(minutes).padStart(2, '0')}:${String(
    remainingSeconds
  ).padStart(2, '0')}`;
}

export function DataIntegrityPanel({
  data,
  lastUpdated,
  isFromCache,
  sourceState,
  onRefresh,
  onLoadAnalytics,
  isAnalyticsLoading,
  analyticsProgress,
  cooldownSeconds,
  isPublicAccessRestricted,
  sourceAccessRetrySeconds,
}: DataIntegrityPanelProps) {
  const latestMeeting = data?.latestCompletedMeeting;
  const archiveStatus = data?.analyticsArchive;

  const accessPaused =
    isPublicAccessRestricted && sourceAccessRetrySeconds > 0;

  const canForceRefresh =
    cooldownSeconds === 0 && !isAnalyticsLoading && !accessPaused;

  const canLoadArchive =
    !isAnalyticsLoading &&
    !accessPaused &&
    Boolean(data) &&
    (data?.completedRounds ?? 0) > 0 &&
    !archiveStatus?.isComplete;

  const pendingRoundCount = Math.max(
    0,
    (archiveStatus?.pendingDescriptors.length || 0) +
      (archiveStatus?.skippedDescriptors.length || 0)
  );

  const pendingMeetingNames =
    archiveStatus?.incompleteMeetingNames.slice(0, 3).join(', ') || '';

  return (
    <div className="overflow-hidden rounded-sm border border-white/10 bg-graphite-light/30">
      <div className="flex items-center gap-2 border-b border-white/10 bg-white/[0.02] px-4 py-3">
        <Shield className="h-4 w-4 text-cyan" />
        <h2 className="text-sm font-medium tracking-[0.15em] text-white/80">
          DATA INTEGRITY PROTOCOL
        </h2>
      </div>

      <div className="space-y-3 p-4">
        <div className="flex items-start gap-3">
          <Database className="mt-0.5 h-4 w-4 text-white/40" />
          <div>
            <div className="text-[10px] uppercase tracking-wider text-white/40">
              Source
            </div>
            <div className="text-xs text-white/70">OpenF1 public API</div>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <Database className="mt-0.5 h-4 w-4 text-white/40" />
          <div>
            <div className="text-[10px] uppercase tracking-wider text-white/40">
              Data Mode
            </div>
            <div className="text-xs text-white/70">
              Historical / officially completed sessions only
            </div>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <Database className="mt-0.5 h-4 w-4 text-white/40" />
          <div>
            <div className="text-[10px] uppercase tracking-wider text-white/40">
              Data Cutoff
            </div>
            <div className="text-xs text-white/70">
              {latestMeeting
                ? latestMeeting.meeting_name
                : 'No completed races yet'}
            </div>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <RefreshCw className="mt-0.5 h-4 w-4 text-white/40" />
          <div>
            <div className="text-[10px] uppercase tracking-wider text-white/40">
              Refresh Method
            </div>
            <div className="text-xs text-white/70">
              Manual refresh / Command Centre auto-sync
            </div>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <Gauge className="mt-0.5 h-4 w-4 text-amber" />
          <div>
            <div className="text-[10px] uppercase tracking-wider text-white/40">
              Forecast Status
            </div>
            <div className="text-xs text-amber">
              CALIBRATING — awaiting sufficient data
            </div>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <RefreshCw className="mt-0.5 h-4 w-4 text-white/40" />
          <div>
            <div className="text-[10px] uppercase tracking-wider text-white/40">
              {isFromCache ? 'Cache Time' : 'Last Sync'}
            </div>
            <div className="font-mono text-xs text-white/70">
              {formatTimestamp(lastUpdated)}
            </div>
          </div>
        </div>

        <div className="flex items-start gap-3">
          {accessPaused ? (
            <LockKeyhole className="mt-0.5 h-4 w-4 text-amber" />
          ) : (
            <Database className="mt-0.5 h-4 w-4 text-white/40" />
          )}

          <div>
            <div className="text-[10px] uppercase tracking-wider text-white/40">
              Status
            </div>

            <div
              className={`text-xs ${
                accessPaused
                  ? 'text-amber'
                  : isFromCache
                    ? 'text-green-400/70'
                    : 'text-cyan'
              }`}
            >
              {accessPaused
                ? `PUBLIC SOURCE ACCESS PAUSED · RETRY IN ${formatRetry(
                    sourceAccessRetrySeconds
                  )}`
                : isFromCache
                  ? 'CACHED VERIFIED SNAPSHOT'
                  : sourceState === 'loading'
                    ? 'SYNCING...'
                    : 'LIVE VERIFIED DATA'}
            </div>
          </div>
        </div>

        {accessPaused && (
          <div className="flex items-start gap-2 border border-amber/25 bg-amber/[0.04] p-3">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber" />
            <p className="text-[10px] leading-relaxed text-amber/85">
              Austria is active, so OpenF1 public requests are temporarily
              unavailable. Cached championship intelligence remains online.
              Refresh and archive retries will unlock when the retry window ends.
            </p>
          </div>
        )}

        <div className="space-y-2 border-t border-white/10 pt-3">
          <button
            onClick={onLoadAnalytics}
            disabled={!canLoadArchive}
            title={
              accessPaused
                ? `Public source access paused. Retry in ${formatRetry(
                    sourceAccessRetrySeconds
                  )}`
                : undefined
            }
            className={`flex w-full items-center justify-center gap-2 rounded border px-3 py-2 text-xs tracking-wider transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
              accessPaused
                ? 'border-amber/25 text-amber/70'
                : 'border-cyan/30 text-cyan hover:bg-cyan/10'
            }`}
          >
            {isAnalyticsLoading ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>
                  {analyticsProgress?.mode === 'resume'
                    ? `ANALYTICS ARCHIVE // RETRYING MISSING ROUND ${
                        analyticsProgress.current || 0
                      } OF ${analyticsProgress.total || 0}`
                    : `ANALYTICS ARCHIVE // INDEXING ROUND ${
                        analyticsProgress?.current || 0
                      } OF ${analyticsProgress?.total || 0}`}
                </span>
              </>
            ) : accessPaused ? (
              <>
                <LockKeyhole className="h-3.5 w-3.5" />
                <span>
                  {archiveStatus?.hasPendingWork
                    ? `RESUME MISSING ROUNDS PAUSED · ${formatRetry(
                        sourceAccessRetrySeconds
                      )}`
                    : `ARCHIVE LOAD PAUSED · ${formatRetry(
                        sourceAccessRetrySeconds
                      )}`}
                </span>
              </>
            ) : (
              <>
                <Archive className="h-3.5 w-3.5" />
                <span>
                  {archiveStatus?.isComplete
                    ? 'ARCHIVE VERIFIED'
                    : archiveStatus?.hasPendingWork
                      ? 'RESUME MISSING ROUNDS'
                      : 'LOAD ANALYTICS ARCHIVE'}
                </span>
              </>
            )}
          </button>

          <button
            onClick={onRefresh}
            disabled={!canForceRefresh}
            title={
              accessPaused
                ? `Public source access paused. Retry in ${formatRetry(
                    sourceAccessRetrySeconds
                  )}`
                : cooldownSeconds > 0
                  ? `Cooldown: ${cooldownSeconds}s`
                  : 'Force verified source re-sync'
            }
            className={`flex w-full items-center justify-center gap-2 rounded border px-3 py-2 text-xs tracking-wider transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
              accessPaused
                ? 'border-amber/25 text-amber/70'
                : 'border-white/20 text-white/50 hover:border-white/40 hover:text-white'
            }`}
          >
            {accessPaused ? (
              <>
                <LockKeyhole className="h-3.5 w-3.5" />
                <span>
                  LIVE RE-SYNC PAUSED · {formatRetry(sourceAccessRetrySeconds)}
                </span>
              </>
            ) : (
              <>
                <RefreshCw
                  className={`h-3.5 w-3.5 ${
                    isAnalyticsLoading ? 'animate-spin' : ''
                  }`}
                />
                <span>
                  {cooldownSeconds > 0
                    ? `COOLDOWN: ${cooldownSeconds}s`
                    : 'FORCE LIVE RE-SYNC'}
                </span>
              </>
            )}
          </button>
        </div>

        {archiveStatus && (
          <div className="mt-2 rounded border border-white/10 bg-white/[0.02] p-2">
            <div
              className={`text-[10px] uppercase tracking-[0.2em] ${
                archiveStatus.isComplete
                  ? 'text-green-400/70'
                  : 'text-amber/70'
              }`}
            >
              {archiveStatus.isComplete
                ? 'Archive verified'
                : 'Archive partial'}
            </div>

            <div className="mt-1 text-[11px] text-white/60">
              {archiveStatus.isComplete
                ? `ANALYTICS ARCHIVE VERIFIED // ${archiveStatus.totalCompletedRaceSessions} OF ${archiveStatus.totalCompletedRaceSessions} ROUNDS INDEXED`
                : `ARCHIVE PARTIAL // ${archiveStatus.successfullyIndexedRaceSessions} OF ${archiveStatus.totalCompletedRaceSessions} ROUNDS INDEXED`}
            </div>

            {archiveStatus.hasPendingWork && (
              <>
                <div className="mt-1 text-[10px] text-white/40">
                  {pendingRoundCount} rounds require verified-result retry.
                </div>

                {pendingMeetingNames && (
                  <div className="mt-1 text-[9px] text-white/35">
                    Pending meetings: {pendingMeetingNames}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        <div className="mt-4 border-t border-white/10 pt-3">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber/70" />
            <p className="text-[11px] leading-relaxed text-white/50">
              No race result, standing, or prediction is fabricated when
              verified source data is unavailable. Partially indexed archive
              rounds remain explicitly marked pending.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
