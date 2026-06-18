import { InvalidFileTypeError } from '../errors/upload-document.errors';
import { validateDocumentFileType } from './document-file-policy';

const DOCX_MIME_TYPE =
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

describe('validateDocumentFileType', () => {
  it.each([
    ['invoice.pdf', 'pdf', 'application/pdf', 'application/pdf'],
    ['scan.jpg', 'jpg', 'image/jpeg', 'image/jpeg'],
    ['scan.jpeg', 'jpg', 'image/jpeg', 'image/jpeg'],
    ['chart.png', 'png', 'image/png', 'image/png'],
    ['contract.docx', 'docx', DOCX_MIME_TYPE, DOCX_MIME_TYPE],
  ])(
    'accepts supported %s files when extension and magic bytes match',
    (originalName, ext, mime, expectedMimeType) => {
      expect(validateDocumentFileType(originalName, { ext, mime })).toEqual({
        mimeType: expectedMimeType,
      });
    },
  );

  it.each([
    ['invoice.pdf', 'jpg', 'image/jpeg'],
    ['archive.zip', 'zip', 'application/zip'],
    ['README', 'pdf', 'application/pdf'],
    ['empty.pdf', '', ''],
  ])('rejects unsupported or mismatched files', (originalName, ext, mime) => {
    expect(() => validateDocumentFileType(originalName, { ext, mime })).toThrow(
      InvalidFileTypeError,
    );
  });

  it('rejects files whose magic bytes cannot be detected', () => {
    expect(() => validateDocumentFileType('invoice.pdf', null)).toThrow(
      InvalidFileTypeError,
    );
  });
});
