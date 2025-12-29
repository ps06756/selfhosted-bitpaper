/**
 * Funky Board ID Generator
 * Generates memorable IDs like "happy-penguin-42"
 */

const adjectives = [
  'happy', 'sunny', 'clever', 'brave', 'swift',
  'calm', 'bright', 'cool', 'wild', 'gentle',
  'eager', 'fancy', 'jolly', 'lucky', 'proud',
  'quick', 'smart', 'witty', 'bold', 'cozy',
  'daring', 'eager', 'fresh', 'grand', 'keen',
  'lively', 'merry', 'noble', 'peppy', 'royal',
  'shiny', 'sleek', 'snappy', 'speedy', 'spicy',
  'stellar', 'super', 'sweet', 'tender', 'tiny',
  'vivid', 'warm', 'zesty', 'agile', 'azure',
  'cosmic', 'dreamy', 'epic', 'funky', 'glowy',
]

const animals = [
  'penguin', 'dolphin', 'tiger', 'eagle', 'panda',
  'koala', 'fox', 'owl', 'wolf', 'bear',
  'rabbit', 'falcon', 'hawk', 'lion', 'otter',
  'seal', 'whale', 'zebra', 'deer', 'swan',
  'crane', 'duck', 'goose', 'heron', 'parrot',
  'raven', 'robin', 'sparrow', 'turtle', 'gecko',
  'lemur', 'llama', 'moose', 'puma', 'sloth',
  'badger', 'beaver', 'bobcat', 'cougar', 'coyote',
  'ferret', 'gopher', 'hedgehog', 'jaguar', 'kitten',
  'leopard', 'meerkat', 'ocelot', 'peacock', 'raccoon',
]

/**
 * Generate a random funky board ID
 * Format: adjective-animal-number (e.g., "happy-penguin-42")
 */
export function generateBoardId(): string {
  const adjective = adjectives[Math.floor(Math.random() * adjectives.length)]
  const animal = animals[Math.floor(Math.random() * animals.length)]
  const number = Math.floor(Math.random() * 100)

  return `${adjective}-${animal}-${number}`
}

/**
 * Validate if a string is a valid funky board ID
 */
export function isValidBoardId(id: string): boolean {
  const pattern = /^[a-z]+-[a-z]+-\d{1,2}$/
  return pattern.test(id)
}

/**
 * Format a board ID for display (capitalizes words)
 * "happy-penguin-42" -> "Happy Penguin 42"
 */
export function formatBoardIdForDisplay(id: string): string {
  return id
    .split('-')
    .map((part, index) => {
      if (index === 2) return part // Keep number as-is
      return part.charAt(0).toUpperCase() + part.slice(1)
    })
    .join(' ')
}
