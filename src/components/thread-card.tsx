import { Ionicons } from '@expo/vector-icons';
import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { S } from '@/constants/strings';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { ThreadWithAuthor } from '@/lib/database.types';
import { timeAgo } from '@/lib/time';

type Props = { thread: ThreadWithAuthor; onPress: () => void; onLongPress: () => void };

export const ThreadCard = memo(function ThreadCard({ thread, onPress, onLongPress }: Props) {
  const t = useTheme();
  const a = thread.author;
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={300}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: pressed ? t.surfaceElevated : t.surface, borderColor: t.border },
      ]}>
      <View style={styles.meta}>
        {a && <Avatar nickname={a.nickname} hue={a.avatar_hue} size={22} />}
        <Text style={[styles.metaText, { color: t.textSecondary }]} numberOfLines={1}>
          {a?.nickname ?? '…'} · {timeAgo(thread.created_at)}
        </Text>
      </View>
      <Text style={[styles.title, { color: t.text }]}>{thread.title}</Text>
      {thread.body ? (
        <Text style={[styles.body, { color: t.textSecondary }]} numberOfLines={3}>
          {thread.body}
        </Text>
      ) : null}
      <View style={styles.footer}>
        <Ionicons name="chatbubble-outline" size={14} color={t.textTertiary} />
        <Text style={[styles.footerText, { color: t.textTertiary }]}>
          {thread.reply_count > 0 ? S.threads.replies(thread.reply_count) : S.threads.noReplies}
        </Text>
        {thread.reply_count > 0 && (
          <Text style={[styles.footerText, { color: t.textTertiary }]}>· {timeAgo(thread.last_activity_at)}</Text>
        )}
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  card: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    padding: Spacing.lg,
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    gap: Spacing.sm,
  },
  meta: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  metaText: { fontSize: 12, fontWeight: '600', flexShrink: 1 },
  title: { fontSize: 17, fontWeight: '700', lineHeight: 23 },
  body: { fontSize: 14, lineHeight: 20 },
  footer: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginTop: Spacing.xs },
  footerText: { fontSize: 12 },
});
