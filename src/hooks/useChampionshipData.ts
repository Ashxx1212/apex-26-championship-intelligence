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
import { isOpenF1PublicAccessRestriction } from '../services/openF1Client';
import { cacheService } from '../services/cacheService';
import { enrichDriverStandings, enrichTeamStandings } from '../utils/championshipMetrics';
import { UI_CONFIG } from '../config/appConfig';
import type {
  ChampionshipDataSnapshot,
  OpenF1Meeting,
  OpenF1Session,
} from '../types/f1';
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
  isPublicAccessRestricted: boolean;
  sourceAccessRetrySeconds: number;
  analyticsProgress: {
    current: number;
    total: number;
    mode: 'initial' | 'resume';
  } | null;
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

const PUBLIC_ACCESS_RETRY_SECONDS = 300;

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
  const [analyticsProgress, setAnalyticsProgress] = useState<{
    current: number;
    total: number;
    mode: 'initial' | 'resume';
  } | null>(null);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const [isPublicAccessRestricted, setIsPublicAccessRestricted] =
    useState(false);
  const [sourceAccessRetrySeconds, setSourceAccessRetrySeconds] = useState(0);

  const hasLoadedRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const analyticsAbortControllerRef = useRef<AbortController | null>(null);
  const lastForceRefreshRef = useRef(0);

  useEffect(() => {
    if (cooldownSeconds <= 0) return;

    const interval = window.setInterval(() => {
      setCooldownSeconds((previous) => Math.max(0, previous - 1));
    }, 1000);

    return () => window.clearInterval(interval);
  }, [cooldownSeconds]);

  useEffect(() => {
    if (sourceAccessRetrySeconds <= 0) return;

    const interval = window.setInterval(() => {
      setSourceAccessRetrySeconds((previous) => Math.max(0, previous - 1));
    }, 1000);

    return () => window.clearInterval(interval);
  }, [sourceAccessRetrySeconds]);

  const enrichSnapshot = useCallback(
    (snapshot: ChampionshipDataSnapshot): ChampionshipDataSnapshot => {
      const driversByTeamArray = new Map<
        string,
        { driver_number: number }[]
      >();

      snapshot.driversByTeam.forEach((drivers, teamName) => {
        driversByTeamArray.set(
          teamName,
          drivers.map((driver) => ({
            driver_number: driver.driver_number,
          }))
        );
      });

      const enrichedDriverStandings = enrichDriverStandings(
        snapshot.driverStandings,
        snapshot.raceResults,
        driversByTeamArray
      );

      const enrichedTeamStandings = enrichTeamStandings(
        snapshot.teamStandings,
        snapshot.completedRounds
      );

      return {
        ...snapshot,
        driverStandings: enrichedDriverStandings,
        teamStandings: enrichedTeamStandings,
      };
    },
    []
  );

  const shouldTreatAsPublicRestriction = useCallback(
    (apiError: OpenF1Error, snapshot: ChampionshipDataSnapshot | null) => {
      return (
        isOpenF1PublicAccessRestriction(apiError) ||
        (apiError.type === 'network_unavailable' &&
          snapshot?.currentMeeting !== null &&
          snapshot !== null)
      );
    },
    []
  );

  const activateArchiveAccessPause = useCallback(
    (apiError: OpenF1Error, snapshot: ChampionshipDataSnapshot | null) => {
      const restricted = shouldTreatAsPublicRestriction(apiError, snapshot);

      if (!restricted) return false;

      setIsPublicAccessRestricted(true);
      setSourceAccessRetrySeconds(PUBLIC_ACCESS_RETRY_SECONDS);

      if (snapshot) {
        setIsFromCache(true);
        setSourceState('cached');
      } else {
        setSourceState('offline');
      }

      return true;
    },
    [shouldTreatAsPublicRestriction]
  );

  const fetchCoreData = useCallback(
    async (forceRefresh: boolean = false) => {
      const now = Date.now();

      if (!forceRefresh && hasLoadedRef.current) return;

      if (forceRefresh && isPublicAccessRestricted && sourceAccessRetrySeconds > 0) {
        return;
      }

      if (
        forceRefresh &&
        now - lastForceRefreshRef.current <
          UI_CONFIG.rateLimitCooldownSeconds * 1000
      ) {
        return;
      }

      if (forceRefresh) {
        lastForceRefreshRef.current = now;
      }

      abortControllerRef.current?.abort();
      abortControllerRef.current = new AbortController();

      setIsLoading(true);
      setPhase('core');
      setError(null);
      setLoadingMessage(LOADING_MESSAGES.core);

      try {
        const result = await openF1Service.fetchCoreSnapshot(2026, {
          forceRefresh,
          onProgress: (message) => setLoadingMessage(message),
        });

        if (abortControllerRef.current?.signal.aborted) return;

        if (result.data) {
          const enriched = enrichSnapshot(result.data);

          setData(enriched);
          setLastSyncTime(enriched.lastUpdated);
          setIsFromCache(result.fromCache);
          hasLoadedRef.current = true;

          if (!result.error) {
            setError(null);
            setIsPublicAccessRestricted(false);
            setSourceAccessRetrySeconds(0);
            setSourceState(result.fromCache ? 'cached' : 'live');
            setPhase('complete');
            return;
          }

          const appError: AppError = {
            type: result.error.type,
            message: result.error.message,
            retryAfter: result.error.retryAfter,
            canShowCachedData: true,
          };

          setError(appError);

          const accessPaused = activateArchiveAccessPause(
            result.error,
            enriched
          );

          if (!accessPaused) {
            if (result.error.type === 'rate_limited') {
              setSourceState('rate_limited');
              setCooldownSeconds(
                result.error.retryAfter || UI_CONFIG.rateLimitCooldownSeconds
              );
            } else {
              setSourceState(result.fromCache ? 'cached' : 'offline');
            }
          }

          setPhase('complete');
          return;
        }

        if (result.error) {
          const appError: AppError = {
            type: result.error.type,
            message: result.error.message,
            retryAfter: result.error.retryAfter,
            canShowCachedData: Boolean(data),
          };

          setError(appError);

          const accessPaused = activateArchiveAccessPause(result.error, data);

          if (!accessPaused) {
            if (result.error.type === 'rate_limited') {
              setSourceState('rate_limited');
              setCooldownSeconds(
                result.error.retryAfter || UI_CONFIG.rateLimitCooldownSeconds
              );
            } else {
              setSourceState(data ? 'cached' : 'offline');
            }
          }

          setPhase('error');
        }
      } catch (caughtError) {
        const apiError =
          caughtError instanceof OpenF1Error
            ? caughtError
            : OpenF1Error.unknown(caughtError);

        setError({
          type: apiError.type,
          message: apiError.message,
          canShowCachedData: Boolean(data),
        });

        const accessPaused = activateArchiveAccessPause(apiError, data);

        if (!accessPaused) {
          setSourceState(data ? 'cached' : 'error');
        }

        setPhase('error');
      } finally {
        setIsLoading(false);
        setLoadingMessage('');
      }
    },
    [
      activateArchiveAccessPause,
      data,
      enrichSnapshot,
      isPublicAccessRestricted,
      sourceAccessRetrySeconds,
    ]
  );

  const loadAnalyticsArchive = useCallback(async () => {
    if (
      !data ||
      isAnalyticsLoading ||
      (isPublicAccessRestricted && sourceAccessRetrySeconds > 0)
    ) {
      return;
    }

    analyticsAbortControllerRef.current?.abort();
    analyticsAbortControllerRef.current = new AbortController();

    try {
      const cachedMeetings = cacheService.getMeetings<OpenF1Meeting[]>();
      const cachedSessions = cacheService.getSessions<OpenF1Session[]>();

      const meetings =
        cachedMeetings.status === 'valid' && cachedMeetings.data
          ? cachedMeetings.data
          : [];

      const sessions =
        cachedSessions.status === 'valid' && cachedSessions.data
          ? cachedSessions.data
          : [];

      const allCompletedDescriptors =
        openF1Service.buildHistoricalRaceSessionDescriptors(
          meetings,
          sessions
        );

      if (allCompletedDescriptors.length === 0) return;

      const isResume = Boolean(data.analyticsArchive?.hasPendingWork);
      const totalCompletedRaceSessions =
        data.analyticsArchive?.totalCompletedRaceSessions ??
        allCompletedDescriptors.length;

      const descriptorsToProcess = isResume
        ? allCompletedDescriptors.filter((descriptor) => {
            const existingResult = (data.raceResults || []).find(
              (result) => result.meetingKey === descriptor.meetingKey
            );

            const hasVerifiedWinner = Boolean(existingResult?.winner);

            const cachedRace = cacheService.getRaceResult(
              descriptor.raceSessionKey
            );

            const cachedRaceHasVerifiedWinner = Boolean(
              cachedRace.status === 'valid' &&
                Array.isArray(cachedRace.data) &&
                cachedRace.data.some((item) => item.position === 1)
            );

            const isPending = (
              data.analyticsArchive?.pendingDescriptors || []
            ).some((item) => item.meetingKey === descriptor.meetingKey);

            const isSkipped = (
              data.analyticsArchive?.skippedDescriptors || []
            ).some((item) => item.meetingKey === descriptor.meetingKey);

            return (
              (isPending || isSkipped || !hasVerifiedWinner) &&
              !cachedRaceHasVerifiedWinner
            );
          })
        : allCompletedDescriptors;

      if (isResume && descriptorsToProcess.length === 0) {
        setAnalyticsProgress({ current: 0, total: 0, mode: 'resume' });
        return;
      }

      setIsAnalyticsLoading(true);
      setAnalyticsProgress({
        current: 0,
        total: descriptorsToProcess.length,
        mode: isResume ? 'resume' : 'initial',
      });

      const result = await openF1Service.fetchAnalyticsArchive(
        descriptorsToProcess,
        (current, total) =>
          setAnalyticsProgress((previous) =>
            previous
              ? { ...previous, current, total }
              : {
                  current,
                  total,
                  mode: isResume ? 'resume' : 'initial',
                }
          ),
        analyticsAbortControllerRef.current.signal,
        data.allDrivers,
        {
          totalCompletedRaceSessions,
          isResume,
          existingArchiveStatus: data.analyticsArchive,
        }
      );

      setData((previous) => {
        if (!previous) return null;

        const mergedResults = [...previous.raceResults];

        result.results.forEach((archiveResult) => {
          const index = mergedResults.findIndex(
            (existing) => existing.meetingKey === archiveResult.meetingKey
          );

          if (index >= 0) {
            mergedResults[index] = archiveResult;
          } else {
            mergedResults.push(archiveResult);
          }
        });

        const sortedResults = mergedResults.sort(
          (left, right) => left.round - right.round
        );

        const enriched = enrichSnapshot({
          ...previous,
          raceResults: sortedResults,
          analyticsArchive: result.archiveStatus,
          analyticsCoverage: {
            indexedRaceResults:
              result.archiveStatus.successfullyIndexedRaceSessions,
            indexedQualifyingSessions:
              result.archiveStatus.qualifyingSessionsIndexed,
            totalCompletedRaceSessions:
              result.archiveStatus.totalCompletedRaceSessions,
          },
        });

        const updatedRaceWeekends = enriched.raceWeekends.map((weekend) => {
          const matchingResult = sortedResults.find(
            (resultItem) => resultItem.meetingKey === weekend.meetingKey
          );

          return matchingResult?.winner
            ? { ...weekend, raceWinner: matchingResult.winner }
            : weekend;
        });

        return {
          ...enriched,
          raceWeekends: updatedRaceWeekends,
          analyticsArchive: result.archiveStatus,
          analyticsCoverage: {
            indexedRaceResults:
              result.archiveStatus.successfullyIndexedRaceSessions,
            indexedQualifyingSessions:
              result.archiveStatus.qualifyingSessionsIndexed,
            totalCompletedRaceSessions:
              result.archiveStatus.totalCompletedRaceSessions,
          },
        };
      });

      if (result.errors.length > 0) {
        const firstError = result.errors[0];

        setError({
          type: firstError.type,
          message: firstError.message,
          retryAfter: firstError.retryAfter,
          canShowCachedData: true,
        });

        const accessPaused = activateArchiveAccessPause(firstError, data);

        if (!accessPaused && firstError.type === 'rate_limited') {
          setCooldownSeconds(
            firstError.retryAfter || UI_CONFIG.rateLimitCooldownSeconds
          );
          setSourceState('rate_limited');
        }
      }
    } catch (caughtError) {
      const apiError =
        caughtError instanceof OpenF1Error
          ? caughtError
          : OpenF1Error.unknown(caughtError);

      setError({
        type: apiError.type,
        message: apiError.message,
        canShowCachedData: true,
      });

      activateArchiveAccessPause(apiError, data);
    } finally {
      setIsAnalyticsLoading(false);
      setAnalyticsProgress(null);
    }
  }, [
    activateArchiveAccessPause,
    data,
    enrichSnapshot,
    isAnalyticsLoading,
    isPublicAccessRestricted,
    sourceAccessRetrySeconds,
  ]);

  const refreshData = useCallback(
    async (force: boolean = false) => {
      await fetchCoreData(force);
    },
    [fetchCoreData]
  );

  const clearError = useCallback(() => {
    setError(null);

    if (
      sourceState === 'error' ||
      sourceState === 'rate_limited' ||
      sourceState === 'offline'
    ) {
      setSourceState(data ? (isFromCache ? 'cached' : 'live') : 'loading');
    }
  }, [data, isFromCache, sourceState]);

  useEffect(() => {
    if (!hasLoadedRef.current) {
      fetchCoreData(false);
    }
  }, [fetchCoreData]);

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
    isPublicAccessRestricted,
    sourceAccessRetrySeconds,
    analyticsProgress,
    loadingMessage,
    refreshData,
    loadAnalyticsArchive,
    clearError,
  };
}
