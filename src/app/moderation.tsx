import { Stack } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '@/components/avatar';
import { EmptyState } from '@/components/empty-state';
import { S } from '@/constants/strings';
import { Radius, Spacing, Type } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { ModerationAction, ModerationItem } from '@/lib/database.types';
import { friendlyError } from '@/lib/errors';
import { supabase } from '@/lib/supabase';
import { timeAgo } from '@/lib/time';

const DAY_MS = 24 * 60 * 60 * 1000;

/** Moderators only (the RPCs refuse everyone else). Oldest report first: the 24h clock. */
export default function ModerationScreen() {
  const t = useTheme();
  const [items, setItems] = useState<ModerationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data, error } = await supabase.rpc('moderation_queue');
    if (error) Alert.alert(friendlyError(error));
    else setItems(data ?? []);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const act = async (item: ModerationItem, action: ModerationAction) => {
    setBusy(item.target_id);
    const { error } = await supabase.rpc('moderate', {
      p_target_type: item.target_type,
      p_target_id: item.target_id,
      p_action: action,
    });
    setBusy(null);
    if (error) {
      Alert.alert(friendlyError(error));
      return;
    }
    setItems((prev) => prev.filter((x) => x.target_id !== item.target_id));
  };

  const confirmBan = (item: ModerationItem) =>
    Alert.alert(S.moderation.banTitle, S.moderation.banBody(item.author_nickname), [
      { text: S.actions.cancel, style: 'cancel' },
      { text: S.moderation.ban, style: 'destructive', onPress: () => act(item, 'ban') },
    ]);

  const renderItem = ({ item }: { item: ModerationItem }) => {
    const overdue = Date.now() - new Date(item.first_reported_at).getTime() > DAY_MS;
    const where = [S.moderation.types[item.target_type], item.room].filter(Boolean).join(' · ');
    const flags = [
      item.hidden && S.moderation.hidden,
      item.deleted && S.moderation.deleted,
      item.author_banned && S.moderation.banned,
    ].filter(Boolean);
    const disabled = busy === item.target_id;

    return (
      <View style={[styles.card, { backgroundColor: t.surface, borderColor: overdue ? t.danger : t.border }]}>
        <View style={styles.metaRow}>
          <Text style={[styles.meta, { color: t.textTertiary }]}>{where}</Text>
          <Text style={[styles.count, { color: t.danger }]}>{S.moderation.reports(item.report_count)}</Text>
        </View>

        <View style={styles.authorRow}>
          <Avatar nickname={item.author_nickname} hue={item.author_avatar_hue} url={item.author_avatar_url} size={32} />
          <Text style={[Type.name, { color: t.text }]}>{item.author_nickname}</Text>
        </View>

        {item.title && item.target_type === 'reply' ? (
          <Text style={[styles.context, { color: t.textTertiary }]}>{S.moderation.inThread(item.title)}</Text>
        ) : item.title ? (
          <Text style={[Type.title, { color: t.text }]}>{item.title}</Text>
        ) : null}
        {item.body ? <Text style={[styles.body, { color: t.text }]}>{item.body}</Text> : null}

        <Text style={[styles.reasons, { color: t.textSecondary }]}>
          {item.reasons.map((r) => S.report.reasons[r] ?? r).join(', ')}
        </Text>
        <Text style={[styles.meta, { color: overdue ? t.danger : t.textTertiary }]}>
          {overdue ? S.moderation.overdue : S.moderation.waiting(timeAgo(item.first_reported_at))}
          {flags.length > 0 ? ` · ${flags.join(' · ')}` : ''}
        </Text>

        <View style={styles.actions}>
          <ActionChip label={S.moderation.remove} color={t.danger} disabled={disabled} onPress={() => act(item, 'remove')} />
          {item.author_avatar_url ? (
            <ActionChip
              label={S.moderation.removeAvatar}
              color={t.text}
              disabled={disabled}
              onPress={() => act(item, 'remove_avatar')}
            />
          ) : null}
          {!item.author_banned ? (
            <ActionChip label={S.moderation.ban} color={t.danger} disabled={disabled} onPress={() => confirmBan(item)} />
          ) : null}
          <ActionChip label={S.moderation.dismiss} color={t.accent} disabled={disabled} onPress={() => act(item, 'dismiss')} />
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView edges={['bottom']} style={[styles.flex, { backgroundColor: t.background }]}>
      <Stack.Screen options={{ title: S.moderation.title, headerBackTitle: S.me.title }} />
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={t.accent} />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(x) => `${x.target_type}:${x.target_id}`}
          renderItem={renderItem}
          contentContainerStyle={items.length === 0 ? styles.listEmpty : styles.list}
          ListEmptyComponent={<EmptyState icon="shield-checkmark-outline" text={S.moderation.empty} />}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              tintColor={t.accent}
              onRefresh={() => {
                setRefreshing(true);
                load();
              }}
            />
          }
        />
      )}
    </SafeAreaView>
  );
}

function ActionChip({ label, color, disabled, onPress }: { label: string; color: string; disabled?: boolean; onPress: () => void }) {
  const t = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={4}
      style={({ pressed }) => [
        styles.chip,
        { borderColor: t.border, opacity: disabled ? 0.5 : pressed ? 0.6 : 1 },
      ]}>
      <Text style={[styles.chipLabel, { color }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { padding: Spacing.xl, gap: Spacing.md },
  listEmpty: { flexGrow: 1 },
  card: { padding: Spacing.lg, borderRadius: Radius.lg, borderWidth: StyleSheet.hairlineWidth * 2, gap: Spacing.sm },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  meta: { fontSize: 13, fontWeight: '600' },
  count: { fontSize: 13, fontWeight: '600' },
  authorRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  context: { fontSize: 13, fontStyle: 'italic' },
  body: { fontSize: 15, lineHeight: 21 },
  reasons: { fontSize: 13 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginTop: Spacing.xs },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: Radius.pill,
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
  chipLabel: { fontSize: 14, fontWeight: '600' },
});
