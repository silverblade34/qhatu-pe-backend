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
  constructor(private readonly uploadService: UploadService) { }

  /**
   * Sube imágenes de productos (máximo 5 por request)
   */
  @Post('product-images')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FilesInterceptor('images', 5, {
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
      },
      fileFilter: (req, file, cb) => {
        const allowedMimes = [
          'image/jpeg',
          'image/jpg',
          'image/png',
          'image/webp',
          'image/heic', // iPhone usa HEIC
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
    if (!files || files.length === 0) {
      throw new BadRequestException('Debes subir al menos una imagen');
    }

    const urls = await this.uploadService.uploadProductImages(
      files,
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

  /**
   * Sube avatar de usuario
   */
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

    const url = await this.uploadService.uploadAvatar(file, user.username);

    return {
      success: true,
      message: 'Avatar actualizado correctamente',
      url,
    };
  }


  /**
 * Sube banner de usuario
 */
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

    const url = await this.uploadService.uploadBanner(file, user.username);

    return {
      success: true,
      message: 'Banner actualizado correctamente',
      url,
    };
  }

    /**
 * Sube favicon de usuario
 */
  @Post('favicon')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor('favicon', {
      limits: {
        fileSize: 1 * 1024 * 1024,
      },
      fileFilter: (req, file, cb) => {
        const allowedMimes = [
          'image/png',
        ];

        if (!allowedMimes.includes(file.mimetype)) {
          return cb(
            new BadRequestException(
              'Solo se permiten imágenes PNG'
            ),
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

    const url = await this.uploadService.uploadFavicon(file, user.username);

    return {
      success: true,
      message: 'Favicon actualizado correctamente',
      url,
    };
  }
}