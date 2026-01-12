import { Injectable } from '@nestjs/common';
import {
  PutObjectCommand,
  CopyObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { ConfigService } from '@nestjs/config';
import slugify from 'slugify';
import { r2Client } from 'src/config/r2.config';
import { SubscriptionPlan } from 'src/common/constants/subscription-plan.constants';

type DirectoryType = 'avatars' | 'banners' | 'products' | 'favicons';

interface UploadMetadata {
  originalName: string;
  originalSize: string;
  optimizedSize: string;
  uploadedBy: string;
  uploadedAt: string;
  plan: SubscriptionPlan;
  isTemporary: string;
}

@Injectable()
export class R2StorageService {
  constructor(private config: ConfigService) {}

  async uploadToR2(
    buffer: Buffer,
    directory: DirectoryType,
    username: string,
    originalFile: Express.Multer.File,
    format: string,
    plan: SubscriptionPlan,
    isTemporary: boolean,
  ): Promise<string> {
    const fileName = this.generateFileName(
      directory,
      originalFile.originalname,
      username,
      format,
      isTemporary,
    );

    const bucketConfig = this.config.get(`r2.buckets.${directory}`);
    const bucketName = bucketConfig.name;
    const publicUrl = bucketConfig.publicUrl;

    const metadata: UploadMetadata = {
      originalName: originalFile.originalname,
      originalSize: originalFile.size.toString(),
      optimizedSize: buffer.length.toString(),
      uploadedBy: username,
      uploadedAt: new Date().toISOString(),
      plan: plan,
      isTemporary: isTemporary.toString(),
    };

    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: fileName,
      Body: buffer,
      ContentType: `image/${format}`,
      ContentDisposition: 'inline',
      CacheControl: isTemporary
        ? 'public, max-age=3600' // 1 hora
        : 'public, max-age=31536000, immutable', // 1 año
      ...(isTemporary && {
        Expires: new Date(Date.now() + 60 * 60 * 1000), // 1 hora
      }),
      Metadata: metadata as any,
    });

    await r2Client.send(command);

    return `${publicUrl}/${fileName}`;
  }

  async confirmPermanentFiles(
    urls: string[],
    username: string,
  ): Promise<string[]> {
    const bucketConfig = this.config.get('r2.buckets.products');
    const bucketName = bucketConfig.name;
    const publicUrl = bucketConfig.publicUrl;
    const confirmedUrls: string[] = [];

    for (const url of urls) {
      try {
        const tempKey = url.replace(`${publicUrl}/`, '');

        if (!tempKey.startsWith('temp/')) {
          console.warn(`URL no es temporal, se mantiene: ${url}`);
          confirmedUrls.push(url);
          continue;
        }

        const permanentKey = tempKey.replace('temp/', '');

        // Copiar a ubicación permanente
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

        // Eliminar temporal
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

  private generateFileName(
    directory: string,
    originalName: string,
    username: string,
    extension: string,
    isTemporary: boolean = false,
  ): string {
    const baseName = this.normalizeFilename(originalName);
    //const uniqueSuffix = this.shortId();
    const folder = isTemporary ? 'temp' : username;
    return `${directory}/${folder}/${baseName}.${extension}`;
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
}