import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save, AlertCircle } from 'lucide-react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import API from '../../services/api';

const CreateNoteModal = ({ isOpen, onClose, onNoteCreated }) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Title is required');
      return;
    }
    if (!content.trim() || content === '<p><br></p>') {
      setError('Content is required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('title', title);
      formData.append('content', content);

      const response = await API.post('/notes', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (onNoteCreated) {
        onNoteCreated(response.data);
      }
      
      setTitle('');
      setContent('');
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create note');
    } finally {
      setLoading(false);
    }
  };

  const modules = {
    toolbar: [
      [{ 'header': [1, 2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{'list': 'ordered'}, {'list': 'bullet'}],
      ['clean']
    ],
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-[#fdfaf3] w-full max-w-2xl rounded-sm shadow-[0_10px_30px_rgba(0,0,0,0.3)] flex flex-col max-h-[90vh]"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-neutral-300">
              <h2 className="text-2xl font-playfair font-bold text-neutral-800">Create Note</h2>
              <button
                onClick={onClose}
                className="text-neutral-500 hover:text-neutral-800 transition-colors"
                disabled={loading}
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto flex-1">
              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  {error}
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label htmlFor="title" className="block text-sm font-semibold text-neutral-700 mb-1">
                    Title
                  </label>
                  <input
                    id="title"
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Enter note title..."
                    className="w-full px-4 py-2 bg-white border border-neutral-300 rounded focus:outline-none focus:ring-2 focus:ring-yellow-600 focus:border-transparent transition-all"
                    disabled={loading}
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-neutral-700 mb-1">
                    Content
                  </label>
                  <div className="bg-white rounded overflow-hidden">
                    <ReactQuill
                      theme="snow"
                      value={content}
                      onChange={setContent}
                      modules={modules}
                      placeholder="Write your study notes here..."
                      className="h-[300px] mb-12"
                      readOnly={loading}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-neutral-300 flex justify-end gap-3 bg-neutral-50">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2 border border-neutral-300 text-neutral-700 rounded hover:bg-neutral-100 font-medium transition-colors"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="px-6 py-2 bg-gradient-to-r from-yellow-600 to-yellow-700 text-white rounded shadow-md hover:shadow-lg font-medium transition-all flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                <Save className="w-4 h-4" />
                {loading ? 'Saving...' : 'Save Note'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default CreateNoteModal;
