import "dotenv/config";

function required(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Falta la variable de entorno obligatoria: ${name}`);
  }
  return value;
}

export const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT || 3000),
  databaseUrl: required("DATABASE_URL"),
  databaseSsl: String(process.env.DATABASE_SSL || "false").toLowerCase() === "true",
  redisUrl: required("REDIS_URL"),
  sessionSecret: required("SESSION_SECRET"),
  trustProxy: Number(process.env.TRUST_PROXY || 1)
};

export const isProduction = env.nodeEnv === "production";
