import { describe, it, expect } from 'vitest'
import { cn } from '../utils'

describe('cn — Tailwind class merger', () => {
  it('returns empty string when called with no arguments', () => {
    expect(cn()).toBe('')
  })

  it('returns a single class unchanged', () => {
    expect(cn('text-white')).toBe('text-white')
  })

  it('joins multiple classes with a space', () => {
    expect(cn('flex', 'items-center', 'gap-2')).toBe('flex items-center gap-2')
  })

  it('ignores falsy values (false, null, undefined)', () => {
    expect(cn('foo', false, undefined, null, 'baz')).toBe('foo baz')
  })

  it('handles object syntax — includes truthy keys only', () => {
    expect(cn({ 'text-white': true, 'text-black': false, 'font-bold': true })).toBe('text-white font-bold')
  })

  it('handles array syntax', () => {
    expect(cn(['flex', 'p-4'])).toBe('flex p-4')
  })

  it('deduplicates conflicting Tailwind utilities — last class wins', () => {
    expect(cn('p-4', 'p-8')).toBe('p-8')
    expect(cn('text-sm', 'text-lg')).toBe('text-lg')
    expect(cn('bg-red-500', 'bg-blue-500')).toBe('bg-blue-500')
  })

  it('keeps non-conflicting Tailwind utilities from both classes', () => {
    const result = cn('text-white bg-red-500', 'font-bold')
    expect(result).toContain('text-white')
    expect(result).toContain('bg-red-500')
    expect(result).toContain('font-bold')
  })

  it('handles conditional class with ternary', () => {
    const active = true
    expect(cn('base', active ? 'active' : 'inactive')).toBe('base active')
  })

  it('merges modifier classes correctly (e.g. hover:bg-*)', () => {
    // hover: classes are not conflicting if they are different variants
    const result = cn('hover:bg-white', 'hover:text-black')
    expect(result).toContain('hover:bg-white')
    expect(result).toContain('hover:text-black')
  })

  it('handles mixed inputs — objects, arrays, strings', () => {
    const result = cn('base', ['extra', 'items'], { conditional: true, skipped: false })
    expect(result).toContain('base')
    expect(result).toContain('extra')
    expect(result).toContain('items')
    expect(result).toContain('conditional')
    expect(result).not.toContain('skipped')
  })

  it('deduplicates opacity shorthand classes', () => {
    expect(cn('bg-white/7', 'bg-white/10')).toBe('bg-white/10')
  })
})
