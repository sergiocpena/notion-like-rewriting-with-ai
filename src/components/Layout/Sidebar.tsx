import {
  Search,
  Home,
  ChevronDown,
  PanelLeft,
  SquarePen,
  FileText,
  Settings,
  Trash2,
  Calendar,
  Users,
} from 'lucide-react';

interface SidebarItemProps {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
}

function SidebarItem({ icon, label, active = false }: SidebarItemProps) {
  return (
    <div
      className={`flex items-center gap-2 px-2 py-1 rounded-md cursor-pointer text-[14px] ${
        active
          ? 'bg-[rgba(0,0,0,0.05)]'
          : 'hover:bg-[rgba(0,0,0,0.03)]'
      }`}
    >
      <span className="text-[rgba(55,53,47,0.65)]">{icon}</span>
      <span className="text-[rgb(55,53,47)]">{label}</span>
    </div>
  );
}

interface SidebarProps {
  workspaceName?: string;
  collapsed?: boolean;
  onToggle?: () => void;
}

export function Sidebar({ workspaceName = "Notion", collapsed = false, onToggle }: SidebarProps) {
  return (
    <div
      className={`h-screen bg-[rgb(247,247,245)] flex flex-col border-r border-[rgba(0,0,0,0.05)] transition-all duration-300 ease-in-out overflow-hidden ${
        collapsed ? 'w-0 border-r-0' : 'w-[240px]'
      }`}
    >
      {/* Workspace header */}
      <div className="flex items-center justify-between px-3 py-2 hover:bg-[rgba(0,0,0,0.03)] cursor-pointer">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded bg-[rgb(55,53,47)] text-white flex items-center justify-center text-[11px] font-medium">
            S
          </div>
          <span className="text-[14px] font-medium text-[rgb(55,53,47)]">
            {workspaceName}
          </span>
          <ChevronDown size={14} className="text-[rgba(55,53,47,0.5)]" />
        </div>
        <div className="flex items-center gap-1">
          <button className="p-1 hover:bg-[rgba(0,0,0,0.05)] rounded">
            <SquarePen size={16} className="text-[rgba(55,53,47,0.65)]" />
          </button>
          <button
            className="p-1 hover:bg-[rgba(0,0,0,0.05)] rounded"
            onClick={(e) => {
              e.stopPropagation();
              onToggle?.();
            }}
          >
            <PanelLeft size={16} className="text-[rgba(55,53,47,0.65)]" />
          </button>
        </div>
      </div>

      {/* Navigation items */}
      <div className="flex flex-col px-2 py-1">
        <SidebarItem icon={<Search size={18} />} label="Search" />
        <SidebarItem icon={<Home size={18} />} label="Home" />
        <SidebarItem icon={<FileText size={18} />} label="Documents" />
        <SidebarItem icon={<Calendar size={18} />} label="Calendar" />
        <SidebarItem icon={<Users size={18} />} label="Team Space" />
        <SidebarItem icon={<Settings size={18} />} label="Settings" />
        <SidebarItem icon={<Trash2 size={18} />} label="Trash" />
      </div>

      {/* Shared section */}
      <div className="px-3 pt-4">
        <span className="text-[12px] text-[rgba(55,53,47,0.5)] font-medium">
          Shared
        </span>
      </div>

      {/* Spacer */}
      <div className="flex-1" />
    </div>
  );
}
