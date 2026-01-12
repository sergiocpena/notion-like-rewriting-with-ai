import { useEffect, useState, useCallback, useRef } from 'react';
import type { RewriteAction } from '@/services/ai';

interface SelectionMenuProps {
  containerRef: React.RefObject<HTMLElement | null>;
  onAction: (action: RewriteAction) => void;
  isLoading?: boolean;
}

interface MenuPosition {
  top: number;
  left: number;
  showAbove: boolean;
}

export function SelectionMenu({ containerRef, onAction, isLoading = false }: SelectionMenuProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState<MenuPosition>({ top: 0, left: 0, showAbove: true });
  const [selectedText, setSelectedText] = useState('');
  const [showToneSubmenu, setShowToneSubmenu] = useState(false);
  const toneHoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const showTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const clearShowTimeout = useCallback(() => {
    if (showTimeoutRef.current) {
      clearTimeout(showTimeoutRef.current);
      showTimeoutRef.current = null;
    }
  }, []);

  const updateMenuPosition = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || !selection.toString().trim()) {
      clearShowTimeout();
      setIsVisible(false);
      setSelectedText('');
      return;
    }

    // Check if selection is within our container
    if (containerRef.current) {
      const range = selection.getRangeAt(0);
      const commonAncestor = range.commonAncestorContainer;
      const isInContainer = containerRef.current.contains(
        commonAncestor.nodeType === Node.TEXT_NODE
          ? commonAncestor.parentNode
          : commonAncestor
      );

      if (!isInContainer) {
        clearShowTimeout();
        setIsVisible(false);
        setSelectedText('');
        return;
      }
    }

    const text = selection.toString().trim();
    if (text.length === 0) {
      clearShowTimeout();
      setIsVisible(false);
      setSelectedText('');
      return;
    }

    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();

    // Position menu above or below the selection, centered
    const menuWidth = 240; // Approximate menu width
    const menuHeight = 200; // Approximate menu height
    const spacing = 8; // Space between selection and menu

    // Check if there's enough space above the selection
    const spaceAbove = rect.top;
    const spaceBelow = window.innerHeight - rect.bottom;
    const showAbove = spaceAbove >= menuHeight + spacing || spaceAbove > spaceBelow;

    let top: number;
    if (showAbove) {
      top = rect.top + window.scrollY - menuHeight - spacing;
    } else {
      top = rect.bottom + window.scrollY + spacing;
    }

    const left = rect.left + window.scrollX + rect.width / 2 - menuWidth / 2;

    // Keep menu within viewport bounds
    const adjustedLeft = Math.max(10, Math.min(left, window.innerWidth - menuWidth - 10));

    setPosition({ top, left: adjustedLeft, showAbove });
    setSelectedText(text);

    // Only start the delay if menu isn't already visible
    if (!isVisible && !showTimeoutRef.current) {
      showTimeoutRef.current = setTimeout(() => {
        setIsVisible(true);
        showTimeoutRef.current = null;
      }, 650); // 650ms delay
    }
  }, [containerRef, isVisible, clearShowTimeout]);

  useEffect(() => {
    const handleSelectionChange = () => {
      // Small delay to ensure selection is complete
      requestAnimationFrame(updateMenuPosition);
    };

    const handleMouseUp = () => {
      // Delay to allow selection to be finalized
      setTimeout(updateMenuPosition, 10);
    };

    document.addEventListener('selectionchange', handleSelectionChange);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [updateMenuPosition]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      clearShowTimeout();
      if (toneHoverTimeoutRef.current) clearTimeout(toneHoverTimeoutRef.current);
    };
  }, [clearShowTimeout]);

  // Hide menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        // Don't hide immediately on click, let selection change handle it
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleAction = (action: RewriteAction) => {
    onAction(action);
    setIsVisible(false);
    setShowToneSubmenu(false);
  };

  if (!isVisible || !selectedText) {
    return null;
  }

  return (
    <div
      ref={menuRef}
      className={`fixed z-50 animate-in fade-in-0 zoom-in-95 duration-100 ${
        position.showAbove ? 'slide-in-from-bottom-2' : 'slide-in-from-top-2'
      }`}
      style={{
        top: position.top,
        left: position.left,
      }}
    >
      <div className="bg-white rounded-lg shadow-[0_0_0_1px_rgba(15,15,15,0.05),0_3px_6px_rgba(15,15,15,0.1),0_9px_24px_rgba(15,15,15,0.2)] min-w-[220px]">
        {isLoading ? (
          <div className="px-4 py-3 flex items-center gap-3">
            <svg
              className="w-4 h-4 text-[rgba(55,53,47,0.65)] animate-spin"
              viewBox="0 0 24 24"
              fill="none"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="3"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            <span className="text-[14px] text-[rgb(55,53,47)]">Improving...</span>
          </div>
        ) : (
          <>
            {/* Rewrite with AI Section Header */}
            <div className="px-3 pt-2 pb-1">
              <span className="text-[11px] font-medium text-[rgba(55,53,47,0.5)] uppercase tracking-wide">
                Improve with AI
              </span>
            </div>

            {/* Menu Items */}
            <div className="py-1">
              {/* Add success metrics */}
              <button
                onClick={() => handleAction('add-metrics')}
                className="w-full flex items-center gap-3 px-3 py-[6px] hover:bg-[rgba(55,53,47,0.08)] transition-colors duration-75 text-left"
              >
                <svg
                  className="w-4 h-4 text-[rgba(55,53,47,0.65)] flex-shrink-0"
                  viewBox="0 0 16 16"
                  fill="none"
                >
                  {/* Chart/metrics icon */}
                  <path
                    d="M3 13V8M8 13V5M13 13V3"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <span className="text-[14px] text-[rgb(55,53,47)]">Add success metrics</span>
              </button>

              {/* Simplify language */}
              <button
                onClick={() => handleAction('simplify')}
                className="w-full flex items-center gap-3 px-3 py-[6px] hover:bg-[rgba(55,53,47,0.08)] transition-colors duration-75 text-left"
              >
                <svg
                  className="w-4 h-4 text-[rgba(55,53,47,0.65)] flex-shrink-0"
                  viewBox="0 0 16 16"
                  fill="none"
                >
                  {/* Simplify/compress icon */}
                  <path
                    d="M3 4h10M3 8h6M3 12h8"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <span className="text-[14px] text-[rgb(55,53,47)]">Simplify language</span>
              </button>

              {/* Make actionable */}
              <button
                onClick={() => handleAction('make-actionable')}
                className="w-full flex items-center gap-3 px-3 py-[6px] hover:bg-[rgba(55,53,47,0.08)] transition-colors duration-75 text-left"
              >
                <svg
                  className="w-4 h-4 text-[rgba(55,53,47,0.65)] flex-shrink-0"
                  viewBox="0 0 16 16"
                  fill="none"
                >
                  {/* Checklist/action icon */}
                  <path
                    d="M3 4l2 2 4-4M3 10l2 2 4-4M11 5h2M11 11h2"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <span className="text-[14px] text-[rgb(55,53,47)]">Make actionable</span>
              </button>

              {/* Adjust tone - with submenu */}
              <div
                className="relative"
                onMouseEnter={() => {
                  if (toneHoverTimeoutRef.current) clearTimeout(toneHoverTimeoutRef.current);
                  setShowToneSubmenu(true);
                }}
                onMouseLeave={() => {
                  toneHoverTimeoutRef.current = setTimeout(() => setShowToneSubmenu(false), 100);
                }}
              >
                <button
                  className={`w-full flex items-center gap-3 px-3 py-[6px] transition-colors duration-75 text-left ${showToneSubmenu ? 'bg-[rgba(55,53,47,0.08)]' : 'hover:bg-[rgba(55,53,47,0.08)]'}`}
                >
                  <svg
                    className="w-4 h-4 text-[rgba(55,53,47,0.65)] flex-shrink-0"
                    viewBox="0 0 16 16"
                    fill="none"
                  >
                    {/* Users/people icon for stakeholders */}
                    <circle cx="6" cy="5" r="2" stroke="currentColor" strokeWidth="1.5" />
                    <path d="M2 12.5c0-2 1.5-3.5 4-3.5s4 1.5 4 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    <circle cx="11.5" cy="6" r="1.5" stroke="currentColor" strokeWidth="1.5" />
                    <path d="M14 12.5c0-1.5-1-2.5-2.5-2.5-.5 0-1 .1-1.5.3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                  <span className="text-[14px] text-[rgb(55,53,47)]">Adjust tone for...</span>
                  <svg
                    className="w-3 h-3 text-[rgba(55,53,47,0.45)] ml-auto flex-shrink-0"
                    viewBox="0 0 16 16"
                    fill="none"
                  >
                    <path
                      d="M6 4l4 4-4 4"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>

                {/* Tone Submenu */}
                {showToneSubmenu && (
                  <div className="absolute left-full top-0 pl-1 z-50">
                    <div className="bg-white rounded-lg shadow-[0_0_0_1px_rgba(15,15,15,0.05),0_3px_6px_rgba(15,15,15,0.1),0_9px_24px_rgba(15,15,15,0.2)] min-w-[160px]">
                      <div className="py-1">
                        <button
                          onClick={() => handleAction('tone-executive')}
                          className="w-full flex items-center gap-3 px-3 py-[6px] hover:bg-[rgba(55,53,47,0.08)] transition-colors duration-75 text-left"
                        >
                          <span className="text-[14px] text-[rgb(55,53,47)]">Executives</span>
                        </button>
                        <button
                          onClick={() => handleAction('tone-engineering')}
                          className="w-full flex items-center gap-3 px-3 py-[6px] hover:bg-[rgba(55,53,47,0.08)] transition-colors duration-75 text-left"
                        >
                          <span className="text-[14px] text-[rgb(55,53,47)]">Engineering Team</span>
                        </button>
                        <button
                          onClick={() => handleAction('tone-stakeholder')}
                          className="w-full flex items-center gap-3 px-3 py-[6px] hover:bg-[rgba(55,53,47,0.08)] transition-colors duration-75 text-left"
                        >
                          <span className="text-[14px] text-[rgb(55,53,47)]">Stakeholders</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
