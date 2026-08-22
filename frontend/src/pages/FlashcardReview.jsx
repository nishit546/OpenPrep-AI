import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useDrag } from '@use-gesture/react';
import {
  Brain,
  ArrowLeft,
  RotateCw,
  CheckCircle2,
  Volume2,
  VolumeX,
  AlertCircle,
  Settings,
  FileAudio,
  Keyboard,
} from 'lucide-react';
import MathRenderer from '../components/common/MathRenderer';
import API from '../services/api';
import useVoiceControl from '../hooks/useVoiceControl';
import VoiceModeToggle from '../components/VoiceModeToggle';
import AudioWaveform from '../components/AudioWaveform';
import GenerateFlashcardsFromAudioModal from '../components/dashboard/GenerateFlashcardsFromAudioModal';
import RemediationQuizModal from '../components/flashcards/RemediationQuizModal';
import KeyboardShortcutsModal from '../components/flashcards/KeyboardShortcutsModal';
import PomodoroTimer from '../components/dashboard/PomodoroTimer';
const STORAGE_KEY = 'flashcardReviewSession';
const SESSION_TTL_MS = 24 * 60 * 60 * 1000;

const putWithRetry = async (url, payload, attempts = 3, delayMs = 500) => {
  try {
    return await API.put(url, payload);
  } catch (err) {
    if (attempts <= 1) throw err;
    await new Promise((resolve) => setTimeout(resolve, delayMs));
    return putWithRetry(url, payload, attempts - 1, delayMs * 2);
  }
};

const persistSession = (session) => {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ ...session, savedAt: Date.now() }));
  } catch {
    // Storage may be unavailable (private browsing / quota) - session just won't resume.
  }
};

const restoreSession = () => {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.cards) || parsed.cards.length === 0) return null;
    if (parsed.currentIndex >= parsed.cards.length) return null;
    if (Date.now() - (parsed.savedAt || 0) > SESSION_TTL_MS) return null;
    return parsed;
  } catch {
    return null;
  }
};

const clearSession = () => {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore storage errors.
  }
};

