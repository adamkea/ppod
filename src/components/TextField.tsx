import { forwardRef } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';

import { colors, fontSize, radius, spacing } from '@/theme';

interface TextFieldProps extends TextInputProps {
  label?: string;
}

export const TextField = forwardRef<TextInput, TextFieldProps>(
  ({ label, style, ...props }, ref) => {
    return (
      <View style={styles.wrap}>
        {label ? <Text style={styles.label}>{label}</Text> : null}
        <TextInput
          ref={ref}
          placeholderTextColor={colors.textMuted}
          style={[styles.input, style]}
          {...props}
        />
      </View>
    );
  },
);

TextField.displayName = 'TextField';

const styles = StyleSheet.create({
  wrap: { gap: spacing.xs },
  label: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  input: {
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    minHeight: 48,
    color: colors.text,
    fontSize: fontSize.md,
  },
});
