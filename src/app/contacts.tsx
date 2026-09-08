import { Stack, useRouter } from 'expo-router';
import { ActivityIndicator, Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '@/components/avatar';
import { EmptyState } from '@/components/empty-state';
import { S } from '@/constants/strings';
import { Spacing } from '@/constants/theme';
import { useContacts } from '@/hooks/use-contacts';
import { startConversation } from '@/hooks/use-conversations';
import { useTheme } from '@/hooks/use-theme';
import type { Author } from '@/lib/database.types';
import { friendlyError } from '@/lib/errors';

export default function ContactsScreen() {
  const t = useTheme();
  const router = useRouter();
  const { contacts, loading, remove } = useContacts();

  const message = async (person: Author) => {
    try {
      const id = await startConversation(person.id);
      router.push({ pathname: '/dm/[id]', params: { id } });
    } catch (e) {
      Alert.alert(friendlyError(e));
    }
  };

  const confirmRemove = (person: Author) =>
    Alert.alert(S.dms.removeContact, person.nickname, [
      { text: S.actions.cancel, style: 'cancel' },
      { text: S.dms.removeContact, style: 'destructive', onPress: () => remove(person.id) },
    ]);

  return (
    <SafeAreaView edges={['bottom']} style={[styles.flex, { backgroundColor: t.background }]}>
      <Stack.Screen options={{ title: S.dms.contacts, headerBackTitle: S.dms.title }} />
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={t.accent} />
        </View>
      ) : (
        <FlatList
          data={contacts}
          keyExtractor={(x) => x.id}
          contentContainerStyle={contacts.length === 0 && styles.listEmpty}
          ListEmptyComponent={<EmptyState icon="people-outline" text={S.dms.contactsEmpty} />}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => message(item)}
              onLongPress={() => confirmRemove(item)}
              delayLongPress={300}
              style={({ pressed }) => [styles.row, { backgroundColor: pressed ? t.surfaceElevated : 'transparent', borderBottomColor: t.border }]}>
              <Avatar nickname={item.nickname} hue={item.avatar_hue} size={40} />
              <Text style={[styles.name, { color: t.text }]}>{item.nickname}</Text>
              <Text style={[styles.action, { color: t.accent }]}>{S.dms.startChat}</Text>
            </Pressable>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  listEmpty: { flexGrow: 1 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  name: { flex: 1, fontSize: 16, fontWeight: '700' },
  action: { fontSize: 15, fontWeight: '700' },
});
