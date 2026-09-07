import { createClient } from "redis";
import { env } from "../config/env.js";

export const redisClient = createClient({
  url: env.redisUrl
});

redisClient.on("error", (error) => {
  console.error("[redis] error", error);
});

export async function connectRedis() {
  if (!redisClient.isOpen) {
    await redisClient.connect();
  }
}
