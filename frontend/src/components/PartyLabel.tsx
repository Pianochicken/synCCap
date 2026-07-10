import React, { useState, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Copy, Check } from 'lucide-react';

/**
 * PartyLabel
 *
 * Displays only the display-name portion of a Canton party ID (everything
 * before `::`).  On hover a tooltip rendered via a React portal (so it is
 * never clipped by overflow:hidden/auto containers) shows the full ID.
 * Clicking the label copies the full ID to the clipboard.
 */
export const PartyLabel: React.FC<{ partyId: string }> = ({ partyId }) => {
  const [copied, setCopied] = useState(false);
  const [tooltipStyle, setTooltipStyle] = useState<React.CSSProperties | null>(null);
  const spanRef = useRef<HTMLSpanElement>(null);

  const displayName = partyId.split('::')[0];

  const handleCopy = () => {
    navigator.clipboard.writeText(partyId).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  const handleMouseEnter = useCallback(() => {
    if (!spanRef.current) return;
    const rect = spanRef.current.getBoundingClientRect();
    // Appear directly above the element; clamp to viewport edges
    const left = Math.max(8, Math.min(rect.left, window.innerWidth - 400));
    setTooltipStyle({
      position: 'fixed',
      left,
      top: rect.top - 6,          // 6px gap above the element
      transform: 'translateY(-100%)',
      zIndex: 9999,
    });
  }, []);

  const handleMouseLeave = useCallback(() => {
    setTooltipStyle(null);
  }, []);

  return (
    <>
      <span
        ref={spanRef}
        className="group inline-flex items-center gap-1 cursor-pointer select-none font-mono font-medium hover:text-blue-500 transition-colors"
        style={{ color: 'var(--text-primary)' }}
        onClick={handleCopy}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <span>
          {displayName}
        </span>
        <span
          className="transition-opacity opacity-50 group-hover:opacity-100 group-hover:text-blue-500"
          style={{ color: copied ? '#34d399' : 'inherit' }}
        >
          {copied
            ? <Check className="w-3 h-3" />
            : <Copy  className="w-3 h-3" />}
        </span>
      </span>

      {tooltipStyle && createPortal(
        <span
          style={{
            ...tooltipStyle,
            background:    'var(--bg-surface)',
            border:        '1px solid var(--border-strong)',
            color:         'var(--text-primary)',
            boxShadow:     '0 4px 16px rgba(0,0,0,0.18)',
            borderRadius:  '6px',
            padding:       '3px 8px',
            fontSize:      '0.65rem',
            fontFamily:    'JetBrains Mono, monospace',
            whiteSpace:    'nowrap',
            pointerEvents: 'none',
            userSelect:    'none',
          }}
        >
          {partyId}
        </span>,
        document.body,
      )}
    </>
  );
};
