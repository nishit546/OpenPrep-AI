const { escapeLikePattern } = require('../../utils/likePattern')

describe('escapeLikePattern', () => {
  it('should escape percent wildcard', () => {
    expect(escapeLikePattern('100%')).toBe('100\\%')
  })

  it('should escape underscore wildcard', () => {
    expect(escapeLikePattern('hello_world')).toBe('hello\\_world')
  })

  it('should escape backslash', () => {
    expect(escapeLikePattern('path\\to')).toBe('path\\\\to')
  })

  it('should escape multiple wildcards in a string', () => {
    expect(escapeLikePattern('%test_')).toBe('\\%test\\_')
  })

  it('should escape backslash before percent', () => {
    expect(escapeLikePattern('\\%')).toBe('\\\\\\%')
  })

  it('should return plain strings unchanged', () => {
    expect(escapeLikePattern('hello world')).toBe('hello world')
  })

  it('should handle empty string', () => {
    expect(escapeLikePattern('')).toBe('')
  })

  it('should escape consecutive special characters', () => {
    expect(escapeLikePattern('%%__')).toBe('\\%\\%\\_\\_')
  })

  it('should handle mixed content', () => {
    expect(escapeLikePattern('100% done_test')).toBe('100\\% done\\_test')
  })
})
