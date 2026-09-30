import { beforeEach, describe, expect, it, vi } from "vitest";
import { xchacha20poly1305 } from "@noble/ciphers/chacha.js";
import { randomBytes } from "@noble/ciphers/utils.js";
import { pbkdf2 } from "@noble/hashes/pbkdf2.js";
import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex, utf8ToBytes } from "@noble/hashes/utils.js";

const mocks = vi.hoisted(() => ({
  asyncData: new Map<string, string>(),
  secureData: new Map<string, string>(),
  secureWrites: [] as Array<{ key: string; value: string; options?: unknown }>,
  os: "android" as "android" | "web",
}));

vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: vi.fn(async (key: string) => mocks.asyncData.get(key) ?? null),
    setItem: vi.fn(async (key: string, value: string) => {
      mocks.asyncData.set(key, value);
    }),
    removeItem: vi.fn(async (key: string) => {
      mocks.asyncData.delete(key);
    }),
  },
}));

vi.mock("expo-secure-store", () => ({
  WHEN_UNLOCKED_THIS_DEVICE_ONLY: "when-unlocked-this-device-only",
  getItemAsync: vi.fn(async (key: string) => mocks.secureData.get(key) ?? null),
  setItemAsync: vi.fn(async (key: string, value: string, options?: unknown) => {
    mocks.secureWrites.push({ key, value, options });
    mocks.secureData.set(key, value);
  }),
}));

vi.mock("react-native", () => ({
  Platform: {
    get OS() {
      return mocks.os;
    },
  },
}));

const storageKey = "daftar-local-v1";
const secureKey = "daftar-data-key-v1";
const legacyState = JSON.stringify({
  profile: { name: "أستاذ", subject: "رياضيات", phone: "" },
  groups: [],
  students: [],
  sessions: [],
  payments: [],
  expenses: [],
  onboardingComplete: true,
});

async function loadStorage() {
  return import("../lib/secure-storage");
}

function makeLegacyPinEnvelope(raw: string, pin: string) {
  const salt = randomBytes(16);
  const nonce = randomBytes(24);
  const key = pbkdf2(sha256, utf8ToBytes(pin), salt, {
    c: 210_000,
    dkLen: 32,
  });
  const ciphertext = xchacha20poly1305(key, nonce).encrypt(utf8ToBytes(raw));
  return JSON.stringify({
    format: "DAFTAR-LOCAL-ENCRYPTED",
    version: 1,
    cipher: "XChaCha20-Poly1305",
    kdf: { name: "PBKDF2-SHA256", iterations: 210_000 },
    salt: bytesToHex(salt),
    nonce: bytesToHex(nonce),
    ciphertext: bytesToHex(ciphertext),
  });
}

beforeEach(() => {
  vi.resetModules();
  mocks.asyncData.clear();
  mocks.secureData.clear();
  mocks.secureWrites.length = 0;
  mocks.os = "android";
});

describe("device-protected local encryption", () => {
  it("migrates recognized plaintext app data into an authenticated device-key envelope", async () => {
    mocks.asyncData.set(storageKey, legacyState);
    const storage = await loadStorage();

    const result = await storage.unlockLocalStorage("258036");
    const encrypted = mocks.asyncData.get(storageKey) ?? "";
    const deviceKey = mocks.secureData.get(secureKey) ?? "";

    expect(result).toEqual({ raw: legacyState, migrated: true });
    expect(JSON.parse(encrypted).format).toBe("DAFTAR-LOCAL-DEVICE-ENCRYPTED");
    expect(encrypted).not.toContain("أستاذ");
    expect(deviceKey).toMatch(/^[0-9a-f]{64}$/);
    expect(mocks.secureWrites[0]?.options).toEqual({
      keychainAccessible: "when-unlocked-this-device-only",
    });
    await expect(storage.readEncryptedLocalStorage()).resolves.toBe(legacyState);
  });

  it("migrates the existing PIN-derived v1 format without data loss", async () => {
    const oldEnvelope = makeLegacyPinEnvelope(legacyState, "258036");
    mocks.asyncData.set(storageKey, oldEnvelope);
    const storage = await loadStorage();

    const result = await storage.unlockLocalStorage("258036");

    expect(result).toEqual({ raw: legacyState, migrated: true });
    expect(JSON.parse(mocks.asyncData.get(storageKey) ?? "{}").format).toBe(
      "DAFTAR-LOCAL-DEVICE-ENCRYPTED",
    );
    await expect(storage.readEncryptedLocalStorage()).resolves.toBe(legacyState);
  });

  it("does not overwrite legacy ciphertext when PIN authentication fails", async () => {
    const oldEnvelope = makeLegacyPinEnvelope(legacyState, "258036");
    mocks.asyncData.set(storageKey, oldEnvelope);
    const storage = await loadStorage();

    await expect(storage.unlockLocalStorage("111111")).rejects.toThrow();

    expect(mocks.asyncData.get(storageKey)).toBe(oldEnvelope);
    expect(mocks.secureData.has(secureKey)).toBe(false);
  });

  it("does not replace device ciphertext if its SecureStore key is missing", async () => {
    mocks.asyncData.set(storageKey, legacyState);
    const first = await loadStorage();
    await first.unlockLocalStorage("258036");
    const encrypted = mocks.asyncData.get(storageKey) ?? "";
    mocks.secureData.delete(secureKey);
    vi.resetModules();
    const second = await loadStorage();

    await expect(second.unlockLocalStorage("258036")).rejects.toThrow(
      "missing_device_data_key",
    );
    expect(mocks.asyncData.get(storageKey)).toBe(encrypted);
  });

  it("rejects tampered authenticated ciphertext and preserves the stored bytes", async () => {
    mocks.asyncData.set(storageKey, legacyState);
    const storage = await loadStorage();
    await storage.unlockLocalStorage("258036");
    const envelope = JSON.parse(mocks.asyncData.get(storageKey) ?? "{}") as {
      ciphertext: string;
    };
    envelope.ciphertext = `${envelope.ciphertext.slice(0, -2)}00`;
    const tampered = JSON.stringify(envelope);
    mocks.asyncData.set(storageKey, tampered);
    storage.clearLocalStorageSession();
    vi.resetModules();
    const reopened = await loadStorage();

    await expect(reopened.unlockLocalStorage("258036")).rejects.toThrow();
    expect(mocks.asyncData.get(storageKey)).toBe(tampered);
  });

  it("keeps the browser fallback encrypted and re-encrypts it when its PIN changes", async () => {
    mocks.os = "web";
    mocks.asyncData.set(storageKey, legacyState);
    const storage = await loadStorage();

    await storage.unlockLocalStorage("258036");
    expect(JSON.parse(mocks.asyncData.get(storageKey) ?? "{}").format).toBe(
      "DAFTAR-LOCAL-ENCRYPTED",
    );
    await storage.rekeyEncryptedLocalStorage("654321");
    storage.clearLocalStorageSession();

    const reopened = await loadStorage();
    await expect(reopened.unlockLocalStorage("654321")).resolves.toEqual({
      raw: legacyState,
      migrated: false,
    });
    await expect(reopened.unlockLocalStorage("258036")).rejects.toThrow();
  });
});
