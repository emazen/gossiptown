import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { EmptyState } from '@/components/empty-state';
import { Screen } from '@/components/screen';
import { S } from '@/constants/strings';
import { Spacing } from '@/constants/theme';
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
      <Avatar nickname={item.peer.nickname} hue={item.peer.avatar_hue} url={item.peer.avatar_url} size={44} />
      <View style={styles.rowBody}>
        <View style={styles.rowTop}>
          <Text style={[styles.name, { color: t.text }]} numberOfLines={1}>
            {item.peer.nickname}
          </Text>
          {item.last_message_at && (
            <Text style={[styles.time, { color: t.textTertiary }]}>{timeAgo(item.last_message_at)}</Text>
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
      <View style={[styles.header, { borderBottomColor: t.border }]}>
        <Text style={[styles.title, { color: t.text }]}>{S.dms.title}</Text>
        <Pressable onPress={() => router.push('/contacts')} hitSlop={8} style={styles.contactsBtn}>
          <Ionicons name="people" size={18} color={t.accent} />
          <Text style={[styles.contactsText, { color: t.accent }]}>{S.dms.contacts}</Text>
        </Pressable>
      </View>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: { fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
  contactsBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  contactsText: { fontSize: 15, fontWeight: '700' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  listEmpty: { flexGrow: 1 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowBody: { flex: 1, gap: 2 },
  rowTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.sm },
  name: { fontSize: 16, fontWeight: '700', flexShrink: 1 },
  time: { fontSize: 12 },
  preview: { fontSize: 14 },
  dot: { width: 10, height: 10, borderRadius: 5 },
});
