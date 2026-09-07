import { S } from '@/constants/strings';

export function timeAgo(iso: string, now = Date.now()): string {
  const diff = Math.max(0, now - new Date(iso).getTime());
  const m = Math.floor(diff / 60_000);
  if (m < 1) return S.time.now;
  if (m < 60) return S.time.m(m);
  const h = Math.floor(m / 60);
  if (h < 24) return S.time.h(h);
  return S.time.d(Math.floor(h / 24));
}

export function clockTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
}
