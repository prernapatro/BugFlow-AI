import React, { useState } from 'react';
import { useBugFlow } from '../../context/BugFlowContext';
import type { User, Issue } from '../../types';
import { 
  Users, Briefcase, Clock, ShieldAlert, ChevronRight, 
  Mail, UserCheck, Zap, Play, Check, AlertTriangle, ShieldCheck
} from 'lucide-react';
import { calculateFixPriority } from '../../utils/scoring';

interface TeamPageProps {
  onOpenIssueDetail: (issueId: string) => void;
}

export const TeamPage: React.FC<TeamPageProps> = ({ onOpenIssueDetail }) => {
  const { users, issues, releases, updateIssue } = useBugFlow();

  // Track expanded team member to show their issues list
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);

  // Helper to retrieve active bugs assigned to a user
  const getUserBugs = (userId: string) => {
    return issues.filter(i => i.assigneeId === userId && i.status !== 'Resolved' && i.status !== 'Closed');
  };

  return (
    <div className="p-6 space-y-6">
      
      {/* Title Header */}
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-black text-slate-800 dark:text-slate-100 tracking-tight">Engineering Team Workloads</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">Review team availability, active issue counts, average resolution times, and overload states.</p>
      </div>

      {/* Grid of Team Members */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {users.map(user => {
          const userBugs = getUserBugs(user.id);
          const p0Count = userBugs.filter(b => b.priority === 'P0' || b.severity === 'critical').length;
          
          // Workload rating:
          // Overloaded: bugs >= 5 or P0 count >= 2
          // High: bugs >= 3
          // Medium: bugs >= 1
          // Low: bugs === 0
          const totalCount = userBugs.length;
          const isOverloaded = totalCount >= 5 || p0Count >= 2;
          const isHigh = totalCount >= 3 && !isOverloaded;
          const isMed = totalCount >= 1 && totalCount < 3;
          
          const ratingText = isOverloaded ? 'Overloaded 🚨' : isHigh ? 'High Workload' : isMed ? 'Balanced' : 'Available';
          const ratingColor = isOverloaded ? 'bg-red-500/10 text-red-500 border-red-500/10' :
                             isHigh ? 'bg-orange-500/10 text-orange-500 border-orange-500/10' :
                             isMed ? 'bg-blue-500/10 text-blue-500 border-blue-500/10' :
                             'bg-green-500/10 text-green-500 border-green-500/10';

          return (
            <div 
              key={user.id}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-xl overflow-hidden shadow-sm"
            >
              {/* Profile Card header */}
              <div className="p-5 border-b border-slate-150 dark:border-slate-850 flex items-start justify-between gap-4 bg-slate-50/50 dark:bg-slate-950/20">
                <div className="flex items-center gap-3.5">
                  <img src={user.avatarUrl} alt={user.name} className="w-11 h-11 rounded-full object-cover ring-2 ring-slate-150 dark:ring-slate-800" />
                  <div>
                    <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 leading-tight">{user.name}</h3>
                    <p className="text-xxs text-slate-500 mt-0.5">{user.role}</p>
                    <span className="flex items-center gap-1 text-[10px] text-slate-400 mt-1">
                      <Mail size={11} />
                      <span className="font-mono">{user.email}</span>
                    </span>
                  </div>
                </div>

                <span className={`inline-flex items-center px-2 py-0.5 rounded text-[9px] font-bold border ${ratingColor}`}>
                  {ratingText}
                </span>
              </div>

              {/* Statistics Grid */}
              <div className="grid grid-cols-3 gap-2.5 p-4 border-b border-slate-100 dark:border-slate-850 text-xxs font-mono">
                <div className="p-2.5 bg-slate-50/50 dark:bg-slate-950/15 border border-slate-100 dark:border-slate-800/80 rounded-lg text-center">
                  <span className="block text-slate-400 font-bold uppercase tracking-wider mb-0.5">ASSIGNED BUGS</span>
                  <span className="text-sm font-black text-slate-850 dark:text-slate-200">{totalCount} open</span>
                </div>
                
                <div className="p-2.5 bg-slate-50/50 dark:bg-slate-950/15 border border-slate-100 dark:border-slate-800/80 rounded-lg text-center">
                  <span className="block text-slate-400 font-bold uppercase tracking-wider mb-0.5">CRITICAL P0</span>
                  <span className={`text-sm font-black ${p0Count > 0 ? 'text-red-500' : 'text-slate-650 dark:text-slate-350'}`}>{p0Count} active</span>
                </div>

                <div className="p-2.5 bg-slate-50/50 dark:bg-slate-950/15 border border-slate-100 dark:border-slate-800/80 rounded-lg text-center">
                  <span className="block text-slate-400 font-bold uppercase tracking-wider mb-0.5">MTTR RESOLVED</span>
                  <span className="text-sm font-black text-slate-850 dark:text-slate-200">{user.workload.avgResolutionHours}h</span>
                </div>
              </div>

              {/* Warnings details */}
              {isOverloaded && (
                <div className="px-5 py-2.5 bg-red-500/5 border-b border-slate-100 dark:border-slate-850 flex items-center gap-2 text-xxs">
                  <ShieldAlert className="text-red-500 shrink-0" size={13} />
                  <span className="font-semibold text-red-500">Resource overloaded. Re-assign open P0s to balance workload.</span>
                </div>
              )}

              {/* Expand Toggle */}
              <div className="px-5 py-3 flex items-center justify-between text-xxs">
                <button
                  onClick={() => setExpandedUserId(expandedUserId === user.id ? null : user.id)}
                  className="font-bold text-brand-600 dark:text-brand-400 hover:text-brand-700 flex items-center gap-1"
                >
                  <span>{expandedUserId === user.id ? 'Hide active issues list' : 'View active issues list'}</span>
                  <ChevronRight size={12} className={expandedUserId === user.id ? 'rotate-90' : ''} />
                </button>
                
                <span className="text-slate-400 font-semibold flex items-center gap-1">
                  <UserCheck size={11} className="text-green-500" />
                  <span>Available for triage</span>
                </span>
              </div>

              {/* Expanded Bug list for specific user */}
              {expandedUserId === user.id && (
                <div className="border-t border-slate-100 dark:border-slate-850 p-4 space-y-2 bg-slate-50/20 dark:bg-slate-950/10">
                  
                  {/* Dynamic Next Best Fix Recommendation for this engineer */}
                  {userBugs.length > 0 && (() => {
                    const sortedBugs = [...userBugs].map(bug => ({
                      bug,
                      score: calculateFixPriority(bug, releases, issues)
                    })).sort((a, b) => b.score - a.score);
                    const topRec = sortedBugs[0];
                    const isWorking = topRec.bug.status === 'In Progress';
                    
                    return (
                      <div className="p-3 bg-purple-500/5 dark:bg-purple-950/15 border border-purple-550/15 rounded-xl space-y-2 mb-3 animate-slide-down">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5 text-[9.5px] font-bold text-purple-700 dark:text-purple-400 uppercase tracking-wider">
                            <Zap size={12} className="fill-purple-500/10 text-purple-600" />
                            <span>Developer Copilot Recommendation</span>
                          </div>
                          <span className="px-1.5 py-0.25 bg-purple-500/15 text-purple-650 dark:text-purple-400 font-mono text-[9px] font-bold rounded">
                            Fix Priority Score: {topRec.score}/100
                          </span>
                        </div>

                        <div className="text-xxs">
                          <h5 
                            onClick={() => onOpenIssueDetail(topRec.bug.id)}
                            className="font-bold text-slate-800 dark:text-slate-205 cursor-pointer hover:underline truncate"
                          >
                            {topRec.bug.id}: {topRec.bug.title}
                          </h5>
                          <p className="text-[9.5px] text-slate-500 dark:text-slate-400 mt-1 italic font-sans leading-relaxed">
                            "AI suggested target: Ranked by severity ({topRec.bug.severity}) and dependency blocker risk index."
                          </p>
                        </div>

                        <div className="flex items-center justify-between pt-1.5 border-t border-purple-500/10 text-[9.5px]">
                          {isWorking ? (
                            <span className="flex items-center gap-1 text-green-500 font-bold uppercase font-mono">
                              <Check size={11} />
                              <span>Active (In Progress)</span>
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                updateIssue(topRec.bug.id, { status: 'In Progress' });
                                alert(`Set status of ${topRec.bug.id} to In Progress. Developer ${user.name} is now resolving this issue.`);
                              }}
                              className="flex items-center gap-1 bg-purple-600 hover:bg-purple-700 text-white font-bold px-2 py-0.5 rounded transition-all active:scale-95 cursor-pointer"
                            >
                              <Play size={8} className="fill-white" />
                              <span>Start working</span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => onOpenIssueDetail(topRec.bug.id)}
                            className="text-slate-450 hover:text-slate-700 hover:underline"
                          >
                            Inspect Details
                          </button>
                        </div>
                      </div>
                    );
                  })()}

                  <h4 className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-2">Bugs assigned to {user.name} ({userBugs.length})</h4>
                  {userBugs.length > 0 ? (
                    <div className="space-y-1.5">
                      {userBugs.map(bug => (
                        <div
                          key={bug.id}
                          onClick={() => onOpenIssueDetail(bug.id)}
                          className="flex items-center justify-between p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg hover:border-slate-350 dark:hover:border-slate-700 cursor-pointer transition-all text-xs"
                        >
                          <div className="flex items-center gap-3">
                            <span className="font-mono font-bold text-slate-400">{bug.id}</span>
                            <span className="font-semibold text-slate-700 dark:text-slate-300 hover:text-brand-600 truncate max-w-[200px] sm:max-w-md">{bug.title}</span>
                          </div>

                          <div className="flex items-center gap-3 font-mono text-xxs">
                            <span className="text-slate-400">[{bug.component}]</span>
                            <span className={`font-semibold ${bug.priority === 'P0' ? 'text-red-500' : 'text-slate-500'}`}>
                              {bug.priority}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xxs text-slate-400 italic">No active bugs assigned. Ready for new triaged cases!</p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

    </div>
  );
};
