import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback } from 'react';
import { ActivityIndicator, Alert, FlatList, KeyboardAvoidingView, Platform, StyleSheet, Text, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { Composer } from '@/components/composer';
import { EmptyState } from '@/components/empty-state';
import { S } from '@/constants/strings';
import { Spacing, Type } from '@/constants/theme';
import { useContentActions } from '@/hooks/use-content-actions';
import { useThreadDetail } from '@/hooks/use-replies';
import { useTheme } from '@/hooks/use-theme';
import type { ReplyWithAuthor } from '@/lib/database.types';
import { friendlyError } from '@/lib/errors';
import { checkContent } from '@/lib/profanity';
import { timeAgo } from '@/lib/time';
import { useSession } from '@/providers/session';
import { Pressable } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

export default function ThreadScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const t = useTheme();
  const router = useRouter();
  const { userId } = useSession();
  const { thread, replies, loading, error, reply, removeReply, hideAuthor } = useThreadDetail(id, userId);
  const actions = useContentActions();
  const insets = useSafeAreaInsets();

  const onSend = useCallback(
    async (text: string) => {
      const check = checkContent(text);
      if (!check.ok) {
        Alert.alert(check.reason === 'doxxing' ? S.report.reasons.doxxing : S.errors.profanity);
        return;
      }
      try {
        await reply(text);
      } catch (e) {
        Alert.alert(friendlyError(e));
      }
    },
    [reply],
  );

  const renderReply = useCallback(
    ({ item }: { item: ReplyWithAuthor }) => {
      const isOp = thread?.user_id === item.user_id;
      const mine = item.user_id === userId;
      return (
        <Pressable
          onLongPress={() =>
            actions.open({
              type: 'reply',
              id: item.id,
              authorId: item.user_id,
              onBlocked: hideAuthor,
              onDelete: () => removeReply(item.id),
            })
          }
          delayLongPress={300}
          style={[styles.reply, { borderBottomColor: t.border }]}>
          {item.author && <Avatar nickname={item.author.nickname} hue={item.author.avatar_hue} url={item.author.avatar_url} size={28} />}
          <View style={styles.replyBody}>
            <View style={styles.replyMeta}>
              <Text style={[Type.label, { color: t.text }]}>{item.author?.nickname ?? '…'}</Text>
              {isOp && <Text style={[Type.meta, { color: t.accent }]}>{S.threads.op}</Text>}
              {mine && !isOp && <Text style={[Type.meta, { color: t.textTertiary }]}>{S.threads.mine}</Text>}
              <Text style={[Type.meta, styles.replyTime, { color: t.textTertiary }]}>{timeAgo(item.created_at)}</Text>
            </View>
            <Text style={[Type.body, { color: t.text }]}>{item.body}</Text>
          </View>
        </Pressable>
      );
    },
    [thread?.user_id, userId, actions, hideAuthor, removeReply, t],
  );

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: t.background }]}>
        <ActivityIndicator color={t.accent} />
      </View>
    );
  }

  if (!thread) {
    return (
      <View style={[styles.center, { backgroundColor: t.background }]}>
        <EmptyState icon="eye-off-outline" text={error ?? 'Bu konu artık görünmüyor.'} />
      </View>
    );
  }

  return (
    <SafeAreaView edges={['bottom']} style={[styles.flex, { backgroundColor: t.background }]}>
      <Stack.Screen options={{ title: '', headerBackTitle: S.threads.title }} />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top + 44 : 0}>
        <FlatList
          data={replies}
          keyExtractor={(x) => x.id}
          renderItem={renderReply}
          contentContainerStyle={styles.list}
          keyboardDismissMode="interactive"
          ListHeaderComponent={
            <Pressable
              onLongPress={() =>
                actions.open({
                  type: 'thread',
                  id: thread.id,
                  authorId: thread.user_id,
                  onBlocked: () => router.back(),
                  onDelete: () => router.back(),
                })
              }
              delayLongPress={300}
              style={[styles.head, { borderBottomColor: t.border }]}>
              <View style={styles.headMeta}>
                {thread.author && <Avatar nickname={thread.author.nickname} hue={thread.author.avatar_hue} url={thread.author.avatar_url} size={22} />}
                <Text style={[Type.meta, { color: t.textSecondary }]}>
                  <Text style={{ color: t.text }}>{thread.author?.nickname ?? '…'}</Text>
                  {`  ·  ${timeAgo(thread.created_at)}`}
                </Text>
              </View>
              <Text style={[Type.headline, { color: t.text }]}>{thread.title}</Text>
              {thread.body ? <Text style={[styles.body, { color: t.text }]}>{thread.body}</Text> : null}
              <Text style={[Type.label, styles.count, { color: t.textSecondary }]}>
                {thread.reply_count > 0 ? S.threads.replies(thread.reply_count) : S.threads.noReplies}
              </Text>
            </Pressable>
          }
        />
        <Composer placeholder={S.threads.replyPlaceholder} maxLength={1000} onSend={onSend} />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { paddingBottom: Spacing.xl },
  head: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.lg,
    gap: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headMeta: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  body: { fontSize: 17, lineHeight: 26 },
  count: { marginTop: Spacing.xs },
  reply: {
    flexDirection: 'row',
    gap: Spacing.md,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  replyBody: { flex: 1, gap: 4 },
  replyMeta: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  replyTime: { marginLeft: 'auto' },
});
