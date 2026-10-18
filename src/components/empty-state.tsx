import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { Spacing, Type } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Props = { icon: keyof typeof Ionicons.glyphMap; text: string };

export function EmptyState({ icon, text }: Props) {
  const t = useTheme();
  return (
    <View style={styles.wrap}>
      <Ionicons name={icon} size={26} color={t.textTertiary} />
      <Text style={[Type.aside, styles.text, { color: t.textSecondary }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.md, paddingHorizontal: Spacing.xxl },
  text: { textAlign: 'center', maxWidth: 300 },
});
