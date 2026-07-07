import { getApps, initializeApp, cert } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';
import serviceAccount from './cosaifapp-firebase-adminsdk-fbsvc-a3c14d6bfb.json'; // objeto, no ruta

// Evita multiplicarlo si PM2 crea mas forks
const apps = getApps();
if (!apps.length) {
  initializeApp({
    credential: cert(serviceAccount as any),
  });
}

export const messaging = getMessaging();
