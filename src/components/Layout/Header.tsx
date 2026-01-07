import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Lock,
  ChevronDown,
  Undo2,
  Redo2,
  History,
  PanelLeft,
} from 'lucide-react';

interface HeaderProps {
  pageTitle?: string;
  canUndo?: boolean;
  canRedo?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
  sidebarCollapsed?: boolean;
  onToggleSidebar?: () => void;
}

export function Header({
  pageTitle = 'RFI #3235',
  canUndo = false,
  canRedo = false,
  onUndo,
  onRedo,
  sidebarCollapsed = false,
  onToggleSidebar,
}: HeaderProps) {
  return (
    <div className="h-11 flex items-center justify-between border-b border-[rgba(0,0,0,0.05)] bg-white">
      {/* Left section - Navigation and breadcrumb */}
      <div className="flex items-center">
        {/* Sidebar toggle button - shows when sidebar is collapsed */}
        {sidebarCollapsed && (
          <button
            onClick={onToggleSidebar}
            className="p-1.5 ml-2 hover:bg-[rgba(0,0,0,0.05)] rounded text-[rgba(55,53,47,0.65)]"
          >
            <PanelLeft size={18} />
          </button>
        )}
        {/* Navigation arrows */}
        <div className="flex items-center px-2 gap-0.5">
          <button className="p-1 hover:bg-[rgba(0,0,0,0.05)] rounded text-[rgba(55,53,47,0.45)]">
            <ChevronLeft size={18} />
          </button>
          <button className="p-1 hover:bg-[rgba(0,0,0,0.05)] rounded text-[rgba(55,53,47,0.45)]">
            <ChevronRight size={18} />
          </button>
        </div>

        {/* Page tab */}
        <div className="flex items-center h-8 px-2 bg-[rgba(0,0,0,0.03)] rounded-t-md border-b-2 border-[rgb(55,53,47)]">
          <span className="text-[13px] text-[rgb(55,53,47)] max-w-[180px] truncate">
            {pageTitle}
          </span>
        </div>

        {/* New tab button */}
        <button className="p-1 ml-1 hover:bg-[rgba(0,0,0,0.05)] rounded text-[rgba(55,53,47,0.45)]">
          <Plus size={18} />
        </button>
      </div>

      {/* Middle section - Breadcrumb */}
      <div className="flex-1 flex items-center justify-center">
        <div className="flex items-center gap-1 text-[13px]">
          <span className="text-[rgb(55,53,47)] max-w-[200px] truncate cursor-pointer hover:bg-[rgba(0,0,0,0.05)] px-1.5 py-0.5 rounded">
            {pageTitle}
          </span>

          {/* Privacy badge */}
          <button className="flex items-center gap-1 px-1.5 py-0.5 text-[rgba(55,53,47,0.65)] hover:bg-[rgba(0,0,0,0.05)] rounded">
            <Lock size={12} />
            <span className="text-[12px]">Private</span>
            <ChevronDown size={12} />
          </button>
        </div>
      </div>

      {/* Right section - Actions */}
      <div className="flex items-center gap-1 px-2">
        <button className="px-2.5 py-1 text-[13px] text-[rgb(55,53,47)] hover:bg-[rgba(0,0,0,0.05)] rounded">
          Save
        </button>

        <button
          onClick={onUndo}
          disabled={!canUndo}
          className={`p-1 rounded ${
            canUndo
              ? 'hover:bg-[rgba(0,0,0,0.05)] text-[rgba(55,53,47,0.65)]'
              : 'text-[rgba(55,53,47,0.25)] cursor-not-allowed'
          }`}
        >
          <Undo2 size={18} />
        </button>

        <button
          onClick={onRedo}
          disabled={!canRedo}
          className={`p-1 rounded ${
            canRedo
              ? 'hover:bg-[rgba(0,0,0,0.05)] text-[rgba(55,53,47,0.65)]'
              : 'text-[rgba(55,53,47,0.25)] cursor-not-allowed'
          }`}
        >
          <Redo2 size={18} />
        </button>

        <button className="p-1 hover:bg-[rgba(0,0,0,0.05)] rounded text-[rgba(55,53,47,0.65)]">
          <History size={18} />
        </button>
      </div>
    </div>
  );
}
