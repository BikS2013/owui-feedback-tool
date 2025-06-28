import { useState, useRef, useEffect } from 'react';
import './Tooltip.css';

interface TooltipProps {
  text: string;
  children: React.ReactElement;
  position?: 'top' | 'bottom' | 'left' | 'right';
  delay?: number;
}

export function Tooltip({ text, children, position = 'bottom', delay = 500 }: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const showTooltip = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      setIsVisible(true);
    }, delay);
  };

  const hideTooltip = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsVisible(false);
  };

  useEffect(() => {
    if (isVisible && triggerRef.current && tooltipRef.current) {
      const triggerRect = triggerRef.current.getBoundingClientRect();
      const tooltipRect = tooltipRef.current.getBoundingClientRect();
      const modalElement = triggerRef.current.closest('.history-list-dropdown, .filter-panel');
      
      if (modalElement) {
        const modalRect = modalElement.getBoundingClientRect();
        let top = 0;
        let left = 0;

        switch (position) {
          case 'top':
            top = triggerRect.top - modalRect.top - tooltipRect.height - 8;
            left = triggerRect.left - modalRect.left + (triggerRect.width - tooltipRect.width) / 2;
            break;
          case 'bottom':
            top = triggerRect.bottom - modalRect.top + 8;
            left = triggerRect.left - modalRect.left + (triggerRect.width - tooltipRect.width) / 2;
            break;
          case 'left':
            top = triggerRect.top - modalRect.top + (triggerRect.height - tooltipRect.height) / 2;
            left = triggerRect.left - modalRect.left - tooltipRect.width - 8;
            break;
          case 'right':
            top = triggerRect.top - modalRect.top + (triggerRect.height - tooltipRect.height) / 2;
            left = triggerRect.right - modalRect.left + 8;
            break;
        }

        // Keep tooltip within modal bounds
        const padding = 8;
        left = Math.max(padding, Math.min(left, modalRect.width - tooltipRect.width - padding));
        top = Math.max(padding, Math.min(top, modalRect.height - tooltipRect.height - padding));

        setTooltipPosition({ top, left });
      }
    }
  }, [isVisible, position]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (
    <>
      <div
        ref={triggerRef}
        onMouseEnter={showTooltip}
        onMouseLeave={hideTooltip}
        style={{ display: 'inline-flex' }}
      >
        {children}
      </div>
      {isVisible && (
        <div
          ref={tooltipRef}
          className={`custom-tooltip ${position}`}
          style={{
            top: `${tooltipPosition.top}px`,
            left: `${tooltipPosition.left}px`,
          }}
        >
          {text}
        </div>
      )}
    </>
  );
}