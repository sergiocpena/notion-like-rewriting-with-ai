import { useState, useCallback, useRef, useEffect, useImperativeHandle, forwardRef } from 'react';
import { SelectionMenu } from './SelectionMenu';
import { SkeletonOverlay } from './SkeletonOverlay';
import { useBlocks } from '@/hooks/useBlocks';
import { rewriteText, type RewriteAction } from '@/services/ai';
import type { Block as BlockType } from '@/types/editor';

interface SelectionInfo {
  text: string;
  rects: DOMRect[];
  range: Range;
}

const INITIAL_CONTENT: BlockType[] = [
  {
    id: 'block-1',
    type: 'text',
    content: 'During the review of structural drawings for Building A, we identified a conflict between the steel beam layout on Level 3 and the mechanical ductwork routing shown in the MEP drawings. The W12x26 beam at gridline C-4 appears to intersect with the 24-inch supply duct serving the east wing.',
  },
  {
    id: 'block-2',
    type: 'text',
    content: 'Please clarify the intended elevation of the bottom of steel at this location and confirm whether the ductwork should be rerouted below the beam or if a penetration through the web is acceptable. The current drawings show the beam at elevation 32\'-6" and the duct centerline at 33\'-0".',
  },
  {
    id: 'block-3',
    type: 'text',
    content: 'This coordination issue must be resolved before we proceed with steel fabrication, currently scheduled to begin on March 15th. Any delays in response may impact the critical path and push back the concrete deck pour for Level 4.',
  },
  {
    id: 'block-4',
    type: 'text',
    content: 'We request a response within 5 business days to maintain the project schedule. If a revised structural detail is required, please provide updated shop drawings for review. The mechanical subcontractor is standing by to adjust their routing pending your direction.',
  },
];

interface EditorProps {
  onTitleChange?: (title: string) => void;
  onHistoryChange?: (canUndo: boolean, canRedo: boolean) => void;
}

export interface EditorRef {
  undo: () => void;
  redo: () => void;
}

