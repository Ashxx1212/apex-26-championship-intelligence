/**
 * Application-level types
 * Types for app state, data loading, and UI
 */

import type { OpenF1ErrorType } from '../services/openF1Client';

/**
 * Data source state
 */
export type DataSourceState = 'loading' | 'live' | 'cached' | 'rate_limited' | 'offline' | 'error';

/**
 * Data loading phase
 */
export type DataLoadingPhase = 'idle' | 'core' | 'analytics' | 'complete' | 'error';

/**
 * Application data state
 */
export interface AppDataState {
  /** Current loading phase */
  phase: DataLoadingPhase;
  /** Is data currently being fetched */
  isLoading: boolean;
  /** Human-readable loading message */
  loadingMessage: string;
  /** Any error that occurred */
  error: AppError | null;
  /** Data source state */
  sourceState: DataSourceState;
  /** Whether data is from cache */
  isFromCache: boolean;
  /** Timestamp of last successful sync */
  lastSyncTime: string | null;
  /** Is analytics archive being loaded */
  isAnalyticsLoading: boolean;
  /** Progress of analytics loading */
  analyticsProgress: { current: number; total: number } | null;
}

/**
 * Application error type
 */
export interface AppError {
  type: OpenF1ErrorType | 'unknown';
  message: string;
  /** For rate limits, seconds until cooldown ends */
  retryAfter?: number;
  /** Whether this error allows showing cached data */
  canShowCachedData: boolean;
}

/**
 * Create an AppError from various sources
 */
export function createAppError(
  type: OpenF1ErrorType,
  message: string,
  retryAfter?: number
): AppError {
  const canShowCachedData = type === 'rate_limited' || type === 'network_unavailable' || type === 'api_unavailable';
  return { type, message, retryAfter, canShowCachedData };
}

/**
 * Analytics archive status
 */
export interface LegacyAnalyticsArchiveStatus {
  /** Total completed races to process */
  totalRounds: number;
  /** Number of rounds successfully processed */
  processedRounds: number;
  /** Currently processing round number */
  currentRound: number | null;
  /** Session keys for each round */
  roundsBySessionKey: Map<number, number>;
  /** Whether the archive is complete */
  isComplete: boolean;
  /** Whether an error occurred during processing */
  hasError: boolean;
  /** Error message if applicable */
  errorMessage: string | null;
}

/**
 * Data sync result
 */
export interface DataSyncResult<T> {
  success: boolean;
  data: T | null;
  error: AppError | null;
  fromCache: boolean;
  timestamp: string;
}

/**
 * Data refresh options
 */
export interface DataRefreshOptions {
  /** Force bypass of cache */
  forceRefresh: boolean;
  /** Include analytics archive loading */
  includeAnalytics: boolean;
}

/**
 * Notification for locked modules
 */
export interface ModuleNotification {
  moduleLabel: string;
  message: string;
  timestamp: number;
}

