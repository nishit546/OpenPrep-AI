import React, { useState, useRef, useMemo } from 'react';
import {
  Sparkles,
  Zap,
  Plus,
  Trash2,
  Maximize2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  Layers,
  Edit3,
} from 'lucide-react';
import biDirectionalMindMapService from '../../services/biDirectionalMindMapService';
import DynamicQuizCardSynthesizerModal from './DynamicQuizCardSynthesizerModal';

export const BiDirectionalMindMapVisualizer = ({
  mindMapId = null,
  initialNodesData = null,
  title = 'Interactive Bi-Directional Mind Map',
}) => {
  const [nodesData, setNodesData] = useState(
    initialNodesData || {
      nodes: [
        {
          id: 'node-1',
          label: 'Core Concept',
          description: 'Main topic entry node',
          category: 'Core',
          masteryScore: 85,
          status: 'MASTERED',
        },
        {
          id: 'node-2',
          label: 'Subtopic A',
          description: 'Primary dependent module',
          category: 'Subtopic',
          masteryScore: 45,
          status: 'REVIEW_NEEDED',
        },
        {
          id: 'node-3',
          label: 'Subtopic B',
          description: 'Secondary related topic',
          category: 'Subtopic',
          masteryScore: 20,
          status: 'WEAK_CONCEPT',
        },
      ],
      edges: [
        { source: 'node-1', target: 'node-2', relationship: 'leads to' },
        { source: 'node-1', target: 'node-3', relationship: 'contains' },
      ],
    }
  );

  const [selectedNodeIds, setSelectedNodeIds] = useState([]);
  const [transform, setTransform] = useState({ x: 0, y: 0, k: 1 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [synthesizing, setSynthesizing] = useState(false);
  const [quizCards, setQuizCards] = useState([]);
  const [quizModalOpen, setQuizModalOpen] = useState(false);
  const [editNodeModalOpen, setEditNodeModalOpen] = useState(false);
  const [newNodeLabel, setNewNodeLabel] = useState('');
  const [newNodeDesc, setNewNodeDesc] = useState('');

  const svgRef = useRef(null);

  // Position nodes in a radial layout centered in viewBox
  const positionedNodes = useMemo(() => {
    const nodes = nodesData.nodes || [];
    const centerX = 400;
    const centerY = 300;
    const radius = 210;

    return nodes.map((node, index) => {
      if (index === 0) {
        return { ...node, x: centerX, y: centerY };
      }
      const angle = ((index - 1) / (nodes.length - 1 || 1)) * 2 * Math.PI;
      return {
        ...node,
        x: centerX + radius * Math.cos(angle),
        y: centerY + radius * Math.sin(angle),
      };
    });
  }, [nodesData]);

  // Handle Zoom & Pan
  const handleWheel = (e) => {
    e.preventDefault();
    const scaleFactor = e.deltaY > 0 ? 0.9 : 1.1;
    setTransform((prev) => ({
      ...prev,
      k: Math.max(0.5, Math.min(3, prev.k * scaleFactor)),
    }));
  };

  const handleMouseDown = (e) => {
    if (e.target.tagName === 'svg' || e.target.id === 'canvas-bg') {
      setIsDragging(true);
      setDragStart({ x: e.clientX - transform.x, y: e.clientY - transform.y });
    }
  };

  const handleMouseMove = (e) => {
    if (isDragging) {
      setTransform((prev) => ({
        ...prev,
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      }));
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Node Selection
  const handleNodeClick = (node, e) => {
    e.stopPropagation();
    if (e.shiftKey) {
      setSelectedNodeIds((prev) =>
        prev.includes(node.id) ? prev.filter((id) => id !== node.id) : [...prev, node.id]
      );
    } else {
      setSelectedNodeIds([node.id]);
    }
  };

  // Synthesize Quiz Cards
  const handleSynthesizeQuiz = async () => {
    try {
      setSynthesizing(true);
      const res = await biDirectionalMindMapService.synthesizeQuizCards({
        mindMapId,
        selectedNodeIds,
        numQuestions: 4,
      });

      if (res?.success && res.data?.length > 0) {
        setQuizCards(res.data);
        setQuizModalOpen(true);
      }
    } catch (err) {
      console.error('Quiz synthesis error:', err);
    } finally {
      setSynthesizing(false);
    }
  };

  // Add new child node
  const handleAddChildNode = () => {
    if (!newNodeLabel.trim()) return;
    const parentId = selectedNodeIds[0] || 'node-1';
    const newId = `node-${Date.now()}`;

    const newNode = {
      id: newId,
      label: newNodeLabel.trim(),
      description: newNodeDesc.trim() || 'Custom synthesized subtopic',
      category: 'Subtopic',
      masteryScore: 0,
      status: 'UNTESTED',
    };

    const newEdge = {
      source: parentId,
      target: newId,
      relationship: 'leads to',
    };

    const updatedData = {
      nodes: [...(nodesData.nodes || []), newNode],
      edges: [...(nodesData.edges || []), newEdge],
    };

    setNodesData(updatedData);
    setNewNodeLabel('');
    setNewNodeDesc('');
    setEditNodeModalOpen(false);

    if (mindMapId) {
      biDirectionalMindMapService.updateGraph(mindMapId, { nodesData: updatedData }).catch(console.error);
    }
  };

  // Node Heatmap Color Lookup
  const getNodeColor = (node, isSelected) => {
    if (isSelected) {
      return {
        fill: '#4f46e5',
        stroke: '#818cf8',
        badgeBg: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40',
      };
    }

    switch (node.status) {
      case 'MASTERED':
        return {
          fill: '#059669',
          stroke: '#34d399',
          badgeBg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
        };
      case 'REVIEW_NEEDED':
        return {
          fill: '#d97706',
          stroke: '#fbbf24',
          badgeBg: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
        };
      case 'WEAK_CONCEPT':
        return {
          fill: '#dc2626',
          stroke: '#f87171',
          badgeBg: 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse',
        };
      default:
        return {
          fill: '#1e293b',
          stroke: '#64748b',
          badgeBg: 'bg-slate-700/40 text-slate-300 border-slate-600',
        };
    }
  };

  const selectedNodesList = positionedNodes.filter((n) => selectedNodeIds.includes(n.id));

  return (
    <div className="relative w-full h-[650px] bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden flex flex-col shadow-2xl text-slate-100">
      
      {/* Header Toolbar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/80 backdrop-blur z-10">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white tracking-tight">{title}</h2>
            <p className="text-xs text-slate-400">Bi-Directional Mastery Heatmap & Active Recall Engine</p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleSynthesizeQuiz}
            disabled={synthesizing}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-500/20 transition-all cursor-pointer"
          >
            <Sparkles className={`w-3.5 h-3.5 ${synthesizing ? 'animate-spin' : ''}`} />
            <span>{synthesizing ? 'Synthesizing Cards...' : 'Synthesize Quiz Cards'}</span>
          </button>

          <button
            onClick={() => setEditNodeModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" /> Node
          </button>
        </div>
      </div>

      {/* SVG Canvas */}
      <div className="relative flex-1 bg-slate-950 overflow-hidden">
        <svg
          ref={svgRef}
          id="canvas-bg"
          className="w-full h-full cursor-grab active:cursor-grabbing select-none"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
        >
          <g transform={`translate(${transform.x}, ${transform.y}) scale(${transform.k})`}>
            {/* Draw Directed Relationship Edges */}
            {(nodesData.edges || []).map((edge, idx) => {
              const source = positionedNodes.find((n) => n.id === edge.source);
              const target = positionedNodes.find((n) => n.id === edge.target);
              if (!source || !target) return null;

              const midX = (source.x + target.x) / 2;
              const midY = (source.y + target.y) / 2;

              return (
                <g key={`edge-${idx}`}>
                  <line
                    x1={source.x}
                    y1={source.y}
                    x2={target.x}
                    y2={target.y}
                    stroke="#475569"
                    strokeWidth="2"
                    strokeDasharray="4 4"
                  />
                  <rect
                    x={midX - 35}
                    y={midY - 10}
                    width="70"
                    height="18"
                    rx="4"
                    fill="#0f172a"
                    stroke="#334155"
                    strokeWidth="1"
                  />
                  <text
                    x={midX}
                    y={midY + 3}
                    textAnchor="middle"
                    className="text-[9px] font-mono fill-slate-400 font-semibold"
                  >
                    {edge.relationship}
                  </text>
                </g>
              );
            })}

            {/* Draw Interactive Concept Nodes */}
            {positionedNodes.map((node) => {
              const isSelected = selectedNodeIds.includes(node.id);
              const colors = getNodeColor(node, isSelected);

              return (
                <g
                  key={node.id}
                  transform={`translate(${node.x}, ${node.y})`}
                  onClick={(e) => handleNodeClick(node, e)}
                  className="cursor-pointer group"
                >
                  {/* Glowing outer ring */}
                  <circle
                    r="38"
                    fill={colors.fill}
                    stroke={colors.stroke}
                    strokeWidth={isSelected ? '4' : '2'}
                    className="transition-all duration-300 shadow-xl group-hover:scale-105"
                  />
                  
                  {/* Node Label */}
                  <text
                    textAnchor="middle"
                    dy="-3"
                    className="text-[11px] font-bold fill-white pointer-events-none font-sans"
                  >
                    {node.label.length > 14 ? `${node.label.substring(0, 14)}...` : node.label}
                  </text>

                  {/* Mastery Score Badge */}
                  <text
                    textAnchor="middle"
                    dy="14"
                    className="text-[9px] font-mono font-bold fill-slate-300 pointer-events-none"
                  >
                    {node.masteryScore}% Mastery
                  </text>
                </g>
              );
            })}
          </g>
        </svg>

        {/* Floating Node Details & Multi-Select Sidebar */}
        {selectedNodesList.length > 0 && (
          <div className="absolute top-4 right-4 w-72 bg-slate-900/95 backdrop-blur-md rounded-2xl border border-slate-800 p-4 shadow-2xl text-xs space-y-3 z-20 animate-fadeIn">
            <div className="flex justify-between items-center pb-2 border-b border-slate-800">
              <span className="font-bold text-white uppercase text-[10px] tracking-wider">
                Selected Nodes ({selectedNodesList.length})
              </span>
              <button
                onClick={() => setSelectedNodeIds([])}
                className="text-slate-400 hover:text-white"
              >
                &times;
              </button>
            </div>

            {selectedNodesList.map((n) => {
              const colors = getNodeColor(n, false);
              return (
                <div key={n.id} className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/80 space-y-1">
                  <div className="flex justify-between items-center">
                    <h4 className="font-bold text-slate-200">{n.label}</h4>
                    <span className={`text-[9px] px-2 py-0.5 rounded font-mono font-semibold border ${colors.badgeBg}`}>
                      {n.status} ({n.masteryScore}%)
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-normal">{n.description}</p>
                </div>
              );
            })}

            <button
              onClick={handleSynthesizeQuiz}
              disabled={synthesizing}
              className="w-full py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 font-semibold text-white transition-all text-xs flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-indigo-500/20"
            >
              <Zap className="w-3.5 h-3.5" /> Synthesize Active Recall Cards
            </button>
          </div>
        )}

        {/* Viewport Control Buttons */}
        <div className="absolute bottom-4 left-4 flex gap-1.5 bg-slate-900/90 backdrop-blur p-1.5 rounded-xl border border-slate-800 z-10">
          <button
            onClick={() => setTransform((prev) => ({ ...prev, k: Math.min(3, prev.k * 1.2) }))}
            className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-300 transition"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={() => setTransform((prev) => ({ ...prev, k: Math.max(0.5, prev.k * 0.8) }))}
            className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-300 transition"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            onClick={() => setTransform({ x: 0, y: 0, k: 1 })}
            className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-300 transition"
            title="Reset View"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>

        {/* Legend */}
        <div className="absolute bottom-4 right-4 flex items-center gap-3 bg-slate-900/90 backdrop-blur px-3 py-1.5 rounded-xl border border-slate-800 text-[10px] text-slate-300 font-medium z-10">
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Mastered</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Review</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" /> Weak</span>
        </div>
      </div>

      {/* Add/Edit Node Modal */}
      {editNodeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full space-y-4">
            <h3 className="text-base font-bold text-white">Add Custom Concept Node</h3>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Concept Label</label>
                <input
                  type="text"
                  value={newNodeLabel}
                  onChange={(e) => setNewNodeLabel(e.target.value)}
                  placeholder="e.g. Action Potential"
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">Brief Description</label>
                <textarea
                  value={newNodeDesc}
                  onChange={(e) => setNewNodeDesc(e.target.value)}
                  placeholder="Core mechanism explanation..."
                  rows={3}
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none focus:border-indigo-500"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 text-xs font-semibold pt-2">
              <button
                onClick={() => setEditNodeModalOpen(false)}
                className="px-4 py-2 rounded-xl text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleAddChildNode}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20"
              >
                Add Node
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quiz Card Synthesis Modal */}
      {quizModalOpen && (
        <DynamicQuizCardSynthesizerModal
          isOpen={quizModalOpen}
          onClose={() => setQuizModalOpen(false)}
          mindMapId={mindMapId}
          quizCards={quizCards}
          onNodeMasteryUpdated={(updateResult) => {
            const { nodeId, updatedNode } = updateResult;
            setNodesData((prev) => {
              const nodes = (prev.nodes || []).map((n) => (n.id === nodeId ? updatedNode : n));
              return { ...prev, nodes };
            });
          }}
        />
      )}
    </div>
  );
};

export default BiDirectionalMindMapVisualizer;
