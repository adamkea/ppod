import { createElement } from 'react';
import { StyleSheet, View } from 'react-native';
import { TextInput } from 'react-native-paper';

import { formatDateHeading, toISODate } from '@/lib/dates';
import type { DateFieldProps } from './DateField';

// Web implementation. The visible field is the same Paper outlined TextInput
// the native version (and every other field on the form) uses, so it matches
// them exactly. An invisible <input type="date"> stretched over it captures
// taps and opens the browser's own date picker.
export function DateField({ label = 'Date', value, onChange, maximumDate }: DateFieldProps) {
  return (
    <View style={styles.wrap}>
      <View pointerEvents="none">
        <TextInput
          mode="outlined"
          label={label}
          value={formatDateHeading(value)}
          editable={false}
          right={<TextInput.Icon icon="calendar" />}
        />
      </View>
      {createElement('input', {
        type: 'date',
        value,
        max: maximumDate ? toISODate(maximumDate) : undefined,
        'aria-label': label,
        onChange: (e: { target: { value: string } }) => {
          if (e.target.value) onChange(e.target.value);
        },
        // Chrome needs an explicit nudge to open the picker on click; other
        // browsers open it from the click on the input itself.
        onClick: (e: { currentTarget: { showPicker?: () => void } }) => {
          try {
            e.currentTarget.showPicker?.();
          } catch {
            // Not allowed (e.g. no user gesture) — the input still works.
          }
        },
        style: {
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          opacity: 0,
          border: 'none',
          padding: 0,
          cursor: 'pointer',
        },
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'relative' },
});
