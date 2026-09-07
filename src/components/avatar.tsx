import { StyleSheet, Text, View } from 'react-native';

import { hueColor } from '@/lib/nickname';

type Props = { nickname: string; hue: number; size?: number };

export function Avatar({ nickname, hue, size = 32 }: Props) {
  const bg = hueColor(hue);
  const initial = nickname.trim().charAt(0).toLocaleUpperCase('tr-TR') || '?';
  return (
    <View style={[styles.wrap, { width: size, height: size, borderRadius: size / 2, backgroundColor: bg }]}>
      <Text style={[styles.initial, { fontSize: size * 0.45 }]}>{initial}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
  initial: { color: '#fff', fontWeight: '700' },
});
