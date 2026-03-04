// Shared cryptographic utilities for the Document Fingerprint API
// Implements PBKDF2 key hashing and HMAC-SHA256 signature verification

/**
 * Hash an API key using PBKDF2 with the given salt.
 * Uses 600,000 iterations per OWASP 2024 recommendation.
 */
export async function hashApiKey(
  apiKey: string,
  salt: Uint8Array,
  iterations = 600_000
): Promise<string> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(apiKey),
    "PBKDF2",
    false,
    ["deriveBits"]
  );

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt,
      iterations,
      hash: "SHA-256",
    },
    keyMaterial,
    256 // 32 bytes
  );

  return bufferToHex(new Uint8Array(derivedBits));
}

/**
 * Verify an API key against a stored hash using constant-time comparison.
 */
export async function verifyApiKey(
  providedKey: string,
  storedHash: string,
  storedSalt: string,
  iterations = 600_000
): Promise<boolean> {
  const salt = hexToBuffer(storedSalt);
  const computedHash = await hashApiKey(providedKey, salt, iterations);
  return constantTimeEqual(computedHash, storedHash);
}

/**
 * Generate an HMAC-SHA256 signature for request signing.
 * Message format: timestamp\nmethod\npath\nbody
 */
export async function generateHmacSignature(
  apiKey: string,
  message: string
): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(apiKey),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(message)
  );

  return btoa(String.fromCharCode(...new Uint8Array(signature)));
}

/**
 * Verify an HMAC-SHA256 signature.
 */
export async function verifyHmacSignature(
  apiKey: string,
  message: string,
  providedSignature: string
): Promise<boolean> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(apiKey),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"]
  );

  const sigBytes = Uint8Array.from(atob(providedSignature), (c) =>
    c.charCodeAt(0)
  );

  return crypto.subtle.verify("HMAC", key, sigBytes, encoder.encode(message));
}

/**
 * Generate a SHA-256 hash of the given input string.
 */
export async function sha256(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const hash = await crypto.subtle.digest("SHA-256", encoder.encode(input));
  return bufferToHex(new Uint8Array(hash));
}

/**
 * Generate cryptographically secure random bytes.
 */
export function generateSalt(length = 16): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(length));
}

/**
 * Generate a cryptographically secure random hex string.
 */
export function generateRandomHex(byteLength = 32): string {
  const bytes = crypto.getRandomValues(new Uint8Array(byteLength));
  return bufferToHex(bytes);
}

// --- Utility functions ---

function bufferToHex(buffer: Uint8Array): string {
  return Array.from(buffer)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function hexToBuffer(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

/**
 * Constant-time string comparison to prevent timing attacks.
 */
function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}
