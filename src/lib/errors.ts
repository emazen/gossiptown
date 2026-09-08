import { S } from '@/constants/strings';

/** Raw message from an Error, a PostgrestError-like object, or anything else. */
export function errorMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (typeof e === 'object' && e && 'message' in e) return String((e as { message: unknown }).message);
  return String(e);
}

/** Map Postgres/Supabase errors to something a human can act on. */
export function friendlyError(e: unknown): string {
  const msg = errorMessage(e);
  const code = typeof e === 'object' && e && 'code' in e ? String((e as { code: unknown }).code) : '';
  if (code === 'P0002' || /rate limited/i.test(msg)) return S.errors.tooFast;
  if (code === 'P0001' || /suspended/i.test(msg)) return 'Hesabın askıya alındı.';
  if (code === 'P0003' || /cannot (message|add)/i.test(msg)) return S.dms.cannotReach;
  if (/row-level security|violates/i.test(msg)) return S.errors.notInNeighborhood;
  if (/check constraint/i.test(msg)) return S.errors.tooLong;
  if (/network|fetch/i.test(msg)) return S.errors.offline;
  return S.errors.generic;
}
