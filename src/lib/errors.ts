import { S } from '@/constants/strings';

/** Map Postgres/Supabase errors to something a human can act on. */
export function friendlyError(e: unknown): string {
  const msg = e instanceof Error ? e.message : typeof e === 'object' && e && 'message' in e ? String((e as { message: unknown }).message) : String(e);
  const code = typeof e === 'object' && e && 'code' in e ? String((e as { code: unknown }).code) : '';
  if (code === 'P0002' || /rate limited/i.test(msg)) return S.errors.tooFast;
  if (code === 'P0001' || /suspended/i.test(msg)) return 'Hesabın askıya alındı.';
  if (/row-level security|violates/i.test(msg)) return S.errors.notInNeighborhood;
  if (/check constraint/i.test(msg)) return S.errors.tooLong;
  if (/network|fetch/i.test(msg)) return S.errors.offline;
  return S.errors.generic;
}
