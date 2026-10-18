import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActionSheetIOS, ActivityIndicator, Alert, Linking, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { Screen } from '@/components/screen';
import { S } from '@/constants/strings';
import { Display, Radius, Spacing, Type } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { pickAndUploadAvatar, removeAvatar } from '@/lib/avatar';
import type { Author } from '@/lib/database.types';
import { SUPPORT_EMAIL } from '@/lib/env';
import { supabase } from '@/lib/supabase';
import { useNeighborhood } from '@/providers/neighborhood';
import { useSession } from '@/providers/session';

export default function MeScreen() {
  const t = useTheme();
  const { profile, userId, signOut, patchProfile } = useSession();
  const [uploading, setUploading] = useState(false);
  const { neighborhood, status, refresh } = useNeighborhood();
  const [blocked, setBlocked] = useState<Author[]>([]);
  const router = useRouter();
  /** null: not a moderator. Otherwise the number of items waiting for review. */
  const [pending, setPending] = useState<number | null>(null);

  // Refresh on focus so the count drops after a moderation session.
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        const { data: isMod } = await supabase.rpc('is_moderator');
        if (!isMod) {
          if (!cancelled) setPending(null);
          return;
        }
        const { data } = await supabase.rpc('moderation_queue');
        if (!cancelled) setPending(data?.length ?? 0);
      })();
      return () => {
        cancelled = true;
      };
    }, []),
  );

  const loadBlocked = useCallback(async () => {
    if (!userId) return;
    const { data } = await supabase
      .from('blocks')
      .select('blocked:profiles!blocked_id(id, nickname, avatar_hue, avatar_url)')
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

  const changePhoto = async () => {
    if (!userId) return;
    setUploading(true);
    try {
      const r = await pickAndUploadAvatar(userId);
      if (r.status === 'ok') patchProfile({ avatar_url: r.url });
      else if (r.status === 'error') Alert.alert(r.message);
    } finally {
      setUploading(false);
    }
  };

  const clearPhoto = async () => {
    if (!userId) return;
    patchProfile({ avatar_url: null });
    await removeAvatar(userId);
  };

  const photoMenu = () => {
    const options = [
      { text: S.me.pickPhoto, onPress: changePhoto },
      ...(profile?.avatar_url ? [{ text: S.me.removePhoto, onPress: clearPhoto, destructive: true }] : []),
    ];
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: [...options.map((o) => o.text), S.actions.cancel],
          cancelButtonIndex: options.length,
          destructiveButtonIndex: options.findIndex((o) => 'destructive' in o),
        },
        (i) => options[i]?.onPress(),
      );
    } else {
      Alert.alert(S.me.changePhoto, undefined, [
        ...options.map((o) => ({ text: o.text, onPress: o.onPress })),
        { text: S.actions.cancel, style: 'cancel' as const },
      ]);
    }
  };

  const contact = () =>
    Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(S.me.contactSubject)}`).catch(() =>
      Alert.alert(SUPPORT_EMAIL),
    );

  const confirmSignOut = () =>
    Alert.alert(S.me.signOut, S.me.signOutConfirm, [
      { text: S.actions.cancel, style: 'cancel' },
      { text: S.me.signOut, style: 'destructive', onPress: signOut },
    ]);

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content} contentInsetAdjustmentBehavior="automatic">
        <Text style={[Type.display, styles.h1, { color: t.text }]} accessibilityRole="header">
          {S.me.title}
        </Text>

        {profile && (
          <View style={styles.profile}>
            <Pressable onPress={photoMenu} disabled={uploading} accessibilityLabel={S.me.changePhoto}>
              <Avatar nickname={profile.nickname} hue={profile.avatar_hue} url={profile.avatar_url} size={72} />
              {uploading && (
                <View style={[styles.uploading, { backgroundColor: 'rgba(0,0,0,0.35)' }]}>
                  <ActivityIndicator color="#fff" />
                </View>
              )}
            </Pressable>
            <View style={styles.profileText}>
              <Text style={[Type.headline, { color: t.text }]} numberOfLines={1} adjustsFontSizeToFit>
                {profile.nickname}
              </Text>
              <Pressable onPress={photoMenu} disabled={uploading} hitSlop={6}>
                <Text style={[Type.label, { color: t.accent }]}>{S.me.changePhoto}</Text>
              </Pressable>
            </View>
          </View>
        )}

        {pending !== null && (
          <Group>
            <Row
              icon="shield-checkmark-outline"
              iconColor={pending > 0 ? t.danger : t.textSecondary}
              title={S.me.moderation}
              detail={S.me.moderationPending(pending)}
              detailColor={pending > 0 ? t.danger : undefined}
              onPress={() => router.push('/moderation')}
              chevron
            />
          </Group>
        )}

        <Group label={S.me.neighborhood}>
          <Row
            icon="location-outline"
            title={neighborhood ? `${neighborhood.name}, ${neighborhood.city}` : '—'}
            right={
              status === 'locating' ? (
                <ActivityIndicator color={t.textSecondary} />
              ) : (
                <Pressable onPress={refresh} hitSlop={8}>
                  <Text style={[Type.label, { color: t.accent }]}>{S.me.refreshLocation}</Text>
                </Pressable>
              )
            }
          />
        </Group>

        <Group label={S.me.blocked}>
          {blocked.length === 0 ? (
            <Row title={S.me.noBlocked} muted />
          ) : (
            blocked.map((b, i) => (
              <Row
                key={b.id}
                first={i === 0}
                leading={<Avatar nickname={b.nickname} hue={b.avatar_hue} url={b.avatar_url} size={28} />}
                title={b.nickname}
                right={
                  <Pressable onPress={() => unblock(b.id)} hitSlop={8}>
                    <Text style={[Type.label, { color: t.accent }]}>{S.me.unblock}</Text>
                  </Pressable>
                }
              />
            ))
          )}
        </Group>

        <Group label={S.me.rules}>
          {S.onboarding.rules.map((r, i) => (
            <View key={r} style={[styles.ruleRow, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: t.border }]}>
              <Text style={[styles.ruleNum, { color: t.accent }]}>{i + 1}</Text>
              <Text style={[Type.small, styles.ruleText, { color: t.text }]}>{r}</Text>
            </View>
          ))}
        </Group>

        <Group>
          <Row icon="mail-outline" title={S.me.contact} detail={S.me.contactHint} onPress={contact} chevron />
          <Row icon="log-out-outline" iconColor={t.danger} title={S.me.signOut} titleColor={t.danger} onPress={confirmSignOut} first={false} />
        </Group>

        <Text style={[Type.meta, styles.version, { color: t.textTertiary }]}>
          {S.appName} · {S.me.version} {Constants.expoConfig?.version ?? '—'}
        </Text>
      </ScrollView>
    </Screen>
  );
}

/** Inset grouped list with an optional sentence-case label above it. */
function Group({ label, children }: { label?: string; children: React.ReactNode }) {
  const t = useTheme();
  return (
    <View style={styles.group}>
      {label ? <Text style={[Type.label, styles.groupLabel, { color: t.textSecondary }]}>{label}</Text> : null}
      <View style={[styles.groupBox, { backgroundColor: t.surface, borderColor: t.border }]}>{children}</View>
    </View>
  );
}

type RowProps = {
  title: string;
  detail?: string;
  detailColor?: string;
  titleColor?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  leading?: React.ReactNode;
  right?: React.ReactNode;
  chevron?: boolean;
  muted?: boolean;
  /** Rows draw a top hairline except the first in a group. */
  first?: boolean;
  onPress?: () => void;
};

function Row({ title, detail, detailColor, titleColor, icon, iconColor, leading, right, chevron, muted, first = true, onPress }: RowProps) {
  const t = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [
        styles.row,
        !first && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: t.border },
        { backgroundColor: pressed ? t.surfaceElevated : 'transparent' },
      ]}>
      {leading ?? (icon ? <Ionicons name={icon} size={20} color={iconColor ?? t.textSecondary} /> : null)}
      <View style={styles.rowText}>
        <Text style={[Type.body, { color: titleColor ?? (muted ? t.textSecondary : t.text) }]} numberOfLines={1}>
          {title}
        </Text>
        {detail ? <Text style={[Type.meta, { color: detailColor ?? t.textSecondary }]}>{detail}</Text> : null}
      </View>
      {right}
      {chevron ? <Ionicons name="chevron-forward" size={16} color={t.textTertiary} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: Spacing.xl, paddingTop: Spacing.md, paddingBottom: Spacing.xxl, gap: Spacing.xl },
  h1: { marginBottom: -Spacing.sm },
  profile: { flexDirection: 'row', alignItems: 'center', gap: Spacing.lg },
  profileText: { flex: 1, gap: 4 },
  uploading: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
  group: { gap: Spacing.sm },
  groupLabel: { marginLeft: 2 },
  groupBox: { borderRadius: Radius.lg, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingHorizontal: Spacing.lg, minHeight: 52, paddingVertical: Spacing.md },
  rowText: { flex: 1, gap: 2 },
  ruleRow: { flexDirection: 'row', gap: Spacing.md, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md },
  ruleNum: { fontFamily: Display.extrabold, fontSize: 17, lineHeight: 21, width: 14 },
  ruleText: { flex: 1 },
  version: { textAlign: 'center' },
});
