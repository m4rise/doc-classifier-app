export class EmailAlreadyInUseError extends Error {
  constructor() {
    super('Email already in use');
  }
}

export class TosConsentRequiredError extends Error {
  constructor() {
    super('ToS consent is required');
  }
}

export class UnsupportedTosVersionError extends Error {
  constructor() {
    super('Unsupported ToS version');
  }
}

export class WeakPasswordError extends Error {
  constructor() {
    super('Password must be at least 8 characters long');
  }
}
