import {
  Injectable,
  BadRequestException,
} from '@nestjs/common';
import { PutObjectCommand, CopyObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { ConfigService } from '@nestjs/config';
import sharp from 'sharp';
import slugify from 'slugify';
import { r2Client } from 'src/config/r2.config';
import { SubscriptionService } from '../subscription/subscription.service';
import { SubscriptionPlan } from 'src/common/constants/subscription-plan.constants';

type DirectoryType = 'avatars' | 'banners' | 'products';

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
  ) { }

  /**
   * Sube archivo temporal (expira en 1 hora)
   */
  async uploadFile(
    file: Express.Multer.File,
    directory: DirectoryType,
    username: string,
    plan: SubscriptionPlan = 'BASIC',
    isTemporary: boolean = false,
  ): Promise<string> {
    this.validateFile(file);

    const optimizationConfig = this.getOptimizationConfig(plan, directory);
    const optimizedBuffer = await this.optimizeImage(
      file.buffer,
      file.mimetype,
      optimizationConfig,
    );

    // Agregar prefijo "temp/" si es temporal
    const fileName = this.generateFileName(
      directory,
      file.originalname,
      username,
      optimizationConfig.format,
      isTemporary,
    );

    const bucketConfig = this.config.get(`r2.buckets.${directory}`);
    const bucketName = bucketConfig.name;
    const publicUrl = bucketConfig.publicUrl;

    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: fileName,
      Body: optimizedBuffer,
      ContentType: `image/${optimizationConfig.format}`,
      ContentDisposition: 'inline',
      // Cache temporal si es temporal, permanente si no
      CacheControl: isTemporary
        ? 'public, max-age=3600' // 1 hora
        : 'public, max-age=31536000, immutable', // 1 año
      // Agregar expiración si es temporal
      ...(isTemporary && {
        Expires: new Date(Date.now() + 60 * 60 * 1000), // 1 hora
      }),
      Metadata: {
        originalName: file.originalname,
        originalSize: file.size.toString(),
        optimizedSize: optimizedBuffer.length.toString(),
        uploadedBy: username,
        uploadedAt: new Date().toISOString(),
        plan: plan,
        isTemporary: isTemporary.toString(), // Metadata para identificar
      },
    });

    await r2Client.send(command);

    const compressionRatio = this.getCompressionRatio(file.size, optimizedBuffer.length);
    console.log(
      `[${plan}] ${isTemporary ? 'TEMP' : 'PERM'} Imagen: ${this.formatBytes(file.size)} → ${this.formatBytes(optimizedBuffer.length)} (${compressionRatio}% reducción)`,
    );

    return `${publicUrl}/${fileName}`;
  }

  /**
   * Confirma archivos temporales como permanentes
   */
  async confirmPermanentFiles(urls: string[], username: string): Promise<string[]> {
    const bucketConfig = this.config.get('r2.buckets.products');
    const bucketName = bucketConfig.name;
    const publicUrl = bucketConfig.publicUrl;
    const confirmedUrls: string[] = [];

    for (const url of urls) {
      try {
        // Extraer el key del URL
        const tempKey = url.replace(`${publicUrl}/`, '');

        // Verificar que sea temporal
        if (!tempKey.startsWith('temp/')) {
          console.warn(`URL no es temporal, se mantiene: ${url}`);
          confirmedUrls.push(url);
          continue;
        }

        // Nuevo key permanente (sin el prefijo "temp/")
        const permanentKey = tempKey.replace('temp/', '');

        // Copiar archivo a ubicación permanente
        const copyCommand = new CopyObjectCommand({
          Bucket: bucketName,
          CopySource: `${bucketName}/${tempKey}`,
          Key: permanentKey,
          MetadataDirective: 'REPLACE',
          ContentType: 'image/webp',
          ContentDisposition: 'inline',
          CacheControl: 'public, max-age=31536000, immutable',
          Metadata: {
            isTemporary: 'false',
            confirmedAt: new Date().toISOString(),
            confirmedBy: username,
          },
        });

        await r2Client.send(copyCommand);

        // Eliminar archivo temporal
        const deleteCommand = new DeleteObjectCommand({
          Bucket: bucketName,
          Key: tempKey,
        });

        await r2Client.send(deleteCommand);

        const permanentUrl = `${publicUrl}/${permanentKey}`;
        confirmedUrls.push(permanentUrl);

      } catch (error) {
        console.error(`Error confirmando ${url}:`, error);
        confirmedUrls.push(url);
      }
    }

    return confirmedUrls;
  }

  /**
   * Sube múltiples archivos
   */
  async uploadFiles(
    files: Express.Multer.File[],
    directory: DirectoryType,
    username: string,
    plan: SubscriptionPlan = 'BASIC',
    isTemporary: boolean = false,
  ): Promise<string[]> {
    if (!files || files.length === 0) {
      throw new BadRequestException('No se han proporcionado archivos');
    }

    this.subscriptionService.validateFileUpload(plan, files.length);

    const uploadPromises = files.map((file) =>
      this.uploadFile(file, directory, username, plan, isTemporary),
    );

    return Promise.all(uploadPromises);
  }

  private getOptimizationConfig(
    plan: SubscriptionPlan,
    directory: DirectoryType,
  ): OptimizationConfig {
    const features = this.subscriptionService.getPlanFeatures(plan);

    if (directory === 'avatars') {
      return {
        maxWidth: 400,
        maxHeight: 400,
        quality: 85,
        format: 'webp',
        maxSizeKB: 100,
      };
    }

    return {
      maxWidth: features.imageMaxWidth,
      maxHeight: features.imageMaxHeight,
      quality: features.imageQuality,
      format: 'webp',
      maxSizeKB: features.maxImageSizeKB,
    };
  }

  private async optimizeImage(
    buffer: Buffer,
    mimetype: string,
    config: OptimizationConfig,
  ): Promise<Buffer> {
    console.log(JSON.stringify(config, null, 2));
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
      console.error('Error optimizando imagen:', error);
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

  private generateFileName(
    directory: string,
    originalName: string,
    username: string,
    extension: string,
    isTemporary: boolean = false,
  ): string {
    const baseName = this.normalizeFilename(originalName);
    const uniqueSuffix = this.shortId();
    const folder = isTemporary ? 'temp' : username; // Carpeta temp/ o username/
    return `${directory}/${folder}/${baseName}-${uniqueSuffix}.${extension}`;
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

  async uploadAvatar(file: Express.Multer.File, username: string): Promise<string> {
    return this.uploadFile(file, 'avatars', username, 'BASIC', false); // Avatar siempre permanente
  }

  async uploadBanner(file: Express.Multer.File, username: string): Promise<string> {
    return this.uploadFile(file, 'banners', username, 'BASIC', false); // Banner siempre permanente
  }

  async uploadProductImages(
    files: Express.Multer.File[],
    username: string,
    plan: SubscriptionPlan = 'BASIC',
  ): Promise<string[]> {
    return this.uploadFiles(files, 'products', username, plan, true);
  }
}