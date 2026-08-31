const { expect } = require('chai');
const { extractWikiLinks } = require('../../services/noteGraphService');

describe('Note Knowledge Graph & Wiki-Link Indexer', () => {
  describe('extractWikiLinks', () => {
    it('should correctly extract basic wiki-links', () => {
      const markdown = 'Today we discussed [[Thermodynamics]] and its applications.';
      const links = extractWikiLinks(markdown);
      expect(links).to.have.members(['Thermodynamics']);
    });

    it('should handle multiple unique wiki-links', () => {
      const markdown = 'Read about [[Thermodynamics]] in physics and [[Enthalpy]] in chemistry.';
      const links = extractWikiLinks(markdown);
      expect(links).to.have.members(['Thermodynamics', 'Enthalpy']);
    });

    it('should ignore duplicate wiki-links', () => {
      const markdown = 'Links: [[Enthalpy]], then [[Enthalpy]] again.';
      const links = extractWikiLinks(markdown);
      expect(links).to.deep.equal(['Enthalpy']);
    });

    it('should support wiki-links with custom display text (aliases)', () => {
      const markdown = 'Details on [[Thermodynamics|First Law of Thermo]] here.';
      const links = extractWikiLinks(markdown);
      expect(links).to.deep.equal(['Thermodynamics']);
    });

    it('should return an empty array if no wiki-links are present', () => {
      const markdown = 'Linear study note text with normal markdown links like [Google](https://google.com).';
      const links = extractWikiLinks(markdown);
      expect(links).to.be.an('array').that.is.empty;
    });
  });
});
