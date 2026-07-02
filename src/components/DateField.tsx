import DateTimePicker, {
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { TextInput } from 'react-native-paper';

import { formatDateHeading, fromISODate, toISODate } from '@/lib/dates';
import { spacing } from '@/theme';

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
      <Pressable onPress={() => setShow((v) => !v)}>
        <View pointerEvents="none">
          <TextInput
            mode="outlined"
            label={label}
            value={formatDateHeading(value)}
            editable={false}
            right={<TextInput.Icon icon="calendar" />}
          />
        </View>
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
});
