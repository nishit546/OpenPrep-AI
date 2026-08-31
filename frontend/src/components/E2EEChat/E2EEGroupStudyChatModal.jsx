import React, { useState, useEffect, useRef } from 'react';
import {
  Lock,
  Unlock,
  ShieldCheck,
  X,
  Send,
  Clock,
  Flame,
  FileText,
  Image as ImageIcon,
  Paperclip,
  Users,
  Download,
  Eye,
  AlertTriangle,
  Key,
  CheckCircle2,
  Trash2,
} from 'lucide-react';
import { deriveKeyFromPassphrase, encryptText, decryptText, encryptBuffer, decryptBuffer } from '../../utils/e2eeCrypto';
import e2eeChatSocket from '../../services/e2eeChatSocket';

export const E2EEGroupStudyChatModal = ({
  isOpen,
  onClose,
  roomId = 'study-vault-1',
  roomTitle = 'E2EE Group Study Room',
}) => {
  const [passphrase, setPassphrase] = useState('');
  const [cryptoKey, setCryptoKey] = useState(null);
  const [keyError, setKeyError] = useState('');
  const [isDerivingKey, setIsDerivingKey] = useState(false);

  const [activeTab, setActiveTab] = useState('chat'); // 'chat' | 'ephemeral' | 'vault'
  const [peers, setPeers] = useState([]);

  // Chat State
  const [messageInput, setMessageInput] = useState('');
  const [messages, setMessages] = useState([]);

  // Ephemeral Notes State
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [noteTtl, setNoteTtl] = useState(300); // 5 mins default
  const [burnOnRead, setBurnOnRead] = useState(false);
  const [ephemeralNotes, setEphemeralNotes] = useState([]);

  // Media Vault State
  const [vaultMedia, setVaultMedia] = useState([]);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [previewMedia, setPreviewMedia] = useState(null);

  const chatEndRef = useRef(null);

  // Auto scroll to latest chat message
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle Room Key Unlock
  const handleUnlockRoom = async (e) => {
    e?.preventDefault();
    if (!passphrase || passphrase.trim().length < 4) {
      setKeyError('Passphrase must be at least 4 characters long.');
      return;
    }

    try {
      setIsDerivingKey(true);
      setKeyError('');
      const key = await deriveKeyFromPassphrase(passphrase.trim(), `salt-${roomId}`);
      setCryptoKey(key);

      // Join Socket Room
      e2eeChatSocket.joinRoom(roomId, (updatedPeers) => {
        setPeers(updatedPeers);
      });

      // Bind Listeners
      e2eeChatSocket.onNewMessage(async (msgPayload) => {
        try {
          const decryptedText = await decryptText(key, msgPayload.ciphertext, msgPayload.iv);
          setMessages((prev) => [
            ...prev,
            {
              id: msgPayload.id,
              sender: msgPayload.sender,
              senderId: msgPayload.senderId,
              text: decryptedText,
              timestamp: msgPayload.timestamp,
            },
          ]);
        } catch (err) {
          console.error('Decryption failed:', err);
        }
      });

      e2eeChatSocket.onNewEphemeralNote(async (notePayload) => {
        try {
          const decryptedContent = await decryptText(key, notePayload.ciphertext, notePayload.iv);
          let title = 'Ephemeral Note';
          if (notePayload.titleCiphertext && notePayload.titleIv) {
            title = await decryptText(key, notePayload.titleCiphertext, notePayload.titleIv);
          }

          setEphemeralNotes((prev) => [
            ...prev,
            {
              id: notePayload.id,
              sender: notePayload.sender,
              title,
              content: decryptedContent,
              ttlSeconds: notePayload.ttlSeconds,
              burnOnRead: notePayload.burnOnRead,
              expiresAt: new Date(notePayload.expiresAt).getTime(),
              timestamp: notePayload.timestamp,
              isRead: false,
            },
          ]);
        } catch (err) {
          console.error('Note decryption failed:', err);
        }
      });

      e2eeChatSocket.onNewMedia(async (mediaPayload) => {
        try {
          const blob = await decryptBuffer(
            key,
            mediaPayload.encryptedData,
            mediaPayload.iv,
            mediaPayload.mimeType
          );
          const objectUrl = URL.createObjectURL(blob);

          setVaultMedia((prev) => [
            ...prev,
            {
              id: mediaPayload.id,
              sender: mediaPayload.sender,
              fileName: mediaPayload.fileName,
              fileSize: mediaPayload.fileSize,
              mimeType: mediaPayload.mimeType,
              objectUrl,
              timestamp: mediaPayload.timestamp,
            },
          ]);
        } catch (err) {
          console.error('Media decryption failed:', err);
        }
      });

      e2eeChatSocket.onNoteBurned((burnedNoteId) => {
        setEphemeralNotes((prev) => prev.filter((n) => n.id !== burnedNoteId));
      });
    } catch (err) {
      setKeyError('Failed to derive encryption key: ' + err.message);
    } finally {
      setIsDerivingKey(false);
    }
  };

  // Cleanup on Close
  const handleClose = () => {
    e2eeChatSocket.leaveRoom(roomId);
    setCryptoKey(null);
    setPassphrase('');
    setMessages([]);
    setEphemeralNotes([]);
    setVaultMedia([]);
    onClose();
  };

  // 1. Send Encrypted Message
  const handleSendMessage = async (e) => {
    e?.preventDefault();
    if (!messageInput.trim() || !cryptoKey) return;

    try {
      const encrypted = await encryptText(cryptoKey, messageInput.trim());
      e2eeChatSocket.sendMessage(roomId, {
        id: Math.random().toString(36).substring(2, 9),
        ciphertext: encrypted.ciphertext,
        iv: encrypted.iv,
      });
      setMessageInput('');
    } catch (err) {
      console.error('Failed to encrypt message:', err);
    }
  };

  // 2. Create Encrypted Ephemeral Note
  const handleCreateEphemeralNote = async (e) => {
    e?.preventDefault();
    if (!noteContent.trim() || !cryptoKey) return;

    try {
      const encContent = await encryptText(cryptoKey, noteContent.trim());
      const encTitle = await encryptText(cryptoKey, noteTitle.trim() || 'Ephemeral Note');

      e2eeChatSocket.sendEphemeralNote(roomId, {
        id: Math.random().toString(36).substring(2, 9),
        ciphertext: encContent.ciphertext,
        iv: encContent.iv,
        titleCiphertext: encTitle.ciphertext,
        titleIv: encTitle.iv,
        ttlSeconds: noteTtl,
        burnOnRead,
      });

      setNoteTitle('');
      setNoteContent('');
    } catch (err) {
      console.error('Failed to encrypt ephemeral note:', err);
    }
  };

  // Read / Burn Note
  const handleReadNote = (note) => {
    if (note.burnOnRead) {
      e2eeChatSocket.burnNote(roomId, note.id);
      setEphemeralNotes((prev) => prev.filter((n) => n.id !== note.id));
    }
  };

  // 3. Upload Encrypted Media to Vault
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !cryptoKey) return;

    try {
      setUploadingMedia(true);
      const arrayBuffer = await file.arrayBuffer();
      const encrypted = await encryptBuffer(cryptoKey, arrayBuffer);

      e2eeChatSocket.sendMedia(roomId, {
        id: Math.random().toString(36).substring(2, 9),
        encryptedData: encrypted.encryptedData,
        iv: encrypted.iv,
        mimeType: file.type,
        fileName: file.name,
        fileSize: file.size,
      });
    } catch (err) {
      console.error('Failed to encrypt media file:', err);
    } finally {
      setUploadingMedia(false);
    }
  };

  // Periodic Ephemeral TTL Expiry Cleanup
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setEphemeralNotes((prev) =>
        prev.filter((n) => {
          if (n.expiresAt && now >= n.expiresAt) {
            return false; // Expired
          }
          return true;
        })
      );
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-4xl max-h-[92vh] h-[750px] flex flex-col bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden text-slate-100">
        
        {/* Header Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90 backdrop-blur">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl border ${cryptoKey ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'}`}>
              {cryptoKey ? <ShieldCheck className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                {roomTitle}
                <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                  AES-GCM-256 E2EE
                </span>
              </h2>
              <p className="text-xs text-slate-400">Zero-Knowledge Encrypted Relay • Server Cannot Decrypt</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {cryptoKey && (
              <div className="flex items-center gap-1.5 text-xs text-slate-400 bg-slate-950/80 px-3 py-1.5 rounded-xl border border-slate-800">
                <Users className="w-3.5 h-3.5 text-indigo-400" />
                <span>{peers.length} Active Peers</span>
              </div>
            )}
            <button
              onClick={handleClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Lock Screen (Passphrase Entry) */}
        {!cryptoKey ? (
          <div className="flex-1 flex items-center justify-center p-6 bg-slate-950">
            <form onSubmit={handleUnlockRoom} className="w-full max-w-md p-6 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl space-y-5 text-center">
              <div className="mx-auto w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center">
                <Key className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Unlock E2EE Study Vault</h3>
                <p className="text-xs text-slate-400 mt-1">Enter shared passphrase to derive AES-GCM 256 key in browser</p>
              </div>

              <div>
                <input
                  type="password"
                  value={passphrase}
                  onChange={(e) => setPassphrase(e.target.value)}
                  placeholder="Enter secret room passphrase..."
                  className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 outline-none focus:border-indigo-500 transition"
                />
                {keyError && <p className="text-xs text-rose-400 mt-2">{keyError}</p>}
              </div>

              <button
                type="submit"
                disabled={isDerivingKey}
                className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-lg shadow-indigo-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Unlock className="w-4 h-4" />
                <span>{isDerivingKey ? 'Deriving Web Crypto Key...' : 'Unlock E2EE Session'}</span>
              </button>

              <p className="text-[10px] text-slate-500 italic">
                🔒 Security Note: Passphrase is never transmitted or stored on server.
              </p>
            </form>
          </div>
        ) : (
          /* Unlocked E2EE Interface */
          <div className="flex-1 flex flex-col overflow-hidden bg-slate-950">
            
            {/* Tab Navigation */}
            <div className="flex border-b border-slate-800 px-6 bg-slate-900/60">
              <button
                onClick={() => setActiveTab('chat')}
                className={`px-4 py-3 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 ${
                  activeTab === 'chat' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Lock className="w-3.5 h-3.5" /> Encrypted Chat ({messages.length})
              </button>
              <button
                onClick={() => setActiveTab('ephemeral')}
                className={`px-4 py-3 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 ${
                  activeTab === 'ephemeral' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Clock className="w-3.5 h-3.5" /> Ephemeral Notes ({ephemeralNotes.length})
              </button>
              <button
                onClick={() => setActiveTab('vault')}
                className={`px-4 py-3 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 ${
                  activeTab === 'vault' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <ImageIcon className="w-3.5 h-3.5" /> Media Vault ({vaultMedia.length})
              </button>
            </div>

            {/* TAB 1: Encrypted Chat */}
            {activeTab === 'chat' && (
              <div className="flex-1 flex flex-col overflow-hidden">
                <div className="flex-1 p-6 overflow-y-auto space-y-4">
                  {messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center text-slate-500 text-xs">
                      <ShieldCheck className="w-8 h-8 mb-2 text-indigo-400/50" />
                      <p>Encrypted Session Active.</p>
                      <p className="text-[10px] text-slate-600">Messages are end-to-end encrypted in your browser before broadcast.</p>
                    </div>
                  ) : (
                    messages.map((msg) => (
                      <div key={msg.id} className="flex flex-col space-y-1">
                        <div className="flex items-center gap-2 text-[10px] text-slate-400">
                          <span className="font-bold text-slate-200">{msg.sender}</span>
                          <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800/80 text-xs text-slate-200 max-w-xl w-fit leading-relaxed shadow-sm">
                          {msg.text}
                        </div>
                      </div>
                    ))
                  )}
                  <div ref={chatEndRef} />
                </div>

                <form onSubmit={handleSendMessage} className="p-4 border-t border-slate-800 bg-slate-900/90 flex gap-3">
                  <input
                    type="text"
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    placeholder="Type an end-to-end encrypted message..."
                    className="flex-1 p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 outline-none focus:border-indigo-500 transition"
                  />
                  <button
                    type="submit"
                    disabled={!messageInput.trim()}
                    className="px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold text-xs shadow-lg shadow-indigo-500/20 transition cursor-pointer"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </div>
            )}

            {/* TAB 2: Ephemeral Notes */}
            {activeTab === 'ephemeral' && (
              <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
                {/* Note Creator Form */}
                <form onSubmit={handleCreateEphemeralNote} className="w-full md:w-80 p-5 border-r border-slate-800 bg-slate-900/50 space-y-4 text-xs">
                  <h4 className="font-bold text-white flex items-center gap-1.5 text-xs">
                    <Flame className="w-4 h-4 text-amber-400" /> Create Ephemeral Note
                  </h4>

                  <div>
                    <label className="block text-slate-400 mb-1">Title</label>
                    <input
                      type="text"
                      value={noteTitle}
                      onChange={(e) => setNoteTitle(e.target.value)}
                      placeholder="Note Title..."
                      className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1">Secret Content</label>
                    <textarea
                      value={noteContent}
                      onChange={(e) => setNoteContent(e.target.value)}
                      placeholder="Encrypted content..."
                      rows={4}
                      className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1">Self-Destruct Timer (TTL)</label>
                    <select
                      value={noteTtl}
                      onChange={(e) => setNoteTtl(Number(e.target.value))}
                      className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none focus:border-indigo-500"
                    >
                      <option value={60}>1 Minute</option>
                      <option value={300}>5 Minutes</option>
                      <option value={3600}>1 Hour</option>
                    </select>
                  </div>

                  <label className="flex items-center gap-2 cursor-pointer pt-1">
                    <input
                      type="checkbox"
                      checked={burnOnRead}
                      onChange={(e) => setBurnOnRead(e.target.checked)}
                      className="accent-indigo-500 rounded"
                    />
                    <span className="text-slate-300 font-medium">Burn-On-Read (Self Destruct on View)</span>
                  </label>

                  <button
                    type="submit"
                    disabled={!noteContent.trim()}
                    className="w-full py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-semibold text-xs shadow-lg shadow-amber-500/20 transition cursor-pointer"
                  >
                    Broadcast Ephemeral Note
                  </button>
                </form>

                {/* Notes Stream */}
                <div className="flex-1 p-6 overflow-y-auto space-y-3">
                  {ephemeralNotes.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-500 text-xs">
                      <Flame className="w-8 h-8 mb-2 text-amber-500/50" />
                      <p>No active ephemeral notes.</p>
                    </div>
                  ) : (
                    ephemeralNotes.map((note) => {
                      const secondsLeft = Math.max(0, Math.ceil((note.expiresAt - Date.now()) / 1000));

                      return (
                        <div
                          key={note.id}
                          onClick={() => handleReadNote(note)}
                          className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2 relative group cursor-pointer hover:border-slate-700 transition"
                        >
                          <div className="flex items-center justify-between">
                            <h5 className="font-bold text-amber-400 text-xs flex items-center gap-2">
                              <FileText className="w-3.5 h-3.5" /> {note.title}
                            </h5>
                            <div className="flex items-center gap-2">
                              {note.burnOnRead && (
                                <span className="text-[9px] px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 font-semibold border border-rose-500/30">
                                  Burn On Read
                                </span>
                              )}
                              <span className="text-xs font-mono font-bold text-amber-300 flex items-center gap-1">
                                <Clock className="w-3 h-3" /> {secondsLeft}s
                              </span>
                            </div>
                          </div>
                          <p className="text-xs text-slate-200 leading-relaxed font-mono whitespace-pre-wrap">{note.content}</p>
                          <div className="text-[10px] text-slate-500">From: {note.sender}</div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* TAB 3: Encrypted Media Vault */}
            {activeTab === 'vault' && (
              <div className="flex-1 flex flex-col p-6 overflow-y-auto space-y-6">
                {/* Upload Zone */}
                <div className="p-6 rounded-2xl border-2 border-dashed border-slate-800 bg-slate-900/40 text-center space-y-3">
                  <div className="mx-auto w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
                    <Paperclip className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white">Upload Media to E2EE Vault</p>
                    <p className="text-[10px] text-slate-400">Files are encrypted in browser memory prior to transmission</p>
                  </div>
                  <label className="inline-block px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold cursor-pointer shadow-lg shadow-indigo-500/20 transition">
                    <span>{uploadingMedia ? 'Encrypting & Uploading...' : 'Select File to Encrypt'}</span>
                    <input type="file" onChange={handleFileUpload} className="hidden" />
                  </label>
                </div>

                {/* Vault Items Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {vaultMedia.map((media) => (
                    <div key={media.id} className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-2 flex flex-col">
                      {media.mimeType.startsWith('image/') ? (
                        <img
                          src={media.objectUrl}
                          alt={media.fileName}
                          className="w-full h-32 object-cover rounded-lg bg-slate-950"
                        />
                      ) : (
                        <div className="w-full h-32 bg-slate-950 rounded-lg flex items-center justify-center text-slate-500 text-xs">
                          <FileText className="w-8 h-8" />
                        </div>
                      )}
                      <div className="flex-1 text-xs">
                        <p className="font-semibold text-slate-200 truncate">{media.fileName}</p>
                        <p className="text-[10px] text-slate-500">Sender: {media.sender}</p>
                      </div>
                      <a
                        href={media.objectUrl}
                        download={media.fileName}
                        className="w-full py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-center text-xs font-semibold text-slate-200 transition flex items-center justify-center gap-1.5"
                      >
                        <Download className="w-3.5 h-3.5" /> Download Decrypted File
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default E2EEGroupStudyChatModal;
