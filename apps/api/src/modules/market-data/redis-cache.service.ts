import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';

interface RedisJsonCacheOptions {
  readonly ttlSeconds: number;
}

/**
 * RedisCacheService provides small JSON get/set helpers for Redis.
 */
@Injectable()
export class RedisCacheService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisCacheService.name);
  private readonly redisClient: Redis;

  public constructor() {
    const redisUrl = process.env.REDIS_URL;
    if (redisUrl) {
      this.redisClient = new Redis(redisUrl);
      return;
    }
    const host = process.env.REDIS_HOST ?? 'localhost';
    const port = Number(process.env.REDIS_PORT ?? 6379);
    const password = process.env.REDIS_PASSWORD;
    this.redisClient = new Redis({ host, port, password });
  }

  public async onModuleDestroy(): Promise<void> {
    await this.redisClient.quit();
  }

  /**
   * Get a cached JSON value.
   */
  public async getJson<TValue>(key: string): Promise<TValue | null> {
    try {
      const raw = await this.redisClient.get(key);
      if (!raw) {
        return null;
      }
      return JSON.parse(raw) as TValue;
    } catch (err) {
      this.logger.warn(`Redis GET failed for key=${key}: ${String(err)}`);
      return null;
    }
  }

  /**
   * Set a cached JSON value.
   */
  public async setJson(key: string, value: unknown, options: RedisJsonCacheOptions): Promise<void> {
    try {
      const payload = JSON.stringify(value);
      await this.redisClient.set(key, payload, 'EX', options.ttlSeconds);
    } catch (err) {
      this.logger.warn(`Redis SET failed for key=${key}: ${String(err)}`);
    }
  }
}
