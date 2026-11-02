/**
 * Durations are stored in hours (`estimatedHours`) but typed and shown the way people
 * think about them: "10 min" under one hour, "1.5 h" from one hour.
 */

const NUMBER = '(\\d+(?:[.,]\\d+)?)';
const HOURS_UNIT = '(?:h|hr|hrs|hora|horas)';
const MINUTES_UNIT = '(?:m|min|mins|minuto|minutos)';

const HOURS_ONLY = new RegExp(`^${NUMBER}\\s*${HOURS_UNIT}?$`);
const MINUTES_ONLY = new RegExp(`^${NUMBER}\\s*${MINUTES_UNIT}$`);
const HOURS_AND_MINUTES = new RegExp(`^(\\d+)\\s*${HOURS_UNIT}\\s*(\\d+)\\s*${MINUTES_UNIT}?$`);

/** Hours with 4 decimals: 10 min = 0.1667 h, so it reads back as exactly 10 min. */
export function minutesToHours(minutes: number): number {
  return Math.round((minutes / 60) * 10000) / 10000;
}

const toNumber = (text: string) => Number(text.replace(',', '.'));

/**
 * Parses what the user typed into hours, or null when it is not a duration.
 * A bare number is hours ("1.5" = 1.5 h); "10 min", "90 min", "1 h", "1h30" also work.
 */
export function parseDuration(input: string): number | null {
  const text = input.trim().toLowerCase();
  if (!text) return null;

  let hours: number | null = null;
  const mixed = HOURS_AND_MINUTES.exec(text);
  const minutes = MINUTES_ONLY.exec(text);
  const plain = HOURS_ONLY.exec(text);
  if (mixed) hours = Number(mixed[1]) + Number(mixed[2]) / 60;
  else if (minutes) hours = toNumber(minutes[1]) / 60;
  else if (plain) hours = toNumber(plain[1]);

  if (hours === null || !Number.isFinite(hours)) return null;
  return Math.round(hours * 10000) / 10000;
}

/** Text for the duration input: "10 min" under an hour, "1.5 h" from an hour. */
export function formatDurationInput(hours: number): string {
  if (hours > 0 && hours < 1) return `${Math.max(1, Math.round(hours * 60))} min`;
  const rounded = Math.round(hours * 100) / 100;
  return `${rounded} h`;
}
