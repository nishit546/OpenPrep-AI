import React, { useState, useRef } from 'react';

const FreehandPenOverlay = ({ active, color = '#FF0000', existingPaths = [], onAddPath }) => {
  const [currentPath, setCurrentPath] = useState([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const svgRef = useRef(null);

  const getNormalizedPoint = (e) => {
    if (!svgRef.current) return null;
    const rect = svgRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    return { x: Math.max(0, Math.min(1, x)), y: Math.max(0, Math.min(1, y)) };
  };

  const handlePointerDown = (e) => {
    if (!active) return;
    const pt = getNormalizedPoint(e);
    if (!pt) return;
    setIsDrawing(true);
    setCurrentPath([pt]);
  };

  const handlePointerMove = (e) => {
    if (!active || !isDrawing) return;
    const pt = getNormalizedPoint(e);
    if (!pt) return;
    setCurrentPath((prev) => [...prev, pt]);
  };

  const handlePointerUp = () => {
    if (!active || !isDrawing) return;
    setIsDrawing(false);
    if (currentPath.length > 1) {
      onAddPath && onAddPath({ points: currentPath, color });
    }
    setCurrentPath([]);
  };

  const renderSvgPoints = (points) => {
    return points.map((p) => `${p.x * 100},${p.y * 100}`).join(' ');
  };

  return (
    <svg
      ref={svgRef}
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      className="freehand-pen-overlay"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: active ? 'all' : 'none',
        zIndex: active ? 25 : 5,
        cursor: active ? 'crosshair' : 'default',
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      {/* Existing saved pen paths */}
      {existingPaths.map((pathItem, idx) => (
        <polyline
          key={idx}
          fill="none"
          stroke={pathItem.color || color}
          strokeWidth="0.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={renderSvgPoints(pathItem.points || [])}
        />
      ))}

      {/* Currently drawing active stroke */}
      {currentPath.length > 1 && (
        <polyline
          fill="none"
          stroke={color}
          strokeWidth="0.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={renderSvgPoints(currentPath)}
        />
      )}
    </svg>
  );
};

export default FreehandPenOverlay;
