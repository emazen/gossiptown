import { useCallback } from 'react';
import { ActionSheetIOS, Alert, Platform } from 'react-native';

import { S } from '@/constants/strings';
import { supabase } from '@/lib/supabase';
import { useSession } from '@/providers/session';

type Target = {
  type: 'message' | 'thread' | 'reply';
  id: string;
  authorId: string;
  /** Called after a block so the screen can drop that author's rows immediately. */
  onBlocked?: (authorId: string) => void;
  /** Called when the owner deletes their own content. */
  onDelete?: () => void | Promise<void>;
};

/**
 * Long-press menu for any piece of content: report, block, or (if mine) delete.
 * Native action sheet on iOS, Alert on Android.
 */
export function useContentActions() {
  const { userId } = useSession();

  const report = useCallback(
    async (target: Target) => {
      const keys = Object.keys(S.report.reasons);
      const pick = (idx: number) => {
        const reason = keys[idx];
        if (!reason || !userId) return;
        supabase
          .from('reports')
          .insert({ reporter_id: userId, target_type: target.type, target_id: target.id, reason })
          .then(() => Alert.alert(S.report.thanks));
      };
      const labels = keys.map((k) => S.report.reasons[k]);
      if (Platform.OS === 'ios') {
        ActionSheetIOS.showActionSheetWithOptions(
          { title: S.report.title, options: [...labels, S.actions.cancel], cancelButtonIndex: labels.length },
          (i) => i < labels.length && pick(i),
        );
      } else {
        Alert.alert(S.report.title, undefined, [
          ...labels.map((l, i) => ({ text: l, onPress: () => pick(i) })),
          { text: S.actions.cancel, style: 'cancel' as const },
        ]);
      }
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

  const open = useCallback(
    (target: Target) => {
      const mine = target.authorId === userId;
      const options: { text: string; destructive?: boolean; onPress: () => void }[] = mine
        ? [{ text: S.actions.delete, destructive: true, onPress: () => target.onDelete?.() }]
        : [
            { text: S.actions.report, onPress: () => report(target) },
            { text: S.actions.block, destructive: true, onPress: () => block(target) },
          ];

      if (Platform.OS === 'ios') {
        ActionSheetIOS.showActionSheetWithOptions(
          {
            options: [...options.map((o) => o.text), S.actions.cancel],
            cancelButtonIndex: options.length,
            destructiveButtonIndex: options.findIndex((o) => o.destructive),
          },
          (i) => options[i]?.onPress(),
        );
      } else {
        Alert.alert('', undefined, [
          ...options.map((o) => ({ text: o.text, style: o.destructive ? ('destructive' as const) : undefined, onPress: o.onPress })),
          { text: S.actions.cancel, style: 'cancel' as const },
        ]);
      }
    },
    [userId, report, block],
  );

  return { open };
}
