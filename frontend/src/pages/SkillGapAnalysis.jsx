/**
 * @fileoverview Main UI for Resume Parsing and Skill Gap Analysis.
 * Features drag-and-drop file upload and results visualization.
 */
import React, { useState } from 'react';
import SkillRadarChart from '../components/SkillGap/SkillRadarChart';
import SkillDependencyGraph from '../components/SkillGap/SkillDependencyGraph';
import axios from 'axios';

const SkillGapAnalysis = () => {
    const [file, setFile] = useState(null);
    const [jobDescription, setJobDescription] = useState('');
    const [targetRole, setTargetRole] = useState('');
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState('');

    const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0];
        if (selectedFile && (selectedFile.type === 'application/pdf' || selectedFile.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')) {
            setFile(selectedFile);
            setError('');
        } else {
            setError('Please upload a valid PDF or DOCX file (max 5MB).');
            setFile(null);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!file || !jobDescription.trim() || !targetRole.trim()) {
            setError('All fields are required.');
            return;
        }

        setIsAnalyzing(true);
        setError('');
        setResult(null);

        const formData = new FormData();
        formData.append('resume', file);
        formData.append('jobDescription', jobDescription);
        formData.append('targetRole', targetRole);

        try {
            const response = await axios.post(`${API_URL}/skill-gap/analyze`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });

            if (response.data.success) {
                setResult(response.data.data);
            } else {
                setError(response.data.message || 'Analysis failed.');
            }
        } catch (err) {
            console.error('Analysis error:', err);
            setError(err.response?.data?.message || 'Network error. Please try again.');
        } finally {
            setIsAnalyzing(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4 sm:px-6 lg:px-8">
            <div className="max-w-5xl mx-auto">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Skill Gap Analysis</h1>
                <p className="text-gray-600 dark:text-gray-400 mb-8">Upload your resume and a target job description to identify areas for improvement.</p>

                {error && (
                    <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300">
                        {error}
                    </div>
                )}

                {!result ? (
                    <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Target Role</label>
                                <input
                                    type="text"
                                    value={targetRole}
                                    onChange={(e) => setTargetRole(e.target.value)}
                                    placeholder="e.g., Senior Frontend Developer"
                                    className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Upload Resume (PDF/DOCX)</label>
                                <input
                                    type="file"
                                    accept=".pdf,.docx"
                                    onChange={handleFileChange}
                                    className="w-full text-sm text-gray-500 dark:text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-blue-900/30 dark:file:text-blue-300"
                                    required
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Job Description</label>
                            <textarea
                                value={jobDescription}
                                onChange={(e) => setJobDescription(e.target.value)}
                                rows={6}
                                placeholder="Paste the full job description here..."
                                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                                required
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={isAnalyzing || !file}
                            className="w-full md:w-auto px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
                        >
                            {isAnalyzing ? (
                                <>
                                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                    Analyzing...
                                </>
                            ) : 'Analyze Skill Gap'}
                        </button>
                    </form>
                ) : (
                    <div className="space-y-6">
                        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Analysis Results for {targetRole}</h2>
                                <button onClick={() => setResult(null)} className="text-sm text-blue-600 dark:text-blue-400 hover:underline">Analyze Another</button>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                <SkillRadarChart skills={result.skills} />

                                <div className="space-y-4">
                                    <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full bg-green-500"></span>
                                        Overall Match: {result.overallMatchScore}%
                                    </h3>
                                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                                        <div className="bg-green-500 h-2.5 rounded-full transition-all duration-500" style={{ width: `${result.overallMatchScore}%` }}></div>
                                    </div>

                                    <h3 className="font-semibold text-gray-900 dark:text-white mt-6 mb-3">Actionable Recommendations</h3>
                                    <ul className="space-y-3">
                                        {result.recommendations.map((rec, idx) => (
                                            <li key={idx} className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-lg">
                                                <p className="text-sm font-medium text-blue-900 dark:text-blue-200">{rec.skill}</p>
                                                <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">{rec.action}</p>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
    <div className="mb-5">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Skill Dependency Graph
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Prerequisite skills are shown before the skills that depend on them.
            Root gaps should be addressed first.
        </p>
    </div>

    <SkillDependencyGraph />
</div>
        </div>
    );
};

export default SkillGapAnalysis;
