import React, { useEffect, useRef } from 'react';

interface KeyboardNavigableProps {
  children: React.ReactNode;
  onNavigate?: (direction: 'up' | 'down' | 'left' | 'right') => void;
  onSelect?: () => void;
  onEscape?: () => void;
}

export default function KeyboardNavigable({
  children,
  onNavigate,
  onSelect,
  onEscape,
}: KeyboardNavigableProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault();
          onNavigate?.('up');
          break;
        case 'ArrowDown':
          e.preventDefault();
          onNavigate?.('down');
          break;
        case 'ArrowLeft':
          e.preventDefault();
          onNavigate?.('left');
          break;
        case 'ArrowRight':
          e.preventDefault();
          onNavigate?.('right');
          break;
        case 'Enter':
        case ' ':
          e.preventDefault();
          onSelect?.();
          break;
        case 'Escape':
          e.preventDefault();
          onEscape?.();
          break;
      }
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener('keydown', handleKeyDown);
      return () => container.removeEventListener('keydown', handleKeyDown);
    }
  }, [onNavigate, onSelect, onEscape]);

  return (
    <div ref={containerRef} tabIndex={0} className="outline-none">
      {children}
    </div>
  );
}
