import { useImperativeHandle, useRef } from 'react';
import { StyleSheet } from 'react-native';
import MapView, { Circle, Polyline } from 'react-native-maps';

import { COLORS } from '../config';
import { PlaceMarker } from './PlaceMarker';
import type { PlacesMapProps } from './PlacesMap.types';

const DELTA = { latitudeDelta: 0.03, longitudeDelta: 0.03 };

/** Native map (Android / iOS). The browser version lives in PlacesMap.web.tsx. */
export function PlacesMap({
  ref,
  location,
  radiusMeters,
  places,
  selectedId,
  route,
  mode,
  padding,
  onSelect,
}: PlacesMapProps) {
  const mapRef = useRef<MapView>(null);

  useImperativeHandle(
    ref,
    () => ({
      fitToCoordinates: (coordinates) => {
        mapRef.current?.fitToCoordinates(coordinates, {
          edgePadding: { top: 140, right: 60, bottom: 300, left: 60 },
          animated: true,
        });
      },
      centerOn: (target) => {
        mapRef.current?.animateToRegion({ ...target, ...DELTA }, 500);
      },
    }),
    [],
  );

  return (
    <MapView
      ref={mapRef}
      style={StyleSheet.absoluteFill}
      initialRegion={{ ...location, ...DELTA }}
      showsUserLocation
      showsMyLocationButton={false}
      toolbarEnabled={false}
      mapPadding={{ top: padding.top, right: 0, bottom: padding.bottom, left: 0 }}
    >
      <Circle
        center={location}
        radius={radiusMeters}
        strokeWidth={1.5}
        strokeColor="rgba(28,126,214,0.55)"
        fillColor="rgba(28,126,214,0.06)"
      />
      {places.map((place) => (
        <PlaceMarker
          key={place.id}
          place={place}
          selected={place.id === selectedId}
          onPress={onSelect}
        />
      ))}
      {route ? (
        <Polyline
          coordinates={route}
          strokeWidth={5}
          strokeColor={COLORS.primary}
          lineCap="round"
          lineJoin="round"
          lineDashPattern={mode === 'walk' ? [10, 8] : undefined}
        />
      ) : null}
    </MapView>
  );
}
