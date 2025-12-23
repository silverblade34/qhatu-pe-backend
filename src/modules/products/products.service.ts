import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { FilterProductDto, AvailabilityFilter } from './dto/filter-product.dto';
import slugify from 'slugify';
import { ProductVariantsService } from './services/product-variants.service';

@Injectable()
export class ProductsService {
  constructor(
    private prisma: PrismaService,
    private variantsService: ProductVariantsService,
  ) { }

  async create(userId: string, createProductDto: CreateProductDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { plan: true }
    });

    const productCount = await this.prisma.product.count({
      where: { userId }
    });

    // Límites según plan
    const limits = {
      BASIC: 15,
      PRO: 100,
      PREMIUM: Infinity
    };

    if (productCount >= limits[user.plan]) {
      throw new BadRequestException(
        `Has alcanzado el límite de ${limits[user.plan]} productos para tu plan ${user.plan}`
      );
    }

    // Validar que el nombre del producto sea único para este usuario
    const existingProduct = await this.prisma.product.findFirst({
      where: {
        userId,
        name: createProductDto.name,
      },
    });

    if (existingProduct) {
      throw new BadRequestException(
        `Ya tienes un producto con el nombre "${createProductDto.name}". Por favor, usa un nombre diferente.`
      );
    }

    // Validar categoría si se proporciona
    if (createProductDto.categoryId) {
      const category = await this.prisma.productCategory.findUnique({
        where: { id: createProductDto.categoryId },
      });

      if (!category || category.userId !== userId) {
        throw new BadRequestException('Categoría no válida');
      }
    }

    // Generar slug único
    const baseSlug = slugify(createProductDto.name, {
      lower: true,
      strict: true,
    });
    const slug = await this.generateUniqueSlug(userId, baseSlug);

    // Procesar variantes: autogenerar SKUs solo si no se proporcionan
    let processedVariants = createProductDto.variants;
    if (processedVariants && processedVariants.length > 0) {
      processedVariants = processedVariants.map((variant) => {
        // Si no tiene SKU, autogenerar
        if (!variant.sku) {
          return {
            ...variant,
            sku: this.generateVariantSKU(createProductDto.name, variant.attributes)
          };
        }
        // Si tiene SKU, usarlo tal cual
        return variant;
      });

      // Validar que no haya SKUs duplicados en el payload
      const skus = processedVariants.map(v => v.sku).filter(Boolean);
      const duplicates = skus.filter((sku, idx) => skus.indexOf(sku) !== idx);

      if (duplicates.length > 0) {
        throw new BadRequestException(
          `SKUs duplicados en las variantes: ${duplicates.join(', ')}`
        );
      }
    }

    // Crear producto con imágenes
    const product = await this.prisma.product.create({
      data: {
        userId,
        name: createProductDto.name,
        slug,
        description: createProductDto.description,
        categoryId: createProductDto.categoryId,
        price: createProductDto.price,
        stock: createProductDto.stock,
        isActive: true,
        images: {
          create: createProductDto.images.map((url, index) => ({
            url,
            order: index,
            isPrimary: index === 0,
          })),
        },
      },
      include: {
        images: true,
      },
    });

    // Crear variantes si existen
    if (processedVariants && processedVariants.length > 0) {
      await this.variantsService.createVariants(
        product.id,
        processedVariants,
      );
    }

    return this.getProductById(userId, product.id);
  }

  private generateVariantSKU(
    productName: string,
    attributes: Record<string, any>
  ): string {
    // Limpiar y acortar el nombre del producto (máximo 10 caracteres)
    const productPrefix = productName
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Quitar acentos
      .toUpperCase()
      .replace(/[^A-Z0-9\s]/g, '') // Solo letras, números y espacios
      .replace(/\s+/g, '-') // Espacios a guiones
      .substring(0, 10);

    // Extraer valores de los atributos (talla, color, tamaño, etc.)
    const attrParts: string[] = [];

    // Orden de prioridad común: talla, color, tamaño, etc.
    const priorityKeys = ['talla', 'size', 'color', 'tamaño', 'material'];

    // Agregar atributos prioritarios primero
    priorityKeys.forEach(key => {
      const value = attributes[key] || attributes[key.toUpperCase()] || attributes[key.toLowerCase()];
      if (value) {
        attrParts.push(
          String(value)
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toUpperCase()
            .replace(/[^A-Z0-9]/g, '')
            .substring(0, 5)
        );
      }
    });

    // Agregar otros atributos no prioritarios
    Object.entries(attributes).forEach(([key, value]) => {
      if (!priorityKeys.includes(key.toLowerCase()) && value) {
        attrParts.push(
          String(value)
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toUpperCase()
            .replace(/[^A-Z0-9]/g, '')
            .substring(0, 5)
        );
      }
    });

    // Formato: PRODUCTO-ATTR1-ATTR2-...
    const sku = [productPrefix, ...attrParts].join('-');

    // Limitar longitud total del SKU
    return sku.substring(0, 50);
  }

  async update(
    userId: string,
    productId: string,
    updateProductDto: UpdateProductDto,
  ) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundException('Producto no encontrado');
    }

    if (product.userId !== userId) {
      throw new ForbiddenException('No tienes permiso para editar este producto');
    }

    // Si se está cambiando el nombre, validar que sea único
    if (updateProductDto.name && updateProductDto.name !== product.name) {
      const existingProduct = await this.prisma.product.findFirst({
        where: {
          userId,
          name: updateProductDto.name,
          id: { not: productId }, // Excluir el producto actual
        },
      });

      if (existingProduct) {
        throw new BadRequestException(
          `Ya tienes un producto con el nombre "${updateProductDto.name}". Por favor, usa un nombre diferente.`
        );
      }
    }

    // Validar categoría si se proporciona
    if (updateProductDto.categoryId) {
      const category = await this.prisma.productCategory.findUnique({
        where: { id: updateProductDto.categoryId },
      });

      if (!category || category.userId !== userId) {
        throw new BadRequestException('Categoría no válida');
      }
    }

    // Actualizar slug si cambió el nombre
    let slug = product.slug;
    if (updateProductDto.name && updateProductDto.name !== product.name) {
      const baseSlug = slugify(updateProductDto.name, {
        lower: true,
        strict: true,
      });
      slug = await this.generateUniqueSlug(userId, baseSlug, productId);
    }

    // Procesar variantes: autogenerar SKUs solo si no se proporcionan
    let processedVariants = updateProductDto.variants;
    if (processedVariants && processedVariants.length > 0) {
      const productName = updateProductDto.name || product.name;

      processedVariants = processedVariants.map((variant) => {
        // Si no tiene SKU, autogenerar
        if (!variant.sku) {
          return {
            ...variant,
            sku: this.generateVariantSKU(productName, variant.attributes)
          };
        }
        // Si tiene SKU, usarlo tal cual
        return variant;
      });

      // Validar que no haya SKUs duplicados en el payload
      const skus = processedVariants.map(v => v.sku).filter(Boolean);
      const duplicates = skus.filter((sku, idx) => skus.indexOf(sku) !== idx);

      if (duplicates.length > 0) {
        throw new BadRequestException(
          `SKUs duplicados en las variantes: ${duplicates.join(', ')}`
        );
      }
    }

    // Actualizar producto
    await this.prisma.product.update({
      where: { id: productId },
      data: {
        name: updateProductDto.name,
        slug,
        description: updateProductDto.description,
        ...(updateProductDto.categoryId !== undefined && {
          category: updateProductDto.categoryId
            ? { connect: { id: updateProductDto.categoryId } }
            : { disconnect: true },
        }),
        price: updateProductDto.price,
        stock: updateProductDto.stock,
        isFlashSale: updateProductDto.isFlashSale,
        isFeatured: updateProductDto.isFeatured,
        isComingSoon: updateProductDto.isComingSoon,
      },
    });

    // Actualizar imágenes si se proporcionan
    if (updateProductDto.images) {
      await this.prisma.productImage.deleteMany({
        where: { productId },
      });

      await this.prisma.productImage.createMany({
        data: updateProductDto.images.map((url, index) => ({
          productId,
          url,
          order: index,
          isPrimary: index === 0,
        })),
      });
    }

    // Actualizar variantes si se proporcionan
    if (processedVariants) {
      await this.prisma.productVariant.deleteMany({
        where: { productId },
      });

      if (processedVariants.length > 0) {
        await this.variantsService.createVariants(
          productId,
          processedVariants,
        );
      }
    }

    return this.getProductById(userId, product.id);
  }

  async delete(userId: string, productId: string) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundException('Producto no encontrado');
    }

    if (product.userId !== userId) {
      throw new ForbiddenException(
        'No tienes permiso para eliminar este producto',
      );
    }

    await this.prisma.product.delete({
      where: { id: productId },
    });

    return { message: 'Producto eliminado exitosamente' };
  }

  async duplicate(userId: string, productId: string) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: {
        images: true,
        variants: true,
      },
    });

    if (!product) {
      throw new NotFoundException('Producto no encontrado');
    }

    if (product.userId !== userId) {
      throw new ForbiddenException(
        'No tienes permiso para duplicar este producto',
      );
    }

    // Generar nuevo slug
    const baseSlug = `${product.slug}-copia`;
    const newSlug = await this.generateUniqueSlug(userId, baseSlug);

    // Duplicar producto
    // NOTA: Al duplicar, los SKUs se pueden mantener porque son únicos por producto
    // y este es un producto nuevo. Si prefieres generar nuevos SKUs, cambia a undefined.
    const duplicated = await this.prisma.product.create({
      data: {
        userId,
        name: `${product.name} (Copia)`,
        slug: newSlug,
        description: product.description,
        categoryId: product.categoryId,
        price: product.price,
        stock: product.stock,
        isFlashSale: false,
        isFeatured: false,
        isComingSoon: false,
        isActive: true,
        images: {
          create: product.images.map((img) => ({
            url: img.url,
            order: img.order,
            isPrimary: img.isPrimary,
          })),
        },
        variants: {
          create: product.variants.map((variant) => ({
            name: variant.name,
            sku: variant.sku, // Ahora SÍ se pueden mantener porque es un producto diferente
            price: variant.price,
            stock: variant.stock,
            attributes: variant.attributes,
            isActive: variant.isActive,
          })),
        },
      },
      include: {
        images: true,
        variants: true,
        category: true,
      },
    });

    return duplicated;
  }

  async getProductById(userId: string, productId: string) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: {
        images: { orderBy: { order: 'asc' } },
        variants: true,
        category: true,
      },
    });

    if (!product) {
      throw new NotFoundException('Producto no encontrado');
    }

    if (product.userId !== userId) {
      throw new ForbiddenException('No tienes permiso para ver este producto');
    }

    return product;
  }

  async getProductBySlug(username: string, slug: string) {
    const user = await this.prisma.user.findUnique({
      where: { username: username.toLowerCase() },
    });

    if (!user) {
      throw new NotFoundException('Tienda no encontrada');
    }

    const product = await this.prisma.product.findFirst({
      where: {
        userId: user.id,
        slug,
        isActive: true,
      },
      include: {
        images: { orderBy: { order: 'asc' } },
        variants: true,
        category: true,
        reviews: {
          include: {
            customer: {
              select: {
                fullName: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!product) {
      throw new NotFoundException('Producto no encontrado');
    }

    // Calcular rating promedio
    const avgRating =
      product.reviews.length > 0
        ? product.reviews.reduce((acc, r) => acc + r.rating, 0) /
        product.reviews.length
        : 0;

    return {
      ...product,
      rating: {
        average: Math.round(avgRating * 10) / 10,
        count: product.reviews.length,
      },
    };
  }

  async getPublicProducts(username: string, filters: FilterProductDto) {
    const user = await this.prisma.user.findUnique({
      where: { username: username.toLowerCase() },
    });

    if (!user) {
      throw new NotFoundException('Tienda no encontrada');
    }

    const where: any = {
      userId: user.id,
      isActive: true,
    };

    // Filtros
    if (filters.category && filters.category !== 'ALL') {
      where.categoryId = filters.category;
    }

    if (filters.search) {
      where.name = {
        contains: filters.search,
        mode: 'insensitive',
      };
    }

    if (filters.availability === AvailabilityFilter.AVAILABLE) {
      where.stock = { gt: 0 };
    } else if (filters.availability === AvailabilityFilter.OUT_OF_STOCK) {
      where.stock = 0;
    } else if (filters.availability === AvailabilityFilter.FLASH_SALE) {
      where.isFlashSale = true;
    }

    if (filters.minPrice || filters.maxPrice) {
      where.price = {
        ...(filters.minPrice && { gte: filters.minPrice }),
        ...(filters.maxPrice && { lte: filters.maxPrice }),
      };
    }

    const products = await this.prisma.product.findMany({
      where,
      include: {
        images: { orderBy: { order: 'asc' }, take: 1 },
        category: true,
      },
      orderBy: { createdAt: 'desc' },
      take: filters.limit || 20,
      skip: filters.offset || 0,
    });

    const total = await this.prisma.product.count({ where });

    return {
      data: products,
      total,
      limit: filters.limit || 20,
      offset: filters.offset || 0,
    };
  }

  async getSellerProducts(userId: string, filters: FilterProductDto) {
    const where: any = { userId };

    // Filtros
    if (filters.category && filters.category !== 'ALL') {
      where.categoryId = filters.category;
    }

    if (filters.search) {
      where.name = {
        contains: filters.search,
        mode: 'insensitive',
      };
    }

    if (filters.availability === AvailabilityFilter.AVAILABLE) {
      where.stock = { gt: 0 };
    } else if (filters.availability === AvailabilityFilter.OUT_OF_STOCK) {
      where.stock = 0;
    } else if (filters.availability === AvailabilityFilter.FLASH_SALE) {
      where.isFlashSale = true;
    }

    const products = await this.prisma.product.findMany({
      where,
      include: {
        images: { orderBy: { order: 'asc' }, take: 1 },
        category: true,
        _count: {
          select: { orderItems: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: filters.limit || 20,
      skip: filters.offset || 0,
    });

    const total = await this.prisma.product.count({ where });

    return {
      data: products,
      total,
      limit: filters.limit || 20,
      offset: filters.offset || 0,
    };
  }

  async getLowStockProducts(userId: string) {
    return this.prisma.product.findMany({
      where: {
        userId,
        isActive: true,
        OR: [
          { stock: { lte: this.prisma.product.fields.lowStockThreshold } },
          {
            variants: {
              some: {
                stock: { lte: 5 }
              }
            }
          }
        ]
      },
      include: {
        images: { take: 1 },
        variants: {
          where: { stock: { lte: 5 } }
        }
      }
    });
  }

  private async generateUniqueSlug(
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
}