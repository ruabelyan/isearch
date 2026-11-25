import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

import { DEFAULT_RADIUS_M, MAX_RADIUS_M, MIN_RADIUS_M } from '../config';

const STORAGE_KEY = 'isearch.radius';

export const isValidRadius = (meters: number) =>
  Number.isFinite(meters) && meters >= MIN_RADIUS_M && meters <= MAX_RADIUS_M;

/** The search radius in meters, remembered between launches. */
export function useSearchRadius(): [number, (meters: number) => void] {
  const [radius, setRadiusState] = useState(DEFAULT_RADIUS_M);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((saved) => {
        const meters = Number(saved);
        if (saved !== null && isValidRadius(meters)) setRadiusState(meters);
      })
      .catch(() => {});
  }, []);

  const setRadius = useCallback((meters: number) => {
    if (!isValidRadius(meters)) return;
    const rounded = Math.round(meters);
    setRadiusState(rounded);
    AsyncStorage.setItem(STORAGE_KEY, String(rounded)).catch(() => {});
  }, []);

  return [radius, setRadius];
}
