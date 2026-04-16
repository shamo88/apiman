import React, { useEffect, useRef, useCallback, useState } from 'react';
import { createPortal } from 'react-dom';
import { Menu, MenuProps } from 'antd';
import './ContextMenu.css';

export interface ContextMenuPosition {
  x: number;
  y: number;
}

export interface ContextMenuProps {
  visible: boolean;
  position: ContextMenuPosition;
  items: MenuProps['items'];
  onClose: () => void;
}

// Global menu manager to track active context menus
let activeMenuId: string | null = null;
let activeMenuItems: MenuProps['items'] = [];
let activeMenuPosition: ContextMenuPosition = { x: 0, y: 0 };
let activeMenuCloseHandler: (() => void) | null = null;
let menuIdCounter = 0;

export const ContextMenu: React.FC<ContextMenuProps> = ({
  visible,
  position,
  items,
  onClose,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const [adjustedPosition, setAdjustedPosition] = useState(position);

  // Adjust position to keep menu within viewport
  useEffect(() => {
    if (!visible || !menuRef.current) return;

    const menu = menuRef.current;
    const rect = menu.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let x = position.x;
    let y = position.y;

    // Adjust horizontal position
    if (x + rect.width > viewportWidth) {
      x = viewportWidth - rect.width - 8;
    }
    if (x < 8) {
      x = 8;
    }

    // Adjust vertical position
    if (y + rect.height > viewportHeight) {
      y = viewportHeight - rect.height - 8;
    }
    if (y < 8) {
      y = 8;
    }

    setAdjustedPosition({ x, y });
  }, [visible, position]);

  // Close on click outside
  useEffect(() => {
    if (!visible) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    // Use setTimeout to prevent immediate trigger on the same click that opened the menu
    const timer = setTimeout(() => {
      document.addEventListener('click', handleClickOutside);
    }, 0);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('click', handleClickOutside);
    };
  }, [visible, onClose]);

  // Close on Escape key
  useEffect(() => {
    if (!visible) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [visible, onClose]);

  // Close on scroll
  useEffect(() => {
    if (!visible) return;

    const handleScroll = () => {
      onClose();
    };

    document.addEventListener('scroll', handleScroll, true);
    return () => document.removeEventListener('scroll', handleScroll, true);
  }, [visible, onClose]);

  // Prevent context menu from appearing on the menu itself
  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
  }, []);

  if (!visible) return null;

  return createPortal(
    <div
      ref={menuRef}
      className="context-menu"
      style={{
        left: adjustedPosition.x,
        top: adjustedPosition.y,
      }}
      onContextMenu={handleContextMenu}
    >
      <Menu
        mode="vertical"
        items={items}
        onClick={({ key }) => {
          // Menu item clicked - let the click handler work
          // Small delay to ensure menu closes after action
          setTimeout(onClose, 100);
        }}
      />
    </div>,
    document.body
  );
};

// Hook for managing context menu state
export interface UseContextMenuOptions {
  items: MenuProps['items'];
  onOpenChange?: (visible: boolean) => void;
}

export interface UseContextMenuReturn {
  contextMenuProps: {
    onContextMenu: (e: React.MouseEvent) => void;
  };
  contextMenu: React.ReactElement;
}

export const useContextMenu = (
  options: UseContextMenuOptions
): UseContextMenuReturn => {
  const menuIdRef = useRef<string>(`cm-${++menuIdCounter}`);
  const [visible, setVisible] = useState(false);
  const [position, setPosition] = useState<ContextMenuPosition>({ x: 0, y: 0 });

  const handleClose = useCallback(() => {
    if (activeMenuId === menuIdRef.current) {
      activeMenuId = null;
      activeMenuCloseHandler = null;
      activeMenuItems = [];
    }
    setVisible(false);
    options.onOpenChange?.(false);
  }, [options.onOpenChange]);

  const onContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // If there's an existing menu, close it first
    if (activeMenuId !== null && activeMenuId !== menuIdRef.current) {
      if (activeMenuCloseHandler) {
        activeMenuCloseHandler();
      }
    }

    setPosition({ x: e.clientX, y: e.clientY });
    activeMenuId = menuIdRef.current;
    activeMenuItems = options.items;
    activeMenuPosition = { x: e.clientX, y: e.clientY };
    activeMenuCloseHandler = handleClose;
    setVisible(true);
    options.onOpenChange?.(true);
  }, [options.items, handleClose, options.onOpenChange]);

  const contextMenu = (
    <ContextMenu
      visible={visible}
      position={position}
      items={options.items}
      onClose={handleClose}
    />
  );

  return {
    contextMenuProps: { onContextMenu },
    contextMenu,
  };
};
