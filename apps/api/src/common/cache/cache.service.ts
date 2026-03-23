import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

export interface CacheOptions {
  /** TTL in seconds. Default: 60 */
  ttl?: number;
}

/**
 * Lightweight Redis-backed cache service built on top of ioredis.
 *
 * Benefits:
 * - Reuses the same Redis connection config as RedisService (no extra deps)
 * - Type-safe generic get/set/del
 * - Handles serialization internally
 * - auto-prefixed keys to avoid collisions
 */
@Injectable()
export class CacheService {
  private readonly client: Redis;
  private readonly logger = new Logger(CacheService.name);
  private readonly DEFAULT_TTL = 60; // seconds

  constructor(private readonly configService: ConfigService) {
    this.client = new Redis({
      host: this.configService.get<string>('redis.host', 'localhost'),
      port: this.configService.get<number>('redis.port', 6379),
      password: this.configService.get<string>('redis.password') || undefined,
      lazyConnect: true,
      keyPrefix: 'cache:',
    });

    this.client.on('error', (err) => {
      this.logger.error('Redis CacheService error', err);
    });
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const raw = await this.client.get(key);
      if (raw === null) return null;
      return JSON.parse(raw) as T;
    } catch (err) {
      this.logger.warn(`Cache GET failed for key "${key}"`, err);
      return null;
    }
  }

  async set<T>(key: string, value: T, options?: CacheOptions): Promise<void> {
    try {
      const ttl = options?.ttl ?? this.DEFAULT_TTL;
      await this.client.set(key, JSON.stringify(value), 'EX', ttl);
    } catch (err) {
      this.logger.warn(`Cache SET failed for key "${key}"`, err);
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.client.del(key);
    } catch (err) {
      this.logger.warn(`Cache DEL failed for key "${key}"`, err);
    }
  }

  /** Delete all keys matching a glob pattern, e.g. "doctors:*" */
  async delByPattern(pattern: string): Promise<void> {
    try {
      const keys = await this.client.keys(pattern);
      if (keys.length > 0) {
        await this.client.del(...keys);
      }
    } catch (err) {
      this.logger.warn(`Cache DEL by pattern failed for "${pattern}"`, err);
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.quit();
  }
}
