import React, { useCallback, useEffect, useRef, useState } from 'react';

interface ResizeHandleProps {
  sidebarWidth: number;
  onResize: (deltaX: number) => void;
  onResizeEnd: () => void;
}

export const ResizeHandle: React.FC<ResizeHandleProps> = ({ sidebarWidth, onResize, onResizeEnd }) => {
  const [isDragging, setIsDragging] = useState(false);
  const startXRef = useRef(0);
  const currentWidthRef = useRef(sidebarWidth);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    startXRef.current = e.clientX;
    currentWidthRef.current = sidebarWidth;
  }, [sidebarWidth]);

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - startXRef.current;
      startXRef.current = e.clientX;
      currentWidthRef.current = Math.min(500, Math.max(200, currentWidthRef.current + deltaX));
      onResize(deltaX);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      onResizeEnd();
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, onResize, onResizeEnd]);

  return (
    <div
      className={`resize-handle ${isDragging ? 'dragging' : ''}`}
      onMouseDown={handleMouseDown}
    >
      <div className="resize-handle-line" />
    </div>
  );
};