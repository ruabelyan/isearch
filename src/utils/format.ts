import type { TranslationKey } from '../i18n/translations';

type Translate = (key: TranslationKey) => string;

export function formatDistance(meters: number, t: Translate): string {
  if (meters < 1000) return `${Math.max(10, Math.round(meters / 10) * 10)} ${t('m')}`;
  const km = meters / 1000;
  return `${km < 10 ? km.toFixed(1) : Math.round(km)} ${t('km')}`;
}

/** Exact radius label: "500 m", "2 km", "2.5 km". */
export function formatRadius(meters: number, t: Translate): string {
  if (meters < 1000) return `${Math.round(meters)} ${t('m')}`;
  return `${parseFloat((meters / 1000).toFixed(2))} ${t('km')}`;
}

export function formatDuration(seconds: number, t: Translate): string {
  const minutes = Math.max(1, Math.round(seconds / 60));
  if (minutes < 60) return `${minutes} ${t('min')}`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours} ${t('hour')} ${rest} ${t('min')}` : `${hours} ${t('hour')}`;
}
