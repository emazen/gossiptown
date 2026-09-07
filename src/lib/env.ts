/**
 * Public runtime config. Only EXPO_PUBLIC_* vars are bundled into the app.
 * Never put service-role keys here.
 */
export const ENV = {
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL ?? '',
  supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '',
  /**
   * Dev only: "lat,lng" to fake the device position (simulators default to Cupertino).
   * Example: 40.9906,29.0270 (Kadıköy / Caferağa)
   */
  mockLocation: process.env.EXPO_PUBLIC_MOCK_LOCATION ?? '',
};

export const isSupabaseConfigured = Boolean(ENV.supabaseUrl && ENV.supabaseAnonKey);
