import { useState, useRef, useCallback, useEffect } from 'react';

interface ResizableOptions {
  defaultWidth?: number;
  defaultHeight?: number;
  minWidth?: number;
  minHeight?: number;
  storageKey?: string;
}

interface ModalSize {
  width: number;
  height: number;
}

export const useResizable = (options: ResizableOptions = {}) => {
  const {
    defaultWidth = 600,
    defaultHeight = 600,
    minWidth = 400,
    minHeight = 400,
    storageKey
  } = options;

  // Load saved size from localStorage or use defaults
  const loadSavedSize = (): ModalSize => {
    if (storageKey) {
      try {
        const saved = localStorage.getItem(storageKey);
        if (saved) {
          const parsedSize = JSON.parse(saved) as ModalSize;
          // Validate against current viewport
          const maxWidth = window.innerWidth * 0.9;
          const maxHeight = window.innerHeight * 0.9;
          
          return {
            width: Math.min(Math.max(parsedSize.width, minWidth), maxWidth),
            height: Math.min(Math.max(parsedSize.height, minHeight), maxHeight)
          };
        }
      } catch (error) {
        console.error('Error loading saved modal size:', error);
      }
    }
    return { width: defaultWidth, height: defaultHeight };
  };

  const [modalSize, setModalSize] = useState<ModalSize>(loadSavedSize);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeDirection, setResizeDirection] = useState<string>('');
  
  const modalRef = useRef<HTMLDivElement>(null);
  const startSizeRef = useRef({ width: 0, height: 0 });
  const startPosRef = useRef({ x: 0, y: 0 });
  const wasResizingRef = useRef(false);

  // Save size to localStorage when it changes
  useEffect(() => {
    if (storageKey && !isResizing) {
      try {
        localStorage.setItem(storageKey, JSON.stringify(modalSize));
      } catch (error) {
        console.error('Error saving modal size:', error);
      }
    }
  }, [modalSize, isResizing, storageKey]);

  // Handle window resize to ensure modal fits
  useEffect(() => {
    const handleWindowResize = () => {
      const maxWidth = window.innerWidth * 0.9;
      const maxHeight = window.innerHeight * 0.9;
      
      setModalSize(prevSize => ({
        width: Math.min(prevSize.width, maxWidth),
        height: Math.min(prevSize.height, maxHeight)
      }));
    };

    window.addEventListener('resize', handleWindowResize);
    return () => window.removeEventListener('resize', handleWindowResize);
  }, []);

  // Handle resize mouse move
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing || !modalRef.current) return;

      const deltaX = e.clientX - startPosRef.current.x;
      const deltaY = e.clientY - startPosRef.current.y;
      let newWidth = startSizeRef.current.width;
      let newHeight = startSizeRef.current.height;

      if (resizeDirection.includes('right')) {
        newWidth = Math.max(minWidth, startSizeRef.current.width + deltaX);
      }
      if (resizeDirection.includes('left')) {
        newWidth = Math.max(minWidth, startSizeRef.current.width - deltaX);
      }
      if (resizeDirection.includes('bottom')) {
        newHeight = Math.max(minHeight, startSizeRef.current.height + deltaY);
      }
      if (resizeDirection.includes('top')) {
        newHeight = Math.max(minHeight, startSizeRef.current.height - deltaY);
      }

      // Ensure modal doesn't exceed viewport
      const maxWidth = window.innerWidth * 0.9;
      const maxHeight = window.innerHeight * 0.9;
      newWidth = Math.min(newWidth, maxWidth);
      newHeight = Math.min(newHeight, maxHeight);

      setModalSize({ width: newWidth, height: newHeight });
    };

    const handleMouseUp = (e: MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      wasResizingRef.current = true;
      setIsResizing(false);
      setResizeDirection('');
      
      // Reset the flag after a short delay
      setTimeout(() => {
        wasResizingRef.current = false;
      }, 100);
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isResizing, resizeDirection, minWidth, minHeight]);

  const handleResizeStart = useCallback((e: React.MouseEvent, direction: string) => {
    e.preventDefault();
    setIsResizing(true);
    setResizeDirection(direction);
    startPosRef.current = { x: e.clientX, y: e.clientY };
    startSizeRef.current = { ...modalSize };
  }, [modalSize]);

  const handleOverlayClick = useCallback((e: React.MouseEvent, onClose: () => void) => {
    // Only close if clicking directly on overlay, not when finishing a resize
    if (e.target === e.currentTarget && !isResizing && !wasResizingRef.current) {
      onClose();
    }
  }, [isResizing]);

  return {
    modalRef,
    modalSize,
    isResizing,
    handleResizeStart,
    handleOverlayClick
  };
};