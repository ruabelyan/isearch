import type { Ref } from 'react';

import type { LatLng, Place, TravelMode } from '../types';

export interface PlacesMapHandle {
  /** Moves the camera so that all the given points are visible. */
  fitToCoordinates: (coordinates: LatLng[]) => void;
  centerOn: (location: LatLng) => void;
}

export interface PlacesMapProps {
  ref?: Ref<PlacesMapHandle>;
  /** The user's current position. */
  location: LatLng;
  /** Search radius in meters, drawn as a circle around the user. */
  radiusMeters: number;
  places: Place[];
  selectedId?: string;
  /** Route to draw, or null for none. */
  route: LatLng[] | null;
  mode: TravelMode;
  /** Space covered by the overlays at the top and bottom of the map. */
  padding: { top: number; bottom: number };
  onSelect: (place: Place) => void;
}
