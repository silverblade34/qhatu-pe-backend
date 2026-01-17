import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { DEFAULT_PRODUCT_CATEGORIES } from 'src/common/constants/product-categories.constants';
import { CreateProductCategoryDto } from './dto/create-product-category.dto';

@Injectable()
export class ProductCategoriesService {
  constructor(private prisma: PrismaService) {}

  /**
   * Obtiene o crea categorías por defecto para un usuario
   * Si es la primera vez, crea las categorías según el rubro de su tienda
   */
  async getOrCreateDefaultCategories(userId: string) {
    // Verificar si ya tiene categorías
    const existingCategories = await this.prisma.productCategory.findMany({
      where: { userId },
      orderBy: { order: 'asc' },
    });

    return existingCategories;
  }

  /**
   * Listar categorías del usuario (crea las default si no existen)
   */
  async findAllByUser(userId: string) {
    return this.getOrCreateDefaultCategories(userId);
  }

  /**
   * Crear una nueva categoría personalizada
   */
  async create(userId: string, data: CreateProductCategoryDto) {
    const slug = this.generateSlug(data.name);

    // Verificar que el slug no exista para este usuario
    const existing = await this.prisma.productCategory.findUnique({
      where: {
        userId_slug: {
          userId,
          slug,
        },
      },
    });

    if (existing) {
      throw new Error('Ya existe una categoría con ese nombre');
    }

    // Obtener el último order
    const lastCategory = await this.prisma.productCategory.findFirst({
      where: { userId },
      orderBy: { order: 'desc' },
    });

    const newOrder = (lastCategory?.order || 0) + 1;

    return this.prisma.productCategory.create({
      data: {
        userId,
        name: data.name,
        slug,
        description: data.description,
        icon: data.icon,
        order: newOrder,
      },
    });
  }

  /**
   * Actualizar categoría
   */
  async update(id: string, userId: string, data: { name?: string; description?: string; icon?: string }) {
    const category = await this.prisma.productCategory.findFirst({
      where: { id, userId },
    });

    if (!category) {
      throw new NotFoundException('Categoría no encontrada');
    }

    const updateData: any = {};

    if (data.name) {
      updateData.name = data.name;
      updateData.slug = this.generateSlug(data.name);
    }

    if (data.description !== undefined) {
      updateData.description = data.description;
    }

    if (data.icon !== undefined) {
      updateData.icon = data.icon;
    }

    return this.prisma.productCategory.update({
      where: { id },
      data: updateData,
    });
  }

  /**
   * Eliminar categoría
   */
  async delete(id: string, userId: string) {
    const category = await this.prisma.productCategory.findFirst({
      where: { id, userId },
      include: {
        _count: {
          select: { products: true },
        },
      },
    });

    if (!category) {
      throw new NotFoundException('Categoría no encontrada');
    }

    if (category._count.products > 0) {
      throw new Error(
        `No se puede eliminar la categoría porque tiene ${category._count.products} productos asociados`
      );
    }

    await this.prisma.productCategory.delete({
      where: { id },
    });

    return { message: 'Categoría eliminada exitosamente' };
  }

  /**
   * Generar slug desde un nombre
   */
  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Eliminar acentos
      .replace(/[^a-z0-9]+/g, '-') // Reemplazar espacios y caracteres especiales por guiones
      .replace(/^-+|-+$/g, ''); // Eliminar guiones al inicio y final
  }
}