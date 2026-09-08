import { useRouter } from 'expo-router';
import { useCallback } from 'react';
import { ActionSheetIOS, Alert, Platform } from 'react-native';

import { S } from '@/constants/strings';
import { addContact } from '@/hooks/use-contacts';
import { startConversation } from '@/hooks/use-conversations';
import { friendlyError } from '@/lib/errors';
import { supabase } from '@/lib/supabase';
import { useSession } from '@/providers/session';

type Target = {
  type: 'message' | 'thread' | 'reply' | 'dm';
  id: string;
  authorId: string;
  /** Called after a block so the screen can drop that author's rows immediately. */
  onBlocked?: (authorId: string) => void;
  /** Called when the owner deletes their own content. */
  onDelete?: () => void | Promise<void>;
};

type Option = { text: string; destructive?: boolean; onPress: () => void };

function showSheet(title: string | undefined, options: Option[]) {
  if (Platform.OS === 'ios') {
    ActionSheetIOS.showActionSheetWithOptions(
      {
        title,
        options: [...options.map((o) => o.text), S.actions.cancel],
        cancelButtonIndex: options.length,
        destructiveButtonIndex: options.findIndex((o) => o.destructive),
      },
      (i) => options[i]?.onPress(),
    );
  } else {
    Alert.alert(title ?? '', undefined, [
      ...options.map((o) => ({ text: o.text, style: o.destructive ? ('destructive' as const) : undefined, onPress: o.onPress })),
      { text: S.actions.cancel, style: 'cancel' as const },
    ]);
  }
}

/**
 * Long-press menu for any piece of content.
 * Others' content: message, add to contacts, report, block. Mine: delete.
 */
export function useContentActions() {
  const { userId } = useSession();
  const router = useRouter();

  const report = useCallback(
    (target: Target) => {
      const targetType = target.type;
      if (targetType === 'dm') return; // DMs: block is the tool
      const keys = Object.keys(S.report.reasons);
      showSheet(
        S.report.title,
        keys.map((k) => ({
          text: S.report.reasons[k],
          onPress: () => {
            if (!userId) return;
            supabase
              .from('reports')
              .insert({ reporter_id: userId, target_type: targetType, target_id: target.id, reason: k })
              .then(() => Alert.alert(S.report.thanks));
          },
        })),
      );
    },
    [userId],
  );

  const block = useCallback(
    async (target: Target) => {
      if (!userId) return;
      const { error } = await supabase.from('blocks').insert({ blocker_id: userId, blocked_id: target.authorId });
      if (error && !error.message.includes('duplicate')) {
        Alert.alert(S.errors.generic);
        return;
      }
      target.onBlocked?.(target.authorId);
      Alert.alert(S.report.blockedToast);
    },
    [userId],
  );

  const message = useCallback(
    async (target: Target) => {
      try {
        const id = await startConversation(target.authorId);
        router.push({ pathname: '/dm/[id]', params: { id } });
      } catch (e) {
        Alert.alert(friendlyError(e));
      }
    },
    [router],
  );

  const add = useCallback(async (target: Target) => {
    try {
      await addContact(target.authorId);
      Alert.alert(S.dms.added);
    } catch (e) {
      Alert.alert(friendlyError(e));
    }
  }, []);

  const open = useCallback(
    (target: Target) => {
      const mine = target.authorId === userId;
      if (mine) {
        showSheet(undefined, [{ text: S.actions.delete, destructive: true, onPress: () => target.onDelete?.() }]);
        return;
      }
      const options: Option[] = [];
      if (target.type !== 'dm') {
        options.push({ text: S.dms.message, onPress: () => message(target) });
        options.push({ text: S.dms.addContact, onPress: () => add(target) });
        options.push({ text: S.actions.report, onPress: () => report(target) });
      }
      options.push({ text: S.actions.block, destructive: true, onPress: () => block(target) });
      showSheet(undefined, options);
    },
    [userId, message, add, report, block],
  );

  return { open };
}
