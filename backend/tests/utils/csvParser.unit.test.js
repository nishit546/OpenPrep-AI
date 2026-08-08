const { parseCSV, validateCSVHeaders } = require('../../utils/csvParser')

describe('parseCSV', () => {
  it('returns an empty array for empty or null input', () => {
    expect(parseCSV('')).toEqual([])
    expect(parseCSV(null)).toEqual([])
    expect(parseCSV('   ')).toEqual([])
  })

  it('returns an empty array when there is only a header row', () => {
    expect(parseCSV('front,back')).toEqual([])
  })

  it('parses a basic CSV with a header row', () => {
    const csv = 'front,back\nWhat is 2+2?,4\nCapital of France?,Paris'
    expect(parseCSV(csv)).toEqual([
      { front: 'What is 2+2?', back: '4' },
      { front: 'Capital of France?', back: 'Paris' },
    ])
  })

  it('lower-cases header names so "Front,Back,Tags" style headers work', () => {
    const csv = 'Front,Back,Tags\nQ1,A1,biology'
    const records = parseCSV(csv)
    expect(records).toEqual([{ front: 'Q1', back: 'A1', tags: 'biology' }])
  })

  it('handles quoted fields containing commas', () => {
    const csv = 'front,back\n"What is A, B?",Answer'
    expect(parseCSV(csv)).toEqual([{ front: 'What is A, B?', back: 'Answer' }])
  })

  it('handles escaped double-quotes inside quoted fields', () => {
    const csv = 'front,back\n"He said ""hello""",Reply'
    expect(parseCSV(csv)).toEqual([{ front: 'He said "hello"', back: 'Reply' }])
  })

  it('skips Anki-style "#"-prefixed metadata lines', () => {
    const csv = [
      '#separator:Comma',
      '#html:true',
      '#columns:Front,Back,Tags',
      'front,back,tags',
      'Q1,A1,chapter1',
    ].join('\n')
    expect(parseCSV(csv)).toEqual([{ front: 'Q1', back: 'A1', tags: 'chapter1' }])
  })

  it('skips blank lines between rows', () => {
    const csv = 'front,back\nQ1,A1\n\nQ2,A2'
    expect(parseCSV(csv)).toEqual([
      { front: 'Q1', back: 'A1' },
      { front: 'Q2', back: 'A2' },
    ])
  })
})

describe('validateCSVHeaders', () => {
  it('returns an error message for an empty record set', () => {
    expect(validateCSVHeaders([])).toMatch(/empty or missing a header row/)
    expect(validateCSVHeaders(null)).toMatch(/empty or missing a header row/)
  })

  it('returns an error message when required columns are missing', () => {
    const records = [{ question: 'Q1', answer: 'A1' }]
    expect(validateCSVHeaders(records)).toMatch(/must include "Front" and "Back"/)
  })

  it('returns null when front and back columns are present', () => {
    const records = [{ front: 'Q1', back: 'A1' }]
    expect(validateCSVHeaders(records)).toBeNull()
  })

  it('returns null when optional tags/hint columns are also present', () => {
    const records = [{ front: 'Q1', back: 'A1', tags: 'x', hint: 'y' }]
    expect(validateCSVHeaders(records)).toBeNull()
  })
})