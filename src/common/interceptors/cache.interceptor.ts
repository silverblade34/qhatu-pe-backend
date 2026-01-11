import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Reflector } from '@nestjs/core';
import { CACHE_KEY_METADATA } from '../decorators/cache-key.decorator';
import { RedisService } from 'src/modules/redis/redis.service';

@Injectable()
export class HttpCacheInterceptor implements NestInterceptor {
  private readonly logger = new Logger(HttpCacheInterceptor.name);
  private readonly isDev = process.env.NODE_ENV === 'development';

  constructor(
    private readonly redisService: RedisService,
    private reflector: Reflector,
  ) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest();
    const cacheKeyMetadata = this.reflector.get<string>(
      CACHE_KEY_METADATA,
      context.getHandler(),
    );

    // Solo cachea GET
    if (request.method !== 'GET' || !cacheKeyMetadata) {
      if (this.isDev) {
        this.logger.debug(
          `Skip cache -> ${request.method} ${request.url}`,
        );
      }
      return next.handle();
    }

    const cacheKey = this.generateCacheKey(cacheKeyMetadata, request);

    if (this.isDev) {
      this.logger.debug(`Cache key: ${cacheKey}`);
    }

    // Intentar cache
    const cachedResponse = await this.redisService.get(cacheKey);
    if (cachedResponse) {
      if (this.isDev) {
        this.logger.debug(`Cache HIT -> ${cacheKey}`);
      }
      return of(JSON.parse(cachedResponse));
    }

    if (this.isDev) {
      this.logger.debug(`Cache MISS -> ${cacheKey}`);
    }

    // Guardar respuesta en cache
    return next.handle().pipe(
      tap(async (response) => {
        await this.redisService.set(
          cacheKey,
          JSON.stringify(response),
          3600,
        );
        if (this.isDev) {
          this.logger.debug(`Cache SET (TTL 3600s) -> ${cacheKey}`);
        }
      }),
    );
  }

  private generateCacheKey(baseKey: string, request: any): string {
    const { username, slug, id } = request.params;
    const queryParams = { ...request.query };

    // Detectar si es un endpoint protegido (JWT)
    const userId = request.user?.id;

    const sortedQuery = Object.keys(queryParams)
      .sort()
      .reduce((acc, key) => {
        acc[key] = queryParams[key];
        return acc;
      }, {} as Record<string, any>);

    const queryString = new URLSearchParams(sortedQuery).toString();

    // Endpoints protegidos: incluir userId
    if (userId) {
      if (username && slug) {
        return `${baseKey}:${userId}:${username}:${slug}${queryString ? ':' + queryString : ''}`;
      }
      if (username) {
        return `${baseKey}:${userId}:${username}${queryString ? ':' + queryString : ''}`;
      }
      if (id) {
        return `${baseKey}:${userId}:${id}${queryString ? ':' + queryString : ''}`;
      }
      return `${baseKey}:${userId}${queryString ? ':' + queryString : ''}`;
    }

    // Endpoints públicos
    if (username && slug) {
      return `${baseKey}:${username}:${slug}${queryString ? ':' + queryString : ''}`;
    }
    if (username) {
      return `${baseKey}:${username}${queryString ? ':' + queryString : ''}`;
    }
    if (id) {
      return `${baseKey}:${id}${queryString ? ':' + queryString : ''}`;
    }
    return `${baseKey}${queryString ? ':' + queryString : ''}`;
  }
}
