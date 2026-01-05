import { Injectable, NotFoundException, BadRequestException, Inject } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { UpdateProfileDto } from '../dto/update-profile.dto';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

@Injectable()
export class UserProfileService {
  constructor(
    private prisma: PrismaService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) { }

  async updateProfile(userId: string, updateProfileDto: UpdateProfileDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { storeProfile: true },
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    // Actualizar datos del usuario
    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: {
        fullName: updateProfileDto.fullName,
        phone: updateProfileDto.phone,
      },
    });

    // Actualizar perfil de tienda
    const updatedProfile = await this.prisma.storeProfile.update({
      where: { userId },
      data: {
        storeName: updateProfileDto.storeName,
        bio: updateProfileDto.bio,
        logo: updateProfileDto.logo,
        banner: updateProfileDto.banner,
        phone: updateProfileDto.storePhone,
      },
    });

    // Actualizar redes sociales si se proporcionan
    if (updateProfileDto.socialLinks) {
      await this.prisma.socialLink.deleteMany({
        where: { storeProfileId: updatedProfile.id },
      });

      if (updateProfileDto.socialLinks.length > 0) {
        await this.prisma.socialLink.createMany({
          data: updateProfileDto.socialLinks.map((link) => ({
            ...link,
            storeProfileId: updatedProfile.id,
          })),
        });
      }
    }
    if (user.role === 'SELLER' && updatedProfile) {
      await this.invalidateStoresCache(
        user.username,
        user.storeProfile?.categoryId
      );
    }

    return {
      user: updatedUser,
      storeProfile: updatedProfile,
    };
  }

  /**
  * Invalida cache de tiendas
  */
  private async invalidateStoresCache(username: string, categoryId?: string): Promise<void> {
    try {
      const patterns = [
        'stores_search:*',
        'stores_featured:*',
        `store_profile:${username}:*`,
      ];

      if (categoryId) {
        patterns.push(`stores_by_category:${categoryId}:*`);
      }

      const stores: any = this.cacheManager.stores;
      if (!stores || stores.length === 0) return;

      const store = stores[0];
      const client = store.client || store.getClient?.();

      if (!client) return;

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

  async initializeProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    return this.prisma.storeProfile.create({
      data: {
        userId,
        storeName: user.fullName,
        bio: '',
        isActive: true,
      },
    });
  }
}