import AsyncStorage from "@react-native-async-storage/async-storage";
import { xchacha20poly1305 } from "@noble/ciphers/chacha.js";
import { randomBytes } from "@noble/ciphers/utils.js";
import { pbkdf2 } from "@noble/hashes/pbkdf2.js";
import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex, hexToBytes, utf8ToBytes } from "@noble/hashes/utils.js";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

export const LOCAL_STORAGE_KEY = "daftar-local-v1";
const DEVICE_KEY_KEY = "daftar-data-key-v1";
const LEGACY_FORMAT = "DAFTAR-LOCAL-ENCRYPTED";
const LEGACY_VERSION = 1;
const DEVICE_FORMAT = "DAFTAR-LOCAL-DEVICE-ENCRYPTED";
const DEVICE_VERSION = 2;
const KDF_ITERATIONS = 210_000;

type LegacyLocalEnvelope = {
  format: typeof LEGACY_FORMAT;
  version: typeof LEGACY_VERSION;
  cipher: "XChaCha20-Poly1305";
  kdf: { name: "PBKDF2-SHA256"; iterations: number };
  salt: string;
  nonce: string;
  ciphertext: string;
};

type DeviceLocalEnvelope = {
  format: typeof DEVICE_FORMAT;
  version: typeof DEVICE_VERSION;
  cipher: "XChaCha20-Poly1305";
  keyStorage: "expo-secure-store";
  nonce: string;
  ciphertext: string;
};

type LocalSession =
  | { mode: "device"; key: Uint8Array }
  | { mode: "pin"; key: Uint8Array; salt: Uint8Array };

let session: LocalSession | null = null;
let writeQueue: Promise<void> = Promise.resolve();
let deviceKeyCreation: Promise<Uint8Array> | null = null;

function deriveKey(pin: string, salt: Uint8Array) {
  return pbkdf2(sha256, utf8ToBytes(pin), salt, {
    c: KDF_ITERATIONS,
    dkLen: 32,
  });
}

function isHex(value: unknown, bytes?: number): value is string {
  return (
    typeof value === "string" &&
    value.length % 2 === 0 &&
    (bytes === undefined || value.length === bytes * 2) &&
    /^[0-9a-f]*$/i.test(value)
  );
}

function parseLegacyEnvelope(raw: string | null): LegacyLocalEnvelope | null {
  if (!raw) return null;
  try {
    const candidate = JSON.parse(raw) as Partial<LegacyLocalEnvelope>;
    if (
      candidate.format !== LEGACY_FORMAT ||
      candidate.version !== LEGACY_VERSION ||
      candidate.cipher !== "XChaCha20-Poly1305" ||
      candidate.kdf?.name !== "PBKDF2-SHA256" ||
      candidate.kdf.iterations !== KDF_ITERATIONS ||
      !isHex(candidate.salt, 16) ||
      !isHex(candidate.nonce, 24) ||
      !isHex(candidate.ciphertext) ||
      candidate.ciphertext.length < 32
    ) {
      return null;
    }
    return candidate as LegacyLocalEnvelope;
  } catch {
    return null;
  }
}

function parseDeviceEnvelope(raw: string | null): DeviceLocalEnvelope | null {
  if (!raw) return null;
  try {
    const candidate = JSON.parse(raw) as Partial<DeviceLocalEnvelope>;
    if (
      candidate.format !== DEVICE_FORMAT ||
      candidate.version !== DEVICE_VERSION ||
      candidate.cipher !== "XChaCha20-Poly1305" ||
      candidate.keyStorage !== "expo-secure-store" ||
      !isHex(candidate.nonce, 24) ||
      !isHex(candidate.ciphertext) ||
      candidate.ciphertext.length < 32
    ) {
      return null;
    }
    return candidate as DeviceLocalEnvelope;
  } catch {
    return null;
  }
}

function isKnownEncryptedEnvelope(raw: string) {
  try {
    const candidate = JSON.parse(raw) as {
      format?: unknown;
      cipher?: unknown;
      kdf?: { name?: unknown };
    };
    return (
      candidate.format === LEGACY_FORMAT ||
      candidate.format === DEVICE_FORMAT ||
      candidate.cipher === "XChaCha20-Poly1305" ||
      candidate.kdf?.name === "PBKDF2-SHA256"
    );
  } catch {
    return raw.includes(LEGACY_FORMAT) || raw.includes(DEVICE_FORMAT);
  }
}

