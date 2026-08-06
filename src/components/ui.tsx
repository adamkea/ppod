import {
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { ActivityIndicator, Icon, Text } from 'react-native-paper';

import { colors, fonts, radius, spacing } from '@/theme';

// Flat panel with a hairline border instead of elevation; pressing brightens
// the border and tints the surface so touch feedback stays in the same
// material rather than lifting off the table.
export function Card({
  children,
  style,
  onPress,
  disabled,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  disabled?: boolean;
}) {
  if (!onPress) {
    return <View style={[styles.card, styles.cardContent, style]}>{children}</View>;
  }
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.card,
        styles.cardContent,
        pressed && styles.cardPressed,
        style,
      ]}
    >
      {children}
    </Pressable>
  );
}

// Small mono uppercase label for section headings: the ledger's column-header
// voice, shared by every screen so the rhythm stays identical.
export function SectionLabel({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<TextStyle>;
}) {
  return <Text style={[styles.sectionLabel, style]}>{children}</Text>;
}

export function Loading({ label }: { label?: string }) {
  return (
    <View style={styles.center}>
      <ActivityIndicator color={colors.primary} />
      {label ? (
        <Text variant="bodyMedium" style={styles.muted}>
          {label}
        </Text>
      ) : null}
    </View>
  );
}

export function EmptyState({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <View style={styles.center}>
      <Icon source="cards-outline" size={28} color={colors.textMuted} />
      <Text variant="titleMedium" style={styles.centeredText}>
        {title}
      </Text>
      {subtitle ? (
        <Text variant="bodyMedium" style={styles.muted}>
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}

export function ErrorState({ message }: { message?: string }) {
  return (
    <View style={styles.center}>
      <Text variant="titleMedium" style={{ color: colors.danger }}>
        Something went wrong
      </Text>
      {message ? (
        <Text variant="bodyMedium" style={styles.muted}>
          {message}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  cardPressed: {
    borderColor: colors.borderStrong,
    backgroundColor: colors.surfaceAlt,
  },
  cardContent: {
    padding: spacing.lg,
  },
  sectionLabel: {
    fontFamily: fonts.mono,
    fontSize: 11,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: colors.textMuted,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.xl,
  },
  centeredText: { textAlign: 'center' },
  muted: { color: colors.textMuted, textAlign: 'center', maxWidth: 300 },
});
