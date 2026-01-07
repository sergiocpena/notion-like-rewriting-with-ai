import { useState, useRef, useCallback } from 'react';
import { Editor } from '@/components/Editor';
import type { EditorRef } from '@/components/Editor';
import { Sidebar, Header } from '@/components/Layout';

function App() {
  const [title, setTitle] = useState('');
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const editorRef = useRef<EditorRef>(null);

  const handleHistoryChange = useCallback((newCanUndo: boolean, newCanRedo: boolean) => {
    setCanUndo(newCanUndo);
    setCanRedo(newCanRedo);
  }, []);

  const handleUndo = useCallback(() => {
    editorRef.current?.undo();
  }, []);

  const handleRedo = useCallback(() => {
    editorRef.current?.redo();
  }, []);

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <Sidebar />

      {/* Main content area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <Header
          pageTitle={title || 'RFI #3235'}
          canUndo={canUndo}
          canRedo={canRedo}
          onUndo={handleUndo}
          onRedo={handleRedo}
        />

        {/* Editor */}
        <div className="flex-1 overflow-auto">
          <Editor
            ref={editorRef}
            onTitleChange={setTitle}
            onHistoryChange={handleHistoryChange}
          />
        </div>
      </div>
    </div>
  );
}

export default App;
