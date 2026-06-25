import {
  BadRequestException,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  PayloadTooLargeException,
  Post,
  Query,
  Req,
  UploadedFile,
  UnsupportedMediaTypeException,
  UseGuards,
  UseInterceptors,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import type { AuthenticatedRequest } from '../../auth/presentation/authenticated-request';
import { JwtAuthGuard } from '../../auth/infrastructure/passport/jwt-auth.guard';
import { createUploadThrottleOptions } from '../../shared/infrastructure/rate-limiting/throttle.config';
import { GetDocumentUseCase } from '../application/use-cases/get-document.use-case';
import { ListDocumentsUseCase } from '../application/use-cases/list-documents.use-case';
import { SynchronousDocumentProcessingWorkflow } from '../application/workflows/synchronous-document-processing.workflow';
import { InvalidDocumentCursorError } from '../application/errors/list-documents.errors';
import { DocumentNotFoundError } from '../domain/errors/process-document.errors';
import {
  FileTooLargeError,
  InvalidFileTypeError,
} from '../domain/errors/upload-document.errors';
import { DocumentDetailResponseDto } from './dto/document-detail-response.dto';
import { DocumentResponseDto } from './dto/document-response.dto';
import { ListDocumentsQueryDto } from './dto/list-documents-query.dto';
import { ListDocumentsResponseDto } from './dto/list-documents-response.dto';

interface UploadedMultipartFile {
  originalname: string;
  buffer: Buffer;
  size: number;
}

@Controller('api/v1/documents')
@UseGuards(JwtAuthGuard)
export class DocumentsController {
  constructor(
    private readonly synchronousDocumentProcessing: SynchronousDocumentProcessingWorkflow,
    private readonly getDocumentUseCase: GetDocumentUseCase,
    private readonly listDocumentsUseCase: ListDocumentsUseCase,
  ) {}

  @Post('upload')
  @Throttle(createUploadThrottleOptions())
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(FileInterceptor('file'))
  async upload(
    @Req() req: AuthenticatedRequest,
    @UploadedFile() file?: UploadedMultipartFile,
  ): Promise<DocumentResponseDto> {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    try {
      return await this.synchronousDocumentProcessing.execute({
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

  @Get()
  @UsePipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  )
  async list(
    @Req() req: AuthenticatedRequest,
    @Query() query: ListDocumentsQueryDto,
  ): Promise<ListDocumentsResponseDto> {
    try {
      return await this.listDocumentsUseCase.execute({
        userId: req.user.userId,
        limit: query.limit,
        cursor: query.cursor,
      });
    } catch (error) {
      if (error instanceof InvalidDocumentCursorError) {
        throw new BadRequestException(error.message);
      }

      throw error;
    }
  }

  @Get(':id')
  async getById(
    @Req() req: AuthenticatedRequest,
    @Param('id') documentId: string,
  ): Promise<DocumentDetailResponseDto> {
    try {
      return await this.getDocumentUseCase.execute(documentId, req.user.userId);
    } catch (error) {
      if (error instanceof DocumentNotFoundError) {
        throw new NotFoundException(error.message);
      }

      throw error;
    }
  }
}
