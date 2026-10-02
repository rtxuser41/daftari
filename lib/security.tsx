import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Crypto from "expo-crypto";
import * as LocalAuthentication from "expo-local-authentication";
import * as SecureStore from "expo-secure-store";
import { pbkdf2 } from "@noble/hashes/pbkdf2.js";
import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex, hexToBytes, utf8ToBytes } from "@noble/hashes/utils.js";
import { AppState, Platform } from "react-native";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  hasLocalStorageSession,
  rekeyEncryptedLocalStorage,
  unlockLocalStorage,
} from "./secure-storage";

const META_KEY = "daftar-security-v1";
const PIN_KEY = "daftar-pin-v1";
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 30_000;
const PBKDF2_ITERATIONS = 210_000;
export const REQUIRED_PIN_LENGTH = 6;

type SecurityMeta = {
  biometricEnabled: boolean;
  lockOnBackground: boolean;
};

type PinCredential =
  | { version: 3; salt: string; hash: string; iterations: number; pinLength: 6 }
  | { version: 2; salt: string; hash: string; iterations: number; pinLength?: number }
  | { version: 1; salt: string; hash: string };

type SecurityContextValue = {
  hydrated: boolean;
  locked: boolean;
  setupRequired: boolean;
  pinEnabled: boolean;
  biometricEnabled: boolean;
  lockOnBackground: boolean;
  pinNeedsUpgrade: boolean;
  hasBiometric: boolean;
  biometricLabel: string;
  failedAttempts: number;
  lockoutSeconds: number;
  setPin: (pin: string) => Promise<{ ok: boolean; message?: string }>;
  verifyPin: (pin: string) => Promise<{ ok: boolean; message?: string }>;
  unlockWithBiometric: () => Promise<{ ok: boolean; message?: string }>;
  lock: () => void;
  setBiometricEnabled: (enabled: boolean) => Promise<{ ok: boolean; message?: string }>;
  setLockOnBackground: (enabled: boolean) => Promise<void>;
};

const SecurityContext = createContext<SecurityContextValue | null>(null);

async function readSecure(key: string) {
  if (Platform.OS === "web") {
    return typeof localStorage === "undefined" ? null : localStorage.getItem(key);
  }
  return SecureStore.getItemAsync(key);
}

