// Settings come from public/config.js so they can be changed without rebuilding the app.
interface ArdrixConfig { supabaseUrl: string; supabaseKey: string; vapidPublicKey: string }

declare global { interface Window { ARDRIX_CONFIG?: Partial<ArdrixConfig> } }

const raw = (typeof window !== "undefined" && window.ARDRIX_CONFIG) || {};
export const config: ArdrixConfig = {
  supabaseUrl: raw.supabaseUrl || "",
  supabaseKey: raw.supabaseKey || "",
  vapidPublicKey: raw.vapidPublicKey || "",
};
