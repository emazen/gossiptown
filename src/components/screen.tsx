import type { PropsWithChildren } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { useTheme } from '@/hooks/use-theme';

type Props = PropsWithChildren<{ edges?: Edge[]; style?: ViewStyle }>;

/** Full-bleed themed background with safe-area padding. Bottom inset includes the native tab bar on iOS. */
export function Screen({ children, edges = ['top', 'bottom'], style }: Props) {
  const t = useTheme();
  return (
    <View style={[styles.root, { backgroundColor: t.background }]}>
      <SafeAreaView edges={edges} style={[styles.root, style]}>
        {children}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({ root: { flex: 1 } });
