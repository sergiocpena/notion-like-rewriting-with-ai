import { useState, useRef, useCallback } from 'react';
import { Editor } from '@/components/Editor';
import type { EditorRef } from '@/components/Editor';
import { Sidebar, Header } from '@/components/Layout';

function App() {
  const [title, setTitle] = useState('');
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
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
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      {/* Main content area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <Header
          pageTitle={title || 'Product Requirements Document'}
          canUndo={canUndo}
          canRedo={canRedo}
          onUndo={handleUndo}
          onRedo={handleRedo}
          sidebarCollapsed={sidebarCollapsed}
          onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
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
