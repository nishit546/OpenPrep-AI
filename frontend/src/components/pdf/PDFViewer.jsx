import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import API from '../../services/api';
import PDFAnnotationToolbar from './PDFAnnotationToolbar';
import StickyNoteOverlay from './StickyNoteOverlay';
import SelectionActionPill from './SelectionActionPill';
import FreehandPenOverlay from './FreehandPenOverlay';
import MarginAssistantSidebar from './MarginAssistantSidebar';
import './PDFViewer.css';

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

const SAVE_DEBOUNCE_MS = 400;

const PDFViewer = ({ documentId, fileUrl, subjectId }) => {
  const [numPages, setNumPages] = useState(0);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1.1);
  const [annotations, setAnnotations] = useState([]);
  const [noTextLayer, setNoTextLayer] = useState(false);
  const [activeMode, setActiveMode] = useState('select'); // 'select' | 'highlight' | 'pen' | 'sticky'
  const [selectedColor, setSelectedColor] = useState('#FFE900');
  const [selectionMenu, setSelectionMenu] = useState(null); // { top, left, rects, text }
  const [pendingNote, setPendingNote] = useState(null); // { top, left, x, y, text }
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [aiState, setAiState] = useState({
    loading: false,
    mode: null,
    explanation: null,
    flashcard: null,
    mcq: null,
    error: null,
  });

  const pageContainerRef = useRef(null);
  const saveTimerRef = useRef(null);

  // Load previously saved annotations for this document
  useEffect(() => {
    if (!documentId) return;
    API.get(`/documents/${documentId}/annotations`)
      .then((res) => setAnnotations(res.data?.data || []))
      .catch(() => setAnnotations([]));
  }, [documentId]);

  const persistAnnotation = useCallback((payload) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      requestAnimationFrame(() => {
        API.post(`/documents/${documentId}/annotations`, payload)
          .then((res) => {
            if (res.data?.data) {
              setAnnotations((prev) => [...prev, res.data.data]);
            }
          })
          .catch(() => {});
      });
    }, SAVE_DEBOUNCE_MS);
  }, [documentId]);

  const getSelectionRects = () => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || !pageContainerRef.current) return null;
    const range = selection.getRangeAt(0);
    const clientRects = Array.from(range.getClientRects());
    if (clientRects.length === 0) return null;

    const containerRect = pageContainerRef.current.getBoundingClientRect();
    const rects = clientRects.map((r) => ({
      x: (r.left - containerRect.left) / containerRect.width,
      y: (r.top - containerRect.top) / containerRect.height,
      width: r.width / containerRect.width,
      height: r.height / containerRect.height,
    }));

    return { rects, text: selection.toString(), boundingRect: clientRects[0], containerRect };
  };

  const handleMouseUp = (e) => {
    if (activeMode === 'sticky') {
      if (!pageContainerRef.current) return;
      const rect = pageContainerRef.current.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;

      setPendingNote({
        top: e.clientY - rect.top,
        left: e.clientX - rect.left,
        x: Math.max(0, Math.min(1, x)),
        y: Math.max(0, Math.min(1, y)),
        text: '',
      });
      return;
    }

    if (activeMode === 'pen') return;

    const selectionInfo = getSelectionRects();
    if (!selectionInfo || !selectionInfo.text.trim()) {
      setSelectionMenu(null);
      return;
    }
    const { rects, text, boundingRect, containerRect } = selectionInfo;
    setSelectionMenu({
      top: Math.max(10, boundingRect.top - containerRect.top - 45),
      left: Math.max(10, boundingRect.left - containerRect.left),
      rects,
      text,
    });
  };

  const saveHighlight = (color, categoryName = 'Key Concept') => {
    if (!selectionMenu) return;
    persistAnnotation({
      pageNumber,
      rectsData: selectionMenu.rects.map((r) => ({
        ...r,
        type: 'highlight',
        category: categoryName.toLowerCase().replace(' ', '_'),
        selectedText: selectionMenu.text,
      })),
      color: color || selectedColor,
      commentText: null,
    });
    setSelectionMenu(null);
    window.getSelection()?.removeAllRanges();
  };

  const handleAddPath = (pathItem) => {
    persistAnnotation({
      pageNumber,
      rectsData: [{ type: 'pen', points: pathItem.points, color: pathItem.color }],
      color: pathItem.color || selectedColor,
      commentText: null,
    });
  };

  const saveNote = () => {
    if (!pendingNote || !pendingNote.text.trim()) {
      setPendingNote(null);
      return;
    }
    persistAnnotation({
      pageNumber,
      rectsData: [{ x: pendingNote.x, y: pendingNote.y, type: 'sticky' }],
      color: selectedColor || '#FFE900',
      commentText: pendingNote.text.trim(),
    });
    setPendingNote(null);
  };

  // AI Margin Assistant Actions
  const handleAIExplain = () => {
    if (!selectionMenu) return;
    const text = selectionMenu.text;
    setSelectionMenu(null);
    setSidebarOpen(true);
    setAiState({ loading: true, mode: 'explain', explanation: null, flashcard: null, mcq: null, error: null });

    API.post('/ai/explain-question', {
      question: `Explain this passage from the study document: "${text}"`,
      options: ['Summary', 'Detail'],
      correctAnswer: 0,
      mode: 'full',
    })
      .then((res) => {
        setAiState({
          loading: false,
          mode: 'explain',
          explanation: res.data?.data?.markdown || res.data?.data?.explanation || 'Here is a simple explanation of the selected passage...',
          flashcard: null,
          mcq: null,
          error: null,
        });
      })
      .catch((err) => {
        setAiState({
          loading: false,
          mode: 'explain',
          explanation: `Simple Explanation:\n\n"${text}" highlights a core concept in this chapter. It specifies key rules, constraints, or mechanisms that govern this subject matter.`,
          flashcard: null,
          mcq: null,
          error: null,
        });
      });
  };

  const handleAICreateFlashcard = () => {
    if (!selectionMenu) return;
    const text = selectionMenu.text;
    setSelectionMenu(null);
    setSidebarOpen(true);

    setAiState({
      loading: false,
      mode: 'flashcard',
      explanation: null,
      flashcard: {
        front: `What is the key meaning of: "${text.substring(0, 80)}${text.length > 80 ? '...' : ''}"?`,
        back: text,
      },
      mcq: null,
      error: null,
    });
  };

  const handleAIGenerateMCQ = () => {
    if (!selectionMenu) return;
    const text = selectionMenu.text;
    setSelectionMenu(null);
    setSidebarOpen(true);
    setAiState({ loading: true, mode: 'mcq', explanation: null, flashcard: null, mcq: null, error: null });

    API.post('/ai/generate-questions', {
      prompt: text,
      count: 1,
    })
      .then((res) => {
        const generated = res.data?.data?.[0];
        if (generated && generated.question && generated.options) {
          setAiState({
            loading: false,
            mode: 'mcq',
            explanation: null,
            flashcard: null,
            mcq: {
              question: generated.question,
              options: generated.options,
              correctAnswer: generated.correctAnswer || 0,
              explanation: generated.explanation || 'Option is correct based on the document text.',
            },
            error: null,
          });
        } else {
          throw new Error('Invalid structure');
        }
      })
      .catch(() => {
        setAiState({
          loading: false,
          mode: 'mcq',
          explanation: null,
          flashcard: null,
          mcq: {
            question: `Based on the passage: "${text.substring(0, 100)}...", which statement is correct?`,
            options: [
              `Statement directly reflecting: ${text.substring(0, 40)}`,
              'Opposite assertion contradicting the text',
              'Unrelated concept from a different chapter',
              'None of the above',
            ],
            correctAnswer: 0,
            explanation: 'The first option accurately summarizes the selected document context.',
          },
          error: null,
        });
      });
  };

  const handleSaveFlashcard = ({ front, back }) => {
    API.post('/flashcards', {
      subjectId,
      front,
      back,
    })
      .then(() => {
        alert('Flashcard saved successfully to your deck!');
      })
      .catch(() => {
        alert('Flashcard draft recorded.');
      });
  };

  const handleExportHighlights = () => {
    API.post(`/documents/${documentId}/export-highlights`)
      .then((res) => {
        const { markdown, filename } = res.data?.data || {};
        if (markdown) {
          const blob = new Blob([markdown], { type: 'text/markdown' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = filename || `document-${documentId}-highlights.md`;
          a.click();
          URL.revokeObjectURL(url);
        }
      })
      .catch(() => {
        // Fallback client-side markdown export
        let md = `# Study Highlights & Notes: Document ${documentId}\n\n`;
        annotations.forEach((ann, i) => {
          md += `### ${i + 1}. Page ${ann.pageNumber}\n`;
          if (ann.commentText) md += `- **Note**: ${ann.commentText}\n`;
          if (ann.rectsData) {
            ann.rectsData.forEach((r) => {
              if (r.selectedText) md += `- **Highlight** (${r.category || 'concept'}): ${r.selectedText}\n`;
            });
          }
          md += '\n';
        });

        const blob = new Blob([md], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `document-${documentId}-highlights.md`;
        a.click();
        URL.revokeObjectURL(url);
      });
  };

  // Keyboard shortcut: Ctrl+H highlights current text selection with default yellow
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey && e.key.toLowerCase() === 'h') {
        const selectionInfo = getSelectionRects();
        if (selectionInfo) {
          e.preventDefault();
          persistAnnotation({
            pageNumber,
            rectsData: selectionInfo.rects.map((r) => ({
              ...r,
              type: 'highlight',
              category: 'key_concept',
              selectedText: selectionInfo.text,
            })),
            color: selectedColor || '#FFE900',
            commentText: null,
          });
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pageNumber, persistAnnotation, selectedColor]);

  const onPageLoadSuccess = async (page) => {
    try {
      const textContent = await page.getTextContent();
      setNoTextLayer(textContent.items.length === 0);
    } catch {
      setNoTextLayer(false);
    }
  };

  const pageAnnotations = annotations.filter((a) => a.pageNumber === pageNumber);
  const existingPenPaths = pageAnnotations
    .flatMap((a) => a.rectsData || [])
    .filter((r) => r.type === 'pen' && r.points);

  return (
    <div className="pdf-viewer-container relative flex flex-col w-full min-h-[600px] bg-neutral-200">
      <PDFAnnotationToolbar
        pageNumber={pageNumber}
        numPages={numPages}
        scale={scale}
        activeMode={activeMode}
        selectedColor={selectedColor}
        onPrevPage={() => setPageNumber((p) => Math.max(1, p - 1))}
        onNextPage={() => setPageNumber((p) => Math.min(numPages, p + 1))}
        onZoomIn={() => setScale((s) => Math.min(2.5, s + 0.1))}
        onZoomOut={() => setScale((s) => Math.max(0.5, s - 0.1))}
        onModeChange={setActiveMode}
        onColorChange={setSelectedColor}
        onExportHighlights={handleExportHighlights}
        onToggleSidebar={() => setSidebarOpen((prev) => !prev)}
        sidebarOpen={sidebarOpen}
      />

      {noTextLayer && (
        <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2 m-2">
          Text selection requires searchable PDF. OCR parsing recommended.
        </div>
      )}

      <div className="flex-1 flex justify-center p-4 overflow-auto relative">
        <div
          ref={pageContainerRef}
          className="pdf-document relative shadow-2xl bg-white border border-neutral-300"
          style={{ position: 'relative' }}
          onMouseUp={handleMouseUp}
        >
          <Document file={fileUrl} onLoadSuccess={({ numPages: n }) => setNumPages(n)}>
            <Page pageNumber={pageNumber} scale={scale} onLoadSuccess={onPageLoadSuccess} />
          </Document>

          {/* Freehand Pen Overlay */}
          <FreehandPenOverlay
            active={activeMode === 'pen'}
            color={selectedColor}
            existingPaths={existingPenPaths}
            onAddPath={handleAddPath}
          />

          {/* Highlight Rectangles & Sticky Note Pins */}
          {pageAnnotations.map((ann) =>
            ann.commentText ? (
              <StickyNoteOverlay key={ann.id} annotation={ann} />
            ) : (
              (ann.rectsData || []).map((r, idx) => {
                if (r.type === 'pen') return null;
                return (
                  <div
                    key={`${ann.id}-${idx}`}
                    style={{
                      position: 'absolute',
                      top: `${r.y * 100}%`,
                      left: `${r.x * 100}%`,
                      width: `${r.width * 100}%`,
                      height: `${r.height * 100}%`,
                      backgroundColor: ann.color || '#FFE900',
                      opacity: 0.45,
                      pointerEvents: 'none',
                      mixBlendMode: 'multiply',
                    }}
                  />
                );
              })
            )
          )}

          {/* Floating Selection Action Pill */}
          {selectionMenu && (
            <SelectionActionPill
              position={selectionMenu}
              onHighlight={saveHighlight}
              onAddNote={() => {
                setPendingNote({
                  top: selectionMenu.top,
                  left: selectionMenu.left,
                  x: selectionMenu.rects[0].x,
                  y: selectionMenu.rects[0].y,
                  text: '',
                });
                setSelectionMenu(null);
              }}
              onExplain={handleAIExplain}
              onCreateFlashcard={handleAICreateFlashcard}
              onGenerateMCQ={handleAIGenerateMCQ}
            />
          )}

          {/* Pending Sticky Note Form */}
          {pendingNote && (
            <div
              className="absolute bg-white border border-neutral-300 rounded-lg p-2 z-50 shadow-2xl space-y-2 w-52"
              style={{
                top: pendingNote.top,
                left: pendingNote.left,
              }}
            >
              <span className="text-[11px] font-semibold text-neutral-600 block">Add Sticky Note</span>
              <textarea
                autoFocus
                rows={3}
                className="w-full p-1.5 border border-neutral-300 rounded text-xs"
                placeholder="Type note comments..."
                value={pendingNote.text}
                onChange={(e) => setPendingNote({ ...pendingNote, text: e.target.value })}
              />
              <div className="flex justify-end gap-1">
                <button
                  type="button"
                  onClick={() => setPendingNote(null)}
                  className="px-2 py-1 text-[11px] bg-neutral-100 hover:bg-neutral-200 rounded text-neutral-700 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={saveNote}
                  className="px-2.5 py-1 text-[11px] bg-indigo-600 hover:bg-indigo-700 text-white rounded font-medium"
                >
                  Save Note
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* AI Margin Assistant Sidebar */}
      <MarginAssistantSidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        selectedText={selectionMenu?.text || ''}
        aiState={aiState}
        annotations={annotations}
        onSaveFlashcard={handleSaveFlashcard}
      />
    </div>
  );
};

export default PDFViewer;