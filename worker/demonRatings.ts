export type DemonRatings = { tier?: number | null; enjoyment?: number | null };

export function ratingsError(value: DemonRatings): string | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return 'Expected a demon object.';
  if (value.tier != null && (!Number.isSafeInteger(value.tier) || value.tier < 1)) {
    return 'Tier must be a positive whole number, or blank.';
  }
  if (value.enjoyment != null && (typeof value.enjoyment !== 'number' || !Number.isFinite(value.enjoyment) || value.enjoyment < 0 || value.enjoyment > 10)) {
    return 'Enjoyment must be between 0 and 10, or blank.';
  }
  return null;
}
