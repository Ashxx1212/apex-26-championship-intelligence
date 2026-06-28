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
import { cacheService } from '../services/cacheService';
import { enrichDriverStandings, enrichTeamStandings } from '../utils/championshipMetrics';
import { UI_CONFIG } from '../config/appConfig';
import type { ChampionshipDataSnapshot, OpenF1Meeting, OpenF1Session, HistoricalRaceSessionDescriptor, RaceResult } from '../types/f1';
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
  analyticsProgress: { current: number; total: number; mode: 'initial' | 'resume' } | null;
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
  const [analyticsProgress, setAnalyticsProgress] = useState<{ current: number; total: number; mode: 'initial' | 'resume' } | null>(null);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);

  const hasLoadedRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const analyticsAbortControllerRef = useRef<AbortController | null>(null);
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
      } else if (result.error) {
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
        } else {
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

    analyticsAbortControllerRef.current?.abort();
    analyticsAbortControllerRef.current = new AbortController();

    try {
      const cachedMeetings = cacheService.getMeetings<OpenF1Meeting[]>();
      const cachedSessions = cacheService.getSessions<OpenF1Session[]>();
      const meetings = cachedMeetings.status === 'valid' && cachedMeetings.data ? cachedMeetings.data : [];
      const sessions = cachedSessions.status === 'valid' && cachedSessions.data ? cachedSessions.data : [];

      const allCompletedDescriptors = openF1Service.buildHistoricalRaceSessionDescriptors(meetings, sessions);
      if (allCompletedDescriptors.length === 0) {
        return;
      }

      const isResume = Boolean(data.analyticsArchive?.hasPendingWork);
      const totalCompletedRaceSessions = data.analyticsArchive?.totalCompletedRaceSessions ?? allCompletedDescriptors.length;
      const descriptorsToProcess = isResume
        ? allCompletedDescriptors.filter((descriptor) => {
            const existingResult = (data.raceResults || []).find((result) => result.meetingKey === descriptor.meetingKey);
            const hasVerifiedWinner = Boolean(existingResult?.winner);
            const cachedRace = cacheService.getRaceResult(descriptor.raceSessionKey);
            const cachedRaceHasVerifiedWinner = Boolean(
              cachedRace.status === 'valid' &&
              Array.isArray(cachedRace.data) &&
              cachedRace.data.some((item) => item.position === 1)
            );
            const isPending = (data.analyticsArchive?.pendingDescriptors || []).some((item) => item.meetingKey === descriptor.meetingKey);
            const isSkipped = (data.analyticsArchive?.skippedDescriptors || []).some((item) => item.meetingKey === descriptor.meetingKey);
            return (isPending || isSkipped || !hasVerifiedWinner) && !cachedRaceHasVerifiedWinner;
          })
        : allCompletedDescriptors;

      if (isResume && descriptorsToProcess.length === 0) {
        setAnalyticsProgress({ current: 0, total: 0, mode: 'resume' });
        return;
      }

      if (import.meta.env.DEV) {
        console.info(
          `[APEX Archive] mode=${isResume ? 'resume' : 'initial'} totalDescriptors=${allCompletedDescriptors.length} workList=${descriptorsToProcess.length} meetings=${descriptorsToProcess.map((descriptor) => descriptor.meetingName).join(', ')}`
        );
      }

      setIsAnalyticsLoading(true);
      setAnalyticsProgress({ current: 0, total: descriptorsToProcess.length, mode: isResume ? 'resume' : 'initial' });

      const result = await openF1Service.fetchAnalyticsArchive(
        descriptorsToProcess,
        (current, total) => setAnalyticsProgress((prev) => prev ? { ...prev, current, total } : { current, total, mode: isResume ? 'resume' : 'initial' }),
        analyticsAbortControllerRef.current.signal,
        data.allDrivers,
        { totalCompletedRaceSessions, isResume, existingArchiveStatus: data.analyticsArchive }
      );

      if (result.results.length > 0) {
        setData((prev) => {
          if (!prev) return null;

          const mergedResults = [...prev.raceResults];
          result.results.forEach((archiveResult) => {
            const index = mergedResults.findIndex((existing) => existing.meetingKey === archiveResult.meetingKey);
            if (index >= 0) {
              mergedResults[index] = archiveResult;
            } else {
              mergedResults.push(archiveResult);
            }
          });

          const sortedResults = mergedResults.sort((a, b) => a.round - b.round);
          const enriched = enrichSnapshot({ ...prev, raceResults: sortedResults, analyticsArchive: result.archiveStatus, analyticsCoverage: { indexedRaceResults: result.archiveStatus.successfullyIndexedRaceSessions, indexedQualifyingSessions: result.archiveStatus.qualifyingSessionsIndexed, totalCompletedRaceSessions: result.archiveStatus.totalCompletedRaceSessions } });
          const updatedRaceWeekends = enriched.raceWeekends.map((weekend) => {
            const matchingResult = sortedResults.find((result) => result.meetingKey === weekend.meetingKey);
            if (!matchingResult?.winner) {
              return weekend;
            }
            return {
              ...weekend,
              raceWinner: matchingResult.winner,
            };
          });

          return {
            ...enriched,
            raceWeekends: updatedRaceWeekends,
            analyticsArchive: result.archiveStatus,
            analyticsCoverage: {
              indexedRaceResults: result.archiveStatus.successfullyIndexedRaceSessions,
              indexedQualifyingSessions: result.archiveStatus.qualifyingSessionsIndexed,
              totalCompletedRaceSessions: result.archiveStatus.totalCompletedRaceSessions,
            },
          };
        });
      }

      if (result.errors.length > 0) {
        const firstError = result.errors[0];
        if (firstError.type === 'rate_limited') {
          setCooldownSeconds(firstError.retryAfter || UI_CONFIG.rateLimitCooldownSeconds);
          setSourceState('rate_limited');
        }
        setError({
          type: firstError.type,
          message: firstError.message,
          retryAfter: firstError.retryAfter,
          canShowCachedData: true,
        });
      }
    } catch (err) {
      const apiError = err instanceof OpenF1Error ? err : OpenF1Error.unknown(err);
      setError({
        type: apiError.type,
        message: apiError.message,
        canShowCachedData: true,
      });
    } finally {
      setIsAnalyticsLoading(false);
      setAnalyticsProgress(null);
    }
  }, [data, isAnalyticsLoading, enrichSnapshot]);

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
      analyticsAbortControllerRef.current?.abort();
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
