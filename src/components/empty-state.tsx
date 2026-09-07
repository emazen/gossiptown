import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Props = { icon: keyof typeof Ionicons.glyphMap; text: string };

export function EmptyState({ icon, text }: Props) {
  const t = useTheme();
  return (
    <View style={styles.wrap}>
      <Ionicons name={icon} size={40} color={t.textTertiary} />
      <Text style={[styles.text, { color: t.textSecondary }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.md, padding: Spacing.xl },
  text: { fontSize: 15, lineHeight: 22, textAlign: 'center' },
});
