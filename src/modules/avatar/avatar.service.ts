import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { Avatar, AvatarCatalog } from './interfaces/avatar.interface';
import { createAvatar } from '@dicebear/core';
import * as initials from '@dicebear/initials';

export type AvatarStyle = 'initials' | 'adventurer' | 'avataaars' | 'bottts' | 'lorelei' | 'personas' | 'shapes';

@Injectable()
export class AvatarService implements OnModuleInit {
  private catalog: AvatarCatalog | null = null;
  private s3Client: S3Client;
  private readonly bucketName = 'avatars';

  private readonly styleDescriptions = {
    initials: {
      name: 'Iniciales',
      description: 'Avatar con las iniciales de tu nombre',
      example: 'JP',
      recommended: 'Para empresas y tiendas',
    },
    adventurer: {
      name: 'Adventurer',
      description: 'Avatar de aventurero estilo cartoon',
      example: '🧑‍🦱',
      recommended: 'Para perfiles dinámicos y juveniles',
    },
    avataaars: {
      name: 'Avataaars',
      description: 'Personaje cartoon estilo diseño moderno',
      example: '😊',
      recommended: 'Para clientes y usuarios casuales',
    },
    lorelei: {
      name: 'Lorelei',
      description: 'Avatar femenino ilustrado minimalista',
      example: '👩',
      recommended: 'Para perfiles femeninos',
    },
    personas: {
      name: 'Personas',
      description: 'Avatar realista de personas',
      example: '🙂',
      recommended: 'Para perfiles profesionales',
    },
    bottts: {
      name: 'Bottts',
      description: 'Robot cute y divertido',
      example: '🤖',
      recommended: 'Para cuentas tech o gaming',
    },
    shapes: {
      name: 'Shapes',
      description: 'Formas geométricas abstractas',
      example: '◆',
      recommended: 'Para cuentas minimalistas',
    },
  };

  constructor(private config: ConfigService) {
    this.s3Client = new S3Client({
      endpoint: this.config.get('minio.endpoint'),
      region: this.config.get('minio.region'),
      credentials: {
        accessKeyId: this.config.get('minio.accessKeyId'),
        secretAccessKey: this.config.get('minio.secretAccessKey'),
      },
      forcePathStyle: true,
    });
  }

  async onModuleInit() {
    try {
      await this.loadCatalog();
      console.log('Catálogo de avatares cargado');
    } catch (error) {
      console.error('Error cargando catálogo de avatares:', error.message);
    }
  }

  private async loadCatalog(): Promise<void> {
    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: 'catalog.json',
    });

    const response = await this.s3Client.send(command);
    const catalogJson = await response.Body.transformToString();
    this.catalog = JSON.parse(catalogJson);
  }

  getAvailableStyles() {
    if (!this.catalog) {
      return Object.entries(this.styleDescriptions).map(([key, value]) => ({
        id: key,
        ...value,
      }));
    }
    return this.catalog.styles;
  }

  getAllAvatars(limit?: number) {
    if (!this.catalog) return [];
    const avatars = this.catalog.avatars;
    return limit ? avatars.slice(0, limit) : avatars;
  }

  getAvatarsByStyle(style: AvatarStyle, limit?: number) {
    if (!this.catalog) return [];
    const filtered = this.catalog.avatars.filter(a => a.style === style);
    return limit ? filtered.slice(0, limit) : filtered;
  }

  getRandomAvatar(): Avatar | null {
    if (!this.catalog || this.catalog.avatars.length === 0) return null;
    const randomIndex = Math.floor(Math.random() * this.catalog.avatars.length);
    return this.catalog.avatars[randomIndex];
  }

  getRandomAvatarByStyle(style: AvatarStyle): Avatar | null {
    const avatars = this.getAvatarsByStyle(style);
    if (avatars.length === 0) return null;
    const randomIndex = Math.floor(Math.random() * avatars.length);
    return avatars[randomIndex];
  }

  getRandomAvatarsForSelection(count: number = 12, style?: AvatarStyle) {
    if (!this.catalog) return [];
    const sourceAvatars = style
      ? this.getAvatarsByStyle(style)
      : this.catalog.avatars;
    const shuffled = [...sourceAvatars].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
  }

  getAvatarById(id: string): Avatar | null {
    if (!this.catalog) return null;
    return this.catalog.avatars.find(a => a.id === id) || null;
  }

  getAvatarsByColor(color: string, limit?: number) {
    if (!this.catalog) return [];
    const filtered = this.catalog.avatars.filter(
      a => a.backgroundColor.toLowerCase() === color.toLowerCase()
    );
    return limit ? filtered.slice(0, limit) : filtered;
  }

  getCatalogStats() {
    if (!this.catalog) return null;
    return {
      version: this.catalog.version,
      generatedAt: this.catalog.generatedAt,
      totalAvatars: this.catalog.totalAvatars,
      styleCount: this.catalog.styles.length,
      styles: this.catalog.styles.map(s => ({
        id: s.id,
        name: s.name,
        count: s.count,
      })),
    };
  }

  async refreshCatalog(): Promise<void> {
    await this.loadCatalog();
  }

  /**
 * Genera avatar con iniciales y lo sube a MinIO
 */
  async generateAndUploadInitialsAvatar(fullName: string): Promise<string> {
    const initialsText = this.getInitials(fullName);
    const timestamp = Date.now();
    const filename = `initials/user-${initialsText.toLowerCase()}-${timestamp}.svg`;

    const avatar = createAvatar(initials, {
      seed: fullName,
      size: 200,
    });

    const svg = avatar.toString();

    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: filename,
      Body: Buffer.from(svg),
      ContentType: 'image/svg+xml',
      ACL: 'public-read',
    });

    await this.s3Client.send(command);

    const publicUrl = this.config.get('minio.endpoint');
    return `${publicUrl}/${this.bucketName}/${filename}`;
  }

  private getInitials(fullName: string): string {
    return fullName
      .split(' ')
      .filter(word => word.length > 0)
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }
}