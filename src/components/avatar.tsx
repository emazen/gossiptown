import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';

import { hueColor } from '@/lib/nickname';

type Props = { nickname: string; hue: number; url?: string | null; size?: number };

/** Photo if the user uploaded one, otherwise a colored initial. */
export function Avatar({ nickname, hue, url, size = 32 }: Props) {
  const radius = size / 2;
  if (url) {
    return (
      <Image
        source={{ uri: url }}
        style={{ width: size, height: size, borderRadius: radius, backgroundColor: hueColor(hue) }}
        contentFit="cover"
        transition={150}
        cachePolicy="memory-disk"
        accessibilityLabel={nickname}
      />
    );
  }
  const initial = nickname.trim().charAt(0).toLocaleUpperCase('tr-TR') || '?';
  return (
    <View style={[styles.wrap, { width: size, height: size, borderRadius: radius, backgroundColor: hueColor(hue) }]}>
      <Text style={[styles.initial, { fontSize: size * 0.45 }]}>{initial}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
  initial: { color: '#fff', fontWeight: '700' },
});
