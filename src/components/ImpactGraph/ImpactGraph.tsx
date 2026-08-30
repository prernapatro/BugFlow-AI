import React, { useState, useEffect } from 'react';
import type { Issue, Release } from '../../types';
import { mockComponents, mockServices } from '../../data/mockData';
import { 
  AlertCircle, Layers, Server, Activity, Users, ArrowRight, 
  GitMerge, HelpCircle, ShieldAlert, Compass, ChevronRight, Check
} from 'lucide-react';
import { useBugFlow } from '../../context/BugFlowContext';

interface ImpactGraphProps {
  issue: Issue;
  releases: Release[];
  onNavigateToIssue?: (id: string) => void;
}

export const ImpactGraph: React.FC<ImpactGraphProps> = ({ 
  issue, 
  releases, 
  onNavigateToIssue 
}) => {
  const { issues } = useBugFlow();

  // Active view toggle: 'path' = Linear pipeline, 'network' = Dependency network
  const [activeView, setActiveView] = useState<'path' | 'network'>('path');
  const [selectedNode, setSelectedNode] = useState<any>(null);

  // Clear selected node when issue changes
  useEffect(() => {
    setSelectedNode(null);
  }, [issue.id]);

  // Find component metadata
  const compMeta = mockComponents.find(c => c.name === issue.component);
  const serviceName = compMeta ? compMeta.serviceName : 'Core Engine Service';
  const serviceMeta = mockServices.find(s => s.name === serviceName);
  const serviceTier = serviceMeta ? serviceMeta.tier : 'tier-1';

  // Find release metadata
  const targetRelease = releases.find(r => r.version === issue.version);
  const releaseStatus = targetRelease ? targetRelease.status : 'planning';

  // 1. Calculate dynamic Impact Score contributing factors
  const severityPoints = 
    issue.severity === 'critical' ? 25 :
    issue.severity === 'high' ? 20 :
    issue.severity === 'medium' ? 15 : 10;

  const userPoints = 
    issue.usersAffected > 10000 ? 30 :
    issue.usersAffected > 1000 ? 20 :
    issue.usersAffected > 100 ? 15 : 10;

  const proximityPoints = 
    releaseStatus === 'active' ? 20 : 10;

  const dependencyCount = 
    (issue.blockedBy?.length || 0) + 
    (issue.relatedIssueIds?.length || 0) +
    (issues.filter(i => i.blockedBy?.includes(issue.id)).length || 0);

  const dependencyPoints = 
    dependencyCount > 2 ? 20 :
    dependencyCount > 0 ? 10 : 5;

  const recurrencePoints = issue.regressionOf ? 15 : 5;

  const calculatedScore = Math.min(100, severityPoints + userPoints + proximityPoints + dependencyPoints + recurrencePoints);

  // 2. Define Linear Path Nodes (Horizontal viewport)
  const linearNodes = [
    {
      id: 'node-issue',
      label: issue.id,
      subtitle: 'Current Bug Ticket',
      title: issue.title,
      color: issue.priority === 'P0' ? '#EF4444' : issue.priority === 'P1' ? '#F97316' : '#3B82F6',
      icon: AlertCircle,
      details: {
        'Status': issue.status,
        'Priority': issue.priority,
        'Severity': issue.severity,
        'Environment': issue.environment,
        'Reported Age': '2 days ago'
      },
      x: 60,
      y: 90
    },
    {
      id: 'node-component',
      label: issue.component,
      subtitle: 'Component Layer',
      title: compMeta?.description || 'Codebase Sub-module',
      color: '#10B981',
      icon: Layers,
      details: {
        'Team Owner': compMeta ? 'Sarah Chen (Platform Eng)' : 'Platform Architecture Team',
        'Affected Files': compMeta ? 'src/auth/session.go, config/redis.json' : 'src/core/main.go',
        'Health Metric': '84% Stability index',
        'SLA Threshold': '24-hour resolution SLA'
      },
      x: 210,
      y: 90
    },
    {
      id: 'node-service',
      label: serviceName,
      subtitle: 'System Microservice',
      title: serviceMeta?.description || 'Core distributed service tier.',
      color: '#8B5CF6',
      icon: Server,
      details: {
        'Deployment Cluster': 'kubernetes-us-east-1',
        'Service Tier': serviceTier.toUpperCase(),
        'Operational Status': 'Operational (Minor Latency Spikes)',
        'Alert Gate': 'Datadog alerts enabled'
      },
      x: 360,
      y: 90
    },
    {
      id: 'node-release',
      label: issue.version || 'v1.2.0',
      subtitle: 'Target Release Version',
      title: targetRelease ? targetRelease.name : 'Target Version',
      color: releaseStatus === 'active' ? '#EC4899' : '#64748B',
      icon: Activity,
      details: {
        'Release Name': targetRelease ? targetRelease.name : 'Upcoming Sprint Patch',
        'Scheduled Deployment': targetRelease ? targetRelease.releaseDate : 'Sept 15, 2026',
        'Status': releaseStatus.toUpperCase(),
        'Blocked Scope Ratio': '12.5% of tasks blocked'
      },
      x: 510,
      y: 90
    },
    {
      id: 'node-users',
      label: `${issue.usersAffected.toLocaleString()} Users`,
      subtitle: 'Affected Scope Limit',
      title: `Potential Impact Level: ${issue.businessImpact.toUpperCase()}`,
      color: issue.businessImpact === 'critical' || issue.businessImpact === 'high' ? '#EF4444' : '#F59E0B',
      icon: Users,
      details: {
        'Impact Metric': issue.businessImpact.toUpperCase(),
        'Affected Accounts': `${issue.usersAffected.toLocaleString()} Active Sessions`,
        'Enterprise Exposure': '4 Platinum Tier customers affected',
        'Revenue at Risk': issue.businessImpact === 'critical' ? 'High exposure probability' : 'Low risk exposure'
      },
      x: 660,
      y: 90
    }
  ];

  // 3. Define Dependency Network Orbiting Nodes (Circular layout)
  const centerNode = {
    id: issue.id,
    label: issue.id,
    subtitle: 'Current Bug (Center)',
    title: issue.title,
    color: '#3B82F6',
    icon: AlertCircle,
    x: 300,
    y: 140,
    isCenter: true,
    details: {
      'Title': issue.title,
      'Severity': issue.severity,
      'Priority': issue.priority,
      'Assignee': 'Sarah Chen'
    }
  };

  const orbitingCandidates: any[] = [];

  // Add blockers (blockedBy)
  if (issue.blockedBy && issue.blockedBy.length > 0) {
    issue.blockedBy.forEach(blockerId => {
      const bIssue = issues.find(i => i.id === blockerId);
      orbitingCandidates.push({
        id: blockerId,
        label: blockerId,
        subtitle: 'Blocking Issue',
        title: bIssue ? bIssue.title : 'Blocks current issue execution',
        color: '#EF4444', // Red for blockers
        icon: ShieldAlert,
        relation: 'Blocked By',
        details: {
          'Impact': 'Prevents work on this bug',
          'Severity': bIssue?.severity || 'high',
          'Status': bIssue?.status || 'Open'
        }
      });
    });
  }

  // Add dependents (bugs blocked by this one)
  const dependents = issues.filter(i => i.blockedBy?.includes(issue.id));
  dependents.forEach(dep => {
    orbitingCandidates.push({
      id: dep.id,
      label: dep.id,
      subtitle: 'Dependent Bug',
      title: dep.title,
      color: '#F97316', // Orange for dependents
      icon: AlertCircle,
      relation: 'Blocks',
      details: {
        'Impact': 'Current bug blocks this ticket',
        'Severity': dep.severity,
        'Status': dep.status
      }
    });
  });

  // Add regression source
  if (issue.regressionOf) {
    const rIssue = issues.find(i => i.id === issue.regressionOf);
    orbitingCandidates.push({
      id: issue.regressionOf,
      label: issue.regressionOf,
      subtitle: 'Regression Source',
      title: rIssue ? rIssue.title : 'Triggered by regression',
      color: '#F59E0B', // Amber for regression
      icon: Compass,
      relation: 'Regression Of',
      details: {
        'Impact': 'Caused by code change in this bug',
        'Status': rIssue?.status || 'Resolved'
      }
    });
  }

  // Add similar issues
  const relatedList = issue.relatedIssueIds || [];
  relatedList.forEach(relId => {
    if (!orbitingCandidates.some(c => c.id === relId)) {
      const rIssue = issues.find(i => i.id === relId);
      orbitingCandidates.push({
        id: relId,
        label: relId,
        subtitle: 'Related Issue',
        title: rIssue ? rIssue.title : 'Similar symptoms reported',
        color: '#8B5CF6', // Purple for related
        icon: GitMerge,
        relation: 'Related',
        details: {
          'Similarity': 'High context overlap',
          'Status': rIssue?.status || 'Confirmed'
        }
      });
    }
  });

  if (orbitingCandidates.length === 0) {
    orbitingCandidates.push({
      id: 'target-platform',
      label: 'Platform Core',
      subtitle: 'System Dependency',
      title: 'Infrastructure API Layer Node',
      color: '#64748B',
      icon: Server,
      relation: 'Runs On',
      details: {
        'Infrastructure': 'Docker Cluster',
        'Memory Footprint': 'Minimal'
      }
    });
    orbitingCandidates.push({
      id: 'target-client',
      label: 'Web Client',
      subtitle: 'User Interface',
      title: 'Vite React Desktop shell',
      color: '#64748B',
      icon: Compass,
      relation: 'Exposes to',
      details: {
        'Platform': 'Web Browsers',
        'Viewport': 'Responsive grid'
      }
    });
  }

  const totalOrbit = orbitingCandidates.length;
  const networkNodes = [
    centerNode,
    ...orbitingCandidates.map((cand, idx) => {
      const angle = (idx * 2 * Math.PI) / totalOrbit;
      const radiusX = 170;
      const radiusY = 90;
      return {
        ...cand,
        x: 300 + Math.cos(angle) * radiusX,
        y: 140 + Math.sin(angle) * radiusY
      };
    })
  ];

  const handleNodeClick = (node: any) => {
    setSelectedNode(node);
  };

  const activeNodesList = activeView === 'path' ? linearNodes : networkNodes;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      
      {/* Left 2 Columns: Visual Node Graph */}
      <div className="lg:col-span-2 p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl flex flex-col justify-between shadow-sm">
        <div>
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
            <div>
              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-widest leading-none">System Impact Path & Dependencies</h4>
              <p className="text-[10px] text-slate-550 dark:text-slate-400 mt-1">Trace code propagation pathways or navigate related ticket linkages.</p>
            </div>
            
            <div className="flex bg-slate-100 dark:bg-slate-950 p-0.75 rounded-lg border border-slate-200/50 dark:border-slate-800/80 text-[10px] font-bold">
              <button
                type="button"
                onClick={() => { setActiveView('path'); setSelectedNode(null); }}
                className={`px-3 py-1 rounded-md transition-colors cursor-pointer ${
                  activeView === 'path' 
                    ? 'bg-white dark:bg-slate-900 text-slate-850 dark:text-slate-200 shadow-xs' 
                    : 'text-slate-450 hover:text-slate-800 dark:hover:text-slate-250'
                }`}
              >
                Linear Impact Path
              </button>
              <button
                type="button"
                onClick={() => { setActiveView('network'); setSelectedNode(null); }}
                className={`px-3 py-1 rounded-md transition-colors cursor-pointer ${
                  activeView === 'network' 
                    ? 'bg-white dark:bg-slate-900 text-slate-850 dark:text-slate-200 shadow-xs' 
                    : 'text-slate-450 hover:text-slate-800 dark:hover:text-slate-250'
                }`}
              >
                Dependency Network
              </button>
            </div>
          </div>
        </div>

        <div className="relative overflow-x-auto select-none bg-slate-50/20 dark:bg-slate-950/10 rounded-xl border border-slate-100 dark:border-slate-850/40 p-4">
          <svg 
            viewBox={activeView === 'path' ? "0 0 740 180" : "0 0 600 280"} 
            className={`mx-auto block overflow-visible ${activeView === 'path' ? 'w-[740px] h-[180px]' : 'w-full max-w-[600px] h-[280px]'}`}
          >
            <defs>
              <marker id="arrow" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
                <path d="M 0 1.5 L 10 5 L 0 8.5 z" fill="#CBD5E1" className="dark:fill-slate-850" />
              </marker>
              <marker id="arrow-glow" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
                <path d="M 0 1.5 L 10 5 L 0 8.5 z" fill="#5175ff" />
              </marker>
            </defs>

            {activeView === 'path' ? (
              linearNodes.map((node, idx) => {
                if (idx === linearNodes.length - 1) return null;
                const nextNode = linearNodes[idx + 1];
                const isCriticalPath = issue.priority === 'P0' || issue.priority === 'P1';
                
                return (
                  <g key={`link-${idx}`}>
                    <line
                      x1={node.x}
                      y1={node.y}
                      x2={nextNode.x}
                      y2={nextNode.y}
                      stroke={isCriticalPath ? '#5175ff' : '#E2E8F0'}
                      strokeWidth={isCriticalPath ? 2.5 : 2}
                      strokeDasharray={isCriticalPath ? '5,5' : '0'}
                      className="dark:stroke-slate-800"
                      markerEnd={isCriticalPath ? 'url(#arrow-glow)' : 'url(#arrow)'}
                    />
                    {isCriticalPath && (
                      <line
                        x1={node.x}
                        y1={node.y}
                        x2={nextNode.x}
                        y2={nextNode.y}
                        stroke="#84a2ff"
                        strokeWidth={1.5}
                        strokeDasharray="6,12"
                        className="animate-[dash_1.5s_linear_infinite]"
                      />
                    )}
                  </g>
                );
              })
            ) : (
              networkNodes.slice(1).map((node, idx) => (
                <g key={`link-${idx}`}>
                  <line
                    x1={centerNode.x}
                    y1={centerNode.y}
                    x2={node.x}
                    y2={node.y}
                    stroke={node.color}
                    strokeWidth={2}
                    strokeDasharray="4,4"
                    opacity={0.6}
                    className="dark:opacity-40"
                  />
                </g>
              ))
            )}

            {activeNodesList.map((node) => {
              const Icon = node.icon;
              const isSelected = selectedNode?.id === node.id;
              
              return (
                <g 
                  key={node.id} 
                  onClick={() => handleNodeClick(node)}
                  className="cursor-pointer group/node"
                >
                  {isSelected && (
                    <circle
                      cx={node.x}
                      cy={node.y}
                      r={30}
                      fill="none"
                      stroke={node.color}
                      strokeWidth={1.5}
                      className="animate-ping opacity-35"
                    />
                  )}
                  
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r={isSelected ? 25 : 21}
                    fill="white"
                    className="dark:fill-slate-950 stroke-slate-200 dark:stroke-slate-800"
                    strokeWidth={isSelected ? 3.5 : 2.5}
                  />

                  <circle
                    cx={node.x}
                    cy={node.y}
                    r={isSelected ? 19 : 16}
                    fill={`${node.color}15`}
                    stroke={node.color}
                    strokeWidth={2}
                    className="group-hover/node:scale-110 transition-transform duration-200"
                  />

                  <g transform={`translate(${node.x - 8}, ${node.y - 8})`}>
                    <Icon size={16} stroke={node.color} />
                  </g>

                  <text
                    x={node.x}
                    y={node.y + (isSelected ? 35 : 31)}
                    textAnchor="middle"
                    className="text-[10px] font-bold fill-slate-800 dark:fill-slate-200 font-mono"
                  >
                    {node.label}
                  </text>

                  <text
                    x={node.x}
                    y={node.y + (isSelected ? 46 : 42)}
                    textAnchor="middle"
                    className="text-[8.5px] fill-slate-500 dark:fill-slate-400 font-sans"
                  >
                    {node.subtitle}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        <div className="mt-4 p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-850 rounded-lg min-h-[70px]">
          {selectedNode ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: selectedNode.color }}></span>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 font-mono">{selectedNode.label}</span>
                  <span className="text-[10px] text-slate-400 font-semibold uppercase font-sans">({selectedNode.subtitle})</span>
                </div>
                
                {selectedNode.id.startsWith('BUG-') && selectedNode.id !== issue.id && onNavigateToIssue && (
                  <button
                    type="button"
                    onClick={() => onNavigateToIssue(selectedNode.id)}
                    className="flex items-center gap-1 px-2.5 py-0.5 bg-brand-600 hover:bg-brand-700 text-white text-[10px] font-bold rounded shadow-xs active:scale-95 transition-all cursor-pointer"
                  >
                    <span>Inspect Ticket</span>
                    <ChevronRight size={11} />
                  </button>
                )}
              </div>
              <p className="text-xxs text-slate-600 dark:text-slate-350 leading-relaxed font-semibold">"{selectedNode.title}"</p>
              
              {selectedNode.details && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[9px] pt-1.5 border-t border-slate-100 dark:border-slate-850/50">
                  {Object.entries(selectedNode.details).map(([key, val]) => (
                    <div key={key}>
                      <span className="block text-slate-400 font-bold uppercase tracking-wider">{key}</span>
                      <span className="text-slate-700 dark:text-slate-300 font-semibold">{val as string}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center h-[54px] text-xxs text-slate-450 italic gap-2">
              <Compass size={15} className="animate-pulse" />
              <span>Click on any node in the graph above to trace operational dependencies and scope details.</span>
            </div>
          )}
        </div>
      </div>

      {/* Right Column: Score Breakdown Panel */}
      <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-4 shadow-sm flex flex-col justify-between">
        <div className="space-y-4">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-widest">Consequence Impact Score</h4>
            <p className="text-[10px] text-slate-550 dark:text-slate-400 mt-1">Calculates severity risk index scaling from 0 to 100.</p>
          </div>

          <div className="flex items-center justify-center py-2 relative">
            <svg className="w-28 h-28 transform -rotate-90" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="40"
                fill="transparent"
                stroke="#e2e8f0"
                className="dark:stroke-slate-800"
                strokeWidth="10"
              />
              <circle
                cx="50"
                cy="50"
                r="40"
                fill="transparent"
                stroke={calculatedScore >= 80 ? '#ef4444' : calculatedScore >= 60 ? '#f59e0b' : '#3b82f6'}
                strokeWidth="10"
                strokeDasharray={`${2 * Math.PI * 40}`}
                strokeDashoffset={`${2 * Math.PI * 40 * (1 - calculatedScore / 100)}`}
                strokeLinecap="round"
                className="transition-all duration-1000"
              />
            </svg>
            <div className="absolute text-center">
              <span className="text-2xl font-black text-slate-850 dark:text-slate-100 font-mono leading-none">{calculatedScore}</span>
              <span className="block text-[8px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">INDEX SCORE</span>
            </div>
          </div>

          <div className="space-y-2.5">
            <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Contributing Risk Factors</h5>
            <div className="space-y-2 text-xxs font-semibold font-sans">
              
              <div className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-850/60 rounded-lg">
                <div className="flex items-center gap-2">
                  <Check size={12} className="text-green-500" />
                  <span>Severity Factor ({issue.severity})</span>
                </div>
                <span className="font-mono font-bold text-slate-700 dark:text-slate-300">+{severityPoints} pts</span>
              </div>

              <div className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-850/60 rounded-lg">
                <div className="flex items-center gap-2">
                  <Check size={12} className="text-green-500" />
                  <span>Affected Users ({issue.usersAffected.toLocaleString()})</span>
                </div>
                <span className="font-mono font-bold text-slate-700 dark:text-slate-300">+{userPoints} pts</span>
              </div>

              <div className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-850/60 rounded-lg">
                <div className="flex items-center gap-2">
                  <Check size={12} className="text-green-500" />
                  <span>Release Proximity Target</span>
                </div>
                <span className="font-mono font-bold text-slate-700 dark:text-slate-300">+{proximityPoints} pts</span>
              </div>

              <div className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-850/60 rounded-lg">
                <div className="flex items-center gap-2">
                  <Check size={12} className="text-green-500" />
                  <span>Dependency Count ({dependencyCount})</span>
                </div>
                <span className="font-mono font-bold text-slate-700 dark:text-slate-300">+{dependencyPoints} pts</span>
              </div>

              <div className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-850/60 rounded-lg">
                <div className="flex items-center gap-2">
                  <Check size={12} className="text-green-500" />
                  <span>Regression Recurrence</span>
                </div>
                <span className="font-mono font-bold text-slate-700 dark:text-slate-300">+{recurrencePoints} pts</span>
              </div>

            </div>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 text-[10px] text-center leading-relaxed text-slate-500 dark:text-slate-400 font-sans italic bg-purple-500/5 dark:bg-purple-950/10 border border-dashed border-purple-500/25 p-2 rounded-lg">
          "This issue represents an active blocker with consequences across the pipeline, impacting releases and customers."
        </div>
      </div>

    </div>
  );
};
