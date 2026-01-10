import { Injectable, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

@Injectable()
export class CacheInvalidationService {
    private redisClient: any;

    constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {
        this.initRedisClient();
    }

    /**
     * Inicializa el cliente de Redis directamente
     */
    private initRedisClient() {
        try {
            const store: any = this.cacheManager.stores;
            this.redisClient = store?.client || store?.getClient?.();

            if (!this.redisClient) {
                console.warn('No se pudo obtener el cliente de Redis');
            } else {
                console.log('Cliente Redis inicializado para invalidación de cache');
            }
        } catch (error) {
            console.error('Error inicializando cliente Redis:', error);
        }
    }

    // ==================== TIENDAS ====================

    /**
     * Invalida TODOS los caches relacionados con una tienda
     * Usar cuando se actualiza perfil, logo, banners, etc.
     */
    async invalidateStoreCompletely(username: string): Promise<void> {
        await Promise.all([
            this.invalidateStoreProfile(username),
            this.invalidateStoreProducts(username),
            this.invalidateStoreListings(),
        ]);
        console.log(`🗑️ Cache completo invalidado para tienda: ${username}`);
    }

    /**
     * Invalida solo el perfil de la tienda
     */
    async invalidateStoreProfile(username: string): Promise<void> {
        const pattern = `store_profile:${username}:*`;
        await this.deleteByPattern(pattern);
    }

    /**
     * Invalida listado de productos de una tienda
     */
    async invalidateStoreProducts(username: string): Promise<void> {
        const pattern = `store_products:${username}:*`;
        await this.deleteByPattern(pattern);
    }

    /**
     * Invalida todos los listados de tiendas (búsquedas, featured, categorías)
     */
    async invalidateStoreListings(): Promise<void> {
        const patterns = [
            'stores_search:*',
            'stores_featured:*',
            'stores_by_category:*',
        ];
        await this.deleteByPatterns(patterns);
    }

    // ==================== PRODUCTOS ====================

    /**
     * Invalida cache de un producto específico
     */
    async invalidateProduct(username: string, slug: string): Promise<void> {
        const pattern = `product_detail:${username}:${slug}:*`;
        await this.deleteByPattern(pattern);
        console.log(`🗑️ Cache invalidado para producto: ${slug}`);
    }

    /**
     * Invalida productos cuando se crea/actualiza/elimina uno
     */
    async invalidateProductChanges(username: string, slug?: string): Promise<void> {
        await this.invalidateStoreProducts(username);
        if (slug) {
            await this.invalidateProduct(username, slug);
        }
    }

    // ==================== RESEÑAS ====================

    /**
     * Invalida reseñas de un vendedor y sus stats
     */
    async invalidateReviews(sellerId: string): Promise<void> {
        const patterns = [
            `reviews_seller:${sellerId}:*`,
            `reviews_stats:${sellerId}:*`,
        ];
        await this.deleteByPatterns(patterns);
        console.log(`Cache de reseñas invalidado para vendedor: ${sellerId}`);
    }

    /**
     * Invalida reseñas de un producto específico
     */
    async invalidateProductReviews(productId: string): Promise<void> {
        const pattern = `reviews_product:${productId}:*`;
        await this.deleteByPattern(pattern);
    }

    // ==================== CUPONES ====================

    /**
     * Invalida cupones de un vendedor
     */
    async invalidateCoupons(sellerId: string): Promise<void> {
        const patterns = [
            `coupons_seller:${sellerId}:*`,
            `coupons_public:*:${sellerId}`,
        ];
        await this.deleteByPatterns(patterns);
        console.log(`Cache de cupones invalidado para vendedor: ${sellerId}`);
    }

    // ==================== CATEGORÍAS ====================

    /**
     * Invalida cache de categorías
     */
    async invalidateCategories(): Promise<void> {
        const patterns = [
            'categories:*',
            'category_stats:*',
        ];
        await this.deleteByPatterns(patterns);
        console.log(`Cache de categorías invalidado`);
    }

    /**
     * Invalida cache de categorías de productos
     */
    async invalidateProductCategories(userId: string): Promise<void> {
        const pattern = `product_categories:${userId}:*`;
        await this.deleteByPattern(pattern);
    }

    // ==================== ÓRDENES ====================

    /**
     * Invalida órdenes de un vendedor
     */
    async invalidateOrders(sellerId: string): Promise<void> {
        const patterns = [
            `orders_seller:${sellerId}:*`,
            `orders_stats:${sellerId}:*`,
        ];
        await this.deleteByPatterns(patterns);
        console.log(`Cache de órdenes invalidado para vendedor: ${sellerId}`);
    }

    // ==================== HELPERS ====================

    /**
     * Elimina todas las keys que coincidan con un patrón
     */
    private async deleteByPattern(pattern: string): Promise<number> {
        if (!this.redisClient) {
            console.warn('Redis no disponible, invalidación omitida');
            return 0;
        }

        try {
            const keys: string[] = [];
            let cursor = '0';

            do {
                const result = await this.redisClient.scan(cursor, {
                    MATCH: pattern,
                    COUNT: 100,
                });

                cursor = result.cursor;
                if (result.keys && result.keys.length > 0) {
                    keys.push(...result.keys);
                }
            } while (cursor !== '0');

            if (keys.length > 0) {
                await Promise.all(keys.map(key => this.cacheManager.del(key)));
                console.log(`${keys.length} keys eliminadas con patrón: ${pattern}`);
                return keys.length;
            }

            return 0;
        } catch (error) {
            console.error(`Error eliminando patrón ${pattern}:`, error);
            return 0;
        }
    }

    /**
     * Elimina múltiples patrones en paralelo
     */
    private async deleteByPatterns(patterns: string[]): Promise<void> {
        await Promise.all(patterns.map(pattern => this.deleteByPattern(pattern)));
    }

    /**
     * Elimina una key específica
     */
    async deleteKey(key: string): Promise<void> {
        try {
            await this.cacheManager.del(key);
            console.log(`Key eliminada: ${key}`);
        } catch (error) {
            console.error(`Error eliminando key ${key}:`, error);
        }
    }

    /**
     * Limpia TODA la cache (usar con precaución)
     */
    async clearAll(): Promise<void> {
        try {
            await this.cacheManager.clear();
            console.log('TODA la cache ha sido limpiada');
        } catch (error) {
            console.error('Error limpiando cache:', error);
        }
    }
}