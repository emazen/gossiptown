import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useNeighborhood } from '@/providers/neighborhood';

type Props = { title: string; right?: React.ReactNode };

/** Screen title + the neighborhood you're locked to. Tap the pin to re-locate. */
export function NeighborhoodHeader({ title, right }: Props) {
  const t = useTheme();
  const { neighborhood, status, refresh } = useNeighborhood();
  const sub = neighborhood ? `${neighborhood.name}, ${neighborhood.district}` : '…';
  return (
    <View style={[styles.wrap, { borderBottomColor: t.border }]}>
      <View style={styles.titles}>
        <Text style={[styles.title, { color: t.text }]}>{title}</Text>
        <Pressable onPress={refresh} hitSlop={8} style={styles.sub}>
          <Ionicons name="location-sharp" size={13} color={status === 'locating' ? t.textTertiary : t.accent} />
          <Text style={[styles.subText, { color: t.textSecondary }]} numberOfLines={1}>
            {sub}
          </Text>
        </Pressable>
      </View>
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  titles: { gap: 2, flexShrink: 1 },
  title: { fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
  sub: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  subText: { fontSize: 13, fontWeight: '600' },
});
