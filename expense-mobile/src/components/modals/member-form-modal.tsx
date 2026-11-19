import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { IconClose } from '@/components/icons';
import { useLedger } from '@/context/ledger-context';
import { useAppTheme } from '@/context/theme-context';
import { bottomSafePad, R } from '@/design/tokens';
import { saveMember } from '@/lib/actions';

export function MemberFormModal() {
  const { C, T } = useAppTheme();
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
      setError("Enter the member's name");
      return;
    }
    setError('');
    setPending(true);
    const res = await saveMember({ id: member?.id, name, contact, notes });
    setPending(false);
    if (!res.ok) {
      setError(res.error || 'Could not save member');
      return;
    }
    await refresh(true);
    showToast(editing ? 'Member updated' : 'Member added');
    closeMemberForm();
  }

  const inputTheme = {
    borderColor: C.lineStrong,
    color: C.ink,
    backgroundColor: C.surface,
  };

  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={closeMemberForm}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={[styles.backdrop, { backgroundColor: C.scrim }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={() => !pending && closeMemberForm()} />
        <View style={[styles.sheet, { backgroundColor: C.surface }]}>
          <View style={[styles.handle, { backgroundColor: C.lineStrong }]} />
          <View style={[styles.header, { borderBottomColor: C.line }]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.title, { color: C.ink }]}>
                {editing ? 'Edit member' : 'Add member'}
              </Text>
              <Text style={[styles.subtitle, { color: C.muted }]}>
                {editing ? "Update this person's details." : 'Add someone you share expenses with.'}
              </Text>
            </View>
            <Pressable
              accessibilityLabel="Close"
              onPress={closeMemberForm}
              style={[styles.closeBtn, { backgroundColor: C.sunken }]}>
              <IconClose size={13} color={C.ink2} />
            </Pressable>
          </View>

          <ScrollView
            style={styles.body}
            contentContainerStyle={{ gap: 16, paddingBottom: 12 }}
            keyboardShouldPersistTaps="handled">
            <View style={styles.field}>
              <Text style={T.micro}>Full name</Text>
              <TextInput
                value={name}
                onChangeText={setName}
                maxLength={120}
                placeholder="e.g. Marco"
                placeholderTextColor={C.faint}
                style={[styles.input, inputTheme, Boolean(error) && { borderColor: C.owed }]}
              />
              {error ? <Text style={[styles.errorText, { color: C.owed }]}>{error}</Text> : null}
            </View>

            <View style={styles.field}>
              <Text style={T.micro}>Contact (optional)</Text>
              <Text style={[styles.hint, { color: C.muted }]}>
                Phone number, email or messenger handle
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
          </ScrollView>

          <View style={[styles.footer, { borderTopColor: C.line }]}>
            <Pressable
              disabled={pending}
              onPress={closeMemberForm}
              style={({ pressed }) => [
                styles.cancelBtn,
                { borderColor: C.lineStrong },
                pressed && { opacity: 0.8 },
              ]}>
              <Text style={[styles.cancelBtnText, { color: C.ink }]}>Cancel</Text>
            </Pressable>
            <Pressable
              disabled={pending}
              onPress={handleSubmit}
              style={({ pressed }) => [
                styles.submitBtn,
                { backgroundColor: C.ink },
                pressed && { opacity: 0.85 },
                pending && { opacity: 0.5 },
              ]}>
              {pending && (
                <ActivityIndicator size="small" color={C.onInk} style={{ marginRight: 6 }} />
              )}
              <Text style={[styles.submitBtnText, { color: C.onInk }]}>
                {editing ? 'Save changes' : 'Add member'}
              </Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: R.xl,
    borderTopRightRadius: R.xl,
    maxHeight: '90%',
    width: '100%',
    maxWidth: 540,
    alignSelf: 'center',
    overflow: 'hidden',
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: R.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  field: {
    gap: 6,
  },
  hint: {
    fontSize: 11.5,
    marginTop: -2,
  },
  input: {
    height: 44,
    borderRadius: R.md,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 15,
  },
  textarea: {
    height: 84,
    paddingTop: 10,
    textAlignVertical: 'top',
  },
  errorText: {
    fontSize: 12.5,
    marginTop: 2,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: bottomSafePad,
    borderTopWidth: 1,
  },
  cancelBtn: {
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: R.md,
    borderWidth: 1,
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: R.md,
  },
  submitBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
