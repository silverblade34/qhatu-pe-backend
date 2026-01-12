import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { UpdateProfileDto } from '../dto/update-profile.dto';

@Injectable()
export class UserProfileService {
  constructor(
    private prisma: PrismaService,
  ) { }

  async updateProfile(userId: string, updateProfileDto: UpdateProfileDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        storeProfile: {
          include: {
            socialLinks: true
          }
        }
      },
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
        phone: updateProfileDto.phone,
        whatsapp: updateProfileDto.whatsapp,
        categoryId: updateProfileDto.categoryId,
        metaTitle: updateProfileDto.metaTitle,
        metaDescription: updateProfileDto.metaDescription,
        metaKeywords: updateProfileDto.metaKeywords,
        allowReviews: updateProfileDto.allowReviews,
        showStock: updateProfileDto.showStock,
        showSoldOut: updateProfileDto.showSoldOut,
        requirePhone: updateProfileDto.requirePhone,
        requireEmail: updateProfileDto.requireEmail,
        requireAddress: updateProfileDto.requireAddress,
        primaryColor: updateProfileDto.primaryColor,
        secondaryColor: updateProfileDto.secondaryColor,
        favicon: updateProfileDto.favicon,
      },
    });

    // Actualizar redes sociales
    let socialLinks = user.storeProfile?.socialLinks || [];
    if (updateProfileDto.socialLinks) {
      await this.prisma.socialLink.deleteMany({
        where: { storeProfileId: updatedProfile.id },
      });

      if (updateProfileDto.socialLinks.length > 0) {
        await this.prisma.socialLink.createMany({
          data: updateProfileDto.socialLinks.map((link, index) => ({
            ...link,
            storeProfileId: updatedProfile.id,
            order: link.order ?? index,
          })),
        });

        // Obtener los links recién creados
        socialLinks = await this.prisma.socialLink.findMany({
          where: { storeProfileId: updatedProfile.id }
        });
      } else {
        socialLinks = [];
      }
    }

    return {
      user: updatedUser,
      storeProfile: updatedProfile,
    };
  }
}