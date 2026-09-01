import React, { useRef, useEffect, useState, useCallback } from 'react';

/**
 * Transparent Vector Annotation Canvas Component
 * Renders collaborative pen drawings, laser pointer trails, cursor badges,
 * and handles export to Cornell Notes.
 */
export const AnnotationOverlay = ({ socket, roomId, user, videoRef, onExportToNotes }) => {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [tool, setTool] = useState('pen'); // 'pen' | 'laser'
  const [history, setHistory] = useState([]);
  const [redoStack, setRedoStack] = useState([]);
  const remoteCursors = useRef(new Map());

  // Redraw canvas from stroke history stack
  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    history.forEach((stroke) => {
      if (stroke.points.length < 2) return;
      ctx.beginPath();
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.width;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.moveTo(stroke.points[0].x, stroke.points[0].y);

      stroke.points.forEach((pt) => ctx.lineTo(pt.x, pt.y));
      ctx.stroke();
    });
  }, [history]);

  useEffect(() => {
    redrawCanvas();
  }, [history, redrawCanvas]);

  // Sync window size with video stream overlay size
  useEffect(() => {
    const handleResize = () => {
      if (videoRef?.current && canvasRef.current) {
        canvasRef.current.width = videoRef.current.clientWidth;
        canvasRef.current.height = videoRef.current.clientHeight;
        redrawCanvas();
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [videoRef, redrawCanvas]);

  // Handle Incoming Stroke & Cursor Events via WebSocket
  useEffect(() => {
    if (!socket) return;

    socket.on('annotation-stroke', (data) => {
      setHistory((prev) => [...prev, data.stroke]);
    });

    socket.on('annotation-cursor', (data) => {
      remoteCursors.current.set(data.userId, data);
    });

    return () => {
      socket.off('annotation-stroke');
      socket.off('annotation-cursor');
    };
  }, [socket]);

  const handleMouseDown = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setIsDrawing(true);
    const newStroke = {
      id: Date.now(),
      userId: user.id,
      color: user.color || '#FF0055',
      width: tool === 'laser' ? 6 : 3,
      points: [{ x, y }],
    };
    setHistory((prev) => [...prev, newStroke]);
    setRedoStack([]);
  };

  const handleMouseMove = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Broadcast cursor position
    socket?.emit('annotation-cursor', {
      roomId,
      userId: user.id,
      userName: user.name,
      color: user.color || '#FF0055',
      x,
      y,
    });

    if (!isDrawing) return;

    setHistory((prev) => {
      const updated = [...prev];
      const currentStroke = updated[updated.length - 1];
      if (currentStroke) {
        currentStroke.points.push({ x, y });
      }
      return updated;
    });
  };

  const handleMouseUp = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    const lastStroke = history[history.length - 1];
    if (lastStroke) {
      socket?.emit('annotation-stroke', { roomId, stroke: lastStroke });
    }
  };

  const clearCanvas = () => {
    setHistory([]);
    setRedoStack([]);
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  const undo = () => {
    if (history.length === 0) return;
    const last = history[history.length - 1];
    setRedoStack((prev) => [...prev, last]);
    setHistory((prev) => prev.slice(0, -1));
  };

  const exportFrameToNotes = () => {
    if (!videoRef?.current || !canvasRef.current) return;
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = canvasRef.current.width;
    exportCanvas.height = canvasRef.current.height;
    const ctx = exportCanvas.getContext('2d');

    // Composite video frame + annotations
    ctx.drawImage(videoRef.current, 0, 0, exportCanvas.width, exportCanvas.height);
    ctx.drawImage(canvasRef.current, 0, 0);

    const dataUrl = exportCanvas.toDataURL('image/png');
    if (onExportToNotes) {
      onExportToNotes(dataUrl);
    }
  };

  return (
    <div className="relative w-full h-full">
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        className="absolute inset-0 z-10 cursor-crosshair"
      />
      <div className="absolute top-4 right-4 z-20 flex space-x-2 bg-slate-900/80 p-2 rounded-lg">
        <button
          onClick={() => setTool('pen')}
          className={`px-3 py-1 rounded text-sm ${tool === 'pen' ? 'bg-indigo-600 text-white' : 'text-slate-300'}`}
        >
          Pen
        </button>
        <button
          onClick={() => setTool('laser')}
          className={`px-3 py-1 rounded text-sm ${tool === 'laser' ? 'bg-indigo-600 text-white' : 'text-slate-300'}`}
        >
          Laser
        </button>
        <button onClick={undo} className="px-3 py-1 bg-slate-700 text-white rounded text-sm">
          Undo
        </button>
        <button onClick={clearCanvas} className="px-3 py-1 bg-rose-600 text-white rounded text-sm">
          Clear
        </button>
        <button onClick={exportFrameToNotes} className="px-3 py-1 bg-emerald-600 text-white rounded text-sm">
          Export to Cornell Notes
        </button>
      </div>
    </div>
  );
};
