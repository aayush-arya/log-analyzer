import { createClient } from 'redis';
import { config } from '../config';

type RedisClient = ReturnType<typeof createClient>;

let redisClient: RedisClient | null = null;
let redisAvailable = true;

async function connect(): Promise<RedisClient | null> {
  if (!redisAvailable) return null;
  if (redisClient?.isReady) return redisClient;

  try {
    const client = createClient({
      url: config.redisUrl,
      socket: {
        // Only attempt once; do not retry after initial failure
        reconnectStrategy: (retries) => {
          if (retries >= 1) {
            redisAvailable = false;
            return false; // stop retrying
          }
          return 500;
        },
        connectTimeout: 1000,
      },
    });

    client.on('error', () => { /* silenced after first connect attempt */ });

    await client.connect();
    redisClient = client;
    console.log('Redis connected ✓');
    return client;
  } catch {
    // Redis not available; disable silently for this session
    redisAvailable = false;
    return null;
  }
}

// Eagerly attempt connection but do not crash if unavailable
connect().catch(() => { redisAvailable = false; });

export async function cacheSession(sessionId: string, data: unknown, ttlSeconds = 3600): Promise<void> {
  try {
    const client = await connect();
    await client?.setEx(`session:${sessionId}`, ttlSeconds, JSON.stringify(data));
  } catch { /* swallow */ }
}

export async function getCachedSession<T>(sessionId: string): Promise<T | null> {
  try {
    const client = await connect();
    if (!client) return null;
    const raw = await client.get(`session:${sessionId}`);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export async function invalidateSession(sessionId: string): Promise<void> {
  try {
    const client = await connect();
    if (client) await client.del(`session:${sessionId}`);
  } catch { /* swallow */ }
}

export async function closeRedis(): Promise<void> {
  if (redisClient) {
    try { await redisClient.quit(); } catch { /* swallow */ }
    redisClient = null;
  }
}
