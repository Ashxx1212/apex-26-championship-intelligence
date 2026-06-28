/**
 * OpenF1 API Client
 *
 * A robust, rate-limited client for the OpenF1 public API.
 * Implements a serial request queue to prevent HTTP 429 errors.
 */

import { OPENF1_CONFIG, CACHE_CONFIG } from '../config/dataConfig';
import { ERROR_MESSAGES } from '../config/dataConfig';

// ============================================================================
// Typed Errors
// ============================================================================

export type OpenF1ErrorType =
  | 'rate_limited'
  | 'network_unavailable'
  | 'api_unavailable'
  | 'invalid_response'
  | 'timeout'
  | 'no_data'
  | 'unknown';

export class OpenF1Error extends Error {
  constructor(
    public type: OpenF1ErrorType,
    message: string,
    public retryAfter?: number
  ) {
    super(message);
    this.name = 'OpenF1Error';
  }

  static rateLimited(retryAfter?: number): OpenF1Error {
    return new OpenF1Error(
      'rate_limited',
      ERROR_MESSAGES.rateLimited,
      retryAfter
    );
  }

  static networkUnavailable(): OpenF1Error {
    return new OpenF1Error('network_unavailable', ERROR_MESSAGES.networkUnavailable);
  }

  static apiUnavailable(status: number): OpenF1Error {
    return new OpenF1Error(
      'api_unavailable',
      `OpenF1 API returned status ${status}. ${ERROR_MESSAGES.apiUnavailable}`
    );
  }

  static invalidResponse(): OpenF1Error {
    return new OpenF1Error('invalid_response', ERROR_MESSAGES.invalidResponse);
  }

  static timeout(): OpenF1Error {
    return new OpenF1Error('timeout', ERROR_MESSAGES.timeout);
  }

  static noData(): OpenF1Error {
    return new OpenF1Error('no_data', ERROR_MESSAGES.noData);
  }

  static unknown(cause?: unknown): OpenF1Error {
    const message =
      cause instanceof Error ? cause.message : ERROR_MESSAGES.unknown;
    return new OpenF1Error('unknown', message);
  }
}

// ============================================================================
// Request Queue
// ============================================================================

interface QueuedRequest<T> {
  execute: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (error: OpenF1Error) => void;
  endpoint: string;
}

/**
 * Singleton request queue that ensures serial, rate-limited API calls.
 * Only one request runs at a time with minimum interval between requests.
 */
class RequestQueue {
  private queue: QueuedRequest<unknown>[] = [];
  private isProcessing = false;
  private lastRequestTime = 0;
  private cooldownUntil = 0;
  private inFlightRequests = new Map<string, Promise<unknown>>();

  /**
   * Check if we're currently in a rate-limit cooldown period
   */
  isInCooldown(): boolean {
    return Date.now() < this.cooldownUntil;
  }

  /**
   * Get remaining cooldown time in seconds
   */
  getCooldownRemaining(): number {
    if (!this.isInCooldown()) return 0;
    return Math.ceil((this.cooldownUntil - Date.now()) / 1000);
  }

  /**
   * Set cooldown period after rate limit
   */
  setCooldown(seconds: number): void {
    this.cooldownUntil = Date.now() + seconds * 1000;
    // Also persist to localStorage for cross-session awareness
    try {
      localStorage.setItem(
        CACHE_CONFIG.keys.rateLimitCooldown,
        String(this.cooldownUntil)
      );
    } catch {
      // Ignore localStorage errors
    }
  }

  /**
   * Check if an identical request is already in flight
   */
  hasInFlight(endpoint: string): boolean {
    return this.inFlightRequests.has(endpoint);
  }

  /**
   * Get or create a single-flight promise for an endpoint
   */
  async singleFlight<T>(endpoint: string, executor: () => Promise<T>): Promise<T> {
    // Check for existing in-flight request
    const existing = this.inFlightRequests.get(endpoint);
    if (existing) {
      return existing as Promise<T>;
    }

    // Create new request
    const promise = this.enqueue(endpoint, executor);
    this.inFlightRequests.set(endpoint, promise);

    try {
      const result = await promise;
      return result;
    } finally {
      this.inFlightRequests.delete(endpoint);
    }
  }

  /**
   * Enqueue a request to be processed serially
   */
  enqueue<T>(endpoint: string, execute: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.queue.push({
        execute: execute as () => Promise<unknown>,
        resolve: resolve as (value: unknown) => void,
        reject: reject as (error: OpenF1Error) => void,
        endpoint,
      });
      this.processQueue();
    });
  }

  /**
   * Process the queue one item at a time with rate limiting
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.queue.length === 0) {
      return;
    }

    this.isProcessing = true;

    while (this.queue.length > 0) {
      // Wait for cooldown if active
      if (this.isInCooldown()) {
        const waitTime = this.cooldownUntil - Date.now();
        await this.delay(waitTime);
      }

      const request = this.queue.shift();
      if (!request) break;

      // Ensure minimum interval between requests
      const elapsed = Date.now() - this.lastRequestTime;
      const waitTime = Math.max(0, OPENF1_CONFIG.minRequestInterval - elapsed);
      if (waitTime > 0) {
        await this.delay(waitTime);
      }

      try {
        this.lastRequestTime = Date.now();
        const result = await request.execute();
        request.resolve(result);
      } catch (error) {
        request.reject(
          error instanceof OpenF1Error ? error : OpenF1Error.unknown(error)
        );
      }
    }

    this.isProcessing = false;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// Singleton queue instance
const requestQueue = new RequestQueue();

// ============================================================================
// OpenF1 Client
// ============================================================================

interface RequestOptions {
  /** Maximum retries for this specific request */
  maxRetries?: number;
  /** Skip the request queue (use carefully) */
  skipQueue?: boolean;
}

