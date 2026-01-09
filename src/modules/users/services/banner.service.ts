import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { CreateBannerDto } from '../dto/create-banner.dto';
import { UpdateBannerDto } from '../dto/update-banner.dto';

@Injectable()
export class BannerService {
  constructor(private prisma: PrismaService) {}

  async createBanner(userId: string, data: CreateBannerDto) {
    const storeProfile = await this.prisma.storeProfile.findUnique({
      where: { userId },
    });

    if (!storeProfile) {
      throw new NotFoundException('Perfil de tienda no encontrado');
    }

    // Validar límites según plan
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    const bannerCount = await this.prisma.banner.count({
      where: { storeProfileId: storeProfile.id },
    });

    const limits = {
      FREE: 1,
      BASIC: 3,
      PRO: 10,
      PREMIUM: 999,
    };

    if (bannerCount >= limits[user.plan]) {
      throw new BadRequestException(
        `Tu plan ${user.plan} permite hasta ${limits[user.plan]} banners`
      );
    }

    return this.prisma.banner.create({
      data: {
        ...data,
        storeProfileId: storeProfile.id,
        order: data.order ?? bannerCount,
      },
    });
  }

  async updateBanner(userId: string, bannerId: string, data: UpdateBannerDto) {
    const banner = await this.prisma.banner.findFirst({
      where: {
        id: bannerId,
        storeProfile: { userId },
      },
    });

    if (!banner) {
      throw new NotFoundException('Banner no encontrado');
    }

    return this.prisma.banner.update({
      where: { id: bannerId },
      data,
    });
  }

  async deleteBanner(userId: string, bannerId: string) {
    const banner = await this.prisma.banner.findFirst({
      where: {
        id: bannerId,
        storeProfile: { userId },
      },
    });

    if (!banner) {
      throw new NotFoundException('Banner no encontrado');
    }

    return this.prisma.banner.delete({
      where: { id: bannerId },
    });
  }

  async getBanners(userId: string) {
    const storeProfile = await this.prisma.storeProfile.findUnique({
      where: { userId },
    });

    return this.prisma.banner.findMany({
      where: { storeProfileId: storeProfile.id },
      orderBy: { order: 'asc' },
    });
  }

  async reorderBanners(userId: string, bannerIds: string[]) {
    const storeProfile = await this.prisma.storeProfile.findUnique({
      where: { userId },
    });

    const updates = bannerIds.map((id, index) =>
      this.prisma.banner.updateMany({
        where: {
          id,
          storeProfileId: storeProfile.id,
        },
        data: { order: index },
      })
    );

    await this.prisma.$transaction(updates);
    return { success: true };
  }

  async incrementViews(bannerId: string) {
    return this.prisma.banner.update({
      where: { id: bannerId },
      data: { views: { increment: 1 } },
    });
  }

  async incrementClicks(bannerId: string) {
    return this.prisma.banner.update({
      where: { id: bannerId },
      data: { clicks: { increment: 1 } },
    });
  }
}