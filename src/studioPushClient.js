import { studioRequest } from './studioRequest';
export const studioPushSupported = () => typeof window !== 'undefined' && 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window;
export async function currentStudioPush() {
  if (!studioPushSupported()) return null;
  const registration = await navigator.serviceWorker.getRegistration();
  return registration?.pushManager?.getSubscription() || null;
}
export async function enableStudioPush({ base, token, prefs, fixturePrefs }) {
  if (!studioPushSupported()) throw new Error('Push notifications are not supported in this browser.');
  const permission = Notification.permission === 'default' ? await Notification.requestPermission() : Notification.permission;
  if (permission !== 'granted') throw new Error('Permission denied for notifications');
  let registration = await navigator.serviceWorker.getRegistration();
  if (!registration) registration = await navigator.serviceWorker.register('/service-worker.js');
  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    const { publicKey } = await studioRequest(`${base}/api/push/vapid-public-key`);
    const raw = window.atob(publicKey.replace(/-/g, '+').replace(/_/g, '/'));
    subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: Uint8Array.from(raw, character => character.charCodeAt(0)) });
  }
  await studioRequest(`${base}/api/push/subscribe`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ subscription, prefs, fixturePrefs }) });
  return true;
}
