import React, { useState } from 'react';
import { useBugFlow } from '../../context/BugFlowContext';
import { 
  Sparkles, CheckCircle, GitMerge, AlertCircle, 
  UserPlus, FileText
} from 'lucide-react';

interface TriagePageProps {
  onOpenIssueDetail: (issueId: string) => void;
}

export const TriagePage: React.FC<TriagePageProps> = ({ onOpenIssueDetail }) => {
  const { issues, users, acceptTriageSuggestions, mergeDuplicate, updateIssue } = useBugFlow();

  // Filter issues that are in New or Triaging status
  const triageIssues = issues.filter(
    i => (i.status === 'Reported' || i.status === 'Triaged') && i.aiAnalysis
  );

  // Popover state for merging duplicates
  const [activeMergePopupId, setActiveMergePopupId] = useState<string | null>(null);

  const handleAssignTo = (issueId: string, assigneeId: string) => {
    updateIssue(issueId, { assigneeId, status: 'Confirmed' });
  };

  const handleMergeDuplicateClick = (issueId: string, targetId: string) => {
    mergeDuplicate(issueId, targetId);
    setActiveMergePopupId(null);
  };

  return (
    <div className="p-6 space-y-6">
      
      {/* Heading Header */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-black text-slate-800 dark:text-slate-100 tracking-tight">Intelligent Triage Workspace</h2>
          <span className="flex items-center gap-1 text-[9px] font-bold text-purple-600 dark:text-purple-400 bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 rounded-full uppercase tracking-wider">
            <Sparkles size={10} className="fill-purple-500" />
            <span>AI Coprocessor Active</span>
          </span>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400">Review newly reported issues, inspect AI-generated classifications, and clear the backlog.</p>
      </div>

      {/* Main Workspace layout */}
      {triageIssues.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {triageIssues.map(issue => {
            const ai = issue.aiAnalysis!;
            const suggestedAssignee = users.find(u => u.id === ai.assigneeSuggestionId);
            const isDuplicateRisk = ai.duplicateProbability > 0.4;
            const duplicateTargetId = ai.duplicateProbability > 0.4 ? 'BUG-101' : undefined; // Seed connection

            return (
              <div 
                key={issue.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 hover:border-purple-500/30 dark:hover:border-purple-800/40 rounded-xl shadow-sm overflow-hidden flex flex-col justify-between group transition-all duration-200"
              >
                {/* Header */}
                <div className="p-4 bg-slate-50/50 dark:bg-slate-950/20 border-b border-slate-100 dark:border-slate-850 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-brand-600 dark:text-brand-400">{issue.id}</span>
                    <span className="text-slate-350 dark:text-slate-650">|</span>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Filed {new Date(issue.createdDate).toLocaleDateString()}</span>
                  </div>
                  
                  <div className="flex items-center gap-2 text-xxs font-mono">
                    <span className={`px-2 py-0.5 rounded font-semibold ${
                      issue.severity === 'critical' ? 'bg-red-500/10 text-red-500' :
                      issue.severity === 'high' ? 'bg-orange-500/10 text-orange-500' :
                      'bg-slate-100 dark:bg-slate-800 text-slate-500'
                    }`}>
                      Raw: {issue.severity}
                    </span>
                  </div>
                </div>

                {/* Body & AI Recommendations details */}
                <div className="p-5 flex-1 space-y-4">
                  {/* Title & Raw Description summary */}
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold text-slate-850 dark:text-slate-150 leading-snug group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                      {issue.title}
                    </h4>
                    <p className="text-xxs text-slate-450 line-clamp-2">
                      {issue.description}
                    </p>
                  </div>

                  {/* AI Summary card block */}
                  <div className="p-3.5 bg-gradient-to-r from-purple-500/5 to-brand-500/5 border border-purple-500/10 dark:border-purple-800/20 rounded-lg space-y-2">
                    <div className="flex items-center gap-1.5 text-xxs font-bold text-purple-600 dark:text-purple-400">
                      <Sparkles size={11} className="fill-purple-500" />
                      <span>Automated Diagnostics Summary</span>
                    </div>
                    <p className="text-xs text-slate-700 dark:text-slate-300 font-medium italic">
                      "{ai.summary}"
                    </p>
                  </div>

                  {/* Classification details */}
                  <div className="grid grid-cols-2 gap-4 text-xxs border-t border-slate-100 dark:border-slate-850 pt-3">
                    <div>
                      <span className="block text-slate-400 font-bold uppercase tracking-wider mb-1">SUGGESTED OWNER</span>
                      {suggestedAssignee ? (
                        <div className="flex items-center gap-1.5">
                          <img src={suggestedAssignee.avatarUrl} alt={suggestedAssignee.name} className="w-5 h-5 rounded-full object-cover" />
                          <span className="font-semibold text-slate-700 dark:text-slate-300">{suggestedAssignee.name}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">None suggested</span>
                      )}
                    </div>

                    <div>
                      <span className="block text-slate-400 font-bold uppercase tracking-wider mb-1">SUGGESTED PATH</span>
                      <span className="font-semibold text-slate-700 dark:text-slate-300">
                        {ai.componentSuggestion} (Tier-1)
                      </span>
                    </div>

                    <div>
                      <span className="block text-slate-400 font-bold uppercase tracking-wider mb-1">SUGGESTED SEVERITY</span>
                      <span className={`font-semibold capitalize ${
                        ai.severitySuggestion === 'critical' ? 'text-red-500' :
                        ai.severitySuggestion === 'high' ? 'text-orange-500' :
                        'text-slate-700 dark:text-slate-350'
                      }`}>
                        {ai.severitySuggestion} ({ai.prioritySuggestion})
                      </span>
                    </div>

                    <div>
                      <span className="block text-slate-400 font-bold uppercase tracking-wider mb-1">SUGGESTED LABELS</span>
                      <div className="flex flex-wrap gap-1 mt-0.5">
                        {ai.suggestedLabels.slice(0, 3).map(l => (
                          <span key={l} className="px-1.5 py-0.25 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded font-semibold text-[8px]">
                            {l}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Duplicate Probability alerts */}
                  {isDuplicateRisk && duplicateTargetId && (
                    <div className="flex items-center justify-between p-2.5 bg-amber-500/10 border border-amber-500/25 rounded-lg text-xxs">
                      <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-semibold">
                        <AlertCircle size={13} />
                        <span>Duplicate Risk: {(ai.duplicateProbability * 100).toFixed(0)}% matching {duplicateTargetId}</span>
                      </div>
                      
                      {/* Merge duplicates trigger */}
                      <div className="relative">
                        <button
                          onClick={() => setActiveMergePopupId(issue.id)}
                          className="flex items-center gap-1 bg-amber-600 hover:bg-amber-700 text-white font-bold px-2 py-0.5 rounded transition-colors"
                        >
                          <GitMerge size={11} />
                          <span>Merge</span>
                        </button>

                        {activeMergePopupId === issue.id && (
                          <div className="absolute right-0 bottom-7 z-10 w-48 p-2 bg-slate-900 border border-slate-800 rounded-lg shadow-xl text-white">
                            <p className="font-bold text-[10px] text-slate-300 pb-1 border-b border-slate-800 mb-1.5">Merge into {duplicateTargetId}?</p>
                            <div className="flex gap-2 justify-end">
                              <button 
                                onClick={() => setActiveMergePopupId(null)}
                                className="text-[10px] text-slate-400 hover:text-white px-2 py-1 font-semibold"
                              >
                                Cancel
                              </button>
                              <button 
                                onClick={() => handleMergeDuplicateClick(issue.id, duplicateTargetId)}
                                className="text-[10px] bg-amber-600 hover:bg-amber-700 text-white font-bold px-2 py-1 rounded"
                              >
                                Confirm Merge
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* AI Explanation details */}
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 border-l-2 border-purple-500/30 pl-2">
                    {ai.reasoning}
                  </p>
                </div>

                {/* Footer interactive buttons */}
                <div className="px-5 py-3.5 bg-slate-50/50 dark:bg-slate-950/20 border-t border-slate-100 dark:border-slate-850 flex items-center justify-between gap-3 text-xxs">
                  <button
                    onClick={() => onOpenIssueDetail(issue.id)}
                    className="flex items-center gap-1 text-slate-600 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 py-1.5 rounded font-bold transition-all hover:shadow-sm"
                  >
                    <FileText size={12} />
                    <span>Review details</span>
                  </button>

                  <div className="flex gap-2">
                    {/* Assignee dropdown shortcut */}
                    <div className="relative group/assign flex">
                      <button className="flex items-center gap-1 text-slate-600 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 py-1.5 rounded font-bold transition-all">
                        <UserPlus size={12} />
                        <span>Assign</span>
                      </button>
                      <div className="absolute right-0 bottom-8 z-10 hidden group-hover/assign:block w-40 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded shadow-lg p-1">
                        {users.map(u => (
                          <button
                            key={u.id}
                            onClick={() => handleAssignTo(issue.id, u.id)}
                            className="w-full text-left px-2 py-1 rounded text-xxs hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold"
                          >
                            {u.name}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Accept suggestions button */}
                    <button
                      onClick={() => acceptTriageSuggestions(issue.id)}
                      className="flex items-center gap-1 bg-brand-600 hover:bg-brand-700 text-white font-bold px-3.5 py-1.5 rounded transition-all active:scale-98 shadow shadow-brand-500/10"
                    >
                      <CheckCircle size={12} />
                      <span>Accept suggestions</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="py-16 text-center max-w-md mx-auto text-slate-400 dark:text-slate-500 bg-white dark:bg-slate-900/40 border border-slate-250/60 dark:border-slate-800/80 rounded-xl shadow-sm">
          <CheckCircle size={44} className="mx-auto text-green-500 mb-2.5" />
          <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200">Triage Queue Cleared</h4>
          <p className="text-xxs opacity-90 mt-1">There are no un-triaged bugs remaining. Excellent work!</p>
        </div>
      )}

    </div>
  );
};
