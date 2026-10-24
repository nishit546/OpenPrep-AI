import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test('Quick Deck Multi-Select Bulk Actions Toolbar & Tag Filtering', async (t) => {
  await t.test('useBatchSelection hook file exists and implements selection logic', () => {
    const hookPath = path.resolve(__dirname, '../hooks/useBatchSelection.js');
    assert.ok(fs.existsSync(hookPath), 'useBatchSelection.js must exist');

    const content = fs.readFileSync(hookPath, 'utf8');
    assert.match(content, /selectedIds/, 'Must track selectedIds');
    assert.match(content, /toggleSelect/, 'Must expose toggleSelect');
    assert.match(content, /selectAll/, 'Must expose selectAll');
    assert.match(content, /clearSelection/, 'Must expose clearSelection');
    assert.match(content, /isSelected/, 'Must expose isSelected check');
    assert.match(content, /isAllSelected/, 'Must compute isAllSelected boolean');
    assert.match(content, /selectedCount/, 'Must expose selectedCount');
  });

  await t.test('BatchActionToolbar.jsx implements floating action bar and modals', () => {
    const barPath = path.resolve(__dirname, '../components/flashcards/BatchActionToolbar.jsx');
    assert.ok(fs.existsSync(barPath), 'BatchActionToolbar.jsx must exist');

    const content = fs.readFileSync(barPath, 'utf8');
    assert.match(content, /fixed bottom-6/, 'Must be a sticky bottom floating toolbar');
    assert.match(content, /Add Tag|onBatchTag/, 'Must support batch tagging');
    assert.match(content, /Move|onBatchMove/, 'Must support moving cards to destination deck');
    assert.match(content, /Export|onBatchExport/, 'Must support exporting selected cards');
    assert.match(content, /Delete|onBatchDelete/, 'Must support deleting selected cards with confirmation');
    assert.match(content, /card.*selected/, 'Must display selected cards counter');
  });

  await t.test('TagFilterBar.jsx implements horizontal scrollable filter pills', () => {
    const barPath = path.resolve(__dirname, '../components/flashcards/TagFilterBar.jsx');
    assert.ok(fs.existsSync(barPath), 'TagFilterBar.jsx must exist');

    const content = fs.readFileSync(barPath, 'utf8');
    assert.match(content, /availableTags/, 'Must accept availableTags');
    assert.match(content, /activeTags/, 'Must accept activeTags');
    assert.match(content, /onToggleTag/, 'Must accept onToggleTag handler');
    assert.match(content, /tagCounts/, 'Must display tagCounts badge');
  });

  await t.test('Flashcards.jsx integrates batch selection, tag filters, and checkboxes', () => {
    const pagePath = path.resolve(__dirname, '../pages/Flashcards.jsx');
    const content = fs.readFileSync(pagePath, 'utf8');

    assert.match(content, /import useBatchSelection from '\.\.\/hooks\/useBatchSelection'/, 'Must import useBatchSelection');
    assert.match(content, /import TagFilterBar from '\.\.\/components\/flashcards\/TagFilterBar'/, 'Must import TagFilterBar');
    assert.match(content, /import BatchActionToolbar from '\.\.\/components\/flashcards\/BatchActionToolbar'/, 'Must import BatchActionToolbar');
    assert.match(content, /<TagFilterBar/, 'Must render TagFilterBar');
    assert.match(content, /<BatchActionToolbar/, 'Must render BatchActionToolbar');
    assert.match(content, /toggleSelect\(card\.id\)/, 'Must render checkbox toggle on cards');
  });
});
