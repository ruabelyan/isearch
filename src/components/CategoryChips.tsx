import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';

import { CATEGORY_COLORS, CATEGORY_ICONS, COLORS } from '../config';
import { useI18n } from '../i18n/I18nContext';
import type { CategoryFilter } from '../types';

const FILTERS: CategoryFilter[] = ['all', 'sights', 'food', 'drinks'];

interface Props {
  value: CategoryFilter;
  onChange: (value: CategoryFilter) => void;
}

export function CategoryChips({ value, onChange }: Props) {
  const { t } = useI18n();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
      keyboardShouldPersistTaps="handled"
    >
      {FILTERS.map((filter) => {
        const active = filter === value;
        const color = filter === 'all' ? COLORS.primary : CATEGORY_COLORS[filter];
        return (
          <Pressable
            key={filter}
            onPress={() => onChange(filter)}
            style={[styles.chip, active && { backgroundColor: color, borderColor: color }]}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
          >
            <Text style={[styles.label, active && styles.labelActive]}>
              {filter === 'all' ? '' : `${CATEGORY_ICONS[filter]} `}
              {t(filter)}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  labelActive: {
    color: '#FFFFFF',
  },
});
