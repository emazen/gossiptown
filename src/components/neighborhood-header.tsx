import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ScreenHeader } from '@/components/screen-header';
import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useNeighborhood } from '@/providers/neighborhood';

type Props = { title: string; right?: React.ReactNode };

/** Screen title + a highlighter chip for the district you're locked to. Tap it to re-locate. */
export function NeighborhoodHeader({ title, right }: Props) {
  const t = useTheme();
  const { neighborhood, status, refresh } = useNeighborhood();
  const place = neighborhood ? `${neighborhood.name}, ${neighborhood.city}` : '…';
  return (
    <ScreenHeader
      title={title}
      right={right}
      subtitle={
        <Pressable
          onPress={refresh}
          hitSlop={8}
          accessibilityRole="button"
          style={({ pressed }) => [styles.chip, { backgroundColor: t.highlight, opacity: pressed ? 0.75 : 1 }]}>
          <View style={[styles.dot, { backgroundColor: status === 'locating' ? t.textTertiary : t.accent }]} />
          <Text style={[styles.text, { color: t.onHighlight }]} numberOfLines={1}>
            {place}
          </Text>
        </Pressable>
      }
    />
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    marginTop: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.pill,
  },
  dot: { width: 7, height: 7, borderRadius: 4 },
  text: { fontSize: 13, lineHeight: 17, fontWeight: '700' },
});
