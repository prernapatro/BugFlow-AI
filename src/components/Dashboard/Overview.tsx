import React, { useState } from 'react';
import { useBugFlow } from '../../context/BugFlowContext';
import { calculateFixPriority } from '../../utils/scoring';
import { 
  AlertOctagon, AlertTriangle, Calendar, Clock, ShieldAlert, Zap, 
  ArrowRight, CheckCircle, ShieldCheck, Play, Check
} from 'lucide-react';
import type { Issue } from '../../types';

interface OverviewProps {
  onNavigateToTab: (tab: string) => void;
  onOpenIssueDetail: (issueId: string) => void;
}

export const Overview: React.FC<OverviewProps> = ({ onNavigateToTab, onOpenIssueDetail }) => {
  const { issues, releases, users, updateIssue } = useBugFlow();
  const [selectedFixIndex, setSelectedFixIndex] = useState(0);

  // 1. Metric Calculations
  const totalOpen = issues.filter(i => i.status !== 'Resolved' && i.status !== 'Closed').length;
  const criticalCount = issues.filter(
    i => (i.priority === 'P0' || i.severity === 'critical') && i.status !== 'Resolved' && i.status !== 'Closed'
  ).length;

  // Issues created in the last 7 days (assuming mock dates are relative)
  const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const createdThisWeek = issues.filter(i => new Date(i.createdDate).getTime() > oneWeekAgo).length;

  const avgResolutionTime = '14.5 hours'; // Static aggregate for mock metrics
  
  // Bugs approaching SLA (e.g. priority P0/P1 created > 2 days ago and still open)
  const slaThreshold = Date.now() - 2 * 24 * 60 * 60 * 1000;
  const approachingSLA = issues.filter(
    i => (i.priority === 'P0' || i.priority === 'P1') && 
         i.status !== 'Resolved' && 
         i.status !== 'Closed' && 
         new Date(i.createdDate).getTime() < slaThreshold
  );

  // Release Risk Score (aggregate for the active release)
  const activeRelease = releases.find(r => r.status === 'active');
  const releaseRisk = activeRelease ? activeRelease.riskScore : 0;

  // 2. Next Best Fix list (Top 3 candidate bugs sorted by priority score)
  const nextBestFixes = issues
    .filter(i => i.status !== 'Resolved' && i.status !== 'Closed')
    .map(i => ({
      issue: i,
      score: calculateFixPriority(i, releases, issues)
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  // 3. Needs Attention list (e.g., Unassigned P0/P1 bugs, or SLA approaching bugs)
  const needsAttention = issues.filter(
    i => i.status !== 'Closed' && i.status !== 'Resolved' &&
         (!i.assigneeId || i.priority === 'P0' || approachingSLA.some(sla => sla.id === i.id))
  ).slice(0, 5);

  // 4. Recently updated issues
  const recentlyUpdated = [...issues]
    .sort((a, b) => new Date(b.updatedDate).getTime() - new Date(a.updatedDate).getTime())
    .slice(0, 4);

  // 5. Chart Data Prep (Donut chart & line sparkline)
  // Severity Distribution counts
  const sevCounts = {
    critical: issues.filter(i => i.severity === 'critical' && i.status !== 'Closed').length,
    high: issues.filter(i => i.severity === 'high' && i.status !== 'Closed').length,
    medium: issues.filter(i => i.severity === 'medium' && i.status !== 'Closed').length,
    low: issues.filter(i => i.severity === 'low' && i.status !== 'Closed').length,
  };
  const totalSev = sevCounts.critical + sevCounts.high + sevCounts.medium + sevCounts.low || 1;

  // Donut chart stroke dashes (r=30, circ=188.5)
  const radius = 30;
  const circ = 2 * Math.PI * radius;
  const criticalPct = sevCounts.critical / totalSev;
  const highPct = sevCounts.high / totalSev;
  const mediumPct = sevCounts.medium / totalSev;
  const lowPct = sevCounts.low / totalSev;

  const strokeDashArrayCrit = `${(criticalPct * circ).toFixed(1)} ${circ}`;
  const strokeDashArrayHigh = `${(highPct * circ).toFixed(1)} ${circ}`;
  const strokeDashArrayMed = `${(mediumPct * circ).toFixed(1)} ${circ}`;
  const strokeDashArrayLow = `${(lowPct * circ).toFixed(1)} ${circ}`;

  const offsetCrit = circ;
  const offsetHigh = circ - (criticalPct * circ);
  const offsetMed = circ - ((criticalPct + highPct) * circ);
  const offsetLow = circ - ((criticalPct + highPct + mediumPct) * circ);

  // Sparkline data (bug volume over last 7 days)
  const last7Days = Array.from({ length: 7 }, (_, idx) => {
    const d = new Date(Date.now() - (6 - idx) * 24 * 60 * 60 * 1000);
    return d.toISOString().split('T')[0];
  });

  const dailyCreatedCounts = last7Days.map(dateStr => {
    return issues.filter(i => i.createdDate.startsWith(dateStr)).length;
  });

  const dailyResolvedCounts = last7Days.map(dateStr => {
    return issues.filter(i => i.status === 'Resolved' && i.updatedDate.startsWith(dateStr)).length;
  });

  // Convert sparkline counts to SVG graph coordinates (viewBox 0 0 320 80)
  const maxCount = Math.max(...dailyCreatedCounts, ...dailyResolvedCounts, 4);
  const pointsCreated = dailyCreatedCounts.map((count, idx) => {
    const x = 10 + (idx * 50);
    const y = 70 - (count / maxCount) * 55;
    return `${x},${y}`;
  }).join(' ');

  const pointsResolved = dailyResolvedCounts.map((count, idx) => {
    const x = 10 + (idx * 50);
    const y = 70 - (count / maxCount) * 55;
    return `${x},${y}`;
  }).join(' ');

  return (
    <div className="p-6 space-y-6">
      {/* Page Title Header */}
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-black text-slate-800 dark:text-slate-100 tracking-tight">Overview Dashboard</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">Intelligent system health metrics, risk analysis, and priority items.</p>
      </div>

      {/* Metrics Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
        {/* Total Open */}
        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-xl shadow-sm hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700 transition-all duration-200">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-450">Active Issues</span>
            <AlertTriangle className="text-blue-500" size={16} />
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-black text-slate-850 dark:text-slate-100">{totalOpen}</span>
            <span className="text-[10px] text-slate-400 font-mono">unresolved</span>
          </div>
        </div>

        {/* Critical */}
        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-xl shadow-sm hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700 transition-all duration-200">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-450">Critical P0</span>
            <AlertOctagon className="text-red-500" size={16} />
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-black text-red-500 dark:text-red-400">{criticalCount}</span>
            <span className="text-[9px] text-red-500 dark:text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded font-mono font-bold uppercase tracking-wider">Severe</span>
          </div>
        </div>

        {/* Created This Week */}
        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-xl shadow-sm hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700 transition-all duration-200">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-450">Reported 7d</span>
            <Calendar className="text-amber-500" size={16} />
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-black text-slate-850 dark:text-slate-100">{createdThisWeek}</span>
            <span className="text-[10px] text-green-500 font-semibold font-mono">+{createdThisWeek} new</span>
          </div>
        </div>

        {/* Avg Resolution Time */}
        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-xl shadow-sm hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700 transition-all duration-200">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-450">Mean MTTR</span>
            <Clock className="text-green-500" size={16} />
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-black text-slate-850 dark:text-slate-100">14h</span>
            <span className="text-[10px] text-slate-400 font-mono">avg duration</span>
          </div>
        </div>

        {/* SLA Approaching */}
        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-xl shadow-sm hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700 transition-all duration-200">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-450">SLA Breach</span>
            <ShieldAlert className="text-orange-500" size={16} />
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <span className={`text-2xl font-black ${approachingSLA.length > 0 ? 'text-orange-500' : 'text-slate-850 dark:text-slate-100'}`}>{approachingSLA.length}</span>
            <span className="text-[10px] text-slate-400 font-mono">near limit</span>
          </div>
        </div>

        {/* Release Risk Score */}
        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-xl shadow-sm hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700 transition-all duration-200">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-450">Release Risk</span>
            <Zap className="text-purple-500" size={16} />
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <span className={`text-2xl font-black ${releaseRisk > 60 ? 'text-red-500' : releaseRisk > 30 ? 'text-amber-500' : 'text-green-500'}`}>{releaseRisk}%</span>
            <span className="text-[10px] text-slate-400 font-mono">[{activeRelease?.version || 'N/A'}]</span>
          </div>
        </div>
      </div>

      {/* Main Grid: charts, next best fix, needs attention */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Col 1 & 2: Charts and Next Best Fix */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Charts Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* SVG Trend Chart */}
            <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100">Bug Trends (Last 7 Days)</h4>
                  <p className="text-xxs text-slate-400">Comparing created vs resolved bugs.</p>
                </div>
                <div className="flex gap-2 text-xxs font-mono">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 bg-blue-500 rounded-full"></span>Created</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 bg-green-500 rounded-full"></span>Resolved</span>
                </div>
              </div>
              
              <div className="w-full">
                <svg viewBox="0 0 320 100" className="w-full h-[150px] overflow-visible">
                  {/* Grid Lines */}
                  <line x1="10" y1="15" x2="310" y2="15" stroke="rgba(148, 163, 184, 0.1)" strokeWidth="1" />
                  <line x1="10" y1="42.5" x2="310" y2="42.5" stroke="rgba(148, 163, 184, 0.1)" strokeWidth="1" />
                  <line x1="10" y1="70" x2="310" y2="70" stroke="rgba(148, 163, 184, 0.1)" strokeWidth="1" />

                  {/* Sparklines */}
                  <polyline
                    fill="none"
                    stroke="#3b82f6"
                    strokeWidth="2.5"
                    points={pointsCreated}
                  />
                  <polyline
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="2"
                    strokeDasharray="4 2"
                    points={pointsResolved}
                  />

                  {/* Data Dots for Created */}
                  {pointsCreated.split(' ').map((p, i) => {
                    const [x, y] = p.split(',');
                    return (
                      <g key={`dc-${i}`} className="group/dot">
                        <circle cx={x} cy={y} r="3" fill="#3b82f6" className="cursor-pointer" />
                        <circle cx={x} cy={y} r="6" fill="#3b82f6" fillOpacity="0.2" className="opacity-0 group-hover/dot:opacity-100 transition-opacity" />
                      </g>
                    );
                  })}

                  {/* X Axis Labels */}
                  {last7Days.map((dateStr, idx) => {
                    const x = 10 + (idx * 50);
                    const formattedDate = new Date(dateStr).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
                    return (
                      <text key={`xl-${idx}`} x={x} y="88" textAnchor="middle" className="text-[8px] fill-slate-400 font-mono">
                        {formattedDate}
                      </text>
                    );
                  })}
                </svg>
              </div>
            </div>

            {/* SVG Donut Chart for Severity Distribution */}
            <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
              <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-2">Severity Distribution</h4>
              <div className="flex items-center gap-6 py-1">
                {/* SVG Donut */}
                <div className="relative w-24 h-24">
                  <svg viewBox="0 0 80 80" className="w-full h-full transform -rotate-90">
                    <circle cx="40" cy="40" r="30" fill="transparent" stroke="rgba(148, 163, 184, 0.05)" strokeWidth="10" />
                    
                    {/* Critical slice */}
                    {sevCounts.critical > 0 && (
                      <circle
                        cx="40"
                        cy="40"
                        r="30"
                        fill="transparent"
                        stroke="#EF4444"
                        strokeWidth="10"
                        strokeDasharray={strokeDashArrayCrit}
                        strokeDashoffset={offsetCrit}
                      />
                    )}
                    {/* High slice */}
                    {sevCounts.high > 0 && (
                      <circle
                        cx="40"
                        cy="40"
                        r="30"
                        fill="transparent"
                        stroke="#F97316"
                        strokeWidth="10"
                        strokeDasharray={strokeDashArrayHigh}
                        strokeDashoffset={offsetHigh}
                      />
                    )}
                    {/* Medium slice */}
                    {sevCounts.medium > 0 && (
                      <circle
                        cx="40"
                        cy="40"
                        r="30"
                        fill="transparent"
                        stroke="#3B82F6"
                        strokeWidth="10"
                        strokeDasharray={strokeDashArrayMed}
                        strokeDashoffset={offsetMed}
                      />
                    )}
                    {/* Low slice */}
                    {sevCounts.low > 0 && (
                      <circle
                        cx="40"
                        cy="40"
                        r="30"
                        fill="transparent"
                        stroke="#10B981"
                        strokeWidth="10"
                        strokeDasharray={strokeDashArrayLow}
                        strokeDashoffset={offsetLow}
                      />
                    )}
                  </svg>
                  {/* Center Text */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-lg font-black text-slate-800 dark:text-slate-100">{totalOpen}</span>
                    <span className="text-[8px] uppercase tracking-wider text-slate-400 font-bold">Unresolved</span>
                  </div>
                </div>

                {/* Legend list */}
                <div className="flex-1 space-y-1.5 text-xxs font-mono">
                  <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                    <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-500"></span>Critical</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{sevCounts.critical}</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                    <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-orange-500"></span>High</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{sevCounts.high}</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                    <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-blue-500"></span>Medium</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{sevCounts.medium}</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                    <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-green-500"></span>Low</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{sevCounts.low}</span>
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* Next Best Fix panel */}
          <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5 leading-none">
                  <Zap size={16} className="text-brand-500 fill-brand-500" />
                  <span>Next Best Fix Recommendations</span>
                </h4>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">Copilot engine ranking bug priority based on severity, users, release targets, and dependency depth.</p>
              </div>
              <span className="px-2 py-0.5 text-xxs font-semibold bg-brand-500/10 text-brand-600 dark:text-brand-400 rounded">Coprocessor V2.0</span>
            </div>

            {nextBestFixes.length > 0 ? (() => {
              const activeFix = nextBestFixes[selectedFixIndex] || nextBestFixes[0];
              const bug = activeFix.issue;
              const score = activeFix.score;

              // Dynamically build reasons
              const reasons: string[] = [];
              if (bug.priority === 'P0' || bug.priority === 'P1') reasons.push(`${bug.priority} Priority classification`);
              if (bug.severity === 'critical' || bug.severity === 'high') reasons.push(`Severe system footprint (${bug.severity})`);
              if (bug.usersAffected > 1000) reasons.push(`High user scope impact (${bug.usersAffected.toLocaleString()} users affected)`);
              
              if (bug.version) {
                const rel = releases.find(r => r.version === bug.version);
                if (rel && rel.status === 'active') reasons.push(`Release blocker for active branch ${bug.version}`);
              }
              if (bug.blocks && bug.blocks.length > 0) reasons.push(`Blocks ${bug.blocks.length} dependent issue(s)`);
              if (bug.regressionOf) reasons.push('Regression issue causing pipeline slippage');
              
              const ageDays = Math.round((Date.now() - new Date(bug.createdDate).getTime()) / (1000 * 60 * 60 * 24));
              if (ageDays > 5) reasons.push(`Aging ticket reported ${ageDays} days ago`);
              
              if (reasons.length === 0) reasons.push('Standard platform architecture target');

              // Dynamic Recommended action text
              let recommendedAction = 'Assign to active sprint scope and begin code correction.';
              if (bug.blocks && bug.blocks.length > 0) {
                recommendedAction = `Resolve before ${bug.blocks[0]} because ${bug.blocks[0]} depends on this issue.`;
              } else if (bug.blockedBy && bug.blockedBy.length > 0) {
                const activeBlockers = bug.blockedBy.filter(bId => {
                  const b = issues.find(x => x.id === bId);
                  return b && b.status !== 'Resolved' && b.status !== 'Closed';
                });
                if (activeBlockers.length > 0) {
                  recommendedAction = `Warning: Blocked by ${activeBlockers[0]}. Resolve ${activeBlockers[0]} first to clear dependencies.`;
                }
              }

              const isAssignedToMe = bug.assigneeId === 'user-tariq' && bug.status === 'In Progress';

              return (
                <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
                  
                  {/* Left Column (3/5): Top selected fix details cockpit */}
                  <div className="md:col-span-3 p-4 bg-slate-50 dark:bg-slate-950/40 border border-slate-150 dark:border-slate-850 rounded-xl flex flex-col justify-between space-y-4">
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono font-bold text-brand-600 dark:text-brand-400">{bug.id}</span>
                            <span className="text-[10px] text-slate-400">in {bug.component}</span>
                          </div>
                          <h5 
                            onClick={() => onOpenIssueDetail(bug.id)}
                            className="text-xs font-bold text-slate-850 dark:text-slate-200 mt-1 hover:text-brand-600 cursor-pointer hover:underline truncate"
                          >
                            {bug.title}
                          </h5>
                        </div>

                        {/* Visual score dial */}
                        <div className="text-right shrink-0">
                          <span className={`text-xs font-black font-mono px-2 py-0.5 rounded ${
                            score >= 80 ? 'bg-red-500/10 text-red-500 border border-red-500/15' :
                            score >= 50 ? 'bg-amber-500/10 text-amber-550 border border-amber-550/15' :
                            'bg-blue-500/10 text-blue-500 border border-blue-550/15'
                          }`}>{score}</span>
                          <span className="block text-[8px] text-slate-400 uppercase tracking-widest font-bold mt-1.5 font-sans">Priority score</span>
                        </div>
                      </div>

                      {/* Why contributing list */}
                      <div className="space-y-1.5 text-xxs font-semibold">
                        <span className="block text-[9px] text-slate-400 font-bold uppercase tracking-wider">Why is this recommended?</span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-650 dark:text-slate-350">
                          {reasons.map((reason, rIdx) => (
                            <div key={rIdx} className="flex items-center gap-1.5">
                              <Check size={11} className="text-purple-500 shrink-0" />
                              <span className="truncate">{reason}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Action recommendation */}
                      <div className="p-2.5 bg-purple-500/5 border border-purple-500/10 rounded-lg text-xxs leading-relaxed text-purple-655 dark:text-purple-400 font-mono">
                        <span className="font-bold block uppercase text-[8px] tracking-wider mb-0.5 font-sans">COPILOT ACTION GUIDE</span>
                        "{recommendedAction}"
                      </div>
                    </div>

                    {/* Start Working button action */}
                    <div className="pt-2 border-t border-slate-150 dark:border-slate-850/50 flex items-center justify-between">
                      {isAssignedToMe ? (
                        <span className="flex items-center gap-1.5 px-3 py-1 bg-green-500/10 text-green-500 border border-green-500/15 rounded-lg text-xxs font-bold uppercase tracking-wider font-mono">
                          <CheckCircle size={13} />
                          <span>Currently working on this</span>
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            updateIssue(bug.id, { assigneeId: 'user-tariq', status: 'In Progress' });
                            alert(`Assigned ${bug.id} to Tariq Hill and updated status to In Progress. Happy coding!`);
                          }}
                          className="flex items-center gap-1.5 px-4 py-1.5 bg-brand-600 hover:bg-brand-700 text-white text-xxs font-bold rounded-lg transition-all active:scale-95 shadow-sm cursor-pointer"
                        >
                          <Play size={11} className="fill-white" />
                          <span>Start working on this</span>
                        </button>
                      )}
                      
                      <button
                        type="button"
                        onClick={() => onOpenIssueDetail(bug.id)}
                        className="text-xxs text-slate-450 hover:text-slate-700 dark:hover:text-slate-200 hover:underline"
                      >
                        Inspect Issue Details
                      </button>
                    </div>
                  </div>

                  {/* Right Column (2/5): Alternative Priority Candidates List */}
                  <div className="md:col-span-2 space-y-2">
                    <span className="block text-[9px] text-slate-400 font-bold uppercase tracking-wider mb-2 font-sans">Priority Ranks</span>
                    {nextBestFixes.map(({ issue: candBug, score: candScore }, idx) => {
                      const isSelected = selectedFixIndex === idx;
                      return (
                        <div
                          key={candBug.id}
                          onClick={() => setSelectedFixIndex(idx)}
                          className={`p-3 border rounded-xl cursor-pointer transition-all flex items-center justify-between space-x-3 text-xxs ${
                            isSelected 
                              ? 'border-brand-500 bg-brand-500/5 dark:bg-brand-500/5 ring-1 ring-brand-500/10'
                              : 'border-slate-150 dark:border-slate-850 hover:border-slate-350 dark:hover:border-slate-750 bg-white dark:bg-slate-900'
                          }`}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-mono font-bold text-slate-450">Rank #{idx + 1}</span>
                              <span className="text-slate-300">|</span>
                              <span className="font-mono font-bold text-brand-600 dark:text-brand-400">{candBug.id}</span>
                            </div>
                            <h6 className="font-bold text-slate-705 dark:text-slate-200 truncate mt-1">{candBug.title}</h6>
                          </div>

                          <span className={`px-2 py-0.5 rounded font-mono font-black ${
                            candScore >= 80 ? 'text-red-500 bg-red-500/10' :
                            candScore >= 50 ? 'text-amber-550 bg-amber-500/10' :
                            'text-blue-500 bg-blue-500/10'
                          }`}>{candScore}</span>
                        </div>
                      );
                    })}
                  </div>

                </div>
              );
            })() : (
              <div className="p-6 text-center text-slate-400 bg-slate-50 dark:bg-slate-950/20 rounded-lg">
                <ShieldCheck size={28} className="mx-auto text-green-500 mb-1" />
                <p className="text-xs font-semibold">All clear! No pending fixes recommended.</p>
              </div>
            )}
          </div>

        </div>

        {/* Col 3: Needs Attention & Recent activity */}
        <div className="space-y-6">
          
          {/* Needs Attention Panel */}
          <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-1 flex items-center gap-1.5">
              <AlertTriangle size={15} className="text-orange-500" />
              <span>Needs Attention</span>
            </h4>
            <p className="text-xxs text-slate-500 dark:text-slate-400 mb-3">Critical bugs requiring immediate triage review or action.</p>

            <div className="space-y-2">
              {needsAttention.map(issue => (
                <div
                  key={issue.id}
                  onClick={() => onOpenIssueDetail(issue.id)}
                  className="p-2.5 rounded-lg border border-slate-100 hover:border-slate-200 dark:border-slate-800/80 dark:hover:border-slate-700/80 hover:bg-slate-50 dark:hover:bg-slate-800/30 cursor-pointer transition-all"
                >
                  <div className="flex items-center justify-between text-xxs font-mono">
                    <span className="font-bold text-slate-600 dark:text-slate-400">{issue.id}</span>
                    <span className={`px-1.5 py-0.5 rounded font-semibold ${
                      issue.severity === 'critical' ? 'bg-red-500/10 text-red-500' : 'bg-orange-500/10 text-orange-500'
                    }`}>
                      {issue.severity}
                    </span>
                  </div>
                  <h5 className="text-xs font-semibold text-slate-700 dark:text-slate-300 truncate mt-1">
                    {issue.title}
                  </h5>
                  <div className="flex items-center justify-between mt-2 text-[10px] text-slate-400">
                    <span>{issue.component}</span>
                    <span>{!issue.assigneeId ? '🚨 Unassigned' : 'Assigned'}</span>
                  </div>
                </div>
              ))}
              <button 
                onClick={() => onNavigateToTab('issues')}
                className="w-full py-1.5 text-center text-xxs font-bold text-brand-600 dark:text-brand-400 hover:text-brand-700 hover:underline flex items-center justify-center gap-1"
              >
                <span>View all active issues</span>
                <ArrowRight size={10} />
              </button>
            </div>
          </div>

          {/* Audit Logs / Activity Stream */}
          <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-3 flex items-center gap-1.5">
              <CheckCircle size={15} className="text-slate-400" />
              <span>Project Audit Stream</span>
            </h4>
            <div className="flow-root">
              <ul className="-mb-4">
                {recentlyUpdated.map((issue, idx) => {
                  const lastActivity = issue.activityTimeline[issue.activityTimeline.length - 1];
                  const actor = users.find(u => u.id === lastActivity?.userId) || { name: 'Developer', avatarUrl: '' };
                  const relativeTime = new Date(lastActivity?.createdDate || issue.updatedDate).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
                  
                  return (
                    <li key={issue.id}>
                      <div className="relative pb-4">
                        {idx !== recentlyUpdated.length - 1 && (
                          <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-slate-100 dark:bg-slate-800" aria-hidden="true" />
                        )}
                        <div className="relative flex space-x-3">
                          <div>
                            {actor.avatarUrl ? (
                              <img src={actor.avatarUrl} alt={actor.name} className="h-8 w-8 rounded-full object-cover" />
                            ) : (
                              <span className="h-8 w-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-xxs text-slate-500">D</span>
                            )}
                          </div>
                          <div className="flex-1 min-w-0 pt-0.5">
                            <p className="text-xxs font-bold text-slate-800 dark:text-slate-200">
                              {actor.name}
                            </p>
                            <p className="text-xxs text-slate-500 dark:text-slate-400 mt-0.5">
                              {lastActivity?.details || 'Updated issue parameters'}
                            </p>
                            <button
                              onClick={() => onOpenIssueDetail(issue.id)}
                              className="text-[10px] text-brand-600 dark:text-brand-400 font-mono font-semibold mt-1 hover:underline block"
                            >
                              {issue.id}: {issue.title.slice(0, 30)}...
                            </button>
                          </div>
                          <div className="text-right text-[10px] whitespace-nowrap text-slate-400">
                            {relativeTime}
                          </div>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
