/**
 * Championship Data Hook
 *
 * React hook for fetching and managing championship data.
 * Implements two-phase loading:
 * - Phase A (Core): Minimum data for dashboard
 * - Phase B (Analytics): Historical results on demand
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { openF1Service, OpenF1Error } from '../services/openF1Service';
import { enrichDriverStandings, enrichTeamStandings } from '../utils/championshipMetrics';
import { UI_CONFIG } from '../config/appConfig';
import type { ChampionshipDataSnapshot, OpenF1Session } from '../types/f1';
import type { DataLoadingPhase, AppError, DataSourceState } from '../types/app';

interface UseChampionshipDataResult {
  data: ChampionshipDataSnapshot | null;
  isLoading: boolean;
  isAnalyticsLoading: boolean;
  phase: DataLoadingPhase;
  error: AppError | null;
  sourceState: DataSourceState;
  isFromCache: boolean;
  lastSyncTime: string | null;
  cooldownSeconds: number;
  analyticsProgress: { current: number; total: number } | null;
  loadingMessage: string;
  refreshData: (force?: boolean) => Promise<void>;
  loadAnalyticsArchive: () => Promise<void>;
  clearError: () => void;
}

const LOADING_MESSAGES = {
  idle: '',
  core: 'Loading championship data...',
  analytics: 'Indexing analytics archive...',
  complete: '',
  error: '',
};

export function useChampionshipData(): UseChampionshipDataResult {
  const [data, setData] = useState<ChampionshipDataSnapshot | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isAnalyticsLoading, setIsAnalyticsLoading] = useState(false);
  const [phase, setPhase] = useState<DataLoadingPhase>('idle');
  const [error, setError] = useState<AppError | null>(null);
  const [sourceState, setSourceState] = useState<DataSourceState>('loading');
  const [isFromCache, setIsFromCache] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [analyticsProgress, setAnalyticsProgress] = useState<{ current: number; total: number } | null>(null);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);

  const hasLoadedRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const lastForceRefreshRef = useRef(0);

  /**
   * Update cooldown timer
   */
  useEffect(() => {
    if (cooldownSeconds <= 0) return;

    const interval = setInterval(() => {
      setCooldownSeconds((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(interval);
  }, [cooldownSeconds]);

  /**
   * Enrich snapshot with calculated metrics
   */
  const enrichSnapshot = useCallback((snapshot: ChampionshipDataSnapshot): ChampionshipDataSnapshot => {
    // Convert driversByTeam to format for metrics
    const driversByTeamArray = new Map<string, { driver_number: number }[]>();
    snapshot.driversByTeam.forEach((drivers, teamName) => {
      driversByTeamArray.set(teamName, drivers.map((d) => ({ driver_number: d.driver_number })));
    });

    // Enrich driver standings
    const enrichedDriverStandings = enrichDriverStandings(
      snapshot.driverStandings,
      snapshot.raceResults,
      driversByTeamArray
    );

    // Enrich team standings
    const enrichedTeamStandings = enrichTeamStandings(
      snapshot.teamStandings,
      snapshot.completedRounds
    );

    return {
      ...snapshot,
      driverStandings: enrichedDriverStandings,
      teamStandings: enrichedTeamStandings,
    };
  }, []);

  /**
   * Phase A: Fetch core data
   */
  const fetchCoreData = useCallback(async (forceRefresh: boolean = false) => {
    // Prevent duplicate calls in React Strict Mode
    const now = Date.now();
    if (!forceRefresh && hasLoadedRef.current) return;
    if (forceRefresh && now - lastForceRefreshRef.current < UI_CONFIG.rateLimitCooldownSeconds * 1000) {
      // Don't allow force refresh more than once per 30 seconds
      return;
    }

    if (forceRefresh) {
      lastForceRefreshRef.current = now;
    }

    // Cancel previous request
    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();

    setIsLoading(true);
    setPhase('core');
    setError(null);
    setLoadingMessage(LOADING_MESSAGES.core);

    try {
      const result = await openF1Service.fetchCoreSnapshot(2026, {
        forceRefresh,
        onProgress: (msg) => setLoadingMessage(msg),
      });

      if (abortControllerRef.current?.signal.aborted) return;

      if (result.data) {
        const enriched = enrichSnapshot(result.data);
        setData(enriched);
        setLastSyncTime(enriched.lastUpdated);
        setIsFromCache(result.fromCache);
        setSourceState(result.fromCache ? 'cached' : 'live');
        setPhase('complete');
        hasLoadedRef.current = true;
      }

      if (result.error) {
        const appError: AppError = {
          type: result.error.type,
          message: result.error.message,
          retryAfter: result.error.retryAfter,
          canShowCachedData: result.fromCache,
        };
        setError(appError);

        if (result.error.type === 'rate_limited') {
          setSourceState('rate_limited');
          setCooldownSeconds(result.error.retryAfter || UI_CONFIG.rateLimitCooldownSeconds);
        } else if (!result.data) {
          setSourceState('offline');
        }
      }
    } catch (err) {
      const apiError = err instanceof OpenF1Error ? err : OpenF1Error.unknown(err);
      setError({
        type: apiError.type,
        message: apiError.message,
        canShowCachedData: false,
      });
      setSourceState('error');
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
    }
  }, [enrichSnapshot]);

  /**
   * Phase B: Load analytics archive on demand
   */
  const loadAnalyticsArchive = useCallback(async () => {
    if (!data || isAnalyticsLoading) return;

    setIsAnalyticsLoading(true);
    setAnalyticsProgress(null);

    try {
      // Get sessions from cached data
      const cached = await openF1Service.fetchCoreSnapshot(2026, { forceRefresh: false });
      if (!cached.data) return;

      const sessions = cached.data.raceWeekends
        .map((rw) => rw.raceSessionKey)
        .filter((key): key is number => key !== null);

      const result = await openF1Service.fetchAnalyticsArchive(
        sessions as unknown as OpenF1Session[],
        (current, total) => setAnalyticsProgress({ current, total }),
        abortControllerRef.current?.signal
      );

      if (result.results.length > 0) {
        // Merge results into snapshot
        setData((prev) =>
          prev
            ? {
                ...prev,
                raceResults: [...prev.raceResults, ...result.results],
              }
            : null
        );
      }

      if (result.errors.length > 0) {
        const firstError = result.errors[0];
        setError({
          type: firstError.type,
          message: firstError.message,
          retryAfter: firstError.retryAfter,
          canShowCachedData: true,
        });
      }
    } finally {
      setIsAnalyticsLoading(false);
      setAnalyticsProgress(null);
    }
  }, [data, isAnalyticsLoading]);

  /**
   * Refresh data
   */
  const refreshData = useCallback(
    async (force: boolean = false) => {
      await fetchCoreData(force);
    },
    [fetchCoreData]
  );

  /**
   * Clear error
   */
  const clearError = useCallback(() => {
    setError(null);
    if (sourceState === 'error' || sourceState === 'rate_limited') {
      setSourceState(data ? (isFromCache ? 'cached' : 'live') : 'loading');
    }
  }, [sourceState, data, isFromCache]);

  /**
   * Initial load - only runs once
   */
  useEffect(() => {
    if (!hasLoadedRef.current) {
      fetchCoreData(false);
    }
  }, [fetchCoreData]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  return {
    data,
    isLoading,
    isAnalyticsLoading,
    phase,
    error,
    sourceState,
    isFromCache,
    lastSyncTime,
    cooldownSeconds,
    analyticsProgress,
    loadingMessage,
    refreshData,
    loadAnalyticsArchive,
    clearError,
  };
}
