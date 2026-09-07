import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { S } from '@/constants/strings';
import { Spacing } from '@/constants/theme';
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
            <Ionicons name="close" size={26} color={t.textSecondary} />
          </Pressable>
          <Text style={[styles.topTitle, { color: t.text }]}>{S.threads.newThread}</Text>
          <Text style={[styles.place, { color: t.textTertiary }]} numberOfLines={1}>
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
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  topTitle: { fontSize: 17, fontWeight: '700' },
  place: { marginLeft: 'auto', fontSize: 13, fontWeight: '600', maxWidth: 140 },
  title: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    fontSize: 24,
    fontWeight: '800',
    lineHeight: 30,
    letterSpacing: -0.3,
  },
  body: { flex: 1, paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, fontSize: 17, lineHeight: 24, textAlignVertical: 'top' },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  counter: { fontSize: 13 },
  postBtn: { height: 44, paddingHorizontal: Spacing.xl },
});
