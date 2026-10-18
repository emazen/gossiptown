import { Platform, type TextStyle } from 'react-native';

/**
 * Gossiptown: a neighbourhood paper, not a social network.
 * Warm paper and ink, one brick-vermilion accent used sparingly (links,
 * unread dots, the selected tab mark). Primary actions are ink, not accent.
 * Display type is Fraunces (serif); UI and body text stay on the system font.
 */
export type ThemeColors = {
  text: string;
  textSecondary: string;
  textTertiary: string;
  background: string;
  surface: string;
  surfaceElevated: string;
  border: string;
  accent: string;
  accentSoft: string;
  onAccent: string;
  /** Primary buttons, the new-thread button, my chat bubbles. Flips with the scheme. */
  ink: string;
  onInk: string;
  bubbleMine: string;
  bubbleTheirs: string;
  success: string;
  danger: string;
};

export const Colors: Record<'light' | 'dark', ThemeColors> = {
  light: {
    text: '#1C1A17',
    textSecondary: '#5E584F',
    textTertiary: '#9A9286',
    background: '#F6F2EB',
    surface: '#FCFAF6',
    surfaceElevated: '#EDE7DD',
    border: '#E0D8CB',
    accent: '#C2412B',
    accentSoft: '#F2DFD7',
    onAccent: '#FFFFFF',
    ink: '#1C1A17',
    onInk: '#F6F2EB',
    bubbleMine: '#1C1A17',
    bubbleTheirs: '#EAE3D8',
    success: '#4E7A52',
    danger: '#B3261E',
  },
  dark: {
    text: '#EEE9E1',
    textSecondary: '#A69F94',
    textTertiary: '#6E685F',
    background: '#131210',
    surface: '#1B1916',
    surfaceElevated: '#25221E',
    border: '#2E2A25',
    accent: '#E5694E',
    accentSoft: '#3A231B',
    onAccent: '#FFFFFF',
    ink: '#EEE9E1',
    onInk: '#131210',
    bubbleMine: '#EEE9E1',
    bubbleTheirs: '#25221E',
    success: '#7FAE83',
    danger: '#F2867C',
  },
};

export type ThemeColor = keyof ThemeColors;

/** Loaded in the root layout with useFonts; names must match those keys. */
export const Serif = {
  regular: 'Fraunces_400Regular',
  italic: 'Fraunces_400Regular_Italic',
  medium: 'Fraunces_500Medium',
  semibold: 'Fraunces_600SemiBold',
} as const;

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
})!;

/** Type scale. Serif styles set no fontWeight: the weight is in the font file. */
export const Type = {
  /** Screen titles: Konular, Canlı, Mesajlar, Ben. */
  display: { fontFamily: Serif.semibold, fontSize: 34, lineHeight: 40, letterSpacing: -0.6 },
  /** Thread headline on its own page, onboarding headings. */
  headline: { fontFamily: Serif.semibold, fontSize: 27, lineHeight: 33, letterSpacing: -0.4 },
  /** Thread headline in the feed. */
  title: { fontFamily: Serif.semibold, fontSize: 20, lineHeight: 26, letterSpacing: -0.2 },
  /** Names and small serif moments. */
  name: { fontFamily: Serif.medium, fontSize: 17, lineHeight: 22 },
  /** Empty states and asides. */
  aside: { fontFamily: Serif.italic, fontSize: 17, lineHeight: 25 },
  body: { fontSize: 16, lineHeight: 23 },
  small: { fontSize: 15, lineHeight: 21 },
  meta: { fontSize: 13, lineHeight: 17, fontWeight: '500' },
  /** Section labels: sentence case, never uppercase. */
  label: { fontSize: 13, lineHeight: 17, fontWeight: '600' },
} satisfies Record<string, TextStyle>;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 32,
} as const;

export const Radius = {
  sm: 6,
  md: 12,
  lg: 16,
  pill: 999,
} as const;

/** Muted, earthy avatar tones; white serif initials read on all of them. */
export const AvatarHues = [
  '#B0634A', '#B98A45', '#8A8848', '#5F7E5B', '#4E7976',
  '#4F6B8A', '#6A5D88', '#8B5878', '#A15B5B', '#76664F',
] as const;
