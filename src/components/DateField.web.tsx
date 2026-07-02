import { createElement } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';

import { toISODate } from '@/lib/dates';
import { radius, spacing } from '@/theme';
import type { DateFieldProps } from './DateField';

// Web implementation: a real <input type="date"> gives a proper, accessible
// browser date picker instead of relying on the native module's web shim.
// Styled to sit alongside Paper's outlined text inputs.
export function DateField({ label = 'Date', value, onChange, maximumDate }: DateFieldProps) {
  const theme = useTheme();
  return (
    <View style={styles.wrap}>
      <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant }}>
        {label}
      </Text>
      {createElement('input', {
        type: 'date',
        value,
        max: maximumDate ? toISODate(maximumDate) : undefined,
        onChange: (e: { target: { value: string } }) => {
          if (e.target.value) onChange(e.target.value);
        },
        style: {
          backgroundColor: theme.colors.surfaceVariant,
          color: theme.colors.onSurface,
          border: `1px solid ${theme.colors.outline}`,
          borderRadius: radius.md,
          minHeight: 50,
          padding: `0 ${spacing.md}px`,
          fontSize: 15,
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
});
