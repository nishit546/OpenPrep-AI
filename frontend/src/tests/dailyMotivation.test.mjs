import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import { ACADEMIC_QUOTES, getDailyQuote, getDayOfYear, getAllQuotes } from '../services/quotesData.js';

test('Daily Study Motivation Quotes Engine and Micro-Habit Widget', async (t) => {
  await t.test('quotesData.js contains 100+ curated academic quotes with valid schema', () => {
    assert.ok(Array.isArray(ACADEMIC_QUOTES), 'Quotes must be an array');
    assert.ok(ACADEMIC_QUOTES.length >= 100, `Expected at least 100 quotes, found ${ACADEMIC_QUOTES.length}`);

    ACADEMIC_QUOTES.forEach((q, idx) => {
      assert.ok(q.id, `Quote at index ${idx} must have an id`);
      assert.ok(typeof q.quote === 'string' && q.quote.trim().length > 0, `Quote ${idx} must have text`);
      assert.ok(typeof q.author === 'string' && q.author.trim().length > 0, `Quote ${idx} must have author`);
      assert.ok(typeof q.field === 'string' && q.field.trim().length > 0, `Quote ${idx} must have field`);
      assert.ok(typeof q.context === 'string' && q.context.trim().length > 0, `Quote ${idx} must have context`);
    });
  });

  await t.test('getDailyQuote produces deterministic daily results', () => {
    const testDate = new Date(2026, 9, 24); // Oct 24, 2026
    const quote1 = getDailyQuote(testDate);
    const quote2 = getDailyQuote(testDate);
    assert.strictEqual(quote1.id, quote2.id, 'Daily quote selection must be deterministic for the same date');
    assert.strictEqual(quote1.author, quote2.author);

    const dayOfYear = getDayOfYear(testDate);
    assert.ok(dayOfYear > 0 && dayOfYear <= 366, 'Day of year must be between 1 and 366');
  });

  await t.test('DailyMotivationWidget.jsx implements micro-habits, localStorage & confetti', () => {
    const widgetPath = path.resolve(__dirname, '../components/dashboard/DailyMotivationWidget.jsx');
    assert.ok(fs.existsSync(widgetPath), 'DailyMotivationWidget.jsx must exist');

    const content = fs.readFileSync(widgetPath, 'utf8');
    assert.match(content, /Complete 1 Spaced Repetition deck/, 'Must include spaced repetition micro-goal');
    assert.match(content, /Practice 10 PYQ quiz questions/, 'Must include PYQ quiz micro-goal');
    assert.match(content, /Read 1 topic summary note/, 'Must include summary note micro-goal');
    assert.match(content, /localStorage/, 'Must persist checklist state in localStorage');
    assert.match(content, /confetti/, 'Must trigger confetti celebration when all habits checked');
    assert.match(content, /QuoteShareModal/, 'Must integrate QuoteShareModal');
  });

  await t.test('QuoteShareModal.jsx implements direct WhatsApp, Twitter and LinkedIn share channels', () => {
    const modalPath = path.resolve(__dirname, '../components/dashboard/QuoteShareModal.jsx');
    assert.ok(fs.existsSync(modalPath), 'QuoteShareModal.jsx must exist');

    const content = fs.readFileSync(modalPath, 'utf8');
    assert.match(content, /api\.whatsapp\.com/, 'Must support WhatsApp sharing');
    assert.match(content, /twitter\.com\/intent\/tweet/, 'Must support Twitter sharing');
    assert.match(content, /linkedin\.com/, 'Must support LinkedIn sharing');
    assert.match(content, /navigator\.clipboard\.writeText/, 'Must support instant clipboard copying');
  });

  await t.test('widgets.js exports DailyMotivationWidget in component map', () => {
    const widgetsPath = path.resolve(__dirname, '../components/dashboard/widgets.js');
    const content = fs.readFileSync(widgetsPath, 'utf8');
    assert.match(content, /DailyMotivationWidget/, 'Must export DailyMotivationWidget');
    assert.match(content, /DailyMotivation:\s*DailyMotivationWidget/, 'Must register in WIDGET_COMPONENT_MAP');
  });
});
