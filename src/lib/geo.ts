import * as Location from 'expo-location';

import { ENV } from '@/lib/env';

/** Cities we are live in. Keys are normalized (lowercase, ASCII-folded). */
export const SUPPORTED_CITIES: Record<string, string> = {
  istanbul: 'İstanbul',
  ankara: 'Ankara',
  izmir: 'İzmir',
};

export type ResolvedPlace = {
  city: string;
  district: string;
  name: string;
  lat: number;
  lng: number;
  supported: boolean;
};

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

export function slugify(...parts: string[]): string {
  return parts
    .map((p) => normalizeKey(p).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''))
    .filter(Boolean)
    .join('/');
}

/** Turkish geocoders return "Caferağa Mahallesi" or "Caferağa Mah."; keep just the name. */
function cleanNeighborhoodName(raw: string): string {
  return raw
    .replace(/\s+(mahallesi|mah\.?|mh\.?)$/i, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Map a platform geocode result onto (city, district, neighborhood).
 * iOS and Android disagree on which field holds what in Turkey, so we try
 * several in order of reliability.
 */
export function resolveFromAddress(
  a: Location.LocationGeocodedAddress,
  lat: number,
  lng: number,
): ResolvedPlace {
  // Province (il). Apple: region="İstanbul". Google: region="İstanbul" too. city is sometimes the ilçe.
  const cityRaw = pickSupported([a.region, a.city, a.subregion]) ?? a.region ?? a.city ?? '';
  const cityKey = normalizeKey(cityRaw);
  const supported = cityKey in SUPPORTED_CITIES;
  const city = supported ? SUPPORTED_CITIES[cityKey] : cityRaw || 'Bilinmiyor';

  // District (ilçe). Usually subregion; fall back to city when city != province.
  const districtCandidates = [a.subregion, a.city, a.district].filter(
    (v): v is string => Boolean(v) && normalizeKey(v!) !== cityKey,
  );
  const district = districtCandidates[0] ?? city;

  // Neighborhood (mahalle). Usually district on iOS; may be absent on Android.
  const nameRaw =
    [a.district, a.name].find((v) => v && normalizeKey(v) !== normalizeKey(district) && !/^\d/.test(v)) ??
    district;
  const name = cleanNeighborhoodName(nameRaw);

  return { city, district, name, lat, lng, supported };
}

function pickSupported(candidates: (string | null)[]): string | null {
  for (const c of candidates) {
    if (c && normalizeKey(c) in SUPPORTED_CITIES) return c;
  }
  return null;
}

export type LocateResult =
  | { status: 'ok'; place: ResolvedPlace }
  | { status: 'denied' }
  | { status: 'error'; message: string };

/** Ask for permission, read position, reverse geocode. */
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

    const results = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
    const addr = results[0];
    if (!addr) return { status: 'error', message: 'Adres çözümlenemedi.' };

    return { status: 'ok', place: resolveFromAddress(addr, lat, lng) };
  } catch (e) {
    return { status: 'error', message: e instanceof Error ? e.message : String(e) };
  }
}

function parseMock(value: string): [number, number] | null {
  const m = value.split(',').map((s) => Number(s.trim()));
  if (m.length === 2 && m.every((n) => Number.isFinite(n))) return [m[0], m[1]];
  return null;
}
