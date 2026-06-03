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
  const { signIn, signUp, resetPassword } = useAuth();
  const insets = useSafeAreaInsets();

  const [mode, setMode] = useState<'signin' | 'signup' | 'forgot'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const canSubmit =
    mode === 'forgot'
      ? email.trim().length > 0
      : email.trim().length > 0 && password.length >= 6;

  async function handleSubmit() {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    setNotice(null);
    try {
      if (mode === 'forgot') {
        await resetPassword(email);
        setNotice('Check your email for a password reset link.');
        setMode('signin');
      } else if (mode === 'signin') {
        await signIn(email, password);
      } else {
        const { needsConfirmation } = await signUp(email, password);
        if (needsConfirmation) {
          setNotice('Check your email to confirm your account, then sign in.');
          setMode('signin');
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.');
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
          <Text style={styles.subtitle}>
            {mode === 'forgot'
              ? "Enter your email and we'll send you a reset link."
              : 'Log your Magic games with the crew.'}
          </Text>
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
          {mode !== 'forgot' && (
            <TextField
              label="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              placeholder="At least 6 characters"
              textContentType={mode === 'signin' ? 'password' : 'newPassword'}
            />
          )}

          {error ? <Text style={styles.error}>{error}</Text> : null}
          {notice ? <Text style={styles.notice}>{notice}</Text> : null}

          <Button
            label={
              mode === 'forgot'
                ? 'Send reset link'
                : mode === 'signin'
                  ? 'Sign in'
                  : 'Create account'
            }
            onPress={handleSubmit}
            loading={submitting}
            disabled={!canSubmit}
          />

          {mode === 'signin' && (
            <Pressable
              onPress={() => {
                setError(null);
                setNotice(null);
                setMode('forgot');
              }}
              style={styles.switch}
            >
              <Text style={styles.switchText}>Forgot password?</Text>
            </Pressable>
          )}

          <Pressable
            onPress={() => {
              setMode((m) => (m === 'signup' ? 'signin' : 'signup'));
              setError(null);
              setNotice(null);
            }}
            style={styles.switch}
          >
            <Text style={styles.switchText}>
              {mode === 'signup'
                ? 'Already have an account? Sign in'
                : "Don't have an account? Sign up"}
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
