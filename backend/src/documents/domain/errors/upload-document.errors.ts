export class InvalidFileTypeError extends Error {
  constructor() {
    super('Invalid file type');
  }
}

export class FileTooLargeError extends Error {
  constructor() {
    super('File too large');
  }
}
