import { Injectable } from '@nestjs/common';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';
import * as mime from 'mime-types';
import { s3Client } from 'src/config/minio.config';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class UploadService {
  constructor(private config: ConfigService) { }

  async uploadFile(file: Express.Multer.File, bucket: string, userId: string): Promise<string> {
    const extension = mime.extension(file.mimetype) || 'bin';
    const fileName = `${userId}/${uuidv4()}.${extension}`;

    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: fileName,
      Body: file.buffer,
      ContentType: file.mimetype,
      ContentDisposition: 'inline',
      ACL: 'public-read',
    });

    await s3Client.send(command);

    const publicUrl = this.config.get('minio.publicUrl');
    return `${publicUrl}/${bucket}/${fileName}`;
  }

  async uploadFiles(
    files: Express.Multer.File[],
    bucket: string,
    userId: string,
  ): Promise<string[]> {

    const uploadedUrls: string[] = [];

    for (const file of files) {
      const url = await this.uploadFile(file, bucket, userId);
      uploadedUrls.push(url);
    }

    return uploadedUrls;
  }
}

