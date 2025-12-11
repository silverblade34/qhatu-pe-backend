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
import { ProductStockService } from './services/product-stock.service';

@Injectable()
export class ProductsService {
  constructor(
    private prisma: PrismaService,
    private variantsService: ProductVariantsService,
    private stockService: ProductStockService,
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

    // Crear producto con imágenes y variantes
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
    if (createProductDto.variants && createProductDto.variants.length > 0) {
      await this.variantsService.createVariants(
        product.id,
        createProductDto.variants,
      );
    }

    return this.getProductById(userId, product.id);
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

    // Actualizar producto
    const updatedProduct = await this.prisma.product.update({
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
    if (updateProductDto.variants) {
      await this.prisma.productVariant.deleteMany({
        where: { productId },
      });

      if (updateProductDto.variants.length > 0) {
        await this.variantsService.createVariants(
          productId,
          updateProductDto.variants,
        );
      }
    }

    return this.getProductById(userId, productId);
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
            sku: undefined, // No duplicar SKU
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

  async generateWhatsAppMessage(
    username: string,
    slug: string,
    variantId?: string,
    couponCode?: string
  ) {
    const user = await this.prisma.user.findUnique({
      where: { username: username.toLowerCase() },
      include: { storeProfile: true }
    });

    const product = await this.prisma.product.findFirst({
      where: { userId: user.id, slug },
      include: {
        images: { take: 1 },
        variants: variantId ? { where: { id: variantId } } : false
      }
    });

    let price = product.price;
    let variantName = '';
    let discount = 0;

    // Si hay variante seleccionada
    if (variantId && product.variants?.length > 0) {
      const variant = product.variants[0];
      variantName = variant.name;
      price = variant.price || product.price;
    }

    // Si hay cupón
    if (couponCode) {
      const coupon = await this.prisma.coupon.findFirst({
        where: {
          userId: user.id,
          code: couponCode,
          status: 'ACTIVE',
          startDate: { lte: new Date() },
          endDate: { gte: new Date() }
        }
      });

      if (coupon) {
        if (coupon.discountType === 'PERCENTAGE') {
          discount = (price * coupon.discountValue) / 100;
          if (coupon.maxDiscount && discount > coupon.maxDiscount) {
            discount = coupon.maxDiscount;
          }
        } else {
          discount = coupon.discountValue;
        }
      }
    }

    const total = price - discount;
    const productUrl = `https://qhatu.pe/${username}/${slug}`;

    const message = `¡Hola! Me interesa:

    📦 Producto: ${product.name}${variantName ? `
    📏 Variante: ${variantName}` : ''}
    💰 Precio: S/. ${price.toFixed(2)}${discount > 0 ? `
    🎟️ Cupón: ${couponCode} (-S/. ${discount.toFixed(2)})
    💵 Total: S/. ${total.toFixed(2)}` : ''}

    Link: ${productUrl}`;

    return {
      message,
      whatsappUrl: `https://wa.me/${user.storeProfile.phone}?text=${encodeURIComponent(message)}`,
      phone: user.storeProfile.phone
    };
  }

  async validateCoupon(username: string, code: string, productIds: string[]) {
    // Buscar usuario y su tienda
    const user = await this.prisma.user.findUnique({
      where: { username: username.toLowerCase() },
    });

    if (!user) {
      throw new NotFoundException('Tienda no encontrada');
    }

    // Buscar el cupón
    const coupon = await this.prisma.coupon.findFirst({
      where: {
        userId: user.id,
        code: code.toUpperCase(),
        status: 'ACTIVE',
        startDate: { lte: new Date() },
        endDate: { gte: new Date() },
      },
    });

    if (!coupon) {
      throw new NotFoundException('Cupón no válido o expirado');
    }

    // Verificar límite de usos
    if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) {
      throw new BadRequestException('Este cupón ha alcanzado su límite de usos');
    }

    // Si el cupón es para productos específicos, validar
    if (coupon.productIds.length > 0) {
      const hasValidProduct = productIds.some(id =>
        coupon.productIds.includes(id)
      );

      if (!hasValidProduct) {
        throw new BadRequestException(
          'Este cupón no es válido para los productos seleccionados'
        );
      }
    }

    // Calcular descuento potencial (esto es solo una vista previa)
    let discountPreview = {
      type: coupon.discountType,
      value: coupon.discountValue,
      minPurchase: coupon.minPurchase,
      maxDiscount: coupon.maxDiscount,
      message: '',
    };

    if (coupon.discountType === 'PERCENTAGE') {
      discountPreview.message = `Descuento del ${coupon.discountValue}%`;
      if (coupon.maxDiscount) {
        discountPreview.message += ` (máximo S/. ${coupon.maxDiscount})`;
      }
    } else {
      discountPreview.message = `Descuento de S/. ${coupon.discountValue}`;
    }

    if (coupon.minPurchase) {
      discountPreview.message += ` - Compra mínima: S/. ${coupon.minPurchase}`;
    }

    return {
      valid: true,
      coupon: {
        id: coupon.id,
        code: coupon.code,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        minPurchase: coupon.minPurchase,
        maxDiscount: coupon.maxDiscount,
        usageLimit: coupon.usageLimit,
        usageCount: coupon.usageCount,
        remainingUses: coupon.usageLimit
          ? coupon.usageLimit - coupon.usageCount
          : null,
      },
      discount: discountPreview,
    };
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