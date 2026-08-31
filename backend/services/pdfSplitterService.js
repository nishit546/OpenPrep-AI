const { PDFDocument } = require('pdf-lib');
const admZip = require('adm-zip');

/**
 * Splits a master PDF document into a set of selected chapter sub-documents.
 * 
 * @param {Buffer} pdfBuffer - Master PDF file buffer
 * @param {Array<{ id?: string, title: string, startPage: number, endPage: number }>} selectedChapters
 * @returns {Promise<Array<{ title: string, startPage: number, endPage: number, pageCount: number, buffer: Buffer, filename: string }>>}
 */
async function splitPdfIntoChapters(pdfBuffer, selectedChapters = []) {
  if (!selectedChapters || selectedChapters.length === 0) {
    throw new Error('No chapters specified for splitting.');
  }

  const srcDoc = await PDFDocument.load(pdfBuffer, { ignoreEncryption: true });
  const totalPages = srcDoc.getPageCount();
  const splitResults = [];

  for (const chapter of selectedChapters) {
    const startIdx = Math.max(0, (parseInt(chapter.startPage, 10) || 1) - 1);
    const endIdx = Math.min(totalPages - 1, (parseInt(chapter.endPage, 10) || totalPages) - 1);

    if (startIdx > endIdx) {
      continue;
    }

    // Create a new sub-PDF document
    const subDoc = await PDFDocument.create();
    
    // Create array of zero-based page indices
    const pageIndices = [];
    for (let i = startIdx; i <= endIdx; i++) {
      pageIndices.push(i);
    }

    const copiedPages = await subDoc.copyPages(srcDoc, pageIndices);
    copiedPages.forEach((page) => subDoc.addPage(page));

    const subPdfBytes = await subDoc.save();
    const cleanTitle = (chapter.title || `Chapter_${startIdx + 1}`).replace(/[^a-zA-Z0-9_-]/g, '_');
    const filename = `${cleanTitle}_pages_${startIdx + 1}-${endIdx + 1}.pdf`;

    splitResults.push({
      title: chapter.title || `Pages ${startIdx + 1}-${endIdx + 1}`,
      startPage: startIdx + 1,
      endPage: endIdx + 1,
      pageCount: pageIndices.length,
      buffer: Buffer.from(subPdfBytes),
      filename,
    });
  }

  return splitResults;
}

/**
 * Packages multiple split chapter PDFs into a single downloadable .zip archive.
 * 
 * @param {Array<{ filename: string, buffer: Buffer }>} splitChapters
 * @returns {Buffer} ZIP archive buffer
 */
function createSplitZipArchive(splitChapters) {
  const zip = new admZip();
  for (const ch of splitChapters) {
    zip.addFile(ch.filename, ch.buffer);
  }
  return zip.toBuffer();
}

module.exports = {
  splitPdfIntoChapters,
  createSplitZipArchive,
};
