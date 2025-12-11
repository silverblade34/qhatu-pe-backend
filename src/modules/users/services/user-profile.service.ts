import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { UpdateProfileDto } from '../dto/update-profile.dto';

@Injectable()
export class UserProfileService {
  constructor(private prisma: PrismaService) {}

  async getPublicStore(username: string) {
    const user = await this.prisma.user.findUnique({
      where: { username: username.toLowerCase() },
      select: {
        id: true,
        username: true,
        fullName: true,
        isVerified: true,
        storeProfile: {
          include: {
            socialLinks: true,
          },
        },
        products: {
          where: { isActive: true },
          include: {
            images: true,
            variants: true,
          },
          orderBy: { createdAt: 'desc' },
        },
        reviews: {
          include: {
            customer: {
              select: {
                fullName: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!user || !user.storeProfile?.isActive) {
      throw new NotFoundException('Tienda no encontrada');
    }

    // Calcular rating promedio
    const avgRating =
      user.reviews.length > 0
        ? user.reviews.reduce((acc, r) => acc + r.rating, 0) / user.reviews.length
        : 0;

    return {
      username: user.username,
      storeName: user.storeProfile.storeName,
      bio: user.storeProfile.bio,
      logo: user.storeProfile.logo,
      banner: user.storeProfile.banner,
      phone: user.storeProfile.phone,
      isVerified: user.isVerified,
      badges: user.storeProfile.badges,
      socialLinks: user.storeProfile.socialLinks,
      rating: {
        average: Math.round(avgRating * 10) / 10,
        count: user.reviews.length,
      },
      products: user.products,
      recentReviews: user.reviews,
    };
  }

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

    return {
      user: updatedUser,
      storeProfile: updatedProfile,
    };
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