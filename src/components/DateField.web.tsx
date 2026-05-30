import { createElement } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { toISODate } from '@/lib/dates';
import { colors, fontSize, radius, spacing } from '@/theme';
import type { DateFieldProps } from './DateField';

// Web implementation: a real <input type="date"> gives a proper, accessible
// browser date picker instead of relying on the native module's web shim.
export function DateField({ label = 'Date', value, onChange, maximumDate }: DateFieldProps) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      {createElement('input', {
        type: 'date',
        value,
        max: maximumDate ? toISODate(maximumDate) : undefined,
        onChange: (e: { target: { value: string } }) => {
          if (e.target.value) onChange(e.target.value);
        },
        style: {
          backgroundColor: colors.surfaceAlt,
          color: colors.text,
          border: `1px solid ${colors.border}`,
          borderRadius: radius.md,
          minHeight: 48,
          padding: `0 ${spacing.md}px`,
          fontSize: fontSize.md,
          fontFamily: 'inherit',
          colorScheme: 'dark',
          width: '100%',
          boxSizing: 'border-box',
        },
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.xs },
  label: { color: colors.textMuted, fontSize: fontSize.sm, fontWeight: '600' },
});
