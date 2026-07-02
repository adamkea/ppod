import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { Button as PaperButton, Text, useTheme } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { TextField } from '@/components/TextField';
import { useAuth } from '@/providers/AuthProvider';
import { colors, spacing } from '@/theme';

export default function SignInScreen() {
  const { signIn, signUp, resetPassword } = useAuth();
  const insets = useSafeAreaInsets();
  const theme = useTheme();

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
          <Text variant="headlineLarge" style={styles.title}>
            Pod Tracker
          </Text>
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
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

          {error ? (
            <Text variant="bodySmall" style={{ color: theme.colors.error }}>
              {error}
            </Text>
          ) : null}
          {notice ? (
            <Text variant="bodySmall" style={{ color: colors.success }}>
              {notice}
            </Text>
          ) : null}

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
            <PaperButton
              mode="text"
              onPress={() => {
                setError(null);
                setNotice(null);
                setMode('forgot');
              }}
            >
              Forgot password?
            </PaperButton>
          )}

          <PaperButton
            mode="text"
            onPress={() => {
              setMode((m) => (m === 'signup' ? 'signin' : 'signup'));
              setError(null);
              setNotice(null);
            }}
          >
            {mode === 'signup'
              ? 'Already have an account? Sign in'
              : "Don't have an account? Sign up"}
          </PaperButton>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  container: { flexGrow: 1, paddingHorizontal: spacing.lg, gap: spacing.xxl },
  header: { gap: spacing.sm },
  title: { fontWeight: '800' },
  form: { gap: spacing.lg },
});
