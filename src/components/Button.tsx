import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { Button as PaperButton, useTheme } from 'react-native-paper';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: Variant;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

const modeByVariant = {
  primary: 'contained',
  secondary: 'contained-tonal',
  danger: 'outlined',
  ghost: 'text',
} as const;

export function Button({
  label,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  style,
}: ButtonProps) {
  const theme = useTheme();
  return (
    <PaperButton
      mode={modeByVariant[variant]}
      onPress={onPress}
      loading={loading}
      disabled={disabled || loading}
      textColor={variant === 'danger' ? theme.colors.error : undefined}
      style={[variant === 'danger' && { borderColor: theme.colors.error }, style]}
      contentStyle={styles.content}
      labelStyle={styles.label}
    >
      {label}
    </PaperButton>
  );
}

const styles = StyleSheet.create({
  content: { minHeight: 48 },
  label: { fontSize: 15, fontWeight: '600' },
});
