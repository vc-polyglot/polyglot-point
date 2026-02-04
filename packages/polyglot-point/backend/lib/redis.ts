import Redis from "ioredis";

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

export const redis = new Redis(REDIS_URL, {
  maxRetriesPerRequest: 3,
  enableReadyCheck: false,
  retryStrategy: (times: number) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
});

/**
 * Chequeo sencillo para /health u otros servicios
 */
export async function checkRedisConnection(): Promise<"connected" | "disconnected"> {
  try {
    await redis.ping();
    return "connected";
  } catch (error) {
    console.error("Redis connection error:", error);
    return "disconnected";
  }
}
