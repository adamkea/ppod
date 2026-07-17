import { createElement, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';

import { toISODate } from '@/lib/dates';
import { spacing } from '@/theme';
import type { DateFieldProps } from './DateField';

// Web implementation: a real <input type="date"> gives a proper, accessible
// browser date picker instead of relying on the native module's web shim.
// Dressed up as a Paper outlined text input (floating label notched into the
// border) so it matches the fields rendered next to it.
export function DateField({ label = 'Date', value, onChange, maximumDate }: DateFieldProps) {
  const theme = useTheme();
  const [focused, setFocused] = useState(false);
  const borderWidth = focused ? 2 : 1;

  return (
    <View style={styles.wrap}>
      {createElement('input', {
        type: 'date',
        value,
        max: maximumDate ? toISODate(maximumDate) : undefined,
        onChange: (e: { target: { value: string } }) => {
          if (e.target.value) onChange(e.target.value);
        },
        onFocus: () => setFocused(true),
        onBlur: () => setFocused(false),
        style: {
          backgroundColor: 'transparent',
          color: theme.colors.onSurface,
          border: `${borderWidth}px solid ${focused ? theme.colors.primary : theme.colors.outline}`,
          borderRadius: theme.roundness,
          // Paper's outlined inputs are 56px tall but inset the border box 6px
          // from the top to leave room for the floating label; mirror that so
          // this lines up with the field next to it.
          marginTop: 6,
          height: 50,
          // Compensate for the thicker focus border so the text doesn't shift.
          padding: `0 ${spacing.lg - borderWidth}px`,
          fontSize: 16,
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
          colorScheme: 'dark',
          width: '100%',
          boxSizing: 'border-box',
          outline: 'none',
        },
      })}
      <Text
        variant="bodySmall"
        style={[
          styles.label,
          {
            color: focused ? theme.colors.primary : theme.colors.onSurfaceVariant,
            backgroundColor: theme.colors.background,
          },
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'relative' },
  label: {
    position: 'absolute',
    // Centered on the border line, which sits 6px down (see marginTop above).
    top: -2,
    left: spacing.md,
    paddingHorizontal: spacing.xs,
    fontSize: 12,
    lineHeight: 16,
    zIndex: 1,
  },
});