const FlashcardReview = () => {
  const navigate = useNavigate();

  const [showVideoModal, setShowVideoModal] = useState(false);
  const [videoUrl, setVideoUrl] = useState('');
  const [videoStart, setVideoStart] = useState(0);

  const handleOpenVideo = (url, start) => {
    setVideoUrl(url);
    setVideoStart(start);
    setShowVideoModal(true);
  };

  const getYouTubeId = (url) => {
    if (!url) return '';
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : '';
  };

  const formatSeconds = (totalSeconds) => {
    if (!totalSeconds) return '0:00';
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const [userSettings, setUserSettings] = useState({
    sm2EasyFactorModifier: 1.0,
    sm2IntervalModifier: 1.0,
    sm2Step1Interval: 1,
    sm2Step2Interval: 6,
  });

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isKeyboardHelpOpen, setIsKeyboardHelpOpen] = useState(false);
  const [isAudioGeneratorOpen, setIsAudioGeneratorOpen] = useState(false);
  const [modalSettings, setModalSettings] = useState(userSettings);
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  useEffect(() => {
    const fetchUserSettings = async () => {
      try {
        const res = await API.get('/auth/me');
        if (res.data?.success && res.data?.user) {
          const u = res.data.user;
          setUserSettings({
            sm2EasyFactorModifier: u.sm2EasyFactorModifier ?? 1.0,
            sm2IntervalModifier: u.sm2IntervalModifier ?? 1.0,
            sm2Step1Interval: u.sm2Step1Interval ?? 1,
            sm2Step2Interval: u.sm2Step2Interval ?? 6,
          });
        }
      } catch (err) {
        console.error("Failed to load user settings", err);
      }
    };
    fetchUserSettings();
  }, []);

  useEffect(() => {
    if (isSettingsOpen) {
      setModalSettings(userSettings);
    }
  }, [isSettingsOpen, userSettings]);

  const handleSaveSettings = async () => {
    setIsSavingSettings(true);
    try {
      const res = await API.put('/auth/sm2-settings', modalSettings);
      if (res.data?.success) {
        setUserSettings(modalSettings);
        setIsSettingsOpen(false);
      }
    } catch (err) {
      console.error("Failed to save SM-2 settings", err);
      alert("Failed to save settings. Please try again.");
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleResetSettings = async () => {
    setIsSavingSettings(true);
    try {
      const res = await API.post('/auth/sm2-settings/reset');
      if (res.data?.success) {
        const defaults = {
          sm2EasyFactorModifier: 1.0,
          sm2IntervalModifier: 1.0,
          sm2Step1Interval: 1,
          sm2Step2Interval: 6,
        };
        setUserSettings(defaults);
        setModalSettings(defaults);
        setIsSettingsOpen(false);
      }
    } catch (err) {
      console.error("Failed to reset SM-2 settings", err);
      alert("Failed to reset settings. Please try again.");
    } finally {
      setIsSavingSettings(false);
    }
  };

  const [savedSession] = useState(restoreSession);

  const [cards, setCards] = useState(() => savedSession?.cards || []);
  const [currentIndex, setCurrentIndex] = useState(() => savedSession?.currentIndex || 0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [loading, setLoading] = useState(() => !savedSession);
  const [error, setError] = useState(null);

  // Session Stats
  const [sessionStats, setSessionStats] = useState(() => savedSession?.sessionStats || {
    reviewed: 0,
    mastered: 0, // quality >= 4
    hard: 0, // quality < 3
  });

  // Track individual failed cards for remediation quiz generation
  const [failedCards, setFailedCards] = useState(() => savedSession?.failedCards || []);
  const failedCardsRef = useRef(failedCards);

  const [speechRate, setSpeechRate] = useState(1);
const [speechLanguage, setSpeechLanguage] = useState('en-US');
const [voiceAnswer, setVoiceAnswer] = useState('');
const [voiceAnswerFeedback, setVoiceAnswerFeedback] = useState(null);
const [isVoiceAnswerListening, setIsVoiceAnswerListening] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const submittingRef = useRef(false);
  const reviewCardIdRef = useRef(null);
  const isMountedRef = useRef(true);
  const sessionStatsRef = useRef(sessionStats);

  const fetchDueCards = async () => {
    try {
      const res = await API.get('/flashcards?dueOnly=true&limit=100'); // Fetch a batch of due cards
      const fetchedCards = res.data.data || [];
      setCards(fetchedCards);

      // Update IndexedDB cache for offline access
      if (fetchedCards.length > 0) {
        await db.cachedFlashcards.clear();
        await db.cachedFlashcards.bulkPut(fetchedCards);
      }
      setLoading(false);
    } catch (err) {
      console.warn('Failed to fetch due flashcards from server, checking local IndexedDB cache...', err);
      try {
        const cached = await db.cachedFlashcards.toArray();
        if (cached && cached.length > 0) {
          setCards(cached);
          setLoading(false);
        } else {
          setError('Failed to fetch due flashcards and no offline cache available.');
          setLoading(false);
        }
      } catch (dbErr) {
        console.error('Failed to read from IndexedDB cache:', dbErr);
        setError('Failed to fetch due flashcards.');
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    if (!savedSession) {
      fetchDueCards();
    }
  }, [savedSession]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const currentCard = cards[currentIndex];
  const isSessionComplete = !loading && cards.length > 0 && currentIndex >= cards.length;
  const noCardsDue = !loading && cards.length === 0;

  const lastFlipTimeRef = useRef(0);

  const handleCardFlip = useCallback((e) => {
    const now = Date.now();
    if (now - lastFlipTimeRef.current < 250) {
      if (e && e.preventDefault) e.preventDefault();
      return;
    }
    lastFlipTimeRef.current = now;
    setIsFlipped((prev) => !prev);
  }, []);

  const handleReview = useCallback(async (quality) => {
    if (!currentCard || submittingRef.current) return;

    submittingRef.current = true;
    reviewCardIdRef.current = currentCard.id;
    setSubmitting(true);
    setSaveError(null);

    try {
      // Persist the rating server-side or queue it in IndexedDB for offline use.
      const syncResult = await offlineSyncService.queueReview(currentCard.id, quality);

      if (syncResult && syncResult.failed > 0 && syncResult.reason && syncResult.reason.startsWith('dropped-')) {
        setSaveError(`Failed to save: ${syncResult.reason}`);
      }

      // Ignore stale resolutions: never apply an update after the component
      // unmounted or when a different card is now being reviewed. Out-of-order
      // network responses must not overwrite newer SM-2 intervals.
      if (!isMountedRef.current || reviewCardIdRef.current !== currentCard.id) {
        return;
      }

      const nextIndex = currentIndex + 1;
      const nextStats = {
        reviewed: sessionStatsRef.current.reviewed + 1,
        mastered: sessionStatsRef.current.mastered + (quality >= 4 ? 1 : 0),
        hard: sessionStatsRef.current.hard + (quality < 3 ? 1 : 0),
      };

      // Track failed cards for remediation quiz
      if (quality < 3 && currentCard) {
        const failedEntry = { id: currentCard.id, front: currentCard.front, back: currentCard.back };
        const nextFailed = [...failedCardsRef.current, failedEntry];
        failedCardsRef.current = nextFailed;
        setFailedCards(nextFailed);
      }

      sessionStatsRef.current = nextStats;
      setSessionStats(nextStats);
      setCurrentIndex(nextIndex);
      setIsFlipped(false);
      persistSession({ cards, currentIndex: nextIndex, sessionStats: nextStats, failedCards: failedCardsRef.current });
    } catch (err) {
      if (!isMountedRef.current) return;
      console.error("Failed to update flashcard", err);
      setSaveError('Could not save this rating. Check your connection and try again.');
    } finally {
      submittingRef.current = false;
      reviewCardIdRef.current = null;
      if (isMountedRef.current) setSubmitting(false);
    }
  }, [cards, currentIndex, currentCard]);

  const handleExit = useCallback(() => {
    clearSession();
    navigate('/dashboard');
  }, [navigate]);

  const handleVoiceCommand = useCallback((command) => {
    if (command === 'FLIP' && !isFlipped) {
      handleCardFlip();
    } else if (isFlipped) {
      if (command === 'RATE_0') handleReview(0);
      else if (command === 'RATE_1') handleReview(1);
      else if (command === 'RATE_2') handleReview(2);
      else if (command === 'RATE_3') handleReview(3);
      else if (command === 'RATE_4') handleReview(4);
      else if (command === 'RATE_5') handleReview(5);
    }
  }, [isFlipped, handleCardFlip, handleReview]);
const extractAnswerKeywords = useCallback((text) => {
  return String(text || '')
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length >= 4)
    .filter(
      (word, index, words) =>
        words.indexOf(word) === index
    );
}, []);

const validateVoiceAnswer = useCallback(
  (transcript) => {
    if (!currentCard?.back || !transcript) return;

    const expectedKeywords = extractAnswerKeywords(currentCard.back);
    const spokenWords = new Set(extractAnswerKeywords(transcript));

    if (expectedKeywords.length === 0) return;

    const matchedKeywords = expectedKeywords.filter((word) =>
      spokenWords.has(word)
    );

    const matchPercentage =
      matchedKeywords.length / expectedKeywords.length;

    if (matchPercentage >= 0.35) {
      setVoiceAnswerFeedback({
        type: 'success',
        message: 'Answer matched. Flipping to the next card.',
      });

      setTimeout(() => {
        if (!isFlipped) {
          handleCardFlip();
        }
      }, 500);
    } else {
      setVoiceAnswerFeedback({
        type: 'retry',
        message: 'I could not match that answer. Try again or flip the card manually.',
      });
    }
  },
  [currentCard, extractAnswerKeywords, handleCardFlip, isFlipped]
);
const {
  isSupported,
  isEnabled,
  isPaused,
  status,
  errorMsg,
  toggleVoiceMode,
  speak,
  cancelSpeech,
  supportedLanguages,
} = useVoiceControl({    onCommand: handleVoiceCommand,
    onTranscript: (transcript) => {
      if (!isFlipped) return;

      setVoiceAnswer(transcript);
      setIsVoiceAnswerListening(false);
      validateVoiceAnswer(transcript);
    },
    speechRate,
    language: speechLanguage,
  });
const isSpeaking = status === 'SPEAKING';
const isListeningForAnswer =
  isEnabled && isFlipped && status === 'LISTENING';

useEffect(() => {
  setIsVoiceAnswerListening(isListeningForAnswer);
}, [isListeningForAnswer]);const microphoneUnavailable =
  isEnabled &&
  (status === 'ERROR' ||
    errorMsg?.toLowerCase().includes('microphone'));
  // Cancel speech synthesis when card or flip state changes
  const speechKey = `${currentIndex}:${isFlipped}`;
  useEffect(() => {
  setVoiceAnswer('');
  setVoiceAnswerFeedback(null);
  setIsVoiceAnswerListening(false);
}, [currentIndex, isFlipped]);
  useEffect(() => {
    cancelSpeech();
    if (isEnabled && !isPaused && currentCard) {
       const textToRead = isFlipped ? currentCard.back : currentCard.front;
       speak(textToRead);
    }
  }, [speechKey, isEnabled, isPaused, currentCard, speak, cancelSpeech]);

  const handleSpeak = (e) => {
    e.stopPropagation();
    if (isSpeaking) {
      cancelSpeech();
    } else {
      const textToRead = isFlipped ? currentCard?.back : currentCard?.front;
      speak(textToRead);
    }
  };

  const handleRateToggle = (e) => {
    e.stopPropagation();
    const rates = [0.75, 1, 1.25];
    const nextIndex = (rates.indexOf(speechRate) + 1) % rates.length;
    const nextRate = rates[nextIndex];
    setSpeechRate(nextRate);

    if (isSpeaking) {
      cancelSpeech();
      setTimeout(() => {
        const textToRead = isFlipped ? currentCard?.back : currentCard?.front;
        speak(textToRead); // Will use the newly set rate implicitly because hook deps update
      }, 50);
    }
  };

  // Comprehensive Keyboard Navigation Support
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Input guard: ignore shortcuts if typing inside text inputs or editable areas
      const activeEl = document.activeElement;
      const isInputActive =
        activeEl &&
        (['INPUT', 'TEXTAREA', 'SELECT'].includes(activeEl.tagName) || activeEl.isContentEditable);
      if (isInputActive) return;

      // Question mark (?) to toggle keyboard shortcuts modal
      if (e.key === '?' || (e.shiftKey && e.key === '/')) {
        e.preventDefault();
        setIsKeyboardHelpOpen((prev) => !prev);
        return;
      }

      // Escape to close open modals or exit review session
      if (e.key === 'Escape') {
        e.preventDefault();
        if (isKeyboardHelpOpen) {
          setIsKeyboardHelpOpen(false);
        } else if (isSettingsOpen) {
          setIsSettingsOpen(false);
        } else if (isAudioGeneratorOpen) {
          setIsAudioGeneratorOpen(false);
        } else {
          handleExit();
        }
        return;
      }

      // Space or Enter to flip card front/back
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        handleCardFlip();
        return;
      }

      // ArrowRight or 'n' / 'N' to skip to Next Card
      if (e.key === 'ArrowRight' || e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        if (currentIndex < cards.length - 1) {
          setCurrentIndex((prev) => prev + 1);
          setIsFlipped(false);
        }
        return;
      }

      // ArrowLeft or 'p' / 'P' to go back to Previous Card
      if (e.key === 'ArrowLeft' || e.key === 'p' || e.key === 'P') {
        e.preventDefault();
        if (currentIndex > 0) {
          setCurrentIndex((prev) => prev - 1);
          setIsFlipped(false);
        }
        return;
      }

      // 0-5 keys for rating (only when card is flipped)
      if (isFlipped && ['0', '1', '2', '3', '4', '5'].includes(e.key)) {
        e.preventDefault();
        handleReview(parseInt(e.key, 10));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    isFlipped,
    isKeyboardHelpOpen,
    isSettingsOpen,
    isAudioGeneratorOpen,
    currentIndex,
    cards.length,
    handleCardFlip,
    handleReview,
    handleExit,
  ]);

  // Persist the latest checkpoint when the tab is closed or refreshed.
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (cards.length > 0 && currentIndex > 0 && currentIndex < cards.length) {
        persistSession({ cards, currentIndex, sessionStats: sessionStatsRef.current });
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [cards, currentIndex]);

  // Clear the saved session once the queue is finished.
  useEffect(() => {
    if (isSessionComplete || noCardsDue) {
      clearSession();
    }
  }, [isSessionComplete, noCardsDue]);
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500 mb-4"></div>
        <p className="text-neutral-500 dark:text-neutral-400">Loading your review queue...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col items-center justify-center p-4">
        <p className="text-red-500 mb-4">{error}</p>
        <button onClick={handleExit} className="px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700">
          Back to Dashboard
        </button>
      </div>
    );
  }
  // --- Session Summary Screen ---
  if (isSessionComplete || noCardsDue) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 py-12 px-4 flex flex-col items-center">
        <button 
          onClick={handleExit} 
          className="absolute top-6 left-6 flex items-center text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-100 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 mr-1" />
          Dashboard
        </button>

        <div className="w-full max-w-lg mt-12 bg-white dark:bg-slate-800 rounded-xl shadow-xl p-8 flex flex-col items-center border border-neutral-200 dark:border-slate-700">
          <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-6">
            <CheckCircle2 className="w-10 h-10 text-green-600 dark:text-green-400" />
          </div>
          <h2 className="text-3xl font-bold font-inter text-neutral-800 dark:text-neutral-100 mb-2 text-center">
            {noCardsDue ? "You're All Caught Up!" : "Session Complete"}
          </h2>
          <p className="text-neutral-500 dark:text-neutral-400 text-center mb-8">
            {noCardsDue 
              ? "There are no flashcards due for review right now. Great job staying on top of your studies!" 
              : "Excellent work! You've completed your spaced repetition review queue for now."}
          </p>

          {!noCardsDue && (
            <div className="w-full grid grid-cols-3 gap-4 mb-8">
              <div className="bg-slate-50 dark:bg-slate-700/50 p-4 rounded-lg text-center">
                <div className="text-2xl font-bold text-primary-600 dark:text-primary-400">{sessionStats.reviewed}</div>
                <div className="text-xs text-neutral-500 uppercase tracking-wider mt-1">Reviewed</div>
              </div>
              <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg text-center border border-green-100 dark:border-green-800/30">
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">{sessionStats.mastered}</div>
                <div className="text-xs text-green-600/70 dark:text-green-400/70 uppercase tracking-wider mt-1">Mastered</div>
              </div>
              <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-lg text-center border border-orange-100 dark:border-orange-800/30">
                <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">{sessionStats.hard}</div>
                <div className="text-xs text-orange-600/70 dark:text-orange-400/70 uppercase tracking-wider mt-1">Hard</div>
              </div>
            </div>
          )}

          {/* Remediation quiz banner — shown when ≥30% cards failed and we have a deckId */}
          {!noCardsDue && cards[0]?.subject && (
            <RemediationQuizModal
              deckId={cards[0].subject}
              failedCards={failedCards}
              totalReviewed={sessionStats.reviewed}
              onDismiss={() => {}}
            />
          )}

          <div className="flex gap-4">
            <button 
              onClick={handleExit}
              className="px-6 py-3 bg-neutral-200 dark:bg-slate-700 text-neutral-800 dark:text-neutral-200 font-semibold rounded-lg hover:bg-neutral-300 dark:hover:bg-slate-600 transition-colors"
            >
              Go to Dashboard
            </button>
            {noCardsDue && (
              <>
                <button 
                  onClick={() => navigate('/pyqs')}
                  className="px-6 py-3 bg-primary-600 text-white font-semibold rounded-lg hover:bg-primary-700 transition-colors flex items-center"
                >
                  <Brain className="w-5 h-5 mr-2" />
                  Generate More
                </button>
                <button
                  onClick={() => setIsAudioGeneratorOpen(true)}
                  className="px-6 py-3 bg-primary-600 text-white font-semibold rounded-lg hover:bg-primary-700 transition-colors flex items-center"
                >
                  <FileAudio className="w-5 h-5 mr-2" />
                  Create from Audio
                </button>
              </>
            )}
          </div>
          {isAudioGeneratorOpen && (
            <GenerateFlashcardsFromAudioModal
              onClose={() => setIsAudioGeneratorOpen(false)}
              onImported={async () => {
                setIsAudioGeneratorOpen(false);
                setLoading(true);
                setError(null);
                await fetchDueCards();
              }}
            />
          )}
        </div>
      </div>
    );
  }

  // --- Active Review Queue Screen ---
  const progressPercent = Math.round((currentIndex / cards.length) * 100);

  const bind = useDrag(({ down, movement: [mx], cancel }) => {
    if (down && Math.abs(mx) > 120) {
      cancel();
      if (mx < 0) {
        // Swipe Left
        if (!isFlipped) handleCardFlip();
        else handleReview(1); // Mark as Wrong
      } else {
        // Swipe Right
        if (!isFlipped) handleCardFlip();
        else handleReview(5); // Mark as Easy
      }
    }
  });

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 py-6 px-4 flex flex-col items-center">
      {/* Pomodoro Timer Toggle */}
      <div className="fixed bottom-4 right-4 z-50 transform scale-50 origin-bottom-right hover:scale-75 transition-transform duration-300">
        <PomodoroTimer />
      </div>

      {/* Header */}
      <div className="w-full max-w-3xl flex justify-between items-center mb-8">
        <button 
          onClick={handleExit} 
          className="flex items-center text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-100 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 mr-1" />
          Exit Session
        </button>
        <div className="flex items-center gap-2 text-neutral-600 dark:text-neutral-300 font-medium">
          <Brain className="w-5 h-5 text-primary-500" />
          <span>SM-2 Review Queue</span>
        </div>
        <div className="flex items-center gap-3">
          <AudioWaveform status={status} />
