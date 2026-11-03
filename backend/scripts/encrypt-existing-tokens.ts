/**
 * One-off: encrypts ConnectedIntegration tokens that are still stored in plaintext.
 * Usage: INTEGRATION_ENCRYPTION_KEY=... DATABASE_URL=... npx ts-node scripts/encrypt-existing-tokens.ts
 */
import { PrismaClient } from '@prisma/client';
import { encryptSecret, isEncrypted } from '../src/prisma-manager/crypto-box';

(async () => {
  if (!process.env.INTEGRATION_ENCRYPTION_KEY) throw new Error('Set INTEGRATION_ENCRYPTION_KEY first');
  const raw = new PrismaClient(); // un-extended client: sees the stored values as they are
  const rows = await raw.connectedIntegration.findMany();
  let changed = 0;
  for (const r of rows) {
    const data: { accessToken?: string; refreshToken?: string } = {};
    if (r.accessToken && !isEncrypted(r.accessToken)) data.accessToken = encryptSecret(r.accessToken);
    if (r.refreshToken && !isEncrypted(r.refreshToken)) data.refreshToken = encryptSecret(r.refreshToken);
    if (Object.keys(data).length) { await raw.connectedIntegration.update({ where: { id: r.id }, data }); changed++; }
  }
  console.log(`Encrypted ${changed} of ${rows.length} integrations.`);
  await raw.$disconnect();
})();
