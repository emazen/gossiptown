import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { MessageWithAuthor } from '@/lib/database.types';
import { clockTime } from '@/lib/time';

type Props = {
  message: MessageWithAuthor;
  mine: boolean;
  /** Hide avatar/name when the previous message is from the same author within a minute. */
  grouped: boolean;
  onLongPress: () => void;
};

export const MessageRow = memo(function MessageRow({ message, mine, grouped, onLongPress }: Props) {
  const t = useTheme();
  const author = message.author;
  return (
    <Pressable onLongPress={onLongPress} delayLongPress={300} style={[styles.row, mine && styles.rowMine, grouped && styles.rowGrouped]}>
      {!mine && (
        <View style={styles.avatarSlot}>
          {!grouped && author && <Avatar nickname={author.nickname} hue={author.avatar_hue} size={28} />}
        </View>
      )}
      <View style={[styles.bubbleCol, mine && styles.bubbleColMine]}>
        {!grouped && !mine && (
          <Text style={[styles.name, { color: t.textSecondary }]}>{author?.nickname ?? '…'}</Text>
        )}
        <View
          style={[
            styles.bubble,
            { backgroundColor: mine ? t.bubbleMine : t.bubbleTheirs },
            mine ? styles.bubbleMine : styles.bubbleTheirs,
          ]}>
          <Text style={[styles.body, { color: mine ? t.onAccent : t.text }]}>{message.body}</Text>
          <Text style={[styles.time, { color: mine ? 'rgba(255,255,255,0.7)' : t.textTertiary }]}>
            {clockTime(message.created_at)}
          </Text>
        </View>
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  row: { flexDirection: 'row', paddingHorizontal: Spacing.md, marginTop: Spacing.md, gap: Spacing.sm },
  rowMine: { justifyContent: 'flex-end' },
  rowGrouped: { marginTop: 2 },
  avatarSlot: { width: 28, alignSelf: 'flex-end' },
  bubbleCol: { maxWidth: '78%', alignItems: 'flex-start' },
  bubbleColMine: { alignItems: 'flex-end' },
  name: { fontSize: 12, fontWeight: '600', marginBottom: 3, marginLeft: Spacing.xs },
  bubble: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.lg,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.sm,
    flexWrap: 'wrap',
  },
  bubbleMine: { borderBottomRightRadius: 6 },
  bubbleTheirs: { borderBottomLeftRadius: 6 },
  body: { fontSize: 16, lineHeight: 21, flexShrink: 1 },
  time: { fontSize: 10, marginBottom: 1 },
});
