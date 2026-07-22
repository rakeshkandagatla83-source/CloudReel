import { describe, it, expect, beforeEach } from 'vitest'
import { encode, decode, getStorage, setStorage, removeStorage } from '../storage'

describe('encode / decode', () => {
  it('round-trips a plain string', () => {
    expect(decode(encode('hello'))).toBe('hello')
  })

  it('round-trips a JSON-looking string', () => {
    const val = JSON.stringify({ foo: 'bar', n: 42 })
    expect(decode(encode(val))).toBe(val)
  })

  it('round-trips a URL string', () => {
    const url = 'https://webrtc-test.janya.video/index.html?ID=abc-123'
    expect(decode(encode(url))).toBe(url)
  })

  it('produces different output for different inputs', () => {
    expect(encode('aaa')).not.toBe(encode('bbb'))
  })
})

describe('setStorage / getStorage / removeStorage — localStorage (default)', () => {
  beforeEach(() => localStorage.clear())

  it('stores and retrieves a string', () => {
    setStorage('key1', 'hello')
    expect(getStorage<string>('key1')).toBe('hello')
  })

  it('stores and retrieves a URL string', () => {
    const url = 'https://webrtc-test.janya.video/index.html?ID=uuid-xyz'
    setStorage('studio_meeting_url', url)
    expect(getStorage<string>('studio_meeting_url')).toBe(url)
  })

  it('stores and retrieves an object', () => {
    setStorage('obj', { a: 1, b: 'two' })
    expect(getStorage<{ a: number; b: string }>('obj')).toEqual({ a: 1, b: 'two' })
  })

  it('returns null for a missing key', () => {
    expect(getStorage('nonexistent')).toBeNull()
  })

  it('removeStorage deletes the key', () => {
    setStorage('key2', 'value')
    removeStorage('key2')
    expect(getStorage('key2')).toBeNull()
  })

  it('overwrites an existing key', () => {
    setStorage('key3', 'first')
    setStorage('key3', 'second')
    expect(getStorage<string>('key3')).toBe('second')
  })
})

describe('setStorage / getStorage / removeStorage — sessionStorage', () => {
  beforeEach(() => sessionStorage.clear())

  it('stores and retrieves a string in sessionStorage', () => {
    setStorage('skey1', 'session-val', 'session')
    expect(getStorage<string>('skey1', 'session')).toBe('session-val')
  })

  it('stores and retrieves an object in sessionStorage', () => {
    setStorage('sobj', { x: 99 }, 'session')
    expect(getStorage<{ x: number }>('sobj', 'session')).toEqual({ x: 99 })
  })

  it('returns null for a missing key in sessionStorage', () => {
    expect(getStorage('missing_key', 'session')).toBeNull()
  })

  it('removeStorage removes from sessionStorage', () => {
    setStorage('skey2', 'val', 'session')
    removeStorage('skey2', 'session')
    expect(getStorage('skey2', 'session')).toBeNull()
  })

  it('is isolated from localStorage (same key, different stores)', () => {
    setStorage('shared', 'local-value', 'local')
    setStorage('shared', 'session-value', 'session')
    expect(getStorage<string>('shared', 'local')).toBe('local-value')
    expect(getStorage<string>('shared', 'session')).toBe('session-value')
  })

  it('does not affect localStorage when removing from sessionStorage', () => {
    setStorage('cross', 'in-local', 'local')
    setStorage('cross', 'in-session', 'session')
    removeStorage('cross', 'session')
    expect(getStorage<string>('cross', 'local')).toBe('in-local')
    expect(getStorage('cross', 'session')).toBeNull()
  })
})
