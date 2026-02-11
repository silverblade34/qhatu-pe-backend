import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  UseGuards,
  UploadedFiles,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { UploadService } from './upload.service';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';

@Controller('upload')
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  private sanitizeFilename(filename: string): string {
    return filename
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^\w\s.-]/g, '')
      .replace(/\s+/g, '-')
      .toLowerCase();
  }

  private sanitizeFiles(files: Express.Multer.File[]): Express.Multer.File[] {
    return files.map(file => ({
      ...file,
      originalname: this.sanitizeFilename(file.originalname),
    }));
  }

  @Post('product-images')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FilesInterceptor('images', 5, {
      limits: {
        fileSize: 10 * 1024 * 1024,
      },
      fileFilter: (req, file, cb) => {
        const allowedMimes = [
          'image/jpeg',
          'image/jpg',
          'image/png',
          'image/webp',
          'image/heic',
        ];

        if (!allowedMimes.includes(file.mimetype)) {
          return cb(
            new BadRequestException(
              'Solo se permiten imágenes (JPEG, PNG, WebP, HEIC)'
            ),
            false,
          );
        }
        cb(null, true);
      },
    }),
  )
  async uploadProductImages(
    @UploadedFiles() files: Express.Multer.File[],
    @CurrentUser() user: any,
  ) {
    console.log('Usuario que sube las imágenes:', user.username);
    console.log('Archivos originales:', files.map(f => f.originalname));

    if (!files || files.length === 0) {
      throw new BadRequestException('Debes subir al menos una imagen');
    }

    const sanitizedFiles = this.sanitizeFiles(files);
    console.log('Archivos sanitizados:', sanitizedFiles.map(f => f.originalname));

    const urls = await this.uploadService.uploadProductImages(
      sanitizedFiles,
      user.username,
      user.plan || 'BASIC',
    );

    return {
      success: true,
      message: `${urls.length} ${urls.length === 1 ? 'imagen subida' : 'imágenes subidas'} correctamente`,
      urls,
      count: urls.length,
    };
  }

  @Post('avatar')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor('avatar', {
      limits: {
        fileSize: 5 * 1024 * 1024,
      },
      fileFilter: (req, file, cb) => {
        const allowedMimes = [
          'image/jpeg',
          'image/jpg',
          'image/png',
          'image/webp',
          'image/heic',
        ];

        if (!allowedMimes.includes(file.mimetype)) {
          return cb(
            new BadRequestException(
              'Solo se permiten imágenes (JPEG, PNG, WebP, HEIC)'
            ),
            false,
          );
        }
        cb(null, true);
      },
    }),
  )
  async uploadAvatar(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: any,
  ) {
    if (!file) {
      throw new BadRequestException('No se ha proporcionado ningún archivo');
    }

    const sanitizedFile = {
      ...file,
      originalname: this.sanitizeFilename(file.originalname),
    };

    const url = await this.uploadService.uploadAvatar(sanitizedFile, user.username);

    return {
      success: true,
      message: 'Avatar actualizado correctamente',
      url,
    };
  }

  @Post('banner')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor('banner', {
      limits: {
        fileSize: 5 * 1024 * 1024,
      },
      fileFilter: (req, file, cb) => {
        const allowedMimes = [
          'image/jpeg',
          'image/jpg',
          'image/png',
          'image/webp',
          'image/heic',
        ];

        if (!allowedMimes.includes(file.mimetype)) {
          return cb(
            new BadRequestException(
              'Solo se permiten imágenes (JPEG, PNG, WebP, HEIC)'
            ),
            false,
          );
        }
        cb(null, true);
      },
    }),
  )
  async uploadBanner(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: any,
  ) {
    if (!file) {
      throw new BadRequestException('No se ha proporcionado ningún archivo');
    }

    const sanitizedFile = {
      ...file,
      originalname: this.sanitizeFilename(file.originalname),
    };

    const url = await this.uploadService.uploadBanner(sanitizedFile, user.username);

    return {
      success: true,
      message: 'Banner actualizado correctamente',
      url,
    };
  }

  @Post('favicon')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor('favicon', {
      limits: {
        fileSize: 1 * 1024 * 1024,
      },
      fileFilter: (req, file, cb) => {
        const allowedMimes = ['image/png'];

        if (!allowedMimes.includes(file.mimetype)) {
          return cb(
            new BadRequestException('Solo se permiten imágenes PNG'),
            false,
          );
        }
        cb(null, true);
      },
    }),
  )
  async uploadFavicon(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: any,
  ) {
    if (!file) {
      throw new BadRequestException('No se ha proporcionado ningún archivo');
    }

    const sanitizedFile = {
      ...file,
      originalname: this.sanitizeFilename(file.originalname),
    };

    const url = await this.uploadService.uploadFavicon(sanitizedFile, user.username);

    return {
      success: true,
      message: 'Favicon actualizado correctamente',
      url,
    };
  }
}