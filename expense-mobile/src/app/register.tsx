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
import { registerUser } from '@/lib/actions';

export default function RegisterScreen() {
  const router = useRouter();
  const { setAuthenticatedUser, showToast } = useLedger();
  const { C, T } = useAppTheme();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);

  async function handleRegister() {
    setError('');
    setPending(true);
    const res = await registerUser({ name, email, password, confirmPassword });
    setPending(false);

    if (!res.ok || !res.user) {
      setError(res.error || 'Could not create account.');
      return;
    }

    await setAuthenticatedUser(res.user);
    showToast('Account created');
    router.replace('/');
  }

  const inputThemeStyle = {
    borderColor: C.lineStrong,
    color: C.ink,
    backgroundColor: C.surface,
  };

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
              <Text style={T.micro}>Solvent</Text>
              <Text style={[styles.title, { color: C.ink }]}>Create account</Text>
              <Text style={[styles.subtitle, { color: C.muted }]}>
                Your ledger is saved locally in SQLite on this device.
              </Text>
            </View>

            <View style={styles.form}>
              <View style={styles.field}>
                <Text style={T.micro}>Full name</Text>
                <TextInput
                  value={name}
                  onChangeText={setName}
                  maxLength={120}
                  placeholder="e.g. Bless Cahiles"
                  placeholderTextColor={C.faint}
                  style={[styles.input, inputThemeStyle]}
                />
              </View>

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
                  style={[styles.input, inputThemeStyle]}
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
                  placeholder="At least 6 characters"
                  placeholderTextColor={C.faint}
                  style={[styles.input, inputThemeStyle]}
                />
              </View>

              <View style={styles.field}>
                <Text style={T.micro}>Confirm password</Text>
                <TextInput
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  placeholder="Re-enter password"
                  placeholderTextColor={C.faint}
                  onSubmitEditing={handleRegister}
                  style={[styles.input, inputThemeStyle]}
                />
              </View>

              <ErrorBanner message={error} />

              <Pressable
                disabled={pending}
                onPress={handleRegister}
                style={({ pressed }) => [
                  styles.submitBtn,
                  { backgroundColor: C.ink },
                  pressed && { opacity: 0.88 },
                  pending && { opacity: 0.65 },
                ]}>
                {pending && <ActivityIndicator size="small" color={C.onInk} style={{ marginRight: 8 }} />}
                <Text style={[styles.submitText, { color: C.onInk }]}>Create account</Text>
              </Pressable>
            </View>

            <View style={[styles.divider, { backgroundColor: C.line }]} />

            <View style={styles.switchRow}>
              <Text style={[styles.switchMuted, { color: C.muted }]}>Already have an account?</Text>
              <Pressable onPress={() => router.replace('/login')}>
                <Text style={[styles.switchLink, { color: C.ink }]}>Sign in</Text>
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
    marginBottom: 20,
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
  subtitle: {
    fontSize: 12.5,
    lineHeight: 18,
    marginTop: 2,
  },
  form: {
    gap: 14,
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
    marginTop: 6,
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
