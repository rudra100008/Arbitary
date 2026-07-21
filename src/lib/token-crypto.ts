import crypto from 'crypto';

const VERSION = 'v1';
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

type TokenPurpose = 'google' | 'facebook';

function getGoogleKey(): Buffer {
  const secret = process.env.TOKEN_ENCRYPTION_KEY || process.env.NEXTAUTH_SECRET;
  if (!secret) throw new Error('TOKEN_ENCRYPTION_KEY or NEXTAUTH_SECRET is required for Google token encryption');
  return crypto.createHash('sha256').update(secret).digest();
}

function getFacebookKey(): Buffer {
  const fbKey = process.env.FACEBOOK_TOKEN_ENCRYPTION_KEY;
  if (!fbKey) throw new Error('FACEBOOK_TOKEN_ENCRYPTION_KEY is required for Facebook token encryption');
  const decoded = Buffer.from(fbKey, 'base64');
  if (decoded.length !== 32) {
    throw new Error(
      'FACEBOOK_TOKEN_ENCRYPTION_KEY must be a base64-encoded 32-byte key. ' +
      `Received ${decoded.length} bytes after decoding.`
    );
  }
  return decoded;
}

function getKey(purpose: TokenPurpose): Buffer {
  return purpose === 'facebook' ? getFacebookKey() : getGoogleKey();
}

export function encryptToken(token: string, purpose: TokenPurpose = 'google'): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(purpose), iv, { authTagLength: AUTH_TAG_LENGTH });
  const encrypted = Buffer.concat([cipher.update(token, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [VERSION, iv.toString('base64url'), authTag.toString('base64url'), encrypted.toString('base64url')].join(':');
}

export function decryptToken(stored: string | null, purpose: TokenPurpose = 'google'): string | null {
  if (!stored) return null;
  const parts = stored.split(':');
  if (parts.length !== 4 || parts[0] !== VERSION) return stored;
  const [, encodedIv, encodedAuthTag, encodedEncrypted] = parts;
  const decipher = crypto.createDecipheriv(ALGORITHM, getKey(purpose), Buffer.from(encodedIv, 'base64url'), { authTagLength: AUTH_TAG_LENGTH });
  decipher.setAuthTag(Buffer.from(encodedAuthTag, 'base64url'));
  return Buffer.concat([decipher.update(Buffer.from(encodedEncrypted, 'base64url')), decipher.final()]).toString('utf8');
}
