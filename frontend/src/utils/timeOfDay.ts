/**
 * Determines the atmospheric theme based on real-world local clock time.
 * - 05:00 to 08:59 -> 'golden' (Dawn / Sunrise)
 * - 09:00 to 17:59 -> 'day'    (Daylight / Radiant Sun)
 * - 18:00 to 20:59 -> 'twilight' (Twilight / Sunset)
 * - 21:00 to 04:59 -> 'night'  (Starlit Night / Moon)
 */
export type TimeOfDay = 'golden' | 'day' | 'twilight' | 'night';

export function getRealWorldTimeOfDay(): TimeOfDay {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 9) {
    return 'golden';
  }
  if (hour >= 9 && hour < 18) {
    return 'day';
  }
  if (hour >= 18 && hour < 21) {
    return 'twilight';
  }
  return 'night';
}

export function getTimeOfDayLabel(time: TimeOfDay): string {
  switch (time) {
    case 'golden':
      return '🌾 Dawn';
    case 'day':
      return '☀️ Day';
    case 'twilight':
      return '🌅 Twilight';
    case 'night':
      return '🌙 Night';
  }
}
