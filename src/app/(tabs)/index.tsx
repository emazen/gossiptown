import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { EmptyState } from '@/components/empty-state';
import { NeighborhoodHeader } from '@/components/neighborhood-header';
import { Screen } from '@/components/screen';
import { ThreadCard } from '@/components/thread-card';
import { S } from '@/constants/strings';
import { Spacing } from '@/constants/theme';
import { useContentActions } from '@/hooks/use-content-actions';
import { useTheme } from '@/hooks/use-theme';
import { useThreads } from '@/hooks/use-threads';
import type { ThreadWithAuthor } from '@/lib/database.types';
import { useNeighborhood } from '@/providers/neighborhood';

export default function ThreadsScreen() {
  const t = useTheme();
  const router = useRouter();
  const { neighborhood } = useNeighborhood();
  const { threads, loading, refreshing, error, refresh, loadMore, remove, hideAuthor } = useThreads(
    neighborhood?.id ?? null,
  );
  const actions = useContentActions();

  const renderItem = useCallback(
    ({ item }: { item: ThreadWithAuthor }) => (
      <ThreadCard
        thread={item}
        onPress={() => router.push({ pathname: '/thread/[id]', params: { id: item.id } })}
        onLongPress={() =>
          actions.open({
            type: 'thread',
            id: item.id,
            authorId: item.user_id,
            onBlocked: hideAuthor,
            onDelete: () => remove(item.id),
          })
        }
      />
    ),
    [router, actions, hideAuthor, remove],
  );

  return (
    <Screen>
      <NeighborhoodHeader title={S.threads.title} />
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={t.accent} />
        </View>
      ) : (
        <FlatList
          data={threads}
          keyExtractor={(x) => x.id}
          renderItem={renderItem}
          contentContainerStyle={[styles.list, threads.length === 0 && styles.listEmpty]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={t.accent} />}
          onEndReached={loadMore}
          onEndReachedThreshold={0.6}
          ListEmptyComponent={
            <EmptyState icon="chatbubbles-outline" text={error ? `${S.errors.generic}\n${error}` : S.threads.empty} />
          }
          contentInsetAdjustmentBehavior="automatic"
        />
      )}

      <Pressable
        onPress={() => router.push('/thread/new')}
        style={({ pressed }) => [styles.fab, { backgroundColor: t.accent, opacity: pressed ? 0.85 : 1 }]}
        accessibilityLabel={S.threads.newThread}>
        <Ionicons name="add" size={26} color={t.onAccent} />
        <Text style={[styles.fabText, { color: t.onAccent }]}>{S.threads.newThread}</Text>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { paddingTop: Spacing.lg, paddingBottom: 120 },
  listEmpty: { flexGrow: 1 },
  fab: {
    position: 'absolute',
    right: Spacing.lg,
    bottom: Spacing.xl,
    height: 52,
    paddingLeft: Spacing.md,
    paddingRight: Spacing.lg,
    borderRadius: 26,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    boxShadow: '0 6px 12px rgba(0,0,0,0.25)',
  },
  fabText: { fontSize: 15, fontWeight: '700' },
});
