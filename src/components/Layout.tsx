import React, { useState, useEffect, useRef } from 'react';
import { useBugFlow } from '../context/BugFlowContext';
import { 
  LayoutDashboard, Bug, Sparkles, Package, BarChart3, Users, Settings, 
  Search, Plus, Moon, Sun, Command, X, AlertCircle, HelpCircle, ArrowRight
} from 'lucide-react';
import type { Issue } from '../types';

interface LayoutProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  activeIssueId: string | null;
  setActiveIssueId: (id: string | null) => void;
  children: React.ReactNode;
  onCreateIssueClick: () => void;
}

interface CommandResultItem {
  id: string;
  category: 'Actions' | 'Issues' | 'Team' | 'Releases';
  title: string;
  subtitle?: string;
  badge?: string;
  badgeColor?: string;
  onSelect: () => void;
}

export const Layout: React.FC<LayoutProps> = ({
  currentTab,
  setCurrentTab,
  activeIssueId,
  setActiveIssueId,
  children,
  onCreateIssueClick
}) => {
  const { theme, toggleTheme, issues, users, releases } = useBugFlow();
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const paletteRef = useRef<HTMLDivElement>(null);

  // Get counts for sidebar badges
  const triagingCount = issues.filter(i => i.status === 'Reported' || i.status === 'Triaged').length;
  const criticalCount = issues.filter(i => (i.priority === 'P0' || i.severity === 'critical') && i.status !== 'Closed' && i.status !== 'Resolved').length;

  // Keyboard shortcut Ctrl + K for Command Palette
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setCommandPaletteOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Click outside listener for command palette
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (paletteRef.current && !paletteRef.current.contains(e.target as Node)) {
        setCommandPaletteOpen(false);
      }
    };
    if (commandPaletteOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [commandPaletteOpen]);

  // Reset selection index on query change
  useEffect(() => {
    setSelectedIndex(0);
  }, [searchQuery]);

  // Compile command results dynamically
  const getCombinedResults = (): CommandResultItem[] => {
    const coreActions: CommandResultItem[] = [
      {
        id: 'act-create',
        category: 'Actions',
        title: 'Create new issue',
        subtitle: 'Opens the issue creation dialog modal',
        onSelect: () => { setCommandPaletteOpen(false); onCreateIssueClick(); }
      },
      {
        id: 'act-dashboard',
        category: 'Actions',
        title: 'Open Dashboard Overview',
        subtitle: 'Go to overview stats & metrics dashboard',
        onSelect: () => { setCommandPaletteOpen(false); setCurrentTab('overview'); setActiveIssueId(null); }
      },
      {
        id: 'act-issues',
        category: 'Actions',
        title: 'Open Issues Explorer',
        subtitle: 'Search, sort and filter active codebase issues',
        onSelect: () => { setCommandPaletteOpen(false); setCurrentTab('issues'); setActiveIssueId(null); }
      },
      {
        id: 'act-triage',
        category: 'Actions',
        title: 'Open AI Triage Workspace',
        subtitle: 'Review incoming automated AI issue assignments',
        onSelect: () => { setCommandPaletteOpen(false); setCurrentTab('triage'); setActiveIssueId(null); }
      },
      {
        id: 'act-releases',
        category: 'Actions',
        title: 'Open Software Release Board',
        subtitle: 'Check release risk parameters & pipeline stages',
        onSelect: () => { setCommandPaletteOpen(false); setCurrentTab('releases'); setActiveIssueId(null); }
      },
      {
        id: 'act-team',
        category: 'Actions',
        title: 'Open Team Workloads',
        subtitle: 'Inspect engineer workloads and availability ratings',
        onSelect: () => { setCommandPaletteOpen(false); setCurrentTab('team'); setActiveIssueId(null); }
      },
      {
        id: 'act-settings',
        category: 'Actions',
        title: 'Open System Settings & Admin',
        subtitle: 'Switch role permissions and inspect security audit logs',
        onSelect: () => { setCommandPaletteOpen(false); setCurrentTab('settings'); setActiveIssueId(null); }
      }
    ];

    if (!searchQuery.trim()) {
      return coreActions;
    }

    const query = searchQuery.toLowerCase();
    
    // Filter Actions
    const filteredActions = coreActions.filter(act => 
      act.title.toLowerCase().includes(query) || 
      (act.subtitle || '').toLowerCase().includes(query)
    );

    // Filter Issues
    const filteredIssues = issues.filter(issue => {
      const assigneeName = users.find(u => u.id === issue.assigneeId)?.name || '';
      return (
        issue.id.toLowerCase().includes(query) ||
        issue.title.toLowerCase().includes(query) ||
        (issue.description || '').toLowerCase().includes(query) ||
        issue.component.toLowerCase().includes(query) ||
        assigneeName.toLowerCase().includes(query)
      );
    }).map(issue => ({
      id: issue.id,
      category: 'Issues' as const,
      title: `${issue.id} - ${issue.title}`,
      subtitle: `in ${issue.component} | Status: ${issue.status}`,
      badge: issue.priority,
      badgeColor: issue.priority === 'P0' ? 'bg-red-500/10 text-red-500 border border-red-500/15' : 'bg-slate-100 dark:bg-slate-800 text-slate-500',
      onSelect: () => {
        setCommandPaletteOpen(false);
        setActiveIssueId(issue.id);
      }
    }));

    // Filter Engineers
    const filteredTeam = users.filter(user => 
      user.name.toLowerCase().includes(query) || 
      user.role.toLowerCase().includes(query) ||
      user.email.toLowerCase().includes(query)
    ).map(user => ({
      id: user.id,
      category: 'Team' as const,
      title: `Engineer: ${user.name}`,
      subtitle: `${user.role} | ${user.email}`,
      onSelect: () => {
        setCommandPaletteOpen(false);
        setCurrentTab('team');
        setActiveIssueId(null);
      }
    }));

    // Filter Releases
    const filteredReleases = (releases || []).filter(rel => 
      rel.version.toLowerCase().includes(query) || 
      rel.name.toLowerCase().includes(query)
    ).map(rel => ({
      id: rel.id,
      category: 'Releases' as const,
      title: `Release ${rel.version} - ${rel.name}`,
      subtitle: `Target Date: ${rel.releaseDate} | Risk Score: ${rel.riskScore}%`,
      onSelect: () => {
        setCommandPaletteOpen(false);
        setCurrentTab('releases');
        setActiveIssueId(null);
      }
    }));

    return [
      ...filteredActions,
      ...filteredIssues.slice(0, 5),
      ...filteredTeam.slice(0, 3),
      ...filteredReleases.slice(0, 3)
    ];
  };

  const combinedResults = getCombinedResults();

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % Math.max(1, combinedResults.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + combinedResults.length) % Math.max(1, combinedResults.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (combinedResults[selectedIndex]) {
        combinedResults[selectedIndex].onSelect();
      }
    } else if (e.key === 'Escape') {
      setCommandPaletteOpen(false);
    }
  };

  const navItems = [
    { id: 'overview', name: 'Overview', icon: LayoutDashboard },
    { id: 'issues', name: 'Issues', icon: Bug, count: issues.filter(i => i.status !== 'Closed' && i.status !== 'Resolved').length },
    { id: 'triage', name: 'Triage', icon: Sparkles, count: triagingCount, isAIBadge: true },
    { id: 'releases', name: 'Releases', icon: Package },
    { id: 'insights', name: 'Insights', icon: BarChart3 },
    { id: 'team', name: 'Team', icon: Users },
    { id: 'settings', name: 'Settings', icon: Settings },
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-dark-bg font-sans">
      {/* Sidebar */}
      <aside className="hidden md:flex flex-col w-64 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
        {/* Brand header */}
        <div className="flex items-center gap-2.5 px-6 py-5 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-brand-600 text-white font-black shadow-md shadow-brand-500/20">
            <Bug size={18} className="rotate-45" />
          </div>
          <div>
            <h1 className="font-bold text-slate-805 dark:text-slate-100 leading-tight">BugFlow AI</h1>
            <span className="text-xxs text-brand-600 dark:text-brand-400 font-mono tracking-widest uppercase font-semibold">Command Center</span>
          </div>
        </div>

        {/* Navigation list */}
        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = currentTab === item.id && activeIssueId === null;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setCurrentTab(item.id);
                  setActiveIssueId(null);
                }}
                className={`flex items-center justify-between w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-all group ${
                  isActive
                    ? 'bg-brand-50 dark:bg-brand-950/40 text-brand-600 dark:text-brand-400 border-l-2 border-brand-600 dark:border-brand-500 pl-2.5'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900/60 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon size={18} className={isActive ? 'text-brand-600 dark:text-brand-400' : 'text-slate-450 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-400'} />
                  <span>{item.name}</span>
                </div>
                {item.count !== undefined && item.count > 0 && (
                  <span className={`px-2 py-0.5 rounded-full text-xxs font-semibold ${
                    item.isAIBadge
                      ? 'bg-gradient-to-r from-purple-500/10 to-brand-500/10 dark:from-purple-400/10 dark:to-brand-400/10 text-purple-600 dark:text-purple-400 border border-purple-200/50 dark:border-purple-800/30'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}>
                    {item.count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Footer controls & profile */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs text-slate-450 dark:text-slate-500">Theme</span>
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 shadow-sm cursor-pointer animate-fade-in"
              title="Toggle theme mode"
            >
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            </button>
          </div>

          <div className="flex items-center gap-3">
            <img
              src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150"
              alt="Tariq Mahmood"
              className="w-9 h-9 rounded-full object-cover ring-2 ring-slate-200 dark:ring-slate-800"
            />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-slate-805 dark:text-slate-200 truncate">Tariq Mahmood</p>
              <p className="text-xxs text-slate-500 dark:text-slate-400 truncate">Full Stack Developer</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header */}
        <header className="flex items-center justify-between h-16 px-6 bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800">
          {/* Quick Search */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCommandPaletteOpen(true)}
              className="flex items-center gap-3.5 px-3 py-1.5 w-64 md:w-80 rounded-lg text-left text-sm text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-350 dark:hover:border-slate-700 transition-all shadow-inner cursor-pointer"
            >
              <Search size={16} />
              <span className="flex-1 text-slate-400 dark:text-slate-500 truncate font-medium">Search command (Ctrl + K)</span>
              <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-xxs font-mono text-slate-400 dark:text-slate-500 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded">
                <Command size={10} />
                <span>K</span>
              </kbd>
            </button>
          </div>

          {/* Right Header Controls */}
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-4 text-xs font-mono text-slate-500 dark:text-slate-400">
              {criticalCount > 0 && (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500/10 text-red-500 dark:text-red-400 animate-pulse font-semibold">
                  <AlertCircle size={12} />
                  <span>{criticalCount} Critical Active</span>
                </div>
              )}
            </div>

            <button
              onClick={onCreateIssueClick}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-sm font-semibold text-white bg-brand-600 hover:bg-brand-700 active:scale-95 transition-all shadow-md shadow-brand-500/10 cursor-pointer"
            >
              <Plus size={16} />
              <span>Create Bug</span>
            </button>
          </div>
        </header>

        {/* Content Viewport */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>

      {/* Command Palette Modal */}
      {commandPaletteOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] px-4 bg-black/60 backdrop-blur-sm">
          <div 
            ref={paletteRef}
            className="w-full max-w-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl overflow-hidden animate-slide-down flex flex-col"
          >
            {/* Search Input bar */}
            <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-200 dark:border-slate-800">
              <Search className="text-slate-400 dark:text-slate-500" size={20} />
              <input
                type="text"
                autoFocus
                placeholder="Type command (e.g. 'create', 'issues', 'sarah', ' BUG-101')..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onKeyDown={handleInputKeyDown}
                className="flex-1 bg-transparent border-0 outline-none text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 text-sm font-sans"
              />
              <button 
                onClick={() => setCommandPaletteOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Combined keyboard navigable results */}
            <div className="max-h-[350px] overflow-y-auto p-2 space-y-1">
              {combinedResults.length > 0 ? (
                <div>
                  <div className="px-3 py-1.5 text-[8.5px] font-bold text-slate-400 dark:text-slate-500 tracking-wider uppercase font-sans">
                    {searchQuery.trim() ? 'Matching Commands & Targets' : 'Suggested Quick Navigation Actions'}
                  </div>
                  
                  {combinedResults.map((item, idx) => {
                    const isSelected = selectedIndex === idx;
                    return (
                      <button
                        key={item.id}
                        onClick={item.onSelect}
                        className={`flex items-center justify-between w-full px-3 py-2 rounded-lg text-left transition-all ${
                          isSelected 
                            ? 'bg-brand-500/10 text-brand-600 dark:text-brand-400 border border-brand-500/20' 
                            : 'border border-transparent hover:bg-slate-50 dark:hover:bg-slate-800/40'
                        }`}
                      >
                        <div className="min-w-0 flex-1 pr-3">
                          <div className="flex items-center gap-2">
                            <span className={`text-[8.5px] px-1.5 py-0.25 font-bold uppercase tracking-wider rounded font-mono ${
                              item.category === 'Actions' ? 'bg-purple-500/10 text-purple-650' :
                              item.category === 'Issues' ? 'bg-blue-500/10 text-blue-600' :
                              item.category === 'Team' ? 'bg-green-500/10 text-green-500' :
                              'bg-amber-500/10 text-amber-600'
                            }`}>
                              {item.category}
                            </span>
                            <span className="text-xs font-bold text-slate-850 dark:text-slate-200 truncate font-sans">{item.title}</span>
                          </div>
                          {item.subtitle && (
                            <p className="text-[10px] text-slate-500 dark:text-slate-450 truncate mt-0.5 font-sans leading-none">{item.subtitle}</p>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-2 shrink-0">
                          {item.badge && (
                            <span className={`px-1.5 py-0.25 text-[8px] rounded font-mono font-bold ${item.badgeColor}`}>
                              {item.badge}
                            </span>
                          )}
                          
                          {isSelected && (
                            <span className="flex items-center gap-0.5 text-[9px] text-brand-500 dark:text-brand-400 font-bold uppercase tracking-wider font-sans font-mono shrink-0">
                              <span>Press Enter</span>
                              <ArrowRight size={10} />
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="py-8 text-center text-slate-450 dark:text-slate-550 text-xs font-sans">
                  <HelpCircle className="mx-auto mb-2 opacity-55" size={24} />
                  <p className="font-semibold">No commands or issues matched "{searchQuery}"</p>
                  <p className="text-[10px] opacity-80 mt-1">Try searching for keywords like "Overview", "Sarah", "Settings", or specific Bug IDs.</p>
                </div>
              )}
            </div>

            {/* Footer keyboard helpers */}
            <div className="px-4 py-2 border-t border-slate-100 dark:border-slate-850 bg-slate-50/50 dark:bg-slate-950/20 flex items-center justify-between text-[9px] text-slate-400 font-mono">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <kbd className="px-1 py-0.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded">↑↓</kbd>
                  Navigate
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="px-1 py-0.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded">Enter</kbd>
                  Select
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="px-1 py-0.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded">Esc</kbd>
                  Close
                </span>
              </div>
              <span>BugFlow Navigator</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
