import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from "@nestjs/common";
import { Redis } from "ioredis";

@Injectable()
export class CacheService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CacheService.name);
  private redisClient: Redis | null = null;
  private memoryCache = new Map<string, { value: string; expiry: number | null }>();
  private useMemory = true;

  onModuleInit() {
    const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
    try {
      this.redisClient = new Redis(redisUrl, {
        maxRetriesPerRequest: 1,
        connectTimeout: 2000,
        retryStrategy: (times: number) => {
          if (times > 2) {
            this.logger.warn("Redis connection failed. Falling back to In-Memory Cache.");
            this.useMemory = true;
            return null; // Stop retrying
          }
          return 500;
        }
      });

      this.redisClient.on("connect", () => {
        this.logger.log("Redis connected successfully.");
        this.useMemory = false;
      });

      this.redisClient.on("error", (err: Error) => {
        this.logger.debug(`Redis connection error: ${err.message}`);
        this.useMemory = true;
      });
    } catch (err: any) {
      this.logger.warn(`Failed to initialize Redis client: ${err.message}. Using In-Memory Cache.`);
      this.useMemory = true;
    }
  }

  async onModuleDestroy() {
    if (this.redisClient) {
      try {
        await this.redisClient.quit();
      } catch {
        // ignore errors on quit
      }
    }
  }

  async get<T>(key: string): Promise<T | null> {
    if (!this.useMemory && this.redisClient) {
      try {
        const val = await this.redisClient.get(key);
        return val ? (JSON.parse(val) as T) : null;
      } catch (err: any) {
        this.logger.warn(`Redis get failed: ${err.message}. Falling back to memory.`);
      }
    }

    const cached = this.memoryCache.get(key);
    if (!cached) return null;

    if (cached.expiry && cached.expiry < Date.now()) {
      this.memoryCache.delete(key);
      return null;
    }

    return JSON.parse(cached.value) as T;
  }

  async set(key: string, value: any, ttlSeconds?: number): Promise<void> {
    const valString = JSON.stringify(value);
    if (!this.useMemory && this.redisClient) {
      try {
        if (ttlSeconds) {
          await this.redisClient.set(key, valString, "EX", ttlSeconds);
        } else {
          await this.redisClient.set(key, valString);
        }
        return;
      } catch (err: any) {
        this.logger.warn(`Redis set failed: ${err.message}. Saving in memory.`);
      }
    }

    const expiry = ttlSeconds ? Date.now() + ttlSeconds * 1000 : null;
    this.memoryCache.set(key, { value: valString, expiry });
  }

  async del(key: string): Promise<void> {
    if (!this.useMemory && this.redisClient) {
      try {
        await this.redisClient.del(key);
        return;
      } catch (err: any) {
        this.logger.warn(`Redis del failed: ${err.message}. Deleting from memory.`);
      }
    }
    this.memoryCache.delete(key);
  }

  async clearPattern(pattern: string): Promise<void> {
    if (!this.useMemory && this.redisClient) {
      try {
        const keys = await this.redisClient.keys(pattern);
        if (keys.length > 0) {
          await this.redisClient.del(...keys);
        }
        return;
      } catch (err: any) {
        this.logger.warn(`Redis clearPattern failed: ${err.message}. Clearing memory match.`);
      }
    }

    // fallback memory regex matching
    const escapedPattern = pattern.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");
    const regexPattern = new RegExp("^" + escapedPattern.replace(/\\\*/g, ".*") + "$");
    for (const key of this.memoryCache.keys()) {
      if (regexPattern.test(key)) {
        this.memoryCache.delete(key);
      }
    }
  }
}
