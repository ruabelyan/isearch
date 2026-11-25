import * as Location from 'expo-location';
import { useCallback, useEffect, useState } from 'react';

import type { LatLng } from '../types';
import { distanceMeters } from '../utils/geo';

export type LocationStatus = 'pending' | 'granted' | 'denied' | 'error';

const LOCATION_TIMEOUT_MS = 20000;

const toLatLng = (o: Location.LocationObject): LatLng => ({
  latitude: o.coords.latitude,
  longitude: o.coords.longitude,
});

/**
 * Asks for location permission on mount and then follows the user's position.
 * `canAskAgain` is false when the system will no longer show the prompt and
 * the user has to enable the permission in the phone settings.
 */
export function useUserLocation() {
  const [status, setStatus] = useState<LocationStatus>('pending');
  const [canAskAgain, setCanAskAgain] = useState(true);
  const [location, setLocation] = useState<LatLng | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let subscription: Location.LocationSubscription | null = null;

    (async () => {
      try {
        const permission = await Location.requestForegroundPermissionsAsync();
        if (cancelled) return;
        setCanAskAgain(permission.canAskAgain);
        if (!permission.granted) {
          setStatus('denied');
          return;
        }

        // The last known position is instant; show it while a fresh fix is on its way.
        // Not every platform has one (browsers don't), so a failure here is not an error.
        const last = await Location.getLastKnownPositionAsync({ maxAge: 5 * 60 * 1000 }).catch(
          () => null,
        );
        if (cancelled) return;
        if (last) {
          setLocation(toLatLng(last));
          setStatus('granted');
        }

        // A fix can hang indefinitely (GPS off, a desktop without location
        // services), so give up after a while and let the user retry.
        const current = await Promise.race([
          Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('location timeout')), LOCATION_TIMEOUT_MS),
          ),
        ]);
        if (cancelled) return;
        setLocation(toLatLng(current));
        setStatus('granted');

        const sub = await Location.watchPositionAsync(
          { accuracy: Location.Accuracy.High, distanceInterval: 10, timeInterval: 5000 },
          (update) => setLocation(toLatLng(update)),
        );
        if (cancelled) sub.remove();
        else subscription = sub;
      } catch {
        // Keep working with the last known position if only the fresh fix failed.
        if (!cancelled) setStatus((prev) => (prev === 'granted' ? prev : 'error'));
      }
    })();

    return () => {
      cancelled = true;
      subscription?.remove();
    };
  }, [attempt]);

  const retry = useCallback(() => {
    setStatus('pending');
    setAttempt((n) => n + 1);
  }, []);

  return { status, canAskAgain, location, retry };
}

/**
 * Returns `location`, but only changes value once the user has moved more than
 * `thresholdMeters` from the previously returned point. Lets callers refetch
 * on meaningful movement instead of on every GPS update.
 */
export function useAnchoredLocation(
  location: LatLng | null,
  thresholdMeters: number,
): LatLng | null {
  const [anchor, setAnchor] = useState<LatLng | null>(location);

  if (location && (!anchor || distanceMeters(anchor, location) > thresholdMeters)) {
    setAnchor(location);
    return location;
  }
  return anchor;
}
