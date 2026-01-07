import { useState, useCallback, useRef, useEffect, useImperativeHandle, forwardRef } from 'react';
import { Block } from './Block';
import { SelectionMenu } from './SelectionMenu';
import { useBlocks } from '@/hooks/useBlocks';
import { rewriteText, type RewriteAction } from '@/services/ai';
import type { Block as BlockType } from '@/types/editor';

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
  const {
    blocks,
    updateBlock,
    addBlockAfter,
    deleteBlock,
    mergeWithPrevious,
    getBlockIndex,
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

  const handleEnter = useCallback(
    (id: string, remainingContent: string) => {
      addBlockAfter(id, remainingContent);
    },
    [addBlockAfter]
  );

  const handleDelete = useCallback(
    (id: string) => {
      const index = getBlockIndex(id);
      if (index > 0) {
        setFocusState({
          blockId: blocks[index - 1].id,
          cursorPosition: blocks[index - 1].content.length,
        });
      } else if (blocks.length > 1) {
        setFocusState({
          blockId: blocks[1].id,
          cursorPosition: 0,
        });
      }
      deleteBlock(id);
    },
    [blocks, deleteBlock, getBlockIndex]
  );

  const handleMergeWithPrevious = useCallback(
    (id: string) => {
      const index = getBlockIndex(id);
      if (index > 0) {
        const prevBlock = blocks[index - 1];
        setFocusState({
          blockId: prevBlock.id,
          cursorPosition: prevBlock.content.length,
        });
      }
      mergeWithPrevious(id);
    },
    [blocks, mergeWithPrevious, getBlockIndex]
  );

  const handleFocusPrevious = useCallback(
    (id: string) => {
      const index = getBlockIndex(id);
      if (index > 0) {
        const prevBlock = blocks[index - 1];
        setFocusState({
          blockId: prevBlock.id,
          cursorPosition: prevBlock.content.length,
        });
      } else if (index === 0) {
        // Focus title
        titleRef.current?.focus();
      }
    },
    [blocks, getBlockIndex]
  );

  const handleFocusNext = useCallback(
    (id: string) => {
      const index = getBlockIndex(id);
      if (index < blocks.length - 1) {
        setFocusState({
          blockId: blocks[index + 1].id,
          cursorPosition: 0,
        });
      }
    },
    [blocks, getBlockIndex]
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

  const [isRewriting, setIsRewriting] = useState(false);

  const handleSelectionAction = useCallback(
    async (action: RewriteAction) => {
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed || isRewriting) return;

      const selectedText = selection.toString();
      if (!selectedText.trim()) return;

      // Store the range before async operation
      const range = selection.getRangeAt(0);

      setIsRewriting(true);

      try {
        const rewrittenText = await rewriteText(selectedText, action);

        // Restore selection and replace text
        selection.removeAllRanges();
        selection.addRange(range);

        // Use insertText to replace selection (works with contentEditable)
        document.execCommand('insertText', false, rewrittenText);
      } catch (error) {
        console.error('Failed to rewrite text:', error);
      } finally {
        setIsRewriting(false);
      }
    },
    [isRewriting]
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

        {/* Content blocks */}
        <div className="mt-2">
          {blocks.map((block, index) => (
            <Block
              key={block.id}
              id={block.id}
              content={block.content}
              placeholder={
                index === 0 && blocks.length === 1
                  ? "Write, press 'space' for AI, '/' for commands..."
                  : ''
              }
              isFirst={index === 0}
              onUpdate={updateBlock}
              onEnter={handleEnter}
              onDelete={handleDelete}
              onMergeWithPrevious={handleMergeWithPrevious}
              onFocusPrevious={handleFocusPrevious}
              onFocusNext={handleFocusNext}
              shouldFocus={focusState.blockId === block.id}
              focusCursorPosition={focusState.cursorPosition}
            />
          ))}
        </div>
      </div>
    </div>
  );
});
