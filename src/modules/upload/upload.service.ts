import { Injectable } from '@nestjs/common';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';
import * as mime from 'mime-types';
import { r2Client } from 'src/config/r2.config';
import { ConfigService } from '@nestjs/config';

type BucketType = 'avatars' | 'products';

@Injectable()
export class UploadService {
  constructor(private config: ConfigService) {}

  /**
   * Sube un archivo a R2
   * @param file - Archivo a subir
   * @param bucketType - Tipo de bucket ('avatars' o 'products')
   * @param userId - ID del usuario
   * @returns URL pública del archivo
   */
  async uploadFile(
    file: Express.Multer.File,
    bucketType: BucketType,
    userId: string,
  ): Promise<string> {
    const extension = mime.extension(file.mimetype) || 'bin';
    const fileName = `${userId}/${uuidv4()}.${extension}`;

    // Obtener configuración del bucket según el tipo
    const bucketConfig = this.config.get(`r2.buckets.${bucketType}`);
    const bucketName = bucketConfig.name;
    const publicUrl = bucketConfig.publicUrl;

    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: fileName,
      Body: file.buffer,
      ContentType: file.mimetype,
      ContentDisposition: 'inline',
      // R2 no soporta ACL en PutObjectCommand
      // El acceso público se configura desde Cloudflare Dashboard
    });

    await r2Client.send(command);

    // Retorna URL pública con subdominio personalizado
    // Ejemplo: https://cdn.qhatupe.com/user-id/file.jpg
    return `${publicUrl}/${fileName}`;
  }

  /**
   * Sube múltiples archivos a R2
   * @param files - Archivos a subir
   * @param bucketType - Tipo de bucket ('avatars' o 'products')
   * @param userId - ID del usuario
   * @returns Array de URLs públicas
   */
  async uploadFiles(
    files: Express.Multer.File[],
    bucketType: BucketType,
    userId: string,
  ): Promise<string[]> {
    const uploadedUrls: string[] = [];

    for (const file of files) {
      const url = await this.uploadFile(file, bucketType, userId);
      uploadedUrls.push(url);
    }

    return uploadedUrls;
  }

  /**
   * Sube un archivo de avatar (atajo para uploadFile con bucket 'avatars')
   */
  async uploadAvatar(
    file: Express.Multer.File,
    userId: string,
  ): Promise<string> {
    return this.uploadFile(file, 'avatars', userId);
  }

  /**
   * Sube archivos de productos (atajo para uploadFiles con bucket 'products')
   */
  async uploadProductImages(
    files: Express.Multer.File[],
    userId: string,
  ): Promise<string[]> {
    return this.uploadFiles(files, 'products', userId);
  }
}