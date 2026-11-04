/**
 * The "Hoy" view decides what "today" is in this zone, not in UTC (the Vercel default)
 * and not in whatever zone the device happens to be in.
 */
export const APP_TIME_ZONE = 'America/Bogota';

/** Calendar day (`YYYY-MM-DD`) of a timestamp in `APP_TIME_ZONE`. Keys compare as strings. */
export function dayKey(timestamp: number, timeZone: string = APP_TIME_ZONE): string {
  // The en-CA locale formats dates as YYYY-MM-DD.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(timestamp);
}

/** "miércoles 4 de noviembre", in Spanish, for the calendar day of `timestamp`. */
export function formatLongDay(timestamp: number, timeZone: string = APP_TIME_ZONE): string {
  const parts = new Intl.DateTimeFormat('es', {
    timeZone,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).formatToParts(timestamp);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? '';
  return `${part('weekday')} ${part('day')} de ${part('month')}`;
}
