/**
 * @fileoverview Service for parsing and normalizing external flashcard formats (CSV, JSON) into OpenPrep-AI schema.
 */
const csv = require('csv-parser'); // Assumed dependency, or use simple split for mock
const { Readable } = require('stream');

/**
 * Parses CSV buffer and normalizes into flashcard objects.
 */
async function parseCSV(buffer) {
    return new Promise((resolve, reject) => {
        const results = [];
        const stream = Readable.from(buffer);

        stream.pipe(csv())
            .on('data', (data) => {
                // Attempt to auto-detect columns
                const keys = Object.keys(data);
                const frontKey = keys.find(k => k.toLowerCase().includes('front') || k.toLowerCase().includes('question') || k.toLowerCase().includes('term')) || keys[0];
                const backKey = keys.find(k => k.toLowerCase().includes('back') || k.toLowerCase().includes('answer') || k.toLowerCase().includes('definition')) || keys[1];
                const tagKey = keys.find(k => k.toLowerCase().includes('tag') || k.toLowerCase().includes('deck'));

                if (data[frontKey] && data[backKey]) {
                    results.push({
                        front: data[frontKey].trim(),
                        back: data[backKey].trim(),
                        tags: tagKey && data[tagKey] ? data[tagKey].trim().split(',').map(t => t.trim()) : ['imported'],
                        difficulty: 'medium'
                    });
                }
            })
            .on('end', () => resolve(results))
            .on('error', reject);
    });
}

/**
 * Parses JSON buffer and normalizes into flashcard objects.
 */
async function parseJSON(buffer) {
    try {
        const data = JSON.parse(buffer.toString('utf-8'));
        const cards = Array.isArray(data) ? data : (data.cards || []);

        return cards.map(card => ({
            front: (card.front || card.question || card.term || '').trim(),
            back: (card.back || card.answer || card.definition || '').trim(),
            tags: card.tags || ['imported'],
            difficulty: card.difficulty || 'medium'
        })).filter(card => card.front && card.back);
    } catch (error) {
        throw new Error('Invalid JSON format.');
    }
}

/**
 * Detects and removes duplicate flashcards based on front text.
 */
function removeDuplicates(cards, existingFronts = new Set()) {
    const uniqueCards = [];
    let duplicateCount = 0;

    for (const card of cards) {
        if (!existingFronts.has(card.front)) {
            uniqueCards.push(card);
            existingFronts.add(card.front);
        } else {
            duplicateCount++;
        }
    }

    return { uniqueCards, duplicateCount };
}

module.exports = {
    parseCSV,
    parseJSON,
    removeDuplicates,
};
