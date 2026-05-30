import { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Button } from './Button';
import { TextField } from './TextField';
import { colors, fontSize, radius, spacing } from '@/theme';

interface PromptModalProps {
  visible: boolean;
  title: string;
  label?: string;
  placeholder?: string;
  initialValue?: string;
  submitLabel?: string;
  autoCapitalize?: 'none' | 'characters' | 'words' | 'sentences';
  submitting?: boolean;
  error?: string | null;
  onSubmit: (value: string) => void;
  onClose: () => void;
}

export function PromptModal({
  visible,
  title,
  label,
  placeholder,
  initialValue = '',
  submitLabel = 'Save',
  autoCapitalize = 'sentences',
  submitting = false,
  error,
  onSubmit,
  onClose,
}: PromptModalProps) {
  const [value, setValue] = useState(initialValue);

  useEffect(() => {
    if (visible) setValue(initialValue);
  }, [visible, initialValue]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.title}>{title}</Text>
            <TextField
              label={label}
              value={value}
              onChangeText={setValue}
              placeholder={placeholder}
              autoCapitalize={autoCapitalize}
              autoFocus
              onSubmitEditing={() => value.trim() && onSubmit(value.trim())}
              returnKeyType="done"
            />
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <View style={styles.actions}>
              <Button label="Cancel" variant="secondary" onPress={onClose} style={styles.action} />
              <Button
                label={submitLabel}
                onPress={() => onSubmit(value.trim())}
                disabled={!value.trim()}
                loading={submitting}
                style={styles.action}
              />
            </View>
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  sheet: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.md,
  },
  title: { color: colors.text, fontSize: fontSize.lg, fontWeight: '700' },
  error: { color: colors.danger, fontSize: fontSize.sm },
  actions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.xs },
  action: { flex: 1 },
});
