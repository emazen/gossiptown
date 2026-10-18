import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Linking, Platform, StyleSheet, Text, TextInput, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { Button } from '@/components/button';
import { Screen } from '@/components/screen';
import { S } from '@/constants/strings';
import { Radius, Serif, Spacing, Type } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { randomHue, randomNickname, validateNickname } from '@/lib/nickname';
import { useNeighborhood } from '@/providers/neighborhood';
import { useSession } from '@/providers/session';

/**
 * Two steps, each self-healing:
 *   1. pick a nickname (creates the profile)
 *   2. grant location (registers the neighborhood)
 * Users who later lose location permission land back on step 2.
 */
export default function Onboarding() {
  const { profile } = useSession();
  return profile ? <LocationStep /> : <NameStep />;
}

function NameStep() {
  const t = useTheme();
  const { saveProfile } = useSession();
  const [name, setName] = useState(randomNickname);
  const [hue, setHue] = useState(randomHue);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const shuffle = () => {
    setName(randomNickname());
    setHue(randomHue());
    setErr(null);
  };

  const submit = async () => {
    const v = validateNickname(name);
    if (v) return setErr(v);
    setBusy(true);
    setErr(null);
    try {
      await saveProfile(name, hue);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setErr(msg.includes('profiles_nickname_ci') ? 'Bu isim alınmış. Başka bir tane dene.' : S.errors.generic);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen edges={['top', 'bottom']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <View style={styles.body}>
          <Text style={[styles.brand, { color: t.accent }]}>{S.appName}</Text>
          <Text style={[styles.h1, { color: t.text }]}>{S.onboarding.pickNameTitle}</Text>
          <Text style={[styles.p, { color: t.textSecondary }]}>{S.onboarding.pickNameBody}</Text>

          <View style={[styles.nameRow, { backgroundColor: t.surface, borderColor: t.border }]}>
            <Avatar nickname={name} hue={hue} size={44} />
            <TextInput
              value={name}
              onChangeText={(v) => {
                setName(v);
                setErr(null);
              }}
              autoCapitalize="none"
              autoCorrect={false}
              maxLength={20}
              style={[styles.nameInput, { color: t.text }]}
              returnKeyType="done"
              onSubmitEditing={submit}
            />
            <Ionicons name="shuffle" size={21} color={t.textSecondary} onPress={shuffle} accessibilityLabel={S.onboarding.shuffle} />
          </View>
          {err && <Text style={[styles.err, { color: t.danger }]}>{err}</Text>}

          <View style={[styles.rules, { backgroundColor: t.surface, borderColor: t.border }]}>
            {S.onboarding.rules.map((r, i) => (
              <View key={r} style={styles.ruleRow}>
                <Text style={[styles.ruleNum, { color: t.accent }]}>{i + 1}</Text>
                <Text style={[styles.rule, { color: t.textSecondary }]}>{r}</Text>
              </View>
            ))}
          </View>
        </View>
        <View style={styles.footer}>
          <Button onPress={submit} loading={busy}>
            {S.onboarding.agree}
          </Button>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

function LocationStep() {
  const t = useTheme();
  const { status, outsideCity, error, refresh } = useNeighborhood();
  const [asked, setAsked] = useState(false);

  // If we already had permission from a previous session, just go.
  useEffect(() => {
    if (status === 'idle' && !asked) {
      setAsked(true);
      refresh();
    }
  }, [status, asked, refresh]);

  const locating = status === 'locating' || (status === 'idle' && asked);

  let title: string = S.onboarding.heroTitle;
  let body: string = S.onboarding.heroBody;
  let cta: string = S.onboarding.enableLocation;
  let onPress: () => void = refresh;

  if (status === 'denied') {
    body = S.onboarding.permissionDenied;
    cta = S.onboarding.openSettings;
    onPress = () => Linking.openSettings();
  } else if (status === 'unsupported') {
    title = S.onboarding.unsupportedTitle;
    body = S.onboarding.unsupportedBody(outsideCity);
    cta = S.onboarding.retry;
  } else if (status === 'error') {
    body = `${S.errors.generic}\n${error ?? ''}`.trim();
    cta = S.onboarding.retry;
  }

  return (
    <Screen edges={['top', 'bottom']}>
      <View style={styles.body}>
        <Text style={[styles.brand, { color: t.accent }]}>{S.appName}</Text>
        <View style={[styles.iconWrap, { borderColor: t.border }]}>
          <Ionicons name="location-outline" size={28} color={t.text} />
        </View>
        <Text style={[styles.h1, { color: t.text }]}>{title}</Text>
        <Text style={[styles.p, { color: t.textSecondary }]}>{body}</Text>
        <Text style={[styles.p, styles.tagline, { color: t.textTertiary }]}>{S.tagline}</Text>
      </View>
      <View style={styles.footer}>
        <Button onPress={onPress} loading={locating}>
          {locating ? S.onboarding.locating : cta}
        </Button>
        {status === 'denied' && (
          <Button onPress={refresh} variant="ghost">
            {S.onboarding.retry}
          </Button>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  body: { flex: 1, padding: Spacing.xl, gap: Spacing.lg, justifyContent: 'center' },
  footer: { padding: Spacing.xl, gap: Spacing.sm },
  brand: { fontFamily: Serif.italic, fontSize: 20, lineHeight: 26 },
  h1: { ...Type.display },
  p: { fontSize: 17, lineHeight: 25 },
  tagline: { fontFamily: Serif.italic, fontSize: 16 },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: StyleSheet.hairlineWidth * 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  nameInput: { flex: 1, fontFamily: Serif.medium, fontSize: 19 },
  err: { fontSize: 13, marginTop: -Spacing.sm },
  rules: { padding: Spacing.lg, borderRadius: Radius.lg, borderWidth: StyleSheet.hairlineWidth, gap: Spacing.md },
  ruleRow: { flexDirection: 'row', gap: Spacing.md, alignItems: 'flex-start' },
  ruleNum: { fontFamily: Serif.semibold, fontSize: 16, lineHeight: 20, width: 12 },
  rule: { flex: 1, fontSize: 14, lineHeight: 20 },
});
