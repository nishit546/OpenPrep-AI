import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { socket, connectSocket } from '../services/socket';
import API from '../services/api.js';
import {
  FaPlay,
  FaCheck,
  FaUsers,
  FaCopy,
  FaCrown,
  FaWifi,
  FaLock,
  FaUnlock,
  FaClock,
  FaTrophy,
  FaUserShield,
  FaBolt,
  FaRedo,
  FaTimes,
  FaShieldAlt,
  FaQuestionCircle,
} from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';
import { triggerConfetti } from '../utils/confetti';

const ReconnectBanner = ({ connected, notice }) => {
  if (connected && !notice) return null;

  return (
    <div className="fixed top-0 inset-x-0 z-50 bg-rose-600 text-white text-center py-2.5 px-4 text-xs font-semibold flex items-center justify-center gap-2 shadow-lg">
      <FaWifi className="animate-pulse" />
      {notice || 'Connection lost. Attempting to reconnect to Battle Arena...'}
    </div>
  );
};

// 15-second radial countdown timer
const RadialCountdownTimer = ({ timeRemaining = 15, maxTime = 15 }) => {
  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.max(0, Math.min(1, timeRemaining / maxTime));
  const strokeDashoffset = circumference - progress * circumference;

  const timerColor =
    timeRemaining > 8
      ? 'text-indigo-400'
      : timeRemaining > 4
      ? 'text-amber-400'
      : 'text-rose-400 animate-pulse';

  return (
    <div className="relative flex items-center justify-center w-20 h-20">
      <svg className="w-20 h-20 transform -rotate-90" viewBox="0 0 72 72">
        <circle
          cx="36"
          cy="36"
          r={radius}
          stroke="currentColor"
          strokeWidth="4"
          className="text-neutral-800"
          fill="transparent"
        />
        <circle
          cx="36"
          cy="36"
          r={radius}
          stroke="currentColor"
          strokeWidth="4"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className={`transition-all duration-1000 ${timerColor}`}
          fill="transparent"
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center font-mono">
        <span className={`text-xl font-extrabold ${timerColor}`}>{timeRemaining}</span>
        <span className="text-[9px] uppercase tracking-wider text-stone-500 font-bold">sec</span>
      </div>
    </div>
  );
};

