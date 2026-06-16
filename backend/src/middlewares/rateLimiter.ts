import { Context } from 'telegraf';
import { redis } from '../config/redis';

const MAX_ATTEMPTS = 5;
const WINDOW_SECONDS = 60;

/**
 * Custom security block designed to limit transaction brute-forcing
 * Tracks user interaction bursts using active Telegram IDs
 */
export async function checkRateLimit(ctx: Context, userId: number): Promise<boolean> {
  const redisKey = `rate:${userId}:invoice_lookup`;
  
  // Increment lookup history signature metric
  const currentAttempts = await redis.incr(redisKey);
  
  if (currentAttempts === 1) {
    // Set expiry constraint block on first dynamic creation instance
    await redis.expire(redisKey, WINDOW_SECONDS);
  }
  
  if (currentAttempts > MAX_ATTEMPTS) {
    const timeLeft = await redis.ttl(redisKey);
    await ctx.reply(`⚠️ **Security Lockout active.**\nToo many invoice lookup attempts. Please wait ${timeLeft} seconds before trying again.`);
    return false; // Lock out application interaction flow
  }
  
  return true; // Execution cleared
}