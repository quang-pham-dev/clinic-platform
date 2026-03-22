import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

const REFRESH_TOKEN_PREFIX = 'user:refresh:';
const REFRESH_TOKEN_TTL = 7 * 24 * 60 * 60; // 7 days in seconds

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private client: Redis;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit(): void {
    this.client = new Redis({
      host: this.configService.get<string>('redis.host', 'localhost'),
      port: this.configService.get<number>('redis.port', 6379),
      password: this.configService.get<string>('redis.password') || undefined,
      lazyConnect: true,
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.quit();
  }

  async setRefreshToken(userId: string, tokenHash: string): Promise<void> {
    await this.client.set(
      `${REFRESH_TOKEN_PREFIX}${userId}`,
      tokenHash,
      'EX',
      REFRESH_TOKEN_TTL,
    );
  }

  async getRefreshToken(userId: string): Promise<string | null> {
    return this.client.get(`${REFRESH_TOKEN_PREFIX}${userId}`);
  }

  async deleteRefreshToken(userId: string): Promise<void> {
    await this.client.del(`${REFRESH_TOKEN_PREFIX}${userId}`);
  }
}
