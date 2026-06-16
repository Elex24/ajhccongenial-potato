import { Redis } from "@upstash/redis";

// fromEnv() reads UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN,
// and falls back to KV_REST_API_URL / KV_REST_API_TOKEN automatically,
// so this works regardless of which Vercel storage integration you use.
export const redis = Redis.fromEnv();

export const ROOM_TTL_SECONDS = 60 * 60 * 6; // rooms expire after 6 hours of inactivity
