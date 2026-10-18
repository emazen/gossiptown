import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Spacing, Type } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Props = { title: string; subtitle?: ReactNode; right?: ReactNode };

/** Serif masthead for tab screens. */
export function ScreenHeader({ title, subtitle, right }: Props) {
  const t = useTheme();
  return (
    <View style={[styles.wrap, { borderBottomColor: t.border }]}>
      <View style={styles.titles}>
        <Text style={[Type.display, { color: t.text }]} accessibilityRole="header">
          {title}
        </Text>
        {subtitle}
      </View>
      {right ? <View style={styles.right}>{right}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  titles: { gap: 2, flexShrink: 1 },
  right: { paddingBottom: 6 },
});
