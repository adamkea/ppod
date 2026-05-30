import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { TextField } from '@/components/TextField';
import { useAuth } from '@/providers/AuthProvider';
import { colors, fontSize, spacing } from '@/theme';

export default function SignInScreen() {
  const { signIn, signUp } = useAuth();
  const insets = useSafeAreaInsets();

  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const canSubmit = email.trim().length > 0 && password.length >= 6;

  async function handleSubmit() {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    setNotice(null);
    try {
      if (mode === 'signin') {
        await signIn(email, password);
      } else {
        const { needsConfirmation } = await signUp(email, password);
        if (needsConfirmation) {
          setNotice('Check your email to confirm your account, then sign in.');
          setMode('signin');
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not sign in.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[
          styles.container,
          { paddingTop: insets.top + spacing.xxl, paddingBottom: insets.bottom + spacing.xl },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Text style={styles.title}>Pod Tracker</Text>
          <Text style={styles.subtitle}>Log your Magic games with the crew.</Text>
        </View>

        <View style={styles.form}>
          <TextField
            label="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            placeholder="you@example.com"
            textContentType="emailAddress"
          />
          <TextField
            label="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
            placeholder="At least 6 characters"
            textContentType={mode === 'signin' ? 'password' : 'newPassword'}
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}
          {notice ? <Text style={styles.notice}>{notice}</Text> : null}

          <Button
            label={mode === 'signin' ? 'Sign in' : 'Create account'}
            onPress={handleSubmit}
            loading={submitting}
            disabled={!canSubmit}
          />

          <Pressable
            onPress={() => {
              setMode((m) => (m === 'signin' ? 'signup' : 'signin'));
              setError(null);
              setNotice(null);
            }}
            style={styles.switch}
          >
            <Text style={styles.switchText}>
              {mode === 'signin'
                ? "Don't have an account? Sign up"
                : 'Already have an account? Sign in'}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  container: { flexGrow: 1, paddingHorizontal: spacing.lg, gap: spacing.xxl },
  header: { gap: spacing.sm },
  title: { color: colors.text, fontSize: fontSize.xxl, fontWeight: '800' },
  subtitle: { color: colors.textMuted, fontSize: fontSize.md },
  form: { gap: spacing.lg },
  error: { color: colors.danger, fontSize: fontSize.sm },
  notice: { color: colors.success, fontSize: fontSize.sm },
  switch: { alignItems: 'center', paddingVertical: spacing.sm },
  switchText: { color: colors.primary, fontSize: fontSize.md, fontWeight: '600' },
});
