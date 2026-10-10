import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('next/headers', () => ({ cookies: async () => ({ get: () => undefined, set: () => {}, delete: () => {} }) }));
const { checkPassword, createSessionToken, verifySessionToken, adminConfig } = await import('./auth');

const config = { password: 'correct horse', secret: 'x'.repeat(40) };

describe('admin auth', () => {
  it('is switched off unless both env vars are set and the secret is long enough', () => {
    vi.stubEnv('ADMIN_PASSWORD', '');
    vi.stubEnv('ADMIN_SESSION_SECRET', 'y'.repeat(40));
    expect(adminConfig()).toBeNull();
    vi.stubEnv('ADMIN_PASSWORD', 'pw');
    vi.stubEnv('ADMIN_SESSION_SECRET', 'short');
    expect(adminConfig()).toBeNull();
    vi.stubEnv('ADMIN_SESSION_SECRET', 'y'.repeat(40));
    expect(adminConfig()).toEqual({ password: 'pw', secret: 'y'.repeat(40) });
    vi.unstubAllEnvs();
  });

  it('checks the password', () => {
    expect(checkPassword('correct horse', config)).toBe(true);
    expect(checkPassword('correct hors', config)).toBe(false);
    expect(checkPassword('', config)).toBe(false);
  });

  it('accepts its own session token until it expires, and rejects forgeries', () => {
    const now = 1_000_000;
    const token = createSessionToken(config, now);
    expect(verifySessionToken(token, config, now + 1000)).toBe(true);
    expect(verifySessionToken(token, config, now + 9 * 3600_000)).toBe(false);
    expect(verifySessionToken(token, { ...config, secret: 'z'.repeat(40) }, now)).toBe(false);
    const [, sig] = token.split('.');
    expect(verifySessionToken(`99999999999999.${sig}`, config, now)).toBe(false);
    expect(verifySessionToken(undefined, config, now)).toBe(false);
    expect(verifySessionToken('garbage', config, now)).toBe(false);
  });
});
