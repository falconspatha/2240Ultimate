export const env = {
  supabaseUrl: window?._env?.SUPABASE_URL ?? "",
  supabaseAnonKey: window?._env?.SUPABASE_ANON_KEY ?? "",
};

export const appConfig = {
  pageSize: 10,
  retryCount: 2,
};
