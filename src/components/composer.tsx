import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Props = {
  placeholder: string;
  maxLength: number;
  onSend: (text: string) => Promise<void>;
  disabled?: boolean;
};

export function Composer({ placeholder, maxLength, onSend, disabled }: Props) {
  const t = useTheme();
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const canSend = text.trim().length > 0 && !sending && !disabled;

  const submit = async () => {
    if (!canSend) return;
    const value = text.trim();
    setSending(true);
    try {
      await onSend(value);
      setText('');
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    } finally {
      setSending(false);
    }
  };

  return (
    <View style={[styles.bar, { backgroundColor: t.surface, borderTopColor: t.border }]}>
      <TextInput
        value={text}
        onChangeText={setText}
        placeholder={placeholder}
        placeholderTextColor={t.textTertiary}
        maxLength={maxLength}
        multiline
        style={[styles.input, { color: t.text, backgroundColor: t.surfaceElevated }]}
        editable={!disabled}
      />
      <Pressable
        onPress={submit}
        disabled={!canSend}
        hitSlop={8}
        style={[styles.send, { backgroundColor: canSend ? t.accent : t.surfaceElevated }]}
        accessibilityLabel="Gönder">
        {sending ? (
          <ActivityIndicator color={t.onAccent} size="small" />
        ) : (
          <Ionicons name="arrow-up" size={20} color={canSend ? t.onAccent : t.textTertiary} />
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 120,
    paddingHorizontal: Spacing.lg,
    paddingTop: 10,
    paddingBottom: 10,
    borderRadius: Radius.lg,
    fontSize: 16,
    lineHeight: 20,
  },
  send: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
});