<VoiceModeToggle
  isSupported={isSupported}
  isEnabled={isEnabled}
  isPaused={isPaused}
  toggleVoiceMode={toggleVoiceMode}
  errorMsg={errorMsg}
  status={status}
  speechRate={speechRate}
  onSpeechRateChange={setSpeechRate}
  language={speechLanguage}
  onLanguageChange={setSpeechLanguage}
  supportedLanguages={supportedLanguages}
/>          <div className="text-sm font-semibold text-neutral-500 dark:text-neutral-400 border-l border-neutral-300 dark:border-slate-700 pl-3">
            {currentIndex + 1} <span className="text-neutral-300 dark:text-neutral-600">/</span> {cards.length}
          </div>
          <button
            onClick={() => setIsKeyboardHelpOpen(true)}
            aria-keyshortcuts="?"
            aria-label="Keyboard Shortcuts Guide (?)"
            className="p-1.5 rounded-full hover:bg-neutral-200 dark:hover:bg-slate-800 text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-100 transition-colors"
            title="Keyboard Shortcuts Guide (?)"
          >
            <Keyboard className="w-5 h-5" />
          </button>
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="p-1.5 rounded-full hover:bg-neutral-200 dark:hover:bg-slate-800 text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-100 transition-colors"
            title="SM-2 Settings"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </div>
{isEnabled && isFlipped && (
  <div
    className="w-full max-w-2xl mt-4 rounded-lg border border-primary-200 dark:border-primary-900/50 bg-primary-50 dark:bg-primary-950/20 p-4"
    aria-live="polite"
  >
    <div className="flex items-center justify-between gap-3">
      <div>
        <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">
          Voice answer
        </p>

        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
          Speak your answer clearly. OpenPrep will compare it with the
          key concepts on the back of the card.
        </p>
      </div>

      <div
        className={`w-3 h-3 rounded-full shrink-0 ${
          isVoiceAnswerListening
            ? 'bg-red-500 animate-pulse'
            : 'bg-neutral-300 dark:bg-slate-600'
        }`}
        aria-label={
          isVoiceAnswerListening
            ? 'Microphone is listening'
            : 'Microphone is not listening'
        }
      />
    </div>

    {voiceAnswer && (
      <p className="mt-3 text-sm text-neutral-700 dark:text-neutral-300">
        <span className="font-semibold">Heard:</span> {voiceAnswer}
      </p>
    )}

    {voiceAnswerFeedback && (
      <p
        className={`mt-2 text-xs font-medium ${
          voiceAnswerFeedback.type === 'success'
            ? 'text-green-600 dark:text-green-400'
            : 'text-amber-600 dark:text-amber-400'
        }`}
      >
        {voiceAnswerFeedback.message}
      </p>
    )}

    {microphoneUnavailable && (
      <div className="mt-3 rounded-md bg-red-50 dark:bg-red-950/30 p-3 text-xs text-red-600 dark:text-red-400">
        <p className="font-semibold">
          Microphone access is unavailable.
        </p>
        <p className="mt-1">
          You can still flip the card and use the normal rating buttons.
          Check your browser microphone permission if you want to use
          voice answers.
        </p>
      </div>
    )}
  </div>
)}
      {/* Progress Bar */}
      <div className="w-full max-w-3xl h-1.5 bg-neutral-200 dark:bg-slate-800 rounded-full mb-12 overflow-hidden">
        <motion.div 
          className="h-full bg-primary-500 rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${progressPercent}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>

      {/* Flashcard Area */}
      <div className="w-full max-w-3xl flex-1 flex flex-col items-center justify-start perspective-1000 mb-20 select-none touch-action-manipulation">
        <AnimatePresence mode="wait">
          <motion.div
            {...bind()}
            key={currentCard.id}
            className="w-full max-w-2xl min-h-[22rem] sm:h-80 relative preserve-3d cursor-pointer group"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0, rotateY: isFlipped ? 180 : 0 }}
            exit={{ opacity: 0, x: -100, transition: { duration: 0.2 } }}
            transition={{ duration: 0.6, type: 'spring', stiffness: 200, damping: 20 }}
            style={{
              transformStyle: 'preserve-3d',
              WebkitTransformStyle: 'preserve-3d',
              willChange: 'transform',
              WebkitTapHighlightColor: 'transparent',
              touchAction: 'manipulation',
              userSelect: 'none',
              WebkitUserSelect: 'none',
            }}
            onClick={() => !isFlipped && handleCardFlip()}
          >
            {/* Front */}
            <div
              className={`absolute inset-0 bg-white dark:bg-slate-800 shadow-xl border border-neutral-200 dark:border-slate-700 rounded-2xl p-4 sm:p-8 flex flex-col justify-center items-center backface-hidden ${isFlipped ? 'pointer-events-none' : ''}`}
              style={{
                backfaceVisibility: 'hidden',
                WebkitBackfaceVisibility: 'hidden',
                WebkitTapHighlightColor: 'transparent',
                transformStyle: 'preserve-3d',
                WebkitTransformStyle: 'preserve-3d',
                isolation: 'isolate',
              }}
            >
              <div className="absolute top-4 left-6 flex items-center gap-2 text-xs font-bold text-neutral-400 uppercase tracking-widest">
                <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                Question
              </div>
              
              <div className="absolute top-4 right-4 flex items-center gap-1 z-10">
                <button
                  type="button"
                  onClick={handleRateToggle}
                  className="px-2 py-1 text-[11px] font-semibold text-neutral-600 dark:text-neutral-300 bg-neutral-100 dark:bg-slate-700 hover:bg-neutral-200 dark:hover:bg-slate-600 rounded transition-colors"
                >
                  {speechRate}x
                </button>
                <button
                  type="button"
                  onClick={handleSpeak}
                  className={`p-2 rounded-full transition-colors ${
                    isSpeaking && !isFlipped
                      ? 'text-primary-600 bg-primary-50 dark:bg-primary-900/30 animate-pulse'
                      : 'text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-slate-700'
                  }`}
                >
                  {isSpeaking && !isFlipped ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </button>
              </div>

              <h3 className="text-2xl md:text-3xl font-bold font-inter text-neutral-800 dark:text-neutral-100 text-center leading-snug">
                <MathRenderer text={currentCard.front} />
              </h3>
              
              <div className="absolute bottom-6 flex items-center text-sm font-medium text-neutral-400 opacity-70 group-hover:opacity-100 transition-opacity">
                <RotateCw className="w-4 h-4 mr-2" />
                Click or press Space to reveal answer
              </div>

              {currentCard.sourceUrl && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenVideo(currentCard.sourceUrl, currentCard.timestampSeconds);
                  }}
                  className="absolute bottom-4 left-6 flex items-center gap-1 px-2.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold shadow-md transition z-30 cursor-pointer"
                >
                  <Play className="w-3 h-3 fill-white" />
                  Video Reference ({formatSeconds(currentCard.timestampSeconds)})
                </button>
              )}
            </div>

            {/* Back */}
            <div
              className={`absolute inset-0 bg-primary-50 dark:bg-primary-900/10 shadow-xl border border-primary-200 dark:border-primary-800/50 rounded-2xl p-4 sm:p-8 flex flex-col items-center overflow-y-auto backface-hidden ${!isFlipped ? 'pointer-events-none' : ''}`}
              style={{
                backfaceVisibility: 'hidden',
                WebkitBackfaceVisibility: 'hidden',
                WebkitTapHighlightColor: 'transparent',
                transformStyle: 'preserve-3d',
                WebkitTransformStyle: 'preserve-3d',
                transform: 'rotateY(180deg)',
                WebkitTransform: 'rotateY(180deg)',
                isolation: 'isolate',
              }}
            >
              <div className="w-full flex justify-between items-center mb-6">
                <div className="flex items-center gap-2 text-xs font-bold text-primary-600 dark:text-primary-400 uppercase tracking-widest">
                  <span className="w-2 h-2 rounded-full bg-primary-500"></span>
                  Answer
                </div>
                <div className="flex items-center gap-1 z-10">
                  <button
                    type="button"
                    onClick={handleRateToggle}
                    className="px-2 py-1 text-[11px] font-semibold text-primary-700 dark:text-primary-300 bg-primary-100/50 dark:bg-primary-800/30 hover:bg-primary-200/50 dark:hover:bg-primary-700/50 rounded transition-colors"
                  >
                    {speechRate}x
                  </button>
                  <button
                    type="button"
                    onClick={handleSpeak}
                    className={`p-2 rounded-full transition-colors ${
                      isSpeaking && isFlipped
                        ? 'text-primary-700 bg-primary-200/50 dark:bg-primary-800/50 dark:text-primary-200 animate-pulse'
                        : 'text-primary-600 hover:text-primary-800 dark:text-primary-400 dark:hover:text-primary-200 hover:bg-primary-100/50 dark:hover:bg-primary-800/30'
                    }`}
                  >
                    {isSpeaking && isFlipped ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex-1 w-full flex flex-col items-center justify-center">
                <p className="text-xl md:text-2xl text-neutral-800 dark:text-neutral-200 font-inter leading-relaxed text-center">
                  <MathRenderer text={currentCard.back} />
                </p>
                {currentCard.sourceUrl && currentCard.timestampSeconds !== undefined && currentCard.timestampSeconds !== null && (
                  <a 
                    href={`${currentCard.sourceUrl}&t=${currentCard.timestampSeconds}s`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-6 flex items-center gap-2 px-4 py-2 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-full text-sm font-medium hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
                  >
                    <Video className="w-4 h-4" />
                    Jump to Video ({Math.floor(currentCard.timestampSeconds / 60)}:{(currentCard.timestampSeconds % 60).toString().padStart(2, '0')})
                  </a>
                )}
              </div>

              {currentCard.sourceUrl && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenVideo(currentCard.sourceUrl, currentCard.timestampSeconds);
                  }}
                  className="absolute bottom-4 left-6 flex items-center gap-1 px-2.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold shadow-md transition z-30 cursor-pointer"
                >
                  <Play className="w-3 h-3 fill-white" />
                  Video Reference ({formatSeconds(currentCard.timestampSeconds)})
                </button>
              )}
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Grading Controls (Only visible when flipped) */}
        <div className={`mt-12 w-full max-w-2xl transition-all duration-500 ${isFlipped ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}>
          {saveError && (
            <div className="mb-4 flex items-center justify-between gap-3 px-4 py-2 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-sm">
              <span className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {saveError}
              </span>
              <button
                type="button"
                onClick={() => setSaveError(null)}
                className="font-semibold underline whitespace-nowrap"
              >
                Dismiss
              </button>
            </div>
          )}
          <div className="text-center text-sm font-medium text-neutral-500 dark:text-neutral-400 mb-4">
            How well did you know this?
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
            {[
              { val: 0, label: 'Blackout', color: 'bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800/50' },
              { val: 1, label: 'Wrong',    color: 'bg-orange-100 text-orange-700 hover:bg-orange-200 dark:bg-orange-900/30 dark:text-orange-400 border-orange-200 dark:border-orange-800/50' },
              { val: 2, label: 'Hard',     color: 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800/50' },
              { val: 3, label: 'Medium',   color: 'bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800/50' },
              { val: 4, label: 'Good',     color: 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800/50' },
              { val: 5, label: 'Easy',     color: 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/50' },
            ].map(btn => (
              <button
                key={btn.val}
                aria-label={`${btn.label} (Key ${btn.val})`}
                aria-keyshortcuts={`${btn.val}`}
                disabled={submitting}
                onClick={() => handleReview(btn.val)}
                className={`py-3 px-2 rounded-xl border flex flex-col items-center justify-center transition-all hover:scale-105 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed ${btn.color}`}
              >
                <span className="font-bold text-lg mb-0.5">{btn.val}</span>
                <span className="text-[10px] uppercase tracking-wider font-semibold opacity-80">{btn.label}</span>
                <span className="mt-1 px-1.5 py-0.5 text-[9px] font-mono rounded bg-black/10 dark:bg-white/10 opacity-70">
                  [{btn.val}]
                </span>
              </button>
            ))}
          </div>
          <div className="text-center mt-4 text-xs text-neutral-400">
            Pro tip: You can also use numbers 0-5 on your keyboard.
          </div>
        </div>
      </div>

      {/* Settings Modal (Mobile & Desktop) */}
      <MobileBottomSheet
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        title="SM-2 Algorithm Settings"
      >
        <div className="flex flex-col gap-4 py-2">
          {/* Easy Factor Modifier */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-neutral-600 dark:text-neutral-300 uppercase tracking-wider">
              Easiness Factor Adjuster (Multiplier)
            </label>
            <input
              type="number"
              step="0.05"
              min="0.1"
              max="5.0"
              value={modalSettings.sm2EasyFactorModifier}
              onChange={(e) => setModalSettings({
                ...modalSettings,
                sm2EasyFactorModifier: parseFloat(e.target.value) || 1.0
              })}
              className="w-full px-3 py-2 text-sm bg-neutral-50 dark:bg-slate-900 border border-neutral-200 dark:border-slate-700 rounded-lg focus:outline-none focus:border-primary-500 text-neutral-800 dark:text-neutral-100 transition-colors"
            />
            <span className="text-[10px] text-neutral-400 dark:text-neutral-500">
              Controls how aggressively the easiness factor increases or decreases based on quality scores.
            </span>
          </div>

          {/* Interval Modifier */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-neutral-600 dark:text-neutral-300 uppercase tracking-wider">
              Interval Scale Factor (Multiplier)
            </label>
            <input
              type="number"
              step="0.05"
              min="0.1"
              max="10.0"
              value={modalSettings.sm2IntervalModifier}
              onChange={(e) => setModalSettings({
                ...modalSettings,
                sm2IntervalModifier: parseFloat(e.target.value) || 1.0
              })}
              className="w-full px-3 py-2 text-sm bg-neutral-50 dark:bg-slate-900 border border-neutral-200 dark:border-slate-700 rounded-lg focus:outline-none focus:border-primary-500 text-neutral-800 dark:text-neutral-100 transition-colors"
            />
            <span className="text-[10px] text-neutral-400 dark:text-neutral-500">
              Adjusts review intervals for third+ reviews. Larger values stretch review intervals further.
            </span>
          </div>

          {/* Step 1 Review Interval */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-neutral-600 dark:text-neutral-300 uppercase tracking-wider">
              Step 1 Review Interval (Days)
            </label>
            <input
              type="number"
              step="1"
              min="1"
              max="365"
              value={modalSettings.sm2Step1Interval}
              onChange={(e) => setModalSettings({
                ...modalSettings,
                sm2Step1Interval: parseInt(e.target.value, 10) || 1
              })}
              className="w-full px-3 py-2 text-sm bg-neutral-50 dark:bg-slate-900 border border-neutral-200 dark:border-slate-700 rounded-lg focus:outline-none focus:border-primary-500 text-neutral-800 dark:text-neutral-100 transition-colors"
            />
            <span className="text-[10px] text-neutral-400 dark:text-neutral-500">
              The interval in days for the very first correct review.
            </span>
          </div>

          {/* Step 2 Review Interval */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-neutral-600 dark:text-neutral-300 uppercase tracking-wider">
              Step 2 Review Interval (Days)
            </label>
            <input
              type="number"
              step="1"
              min="1"
              max="365"
              value={modalSettings.sm2Step2Interval}
              onChange={(e) => setModalSettings({
                ...modalSettings,
                sm2Step2Interval: parseInt(e.target.value, 10) || 6
              })}
              className="w-full px-3 py-2 text-sm bg-neutral-50 dark:bg-slate-900 border border-neutral-200 dark:border-slate-700 rounded-lg focus:outline-none focus:border-primary-500 text-neutral-800 dark:text-neutral-100 transition-colors"
            />
            <span className="text-[10px] text-neutral-400 dark:text-neutral-500">
              The interval in days for the second correct review.
            </span>
          </div>
        </div>

        <div className="flex justify-between items-center pt-3 border-t border-neutral-100 dark:border-slate-700/60 mt-2">
          <button
            type="button"
            disabled={isSavingSettings}
            onClick={handleResetSettings}
            className="px-4 py-2 text-xs font-bold text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition-all"
          >
            Reset Defaults
          </button>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={isSavingSettings}
              onClick={() => setIsSettingsOpen(false)}
              className="px-4 py-2 text-xs font-bold text-neutral-500 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-slate-700 rounded-lg transition-all"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isSavingSettings}
              onClick={handleSaveSettings}
              className="px-4 py-2 text-xs font-bold text-white bg-primary-600 hover:bg-primary-700 rounded-lg shadow-md transition-all flex items-center gap-1.5"
            >
              {isSavingSettings ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </div>
      </MobileBottomSheet>

      <AnimatePresence>
        {isSettingsOpen && (
          <div className="hidden md:flex fixed inset-0 z-50 items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSettingsOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />

            {/* Modal Box */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              className="relative w-full max-w-md bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-neutral-200 dark:border-slate-700/80 p-6 z-10 flex flex-col gap-5 overflow-hidden"
            >
              <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-slate-700/60">
                <h3 className="text-lg font-bold font-inter text-neutral-800 dark:text-neutral-100 flex items-center gap-2">
                  <Settings className="w-5 h-5 text-primary-500" />
                  SM-2 Algorithm Settings
                </h3>
              </div>

              <div className="flex flex-col gap-4 py-2">
                {/* Easy Factor Modifier */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-neutral-600 dark:text-neutral-300 uppercase tracking-wider">
                    Easiness Factor Adjuster (Multiplier)
                  </label>
                  <input
                    type="number"
                    step="0.05"
                    min="0.1"
                    max="5.0"
                    value={modalSettings.sm2EasyFactorModifier}
                    onChange={(e) => setModalSettings({
                      ...modalSettings,
                      sm2EasyFactorModifier: parseFloat(e.target.value) || 1.0
                    })}
                    className="w-full px-3 py-2 text-sm bg-neutral-50 dark:bg-slate-900 border border-neutral-200 dark:border-slate-700 rounded-lg focus:outline-none focus:border-primary-500 text-neutral-800 dark:text-neutral-100 transition-colors"
                  />
                  <span className="text-[10px] text-neutral-400 dark:text-neutral-500">
                    Controls how aggressively the easiness factor increases or decreases based on quality scores.
                  </span>
                </div>

                {/* Interval Modifier */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-neutral-600 dark:text-neutral-300 uppercase tracking-wider">
                    Interval Scale Factor (Multiplier)
                  </label>
                  <input
                    type="number"
                    step="0.05"
                    min="0.1"
                    max="10.0"
                    value={modalSettings.sm2IntervalModifier}
                    onChange={(e) => setModalSettings({
                      ...modalSettings,
                      sm2IntervalModifier: parseFloat(e.target.value) || 1.0
                    })}
                    className="w-full px-3 py-2 text-sm bg-neutral-50 dark:bg-slate-900 border border-neutral-200 dark:border-slate-700 rounded-lg focus:outline-none focus:border-primary-500 text-neutral-800 dark:text-neutral-100 transition-colors"
                  />
                  <span className="text-[10px] text-neutral-400 dark:text-neutral-500">
                    Adjusts review intervals for third+ reviews. Larger values stretch review intervals further.
                  </span>
                </div>

                {/* Step 1 Review Interval */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-neutral-600 dark:text-neutral-300 uppercase tracking-wider">
                    Step 1 Review Interval (Days)
                  </label>
                  <input
                    type="number"
                    step="1"
                    min="1"
                    max="365"
                    value={modalSettings.sm2Step1Interval}
                    onChange={(e) => setModalSettings({
                      ...modalSettings,
                      sm2Step1Interval: parseInt(e.target.value, 10) || 1
                    })}
                    className="w-full px-3 py-2 text-sm bg-neutral-50 dark:bg-slate-900 border border-neutral-200 dark:border-slate-700 rounded-lg focus:outline-none focus:border-primary-500 text-neutral-800 dark:text-neutral-100 transition-colors"
                  />
                  <span className="text-[10px] text-neutral-400 dark:text-neutral-500">
                    The interval in days for the very first correct review.
                  </span>
                </div>

                {/* Step 2 Review Interval */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-neutral-600 dark:text-neutral-300 uppercase tracking-wider">
                    Step 2 Review Interval (Days)
                  </label>
                  <input
                    type="number"
                    step="1"
                    min="1"
                    max="365"
                    value={modalSettings.sm2Step2Interval}
                    onChange={(e) => setModalSettings({
                      ...modalSettings,
                      sm2Step2Interval: parseInt(e.target.value, 10) || 6
                    })}
                    className="w-full px-3 py-2 text-sm bg-neutral-50 dark:bg-slate-900 border border-neutral-200 dark:border-slate-700 rounded-lg focus:outline-none focus:border-primary-500 text-neutral-800 dark:text-neutral-100 transition-colors"
                  />
                  <span className="text-[10px] text-neutral-400 dark:text-neutral-500">
                    The interval in days for the second correct review.
                  </span>
                </div>
              </div>

              <div className="flex justify-between items-center pt-3 border-t border-neutral-100 dark:border-slate-700/60 mt-2">
                <button
                  type="button"
                  disabled={isSavingSettings}
                  onClick={handleResetSettings}
                  className="px-4 py-2 text-xs font-bold text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition-all"
                >
                  Reset Defaults
                </button>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={isSavingSettings}
                    onClick={() => setIsSettingsOpen(false)}
                    className="px-4 py-2 text-xs font-bold text-neutral-500 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-slate-700 rounded-lg transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={isSavingSettings}
                    onClick={handleSaveSettings}
                    className="px-4 py-2 text-xs font-bold text-white bg-primary-600 hover:bg-primary-700 rounded-lg shadow-md transition-all flex items-center gap-1.5"
                  >
                    {isSavingSettings ? 'Saving...' : 'Save Settings'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Video Modal */}
      {showVideoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 max-w-2xl w-full flex flex-col gap-4 relative">
            <button
              type="button"
              onClick={() => setShowVideoModal(false)}
              className="absolute -top-3 -right-3 p-1.5 rounded-full bg-neutral-850 border border-neutral-700 text-stone-400 hover:text-white cursor-pointer z-50"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-black shadow-lg">
              <iframe
                title="Flashcard Video Reference"
                src={`https://www.youtube.com/embed/${getYouTubeId(videoUrl)}?start=${videoStart}&autoplay=1`}
                className="absolute inset-0 w-full h-full"
                allowFullScreen
                allow="autoplay"
              />
            </div>
            <div className="text-center text-xs font-semibold text-stone-400">
              Playing reference from timestamp {formatSeconds(videoStart)}
            </div>
          </div>
        </div>
      )}

      {/* Keyboard Shortcuts Guide Modal */}
      <KeyboardShortcutsModal
        isOpen={isKeyboardHelpOpen}
        onClose={() => setIsKeyboardHelpOpen(false)}
      />
    </div>
  );
};

export default FlashcardReview;
