import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoriesService {
  constructor(private prisma: PrismaService) { }

  async findAll() {
    const categories = await this.prisma.category.findMany({
      select: {
        id: true,
        name: true,
        description: true,
      },
      orderBy: {
        name: 'asc',
      },
    });

    return categories.map(cat => ({
      id: cat.id,
      name: cat.name,
      description: cat.description,
    }));
  }

  async getCategoryStats(id: string) {
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: {
        storeProfiles: {
          select: {
            storeName: true,
          },
        },
      },
    });

    if (!category) {
      throw new NotFoundException('Categoría no encontrada');
    }

    return {
      id: category.id,
      name: category.name,
      totalStores: category.storeProfiles.length,
    };
  }

  async create(createCategoryDto: CreateCategoryDto) {
    return this.prisma.category.create({
      data: createCategoryDto,
    });
  }

  async update(id: string, updateCategoryDto: UpdateCategoryDto) {
    const category = await this.prisma.category.findUnique({
      where: { id },
    });

    if (!category) {
      throw new NotFoundException('Categoría no encontrada');
    }

    return this.prisma.category.update({
      where: { id },
      data: updateCategoryDto,
    });
  }

  async delete(id: string) {
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            storeProfiles: true,
          },
        },
      },
    });

    if (!category) {
      throw new NotFoundException('Categoría no encontrada');
    }

    if (category._count.storeProfiles > 0) {
      throw new ConflictException(
        `No se puede eliminar la categoría porque tiene ${category._count.storeProfiles} tiendas asociadas`,
      );
    }

    await this.prisma.category.delete({
      where: { id },
    });

    return {
      message: 'Categoría eliminada exitosamente',
    };
  }
}