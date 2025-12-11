import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoriesService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    const categories = await this.prisma.category.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        icon: true,
        description: true,
        _count: {
          select: {
            products: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });

    return categories.map(cat => ({
      id: cat.id,
      name: cat.name,
      slug: cat.slug,
      icon: cat.icon,
      description: cat.description,
      totalProducts: cat._count.products,
    }));
  }

  async findBySlug(slug: string) {
    const category = await this.prisma.category.findUnique({
      where: { slug },
      include: {
        _count: {
          select: {
            products: true,
          },
        },
      },
    });

    if (!category) {
      throw new NotFoundException('Categoría no encontrada');
    }

    return {
      ...category,
      totalProducts: category._count.products,
    };
  }

  async getCategoryStats(id: string) {
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: {
        products: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                storeProfile: {
                  select: {
                    storeName: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!category) {
      throw new NotFoundException('Categoría no encontrada');
    }

    // Contar tiendas únicas
    const uniqueStores = new Set(category.products.map(p => p.userId));

    return {
      id: category.id,
      name: category.name,
      totalProducts: category.products.length,
      totalStores: uniqueStores.size,
      stores: Array.from(uniqueStores).map(userId => {
        const product = category.products.find(p => p.userId === userId);
        return {
          id: product.user.id,
          username: product.user.username,
          storeName: product.user.storeProfile?.storeName,
        };
      }),
    };
  }

  async create(createCategoryDto: CreateCategoryDto) {
    // Validar que el slug no exista
    const existingSlug = await this.prisma.category.findUnique({
      where: { slug: createCategoryDto.slug },
    });

    if (existingSlug) {
      throw new ConflictException('El slug ya existe');
    }

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
            products: true,
          },
        },
      },
    });

    if (!category) {
      throw new NotFoundException('Categoría no encontrada');
    }

    if (category._count.products > 0) {
      throw new ConflictException(
        `No se puede eliminar la categoría porque tiene ${category._count.products} productos asociados`,
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