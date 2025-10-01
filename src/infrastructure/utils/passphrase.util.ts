/**
 * Passphrase utility for revolutionary authentication system
 * Generates memorable word-based passphrases for user authentication
 */

// Malagasy words list for passphrase generation
const MALAGASY_WORDS = [
  // Food
  'vary',
  'loaka',
  'kitoza',
  'mofo',
  'kafe',
  'dite',
  'sakay',
  'voanjobory',
  'ravitoto',
  'henakisoa',
  'akoho',
  'trondro',
  'voanjo',
  'masikita',

  // Nature
  'rano',
  'lanitra',
  'hazo',
  'voninkazo',
  'rivotra',
  'masoandro',
  'volana',
  'kintana',
  'rahona',
  'orana',
  'elatra',
  'vorona',

  // Colors
  'fotsy',
  'mainty',
  'mena',
  'maitso',
  'manga',
  'volomboasary',
  'volomborona',

  // Common words
  'fitiavana',
  'fiadanana',
  'fahazavana',
  'fahasoavana',
  'fahamarinana',
  'fahendrena',
  'fahombiazana',
  'fanantenana',
  'fahasalamana',

  // Objects
  'trano',
  'vavahady',
  'latabatra',
  'seza',
  'fandriana',
  'varavarana',
  'taratasy',
  'boky',
  'penina',
  'fitaovana',

  // Actions
  'mandeha',
  'mihira',
  'mihinana',
  'misotro',
  'matory',
  'miasa',
  'manoratra',
  'mamaky',
  'miteny',
  'mihaino',

  // Numbers (text form)
  'iray',
  'roa',
  'telo',
  'efatra',
  'dimy',
  'enina',
  'fito',
  'valo',
  'sivy',
  'folo'
]

/**
 * Generate a random passphrase with specified number of words
 * @param wordCount Number of words in the passphrase (default: 4)
 * @returns A space-separated passphrase
 */
export function generatePassphrase(wordCount: number = 4): string {
  if (wordCount < 2 || wordCount > 10) {
    throw new Error('Word count must be between 2 and 10')
  }

  const selectedWords: string[] = []
  const usedIndices = new Set<number>()

  while (selectedWords.length < wordCount) {
    const randomIndex = Math.floor(Math.random() * MALAGASY_WORDS.length)

    // Ensure we don't repeat words
    if (!usedIndices.has(randomIndex)) {
      usedIndices.add(randomIndex)
      selectedWords.push(MALAGASY_WORDS[randomIndex])
    }
  }

  return selectedWords.join(' ')
}

/**
 * Validate a passphrase format
 * @param passphrase The passphrase to validate
 * @returns true if valid format
 */
export function validatePassphraseFormat(passphrase: string): boolean {
  if (!passphrase || typeof passphrase !== 'string') {
    return false
  }

  const words = passphrase.trim().split(/\s+/)

  // Must have between 2 and 10 words
  if (words.length < 2 || words.length > 10) {
    return false
  }

  // Each word must be valid
  return words.every((word) => {
    return word.length >= 2 && word.length <= 20 && /^[a-z]+$/i.test(word)
  })
}

/**
 * Generate a hint for recovery word
 * @param recoveryWord The recovery word
 * @returns A hint string showing first and last character
 */
export function generateRecoveryHint(recoveryWord: string): string {
  if (!recoveryWord || recoveryWord.length < 3) {
    return 'votre mot'
  }

  const first = recoveryWord[0]
  const last = recoveryWord.at(-1)
  const middle = '*'.repeat(recoveryWord.length - 2)

  return `${first}${middle}${last}`
}

/**
 * Encrypt a passphrase or recovery word using Bun's built-in crypto
 * @param text The text to encrypt
 * @param key The encryption key
 * @returns Encrypted text (hex encoded)
 */
export async function encryptText(text: string, key: string): Promise<string> {
  // Use Bun.password.hash for consistent encryption
  const hash = await Bun.password.hash(text + key, {
    algorithm: 'bcrypt',
    cost: 10
  })

  return hash
}

/**
 * Verify encrypted text
 * @param text The plain text to verify
 * @param encrypted The encrypted text
 * @param key The encryption key
 * @returns true if text matches
 */
export async function verifyEncryptedText(text: string, encrypted: string, key: string): Promise<boolean> {
  return await Bun.password.verify(text + key, encrypted)
}