/**
 * Generic fetch wrapper with timeout and error handling
 */
async function fetchWithTimeout<T>(
  url: string,
  timeoutMs: number
): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
      },
    });

    clearTimeout(timeoutId);

    if (response.status === 429) {
      const retryAfter = response.headers.get('Retry-After');
      const retrySeconds = retryAfter ? parseInt(retryAfter, 10) : undefined;
      throw OpenF1Error.rateLimited(retrySeconds);
    }

    if (response.status === 404) {
      // Return empty array for 404s (no data available)
      return [] as unknown as T;
    }

    if (!response.ok) {
      throw OpenF1Error.apiUnavailable(response.status);
    }

    const data = await response.json();
    return data as T;
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof OpenF1Error) {
      throw error;
    }

    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw OpenF1Error.timeout();
      }
      if (error.message.includes('fetch')) {
        throw OpenF1Error.networkUnavailable();
      }
    }

    throw OpenF1Error.unknown(error);
  }
}

/**
 * Execute a request with retry logic and rate limiting
 */
async function executeRequest<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const { maxRetries = OPENF1_CONFIG.maxRetries, skipQueue = false } = options;
  const url = `${OPENF1_CONFIG.baseUrl}${endpoint}`;

  const execute = async (retryCount = 0): Promise<T> => {
    try {
      // Check cooldown before request
      if (requestQueue.isInCooldown()) {
        const remaining = requestQueue.getCooldownRemaining();
        throw OpenF1Error.rateLimited(remaining);
      }

      return await fetchWithTimeout<T>(url, OPENF1_CONFIG.timeout);
    } catch (error) {
      if (error instanceof OpenF1Error && error.type === 'rate_limited') {
        // Set cooldown
        const cooldownSeconds = error.retryAfter || 30;
        requestQueue.setCooldown(cooldownSeconds);

        // Retry with exponential backoff
        if (retryCount < maxRetries) {
          const delay = OPENF1_CONFIG.retryDelays[retryCount] || 16000;
          await new Promise((resolve) => setTimeout(resolve, delay));
          return execute(retryCount + 1);
        }
      }

      throw error;
    }
  };

  // Use queue unless explicitly skipped
  if (skipQueue) {
    return execute();
  }

  return requestQueue.singleFlight(endpoint, execute);
}

// ============================================================================
// Public API
// ============================================================================

export const openF1Client = {
  /**
   * Check if the client is in a rate-limit cooldown period
   */
  isInCooldown(): boolean {
    return requestQueue.isInCooldown();
  },

  /**
   * Get remaining cooldown time in seconds
   */
  getCooldownRemaining(): number {
    return requestQueue.getCooldownRemaining();
  },

  /**
   * Fetch meetings for a specific year
   */
  async getMeetings(year: number): Promise<unknown[]> {
    return executeRequest<unknown[]>(`/meetings?year=${year}`);
  },

  /**
   * Fetch sessions for a specific year
   */
  async getSessions(year: number): Promise<unknown[]> {
    return executeRequest<unknown[]>(`/sessions?year=${year}`);
  },

  /**
   * Fetch drivers for a specific session
   */
  async getDrivers(sessionKey: number): Promise<unknown[]> {
    return executeRequest<unknown[]>(`/drivers?session_key=${sessionKey}`);
  },

  /**
   * Fetch session results
   */
  async getSessionResults(sessionKey: number): Promise<unknown[]> {
    return executeRequest<unknown[]>(`/session_result?session_key=${sessionKey}`);
  },

  /**
   * Fetch driver championship standings
   */
  async getChampionshipDrivers(sessionKey: number): Promise<unknown[]> {
    return executeRequest<unknown[]>(
      `/championship_drivers?session_key=${sessionKey}`
    );
  },

  /**
   * Fetch team championship standings
   */
  async getChampionshipTeams(sessionKey: number): Promise<unknown[]> {
    return executeRequest<unknown[]>(
      `/championship_teams?session_key=${sessionKey}`
    );
  },

  /**
   * Generic endpoint request (for flexibility)
   */
  async get<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    return executeRequest<T>(endpoint, options);
  },

  /**
   * Request for historical analytics (uses longer interval)
   * This should be called separately and intentionally
   */
  async getHistorical(sessionKey: number, type: 'race' | 'qualifying'): Promise<unknown[]> {
    // Add extra delay for historical requests
    await new Promise((resolve) =>
      setTimeout(resolve, OPENF1_CONFIG.analyticsRequestInterval)
    );

    if (type === 'race') {
      return this.getSessionResults(sessionKey);
    } else {
      return this.getSessionResults(sessionKey);
    }
  },
};

// Re-export the queue for testing purposes
export { requestQueue };
