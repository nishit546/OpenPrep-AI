import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test('Mock Exam Print-Friendly Stylesheet and Offline Question Paper Generator', async (t) => {
  await t.test('print-exam.css contains required @media print rules and layout styling', () => {
    const cssPath = path.resolve(__dirname, '../styles/print-exam.css');
    assert.ok(fs.existsSync(cssPath), 'print-exam.css must exist');

    const content = fs.readFileSync(cssPath, 'utf8');
    assert.match(content, /@media print/, 'Must define @media print rules');
    assert.match(content, /columns:\s*2/, 'Must implement two-column layout');
    assert.match(content, /break-inside:\s*avoid/, 'Must prevent question split with break-inside avoid');
    assert.match(content, /page-break-inside:\s*avoid/, 'Must prevent question split with page-break-inside avoid');
    assert.match(content, /page-break-before:\s*always/, 'Must support forced page breaks for OMR and Answer Key');
    assert.match(content, /\.exam-header/, 'Must define .exam-header');
    assert.match(content, /\.exam-omr-sheet/, 'Must define .exam-omr-sheet');
    assert.match(content, /\.exam-answer-key/, 'Must define .exam-answer-key');
  });

  await t.test('PrintableExamModal.jsx implements required toggles and print actions', () => {
    const modalPath = path.resolve(__dirname, '../components/quiz/PrintableExamModal.jsx');
    assert.ok(fs.existsSync(modalPath), 'PrintableExamModal.jsx must exist');

    const content = fs.readFileSync(modalPath, 'utf8');
    assert.match(content, /includeHeader/, 'Must support includeHeader toggle');
    assert.match(content, /includeOmr/, 'Must support includeOmr toggle');
    assert.match(content, /includeAnswerKey/, 'Must support includeAnswerKey toggle');
    assert.match(content, /window\.print\(\)/, 'Must trigger window.print()');
    assert.match(content, /OFFICIAL OMR ANSWER SHEET|Attached OMR/, 'Must contain OMR bubble sheet layout');
    assert.match(content, /Examiner Answer Key/, 'Must contain answer key section');
  });

  await t.test('main.jsx imports print-exam.css', () => {
    const mainPath = path.resolve(__dirname, '../main.jsx');
    const content = fs.readFileSync(mainPath, 'utf8');
    assert.match(content, /import '\.\/styles\/print-exam\.css'/, 'main.jsx must import print-exam.css');
  });
});
