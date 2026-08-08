import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
FileText, Upload, AlertCircle, RefreshCw, CheckCircle, PieChart as PieChartIcon,
  TrendingUp, Award, HelpCircle, Layers, Calendar, Filter, ArrowLeft, ArrowUpRight, Copy
} from 'lucide-react';import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip as PieTooltip, Legend
} from 'recharts';
import API from '../services/api';
import LeatherBoard from '../components/dashboard/LeatherBoard';
import VintagePaper from '../components/dashboard/VintagePaper';
import AudioReader from '../components/AudioReader';
import HighlightedText from '../components/HighlightedText';
import ThemeToggle from '../components/ThemeToggle';

const COLORS = ['#8B4513', '#D4AF37', '#2563EB', '#059669', '#7C3AED', '#DB2777', '#D97706', '#4B5563'];

const RepeatedQuestionCard = ({ rq }) => {
  const [activeIndex, setActiveIndex] = useState(-1);

  return (
    <div className="p-3 bg-white border border-neutral-300 rounded text-xs text-neutral-800">
      <div className="flex items-start justify-between gap-2">
        <HighlightedText
          text={rq.questionText}
          activeIndex={activeIndex}
          className="font-semibold text-neutral-900"
        />
        <AudioReader
          text={rq.questionText}
          className="shrink-0"
          onSentenceChange={setActiveIndex}
        />
      </div>
      {rq.years && (
        <div className="mt-2 flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px] font-bold text-neutral-500 uppercase">Appeared in:</span>
          {Array.isArray(rq.years) ? (
            rq.years.map((y, yi) => (
              <span key={yi} className="bg-amber-100 text-amber-900 text-[10px] px-1.5 py-0.5 rounded font-bold">
                {y}
              </span>
            ))
          ) : (
            <span className="bg-amber-100 text-amber-900 text-[10px] px-1.5 py-0.5 rounded font-bold">
              {rq.years}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

const DIFFICULTY_OPTIONS = ['Easy', 'Medium', 'Hard'];

const PyqDashboard = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // State
  const [subjects, setSubjects] = useState([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState(searchParams.get('subjectId') || '');
  const [selectedDifficulties, setSelectedDifficulties] = useState(
    searchParams.get('difficulty') ? searchParams.get('difficulty').split(',') : []
  );
  const [selectedYear, setSelectedYear] = useState(searchParams.get('year') || '');
  const [selectedChapter, setSelectedChapter] = useState(searchParams.get('chapter') || '');
  const [chapterOptions, setChapterOptions] = useState([]);
  const [pyqList, setPyqList] = useState([]);
  const [selectedPyq, setSelectedPyq] = useState(null);  
  // Upload form state
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState('');
  const [year, setYear] = useState(new Date().getFullYear());
const [uploadSubjectId, setUploadSubjectId] = useState('');
  const [uploadDifficulty, setUploadDifficulty] = useState('Medium');  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [isTimeout, setIsTimeout] = useState(false);
  const [trendActiveIndex, setTrendActiveIndex] = useState(-1);

const [activeInsightTab, setActiveInsightTab] = useState('paper');
  const [forecastData, setForecastData] = useState(null);
  const [loadingForecast, setLoadingForecast] = useState(false);
  const [forecastError, setForecastError] = useState(null);

  const [clusterData, setClusterData] = useState([]);
  const [loadingClusters, setLoadingClusters] = useState(false);
  const [clusterError, setClusterError] = useState(null);

  const fetchClusters = async (forceRefresh = false) => {
    if (!selectedSubjectId) return;
    setLoadingClusters(true);
    setClusterError(null);
    try {
      const res = await API.get(`/pyqs/clusters/${selectedSubjectId}`, {
        params: { refresh: forceRefresh === true },
      });
      if (res.data?.success) {
        setClusterData(res.data.data || []);
      }
    } catch (err) {
      console.error('Failed to load duplicate question clusters:', err);
      setClusterError(err?.response?.data?.error || 'Could not detect duplicate questions.');
    } finally {
      setLoadingClusters(false);
    }
  };

  useEffect(() => {
    if (activeInsightTab === 'duplicates' && selectedSubjectId) {
      fetchClusters();
    }
  }, [activeInsightTab, selectedSubjectId]);
  const fetchForecast = async (forceRefresh = false) => {
    if (!selectedSubjectId) return;
    setLoadingForecast(true);
    setForecastError(null);
    try {
      const res = await API.get('/pyqs/forecast', {
        params: { subjectId: selectedSubjectId, refresh: forceRefresh === true },
      });
      if (res.data?.success) {
        setForecastData(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load forecasting:', err);
      setForecastError('Could not load forecasting data.');
    } finally {
      setLoadingForecast(false);
    }
  };

  useEffect(() => {
    if (selectedSubjectId) {
      fetchForecast();
    } else {
      setForecastData(null);
    }
  }, [selectedSubjectId]);

  // Fetch subjects on mount
  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        const res = await API.get('/academic/subjects');
        if (res.data?.data) {
          setSubjects(res.data.data);
          if (res.data.data.length > 0) {
            setUploadSubjectId(res.data.data[0].id);
          }
        }
      } catch (err) {
        console.error('Failed to fetch subjects:', err);
      }
    };
    fetchSubjects();
  }, []);

// Fetch PYQs list, applying the active filters as query params
  const fetchPyqs = async () => {
    try {
      const params = {};
      if (selectedSubjectId) params.subjectId = selectedSubjectId;
      if (selectedDifficulties.length > 0) params.difficulty = selectedDifficulties.join(',');
      if (selectedYear) params.year = selectedYear;
      if (selectedChapter) params.chapter = selectedChapter;

      const res = await API.get('/pyqs', { params });
      if (res.data?.data) {
        setPyqList(res.data.data);
        if (res.data.data.length > 0 && !selectedPyq) {
          setSelectedPyq(res.data.data[0]);
        }
        // Build the chapter dropdown from whatever papers are currently loaded
        const chapters = new Set();
        res.data.data.forEach((pyq) => (pyq.chapters || []).forEach((c) => chapters.add(c)));
        setChapterOptions(Array.from(chapters).sort());
      }
    } catch (err) {
      console.error('Failed to fetch PYQs:', err);
    }
  };

  useEffect(() => {
    fetchPyqs();
    // Keep the active filters in the URL so the view is shareable
    const nextParams = {};
    if (selectedSubjectId) nextParams.subjectId = selectedSubjectId;
    if (selectedDifficulties.length > 0) nextParams.difficulty = selectedDifficulties.join(',');
    if (selectedYear) nextParams.year = selectedYear;
    if (selectedChapter) nextParams.chapter = selectedChapter;
    setSearchParams(nextParams, { replace: true });
  }, [selectedSubjectId, selectedDifficulties, selectedYear, selectedChapter]);

  const toggleDifficulty = (level) => {
    setSelectedDifficulties((prev) =>
      prev.includes(level) ? prev.filter((d) => d !== level) : [...prev, level]
    );
  };
  // Handle Drag & Drop / File Select
  const handleFileChange = (e) => {
    const selectedFile = e.target.files ? e.target.files[0] : null;
    if (!selectedFile) return;

    if (selectedFile.type !== 'application/pdf' && !selectedFile.name.endsWith('.pdf')) {
      setUploadError('Please upload a valid PDF document.');
      return;
    }

    if (selectedFile.size > 10 * 1024 * 1024) {
      setUploadError('File size exceeds 10MB limit.');
      return;
    }

    setUploadError(null);
    setIsTimeout(false);
    setFile(selectedFile);
    if (!title) {
      setTitle(selectedFile.name.replace(/\.[^/.]+$/, ''));
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.type !== 'application/pdf' && !droppedFile.name.endsWith('.pdf')) {
        setUploadError('Please upload a valid PDF document.');
        return;
      }
      if (droppedFile.size > 10 * 1024 * 1024) {
        setUploadError('File size exceeds 10MB limit.');
        return;
      }
      setUploadError(null);
      setIsTimeout(false);
      setFile(droppedFile);
      if (!title) {
        setTitle(droppedFile.name.replace(/\.[^/.]+$/, ''));
      }
    }
  };

  // Upload handler
  const handleUploadAndAnalyze = async (e) => {
    if (e) e.preventDefault();
    if (!file) {
      setUploadError('Please select a PDF file.');
      return;
    }
    if (!uploadSubjectId) {
      setUploadError('Please select a subject.');
      return;
    }

    setIsUploading(true);
    setUploadError(null);
    setIsTimeout(false);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('title', title || file.name);
formData.append('year', year);
      formData.append('subjectId', uploadSubjectId);
      formData.append('difficulty', uploadDifficulty);
      const res = await API.post('/pyqs/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 60000,
      });

      const newPyq = res.data?.data;
      if (newPyq) {
        setSelectedPyq(newPyq);
        fetchPyqs();
      }
      setFile(null);
      setTitle('');
    } catch (err) {
      console.error('Upload PYQ error:', err);
      const isTimeoutErr =
        err.code === 'ECONNABORTED' ||
        err.response?.status === 408 ||
        err.response?.status === 504 ||
        err.response?.data?.error?.toLowerCase().includes('timed out');

      if (isTimeoutErr) {
        setIsTimeout(true);
        setUploadError('PYQ analysis timed out. Click Retry to re-trigger.');
      } else {
        setUploadError(err.response?.data?.error || 'Failed to upload and analyze PYQ paper.');
      }
    } finally {
      setIsUploading(false);
    }
  };

  // Prepared data for visualization
  const analysisData = selectedPyq?.analysisResults || null;

  const pieChartData = analysisData?.chapterWeightage
    ? analysisData.chapterWeightage.map((ch) => ({
        name: ch.chapterName,
        value: typeof ch.weightage === 'number' ? ch.weightage : parseFloat(ch.weightage) || 10,
      }))
    : [];

  const importantTopics = analysisData?.importantTopics || [];
  const repeatedQuestions = analysisData?.repeatedQuestions || [];
  const trendAnalysis = analysisData?.trendAnalysis || 'No trend analysis available yet for this paper.';

  return (
    <LeatherBoard>
      <div className="pl-4 md:pl-16 pr-4 lg:pr-8 py-8 space-y-8">
        
        {/* --- HEADER --- */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-black/20 pb-6 gap-4">
          <div>
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-1 text-sm text-amber-200/80 hover:text-amber-100 mb-2 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> Back to Main Dashboard
            </Link>
            <h1 className="text-4xl md:text-5xl font-bold text-gold-foil font-playfair tracking-tight flex items-center gap-3">
              <PieChartIcon className="w-10 h-10 text-yellow-500" />
              PYQ Intelligence & Analysis
            </h1>
            <p className="text-amber-100/70 text-sm md:text-base font-playfair mt-1">
              Upload Previous Year Question Papers to unlock AI chapter weightage, topic frequency, & trend insights.
            </p>
          </div>
          <div className="flex items-center gap-4">
            <ThemeToggle />
          </div>
        </div>

        {/* --- MAIN GRID: UPLOADER & PAPER SELECTOR --- */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Uploader Card */}
          <VintagePaper className="lg:col-span-2 shadow-[0_10px_25px_rgba(0,0,0,0.5)]">
            <h2 className="text-2xl font-bold font-playfair text-neutral-900 mb-4 border-b border-neutral-400 pb-2 flex items-center gap-2">
              <Upload className="w-6 h-6 text-yellow-700" /> Upload Question Paper (PDF)
            </h2>

            {uploadError && (
              <div className={`p-3 mb-4 rounded border flex items-center justify-between text-sm ${
                isTimeout
                  ? 'bg-amber-50 border-amber-300 text-amber-900'
                  : 'bg-red-50 border-red-200 text-red-700'
              }`}>
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{uploadError}</span>
                </div>
                {isTimeout && (
                  <button
                    onClick={handleUploadAndAnalyze}
                    disabled={isUploading}
                    className="px-3 py-1 bg-amber-700 hover:bg-amber-800 text-white text-xs font-semibold rounded"
                  >
                    Retry
                  </button>
                )}
              </div>
            )}

            <form onSubmit={handleUploadAndAnalyze} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1">
                    Subject
                  </label>
                  <select
                    value={uploadSubjectId}
                    onChange={(e) => setUploadSubjectId(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-neutral-300 rounded text-neutral-800 text-sm focus:ring-2 focus:ring-amber-600 outline-none"
                    disabled={isUploading}
                  >
                    {subjects.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1">
                    Paper Title
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Endterm 2025"
                    className="w-full px-3 py-2 bg-white border border-neutral-300 rounded text-neutral-800 text-sm focus:ring-2 focus:ring-amber-600 outline-none"
                    disabled={isUploading}
                  />
                </div>

<div>

                  <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1">

                    Year

                  </label>

                  <input

                    type="number"

                    value={year}

                    onChange={(e) => setYear(e.target.value)}

                    className="w-full px-3 py-2 bg-white border border-neutral-300 rounded text-neutral-800 text-sm focus:ring-2 focus:ring-amber-600 outline-none"

                    disabled={isUploading}

                  />

                </div>



                <div>

                  <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1">

                    Difficulty

                  </label>

                  <select

                    value={uploadDifficulty}

                    onChange={(e) => setUploadDifficulty(e.target.value)}

                    className="w-full px-3 py-2 bg-white border border-neutral-300 rounded text-neutral-800 text-sm focus:ring-2 focus:ring-amber-600 outline-none"

                    disabled={isUploading}

                  >

                    {DIFFICULTY_OPTIONS.map((level) => (

                      <option key={level} value={level}>

                        {level}

                      </option>

                    ))}

                  </select>

                </div>

              </div>
              {/* Drag and Drop Zone */}
              <div
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                className="border-2 border-dashed border-neutral-400 rounded-lg p-6 text-center bg-amber-50/50 hover:bg-amber-100/50 transition-colors cursor-pointer relative"
              >
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={handleFileChange}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  disabled={isUploading}
                />
                <FileText className="w-10 h-10 mx-auto text-yellow-800 mb-2" />
                {file ? (
                  <p className="text-sm font-semibold text-amber-900">
                    Selected: {file.name} ({(file.size / (1024 * 1024)).toFixed(2)} MB)
                  </p>
                ) : (
                  <div>
                    <p className="text-sm font-medium text-neutral-800">
                      Drag & Drop your question paper PDF here, or <span className="text-amber-800 font-bold underline">Browse</span>
                    </p>
                    <p className="text-xs text-neutral-500 mt-1">Supports PDF files up to 10MB</p>
                  </div>
                )}
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={isUploading || !file}
                  className="px-6 py-2.5 bg-gradient-to-r from-amber-700 to-amber-900 text-amber-50 font-bold text-sm rounded shadow hover:shadow-lg transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  {isUploading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Analyzing with AI...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      Upload & Analyze PYQ
                    </>
                  )}
                </button>
              </div>
            </form>
          </VintagePaper>

          {/* PYQ Papers List */}
          <VintagePaper className="lg:col-span-1 shadow-[0_10px_25px_rgba(0,0,0,0.5)] flex flex-col">
            <h2 className="text-xl font-bold font-playfair text-neutral-900 mb-4 border-b border-neutral-400 pb-2 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-amber-800" /> Exam Papers
              </span>
              <span className="text-xs font-normal text-neutral-600">({pyqList.length})</span>
            </h2>

<div className="mb-3 space-y-2">
              <select
                value={selectedSubjectId}
                onChange={(e) => setSelectedSubjectId(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-white border border-neutral-300 rounded text-neutral-800 text-xs focus:outline-none"
              >
                <option value="">All Subjects</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>

              <div className="flex flex-wrap gap-1.5">
                {DIFFICULTY_OPTIONS.map((level) => (
                  <button
                    key={level}
                    type="button"
                    onClick={() => toggleDifficulty(level)}
                    className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border transition-colors ${
                      selectedDifficulties.includes(level)
                        ? 'bg-amber-800 text-white border-amber-900'
                        : 'bg-white text-neutral-600 border-neutral-300 hover:bg-amber-100/60'
                    }`}
                  >
                    {level}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <select
                  value={selectedChapter}
                  onChange={(e) => setSelectedChapter(e.target.value)}
                  className="w-full px-2 py-1.5 bg-white border border-neutral-300 rounded text-neutral-800 text-xs focus:outline-none"
                >
                  <option value="">All Chapters</option>
                  {chapterOptions.map((ch) => (
                    <option key={ch} value={ch}>
                      {ch}
                    </option>
                  ))}
                </select>

                <input
                  type="number"
                  placeholder="Year"
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className="w-full px-2 py-1.5 bg-white border border-neutral-300 rounded text-neutral-800 text-xs focus:outline-none"
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto space-y-2 max-h-60">
              {pyqList.length === 0 ? (
                <p className="text-xs text-neutral-500 italic text-center py-6">
                  No PYQs analyzed yet. Upload one above!
                </p>
              ) : (
                pyqList.map((pyq) => {
                  const isSelected = selectedPyq?.id === pyq.id;
                  return (
                    <div
                      key={pyq.id}
                      onClick={() => setSelectedPyq(pyq)}
                      className={`p-3 rounded border text-left cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-amber-800 text-white border-amber-900 shadow-md'
                          : 'bg-white hover:bg-amber-100/60 border-neutral-300 text-neutral-800'
                      }`}
                    >
                      <p className="font-bold text-sm truncate">{pyq.title}</p>
                      <div className="flex justify-between items-center text-xs mt-1 opacity-80">
                        <span>Year: {pyq.year}</span>
                        <span className="uppercase text-[10px] px-1.5 py-0.5 rounded bg-black/10">
                          {pyq.analyzed ? 'Analyzed' : 'Pending'}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </VintagePaper>
        </div>

        {/* --- VISUALIZATION & INSIGHTS SECTION --- */}
        {selectedSubjectId && (
          <div className="space-y-8 mt-12 pt-8 border-t border-black/10">
            {/* Tab Selector */}
            <div className="flex gap-4 border-b border-neutral-300 pb-2">
              <button
                type="button"
                onClick={() => setActiveInsightTab('paper')}
                disabled={!selectedPyq}
                className={`px-4 py-2 text-sm font-bold font-playfair transition-all border-b-2 ${
                  activeInsightTab === 'paper'
                    ? 'border-amber-800 text-amber-900 font-bold'
                    : 'border-transparent text-neutral-500 hover:text-neutral-800 disabled:opacity-40'
                }`}
              >
                Paper Insights
              </button>
<button
                type="button"
                onClick={() => setActiveInsightTab('forecast')}
                className={`px-4 py-2 text-sm font-bold font-playfair transition-all border-b-2 ${
                  activeInsightTab === 'forecast'
                    ? 'border-amber-800 text-amber-900 font-bold'
                    : 'border-transparent text-neutral-500 hover:text-neutral-800'
                }`}
              >
                AI Upcoming Forecast
              </button>
              <button
                type="button"
                onClick={() => setActiveInsightTab('duplicates')}
                className={`px-4 py-2 text-sm font-bold font-playfair transition-all border-b-2 ${
                  activeInsightTab === 'duplicates'
                    ? 'border-amber-800 text-amber-900 font-bold'
                    : 'border-transparent text-neutral-500 hover:text-neutral-800'
                }`}
              >
                Duplicate Detection
              </button>
            </div>
            {activeInsightTab === 'paper' && selectedPyq && (
              <div className="space-y-8">
                {/* Row 1: Pie Chart & AI Trend Card */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Recharts Chapter Weightage Pie Chart */}
                  <VintagePaper className="shadow-[0_10px_25px_rgba(0,0,0,0.5)]">
                    <h3 className="text-xl font-bold font-playfair text-neutral-900 mb-4 border-b border-neutral-400 pb-2 flex items-center gap-2">
                      <PieChartIcon className="w-5 h-5 text-amber-800" /> Chapter Weightage Breakdown
                    </h3>
                    <div className="h-64 w-full" style={{ minHeight: '260px' }}>
                      {pieChartData.length === 0 ? (
                        <div className="flex items-center justify-center h-full text-xs text-neutral-500 italic">
                          No chapter weightage data available for this paper.
                        </div>
                      ) : (
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={pieChartData}
                              cx="50%"
                              cy="50%"
                              labelLine={false}
                              outerRadius={80}
                              fill="#8884d8"
                              dataKey="value"
                              label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                            >
                              {pieChartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                            </Pie>
                            <PieTooltip formatter={(val) => [`${val}% Weightage`, 'Chapter']} />
                            <Legend wrapperStyle={{ fontSize: '11px', fontFamily: 'Inter' }} />
                          </PieChart>
                        </ResponsiveContainer>
                      )}
                    </div>
                  </VintagePaper>

                  {/* AI Exam Trend Card */}
                  <VintagePaper className="shadow-[0_10px_25px_rgba(0,0,0,0.5)] flex flex-col">
                    <h3 className="text-xl font-bold font-playfair text-neutral-900 mb-4 border-b border-neutral-400 pb-2 flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-indigo-700" /> AI Exam Trend Summary
                    </h3>
                    <div className="p-4 bg-amber-50/80 border border-amber-200 rounded-sm flex-1 font-inter text-neutral-800 text-sm leading-relaxed space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <p className="font-medium text-amber-900 italic">
                          Analysis for: <span className="font-bold font-playfair underline">{selectedPyq.title}</span> ({selectedPyq.year})
                        </p>
                        <AudioReader
                          text={trendAnalysis}
                          className="shrink-0"
                          onSentenceChange={setTrendActiveIndex}
                        />
                      </div>
                      <HighlightedText
                        text={trendAnalysis}
                        activeIndex={trendActiveIndex}
                        className="whitespace-pre-line text-neutral-700"
                      />
                    </div>
                  </VintagePaper>
                </div>

                {/* Row 2: Important Topics & Repeated Questions Table */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Important Topics with Frequency Badges */}
                  <VintagePaper className="shadow-[0_10px_25px_rgba(0,0,0,0.5)]">
                    <h3 className="text-xl font-bold font-playfair text-neutral-900 mb-4 border-b border-neutral-400 pb-2 flex items-center gap-2">
                      <Award className="w-5 h-5 text-amber-800" /> Important Topics & Frequency
                    </h3>

                    {importantTopics.length === 0 ? (
                      <p className="text-xs text-neutral-500 italic py-4">No topic frequency data extracted.</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs text-neutral-800">
                          <thead className="bg-neutral-200/80 font-bold uppercase tracking-wider">
                            <tr>
                              <th className="p-2.5">Topic Name</th>
                              <th className="p-2.5">Importance</th>
                              <th className="p-2.5 text-right">Frequency</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-neutral-300">
                            {importantTopics.map((item, idx) => (
                              <tr key={idx} className="hover:bg-amber-100/40">
                                <td className="p-2.5 font-semibold text-neutral-900">{item.topicName}</td>
                                <td className="p-2.5">
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                    item.importance?.toLowerCase() === 'high'
                                      ? 'bg-red-100 text-red-800 border border-red-300'
                                      : item.importance?.toLowerCase() === 'medium'
                                      ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                      : 'bg-green-100 text-green-800 border border-green-300'
                                  }`}>
                                    {item.importance || 'Medium'}
                                  </span>
                                </td>
                                <td className="p-2.5 text-right font-bold text-amber-900">
                                  {item.frequency ? `${item.frequency}x` : 'N/A'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </VintagePaper>

                  {/* Repeated Questions */}
                  <VintagePaper className="shadow-[0_10px_25px_rgba(0,0,0,0.5)]">
                    <h3 className="text-xl font-bold font-playfair text-neutral-900 mb-4 border-b border-neutral-400 pb-2 flex items-center gap-2">
                      <HelpCircle className="w-5 h-5 text-amber-800" /> Frequently Repeated Questions
                    </h3>

                    {repeatedQuestions.length === 0 ? (
                      <p className="text-xs text-neutral-500 italic py-4">No repeated question patterns detected.</p>
                    ) : (
                      <div className="space-y-3 max-h-72 overflow-y-auto">
                        {repeatedQuestions.map((rq, idx) => (
                          <RepeatedQuestionCard key={idx} rq={rq} />
                        ))}
                      </div>
                    )}
                  </VintagePaper>
                </div>
              </div>
            )}

            {activeInsightTab === 'forecast' && (
              <div className="space-y-8">
                {loadingForecast ? (
                  <div className="flex flex-col items-center justify-center py-16 text-neutral-500 gap-2">
                    <RefreshCw className="w-8 h-8 animate-spin text-amber-800" />
                    <p className="text-sm italic">Analyzing past paper trends and calculating probability curves...</p>
                  </div>
                ) : forecastError ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center text-red-700">
                    <AlertCircle className="w-8 h-8 mb-2" />
                    <p>{forecastError}</p>
                    <button
                      type="button"
                      onClick={() => fetchForecast()}
                      className="mt-3 text-amber-800 hover:text-amber-900 font-semibold text-xs underline"
                    >
                      Try Again
                    </button>
                  </div>
                ) : !forecastData ? (
                  <p className="text-sm text-neutral-500 italic text-center py-16">
                    No forecast data available. Upload some PYQs to let Gemini forecast upcoming exams.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Expected Difficulty Card */}
                    <VintagePaper className="shadow-[0_10px_25px_rgba(0,0,0,0.5)] flex flex-col justify-between">
                      <div>
                        <h3 className="text-xl font-bold font-playfair text-neutral-900 mb-4 border-b border-neutral-400 pb-2 flex items-center gap-2">
                          <PieChartIcon className="w-5 h-5 text-amber-800" /> Expected Difficulty
                        </h3>
                        <div className="mb-6 p-4 bg-amber-50/60 border border-amber-200 rounded flex items-center justify-between">
                          <div>
                            <span className="text-[10px] font-bold text-neutral-500 uppercase">Predicted Upcoming Difficulty</span>
                            <p className="text-2xl font-black font-playfair text-amber-900 mt-1 uppercase">
                              {forecastData.predictedDifficulty}
                            </p>
                          </div>
                          <span className={`px-3 py-1 rounded-full text-xs font-black uppercase ${
                            forecastData.predictedDifficulty?.toLowerCase() === 'hard'
                              ? 'bg-red-100 text-red-800 border border-red-300'
                              : forecastData.predictedDifficulty?.toLowerCase() === 'medium'
                              ? 'bg-amber-100 text-amber-800 border border-amber-300'
                              : 'bg-green-100 text-green-800 border border-green-300'
                          }`}>
                            AI Estimate
                          </span>
                        </div>

                        {/* Distribution Bars */}
                        <div className="space-y-4">
                          <div>
                            <div className="flex justify-between text-xs font-bold text-neutral-700 mb-1">
                              <span>Expected Easy Questions</span>
                              <span>{forecastData.expectedEasyPercent}%</span>
                            </div>
                            <div className="w-full bg-neutral-200 h-2.5 rounded-full overflow-hidden">
                              <div className="bg-green-600 h-full transition-all duration-500" style={{ width: `${forecastData.expectedEasyPercent}%` }} />
                            </div>
                          </div>
                          <div>
                            <div className="flex justify-between text-xs font-bold text-neutral-700 mb-1">
                              <span>Expected Medium Questions</span>
                              <span>{forecastData.expectedMediumPercent}%</span>
                            </div>
                            <div className="w-full bg-neutral-200 h-2.5 rounded-full overflow-hidden">
                              <div className="bg-amber-500 h-full transition-all duration-500" style={{ width: `${forecastData.expectedMediumPercent}%` }} />
                            </div>
                          </div>
                          <div>
                            <div className="flex justify-between text-xs font-bold text-neutral-700 mb-1">
                              <span>Expected Hard Questions</span>
                              <span>{forecastData.expectedHardPercent}%</span>
                            </div>
                            <div className="w-full bg-neutral-200 h-2.5 rounded-full overflow-hidden">
                              <div className="bg-red-600 h-full transition-all duration-500" style={{ width: `${forecastData.expectedHardPercent}%` }} />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Strategic revision advice */}
                      <div className="mt-8 pt-4 border-t border-neutral-300">
                        <span className="text-[10px] font-bold text-neutral-500 uppercase block mb-1">Revision Strategy Advisor</span>
                        <p className="text-xs text-neutral-600 font-serif leading-relaxed italic">
                          &ldquo;{forecastData.revisionStrategy}&rdquo;
                        </p>
                      </div>
                    </VintagePaper>

                    {/* Expected Topic Probabilities and Badges */}
                    <VintagePaper className="shadow-[0_10px_25px_rgba(0,0,0,0.5)]">
                      <h3 className="text-xl font-bold font-playfair text-neutral-900 mb-4 border-b border-neutral-400 pb-2 flex items-center justify-between gap-2">
                        <span className="flex items-center gap-2">
                          <TrendingUp className="w-5 h-5 text-indigo-700" /> Expected Weightage & Trends
                        </span>
                        <button
                          type="button"
                          onClick={() => fetchForecast(true)}
                          disabled={loadingForecast}
                          className="p-1.5 hover:bg-neutral-200 rounded text-neutral-600 hover:text-neutral-900 transition-colors"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                        </button>
                      </h3>
                      <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                        {forecastData.topicTrends?.map((trend, idx) => (
                          <div key={idx} className="p-3 bg-white border border-neutral-200 rounded hover:shadow-sm transition-all flex items-center justify-between gap-4">
                            <div>
                              <p className="font-bold text-xs text-neutral-900">{trend.topicName}</p>
                              <span className={`inline-block mt-1.5 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider border ${
                                trend.trendStatus === 'Rising Weightage'
                                  ? 'bg-red-50 text-red-700 border-red-200'
                                  : trend.trendStatus === 'High Probability in 2026'
                                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                                  : trend.trendStatus === 'Stable Weightage'
                                  ? 'bg-blue-50 text-blue-700 border-blue-200'
                                  : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              }`}>
                                {trend.trendStatus}
                              </span>
                            </div>
                            <div className="text-right shrink-0">
                              <span className="text-[9px] font-bold text-neutral-400 block uppercase">Probability</span>
                              <span className="text-sm font-black font-playfair text-amber-900">{trend.expectedProbability}%</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </VintagePaper>
</div>
                )}
              </div>
            )}

            {activeInsightTab === 'duplicates' && (
              <VintagePaper className="shadow-[0_10px_25px_rgba(0,0,0,0.5)]">
                <h3 className="text-xl font-bold font-playfair text-neutral-900 mb-4 border-b border-neutral-400 pb-2 flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2">
                    <Copy className="w-5 h-5 text-amber-800" /> Repeated Questions Across Years
                  </span>
                  <button
                    type="button"
                    onClick={() => fetchClusters(true)}
                    disabled={loadingClusters}
                    className="p-1.5 hover:bg-neutral-200 rounded text-neutral-600 hover:text-neutral-900 transition-colors"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                </h3>

                {loadingClusters ? (
                  <div className="flex flex-col items-center justify-center py-16 text-neutral-500 gap-2">
                    <RefreshCw className="w-8 h-8 animate-spin text-amber-800" />
                    <p className="text-sm italic">Comparing question embeddings across exam years...</p>
                  </div>
                ) : clusterError ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center text-red-700">
                    <AlertCircle className="w-8 h-8 mb-2" />
                    <p>{clusterError}</p>
                    <button
                      type="button"
                      onClick={() => fetchClusters()}
                      className="mt-3 text-amber-800 hover:text-amber-900 font-semibold text-xs underline"
                    >
                      Try Again
                    </button>
                  </div>
                ) : clusterData.length === 0 ? (
                  <p className="text-sm text-neutral-500 italic text-center py-16">
                    No cross-year duplicate questions detected yet. Upload and analyze PYQs from multiple years to find repeats.
                  </p>
                ) : (
                  <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                    {clusterData.map((cluster, idx) => (
                      <RepeatedQuestionCard key={idx} rq={cluster} />
                    ))}
                  </div>
                )}
              </VintagePaper>
            )}
      </div>
    </LeatherBoard>
  );
};

export default PyqDashboard;