export const Editor = forwardRef<EditorRef, EditorProps>(function Editor({ onTitleChange, onHistoryChange }, ref) {
  const [title, setTitle] = useState('');
  const titleRef = useRef<HTMLDivElement>(null);
  const editorContentRef = useRef<HTMLDivElement>(null);
  const blocksContainerRef = useRef<HTMLDivElement>(null);
  const {
    blocks,
    updateBlock,
    addBlockAfter,
    mergeWithPrevious,
    getFocusInfo,
    undo,
    redo,
    canUndo,
    canRedo,
  } = useBlocks(INITIAL_CONTENT);

  // Expose undo/redo methods to parent
  useImperativeHandle(ref, () => ({
    undo,
    redo,
  }), [undo, redo]);

  // Notify parent of history state changes
  useEffect(() => {
    onHistoryChange?.(canUndo, canRedo);
  }, [canUndo, canRedo, onHistoryChange]);

  const [focusState, setFocusState] = useState<{
    blockId: string | null;
    cursorPosition: number;
  }>({ blockId: null, cursorPosition: 0 });

  // Check for pending focus on each render
  useEffect(() => {
    const focusInfo = getFocusInfo();
    if (focusInfo.id) {
      setFocusState({
        blockId: focusInfo.id,
        cursorPosition: focusInfo.position,
      });
    }
  }, [blocks, getFocusInfo]);

  const handleTitleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        // Focus first block
        if (blocks.length > 0) {
          setFocusState({ blockId: blocks[0].id, cursorPosition: 0 });
        }
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (blocks.length > 0) {
          setFocusState({ blockId: blocks[0].id, cursorPosition: 0 });
        }
      }
    },
    [blocks]
  );

  // Clear focus state after it's been used
  useEffect(() => {
    if (focusState.blockId) {
      const timer = setTimeout(() => {
        setFocusState({ blockId: null, cursorPosition: 0 });
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [focusState]);

  // Handle input in the unified contentEditable
  const handleBlocksInput = useCallback(() => {
    if (!blocksContainerRef.current) return;

    const container = blocksContainerRef.current;
    const blockElements = container.querySelectorAll('[data-block-id]');

    blockElements.forEach((el) => {
      const blockId = el.getAttribute('data-block-id');
      const content = el.textContent ?? '';
      if (blockId) {
        updateBlock(blockId, content);
      }
    });
  }, [updateBlock]);

  // Handle keyboard events in the unified contentEditable
  const handleBlocksKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();

        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0) return;

        const range = selection.getRangeAt(0);
        let currentBlock = range.startContainer as HTMLElement;

        // Find the block element
        while (currentBlock && !currentBlock.getAttribute?.('data-block-id')) {
          currentBlock = currentBlock.parentElement as HTMLElement;
        }

        if (currentBlock) {
          const blockId = currentBlock.getAttribute('data-block-id');
          if (blockId) {
            // Delete any selected text
            range.deleteContents();

            // Get remaining content after cursor position
            const remainingRange = document.createRange();
            remainingRange.selectNodeContents(currentBlock);
            remainingRange.setStart(range.endContainer, range.endOffset);
            const afterContent = remainingRange.toString();
            remainingRange.deleteContents();

            // Update current block and add new one
            const currentContent = currentBlock.textContent ?? '';
            updateBlock(blockId, currentContent);
            addBlockAfter(blockId, afterContent);
          }
        }
      }

      if (e.key === 'Backspace') {
        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0) return;

        const range = selection.getRangeAt(0);

        // Check if at start of a block
        if (range.startOffset === 0 && range.collapsed) {
          let currentBlock = range.startContainer as HTMLElement;
          while (currentBlock && !currentBlock.getAttribute?.('data-block-id')) {
            currentBlock = currentBlock.parentElement as HTMLElement;
          }

          if (currentBlock) {
            const blockId = currentBlock.getAttribute('data-block-id');
            const blockIndex = blocks.findIndex((b) => b.id === blockId);

            if (blockIndex > 0 && blockId) {
              e.preventDefault();
              mergeWithPrevious(blockId);
            }
          }
        }
      }
    },
    [blocks, updateBlock, addBlockAfter, mergeWithPrevious]
  );

  // Sync blocks content to DOM when blocks change externally (undo/redo)
  useEffect(() => {
    if (!blocksContainerRef.current) return;

    const container = blocksContainerRef.current;
    const blockElements = container.querySelectorAll('[data-block-id]');

    blockElements.forEach((el) => {
      const blockId = el.getAttribute('data-block-id');
      const block = blocks.find((b) => b.id === blockId);
      if (block && el.textContent !== block.content) {
        el.textContent = block.content;
      }
    });
  }, [blocks]);

  const [isRewriting, setIsRewriting] = useState(false);
  const [selectionInfo, setSelectionInfo] = useState<SelectionInfo | null>(null);

  // Get all rects for a selection (handles multi-line and multi-block)
  const getSelectionRects = useCallback((range: Range): DOMRect[] => {
    const rects = Array.from(range.getClientRects());
    // Filter out zero-width rects and deduplicate
    return rects.filter(rect => rect.width > 0 && rect.height > 0);
  }, []);

  const handleSelectionAction = useCallback(
    async (action: RewriteAction) => {
      console.log('[AI Improve] Action triggered:', action);

      const selection = window.getSelection();
      if (!selection || selection.isCollapsed || isRewriting) {
        console.log('[AI Improve] No selection or already rewriting', {
          hasSelection: !!selection,
          isCollapsed: selection?.isCollapsed,
          isRewriting
        });
        return;
      }

      const selectedText = selection.toString();
      if (!selectedText.trim()) {
        console.log('[AI Improve] Selected text is empty');
        return;
      }

      console.log('[AI Improve] Selected text:', selectedText.substring(0, 100) + '...');

      // Store the range and get selection rects for skeleton overlay
      const range = selection.getRangeAt(0).cloneRange();
      const rects = getSelectionRects(range);

      // Set selection info for skeleton overlay
      setSelectionInfo({ text: selectedText, rects, range });
      setIsRewriting(true);

      try {
        console.log('[AI Improve] Calling API...');
        const rewrittenText = await rewriteText(selectedText, action);
        console.log('[AI Improve] API response:', rewrittenText.substring(0, 100) + '...');

        // Restore selection and replace text
        selection.removeAllRanges();
        selection.addRange(range);

        // Use insertText to replace selection (works with contentEditable, including multi-block)
        const success = document.execCommand('insertText', false, rewrittenText);
        console.log('[AI Improve] Text replaced:', success);

        // If execCommand failed, try alternative approach
        if (!success) {
          console.log('[AI Improve] Trying alternative replacement...');
          range.deleteContents();
          range.insertNode(document.createTextNode(rewrittenText));
        }
      } catch (error) {
        console.error('[AI Improve] Failed to rewrite text:', error);
      } finally {
        setIsRewriting(false);
        setSelectionInfo(null);
      }
    },
    [isRewriting, getSelectionRects]
  );

  return (
    <div className="min-h-full bg-white">
      <div ref={editorContentRef} className="max-w-[900px] mx-auto px-16 py-12">
        {/* Selection Menu */}
        <SelectionMenu
          containerRef={editorContentRef}
          onAction={handleSelectionAction}
          isLoading={isRewriting}
        />

        {/* Skeleton Overlay for loading state */}
        {isRewriting && selectionInfo && (
          <SkeletonOverlay rects={selectionInfo.rects} />
        )}

        {/* Title */}
        <div className="relative mb-4">
          <div
            ref={titleRef}
            contentEditable
            suppressContentEditableWarning
            dir="ltr"
            className="outline-none text-[40px] font-bold leading-[1.2] text-[rgb(55,53,47)] min-h-[52px] whitespace-pre-wrap break-words text-left"
            onInput={(e) => {
              const newTitle = (e.target as HTMLDivElement).textContent ?? '';
              setTitle(newTitle);
              onTitleChange?.(newTitle);
            }}
            onKeyDown={handleTitleKeyDown}
          />
          {title.length === 0 && (
            <div
              className="absolute top-0 left-0 text-[40px] font-bold leading-[1.2] text-[rgba(55,53,47,0.15)] pointer-events-none select-none"
              aria-hidden="true"
            >
              RFI #3235
            </div>
          )}
        </div>

        {/* Content blocks - using single contentEditable for cross-paragraph selection */}
        <div
          className="mt-2 outline-none min-h-[200px] text-[16px] text-[rgb(55,53,47)] leading-[1.5]"
          contentEditable
          suppressContentEditableWarning
          ref={blocksContainerRef}
          onInput={handleBlocksInput}
          onKeyDown={handleBlocksKeyDown}
          style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
        >
          {blocks.map((block, index) => (
            <div
              key={block.id}
              data-block-id={block.id}
              className="py-[3px] min-h-[1.5em]"
            >
              {block.content || (index === 0 && blocks.length === 1 ? '' : '')}
            </div>
          ))}
        </div>
        {blocks.length === 1 && !blocks[0].content && (
          <div
            className="absolute mt-2 py-[3px] text-[16px] leading-[1.5] text-[rgba(55,53,47,0.5)] pointer-events-none select-none"
            style={{ top: titleRef.current?.offsetHeight ?? 52 }}
          >
            Write, press 'space' for AI, '/' for commands...
          </div>
        )}
      </div>
    </div>
  );
});
