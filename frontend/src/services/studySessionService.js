// frontend/src/services/studySessionService.js

/**
 * Study Session Auto-Save and Recovery Service
 * Handles automatic saving, recovery, and management of study sessions
 */

const SESSION_CONFIG = {
  AUTO_SAVE_INTERVAL: 30000, // 30 seconds
  DEBOUNCE_DELAY: 2000, // 2 seconds for debounced saves
  MAX_RECOVERY_ATTEMPTS: 3,
  SESSION_TIMEOUT: 24 * 60 * 60 * 1000, // 24 hours
  MAX_HISTORY_SIZE: 10,
  STORAGE_KEYS: {
    CURRENT_SESSION: 'study_session_current',
    SESSION_HISTORY: 'study_session_history',
    RECOVERY_POINT: 'study_session_recovery',
    BACKUP_SESSION: 'study_session_backup'
  }
};

class StudySessionService {
  constructor() {
    this.currentSession = null;
    this.autoSaveTimer = null;
    this.debounceTimer = null;
    this.recoveryAttempts = 0;
    this.isRecovering = false;
    this.listeners = new Map();
    this.initialize();
  }

  /**
   * Initialize the service
   */
  initialize() {
    this.loadSessionFromStorage();
    this.setupEventListeners();
    this.startAutoSave();
    this.setupCrossTabSync();
  }

  /**
   * Setup cross-tab synchronization
   */
  setupCrossTabSync() {
    if (typeof window === 'undefined') return;

    window.addEventListener('storage', (event) => {
      if (event.key === SESSION_CONFIG.STORAGE_KEYS.CURRENT_SESSION) {
        const sessionData = JSON.parse(event.newValue);
        if (sessionData && sessionData.id !== this.currentSession?.id) {
          this.handleExternalUpdate(sessionData);
        }
      }
    });

    // Broadcast channel for real-time sync
    try {
      this.broadcastChannel = new BroadcastChannel('study_session');
      this.broadcastChannel.onmessage = (event) => {
        if (event.data.type === 'SESSION_UPDATE') {
          this.handleExternalUpdate(event.data.payload);
        }
      };
    } catch (error) {
      console.warn('BroadcastChannel not supported:', error);
    }
  }

  /**
   * Start auto-save timer
   */
  startAutoSave() {
    if (this.autoSaveTimer) clearInterval(this.autoSaveTimer);
    this.autoSaveTimer = setInterval(() => {
      this.saveSession();
    }, SESSION_CONFIG.AUTO_SAVE_INTERVAL);
  }

