import { AvatarHues } from '@/constants/theme';

const ADJECTIVES = [
  'Sessiz', 'Meraklı', 'Uykusuz', 'Gizli', 'Balkondaki', 'Kapıcı', 'Sinsi', 'Şüpheli',
  'Neşeli', 'Huysuz', 'Gece', 'Sabahçı', 'Dedikoducu', 'Sakin', 'Kurnaz', 'Şaşkın',
  'Yorgun', 'Kıskanç', 'Efsane', 'Gölge',
];

const NOUNS = [
  'Kedi', 'Martı', 'Komşu', 'Teyze', 'Amca', 'Bakkal', 'Simitçi', 'Kargacı', 'Çaycı',
  'Balkon', 'Perde', 'Sokak', 'Fener', 'Apartman', 'Muhtar', 'Dolmuş', 'Kapıcı', 'Sarmaşık',
  'Hurma', 'Kestane',
];

export function randomNickname(): string {
  const a = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const n = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  const num = Math.floor(Math.random() * 90) + 10;
  return `${a}${n}${num}`;
}

export function randomHue(): number {
  return Math.floor(Math.random() * AvatarHues.length);
}

export function hueColor(hue: number): string {
  return AvatarHues[((hue % AvatarHues.length) + AvatarHues.length) % AvatarHues.length];
}

export const NICKNAME_MIN = 3;
export const NICKNAME_MAX = 20;
const NICKNAME_RE = /^[\p{L}\p{N}_]+$/u;

export function validateNickname(n: string): string | null {
  const t = n.trim();
  if (t.length < NICKNAME_MIN) return `En az ${NICKNAME_MIN} karakter.`;
  if (t.length > NICKNAME_MAX) return `En fazla ${NICKNAME_MAX} karakter.`;
  if (!NICKNAME_RE.test(t)) return 'Sadece harf, rakam ve alt çizgi.';
  return null;
}
