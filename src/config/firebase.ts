import * as admin from 'firebase-admin';
import serviceAccount from './cosaifapp-firebase-adminsdk-fbsvc-a3c14d6bfb.json'; // objeto, no ruta

// Evita multiplicarlo si PM2 crea más forks
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
  });
}

export const messaging = admin.messaging();
export default admin; // Por si luego necesitas admin.auth(), etc.
