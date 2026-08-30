import React, { useState } from 'react';
import { useBugFlow } from '../../context/BugFlowContext';
import type { Release, Issue } from '../../types';
import { 
  Package, Calendar, AlertTriangle, CheckCircle2, ChevronRight, 
  HelpCircle, ShieldAlert, Sparkles, Activity, Clock, Layers, Users, Check
} from 'lucide-react';

interface ReleasesPageProps {
  onOpenIssueDetail: (issueId: string) => void;
  onNavigateToTab: (tab: string) => void;
}

export const ReleasesPage: React.FC<ReleasesPageProps> = ({ onOpenIssueDetail, onNavigateToTab }) => {
  const { releases, issues } = useBugFlow();
  
  // Default select the first active/upcoming release for immediate dashboard demo experience
  const [selectedReleaseVersion, setSelectedReleaseVersion] = useState<string | null>(
    releases.find(r => r.status === 'active')?.version || releases[0]?.version || null
  );

  const selectedRelease = releases.find(r => r.version === selectedReleaseVersion);

  // Helper to drill down issues for a version
  const getReleaseIssues = (version: string) => {
    return issues.filter(i => i.version === version);
  };

  // Helper to calculate dynamic release risk factors and score
  const calculateReleaseRisk = (version: string, status: string, originalScore: number) => {
    if (status === 'released') {
      return {
        score: 0,
        factors: { critical: 0, high: 0, aging: 0, regression: 0, users: 0, dependencies: 0 },
        rankedIssues: []
      };
    }

    const releaseBugs = issues.filter(i => i.version === version);
    const unresolvedBugs = releaseBugs.filter(i => i.status !== 'Resolved' && i.status !== 'Closed');

    const criticalBugs = unresolvedBugs.filter(i => i.severity === 'critical' || i.priority === 'P0');
    const highBugs = unresolvedBugs.filter(i => i.priority === 'P1');
    const regressionBugs = unresolvedBugs.filter(i => i.regressionOf);
    
    // Aging issues: age > 7 days
    const agingBugs = unresolvedBugs.filter(i => {
      const age = (Date.now() - new Date(i.createdDate).getTime()) / (1000 * 60 * 60 * 24);
      return age > 7;
    });

    const totalUsersAffected = unresolvedBugs.reduce((acc, i) => acc + i.usersAffected, 0);
    
    // Blocking dependencies: bugs that block others
    const blockingBugs = unresolvedBugs.filter(i => 
      issues.some(other => other.blockedBy?.includes(i.id))
    );

    // Calculate score components
    const critPoints = criticalBugs.length * 25;
    const highPoints = highBugs.length * 15;
    const agePoints = agingBugs.length * 12;
    const regPoints = regressionBugs.length * 10;
    const userPoints = Math.min(15, Math.round(totalUsersAffected / 1500) * 3);
    const depPoints = blockingBugs.length * 8;

    const totalScore = Math.min(99, critPoints + highPoints + agePoints + regPoints + userPoints + depPoints);

    // Rank issues by individual risk contribution weight
    const rankedIssues = unresolvedBugs.map(bug => {
      const weight = 
        (bug.priority === 'P0' ? 25 : bug.priority === 'P1' ? 15 : 5) + 
        (bug.severity === 'critical' ? 20 : bug.severity === 'high' ? 12 : 5) + 
        (bug.regressionOf ? 10 : 0) + 
        (issues.some(other => other.blockedBy?.includes(bug.id)) ? 8 : 0) + 
        Math.min(15, Math.round(bug.usersAffected / 1000));

      return { bug, weight };
    }).sort((a, b) => b.weight - a.weight);

    return {
      score: totalScore === 0 && unresolvedBugs.length > 0 ? 15 : totalScore, // baseline if bugs exist
      factors: {
        critical: critPoints,
        high: highPoints,
        aging: agePoints,
        regression: regPoints,
        users: userPoints,
        dependencies: depPoints
      },
      rankedIssues
    };
  };

  return (
    <div className="p-6 space-y-6">
      
      {/* Title Header */}
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-black text-slate-800 dark:text-slate-100 tracking-tight leading-none uppercase">Release Risk Intelligence Cockpit</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Cross-referencing codebase dependencies, release status pipelines, and AI-modeled shipping stability risk indexes.</p>
      </div>

      {/* Two Column Master-Detail Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Master Release Selector List */}
        <div className="space-y-4">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Releases Register</h3>
          <div className="space-y-3">
            {releases.map(release => {
              const { score } = calculateReleaseRisk(release.version, release.status, release.riskScore);
              const isSelected = selectedReleaseVersion === release.version;
              
              // Colors
              const isHigh = score >= 60;
              const isMed = score >= 25 && score < 60;
              const riskBadgeColor = release.status === 'released' 
                ? 'bg-green-500/10 text-green-500 border-green-500/10'
                : isHigh ? 'bg-red-500/10 text-red-500 border-red-500/10'
                : isMed ? 'bg-amber-500/10 text-amber-500 border-amber-500/10'
                : 'bg-blue-500/10 text-blue-500 border-blue-500/10';

              return (
                <div
                  key={release.id}
                  onClick={() => setSelectedReleaseVersion(release.version)}
                  className={`p-4 bg-white dark:bg-slate-900 border rounded-xl cursor-pointer transition-all shadow-xs flex flex-col justify-between space-y-2.5 ${
                    isSelected 
                      ? 'border-brand-500 ring-2 ring-brand-500/10 dark:ring-brand-500/20' 
                      : 'border-slate-200 dark:border-slate-850 hover:border-slate-350 dark:hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Package size={16} className={isSelected ? 'text-brand-500' : 'text-slate-400'} />
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-100 font-mono">{release.version}</span>
                    </div>
                    <span className={`px-2 py-0.25 rounded text-[8.5px] font-bold uppercase tracking-wider border ${riskBadgeColor}`}>
                      {release.status === 'released' ? 'shipped' : `${score}% risk`}
                    </span>
                  </div>

                  <div>
                    <h4 className="text-xxs font-bold text-slate-700 dark:text-slate-300 truncate">{release.name}</h4>
                    <span className="text-[9px] text-slate-400 font-mono mt-0.5 block">{release.releaseDate}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Active Release Detail Risk Cockpit */}
        <div className="lg:col-span-2 space-y-5">
          {selectedRelease ? (() => {
            const { score, factors, rankedIssues } = calculateReleaseRisk(
              selectedRelease.version, 
              selectedRelease.status, 
              selectedRelease.riskScore
            );
            const releaseBugs = getReleaseIssues(selectedRelease.version);
            const unresolvedBugs = releaseBugs.filter(i => i.status !== 'Resolved' && i.status !== 'Closed');

            // Timeline calculations
            const stages = ['Development', 'QA', 'Release Candidate', 'Production'];
            let currentStageIdx = 0;
            if (selectedRelease.status === 'planning') currentStageIdx = 0;
            else if (selectedRelease.status === 'active') {
              currentStageIdx = selectedRelease.version.includes('rc') || selectedRelease.version.includes('-') ? 2 : 1;
            } else if (selectedRelease.status === 'released') {
              currentStageIdx = 3;
            }

            // Recommendation calculations
            let recommendationText = 'No active risks detected. Recommended to finalize branch staging merges.';
            if (rankedIssues.length >= 2) {
              const top2Sum = rankedIssues[0].weight + rankedIssues[1].weight;
              const totalWeightSum = rankedIssues.reduce((acc, i) => acc + i.weight, 0);
              const percentage = Math.round((top2Sum / totalWeightSum) * 100);
              recommendationText = `Resolve ${rankedIssues[0].bug.id} and ${rankedIssues[1].bug.id} before release. Together they account for ${percentage}% of current release risk.`;
            } else if (rankedIssues.length === 1) {
              recommendationText = `Resolve ${rankedIssues[0].bug.id} before release. It accounts for 100% of current release risk.`;
            }

            return (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-xl p-5 space-y-6 shadow-sm">
                
                {/* Header */}
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-850 pb-3.5">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-brand-500/10 text-brand-600 dark:text-brand-400 flex items-center justify-center">
                      <Package size={20} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-black text-slate-850 dark:text-slate-100 font-mono leading-none">Release {selectedRelease.version}</h3>
                        <span className={`px-1.5 py-0.25 rounded text-[8px] font-bold uppercase tracking-wider ${
                          selectedRelease.status === 'released' ? 'bg-green-500/10 text-green-500' : 'bg-blue-500/10 text-blue-500'
                        }`}>
                          {selectedRelease.status}
                        </span>
                      </div>
                      <p className="text-xxs text-slate-400 mt-1">{selectedRelease.name}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 text-xxs text-slate-500 font-mono">
                    <Calendar size={13} />
                    <span>Target: {selectedRelease.releaseDate}</span>
                  </div>
                </div>

                {/* Timeline visual representation */}
                <div className="space-y-2">
                  <h4 className="text-[10px] font-bold text-slate-450 uppercase tracking-wider block">Release Stage Pipeline</h4>
                  <div className="relative flex items-center justify-between w-full pt-4 pb-2">
                    <div className="absolute left-0 right-0 h-1 bg-slate-100 dark:bg-slate-850 -translate-y-1/2 top-1/2 z-0"></div>
                    <div 
                      className="absolute left-0 h-1 bg-brand-550 -translate-y-1/2 top-1/2 z-0 transition-all duration-500"
                      style={{ width: `${(currentStageIdx / (stages.length - 1)) * 100}%` }}
                    ></div>
                    {stages.map((stage, idx) => {
                      const isActive = idx <= currentStageIdx;
                      const isCurrent = idx === currentStageIdx;
                      return (
                        <div key={stage} className="flex flex-col items-center z-10 relative">
                          <div className={`w-5 h-5 rounded-full flex items-center justify-center border-2 transition-all text-[9px] font-black ${
                            isCurrent ? 'bg-brand-500 border-brand-600 text-white ring-4 ring-brand-500/20' :
                            isActive ? 'bg-brand-500 border-brand-500 text-white' :
                            'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-400'
                          }`}>
                            {idx + 1}
                          </div>
                          <span className={`text-[8.5px] font-bold mt-2 uppercase tracking-wider ${
                            isCurrent ? 'text-brand-600 dark:text-brand-400' :
                            isActive ? 'text-slate-650 dark:text-slate-300' :
                            'text-slate-400'
                          }`}>
                            {stage}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Score & Gauge Panel */}
                {selectedRelease.status !== 'released' ? (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-4 bg-slate-50/50 dark:bg-slate-950/20 border border-slate-150 dark:border-slate-850 rounded-xl">
                    
                    {/* Circle Risk Gauge */}
                    <div className="flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-slate-200 dark:border-slate-850 pb-4 md:pb-0 pr-0 md:pr-4">
                      <div className="relative w-24 h-24 flex items-center justify-center">
                        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                          <circle cx="50" cy="50" r="40" fill="transparent" stroke="#e2e8f0" className="dark:stroke-slate-800" strokeWidth="8" />
                          <circle
                            cx="50"
                            cy="50"
                            r="40"
                            fill="transparent"
                            stroke={score >= 60 ? '#ef4444' : score >= 25 ? '#f59e0b' : '#10b981'}
                            strokeWidth="8"
                            strokeDasharray={`${2 * Math.PI * 40}`}
                            strokeDashoffset={`${2 * Math.PI * 40 * (1 - score / 100)}`}
                            strokeLinecap="round"
                            className="transition-all duration-1000"
                          />
                        </svg>
                        <div className="absolute text-center">
                          <span className="text-xl font-black text-slate-850 dark:text-slate-100 font-mono leading-none">{score}</span>
                          <span className="block text-[8px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">RISK SCORE</span>
                        </div>
                      </div>
                      <span className={`text-[10px] font-black uppercase tracking-wider font-mono mt-2 ${
                        score >= 60 ? 'text-red-500' : score >= 25 ? 'text-amber-500' : 'text-green-500'
                      }`}>
                        {score >= 60 ? 'HIGH RISK' : score >= 25 ? 'MEDIUM WARNING' : 'STABLE SHIELD'}
                      </span>
                    </div>

                    {/* Risk Factors checklist */}
                    <div className="md:col-span-2 space-y-2.5 font-sans">
                      <h4 className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Why is this release risky?</h4>
                      <div className="grid grid-cols-2 gap-2 text-[9.5px] font-semibold text-slate-600 dark:text-slate-350">
                        <div className="flex items-center justify-between p-1.5 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-850 rounded">
                          <span>Critical Bugs</span>
                          <span className="font-mono font-bold text-slate-700 dark:text-slate-300">+{factors.critical}</span>
                        </div>
                        <div className="flex items-center justify-between p-1.5 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-850 rounded">
                          <span>High Priority</span>
                          <span className="font-mono font-bold text-slate-700 dark:text-slate-300">+{factors.high}</span>
                        </div>
                        <div className="flex items-center justify-between p-1.5 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-850 rounded">
                          <span>Aging Tickets</span>
                          <span className="font-mono font-bold text-slate-700 dark:text-slate-300">+{factors.aging}</span>
                        </div>
                        <div className="flex items-center justify-between p-1.5 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-850 rounded">
                          <span>Regression Bugs</span>
                          <span className="font-mono font-bold text-slate-700 dark:text-slate-300">+{factors.regression}</span>
                        </div>
                        <div className="flex items-center justify-between p-1.5 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-850 rounded">
                          <span>Affected Scope</span>
                          <span className="font-mono font-bold text-slate-700 dark:text-slate-300">+{factors.users}</span>
                        </div>
                        <div className="flex items-center justify-between p-1.5 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-850 rounded">
                          <span>Blockers</span>
                          <span className="font-mono font-bold text-slate-700 dark:text-slate-300">+{factors.dependencies}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 p-4 bg-green-500/10 text-green-500 font-bold border border-green-500/25 rounded-xl text-xxs uppercase tracking-wider font-mono">
                    <CheckCircle2 size={16} />
                    <span>This version has shipped to production environment as stable. Zero active risks.</span>
                  </div>
                )}

                {/* AI Recommendation Alert */}
                {unresolvedBugs.length > 0 && selectedRelease.status !== 'released' && (
                  <div className="p-3 bg-purple-500/10 border border-purple-550/20 rounded-xl flex items-start gap-2 text-xxs leading-relaxed animate-pulse">
                    <Sparkles className="text-purple-500 shrink-0 mt-0.5" size={14} />
                    <div className="space-y-0.5">
                      <span className="font-bold text-purple-700 dark:text-purple-400">Release Risk Coprocessor recommendation</span>
                      <p className="text-purple-650 dark:text-purple-300 font-semibold italic">"{recommendationText}"</p>
                    </div>
                  </div>
                )}

                {/* Top 5 Mapped Risk Issues Table */}
                <div className="space-y-2">
                  <h4 className="text-[10px] font-bold text-slate-450 uppercase tracking-wider block">Top risk-contributing unresolved issues</h4>
                  {rankedIssues.length > 0 ? (
                    <div className="space-y-2">
                      {rankedIssues.slice(0, 5).map(({ bug, weight }, idx) => (
                        <div
                          key={bug.id}
                          onClick={() => onOpenIssueDetail(bug.id)}
                          className="flex items-center justify-between p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl hover:border-slate-350 dark:hover:border-slate-750 cursor-pointer transition-all text-xxs"
                        >
                          <div className="flex items-center gap-3 min-w-0 pr-4">
                            <span className="font-bold text-slate-400 font-mono w-5 shrink-0">{idx + 1}.</span>
                            <span className="font-bold text-slate-500 font-mono shrink-0">{bug.id}</span>
                            <span className="text-slate-350 shrink-0">|</span>
                            <span className="font-bold text-slate-700 dark:text-slate-300 truncate hover:text-brand-600 font-sans">{bug.title}</span>
                          </div>

                          <div className="flex items-center gap-3 font-mono text-[10px] shrink-0">
                            <span className={`px-2 py-0.5 rounded font-bold uppercase tracking-wider ${
                              bug.severity === 'critical' ? 'bg-red-500/10 text-red-500' :
                              bug.severity === 'high' ? 'bg-amber-500/10 text-amber-500' :
                              'bg-slate-100 dark:bg-slate-800 text-slate-500'
                            }`}>
                              {bug.severity}
                            </span>
                            <span className="text-slate-400 font-sans text-xxs">Weight: {weight}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex items-center justify-center p-8 bg-slate-50 dark:bg-slate-950/20 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl text-xxs text-slate-400 italic">
                      No open unresolved bugs mapped to this release branch.
                    </div>
                  )}
                </div>

              </div>
            );
          })() : (
            <div className="flex flex-col items-center justify-center p-12 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-xl h-full space-y-2 text-center text-xs text-slate-400 italic">
              <Package size={28} className="text-slate-300 animate-pulse" />
              <span>Select a release branch version on the left to activate Risk Intelligence modeling.</span>
            </div>
          )}
        </div>

      </div>

    </div>
  );
};
