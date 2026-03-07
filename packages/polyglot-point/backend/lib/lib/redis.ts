import Redis from "ioredis";

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

export const redis = new Redis(REDIS_URL, {
  maxRetriesPerRequest: 3,
  enableReadyCheck: false,
  // ✅ Mantiene el socket vivo — evita que el proxy de Railway lo cierre silenciosamente
  keepAlive: 10000,
  // ✅ Reconecta automáticamente si el socket muere
  reconnectOnError: () => true,
  retryStrategy: (times: number) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  // ✅ TLS requerido por Railway (tu URL es rediss://)
  tls: REDIS_URL.startsWith("rediss://") ? { rejectUnauthorized: false } : undefined,
});

export async function checkRedisConnection(): Promise<"connected" | "disconnected"> {
  try {
    await redis.ping();
    return "connected";
  } catch (error) {
    console.error("Redis connection error:", error);
    return "disconnected";
  }
}