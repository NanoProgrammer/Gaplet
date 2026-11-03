import * as crypto from 'crypto';
import { PrismaClient } from '@prisma/client';
import { decryptSecret, encryptSecret, isEncrypted } from './crypto-box';
import { PrismaManagerService } from './prisma-manager.service';

const run = process.env.DATABASE_URL ? describe : describe.skip;

describe('crypto-box', () => {
  const OLD = process.env.INTEGRATION_ENCRYPTION_KEY;
  afterEach(() => { process.env.INTEGRATION_ENCRYPTION_KEY = OLD; });

  it('round-trips, uses a random IV and authenticates', () => {
    process.env.INTEGRATION_ENCRYPTION_KEY = crypto.randomBytes(32).toString('base64');
    const a = encryptSecret('tok_123'), b = encryptSecret('tok_123');
    expect(isEncrypted(a)).toBe(true);
    expect(a).not.toBe(b);
    expect(decryptSecret(a)).toBe('tok_123');
    const tampered = a.slice(0, -2) + (a.endsWith('AA') ? 'BB' : 'AA');
    expect(() => decryptSecret(tampered)).toThrow();
  });
  it('passes legacy plaintext through and is a no-op without a key', () => {
    delete process.env.INTEGRATION_ENCRYPTION_KEY;
    expect(encryptSecret('plain')).toBe('plain');
    expect(decryptSecret('plain')).toBe('plain');
    process.env.INTEGRATION_ENCRYPTION_KEY = crypto.randomBytes(32).toString('base64');
    expect(decryptSecret('legacy-plaintext')).toBe('legacy-plaintext');
  });
  it('rejects a key of the wrong size', () => {
    process.env.INTEGRATION_ENCRYPTION_KEY = Buffer.from('short').toString('base64');
    expect(() => encryptSecret('x')).toThrow(/32 bytes/);
  });
});

run('token encryption in the database', () => {
  const app = new PrismaManagerService();
  const raw = new PrismaClient();
  let userId: string;
  beforeAll(() => { process.env.INTEGRATION_ENCRYPTION_KEY = crypto.randomBytes(32).toString('base64'); });
  beforeEach(async () => {
    await raw.replacementLog.deleteMany(); await raw.openSlot.deleteMany(); await raw.client.deleteMany();
    await raw.userPreference.deleteMany(); await raw.connectedIntegration.deleteMany(); await raw.user.deleteMany();
    userId = (await raw.user.create({ data: { email: 'enc@x.test' } })).id;
  });
  afterAll(async () => { await app.$disconnect(); await raw.$disconnect(); });

  it('stores ciphertext but the app sees plaintext (create, update, upsert, reads)', async () => {
    await app.connectedIntegration.create({ data: { userId, provider: 'x', accessToken: 'AT-1', refreshToken: 'RT-1' } });
    let stored = await raw.connectedIntegration.findUniqueOrThrow({ where: { userId } });
    expect(isEncrypted(stored.accessToken)).toBe(true);
    expect(isEncrypted(stored.refreshToken!)).toBe(true);
    expect(stored.accessToken).not.toContain('AT-1');
    expect(await app.connectedIntegration.findUnique({ where: { userId } })).toMatchObject({ accessToken: 'AT-1', refreshToken: 'RT-1' });

    await app.connectedIntegration.update({ where: { userId }, data: { accessToken: 'AT-2' } });
    stored = await raw.connectedIntegration.findUniqueOrThrow({ where: { userId } });
    expect(isEncrypted(stored.accessToken)).toBe(true);
    expect((await app.connectedIntegration.findFirstOrThrow({ where: { userId } })).accessToken).toBe('AT-2');

    await app.connectedIntegration.upsert({ where: { userId }, update: { accessToken: 'AT-3' }, create: { userId, provider: 'x', accessToken: 'n' } });
    expect((await app.connectedIntegration.findMany({ where: { userId } }))[0].accessToken).toBe('AT-3');
    expect(isEncrypted((await raw.connectedIntegration.findUniqueOrThrow({ where: { userId } })).accessToken)).toBe(true);
  });

  it('still reads rows written in plaintext before encryption was enabled', async () => {
    await raw.connectedIntegration.create({ data: { userId, provider: 'square', accessToken: 'LEGACY' } });
    expect((await app.connectedIntegration.findUniqueOrThrow({ where: { userId } })).accessToken).toBe('LEGACY');
  });
});
