import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { UserProfileService } from './services/user-profile.service';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private profileService: UserProfileService,
  ) {}

  async getUserWithProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        storeProfile: {
          include: {
            socialLinks: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async findByUsername(username: string) {
    return this.prisma.user.findUnique({
      where: { username: username.toLowerCase() },
    });
  }

  async findById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
    });
  }
}