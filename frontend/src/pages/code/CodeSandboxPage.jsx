import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import CodeEditorSandbox from '../../components/code/CodeEditorSandbox';
import ExecutionConsole from '../../components/code/ExecutionConsole';
import { 
  Code, Users, PlusCircle, Share2, 
  ArrowLeft, Terminal, Cpu, BookOpen, AlertCircle
} from 'lucide-react';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5001',
  headers: {
    Authorization: `Bearer ${localStorage.getItem('token')}`,
  },
});

export default function CodeSandboxPage() {
  const { inviteCode } = useParams();
  const navigate = useNavigate();

  const [room, setRoom] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Creation State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createTitle, setCreateTitle] = useState('');
  const [createLanguage, setCreateLanguage] = useState('javascript');

  // Execution Console State
  const [isRunning, setIsRunning] = useState(false);
  const [executionResults, setExecutionResults] = useState(null);
  const [stdin, setStdin] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);

  // Load room details if viewing an existing session
  useEffect(() => {
    if (inviteCode) {
      fetchRoomDetails();
    } else {
      setRoom(null);
    }
  }, [inviteCode]);

  const fetchRoomDetails = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await api.get(`/api/code/rooms/${inviteCode}`);
      setRoom(res.data.room);
    } catch (err) {
      setErrorMsg(err.response?.data?.error || 'Failed to join collaborative room');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRoom = async (e) => {
    e.preventDefault();
    if (!createTitle) return;

    setErrorMsg('');
    try {
      const res = await api.post('/api/code/rooms', {
        title: createTitle,
        language: createLanguage,
      });

      setShowCreateModal(false);
      setCreateTitle('');
      // Navigate to the newly created room
      navigate(res.data.shareLink);
    } catch (err) {
      setErrorMsg(err.response?.data?.error || 'Failed to create coding room');
    }
  };

  const handleRunCode = async (lang, code) => {
    setIsRunning(true);
    setExecutionResults(null);

    // Compute standard test case from user stdin
    const testCases = [
      {
        input: stdin || '',
        expected: '', // Default output doesn't match standard expected in stdin mode
      },
    ];

    try {
      const res = await api.post('/api/code/run', {
        language: lang,
        code,
        testCases,
      });

      setExecutionResults(res.data);
    } catch (err) {
      setErrorMsg(err.response?.data?.error || 'Code compilation or execution failed');
    } finally {
      setIsRunning(false);
    }
  };

  const handleCopyLink = () => {
    const fullUrl = window.location.href;
    navigator.clipboard.writeText(fullUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 3000);
  };

  return (
    <div className="w-full max-w-7xl mx-auto p-4 md:p-6 text-slate-100 font-sans min-h-screen">
      
      {/* Top Header Panel */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8 bg-slate-900 border border-slate-800 p-6 rounded-3xl shadow-xl">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-2xl">
            <Code className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-black bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-400">
              Collaborative Code Sandbox
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Real-time conflict-free collaborative pair programming for technical interviews and CS exams.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto ml-auto">
          {room ? (
            <>
              <button
                onClick={handleCopyLink}
                className="flex items-center gap-1.5 px-4 py-2.5 bg-slate-800 hover:bg-slate-750 text-slate-200 font-bold text-xs rounded-xl transition cursor-pointer"
              >
                <Share2 className="w-4 h-4" />
                {copiedLink ? 'Link Copied!' : 'Share Room'}
              </button>
              <button
                onClick={() => navigate('/code/sandbox')}
                className="flex items-center gap-1.5 px-4 py-2.5 bg-slate-800 hover:bg-slate-750 text-slate-300 font-bold text-xs rounded-xl transition cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                Exit Room
              </button>
            </>
          ) : (
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-1.5 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-550 text-white font-bold text-xs rounded-xl shadow-lg transition cursor-pointer ml-auto"
            >
              <PlusCircle className="w-4 h-4" />
              Create Code Room
            </button>
          )}
        </div>
      </div>

      {errorMsg && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl text-xs mb-6 font-semibold flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          {errorMsg}
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center min-h-[400px] text-slate-450 italic">
          <Cpu className="w-12 h-12 animate-spin text-indigo-500 mb-3" />
          <span>Synchronizing document states...</span>
        </div>
      ) : room ? (
        /* Workspace layout */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Left panel: Editor */}
          <CodeEditorSandbox
            roomId={room.id}
            language={room.language}
            onCodeRun={handleRunCode}
            isRunning={isRunning}
          />

          {/* Right panel: Output Console */}
          <ExecutionConsole
            results={executionResults?.results}
            total={executionResults?.total}
            passed={executionResults?.passed}
            stdin={stdin}
            setStdin={setStdin}
          />
        </div>
      ) : (
        /* Hub Landing / Lobby view when no room is open */
        <div className="max-w-md mx-auto bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center space-y-6 shadow-xl mt-12">
          <Terminal className="w-16 h-16 text-indigo-500 mx-auto animate-pulse" />
          
          <div className="space-y-2">
            <h2 className="text-xl font-extrabold text-white">Collaborative Playground</h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              Create an isolated coding session room, invite your study squad mates, and compile code in real-time with zero conflict updates.
            </p>
          </div>

          <button
            onClick={() => setShowCreateModal(true)}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs rounded-xl shadow-lg transition cursor-pointer"
          >
            Create Collaborative Room
          </button>
        </div>
      )}

      {/* Creation Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-md text-left space-y-4 shadow-2xl">
            <h2 className="text-lg font-extrabold text-white flex items-center gap-1.5">
              <PlusCircle className="text-indigo-400 w-5 h-5" />
              Create Collaborative Coding Room
            </h2>

            <form onSubmit={handleCreateRoom} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Room Session Title</label>
                <input
                  type="text"
                  value={createTitle}
                  onChange={(e) => setCreateTitle(e.target.value)}
                  placeholder="e.g. DSA Session - Binary Search Trees"
                  className="w-full bg-slate-950 border border-slate-750 rounded-xl px-3 py-2.5 text-slate-200 outline-none text-xs"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Default Language</label>
                <select
                  value={createLanguage}
                  onChange={(e) => setCreateLanguage(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-750 rounded-xl px-3 py-2.5 text-slate-200 outline-none text-xs cursor-pointer"
                >
                  <option value="javascript">JavaScript</option>
                  <option value="python">Python 3</option>
                  <option value="cpp">C++</option>
                  <option value="java">Java</option>
                  <option value="go">Go</option>
                  <option value="rust">Rust</option>
                </select>
              </div>

              <div className="flex items-center gap-3 pt-3 border-t border-slate-800">
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg transition cursor-pointer"
                >
                  Create & Launch Room
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-5 py-2.5 bg-slate-800 hover:bg-slate-750 text-slate-300 font-bold text-xs rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
