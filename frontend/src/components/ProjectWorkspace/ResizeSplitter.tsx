import React, { useCallback, useEffect, useRef, useState } from 'react';

interface ResizeSplitterProps {
  onRatioChange: (pixelValue: number) => void;
  initialRatio?: number;
  minRatio?: number;
  maxRatio?: number;
}

const STORAGE_KEY = 'apiman-response-height';

export const ResizeSplitter: React.FC<ResizeSplitterProps> = ({
  onRatioChange,
  initialRatio = 300,
  minRatio = 100,
  maxRatio = 800,
}) => {
  const [height, setHeight] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? parseInt(saved, 10) : initialRatio;
  });
  const [isDragging, setIsDragging] = useState(false);
  const startPosRef = useRef(0);
  const startHeightRef = useRef(0);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
    startPosRef.current = e.clientY;
    startHeightRef.current = height;
  }, [height]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;

    const delta = startPosRef.current - e.clientY;
    let newHeight = startHeightRef.current + delta;
    newHeight = Math.min(maxRatio, Math.max(minRatio, newHeight));

    setHeight(newHeight);
    onRatioChange(newHeight);
  }, [isDragging, maxRatio, minRatio, onRatioChange]);

  const handleMouseUp = useCallback(() => {
    if (isDragging) {
      setIsDragging(false);
      localStorage.setItem(STORAGE_KEY, height.toString());
    }
  }, [isDragging, height]);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'row-resize';
      document.body.style.userSelect = 'none';
    } else {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  return (
    <div
      className={`resize-splitter ${isDragging ? 'dragging' : ''}`}
      style={{
        position: 'relative',
        height: '6px',
        width: '100%',
        cursor: 'row-resize',
        flexShrink: 0,
        zIndex: 10,
      }}
      onMouseDown={handleMouseDown}
    />
  );
};