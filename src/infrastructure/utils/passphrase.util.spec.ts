import { describe, expect, it } from 'vitest'
import {
  encryptText,
  generatePassphrase,
  generateRecoveryHint,
  validatePassphraseFormat,
  verifyEncryptedText
} from './passphrase.util'

describe('Passphrase Utility', () => {
  describe('generatePassphrase', () => {
    it('should generate passphrase with default 4 words', () => {
      const passphrase = generatePassphrase()
      const words = passphrase.split(' ')
      expect(words.length).toBe(4)
    })

    it('should generate passphrase with specified number of words', () => {
      const passphrase = generatePassphrase(6)
      const words = passphrase.split(' ')
      expect(words.length).toBe(6)
    })

    it('should throw error for invalid word count', () => {
      expect(() => generatePassphrase(1)).toThrow('Word count must be between 2 and 10')
      expect(() => generatePassphrase(11)).toThrow('Word count must be between 2 and 10')
    })

    it('should not repeat words in passphrase', () => {
      const passphrase = generatePassphrase(4)
      const words = passphrase.split(' ')
      const uniqueWords = new Set(words)
      expect(uniqueWords.size).toBe(words.length)
    })
  })

  describe('validatePassphraseFormat', () => {
    it('should validate correct passphrase format', () => {
      expect(validatePassphraseFormat('vary sy loaka')).toBe(true)
      expect(validatePassphraseFormat('mofo kafe')).toBe(true)
    })

    it('should reject invalid passphrase format', () => {
      expect(validatePassphraseFormat('')).toBe(false)
      expect(validatePassphraseFormat('oneword')).toBe(false)
      expect(validatePassphraseFormat('word1 word2 word3 word4 word5 word6 word7 word8 word9 word10 word11')).toBe(
        false
      )
      expect(validatePassphraseFormat('invalid123 word')).toBe(false)
    })

    it('should reject non-string input', () => {
      expect(validatePassphraseFormat(null as any)).toBe(false)
      expect(validatePassphraseFormat(undefined as any)).toBe(false)
      expect(validatePassphraseFormat(123 as any)).toBe(false)
    })
  })

  describe('generateRecoveryHint', () => {
    it('should generate hint with first and last character', () => {
      const hint = generateRecoveryHint('recover')
      expect(hint).toBe('r****r')
    })

    it('should handle short words', () => {
      const hint = generateRecoveryHint('abc')
      expect(hint).toBe('a*c')
    })

    it('should return default for very short words', () => {
      const hint = generateRecoveryHint('ab')
      expect(hint).toBe('votre mot')
    })

    it('should handle empty string', () => {
      const hint = generateRecoveryHint('')
      expect(hint).toBe('votre mot')
    })
  })

  describe('encryptText and verifyEncryptedText', () => {
    it('should encrypt and verify text correctly', async () => {
      const text = 'testpassword'
      const key = 'testuser'

      const encrypted = await encryptText(text, key)
      expect(encrypted).toBeTruthy()
      expect(encrypted).not.toBe(text)

      const isValid = await verifyEncryptedText(text, encrypted, key)
      expect(isValid).toBe(true)
    })

    it('should fail verification with wrong text', async () => {
      const text = 'testpassword'
      const wrongText = 'wrongpassword'
      const key = 'testuser'

      const encrypted = await encryptText(text, key)
      const isValid = await verifyEncryptedText(wrongText, encrypted, key)
      expect(isValid).toBe(false)
    })

    it('should fail verification with wrong key', async () => {
      const text = 'testpassword'
      const key = 'testuser'
      const wrongKey = 'wronguser'

      const encrypted = await encryptText(text, key)
      const isValid = await verifyEncryptedText(text, encrypted, wrongKey)
      expect(isValid).toBe(false)
    })
  })
})
