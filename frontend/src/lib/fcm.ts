import { initializeApp, getApps } from "firebase/app";
import { getMessaging, getToken, onMessage } from "firebase/messaging";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export function initFcm() {
  if (typeof window === "undefined") return null;
  if (!firebaseConfig.apiKey) return null;
  if (!getApps().length) initializeApp(firebaseConfig);
  return getMessaging();
}

export async function requestPushToken(): Promise<string | null> {
  const messaging = initFcm();
  if (!messaging) return null;
  const permission = await Notification.requestPermission();
  if (permission !== "granted") return null;
  return getToken(messaging, {
    vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
  });
}

export function onForegroundMessage(callback: (payload: any) => void) {
  const messaging = initFcm();
  if (!messaging) return () => {};
  return onMessage(messaging, callback);
}
