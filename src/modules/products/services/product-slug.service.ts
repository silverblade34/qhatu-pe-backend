import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import slugify from 'slugify';

@Injectable()
export class ProductSlugService {
  constructor(private prisma: PrismaService) {}

  async generateUniqueSlug(
    userId: string,
    baseSlug: string,
    excludeId?: string,
  ): Promise<string> {
    let slug = baseSlug;
    let counter = 1;

    while (true) {
      const existing = await this.prisma.product.findFirst({
        where: {
          userId,
          slug,
          ...(excludeId && { id: { not: excludeId } }),
        },
      });

      if (!existing) break;

      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    return slug;
  }

  generateSlugFromName(name: string): string {
    return slugify(name, {
      lower: true,
      strict: true,
    });
  }
}