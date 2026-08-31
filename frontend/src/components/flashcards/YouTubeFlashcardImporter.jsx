import React from 'react';
import YouTubeDeckModal from './YouTubeDeckModal';

export default function YouTubeFlashcardImporter({ isOpen, onClose, onImported }) {
  return <YouTubeDeckModal isOpen={isOpen} onClose={onClose} onImported={onImported} />;
}
