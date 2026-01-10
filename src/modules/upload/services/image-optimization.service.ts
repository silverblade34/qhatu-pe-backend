import { Injectable, BadRequestException } from '@nestjs/common';
import sharp from 'sharp';
import { SubscriptionService } from '../../subscription/subscription.service';
import { SubscriptionPlan } from 'src/common/constants/subscription-plan.constants';

type DirectoryType = 'avatars' | 'banners' | 'products';

interface OptimizationConfig {
  maxWidth: number;
  maxHeight: number;
  quality: number;
  format: 'jpeg' | 'webp' | 'png';
  maxSizeKB: number;
  aggressive?: boolean; // Si debe reducir agresivamente el tamaño
}

@Injectable()
export class ImageOptimizationService {
  constructor(private subscriptionService: SubscriptionService) {}

  getOptimizationConfig(
    plan: SubscriptionPlan,
    directory: DirectoryType,
  ): OptimizationConfig {
    const features = this.subscriptionService.getPlanFeatures(plan);

    // Avatar: pequeño y optimizado
    if (directory === 'avatars') {
      return {
        maxWidth: 400,
        maxHeight: 400,
        quality: 85,
        format: 'webp',
        maxSizeKB: 100,
        aggressive: true,
      };
    }

    // Banner: máxima calidad, solo conversión a webp
    if (directory === 'banners') {
      return {
        maxWidth: 2400, // Full HD+ para pantallas grandes
        maxHeight: 1200,
        quality: 95, // Calidad alta
        format: 'webp',
        maxSizeKB: 2048, // 2MB max (más generoso)
        aggressive: false, // NO reducir agresivamente
      };
    }

    // Productos: según plan
    return {
      maxWidth: features.imageMaxWidth,
      maxHeight: features.imageMaxHeight,
      quality: features.imageQuality,
      format: 'webp',
      maxSizeKB: features.maxImageSizeKB,
      aggressive: true,
    };
  }

  async optimizeImage(
    buffer: Buffer,
    mimetype: string,
    config: OptimizationConfig,
  ): Promise<Buffer> {
    try {
      let image = sharp(buffer);

      // Convertir HEIC a JPEG primero
      if (mimetype === 'image/heic') {
        image = sharp(buffer).jpeg();
      }

      const metadata = await image.metadata();
      
      // Corregir orientación
      image = image.rotate();

      // Resize solo si excede límites
      const needsResize =
        metadata.width > config.maxWidth || metadata.height > config.maxHeight;

      if (needsResize) {
        image = image.resize(config.maxWidth, config.maxHeight, {
          fit: 'inside',
          withoutEnlargement: true,
        });
      }

      // Conversión a WebP
      image = image.webp({
        quality: config.quality,
        effort: config.aggressive ? 4 : 2, // Menos esfuerzo para banners = más rápido
      });

      let optimized = await image.toBuffer();

      // Solo reducir agresivamente si está configurado
      if (config.aggressive) {
        const targetSizeBytes = config.maxSizeKB * 1024;
        let quality = config.quality;

        while (optimized.length > targetSizeBytes && quality > 60) {
          quality -= 5;
          optimized = await sharp(buffer)
            .rotate()
            .resize(config.maxWidth, config.maxHeight, {
              fit: 'inside',
              withoutEnlargement: true,
            })
            .webp({ quality })
            .toBuffer();
        }
      }

      return optimized;
    } catch (error) {
      console.error('Error optimizando imagen:', error);
      throw new BadRequestException(
        'No se pudo procesar la imagen. Asegúrate de que sea un archivo válido.',
      );
    }
  }

  validateFile(file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No se ha proporcionado ningún archivo');
    }

    const allowedMimeTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/webp',
      'image/heic',
    ];

    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        'El archivo debe ser una imagen (JPEG, PNG, WebP o HEIC)',
      );
    }

    if (file.size === 0) {
      throw new BadRequestException('El archivo está vacío');
    }
  }

  getCompressionRatio(original: number, optimized: number): number {
    return Math.round(((original - optimized) / original) * 100);
  }

  formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }
}