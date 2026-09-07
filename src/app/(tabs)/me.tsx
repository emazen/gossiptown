import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { Button } from '@/components/button';
import { Screen } from '@/components/screen';
import { S } from '@/constants/strings';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { Author } from '@/lib/database.types';
import { supabase } from '@/lib/supabase';
import { useNeighborhood } from '@/providers/neighborhood';
import { useSession } from '@/providers/session';

export default function MeScreen() {
  const t = useTheme();
  const { profile, userId, signOut } = useSession();
  const { neighborhood, status, refresh } = useNeighborhood();
  const [blocked, setBlocked] = useState<Author[]>([]);

  const loadBlocked = useCallback(async () => {
    if (!userId) return;
    const { data } = await supabase
      .from('blocks')
      .select('blocked:profiles!blocked_id(id, nickname, avatar_hue)')
      .eq('blocker_id', userId);
    setBlocked(((data ?? []) as unknown as { blocked: Author }[]).map((r) => r.blocked).filter(Boolean));
  }, [userId]);

  useEffect(() => {
    loadBlocked();
  }, [loadBlocked]);

  const unblock = async (id: string) => {
    if (!userId) return;
    setBlocked((prev) => prev.filter((b) => b.id !== id));
    await supabase.from('blocks').delete().eq('blocker_id', userId).eq('blocked_id', id);
  };

  const confirmSignOut = () =>
    Alert.alert(S.me.signOut, S.me.signOutConfirm, [
      { text: S.actions.cancel, style: 'cancel' },
      { text: S.me.signOut, style: 'destructive', onPress: signOut },
    ]);

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content} contentInsetAdjustmentBehavior="automatic">
        <Text style={[styles.h1, { color: t.text }]}>{S.me.title}</Text>

        {profile && (
          <View style={[styles.card, styles.profileCard, { backgroundColor: t.surface, borderColor: t.border }]}>
            <Avatar nickname={profile.nickname} hue={profile.avatar_hue} size={56} />
            <View style={styles.profileText}>
              <Text style={[styles.label, { color: t.textTertiary }]}>{S.me.nickname}</Text>
              <Text style={[styles.nick, { color: t.text }]}>{profile.nickname}</Text>
            </View>
          </View>
        )}

        <View style={[styles.card, { backgroundColor: t.surface, borderColor: t.border }]}>
          <Text style={[styles.label, { color: t.textTertiary }]}>{S.me.neighborhood}</Text>
          <Text style={[styles.value, { color: t.text }]}>
            {neighborhood ? `${neighborhood.name}` : '—'}
          </Text>
          {neighborhood && (
            <Text style={[styles.sub, { color: t.textSecondary }]}>
              {neighborhood.district}, {neighborhood.city}
            </Text>
          )}
          <Button onPress={refresh} variant="secondary" loading={status === 'locating'} style={styles.inlineBtn}>
            {S.me.refreshLocation}
          </Button>
        </View>

        <View style={[styles.card, { backgroundColor: t.surface, borderColor: t.border }]}>
          <Text style={[styles.label, { color: t.textTertiary }]}>{S.me.blocked}</Text>
          {blocked.length === 0 ? (
            <Text style={[styles.sub, { color: t.textSecondary }]}>{S.me.noBlocked}</Text>
          ) : (
            blocked.map((b) => (
              <View key={b.id} style={styles.blockRow}>
                <Avatar nickname={b.nickname} hue={b.avatar_hue} size={28} />
                <Text style={[styles.blockName, { color: t.text }]}>{b.nickname}</Text>
                <Pressable onPress={() => unblock(b.id)} hitSlop={8}>
                  <Text style={[styles.unblock, { color: t.accent }]}>{S.me.unblock}</Text>
                </Pressable>
              </View>
            ))
          )}
        </View>

        <View style={[styles.card, { backgroundColor: t.surface, borderColor: t.border }]}>
          <Text style={[styles.label, { color: t.textTertiary }]}>{S.me.rules}</Text>
          {S.onboarding.rules.map((r) => (
            <View key={r} style={styles.ruleRow}>
              <Ionicons name="checkmark-circle" size={16} color={t.success} />
              <Text style={[styles.sub, styles.rule, { color: t.textSecondary }]}>{r}</Text>
            </View>
          ))}
        </View>

        <Button onPress={confirmSignOut} variant="ghost">
          {S.me.signOut}
        </Button>
        <Text style={[styles.version, { color: t.textTertiary }]}>
          {S.me.version} {Constants.expoConfig?.version ?? '—'}
        </Text>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.lg, gap: Spacing.md, paddingBottom: 100 },
  h1: { fontSize: 28, fontWeight: '800', letterSpacing: -0.5, marginBottom: Spacing.sm },
  card: { padding: Spacing.lg, borderRadius: Radius.lg, borderWidth: StyleSheet.hairlineWidth, gap: Spacing.xs },
  profileCard: { flexDirection: 'row', alignItems: 'center', gap: Spacing.lg },
  profileText: { gap: 2 },
  label: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8 },
  nick: { fontSize: 22, fontWeight: '800' },
  value: { fontSize: 20, fontWeight: '700' },
  sub: { fontSize: 14, lineHeight: 20 },
  inlineBtn: { height: 44, marginTop: Spacing.sm },
  blockRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.xs },
  blockName: { flex: 1, fontSize: 15, fontWeight: '600' },
  unblock: { fontSize: 14, fontWeight: '700' },
  ruleRow: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'flex-start', marginTop: Spacing.xs },
  rule: { flex: 1 },
  version: { textAlign: 'center', fontSize: 12 },
});
