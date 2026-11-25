import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { CATEGORY_COLORS, CATEGORY_ICONS, COLORS } from '../config';
import { useI18n } from '../i18n/I18nContext';
import type { Place, RouteInfo, TravelMode } from '../types';
import { formatDistance, formatDuration } from '../utils/format';

export type RouteState =
  | { status: 'loading' }
  | { status: 'ready'; route: RouteInfo }
  | { status: 'none' }
  | { status: 'error' };

interface Props {
  place: Place;
  mode: TravelMode;
  routeState: RouteState;
  onModeChange: (mode: TravelMode) => void;
  onClose: () => void;
}

const MODES: { mode: TravelMode; icon: string }[] = [
  { mode: 'walk', icon: '🚶' },
  { mode: 'drive', icon: '🚗' },
];

/** Card for the selected place: details, travel mode switch and route summary. */
export function PlaceDetails({ place, mode, routeState, onModeChange, onClose }: Props) {
  const { t } = useI18n();
  const color = CATEGORY_COLORS[place.category];

  return (
    <View style={styles.card}>
      <View style={styles.top}>
        {place.photoUrl ? (
          <Image source={{ uri: place.photoUrl }} style={styles.photo} />
        ) : (
          <View style={[styles.photo, styles.photoFallback, { backgroundColor: color }]}>
            <Text style={styles.photoIcon}>{CATEGORY_ICONS[place.category]}</Text>
          </View>
        )}

        <View style={styles.info}>
          <Text style={styles.name} numberOfLines={2}>
            {place.name}
          </Text>
          <Text style={[styles.category, { color }]}>{t(place.category)}</Text>
          <Text style={styles.meta} numberOfLines={1}>
            {place.rating
              ? `★ ${place.rating.toFixed(1)}${place.ratingCount ? ` (${place.ratingCount})` : ''}`
              : ''}
            {place.rating && place.openNow !== undefined ? '  ·  ' : ''}
            {place.openNow !== undefined ? (
              <Text style={{ color: place.openNow ? COLORS.success : COLORS.danger }}>
                {t(place.openNow ? 'openNow' : 'closedNow')}
              </Text>
            ) : null}
          </Text>
          {place.address ? (
            <Text style={styles.meta} numberOfLines={1}>
              {place.address}
            </Text>
          ) : null}
        </View>

        <Pressable
          style={styles.close}
          onPress={onClose}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={t('close')}
        >
          <Text style={styles.closeText}>✕</Text>
        </Pressable>
      </View>

      <View style={styles.bottom}>
        <View style={styles.modes}>
          {MODES.map((item) => {
            const active = item.mode === mode;
            return (
              <Pressable
                key={item.mode}
                style={[styles.mode, active && styles.modeActive]}
                onPress={() => onModeChange(item.mode)}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
              >
                <Text style={[styles.modeText, active && styles.modeTextActive]}>
                  {item.icon} {t(item.mode)}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.route}>
          {routeState.status === 'loading' ? (
            <>
              <ActivityIndicator size="small" color={COLORS.primary} />
              <Text style={styles.routeNote}>{t('routeLoading')}</Text>
            </>
          ) : routeState.status === 'ready' ? (
            <>
              <Text style={styles.duration}>
                {formatDuration(routeState.route.durationSeconds, t)}
              </Text>
              <Text style={styles.routeDistance}>
                {formatDistance(routeState.route.distanceMeters, t)}
              </Text>
            </>
          ) : (
            <Text style={[styles.routeNote, { color: COLORS.danger }]}>
              {t(routeState.status === 'none' ? 'noRoute' : 'routeError')}
            </Text>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 12,
    marginVertical: 6,
    padding: 14,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  top: {
    flexDirection: 'row',
    gap: 12,
  },
  photo: {
    width: 76,
    height: 76,
    borderRadius: 14,
    backgroundColor: COLORS.background,
  },
  photoFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoIcon: {
    fontSize: 34,
  },
  info: {
    flex: 1,
    gap: 2,
  },
  name: {
    fontSize: 17,
    fontWeight: '700',
    lineHeight: 21,
    color: COLORS.text,
  },
  category: {
    fontSize: 13,
    fontWeight: '600',
  },
  meta: {
    fontSize: 13,
    color: COLORS.muted,
  },
  close: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.background,
  },
  closeText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.muted,
  },
  bottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 14,
  },
  modes: {
    flexDirection: 'row',
    padding: 3,
    borderRadius: 14,
    backgroundColor: COLORS.background,
  },
  mode: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 11,
  },
  modeActive: {
    backgroundColor: COLORS.primary,
  },
  modeText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
  },
  modeTextActive: {
    color: '#FFFFFF',
  },
  route: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'flex-end',
    flexWrap: 'wrap',
    gap: 6,
  },
  duration: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.primary,
  },
  routeDistance: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.muted,
  },
  routeNote: {
    flexShrink: 1,
    fontSize: 13,
    textAlign: 'right',
    color: COLORS.muted,
  },
});
