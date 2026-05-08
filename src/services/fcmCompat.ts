import admin from 'firebase-admin';

type MulticastMessageCompat = {
  tokens: string[];
  [key: string]: unknown;
};

type SendResponseCompat = {
  success: boolean;
  messageId?: string;
  error?: { code: string; message?: string };
};

export async function sendMulticastCompat(message: MulticastMessageCompat) {
  const { tokens, ...payload } = message;

  const responses: SendResponseCompat[] = await Promise.all(
    tokens.map(async (token) => {
      try {
        const messageId = await admin.messaging().send({ ...payload, token } as any);
        return { success: true, messageId };
      } catch (error: any) {
        return {
          success: false,
          error: {
            code: error?.code ?? error?.errorInfo?.code ?? 'messaging/unknown-error',
            message: error?.message,
          },
        };
      }
    })
  );

  return {
    responses,
    successCount: responses.filter((response) => response.success).length,
    failureCount: responses.filter((response) => !response.success).length,
  };
}
