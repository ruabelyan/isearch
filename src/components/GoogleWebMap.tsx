/// <reference types="google.maps" />
import { useEffect, useImperativeHandle, useRef, useState } from 'react';

import { CATEGORY_COLORS, CATEGORY_ICONS, COLORS, GOOGLE_API_KEY } from '../config';
import { useI18n } from '../i18n/I18nContext';
import type { LatLng } from '../types';
import type { PlacesMapProps } from './PlacesMap.types';

const READY_CALLBACK = '__isearchGoogleMapsReady';
let mapsPromise: Promise<void> | null = null;

/** Loads the Google Maps JavaScript API once per page. */
function loadGoogleMaps(): Promise<void> {
  if (mapsPromise) return mapsPromise;

  mapsPromise = new Promise<void>((resolve, reject) => {
    const fail = () => {
      mapsPromise = null;
      reject(new Error('Google Maps failed to load'));
    };

    (window as unknown as Record<string, unknown>)[READY_CALLBACK] = () => {
      Promise.all([google.maps.importLibrary('maps'), google.maps.importLibrary('marker')])
        .then(() => resolve())
        .catch(fail);
    };

    const script = document.createElement('script');
    script.src =
      `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(GOOGLE_API_KEY)}` +
      `&v=weekly&loading=async&callback=${READY_CALLBACK}`;
    script.async = true;
    script.onerror = fail;
    document.head.appendChild(script);
  });
  return mapsPromise;
}

const toGoogle = (p: LatLng): google.maps.LatLngLiteral => ({ lat: p.latitude, lng: p.longitude });

/**
 * Browser map built on the Google Maps JavaScript API. Only imported from
 * PlacesMap.web.tsx, so it never reaches native builds.
 */
export function GoogleWebMap({
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
  const { t } = useI18n();
  const containerRef = useRef<HTMLDivElement>(null);
  const initialLocation = useRef(location);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadGoogleMaps()
      .then(() => {
        if (cancelled || !containerRef.current) return;
        setMap(
          new google.maps.Map(containerRef.current, {
            center: toGoogle(initialLocation.current),
            zoom: 14,
            disableDefaultUI: true,
            clickableIcons: false,
            gestureHandling: 'greedy',
          }),
        );
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useImperativeHandle(
    ref,
    () => ({
      fitToCoordinates: (coordinates) => {
        if (!map || coordinates.length === 0) return;
        const bounds = new google.maps.LatLngBounds();
        for (const point of coordinates) bounds.extend(toGoogle(point));
        map.fitBounds(bounds, {
          top: padding.top + 40,
          bottom: padding.bottom + 40,
          left: 60,
          right: 60,
        });
      },
      centerOn: (target) => {
        if (!map) return;
        map.panTo(toGoogle(target));
        map.setZoom(15);
      },
    }),
    [map, padding.top, padding.bottom],
  );

  // The user's position: a blue dot.
  useEffect(() => {
    if (!map) return;
    const marker = new google.maps.Marker({
      map,
      position: toGoogle(location),
      clickable: false,
      zIndex: 1000,
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 8,
        fillColor: '#1A73E8',
        fillOpacity: 1,
        strokeColor: '#FFFFFF',
        strokeWeight: 3,
      },
    });
    return () => marker.setMap(null);
  }, [map, location]);

  // The search radius around the user.
  useEffect(() => {
    if (!map) return;
    const circle = new google.maps.Circle({
      map,
      center: toGoogle(location),
      radius: radiusMeters,
      strokeColor: COLORS.primary,
      strokeOpacity: 0.55,
      strokeWeight: 1.5,
      fillColor: COLORS.primary,
      fillOpacity: 0.06,
      clickable: false,
    });
    return () => circle.setMap(null);
  }, [map, location, radiusMeters]);

  // Place markers. Sights are larger and drawn above food and drinks.
  useEffect(() => {
    if (!map) return;
    const markers = places.map((place) => {
      const selected = place.id === selectedId;
      const isSight = place.category === 'sights';
      const size = selected ? 46 : isSight ? 38 : 28;

      const marker = new google.maps.Marker({
        map,
        position: toGoogle(place.location),
        title: place.name,
        zIndex: selected ? 100 : isSight ? 10 : 1,
        label: { text: CATEGORY_ICONS[place.category], fontSize: `${Math.round(size * 0.48)}px` },
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: size / 2,
          fillColor: CATEGORY_COLORS[place.category],
          fillOpacity: 1,
          strokeColor: '#FFFFFF',
          strokeWeight: selected ? 3 : 2,
        },
      });
      marker.addListener('click', () => onSelect(place));
      return marker;
    });
    return () => markers.forEach((marker) => marker.setMap(null));
  }, [map, places, selectedId, onSelect]);

  // Route line: dashed for walking, solid for driving.
  useEffect(() => {
    if (!map || !route) return;
    const walking = mode === 'walk';
    const line = new google.maps.Polyline({
      map,
      path: route.map(toGoogle),
      strokeColor: COLORS.primary,
      strokeWeight: 5,
      strokeOpacity: walking ? 0 : 1,
      icons: walking
        ? [
            {
              icon: { path: 'M 0,-1 0,1', strokeOpacity: 1, strokeWeight: 5, scale: 2 },
              offset: '0',
              repeat: '14px',
            },
          ]
        : undefined,
    });
    return () => line.setMap(null);
  }, [map, route, mode]);

  return (
    <div style={{ position: 'absolute', inset: 0, backgroundColor: COLORS.background }}>
      <div ref={containerRef} style={{ position: 'absolute', inset: 0 }} />
      {failed ? (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 32,
            textAlign: 'center',
            fontFamily: 'system-ui, sans-serif',
            fontSize: 15,
            color: COLORS.muted,
          }}
        >
          {t('mapError')}
        </div>
      ) : null}
    </div>
  );
}
