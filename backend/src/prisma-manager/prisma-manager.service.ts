import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { decryptSecret, encryptSecret } from './crypto-box';

const SECRET_FIELDS = ['accessToken', 'refreshToken'] as const;

const encryptData = (data: any) => {
  if (!data || typeof data !== 'object') return data;
  for (const f of SECRET_FIELDS) if (typeof data[f] === 'string') data[f] = encryptSecret(data[f]);
  return data;
};

const decryptRow = (row: any) => {
  if (!row || typeof row !== 'object') return row;
  for (const f of SECRET_FIELDS) if (typeof row[f] === 'string') row[f] = decryptSecret(row[f]);
  return row;
};

/** Transparent encryption of ConnectedIntegration tokens: encrypt on write, decrypt on read. */
export function withTokenEncryption(client: PrismaClient) {
  return client.$extends({
    query: {
      connectedIntegration: {
        async $allOperations({ operation, args, query }: any) {
          if (args) {
            if (operation === 'create' || operation === 'update' || operation === 'updateMany') encryptData(args.data);
            if (operation === 'createMany') [].concat(args.data).forEach(encryptData);
            if (operation === 'upsert') { encryptData(args.create); encryptData(args.update); }
          }
          const result = await query(args);
          return Array.isArray(result) ? result.map(decryptRow) : decryptRow(result);
        },
      },
    },
  });
}

@Injectable()
export class PrismaManagerService extends PrismaClient implements OnModuleInit {
  constructor() {
    super();
    // Returning the extended client makes every injection site get encryption without code changes.
    return withTokenEncryption(this) as unknown as this;
  }

  async onModuleInit() {
    await this.$connect();
  }
}
