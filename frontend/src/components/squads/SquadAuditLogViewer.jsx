import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  FileText, Search, Filter, Calendar, 
  ChevronLeft, ChevronRight, RefreshCw, Cpu
} from 'lucide-react';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5001',
  headers: {
    Authorization: `Bearer ${localStorage.getItem('token')}`,
  },
});

export default function SquadAuditLogViewer({ squadId }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Filtering states
  const [search, setSearch] = useState('');
  const [action, setAction] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalLogs, setTotalLogs] = useState(0);

  const fetchLogs = async () => {
    setLoading(true);
    setErrorMsg('');

    try {
      const res = await api.get(`/api/squads/${squadId}/audit-logs`, {
        params: {
          page: currentPage,
          limit: 10,
          action: action || undefined,
          search: search || undefined,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
        },
      });

      setLogs(res.data.logs || []);
      setTotalPages(res.data.pages || 1);
      setTotalLogs(res.data.total || 0);
    } catch (err) {
      setErrorMsg(err.response?.data?.error || 'Failed to load squad audit logs. Check your permissions.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [squadId, currentPage, action, startDate, endDate]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchLogs();
  };

  const renderMetadata = (meta) => {
    if (!meta || Object.keys(meta).length === 0) return null;
    return (
      <div className="mt-1.5 p-2 bg-slate-900 border border-slate-850 rounded-lg text-[10px] text-slate-400 font-mono space-y-0.5">
        {Object.entries(meta).map(([key, val]) => (
          <div key={key}>
            <span className="text-slate-500 font-bold">{key}:</span> {typeof val === 'object' ? JSON.stringify(val) : String(val)}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl text-left space-y-6 w-full">
      
      {/* Title block */}
      <div className="flex items-center justify-between border-b border-slate-850 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-xl">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Squad Audit Logs Explorer</h2>
            <p className="text-xs text-slate-400 mt-0.5">Track modifications, role changes, and admin activities.</p>
          </div>
        </div>

        <button
          onClick={fetchLogs}
          disabled={loading}
          className="p-2 bg-slate-950 border border-slate-800 text-slate-300 hover:text-white rounded-xl transition cursor-pointer"
          title="Refresh Log Stream"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {errorMsg && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl text-xs font-semibold">
          {errorMsg}
        </div>
      )}

      {/* Filter / Search Bar */}
      <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 md:grid-cols-12 gap-3 bg-slate-950 p-4 rounded-2xl border border-slate-850">
        
        {/* Keyword actor search */}
        <div className="md:col-span-4 relative">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search actor name/email..."
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-200 outline-none focus:border-indigo-500"
          />
        </div>

        {/* Action Type selector */}
        <div className="md:col-span-3">
          <select
            value={action}
            onChange={(e) => { setAction(e.target.value); setCurrentPage(1); }}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-200 outline-none cursor-pointer focus:border-indigo-500"
          >
            <option value="">All Action Types</option>
            <option value="MEMBER_JOINED">Member Joined</option>
            <option value="MEMBER_KICKED">Member Kicked</option>
            <option value="ROLE_CHANGED">Role Changed</option>
            <option value="DECK_CREATED">Deck Created</option>
            <option value="DECK_MODIFIED">Deck Modified</option>
            <option value="NOTE_DELETED">Note Deleted</option>
            <option value="INVITE_REVOKED">Invite Revoked</option>
          </select>
        </div>

        {/* Start Date */}
        <div className="md:col-span-2 relative">
          <input
            type="date"
            value={startDate}
            onChange={(e) => { setStartDate(e.target.value); setCurrentPage(1); }}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none focus:border-indigo-500"
            title="Start Date filter"
          />
        </div>

        {/* End Date */}
        <div className="md:col-span-2 relative">
          <input
            type="date"
            value={endDate}
            onChange={(e) => { setEndDate(e.target.value); setCurrentPage(1); }}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none focus:border-indigo-500"
            title="End Date filter"
          />
        </div>

        {/* Filter button */}
        <button
          type="submit"
          className="md:col-span-1 bg-indigo-600 hover:bg-indigo-550 text-white font-bold rounded-xl py-2 px-3 text-xs shadow-md transition cursor-pointer"
        >
          Go
        </button>
      </form>

      {/* Logs Feed Timeline */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-12 text-slate-450 italic">
          <Cpu className="w-10 h-10 animate-spin text-indigo-500 mb-3" />
          <span>Scanning audit records...</span>
        </div>
      ) : logs.length === 0 ? (
        <div className="text-center py-12 bg-slate-950/20 border border-slate-850 rounded-2xl text-slate-450 italic text-xs">
          No audit logs matching selection filters.
        </div>
      ) : (
        <div className="space-y-4">
          <div className="relative pl-6 border-l-2 border-slate-800 space-y-6">
            {logs.map((log) => (
              <div key={log.id} className="relative text-xs">
                {/* Visual Bullet indicator */}
                <span className="absolute -left-[31px] top-1.5 w-2.5 h-2.5 rounded-full bg-indigo-500 border-2 border-slate-900 block" />

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-850/40 pb-3">
                  <div>
                    <span className="font-extrabold text-slate-200">
                      {log.actor?.name || 'System / Unregistered'}
                    </span>{' '}
                    <span className="text-[10px] bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 font-bold px-2 py-0.5 rounded-md uppercase ml-1.5">
                      {log.action}
                    </span>
                    
                    {renderMetadata(log.metadata)}
                  </div>

                  <div className="text-left sm:text-right shrink-0">
                    <div className="text-[10px] text-slate-450">
                      {new Date(log.created_at || log.createdAt).toLocaleString()}
                    </div>
                    <div className="text-[9px] text-slate-550 mt-0.5">IP: {log.ipAddress}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination Toolbar */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-slate-850 pt-4 text-xs font-bold text-slate-400">
              <span>Total: {totalLogs} logs</span>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-1.5 bg-slate-950 border border-slate-800 rounded-lg hover:text-white disabled:opacity-50 transition cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span>Page {currentPage} of {totalPages}</span>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="p-1.5 bg-slate-950 border border-slate-800 rounded-lg hover:text-white disabled:opacity-50 transition cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
