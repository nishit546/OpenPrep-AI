/**
 * @fileoverview Web Crypto API Zero-Knowledge E2EE Encryption Utility
 * Provides 256-bit AES-GCM client-side encryption for E2EE chat messages,
 * ephemeral notes, and media vault files using PBKDF2 key derivation.
 */

// Helper: Convert ArrayBuffer to Base64
const arrayBufferToBase64 = (buffer) => {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
};

// Helper: Convert Base64 to ArrayBuffer
const base64ToArrayBuffer = (base64) => {
  const binaryString = window.atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
};

/**
 * Derive a 256-bit AES-GCM CryptoKey from a passphrase using PBKDF2
 * @param {string} passphrase 
 * @param {string} [saltStr='openprep-e2ee-salt'] 
 * @returns {Promise<CryptoKey>}
 */
export const deriveKeyFromPassphrase = async (passphrase, saltStr = 'openprep-e2ee-salt-v1') => {
  const enc = new TextEncoder();
  const passphraseBytes = enc.encode(passphrase);
  const saltBytes = enc.encode(saltStr);

  const baseKey = await window.crypto.subtle.importKey(
    'raw',
    passphraseBytes,
    'PBKDF2',
    false,
    ['deriveKey']
  );

  const derivedKey = await window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: saltBytes,
      iterations: 100000,
      hash: 'SHA-256',
    },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );

  return derivedKey;
};

/**
 * Encrypt UTF-8 plaintext string using AES-GCM 256
 * @param {CryptoKey} key 
 * @param {string} plaintext 
 * @returns {Promise<{ciphertext: string, iv: string}>}
 */
export const encryptText = async (key, plaintext) => {
  const enc = new TextEncoder();
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const encodedText = enc.encode(plaintext);

  const ciphertextBuffer = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encodedText
  );

  return {
    ciphertext: arrayBufferToBase64(ciphertextBuffer),
    iv: arrayBufferToBase64(iv),
  };
};

/**
 * Decrypt ciphertext string back to UTF-8 plaintext using AES-GCM 256
 * @param {CryptoKey} key 
 * @param {string} ciphertextBase64 
 * @param {string} ivBase64 
 * @returns {Promise<string>}
 */
export const decryptText = async (key, ciphertextBase64, ivBase64) => {
  try {
    const ciphertext = base64ToArrayBuffer(ciphertextBase64);
    const iv = base64ToArrayBuffer(ivBase64);

    const decryptedBuffer = await window.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: new Uint8Array(iv) },
      key,
      ciphertext
    );

    const dec = new TextDecoder();
    return dec.decode(decryptedBuffer);
  } catch (err) {
    console.error('E2EE Decryption Error:', err);
    return '[Decryption Failed: Key mismatch or tampered payload]';
  }
};

/**
 * Encrypt binary ArrayBuffer (image/media blob) using AES-GCM 256
 * @param {CryptoKey} key 
 * @param {ArrayBuffer} arrayBuffer 
 * @returns {Promise<{encryptedData: string, iv: string}>}
 */
export const encryptBuffer = async (key, arrayBuffer) => {
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const encryptedBuffer = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    arrayBuffer
  );

  return {
    encryptedData: arrayBufferToBase64(encryptedBuffer),
    iv: arrayBufferToBase64(iv),
  };
};

/**
 * Decrypt binary data back to Blob
 * @param {CryptoKey} key 
 * @param {string} encryptedDataBase64 
 * @param {string} ivBase64 
 * @param {string} mimeType 
 * @returns {Promise<Blob>}
 */
export const decryptBuffer = async (key, encryptedDataBase64, ivBase64, mimeType = 'application/octet-stream') => {
  const encryptedBuffer = base64ToArrayBuffer(encryptedDataBase64);
  const iv = base64ToArrayBuffer(ivBase64);

  const decryptedBuffer = await window.crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: new Uint8Array(iv) },
    key,
    encryptedBuffer
  );

  return new Blob([decryptedBuffer], { type: mimeType });
};
