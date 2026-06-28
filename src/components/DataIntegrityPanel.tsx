import { Shield, Database, RefreshCw, Gauge, AlertTriangle, Archive, Loader2 } from 'lucide-react';
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
  analyticsProgress: { current: number; total: number; mode: 'initial' | 'resume' } | null;
  cooldownSeconds: number;
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
}: DataIntegrityPanelProps) {
  const latestMeeting = data?.latestCompletedMeeting;
  const archiveStatus = data?.analyticsArchive;
  const canForceRefresh = cooldownSeconds === 0 && !isAnalyticsLoading;
  const archiveSummary = archiveStatus
    ? `${archiveStatus.successfullyIndexedRaceSessions}/${archiveStatus.totalCompletedRaceSessions} indexed rounds • ${archiveStatus.qualifyingSessionsIndexed} qualifying sessions indexed`
    : 'Archive status pending';
  const pendingRoundCount = Math.max(
    0,
    (archiveStatus?.pendingDescriptors.length || 0) + (archiveStatus?.skippedDescriptors.length || 0)
  );
  const pendingMeetingNames = archiveStatus?.incompleteMeetingNames.slice(0, 3).join(', ') || '';

  return (
    <div className="bg-graphite-light/30 border border-white/10 rounded-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10 bg-white/[0.02]">
        <Shield className="w-4 h-4 text-cyan" />
        <h2 className="text-sm tracking-[0.15em] text-white/80 font-medium">
          DATA INTEGRITY PROTOCOL
        </h2>
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        {/* Source */}
        <div className="flex items-start gap-3">
          <Database className="w-4 h-4 text-white/40 mt-0.5" />
          <div>
            <div className="text-[10px] text-white/40 uppercase tracking-wider">Source</div>
            <div className="text-xs text-white/70">OpenF1 public API</div>
          </div>
        </div>

        {/* Data mode */}
        <div className="flex items-start gap-3">
          <Database className="w-4 h-4 text-white/40 mt-0.5" />
          <div>
            <div className="text-[10px] text-white/40 uppercase tracking-wider">Data Mode</div>
            <div className="text-xs text-white/70">Historical / officially completed sessions only</div>
          </div>
        </div>

        {/* Current data cutoff */}
        <div className="flex items-start gap-3">
          <Database className="w-4 h-4 text-white/40 mt-0.5" />
          <div>
            <div className="text-[10px] text-white/40 uppercase tracking-wider">Data Cutoff</div>
            <div className="text-xs text-white/70">
              {latestMeeting
                ? latestMeeting.meeting_name
                : 'No completed races yet'}
            </div>
          </div>
        </div>

        {/* Refresh method */}
        <div className="flex items-start gap-3">
          <RefreshCw className="w-4 h-4 text-white/40 mt-0.5" />
          <div>
            <div className="text-[10px] text-white/40 uppercase tracking-wider">Refresh Method</div>
            <div className="text-xs text-white/70">Manual / Page-load refresh</div>
          </div>
        </div>

        {/* Forecast status */}
        <div className="flex items-start gap-3">
          <Gauge className="w-4 h-4 text-amber mt-0.5" />
          <div>
            <div className="text-[10px] text-white/40 uppercase tracking-wider">Forecast Status</div>
            <div className="text-xs text-amber">CALIBRATING — awaiting sufficient data</div>
          </div>
        </div>

        {/* Last sync */}
        <div className="flex items-start gap-3">
          <RefreshCw className="w-4 h-4 text-white/40 mt-0.5" />
          <div>
            <div className="text-[10px] text-white/40 uppercase tracking-wider">
              {isFromCache ? 'Cache Time' : 'Last Sync'}
            </div>
            <div className="text-xs text-white/70 font-mono">
              {formatTimestamp(lastUpdated)}
            </div>
          </div>
        </div>

        {/* Data status indicator */}
        <div className="flex items-start gap-3">
          <Database className="w-4 h-4 text-white/40 mt-0.5" />
          <div>
            <div className="text-[10px] text-white/40 uppercase tracking-wider">Status</div>
            <div className={`text-xs ${isFromCache ? 'text-green-400/70' : 'text-cyan'}`}>
              {isFromCache
                ? 'CACHED VERIFIED SNAPSHOT'
                : sourceState === 'loading'
                  ? 'SYNCING...'
                  : 'LIVE VERIFIED DATA'}
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="pt-3 border-t border-white/10 space-y-2">
          {/* Load analytics archive button */}
          <button
            onClick={onLoadAnalytics}
            disabled={isAnalyticsLoading || !data || data.completedRounds === 0 || archiveStatus?.isComplete}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 border border-cyan/30 rounded text-xs tracking-wider text-cyan hover:bg-cyan/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isAnalyticsLoading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>
                  {analyticsProgress?.mode === 'resume'
                    ? `ANALYTICS ARCHIVE // RETRYING MISSING ROUND ${analyticsProgress.current || 0} OF ${analyticsProgress.total || 0}`
                    : `ANALYTICS ARCHIVE // INDEXING ROUND ${analyticsProgress?.current || 0} OF ${analyticsProgress?.total || 0}`}
                </span>
              </>
            ) : (
              <>
                <Archive className="w-3.5 h-3.5" />
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

          {/* Force live re-sync button */}
          <button
            onClick={onRefresh}
            disabled={!canForceRefresh}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 border border-white/20 rounded text-xs tracking-wider text-white/50 hover:text-white hover:border-white/40 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title={cooldownSeconds > 0 ? `Cooldown: ${cooldownSeconds}s` : 'Force live re-sync'}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isAnalyticsLoading ? 'animate-spin' : ''}`} />
            <span>
              {cooldownSeconds > 0
                ? `COOLDOWN: ${cooldownSeconds}s`
                : 'FORCE LIVE RE-SYNC'}
            </span>
          </button>
        </div>

        {archiveStatus && (
          <div className="mt-2 rounded border border-white/10 bg-white/[0.02] p-2">
            <div className={`text-[10px] uppercase tracking-[0.2em] ${archiveStatus.isComplete ? 'text-green-400/70' : 'text-amber/70'}`}>
              {archiveStatus.isComplete ? 'Archive verified' : 'Archive partial'}
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

        {/* Integrity statement */}
        <div className="mt-4 pt-3 border-t border-white/10">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-3.5 h-3.5 text-amber/70 mt-0.5 flex-shrink-0" />
            <p className="text-[11px] text-white/50 leading-relaxed">
              No race result, standing, or prediction is fabricated when verified source data is unavailable.
              Partially indexed archive rounds remain explicitly marked pending.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
