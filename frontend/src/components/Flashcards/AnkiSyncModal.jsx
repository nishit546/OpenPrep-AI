import React, { useState } from 'react';
import { 
  Upload, 
  Download, 
  FileArchive, 
  CheckCircle, 
  AlertCircle, 
  Layers, 
  RefreshCw, 
  X,
  FileSpreadsheet
} from 'lucide-react';
import API from '../../services/api';

export default function AnkiSyncModal({ subjectId, deckName = 'My Deck', onClose, onImportSuccess }) {
  const [activeTab, setActiveTab] = useState('import'); // 'import' | 'export'
  
  // Import states
  const [selectedFile, setSelectedFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [importError, setImportError] = useState(null);

  // Export states
  const [exporting, setExporting] = useState(false);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.name.endsWith('.apkg') && !file.name.endsWith('.zip')) {
        alert('Please select a valid Anki (.apkg) file.');
        return;
      }
      setSelectedFile(file);
      setImportResult(null);
      setImportError(null);
    }
  };

  const handleExecuteImport = async () => {
    if (!selectedFile) return;

    setImporting(true);
    setImportError(null);

    const formData = new FormData();
    formData.append('file', selectedFile);
    if (subjectId) {
      formData.append('subjectId', subjectId);
    }

    try {
      const response = await API.post('/flashcards/anki/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setImportResult(response.data);
      if (onImportSuccess) onImportSuccess(response.data);
    } catch (err) {
      console.error('Anki import error:', err);
      setImportError(err.response?.data?.error || err.message || 'Failed to import .apkg package.');
    } finally {
      setImporting(false);
    }
  };

  const handleExecuteExport = async () => {
    if (!subjectId) {
      alert('Please select or specify a deck to export.');
      return;
    }

    setExporting(true);
    try {
      const response = await API.get(`/flashcards/anki/export/${subjectId}`, {
        responseType: 'blob',
      });

      const blob = new Blob([response.data], { type: 'application/octet-stream' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${deckName.replace(/\s+/g, '_')}.apkg`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Anki export error:', err);
      alert('Failed to export deck to .apkg format.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 z-50">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 max-w-lg w-full space-y-5 shadow-2xl text-gray-100">
        <div className="flex items-center justify-between border-b border-gray-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary/20 text-primary flex items-center justify-center font-bold text-sm">
              <FileArchive className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">Anki (.apkg) Integration Hub</h3>
              <p className="text-[11px] text-gray-400">Bidirectional sync with SM-2 retention metrics</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="grid grid-cols-2 bg-gray-800/60 p-1 rounded-xl text-xs font-semibold">
          <button
            onClick={() => setActiveTab('import')}
            className={`py-1.5 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'import' ? 'bg-primary text-white shadow-sm' : 'text-gray-400 hover:text-white'
            }`}
          >
            <Upload className="w-3.5 h-3.5" /> Import .apkg
          </button>
          <button
            onClick={() => setActiveTab('export')}
            className={`py-1.5 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'export' ? 'bg-primary text-white shadow-sm' : 'text-gray-400 hover:text-white'
            }`}
          >
            <Download className="w-3.5 h-3.5" /> Export .apkg
          </button>
        </div>

        {/* TAB 1: IMPORT */}
        {activeTab === 'import' && (
          <div className="space-y-4">
            <div className="border-2 border-dashed border-gray-700 hover:border-gray-500 rounded-xl p-6 text-center space-y-2 transition-all">
              <Upload className="w-8 h-8 text-primary mx-auto" />
              <div className="text-xs">
                <label className="text-primary hover:text-blue-400 font-bold cursor-pointer underline">
                  Choose Anki .apkg file
                  <input
                    type="file"
                    accept=".apkg,.zip"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
                <p className="text-gray-400 text-[11px] mt-1">
                  {selectedFile ? selectedFile.name : 'or drag and drop your exported collection archive'}
                </p>
              </div>
            </div>

            {importError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{importError}</span>
              </div>
            )}

            {importResult && (
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs rounded-xl space-y-1">
                <div className="flex items-center gap-2 font-bold">
                  <CheckCircle className="w-4 h-4" />
                  <span>Import Successful!</span>
                </div>
                <p>{importResult.message}</p>
                <p className="text-[11px] text-gray-400">
                  Imported {importResult.data?.totalCards} cards with Cloze deletions and SM-2 schedules preserved.
                </p>
              </div>
            )}

            <button
              onClick={handleExecuteImport}
              disabled={!selectedFile || importing}
              className="w-full py-2.5 bg-primary hover:bg-blue-600 text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${importing ? 'animate-spin' : ''}`} />
              <span>{importing ? 'Extracting Anki SQLite Tables...' : 'Import to OpenPrep Library'}</span>
            </button>
          </div>
        )}

        {/* TAB 2: EXPORT */}
        {activeTab === 'export' && (
          <div className="space-y-4 text-xs">
            <div className="p-4 bg-gray-800/40 border border-gray-800 rounded-xl space-y-2">
              <span className="font-bold text-gray-200 block">Deck to Export:</span>
              <p className="text-sm font-semibold text-white">{deckName}</p>
              <p className="text-[11px] text-gray-400">
                Exports all cards, tags, ease factors, intervals, and Cloze markers into a native Anki 2.1 compatible `.apkg` bundle.
              </p>
            </div>

            <button
              onClick={handleExecuteExport}
              disabled={exporting}
              className="w-full py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Download className={`w-3.5 h-3.5 ${exporting ? 'animate-spin' : ''}`} />
              <span>{exporting ? 'Compiling Anki SQLite Package...' : 'Download Anki Package (.apkg)'}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
