/**
 * GovGuide PH — AES-GCM 256-bit Local Vault Encryption
 * Compliant with RA 10173 (Data Privacy Act of 2012)
 *
 * Uses the Web Cryptography API (SubtleCrypto) native to Chrome:
 * - PBKDF2 key derivation with SHA-256 (100,000 iterations)
 * - AES-GCM authenticated encryption with 12-byte initialization vector (IV)
 */

const DEFAULT_SALT_KEY = 'govguide_device_salt_v1';
const ITERATIONS = 100000;

async function getOrCreateDeviceSalt(): Promise<Uint8Array> {
  return new Promise((resolve) => {
    chrome.storage.local.get([DEFAULT_SALT_KEY], (res) => {
      if (res[DEFAULT_SALT_KEY]) {
        const raw = res[DEFAULT_SALT_KEY] as number[];
        const saltArray = new Uint8Array(raw);
        resolve(saltArray);
      } else {
        const freshSalt = crypto.getRandomValues(new Uint8Array(16));
        chrome.storage.local.set(
          { [DEFAULT_SALT_KEY]: Array.from(freshSalt) },
          () => resolve(freshSalt)
        );
      }
    });
  });
}

async function deriveKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(passphrase),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt as unknown as BufferSource,
      iterations: ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function encryptVault(data: unknown, customPin?: string): Promise<string> {
  const salt = await getOrCreateDeviceSalt();
  const keySecret = customPin ? `govguide_pin_${customPin}` : 'govguide_local_device_vault_2026';
  const cryptoKey = await deriveKey(keySecret, salt);

  const iv = crypto.getRandomValues(new Uint8Array(12));
  const enc = new TextEncoder();
  const encodedData = enc.encode(JSON.stringify(data));

  const cipherBuffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    cryptoKey,
    encodedData
  );

  const payload = {
    iv: Array.from(iv),
    cipher: Array.from(new Uint8Array(cipherBuffer)),
    isPinProtected: Boolean(customPin),
  };

  return btoa(JSON.stringify(payload));
}

export async function decryptVault<T>(encryptedBase64: string, customPin?: string): Promise<T> {
  try {
    const salt = await getOrCreateDeviceSalt();
    const parsed = JSON.parse(atob(encryptedBase64));
    const iv = new Uint8Array(parsed.iv);
    const cipher = new Uint8Array(parsed.cipher);

    const keySecret = customPin ? `govguide_pin_${customPin}` : 'govguide_local_device_vault_2026';
    const cryptoKey = await deriveKey(keySecret, salt);

    const decryptedBuffer = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      cryptoKey,
      cipher
    );

    const dec = new TextDecoder();
    return JSON.parse(dec.decode(decryptedBuffer)) as T;
  } catch (err) {
    throw new Error('Vault decryption failed. Invalid PIN or corrupted data.');
  }
}
