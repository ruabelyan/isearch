import type { Category } from './types';

// Must be read with dot notation so Expo can inline it at bundle time.
export const GOOGLE_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ?? '';

/**
 * Most results requested per category. Sights are the priority, so they get
 * twice as many as food and drinks.
 */
export const MAX_RESULTS: Record<Category, number> = {
  sights: 20,
  food: 10,
  drinks: 10,
};

/** Search radius the user can pick in the menu, in meters. */
export const RADIUS_PRESETS_M = [500, 1000, 2000, 5000, 10000];
export const DEFAULT_RADIUS_M = 2000;
export const MIN_RADIUS_M = 100;
/** Wikipedia's nearby search, used without a Google key, allows at most 10 km. */
export const MAX_RADIUS_M = 10000;

/** Reload nearby places after the user has moved this far from the last search point. */
export const PLACES_REFRESH_DISTANCE_M = 400;
/** Recalculate the active route after the user has moved this far from its start. */
export const ROUTE_REFRESH_DISTANCE_M = 100;

export const CATEGORY_COLORS: Record<Category, string> = {
  sights: '#E8590C',
  food: '#2F9E44',
  drinks: '#7048E8',
};

export const CATEGORY_ICONS: Record<Category, string> = {
  sights: '🏛️',
  food: '🍽️',
  drinks: '☕',
};

export const COLORS = {
  primary: '#1C7ED6',
  text: '#212529',
  muted: '#868E96',
  border: '#DEE2E6',
  surface: '#FFFFFF',
  background: '#F1F3F5',
  danger: '#E03131',
  success: '#2F9E44',
};
