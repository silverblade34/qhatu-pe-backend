import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Reflector } from '@nestjs/core';
import { CACHE_KEY_METADATA } from '../decorators/cache-key.decorator';
import { RedisService } from 'src/modules/redis/redis.service';

@Injectable()
export class HttpCacheInterceptor implements NestInterceptor {
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

    // Solo cachea GET requests
    if (request.method !== 'GET' || !cacheKeyMetadata) {
      return next.handle();
    }

    // Genera cache key dinámico
    const cacheKey = this.generateCacheKey(cacheKeyMetadata, request);

    // Intenta obtener del cache
    const cachedResponse = await this.redisService.get(cacheKey);
    if (cachedResponse) {
      return of(JSON.parse(cachedResponse));
    }

    // Si no está en cache, ejecuta y guarda
    return next.handle().pipe(
      tap(async (response) => {
        // Guarda en Redis con TTL de 1 hora (3600 segundos)
        await this.redisService.set(cacheKey, JSON.stringify(response), 3600);
      }),
    );
  }

  private generateCacheKey(baseKey: string, request: any): string {
    const { username, slug, id } = request.params;
    const queryParams = { ...request.query };

    // Ordenar query params para consistencia
    const sortedQuery = Object.keys(queryParams)
      .sort()
      .reduce((acc, key) => {
        acc[key] = queryParams[key];
        return acc;
      }, {});

    const queryString = new URLSearchParams(sortedQuery).toString();

    // Para endpoints con username y slug
    if (username && slug) {
      return `${baseKey}:${username}:${slug}${queryString ? ':' + queryString : ''}`;
    }

    // Para endpoints con solo username o id
    if (username) {
      return `${baseKey}:${username}${queryString ? ':' + queryString : ''}`;
    }

    if (id) {
      return `${baseKey}:${id}${queryString ? ':' + queryString : ''}`;
    }

    // Para listados generales
    return `${baseKey}${queryString ? ':' + queryString : ''}`;
  }
}