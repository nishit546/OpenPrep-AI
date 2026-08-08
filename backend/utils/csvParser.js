/**
 * Parse a minimal RFC 4180 CSV into an array of objects with keys from the
 * header row. Handles quoted fields, escaped double-quotes, and skips
 * Anki's leading "#"-prefixed metadata lines (e.g. "#separator:Comma",
 * "#html:true") so standard Anki CSV exports can be imported directly.
 * @param {string} text raw CSV file contents
 * @returns {Array<Object>} parsed records keyed by lower-cased header name
 */
function parseCSV(text) {
  if (!text || !text.trim()) return [];

  const rawLines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  // Anki exports prefix the file with metadata lines like "#separator:Comma"
  // — skip those so the first real row is treated as the header.
  const lines = rawLines.filter((line) => !line.trim().startsWith('#'));
  if (lines.length < 2) return [];

  function splitLine(line) {
    const fields = [];
    let cur = '';
    let inQuote = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (inQuote) {
        if (ch === '"' && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else if (ch === '"') {
          inQuote = false;
        } else {
          cur += ch;
        }
      } else {
        if (ch === '"') {
          inQuote = true;
        } else if (ch === ',') {
          fields.push(cur);
          cur = '';
        } else {
          cur += ch;
        }
      }
    }
    fields.push(cur);
    return fields;
  }

  const headers = splitLine(lines[0]).map((h) => h.trim().toLowerCase());
  const records = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const values = splitLine(line);
    const obj = {};
    headers.forEach((h, idx) => {
      obj[h] = values[idx] !== undefined ? values[idx].trim() : '';
    });
    records.push(obj);
  }

  return records;
}

/**
 * Validate that parsed CSV records contain the minimum columns required for
 * flashcard import ("front" and "back"). "tags" and "hint" are optional.
 * @param {Array<Object>} records
 * @returns {string|null} a human-readable error, or null when valid
 */
function validateCSVHeaders(records) {
  if (!records || records.length === 0) {
    return 'The CSV file is empty or missing a header row';
  }
  const headers = Object.keys(records[0]);
  if (!headers.includes('front') || !headers.includes('back')) {
    return 'CSV must include "Front" and "Back" columns (Tags and Hint are optional)';
  }
  return null;
}

module.exports = { parseCSV, validateCSVHeaders };