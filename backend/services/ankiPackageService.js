const admZip = require('adm-zip');
const Database = require('better-sqlite3');
const archiver = require('archiver');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const os = require('os');

/**
 * Parses an Anki .apkg file buffer or file path.
 * Extracts collection.anki2 / collection.anki21, notes, cards, deck structures, and media dictionary.
 * 
 * @param {Buffer|string} input - APKG file buffer or file path on disk
 * @returns {Promise<{ decks: Array, cards: Array, mediaMap: Object, stats: Object }>}
 */
async function parseAnkiPackage(input) {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'anki_import_'));

  try {
    let zip;
    if (Buffer.isBuffer(input)) {
      zip = new admZip(input);
    } else {
      zip = new admZip(input);
    }

    zip.extractAllTo(tempDir, true);

    // Look for collection.anki21 or collection.anki2
    let dbFile = path.join(tempDir, 'collection.anki21');
    if (!fs.existsSync(dbFile)) {
      dbFile = path.join(tempDir, 'collection.anki2');
    }

    if (!fs.existsSync(dbFile)) {
      throw new Error('Invalid .apkg package: collection SQLite database missing.');
    }

    // Read media mapping if present
    const mediaJsonPath = path.join(tempDir, 'media');
    let mediaMap = {};
    if (fs.existsSync(mediaJsonPath)) {
      try {
        const rawMedia = fs.readFileSync(mediaJsonPath, 'utf8');
        mediaMap = JSON.parse(rawMedia);
      } catch (e) {
        console.warn('[AnkiParser] Warning: Could not parse media dictionary:', e.message);
      }
    }

    const db = new Database(dbFile, { readonly: true });

    // 1. Read Col Metadata (Decks and Models)
    const colRow = db.prepare('SELECT decks, models FROM col LIMIT 1').get();
    const decksMeta = colRow?.decks ? JSON.parse(colRow.decks) : {};
    const modelsMeta = colRow?.models ? JSON.parse(colRow.models) : {};

    // 2. Read Notes
    const notesRows = db.prepare('SELECT id, mid, tags, flds, sfld FROM notes').all();
    const notesMap = new Map();

    for (const n of notesRows) {
      const model = modelsMeta[String(n.mid)] || {};
      const fieldNames = (model.flds || []).map((f) => f.name || 'Field');
      const fieldValues = (n.flds || '').split('\x1f');

      const fieldsObj = {};
      fieldNames.forEach((name, idx) => {
        fieldsObj[name] = fieldValues[idx] || '';
      });

      notesMap.set(n.id, {
        id: n.id,
        modelId: n.mid,
        modelName: model.name || 'Basic',
        isCloze: (model.name || '').toLowerCase().includes('cloze'),
        tags: (n.tags || '').trim().split(/\s+/).filter(Boolean),
        fieldValues,
        fieldsObj,
        rawFront: fieldValues[0] || '',
        rawBack: fieldValues[1] || fieldValues[0] || '',
      });
    }

    // 3. Read Cards with SM-2 Spaced Repetition Scheduling
    const cardsRows = db.prepare('SELECT id, nid, did, ord, type, queue, due, ivl, factor, reps, lapses FROM cards').all();
    const parsedCards = [];
    const deckCardsCount = {};

    for (const c of cardsRows) {
      const note = notesMap.get(c.nid);
      if (!note) continue;

      const deckInfo = decksMeta[String(c.did)] || { name: 'Default' };
      const deckName = deckInfo.name || 'Default';

      deckCardsCount[deckName] = (deckCardsCount[deckName] || 0) + 1;

      // Calculate ease factor from Anki factor (e.g. 2500 -> 2.5)
      const efactor = c.factor ? c.factor / 1000 : 2.5;
      const interval = c.ivl || 1;
      const repetitions = c.reps || 0;

      // Handle Cloze cards vs Basic cards
      let front = note.rawFront;
      let back = note.rawBack;

      if (note.isCloze) {
        // e.g. Cloze card ord=0 corresponds to c1, ord=1 to c2
        const clozeNum = c.ord + 1;
        front = note.rawFront; // Contains {{c1::...}}
        back = note.rawBack;
      }

      parsedCards.push({
        ankiCardId: c.id,
        ankiNoteId: c.nid,
        deckName,
        front,
        back,
        tags: note.tags,
        isCloze: note.isCloze,
        clozeOrd: c.ord,
        interval,
        repetitions,
        efactor,
        cardType: c.type,
      });
    }

    db.close();

    return {
      decks: Object.values(decksMeta).map((d) => ({ id: d.id, name: d.name, cardCount: deckCardsCount[d.name] || 0 })),
      cards: parsedCards,
      mediaMap,
      stats: {
        totalNotes: notesRows.length,
        totalCards: parsedCards.length,
        totalMedia: Object.keys(mediaMap).length,
      },
    };
  } finally {
    // Clean up temporary extracted folder
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch (e) {
      // Ignore cleanup error
    }
  }
}

