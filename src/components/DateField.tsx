import DateTimePicker, {
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { formatDateHeading, fromISODate, toISODate } from '@/lib/dates';
import { colors, fontSize, radius, spacing } from '@/theme';

export interface DateFieldProps {
  label?: string;
  value: string; // YYYY-MM-DD
  onChange: (iso: string) => void;
  maximumDate?: Date;
}

// Native implementation. The web build resolves DateField.web.tsx instead.
export function DateField({ label = 'Date', value, onChange, maximumDate }: DateFieldProps) {
  const [show, setShow] = useState(false);

  function handleChange(event: DateTimePickerEvent, date?: Date) {
    if (Platform.OS === 'android') setShow(false);
    if (event.type === 'set' && date) onChange(toISODate(date));
  }

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <Pressable style={styles.button} onPress={() => setShow((v) => !v)}>
        <Text style={styles.text}>{formatDateHeading(value)}</Text>
      </Pressable>
      {show ? (
        <DateTimePicker
          value={fromISODate(value)}
          mode="date"
          maximumDate={maximumDate}
          display={Platform.OS === 'ios' ? 'inline' : 'default'}
          themeVariant="dark"
          onChange={handleChange}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.xs },
  label: { color: colors.textMuted, fontSize: fontSize.sm, fontWeight: '600' },
  button: {
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    minHeight: 48,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  text: { color: colors.text, fontSize: fontSize.md },
});
