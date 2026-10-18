import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { EmptyState } from '@/components/empty-state';
import { Screen } from '@/components/screen';
import { ScreenHeader } from '@/components/screen-header';
import { S } from '@/constants/strings';
import { Spacing, Type } from '@/constants/theme';
import { useConversations } from '@/hooks/use-conversations';
import { useTheme } from '@/hooks/use-theme';
import type { ConversationWithPeer } from '@/lib/database.types';
import { timeAgo } from '@/lib/time';
import { useSession } from '@/providers/session';

export default function DmsScreen() {
  const t = useTheme();
  const router = useRouter();
  const { userId } = useSession();
  const { conversations, loading, error } = useConversations();

  const renderItem = ({ item }: { item: ConversationWithPeer }) => (
    <Pressable
      onPress={() => router.push({ pathname: '/dm/[id]', params: { id: item.id } })}
      style={({ pressed }) => [styles.row, { backgroundColor: pressed ? t.surfaceElevated : 'transparent', borderBottomColor: t.border }]}>
      <Avatar nickname={item.peer.nickname} hue={item.peer.avatar_hue} url={item.peer.avatar_url} size={46} />
      <View style={styles.rowBody}>
        <View style={styles.rowTop}>
          <Text style={[Type.name, styles.name, { color: t.text }]} numberOfLines={1}>
            {item.peer.nickname}
          </Text>
          {item.last_message_at && (
            <Text style={[Type.meta, { color: item.unread ? t.accent : t.textTertiary }]}>{timeAgo(item.last_message_at)}</Text>
          )}
        </View>
        <Text
          style={[styles.preview, { color: item.unread ? t.text : t.textSecondary, fontWeight: item.unread ? '600' : '400' }]}
          numberOfLines={1}>
          {item.last_sender_id === userId ? S.dms.you : ''}
          {item.last_message ?? ''}
        </Text>
      </View>
      {item.unread && <View style={[styles.dot, { backgroundColor: t.accent }]} />}
    </Pressable>
  );

  return (
    <Screen>
      <ScreenHeader
        title={S.dms.title}
        right={
          <Pressable onPress={() => router.push('/contacts')} hitSlop={8} style={styles.contactsBtn}>
            <Ionicons name="people-outline" size={17} color={t.text} />
            <Text style={[Type.label, { color: t.text }]}>{S.dms.contacts}</Text>
          </Pressable>
        }
      />
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={t.accent} />
        </View>
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={(x) => x.id}
          renderItem={renderItem}
          contentContainerStyle={conversations.length === 0 && styles.listEmpty}
          ListEmptyComponent={<EmptyState icon="mail-outline" text={error ? `${S.errors.generic}\n${error}` : S.dms.empty} />}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  contactsBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  listEmpty: { flexGrow: 1 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.xl,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowBody: { flex: 1, gap: 3 },
  rowTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.sm },
  name: { flexShrink: 1 },
  preview: { fontSize: 15, lineHeight: 20 },
  dot: { width: 8, height: 8, borderRadius: 4 },
});
