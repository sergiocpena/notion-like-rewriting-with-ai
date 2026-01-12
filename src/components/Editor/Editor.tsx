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
    content: 'This document outlines the requirements for the new collaborative document editing feature. Users have expressed a strong need for real-time collaboration capabilities that allow multiple team members to work on the same document simultaneously without conflicts or data loss.',
  },
  {
    id: 'block-2',
    type: 'text',
    content: 'The primary goal is to enable seamless collaboration between distributed teams. Key success metrics include reducing document revision cycles by 40%, increasing team productivity scores, and achieving a user satisfaction rating of 4.5 or higher for the collaboration experience.',
  },
  {
    id: 'block-3',
    type: 'text',
    content: 'Core features must include presence indicators showing who is currently viewing or editing, cursor tracking for real-time visibility, conflict resolution for simultaneous edits, and a comprehensive version history with the ability to restore previous versions.',
  },
  {
    id: 'block-4',
    type: 'text',
    content: 'Technical requirements include support for WebSocket connections for low-latency updates, offline editing with automatic sync when reconnected, and end-to-end encryption for enterprise customers. The feature should integrate with our existing authentication and permissions system.',
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
  const skipInputHandling = useRef(false);
  const {
    blocks,
    updateBlock,
    addBlockAfter,
    deleteBlock,
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
    // Skip if we're doing a programmatic update (like AI rewrite)
    if (skipInputHandling.current) return;
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

  // Helper to find block element from a node
  const findBlockElement = useCallback((node: Node | null): HTMLElement | null => {
    let current = node as HTMLElement | null;
    while (current && !current.getAttribute?.('data-block-id')) {
      current = current.parentElement;
    }
    return current;
  }, []);

  // Get block IDs in selection range
  const getBlocksInRange = useCallback((range: Range): string[] => {
    const startBlock = findBlockElement(range.startContainer);
    const endBlock = findBlockElement(range.endContainer);

    if (!startBlock || !endBlock) return [];

    const startId = startBlock.getAttribute('data-block-id');
    const endId = endBlock.getAttribute('data-block-id');

    if (!startId || !endId) return [];

    // If same block, return just that one
    if (startId === endId) return [startId];

    // Get all blocks between start and end
    const blockIds: string[] = [];
    const startIndex = blocks.findIndex(b => b.id === startId);
    const endIndex = blocks.findIndex(b => b.id === endId);

    if (startIndex === -1 || endIndex === -1) return [];

    for (let i = startIndex; i <= endIndex; i++) {
      blockIds.push(blocks[i].id);
    }

    return blockIds;
  }, [blocks, findBlockElement]);

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

      // Get which blocks are in the selection BEFORE we make changes
      const affectedBlockIds = getBlocksInRange(range);
      console.log('[AI Improve] Affected blocks:', affectedBlockIds);

      // Set selection info for skeleton overlay
      setSelectionInfo({ text: selectedText, rects, range });
      setIsRewriting(true);

      try {
        console.log('[AI Improve] Calling API...');
        const rewrittenText = await rewriteText(selectedText, action);
        console.log('[AI Improve] API response:', rewrittenText.substring(0, 100) + '...');

        // For multi-block selections, we need to handle this differently
        if (affectedBlockIds.length > 1) {
          // Skip input handling during programmatic update
          skipInputHandling.current = true;

          // Get content before selection in first block
          const firstBlockEl = blocksContainerRef.current?.querySelector(`[data-block-id="${affectedBlockIds[0]}"]`);
          const lastBlockEl = blocksContainerRef.current?.querySelector(`[data-block-id="${affectedBlockIds[affectedBlockIds.length - 1]}"]`);

          if (firstBlockEl && lastBlockEl) {
            // Get the text before selection in first block
            const preRange = document.createRange();
            preRange.setStart(firstBlockEl, 0);
            preRange.setEnd(range.startContainer, range.startOffset);
            const textBefore = preRange.toString();

            // Get the text after selection in last block
            const postRange = document.createRange();
            postRange.setStart(range.endContainer, range.endOffset);
            postRange.setEndAfter(lastBlockEl.lastChild || lastBlockEl);
            const textAfter = postRange.toString();

            // Combine: text before + rewritten + text after
            const newContent = textBefore + rewrittenText + textAfter;

            // Update first block with merged content
            updateBlock(affectedBlockIds[0], newContent);

            // Remove the other blocks from state (from last to second to avoid index issues)
            for (let i = affectedBlockIds.length - 1; i > 0; i--) {
              deleteBlock(affectedBlockIds[i]);
            }
          }

          // Re-enable input handling after a short delay to let React re-render
          setTimeout(() => {
            skipInputHandling.current = false;
          }, 100);
        } else {
          // Single block - use the standard approach
          selection.removeAllRanges();
          selection.addRange(range);

          // Use insertText to replace selection
          const success = document.execCommand('insertText', false, rewrittenText);
          console.log('[AI Improve] Text replaced:', success);

          // If execCommand failed, try alternative approach
          if (!success) {
            console.log('[AI Improve] Trying alternative replacement...');
            range.deleteContents();
            range.insertNode(document.createTextNode(rewrittenText));
          }
        }
      } catch (error) {
        console.error('[AI Improve] Failed to rewrite text:', error);
      } finally {
        setIsRewriting(false);
        setSelectionInfo(null);
      }
    },
    [isRewriting, getSelectionRects, getBlocksInRange, updateBlock, deleteBlock]
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
              Product Requirements Document
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
