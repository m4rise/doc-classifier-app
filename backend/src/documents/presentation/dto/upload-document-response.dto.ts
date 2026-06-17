export class UploadDocumentResponseDto {
  id!: string;
  status!: 'PENDING';
  originalName!: string;
  mimeType!: string;
  sizeBytes!: number;
}
