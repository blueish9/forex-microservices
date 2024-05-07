import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Request } from 'express';
import Redis from 'ioredis';
import { InjectRedis } from '@liaoliaots/nestjs-redis';

@Injectable()
export class TransferGuard implements CanActivate {
  //constructor(@InjectRedis() private readonly redis: Redis) {}
  private redis: Redis;

  async canActivate(context: ExecutionContext) {
    const request: Request = context.switchToHttp().getRequest();
    const idempotencyKey = request.headers['Idempotency-Key'] as string;
    if (!idempotencyKey) {
      return false;
    }
    const cacheKey = 'transfer.idempotency:' + idempotencyKey;
    const cache = await this.redis.get(cacheKey);
    if (cache) {
      return false;
    }
    const result = await this.redis.set(cacheKey, idempotencyKey);
    return result === 'OK';
  }
}
