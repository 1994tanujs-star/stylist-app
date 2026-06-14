// Occasions/moods a wardrobe item can suit and a look can target.
// Keep in sync with OCCASIONS in backend/src/anthropic.js.
export const OCCASIONS = ['work', 'casual', 'dinner', 'formal', 'date', 'brunch', 'travel'];

export const OCCASION_LABELS = {
  work: 'Work',
  casual: 'Casual',
  dinner: 'Dinner',
  formal: 'Formal',
  date: 'Date',
  brunch: 'Brunch',
  travel: 'Travel',
};

// Parse a stored comma-separated occasions string into a clean array.
export function parseOccasions(value) {
  if (!value) return [];
  return value
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter((s) => OCCASIONS.includes(s));
}
