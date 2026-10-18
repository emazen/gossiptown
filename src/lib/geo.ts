import * as Location from 'expo-location';

import { ENV } from '@/lib/env';

/** Cities we are live in. Keys are normalized (lowercase, ASCII-folded). */
export const SUPPORTED_CITIES: Record<string, string> = {
  istanbul: 'İstanbul',
  ankara: 'Ankara',
  izmir: 'İzmir',
};

export type Coords = { lat: number; lng: number };

/** Lowercase + strip Turkish diacritics so "İstanbul", "Istanbul", "istanbul" all match. */
export function normalizeKey(input: string): string {
  return input
    .trim()
    .replace(/İ/g, 'i')
    .replace(/I/g, 'i')
    .toLowerCase()
    .replace(/ı/g, 'i')
    .replace(/ş/g, 's')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

/**
 * Best-effort province name for the "not here yet" screen. The room itself is
 * decided server-side from lat/lng (`set_location`); never send this name.
 * Returns null for our own cities or when the geocoder has nothing.
 */
export async function cityAt({ lat, lng }: Coords): Promise<string | null> {
  try {
    const [a] = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
    const city = a?.region ?? a?.city ?? null;
    if (!city || normalizeKey(city) in SUPPORTED_CITIES) return null;
    return city;
  } catch {
    return null;
  }
}

export type LocateResult =
  | { status: 'ok'; coords: Coords }
  | { status: 'denied' }
  | { status: 'error'; message: string };

/** Ask for permission and read position. */
export async function locate(): Promise<LocateResult> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') return { status: 'denied' };

  try {
    let lat: number;
    let lng: number;
    const mock = __DEV__ ? parseMock(ENV.mockLocation) : null;
    if (mock) {
      [lat, lng] = mock;
    } else {
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      lat = pos.coords.latitude;
      lng = pos.coords.longitude;
    }

    return { status: 'ok', coords: { lat, lng } };
  } catch (e) {
    return { status: 'error', message: e instanceof Error ? e.message : String(e) };
  }
}

function parseMock(value: string): [number, number] | null {
  const m = value.split(',').map((s) => Number(s.trim()));
  if (m.length === 2 && m.every((n) => Number.isFinite(n))) return [m[0], m[1]];
  return null;
}
