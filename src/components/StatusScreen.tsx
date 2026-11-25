import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { COLORS } from '../config';

interface Props {
  icon?: string;
  title?: string;
  text: string;
  loading?: boolean;
  actionLabel?: string;
  onAction?: () => void;
}

/** Full-screen message used before the map can be shown (locating, no permission, errors). */
export function StatusScreen({ icon, title, text, loading, actionLabel, onAction }: Props) {
  return (
    <View style={styles.container}>
      {loading ? <ActivityIndicator size="large" color={COLORS.primary} /> : null}
      {icon ? <Text style={styles.icon}>{icon}</Text> : null}
      {title ? <Text style={styles.title}>{title}</Text> : null}
      <Text style={styles.text}>{text}</Text>
      {actionLabel && onAction ? (
        <Pressable style={styles.button} onPress={onAction} accessibilityRole="button">
          <Text style={styles.buttonText}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 32,
    backgroundColor: COLORS.background,
  },
  icon: {
    fontSize: 48,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    color: COLORS.text,
  },
  text: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    color: COLORS.muted,
  },
  button: {
    marginTop: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    backgroundColor: COLORS.primary,
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
