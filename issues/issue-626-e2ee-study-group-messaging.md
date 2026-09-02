---
title: '[FEAT]: End-to-End Encrypted (E2EE) Group Study Chat with Ephemeral Notes & Media Vault'
labels: 'security, backend, frontend, high-priority, ECSoC26, ECSoC26-L3'
assignees: ''
---

## Summary & Motivation
Study groups often share proprietary mock questions, teacher notes, exam answer drafts, and personal academic progress data. To ensure strict student privacy and institutional compliance, communications within private study groups must be protected with cryptographically verifiable End-to-End Encryption (E2EE).

This feature introduces **Zero-Knowledge End-to-End Encrypted (E2EE) Study Squad Messaging** utilizing the Web Crypto API, client-side AES-GCM-256 session keys, and elliptic curve key exchange (ECDH).

---

## Technical Scope & Architecture

### Cryptographic Protocol & Architecture
1. **Client-Side Key Management (`frontend/src/services/cryptoService.js`)**:
   - Generates ECDH (P-256 curve) keypairs upon student account creation; private keys stored in non-extractable IndexedDB via Web Crypto API.
   - Derives shared secrets using Elliptic Curve Diffie-Hellman (ECDH) and HKDF.
   - Symmetric message payload encryption using AES-GCM-256 with unique 96-bit initialization vectors (IV) per message.
2. **Encrypted Attachment & Media Vault (`frontend/src/services/mediaVaultService.js`)**:
   - Encrypts uploaded images, PDFs, and voice clips client-side before uploading ciphertext blobs to S3/storage buckets.
3. **Zero-Knowledge Backend Relay (`backend/controllers/e2eeChatController.js`)**:
   - Backend only stores encrypted ciphertext, salt, IV, and sender signature; server never possesses decryption keys.

---

## Acceptance Criteria
- [ ] Group messages, study notes, and file attachments are encrypted client-side before transmission.
- [ ] Server operates on zero-knowledge architecture and cannot read message payloads.
- [ ] Seamless multi-device session sync with secure key backup passphrase.
- [ ] Unit tests verify encryption integrity, ciphertext uniqueness, and decryption authenticity.
