import { useCallback, useMemo, useState } from 'react';
import {
  STUDY_MODES,
  buildMixedDirections,
  getCardOrientation,
  shuffleRemaining,
} from '../utils/flashcardStudy';

/**
 * Study direction and shuffle state for a flashcard review session.
 * Cards stay as they are in the database; only what is shown changes.
 */
export default function useFlashcardSession({ cards, setCards, currentIndex, currentCard }) {
  const [mode, setModeState] = useState(STUDY_MODES.STANDARD);
  const [mixedDirections, setMixedDirections] = useState({});

  const setMode = useCallback(
    (nextMode) => {
      setModeState(nextMode);
      if (nextMode === STUDY_MODES.MIXED) {
        // Decide once per card so the direction doesn't change on re-render.
        setMixedDirections(buildMixedDirections(cards));
      }
    },
    [cards],
  );

  const toggleReverse = useCallback(() => {
    setMode(mode === STUDY_MODES.REVERSE ? STUDY_MODES.STANDARD : STUDY_MODES.REVERSE);
  }, [mode, setMode]);

  const shuffleDeck = useCallback(() => {
    setCards((prev) => shuffleRemaining(prev, currentIndex));
  }, [setCards, currentIndex]);

  const orientation = useMemo(
    () => getCardOrientation(currentCard, mode, mixedDirections),
    [currentCard, mode, mixedDirections],
  );

  return { mode, setMode, toggleReverse, shuffleDeck, ...orientation };
}
