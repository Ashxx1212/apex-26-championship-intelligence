/**
 * Formatting utilities for displaying motorsport data
 */

/**
 * Format a position with ordinal suffix (1st, 2nd, 3rd, 4th, etc.)
 */
export function formatPosition(position: number | null | undefined): string {
  if (position === null || position === undefined) return '—';

  const ordinals = ['th', 'st', 'nd', 'rd'];
  const remainder = position % 100;

  // Special case for 11th, 12th, 13th
  if (remainder >= 11 && remainder <= 13) {
    return `${position}th`;
  }

  const ordinal = ordinals[remainder % 10] || 'th';
  return `${position}${ordinal}`;
}

/**
 * Format points gap with a plus sign
 */
export function formatPointsGap(gap: number | null | undefined): string {
  if (gap === null || gap === undefined) return '—';
  if (gap === 0) return '0';
  return `+${gap}`;
}

/**
 * Format points value
 */
export function formatPoints(points: number | null | undefined): string {
  if (points === null || points === undefined) return '—';
  return String(points);
}

/**
 * Format time in MM:SS.mmm format
 */
export function formatLapTime(time: string | null | undefined): string {
  if (!time) return '—';
  return time;
}

/**
 * Format a timestamp for display
 */
export function formatTimestamp(timestamp: string | null | undefined): string {
  if (!timestamp) return '—';
  const date = new Date(timestamp);
  return date.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Format a short timestamp (time only)
 */
export function formatTime(timestamp: string | null | undefined): string {
  if (!timestamp) return '—';
  const date = new Date(timestamp);
  return date.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Format a date range
 */
export function formatDateRange(start: string, end: string): string {
  const startDate = new Date(start);
  const endDate = new Date(end);

  const startDay = startDate.getDate();
  const endDay = endDate.getDate();
  const month = endDate.toLocaleString('en-GB', { month: 'short' });
  const year = endDate.getFullYear();

  if (startDate.getMonth() === endDate.getMonth()) {
    return `${startDay}–${endDay} ${month} ${year}`;
  }

  return `${startDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} – ${endDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} ${year}`;
}

/**
 * Format circuit type for display
 */
export function formatCircuitType(type: string | null | undefined): string {
  if (!type) return 'Circuit';

  const typeMap: Record<string, string> = {
    street: 'Street Circuit',
    permanent: 'Permanent',
    semi_permanent: 'Semi-Permanent',
    road: 'Road Course',
  };

  return typeMap[type.toLowerCase()] || type;
}

/**
 * Format a round number with leading zero
 */
export function formatRound(round: number | null | undefined): string {
  if (round === null || round === undefined) return '—';
  return String(round).padStart(2, '0');
}

/**
 * Format percentage
 */
export function formatPercentage(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—';
  return `${Math.round(value)}%`;
}

/**
 * Format a telemetry value (with units)
 */
export function formatTelemetryValue(
  value: number | null | undefined,
  unit: string
): string {
  if (value === null || value === undefined) return `— ${unit}`;
  return `${value} ${unit}`;
}

/**
 * Truncate text with ellipsis
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 1) + '…';
}

/**
 * Format driver name for compact display
 */
export function formatDriverName(
  firstName: string,
  lastName: string,
  maxLength: number = 20
): string {
  const fullName = `${firstName} ${lastName}`;
  return truncateText(fullName, maxLength);
}

/**
 * Format team name (remove common suffixes)
 */
export function formatTeamName(teamName: string): string {
  // Remove common F1 team suffixes
  return teamName
    .replace(/ F1 Team$/i, '')
    .replace(/ F1$/i, '')
    .replace(/ Racing$/i, '')
    .trim();
}

/**
 * Format cooldown remaining time
 */
export function formatCooldownRemaining(seconds: number): string {
  if (seconds <= 0) return '';
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.ceil(seconds / 60);
  return `${minutes}m`;
}
