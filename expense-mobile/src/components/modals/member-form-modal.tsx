import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IconClose } from '@/components/icons';
import { BottomSheet, ErrorBanner } from '@/components/mobile-ui';
import { useLedger } from '@/context/ledger-context';
import { useAppTheme } from '@/context/theme-context';
import { bottomSafePad, METRICS, R } from '@/design/tokens';
import { saveMember } from '@/lib/actions';

export function MemberFormModal() {
  const { C, T } = useAppTheme();
  const insets = useSafeAreaInsets();
  const { memberFormState, closeMemberForm, refresh, showToast } = useLedger();
  const { open, member } = memberFormState;
  const editing = Boolean(member);

  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (open) {
      setName(member?.name ?? '');
      setContact(member?.contact ?? '');
      setNotes(member?.notes ?? '');
      setError('');
    }
  }, [open, member]);

  async function handleSubmit() {
    if (!name.trim()) {
      setError("Enter the person's name");
      return;
    }
    setError('');
    setPending(true);
    const res = await saveMember({ id: member?.id, name, contact, notes });
    setPending(false);
    if (!res.ok) {
      setError(res.error || 'Could not save person');
      return;
    }
    await refresh(true);
    showToast(editing ? 'Person updated' : 'Person added');
    closeMemberForm();
  }

  const inputTheme = {
    borderColor: C.line,
    color: C.ink,
    backgroundColor: C.surface,
  };

  const sheetHeader = (
    <View style={[styles.header, { borderBottomColor: C.line }]}>
      <View style={{ flex: 1 }}>
        <Text style={[styles.title, { color: C.ink }]}>
          {editing ? 'Edit person' : 'Add person'}
        </Text>
        <Text style={[styles.subtitle, { color: C.muted }]}>
          {editing ? "Update this person's details." : 'Add someone you share expenses with.'}
        </Text>
      </View>
      <Pressable
        accessibilityLabel="Close"
        hitSlop={4}
        onPress={closeMemberForm}
        style={[styles.closeBtn, { backgroundColor: C.sunken }]}>
        <IconClose size={16} color={C.ink} />
      </Pressable>
    </View>
  );

  return (
    <BottomSheet
      open={open}
      onClose={closeMemberForm}
      dismissible={!pending}
      avoidKeyboard
      header={sheetHeader}>
      <ScrollView
        style={styles.body}
        contentContainerStyle={{ gap: 18, paddingBottom: 16 }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}>
        <View style={styles.field}>
          <Text style={T.micro}>Full name</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            maxLength={120}
            placeholder="e.g. Marco Santos"
            placeholderTextColor={C.faint}
            style={[styles.input, inputTheme, Boolean(error) && { borderColor: C.danger }]}
          />
        </View>

        <View style={styles.field}>
          <Text style={T.micro}>Contact (optional)</Text>
          <Text style={[styles.hint, { color: C.muted }]}>
            Phone number, GCash, or handle
          </Text>
          <TextInput
            value={contact}
            onChangeText={setContact}
            maxLength={200}
            placeholder="e.g. 0917 123 4567"
            placeholderTextColor={C.faint}
            style={[styles.input, inputTheme]}
          />
        </View>

        <View style={styles.field}>
          <Text style={T.micro}>Notes (optional)</Text>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            maxLength={1000}
            multiline
            numberOfLines={3}
            placeholder="Optional notes"
            placeholderTextColor={C.faint}
            style={[styles.input, inputTheme, styles.textarea]}
          />
        </View>

        <ErrorBanner message={error} />
      </ScrollView>

      <View
        style={[
          styles.footer,
          {
            borderTopColor: C.line,
            paddingBottom: Math.max(insets.bottom, bottomSafePad),
          },
        ]}>
        <Pressable
          disabled={pending}
          onPress={handleSubmit}
          style={({ pressed }) => [
            styles.submitBtn,
            { backgroundColor: C.ink },
            pressed && { opacity: 0.88, transform: [{ scale: 0.99 }] },
            pending && { opacity: 0.45 },
          ]}>
          {pending && (
            <ActivityIndicator size="small" color={C.onInk} style={{ marginRight: 8 }} />
          )}
          <Text style={[styles.submitBtnText, { color: C.onInk }]}>
            {editing ? 'Save changes' : 'Add person'}
          </Text>
        </Pressable>
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 14,
    borderBottomWidth: 1,
    gap: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: R.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    paddingHorizontal: 20,
    paddingTop: 18,
  },
  field: {
    gap: 8,
  },
  hint: {
    fontSize: 12.5,
    marginTop: -4,
  },
  input: {
    minHeight: METRICS.touchMin,
    borderRadius: R.md,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 15,
  },
  textarea: {
    height: 88,
    paddingTop: 12,
    textAlignVertical: 'top',
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 14,
    borderTopWidth: 1,
  },
  submitBtn: {
    height: METRICS.buttonHeight,
    borderRadius: R.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnText: {
    fontSize: 15.5,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
});
