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
  | 'public_access_restricted'
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

  static publicAccessRestricted(): OpenF1Error {
    return new OpenF1Error(
      'public_access_restricted',
      'LIVE SESSION ACCESS RESTRICTED. OpenF1 has temporarily paused public data access while a live Formula 1 session is active.'
    );
  }

  static networkUnavailable(): OpenF1Error {
    return new OpenF1Error(
      'network_unavailable',
      ERROR_MESSAGES.networkUnavailable
    );
  }

  static apiUnavailable(status: number): OpenF1Error {
    return new OpenF1Error(
      'api_unavailable',
      `OpenF1 API returned status ${status}. ${ERROR_MESSAGES.apiUnavailable}`
    );
  }

  static invalidResponse(): OpenF1Error {
    return new OpenF1Error(
      'invalid_response',
      ERROR_MESSAGES.invalidResponse
    );
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

export function isOpenF1PublicAccessRestriction(error: unknown): boolean {
  if (
    error instanceof OpenF1Error &&
    error.type === 'public_access_restricted'
  ) {
    return true;
  }

  const message = error instanceof Error ? error.message.toLowerCase() : '';

  return (
    message.includes('live session access restricted') ||
    message.includes('public access restricted') ||
    message.includes('public data access') ||
    message.includes('authenticated users') ||
    message.includes('live formula 1 session')
  );
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

  isInCooldown(): boolean {
    return Date.now() < this.cooldownUntil;
  }

  getCooldownRemaining(): number {
    if (!this.isInCooldown()) return 0;
    return Math.ceil((this.cooldownUntil - Date.now()) / 1000);
  }

  setCooldown(seconds: number): void {
    this.cooldownUntil = Date.now() + seconds * 1000;

    try {
      localStorage.setItem(
        CACHE_CONFIG.keys.rateLimitCooldown,
        String(this.cooldownUntil)
      );
    } catch {
      // Ignore localStorage errors.
    }
  }

  hasInFlight(endpoint: string): boolean {
    return this.inFlightRequests.has(endpoint);
  }

  async singleFlight<T>(
    endpoint: string,
    executor: () => Promise<T>
  ): Promise<T> {
    const existing = this.inFlightRequests.get(endpoint);

    if (existing) {
      return existing as Promise<T>;
    }

    const promise = this.enqueue(endpoint, executor);
    this.inFlightRequests.set(endpoint, promise);

    try {
      return await promise;
    } finally {
      this.inFlightRequests.delete(endpoint);
    }
  }

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

  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.queue.length === 0) {
      return;
    }

    this.isProcessing = true;

    while (this.queue.length > 0) {
      if (this.isInCooldown()) {
        await this.delay(this.cooldownUntil - Date.now());
      }

      const request = this.queue.shift();
      if (!request) break;

      const elapsed = Date.now() - this.lastRequestTime;
      const waitTime = Math.max(
        0,
        OPENF1_CONFIG.minRequestInterval - elapsed
      );

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

const requestQueue = new RequestQueue();

// ============================================================================
// OpenF1 Client
// ============================================================================

interface RequestOptions {
  maxRetries?: number;
  skipQueue?: boolean;
}

function responseIndicatesPublicRestriction(
  status: number,
  body: string
): boolean {
  const message = body.toLowerCase();

  return (
    [401, 403, 451].includes(status) &&
    (
      message.includes('live session') ||
      message.includes('public access') ||
      message.includes('authenticated users') ||
      message.includes('authentication required')
    )
  );
}

async function fetchWithTimeout<T>(url: string, timeoutMs: number): Promise<T> {
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
      return [] as unknown as T;
    }

    const responseText = await response.text();

    if (responseIndicatesPublicRestriction(response.status, responseText)) {
      throw OpenF1Error.publicAccessRestricted();
    }

    if (!response.ok) {
      throw OpenF1Error.apiUnavailable(response.status);
    }

    try {
      return responseText ? (JSON.parse(responseText) as T) : ([] as T);
    } catch {
      if (
        responseText.toLowerCase().includes('live session') ||
        responseText.toLowerCase().includes('public access') ||
        responseText.toLowerCase().includes('authenticated users')
      ) {
        throw OpenF1Error.publicAccessRestricted();
      }

      throw OpenF1Error.invalidResponse();
    }
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

async function executeRequest<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const {
    maxRetries = OPENF1_CONFIG.maxRetries,
    skipQueue = false,
  } = options;

  const url = `${OPENF1_CONFIG.baseUrl}${endpoint}`;

  const execute = async (retryCount = 0): Promise<T> => {
    try {
      if (requestQueue.isInCooldown()) {
        throw OpenF1Error.rateLimited(
          requestQueue.getCooldownRemaining()
        );
      }

      return await fetchWithTimeout<T>(url, OPENF1_CONFIG.timeout);
    } catch (error) {
      if (error instanceof OpenF1Error && error.type === 'rate_limited') {
        const cooldownSeconds = error.retryAfter || 30;
        requestQueue.setCooldown(cooldownSeconds);

        if (retryCount < maxRetries) {
          const delay =
            OPENF1_CONFIG.retryDelays[retryCount] || 16000;
          await new Promise((resolve) => setTimeout(resolve, delay));
          return execute(retryCount + 1);
        }
      }

      throw error;
    }
  };

  if (skipQueue) {
    return execute();
  }

  return requestQueue.singleFlight(endpoint, execute);
}

// ============================================================================
// Public API
// ============================================================================

export const openF1Client = {
  isInCooldown(): boolean {
    return requestQueue.isInCooldown();
  },

  getCooldownRemaining(): number {
    return requestQueue.getCooldownRemaining();
  },

  async getMeetings(year: number): Promise<unknown[]> {
    return executeRequest<unknown[]>(`/meetings?year=${year}`);
  },

  async getSessions(year: number): Promise<unknown[]> {
    return executeRequest<unknown[]>(`/sessions?year=${year}`);
  },

  async getDrivers(sessionKey: number): Promise<unknown[]> {
    return executeRequest<unknown[]>(`/drivers?session_key=${sessionKey}`);
  },

  async getSessionResults(sessionKey: number): Promise<unknown[]> {
    return executeRequest<unknown[]>(
      `/session_result?session_key=${sessionKey}`
    );
  },

  async getChampionshipDrivers(sessionKey: number): Promise<unknown[]> {
    return executeRequest<unknown[]>(
      `/championship_drivers?session_key=${sessionKey}`
    );
  },

  async getChampionshipTeams(sessionKey: number): Promise<unknown[]> {
    return executeRequest<unknown[]>(
      `/championship_teams?session_key=${sessionKey}`
    );
  },

  async get<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    return executeRequest<T>(endpoint, options);
  },

  async getHistorical(
    sessionKey: number,
    type: 'race' | 'qualifying'
  ): Promise<unknown[]> {
    await new Promise((resolve) =>
      setTimeout(resolve, OPENF1_CONFIG.analyticsRequestInterval)
    );

    if (type === 'race') {
      return this.getSessionResults(sessionKey);
    }

    return this.getSessionResults(sessionKey);
  },
};

export { requestQueue };
