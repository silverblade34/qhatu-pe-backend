import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';

@Injectable()
export class ProductImageService {
  constructor(private prisma: PrismaService) {}

  async updateProductImages(
    productId: string,
    imageUrls: string[],
  ): Promise<void> {
    // Eliminar imágenes existentes
    await this.prisma.productImage.deleteMany({
      where: { productId },
    });

    // Crear nuevas imágenes
    await this.prisma.productImage.createMany({
      data: imageUrls.map((url, index) => ({
        productId,
        url,
        order: index,
        isPrimary: index === 0,
      })),
    });
  }

  async deleteProductImages(productId: string): Promise<void> {
    await this.prisma.productImage.deleteMany({
      where: { productId },
    });
  }

  formatImagesForCreate(imageUrls: string[]) {
    return imageUrls.map((url, index) => ({
      url,
      order: index,
      isPrimary: index === 0,
    }));
  }
}