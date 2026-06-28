/**
 * APEX 26 Application Configuration
 * Central configuration for the motorsport analytics platform
 */

export const APP_CONFIG = {
  name: 'APEX 26',
  version: '1.0.0',
  description: 'Championship Intelligence',
  year: 2026,
} as const;

export const UI_CONFIG = {
  /** Cache duration displayed to users in minutes */
  cacheDisplayDuration: 30,
  /** Cooldown after rate limit in seconds */
  rateLimitCooldownSeconds: 30,
  /** Maximum retries for API calls */
  maxRetries: 3,
  /** Animation durations in ms */
  animations: {
    bootTransition: 1200,
    fadeTransition: 500,
  },
} as const;

export const NAVIGATION_ITEMS = [
  { id: 'command', label: 'COMMAND CENTRE', locked: false },
  { id: 'championship', label: 'CHAMPIONSHIP', locked: false },
  { id: 'driver-intel', label: 'DRIVER INTEL', locked: true },
  { id: 'team', label: 'TEAM PERFORMANCE', locked: true },
  { id: 'circuit', label: 'CIRCUIT MATRIX', locked: true },
  { id: 'scenario', label: 'SCENARIO LAB', locked: true },
  { id: 'notes', label: 'MODEL NOTES', locked: true },
] as const;

export const DISCLAIMER_TEXT =
  'Unofficial motorsport analytics portfolio project. Not affiliated with Formula 1, FIA, or any racing team.';
