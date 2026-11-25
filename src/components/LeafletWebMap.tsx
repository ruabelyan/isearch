import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useEffect, useImperativeHandle, useRef } from 'react';

import { CATEGORY_COLORS, CATEGORY_ICONS, COLORS } from '../config';
import type { LatLng } from '../types';
import type { PlacesMapProps } from './PlacesMap.types';

const toLeaflet = (p: LatLng): L.LatLngTuple => [p.latitude, p.longitude];

/**
 * Browser map on OpenStreetMap tiles (Leaflet). Used when there is no Google
 * API key. Only imported from PlacesMap.web.tsx, so it never reaches native builds.
 */
export function LeafletWebMap({
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
  const containerRef = useRef<HTMLDivElement>(null);
  const initialLocation = useRef(location);
  // The effects below run in order, so the map created by the first one is
  // already in these refs when the later ones run.
  const mapRef = useRef<L.Map | null>(null);
  const attributionRef = useRef<L.Control.Attribution | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const instance = L.map(containerRef.current, {
      center: toLeaflet(initialLocation.current),
      zoom: 16,
      zoomControl: false,
      // Fractional zoom lets "fit to route / radius" fill the screen properly.
      zoomSnap: 0.25,
      attributionControl: false,
    });
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(instance);
    const control = L.control
      .attribution({ position: 'bottomleft', prefix: false })
      .addTo(instance);

    mapRef.current = instance;
    attributionRef.current = control;
    return () => {
      instance.remove();
      mapRef.current = null;
      attributionRef.current = null;
    };
  }, []);

  // Keep the required OpenStreetMap credit visible above the bottom panel.
  useEffect(() => {
    const element = attributionRef.current?.getContainer();
    if (element) element.style.marginBottom = `${padding.bottom}px`;
  }, [padding.bottom]);

  useImperativeHandle(
    ref,
    () => ({
      fitToCoordinates: (coordinates) => {
        if (coordinates.length === 0) return;
        mapRef.current?.fitBounds(L.latLngBounds(coordinates.map(toLeaflet)), {
          paddingTopLeft: [60, padding.top + 40],
          paddingBottomRight: [60, padding.bottom + 40],
        });
      },
      centerOn: (target) => {
        mapRef.current?.setView(toLeaflet(target), 16);
      },
    }),
    [padding.top, padding.bottom],
  );

  // The user's position: a blue dot.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const dot = L.circleMarker(toLeaflet(location), {
      radius: 8,
      color: '#FFFFFF',
      weight: 3,
      fillColor: '#1A73E8',
      fillOpacity: 1,
      interactive: false,
    }).addTo(map);
    return () => {
      dot.remove();
    };
  }, [location]);

  // The search radius around the user.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const circle = L.circle(toLeaflet(location), {
      radius: radiusMeters,
      color: COLORS.primary,
      opacity: 0.55,
      weight: 1.5,
      fillColor: COLORS.primary,
      fillOpacity: 0.06,
      interactive: false,
    }).addTo(map);
    return () => {
      circle.remove();
    };
  }, [location, radiusMeters]);

  // Place markers. Sights are larger and drawn above food and drinks.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const markers = places.map((place) => {
      const selected = place.id === selectedId;
      const isSight = place.category === 'sights';
      const size = selected ? 46 : isSight ? 38 : 28;

      // The HTML holds only our own constants; the place name goes through `title`.
      const html =
        `<div style="width:${size}px;height:${size}px;border-radius:50%;box-sizing:border-box;` +
        `display:flex;align-items:center;justify-content:center;cursor:pointer;` +
        `background:${CATEGORY_COLORS[place.category]};border:${selected ? 3 : 2}px solid #fff;` +
        `box-shadow:0 1px 4px rgba(0,0,0,.35);font-size:${Math.round(size * 0.48)}px;line-height:1">` +
        `${CATEGORY_ICONS[place.category]}</div>`;

      return L.marker(toLeaflet(place.location), {
        title: place.name,
        zIndexOffset: selected ? 3000 : isSight ? 1000 : 0,
        icon: L.divIcon({
          className: '',
          html,
          iconSize: [size, size],
          iconAnchor: [size / 2, size / 2],
        }),
      })
        .on('click', () => onSelect(place))
        .addTo(map);
    });
    return () => markers.forEach((marker) => marker.remove());
  }, [places, selectedId, onSelect]);

  // Route line: dashed for walking, solid for driving.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !route) return;
    const line = L.polyline(route.map(toLeaflet), {
      color: COLORS.primary,
      weight: 5,
      dashArray: mode === 'walk' ? '10 10' : undefined,
      interactive: false,
    }).addTo(map);
    return () => {
      line.remove();
    };
  }, [route, mode]);

  return (
    <div
      ref={containerRef}
      // zIndex 0 keeps Leaflet's internal layers below the app's overlays.
      style={{ position: 'absolute', inset: 0, zIndex: 0, backgroundColor: COLORS.background }}
    />
  );
}
