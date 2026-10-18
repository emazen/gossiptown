import { Platform, type TextStyle } from 'react-native';

/**
 * Gossiptown: tabloid energy on a premium base.
 * Warm cream paper and ink carry the layout; lipstick red is the voice
 * (primary actions, my bubbles, reply counts, the selected tab) and a
 * highlighter yellow marks what is worth a look (the place chip, "Gündemde").
 * Display type is Bricolage Grotesque; body and UI text stay on the system font.
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
  /** Highlighter marks: the place chip, the "Gündemde" tag, the wordmark. */
  highlight: string;
  onHighlight: string;
  ink: string;
  onInk: string;
  bubbleMine: string;
  bubbleTheirs: string;
  success: string;
  danger: string;
};

export const Colors: Record<'light' | 'dark', ThemeColors> = {
  light: {
    text: '#1A1714',
    textSecondary: '#5C554C',
    textTertiary: '#978F84',
    background: '#FBF6EE',
    surface: '#FFFDF9',
    surfaceElevated: '#F3ECE1',
    border: '#E8DFD2',
    accent: '#E5243B',
    accentSoft: '#FCE3E4',
    onAccent: '#FFFFFF',
    highlight: '#FFE14D',
    onHighlight: '#1A1714',
    ink: '#1A1714',
    onInk: '#FBF6EE',
    bubbleMine: '#E5243B',
    bubbleTheirs: '#F1E9DD',
    success: '#2F8F5B',
    danger: '#B42318',
  },
  dark: {
    text: '#F3EEE6',
    textSecondary: '#ABA397',
    textTertiary: '#6F685E',
    background: '#141210',
    surface: '#1D1A17',
    surfaceElevated: '#28241F',
    border: '#332E28',
    accent: '#FF4D5E',
    accentSoft: '#3D1A1E',
    onAccent: '#FFFFFF',
    highlight: '#FFD84A',
    onHighlight: '#141210',
    ink: '#F3EEE6',
    onInk: '#141210',
    bubbleMine: '#FF4D5E',
    bubbleTheirs: '#28241F',
    success: '#6CCB93',
    danger: '#FF7A70',
  },
};

export type ThemeColor = keyof ThemeColors;

/** Loaded in the root layout with useFonts; names must match those keys. */
export const Display = {
  medium: 'BricolageGrotesque_500Medium',
  semibold: 'BricolageGrotesque_600SemiBold',
  bold: 'BricolageGrotesque_700Bold',
  extrabold: 'BricolageGrotesque_800ExtraBold',
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

/** Type scale. Display styles set no fontWeight: the weight is in the font file. */
export const Type = {
  /** Screen titles: Konular, Canlı, Mesajlar, Ben. */
  display: { fontFamily: Display.extrabold, fontSize: 36, lineHeight: 40, letterSpacing: -1.2 },
  /** Thread headline on its own page, onboarding headings. */
  headline: { fontFamily: Display.bold, fontSize: 28, lineHeight: 32, letterSpacing: -0.8 },
  /** Thread headline in the feed. */
  title: { fontFamily: Display.bold, fontSize: 20, lineHeight: 25, letterSpacing: -0.4 },
  /** Names and other short display moments. */
  name: { fontFamily: Display.semibold, fontSize: 16, lineHeight: 21, letterSpacing: -0.2 },
  /** Empty states and asides. */
  aside: { fontFamily: Display.medium, fontSize: 17, lineHeight: 24, letterSpacing: -0.2 },
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

/** Candy tones for pseudonymous avatars; white initials read on all of them. */
export const AvatarHues = [
  '#E5484D', '#F76B15', '#C98A00', '#30A46C', '#12A594',
  '#0090FF', '#6E56CF', '#AB4ABA', '#E93D82', '#8E4EC6',
] as const;
