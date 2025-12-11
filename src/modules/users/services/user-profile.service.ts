import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { UpdateProfileDto } from '../dto/update-profile.dto';

@Injectable()
export class UserProfileService {
  constructor(private prisma: PrismaService) {}

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