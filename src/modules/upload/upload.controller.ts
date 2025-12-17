import { Controller, Post, UseInterceptors, UploadedFile, UseGuards, UploadedFiles, BadRequestException } from '@nestjs/common';
import { UploadService } from './upload.service';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';

@Controller('upload')
export class UploadController {
  constructor(private readonly uploadService: UploadService) { }

  @Post('product-images')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FilesInterceptor('images', 5))
  async uploadProductImages(
    @UploadedFiles() files: Express.Multer.File[],
    @CurrentUser() user: any,
  ) {
    return this.uploadService.uploadFiles(files, 'productos', user.id);
  }

  @Post('avatar')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('avatar'))
  async uploadAvatar(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: any,
  ) {
    if (!file) {
      throw new BadRequestException('No se ha proporcionado ningún archivo');
    }

    const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException('El archivo debe ser una imagen (JPEG, PNG o WEBP)');
    }

    const maxSize = 2 * 1024 * 1024; // 2MB para avatares
    if (file.size > maxSize) {
      throw new BadRequestException('El archivo no debe superar los 2MB');
    }

    const url = await this.uploadService.uploadFile(file, 'avatares', user.id);

    return {
      success: true,
      url,
    };
  }
}
