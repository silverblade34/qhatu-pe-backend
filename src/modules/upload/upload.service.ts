// src/modules/upload/upload.service.ts
import { Injectable, BadRequestException } from '@nestjs/common';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { ConfigService } from '@nestjs/config';
import sharp from 'sharp';
import slugify from 'slugify';
import { r2Client } from 'src/config/r2.config';
import { SubscriptionService } from '../subscription/subscription.service';
import { SubscriptionPlan, PLAN_FEATURES } from 'src/common/constants/subscription-plan.constants';

type BucketType = 'avatars' | 'products';

interface OptimizationConfig {
  maxWidth: number;
  maxHeight: number;
  quality: number;
  format: 'jpeg' | 'webp' | 'png';
  maxSizeKB: number;
}

@Injectable()
export class UploadService {
  constructor(
    private config: ConfigService,
    private subscriptionService: SubscriptionService,
  ) {}

  /**
   * Obtiene configuración de optimización según plan
   */
  private getOptimizationConfig(
    plan: SubscriptionPlan,
    bucketType: BucketType,
  ): OptimizationConfig {
    const features = this.subscriptionService.getPlanFeatures(plan);

    if (bucketType === 'avatars') {
      return {
        maxWidth: 400,
        maxHeight: 400,
        quality: 85,
        format: 'webp',
        maxSizeKB: 100,
      };
    }

    // Para productos, usar configuración del plan
    return {
      maxWidth: features.imageMaxWidth,
      maxHeight: features.imageMaxHeight,
      quality: features.imageQuality,
      format: 'webp',
      maxSizeKB: features.maxImageSizeKB,
    };
  }

  /**
   * Sube múltiples archivos validando límites del plan
   */
  async uploadFiles(
    files: Express.Multer.File[],
    bucketType: BucketType,
    username: string,
    plan: SubscriptionPlan = 'BASIC',
  ): Promise<string[]> {
    if (!files || files.length === 0) {
      throw new BadRequestException('No se han proporcionado archivos');
    }

    // Validar límite del plan
    this.subscriptionService.validateFileUpload(plan, files.length);

    const uploadPromises = files.map((file) =>
      this.uploadFile(file, bucketType, username, plan),
    );

    return Promise.all(uploadPromises);
  }

  /**
   * Sube un archivo a R2 con optimización automática
   */
  async uploadFile(
    file: Express.Multer.File,
    bucketType: BucketType,
    username: string,
    plan: SubscriptionPlan = 'BASIC',
  ): Promise<string> {
    this.validateFile(file);

    const optimizationConfig = this.getOptimizationConfig(plan, bucketType);
    const optimizedBuffer = await this.optimizeImage(
      file.buffer,
      file.mimetype,
      optimizationConfig,
    );

    const fileName = this.generateFileName(file.originalname, username, optimizationConfig.format);
    const bucketConfig = this.config.get(`r2.buckets.${bucketType}`);

    const command = new PutObjectCommand({
      Bucket: bucketConfig.name,
      Key: fileName,
      Body: optimizedBuffer,
      ContentType: `image/${optimizationConfig.format}`,
      ContentDisposition: 'inline',
      CacheControl: 'public, max-age=31536000, immutable',
      Metadata: {
        originalName: file.originalname,
        originalSize: file.size.toString(),
        optimizedSize: optimizedBuffer.length.toString(),
        uploadedBy: username,
        uploadedAt: new Date().toISOString(),
        plan: plan,
      },
    });

    await r2Client.send(command);

    const compressionRatio = this.getCompressionRatio(file.size, optimizedBuffer.length);
    console.log(
      `✅ [${plan}] Imagen optimizada: ${this.formatBytes(file.size)} → ${this.formatBytes(optimizedBuffer.length)} (${compressionRatio}% reducción)`,
    );

    return `${bucketConfig.publicUrl}/${fileName}`;
  }

  private async optimizeImage(
    buffer: Buffer,
    mimetype: string,
    config: OptimizationConfig,
  ): Promise<Buffer> {
    try {
      let image = sharp(buffer);

      if (mimetype === 'image/heic') {
        image = sharp(buffer).jpeg();
      }

      const metadata = await image.metadata();
      image = image.rotate();

      const needsResize =
        metadata.width > config.maxWidth || metadata.height > config.maxHeight;

      if (needsResize) {
        image = image.resize(config.maxWidth, config.maxHeight, {
          fit: 'inside',
          withoutEnlargement: true,
        });
      }

      image = image.webp({
        quality: config.quality,
        effort: 4,
      });

      let optimized = await image.toBuffer();
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

      return optimized;
    } catch (error) {
      throw new BadRequestException(
        'No se pudo procesar la imagen. Asegúrate de que sea un archivo válido.',
      );
    }
  }

  private validateFile(file: Express.Multer.File) {
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

  private generateFileName(originalName: string, username: string, extension: string): string {
    const baseName = this.normalizeFilename(originalName);
    const uniqueSuffix = this.shortId();
    return `${username}/${baseName}-${uniqueSuffix}.${extension}`;
  }

  private normalizeFilename(originalName: string): string {
    const name = originalName.replace(/\.[^/.]+$/, '');
    return slugify(name, {
      lower: true,
      strict: true,
      trim: true,
      locale: 'es',
    });
  }

  private shortId(length = 8): string {
    return Math.random().toString(36).substring(2, 2 + length);
  }

  private getCompressionRatio(original: number, optimized: number): number {
    return Math.round(((original - optimized) / original) * 100);
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }

  // Atajos
  async uploadAvatar(file: Express.Multer.File, username: string): Promise<string> {
    return this.uploadFile(file, 'avatars', username, 'BASIC');
  }

  async uploadProductImages(
    files: Express.Multer.File[],
    username: string,
    plan: SubscriptionPlan = 'BASIC',
  ): Promise<string[]> {
    return this.uploadFiles(files, 'products', username, plan);
  }
}