import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';

const KnowledgeGraphView = () => {
  const canvasRef = useRef(null);
  const [graphData, setGraphData] = useState({ nodes: [], edges: [] });
  const [isLoading, setIsLoading] = useState(true);

  // Simulation parameters
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [hoveredNode, setHoveredNode] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);

  // Fetch graph data from backend API
  useEffect(() => {
    const fetchGraph = async () => {
      try {
        const token = localStorage.getItem('token');
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        const res = await axios.get('/api/notes/graph', { headers });
        if (res.data && res.data.success) {
          // Initialize nodes with random positions
          const raw = res.data.data;
          const initializedNodes = raw.nodes.map((n, i) => ({
            ...n,
            x: Math.random() * 400 - 200,
            y: Math.random() * 400 - 200,
            vx: 0,
            vy: 0,
          }));
          setGraphData({ nodes: initializedNodes, edges: raw.edges });
        }
      } catch (err) {
        console.error('Failed to fetch knowledge graph data:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchGraph();
  }, []);

  // Force-directed physics loop
  useEffect(() => {
    if (graphData.nodes.length === 0) return;

    let animId;
    const nodes = [...graphData.nodes];
    const edges = [...graphData.edges];

    const kRepulsion = 1500; // Repulsive force constant
    const kAttraction = 0.05;  // Attractive spring constant
    const friction = 0.85;

    const updatePhysics = () => {
      // 1. Repulsive forces between every pair of nodes
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[j].x - nodes[i].x;
          const dy = nodes[j].y - nodes[i].y;
          const distSq = dx * dx + dy * dy + 1;
          const dist = Math.sqrt(distSq);

          if (dist < 400) {
            const force = kRepulsion / distSq;
            const fx = (dx / dist) * force;
            const fy = (dy / dist) * force;

            nodes[i].vx -= fx;
            nodes[i].vy -= fy;
            nodes[j].vx += fx;
            nodes[j].vy += fy;
          }
        }
      }

      // 2. Attractive forces along links (springs)
      edges.forEach((edge) => {
        const sourceNode = nodes.find((n) => n.id === edge.source);
        const targetNode = nodes.find((n) => n.id === edge.target);

        if (sourceNode && targetNode) {
          const dx = targetNode.x - sourceNode.x;
          const dy = targetNode.y - sourceNode.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;

          // Ideal spring distance = 100
          const force = kAttraction * (dist - 100);
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;

          sourceNode.vx += fx;
          sourceNode.vy += fy;
          targetNode.vx -= fx;
          targetNode.vy -= fy;
        }
      });

      // 3. Gravity/center pull force to keep graph compact
      nodes.forEach((node) => {
        const dx = -node.x;
        const dy = -node.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        node.vx += (dx / dist) * 0.1;
        node.vy += (dy / dist) * 0.1;
      });

      // 4. Apply friction and update coordinates
      nodes.forEach((node) => {
        // If node is currently being dragged, don't update physics coords
        if (selectedNode && selectedNode.id === node.id) return;

        node.vx *= friction;
        node.vy *= friction;
        node.x += node.vx;
        node.y += node.vy;
      });

      drawGraph();
      animId = requestAnimationFrame(updatePhysics);
    };

    const drawGraph = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      ctx.save();
      // Center canvas coordinates and apply pan/zoom transforms
      ctx.translate(canvas.width / 2 + pan.x, canvas.height / 2 + pan.y);
      ctx.scale(zoom, zoom);

      // Draw Edges (spring links)
      edges.forEach((edge) => {
        const sourceNode = nodes.find((n) => n.id === edge.source);
        const targetNode = nodes.find((n) => n.id === edge.target);

        if (sourceNode && targetNode) {
          ctx.beginPath();
          ctx.moveTo(sourceNode.x, sourceNode.y);
          ctx.lineTo(targetNode.x, targetNode.y);
          ctx.strokeStyle = 'rgba(165, 180, 252, 0.45)'; // semi-transparent indigo
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }
      });

      // Draw Nodes
      nodes.forEach((node) => {
        const isHovered = hoveredNode && hoveredNode.id === node.id;
        const size = node.val * 5 + 6;

        ctx.beginPath();
        ctx.arc(node.x, node.y, size, 0, 2 * Math.PI);

        // Subject color mapping
        let color = '#6366f1'; // Indigo
        if (node.subject.toLowerCase() === 'physics') color = '#ef4444'; // Red
        else if (node.subject.toLowerCase() === 'chemistry') color = '#eab308'; // Yellow
        else if (node.subject.toLowerCase() === 'mathematics') color = '#10b981'; // Green

        ctx.fillStyle = color;
        ctx.shadowColor = color;
        ctx.shadowBlur = isHovered ? 15 : 4;
        ctx.fill();
        ctx.shadowBlur = 0;

        // Label
        ctx.fillStyle = isHovered ? '#1e1b4b' : '#64748b';
        ctx.font = isHovered ? 'bold 10px Inter' : '9px Inter';
        ctx.textAlign = 'center';
        ctx.fillText(node.label, node.x, node.y - size - 4);
      });

      ctx.restore();
    };

    updatePhysics();
    return () => cancelAnimationFrame(animId);
  }, [graphData, pan, zoom, hoveredNode, selectedNode]);

  // Mouse interaction handlers
  const handleMouseMove = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left - canvas.width / 2 - pan.x;
    const mouseY = e.clientY - rect.top - canvas.height / 2 - pan.y;

    // Apply zoom divisor to coordinates
    const scaleX = mouseX / zoom;
    const scaleY = mouseY / zoom;

    // Find if hover a node
    const found = graphData.nodes.find((node) => {
      const dx = node.x - scaleX;
      const dy = node.y - scaleY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const size = node.val * 5 + 6;
      return dist <= size + 10;
    });

    setHoveredNode(found || null);

    if (selectedNode) {
      // Dragging selected node
      setSelectedNode((prev) => {
        prev.x = scaleX;
        prev.y = scaleY;
        return prev;
      });
    }
  };

  const handleMouseDown = () => {
    if (hoveredNode) {
      setSelectedNode(hoveredNode);
    }
  };

  const handleMouseUp = () => {
    setSelectedNode(null);
  };

  return (
    <div className="flex-1 flex flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm overflow-hidden min-h-[500px]">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-wider">Knowledge Web</h2>
          <p className="text-xs text-slate-400">Interconnected notes network based on bidirectional wiki-links</p>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 text-xs font-semibold">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 bg-rose-500 rounded-full"></span>
            <span>Physics</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 bg-yellow-500 rounded-full"></span>
            <span>Chemistry</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full"></span>
            <span>Mathematics</span>
          </div>
        </div>
      </div>

      <div className="flex-grow relative bg-slate-50 dark:bg-slate-950/20 border border-slate-100 dark:border-slate-800 rounded-2xl overflow-hidden cursor-crosshair">
        {isLoading ? (
          <div className="absolute inset-0 flex items-center justify-center text-slate-400 font-bold">
            Resolving knowledge graph...
          </div>
        ) : (
          <canvas
            ref={canvasRef}
            width={800}
            height={500}
            onMouseMove={handleMouseMove}
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
            className="w-full h-full block"
          />
        )}

        {/* Controls */}
        <div className="absolute bottom-4 right-4 flex gap-2">
          <button
            onClick={() => setZoom((z) => Math.min(2.5, z + 0.15))}
            className="w-8 h-8 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center font-bold text-lg hover:bg-slate-50 transition-all shadow-sm"
          >
            +
          </button>
          <button
            onClick={() => setZoom((z) => Math.max(0.5, z - 0.15))}
            className="w-8 h-8 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center font-bold text-lg hover:bg-slate-50 transition-all shadow-sm"
          >
            -
          </button>
        </div>
      </div>
    </div>
  );
};

export default KnowledgeGraphView;
