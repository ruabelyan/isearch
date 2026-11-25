import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CategoryChips } from '../components/CategoryChips';
import { MenuDrawer } from '../components/MenuDrawer';
import { PlaceDetails } from '../components/PlaceDetails';
import type { RouteState } from '../components/PlaceDetails';
import { PlaceList } from '../components/PlaceList';
import type { PlaceWithDistance } from '../components/PlaceList';
import { PlacesMap } from '../components/PlacesMap';
import type { PlacesMapHandle } from '../components/PlacesMap.types';
import { StatusScreen } from '../components/StatusScreen';
import { COLORS, PLACES_REFRESH_DISTANCE_M, ROUTE_REFRESH_DISTANCE_M } from '../config';
import { useSearchRadius } from '../hooks/useSearchRadius';
import { useAnchoredLocation, useUserLocation } from '../hooks/useUserLocation';
import { useI18n } from '../i18n/I18nContext';
import { fetchNearbyPlaces, fetchRoute } from '../services';
import type { Category, CategoryFilter, LatLng, Place, TravelMode } from '../types';
import { formatRadius } from '../utils/format';
import { distanceMeters } from '../utils/geo';

const CATEGORY_ORDER: Record<Category, number> = { sights: 0, food: 1, drinks: 2 };

export function MapScreen() {
  const { t } = useI18n();
  const { status, canAskAgain, location, retry } = useUserLocation();

  if (status === 'denied') {
    // A browser has no app settings page to open, so there the button always retries.
    const canRetry = canAskAgain || Platform.OS === 'web';
    return (
      <StatusScreen
        icon="📍"
        title={t('permissionTitle')}
        text={t('permissionText')}
        actionLabel={t(canRetry ? 'retry' : 'openSettings')}
        onAction={canRetry ? retry : () => Linking.openSettings()}
      />
    );
  }
  if (status === 'error') {
    return (
      <StatusScreen icon="⚠️" text={t('locationError')} actionLabel={t('retry')} onAction={retry} />
    );
  }
  if (!location) {
    return <StatusScreen loading text={t('locating')} />;
  }
  return <NearbyMap location={location} />;
}

type PlacesState =
  { status: 'loading' } | { status: 'ready' } | { status: 'error'; message: string };

/** Outcome of a request, tagged with the request it belongs to. */
interface Keyed<T> {
  key: string;
  value: T;
}

