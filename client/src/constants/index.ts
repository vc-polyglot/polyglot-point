export const CONSTANTS = {
  DAILY_LIMIT: 10,
  ONE_DAY_MS: 24 * 60 * 60 * 1000,
  API_BASE: import.meta.env.VITE_API_URL || "https://polyglot-point-production.up.railway.app",
} as const;
