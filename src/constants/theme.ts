import { Platform } from 'react-native';

/**
 * Third Place palette. Dark-first: gossip happens at night.
 * Accent is a hot coral that reads as "drama" without being alarm-red.
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
  bubbleMine: string;
  bubbleTheirs: string;
  success: string;
  danger: string;
};

export const Colors: Record<'light' | 'dark', ThemeColors> = {
  light: {
    text: '#15131A',
    textSecondary: '#6B6877',
    textTertiary: '#9A97A6',
    background: '#FAF8FC',
    surface: '#FFFFFF',
    surfaceElevated: '#F1EEF6',
    border: '#E6E2EE',
    accent: '#F0385C',
    accentSoft: '#FDE4EA',
    onAccent: '#FFFFFF',
    bubbleMine: '#F0385C',
    bubbleTheirs: '#EFEBF4',
    success: '#1FA971',
    danger: '#D92D20',
  },
  dark: {
    text: '#F5F2FA',
    textSecondary: '#A7A2B5',
    textTertiary: '#6F6A7E',
    background: '#0E0D12',
    surface: '#17151E',
    surfaceElevated: '#211E2B',
    border: '#2B2836',
    accent: '#FF4D6D',
    accentSoft: '#3A1B26',
    onAccent: '#FFFFFF',
    bubbleMine: '#FF4D6D',
    bubbleTheirs: '#221F2C',
    success: '#3DD68C',
    danger: '#FF6B6B',
  },
};

export type ThemeColor = keyof ThemeColors;

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

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const Radius = {
  sm: 8,
  md: 14,
  lg: 20,
  pill: 999,
} as const;

/** Distinct, readable avatar hues for pseudonymous users (both themes). */
export const AvatarHues = [
  '#FF4D6D', '#FF8A3D', '#FFC53D', '#3DD68C', '#2DD4BF',
  '#3B9EFF', '#7C6CFF', '#C56CFF', '#FF6CB5', '#8CD867',
] as const;
