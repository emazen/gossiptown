import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ScreenHeader } from '@/components/screen-header';
import { Type } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useNeighborhood } from '@/providers/neighborhood';

type Props = { title: string; right?: React.ReactNode };

/** Screen title + the district you're locked to. Tap the place line to re-locate. */
export function NeighborhoodHeader({ title, right }: Props) {
  const t = useTheme();
  const { neighborhood, status, refresh } = useNeighborhood();
  const place = neighborhood ? `${neighborhood.name}, ${neighborhood.city}` : '…';
  return (
    <ScreenHeader
      title={title}
      right={right}
      subtitle={
        <Pressable onPress={refresh} hitSlop={8} style={styles.sub} accessibilityRole="button">
          <View style={[styles.dot, { backgroundColor: status === 'locating' ? t.textTertiary : t.accent }]} />
          <Text style={[Type.meta, { color: t.textSecondary }]} numberOfLines={1}>
            {place}
          </Text>
        </Pressable>
      }
    />
  );
}

const styles = StyleSheet.create({
  sub: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  dot: { width: 6, height: 6, borderRadius: 3 },
});
