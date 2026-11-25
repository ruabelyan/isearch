import { MAX_RESULTS } from '../config';
import type { Category, Lang, LatLng, Place, RouteInfo, TravelMode } from '../types';
import { decodePolyline, distanceMeters } from '../utils/geo';
import { ApiError, request } from './errors';
import { fetchWikipediaSights } from './wikipediaSights';

/**
 * Free OpenStreetMap-based services, used when no Google API key is configured.
 * Sights come from Wikipedia, food and drink places from Photon (komoot),
 * routes from the FOSSGIS OSRM servers.
 * These are shared public servers: fine for development, not for production load.
 * Compared with Google there are no ratings or opening hours.
 */
const PHOTON_URL = 'https://photon.komoot.io/reverse';
/** Food and drinks are secondary, so they get little time before being skipped. */
const PHOTON_TIMEOUT_MS = 5000;
const ROUTING_URL = 'https://routing.openstreetmap.de';

/** OpenStreetMap tags searched for each category ("key" or "key:value"). */
const CATEGORY_TAGS: Record<Exclude<Category, 'sights'>, string[]> = {
  food: ['amenity:restaurant', 'amenity:fast_food'],
  drinks: ['amenity:cafe', 'amenity:bar'],
};

const CATEGORIES: Category[] = ['sights', 'food', 'drinks'];

interface PhotonResponse {
  features?: {
    geometry?: { coordinates?: [number, number] };
    properties?: {
      osm_type?: string;
      osm_id?: number;
      name?: string;
      street?: string;
      housenumber?: string;
    };
  }[];
}

/** Named places with the given tag around a point, nearest first. */
async function searchTag(
  tag: string,
  category: Category,
  center: LatLng,
  lang: Lang,
  radiusMeters: number,
): Promise<Place[]> {
  const params = [
    `lat=${center.latitude}`,
    `lon=${center.longitude}`,
    `radius=${radiusMeters / 1000}`,
    `limit=${MAX_RESULTS[category]}`,
    `osm_tag=${encodeURIComponent(tag)}`,
  ];
  // Photon translates names only into a few languages; otherwise it returns the local name.
  if (lang === 'en') params.push('lang=en');

  const response = await request(`${PHOTON_URL}?${params.join('&')}`, undefined, PHOTON_TIMEOUT_MS);
  if (!response.ok) throw new ApiError(`Photon HTTP ${response.status}`);
  const data = (await response.json()) as PhotonResponse;

  const places: Place[] = [];
  for (const feature of data.features ?? []) {
    const coordinates = feature.geometry?.coordinates;
    const p = feature.properties;
    if (!coordinates || !p?.name || p.osm_id === undefined) continue;
    places.push({
      id: `${p.osm_type ?? 'N'}${p.osm_id}`,
      name: p.name,
      category,
      location: { latitude: coordinates[1], longitude: coordinates[0] },
      address: p.street ? [p.street, p.housenumber].filter(Boolean).join(' ') : undefined,
    });
  }
  return places;
}

async function searchCategory(
  category: Exclude<Category, 'sights'>,
  center: LatLng,
  lang: Lang,
  radiusMeters: number,
): Promise<Place[]> {
  // One tag at a time: the public server rejects many simultaneous requests.
  // A failure ends the category at once, so an unreachable server cannot hold
  // back the sights, which are shown only when every category has finished.
  const found: Place[] = [];
  for (const tag of CATEGORY_TAGS[category]) {
    found.push(...(await searchTag(tag, category, center, lang, radiusMeters)));
  }

  return found
    .sort((a, b) => distanceMeters(center, a.location) - distanceMeters(center, b.location))
    .slice(0, MAX_RESULTS[category]);
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
    CATEGORIES.map((category) =>
      category === 'sights'
        ? fetchWikipediaSights(center, lang, radiusMeters)
        : searchCategory(category, center, lang, radiusMeters),
    ),
  );
  if (results[0].status === 'rejected') throw results[0].reason;

  // Sights come first, so a place tagged in several categories counts as a sight.
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

interface OsrmResponse {
  code?: string;
  message?: string;
  routes?: { geometry: string; distance: number; duration: number }[];
}

/** Returns null when there is no route between the two points. */
export async function fetchRoute(
  origin: LatLng,
  destination: LatLng,
  mode: TravelMode,
): Promise<RouteInfo | null> {
  const [server, profile] = mode === 'walk' ? ['routed-foot', 'foot'] : ['routed-car', 'driving'];
  const points = `${origin.longitude},${origin.latitude};${destination.longitude},${destination.latitude}`;
  const url = `${ROUTING_URL}/${server}/route/v1/${profile}/${points}?overview=full&geometries=polyline`;

  const response = await request(url);
  const json = (await response.json().catch(() => null)) as OsrmResponse | null;
  if (json?.code === 'NoRoute') return null;
  if (!response.ok || json?.code !== 'Ok') {
    throw new ApiError(json?.message ?? `Routing HTTP ${response.status}`);
  }

  const route = json.routes?.[0];
  if (!route) return null;
  return {
    coordinates: decodePolyline(route.geometry),
    distanceMeters: route.distance,
    durationSeconds: route.duration,
  };
}
