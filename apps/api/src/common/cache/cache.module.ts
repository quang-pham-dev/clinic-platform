import { CacheService } from './cache.service';
import { Module } from '@nestjs/common';

/**
 * Global CacheModule — import once in AppModule with isGlobal via providers.
 * CacheService is added to AppModule providers directly for global availability.
 */
@Module({
  providers: [CacheService],
  exports: [CacheService],
})
export class CacheModule {}
