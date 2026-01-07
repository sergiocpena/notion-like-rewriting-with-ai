import { useState, useCallback, useRef } from 'react';
import type { Block } from '@/types/editor';

function generateId(): string {
  return Math.random().toString(36).substring(2, 11);
}

const MAX_HISTORY_SIZE = 100;

export function useBlocks(initialBlocks?: Block[]) {
  const initialState = initialBlocks ?? [{ id: generateId(), content: '', type: 'text' }];
  const [blocks, setBlocks] = useState<Block[]>(initialState);

  // History for undo/redo - use state for index to trigger re-renders
  const history = useRef<Block[][]>([initialState]);
  const [historyIndex, setHistoryIndex] = useState<number>(0);
  const isUndoRedo = useRef<boolean>(false);

  const focusBlockId = useRef<string | null>(null);
  const cursorPosition = useRef<number>(0);

  // Save state to history (debounced for content updates)
  const saveToHistory = useCallback((newBlocks: Block[]) => {
    if (isUndoRedo.current) {
      isUndoRedo.current = false;
      return;
    }

    // Remove any redo history when new changes are made
    history.current = history.current.slice(0, historyIndex + 1);

    // Add new state
    history.current.push(JSON.parse(JSON.stringify(newBlocks)));

    // Limit history size
    if (history.current.length > MAX_HISTORY_SIZE) {
      history.current = history.current.slice(-MAX_HISTORY_SIZE);
    }

    setHistoryIndex(history.current.length - 1);
  }, [historyIndex]);

  const undo = useCallback(() => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      isUndoRedo.current = true;
      setHistoryIndex(newIndex);
      const previousState = JSON.parse(JSON.stringify(history.current[newIndex]));
      setBlocks(previousState);
    }
  }, [historyIndex]);

  const redo = useCallback(() => {
    if (historyIndex < history.current.length - 1) {
      const newIndex = historyIndex + 1;
      isUndoRedo.current = true;
      setHistoryIndex(newIndex);
      const nextState = JSON.parse(JSON.stringify(history.current[newIndex]));
      setBlocks(nextState);
    }
  }, [historyIndex]);

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.current.length - 1;

  const updateBlock = useCallback((id: string, content: string) => {
    setBlocks((prev) => {
      const newBlocks = prev.map((block) =>
        block.id === id ? { ...block, content } : block
      );
      saveToHistory(newBlocks);
      return newBlocks;
    });
  }, [saveToHistory]);

  const addBlockAfter = useCallback((afterId: string, content = '') => {
    const newBlock: Block = {
      id: generateId(),
      content,
      type: 'text',
    };

    setBlocks((prev) => {
      const index = prev.findIndex((b) => b.id === afterId);
      let newBlocks: Block[];
      if (index === -1) {
        newBlocks = [...prev, newBlock];
      } else {
        newBlocks = [...prev];
        newBlocks.splice(index + 1, 0, newBlock);
      }
      saveToHistory(newBlocks);
      return newBlocks;
    });

    focusBlockId.current = newBlock.id;
    cursorPosition.current = 0;

    return newBlock.id;
  }, [saveToHistory]);

  const deleteBlock = useCallback((id: string) => {
    setBlocks((prev) => {
      if (prev.length <= 1) return prev;
      const index = prev.findIndex((b) => b.id === id);
      if (index === -1) return prev;

      // Set focus to previous block
      if (index > 0) {
        focusBlockId.current = prev[index - 1].id;
        cursorPosition.current = prev[index - 1].content.length;
      }

      const newBlocks = prev.filter((b) => b.id !== id);
      saveToHistory(newBlocks);
      return newBlocks;
    });
  }, [saveToHistory]);

  const mergeWithPrevious = useCallback((id: string) => {
    setBlocks((prev) => {
      const index = prev.findIndex((b) => b.id === id);
      if (index <= 0) return prev;

      const currentBlock = prev[index];
      const previousBlock = prev[index - 1];

      // Set cursor position to end of previous block content
      cursorPosition.current = previousBlock.content.length;
      focusBlockId.current = previousBlock.id;

      // Merge content
      const mergedBlock: Block = {
        ...previousBlock,
        content: previousBlock.content + currentBlock.content,
      };

      const newBlocks = [...prev];
      newBlocks[index - 1] = mergedBlock;
      newBlocks.splice(index, 1);

      saveToHistory(newBlocks);
      return newBlocks;
    });
  }, [saveToHistory]);

  const getBlockIndex = useCallback((id: string) => {
    return blocks.findIndex((b) => b.id === id);
  }, [blocks]);

  const getFocusInfo = useCallback(() => {
    const id = focusBlockId.current;
    const position = cursorPosition.current;
    focusBlockId.current = null;
    return { id, position };
  }, []);

  const setFocusBlock = useCallback((id: string, position = 0) => {
    focusBlockId.current = id;
    cursorPosition.current = position;
  }, []);

  return {
    blocks,
    updateBlock,
    addBlockAfter,
    deleteBlock,
    mergeWithPrevious,
    getBlockIndex,
    getFocusInfo,
    setFocusBlock,
    undo,
    redo,
    canUndo,
    canRedo,
  };
}
