import React, { useCallback, useEffect, useState } from 'react';

interface ResizeSplitterProps {
  height: number; // 当前高度由父组件控制
  onHeightChange: (height: number) => void;
  minHeight?: number;
  maxHeight?: number;
}

export const ResizeSplitter: React.FC<ResizeSplitterProps> = ({
  height,
  onHeightChange,
  minHeight = 100,
  maxHeight = 800,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const startPosRef = React.useRef(0);
  const startHeightRef = React.useRef(0);

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
    newHeight = Math.min(maxHeight, Math.max(minHeight, newHeight));

    onHeightChange(newHeight);
  }, [isDragging, maxHeight, minHeight, onHeightChange]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

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
