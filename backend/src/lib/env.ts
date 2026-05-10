import dotenv from "dotenv";
dotenv.config();

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

function optional(name: string, fallback: string): string {
  return process.env[name] ?? fallback;
}

function num(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number(raw);
  if (Number.isNaN(parsed)) {
    throw new Error(`Env var ${name} must be a number, got "${raw}"`);
  }
  return parsed;
}

/* CORS_ORIGIN can be a comma-separated list ("http://a.com,http://b.com")
   or a single origin. Empty entries are dropped. */
function originList(name: string, fallback: string): string[] {
  const raw = process.env[name] ?? fallback;
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export const env = {
  NODE_ENV: optional("NODE_ENV", "development"),
  PORT: num("PORT", 5000),

  /* Single string for places that need just one origin (e.g. socket.io cors).
     If multiple are configured, the first is used. */
  CORS_ORIGIN: originList("CORS_ORIGIN", "http://localhost:5173"),

  MONGO_URI: required("MONGO_URI"),

  LOG_LEVEL: optional(
    "LOG_LEVEL",
    process.env.NODE_ENV === "production" ? "info" : "debug"
  ),
} as const;

export const isProd = env.NODE_ENV === "production";
