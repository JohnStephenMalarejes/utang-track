import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ErrorBanner } from '@/components/mobile-ui';
import { useLedger } from '@/context/ledger-context';
import { useAppTheme } from '@/context/theme-context';
import { R } from '@/design/tokens';
import { loginUser } from '@/lib/actions';

export default function LoginScreen() {
  const router = useRouter();
  const { setAuthenticatedUser, hasAccounts } = useLedger();
  const { C, T } = useAppTheme();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);

  async function handleSignIn() {
    setError('');
    setPending(true);
    const res = await loginUser({ email, password });
    setPending(false);

    if (!res.ok || !res.user) {
      setError(res.error || 'Incorrect email or password.');
      return;
    }

    await setAuthenticatedUser(res.user);
    router.replace('/');
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: C.paper }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <View
            style={[
              styles.card,
              { backgroundColor: C.surface, borderColor: C.line },
            ]}>
            <View style={styles.brandBlock}>
              <View
                style={[
                  styles.logoTile,
                  { backgroundColor: '#FFFFFF', borderColor: C.line },
                ]}>
                <Image
                  source={require('@/assets/images/logo-mark.png')}
                  style={styles.logo}
                  contentFit="contain"
                />
              </View>
              <Text style={T.micro}>Debt Tracker</Text>
              <Text style={[styles.title, { color: C.ink }]}>Sign in</Text>
              {!hasAccounts && (
                <Text style={[styles.firstTimeNote, { color: C.muted }]}>
                  First time on this device? Create an account below to start tracking.
                </Text>
              )}
            </View>

            <View style={styles.form}>
              <View style={styles.field}>
                <Text style={T.micro}>Email</Text>
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  placeholder="you@example.com"
                  placeholderTextColor={C.faint}
                  style={[
                    styles.input,
                    {
                      borderColor: error ? C.danger : C.lineStrong,
                      color: C.ink,
                      backgroundColor: C.surface,
                    },
                  ]}
                />
              </View>

              <View style={styles.field}>
                <View style={styles.labelRow}>
                  <Text style={T.micro}>Password</Text>
                  <Pressable onPress={() => setShowPassword((v) => !v)}>
                    <Text style={[styles.toggleText, { color: C.ink2 }]}>
                      {showPassword ? 'Hide' : 'Show'}
                    </Text>
                  </Pressable>
                </View>
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  placeholder="Enter password"
                  placeholderTextColor={C.faint}
                  onSubmitEditing={handleSignIn}
                  style={[
                    styles.input,
                    {
                      borderColor: error ? C.danger : C.lineStrong,
                      color: C.ink,
                      backgroundColor: C.surface,
                    },
                  ]}
                />
                <ErrorBanner message={error} />
              </View>

              <Pressable
                disabled={pending}
                onPress={handleSignIn}
                style={({ pressed }) => [
                  styles.submitBtn,
                  { backgroundColor: C.ink },
                  pressed && { opacity: 0.88 },
                  pending && { opacity: 0.65 },
                ]}>
                {pending && <ActivityIndicator size="small" color={C.onInk} style={{ marginRight: 8 }} />}
                <Text style={[styles.submitText, { color: C.onInk }]}>Sign in</Text>
              </Pressable>
            </View>

            <View style={[styles.divider, { backgroundColor: C.line }]} />

            <View style={styles.switchRow}>
              <Text style={[styles.switchMuted, { color: C.muted }]}>No account yet?</Text>
              <Pressable onPress={() => router.push('/register')}>
                <Text style={[styles.switchLink, { color: C.ink }]}>Create account</Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 28,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    alignSelf: 'center',
    borderRadius: R.lg,
    padding: 24,
    borderWidth: 1,
  },
  brandBlock: {
    marginBottom: 22,
    gap: 5,
  },
  logoTile: {
    width: 44,
    height: 44,
    borderRadius: R.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  logo: {
    width: 28,
    height: 28,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.6,
  },
  firstTimeNote: {
    fontSize: 12.5,
    lineHeight: 18,
    marginTop: 4,
  },
  form: {
    gap: 16,
  },
  field: {
    gap: 6,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toggleText: {
    fontSize: 11.5,
    fontWeight: '600',
  },
  input: {
    height: 46,
    borderRadius: R.md,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 15,
  },
  errorText: {
    fontSize: 12.5,
    marginTop: 2,
  },
  submitBtn: {
    height: 46,
    borderRadius: R.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  submitText: {
    fontSize: 15,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    marginVertical: 20,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  switchMuted: {
    fontSize: 13.5,
  },
  switchLink: {
    fontSize: 13.5,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
});
