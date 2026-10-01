import { getApps, initializeApp, cert } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';
import { resolve } from 'path';

// Evita multiplicarlo si PM2 crea mas forks
const apps = getApps();
if (!apps.length) {
  // La credencial local se guarda fuera del código y de Git.
  const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim();
  const serviceAccountPath = credentialsPath
    ? resolve(process.cwd(), credentialsPath)
    : resolve(__dirname, 'cosaifapp-firebase-adminsdk-fbsvc-a3c14d6bfb.json');
  initializeApp({
    credential: cert(serviceAccountPath),
  });
}

export const messaging = getMessaging();
