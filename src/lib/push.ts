// Turning reminders on and off on this device.
import { config } from "../config";
import { removePushSub, savePushSub } from "./supabase";

export const pushSupported = () =>
  typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;

/** iPhones only allow notifications once the app is added to the home screen. */
export const isStandalone = () =>
  window.matchMedia?.("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;

const urlB64ToUint8 = (b64: string) => {
  const pad = "=".repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
};

export async function currentSubscription() {
  if (!pushSupported()) return null;
  const reg = await navigator.serviceWorker.getRegistration();
  return reg ? reg.pushManager.getSubscription() : null;
}

export async function enableReminders(hours: number[]) {
  if (!pushSupported()) throw new Error("This browser can't show reminders. On iPhone, add Ardrix to your home screen first.");
  if (!config.vapidPublicKey) throw new Error("Reminders aren't set up on the server yet.");
  const perm = await Notification.requestPermission();
  if (perm !== "granted") throw new Error("Notifications are blocked. Allow them in your phone's settings for Ardrix.");
  const reg = await navigator.serviceWorker.ready;
  const sub = (await reg.pushManager.getSubscription())
    || (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlB64ToUint8(config.vapidPublicKey) }));
  await savePushSub(sub.toJSON(), Intl.DateTimeFormat().resolvedOptions().timeZone || "America/Chicago", hours);
}

export async function disableReminders() {
  const sub = await currentSubscription();
  if (!sub) return;
  await removePushSub(sub.endpoint).catch(() => {});
  await sub.unsubscribe();
}
