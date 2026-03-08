import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

@Injectable()
export class EncryptionService {
  private readonly key: Buffer;

  constructor(private readonly configService: ConfigService) {
    const tokenKey = this.configService.get<string>('encryption.tokenKey');

    if (!tokenKey || !/^[0-9a-fA-F]{64}$/.test(tokenKey)) {
      throw new Error(
        'TOKEN_ENCRYPTION_KEY must be set to exactly 64 hex characters (32 bytes)',
      );
    }

    this.key = Buffer.from(tokenKey, 'hex');
  }

  encrypt(value: string | null | undefined): string | null {
    if (value == null) return null;

    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, this.key, iv, {
      authTagLength: AUTH_TAG_LENGTH,
    });

    const encrypted = Buffer.concat([
      cipher.update(value, 'utf8'),
      cipher.final(),
    ]);
    const authTag = cipher.getAuthTag();

    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
  }

  decrypt(value: string | null | undefined): string | null {
    if (value == null) return null;

    const parts = value.split(':');
    if (
      parts.length !== 3 ||
      !isHex(parts[0]) ||
      !isHex(parts[1]) ||
      !isHex(parts[2])
    ) {
      // Plaintext fallback for pre-existing unencrypted rows
      return value;
    }

    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const ciphertext = Buffer.from(parts[2], 'hex');

    const decipher = crypto.createDecipheriv(ALGORITHM, this.key, iv, {
      authTagLength: AUTH_TAG_LENGTH,
    });
    decipher.setAuthTag(authTag);

    return decipher.update(ciphertext).toString('utf8') + decipher.final('utf8');
  }
}

function isHex(s: string): boolean {
  return s.length > 0 && /^[0-9a-fA-F]+$/.test(s);
}
