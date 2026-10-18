import type { PropsWithChildren } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, type ViewStyle } from 'react-native';

import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Props = PropsWithChildren<{
  onPress: () => void;
  /** primary: ink. secondary: hairline outline. ghost: plain text. danger: red text outline. */
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
}>;

export function Button({ children, onPress, variant = 'primary', loading, disabled, style }: Props) {
  const t = useTheme();
  const bg = variant === 'primary' ? t.ink : 'transparent';
  const fg = variant === 'primary' ? t.onInk : variant === 'danger' ? t.danger : t.text;
  const outlined = variant === 'secondary' || variant === 'danger';
  const off = disabled || loading;
  return (
    <Pressable
      onPress={onPress}
      disabled={off}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.btn,
        { backgroundColor: bg, opacity: off ? 0.4 : pressed ? 0.8 : 1 },
        outlined && { borderWidth: StyleSheet.hairlineWidth * 2, borderColor: variant === 'danger' ? t.danger : t.border },
        style,
      ]}>
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
  label: { fontSize: 16, fontWeight: '600', letterSpacing: -0.1 },
});
