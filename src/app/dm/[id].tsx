import { Stack, useLocalSearchParams } from 'expo-router';
import { useCallback } from 'react';
import { ActivityIndicator, Alert, FlatList, KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { Composer } from '@/components/composer';
import { EmptyState } from '@/components/empty-state';
import { MessageRow } from '@/components/message-row';
import { S } from '@/constants/strings';
import { Spacing } from '@/constants/theme';
import { useContentActions } from '@/hooks/use-content-actions';
import { useDm } from '@/hooks/use-dm';
import { useTheme } from '@/hooks/use-theme';
import type { MessageWithAuthor } from '@/lib/database.types';
import { friendlyError } from '@/lib/errors';
import { useSession } from '@/providers/session';

const GROUP_WINDOW_MS = 60_000;

export default function DmScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { userId } = useSession();
  const { peer, messages, loading, error, send, remove } = useDm(id, userId);
  const actions = useContentActions();

  const onSend = useCallback(
    async (text: string) => {
      try {
        await send(text);
      } catch (e) {
        Alert.alert(friendlyError(e));
      }
    },
    [send],
  );

  const renderItem = useCallback(
    ({ item, index }: { item: MessageWithAuthor; index: number }) => {
      const prev = messages[index + 1];
      const grouped =
        !!prev &&
        prev.user_id === item.user_id &&
        new Date(item.created_at).getTime() - new Date(prev.created_at).getTime() < GROUP_WINDOW_MS;
      return (
        <MessageRow
          message={item}
          mine={item.user_id === userId}
          grouped={grouped}
          onLongPress={() =>
            actions.open({
              type: 'dm',
              id: item.id,
              authorId: item.user_id,
              onDelete: () => remove(item.id),
            })
          }
        />
      );
    },
    [messages, userId, actions, remove],
  );

  return (
    <SafeAreaView edges={['bottom']} style={[styles.flex, { backgroundColor: t.background }]}>
      <Stack.Screen options={{ title: peer?.nickname ?? '', headerBackTitle: S.dms.title }} />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top + 44 : 0}>
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color={t.accent} />
          </View>
        ) : (
          <FlatList
            data={messages}
            inverted={messages.length > 0}
            keyExtractor={(x) => x.id}
            renderItem={renderItem}
            contentContainerStyle={[styles.list, messages.length === 0 && styles.listEmpty]}
            ListEmptyComponent={<EmptyState icon="mail-open-outline" text={error ?? `${peer?.nickname ?? ''} ile yazışmaya başla.`} />}
            keyboardDismissMode="interactive"
          />
        )}
        <Composer placeholder={S.dms.placeholder} maxLength={2000} onSend={onSend} />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { paddingVertical: Spacing.md },
  listEmpty: { flexGrow: 1 },
});
