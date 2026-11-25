import { useState } from 'react';
import type { ReactNode } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CATEGORY_COLORS, CATEGORY_ICONS, COLORS, RADIUS_PRESETS_M } from '../config';
import { isValidRadius } from '../hooks/useSearchRadius';
import { useI18n } from '../i18n/I18nContext';
import { LANGUAGES } from '../i18n/translations';
import { USES_GOOGLE } from '../services';
import type { CategoryFilter, TravelMode } from '../types';
import { formatRadius } from '../utils/format';

const APP_VERSION = '1.0.0';
const FILTERS: CategoryFilter[] = ['all', 'sights', 'food', 'drinks'];
const MODES: { mode: TravelMode; icon: string }[] = [
  { mode: 'walk', icon: '🚶' },
  { mode: 'drive', icon: '🚗' },
];

interface Props {
  visible: boolean;
  onClose: () => void;
  radius: number;
  onRadiusChange: (meters: number) => void;
  filter: CategoryFilter;
  onFilterChange: (filter: CategoryFilter) => void;
  mode: TravelMode;
  onModeChange: (mode: TravelMode) => void;
}

/** Side menu: search radius, categories, route type, language and app info. */
export function MenuDrawer({
  visible,
  onClose,
  radius,
  onRadiusChange,
  filter,
  onFilterChange,
  mode,
  onModeChange,
}: Props) {
  const { t, lang, setLang } = useI18n();
  const insets = useSafeAreaInsets();
  const [customKm, setCustomKm] = useState('');
  const [customInvalid, setCustomInvalid] = useState(false);

  const applyCustom = () => {
    const meters = parseFloat(customKm.replace(',', '.')) * 1000;
    if (!isValidRadius(meters)) {
      setCustomInvalid(true);
      return;
    }
    setCustomInvalid(false);
    setCustomKm('');
    onRadiusChange(meters);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.root}>
        <View style={[styles.drawer, { paddingTop: insets.top + 12 }]}>
          <View style={styles.header}>
            <Text style={styles.appName}>ISearch</Text>
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

          <ScrollView
            contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
            keyboardShouldPersistTaps="handled"
          >
            <Section title={t('searchRadius')} value={formatRadius(radius, t)}>
              <View style={styles.wrap}>
                {RADIUS_PRESETS_M.map((preset) => (
                  <Choice
                    key={preset}
                    label={formatRadius(preset, t)}
                    active={preset === radius}
                    onPress={() => onRadiusChange(preset)}
                  />
                ))}
              </View>
              <View style={styles.customRow}>
                <TextInput
                  style={[styles.input, customInvalid && styles.inputInvalid]}
                  value={customKm}
                  onChangeText={(text) => {
                    setCustomKm(text);
                    setCustomInvalid(false);
                  }}
                  onSubmitEditing={applyCustom}
                  placeholder={t('radiusPlaceholder')}
                  placeholderTextColor={COLORS.muted}
                  keyboardType="decimal-pad"
                  returnKeyType="done"
                  maxLength={5}
                  accessibilityLabel={t('searchRadius')}
                />
                <Text style={styles.unit}>{t('km')}</Text>
                <Pressable
                  style={[styles.apply, customKm.trim() === '' && styles.applyDisabled]}
                  onPress={applyCustom}
                  disabled={customKm.trim() === ''}
                  accessibilityRole="button"
                >
                  <Text style={styles.applyText}>{t('apply')}</Text>
                </Pressable>
              </View>
              <Text style={[styles.hint, customInvalid && styles.hintInvalid]}>
                {t('radiusRange')}
              </Text>
            </Section>

            <Section title={t('categories')}>
              {FILTERS.map((item) => (
                <Row
                  key={item}
                  icon={item === 'all' ? '🗺️' : CATEGORY_ICONS[item]}
                  iconColor={item === 'all' ? COLORS.primary : CATEGORY_COLORS[item]}
                  label={t(item)}
                  active={item === filter}
                  onPress={() => onFilterChange(item)}
                />
              ))}
            </Section>

            <Section title={t('travelMode')}>
              <View style={styles.wrap}>
                {MODES.map((item) => (
                  <Choice
                    key={item.mode}
                    label={`${item.icon} ${t(item.mode)}`}
                    active={item.mode === mode}
                    onPress={() => onModeChange(item.mode)}
                  />
                ))}
              </View>
            </Section>

            <Section title={t('language')}>
              <View style={styles.wrap}>
                {LANGUAGES.map(({ code, label }) => (
                  <Choice
                    key={code}
                    label={label}
                    active={code === lang}
                    onPress={() => setLang(code)}
                  />
                ))}
              </View>
            </Section>

            <Section title={t('about')}>
              <Text style={styles.aboutLabel}>{t('dataSource')}</Text>
              <Text style={styles.aboutValue}>{t(USES_GOOGLE ? 'dataGoogle' : 'dataFree')}</Text>
              <Text style={styles.aboutLabel}>{t('version')}</Text>
              <Text style={styles.aboutValue}>{APP_VERSION}</Text>
            </Section>
          </ScrollView>
        </View>

        <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel={t('close')} />
      </View>
    </Modal>
  );
}