async function writeSecure(key: string, value: string) {
  if (Platform.OS === "web") {
    if (typeof localStorage !== "undefined") localStorage.setItem(key, value);
    return;
  }
  await SecureStore.setItemAsync(key, value, {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
}

function derivePin(pin: string, salt: Uint8Array, iterations = PBKDF2_ITERATIONS) {
  return bytesToHex(
    pbkdf2(sha256, utf8ToBytes(pin), salt, { c: iterations, dkLen: 32 }),
  );
}

function constantTimeEqual(left: string, right: string) {
  if (left.length !== right.length) return false;
  let result = 0;
  for (let index = 0; index < left.length; index += 1) {
    result |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return result === 0;
}

function pinIsValid(pin: string) {
  return new RegExp(`^\\d{${REQUIRED_PIN_LENGTH}}$`).test(pin);
}

function legacyPinIsValid(pin: string) {
  return /^\d{4,6}$/.test(pin);
}

function generateSalt() {
  return Crypto.getRandomValues
    ? Crypto.getRandomValues(new Uint8Array(16))
    : new Uint8Array(
        Array.from({ length: 16 }, () => Math.floor(Math.random() * 256)),
      );
}

export function SecurityProvider({ children }: { children: React.ReactNode }) {
  const [hydrated, setHydrated] = useState(false);
  const [locked, setLocked] = useState(true);
  const [setupRequired, setSetupRequired] = useState(false);
  const [pinEnabled, setPinEnabled] = useState(false);
  const [biometricEnabled, setBiometricEnabledState] = useState(false);
  const [lockOnBackground, setLockOnBackgroundState] = useState(true);
  const [pinNeedsUpgrade, setPinNeedsUpgrade] = useState(false);
  const [hasBiometric, setHasBiometric] = useState(false);
  const [biometricLabel, setBiometricLabel] = useState("البصمة أو Face ID");
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockoutUntil, setLockoutUntil] = useState<number | null>(null);
  const backgroundedAt = useRef<number | null>(null);

  const persistMeta = useCallback(async (next: SecurityMeta) => {
    await AsyncStorage.setItem(META_KEY, JSON.stringify(next));
  }, []);

  useEffect(() => {
    let mounted = true;
    void (async () => {
      const [rawMeta, credential] = await Promise.all([
        AsyncStorage.getItem(META_KEY),
        readSecure(PIN_KEY),
      ]);
      let meta: Partial<SecurityMeta> = {};
      try {
        meta = rawMeta ? (JSON.parse(rawMeta) as Partial<SecurityMeta>) : {};
      } catch {
        meta = {};
      }

      let biometricAvailable = false;
      let label = "البصمة أو Face ID";
      if (Platform.OS !== "web") {
        try {
          const hardware = await LocalAuthentication.hasHardwareAsync();
          const enrolled = hardware && (await LocalAuthentication.isEnrolledAsync());
          biometricAvailable = Boolean(hardware && enrolled);
          if (biometricAvailable) {
            const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
            if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
              label = "Face ID / التعرف على الوجه";
            } else if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
              label = "البصمة";
            }
          }
        } catch {
          biometricAvailable = false;
        }
      }

      if (!mounted) return;
      setHasBiometric(biometricAvailable);
      setBiometricLabel(label);
      setBiometricEnabledState(Boolean(meta.biometricEnabled && biometricAvailable));
      setLockOnBackgroundState(meta.lockOnBackground ?? true);
      setPinEnabled(Boolean(credential));
      setSetupRequired(!credential);
      if (credential) {
        try {
          const parsed = JSON.parse(credential) as Partial<PinCredential>;
          setPinNeedsUpgrade(
            parsed.version !== 3 || parsed.pinLength !== REQUIRED_PIN_LENGTH,
          );
        } catch {
          setPinNeedsUpgrade(true);
        }
      }
      setLocked(true);
      setHydrated(true);
    })().catch(() => {
      if (!mounted) return;
      setSetupRequired(true);
      setPinEnabled(false);
      setLocked(true);
      setHydrated(true);
    });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!hydrated || !pinEnabled || !lockOnBackground) return;
    const subscription = AppState.addEventListener("change", (nextState) => {
      if (nextState === "background" || nextState === "inactive") {
        backgroundedAt.current = Date.now();
      }
      if (nextState === "active" && backgroundedAt.current) {
        if (Date.now() - backgroundedAt.current >= 1000) setLocked(true);
        backgroundedAt.current = null;
      }
    });
    return () => subscription.remove();
  }, [hydrated, lockOnBackground, pinEnabled]);

  useEffect(() => {
    if (!lockoutUntil) return;
    const timer = setInterval(() => {
      if (Date.now() >= lockoutUntil) {
        setLockoutUntil(null);
        setFailedAttempts(0);
      }
    }, 500);
    return () => clearInterval(timer);
  }, [lockoutUntil]);

  const setPin = useCallback(
    async (pin: string) => {
      if (!pinIsValid(pin)) {
        return { ok: false, message: "استخدم رمز PIN من 6 أرقام بالضبط." };
      }
      try {
        if (pinEnabled) {
          await rekeyEncryptedLocalStorage(pin);
        } else {
          await unlockLocalStorage(pin);
        }
        const salt = generateSalt();
        const hash = derivePin(pin, salt);
        await writeSecure(
          PIN_KEY,
          JSON.stringify({
            version: 3,
            salt: bytesToHex(salt),
            hash,
            iterations: PBKDF2_ITERATIONS,
            pinLength: REQUIRED_PIN_LENGTH,
          } satisfies PinCredential),
        );
        setPinEnabled(true);
        setSetupRequired(false);
        setPinNeedsUpgrade(false);
        setLocked(false);
        setFailedAttempts(0);
        return { ok: true };
      } catch {
        return {
          ok: false,
          message: "تعذر تأمين البيانات برمز PIN. لم يتم تغيير إعداد الحماية.",
        };
      }
    },
    [pinEnabled],
  );

  const verifyPin = useCallback(
    async (pin: string) => {
      try {
        if (lockoutUntil && Date.now() < lockoutUntil) {
          return {
            ok: false,
            message: `حاول بعد ${Math.ceil((lockoutUntil - Date.now()) / 1000)} ثانية.`,
          };
        }
        const raw = await readSecure(PIN_KEY);
        if (!raw) return { ok: false, message: "لم يتم إعداد رمز PIN بعد." };
        let credential: PinCredential;
        try {
          credential = JSON.parse(raw) as PinCredential;
        } catch {
          return { ok: false, message: "تعذر قراءة إعداد الحماية." };
        }
        const currentFormat =
          credential.version === 3 ||
          (credential.version === 2 && credential.pinLength === REQUIRED_PIN_LENGTH);
        if (currentFormat ? !pinIsValid(pin) : !legacyPinIsValid(pin)) {
          return {
            ok: false,
            message: currentFormat
              ? "أدخل رمز PIN من 6 أرقام بالضبط."
              : "أدخل رمز PIN القديم من 4 إلى 6 أرقام.",
          };
        }
        const candidate =
          credential.version === 2 || credential.version === 3
            ? derivePin(pin, hexToBytes(credential.salt), credential.iterations)
            : await Crypto.digestStringAsync(
                Crypto.CryptoDigestAlgorithm.SHA256,
                `${credential.salt}:${pin}`,
              );
        if (!constantTimeEqual(candidate, credential.hash)) {
          const nextAttempts = failedAttempts + 1;
          setFailedAttempts(nextAttempts);
          if (nextAttempts >= MAX_ATTEMPTS) {
            setLockoutUntil(Date.now() + LOCKOUT_MS);
            return { ok: false, message: "محاولات كثيرة. تم إيقاف المحاولة مؤقتًا." };
          }
          return {
            ok: false,
            message: `رمز PIN غير صحيح. بقيت ${MAX_ATTEMPTS - nextAttempts} محاولات.`,
          };
        }

        try {
          await unlockLocalStorage(pin);
        } catch {
          return {
            ok: false,
            message: "تعذر فتح البيانات بهذا الرمز. تحقق من النسخة الاحتياطية قبل المتابعة.",
          };
        }

        try {
          if (credential.version === 1) {
            const salt = generateSalt();
            const migrated = {
              salt: bytesToHex(salt),
              hash: derivePin(pin, salt),
              iterations: PBKDF2_ITERATIONS,
            };
            await writeSecure(
              PIN_KEY,
              JSON.stringify(
                pin.length === REQUIRED_PIN_LENGTH
                  ? { version: 3, ...migrated, pinLength: REQUIRED_PIN_LENGTH }
                  : { version: 2, ...migrated, pinLength: pin.length },
              ),
            );
          } else if (credential.version === 2 && pin.length === REQUIRED_PIN_LENGTH) {
            await writeSecure(
              PIN_KEY,
              JSON.stringify({
                ...credential,
                version: 3,
                pinLength: REQUIRED_PIN_LENGTH,
              } satisfies PinCredential),
            );
          }
        } catch {
          // A valid credential and decrypted data still form a safe current session.
        }

        setPinNeedsUpgrade(pin.length !== REQUIRED_PIN_LENGTH);
        setFailedAttempts(0);
        setLocked(false);
        return { ok: true };
      } catch {
        return { ok: false, message: "تعذر التحقق من رمز PIN. حاول مرة أخرى." };
      }
    },
    [failedAttempts, lockoutUntil],
  );

  const unlockWithBiometric = useCallback(async () => {
    if (Platform.OS === "web" || !hasBiometric) {
      return { ok: false, message: "البصمة غير متاحة على هذا الجهاز. استخدم PIN." };
    }
    if (!hasLocalStorageSession()) {
      return {
        ok: false,
        message: "أدخل رمز PIN مرة واحدة بعد تشغيل التطبيق، ثم يمكن استخدام البصمة أثناء الجلسة.",
      };
    }
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: "فتح DAFTAR",
        cancelLabel: "إلغاء",
        disableDeviceFallback: false,
      });
      if (result.success) {
        setLocked(false);
        setFailedAttempts(0);
        return { ok: true };
      }
      return {
        ok: false,
        message: result.error === "user_cancel" ? "" : "تعذر التحقق بالبصمة.",
      };
    } catch {
      return { ok: false, message: "تعذر تشغيل التحقق الحيوي. استخدم PIN." };
    }
  }, [hasBiometric]);

  const lock = useCallback(() => {
    if (pinEnabled) setLocked(true);
  }, [pinEnabled]);

  const setBiometricEnabled = useCallback(
    async (enabled: boolean) => {
      if (enabled && !hasBiometric) {
        return { ok: false, message: "لا توجد بصمة مسجلة أو أن الجهاز لا يدعمها." };
      }
      setBiometricEnabledState(enabled);
      await persistMeta({ biometricEnabled: enabled, lockOnBackground });
      return { ok: true };
    },
    [hasBiometric, lockOnBackground, persistMeta],
  );

  const setLockOnBackground = useCallback(
    async (enabled: boolean) => {
      setLockOnBackgroundState(enabled);
      await persistMeta({ biometricEnabled, lockOnBackground: enabled });
    },
    [biometricEnabled, persistMeta],
  );

  const value = useMemo(
    () => ({
      hydrated,
      locked,
      setupRequired,
      pinEnabled,
      biometricEnabled,
      lockOnBackground,
      pinNeedsUpgrade,
      hasBiometric,
      biometricLabel,
      failedAttempts,
      lockoutSeconds: lockoutUntil
        ? Math.max(0, Math.ceil((lockoutUntil - Date.now()) / 1000))
        : 0,
      setPin,
      verifyPin,
      unlockWithBiometric,
      lock,
      setBiometricEnabled,
      setLockOnBackground,
    }),
    [
      hydrated,
      locked,
      setupRequired,
      pinEnabled,
      biometricEnabled,
      lockOnBackground,
      pinNeedsUpgrade,
      hasBiometric,
      biometricLabel,
      failedAttempts,
      lockoutUntil,
      setPin,
      verifyPin,
      unlockWithBiometric,
      lock,
      setBiometricEnabled,
      setLockOnBackground,
    ],
  );

  return <SecurityContext.Provider value={value}>{children}</SecurityContext.Provider>;
}

export function useSecurity() {
  const value = useContext(SecurityContext);
  if (!value) throw new Error("useSecurity must be used within SecurityProvider");
  return value;
}
