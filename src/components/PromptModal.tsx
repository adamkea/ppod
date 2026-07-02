import { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { HelperText, Surface, Text, useTheme } from 'react-native-paper';

import { Button } from './Button';
import { TextField } from './TextField';
import { radius, spacing } from '@/theme';

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
  const theme = useTheme();
  const [value, setValue] = useState(initialValue);

  useEffect(() => {
    if (visible) setValue(initialValue);
  }, [visible, initialValue]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        style={[styles.backdrop, { backgroundColor: theme.colors.backdrop }]}
        onPress={onClose}
      >
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <Pressable onPress={(e) => e.stopPropagation()}>
            <Surface mode="flat" elevation={3} style={styles.sheet}>
              <Text variant="titleLarge">{title}</Text>
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
              {error ? (
                <HelperText type="error" visible style={styles.error}>
                  {error}
                </HelperText>
              ) : null}
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
            </Surface>
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  sheet: {
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  error: { paddingHorizontal: 0 },
  actions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.xs },
  action: { flex: 1 },
});
