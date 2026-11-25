import { GOOGLE_API_KEY, MAX_RESULTS } from '../config';
import type { Category, Lang, LatLng, Place, RouteInfo, TravelMode } from '../types';
import { decodePolyline } from '../utils/geo';
import { ApiError, request } from './errors';

const PLACES_URL = 'https://places.googleapis.com/v1/places:searchNearby';
const ROUTES_URL = 'https://routes.googleapis.com/directions/v2:computeRoutes';

const PLACES_FIELD_MASK = [
  'places.id',
  'places.displayName',
  'places.location',
  'places.rating',
  'places.userRatingCount',
  'places.shortFormattedAddress',
  'places.currentOpeningHours',
  'places.photos',
].join(',');

const ROUTES_FIELD_MASK = 'routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline';

/** Google place types (Table A) searched for each category. */
const CATEGORY_TYPES: Record<Category, string[]> = {
  sights: [
    'tourist_attraction',
    'museum',
    'art_gallery',
    'historical_landmark',
    'historical_place',
    'cultural_landmark',
    'monument',
    'church',
    'park',
    'national_park',
    'botanical_garden',
    'observation_deck',
    'plaza',
    'zoo',
    'aquarium',
    'amusement_park',
  ],
  food: ['restaurant', 'fast_food_restaurant', 'bakery', 'meal_takeaway'],
  drinks: ['cafe', 'coffee_shop', 'tea_house', 'bar', 'pub', 'wine_bar'],
};

/** Sights first: when a place matches several categories the earliest one wins. */
const CATEGORY_PRIORITY: Category[] = ['sights', 'food', 'drinks'];

async function postJson<T>(url: string, fieldMask: string, body: unknown): Promise<T> {
  const response = await request(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': GOOGLE_API_KEY,
      'X-Goog-FieldMask': fieldMask,
    },
    body: JSON.stringify(body),
  });

  const json = await response.json().catch(() => null);
  if (!response.ok) {
    throw new ApiError(json?.error?.message ?? `HTTP ${response.status}`);
  }
  return (json ?? {}) as T;
}

interface NearbyResponse {
  places?: {
    id: string;
    displayName?: { text?: string };
    location?: LatLng;
    rating?: number;
    userRatingCount?: number;
    shortFormattedAddress?: string;
    currentOpeningHours?: { openNow?: boolean };
    photos?: { name: string }[];
  }[];
}

async function searchCategory(
  category: Category,
  center: LatLng,
  lang: Lang,
  radiusMeters: number,
): Promise<Place[]> {
  const data = await postJson<NearbyResponse>(PLACES_URL, PLACES_FIELD_MASK, {
    includedTypes: CATEGORY_TYPES[category],
    maxResultCount: MAX_RESULTS[category],
    rankPreference: 'POPULARITY',
    languageCode: lang,
    locationRestriction: {
      circle: {
        center: { latitude: center.latitude, longitude: center.longitude },
        radius: radiusMeters,
      },
    },
  });

  const places: Place[] = [];
  for (const p of data.places ?? []) {
    if (!p.location || !p.displayName?.text) continue;
    places.push({
      id: p.id,
      name: p.displayName.text,
      category,
      location: { latitude: p.location.latitude, longitude: p.location.longitude },
      rating: p.rating,
      ratingCount: p.userRatingCount,
      address: p.shortFormattedAddress,
      openNow: p.currentOpeningHours?.openNow,
      photoUrl: p.photos?.[0] ? photoUrl(p.photos[0].name) : undefined,
    });
  }
  return places;
}

/**
 * Loads sights, food and drink places around a point. Sights are required;
 * if a secondary category fails, the others are still returned.
 */
export async function fetchNearbyPlaces(
  center: LatLng,
  lang: Lang,
  radiusMeters: number,
): Promise<Place[]> {
  const results = await Promise.allSettled(
    CATEGORY_PRIORITY.map((category) => searchCategory(category, center, lang, radiusMeters)),
  );

  if (results[0].status === 'rejected') throw results[0].reason;

  const seen = new Set<string>();
  const places: Place[] = [];
  for (const result of results) {
    if (result.status !== 'fulfilled') continue;
    for (const place of result.value) {
      if (seen.has(place.id)) continue;
      seen.add(place.id);
      places.push(place);
    }
  }
  return places;
}

interface RoutesResponse {
  routes?: {
    duration?: string;
    distanceMeters?: number;
    polyline?: { encodedPolyline?: string };
  }[];
}

/** Returns null when Google has no route between the two points. */
export async function fetchRoute(
  origin: LatLng,
  destination: LatLng,
  mode: TravelMode,
): Promise<RouteInfo | null> {
  const toWaypoint = (p: LatLng) => ({
    location: { latLng: { latitude: p.latitude, longitude: p.longitude } },
  });

  const data = await postJson<RoutesResponse>(ROUTES_URL, ROUTES_FIELD_MASK, {
    origin: toWaypoint(origin),
    destination: toWaypoint(destination),
    travelMode: mode === 'walk' ? 'WALK' : 'DRIVE',
    // routingPreference is only allowed for DRIVE; sending it for WALK fails the request.
    ...(mode === 'drive' ? { routingPreference: 'TRAFFIC_AWARE' } : {}),
  });

  const route = data.routes?.[0];
  const encoded = route?.polyline?.encodedPolyline;
  if (!route || !encoded) return null;

  return {
    coordinates: decodePolyline(encoded),
    distanceMeters: route.distanceMeters ?? 0,
    durationSeconds: parseFloat(route.duration ?? '0') || 0,
  };
}

function photoUrl(photoName: string, maxWidthPx = 400): string {
  return `https://places.googleapis.com/v1/${photoName}/media?maxWidthPx=${maxWidthPx}&key=${GOOGLE_API_KEY}`;
}
