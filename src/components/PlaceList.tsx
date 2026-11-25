import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { CATEGORY_COLORS, CATEGORY_ICONS, COLORS } from '../config';
import { useI18n } from '../i18n/I18nContext';
import type { Place } from '../types';
import { formatDistance } from '../utils/format';

export type PlaceWithDistance = Place & { distance: number };

interface Props {
  places: PlaceWithDistance[];
  onSelect: (place: Place) => void;
}

/** Horizontal strip of nearby places shown at the bottom of the map. */
export function PlaceList({ places, onSelect }: Props) {
  const { t } = useI18n();

  return (
    <FlatList
      horizontal
      data={places}
      keyExtractor={(place) => place.id}
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.list}
      renderItem={({ item }) => (
        <Pressable style={styles.card} onPress={() => onSelect(item)} accessibilityRole="button">
          <View style={styles.header}>
            <View style={[styles.badge, { backgroundColor: CATEGORY_COLORS[item.category] }]}>
              <Text style={styles.badgeIcon}>{CATEGORY_ICONS[item.category]}</Text>
            </View>
            <Text style={styles.distance}>{formatDistance(item.distance, t)}</Text>
          </View>
          <Text style={styles.name} numberOfLines={2}>
            {item.name}
          </Text>
          <Text style={styles.meta} numberOfLines={1}>
            {item.rating ? `★ ${item.rating.toFixed(1)}  ·  ` : ''}
            {t(item.category)}
          </Text>
        </Pressable>
      )}
    />
  );
}

const styles = StyleSheet.create({
  list: {
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  card: {
    width: 170,
    padding: 12,
    borderRadius: 16,
    backgroundColor: COLORS.surface,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  badge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeIcon: {
    fontSize: 16,
  },
  distance: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.muted,
  },
  name: {
    minHeight: 38,
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 19,
    color: COLORS.text,
  },
  meta: {
    marginTop: 4,
    fontSize: 12,
    color: COLORS.muted,
  },
});
