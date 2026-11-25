export type Category = 'sights' | 'food' | 'drinks';
export type CategoryFilter = Category | 'all';
export type TravelMode = 'walk' | 'drive';
export type Lang = 'hy' | 'en' | 'ru';

export interface LatLng {
  latitude: number;
  longitude: number;
}

export interface Place {
  id: string;
  name: string;
  category: Category;
  location: LatLng;
  rating?: number;
  ratingCount?: number;
  address?: string;
  openNow?: boolean;
  photoUrl?: string;
}

export interface RouteInfo {
  coordinates: LatLng[];
  distanceMeters: number;
  durationSeconds: number;
}