const BattleArena = () => {
  const { user } = useSelector((state) => state.auth || {});
  const { roomId: routeRoomId } = useParams();
  const navigate = useNavigate();

  // Mode Selection: 'matchmaking' vs 'custom'
  const [battleMode, setBattleMode] = useState('matchmaking'); // 'matchmaking' | 'custom'
  const [isRanked1v1, setIsRanked1v1] = useState(false);
  const [inQueue, setInQueue] = useState(false);
  const [queueStatus, setQueueStatus] = useState('');
  const [disconnectNotice, setDisconnectNotice] = useState('');

  // 1v1 Battle State (Issue #2307)
  const [selfPlayer, setSelfPlayer] = useState(null);
  const [opponentPlayer, setOpponentPlayer] = useState(null);
  const [rankedQuestions, setRankedQuestions] = useState([]);
  const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);
  const [rankedTotalQuestions, setRankedTotalQuestions] = useState(10);
  const [rankedTimeRemaining, setRankedTimeRemaining] = useState(15);
  const [rankedTimeLimit, setRankedTimeLimit] = useState(15);
  const [rankedSelectedAnswer, setRankedSelectedAnswer] = useState(null);
  const [rankedAnswerSubmitted, setRankedAnswerSubmitted] = useState(false);
  const [rankedFeedback, setRankedFeedback] = useState(null);
  const [battleFinishedSummary, setBattleFinishedSummary] = useState(null);
  const [rematchOffered, setRematchOffered] = useState(false);
  const [rematchRequested, setRematchRequested] = useState(false);

  // Custom Lobby State (Legacy / Friend match support)
  const [roomId, setRoomId] = useState('');
  const [roomName, setRoomName] = useState('');
  const [joined, setJoined] = useState(false);
  const [players, setPlayers] = useState({});
  const [status, setStatus] = useState('waiting'); // 'waiting' | 'playing' | 'finished'
  const [isConnected, setIsConnected] = useState(Boolean(socket?.connected));
  const [isPrivate, setIsPrivate] = useState(false);
  const [password, setPassword] = useState('');
  const [accessError, setAccessError] = useState('');
  const [accessPending, setAccessPending] = useState(false);
  const [pendingRoomId, setPendingRoomId] = useState('');
  const [inviteLink, setInviteLink] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [hostUserId, setHostUserId] = useState('');

  // Custom Quiz Sync State
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(5);
  const [timeRemaining, setTimeRemaining] = useState(15);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [correctAnswerIndex, setCorrectAnswerIndex] = useState(null);
  const [explanation, setExplanation] = useState('');
  const [answerSubmitted, setAnswerSubmitted] = useState(false);
  const [questionStartTimestamp, setQuestionStartTimestamp] = useState(0);

  // Subjects & Topics
  const [subjects, setSubjects] = useState([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState('general');
  const [topics, setTopics] = useState([]);
  const [selectedTopicId, setSelectedTopicId] = useState('');
  const [questionCount, setQuestionCount] = useState(5);
  const [timePerQuestion, setTimePerQuestion] = useState(15);

  const joinedRef = useRef(false);
  const roomIdRef = useRef('');
  const passwordRef = useRef('');

  // Fetch subjects on mount
  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        const res = await API.get('/academic/subjects');
        if (res.data?.success && Array.isArray(res.data.data)) {
          setSubjects(res.data.data);
          if (res.data.data.length > 0) {
            setSelectedSubjectId(res.data.data[0].id || res.data.data[0]._id || 'general');
          }
        }
      } catch (err) {
        // Fallback default subjects
        setSubjects([
          { id: 'general', name: 'General Science & Math' },
          { id: 'math', name: 'Mathematics' },
          { id: 'physics', name: 'Physics' },
          { id: 'cs', name: 'Computer Science' },
        ]);
      }
    };
    fetchSubjects();
  }, []);

  // Fetch topics when subject changes
  useEffect(() => {
    if (!selectedSubjectId || selectedSubjectId === 'general') {
      setTopics([]);
      return;
    }
    const fetchTopics = async () => {
      try {
        const res = await API.get(`/academic/topics?subjectId=${selectedSubjectId}`);
        if (res.data?.success) {
          setTopics(res.data.data);
          setSelectedTopicId('');
        }
      } catch (err) {
        setTopics([]);
      }
    };
    fetchTopics();
  }, [selectedSubjectId]);

  // Trigger confetti on finish
  useEffect(() => {
    if (status === 'finished' || battleFinishedSummary) {
      triggerConfetti();
    }
  }, [status, battleFinishedSummary]);

  // Main Socket Listeners (1v1 Ranked Matchmaking & Custom Rooms)
  useEffect(() => {
    if (typeof connectSocket === 'function') {
      connectSocket();
    }

    const onConnect = () => {
      setIsConnected(true);
      if (joinedRef.current && roomIdRef.current) {
        socket.emit('join-room', {
          roomId: roomIdRef.current,
          password: passwordRef.current,
        });
      }
    };

    const onDisconnect = () => setIsConnected(false);

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('connect_error', () => setIsConnected(false));

    // ==========================================
    // 1v1 MATCHMAKING EVENTS (Issue #2307)
    // ==========================================

    socket.on('battle:queued', (data) => {
      setInQueue(true);
      setQueueStatus(data.message || 'Searching for an opponent with similar ELO (+/- 200 rating)...');
    });

    socket.on('battle:matched', (data) => {
      setInQueue(false);
      setIsRanked1v1(true);
      setJoined(true);
      setRoomId(data.roomId);
      roomIdRef.current = data.roomId;
      setSelfPlayer(data.self);
      setOpponentPlayer({
        ...data.opponent,
        lockedIn: false,
      });
      setRankedQuestions(data.questions || []);
      setRankedTotalQuestions(data.totalQuestions || (data.questions ? data.questions.length : 10));
      setActiveQuestionIndex(data.currentQuestionIndex || 0);
      setRankedTimeLimit(data.timeLimit || 15);
      setRankedTimeRemaining(data.timeLimit || 15);
      setRankedSelectedAnswer(null);
      setRankedAnswerSubmitted(false);
      setRankedFeedback(null);
      setBattleFinishedSummary(null);
      setStatus('playing');
    });

    socket.on('battle:timer_tick', (data) => {
      setRankedTimeRemaining(data.timeRemaining);
    });

    socket.on('battle:new_question', (data) => {
      setActiveQuestionIndex(data.questionIndex);
      setRankedTimeRemaining(data.timeLimit || 15);
      setRankedSelectedAnswer(null);
      setRankedAnswerSubmitted(false);
      setRankedFeedback(null);
      if (opponentPlayer) {
        setOpponentPlayer((prev) => (prev ? { ...prev, lockedIn: false } : null));
      }
    });

    socket.on('battle:opponent_progress', (data) => {
      setOpponentPlayer((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          lockedIn: Boolean(data.opponentLockedIn),
          score: data.opponentScore !== undefined ? data.opponentScore : prev.score,
          hp: data.opponentHp !== undefined ? data.opponentHp : prev.hp,
        };
      });
      if (data.selfHp !== undefined) {
        setSelfPlayer((prev) => (prev ? { ...prev, hp: data.selfHp } : prev));
      }
    });

    socket.on('battle:answer_ack', (data) => {
      if (data.accepted) setRankedAnswerSubmitted(true);
    });

    socket.on('battle:question_result', (data) => {
      setRankedFeedback({
        isCorrect: data.isCorrect,
        pointsEarned: data.pointsEarned,
        correctAnswerIndex: data.correctAnswerIndex,
        explanation: data.explanation,
      });
      setSelfPlayer((prev) => (prev ? { ...prev, score: data.score } : prev));
      setSelfPlayer((prev) => (prev ? { ...prev, hp: data.selfHp } : prev));
      setOpponentPlayer((prev) => (prev ? { ...prev, score: data.opponentScore, hp: data.opponentHp } : prev));
    });

    socket.on('battle:round_ended', (data) => {
      setStatus('finished');
      setBattleFinishedSummary(data);
      setDisconnectNotice('');
    });

    socket.on('battle:disconnect', (data) => {
      setDisconnectNotice(data.message || 'Opponent disconnected. 15-second grace period active.');
    });

    socket.on('battle:rematch_offered', () => {
      setRematchOffered(true);
    });

    // ==========================================
    // CUSTOM LOBBY EVENTS
    // ==========================================

    socket.on('room_update', (data) => {
      setPlayers(data.players || {});
      setStatus(data.status || 'waiting');
      if (data.hostUserId) setHostUserId(data.hostUserId);
    });

    socket.on('score_update', (data) => {
      if (data.players) setPlayers(data.players);
    });

    socket.on('new_question', (data) => {
      setCurrentQuestion({
        questionText: data.questionText,
        options: data.options,
      });
      setCurrentQuestionIndex(data.questionIndex);
      setTotalQuestions(data.totalQuestions);
      setTimeRemaining(data.timeLimit);
      setSelectedAnswer(null);
      setAnswerSubmitted(false);
      setCorrectAnswerIndex(null);
      setExplanation('');
      setQuestionStartTimestamp(Date.now());
    });

    socket.on('timer_tick', ({ timeRemaining: remaining }) => {
      setTimeRemaining(remaining);
    });

    socket.on('question_result', (data) => {
      setCorrectAnswerIndex(data.correctAnswerIndex);
      setExplanation(data.explanation);
      if (data.players) setPlayers(data.players);
    });

    socket.on('battle_finished', (data) => {
      setStatus('finished');
      if (data.players) setPlayers(data.players);
    });

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('battle:queued');
      socket.off('battle:matched');
      socket.off('battle:timer_tick');
      socket.off('battle:new_question');
      socket.off('battle:opponent_progress');
      socket.off('battle:answer_ack');
      socket.off('battle:question_result');
      socket.off('battle:round_ended');
      socket.off('battle:disconnect');
      socket.off('battle:rematch_offered');
      socket.off('room_update');
      socket.off('score_update');
      socket.off('new_question');
      socket.off('timer_tick');
      socket.off('question_result');
      socket.off('battle_finished');
      if (roomIdRef.current) {
        socket.emit('leave-room', { roomId: roomIdRef.current });
      }
    };
  }, []);

  // Listen to route join code
  useEffect(() => {
    if (!routeRoomId) return;
    const normalized = routeRoomId.toUpperCase();
    joinLobbyRoom(normalized);
  }, [routeRoomId]);

  // Join Matchmaking Queue handler
  const handleJoinMatchmaking = () => {
    setInQueue(true);
    setQueueStatus('Searching for an opponent with similar ELO (+/- 200 rating)...');
    socket.emit('battle:join_queue', {
      userId: user?.id,
      username: user?.name || 'Student',
      elo: user?.eloRating || 1200,
      subjectId: selectedSubjectId,
      avatar: user?.avatarUrl || null,
    });
  };

  const handleCancelMatchmaking = () => {
    setInQueue(false);
    socket.emit('battle:leave_queue', {});
  };

  // Submit Answer in 1v1 Battle
  const handleRankedAnswerSelect = (optionIndex) => {
    if (rankedAnswerSubmitted || rankedFeedback !== null) return;

    setRankedSelectedAnswer(optionIndex);
    setRankedAnswerSubmitted(true);

    socket.emit('battle:answer_submitted', {
      roomId,
      questionIndex: activeQuestionIndex,
      selectedOption: optionIndex,
      clientTimestamp: Date.now(),
    });
  };

  // Rematch request in 1v1 Battle
  const handleRequestRematch = () => {
    setRematchRequested(true);
    socket.emit('battle:rematch_request', {
      roomId,
      opponentUserId: opponentPlayer?.userId,
    });
  };

  // Custom Lobby Join
  const joinLobbyRoom = async (code, enteredPassword = '') => {
    setAccessError('');
    setAccessPending(true);
    setPendingRoomId(code);

    try {
      if (typeof connectSocket === 'function') {
        connectSocket();
      }

      socket.emit('join-room', { roomId: code, password: enteredPassword, username: user?.name }, (response) => {
        setAccessPending(false);
        if (response?.success) {
          setRoomId(code);
          setRoomName(response.room?.name || 'Battle Room');
          roomIdRef.current = code;
          passwordRef.current = enteredPassword;
          setIsPrivate(Boolean(response.isPrivate));
          joinedRef.current = true;
          setJoined(true);
          setPendingRoomId('');
          setAccessError('');
        } else if (response?.requiresPassword) {
          setJoined(false);
          setPendingRoomId(code);
          setAccessError('Enter password to continue.');
        } else {
          setJoined(false);
          setAccessError(response?.message || `Room ${code} not found. Check the code and try again.`);
        }
      });
    } catch (err) {
      setAccessPending(false);
      setJoined(false);
      setAccessError('Lobby code is invalid.');
    }
  };

  const handleJoin = (e) => {
    e.preventDefault();
    joinLobbyRoom(roomId.trim().toUpperCase(), password);
  };

  const handleCreateRoom = async () => {
    setAccessError('');
    setAccessPending(true);

    if (typeof connectSocket === 'function') {
      connectSocket();
    }

    socket.emit(
      'create-room',
      {
        roomName: roomName || 'My Battle Room',
        subjectId: selectedSubjectId,
        topicId: selectedTopicId || null,
        questionCount,
        timePerQuestion,
        password: isPrivate ? password : '',
      },
      (response) => {
        setAccessPending(false);
        if (response?.success) {
          const code = response.roomId;
          setRoomId(code);
          setRoomName(roomName || 'My Battle Room');
          roomIdRef.current = code;
          joinedRef.current = true;
          setJoined(true);
          setShowCreateModal(false);
          setAccessError('');
        } else {
          setAccessError(response?.message || 'Room code is already in use. Try joining it instead.');
        }
      }
    );
  };

  const handleToggleReady = () => {
    socket.emit('toggle_ready', { roomId });
  };

  const handleStartGame = () => {
    socket.emit('start-game', { roomId });
  };

  const handleAnswerSelect = (optionIndex) => {
    if (answerSubmitted || correctAnswerIndex !== null) return;

    setSelectedAnswer(optionIndex);
    setAnswerSubmitted(true);

    const timeSpentMs = Date.now() - questionStartTimestamp;
    socket.emit('submit_answer', {
      roomId,
      optionIndex,
      timeSpentMs,
    });
  };

  // ==========================================
  // RENDER: 1v1 BATTLE FINISHED SCREEN
  // ==========================================
  if (battleFinishedSummary) {
    const isWinner = battleFinishedSummary.winner?.userId === user?.id;
    const isDraw = battleFinishedSummary.isDraw;
    const selfData = battleFinishedSummary.players?.find((p) => p.userId === user?.id) || battleFinishedSummary.players?.[0];
    const opponentData = battleFinishedSummary.players?.find((p) => p.userId !== user?.id) || battleFinishedSummary.players?.[1];

    return (
      <div className="min-h-screen bg-stone-950 text-stone-100 flex flex-col items-center justify-center p-4 md:p-8 font-inter">
        <div className="w-full max-w-3xl bg-neutral-900 border border-neutral-800 rounded-3xl p-6 md:p-10 shadow-2xl relative overflow-hidden text-center">
          <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />

          {/* Result Banner */}
          <div className="mb-6">
            <div className={`inline-flex items-center justify-center w-20 h-20 rounded-full mb-4 border ${
              isWinner ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' : isDraw ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400' : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
            }`}>
              {isWinner ? <FaCrown className="text-4xl animate-bounce" /> : <FaTrophy className="text-3xl" />}
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold font-playfair tracking-tight mb-2">
              {battleFinishedSummary.forfeited
                ? (isWinner ? 'Victory by Opponent Forfeit!' : 'Match Forfeited')
                : (isWinner ? 'Victory!' : isDraw ? "It's a Draw!" : 'Defeat')}
            </h1>
            <p className="text-sm text-stone-400">
              {battleFinishedSummary.forfeited
                ? 'Your opponent disconnected and timed out after the 15-second grace period.'
                : 'Speed battle concluded! ELO ratings and leaderboard have been updated.'}
            </p>
          </div>

          {/* ELO & Score Comparison Cards */}
          <div className="grid grid-cols-2 gap-4 mb-8">
            {/* Self Player Card */}
            <div className={`p-5 rounded-2xl border ${isWinner ? 'bg-indigo-950/30 border-indigo-500/40' : 'bg-neutral-950 border-neutral-800'}`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-stone-400">You ({selfData?.username})</span>
                <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-indigo-500/20 text-indigo-300">
                  {selfData?.correctCount || 0}/10 Correct
                </span>
              </div>
              <div className="text-3xl font-extrabold text-stone-100 mb-1">{selfData?.score || 0} pts</div>
              <div className="flex items-center justify-between text-xs pt-2 border-t border-neutral-800/80">
                <span className="text-stone-400">ELO Rating:</span>
                <span className="font-bold flex items-center gap-1">
                  <span>{selfData?.oldElo || 1200}</span>
                  <span className="text-stone-600">→</span>
                  <span className="text-stone-100">{selfData?.newElo || 1200}</span>
                  <span className={`font-mono font-extrabold ml-1 ${
                    (selfData?.eloDelta || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}>
                    {(selfData?.eloDelta || 0) >= 0 ? `+${selfData?.eloDelta}` : selfData?.eloDelta}
                  </span>
                </span>
              </div>
            </div>

            {/* Opponent Card */}
            <div className="p-5 rounded-2xl bg-neutral-950 border border-neutral-800">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-stone-400">Opponent ({opponentData?.username})</span>
                <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-neutral-800 text-stone-400">
                  {opponentData?.correctCount || 0}/10 Correct
                </span>
              </div>
              <div className="text-3xl font-extrabold text-stone-100 mb-1">{opponentData?.score || 0} pts</div>
              <div className="flex items-center justify-between text-xs pt-2 border-t border-neutral-800/80">
                <span className="text-stone-400">ELO Rating:</span>
                <span className="font-bold flex items-center gap-1">
                  <span>{opponentData?.oldElo || 1200}</span>
                  <span className="text-stone-600">→</span>
                  <span className="text-stone-100">{opponentData?.newElo || 1200}</span>
                  <span className={`font-mono font-extrabold ml-1 ${
                    (opponentData?.eloDelta || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}>
                    {(opponentData?.eloDelta || 0) >= 0 ? `+${opponentData?.eloDelta}` : opponentData?.eloDelta}
                  </span>
                </span>
              </div>
            </div>
          </div>

          {/* Question Review Breakdown */}
          {battleFinishedSummary.questionBreakdown && (
            <div className="mb-8 text-left">
              <h3 className="text-sm font-bold uppercase tracking-wider text-stone-400 mb-3 flex items-center gap-2">
                <FaQuestionCircle className="text-indigo-400" /> Question Review Breakdown
              </h3>
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {battleFinishedSummary.questionBreakdown.map((q, idx) => (
                  <div key={idx} className="p-3 bg-stone-950/80 border border-neutral-800/80 rounded-xl text-xs">
                    <p className="font-semibold text-stone-200 mb-1">
                      <span className="text-indigo-400 font-bold mr-1">Q{q.index}:</span> {q.questionText}
                    </p>
                    <p className="text-emerald-400 font-medium">✓ Correct Answer: {q.correctAnswer}</p>
                    {q.explanation && <p className="text-stone-500 mt-0.5 italic">{q.explanation}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
            <button
              onClick={handleRequestRematch}
              disabled={rematchRequested}
              className="w-full sm:w-auto px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold rounded-xl text-sm transition-all shadow-lg flex items-center justify-center gap-2"
            >
              <FaRedo /> {rematchRequested ? 'Rematch Requested...' : 'Rematch'}
            </button>
            <button
              onClick={() => {
                setBattleFinishedSummary(null);
                setIsRanked1v1(false);
                setJoined(false);
                handleJoinMatchmaking();
              }}
              className="w-full sm:w-auto px-6 py-3 bg-neutral-800 hover:bg-neutral-700 text-stone-200 font-bold rounded-xl text-sm transition-all flex items-center justify-center gap-2"
            >
              <FaBolt className="text-amber-400" /> Find Next Match
            </button>
            <button
              onClick={() => navigate('/dashboard')}
              className="w-full sm:w-auto px-6 py-3 bg-neutral-900 hover:bg-neutral-850 text-stone-400 font-semibold rounded-xl text-sm transition-all"
            >
              Return to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // RENDER: 1v1 ACTIVE BATTLE ARENA (Split-Screen HUD)
  // ==========================================
  if (isRanked1v1 && status === 'playing') {
    const currentQ = rankedQuestions[activeQuestionIndex];

    return (
      <div className="min-h-screen bg-stone-950 text-stone-100 flex flex-col font-inter">
        <ReconnectBanner connected={isConnected} notice={disconnectNotice} />

        {/* SPLIT-SCREEN HUD HEADER */}
        <div className="bg-neutral-900 border-b border-neutral-800 px-4 md:px-8 py-3.5 sticky top-0 z-20 shadow-xl">
          <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
            {/* LEFT PLAYER: You */}
            <div className="flex items-center gap-3 flex-1">
              <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 border-2 border-indigo-500/40 flex items-center justify-center font-bold text-indigo-400 text-base shadow-md">
                {selfPlayer?.username?.[0]?.toUpperCase() || 'Y'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-bold text-sm text-stone-100 truncate">{selfPlayer?.username || 'You'}</span>
                  <span className="text-[10px] font-bold bg-indigo-500/20 text-indigo-400 px-1.5 py-0.5 rounded">
                    ELO {selfPlayer?.elo || 1200}
                  </span>
                </div>
                {/* Dynamic HP Bar */}
                <div className="w-full max-w-[180px] bg-neutral-950 h-2.5 rounded-full overflow-hidden border border-neutral-800">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-500"
                    style={{ width: `${selfPlayer?.hp ?? 100}%` }}
                  />
                </div>
                <div className="flex justify-between text-[11px] font-bold text-stone-400 mt-1 max-w-[180px]">
                  <span>HP {selfPlayer?.hp ?? 100}%</span>
                  <span className="text-emerald-400 font-extrabold">{selfPlayer?.score || 0} pts</span>
                </div>
              </div>
            </div>

            {/* CENTER HUD: Radial Countdown Timer & Question Indicator */}
            <div className="flex flex-col items-center justify-center px-4">
              <RadialCountdownTimer
                timeRemaining={rankedTimeRemaining}
                maxTime={rankedTimeLimit}
              />
              <span className="text-[11px] font-extrabold uppercase tracking-widest text-indigo-400 mt-1">
                Question {activeQuestionIndex + 1} of {rankedTotalQuestions}
              </span>
            </div>

            {/* RIGHT PLAYER: Opponent */}
            <div className="flex items-center justify-end gap-3 flex-1 text-right">
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-end gap-2 mb-1">
                  {opponentPlayer?.lockedIn && (
                    <span className="text-[10px] font-bold bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full animate-pulse flex items-center gap-1 border border-amber-500/40">
                      <FaBolt /> Answer Locked!
                    </span>
                  )}
                  <span className="text-[10px] font-bold bg-neutral-800 text-stone-400 px-1.5 py-0.5 rounded">
                    ELO {opponentPlayer?.elo || 1200}
                  </span>
                  <span className="font-bold text-sm text-stone-100 truncate">{opponentPlayer?.username || 'Opponent'}</span>
                </div>
                {/* Opponent HP Bar */}
                <div className="w-full max-w-[180px] ml-auto bg-neutral-950 h-2.5 rounded-full overflow-hidden border border-neutral-800">
                  <div
                    className="h-full bg-gradient-to-r from-rose-500 to-amber-500 transition-all duration-500"
                    style={{ width: `${opponentPlayer?.hp ?? 100}%` }}
                  />
                </div>
                <div className="flex justify-between text-[11px] font-bold text-stone-400 mt-1 max-w-[180px] ml-auto">
                  <span className="text-amber-400 font-extrabold">{opponentPlayer?.score || 0} pts</span>
                  <span>HP {opponentPlayer?.hp ?? 100}%</span>
                </div>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-neutral-800 border-2 border-neutral-700 flex items-center justify-center font-bold text-stone-300 text-base shadow-md">
                {opponentPlayer?.username?.[0]?.toUpperCase() || 'O'}
              </div>
            </div>
          </div>
        </div>

        {/* QUESTION DISPLAY & INTERACTIVE OPTIONS */}
        <div className="flex-1 flex flex-col items-center justify-center p-4 md:p-8">
          <div className="w-full max-w-3xl">
            <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 md:p-10 shadow-2xl relative overflow-hidden">
              <h2 className="text-xl md:text-2xl font-bold mb-8 leading-relaxed text-center font-playfair text-stone-100">
                {currentQ?.questionText}
              </h2>

              {/* Options Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {currentQ?.options?.map((option, idx) => {
                  let btnStyle = 'p-5 rounded-2xl border-2 text-sm font-semibold transition-all duration-200 text-left flex items-center justify-between ';

                  if (!rankedFeedback) {
                    if (rankedSelectedAnswer === idx) {
                      btnStyle += 'bg-indigo-600/20 border-indigo-500 text-indigo-300 shadow-lg';
                    } else {
                      btnStyle += 'bg-stone-950/60 border-neutral-800 hover:border-indigo-500/60 hover:bg-neutral-850 text-stone-200';
                    }
                  } else {
                    if (idx === rankedFeedback.correctAnswerIndex) {
                      btnStyle += 'bg-emerald-500/20 border-emerald-500 text-emerald-300 font-bold';
                    } else if (rankedSelectedAnswer === idx) {
                      btnStyle += 'bg-rose-500/20 border-rose-500 text-rose-300';
                    } else {
                      btnStyle += 'bg-stone-950/40 border-neutral-900 text-stone-600 opacity-40';
                    }
                  }

                  return (
                    <button
                      key={idx}
                      disabled={rankedAnswerSubmitted}
                      onClick={() => handleRankedAnswerSelect(idx)}
                      className={btnStyle}
                    >
                      <span>{option}</span>
                      {rankedFeedback && idx === rankedFeedback.correctAnswerIndex && (
                        <FaCheck className="text-emerald-400 text-base ml-2" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Feedback Drawer */}
              <AnimatePresence>
                {rankedFeedback && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-6 p-4 bg-indigo-950/40 border border-indigo-500/30 rounded-2xl text-xs text-stone-300 text-left"
                  >
                    <div className="flex items-center gap-2 font-bold text-sm mb-1">
                      {rankedFeedback.isCorrect ? (
                        <span className="text-emerald-400 flex items-center gap-1">
                          <FaCheck /> Correct! +{rankedFeedback.pointsEarned} pts
                        </span>
                      ) : (
                        <span className="text-rose-400">Incorrect</span>
                      )}
                    </div>
                    {rankedFeedback.explanation && <p className="text-stone-400 mt-1">{rankedFeedback.explanation}</p>}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // RENDER: CUSTOM LOBBY LOBBY WAITING SCREEN
  // ==========================================
  if (joined && status === 'waiting') {
    const activePlayers = Object.values(players);
    const myPlayer = players[socket.id];
    const isMeReady = myPlayer?.isReady;
    const isHost = hostUserId === user?.id;

    return (
      <div className="min-h-screen bg-stone-950 text-stone-200 p-6 md:p-12 font-inter">
        <ReconnectBanner connected={isConnected} />
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-center bg-neutral-900 border border-neutral-800 p-6 rounded-2xl shadow-xl">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-2xl font-bold text-stone-100">
                  Lobby: <span className="text-indigo-400 font-mono tracking-wider font-extrabold">{roomId}</span>
                </h1>
                {isPrivate ? <FaLock className="text-amber-500" /> : <FaUnlock className="text-emerald-500" />}
              </div>
              <p className="text-stone-400 text-sm flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping inline-block" />
                <span>{activePlayers.filter((p) => p.online).length} students online</span>
                <span className="text-neutral-700">•</span>
                <span className="text-stone-400 italic">"{roomName || 'Battle Arena'}"</span>
              </p>
            </div>

            <div className="flex gap-2 mt-4 md:mt-0">
              <button
                onClick={() => navigator.clipboard.writeText(roomId)}
                className="flex items-center text-xs font-semibold bg-neutral-800 hover:bg-neutral-700 px-4 py-2.5 rounded-xl border border-neutral-700 transition-colors"
              >
                <FaCopy className="mr-2" /> Code
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 bg-neutral-900 border border-neutral-800 p-6 rounded-2xl shadow-xl">
              <h2 className="text-lg font-bold mb-4 flex items-center border-b border-neutral-800 pb-3 text-stone-100">
                <FaUsers className="mr-2.5 text-indigo-400" /> Connected Students ({activePlayers.length})
              </h2>
              <div className="space-y-2">
                {activePlayers.map((player, idx) => (
                  <div key={idx} className="flex justify-between items-center p-3 bg-stone-950/60 rounded-xl border border-neutral-800/80">
                    <span className="font-semibold flex items-center text-sm">
                      <span className={`w-2.5 h-2.5 rounded-full mr-2.5 ${player.online ? 'bg-emerald-500' : 'bg-stone-600 animate-pulse'}`} />
                      {player.username}
                      {player.userId === hostUserId && <FaUserShield className="ml-2 text-indigo-400 text-xs" title="Lobby Host" />}
                    </span>
                    <span className="flex items-center gap-3">
                      {player.isReady ? (
                        <span className="text-emerald-400 text-xs font-bold flex items-center bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full">
                          <FaCheck className="mr-1" /> READY
                        </span>
                      ) : (
                        <span className="text-stone-500 text-xs bg-neutral-800 px-2.5 py-1 rounded-full font-semibold">NOT READY</span>
                      )}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-2xl shadow-xl flex flex-col justify-between items-center text-center">
              <div className="py-4">
                <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full mb-4 transition-all border ${
                  isMeReady ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-neutral-800 border-neutral-700 text-stone-500'
                }`}>
                  {isMeReady ? <FaCheck className="text-2xl" /> : <FaPlay className="text-2xl" />}
                </div>
                <h3 className="text-base font-bold text-stone-200">
                  {isMeReady ? 'Locked & Ready' : 'Prepare for Quiz'}
                </h3>
              </div>

              <div className="w-full space-y-2">
                <button
                  onClick={handleToggleReady}
                  className={`w-full py-3.5 rounded-xl font-bold text-sm transition-all shadow-md ${
                    isMeReady
                      ? 'bg-neutral-800 hover:bg-neutral-750 text-stone-300 border border-neutral-700'
                      : 'bg-emerald-500 hover:bg-emerald-600 text-stone-950 font-extrabold'
                  }`}
                >
                  {isMeReady ? 'Cancel Ready' : 'I am Ready!'}
                </button>
                {isHost && (
                  <button
                    onClick={handleStartGame}
                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition-all shadow-lg"
                  >
                    Force Start Battle
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // RENDER: CUSTOM LOBBY FINISHED SCREEN
  // ==========================================
  if (joined && status === 'finished') {
    const leaderboard = Object.values(players).sort((a, b) => b.score - a.score);
    const winner = leaderboard[0];

    return (
      <div className="min-h-screen bg-stone-950 text-stone-200 p-6 md:p-12 flex flex-col items-center justify-center font-inter">
        <ReconnectBanner connected={isConnected} />
        <div className="bg-neutral-900 border border-neutral-800 p-8 md:p-10 rounded-2xl shadow-2xl w-full max-w-2xl text-center relative overflow-hidden">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-yellow-500/10 border border-yellow-500/20 rounded-full mb-6">
            <FaCrown className="text-4xl text-yellow-400" />
          </div>
          <h1 className="text-4xl font-extrabold font-playfair text-stone-100 mb-2">Battle Finished!</h1>
          <p className="text-stone-400 text-sm mb-8">
            Winner: <span className="text-yellow-400 font-bold">{winner?.username}</span>
          </p>

          <button
            onClick={() => navigate('/dashboard')}
            className="px-8 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg transition-all text-sm"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // ==========================================
  // RENDER: CUSTOM LOBBY PLAYING SCREEN
  // ==========================================
  if (joined && status === 'playing') {
    const leaderboard = Object.values(players).sort((a, b) => b.score - a.score);

    return (
      <div className="min-h-screen bg-stone-950 text-stone-200 flex flex-col font-inter">
        <ReconnectBanner connected={isConnected} />
        <div className="bg-neutral-900 border-b border-neutral-800 p-4 sticky top-0 z-10 flex overflow-x-auto gap-4 items-center px-6 shadow-md">
          <span className="text-xs font-bold text-stone-500 uppercase tracking-wider mr-2 flex-shrink-0">Live Scores:</span>
          <div className="flex gap-2.5">
            {leaderboard.map((player, idx) => (
              <div key={idx} className="flex items-center bg-stone-950 px-3 py-1.5 rounded-xl border border-neutral-800">
                <span className="font-bold text-xs mr-2 text-stone-300">{player.username}</span>
                <span className="text-emerald-400 font-extrabold text-xs">{player.score}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex-1 p-6 md:p-12 flex flex-col items-center justify-center">
          <div className="w-full max-w-3xl">
            <div className="flex justify-between items-center text-xs font-bold text-indigo-400 uppercase tracking-widest mb-4">
              <span>Question {currentQuestionIndex + 1} of {totalQuestions}</span>
              <span className="flex items-center gap-1.5 bg-neutral-900 border border-neutral-800 px-3 py-1.5 rounded-full text-stone-300">
                <FaClock className="text-indigo-400 text-sm" /> {timeRemaining}s left
              </span>
            </div>

            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-8 shadow-2xl relative overflow-hidden">
              <h2 className="text-xl md:text-2xl font-bold mb-8 leading-relaxed text-center font-playfair text-stone-100">
                {currentQuestion?.questionText}
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {currentQuestion?.options?.map((option, idx) => (
                  <button
                    key={idx}
                    disabled={answerSubmitted || correctAnswerIndex !== null}
                    onClick={() => handleAnswerSelect(idx)}
                    className={`p-5 rounded-xl border-2 text-sm font-semibold transition-all duration-200 text-left ${
                      selectedAnswer === idx ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300' : 'bg-stone-950/60 border-neutral-800 text-stone-300'
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // RENDER: LANDING VIEW (Ranked Matchmaking + Custom Code Join)
  // ==========================================
  return (
    <div className="min-h-screen bg-stone-950 flex items-center justify-center p-4 text-stone-200 font-inter">
      <ReconnectBanner connected={isConnected} />
      <div className="bg-neutral-900 border border-neutral-800 p-8 rounded-3xl shadow-2xl w-full max-w-lg relative overflow-hidden">
        <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-indigo-500 to-purple-600" />

        <div className="text-center mb-6">
          <div className="p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl inline-block text-indigo-400 mb-3 shadow-inner">
            <FaBolt className="text-4xl text-indigo-400" />
          </div>
          <h1 className="text-3xl font-extrabold font-playfair text-stone-100 mb-1">Battle Arena</h1>
          <p className="text-stone-400 text-xs">
            Real-time 1v1 speed quiz battles with synchronized timers & ELO ratings
          </p>
        </div>

        {/* RANKED 1V1 QUICK MATCHMAKING CARD */}
        <div className="bg-neutral-950/80 border border-indigo-500/30 rounded-2xl p-5 mb-6 text-left relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
              <span className="text-xs font-bold uppercase tracking-wider text-stone-200">1v1 Speed Matchmaking</span>
            </div>
            <span className="text-xs px-2 py-0.5 rounded font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              ELO: {user?.eloRating || 1200}
            </span>
          </div>

          <div className="mb-4">
            <label className="block text-xs font-semibold text-stone-400 mb-1.5">Select Subject Area</label>
            <select
              value={selectedSubjectId}
              onChange={(e) => setSelectedSubjectId(e.target.value)}
              disabled={inQueue}
              className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2.5 text-stone-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="general">General (All Subjects)</option>
              {subjects.map((s) => (
                <option key={s.id || s._id} value={s.id || s._id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          {inQueue ? (
            <div className="space-y-3 text-center py-2">
              <div className="flex items-center justify-center gap-2 text-indigo-400 text-xs font-bold animate-pulse">
                <FaClock className="animate-spin" /> {queueStatus}
              </div>
              <button
                onClick={handleCancelMatchmaking}
                className="w-full py-2.5 bg-neutral-800 hover:bg-neutral-750 text-stone-300 font-bold rounded-xl text-xs transition-all border border-neutral-700"
              >
                Cancel Matchmaking
              </button>
            </div>
          ) : (
            <button
              onClick={handleJoinMatchmaking}
              className="w-full py-3.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-extrabold rounded-xl shadow-lg transition-all text-sm flex items-center justify-center gap-2"
            >
              <FaBolt /> Find Match (Ranked 1v1)
            </button>
          )}
        </div>

        {/* CUSTOM LOBBY ENTRY SECTION */}
        <div className="relative flex py-2 items-center mb-4">
          <div className="flex-grow border-t border-neutral-800" />
          <span className="flex-shrink-0 mx-4 text-stone-500 text-[10px] font-bold uppercase tracking-wider">
            OR JOIN / CREATE CUSTOM ROOM
          </span>
          <div className="flex-grow border-t border-neutral-800" />
        </div>

        <form onSubmit={handleJoin} className="space-y-3">
          <div>
            <input
              type="text"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value.toUpperCase())}
              placeholder="Enter 6-digit code"
              className="w-full bg-stone-950 border border-neutral-800 rounded-xl p-3 text-stone-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 uppercase tracking-widest text-center text-sm font-mono font-bold"
            />
          </div>
          {!showCreateModal && accessError && <p className="text-xs text-rose-400 text-center">{accessError}</p>}
          <button
            type="submit"
            disabled={accessPending}
            className="w-full py-3 bg-neutral-800 hover:bg-neutral-750 text-stone-200 font-bold rounded-xl transition-all text-xs flex items-center justify-center gap-2 border border-neutral-700"
          >
            {accessPending ? 'Connecting...' : 'Join Lobby'} <FaPlay className="text-[10px]" />
          </button>
        </form>

        <button
          onClick={() => {
            setAccessError('');
            setShowCreateModal(true);
          }}
          className="w-full mt-3 bg-neutral-900 hover:bg-neutral-850 text-stone-400 font-semibold py-2.5 rounded-xl border border-neutral-800 text-xs transition-all"
        >
          Create New Lobby
        </button>

        {/* Create Lobby Modal */}
        <AnimatePresence>
          {showCreateModal && (
            <motion.div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowCreateModal(false)}
            >
              <motion.div
                className="bg-neutral-900 w-full max-w-md rounded-3xl border border-neutral-800 shadow-2xl p-6 relative"
                initial={{ scale: 0.95 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.95 }}
                onClick={(e) => e.stopPropagation()}
              >
                <h2 className="text-xl font-bold text-stone-100 font-playfair mb-4">Create a New Lobby</h2>
                <div className="space-y-4 text-left">
                  <div>
                    <label className="block text-xs font-semibold text-stone-400 mb-1">Room Name</label>
                    <input
                      type="text"
                      value={roomName}
                      onChange={(e) => setRoomName(e.target.value)}
                      placeholder="My Battle Room"
                      className="w-full bg-stone-950 border border-neutral-800 rounded-xl px-4 py-3 text-stone-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-stone-400 mb-1">Questions</label>
                      <select
                        value={questionCount}
                        onChange={(e) => setQuestionCount(Number(e.target.value))}
                        className="w-full bg-stone-950 border border-neutral-800 rounded-xl px-3 py-2.5 text-stone-200 text-xs"
                      >
                        <option value="5">5 Questions</option>
                        <option value="10">10 Questions</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-stone-400 mb-1">Timer</label>
                      <select
                        value={timePerQuestion}
                        onChange={(e) => setTimePerQuestion(Number(e.target.value))}
                        className="w-full bg-stone-950 border border-neutral-800 rounded-xl px-3 py-2.5 text-stone-200 text-xs"
                      >
                        <option value="10">10 seconds</option>
                        <option value="15">15 seconds</option>
                        <option value="30">30 seconds</option>
                      </select>
                    </div>
                  </div>

                  {accessError && <p className="text-xs text-rose-400">{accessError}</p>}

                  <div className="pt-2 space-y-2">
                    <button
                      onClick={handleCreateRoom}
                      disabled={accessPending}
                      className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 rounded-xl transition-all shadow-md text-xs"
                    >
                      {accessPending ? 'Creating...' : 'Create Room'}
                    </button>
                    <button
                      onClick={() => setShowCreateModal(false)}
                      className="w-full bg-neutral-800 hover:bg-neutral-750 text-stone-400 font-bold py-2.5 rounded-xl text-xs"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default BattleArena;
