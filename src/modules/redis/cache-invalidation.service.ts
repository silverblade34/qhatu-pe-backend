import { Injectable } from '@nestjs/common';
import { RedisService } from './redis.service';

@Injectable()
export class CacheInvalidationService {

    constructor(private readonly redisService: RedisService) {
        console.log('CacheInvalidationService inicializado');
    }

    // ==================== TIENDAS ====================

    async invalidateStoreCompletely(username: string): Promise<void> {
        await Promise.all([
            this.invalidateStoreProfile(username),
            this.invalidateStoreProducts(username),
            this.invalidateStoreListings(),
        ]);
        console.log(`Cache completo invalidado para tienda: ${username}`);
    }

    async invalidateStoreProfile(username: string): Promise<void> {
        const pattern = `store_profile:${username}*`;
        await this.deleteByPattern(pattern);
    }

    async invalidateStoreProducts(username: string): Promise<void> {
        const pattern = `store_products:${username}*`;
        await this.deleteByPattern(pattern);
    }

    async invalidateStoreListings(): Promise<void> {
        const patterns = [
            'stores_search*',
            'stores_featured*',
            'stores_by_category*',
        ];
        await this.deleteByPatterns(patterns);
    }

    // ==================== PRODUCTOS ====================

    async invalidateProduct(username: string, slug: string): Promise<void> {
        const pattern = `product_detail:${username}:${slug}*`;
        await this.deleteByPattern(pattern);
        console.log(`Cache invalidado para producto: ${slug}`);
    }

    async invalidateProductChanges(username: string, slug?: string): Promise<void> {
        await this.invalidateStoreProducts(username);
        if (slug) {
            await this.invalidateProduct(username, slug);
        }
    }

    // ==================== RESEÑAS ====================

    async invalidateReviews(sellerId: string): Promise<void> {
        const patterns = [
            `reviews_seller:${sellerId}*`,
            `reviews_stats:${sellerId}*`,
        ];
        await this.deleteByPatterns(patterns);
        console.log(`Cache de reseñas invalidado para vendedor: ${sellerId}`);
    }

    async invalidateProductReviews(productId: string): Promise<void> {
        const pattern = `reviews_product:${productId}*`;
        await this.deleteByPattern(pattern);
    }

    // ==================== CUPONES ====================

    async invalidateCoupons(sellerId: string): Promise<void> {
        const patterns = [
            `coupons_seller:${sellerId}*`,
            `coupons_public:*${sellerId}*`,
        ];
        await this.deleteByPatterns(patterns);
        console.log(`Cache de cupones invalidado para vendedor: ${sellerId}`);
    }

    // ==================== CATEGORÍAS ====================

    async invalidateCategories(): Promise<void> {
        const patterns = [
            'categories*',
            'category_stats*',
        ];
        await this.deleteByPatterns(patterns);
        console.log(`Cache de categorías invalidado`);
    }

    async invalidateProductCategories(userId: string): Promise<void> {
        const pattern = `product_categories:${userId}*`;
        await this.deleteByPattern(pattern);
    }

    // ==================== ÓRDENES ====================

    async invalidateOrders(sellerId: string): Promise<void> {
        const patterns = [
            `orders_seller:${sellerId}*`,
            `orders_stats:${sellerId}*`,
        ];
        await this.deleteByPatterns(patterns);
        console.log(`Cache de órdenes invalidado para vendedor: ${sellerId}`);
    }

    // ==================== HELPERS ====================
    private async deleteByPattern(pattern: string): Promise<number> {
        try {
            const keys = await this.redisService.scanKeys(pattern);

            if (keys.length > 0) {
                await this.redisService.delMany(keys);
                console.log(`${keys.length} keys eliminadas con patrón: ${pattern}`);
                return keys.length;
            }

            console.log(`No se encontraron keys con patrón: ${pattern}`);
            return 0;
        } catch (error) {
            console.error(`Error eliminando patrón ${pattern}:`, error);
            return 0;
        }
    }

    private async deleteByPatterns(patterns: string[]): Promise<void> {
        await Promise.all(patterns.map(pattern => this.deleteByPattern(pattern)));
    }

    async deleteKey(key: string): Promise<void> {
        try {
            await this.redisService.del(key);
            console.log(`Key eliminada: ${key}`);
        } catch (error) {
            console.error(`Error eliminando key ${key}:`, error);
        }
    }

    async clearAll(): Promise<void> {
        try {
            await this.redisService.flushDb();
            console.log('TODA la cache ha sido limpiada');
        } catch (error) {
            console.error('Error limpiando cache:', error);
        }
    }
}