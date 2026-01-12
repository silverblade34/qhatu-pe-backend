import { Injectable, BadRequestException } from '@nestjs/common';
import { SubscriptionService } from '../subscription/subscription.service';
import { SubscriptionPlan } from 'src/common/constants/subscription-plan.constants';
import { ImageOptimizationService } from './services/image-optimization.service';
import { R2StorageService } from './services/r2-storage.service';

type DirectoryType = 'avatars' | 'banners' | 'products' | 'favicons';

@Injectable()
export class UploadService {
  constructor(
    private subscriptionService: SubscriptionService,
    private imageOptimization: ImageOptimizationService,
    private r2Storage: R2StorageService,
  ) { }

  async uploadFile(
    file: Express.Multer.File,
    directory: DirectoryType,
    username: string,
    plan: SubscriptionPlan = 'BASIC',
    isTemporary: boolean = false,
  ): Promise<string> {
    // Validar archivo
    this.imageOptimization.validateFile(file);

    // Obtener config de optimización según tipo
    const optimizationConfig = await this.imageOptimization.getOptimizationConfig(
      plan,
      directory,
    );

    // Optimizar imagen
    const optimizedBuffer = await this.imageOptimization.optimizeImage(
      file.buffer,
      file.mimetype,
      optimizationConfig,
    );

    // Subir a R2
    const url = await this.r2Storage.uploadToR2(
      optimizedBuffer,
      directory,
      username,
      file,
      optimizationConfig.format,
      plan,
      isTemporary,
    );

    return url;
  }

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

    await this.subscriptionService.validateImageUpload(plan, files.length);

    const uploadPromises = files.map((file) =>
      this.uploadFile(file, directory, username, plan, isTemporary),
    );

    return Promise.all(uploadPromises);
  }

  async confirmPermanentFiles(
    urls: string[],
    username: string,
  ): Promise<string[]> {
    return this.r2Storage.confirmPermanentFiles(urls, username);
  }

  // Métodos de conveniencia
  async uploadAvatar(
    file: Express.Multer.File,
    username: string,
  ): Promise<string> {
    return this.uploadFile(file, 'avatars', username, 'BASIC', false);
  }

  async uploadBanner(
    file: Express.Multer.File,
    username: string,
  ): Promise<string> {
    return this.uploadFile(file, 'banners', username, 'BASIC', false);
  }

  async uploadProductImages(
    files: Express.Multer.File[],
    username: string,
    plan: SubscriptionPlan = 'BASIC',
  ): Promise<string[]> {
    return this.uploadFiles(files, 'products', username, plan, true);
  }

  async uploadFavicon(
    files: Express.Multer.File,
    username: string,
    plan: SubscriptionPlan = 'BASIC',
  ): Promise<string> {
    return this.uploadFile(files, 'favicons', username, plan, false);
  }
}