import crypto from 'crypto';
import { createClient, type RedisClientType } from 'redis';

type BusEnvelope<T> = {
  origin: string;
  publishedAt: string;
  payload: T;
};

type RealtimeBusState = {
  enabled: boolean;
  connected: boolean;
  channel: string;
  instanceId: string;
  lastError: string | null;
  published: number;
  received: number;
};

const redisUrl = String(process.env.REDIS_URL || '').trim();
const state: RealtimeBusState = {
  enabled: Boolean(redisUrl),
  connected: false,
  channel: process.env.REALTIME_REDIS_CHANNEL || 'cosaif:realtime:v1',
  instanceId: process.env.INSTANCE_ID || crypto.randomUUID(),
  lastError: null,
  published: 0,
  received: 0,
};

let publisher: RedisClientType | null = null;
let subscriber: RedisClientType | null = null;
let initialization: Promise<void> | null = null;

function recordError(error: unknown) {
  state.connected = false;
  state.lastError = error instanceof Error ? error.message : String(error);
}

export function initializeRealtimeBus<T>(onMessage: (payload: T) => void) {
  if (!state.enabled || initialization) return initialization ?? Promise.resolve();

  initialization = (async () => {
    publisher = createClient({ url: redisUrl });
    subscriber = publisher.duplicate();

    publisher.on('error', recordError);
    subscriber.on('error', recordError);
    publisher.on('ready', () => {
      state.connected = true;
      state.lastError = null;
    });

    await Promise.all([publisher.connect(), subscriber.connect()]);
    await subscriber.subscribe(state.channel, (raw) => {
      try {
        const envelope = JSON.parse(raw) as BusEnvelope<T>;
        if (!envelope?.payload || envelope.origin === state.instanceId) return;
        state.received += 1;
        onMessage(envelope.payload);
      } catch (error) {
        recordError(error);
      }
    });
    state.connected = true;
  })().catch((error) => {
    recordError(error);
    console.error('[realtime-bus] Redis no disponible; continuando en modo local.', error);
  });

  return initialization;
}

export async function publishRealtimeBus<T>(payload: T) {
  if (!state.enabled || !publisher?.isReady) return false;

  const envelope: BusEnvelope<T> = {
    origin: state.instanceId,
    publishedAt: new Date().toISOString(),
    payload,
  };
  await publisher.publish(state.channel, JSON.stringify(envelope));
  state.published += 1;
  return true;
}

export function getRealtimeBusStats() {
  return { ...state };
}
