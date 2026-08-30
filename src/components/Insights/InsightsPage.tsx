import React, { useMemo } from 'react';
import { useBugFlow } from '../../context/BugFlowContext';
import { calculateFixPriority } from '../../utils/scoring';
import { 
  BarChart3, Clock, AlertTriangle, ShieldCheck, TrendingUp, 
  Layers, UserMinus, Calendar
} from 'lucide-react';
import type { Issue } from '../../types';

interface InsightsPageProps {
  onOpenIssueDetail: (issueId: string) => void;
}

export const InsightsPage: React.FC<InsightsPageProps> = ({ onOpenIssueDetail }) => {
  const { issues, releases } = useBugFlow();

  // 1. Unresolved Issues List
  const activeIssues = useMemo(() => {
    return issues.filter(i => i.status !== 'Resolved' && i.status !== 'Closed');
  }, [issues]);

  // 2. Bugs by Component (Horizontal Bar Chart)
  const componentDistribution = useMemo(() => {
    const counts: Record<string, number> = {};
    activeIssues.forEach(i => {
      counts[i.component] = (counts[i.component] || 0) + 1;
    });

    const total = activeIssues.length || 1;
    return Object.entries(counts)
      .map(([name, count]) => ({
        name,
        count,
        percentage: Math.round((count / total) * 100)
      }))
      .sort((a, b) => b.count - a.count);
  }, [activeIssues]);

  // 3. Aging Issues Analysis
  // Group bugs by age in days
  const agingGroups = useMemo(() => {
    const now = Date.now();
    const groups = {
      under7d: 0,
      from7to15d: 0,
      from15to30d: 0,
      over30d: 0
    };

    activeIssues.forEach(i => {
      const createdTime = new Date(i.createdDate).getTime();
      const ageDays = (now - createdTime) / (1000 * 60 * 60 * 24);

      if (ageDays >= 30) groups.over30d++;
      else if (ageDays >= 15) groups.from15to30d++;
      else if (ageDays >= 7) groups.from7to15d++;
      else groups.under7d++;
    });

    return groups;
  }, [activeIssues]);

  // 4. SLA Breach Rate Analysis
  // Breach limits: P0 = 1 day, P1 = 3 days, P2 = 7 days, P3 = 14 days
  const slaBreachedIssues = useMemo(() => {
    const now = Date.now();
    
    return activeIssues.filter(i => {
      const createdTime = new Date(i.createdDate).getTime();
      const ageDays = (now - createdTime) / (1000 * 60 * 60 * 24);

      if (i.priority === 'P0' && ageDays > 1) return true;
      if (i.priority === 'P1' && ageDays > 3) return true;
      if (i.priority === 'P2' && ageDays > 7) return true;
      if (i.priority === 'P3' && ageDays > 14) return true;

      return false;
    });
  }, [activeIssues]);

  const slaBreachRate = useMemo(() => {
    if (activeIssues.length === 0) return 0;
    return Math.round((slaBreachedIssues.length / activeIssues.length) * 100);
  }, [activeIssues, slaBreachedIssues]);

  // Max component count for SVG scaling
  const maxCompCount = useMemo(() => {
    if (componentDistribution.length === 0) return 1;
    return Math.max(...componentDistribution.map(c => c.count));
  }, [componentDistribution]);

  return (
    <div className="p-6 space-y-6">
      
      {/* Title Header */}
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-black text-slate-800 dark:text-slate-100 tracking-tight">Team Operations Insights</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">Detailed performance metrics, SLA compliance ratings, and code stability insights.</p>
      </div>

      {/* SLA Breach Banner */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* SLA Audit Metrics Card */}
        <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-xl flex flex-col justify-between shadow-sm">
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">SLA Compliance Rate</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className={`text-3xl font-black ${100 - slaBreachRate < 80 ? 'text-red-500' : 'text-green-500'}`}>
                {100 - slaBreachRate}%
              </span>
              <span className="text-xxs text-slate-450 font-mono">compliant ({activeIssues.length - slaBreachedIssues.length} of {activeIssues.length} bugs)</span>
            </div>
            <p className="text-xxs text-slate-500 mt-2 leading-relaxed">
              Based on target resolution goals: P0 under 24h, P1 under 72h, P2 under 7 days.
            </p>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xxs font-mono">
            <span className="text-slate-400">Breached count</span>
            <span className={`font-bold ${slaBreachedIssues.length > 0 ? 'text-red-500' : 'text-slate-650'}`}>
              {slaBreachedIssues.length} active
            </span>
          </div>
        </div>

        {/* Mean Resolution speed stats */}
        <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-xl flex flex-col justify-between shadow-sm">
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">MTTR Resolution Speed</span>
            <div className="space-y-2 mt-3 font-mono text-xxs text-slate-600 dark:text-slate-400">
              <div className="flex justify-between items-center">
                <span>P0 Critical target</span>
                <span className="font-bold text-red-500">4.5 hours avg</span>
              </div>
              <div className="flex justify-between items-center">
                <span>P1 High target</span>
                <span className="font-bold text-orange-500">12.2 hours avg</span>
              </div>
              <div className="flex justify-between items-center">
                <span>P2 Medium target</span>
                <span className="font-bold text-blue-500">24.5 hours avg</span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xxs font-mono">
            <span className="text-slate-400 flex items-center gap-1"><Clock size={11} />Target Goal</span>
            <span className="font-bold text-green-500">92% Met Rate</span>
          </div>
        </div>

        {/* Reopened vs Fixed Ratio */}
        <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-xl flex flex-col justify-between shadow-sm">
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Regression / Reopened Rate</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-3xl font-black text-slate-800 dark:text-slate-100">4.8%</span>
              <span className="text-xxs text-green-500 font-bold font-mono">Under 5% target limit</span>
            </div>
            <p className="text-xxs text-slate-500 mt-2 leading-relaxed">
              Percentage of issues flagged as regressions or reopened after schema integrations.
            </p>
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xxs font-mono">
            <span className="text-slate-400">Historical Regressions</span>
            <span className="font-bold text-purple-500">2 cases logged</span>
          </div>
        </div>

      </div>

      {/* Detailed analytical charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Component distribution horizontal bar charts */}
        <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
          <div className="flex items-center gap-1.5 mb-4">
            <Layers size={16} className="text-slate-400" />
            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100">Bugs by Code Module (Component)</h4>
          </div>

          <div className="space-y-3.5">
            {componentDistribution.length > 0 ? (
              componentDistribution.map(comp => {
                // Width mapping (e.g. up to 100%)
                const widthPct = Math.round((comp.count / maxCompCount) * 100);
                
                return (
                  <div key={comp.name} className="space-y-1">
                    <div className="flex items-center justify-between text-xxs font-mono text-slate-655 dark:text-slate-400">
                      <span className="font-bold text-slate-700 dark:text-slate-300">{comp.name}</span>
                      <span>{comp.count} issues ({comp.percentage}%)</span>
                    </div>
                    <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-brand-500 rounded-full transition-all duration-300"
                        style={{ width: `${widthPct}%` }}
                      />
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-xs text-slate-450 italic py-6 text-center">No active issue components reported.</p>
            )}
          </div>
        </div>

        {/* Stacked aging chart */}
        <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm space-y-4">
          <div className="flex items-center gap-1.5 border-b border-slate-100 dark:border-slate-850 pb-2">
            <Calendar size={16} className="text-slate-400" />
            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100">Issue Aging Breakdown</h4>
          </div>

          <div className="space-y-3 text-xxs font-mono">
            {/* under 7 days */}
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-slate-600 dark:text-slate-450"><span className="w-2.5 h-2.5 rounded bg-green-500"></span>Newer (&lt; 7 days)</span>
              <span className="font-bold">{agingGroups.under7d} issues</span>
            </div>

            {/* 7-15 days */}
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-slate-600 dark:text-slate-450"><span className="w-2.5 h-2.5 rounded bg-blue-500"></span>Stale (7 to 15 days)</span>
              <span className="font-bold">{agingGroups.from7to15d} issues</span>
            </div>

            {/* 15-30 days */}
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-slate-600 dark:text-slate-450"><span className="w-2.5 h-2.5 rounded bg-orange-500"></span>Aging (15 to 30 days)</span>
              <span className="font-bold">{agingGroups.from15to30d} issues</span>
            </div>

            {/* 30+ days */}
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-slate-600 dark:text-slate-450"><span className="w-2.5 h-2.5 rounded bg-red-500"></span>Overdue (30+ days)</span>
              <span className="font-bold text-red-500">{agingGroups.over30d} issues</span>
            </div>

            {/* Visual ratio bar */}
            <div className="w-full h-4.5 bg-slate-100 dark:bg-slate-800 rounded-lg overflow-hidden flex mt-6">
              {activeIssues.length > 0 ? (
                <>
                  <div className="h-full bg-green-500" style={{ width: `${Math.round((agingGroups.under7d / activeIssues.length) * 100)}%` }} title="<7 days" />
                  <div className="h-full bg-blue-500" style={{ width: `${Math.round((agingGroups.from7to15d / activeIssues.length) * 100)}%` }} title="7-15 days" />
                  <div className="h-full bg-orange-500" style={{ width: `${Math.round((agingGroups.from15to30d / activeIssues.length) * 100)}%` }} title="15-30 days" />
                  <div className="h-full bg-red-500" style={{ width: `${Math.round((agingGroups.over30d / activeIssues.length) * 100)}%` }} title="30+ days" />
                </>
              ) : (
                <div className="w-full h-full bg-slate-200 dark:bg-slate-800" />
              )}
            </div>
          </div>
        </div>

      </div>

      {/* SLA breached list container */}
      <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
        <div className="flex items-center gap-1.5 border-b border-slate-150 dark:border-slate-800 pb-2 mb-3">
          <AlertTriangle size={15} className="text-red-500" />
          <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100">Bugs in SLA Breach State ({slaBreachedIssues.length})</h4>
        </div>

        {slaBreachedIssues.length > 0 ? (
          <div className="space-y-2">
            {slaBreachedIssues.map(bug => (
              <div
                key={bug.id}
                onClick={() => onOpenIssueDetail(bug.id)}
                className="flex items-center justify-between p-2.5 bg-slate-50 hover:bg-slate-100/60 dark:bg-slate-950/20 dark:hover:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-lg cursor-pointer transition-all text-xs"
              >
                <div className="flex items-center gap-3">
                  <span className="font-mono font-bold text-red-500">{bug.id}</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-350 truncate max-w-[280px] sm:max-w-md">{bug.title}</span>
                </div>
                
                <div className="flex items-center gap-3 font-mono text-xxs">
                  <span className="text-slate-400">Priority {bug.priority}</span>
                  <span className="px-2 py-0.5 bg-red-500/10 text-red-500 rounded font-bold uppercase">Breached</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-6 text-center text-slate-400 bg-slate-50 dark:bg-slate-950/20 rounded-lg">
            <ShieldCheck size={28} className="mx-auto text-green-500 mb-1" />
            <p className="text-xs font-semibold">100% SLA Compliance. No breached issues remaining.</p>
          </div>
        )}
      </div>

    </div>
  );
};
