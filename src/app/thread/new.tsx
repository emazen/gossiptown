import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { S } from '@/constants/strings';
import { Display, Spacing, Type } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { createThread } from '@/hooks/use-threads';
import { friendlyError } from '@/lib/errors';
import { checkContent } from '@/lib/profanity';
import { useNeighborhood } from '@/providers/neighborhood';
import { useSession } from '@/providers/session';

const TITLE_MAX = 120;
const BODY_MAX = 2000;

export default function NewThread() {
  const t = useTheme();
  const router = useRouter();
  const { userId } = useSession();
  const { neighborhood } = useNeighborhood();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);

  const canPost = title.trim().length >= 3 && !busy;

  const post = async () => {
    if (!canPost || !userId || !neighborhood) return;
    const check = checkContent(`${title}\n${body}`);
    if (!check.ok) {
      Alert.alert(check.reason === 'doxxing' ? S.report.reasons.doxxing : S.errors.profanity);
      return;
    }
    setBusy(true);
    try {
      const id = await createThread(neighborhood.id, userId, title.trim(), body.trim() || null);
      router.replace({ pathname: '/thread/[id]', params: { id } });
    } catch (e) {
      Alert.alert(friendlyError(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView edges={['top', 'bottom']} style={[styles.root, { backgroundColor: t.background }]}>
      <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.topBar}>
          <Pressable onPress={() => router.back()} hitSlop={12} accessibilityLabel={S.actions.cancel}>
            <Ionicons name="close" size={24} color={t.text} />
          </Pressable>
          <Text style={[Type.name, { color: t.text }]}>{S.threads.newThread}</Text>
          <Text style={[Type.meta, styles.place, { color: t.textSecondary }]} numberOfLines={1}>
            {neighborhood?.name}
          </Text>
        </View>

        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder={S.threads.titlePlaceholder}
          placeholderTextColor={t.textTertiary}
          maxLength={TITLE_MAX}
          multiline
          autoFocus
          style={[styles.title, { color: t.text }]}
        />
        <TextInput
          value={body}
          onChangeText={setBody}
          placeholder={S.threads.bodyPlaceholder}
          placeholderTextColor={t.textTertiary}
          maxLength={BODY_MAX}
          multiline
          style={[styles.body, { color: t.text }]}
        />

        <View style={[styles.footer, { borderTopColor: t.border }]}>
          <Text style={[styles.counter, { color: t.textTertiary }]}>
            {title.length}/{TITLE_MAX}
          </Text>
          <Button onPress={post} disabled={!canPost} loading={busy} style={styles.postBtn}>
            {S.threads.post}
          </Button>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
  },
  place: { marginLeft: 'auto', maxWidth: 140 },
  title: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
    fontFamily: Display.bold,
    fontSize: 28,
    lineHeight: 32,
    letterSpacing: -0.8,
  },
  body: { flex: 1, paddingHorizontal: Spacing.xl, paddingTop: Spacing.md, fontSize: 17, lineHeight: 26, textAlignVertical: 'top' },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  counter: { fontSize: 13, fontVariant: ['tabular-nums'] },
  postBtn: { height: 44, paddingHorizontal: Spacing.xl },
});
