/**
 * @fileoverview Service to index bidirectional note wiki-links and resolve knowledge graphs.
 */
const { Note, NoteLink, Subject } = require('../models');
const { Op } = require('sequelize');

/**
 * Extracts wiki-link target titles from markdown content.
 * Matches [[Note Title]] or [[Note Title|Display Name]].
 * @param {string} content - Markdown content
 * @returns {string[]} Unique note titles mentioned as wiki-links
 */
const extractWikiLinks = (content) => {
  if (!content) return [];
  const wikiLinkRegex = /\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g;
  const links = new Set();
  let match;
  while ((match = wikiLinkRegex.exec(content)) !== null) {
    links.add(match[1].trim());
  }
  return Array.from(links);
};

/**
 * Indexes wiki-links for a saved/updated note.
 * Parses content, queries for targets by title, and updates NoteLinks.
 * @param {string} sourceNoteId - Source note ID
 * @param {string} content - Note markdown content
 */
const indexNoteLinks = async (sourceNoteId, content) => {
  try {
    const targetTitles = extractWikiLinks(content);

    // Delete existing links originating from this source note
    await NoteLink.destroy({ where: { sourceNoteId } });

    if (targetTitles.length === 0) return;

    // Find notes matching these titles (case-insensitive title matches)
    const targetNotes = await Note.findAll({
      where: {
        title: {
          [Op.iLike]: {
            [Op.any]: targetTitles,
          },
        },
      },
      attributes: ['id'],
    });

    const linksToCreate = targetNotes
      .filter((n) => n.id !== sourceNoteId) // Avoid self-links
      .map((n) => ({
        sourceNoteId,
        targetNoteId: n.id,
      }));

    if (linksToCreate.length > 0) {
      await NoteLink.bulkCreate(linksToCreate, { ignoreDuplicates: true });
    }
  } catch (error) {
    console.error(`[noteGraphService] Failed to index links for note ${sourceNoteId}:`, error);
  }
};

/**
 * Resolves the force-directed graph representation of a user's knowledge web.
 * Nodes represent study notes, and edges represent bidirectional links.
 * @param {string} userId - Auth user ID
 * @returns {Promise<object>} Nodes and edges lists
 */
const getKnowledgeGraph = async (userId) => {
  try {
    // 1. Fetch user's notes
    const notes = await Note.findAll({
      where: { user: userId },
      attributes: ['id', 'title', 'category', 'subject'],
      include: [{ model: Subject, as: 'subjectRef', attributes: ['name'] }],
    });

    const noteIds = notes.map((n) => n.id);

    // 2. Fetch all links between user's notes
    const links = await NoteLink.findAll({
      where: {
        sourceNoteId: { [Op.in]: noteIds },
        targetNoteId: { [Op.in]: noteIds },
      },
    });

    // 3. Count backlinks per note to scale sizes
    const backlinkCounts = {};
    links.forEach((l) => {
      backlinkCounts[l.targetNoteId] = (backlinkCounts[l.targetNoteId] || 0) + 1;
    });

    // 4. Construct Nodes payload
    const nodes = notes.map((n) => ({
      id: n.id,
      label: n.title,
      category: n.category,
      subject: n.subjectRef?.name || 'Unassigned',
      val: (backlinkCounts[n.id] || 0) + 1.5, // minimum size
    }));

    // 5. Construct Edges payload
    const edges = links.map((l) => ({
      source: l.sourceNoteId,
      target: l.targetNoteId,
    }));

    return { nodes, edges };
  } catch (error) {
    console.error('[noteGraphService] Failed to generate knowledge graph:', error);
    throw error;
  }
};

module.exports = {
  extractWikiLinks,
  indexNoteLinks,
  getKnowledgeGraph,
};
