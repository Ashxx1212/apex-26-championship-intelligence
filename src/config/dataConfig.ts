/**
 * APEX 26 Data Configuration
 * Settings for OpenF1 API integration and caching
 */

/**
 * OpenF1 API Configuration
 * Base URL loaded from environment, defaults to public API
 */
export const OPENF1_CONFIG = {
  get baseUrl(): string {
    return (
      import.meta.env.VITE_OPENF1_BASE_URL || 'https://api.openf1.org/v1'
    );
  },
  /** Request timeout in milliseconds */
  timeout: 12000,
  /** Minimum delay between requests in milliseconds */
  minRequestInterval: 1200,
  /** Delay for historical analytics requests in milliseconds */
  analyticsRequestInterval: 2500,
  /** Session must have ended this many minutes ago to be considered completed */
  sessionCompletionBufferMinutes: 15,
  /** Retry delays in milliseconds (exponential backoff) */
  retryDelays: [4000, 8000, 16000] as const,
  /** Maximum retries for rate-limited requests */
  maxRetries: 3,
} as const;

/**
 * Cache Configuration
 * Versioned localStorage cache keys and durations
 */
export const CACHE_CONFIG = {
  version: 2,
  /** Core snapshot cache lifetime in milliseconds (30 minutes) */
  coreSnapshotLifetime: 30 * 60 * 1000,
  /** Raw data cache lifetime in milliseconds (60 minutes) */
  rawDataLifetime: 60 * 60 * 1000,
  keys: {
    coreSnapshot: 'apex26_core_snapshot_2026',
    meetings: 'apex26_meetings_2026',
    sessions: 'apex26_sessions_2026',
    driverStandings: 'apex26_driver_standings_2026',
    teamStandings: 'apex26_team_standings_2026',
    driversLatest: 'apex26_drivers_latest',
    raceResult: (sessionKey: number) => `apex26_race_result_${sessionKey}`,
    qualifyingResult: (sessionKey: number) =>
      `apex26_qualifying_result_${sessionKey}`,
    analyticsArchive: 'apex26_analytics_archive_2026',
    rateLimitCooldown: 'apex26_rate_limit_cooldown',
  },
} as const;

/**
 * Data status labels for UI display
 */
export const DATA_STATUS_LABELS = {
  loading: 'SYNCING VERIFIED DATA...',
  live: 'DATA CORE: VERIFIED',
  cached: 'DATA CORE: CACHED VERIFIED SNAPSHOT',
  rateLimited: 'DATA LINK DEGRADED',
  offline: 'DATA CORE OFFLINE',
  source: 'OpenF1',
} as const;

/**
 * Error messages for different failure scenarios
 */
export const ERROR_MESSAGES = {
  rateLimited:
    'OpenF1 request limit reached. Wait briefly before retrying the live data link.',
  networkUnavailable: 'Network unavailable. Check your connection.',
  apiUnavailable: 'OpenF1 API is currently unavailable.',
  invalidResponse: 'Invalid API response received.',
  timeout: 'Request timed out. Please try again.',
  noData: 'No completed 2026 race data available yet.',
  unknown: 'An unexpected error occurred.',
} as const;
