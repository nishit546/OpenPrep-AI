const crypto = require('crypto')

const MAX_ACTIVE_SESSIONS = 10

function simulateTokenGeneration(existingTokens, newHashed) {
  const tokens = [...(existingTokens || [])]
  if (tokens.length >= MAX_ACTIVE_SESSIONS) {
    tokens.splice(0, tokens.length - MAX_ACTIVE_SESSIONS + 1)
  }
  tokens.push(newHashed)
  return tokens
}

function simulateRefreshRotation(tokens, oldHashed) {
  let rotated = tokens.filter((t) => t !== oldHashed)
  if (rotated.length > MAX_ACTIVE_SESSIONS) {
    rotated = rotated.slice(-MAX_ACTIVE_SESSIONS)
  }
  return rotated
}

describe('Refresh token pruning logic', () => {
  it('should append token when under the limit', () => {
    const result = simulateTokenGeneration(['t1', 't2'], 'new')
    expect(result).toEqual(['t1', 't2', 'new'])
  })

  it('should cap tokens at MAX_ACTIVE_SESSIONS', () => {
    const existing = Array.from({ length: 10 }, (_, i) => `t${i}`)
    const result = simulateTokenGeneration(existing, 'new')
    expect(result).toHaveLength(10)
    expect(result[0]).toBe('t1')
    expect(result[9]).toBe('new')
  })

  it('should remove oldest when already at limit', () => {
    const existing = Array.from({ length: 15 }, (_, i) => `t${i}`)
    const result = simulateTokenGeneration(existing, 'new')
    expect(result).toHaveLength(10)
    expect(result[0]).toBe('t6')
    expect(result[9]).toBe('new')
  })

  it('should handle empty token array', () => {
    const result = simulateTokenGeneration([], 'new')
    expect(result).toEqual(['new'])
  })

  it('should handle null token array', () => {
    const result = simulateTokenGeneration(null, 'new')
    expect(result).toEqual(['new'])
  })

  it('should remove old token during rotation', () => {
    const tokens = ['old', 't1', 't2']
    const result = simulateRefreshRotation(tokens, 'old')
    expect(result).toEqual(['t1', 't2'])
  })

  it('should not exceed limit after rotation', () => {
    const tokens = Array.from({ length: MAX_ACTIVE_SESSIONS }, (_, i) => `t${i}`)
    // Remove one, add one via generate = stays at limit
    const rotated = simulateRefreshRotation(tokens, 't0')
    expect(rotated).toHaveLength(9)
    const regenerated = simulateTokenGeneration(rotated, 'new')
    expect(regenerated).toHaveLength(10)
  })

  it('should handle rotation when token not found', () => {
    const tokens = ['t1', 't2', 't3']
    const result = simulateRefreshRotation(tokens, 'nonexistent')
    expect(result).toEqual(['t1', 't2', 't3'])
  })
})
