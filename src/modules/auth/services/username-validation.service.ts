import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';

@Injectable()
export class UsernameValidationService {
  constructor(private prisma: PrismaService) {}

  async checkUsernameAvailability(username: string) {
    if (!username || username.length < 3) {
      return {
        available: false,
        message: 'El username debe tener al menos 3 caracteres',
      };
    }

    const usernameRegex = /^[a-z0-9_]+$/;
    if (!usernameRegex.test(username.toLowerCase())) {
      return {
        available: false,
        message: 'Username solo puede contener letras minúsculas, números y guiones bajos',
      };
    }

    const existingUser = await this.prisma.user.findUnique({
      where: { username: username.toLowerCase() },
    });

    if (existingUser) {
      const suggestions = await this.generateUsernameSuggestions(username);
      return {
        available: false,
        message: 'Este username ya está en uso',
        suggestions,
      };
    }

    return {
      available: true,
      message: '¡Username disponible!',
      url: `https://www.qhatupe.com/${username.toLowerCase()}`,
    };
  }

  async generateUniqueUsername(email: string): Promise<string> {
    const baseUsername = email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
    let username = baseUsername;
    let counter = 1;

    while (await this.prisma.user.findUnique({ where: { username } })) {
      username = `${baseUsername}${counter}`;
      counter++;
    }

    return username;
  }

  async generateUsernameSuggestions(username: string): Promise<string[]> {
    const suggestions: string[] = [];
    const baseUsername = username.toLowerCase();

    for (let i = 1; i <= 3; i++) {
      const suggestion = `${baseUsername}${Math.floor(Math.random() * 999)}`;
      const exists = await this.prisma.user.findUnique({ where: { username: suggestion } });
      if (!exists) suggestions.push(suggestion);
    }

    const suffixes = ['pe', 'shop', 'store', 'oficial'];
    for (const suffix of suffixes) {
      const suggestion = `${baseUsername}_${suffix}`;
      const exists = await this.prisma.user.findUnique({ where: { username: suggestion } });
      if (!exists && suggestions.length < 5) suggestions.push(suggestion);
    }

    return suggestions.slice(0, 5);
  }

  validateUsernameFormat(username: string): boolean {
    const usernameRegex = /^[a-z0-9_]+$/;
    return usernameRegex.test(username.toLowerCase()) && username.length >= 3;
  }
}