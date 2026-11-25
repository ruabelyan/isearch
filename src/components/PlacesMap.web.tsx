import { USES_GOOGLE } from '../services';
import { GoogleWebMap } from './GoogleWebMap';
import { LeafletWebMap } from './LeafletWebMap';

/** Browser map: Google Maps with an API key, OpenStreetMap tiles without one. */
export const PlacesMap = USES_GOOGLE ? GoogleWebMap : LeafletWebMap;