  /**
   * Setup event listeners for auto-save triggers
   */
  setupEventListeners() {
    if (typeof window === 'undefined') return;

    // Save before page unload
    window.addEventListener('beforeunload', () => {
      if (this.currentSession) {
        this.saveSession(true);
      }
    });

    // Save on visibility change (tab switch)
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.currentSession) {
        this.saveSession();
      }
    });

    // Network status changes
    window.addEventListener('online', () => {
      this.syncPendingSessions();
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      // Ctrl+S to save manually
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        this.saveSession();
        this.notifyListeners('manualSave');
      }
    });
  }

  /**
   * Create a new study session
   */
  createSession(sessionData) {
    const session = {
      id: this.generateSessionId(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'active',
      progress: {
        totalTopics: sessionData.totalTopics || 0,
        completedTopics: 0,
        totalQuestions: sessionData.totalQuestions || 0,
        answeredQuestions: 0,
        correctAnswers: 0,
        elapsedTime: 0,
        lastActivity: new Date().toISOString()
      },
      data: {
        topics: sessionData.topics || [],
        currentQuestion: sessionData.currentQuestion || null,
        answers: sessionData.answers || {},
        bookmarks: sessionData.bookmarks || [],
        notes: sessionData.notes || {},
        quizScores: sessionData.quizScores || [],
        flashcardProgress: sessionData.flashcardProgress || {},
        studyPlan: sessionData.studyPlan || null,
        customization: sessionData.customization || {}
      },
      metadata: {
        deviceInfo: this.getDeviceInfo(),
        sessionStart: new Date().toISOString(),
        lastActivity: new Date().toISOString(),
        browser: this.getBrowserInfo(),
        screenSize: this.getScreenSize()
      },
      recoveryPoint: null,
      version: '1.0.0'
    };

    this.currentSession = session;
    this.saveToStorage(session);
    this.notifyListeners('sessionCreated', session);
    return session;
  }

  /**
   * Save current session state
   */
  saveSession(isEmergency = false) {
    if (!this.currentSession) return null;

    try {
      // Update progress
      this.currentSession.updatedAt = new Date().toISOString();
      this.currentSession.metadata.lastActivity = new Date().toISOString();
      
      // Calculate elapsed time
      if (this.currentSession.metadata.sessionStart) {
        const startTime = new Date(this.currentSession.metadata.sessionStart).getTime();
        const currentTime = Date.now();
        this.currentSession.progress.elapsedTime = Math.floor(
          (currentTime - startTime) / 1000
        );
      }

      // Create recovery point
      this.currentSession.recoveryPoint = {
        timestamp: new Date().toISOString(),
        state: this.captureState(),
        isEmergency: isEmergency
      };

      // Save to storage
      this.saveToStorage(this.currentSession);
      
      // Save to IndexedDB for larger datasets
      this.saveToIndexedDB(this.currentSession);

      // Broadcast update
      this.broadcastUpdate();

      this.notifyListeners('sessionSaved', {
        sessionId: this.currentSession.id,
        timestamp: this.currentSession.updatedAt
      });

      return this.currentSession;
    } catch (error) {
      console.error('Error saving session:', error);
      this.notifyListeners('saveError', error);
      return null;
    }
  }

  /**
   * Debounced save (for frequent updates)
   */
  debouncedSave() {
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => {
      this.saveSession();
      this.debounceTimer = null;
    }, SESSION_CONFIG.DEBOUNCE_DELAY);
  }

  /**
   * Update current session data
   */
  updateSession(updates) {
    if (!this.currentSession) return null;

    this.currentSession = this.deepMerge(this.currentSession, updates);
    this.debouncedSave();
    this.notifyListeners('sessionUpdated', this.currentSession);
    return this.currentSession;
  }

  /**
   * Attempt to recover a session
   */
  async recoverSession() {
    this.isRecovering = true;
    
    try {
      // Try different recovery sources
      const recoverySources = [
        () => this.recoverFromStorage(),
        () => this.recoverFromIndexedDB(),
        () => this.recoverFromAPI()
      ];

      for (const source of recoverySources) {
        try {
          const recovered = await source();
          if (recovered) {
            this.currentSession = recovered;
            this.isRecovering = false;
            this.notifyListeners('sessionRecovered', recovered);
            return recovered;
          }
        } catch (error) {
          console.warn('Recovery source failed:', error);
        }
      }

      // If no session found, check for auto-backup
      const backup = this.recoverFromBackup();
      if (backup) {
        this.currentSession = backup;
        this.isRecovering = false;
        this.notifyListeners('sessionRecovered', backup);
        return backup;
      }

      this.isRecovering = false;
      return null;
    } catch (error) {
      console.error('Session recovery failed:', error);
      this.isRecovering = false;
      return null;
    }
  }

  /**
   * Get session recovery information
   */
  getRecoveryInfo() {
    if (!this.currentSession) {
      const stored = this.loadFromStorage();
      if (stored) {
        return this.extractRecoveryInfo(stored);
      }
      return null;
    }
    return this.extractRecoveryInfo(this.currentSession);
  }

  /**
   * Extract recovery information from session
   */
  extractRecoveryInfo(session) {
    if (!session) return null;

    return {
      id: session.id,
      startedAt: session.metadata?.sessionStart || session.createdAt,
      lastActivity: session.metadata?.lastActivity || session.updatedAt,
      timeElapsed: session.progress?.elapsedTime || 0,
      progress: {
        completedTopics: session.progress?.completedTopics || 0,
        totalTopics: session.progress?.totalTopics || 0,
        answeredQuestions: session.progress?.answeredQuestions || 0,
        totalQuestions: session.progress?.totalQuestions || 0,
        correctAnswers: session.progress?.correctAnswers || 0,
        percentage: session.progress?.totalTopics > 0
          ? Math.round((session.progress.completedTopics / session.progress.totalTopics) * 100)
          : 0
      },
      currentTopic: session.data?.currentQuestion?.topic || null,
      lastQuestion: session.data?.currentQuestion || null,
      totalBookmarks: session.data?.bookmarks?.length || 0,
      quizScores: session.data?.quizScores || [],
      canResume: this.canResumeSession(session),
      isStale: this.isSessionStale(session)
    };
  }

  /**
   * Check if session can be resumed
   */
  canResumeSession(session) {
    if (!session) return false;
    
    // Check if session is complete
    if (session.status === 'completed') return false;
    
    // Check if session has any data
    if (!session.data || Object.keys(session.data).length === 0) return false;
    
    // Check if session is not stale
    if (this.isSessionStale(session)) return false;
    
    return true;
  }

  /**
   * Check if session is stale
   */
  isSessionStale(session) {
    if (!session) return true;
    const lastActivity = new Date(session.metadata?.lastActivity || session.updatedAt);
    const now = new Date();
    const diff = now - lastActivity;
    return diff > SESSION_CONFIG.SESSION_TIMEOUT;
  }

  /**
   * Remove stale sessions
   */
  cleanupStaleSessions() {
    const history = this.getSessionHistory();
    const validHistory = history.filter(session => !this.isSessionStale(session));
    
    if (validHistory.length < history.length) {
      this.saveSessionHistory(validHistory);
      this.notifyListeners('sessionsCleaned', { 
        removed: history.length - validHistory.length,
        remaining: validHistory.length 
      });
    }
  }

  /**
   * Add note to current session
   */
  addNote(questionId, note) {
    if (!this.currentSession) return null;
    
    if (!this.currentSession.data.notes) {
      this.currentSession.data.notes = {};
    }
    
    this.currentSession.data.notes[questionId] = {
      text: note,
      timestamp: new Date().toISOString(),
      questionId: questionId
    };
    
    this.debouncedSave();
    this.notifyListeners('noteAdded', { questionId, note });
    return this.currentSession.data.notes[questionId];
  }

  /**
   * Bookmark a question
   */
  toggleBookmark(questionId) {
    if (!this.currentSession) return null;
    
    if (!this.currentSession.data.bookmarks) {
      this.currentSession.data.bookmarks = [];
    }
    
    const index = this.currentSession.data.bookmarks.indexOf(questionId);
    if (index > -1) {
      this.currentSession.data.bookmarks.splice(index, 1);
    } else {
      this.currentSession.data.bookmarks.push(questionId);
    }
    
    this.debouncedSave();
    this.notifyListeners('bookmarkToggled', { questionId, bookmarked: index === -1 });
    return this.currentSession.data.bookmarks;
  }

  /**
   * Answer a question
   */
  answerQuestion(questionId, answer, isCorrect) {
    if (!this.currentSession) return null;
    
    if (!this.currentSession.data.answers) {
      this.currentSession.data.answers = {};
    }
    
    this.currentSession.data.answers[questionId] = {
      answer,
      isCorrect,
      answeredAt: new Date().toISOString(),
      timeTaken: this.getTimeSinceLastQuestion()
    };
    
    this.currentSession.progress.answeredQuestions = 
      Object.keys(this.currentSession.data.answers).length;
    
    if (isCorrect) {
      this.currentSession.progress.correctAnswers++;
    }
    
    // Update current question
    this.currentSession.data.currentQuestion = {
      id: questionId,
      answered: true,
      isCorrect,
      timestamp: new Date().toISOString()
    };
    
    this.debouncedSave();
    this.notifyListeners('questionAnswered', { questionId, isCorrect });
    return this.currentSession.data.answers[questionId];
  }

  /**
   * Complete the session
   */
  completeSession() {
    if (!this.currentSession) return null;
    
    this.currentSession.status = 'completed';
    this.currentSession.progress.completedAt = new Date().toISOString();
    
    // Save final state
    this.saveSession();
    
    // Add to history
    this.addToHistory(this.currentSession);
    
    // Cleanup
    this.clearCurrentSession();
    
    this.notifyListeners('sessionCompleted', this.currentSession);
    return this.currentSession;
  }

  /**
   * Get session history
   */
  getSessionHistory() {
    try {
      const history = localStorage.getItem(SESSION_CONFIG.STORAGE_KEYS.SESSION_HISTORY);
      return history ? JSON.parse(history) : [];
    } catch (error) {
      console.error('Error reading session history:', error);
      return [];
    }
  }

  /**
   * Add session to history
   */
  addToHistory(session) {
    let history = this.getSessionHistory();
    
    // Add current session
    history.unshift({
      id: session.id,
      date: session.metadata?.sessionStart || session.createdAt,
      completedAt: session.progress?.completedAt || session.updatedAt,
      progress: session.progress,
      metadata: session.metadata,
      status: session.status
    });
    
    // Keep only recent history
    history = history.slice(0, SESSION_CONFIG.MAX_HISTORY_SIZE);
    
    this.saveSessionHistory(history);
  }

  /**
   * Save session history
   */
  saveSessionHistory(history) {
    try {
      localStorage.setItem(SESSION_CONFIG.STORAGE_KEYS.SESSION_HISTORY, JSON.stringify(history));
    } catch (error) {
      console.error('Error saving session history:', error);
    }
  }

  /**
   * Storage operations
   */
  saveToStorage(session) {
    try {
      localStorage.setItem(SESSION_CONFIG.STORAGE_KEYS.CURRENT_SESSION, JSON.stringify(session));
      localStorage.setItem(SESSION_CONFIG.STORAGE_KEYS.RECOVERY_POINT, JSON.stringify({
        sessionId: session.id,
        timestamp: new Date().toISOString(),
        version: session.version
      }));
    } catch (error) {
      console.error('Error saving to localStorage:', error);
    }
  }

  loadFromStorage() {
    try {
      const data = localStorage.getItem(SESSION_CONFIG.STORAGE_KEYS.CURRENT_SESSION);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Error loading from localStorage:', error);
      return null;
    }
  }

  loadSessionFromStorage() {
    const session = this.loadFromStorage();
    if (session && !this.isSessionStale(session)) {
      this.currentSession = session;
      this.notifyListeners('sessionLoaded', session);
      return session;
    }
    return null;
  }

  /**
   * IndexedDB operations for larger data
   */
  async saveToIndexedDB(session) {
    try {
      if (!window.indexedDB) return;
      
      const db = await this.openIndexedDB();
      const transaction = db.transaction(['sessions'], 'readwrite');
      const store = transaction.objectStore('sessions');
      store.put(session);
      
      // Also save as backup
      const backupStore = transaction.objectStore('backup');
      backupStore.put({
        session,
        timestamp: new Date().toISOString()
      });
      
      await transaction.done;
    } catch (error) {
      console.warn('IndexedDB save failed:', error);
    }
  }

  async recoverFromIndexedDB() {
    try {
      if (!window.indexedDB) return null;
      
      const db = await this.openIndexedDB();
      const transaction = db.transaction(['sessions'], 'readonly');
      const store = transaction.objectStore('sessions');
      const request = store.getAll();
      
      const sessions = await new Promise((resolve) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => resolve(null);
      });
      
      if (sessions && sessions.length > 0) {
        // Get the most recent session
        const recent = sessions.sort((a, b) => 
          new Date(b.updatedAt) - new Date(a.updatedAt)
        )[0];
        return recent;
      }
      
      return null;
    } catch (error) {
      console.warn('IndexedDB recovery failed:', error);
      return null;
    }
  }

  openIndexedDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('StudySessionDB', 2);
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains('sessions')) {
          db.createObjectStore('sessions', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('backup')) {
          db.createObjectStore('backup', { keyPath: 'timestamp' });
        }
      };
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Backup recovery
   */
  recoverFromBackup() {
    try {
      const backup = localStorage.getItem(SESSION_CONFIG.STORAGE_KEYS.BACKUP_SESSION);
      if (backup) {
        const data = JSON.parse(backup);
        if (data && !this.isSessionStale(data)) {
          return data;
        }
      }
      return null;
    } catch (error) {
      console.warn('Backup recovery failed:', error);
      return null;
    }
  }

  /**
   * API recovery (server-side)
   */
  async recoverFromAPI() {
    try {
      const response = await fetch('/api/sessions/recovery', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.session && !this.isSessionStale(data.session)) {
          return data.session;
        }
      }
      return null;
    } catch (error) {
      console.warn('API recovery failed:', error);
      return null;
    }
  }

  /**
   * Sync pending sessions with server
   */
  async syncPendingSessions() {
    if (!this.currentSession) return;
    
    try {
      const response = await fetch('/api/sessions/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({
          sessionId: this.currentSession.id,
          sessionData: this.currentSession,
          timestamp: new Date().toISOString()
        })
      });
      
      if (response.ok) {
        this.notifyListeners('sessionsSynced', { timestamp: new Date().toISOString() });
      }
    } catch (error) {
      console.warn('Session sync failed:', error);
    }
  }

  /**
   * Capture current state for recovery
   */
  captureState() {
    return {
      timestamp: new Date().toISOString(),
      progress: { ...this.currentSession.progress },
      currentQuestion: this.currentSession.data?.currentQuestion || null,
      answersCount: Object.keys(this.currentSession.data?.answers || {}).length,
      bookmarksCount: this.currentSession.data?.bookmarks?.length || 0,
      notesCount: Object.keys(this.currentSession.data?.notes || {}).length,
      quizScores: this.currentSession.data?.quizScores?.length || 0
    };
  }

  /**
   * Clear current session
   */
  clearCurrentSession() {
    this.currentSession = null;
    localStorage.removeItem(SESSION_CONFIG.STORAGE_KEYS.CURRENT_SESSION);
    localStorage.removeItem(SESSION_CONFIG.STORAGE_KEYS.RECOVERY_POINT);
    this.notifyListeners('sessionCleared', {});
  }

  /**
   * Handle external update (cross-tab)
   */
  handleExternalUpdate(sessionData) {
    if (!sessionData) return;
    
    // Save current session before overwriting
    if (this.currentSession) {
      this.saveSession();
    }
    
    this.currentSession = sessionData;
    this.notifyListeners('sessionUpdated', sessionData);
  }

  /**
   * Broadcast update to other tabs
   */
  broadcastUpdate() {
    try {
      if (this.broadcastChannel) {
        this.broadcastChannel.postMessage({
          type: 'SESSION_UPDATE',
          payload: this.currentSession
        });
      }
    } catch (error) {
      // Ignore broadcast errors
    }
  }

  /**
   * Utility functions
   */
  generateSessionId() {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  getDeviceInfo() {
    if (typeof window === 'undefined') return {};
    
    return {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      language: navigator.language,
      online: navigator.onLine
    };
  }

  getBrowserInfo() {
    if (typeof window === 'undefined') return {};
    
    return {
      name: this.getBrowserName(),
      version: this.getBrowserVersion(),
      cookiesEnabled: navigator.cookieEnabled,
      doNotTrack: navigator.doNotTrack
    };
  }

  getBrowserName() {
    const ua = navigator.userAgent;
    if (ua.includes('Chrome')) return 'Chrome';
    if (ua.includes('Firefox')) return 'Firefox';
    if (ua.includes('Safari')) return 'Safari';
    if (ua.includes('Edge')) return 'Edge';
    return 'Unknown';
  }

  getBrowserVersion() {
    const ua = navigator.userAgent;
    const match = ua.match(/(Chrome|Firefox|Safari|Edge)\/(\d+)/);
    return match ? match[2] : 'Unknown';
  }

  getScreenSize() {
    if (typeof window === 'undefined') return {};
    
    return {
      width: window.innerWidth,
      height: window.innerHeight,
      pixelRatio: window.devicePixelRatio
    };
  }

  getTimeSinceLastQuestion() {
    if (!this.currentSession?.data?.currentQuestion) return 0;
    
    const lastTime = new Date(this.currentSession.data.currentQuestion.timestamp || Date.now());
    return Math.floor((Date.now() - lastTime) / 1000);
  }

  deepMerge(target, source) {
    const result = { ...target };
    
    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = this.deepMerge(result[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    }
    
    return result;
  }

  /**
   * Event listener management
   */
  addListener(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  removeListener(event, callback) {
    if (this.listeners.has(event)) {
      const listeners = this.listeners.get(event);
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  notifyListeners(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in listener for ${event}:`, error);
        }
      });
    }
  }

  /**
   * Cleanup and destroy service
   */
  destroy() {
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
      this.autoSaveTimer = null;
    }
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    if (this.broadcastChannel) {
      this.broadcastChannel.close();
    }
    this.listeners.clear();
    this.currentSession = null;
  }
}

// Create singleton instance
const studySessionService = new StudySessionService();

export default studySessionService;
