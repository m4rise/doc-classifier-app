import {
  BadRequestException,
  Controller,
  HttpCode,
  HttpStatus,
  PayloadTooLargeException,
  Post,
  Req,
  UploadedFile,
  UnsupportedMediaTypeException,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import type { AuthenticatedRequest } from '../../auth/presentation/authenticated-request';
import { JwtAuthGuard } from '../../auth/infrastructure/passport/jwt-auth.guard';
import { createUploadThrottleOptions } from '../../shared/infrastructure/rate-limiting/throttle.config';
import { UploadDocumentUseCase } from '../application/use-cases/upload-document.use-case';
import {
  FileTooLargeError,
  InvalidFileTypeError,
} from '../domain/errors/upload-document.errors';
import { UploadDocumentResponseDto } from './dto/upload-document-response.dto';

interface UploadedMultipartFile {
  originalname: string;
  buffer: Buffer;
  size: number;
}

@Controller('api/v1/documents')
@UseGuards(JwtAuthGuard)
export class DocumentsController {
  constructor(private readonly uploadDocumentUseCase: UploadDocumentUseCase) {}

  @Post('upload')
  @Throttle(createUploadThrottleOptions())
  @HttpCode(HttpStatus.ACCEPTED)
  @UseInterceptors(FileInterceptor('file'))
  async upload(
    @Req() req: AuthenticatedRequest,
    @UploadedFile() file?: UploadedMultipartFile,
  ): Promise<UploadDocumentResponseDto> {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    try {
      return await this.uploadDocumentUseCase.execute({
        userId: req.user.userId,
        originalName: file.originalname,
        buffer: file.buffer,
        sizeBytes: file.size,
      });
    } catch (error) {
      if (error instanceof InvalidFileTypeError) {
        throw new UnsupportedMediaTypeException(error.message);
      }

      if (error instanceof FileTooLargeError) {
        throw new PayloadTooLargeException(error.message);
      }

      throw error;
    }
  }
}
