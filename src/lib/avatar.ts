import * as ImagePicker from 'expo-image-picker';

import { S } from '@/constants/strings';
import { supabase } from '@/lib/supabase';

const MAX_BYTES = 2 * 1024 * 1024;

export type PickResult = { status: 'ok'; url: string } | { status: 'cancelled' } | { status: 'error'; message: string };

/**
 * Let the user pick a square photo, upload it to avatars/<uid>/avatar.jpg,
 * and store the public URL on their profile. Returns the cache-busted URL.
 */
export async function pickAndUploadAvatar(userId: string): Promise<PickResult> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) return { status: 'error', message: S.onboarding.permissionDenied };

  const res = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.7,
    exif: false,
  });
  if (res.canceled || !res.assets[0]) return { status: 'cancelled' };
  const asset = res.assets[0];

  const blob = await fetch(asset.uri).then((r) => r.arrayBuffer());
  if (blob.byteLength > MAX_BYTES) return { status: 'error', message: S.me.photoTooBig };

  const path = `${userId}/avatar.jpg`;
  const { error: upErr } = await supabase.storage
    .from('avatars')
    .upload(path, blob, { contentType: 'image/jpeg', upsert: true });
  if (upErr) return { status: 'error', message: upErr.message };

  const { data } = supabase.storage.from('avatars').getPublicUrl(path);
  const url = `${data.publicUrl}?v=${Date.now()}`;
  const { error: dbErr } = await supabase.from('profiles').update({ avatar_url: url }).eq('id', userId);
  if (dbErr) return { status: 'error', message: dbErr.message };
  return { status: 'ok', url };
}

export async function removeAvatar(userId: string): Promise<void> {
  await supabase.storage.from('avatars').remove([`${userId}/avatar.jpg`]);
  await supabase.from('profiles').update({ avatar_url: null }).eq('id', userId);
}