/**
 * Builds and streams a standards-compliant Anki .apkg package
 * 
 * @param {Array} cards - Array of card objects { front, back, tags, interval, efactor, repetitions, isCloze }
 * @param {string} deckName - Name of the deck
 * @param {Object} [mediaFiles] - Optional map of media filename -> Buffer or local path
 * @returns {Promise<Buffer>} The .apkg zip buffer
 */
async function buildAnkiPackage(cards, deckName = 'OpenPrep Export', mediaFiles = {}) {
  return new Promise(async (resolve, reject) => {
    try {
      const db = new Database(':memory:');

      // Create full schema compatible with Anki 2.0 / 2.1
      db.exec(`
        CREATE TABLE col (
          id INTEGER PRIMARY KEY,
          crt INTEGER,
          mod INTEGER,
          scm INTEGER,
          ver INTEGER,
          dty INTEGER,
          usn INTEGER,
          ls INTEGER,
          conf TEXT,
          models TEXT,
          decks TEXT,
          dconf TEXT,
          tags TEXT
        );
        CREATE TABLE notes (
          id INTEGER PRIMARY KEY,
          guid TEXT,
          mid INTEGER,
          mod INTEGER,
          usn INTEGER,
          tags TEXT,
          flds TEXT,
          sfld INTEGER,
          csum INTEGER,
          flags INTEGER,
          data TEXT
        );
        CREATE TABLE cards (
          id INTEGER PRIMARY KEY,
          nid INTEGER,
          did INTEGER,
          ord INTEGER,
          mod INTEGER,
          usn INTEGER,
          type INTEGER,
          queue INTEGER,
          due INTEGER,
          ivl INTEGER,
          factor INTEGER,
          reps INTEGER,
          lapses INTEGER,
          left INTEGER,
          odue INTEGER,
          odid INTEGER,
          flags INTEGER,
          data TEXT
        );
        CREATE TABLE revlog (
          id INTEGER PRIMARY KEY,
          cid INTEGER,
          usn INTEGER,
          ease INTEGER,
          ivl INTEGER,
          lastIvl INTEGER,
          factor INTEGER,
          time INTEGER,
          type INTEGER
        );
        CREATE TABLE graves (
          usn INTEGER,
          oid INTEGER,
          type INTEGER
        );
      `);

      const now = Math.floor(Date.now() / 1000);
      const deckId = 1600000000000 + Math.floor(Math.random() * 100000);
      const basicModelId = 1600000000001;
      const clozeModelId = 1600000000002;

      const models = {
        [basicModelId]: {
          id: basicModelId,
          name: 'Basic (OpenPrep)',
          type: 0,
          mod: now,
          usn: -1,
          sortf: 0,
          did: deckId,
          tmpls: [{ name: 'Card 1', ord: 0, qfmt: '{{Front}}', afmt: '{{FrontSide}}\n\n<hr id=answer>\n\n{{Back}}' }],
          flds: [{ name: 'Front', ord: 0 }, { name: 'Back', ord: 1 }],
          css: '.card { font-family: -apple-system, system-ui, sans-serif; font-size: 18px; text-align: center; color: #1e293b; background-color: #f8fafc; }',
        },
        [clozeModelId]: {
          id: clozeModelId,
          name: 'Cloze (OpenPrep)',
          type: 1,
          mod: now,
          usn: -1,
          sortf: 0,
          did: deckId,
          tmpls: [{ name: 'Cloze', ord: 0, qfmt: '{{cloze:Text}}', afmt: '{{cloze:Text}}\n\n<hr id=answer>\n\n{{Back Extra}}' }],
          flds: [{ name: 'Text', ord: 0 }, { name: 'Back Extra', ord: 1 }],
          css: '.card { font-family: -apple-system, system-ui, sans-serif; font-size: 18px; text-align: center; color: #1e293b; } .cloze { font-weight: bold; color: #2563eb; }',
        },
      };

      const decks = {
        [deckId]: {
          id: deckId,
          name: deckName,
          mod: now,
          usn: -1,
          desc: 'Exported from OpenPrep AI with SM-2 retention metrics',
          conf: 1,
        },
      };

      db.prepare(
        `INSERT INTO col (id, crt, mod, scm, ver, dty, usn, ls, conf, models, decks, dconf, tags) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(
        1,
        now,
        now,
        now,
        11,
        0,
        0,
        0,
        JSON.stringify({ activeDecks: [deckId], curDeck: deckId }),
        JSON.stringify(models),
        JSON.stringify(decks),
        '{}',
        '{}'
      );

      const insertNote = db.prepare(
        `INSERT INTO notes (id, guid, mid, mod, usn, tags, flds, sfld, csum, flags, data) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      );
      const insertCard = db.prepare(
        `INSERT INTO cards (id, nid, did, ord, mod, usn, type, queue, due, ivl, factor, reps, lapses, left, odue, odid, flags, data) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      );

      let noteId = 100000;
      let cardId = 200000;

      for (const card of cards) {
        const isCloze = Boolean(card.isCloze || (card.front && card.front.includes('{{c')));
        const modelId = isCloze ? clozeModelId : basicModelId;
        const guid = crypto.randomUUID().replace(/-/g, '').substring(0, 10);
        const tagsStr = Array.isArray(card.tags) ? card.tags.join(' ') : card.tags || '';

        const frontText = card.front || '';
        const backText = card.back || '';
        const flds = `${frontText}\x1f${backText}`;

        insertNote.run(noteId, guid, modelId, now, -1, tagsStr, flds, frontText, 0, 0, '');

        const factor = Math.round((card.efactor || card.easeFactor || 2.5) * 1000);
        const interval = card.interval || 1;
        const reps = card.repetitions || 0;

        insertCard.run(
          cardId,
          noteId,
          deckId,
          0,
          now,
          -1,
          reps > 0 ? 2 : 0, // 2 = review, 0 = new
          reps > 0 ? 2 : 0,
          interval,
          interval,
          factor,
          reps,
          0,
          0,
          0,
          0,
          0,
          ''
        );

        noteId++;
        cardId++;
      }

      const tempDbPath = path.join(os.tmpdir(), `openprep_export_${Date.now()}.sqlite`);
      await db.backup(tempDbPath);
      db.close();

      const zip = new admZip();
      zip.addLocalFile(tempDbPath, '', 'collection.anki2');
      zip.addFile('media', Buffer.from('{}', 'utf8'));

      const buffer = zip.toBuffer();

      try {
        fs.unlinkSync(tempDbPath);
      } catch (e) {}

      resolve(buffer);
    } catch (err) {
      reject(err);
    }
  });
}

module.exports = {
  parseAnkiPackage,
  buildAnkiPackage,
};
