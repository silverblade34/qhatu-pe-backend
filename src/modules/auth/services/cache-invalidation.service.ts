import { Injectable, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

@Injectable()
export class CacheInvalidationService {
  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  /**
   * Invalida todo el cache relacionado con tiendas
   */
  async invalidateStoresCache(username: string, categoryId?: string): Promise<void> {
    try {
      const patterns = [
        'stores_search:*',        // Búsquedas de tiendas
        'stores_featured:*',      // Tiendas destacadas
        `store_profile:${username}:*`, // Perfil de esta tienda
      ];

      // Si hay categoría, invalida también el cache de esa categoría
      if (categoryId) {
        patterns.push(`stores_by_category:${categoryId}:*`);
      }

      const stores: any = this.cacheManager.stores;
      if (!stores || stores.length === 0) return;

      const store = stores[0];
      const client = store.client || store.getClient?.();

      if (!client) {
        console.warn('No se pudo obtener cliente Redis para invalidación');
        return;
      }

      for (const pattern of patterns) {
        let cursor = '0';
        let keysDeleted = 0;

        do {
          const result = await client.scan(cursor, {
            MATCH: pattern,
            COUNT: 100,
          });

          cursor = result.cursor;

          if (result.keys.length > 0) {
            await Promise.all(result.keys.map((key: string) => this.cacheManager.del(key)));
            keysDeleted += result.keys.length;
          }
        } while (cursor !== '0');

        if (keysDeleted > 0) {
          console.log(`Cache invalidado: ${keysDeleted} keys de ${pattern}`);
        }
      }
    } catch (error) {
      console.error('Error invalidando cache de tiendas:', error);
    }
  }

  /**
   * Invalida cache específico de una tienda
   */
  async invalidateStoreProfile(username: string): Promise<void> {
    try {
      await this.cacheManager.del(`store_profile:${username}`);
      console.log(`Cache invalidado para tienda: ${username}`);
    } catch (error) {
      console.error('Error invalidando cache de perfil:', error);
    }
  }

  /**
   * Invalida cache de categorías
   */
  async invalidateCategoryCache(categoryId: string): Promise<void> {
    try {
      await this.cacheManager.del(`stores_by_category:${categoryId}`);
      console.log(`Cache invalidado para categoría: ${categoryId}`);
    } catch (error) {
      console.error('Error invalidando cache de categoría:', error);
    }
  }
}