function isLegacyAppState(raw: string) {
  try {
    const value = JSON.parse(raw) as unknown;
    if (!value || typeof value !== "object" || Array.isArray(value)) return false;
    const state = value as Record<string, unknown>;
    return [
      "profile",
      "groups",
      "students",
      "sessions",
      "payments",
      "expenses",
      "onboardingComplete",
    ].some((key) => Object.prototype.hasOwnProperty.call(state, key));
  } catch {
    return false;
  }
}

function decryptLegacyEnvelope(envelope: LegacyLocalEnvelope, key: Uint8Array) {
  const plaintext = xchacha20poly1305(key, hexToBytes(envelope.nonce)).decrypt(
    hexToBytes(envelope.ciphertext),
  );
  return new TextDecoder().decode(plaintext);
}

function encryptLegacyPayload(raw: string, activeSession: Extract<LocalSession, { mode: "pin" }>) {
  const nonce = randomBytes(24);
  const ciphertext = xchacha20poly1305(activeSession.key, nonce).encrypt(
    utf8ToBytes(raw),
  );
  const envelope: LegacyLocalEnvelope = {
    format: LEGACY_FORMAT,
    version: LEGACY_VERSION,
    cipher: "XChaCha20-Poly1305",
    kdf: { name: "PBKDF2-SHA256", iterations: KDF_ITERATIONS },
    salt: bytesToHex(activeSession.salt),
    nonce: bytesToHex(nonce),
    ciphertext: bytesToHex(ciphertext),
  };
  return JSON.stringify(envelope);
}

function encryptDevicePayload(raw: string, key: Uint8Array) {
  const nonce = randomBytes(24);
  const ciphertext = xchacha20poly1305(key, nonce).encrypt(utf8ToBytes(raw));
  const envelope: DeviceLocalEnvelope = {
    format: DEVICE_FORMAT,
    version: DEVICE_VERSION,
    cipher: "XChaCha20-Poly1305",
    keyStorage: "expo-secure-store",
    nonce: bytesToHex(nonce),
    ciphertext: bytesToHex(ciphertext),
  };
  return JSON.stringify(envelope);
}

function decryptDeviceEnvelope(envelope: DeviceLocalEnvelope, key: Uint8Array) {
  const plaintext = xchacha20poly1305(key, hexToBytes(envelope.nonce)).decrypt(
    hexToBytes(envelope.ciphertext),
  );
  return new TextDecoder().decode(plaintext);
}

async function readDeviceKey() {
  const raw = await SecureStore.getItemAsync(DEVICE_KEY_KEY);
  if (raw === null) return null;
  if (!isHex(raw, 32)) throw new Error("invalid_device_data_key");
  return hexToBytes(raw);
}

async function getOrCreateDeviceKey() {
  const existing = await readDeviceKey();
  if (existing) return existing;
  if (!deviceKeyCreation) {
    deviceKeyCreation = (async () => {
      const key = randomBytes(32);
      await SecureStore.setItemAsync(DEVICE_KEY_KEY, bytesToHex(key), {
        keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      });
      const saved = await readDeviceKey();
      if (!saved) throw new Error("device_data_key_not_saved");
      return saved;
    })();
  }
  try {
    return await deviceKeyCreation;
  } finally {
    deviceKeyCreation = null;
  }
}

function enqueue(operation: () => Promise<void>) {
  const next = writeQueue.then(operation, operation);
  writeQueue = next.catch(() => undefined);
  return next;
}

export function hasLocalStorageSession() {
  return session !== null;
}

export function clearLocalStorageSession() {
  session = null;
}

export function isEncryptedLocalPayload(raw: string) {
  return parseLegacyEnvelope(raw) !== null || parseDeviceEnvelope(raw) !== null;
}

/**
 * Opens local storage only after the security gate accepts the PIN. On native,
 * the database key is random and held by OS-backed SecureStore/Keystore. Older
 * PIN-derived envelopes and recognized plaintext app state are migrated without
 * replacing the source until authenticated decryption/validation has succeeded.
 * Web has no OS keystore, so it retains the legacy PIN-derived envelope format.
 */
