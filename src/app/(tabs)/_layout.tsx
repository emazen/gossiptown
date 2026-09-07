import { Ionicons } from '@expo/vector-icons';
import { NativeTabs } from 'expo-router/unstable-native-tabs';

import { S } from '@/constants/strings';
import { useTheme } from '@/hooks/use-theme';

export default function TabsLayout() {
  const t = useTheme();
  return (
    <NativeTabs
      backgroundColor={t.surface}
      iconColor={{ default: t.textTertiary, selected: t.accent }}
      labelStyle={{ default: { color: t.textTertiary }, selected: { color: t.accent } }}>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>{S.tabs.threads}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: 'text.bubble', selected: 'text.bubble.fill' }}
          src={<NativeTabs.Trigger.VectorIcon family={Ionicons} name="chatbubbles" />}
        />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="chat">
        <NativeTabs.Trigger.Label>{S.tabs.chat}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: 'bolt', selected: 'bolt.fill' }}
          src={<NativeTabs.Trigger.VectorIcon family={Ionicons} name="flash" />}
        />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="me">
        <NativeTabs.Trigger.Label>{S.tabs.me}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: 'person.crop.circle', selected: 'person.crop.circle.fill' }}
          src={<NativeTabs.Trigger.VectorIcon family={Ionicons} name="person-circle" />}
        />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
