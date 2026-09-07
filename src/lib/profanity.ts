import { normalizeKey } from '@/lib/geo';

/**
 * Client-side pre-filter only. Real moderation is reports + review.
 * Keep this list short and about slurs/threat words, not casual swearing;
 * over-filtering kills the vibe of a gossip app.
 */
const BLOCKED = [
  // ethnic/religious slurs and explicit threat verbs — extend carefully
  'gebertirim', 'öldürürüm', 'oldururum',
].map(normalizeKey);

/** Patterns that look like doxxing: phone numbers, TC kimlik, full addresses. */
const DOXX_PATTERNS: RegExp[] = [
  /\b0?5\d{2}[\s.-]?\d{3}[\s.-]?\d{2}[\s.-]?\d{2}\b/, // TR mobile
  /\b\d{11}\b/, // TC kimlik no
  /\b(daire|kat|no)[:.\s]*\d+\b.*\b(daire|kat|no)[:.\s]*\d+\b/i, // "Kat 3 Daire 7"
];

export type ContentCheck = { ok: true } | { ok: false; reason: 'profanity' | 'doxxing' };

export function checkContent(text: string): ContentCheck {
  const norm = normalizeKey(text);
  if (BLOCKED.some((w) => norm.includes(w))) return { ok: false, reason: 'profanity' };
  if (DOXX_PATTERNS.some((re) => re.test(text))) return { ok: false, reason: 'doxxing' };
  return { ok: true };
}
