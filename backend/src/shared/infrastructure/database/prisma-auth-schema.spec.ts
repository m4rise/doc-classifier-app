import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('Prisma auth schema contract (DC-2.1)', () => {
  const schemaPath = join(process.cwd(), 'prisma', 'schema.prisma');
  const schema = readFileSync(schemaPath, 'utf8');

  it('defines Role enum with USER and ADMIN values', () => {
    expect(schema).toMatch(
      /enum\s+Role\s*\{[\s\S]*\bUSER\b[\s\S]*\bADMIN\b[\s\S]*\}/m,
    );
  });

  it('defines User model with required auth columns', () => {
    expect(schema).toMatch(
      /model\s+User\s*\{[\s\S]*\bid\s+String\s+@id\s+@default\(uuid\(\)\)/m,
    );
    expect(schema).toMatch(
      /model\s+User\s*\{[\s\S]*\bemail\s+String\s+@unique/m,
    );
    expect(schema).toMatch(/model\s+User\s*\{[\s\S]*\bpasswordHash\s+String/m);
    expect(schema).toMatch(/model\s+User\s*\{[\s\S]*\brole\s+Role/m);
    expect(schema).toMatch(/model\s+User\s*\{[\s\S]*\bisActive\s+Boolean/m);
    expect(schema).toMatch(
      /model\s+User\s*\{[\s\S]*\bcreatedAt\s+DateTime\s+@default\(now\(\)\)/m,
    );
    expect(schema).toMatch(
      /model\s+User\s*\{[\s\S]*\bupdatedAt\s+DateTime\s+@updatedAt/m,
    );
  });

  it('defines RefreshToken model with relation and lifecycle columns', () => {
    expect(schema).toMatch(
      /model\s+RefreshToken\s*\{[\s\S]*\bid\s+String\s+@id\s+@default\(uuid\(\)\)/m,
    );
    expect(schema).toMatch(
      /model\s+RefreshToken\s*\{[\s\S]*\btokenHash\s+String/m,
    );
    expect(schema).toMatch(
      /model\s+RefreshToken\s*\{[\s\S]*\buserId\s+String/m,
    );
    expect(schema).toMatch(
      /model\s+RefreshToken\s*\{[\s\S]*\bexpiresAt\s+DateTime/m,
    );
    expect(schema).toMatch(
      /model\s+RefreshToken\s*\{[\s\S]*\brevokedAt\s+DateTime\?/m,
    );
    expect(schema).toMatch(
      /model\s+RefreshToken\s*\{[\s\S]*\bcreatedAt\s+DateTime\s+@default\(now\(\)\)/m,
    );
    expect(schema).toMatch(
      /model\s+RefreshToken\s*\{[\s\S]*@@map\("refresh_tokens"\)/m,
    );
  });

  it('defines ConsentRecord model with legal-consent columns', () => {
    expect(schema).toMatch(
      /model\s+ConsentRecord\s*\{[\s\S]*\bid\s+String\s+@id\s+@default\(uuid\(\)\)/m,
    );
    expect(schema).toMatch(
      /model\s+ConsentRecord\s*\{[\s\S]*\buserId\s+String/m,
    );
    expect(schema).toMatch(
      /model\s+ConsentRecord\s*\{[\s\S]*\btosVersion\s+String/m,
    );
    expect(schema).toMatch(
      /model\s+ConsentRecord\s*\{[\s\S]*\bacceptedAt\s+DateTime/m,
    );
    expect(schema).toMatch(
      /model\s+ConsentRecord\s*\{[\s\S]*\bipAddress\s+String\?/m,
    );
    expect(schema).toMatch(
      /model\s+ConsentRecord\s*\{[\s\S]*@@map\("consent_records"\)/m,
    );
  });
});
