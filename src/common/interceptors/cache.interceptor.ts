import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Inject,
} from '@nestjs/common';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { Reflector } from '@nestjs/core';
import { CACHE_KEY_METADATA } from '../decorators/cache-key.decorator';

@Injectable()
export class HttpCacheInterceptor implements NestInterceptor {
  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
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
    const cachedResponse = await this.cacheManager.get(cacheKey);
    if (cachedResponse) {
      return of(cachedResponse);
    }

    // Si no está en cache, ejecuta y guarda
    return next.handle().pipe(
      tap(async (response) => {
        await this.cacheManager.set(cacheKey, response, 3600000); // 1 hora
      }),
    );
  }

  private generateCacheKey(baseKey: string, request: any): string {
    const { username, slug } = request.params;
    const queryString = JSON.stringify(request.query);
    return `${baseKey}:${username || 'all'}:${slug || 'list'}:${queryString}`;
  }
}