export async function unlockLocalStorage(pin: string) {
  const raw = await AsyncStorage.getItem(LOCAL_STORAGE_KEY);

  if (Platform.OS === "web") {
    const legacy = parseLegacyEnvelope(raw);
    if (legacy) {
      const salt = hexToBytes(legacy.salt);
      const key = deriveKey(pin, salt);
      const plaintext = decryptLegacyEnvelope(legacy, key);
      session = { mode: "pin", key, salt };
      return { raw: plaintext, migrated: false };
    }
    if (raw !== null && (isKnownEncryptedEnvelope(raw) || !isLegacyAppState(raw))) {
      throw new Error("invalid_or_unsupported_local_state");
    }
    const salt = randomBytes(16);
    const key = deriveKey(pin, salt);
    const nextSession: Extract<LocalSession, { mode: "pin" }> = {
      mode: "pin",
      key,
      salt,
    };
    session = nextSession;
    if (raw !== null) {
      await enqueue(async () => {
        await AsyncStorage.setItem(LOCAL_STORAGE_KEY, encryptLegacyPayload(raw, nextSession));
      });
    }
    return { raw, migrated: raw !== null };
  }

  const deviceEnvelope = parseDeviceEnvelope(raw);
  if (deviceEnvelope) {
    const key = await readDeviceKey();
    if (!key) throw new Error("missing_device_data_key");
    const plaintext = decryptDeviceEnvelope(deviceEnvelope, key);
    session = { mode: "device", key };
    return { raw: plaintext, migrated: false };
  }

  if (raw !== null && isKnownEncryptedEnvelope(raw)) {
    const legacy = parseLegacyEnvelope(raw);
    if (!legacy) throw new Error("invalid_or_unsupported_local_state");
    const oldKey = deriveKey(pin, hexToBytes(legacy.salt));
    const plaintext = decryptLegacyEnvelope(legacy, oldKey);
    if (!isLegacyAppState(plaintext)) throw new Error("invalid_legacy_local_state");

    const key = await getOrCreateDeviceKey();
    await enqueue(async () => {
      await AsyncStorage.setItem(LOCAL_STORAGE_KEY, encryptDevicePayload(plaintext, key));
    });
    session = { mode: "device", key };
    return { raw: plaintext, migrated: true };
  }

  if (raw !== null && !isLegacyAppState(raw)) {
    throw new Error("invalid_or_unsupported_local_state");
  }
  const key = await getOrCreateDeviceKey();
  if (raw !== null) {
    await enqueue(async () => {
      await AsyncStorage.setItem(LOCAL_STORAGE_KEY, encryptDevicePayload(raw, key));
    });
  }
  session = { mode: "device", key };
  return { raw, migrated: raw !== null };
}

export async function readEncryptedLocalStorage() {
  if (!session) throw new Error("missing_storage_session");
  await writeQueue;
  const raw = await AsyncStorage.getItem(LOCAL_STORAGE_KEY);
  if (raw === null) return null;
  if (session.mode === "device") {
    const envelope = parseDeviceEnvelope(raw);
    if (!envelope) throw new Error("unencrypted_or_unsupported_local_state");
    return decryptDeviceEnvelope(envelope, session.key);
  }
  const envelope = parseLegacyEnvelope(raw);
  if (!envelope) throw new Error("unencrypted_or_unsupported_local_state");
  return decryptLegacyEnvelope(envelope, session.key);
}

export async function writeEncryptedLocalStorage(raw: string) {
  const activeSession = session;
  if (!activeSession) throw new Error("missing_storage_session");
  await enqueue(async () => {
    if (activeSession.mode === "device") {
      await AsyncStorage.setItem(
        LOCAL_STORAGE_KEY,
        encryptDevicePayload(raw, activeSession.key),
      );
    } else {
      await AsyncStorage.setItem(
        LOCAL_STORAGE_KEY,
        encryptLegacyPayload(raw, activeSession),
      );
    }
  });
}

/**
 * A native app PIN is a local access gate; changing it must not rotate the
 * device-bound data key. On web, where SecureStore is unavailable, the legacy
 * PIN-derived key must be re-derived and the local envelope re-encrypted.
 */
export async function rekeyEncryptedLocalStorage(nextPin: string) {
  if (Platform.OS !== "web") {
    if (!session) await unlockLocalStorage(nextPin);
    if (!session) throw new Error("missing_storage_session");
    return;
  }

  const current = session;
  if (!current || current.mode !== "pin") throw new Error("missing_storage_session");
  await writeQueue;
  const raw = await AsyncStorage.getItem(LOCAL_STORAGE_KEY);
  let plaintext: string | null = null;
  if (raw !== null) {
    const envelope = parseLegacyEnvelope(raw);
    if (!envelope) throw new Error("unencrypted_or_unsupported_local_state");
    plaintext = decryptLegacyEnvelope(envelope, current.key);
  }

  const salt = randomBytes(16);
  const nextSession: Extract<LocalSession, { mode: "pin" }> = {
    mode: "pin",
    key: deriveKey(nextPin, salt),
    salt,
  };
  if (plaintext !== null) {
    await enqueue(async () => {
      await AsyncStorage.setItem(
        LOCAL_STORAGE_KEY,
        encryptLegacyPayload(plaintext as string, nextSession),
      );
    });
  }
  session = nextSession;
}
