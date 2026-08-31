import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchFlashcards, deleteFlashcard } from '../store/slices/flashcardSlice';
import API from '../services/api';
import CreateDeckModal from '../components/dashboard/CreateDeckModal';
import CreateFlashcardDeckModal from '../components/flashcards/CreateFlashcardDeckModal';
import YouTubeFlashcardImporter from '../components/flashcards/YouTubeFlashcardImporter';
import DeckCollaboratorsModal from '../components/flashcards/DeckCollaboratorsModal';
import MathRenderer from '../components/common/MathRenderer';
import { Search, Trash2, Plus, ChevronLeft, ChevronRight, PlaySquare as Youtube, Share2, Copy, Check, BookOpen, Layers, Globe, Lock, Users, FileImage } from 'lucide-react';

const Flashcards = () => {
  const dispatch = useDispatch();
  const { flashcards, pagination, loading, error } = useSelector((state) => state.flashcards);

  // Tab state: 'decks' or 'cards'
  const [activeTab, setActiveTab] = useState('decks');

  // Filter & pagination state for cards
  const [search, setSearch] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [topicId, setTopicId] = useState('');
  const [deckId, setDeckId] = useState('');
  const [sortBy, setSortBy] = useState('nextReviewDate');
  const [order, setOrder] = useState('ASC');
  const [page, setPage] = useState(1);

  // Metadata & Decks state
  const [subjects, setSubjects] = useState([]);
  const [topics, setTopics] = useState([]);
  const [decks, setDecks] = useState([]);
  const [decksLoading, setDecksLoading] = useState(true);

  // Modals state
  const [showCreateCardModal, setShowCreateCardModal] = useState(false);
  const [showCreateDeckModal, setShowCreateDeckModal] = useState(false);
  const [showYoutubeModal, setShowYoutubeModal] = useState(false);
  const [showCollaboratorsModal, setShowCollaboratorsModal] = useState(false);
  const [selectedDeckForCollaborators, setSelectedDeckForCollaborators] = useState(null);
  
  // Create card target IDs
  const [targetDeckId, setTargetDeckId] = useState('');
  const [targetSubjectId, setTargetSubjectId] = useState('');

  // Copy state for share links
  const [copiedDeckId, setCopiedDeckId] = useState(null);

  const fetchDecks = async () => {
    setDecksLoading(true);
    try {
      const res = await API.get('/flashcard-decks');
      setDecks(res.data.data || []);
    } catch (err) {
      console.error('Failed to load flashcard decks', err);
    } finally {
      setDecksLoading(false);
    }
  };

  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        const subRes = await API.get('/academic/subjects');
        setSubjects(subRes.data.data || []);
        const topRes = await API.get('/academic/topics');
        setTopics(topRes.data.data || []);
      } catch (err) {
        console.error('Failed to load metadata', err);
      }
    };
    fetchMetadata();
    fetchDecks();
  }, []);

  useEffect(() => {
    if (activeTab === 'cards') {
      const params = {
        page,
        limit: 12,
        sortBy,
        order,
      };
      if (search.trim()) params.search = search;
      if (subjectId) params.subjectId = subjectId;
      if (topicId) params.topicId = topicId;
      if (deckId) params.deckId = deckId;

      dispatch(fetchFlashcards(params));
    }
  }, [dispatch, page, search, subjectId, topicId, deckId, sortBy, order, activeTab]);

  const handleDeleteCard = (cardId) => {
    if (window.confirm('Are you sure you want to delete this flashcard?')) {
      dispatch(deleteFlashcard(cardId)).then(() => {
        // Refresh deck list to update card counts
        fetchDecks();
      });
    }
  };

  const handleDeleteDeck = async (id, e) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this deck? All flashcards inside it will be unassociated.')) {
      try {
        await API.delete(`/flashcard-decks/${id}`);
        fetchDecks();
      } catch (err) {
        console.error('Failed to delete deck', err);
      }
    }
  };

  const handleShareDeck = async (id, e) => {
    e.stopPropagation();
    try {
      const res = await API.post(`/flashcard-decks/${id}/share`);
      if (res.data?.success) {
        const deckId = res.data.data.id;
        const shareLink = `${window.location.origin}/decks/shared/${deckId}`;
        navigator.clipboard.writeText(shareLink);
        setCopiedDeckId(id);
        setTimeout(() => setCopiedDeckId(null), 2000);
        fetchDecks();
      }
    } catch (err) {
      console.error('Failed to share deck', err);
      alert(err.response?.data?.error || 'Failed to share deck. Please try again.');
    }
  };

  const handleOpenCollaborators = (deck, e) => {
    e.stopPropagation();
    setSelectedDeckForCollaborators(deck);
    setShowCollaboratorsModal(true);
  };

  const handleViewDeckCards = (id) => {
    setDeckId(id);
    setActiveTab('cards');
    setPage(1);
  };

  const handlePrevPage = () => {
    if (page > 1) setPage(page - 1);
  };

  const handleNextPage = () => {
    if (page < pagination.totalPages) setPage(page + 1);
  };

  return (
    <div className="container mx-auto p-6 max-w-7xl min-h-screen text-[#1F150C] dark:text-[#E1DCC9] font-inter transition-colors">
      
      {/* Title Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight font-playfair">
            Study Flashcards
          </h1>
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            Create decks, share study sets with classmates, and leverage spaced repetition to master content.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => setShowYoutubeModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-semibold shadow-md transition cursor-pointer text-sm"
          >
            <Youtube className="w-4 h-4" />
            YouTube Import
          </button>
          <button
            onClick={() => setShowOCRModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-semibold shadow-md transition cursor-pointer text-sm"
          >
            <FileImage className="w-4 h-4" />
            Image/PDF Import
          </button>
          <button
            onClick={() => {
              setTargetDeckId('');
              setTargetSubjectId(subjects[0]?.id || '');
              setShowCreateCardModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold shadow-md transition cursor-pointer text-sm"
          >
            <Plus className="w-4 h-4" />
            Add Flashcard
          </button>
          <button
            onClick={() => setShowCreateDeckModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-semibold shadow-md transition cursor-pointer text-sm"
          >
            <Plus className="w-4 h-4" />
            New Deck
          </button>
        </div>
      </div>

      {/* Tabs Switch */}
      <div className="flex border-b border-neutral-200 dark:border-neutral-800 mb-6">
        <button
          onClick={() => setActiveTab('decks')}
          className={`px-5 py-2.5 font-bold text-sm border-b-2 transition cursor-pointer flex items-center gap-2 ${
            activeTab === 'decks'
              ? 'border-amber-500 text-amber-600 dark:text-amber-400 font-extrabold'
              : 'border-transparent text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'
          }`}
        >
          <Layers className="w-4 h-4" />
          My Decks
        </button>
        <button
          onClick={() => {
            setActiveTab('cards');
            setDeckId('');
          }}
          className={`px-5 py-2.5 font-bold text-sm border-b-2 transition cursor-pointer flex items-center gap-2 ${
            activeTab === 'cards' && !deckId
              ? 'border-amber-500 text-amber-600 dark:text-amber-400 font-extrabold'
              : 'border-transparent text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          All Flashcards
        </button>
        {deckId && activeTab === 'cards' && (
          <span className="px-5 py-2.5 font-semibold text-sm border-b-2 border-indigo-500 text-indigo-600 dark:text-indigo-400 flex items-center gap-2">
            <Layers className="w-4 h-4" />
            Deck Cards Filter Active
            <button
              onClick={() => setDeckId('')}
              className="text-red-500 hover:text-red-700 font-bold ml-1 text-xs cursor-pointer"
            >
              (Clear)
            </button>
          </span>
        )}
      </div>

      {/* DECKS VIEW TAB */}
      {activeTab === 'decks' && (
        <div>
          {decksLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="animate-pulse bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 h-44 rounded-2xl" />
              ))}
            </div>
          ) : decks.length === 0 ? (
            <div className="text-center py-16 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-8">
              <Layers className="w-12 h-12 text-neutral-400 mx-auto mb-4" />
              <h3 className="text-lg font-bold">No Flashcard Decks Yet</h3>
              <p className="text-neutral-500 dark:text-neutral-400 text-sm mt-1 max-w-md mx-auto">
                Create a study deck to categorize your flashcards and share them with classmates or clone them into public links!
              </p>
              <button
                onClick={() => setShowCreateDeckModal(true)}
                className="mt-4 inline-flex items-center gap-2 px-5 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-bold shadow-md transition text-sm cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Create Your First Deck
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {decks.map((deck) => (
                <div
                  key={deck.id}
                  className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-850 rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-amber-600/30 transition flex flex-col justify-between"
                >
                  <div>
                    <div className="flex justify-between items-start gap-4 mb-3">
                      <h3 className="text-lg font-extrabold font-playfair">{deck.name}</h3>
                      <button
                        onClick={(e) => handleDeleteDeck(deck.id, e)}
                        className="text-neutral-400 hover:text-red-500 transition cursor-pointer"
                        title="Delete Deck"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="flex flex-wrap gap-2 mb-4">
                      {deck.subjectRef ? (
                        <span className="text-[10px] font-semibold px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-full">
                          {deck.subjectRef.name}
                        </span>
                      ) : (
                        <span className="text-[10px] font-semibold px-2 py-0.5 bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 rounded-full">
                          General
                        </span>
                      )}

                      <button
                        onClick={(e) => handleToggleVisibility(deck.id, deck.isPublic, e)}
                        className="text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 transition cursor-pointer hover:opacity-80"
                        title={deck.isPublic ? 'Make private' : 'Make public'}
                      >
                        {deck.isPublic ? (
                          <span className="bg-green-50 dark:bg-green-950/40 text-green-600 dark:text-green-400 flex items-center gap-1">
                            <Globe className="w-2.5 h-2.5" /> Shared
                          </span>
                        ) : (
                          <span className="bg-neutral-50 dark:bg-neutral-800/40 text-neutral-400 dark:text-neutral-500 flex items-center gap-1">
                            <Lock className="w-2.5 h-2.5" /> Private
                          </span>
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="border-t border-neutral-100 dark:border-neutral-850 pt-4 mt-2 flex justify-between items-center">
                    <div className="text-xs text-neutral-400">
                      Cards: <strong className="text-neutral-600 dark:text-neutral-300">{deck.cardCount || 0}</strong> • Clones: <strong className="text-neutral-600 dark:text-neutral-300">{deck.cloneCount || 0}</strong>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={(e) => handleOpenCollaborators(deck, e)}
                        className="p-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer bg-white dark:bg-neutral-900 border-neutral-300 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800"
                        title="Manage collaborators"
                      >
                        <Users className="w-3.5 h-3.5" />
                        Team
                      </button>

                      <button
                        onClick={(e) => handleShareDeck(deck.id, e)}
                        className={`p-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                          copiedDeckId === deck.id
                            ? 'bg-green-50 dark:bg-green-950/20 border-green-200 text-green-600'
                            : 'bg-white dark:bg-neutral-900 border-neutral-300 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800'
                        }`}
                        title="Copy public deck URL"
                      >
                        {copiedDeckId === deck.id ? <Check className="w-3.5 h-3.5" /> : <Share2 className="w-3.5 h-3.5" />}
                        {copiedDeckId === deck.id ? 'Copied!' : 'Share'}
                      </button>

                      <button
                        onClick={() => handleViewDeckCards(deck.id)}
                        className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs rounded-lg transition cursor-pointer"
                      >
                        View Cards
                      </button>

                      <button
                        onClick={() => {
                          setTargetDeckId(deck.id);
                          setTargetSubjectId(deck.subject || subjects[0]?.id || '');
                          setShowCreateCardModal(true);
                        }}
                        className="p-1.5 bg-neutral-900 dark:bg-neutral-100 text-white dark:text-black hover:bg-neutral-800 rounded-lg transition cursor-pointer"
                        title="Add card directly to this deck"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* CARDS LIST VIEW TAB */}
      {activeTab === 'cards' && (
        <div>
          {/* Filter Controls Bar */}
          <div className="bg-white dark:bg-neutral-900 rounded-2xl p-4 shadow-sm border border-neutral-200 dark:border-neutral-800 mb-6 flex flex-wrap gap-4 items-center">
            {/* Search */}
            <div className="relative flex-1 min-w-[240px]">
              <Search className="absolute left-3 top-2.5 w-5 h-5 text-neutral-400" />
              <input
                type="text"
                placeholder="Search cards..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="pl-10 pr-4 py-2 w-full border border-neutral-300 dark:border-neutral-700 rounded-xl bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 focus:ring-2 focus:ring-amber-500 focus:outline-none text-sm transition"
              />
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-3 items-center">
              <select
                value={subjectId}
                onChange={(e) => {
                  setSubjectId(e.target.value);
                  setTopicId('');
                  setPage(1);
                }}
                className="border border-neutral-300 dark:border-neutral-700 rounded-xl px-3 py-2 bg-white dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 transition"
              >
                <option value="">All Subjects</option>
                {subjects.map((sub) => (
                  <option key={sub.id} value={sub.id}>
                    {sub.name}
                  </option>
                ))}
              </select>

              <select
                value={topicId}
                onChange={(e) => {
                  setTopicId(e.target.value);
                  setPage(1);
                }}
                className="border border-neutral-300 dark:border-neutral-700 rounded-xl px-3 py-2 bg-white dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 transition"
                disabled={!subjectId}
              >
                <option value="">All Topics</option>
                {topics
                  .filter((top) => top.subject === subjectId)
                  .map((top) => (
                    <option key={top.id} value={top.id}>
                      {top.name}
                    </option>
                  ))}
              </select>

              {/* Deck Filter */}
              <select
                value={deckId}
                onChange={(e) => {
                  setDeckId(e.target.value);
                  setPage(1);
                }}
                className="border border-neutral-300 dark:border-neutral-700 rounded-xl px-3 py-2 bg-white dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 transition"
              >
                <option value="">All Decks</option>
                {decks.map((dk) => (
                  <option key={dk.id} value={dk.id}>
                    {dk.name}
                  </option>
                ))}
              </select>

              {/* Sort By */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="border border-neutral-300 dark:border-neutral-700 rounded-xl px-3 py-2 bg-white dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 transition"
              >
                <option value="nextReviewDate">Review Date</option>
                <option value="createdAt">Date Created</option>
                <option value="front">Question text</option>
              </select>

              {/* Order */}
              <select
                value={order}
                onChange={(e) => setOrder(e.target.value)}
                className="border border-neutral-300 dark:border-neutral-700 rounded-xl px-3 py-2 bg-white dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 transition"
              >
                <option value="ASC">Ascending</option>
                <option value="DESC">Descending</option>
              </select>
            </div>
          </div>

          {error && <div className="p-4 mb-6 bg-red-100 text-red-700 rounded-xl">{error}</div>}

          {/* Grid of Flashcards */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="animate-pulse bg-neutral-100 dark:bg-neutral-850 h-48 rounded-2xl" />
              ))}
            </div>
          ) : flashcards.length === 0 ? (
            <div className="text-center py-12 text-neutral-500 dark:text-neutral-400">
              No flashcards found. Create a card inside a deck or add a card to get started!
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {flashcards.map((card) => (
                <div
                  key={card.id}
                  className="bg-white dark:bg-neutral-900 rounded-2xl p-5 border border-neutral-200 dark:border-neutral-800 shadow-sm hover:shadow-md transition flex flex-col justify-between"
                >
                  <div>
                    <div className="flex justify-between items-start gap-2 mb-3">
                      <span className="text-[10px] font-semibold px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-full">
                        {card.subject?.name || 'Subject'}
                      </span>
                      <button
                        onClick={() => handleDeleteCard(card.id)}
                        className="text-neutral-400 hover:text-red-500 transition cursor-pointer"
                        aria-label="Delete flashcard"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                    <h3 className="text-lg font-bold text-neutral-900 dark:text-neutral-100 mb-2">
                      <MathRenderer text={card.front} />
                    </h3>
                    <p className="text-sm text-neutral-600 dark:text-neutral-300">
                      <MathRenderer text={card.back} />
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-neutral-100 dark:border-neutral-850 flex justify-between items-center text-xs text-neutral-400">
                    <span>Reps: {card.repetitions || 0}</span>
                    <span>EF: {card.efactor?.toFixed(1) || '2.5'}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination Controls */}
          {pagination.totalPages > 1 && (
            <div className="flex justify-between items-center bg-white dark:bg-neutral-900 p-4 rounded-2xl shadow-sm border border-neutral-200 dark:border-neutral-800">
              <button
                onClick={handlePrevPage}
                disabled={page === 1 || loading}
                aria-label="Previous Page"
                className="flex items-center gap-1.5 px-3 py-1.5 border border-neutral-300 dark:border-neutral-700 rounded-xl text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-neutral-50 dark:hover:bg-neutral-800 transition text-neutral-700 dark:text-neutral-300"
              >
                <ChevronLeft className="w-4 h-4" /> Previous
              </button>
              <span className="text-sm text-neutral-600 dark:text-neutral-400 font-medium">
                Page {page} of {pagination.totalPages}
              </span>
              <button
                onClick={handleNextPage}
                disabled={page === pagination.totalPages || loading}
                aria-label="Next Page"
                className="flex items-center gap-1.5 px-3 py-1.5 border border-neutral-300 dark:border-neutral-700 rounded-xl text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-neutral-50 dark:hover:bg-neutral-800 transition text-neutral-700 dark:text-neutral-300"
              >
                Next <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* MODALS */}
      {showCreateCardModal && (
        <CreateDeckModal
          subjectId={targetSubjectId}
          deckId={targetDeckId}
          onClose={() => setShowCreateCardModal(false)}
          onCreated={() => {
            setPage(1);
            fetchDecks();
            if (activeTab === 'cards') {
              dispatch(fetchFlashcards({ page: 1, limit: 12, sortBy, order, deckId: targetDeckId }));
            }
          }}
        />
      )}

      {showCreateDeckModal && (
        <CreateFlashcardDeckModal
          isOpen={showCreateDeckModal}
          onClose={() => setShowCreateDeckModal(false)}
          subjects={subjects}
          onCreated={() => {
            fetchDecks();
          }}
        />
      )}

      {showYoutubeModal && (
        <YouTubeFlashcardImporter
          isOpen={showYoutubeModal}
          onClose={() => setShowYoutubeModal(false)}
          onImported={() => {
            setPage(1);
            fetchDecks();
            if (activeTab === 'cards') {
              dispatch(fetchFlashcards({ page: 1, limit: 12, sortBy, order }));
            }
          }}
        />
      )}

      {showCollaboratorsModal && selectedDeckForCollaborators && (
        <DeckCollaboratorsModal
          isOpen={showCollaboratorsModal}
          onClose={() => {
            setShowCollaboratorsModal(false);
            setSelectedDeckForCollaborators(null);
          }}
          deckId={selectedDeckForCollaborators.id}
          deckName={selectedDeckForCollaborators.name}
          isOwner={true}
          canAdmin={true}
        />
      )}
    </div>
  );
};

export default Flashcards;
