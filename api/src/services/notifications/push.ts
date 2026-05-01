import admin from "firebase-admin";
import { config } from "../../config";

let initialized = false;

function getApp(): typeof admin | null {
  if (!initialized && config.FIREBASE_PROJECT_ID && config.FIREBASE_PRIVATE_KEY) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: config.FIREBASE_PROJECT_ID,
        privateKey: config.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
        clientEmail: config.FIREBASE_CLIENT_EMAIL,
      }),
    });
    initialized = true;
  }
  return initialized ? admin : null;
}

export async function sendPush(fcmToken: string, title: string, body: string): Promise<void> {
  const app = getApp();
  if (!app) { console.log(`[PUSH STUB] Token: ${fcmToken} | ${title}: ${body}`); return; }
  await app.messaging().send({ token: fcmToken, notification: { title, body } });
}
