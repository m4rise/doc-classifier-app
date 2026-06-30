import { RefreshTokenRepository } from '../ports/refresh-token.repository.port';

interface LogoutInput {
  userId: string;
}

export class LogoutUseCase {
  constructor(
    private readonly refreshTokenRepository: RefreshTokenRepository,
    private readonly now: () => Date,
  ) {}

  async execute(input: LogoutInput): Promise<void> {
    await this.refreshTokenRepository.revokeAllForUser(
      input.userId,
      this.now(),
    );
  }
}
