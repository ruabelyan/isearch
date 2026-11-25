import { GOOGLE_API_KEY } from '../config';
import * as google from './googleProvider';
import * as osm from './osmProvider';

/**
 * Google is used when an API key is configured; otherwise the app falls back
 * to the free OpenStreetMap services so it still works without a key.
 */
export const USES_GOOGLE = GOOGLE_API_KEY !== '';

const provider = USES_GOOGLE ? google : osm;

export const fetchNearbyPlaces = provider.fetchNearbyPlaces;
export const fetchRoute = provider.fetchRoute;
