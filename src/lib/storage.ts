// ── Types ─────────────────────────────────────────────────────────────────────

type StorageType = 'local' | 'session'

// ── Salt ──────────────────────────────────────────────────────────────────────

const SALT: string = import.meta.env.VITE_STORAGE_SALT ?? 'jnya-fallback-salt'

// ── Internal ──────────────────────────────────────────────────────────────────

function getStore(type: StorageType): Storage {
  return type === 'session' ? sessionStorage : localStorage
}

// ── Encode / Decode ───────────────────────────────────────────────────────────

/**
 * XOR-salts then hex-encodes a string.
 * 1. URI-encode the value (makes it ASCII-safe).
 * 2. XOR each character code against the repeating salt key.
 * 3. Convert each byte to a 2-char hex string.
 *
 * The result is not reversible without the salt, so casual base64
 * decoding in DevTools will not expose raw values.
 */
export function encode(value: string): string {
  const uri = encodeURIComponent(value)
  const saltChars = Array.from(SALT)
  return Array.from(uri)
    .map((char, i) => (char.charCodeAt(0) ^ saltChars[i % saltChars.length].charCodeAt(0))
      .toString(16)
      .padStart(2, '0'))
    .join('')
}

/**
 * Reverses encode(). XOR-salts the hex-decoded bytes then URI-decodes.
 */
export function decode(value: string): string {
  const saltChars = Array.from(SALT)
  const pairs = value.match(/.{1,2}/g) ?? []
  const uri = pairs
    .map((hex, i) => String.fromCharCode(
      parseInt(hex, 16) ^ saltChars[i % saltChars.length].charCodeAt(0),
    ))
    .join('')
  return decodeURIComponent(uri)
}

// ── Storage ───────────────────────────────────────────────────────────────────

/**
 * Salt-encodes and stores a value. Objects are JSON-stringified before encoding.
 * Defaults to localStorage.
 */
export function setStorage(key: string, value: unknown, storage: StorageType = 'local'): void {
  const raw = typeof value === 'object' && value !== null
    ? JSON.stringify(value)
    : String(value)
  getStore(storage).setItem(key, encode(raw))
}

/**
 * Retrieves and decodes a salted value. Attempts JSON.parse on the result;
 * falls back to the raw decoded string if parsing fails.
 * Returns null if the key does not exist.
 * Defaults to localStorage.
 */
export function getStorage<T>(key: string, storage: StorageType = 'local'): T | null {
  const item = getStore(storage).getItem(key)
  if (item === null) return null

  try {
    const decoded = decode(item)
    try {
      return JSON.parse(decoded) as T
    } catch {
      return decoded as unknown as T
    }
  } catch {
    return null
  }
}

/**
 * Removes a key from storage.
 * Defaults to localStorage.
 */
export function removeStorage(key: string, storage: StorageType = 'local'): void {
  getStore(storage).removeItem(key)
}
