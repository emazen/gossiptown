import type { PropsWithChildren } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, type ViewStyle } from 'react-native';

import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Props = PropsWithChildren<{
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
}>;

export function Button({ children, onPress, variant = 'primary', loading, disabled, style }: Props) {
  const t = useTheme();
  const bg =
    variant === 'primary' ? t.accent : variant === 'secondary' ? t.surfaceElevated : variant === 'danger' ? t.danger : 'transparent';
  const fg = variant === 'primary' || variant === 'danger' ? t.onAccent : variant === 'ghost' ? t.accent : t.text;
  const off = disabled || loading;
  return (
    <Pressable
      onPress={onPress}
      disabled={off}
      style={({ pressed }) => [styles.btn, { backgroundColor: bg, opacity: off ? 0.5 : pressed ? 0.85 : 1 }, style]}>
      {loading ? <ActivityIndicator color={fg} /> : <Text style={[styles.label, { color: fg }]}>{children}</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    height: 52,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
  },
  label: { fontSize: 16, fontWeight: '700' },
});
