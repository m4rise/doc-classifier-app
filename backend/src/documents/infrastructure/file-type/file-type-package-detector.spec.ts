import { FileTypePackageDetector } from './file-type-package-detector';

const DOCX_MIME_TYPE =
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

describe('FileTypePackageDetector', () => {
  const detector = new FileTypePackageDetector();

  it.each([
    [
      'pdf',
      Buffer.from('%PDF-1.4\n%%EOF', 'utf8'),
      { ext: 'pdf', mime: 'application/pdf' },
    ],
    [
      'png',
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      { ext: 'png', mime: 'image/png' },
    ],
    ['docx', createDocxBuffer(), { ext: 'docx', mime: DOCX_MIME_TYPE }],
  ])('detects %s files by magic bytes', async (_name, buffer, expected) => {
    await expect(detector.detect(buffer)).resolves.toEqual(expected);
  });

  it('returns null when file type cannot be detected', async () => {
    await expect(detector.detect(Buffer.from('not a document'))).resolves.toBe(
      null,
    );
  });
});

function createDocxBuffer(): Buffer {
  return Buffer.concat([
    createZipLocalHeader('[Content_Types].xml'),
    createZipLocalHeader('_rels/.rels'),
    createZipLocalHeader('word/document.xml'),
  ]);
}

function createZipLocalHeader(fileName: string): Buffer {
  const fileNameBuffer = Buffer.from(fileName, 'utf8');
  const header = Buffer.alloc(30);

  header.writeUInt32LE(0x04034b50, 0);
  header.writeUInt16LE(20, 4);
  header.writeUInt16LE(0, 6);
  header.writeUInt16LE(0, 8);
  header.writeUInt16LE(0, 10);
  header.writeUInt16LE(0, 12);
  header.writeUInt32LE(0, 14);
  header.writeUInt32LE(0, 18);
  header.writeUInt32LE(0, 22);
  header.writeUInt16LE(fileNameBuffer.length, 26);
  header.writeUInt16LE(0, 28);

  return Buffer.concat([header, fileNameBuffer]);
}
