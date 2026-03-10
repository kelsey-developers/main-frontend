'use client';

import React, { useState, useEffect } from 'react';

interface TooltipProps {
  /** Tooltip content text */
  content: string;
  /** Child element to attach tooltip to */
  children: React.ReactElement;
  /** Custom positioning offset */
  offset?: { x?: number; y?: number };
  /** Maximum width for tooltip */
  maxWidth?: number;
}

/**
 * Custom Tooltip Component
 * Displays a tooltip on hover with custom styling
 */
const Tooltip: React.FC<TooltipProps> = ({
  content,
  children,
  offset = { x: 10, y: -40 },
  maxWidth = 300,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isVisible) {
        setPosition({ x: e.clientX, y: e.clientY });
      }
    };

    if (isVisible) {
      window.addEventListener('mousemove', handleMouseMove);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [isVisible]);

  const handleMouseEnter = (e: React.MouseEvent) => {
    if (content) {
      setPosition({ x: e.clientX, y: e.clientY });
      setIsVisible(true);
    }
  };

  const handleMouseLeave = () => {
    setIsVisible(false);
  };

  const childWithProps = React.cloneElement(children, {
    onMouseEnter: handleMouseEnter,
    onMouseLeave: handleMouseLeave,
  } as React.HTMLAttributes<HTMLElement>);

  if (!content) {
    return <>{children}</>;
  }

  return (
    <>
      {childWithProps}
      {isVisible && (
        <div
          className="fixed z-50 px-3 py-2 text-sm text-white rounded-lg shadow-lg pointer-events-none"
          style={{
            left: position.x + (offset.x ?? 10),
            top: position.y + (offset.y ?? -40),
            backgroundColor: '#558B8B',
            fontFamily: 'var(--font-poppins), Poppins, sans-serif',
            maxWidth: `${maxWidth}px`,
            wordWrap: 'break-word',
            whiteSpace: 'pre-line',
          }}
        >
          {content}
          <div
            className="absolute top-full left-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent"
            style={{ borderTopColor: '#558B8B' }}
          />
        </div>
      )}
    </>
  );
};

export default Tooltip;
