import {
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import {
  ActivityIndicator,
  Surface,
  Text,
  TouchableRipple,
  useTheme,
} from 'react-native-paper';

import { radius, spacing } from '@/theme';

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
  return (
    <Surface mode="flat" elevation={2} style={styles.card}>
      {onPress ? (
        <TouchableRipple onPress={onPress} disabled={disabled} borderless>
          <View style={[styles.cardContent, style]}>{children}</View>
        </TouchableRipple>
      ) : (
        <View style={[styles.cardContent, style]}>{children}</View>
      )}
    </Surface>
  );
}

export function Loading({ label }: { label?: string }) {
  return (
    <View style={styles.center}>
      <ActivityIndicator />
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
  const theme = useTheme();
  return (
    <View style={styles.center}>
      <Text variant="titleMedium" style={{ color: theme.colors.error }}>
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
    overflow: 'hidden',
  },
  cardContent: {
    padding: spacing.lg,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.xl,
  },
  centeredText: { textAlign: 'center' },
  muted: { opacity: 0.7, textAlign: 'center' },
});
