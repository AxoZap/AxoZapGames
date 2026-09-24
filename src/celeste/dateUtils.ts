/**
 * Returns today's date formatted as YYYY-MM-DD in US Eastern Time (EST/EDT).
 */
export function getTodayDateEST(): string {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(now);
}
