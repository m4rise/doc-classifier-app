export class UserProfileNotFoundError extends Error {
  constructor() {
    super('User profile not found');
  }
}

export class UserProfileEmailAlreadyInUseError extends Error {
  constructor() {
    super('Email already in use');
  }
}
