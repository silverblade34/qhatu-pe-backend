import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { FilterProductDto } from './dto/filter-product.dto';
import { ProductVariantsService } from './services/product-variants.service';
import { ProductSlugService } from './services/product-slug.service';
import { ProductSkuService } from './services/product-sku.service';
import { ProductValidationService } from './services/product-validation.service';
import { ProductQueryService } from './services/product-query.service';
import { ProductImageService } from './services/product-image.service';

@Injectable()
export class ProductsService {
  constructor(
    private prisma: PrismaService,
    private variantsService: ProductVariantsService,
    private slugService: ProductSlugService,
    private skuService: ProductSkuService,
    private validationService: ProductValidationService,
    private queryService: ProductQueryService,
    private imageService: ProductImageService,
  ) { }

  async create(userId: string, createProductDto: CreateProductDto) {
    // Validaciones
    await this.validationService.validateResourceLimits(userId);
    await this.validationService.validateUniqueProductName(
      userId,
      createProductDto.name,
    );

    if (createProductDto.categoryId) {
      await this.validationService.validateCategory(
        userId,
        createProductDto.categoryId,
      );
    }

    if (createProductDto.images && createProductDto.images.length > 0) {
      await this.validationService.validateImageLimit(
        userId,
        createProductDto.images.length,
      );
    }

    // Generar slug único
    const baseSlug = this.slugService.generateSlugFromName(
      createProductDto.name,
    );
    const slug = await this.slugService.generateUniqueSlug(userId, baseSlug);

    // Procesar variantes
    let processedVariants = this.skuService.processVariants(
      createProductDto.name,
      createProductDto.variants,
    );

    if (processedVariants && processedVariants.length > 0) {
      this.skuService.validateUniqueSKUs(processedVariants);
    }

    // Calcular stock inicial
    let initialStock = createProductDto.stock;
    if (processedVariants && processedVariants.length > 0) {
      initialStock = processedVariants.reduce(
        (sum, variant) => sum + variant.stock,
        0,
      );
    }

    // Crear producto
    const product = await this.prisma.product.create({
      data: {
        userId,
        name: createProductDto.name,
        slug,
        description: createProductDto.description,
        categoryId: createProductDto.categoryId,
        price: createProductDto.price,
        stock: initialStock,
        isFlashSale: createProductDto.isFlashSale,
        isFeatured: createProductDto.isFeatured,
        isComingSoon: createProductDto.isComingSoon,
        isActive: true,
        images: {
          create: this.imageService.formatImagesForCreate(
            createProductDto.images,
          ),
        },
      },
      include: {
        images: true,
      },
    });

    // Crear variantes si existen
    if (processedVariants && processedVariants.length > 0) {
      const variantsData = processedVariants.map((variant) => ({
        productId: product.id,
        name: variant.name,
        sku: variant.sku,
        price: variant.price,
        stock: variant.stock,
        attributes: variant.attributes,
        isActive: true,
      }));

      await this.prisma.productVariant.createMany({
        data: variantsData,
      });
    }

    return this.queryService.getProductById(userId, product.id);
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
      throw new ForbiddenException(
        'No tienes permiso para editar este producto',
      );
    }

    // Validar nombre único si cambió
    if (updateProductDto.name && updateProductDto.name !== product.name) {
      await this.validationService.validateUniqueProductName(
        userId,
        updateProductDto.name,
        productId,
      );
    }

    // Validar categoría si se proporciona
    if (updateProductDto.categoryId) {
      await this.validationService.validateCategory(
        userId,
        updateProductDto.categoryId,
      );
    }

    // Actualizar slug si cambió el nombre
    let slug = product.slug;
    if (updateProductDto.name && updateProductDto.name !== product.name) {
      const baseSlug = this.slugService.generateSlugFromName(
        updateProductDto.name,
      );
      slug = await this.slugService.generateUniqueSlug(
        userId,
        baseSlug,
        productId,
      );
    }

    // Procesar variantes
    const productName = updateProductDto.name || product.name;
    let processedVariants = this.skuService.processVariants(
      productName,
      updateProductDto.variants,
    );

    if (processedVariants && processedVariants.length > 0) {
      this.skuService.validateUniqueSKUs(processedVariants);
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
      await this.imageService.updateProductImages(
        productId,
        updateProductDto.images,
      );
    }

    // Actualizar variantes si se proporcionan
    if (processedVariants) {
      await this.prisma.productVariant.deleteMany({
        where: { productId },
      });

      if (processedVariants.length > 0) {
        await this.variantsService.createVariants(productId, processedVariants);
      }
    }

    return this.queryService.getProductById(userId, product.id);
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
    const newSlug = await this.slugService.generateUniqueSlug(userId, baseSlug);

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
            sku: variant.sku,
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

  // Delegar métodos de consulta
  async getProductById(userId: string, productId: string) {
    return this.queryService.getProductById(userId, productId);
  }

  async getProductBySlug(username: string, slug: string) {
    return this.queryService.getProductBySlug(username, slug);
  }

  async getPublicProducts(username: string, filters: FilterProductDto) {
    return this.queryService.getPublicProducts(username, filters);
  }

  async getSellerProducts(userId: string, filters: FilterProductDto) {
    return this.queryService.getSellerProducts(userId, filters);
  }

  async getLowStockProducts(userId: string) {
    return this.queryService.getLowStockProducts(userId);
  }
}