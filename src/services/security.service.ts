import crypto from "crypto";

const VERSION = "v1";
const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

function getEncryptionKey(): Buffer {
  const secret =
    process.env.DEAL_CODE_ENCRYPTION_KEY || process.env.NEXTAUTH_SECRET;
  if (!secret) {
    throw new Error("DEAL_CODE_ENCRYPTION_KEY or NEXTAUTH_SECRET is required");
  }
  return crypto.createHash("sha256").update(secret).digest();
}

export const SecurityService = {
  encrypt(plaintext: string): string {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, getEncryptionKey(), iv, {
      authTagLength: AUTH_TAG_LENGTH,
    });
    const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
    const authTag = cipher.getAuthTag();
    return [VERSION, iv.toString("base64url"), authTag.toString("base64url"), encrypted.toString("base64url")].join(":");
  },

  decrypt(storedCode: string | null): string | null {
    if (!storedCode) return null;
    const parts = storedCode.split(":");
    if (parts.length !== 4 || parts[0] !== VERSION) return storedCode;
    const [, encodedIv, encodedAuthTag, encodedEncrypted] = parts;
    const decipher = crypto.createDecipheriv(
      ALGORITHM,
      getEncryptionKey(),
      Buffer.from(encodedIv, "base64url"),
      { authTagLength: AUTH_TAG_LENGTH },
    );
    decipher.setAuthTag(Buffer.from(encodedAuthTag, "base64url"));
    return Buffer.concat([
      decipher.update(Buffer.from(encodedEncrypted, "base64url")),
      decipher.final(),
    ]).toString("utf8");
  },

  generateVerificationCode(userId: number, taskId: number, salt: string = "default"): string {
    return `#v${crypto
      .createHash("sha256")
      .update(`${salt}:${userId}:${taskId}:${process.env.NEXTAUTH_SECRET}`)
      .digest("hex")
      .slice(0, 8)}`;
  },
};
