import React from 'react';
import {
  Briefcase,
  LayoutDashboard,
  LogOut,
  MessageSquareText,
  Radio,
  Users,
  X,
} from 'lucide-react';

export type NavSection =
  | 'overview'
  | 'scanner'
  | 'opportunities'
  | 'applicants'
  | 'feedback';

interface SidebarProps {
  activeSection: NavSection;
  onSelect: (section: NavSection) => void;
  counts: {
    socialNeeds: number;
    opportunities: number;
    applicants: number;
    feedback: number;
  };
  adminUsername: string;
  onLogout: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

const NAV_ITEMS: Array<{
  id: NavSection;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'scanner', label: 'Recently Added Posts', icon: Radio },
  { id: 'opportunities', label: 'Project Opportunities', icon: Briefcase },
  { id: 'applicants', label: 'Applicant Details', icon: Users },
  { id: 'feedback', label: 'Admin Feedback', icon: MessageSquareText },
];

export const Sidebar: React.FC<SidebarProps> = ({
  activeSection,
  onSelect,
  counts,
  adminUsername,
  onLogout,
  mobileOpen,
  onCloseMobile,
}) => {
  const [logoFailed, setLogoFailed] = React.useState(false);
  const [secondaryLogoFailed, setSecondaryLogoFailed] = React.useState(false);

  const getCount = (id: NavSection): number | null => {
    if (id === 'scanner') return counts.socialNeeds;
    if (id === 'opportunities') return counts.opportunities;
    if (id === 'applicants') return counts.applicants;
    if (id === 'feedback') return counts.feedback;
    return null;
  };

  const navContent = (
    <div className="flex h-full flex-col bg-white border-r border-slate-200">
      <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 bg-white">
        <button
          type="button"
          onClick={() => {
            onSelect('overview');
            onCloseMobile();
          }}
          className="flex items-center text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600 rounded"
          aria-label="HK Surya Website Development Home"
        >
          {!logoFailed ? (
            <img
              src="/assets/aistudio/AFCCFDAF-04E5-4AA2-ADE0-E837A7BA9B92_a8ada254.png"
              alt="HK Surya Website Development"
              referrerPolicy="no-referrer"
              onError={() => setLogoFailed(true)}
              className="h-14 w-auto max-w-[196px] object-contain"
            />
          ) : (
            <div className="flex flex-col">
              <span className="font-display text-lg font-bold tracking-tight text-[#0B1A33]">
                HK Surya
              </span>
              <span className="text-[11px] font-medium tracking-wider text-sky-700">
                Website Development
              </span>
            </div>
          )}
        </button>
        <button
          type="button"
          onClick={onCloseMobile}
          className="lg:hidden p-2 rounded-md text-slate-500 hover:text-slate-900 hover:bg-slate-100"
          aria-label="Close navigation"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <nav className="flex-1 px-3 py-5 space-y-1" aria-label="Primary Navigation">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeSection === item.id;
          const count = getCount(item.id);
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                onSelect(item.id);
                onCloseMobile();
              }}
              className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150 whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600 ${
                isActive
                  ? 'bg-[#0B1A33] text-white'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <span className="flex items-center gap-2.5 min-w-0">
                <Icon
                  className={`h-4 w-4 shrink-0 ${
                    isActive ? 'text-sky-300' : 'text-slate-400'
                  }`}
                />
                <span className="truncate">{item.label}</span>
              </span>
              {count !== null && (
                <span
                  className={`font-mono text-xs tabular-nums shrink-0 ${
                    isActive ? 'text-sky-200' : 'text-slate-400'
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="border-t border-slate-200 px-4 py-3.5 bg-white space-y-3">
        <div className="flex items-center gap-3">
          {!secondaryLogoFailed ? (
            <img
              src="/assets/aistudio/529A0428-546D-4806-A071-216BA823C9B9_c684cf78.png"
              alt="HK Surya Digital Solutions"
              referrerPolicy="no-referrer"
              onError={() => setSecondaryLogoFailed(true)}
              className="h-11 w-11 object-contain shrink-0 rounded"
            />
          ) : (
            <div className="h-11 w-11 shrink-0 rounded border border-slate-200 flex items-center justify-center font-display font-bold text-xs text-[#0B1A33]">
              HK
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="font-display text-xs font-semibold text-slate-900 truncate">
              HK Surya Digital Solutions
            </p>
            <p className="text-[11px] text-slate-500 truncate mt-0.5">{adminUsername}</p>
          </div>
        </div>

        <button
          type="button"
          onClick={onLogout}
          className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap"
        >
          <LogOut className="h-3.5 w-3.5 text-slate-500" />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      <aside className="hidden lg:block lg:w-64 lg:shrink-0 lg:sticky lg:top-0 lg:h-screen">
        {navContent}
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-900/40"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <div className="relative w-72 max-w-[85vw] h-full z-10">
            {navContent}
          </div>
        </div>
      )}
    </>
  );
};
