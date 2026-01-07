import {
  useRef,
  useEffect,
  useCallback,
  type KeyboardEvent,
  type FormEvent,
} from 'react';

interface BlockProps {
  id: string;
  content: string;
  placeholder?: string;
  isFirst?: boolean;
  onUpdate: (id: string, content: string) => void;
  onEnter: (id: string, remainingContent: string) => void;
  onDelete: (id: string) => void;
  onMergeWithPrevious: (id: string) => void;
  onFocusPrevious: (id: string) => void;
  onFocusNext: (id: string) => void;
  shouldFocus?: boolean;
  focusCursorPosition?: number;
}

export function Block({
  id,
  content,
  placeholder = "Type '/' for commands...",
  isFirst = false,
  onUpdate,
  onEnter,
  onDelete,
  onMergeWithPrevious,
  onFocusPrevious,
  onFocusNext,
  shouldFocus = false,
  focusCursorPosition = 0,
}: BlockProps) {
  const ref = useRef<HTMLDivElement>(null);

  // Set cursor position in contentEditable
  const setCursorPosition = useCallback((element: HTMLElement, position: number) => {
    const range = document.createRange();
    const selection = window.getSelection();

    if (!selection) return;

    // Handle empty content
    if (element.childNodes.length === 0) {
      element.appendChild(document.createTextNode(''));
    }

    const textNode = element.childNodes[0];
    if (textNode && textNode.nodeType === Node.TEXT_NODE) {
      const safePosition = Math.min(position, textNode.textContent?.length ?? 0);
      range.setStart(textNode, safePosition);
      range.collapse(true);
      selection.removeAllRanges();
      selection.addRange(range);
    }
  }, []);

  // Get current cursor position
  const getCursorPosition = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return 0;
    return selection.getRangeAt(0).startOffset;
  }, []);

  // Track the last known content to avoid unnecessary DOM updates
  const lastContentRef = useRef(content);
  const isInitialMount = useRef(true);

  // Set initial content on mount
  useEffect(() => {
    if (ref.current && isInitialMount.current) {
      ref.current.textContent = content;
      isInitialMount.current = false;
    }
  }, []);

  // Sync content to DOM only when it changes from outside (not from user input)
  useEffect(() => {
    if (ref.current && !isInitialMount.current && content !== lastContentRef.current) {
      // Only update DOM if content changed from outside (e.g., on merge)
      if (ref.current.textContent !== content) {
        ref.current.textContent = content;
      }
      lastContentRef.current = content;
    }
  }, [content]);

  // Focus management
  useEffect(() => {
    if (shouldFocus && ref.current) {
      ref.current.focus();
      setCursorPosition(ref.current, focusCursorPosition);
    }
  }, [shouldFocus, focusCursorPosition, setCursorPosition]);

  const handleInput = useCallback(
    (e: FormEvent<HTMLDivElement>) => {
      const newContent = (e.target as HTMLDivElement).textContent ?? '';
      lastContentRef.current = newContent;
      onUpdate(id, newContent);
    },
    [id, onUpdate]
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      const element = ref.current;
      if (!element) return;

      const cursorPos = getCursorPosition();
      const textContent = element.textContent ?? '';

      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        // Split content at cursor position
        const beforeCursor = textContent.slice(0, cursorPos);
        const afterCursor = textContent.slice(cursorPos);
        // Update current block with content before cursor
        onUpdate(id, beforeCursor);
        // Create new block with content after cursor
        onEnter(id, afterCursor);
      }

      if (e.key === 'Backspace') {
        // If at the beginning of the block
        if (cursorPos === 0 && textContent.length === 0) {
          e.preventDefault();
          onDelete(id);
        } else if (cursorPos === 0 && !isFirst) {
          e.preventDefault();
          onMergeWithPrevious(id);
        }
      }

      if (e.key === 'ArrowUp') {
        // If at the first line or cursor at start, move to previous block
        if (cursorPos === 0) {
          e.preventDefault();
          onFocusPrevious(id);
        }
      }

      if (e.key === 'ArrowDown') {
        // If at the last line or cursor at end, move to next block
        if (cursorPos === textContent.length) {
          e.preventDefault();
          onFocusNext(id);
        }
      }
    },
    [id, isFirst, onUpdate, onEnter, onDelete, onMergeWithPrevious, onFocusPrevious, onFocusNext, getCursorPosition]
  );

  const isEmpty = content.length === 0;

  return (
    <div className="relative group">
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        dir="ltr"
        className="outline-none py-[3px] min-h-[1.5em] leading-[1.5] text-[16px] text-[rgb(55,53,47)] whitespace-pre-wrap break-words caret-[rgb(55,53,47)] text-left"
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        data-placeholder={isEmpty ? placeholder : ''}
        style={{
          wordBreak: 'break-word',
        }}
      />
      {isEmpty && (
        <div
          className="absolute top-0 left-0 py-[3px] text-[16px] leading-[1.5] text-[rgba(55,53,47,0.5)] pointer-events-none select-none"
          aria-hidden="true"
        >
          {placeholder}
        </div>
      )}
    </div>
  );
}
