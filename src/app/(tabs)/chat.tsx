import { useCallback } from 'react';
import { ActivityIndicator, Alert, FlatList, KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';

import { Composer } from '@/components/composer';
import { EmptyState } from '@/components/empty-state';
import { MessageRow } from '@/components/message-row';
import { NeighborhoodHeader } from '@/components/neighborhood-header';
import { Screen } from '@/components/screen';
import { S } from '@/constants/strings';
import { Spacing } from '@/constants/theme';
import { useContentActions } from '@/hooks/use-content-actions';
import { useMessages } from '@/hooks/use-messages';
import { useTheme } from '@/hooks/use-theme';
import type { MessageWithAuthor } from '@/lib/database.types';
import { friendlyError } from '@/lib/errors';
import { checkContent } from '@/lib/profanity';
import { useNeighborhood } from '@/providers/neighborhood';
import { useSession } from '@/providers/session';

const GROUP_WINDOW_MS = 60_000;

export default function ChatScreen() {
  const t = useTheme();
  const { userId } = useSession();
  const { neighborhood } = useNeighborhood();
  const { messages, loading, error, send, remove, hideAuthor } = useMessages(neighborhood?.id ?? null, userId);
  const actions = useContentActions();

  const onSend = useCallback(
    async (text: string) => {
      const check = checkContent(text);
      if (!check.ok) {
        Alert.alert(check.reason === 'doxxing' ? S.report.reasons.doxxing : S.errors.profanity);
        return;
      }
      try {
        await send(text);
      } catch (e) {
        Alert.alert(friendlyError(e));
      }
    },
    [send],
  );

  // List is inverted: index 0 is newest. "Previous" message is index+1.
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
              type: 'message',
              id: item.id,
              authorId: item.user_id,
              onBlocked: hideAuthor,
              onDelete: () => remove(item.id),
            })
          }
        />
      );
    },
    [messages, userId, actions, hideAuthor, remove],
  );

  return (
    <Screen>
      <NeighborhoodHeader title={S.chat.title} />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}>
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
            ListEmptyComponent={
              <EmptyState icon="flash-outline" text={error ? `${S.errors.generic}\n${error}` : S.chat.empty} />
            }
            keyboardDismissMode="interactive"
          />
        )}
        <Composer placeholder={S.chat.placeholder} maxLength={500} onSend={onSend} disabled={!neighborhood} />
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { paddingVertical: Spacing.md },
  listEmpty: { flexGrow: 1 },
});