function NearbyMap({ location }: { location: LatLng }) {
  const { t, lang } = useI18n();
  const insets = useSafeAreaInsets();
  const mapRef = useRef<PlacesMapHandle>(null);

  const [filter, setFilter] = useState<CategoryFilter>('all');
  const [places, setPlaces] = useState<Place[]>([]);
  const [placesResult, setPlacesResult] = useState<Keyed<PlacesState> | null>(null);
  const [reloadTick, setReloadTick] = useState(0);

  const [selected, setSelected] = useState<Place | null>(null);
  const [mode, setMode] = useState<TravelMode>('walk');
  const [routeResult, setRouteResult] = useState<Keyed<RouteState> | null>(null);
  const [panelHeight, setPanelHeight] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [radius, setRadius] = useSearchRadius();

  // ----- Nearby places: reload on meaningful movement, a new radius or language, or manual refresh.
  const placesAnchor = useAnchoredLocation(location, PLACES_REFRESH_DISTANCE_M) ?? location;
  const placesKey = `${placesAnchor.latitude},${placesAnchor.longitude}:${radius}:${lang}:${reloadTick}`;
  // Loading until the result of the current request has arrived.
  const placesState: PlacesState =
    placesResult?.key === placesKey ? placesResult.value : { status: 'loading' };

  useEffect(() => {
    let cancelled = false;
    fetchNearbyPlaces(placesAnchor, lang, radius)
      .then((result) => {
        if (cancelled) return;
        setPlaces(result);
        setPlacesResult({ key: placesKey, value: { status: 'ready' } });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setPlacesResult({
          key: placesKey,
          value: {
            status: 'error',
            message: error instanceof Error ? error.message : String(error),
          },
        });
      });
    return () => {
      cancelled = true;
    };
  }, [placesAnchor, lang, radius, placesKey]);

  // Keep the selected place even if it drops out of a later search, but pick up
  // its refreshed data (e.g. the name in a newly chosen language) when present.
  const selectedPlace = useMemo(
    () => (selected ? (places.find((p) => p.id === selected.id) ?? selected) : null),
    [places, selected],
  );

  // Sights first, then food, then drinks; nearest first inside each group.
  const visiblePlaces = useMemo<PlaceWithDistance[]>(
    () =>
      places
        .filter((p) => filter === 'all' || p.category === filter)
        .map((p) => ({ ...p, distance: distanceMeters(location, p.location) }))
        .sort(
          (a, b) =>
            CATEGORY_ORDER[a.category] - CATEGORY_ORDER[b.category] || a.distance - b.distance,
        ),
    [places, filter, location],
  );

  const markerPlaces = useMemo(() => {
    if (!selectedPlace || visiblePlaces.some((p) => p.id === selectedPlace.id)) {
      return visiblePlaces;
    }
    return [...visiblePlaces, selectedPlace];
  }, [visiblePlaces, selectedPlace]);

  // ----- Route from the user to the selected place.
  const routeAnchor = useAnchoredLocation(location, ROUTE_REFRESH_DISTANCE_M) ?? location;
  const destLat = selected?.location.latitude;
  const destLng = selected?.location.longitude;
  // A route is identified by place and travel mode. Position updates refresh
  // the same route in the background without a loading state or camera move.
  const routeKey = selected ? `${selected.id}:${mode}` : null;
  const routeState: RouteState =
    routeKey !== null && routeResult?.key === routeKey ? routeResult.value : { status: 'loading' };
  const fittedRouteKey = useRef<string | null>(null);

  useEffect(() => {
    if (routeKey === null || destLat === undefined || destLng === undefined) return;

    let cancelled = false;
    fetchRoute(routeAnchor, { latitude: destLat, longitude: destLng }, mode)
      .then((route) => {
        if (cancelled) return;
        setRouteResult({
          key: routeKey,
          value: route ? { status: 'ready', route } : { status: 'none' },
        });
        if (route && fittedRouteKey.current !== routeKey) {
          fittedRouteKey.current = routeKey;
          mapRef.current?.fitToCoordinates(route.coordinates);
        }
      })
      .catch(() => {
        if (cancelled) return;
        // A failed background refresh keeps the route that is already drawn.
        setRouteResult((prev) =>
          prev?.key === routeKey && prev.value.status === 'ready'
            ? prev
            : { key: routeKey, value: { status: 'error' } },
        );
      });
    return () => {
      cancelled = true;
    };
  }, [routeKey, destLat, destLng, mode, routeAnchor]);

  const handleSelect = useCallback((place: Place) => setSelected(place), []);
  const handleClose = () => {
    setSelected(null);
    setRouteResult(null);
    fittedRouteKey.current = null;
  };

  const recenter = () => mapRef.current?.centerOn(location);

  /** Applies a new search radius and zooms the map to show the whole circle. */
  const changeRadius = (meters: number) => {
    setRadius(meters);
    const dLat = meters / 111320;
    const dLng = dLat / Math.cos((location.latitude * Math.PI) / 180);
    mapRef.current?.fitToCoordinates([
      { latitude: location.latitude + dLat, longitude: location.longitude },
      { latitude: location.latitude - dLat, longitude: location.longitude },
      { latitude: location.latitude, longitude: location.longitude + dLng },
      { latitude: location.latitude, longitude: location.longitude - dLng },
    ]);
  };

  const routeLine =
    selectedPlace && routeState.status === 'ready' ? routeState.route.coordinates : null;
  const mapPadding = useMemo(
    () => ({ top: insets.top + 56, bottom: panelHeight }),
    [insets.top, panelHeight],
  );

  return (
    <View style={styles.container}>
      <PlacesMap
        ref={mapRef}
        location={location}
        radiusMeters={radius}
        places={markerPlaces}
        selectedId={selectedPlace?.id}
        route={routeLine}
        mode={mode}
        padding={mapPadding}
        onSelect={handleSelect}
      />

      <View style={[styles.topBar, { top: insets.top + 8 }]}>
        <Pressable
          style={styles.menuButton}
          onPress={() => setMenuOpen(true)}
          accessibilityRole="button"
          accessibilityLabel={t('menu')}
        >
          <Text style={styles.menuIcon}>☰</Text>
        </Pressable>
        <View style={styles.chips}>
          <CategoryChips value={filter} onChange={setFilter} />
        </View>
      </View>

      <MenuDrawer
        visible={menuOpen}
        onClose={() => setMenuOpen(false)}
        radius={radius}
        onRadiusChange={changeRadius}
        filter={filter}
        onFilterChange={setFilter}
        mode={mode}
        onModeChange={setMode}
      />

      <View
        style={[styles.bottomPanel, { paddingBottom: insets.bottom + 6 }]}
        onLayout={(e) => setPanelHeight(e.nativeEvent.layout.height)}
      >
        <View style={styles.mapButtons}>
          <Pressable
            style={styles.radiusBadge}
            onPress={() => setMenuOpen(true)}
            accessibilityRole="button"
            accessibilityLabel={t('searchRadius')}
          >
            <Text style={styles.radiusBadgeText}>⌖ {formatRadius(radius, t)}</Text>
          </Pressable>
          <Pressable
            style={styles.mapButton}
            onPress={() => setReloadTick((n) => n + 1)}
            accessibilityRole="button"
            accessibilityLabel={t('refresh')}
          >
            <Text style={styles.mapButtonText}>↻</Text>
          </Pressable>
          <Pressable
            style={styles.mapButton}
            onPress={recenter}
            accessibilityRole="button"
            accessibilityLabel={t('myLocation')}
          >
            <Text style={styles.mapButtonText}>◎</Text>
          </Pressable>
        </View>

        {selectedPlace ? (
          <PlaceDetails
            place={selectedPlace}
            mode={mode}
            routeState={routeState}
            onModeChange={setMode}
            onClose={handleClose}
          />
        ) : placesState.status === 'error' ? (
          <View style={styles.notice}>
            <Text style={styles.noticeTitle}>
              {placesState.message === 'network' ? t('networkError') : t('placesError')}
            </Text>
            {placesState.message !== 'network' ? (
              <Text style={styles.noticeText} numberOfLines={4}>
                {placesState.message}
              </Text>
            ) : null}
            <Pressable onPress={() => setReloadTick((n) => n + 1)} accessibilityRole="button">
              <Text style={styles.noticeAction}>{t('retry')}</Text>
            </Pressable>
          </View>
        ) : visiblePlaces.length > 0 ? (
          <PlaceList places={visiblePlaces} onSelect={handleSelect} />
        ) : (
          <View style={[styles.notice, styles.noticeRow]}>
            {placesState.status === 'loading' ? (
              <ActivityIndicator size="small" color={COLORS.primary} />
            ) : null}
            <Text style={styles.noticeText}>
              {t(placesState.status === 'loading' ? 'loadingPlaces' : 'noPlaces')}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 12,
    pointerEvents: 'box-none',
  },
  menuButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  menuIcon: {
    fontSize: 20,
    color: COLORS.text,
  },
  radiusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
    backgroundColor: COLORS.surface,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  radiusBadgeText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primary,
  },
  chips: {
    flex: 1,
  },
  bottomPanel: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    // Touches between the buttons and cards go through to the map.
    pointerEvents: 'box-none',
  },
  mapButtons: {
    pointerEvents: 'box-none',
    alignItems: 'flex-end',
    gap: 10,
    paddingHorizontal: 12,
    paddingBottom: 6,
  },
  mapButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  mapButtonText: {
    fontSize: 22,
    color: COLORS.primary,
  },
  notice: {
    gap: 6,
    marginHorizontal: 12,
    marginVertical: 6,
    padding: 14,
    borderRadius: 16,
    backgroundColor: COLORS.surface,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  noticeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  noticeTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.danger,
  },
  noticeText: {
    flexShrink: 1,
    fontSize: 13,
    color: COLORS.muted,
  },
  noticeAction: {
    marginTop: 2,
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primary,
  },
});
