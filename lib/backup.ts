import { xchacha20poly1305 } from "@noble/ciphers/chacha.js";
import { randomBytes } from "@noble/ciphers/utils.js";
import { pbkdf2 } from "@noble/hashes/pbkdf2.js";
import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex, hexToBytes, utf8ToBytes } from "@noble/hashes/utils.js";
import { BACKUP_SCHEMA_VERSION, isValidBackup, type AppState } from "./daftar-store";

const FORMAT = "DAFTAR-ENCRYPTED-BACKUP";
const APP_VERSION = "1.2.0";
const KDF_ITERATIONS = 210_000;

type BackupEnvelope = {
  format: typeof FORMAT;
  backupVersion: 2;
  schemaVersion: number;
  appVersion: string;
  createdAt: string;
  cipher: "XChaCha20-Poly1305";
  kdf: { name: "PBKDF2-SHA256"; iterations: number };
  salt: string;
  nonce: string;
  ciphertext: string;
};

function deriveKey(pin: string, salt: Uint8Array) {
  return pbkdf2(sha256, utf8ToBytes(pin), salt, { c: KDF_ITERATIONS, dkLen: 32 });
}

export function encryptBackup(data: AppState, pin: string) {
  const salt = randomBytes(16);
  const nonce = randomBytes(24);
  const key = deriveKey(pin, salt);
  const plaintext = utf8ToBytes(JSON.stringify(data));
  const ciphertext = xchacha20poly1305(key, nonce).encrypt(plaintext);
  const envelope: BackupEnvelope = {
    format: FORMAT,
    backupVersion: 2,
    schemaVersion: BACKUP_SCHEMA_VERSION,
    appVersion: APP_VERSION,
    createdAt: new Date().toISOString(),
    cipher: "XChaCha20-Poly1305",
    kdf: { name: "PBKDF2-SHA256", iterations: KDF_ITERATIONS },
    salt: bytesToHex(salt),
    nonce: bytesToHex(nonce),
    ciphertext: bytesToHex(ciphertext),
  };
  return JSON.stringify(envelope, null, 2);
}

export function decryptBackup(raw: string, pin: string): AppState {
  const envelope = JSON.parse(raw) as Partial<BackupEnvelope>;
  if (envelope.format !== FORMAT || envelope.backupVersion !== 2 || envelope.schemaVersion !== BACKUP_SCHEMA_VERSION || envelope.cipher !== "XChaCha20-Poly1305" || envelope.kdf?.name !== "PBKDF2-SHA256" || envelope.kdf.iterations !== KDF_ITERATIONS || typeof envelope.salt !== "string" || typeof envelope.nonce !== "string" || typeof envelope.ciphertext !== "string") {
    throw new Error("unsupported_backup");
  }
  const key = deriveKey(pin, hexToBytes(envelope.salt));
  const plaintext = xchacha20poly1305(key, hexToBytes(envelope.nonce)).decrypt(hexToBytes(envelope.ciphertext));
  const data = JSON.parse(new TextDecoder().decode(plaintext)) as unknown;
  if (!isValidBackup(data)) throw new Error("invalid_backup_data");
  return data;
}

export function isEncryptedBackup(raw: string) {
  try {
    const candidate = JSON.parse(raw) as Partial<BackupEnvelope>;
    return candidate.format === FORMAT;
  } catch {
    return false;
  }
}
