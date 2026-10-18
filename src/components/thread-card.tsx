import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { S } from '@/constants/strings';
import { Spacing, Type } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { ThreadWithAuthor } from '@/lib/database.types';
import { timeAgo } from '@/lib/time';

type Props = { thread: ThreadWithAuthor; onPress: () => void; onLongPress: () => void };

/** One headline in the feed column: byline, serif title, standfirst, reply count. */
export const ThreadCard = memo(function ThreadCard({ thread, onPress, onLongPress }: Props) {
  const t = useTheme();
  const a = thread.author;
  const replies = thread.reply_count > 0 ? S.threads.replies(thread.reply_count) : S.threads.noReplies;
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={300}
      style={({ pressed }) => [styles.row, { backgroundColor: pressed ? t.surfaceElevated : 'transparent' }]}>
      <View style={styles.byline}>
        {a && <Avatar nickname={a.nickname} hue={a.avatar_hue} url={a.avatar_url} size={20} />}
        <Text style={[Type.meta, styles.bylineText, { color: t.textSecondary }]} numberOfLines={1}>
          <Text style={{ color: t.text }}>{a?.nickname ?? '…'}</Text>
          {`  ·  ${timeAgo(thread.created_at)}`}
        </Text>
      </View>
      <Text style={[Type.title, { color: t.text }]}>{thread.title}</Text>
      {thread.body ? (
        <Text style={[Type.small, { color: t.textSecondary }]} numberOfLines={2}>
          {thread.body}
        </Text>
      ) : null}
      <Text style={[Type.meta, styles.footer, { color: thread.reply_count > 0 ? t.accent : t.textTertiary }]}>
        {replies}
        {thread.reply_count > 0 ? (
          <Text style={{ color: t.textTertiary }}>{`  ·  ${timeAgo(thread.last_activity_at)}`}</Text>
        ) : null}
      </Text>
      <View style={[styles.rule, { backgroundColor: t.border }]} />
    </Pressable>
  );
});

const styles = StyleSheet.create({
  row: { paddingHorizontal: Spacing.xl, paddingTop: Spacing.lg + 2, gap: 6 },
  byline: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: 2 },
  bylineText: { flexShrink: 1 },
  footer: { marginTop: 4 },
  rule: { height: StyleSheet.hairlineWidth, marginTop: Spacing.lg + 2 },
});
