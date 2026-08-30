import React, { useState, useMemo } from 'react';
import { useBugFlow } from '../../context/BugFlowContext';
import type { Issue, IssuePriority, IssueSeverity, IssueStatus } from '../../types';
import { 
  Search, SlidersHorizontal, ArrowUpDown, ShieldCheck, UserCheck, 
  Trash2, UserMinus, RotateCcw, AlertTriangle, Layers, Tag, Sparkles
} from 'lucide-react';

interface IssuesPageProps {
  onOpenIssueDetail: (issueId: string) => void;
}

type SavedViewType = 'all' | 'my-issues' | 'unassigned' | 'critical' | 'triage-queue';
type SortFieldType = 'id' | 'createdDate' | 'updatedDate' | 'priority' | 'severity' | 'usersAffected';
type SortOrderType = 'asc' | 'desc';

export const IssuesPage: React.FC<IssuesPageProps> = ({ onOpenIssueDetail }) => {
  const { issues, users, updateIssue, deleteIssue } = useBugFlow();

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [priorityFilter, setPriorityFilter] = useState<string>('');
  const [severityFilter, setSeverityFilter] = useState<string>('');
  const [assigneeFilter, setAssigneeFilter] = useState<string>('');
  const [componentFilter, setComponentFilter] = useState<string>('');
  const [savedView, setSavedView] = useState<SavedViewType>('all');

  // Sorting state
  const [sortField, setSortField] = useState<SortFieldType>('updatedDate');
  const [sortOrder, setSortOrder] = useState<SortOrderType>('desc');

  // Selection state for Bulk Actions
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Reset filters helper
  const handleResetFilters = () => {
    setSearchQuery('');
    setStatusFilter('');
    setPriorityFilter('');
    setSeverityFilter('');
    setAssigneeFilter('');
    setComponentFilter('');
    setSavedView('all');
    setSelectedIds([]);
  };

  // Saved Views definitions
  const selectSavedView = (view: SavedViewType) => {
    setSavedView(view);
    setSelectedIds([]);
    // Reset filters that conflict
    setStatusFilter('');
    setPriorityFilter('');
    setSeverityFilter('');
    setAssigneeFilter('');
    setComponentFilter('');
  };

  // Filtered and Sorted list
  const processedIssues = useMemo(() => {
    let result = [...issues];

    // 1. Apply Saved Views
    if (savedView === 'my-issues') {
      result = result.filter(i => i.assigneeId === 'user-tariq');
    } else if (savedView === 'unassigned') {
      result = result.filter(i => !i.assigneeId);
    } else if (savedView === 'critical') {
      result = result.filter(i => i.priority === 'P0' || i.severity === 'critical');
    } else if (savedView === 'triage-queue') {
      result = result.filter(i => i.status === 'Reported' || i.status === 'Triaged');
    }

    // Filter out duplicate issues that are Closed to keep lists clean (unless searching)
    if (!searchQuery && savedView === 'all') {
      result = result.filter(i => !(i.status === 'Closed' && i.duplicateOf));
    }

    // 2. Apply Custom Filters
    if (statusFilter) result = result.filter(i => i.status === statusFilter);
    if (priorityFilter) result = result.filter(i => i.priority === priorityFilter);
    if (severityFilter) result = result.filter(i => i.severity === severityFilter);
    if (assigneeFilter) {
      if (assigneeFilter === 'unassigned') {
        result = result.filter(i => !i.assigneeId);
      } else {
        result = result.filter(i => i.assigneeId === assigneeFilter);
      }
    }
    if (componentFilter) result = result.filter(i => i.component === componentFilter);

    // 3. Apply Text Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(i => {
        const assignee = users.find(u => u.id === i.assigneeId)?.name || '';
        const reporter = users.find(u => u.id === i.reporterId)?.name || '';
        return (
          i.id.toLowerCase().includes(q) ||
          i.title.toLowerCase().includes(q) ||
          (i.description || '').toLowerCase().includes(q) ||
          i.component.toLowerCase().includes(q) ||
          assignee.toLowerCase().includes(q) ||
          reporter.toLowerCase().includes(q) ||
          i.labels.some(l => l.toLowerCase().includes(q))
        );
      });
    }

    // 4. Sort Issues
    result.sort((a, b) => {
      let valA: any = a[sortField];
      let valB: any = b[sortField];

      // Value adjustments for logical ordering of statuses/priority
      if (sortField === 'priority') {
        const pWeights = { 'P0': 4, 'P1': 3, 'P2': 2, 'P3': 1 };
        valA = pWeights[a.priority] || 0;
        valB = pWeights[b.priority] || 0;
      } else if (sortField === 'severity') {
        const sWeights = { 'critical': 4, 'high': 3, 'medium': 2, 'low': 1 };
        valA = sWeights[a.severity] || 0;
        valB = sWeights[b.severity] || 0;
      } else if (sortField === 'createdDate' || sortField === 'updatedDate') {
        valA = new Date(valA).getTime();
        valB = new Date(valB).getTime();
      }

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [issues, users, savedView, statusFilter, priorityFilter, severityFilter, assigneeFilter, componentFilter, searchQuery, sortField, sortOrder]);

  // Bulk operations handlers
  const handleSelectRow = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(rowId => rowId !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedIds.length === processedIssues.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(processedIssues.map(i => i.id));
    }
  };

  const handleBulkStatusChange = (status: IssueStatus) => {
    selectedIds.forEach(id => updateIssue(id, { status }));
    setSelectedIds([]);
  };

  const handleBulkPriorityChange = (priority: IssuePriority) => {
    selectedIds.forEach(id => updateIssue(id, { priority }));
    setSelectedIds([]);
  };

  const handleBulkAssign = (assigneeId: string) => {
    selectedIds.forEach(id => updateIssue(id, { assigneeId: assigneeId || undefined }));
    setSelectedIds([]);
  };

  const handleBulkDelete = () => {
    if (window.confirm(`Are you sure you want to delete ${selectedIds.length} issues?`)) {
      selectedIds.forEach(id => deleteIssue(id));
      setSelectedIds([]);
    }
  };

  const handleToggleSort = (field: SortFieldType) => {
    if (sortField === field) {
      setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder('desc'); // Default to descending
    }
  };

  // Distinct component list for filter dropdown
  const componentsList = useMemo(() => {
    return Array.from(new Set(issues.map(i => i.component)));
  }, [issues]);

  return (
    <div className="flex h-full">
      {/* Issues Sidebar (Saved views & lists) */}
      <aside className="hidden lg:flex flex-col w-56 border-r border-slate-200 dark:border-slate-800 bg-white/40 dark:bg-slate-950/20 p-4 space-y-6">
        <div>
          <h4 className="text-xxs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2.5">Saved Views</h4>
          <div className="space-y-1">
            {[
              { id: 'all', name: 'All Open Issues' },
              { id: 'my-issues', name: 'Assigned to Me' },
              { id: 'unassigned', name: 'Unassigned Bugs' },
              { id: 'critical', name: 'P0 & Critical Bugs' },
              { id: 'triage-queue', name: 'Triage Queue' }
            ].map(view => (
              <button
                key={view.id}
                onClick={() => selectSavedView(view.id as SavedViewType)}
                className={`w-full text-left px-2.5 py-1.5 rounded text-xs font-semibold transition-all ${
                  savedView === view.id
                    ? 'bg-slate-200/80 dark:bg-slate-800 text-slate-800 dark:text-slate-100 font-bold'
                    : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-900/40 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                {view.name}
              </button>
            ))}
          </div>
        </div>

        <div>
          <h4 className="text-xxs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Filters</h4>
          <div className="space-y-2">
            <div>
              <label className="block text-[10px] text-slate-400 font-bold uppercase mb-0.5">Component</label>
              <select
                value={componentFilter}
                onChange={e => setComponentFilter(e.target.value)}
                className="w-full text-xxs p-1 border border-slate-200 dark:border-slate-800 rounded bg-white dark:bg-slate-900 outline-none text-slate-700 dark:text-slate-300"
              >
                <option value="">All Components</option>
                {componentsList.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] text-slate-400 font-bold uppercase mb-0.5">Assignee</label>
              <select
                value={assigneeFilter}
                onChange={e => setAssigneeFilter(e.target.value)}
                className="w-full text-xxs p-1 border border-slate-200 dark:border-slate-800 rounded bg-white dark:bg-slate-900 outline-none text-slate-700 dark:text-slate-300"
              >
                <option value="">All Engineers</option>
                <option value="unassigned">Unassigned</option>
                {users.map(u => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Table Explorer */}
      <div className="flex-1 flex flex-col min-w-0 bg-white dark:bg-slate-950/40">
        
        {/* Search & Filter Header Toolbar */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-1 min-w-[240px]">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2 text-slate-400 dark:text-slate-500" size={15} />
              <input
                type="text"
                placeholder="Search issues (e.g. P0, JWT, Sarah)..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-transparent text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:border-brand-500 outline-none transition-all"
              />
            </div>
            {(statusFilter || priorityFilter || severityFilter || assigneeFilter || componentFilter || searchQuery || savedView !== 'all') && (
              <button
                onClick={handleResetFilters}
                className="flex items-center gap-1 px-2.5 py-1.5 text-xxs font-bold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 bg-slate-100 dark:bg-slate-850 rounded hover:scale-98 transition-all"
                title="Reset all filters"
              >
                <RotateCcw size={12} />
                <span>Reset</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 text-xxs">
            {/* Status Selector */}
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="px-2 py-1.5 border border-slate-200 dark:border-slate-800 rounded bg-white dark:bg-slate-900 outline-none text-slate-750 dark:text-slate-350 font-medium"
            >
              <option value="">All Statuses</option>
              <option value="Reported">Reported</option>
              <option value="Triaged">Triaged</option>
              <option value="Confirmed">Confirmed</option>
              <option value="Assigned">Assigned</option>
              <option value="In Progress">In Progress</option>
              <option value="Fix Submitted">Fix Submitted</option>
              <option value="QA Verification">QA Verification</option>
              <option value="Resolved">Resolved</option>
              <option value="Closed">Closed</option>
            </select>

            {/* Priority Selector */}
            <select
              value={priorityFilter}
              onChange={e => setPriorityFilter(e.target.value)}
              className="px-2 py-1.5 border border-slate-200 dark:border-slate-800 rounded bg-white dark:bg-slate-900 outline-none text-slate-600 dark:text-slate-300"
            >
              <option value="">All Priorities</option>
              <option value="P0">P0 Critical</option>
              <option value="P1">P1 High</option>
              <option value="P2">P2 Medium</option>
              <option value="P3">P3 Low</option>
            </select>

            {/* Severity Selector */}
            <select
              value={severityFilter}
              onChange={e => setSeverityFilter(e.target.value)}
              className="px-2 py-1.5 border border-slate-200 dark:border-slate-800 rounded bg-white dark:bg-slate-900 outline-none text-slate-600 dark:text-slate-300"
            >
              <option value="">All Severities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
        </div>

        {/* Issues List Table */}
        <div className="flex-1 overflow-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20 text-xxs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider select-none">
                <th className="px-4 py-3 w-8">
                  <input
                    type="checkbox"
                    checked={processedIssues.length > 0 && selectedIds.length === processedIssues.length}
                    onChange={handleSelectAll}
                    className="rounded border-slate-300 text-brand-600 outline-none cursor-pointer"
                  />
                </th>
                <th className="px-3 py-3 w-20 cursor-pointer hover:text-slate-600 dark:hover:text-slate-300" onClick={() => handleToggleSort('id')}>
                  <div className="flex items-center gap-1">
                    <span>ID</span>
                    <ArrowUpDown size={10} />
                  </div>
                </th>
                <th className="px-3 py-3 cursor-pointer hover:text-slate-600 dark:hover:text-slate-300" onClick={() => handleToggleSort('updatedDate')}>
                  <div className="flex items-center gap-1">
                    <span>Issue Title</span>
                    <ArrowUpDown size={10} />
                  </div>
                </th>
                <th className="px-3 py-3">Status</th>
                <th className="px-3 py-3 cursor-pointer hover:text-slate-600 dark:hover:text-slate-300" onClick={() => handleToggleSort('priority')}>
                  <div className="flex items-center gap-1">
                    <span>Priority</span>
                    <ArrowUpDown size={10} />
                  </div>
                </th>
                <th className="px-3 py-3 cursor-pointer hover:text-slate-600 dark:hover:text-slate-300" onClick={() => handleToggleSort('severity')}>
                  <div className="flex items-center gap-1">
                    <span>Severity</span>
                    <ArrowUpDown size={10} />
                  </div>
                </th>
                <th className="px-3 py-3">Assignee</th>
                <th className="px-3 py-3 hidden sm:table-cell">Component</th>
                <th className="px-4 py-3 text-right hidden md:table-cell">Updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-xs">
              {processedIssues.length > 0 ? (
                processedIssues.map(issue => {
                  const assignee = users.find(u => u.id === issue.assigneeId);
                  const isSelected = selectedIds.includes(issue.id);
                  const relativeTime = new Date(issue.updatedDate).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
                  
                  return (
                    <tr
                      key={issue.id}
                      className={`hover:bg-slate-100/40 dark:hover:bg-slate-900/20 transition-all ${
                        isSelected ? 'bg-brand-500/5 dark:bg-brand-500/5' : ''
                      }`}
                    >
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleSelectRow(issue.id)}
                          className="rounded border-slate-300 text-brand-600 outline-none cursor-pointer"
                        />
                      </td>
                      <td className="px-3 py-3 font-mono font-bold text-slate-500 dark:text-slate-400">
                        {issue.id}
                      </td>
                      <td 
                        onClick={() => onOpenIssueDetail(issue.id)}
                        className="px-3 py-3 cursor-pointer font-semibold text-slate-800 dark:text-slate-200 hover:text-brand-600 dark:hover:text-brand-400 max-w-[280px] sm:max-w-md"
                      >
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="truncate">{issue.title}</span>
                          {issue.aiAnalysis && (
                            <span title="AI Analyzed">
                              <Sparkles size={11} className="text-purple-500 fill-purple-500/10 shrink-0 animate-pulse" />
                            </span>
                          )}
                          {issue.labels.slice(0, 2).map(l => (
                            <span key={l} className="px-1.5 py-0.5 text-[8.5px] bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-semibold rounded">
                              {l}
                            </span>
                          ))}
                          {issue.duplicateOf && (
                            <span className="px-1.5 py-0.5 text-[8px] bg-amber-500/10 text-amber-500 font-bold rounded font-mono uppercase">Dup</span>
                          )}
                          {issue.blockedBy && issue.blockedBy.length > 0 && (
                            <span className="px-1.5 py-0.5 text-[8px] bg-red-500/10 text-red-500 font-bold rounded uppercase">Blocked</span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                          issue.status === 'Reported' ? 'bg-blue-500/10 text-blue-550' :
                          issue.status === 'Triaged' ? 'bg-purple-500/10 text-purple-500' :
                          issue.status === 'Confirmed' ? 'bg-cyan-500/10 text-cyan-600' :
                          issue.status === 'Assigned' ? 'bg-amber-500/10 text-amber-600' :
                          issue.status === 'In Progress' ? 'bg-indigo-500/10 text-indigo-500' :
                          issue.status === 'Fix Submitted' ? 'bg-violet-500/10 text-violet-550' :
                          issue.status === 'QA Verification' ? 'bg-rose-500/10 text-rose-500' :
                          issue.status === 'Resolved' ? 'bg-green-500/10 text-green-550' :
                          'bg-slate-100 dark:bg-slate-800 text-slate-500'
                        }`}>
                          {issue.status}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <span className={`font-semibold font-mono ${
                          issue.priority === 'P0' ? 'text-red-500 font-bold' :
                          issue.priority === 'P1' ? 'text-orange-500' :
                          'text-slate-500'
                        }`}>
                          {issue.priority}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <span className={`capitalize font-medium ${
                          issue.severity === 'critical' ? 'text-red-500 font-bold' :
                          issue.severity === 'high' ? 'text-orange-500' :
                          'text-slate-500'
                        }`}>
                          {issue.severity}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-slate-600 dark:text-slate-300">
                        {assignee ? (
                          <div className="flex items-center gap-1.5">
                            <img src={assignee.avatarUrl} alt={assignee.name} className="w-5 h-5 rounded-full object-cover" />
                            <span className="truncate max-w-[80px] sm:max-w-none">{assignee.name.split(' ')[0]}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">Unassigned</span>
                        )}
                      </td>
                      <td className="px-3 py-3 hidden sm:table-cell text-slate-500 font-medium">
                        {issue.component}
                      </td>
                      <td className="px-4 py-3 text-right hidden md:table-cell text-slate-400 font-mono">
                        {relativeTime}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400 dark:text-slate-500">
                    <ShieldCheck size={36} className="mx-auto mb-2 opacity-50" />
                    <p className="font-semibold text-sm">No issues found matching filters.</p>
                    <p className="text-xxs opacity-85 mt-1">Try clearing query terms or custom filters.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Bulk Action Bar (fixed at bottom when rows selected) */}
        {selectedIds.length > 0 && (
          <div className="bg-slate-900 border-t border-slate-800 text-white px-6 py-3 flex items-center justify-between gap-4 animate-slide-down shadow-2xl">
            <div className="flex items-center gap-2">
              <span className="text-xxs font-mono bg-brand-600 px-2 py-0.5 rounded font-bold">{selectedIds.length} Selected</span>
              <button
                onClick={() => setSelectedIds([])}
                className="text-xxs text-slate-400 hover:text-white underline font-medium"
              >
                Clear selection
              </button>
            </div>

            <div className="flex items-center gap-3 text-xxs">
              {/* Assign in bulk */}
              <div className="flex items-center gap-1.5">
                <span className="text-slate-400">Assign:</span>
                <select
                  onChange={e => handleBulkAssign(e.target.value)}
                  className="px-2 py-1 bg-slate-800 border border-slate-700 rounded outline-none text-slate-200 cursor-pointer"
                  defaultValue=""
                >
                  <option value="" disabled>Select...</option>
                  <option value="unassigned">Unassign</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
              </div>

              {/* Set status in bulk */}
              <div className="flex items-center gap-1.5">
                <span className="text-slate-400">Status:</span>
                <select
                  onChange={e => handleBulkStatusChange(e.target.value as IssueStatus)}
                  className="px-2 py-1 bg-slate-800 border border-slate-700 rounded outline-none text-slate-200 cursor-pointer"
                  defaultValue=""
                >
                  <option value="" disabled>Select...</option>
                  <option value="Reported">Reported</option>
                  <option value="Triaged">Triaged</option>
                  <option value="Confirmed">Confirmed</option>
                  <option value="Assigned">Assigned</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Fix Submitted">Fix Submitted</option>
                  <option value="QA Verification">QA Verification</option>
                  <option value="Resolved">Resolved</option>
                  <option value="Closed">Closed</option>
                </select>
              </div>

              {/* Set priority in bulk */}
              <div className="flex items-center gap-1.5">
                <span className="text-slate-400">Priority:</span>
                <select
                  onChange={e => handleBulkPriorityChange(e.target.value as IssuePriority)}
                  className="px-2 py-1 bg-slate-800 border border-slate-700 rounded outline-none text-slate-200 cursor-pointer"
                  defaultValue=""
                >
                  <option value="" disabled>Select...</option>
                  <option value="P0">P0</option>
                  <option value="P1">P1</option>
                  <option value="P2">P2</option>
                  <option value="P3">P3</option>
                </select>
              </div>

              <div className="w-px h-6 bg-slate-800 mx-1"></div>

              {/* Delete selected */}
              <button
                onClick={handleBulkDelete}
                className="flex items-center gap-1 bg-red-950 hover:bg-red-900 border border-red-800 text-red-400 px-2.5 py-1 rounded transition-colors"
              >
                <Trash2 size={13} />
                <span>Delete</span>
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
