import React, { useState } from 'react';
import axios from 'axios';
import DiagramImageCropper from '../../components/ocr/DiagramImageCropper';
import OcrResultViewer from '../../components/ocr/OcrResultViewer';
import { Camera, Sparkles, AlertCircle } from 'lucide-react';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5001',
  headers: {
    Authorization: `Bearer ${localStorage.getItem('token')}`,
  },
});

export default function OcrSolverPage() {
  const [croppedImageSrc, setCroppedImageSrc] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  const handleCropComplete = async (blob, dataUrl) => {
    setCroppedImageSrc(dataUrl);
    setLoading(true);
    setErrorMsg('');
    setResult(null);

    const formData = new FormData();
    // 'image' field matches upload.single('image') in backend route
    formData.append('image', blob, 'cropped_diagram.jpg');

    try {
      const res = await api.post('/api/ocr/parse-diagram', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setResult(res.data.data);
    } catch (err) {
      setErrorMsg(err.response?.data?.error || 'Failed to solve handwritten formula / diagram. Please try a clearer crop.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-8 p-4 md:p-6 text-slate-100 text-left">
      
      {/* Header Panel */}
      <div className="flex items-center gap-4 bg-slate-900 border border-slate-800 p-6 rounded-3xl shadow-xl">
        <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-2xl">
          <Camera className="w-8 h-8" />
        </div>
        <div>
          <h1 className="text-2xl font-black bg-clip-text text-transparent bg-gradient-to-r from-slate-100 to-slate-350">
            Handwritten Math & Diagram Solver
          </h1>
          <p className="text-xs text-slate-450 mt-0.5">
            Crop textbook formulas, circuit schematics, or organic compounds to transcribe into LaTeX math and solve with AI.
          </p>
        </div>
      </div>

      {errorMsg && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl text-xs font-bold flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          {errorMsg}
        </div>
      )}

      {loading && (
        <div className="flex flex-col items-center justify-center p-12 bg-slate-900 border border-slate-800 rounded-3xl shadow-lg">
          <Sparkles className="w-12 h-12 text-indigo-500 animate-spin mb-4" />
          <h3 className="font-extrabold text-slate-200">AI Math Vision Engine Solving...</h3>
          <p className="text-xs text-slate-450 mt-1">Transcribing math structures, diagrams, and deriving solutions.</p>
        </div>
      )}

      {!loading && !result && (
        <DiagramImageCropper onCropComplete={handleCropComplete} />
      )}

      {!loading && result && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Analysis Results</h3>
            <button
              onClick={() => {
                setResult(null);
                setCroppedImageSrc(null);
              }}
              className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-bold rounded-xl cursor-pointer"
            >
              Analyze New Image
            </button>
          </div>
          <OcrResultViewer result={result} originalImageSrc={croppedImageSrc} />
        </div>
      )}
    </div>
  );
}
