import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Users, FileText, Layers, Star, Search, Filter, TrendingUp, Loader2,
  AlertCircle, Grid3X3, ChevronDown, X, User,
} from 'lucide-react';
import {
  fetchDiscoverResources, fetchTrendingResources, fetchCommunityStats,
  fetchResourceDetail, rateResource, clearCommunityError, clearSelectedResource,
} from '../store/slices/communityResourceSlice';
import ResourceCard, { StarRating } from '../components/communityHub/ResourceCard';

const CommunityResourceHub = () => {
  const dispatch = useDispatch();
  const { resources, pagination, trending, stats, selectedResource, loading, error } = useSelector(
    (s) => s.communityResources
  );

  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [sortOption, setSortOption] = useState('recent');
  const [activeTab, setActiveTab] = useState('discover');
  const [showDetail, setShowDetail] = useState(false);

  useEffect(() => {
    dispatch(fetchCommunityStats());
    dispatch(fetchTrendingResources(10));
    dispatch(fetchDiscoverResources({ sort: 'recent', limit: 20 }));
  }, [dispatch]);

  useEffect(() => {
    if (error) { const t = setTimeout(() => dispatch(clearCommunityError()), 5000); return () => clearTimeout(t); }
  }, [error, dispatch]);

  const handleSearch = () => {
    dispatch(fetchDiscoverResources({ search: searchQuery, type: typeFilter || undefined, sort: sortOption, limit: 20 }));
  };

  const handleResourceClick = (resource) => {
    dispatch(fetchResourceDetail({ resourceId: resource.id, resourceType: resource.type }));
    setShowDetail(true);
  };

  const handleRate = (stars) => {
    if (selectedResource) {
      dispatch(rateResource({ resourceId: selectedResource.id, resourceType: selectedResource.type, stars }));
    }
  };

  const tabs = [
    { id: 'discover', label: 'Discover', icon: Grid3X3 },
    { id: 'trending', label: 'Trending', icon: TrendingUp },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-pink-600 flex items-center justify-center">
            <Users className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Community Resource Hub</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">Discover, rate, and share study resources with the community</p>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-500" />
            <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
            <button onClick={() => dispatch(clearCommunityError())} className="ml-auto text-red-500">✕</button>
          </div>
        )}

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 text-center">
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalUsers}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Students</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 text-center">
              <p className="text-2xl font-bold text-blue-600">{stats.publicNotes}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Shared Notes</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 text-center">
              <p className="text-2xl font-bold text-purple-600">{stats.publicDecks}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Flashcard Decks</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 text-center">
              <p className="text-2xl font-bold text-amber-600">{stats.totalRatings}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Ratings</p>
            </div>
          </div>
        )}

        {/* Search + Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Search notes, decks, topics..."
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-700 dark:text-gray-300">
              <option value="">All Types</option>
              <option value="notes">Notes</option>
              <option value="decks">Decks</option>
            </select>
            <select value={sortOption} onChange={(e) => setSortOption(e.target.value)} className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-700 dark:text-gray-300">
              <option value="recent">Most Recent</option>
              <option value="popular">Most Popular</option>
              <option value="rating">Highest Rated</option>
            </select>
            <button onClick={handleSearch} className="px-4 py-2 rounded-lg bg-gradient-to-r from-orange-500 to-pink-600 text-white text-sm font-medium hover:from-orange-600 hover:to-pink-700 transition-all">
              Search
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 mb-6 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-1 w-fit">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${activeTab === tab.id ? 'bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-750'}`}>
                <Icon className="w-4 h-4" />{tab.label}
              </button>
            );
          })}
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="w-8 h-8 mx-auto text-orange-500 animate-spin" />
          </div>
        )}

        {/* Discover Grid */}
        {!loading && activeTab === 'discover' && (
          <>
            {resources.length === 0 ? (
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center">
                <Layers className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">No resources found</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">Try adjusting your search or filters</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {resources.map((r) => (
                  <ResourceCard key={r.id} resource={r} onClick={() => handleResourceClick(r)} />
                ))}
              </div>
            )}
            {pagination && pagination.totalPages > 1 && (
              <div className="flex justify-center mt-6 gap-2">
                {Array.from({ length: Math.min(pagination.totalPages, 5) }, (_, i) => (
                  <button key={i} className="w-8 h-8 rounded-lg text-sm font-medium bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-orange-50 dark:hover:bg-orange-900/20">
                    {i + 1}
                  </button>
                ))}
              </div>
            )}
          </>
        )}

        {/* Trending */}
        {!loading && activeTab === 'trending' && (
          <div className="space-y-3">
            {trending.length === 0 ? (
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center">
                <TrendingUp className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
                <p className="text-sm text-gray-500 dark:text-gray-400">No trending resources yet</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {trending.map((r, i) => (
                  <div key={r.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 flex items-center gap-4 hover:shadow-md transition-all cursor-pointer" onClick={() => handleResourceClick(r)}>
                    <span className="text-2xl font-bold text-gray-300 dark:text-gray-600 w-8 text-center">#{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-semibold text-gray-900 dark:text-white truncate">{r.title}</h4>
                      <div className="flex items-center gap-2 text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                        {r.author && <span>{r.author.name}</span>}
                        <span>{r.cardCount} cards</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <StarRating rating={r.avgRating} count={r.ratingCount} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Detail Modal */}
        {showDetail && selectedResource && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => { setShowDetail(false); dispatch(clearSelectedResource()); }}>
            <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-lg w-full max-h-[80vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">{selectedResource.title}</h3>
                <button onClick={() => { setShowDetail(false); dispatch(clearSelectedResource()); }} className="p-1 text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
              </div>

              {selectedResource.author && (
                <div className="flex items-center gap-2 mb-3 text-sm text-gray-600 dark:text-gray-400">
                  <User className="w-4 h-4" />{selectedResource.author.name}
                  {selectedResource.subject && <span className="px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-xs">{selectedResource.subject.name}</span>}
                </div>
              )}

              {selectedResource.description && <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">{selectedResource.description}</p>}

              {selectedResource.type === 'deck' && selectedResource.cards && (
                <div className="space-y-2 mb-4">
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{selectedResource.cardCount} cards</p>
                  {selectedResource.cards.slice(0, 5).map((card, i) => (
                    <div key={i} className="p-2 rounded bg-gray-50 dark:bg-gray-900 text-xs">
                      <p className="font-medium text-gray-900 dark:text-white">{card.front}</p>
                      <p className="text-gray-500 dark:text-gray-400 mt-0.5">{card.back}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Rating */}
              {selectedResource.type === 'deck' && (
                <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Rate this deck</p>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <button key={s} onClick={() => handleRate(s)} className="p-0.5">
                        <Star className={`w-6 h-6 ${s <= Math.round(selectedResource.ratings?.avgRating || 0) ? 'fill-amber-400 text-amber-400' : 'text-gray-300 dark:text-gray-600 hover:text-amber-300'}`} />
                      </button>
                    ))}
                    <span className="text-sm text-gray-600 dark:text-gray-400 ml-2">
                      {selectedResource.ratings?.avgRating || 0} ({selectedResource.ratings?.totalRatings || 0} ratings)
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CommunityResourceHub;