function Section({
  title,
  value,
  children,
}: {
  title: string;
  value?: string;
  children: ReactNode;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {value ? <Text style={styles.sectionValue}>{value}</Text> : null}
      </View>
      {children}
    </View>
  );
}

function Choice({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={[styles.choice, active && styles.choiceActive]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
    >
      <Text style={[styles.choiceText, active && styles.choiceTextActive]}>{label}</Text>
    </Pressable>
  );
}

interface RowProps {
  icon: string;
  iconColor: string;
  label: string;
  active: boolean;
  onPress: () => void;
}

function Row({ icon, iconColor, label, active, onPress }: RowProps) {
  return (
    <Pressable
      style={[styles.row, active && styles.rowActive]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
    >
      <View style={[styles.rowIcon, { backgroundColor: iconColor }]}>
        <Text style={styles.rowIconText}>{icon}</Text>
      </View>
      <Text style={[styles.rowLabel, active && styles.rowLabelActive]}>{label}</Text>
      {active ? <Text style={styles.rowCheck}>✓</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    flexDirection: 'row',
  },
  drawer: {
    width: '84%',
    maxWidth: 340,
    backgroundColor: COLORS.surface,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  appName: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.primary,
  },
  close: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.background,
  },
  closeText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.muted,
  },
  section: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    color: COLORS.muted,
  },
  sectionValue: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.primary,
  },
  wrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  choice: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  choiceActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary,
  },
  choiceText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  choiceTextActive: {
    color: '#FFFFFF',
  },
  customRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
  },
  input: {
    flex: 1,
    minWidth: 0,
    height: 42,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    fontSize: 15,
    color: COLORS.text,
    backgroundColor: COLORS.surface,
  },
  inputInvalid: {
    borderColor: COLORS.danger,
  },
  unit: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.muted,
  },
  apply: {
    height: 42,
    paddingHorizontal: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
  },
  applyDisabled: {
    opacity: 0.4,
  },
  applyText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  hint: {
    marginTop: 6,
    fontSize: 12,
    color: COLORS.muted,
  },
  hintInvalid: {
    fontWeight: '700',
    color: COLORS.danger,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginHorizontal: -8,
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderRadius: 12,
  },
  rowActive: {
    backgroundColor: '#E7F5FF',
  },
  rowIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowIconText: {
    fontSize: 16,
  },
  rowLabel: {
    flex: 1,
    fontSize: 15,
    color: COLORS.text,
  },
  rowLabelActive: {
    fontWeight: '700',
    color: COLORS.primary,
  },
  rowCheck: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.primary,
  },
  aboutLabel: {
    fontSize: 12,
    color: COLORS.muted,
  },
  aboutValue: {
    marginBottom: 10,
    fontSize: 14,
    color: COLORS.text,
  },
});
