/**
 * Cache Service
 *
 * Versioned localStorage cache with expiry validation.
 * All successful API responses are cached with a version envelope.
 */

import { CACHE_CONFIG } from '../config/dataConfig';

// ============================================================================
// Cache Types
// ============================================================================

const MAP_MARKER = '__apex26_map__';

interface CacheEnvelope<T> {
  /** Cache schema version */
  version: number;
  /** When the cache was created (ISO string) */
  createdAt: string;
  /** When the cache expires (ISO string) */
  expiresAt: string;
  /** Data source identifier */
  source: 'openf1' | 'unknown';
  /** The cached payload */
  payload: T;
}

type CacheStatus = 'valid' | 'expired' | 'corrupted' | 'not_found' | 'version_mismatch';

interface CacheResult<T> {
  status: CacheStatus;
  data: T | null;
  createdAt: string | null;
  isExpired: boolean;
}

// ============================================================================
// Cache Operations
// ============================================================================

/**
 * Check if localStorage is available
 */
function isStorageAvailable(): boolean {
  try {
    const testKey = '__apex_cache_test__';
    localStorage.setItem(testKey, 'test');
    localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

/**
 * Parse and validate a cache entry
 */
function mapReplacer(_key: string, value: unknown): unknown {
  if (value instanceof Map) {
    return { [MAP_MARKER]: Array.from(value.entries()) };
  }
  return value;
}

function mapReviver(_key: string, value: unknown): unknown {
  if (
    value &&
    typeof value === 'object' &&
    value !== null &&
    MAP_MARKER in value &&
    Array.isArray((value as Record<string, unknown>)[MAP_MARKER])
  ) {
    return new Map((value as Record<string, unknown>)[MAP_MARKER] as Array<[unknown, unknown]>);
  }
  return value;
}

function parseCacheEntry<T>(raw: string | null): CacheResult<T> {
  if (!raw) {
    return {
      status: 'not_found',
      data: null,
      createdAt: null,
      isExpired: true,
    };
  }

  try {
    const envelope = JSON.parse(raw, mapReviver) as CacheEnvelope<T>;

    // Check version
    if (envelope.version !== CACHE_CONFIG.version) {
      return {
        status: 'version_mismatch',
        data: null,
        createdAt: envelope.createdAt,
        isExpired: true,
      };
    }

    // Check expiry
    const expiresAt = new Date(envelope.expiresAt);
    const isExpired = expiresAt < new Date();

    return {
      status: isExpired ? 'expired' : 'valid',
      data: envelope.payload,
      createdAt: envelope.createdAt,
      isExpired,
    };
  } catch {
    return {
      status: 'corrupted',
      data: null,
      createdAt: null,
      isExpired: true,
    };
  }
}

/**
 * Create a cache envelope
 */
function createEnvelope<T>(
  payload: T,
  lifetimeMs: number,
  source: 'openf1' = 'openf1'
): CacheEnvelope<T> {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + lifetimeMs);

  return {
    version: CACHE_CONFIG.version,
    createdAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
    source,
    payload,
  };
}

// ============================================================================
// Public Cache API
// ============================================================================

export const cacheService = {
  /**
   * Check if localStorage is available
   */
  isAvailable: isStorageAvailable,

  /**
   * Get a cached value
   */
  get<T>(key: string): CacheResult<T> {
    if (!isStorageAvailable()) {
      return {
        status: 'not_found',
        data: null,
        createdAt: null,
        isExpired: true,
      };
    }

    try {
      const raw = localStorage.getItem(key);
      return parseCacheEntry<T>(raw);
    } catch {
      return {
        status: 'corrupted',
        data: null,
        createdAt: null,
        isExpired: true,
      };
    }
  },

  /**
   * Set a cached value with automatic expiry
   */
  set<T>(
    key: string,
    payload: T,
    lifetimeMs: number = CACHE_CONFIG.coreSnapshotLifetime,
    source: 'openf1' = 'openf1'
  ): boolean {
    if (!isStorageAvailable()) {
      return false;
    }

    try {
      const envelope = createEnvelope(payload, lifetimeMs, source);
      localStorage.setItem(key, JSON.stringify(envelope, mapReplacer));
      return true;
    } catch {
      // Storage might be full
      return false;
    }
  },

  /**
   * Remove a cached value
   */
  remove(key: string): void {
    if (!isStorageAvailable()) return;

    try {
      localStorage.removeItem(key);
    } catch {
      // Ignore errors
    }
  },

  /**
   * Clear all APEX cache keys
   */
  clearAll(): void {
    if (!isStorageAvailable()) return;

    try {
      // Clear all known cache keys
      Object.values(CACHE_CONFIG.keys).forEach((key) => {
        if (typeof key === 'string') {
          localStorage.removeItem(key);
        }
      });

      // Also clear any keys matching the pattern
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('apex26_')) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach((key) => localStorage.removeItem(key));
    } catch {
      // Ignore errors
    }
  },

  /**
   * Get core snapshot cache
   */
  getCoreSnapshot<T>(): CacheResult<T> {
    return this.get<T>(CACHE_CONFIG.keys.coreSnapshot);
  },

  /**
   * Set core snapshot cache
   */
  setCoreSnapshot<T>(payload: T): boolean {
    return this.set(
      CACHE_CONFIG.keys.coreSnapshot,
      payload,
      CACHE_CONFIG.coreSnapshotLifetime
    );
  },

  /**
   * Get meetings cache
   */
  getMeetings<T>(): CacheResult<T> {
    return this.get<T>(CACHE_CONFIG.keys.meetings);
  },

  /**
   * Set meetings cache
   */
  setMeetings<T>(payload: T): boolean {
    return this.set(
      CACHE_CONFIG.keys.meetings,
      payload,
      CACHE_CONFIG.rawDataLifetime
    );
  },

  /**
   * Get sessions cache
   */
  getSessions<T>(): CacheResult<T> {
    return this.get<T>(CACHE_CONFIG.keys.sessions);
  },

  /**
   * Set sessions cache
   */
  setSessions<T>(payload: T): boolean {
    return this.set(
      CACHE_CONFIG.keys.sessions,
      payload,
      CACHE_CONFIG.rawDataLifetime
    );
  },

  /**
   * Get race result cache for a specific session
   */
  getRaceResult<T>(sessionKey: number): CacheResult<T> {
    return this.get<T>(CACHE_CONFIG.keys.raceResult(sessionKey));
  },

  /**
   * Set race result cache for a specific session
   */
  setRaceResult<T>(sessionKey: number, payload: T): boolean {
    return this.set(
      CACHE_CONFIG.keys.raceResult(sessionKey),
      payload,
      CACHE_CONFIG.rawDataLifetime
    );
  },

  /**
   * Get qualifying result cache for a specific session
   */
  getQualifyingResult<T>(sessionKey: number): CacheResult<T> {
    return this.get<T>(CACHE_CONFIG.keys.qualifyingResult(sessionKey));
  },

  /**
   * Set qualifying result cache for a specific session
   */
  setQualifyingResult<T>(sessionKey: number, payload: T): boolean {
    return this.set(
      CACHE_CONFIG.keys.qualifyingResult(sessionKey),
      payload,
      CACHE_CONFIG.rawDataLifetime
    );
  },

  /**
   * Get rate limit cooldown end time
   */
  getRateLimitCooldown(): number | null {
    if (!isStorageAvailable()) return null;

    try {
      const value = localStorage.getItem(CACHE_CONFIG.keys.rateLimitCooldown);
      if (!value) return null;

      const cooldownEnd = parseInt(value, 10);
      if (cooldownEnd > Date.now()) {
        return cooldownEnd;
      }
      return null;
    } catch {
      return null;
    }
  },

  /**
   * Set rate limit cooldown
   */
  setRateLimitCooldown(cooldownEnd: number): void {
    if (!isStorageAvailable()) return;

    try {
      localStorage.setItem(CACHE_CONFIG.keys.rateLimitCooldown, String(cooldownEnd));
    } catch {
      // Ignore
    }
  },
};

// Export types for use in other modules
export type { CacheEnvelope, CacheStatus, CacheResult };
