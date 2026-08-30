import React, { useState, useEffect } from 'react';
import { useBugFlow } from '../../context/BugFlowContext';
import { ImpactGraph } from '../ImpactGraph/ImpactGraph';
import { 
  ArrowLeft, ArrowRight, Calendar, User, MessageSquare, Tag, Paperclip, 
  Check, Edit3, Trash2, Link, AlertTriangle, Sparkles, CheckCircle2, GitMerge
} from 'lucide-react';
import type { Issue, IssuePriority, IssueSeverity, IssueStatus } from '../../types';
import { aiService } from '../../services/aiService';

interface IssueDetailPageProps {
  issueId: string;
  onBack: () => void;
  onNavigateToIssue: (id: string) => void;
}

export const IssueDetailPage: React.FC<IssueDetailPageProps> = ({ 
  issueId, 
  onBack, 
  onNavigateToIssue 
}) => {
  const { 
    issues, users, releases, updateIssue, addComment, deleteIssue, 
    acceptTriageSuggestions, mergeDuplicate, userRole 
  } = useBugFlow();
  const issue = issues.find(i => i.id === issueId);
  const canEditMetadata = userRole === 'Admin' || userRole === 'Maintainer' || (userRole === 'Developer' && issue?.assigneeId === 'user-tariq');

  // Edit states for left side text areas
  const [isEditingText, setIsEditingText] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [stepsToReproduce, setStepsToReproduce] = useState('');
  const [expectedBehavior, setExpectedBehavior] = useState('');
  const [actualBehavior, setActualBehavior] = useState('');
  const [usersAffected, setUsersAffected] = useState(1);
  const [businessImpact, setBusinessImpact] = useState<'critical' | 'high' | 'medium' | 'low'>('low');

  // Comment input state
  const [commentContent, setCommentContent] = useState('');

  // Label input state
  const [labelInput, setLabelInput] = useState('');

  // Track dismissed duplicate recommendations for active session
  const [dismissedDuplicateIds, setDismissedDuplicateIds] = useState<string[]>([]);

  // AI Triage loading state
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);

  // Issue lifecycle gate input states
  const [prLink, setPrLink] = useState('');
  const [qaResults, setQaResults] = useState('');
  const [resSummary, setResSummary] = useState('');

  const workflowStages: IssueStatus[] = [
    'Reported', 'Triaged', 'Confirmed', 'Assigned', 'In Progress', 
    'Fix Submitted', 'QA Verification', 'Resolved', 'Closed'
  ];

  const stageDescriptions: Record<IssueStatus, string> = {
    'Reported': 'Original details logged, awaiting triage verification.',
    'Triaged': 'Severity and priority recommendations reviewed and confirmed.',
    'Confirmed': 'Reproduce steps validated. Ready for engineering allocation.',
    'Assigned': 'Engineer assigned to ticket, planning implementation branch.',
    'In Progress': 'Developer actively editing code modules and fixing tests.',
    'Fix Submitted': 'Code fix uploaded. Pull Request or Git Commit link recorded.',
    'QA Verification': 'Fix deployed to staging. QA validation and test logs verified.',
    'Resolved': 'Fix approved. Resolution summary and release notes compiled.',
    'Closed': 'Ticket finalized. Code merged to master and shipped to production.'
  };

  const handleAdvanceStage = () => {
    if (!issue) return;
    const currentIdx = workflowStages.indexOf(issue.status);
    const nextStage = workflowStages[currentIdx + 1];
    if (!nextStage) return;

    // Validation Gates
    if (issue.status === 'Confirmed' && !issue.assigneeId) {
      alert('Validation Gate: Please assign an engineer to this issue in the sidebar before advancing to Assigned.');
      return;
    }
    if (issue.status === 'In Progress') {
      if (!prLink.trim()) {
        alert('Validation Gate: Please specify a Git Pull Request link or Commit Hash to verify the fix submission.');
        return;
      }
      addComment(issue.id, `[Stage Gate: Fix Submitted] PR / Commit Link: ${prLink.trim()}`, 'user-tariq');
      setPrLink('');
    }
    if (issue.status === 'Fix Submitted') {
      if (!qaResults.trim()) {
        alert('Validation Gate: Please record QA Test verification logs before advancing to QA Verification.');
        return;
      }
      addComment(issue.id, `[Stage Gate: QA Verification] Test Results: ${qaResults.trim()}`, 'user-tariq');
      setQaResults('');
    }
    if (issue.status === 'QA Verification') {
      if (!resSummary.trim()) {
        alert('Validation Gate: Please compile a final Resolution Summary before resolving this issue.');
        return;
      }
      addComment(issue.id, `[Stage Gate: Resolved] Summary: ${resSummary.trim()}`, 'user-tariq');
      setResSummary('');
    }

    // Update status
    updateIssue(issue.id, { status: nextStage });
  };

  const handleResetStage = () => {
    if (!issue) return;
    if (window.confirm('Reset this issue lifecycle back to Reported? This will reset the workflow stepper.')) {
      updateIssue(issue.id, { status: 'Reported' });
    }
  };

  // Trigger AI analysis on demand
  const triggerAIDiagnostics = async () => {
    if (!issue) return;
    setLoadingAnalysis(true);
    try {
      const analysis = await aiService.generateTriageAnalysis(
        issue.title,
        issue.description || '',
        issue.usersAffected,
        issue.businessImpact,
        issues,
        users
      );
      updateIssue(issue.id, { aiAnalysis: analysis });
    } catch (err) {
      console.error('Failed on demand AI triage:', err);
    } finally {
      setTimeout(() => setLoadingAnalysis(false), 900);
    }
  };

  // Sync state with issue when issueId changes
  useEffect(() => {
    if (issue) {
      setTitle(issue.title);
      setDescription(issue.description || '');
      setStepsToReproduce(issue.stepsToReproduce || '');
      setExpectedBehavior(issue.expectedBehavior || '');
      setActualBehavior(issue.actualBehavior || '');
      setUsersAffected(issue.usersAffected);
      setBusinessImpact(issue.businessImpact);
      setIsEditingText(false);

      // Simulate a quick loading effect when first viewing a New/Triaging issue that has recommendations
      if (issue.aiAnalysis && (issue.status === 'Reported' || issue.status === 'Triaged')) {
        setLoadingAnalysis(true);
        const t = setTimeout(() => setLoadingAnalysis(false), 900);
        return () => clearTimeout(t);
      }
    }
  }, [issueId]);

  if (!issue) {
    return (
      <div className="p-8 text-center text-slate-500">
        <p className="font-semibold">Issue not found: {issueId}</p>
        <button onClick={onBack} className="mt-4 px-4 py-2 bg-brand-600 text-white rounded">Go back</button>
      </div>
    );
  }

  const handleSaveTextChanges = () => {
    updateIssue(issue.id, {
      title,
      description,
      stepsToReproduce,
      expectedBehavior,
      actualBehavior,
      usersAffected,
      businessImpact
    });
    setIsEditingText(false);
  };

  const handleAddCommentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentContent.trim()) return;
    addComment(issue.id, commentContent, 'user-tariq'); // default active user Tariq
    setCommentContent('');
  };

  const handleAddLabel = (e: React.FormEvent) => {
    e.preventDefault();
    if (!labelInput.trim()) return;
    const cleanLabel = labelInput.trim().toLowerCase();
    if (!issue.labels.includes(cleanLabel)) {
      updateIssue(issue.id, {
        labels: [...issue.labels, cleanLabel]
      });
    }
    setLabelInput('');
  };

  const handleRemoveLabel = (labelToRemove: string) => {
    updateIssue(issue.id, {
      labels: issue.labels.filter(l => l !== labelToRemove)
    });
  };

  const handleDelete = () => {
    if (window.confirm(`Delete ${issue.id} permanently? This cannot be undone.`)) {
      deleteIssue(issue.id);
      onBack();
    }
  };

  // Environment options
  const envOptions = ['Production', 'Staging', 'Development', 'All'];

  // Compute possible duplicates for Duplicate Radar
  const duplicateCandidates = aiService.findPossibleDuplicates(
    issue.title,
    issue.description || '',
    issues,
    issue.id
  ).filter(c => !dismissedDuplicateIds.includes(c.issue.id) && c.issue.id !== issue.duplicateOf);

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      
      {/* Detail Header navigation bar */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
        <button 
          onClick={onBack}
          className="flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-slate-850 dark:hover:text-slate-200 transition-colors"
        >
          <ArrowLeft size={16} />
          <span>Back to list</span>
        </button>

        <div className="flex items-center gap-2.5">
          <span className="text-xs font-mono font-bold text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-900 px-2.5 py-1 rounded">
            {issue.id}
          </span>
          {issue.aiAnalysis && (
            <span className="flex items-center gap-1.5 text-[9px] font-bold text-purple-600 dark:text-purple-400 bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 rounded-full uppercase tracking-wider font-mono">
              <Sparkles size={10} className="fill-purple-500/10" />
              <span>AI Analyzed</span>
            </span>
          )}
          <button 
            onClick={handleDelete}
            className="flex items-center gap-1 text-xxs font-bold text-red-500 hover:text-red-700 bg-red-500/10 px-2.5 py-1 rounded border border-red-500/10 transition-all active:scale-95"
            title="Delete this issue permanently"
          >
            <Trash2 size={13} />
            <span>Delete</span>
          </button>
        </div>
      </div>

      {/* Visual Issue Lifecycle Stepper */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 gap-2">
          <div>
            <h3 className="text-xs font-bold text-slate-450 uppercase tracking-widest leading-none">Workflow Pipeline Stepper</h3>
            <p className="text-[10px] text-slate-500 mt-1">Interactive sequential pipeline tracking the complete developer lifecycle.</p>
          </div>
          <span className="px-2 py-0.5 bg-brand-500/10 text-brand-600 dark:text-brand-400 font-mono text-xxs font-bold rounded">
            Stage: {issue.status}
          </span>
        </div>

        {/* Horizontal Pipeline Path */}
        <div className="overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800">
          <div className="flex items-center min-w-[900px] justify-between pt-2">
            {workflowStages.map((stage, idx) => {
              const currentStageIdx = workflowStages.indexOf(issue.status);
              const isActive = idx <= currentStageIdx;
              const isCurrent = idx === currentStageIdx;
              return (
                <div key={stage} className="flex items-center flex-1 last:flex-initial">
                  <div className="flex flex-col items-center relative">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center border-2 transition-all text-[9.5px] font-black ${
                      isCurrent ? 'bg-brand-500 border-brand-600 text-white ring-4 ring-brand-500/20' :
                      isActive ? 'bg-brand-500 border-brand-500 text-white' :
                      'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-400'
                    }`}>
                      {idx + 1}
                    </div>
                    <span className={`text-[8px] font-bold mt-1.5 uppercase tracking-wider ${
                      isCurrent ? 'text-brand-600 dark:text-brand-400 font-black' :
                      isActive ? 'text-slate-705 dark:text-slate-300' :
                      'text-slate-400'
                    }`}>
                      {stage}
                    </span>
                  </div>
                  {idx < workflowStages.length - 1 && (
                    <div className={`h-0.5 flex-1 mx-2 ${
                      idx < currentStageIdx ? 'bg-brand-500' : 'bg-slate-200 dark:bg-slate-800'
                    }`}></div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Current Stage Action Guide & Inputs Gate */}
        <div className="p-4 bg-slate-50 dark:bg-slate-950/20 border border-slate-150 dark:border-slate-850 rounded-xl grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
          <div className="md:col-span-2 space-y-2">
            <span className="block text-[8px] font-bold text-slate-450 uppercase tracking-widest font-sans">Active Lifecycle Gate Info</span>
            <span className="block text-xs font-bold text-slate-850 dark:text-slate-200">
              {issue.status.toUpperCase()} &mdash; {stageDescriptions[issue.status]}
            </span>

            {/* Render Gate Inputs depending on status */}
            {issue.status === 'Confirmed' && !issue.assigneeId && (
              <p className="text-[10px] text-amber-600 font-bold bg-amber-500/10 px-2.5 py-1 rounded w-fit font-sans">
                🚨 Blocker: Please assign an engineer in the sidebar to unlock Assigned stage.
              </p>
            )}

            {issue.status === 'In Progress' && (
              <div className="space-y-1">
                <label className="block text-[9px] font-bold text-slate-400 uppercase">Git Pull Request URL / Commit SHA</label>
                <input
                  type="text"
                  value={prLink}
                  onChange={e => setPrLink(e.target.value)}
                  placeholder="https://github.com/org/repo/pull/42 or d8a12c4"
                  className="w-full max-w-md px-2.5 py-1.5 border border-slate-250 dark:border-slate-800 rounded bg-white dark:bg-slate-900 outline-none text-xxs font-mono text-slate-700 dark:text-slate-350"
                />
              </div>
            )}

            {issue.status === 'Fix Submitted' && (
              <div className="space-y-1">
                <label className="block text-[9px] font-bold text-slate-400 uppercase">QA Test Logs & Verification environment</label>
                <input
                  type="text"
                  value={qaResults}
                  onChange={e => setQaResults(e.target.value)}
                  placeholder="e.g. All test cases passed on staging environment. Verification successful."
                  className="w-full max-w-md px-2.5 py-1.5 border border-slate-250 dark:border-slate-800 rounded bg-white dark:bg-slate-900 outline-none text-xxs text-slate-705 dark:text-slate-300"
                />
              </div>
            )}

            {issue.status === 'QA Verification' && (
              <div className="space-y-1">
                <label className="block text-[9px] font-bold text-slate-450 uppercase">Resolution Summary & Fix Notes</label>
                <textarea
                  value={resSummary}
                  onChange={e => setResSummary(e.target.value)}
                  placeholder="e.g. Fixed Postgres connection deadlock by queuing auth refreshes in redis queue."
                  rows={2}
                  className="w-full max-w-md px-2.5 py-1 border border-slate-250 dark:border-slate-800 rounded bg-white dark:bg-slate-900 outline-none text-xxs text-slate-700 dark:text-slate-300"
                />
              </div>
            )}
          </div>

          {/* Action button triggers */}
          <div className="flex flex-col sm:flex-row md:flex-col items-stretch sm:items-center md:items-end justify-center gap-2 md:col-span-1">
            {(() => {
              const currentIdx = workflowStages.indexOf(issue.status);
              const nextStage = workflowStages[currentIdx + 1];
              return nextStage ? (
                <button
                  type="button"
                  disabled={!canEditMetadata}
                  onClick={handleAdvanceStage}
                  className={`px-4 py-2 text-white text-xxs font-bold rounded-lg flex items-center justify-center gap-1.5 shadow-sm cursor-pointer transition-all active:scale-95 ${
                    canEditMetadata ? 'bg-brand-600 hover:bg-brand-700 font-bold' : 'bg-slate-300 dark:bg-slate-800 text-slate-450 cursor-not-allowed'
                  }`}
                  title={!canEditMetadata ? 'Requires Admin/Maintainer role, or Developer role assigned to this issue.' : undefined}
                >
                  <span>Advance to {nextStage}</span>
                  <ArrowRight size={12} />
                </button>
              ) : (
                <div className="flex items-center gap-1 bg-green-500/10 text-green-500 border border-green-500/15 px-3 py-1.5 rounded-lg text-xxs font-bold uppercase tracking-wider font-mono">
                  <CheckCircle2 size={14} className="text-green-500" />
                  <span>Workflow Completed</span>
                </div>
              );
            })()}

            {workflowStages.indexOf(issue.status) > 0 && (
              <button
                type="button"
                onClick={handleResetStage}
                className="text-[9px] text-slate-400 hover:text-slate-600 hover:underline cursor-pointer"
              >
                Reset back to Reported stage
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Two-Column Panel layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column - Diagnostic reports & details */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Issue Title / Heading area */}
          <div className="space-y-3">
            {isEditingText ? (
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                className="w-full text-lg font-black px-3 py-1.5 border border-brand-500 bg-transparent text-slate-800 dark:text-slate-100 outline-none rounded-lg focus:shadow-md"
              />
            ) : (
              <h2 className="text-lg font-black text-slate-800 dark:text-slate-100 leading-tight">
                {issue.title}
              </h2>
            )}
            
            <div className="flex items-center gap-3 text-xxs text-slate-400">
              <span className="flex items-center gap-1">
                <Calendar size={13} />
                <span>Created {new Date(issue.createdDate).toLocaleDateString()}</span>
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-slate-350 dark:bg-slate-800"></span>
              <span className="flex items-center gap-1">
                <User size={13} />
                <span>Reporter: {users.find(u => u.id === issue.reporterId)?.name || 'Unknown'}</span>
              </span>
            </div>
          </div>

          {/* Description & Reproduction Steps Panel */}
          <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Diagnostic Details</h4>
              <button
                disabled={!canEditMetadata}
                onClick={() => {
                  if (isEditingText) handleSaveTextChanges();
                  else setIsEditingText(true);
                }}
                className={`flex items-center gap-1.5 text-xxs font-bold ${
                  canEditMetadata ? 'text-brand-600 dark:text-brand-400 hover:text-brand-700 cursor-pointer' : 'text-slate-300 dark:text-slate-700 cursor-not-allowed'
                }`}
                title={!canEditMetadata ? 'Requires Admin/Maintainer role, or Developer role assigned to this issue.' : undefined}
              >
                {isEditingText ? (
                  <>
                    <Check size={13} />
                    <span>Save Edits</span>
                  </>
                ) : (
                  <>
                    <Edit3 size={13} />
                    <span>Edit Details</span>
                  </>
                )}
              </button>
            </div>

            <div className="space-y-4 text-xs leading-relaxed text-slate-700 dark:text-slate-300">
              {/* Description */}
              <div>
                <h5 className="font-bold text-slate-800 dark:text-slate-200 mb-1">Issue Description</h5>
                {isEditingText ? (
                  <textarea
                    rows={3}
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    className="w-full px-3 py-1.5 border border-brand-500 bg-transparent text-xs text-slate-800 dark:text-slate-100 outline-none rounded-lg"
                  />
                ) : (
                  <p>{issue.description || <span className="italic text-slate-400">No description provided.</span>}</p>
                )}
              </div>

              {/* Reproduce Steps */}
              <div>
                <h5 className="font-bold text-slate-800 dark:text-slate-200 mb-1">Steps to Reproduce</h5>
                {isEditingText ? (
                  <textarea
                    rows={3}
                    value={stepsToReproduce}
                    onChange={e => setStepsToReproduce(e.target.value)}
                    className="w-full px-3 py-1.5 border border-brand-500 bg-transparent font-mono text-[11px] text-slate-800 dark:text-slate-100 outline-none rounded-lg"
                  />
                ) : (
                  <pre className="font-mono text-[11px] bg-slate-50 dark:bg-slate-950 p-2.5 rounded-lg border border-slate-150 dark:border-slate-850 overflow-x-auto whitespace-pre-wrap">
                    {issue.stepsToReproduce || 'None documented.'}
                  </pre>
                )}
              </div>

              {/* Expected vs Actual behavior */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <h5 className="font-bold text-slate-800 dark:text-slate-200 mb-1 text-green-600 dark:text-green-400">Expected Behavior</h5>
                  {isEditingText ? (
                    <textarea
                      rows={2}
                      value={expectedBehavior}
                      onChange={e => setExpectedBehavior(e.target.value)}
                      className="w-full px-3 py-1.5 border border-brand-500 bg-transparent text-xs text-slate-800 dark:text-slate-100 outline-none rounded-lg"
                    />
                  ) : (
                    <p className="bg-green-500/5 dark:bg-green-500/5 p-2 rounded border border-green-500/10">{issue.expectedBehavior || 'Not defined.'}</p>
                  )}
                </div>
                <div>
                  <h5 className="font-bold text-slate-800 dark:text-slate-200 mb-1 text-red-500 dark:text-red-400">Actual Behavior</h5>
                  {isEditingText ? (
                    <textarea
                      rows={2}
                      value={actualBehavior}
                      onChange={e => setActualBehavior(e.target.value)}
                      className="w-full px-3 py-1.5 border border-brand-500 bg-transparent text-xs text-slate-800 dark:text-slate-100 outline-none rounded-lg"
                    />
                  ) : (
                    <p className="bg-red-500/5 dark:bg-red-500/5 p-2 rounded border border-red-500/10">{issue.actualBehavior || 'Not defined.'}</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Intelligent Triage Cockpit Panel */}
          {loadingAnalysis ? (
            <div className="p-5 bg-gradient-to-r from-purple-500/10 to-brand-500/5 border border-purple-500/20 dark:border-purple-900/10 dark:to-brand-950/10 rounded-xl space-y-4 animate-pulse">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="text-purple-550 dark:text-purple-400 animate-spin" size={16} />
                  <span className="text-xs font-bold text-purple-750 dark:text-purple-400">AI Triage Engine evaluating issue diagnostics...</span>
                </div>
                <span className="text-[10px] text-slate-400 font-mono">Analyzing context...</span>
              </div>
              <div className="space-y-2">
                <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-3/4"></div>
                <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-1/2"></div>
              </div>
            </div>
          ) : issue.aiAnalysis ? (
            <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-4 shadow-sm border-l-4 border-l-purple-500">
              {/* Cockpit Header */}
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <div className="flex items-center justify-center w-5 h-5 rounded bg-purple-500/10 text-purple-650 dark:text-purple-400">
                    <Sparkles size={13} className="fill-purple-500/10" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-850 dark:text-slate-200 uppercase tracking-wider leading-none">AI Intelligent Triage Cockpit</h4>
                    <p className="text-[9px] text-slate-450 mt-1">Comparing machine recommendations against confirmed human decisions.</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="px-2 py-0.5 rounded bg-purple-500/10 text-purple-600 dark:text-purple-400 text-[10px] font-mono font-bold">
                    Confidence: {Math.round((issue.aiAnalysis.confidence || 0.85) * 100)}%
                  </span>
                  <button
                    type="button"
                    disabled={userRole !== 'Admin' && userRole !== 'Maintainer'}
                    onClick={() => acceptTriageSuggestions(issue.id)}
                    className={`px-2.5 py-1 text-xxs font-bold rounded-lg transition-all active:scale-95 shadow-sm cursor-pointer ${
                      (userRole === 'Admin' || userRole === 'Maintainer') ? 'bg-purple-600 hover:bg-purple-700 text-white' : 'bg-slate-300 dark:bg-slate-800 text-slate-450 cursor-not-allowed'
                    }`}
                    title={userRole !== 'Admin' && userRole !== 'Maintainer' ? 'Requires Admin or Maintainer role to accept triage recommendations.' : undefined}
                  >
                    Accept All Recommendations
                  </button>
                </div>
              </div>

              {/* Summary and Next Action */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs bg-slate-50/50 dark:bg-slate-950/20 p-3 rounded-lg border border-slate-150 dark:border-slate-850">
                <div className="space-y-1">
                  <span className="block text-[9px] text-slate-400 font-bold uppercase tracking-wider">AI Synopsis Summary</span>
                  <p className="text-slate-700 dark:text-slate-350 font-medium italic">"{issue.aiAnalysis.summary}"</p>
                </div>
                <div className="space-y-1">
                  <span className="block text-[9px] text-slate-400 font-bold uppercase tracking-wider">Suggested Next Action</span>
                  <p className="text-purple-600 dark:text-purple-400 font-bold">{issue.aiAnalysis.suggestedNextAction || 'Audit logs and trace threads.'}</p>
                </div>
              </div>

              {/* Comparison table */}
              <div className="space-y-0.5">
                {[
                  {
                    label: 'Assignee',
                    current: users.find(u => u.id === issue.assigneeId)?.name || 'Unassigned',
                    suggested: users.find(u => u.id === issue.aiAnalysis?.assigneeSuggestionId)?.name || 'Unassigned',
                    onAccept: () => updateIssue(issue.id, { assigneeId: issue.aiAnalysis?.assigneeSuggestionId }),
                    isEqual: issue.assigneeId === issue.aiAnalysis?.assigneeSuggestionId
                  },
                  {
                    label: 'Severity',
                    current: issue.severity,
                    suggested: issue.aiAnalysis.severitySuggestion,
                    onAccept: () => updateIssue(issue.id, { severity: issue.aiAnalysis?.severitySuggestion }),
                    isEqual: issue.severity === issue.aiAnalysis.severitySuggestion
                  },
                  {
                    label: 'Priority',
                    current: issue.priority,
                    suggested: issue.aiAnalysis.prioritySuggestion,
                    onAccept: () => updateIssue(issue.id, { priority: issue.aiAnalysis?.prioritySuggestion }),
                    isEqual: issue.priority === issue.aiAnalysis.prioritySuggestion
                  },
                  {
                    label: 'Component',
                    current: issue.component,
                    suggested: issue.aiAnalysis.componentSuggestion,
                    onAccept: () => updateIssue(issue.id, { component: issue.aiAnalysis?.componentSuggestion }),
                    isEqual: issue.component === issue.aiAnalysis.componentSuggestion
                  },
                  {
                    label: 'Release Target',
                    current: issue.version,
                    suggested: issue.aiAnalysis.releaseImpactSuggestion ? issue.aiAnalysis.releaseImpactSuggestion.split(' ')[0] : 'v1.2.0',
                    onAccept: () => updateIssue(issue.id, { version: issue.aiAnalysis?.releaseImpactSuggestion ? issue.aiAnalysis.releaseImpactSuggestion.split(' ')[0] : issue.version }),
                    isEqual: issue.version === (issue.aiAnalysis.releaseImpactSuggestion ? issue.aiAnalysis.releaseImpactSuggestion.split(' ')[0] : 'v1.2.0')
                  }
                ].map((row, idx) => (
                  <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between py-2 border-b border-slate-100 dark:border-slate-850 last:border-0 text-xxs">
                    <span className="text-slate-450 font-bold uppercase w-24 shrink-0 mb-1 sm:mb-0">{row.label}</span>
                    <div className="flex-1 flex items-center gap-2.5 min-w-0 pr-4">
                      <span className="text-slate-655 dark:text-slate-350 font-semibold truncate bg-slate-100/70 dark:bg-slate-950/40 px-2 py-0.5 rounded border border-slate-150 dark:border-slate-850">{row.current}</span>
                      <span className="text-slate-300 dark:text-slate-700">➔</span>
                      <span className="text-purple-650 dark:text-purple-400 font-bold truncate bg-purple-500/5 border border-purple-500/10 px-2 py-0.5 rounded flex items-center gap-1 font-mono">
                        <Sparkles size={10} className="shrink-0" />
                        {row.suggested}
                      </span>
                    </div>
                    <div className="mt-1 sm:mt-0">
                      {row.isEqual ? (
                        <span className="text-green-500 font-bold text-[9px] flex items-center gap-1 font-mono uppercase bg-green-500/10 px-2 py-0.5 rounded border border-green-500/10">
                          <Check size={10} /> Confirmed
                        </span>
                      ) : (
                        <button
                          type="button"
                          disabled={userRole !== 'Admin' && userRole !== 'Maintainer'}
                          onClick={row.onAccept}
                          className={`px-2.5 py-0.5 text-[9px] font-bold rounded transition-all active:scale-95 cursor-pointer ${
                            (userRole === 'Admin' || userRole === 'Maintainer')
                              ? 'text-purple-605 dark:text-purple-450 bg-purple-500/10 border border-purple-500/20 hover:bg-purple-500 hover:text-white'
                              : 'text-slate-400 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 cursor-not-allowed'
                          }`}
                          title={userRole !== 'Admin' && userRole !== 'Maintainer' ? 'Requires Admin or Maintainer role to accept recommendations.' : undefined}
                        >
                          Accept
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Duplicate check */}
              {issue.aiAnalysis.duplicateProbability > 0.4 && (
                <div className="flex items-center justify-between p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-lg text-xxs mt-2.5 animate-pulse">
                  <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-semibold">
                    <AlertTriangle size={13} />
                    <span>Duplicate Probability is {Math.round(issue.aiAnalysis.duplicateProbability * 100)}% matching BUG-101.</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => mergeDuplicate(issue.id, 'BUG-101')}
                    className="flex items-center gap-1 bg-amber-600 hover:bg-amber-700 text-white font-bold px-2 py-0.5 rounded transition-all active:scale-95 cursor-pointer"
                  >
                    <GitMerge size={11} />
                    <span>Merge Duplicate</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="p-5 bg-slate-50 dark:bg-slate-900/30 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl text-center space-y-2.5">
              <Sparkles size={20} className="mx-auto text-purple-450 animate-pulse" />
              <div>
                <h5 className="text-xs font-bold text-slate-700 dark:text-slate-350">Run AI Triage Diagnostics</h5>
                <p className="text-[10px] text-slate-450 mt-0.5">Let the AI coprocessor evaluate logs, check duplicate registers, and suggest severities.</p>
              </div>
              <button
                type="button"
                onClick={triggerAIDiagnostics}
                className="bg-brand-600 hover:bg-brand-700 text-white font-bold px-4 py-1.5 rounded-lg text-xxs transition-colors active:scale-95 shadow-sm cursor-pointer"
              >
                Run AI Triage
              </button>
            </div>
          )}

          {/* Duplicate Radar Panel */}
          {duplicateCandidates.length > 0 && (
            <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-4 shadow-sm border-l-4 border-l-amber-500">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
                <div className="flex items-center gap-2">
                  <div className="flex items-center justify-center w-5 h-5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400">
                    <GitMerge size={13} />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-850 dark:text-slate-200 uppercase tracking-wider leading-none">Duplicate Radar Scan</h4>
                    <p className="text-[9px] text-slate-450 mt-1">Cross-referencing technical keywords and component paths to prevent duplicate work.</p>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-650 dark:text-amber-400 text-[9px] font-mono font-bold">
                  {duplicateCandidates.length} Matches Detected
                </span>
              </div>

              <div className="space-y-4">
                {duplicateCandidates.map(candidate => {
                  const barColor = candidate.similarity >= 80 ? 'bg-red-500' : candidate.similarity >= 60 ? 'bg-amber-500' : 'bg-blue-500';
                  const textColor = candidate.similarity >= 80 ? 'text-red-500 font-bold' : candidate.similarity >= 60 ? 'text-amber-500' : 'text-blue-500';
                  
                  return (
                    <div 
                      key={candidate.issue.id}
                      className="p-3 bg-slate-50/50 dark:bg-slate-950/20 border border-slate-150 dark:border-slate-850 rounded-lg space-y-2 text-xxs leading-relaxed font-mono"
                    >
                      <div className="flex items-start justify-between">
                        <div className="min-w-0 flex-1 pr-3 font-sans">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-mono font-bold text-brand-600 dark:text-brand-400 text-xxs">{candidate.issue.id}</span>
                            <span className="text-slate-350">|</span>
                            <span className={`inline-flex items-center px-1.5 py-0.25 rounded text-[9px] font-bold ${
                              candidate.issue.status === 'Resolved' || candidate.issue.status === 'Closed' ? 'bg-green-500/10 text-green-500' : 'bg-blue-500/10 text-blue-500'
                            }`}>
                              {candidate.issue.status}
                            </span>
                          </div>
                          <h5 className="font-bold text-slate-800 dark:text-slate-205 truncate mt-1">{candidate.issue.title}</h5>
                        </div>

                        {/* Similarity indicator */}
                        <div className="text-right shrink-0">
                          <span className={`text-xs font-black font-mono block ${textColor}`}>{candidate.similarity}%</span>
                          <span className="text-[8px] text-slate-400 uppercase tracking-widest font-bold">similarity</span>
                        </div>
                      </div>

                      {/* Visual similarity meter */}
                      <div className="w-full h-1 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div className={`h-full ${barColor} rounded-full`} style={{ width: `${candidate.similarity}%` }}></div>
                      </div>

                      {/* Shared Metadata details */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-slate-100/80 dark:border-slate-850/60 text-[9px] text-slate-500 dark:text-slate-400 font-sans">
                        <div>
                          <span className="block text-slate-400 font-bold uppercase tracking-wider text-[8px] mb-0.5">SHARED COMPONENT</span>
                          <span className="font-semibold text-slate-700 dark:text-slate-300">{candidate.sharedComponent}</span>
                        </div>
                        <div>
                          <span className="block text-slate-400 font-bold uppercase tracking-wider text-[8px] mb-0.5">SHARED ERROR PROFILE</span>
                          <span className="font-semibold text-purple-650 dark:text-purple-400 truncate block" title={candidate.sharedErrorMessage}>{candidate.sharedErrorMessage}</span>
                        </div>
                        <div>
                          <span className="block text-slate-400 font-bold uppercase tracking-wider text-[8px] mb-0.5">SHARED ENVIRONMENT</span>
                          <span className="font-semibold text-slate-700 dark:text-slate-300">{candidate.sharedEnvironment}</span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100/50 dark:border-slate-850/30 font-sans">
                        <button
                          type="button"
                          onClick={() => setDismissedDuplicateIds(prev => [...prev, candidate.issue.id])}
                          className="px-2 py-0.75 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 rounded transition-colors cursor-pointer"
                        >
                          Not a duplicate
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const currentRelated = issue.relatedIssueIds || [];
                            const targetRelated = candidate.issue.relatedIssueIds || [];
                            updateIssue(issue.id, { relatedIssueIds: Array.from(new Set([...currentRelated, candidate.issue.id])) });
                            updateIssue(candidate.issue.id, { relatedIssueIds: Array.from(new Set([...targetRelated, issue.id])) });
                            alert(`Linked ${issue.id} and ${candidate.issue.id} successfully.`);
                          }}
                          className="px-2 py-0.75 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded font-semibold transition-colors cursor-pointer"
                        >
                          Link issues
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm(`Mark ${issue.id} as duplicate of ${candidate.issue.id} and close it?`)) {
                              mergeDuplicate(issue.id, candidate.issue.id);
                            }
                          }}
                          className="px-2.5 py-0.75 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded transition-colors active:scale-95 cursor-pointer shadow-sm"
                        >
                          Mark as duplicate
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Impact Evaluation Section */}
          <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-4">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800 pb-2">Business & User Impact</h4>
            
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono">
              {/* Users Affected */}
              <div className="p-3 bg-slate-50 dark:bg-slate-950/20 border border-slate-100 dark:border-slate-800/80 rounded-lg">
                <span className="block text-[10px] text-slate-400 font-bold mb-0.5">USERS AFFECTED</span>
                {isEditingText ? (
                  <input
                    type="number"
                    value={usersAffected}
                    onChange={e => setUsersAffected(parseInt(e.target.value) || 1)}
                    className="w-full px-1.5 py-0.5 border border-brand-500 bg-transparent text-slate-800 dark:text-slate-100 outline-none rounded font-mono"
                  />
                ) : (
                  <span className="text-sm font-black text-slate-800 dark:text-slate-200">{issue.usersAffected.toLocaleString()}</span>
                )}
              </div>

              {/* Release Risk */}
              <div className="p-3 bg-slate-50 dark:bg-slate-950/20 border border-slate-100 dark:border-slate-800/80 rounded-lg">
                <span className="block text-[10px] text-slate-400 font-bold mb-0.5">RELEASE AFFECTED</span>
                <span className="text-sm font-black text-purple-500">{issue.version || 'vNext'}</span>
              </div>

              {/* Business Impact Level */}
              <div className="p-3 bg-slate-50 dark:bg-slate-950/20 border border-slate-100 dark:border-slate-800/80 rounded-lg">
                <span className="block text-[10px] text-slate-400 font-bold mb-0.5">BUSINESS IMPACT</span>
                {isEditingText ? (
                  <select
                    value={businessImpact}
                    onChange={e => setBusinessImpact(e.target.value as any)}
                    className="w-full bg-transparent border border-brand-500 rounded text-xxs font-mono text-slate-800 dark:text-slate-200 outline-none"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                ) : (
                  <span className={`text-sm font-black capitalize ${
                    issue.businessImpact === 'critical' || issue.businessImpact === 'high' ? 'text-red-500' : 'text-slate-700 dark:text-slate-300'
                  }`}>
                    {issue.businessImpact}
                  </span>
                )}
              </div>

              {/* AI Confidence */}
              <div className="p-3 bg-slate-50 dark:bg-slate-950/20 border border-slate-100 dark:border-slate-800/80 rounded-lg">
                <span className="block text-[10px] text-slate-400 font-bold mb-0.5">AI CONFIDENCE</span>
                <span className="text-sm font-black text-brand-600 dark:text-brand-400">{((issue.confidence || 0.85) * 100).toFixed(0)}%</span>
              </div>
            </div>
          </div>

          {/* SVG Dependency Impact Graph */}
          <ImpactGraph issue={issue} releases={releases} onNavigateToIssue={onNavigateToIssue} />

          {/* Issue Relationships / Duplicates Links / Blockers */}
          <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-3.5">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800 pb-2">Traceability & Relationships</h4>
            
            <div className="space-y-2 text-xs">
              {issue.duplicateOf && (
                <div className="flex items-center gap-2 p-2 bg-amber-500/5 border border-amber-500/10 rounded-lg">
                  <span className="px-1.5 py-0.5 bg-amber-500/10 text-amber-500 font-mono font-bold rounded text-[9px] uppercase">Duplicate Of</span>
                  <button 
                    onClick={() => onNavigateToIssue(issue.duplicateOf!)}
                    className="font-bold text-slate-700 dark:text-slate-300 hover:text-brand-500 hover:underline"
                  >
                    {issue.duplicateOf}
                  </button>
                </div>
              )}

              {issue.regressionOf && (
                <div className="flex items-center gap-2 p-2 bg-purple-500/5 border border-purple-500/10 rounded-lg">
                  <span className="px-1.5 py-0.5 bg-purple-500/10 text-purple-600 dark:text-purple-400 font-mono font-bold rounded text-[9px] uppercase">Regression Of</span>
                  <button
                    onClick={() => onNavigateToIssue(issue.regressionOf!)}
                    className="font-bold text-slate-700 dark:text-slate-300 hover:text-brand-500 hover:underline"
                  >
                    {issue.regressionOf}
                  </button>
                </div>
              )}

              {issue.blockedBy && issue.blockedBy.length > 0 && (
                <div className="p-2.5 bg-red-500/5 border border-red-500/10 rounded-lg space-y-1">
                  <span className="px-1.5 py-0.5 bg-red-500/10 text-red-500 font-mono font-bold rounded text-[9px] uppercase inline-block">Blocked By</span>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {issue.blockedBy.map(blockerId => (
                      <button
                        key={blockerId}
                        onClick={() => onNavigateToIssue(blockerId)}
                        className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold rounded hover:bg-slate-200 transition-colors font-mono"
                      >
                        {blockerId}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {issue.blocks && issue.blocks.length > 0 && (
                <div className="p-2.5 bg-blue-500/5 border border-blue-500/10 rounded-lg space-y-1">
                  <span className="px-1.5 py-0.5 bg-blue-500/10 text-blue-500 font-mono font-bold rounded text-[9px] uppercase inline-block">Blocks Next</span>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {issue.blocks.map(blockedId => (
                      <button
                        key={blockedId}
                        onClick={() => onNavigateToIssue(blockedId)}
                        className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold rounded hover:bg-slate-200 transition-colors font-mono"
                      >
                        {blockedId}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {!issue.duplicateOf && !issue.regressionOf && (!issue.blockedBy || issue.blockedBy.length === 0) && (!issue.blocks || issue.blocks.length === 0) && (
                <p className="text-slate-400 italic py-1">No active relational links or blocking chains tied to this bug.</p>
              )}
            </div>
          </div>

          {/* Attachments Section */}
          <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-3.5">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800 pb-2">Diagnostic Attachments</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xxs font-mono">
              <div className="flex items-center justify-between p-2.5 border border-slate-150 dark:border-slate-800 rounded-lg bg-slate-50/50 dark:bg-slate-950/20">
                <div className="flex items-center gap-2">
                  <Paperclip size={13} className="text-slate-400" />
                  <div>
                    <span className="block font-bold text-slate-700 dark:text-slate-300">sentry_exception_dump.json</span>
                    <span className="text-[10px] text-slate-450">Size: 45 KB</span>
                  </div>
                </div>
                <button className="text-brand-600 font-bold hover:underline">Download</button>
              </div>

              <div className="flex items-center justify-between p-2.5 border border-slate-150 dark:border-slate-800 rounded-lg bg-slate-50/50 dark:bg-slate-950/20">
                <div className="flex items-center gap-2">
                  <Paperclip size={13} className="text-slate-400" />
                  <div>
                    <span className="block font-bold text-slate-700 dark:text-slate-300">postgres_lock_table_dump.log</span>
                    <span className="text-[10px] text-slate-450">Size: 12 KB</span>
                  </div>
                </div>
                <button className="text-brand-600 font-bold hover:underline">Download</button>
              </div>
            </div>
            
            <div className="flex items-center justify-center p-4 border border-dashed border-slate-200 dark:border-slate-800 rounded-lg hover:border-slate-350 dark:hover:border-slate-600 transition-all cursor-pointer">
              <span className="text-xxs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Drag & drop files to attach diagnostic logs</span>
            </div>
          </div>

          {/* Comments Stream Section */}
          <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-4">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800 pb-2 flex items-center gap-2">
              <MessageSquare size={14} />
              <span>Discussion Thread ({issue.comments.length})</span>
            </h4>

            {/* List of comments */}
            <div className="space-y-4">
              {issue.comments.length > 0 ? (
                issue.comments.map(c => {
                  const author = users.find(u => u.id === c.authorId) || { name: 'Developer', avatarUrl: '' };
                  const relativeTime = new Date(c.createdDate).toLocaleDateString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
                  
                  return (
                    <div key={c.id} className="flex gap-3 text-xs bg-slate-50/55 dark:bg-slate-950/20 p-3 rounded-lg border border-slate-100 dark:border-slate-850">
                      <img src={author.avatarUrl} alt={author.name} className="w-8 h-8 rounded-full object-cover ring-1 ring-slate-200 dark:ring-slate-800" />
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-800 dark:text-slate-250">{author.name}</span>
                          <span className="text-[10px] text-slate-400 font-mono">{relativeTime}</span>
                        </div>
                        <p className="text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">{c.content}</p>
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-slate-400 italic text-xs py-2 text-center">No discussion logged. Start the conversation below.</p>
              )}
            </div>

            {/* Add Comment Box */}
            <form onSubmit={handleAddCommentSubmit} className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <textarea
                placeholder="Write your diagnostic reply or investigation update..."
                rows={3}
                required
                value={commentContent}
                onChange={e => setCommentContent(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-transparent text-xs text-slate-800 dark:text-slate-100 outline-none focus:border-brand-500 transition-all font-sans"
              />
              <div className="flex justify-end">
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xxs font-bold text-white bg-brand-600 hover:bg-brand-700 active:scale-95 rounded transition-all shadow-md shadow-brand-500/10"
                >
                  Post Comment
                </button>
              </div>
            </form>
          </div>

          {/* Audit Activity Timeline */}
          <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-4">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800 pb-2">Audit activity timeline</h4>
            <div className="flow-root">
              <ul className="-mb-4">
                {issue.activityTimeline.map((act, idx) => {
                  const actor = users.find(u => u.id === act.userId) || { name: 'Developer' };
                  const formattedTime = new Date(act.createdDate).toLocaleDateString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
                  
                  return (
                    <li key={act.id}>
                      <div className="relative pb-4">
                        {idx !== issue.activityTimeline.length - 1 && (
                          <span className="absolute top-3.5 left-2 -ml-px h-full w-0.5 bg-slate-100 dark:bg-slate-800" aria-hidden="true" />
                        )}
                        <div className="relative flex space-x-2.5 text-[11px] leading-snug">
                          <div className="w-4 h-4 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-[8px] text-slate-500 font-mono shadow-sm">
                            {idx + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-slate-700 dark:text-slate-350">
                              <span className="font-bold text-slate-850 dark:text-slate-200">{actor.name}</span>: {act.details}
                            </p>
                          </div>
                          <div className="text-right text-[10px] whitespace-nowrap text-slate-400 font-mono">
                            {formattedTime}
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

        {/* Right Column - Status, Metadata controls */}
        <div className="space-y-6">
          
          {/* Metadata Settings card */}
          <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-4">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800 pb-2">Issue Metadata</h4>
            
            <div className="space-y-3.5 text-xs">
              {/* Status */}
              <div>
                <label className="block text-[10px] text-slate-400 font-bold uppercase mb-1">Workflow Status</label>
                <select
                  value={issue.status}
                  disabled={!canEditMetadata}
                  onChange={e => updateIssue(issue.id, { status: e.target.value as IssueStatus })}
                  className="w-full px-2 py-1.5 border border-slate-200 dark:border-slate-800 rounded bg-white dark:bg-slate-900 outline-none text-slate-700 dark:text-slate-300 font-medium disabled:opacity-60"
                >
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

              {/* Priority */}
              <div>
                <label className="block text-[10px] text-slate-400 font-bold uppercase mb-1">Priority Tier</label>
                <select
                  value={issue.priority}
                  disabled={!canEditMetadata}
                  onChange={e => updateIssue(issue.id, { priority: e.target.value as IssuePriority })}
                  className="w-full px-2 py-1.5 border border-slate-200 dark:border-slate-800 rounded bg-white dark:bg-slate-900 outline-none text-slate-700 dark:text-slate-300 font-medium disabled:opacity-60"
                >
                  <option value="P0">P0 Critical</option>
                  <option value="P1">P1 High</option>
                  <option value="P2">P2 Medium</option>
                  <option value="P3">P3 Low</option>
                </select>
              </div>

              {/* Severity */}
              <div>
                <label className="block text-[10px] text-slate-400 font-bold uppercase mb-1">System Severity</label>
                <select
                  value={issue.severity}
                  disabled={!canEditMetadata}
                  onChange={e => updateIssue(issue.id, { severity: e.target.value as IssueSeverity })}
                  className="w-full px-2 py-1.5 border border-slate-200 dark:border-slate-800 rounded bg-white dark:bg-slate-900 outline-none text-slate-700 dark:text-slate-300 font-medium disabled:opacity-60"
                >
                  <option value="critical">Critical</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>

              {/* Assignee */}
              <div>
                <label className="block text-[10px] text-slate-400 font-bold uppercase mb-1">Assigned Engineer</label>
                <select
                  value={issue.assigneeId || ''}
                  disabled={userRole === 'Reporter' || userRole === 'Developer'}
                  onChange={e => updateIssue(issue.id, { assigneeId: e.target.value || undefined })}
                  className="w-full px-2 py-1.5 border border-slate-200 dark:border-slate-800 rounded bg-white dark:bg-slate-900 outline-none text-slate-700 dark:text-slate-300 font-medium disabled:opacity-60"
                >
                  <option value="">Unassigned</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
              </div>

              {/* Component */}
              <div>
                <label className="block text-[10px] text-slate-400 font-bold uppercase mb-1">Component Module</label>
                <select
                  value={issue.component}
                  disabled={!canEditMetadata}
                  onChange={e => updateIssue(issue.id, { component: e.target.value })}
                  className="w-full px-2 py-1.5 border border-slate-200 dark:border-slate-800 rounded bg-white dark:bg-slate-900 outline-none text-slate-700 dark:text-slate-300 font-medium disabled:opacity-60"
                >
                  <option value="Authentication">Authentication</option>
                  <option value="Billing">Billing</option>
                  <option value="Database">Database</option>
                  <option value="UI/UX">UI/UX</option>
                  <option value="Core API">Core API</option>
                </select>
              </div>

              {/* Release version */}
              <div>
                <label className="block text-[10px] text-slate-400 font-bold uppercase mb-1">Release Version</label>
                <select
                  value={issue.version}
                  disabled={!canEditMetadata}
                  onChange={e => updateIssue(issue.id, { version: e.target.value })}
                  className="w-full px-2 py-1.5 border border-slate-200 dark:border-slate-800 rounded bg-white dark:bg-slate-900 outline-none text-slate-700 dark:text-slate-300 font-medium disabled:opacity-60"
                >
                  {releases.map(rel => (
                    <option key={rel.id} value={rel.version}>{rel.version}</option>
                  ))}
                </select>
              </div>

              {/* Environment */}
              <div>
                <label className="block text-[10px] text-slate-400 font-bold uppercase mb-1">Diagnostic Environment</label>
                <select
                  value={issue.environment}
                  disabled={!canEditMetadata}
                  onChange={e => updateIssue(issue.id, { environment: e.target.value })}
                  className="w-full px-2 py-1.5 border border-slate-200 dark:border-slate-800 rounded bg-white dark:bg-slate-900 outline-none text-slate-700 dark:text-slate-300 font-medium disabled:opacity-60"
                >
                  {envOptions.map(env => (
                    <option key={env} value={env}>{env}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Labels Manager Card */}
          <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-4">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800 pb-2 flex items-center gap-1.5">
              <Tag size={13} />
              <span>Labels / Tags</span>
            </h4>

            {/* List tags */}
            <div className="flex flex-wrap gap-1.5">
              {issue.labels.map(l => (
                <span 
                  key={l}
                  className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded font-semibold text-xxs group/tag"
                >
                  <span>{l}</span>
                  <button 
                    onClick={() => handleRemoveLabel(l)}
                    className="text-slate-400 hover:text-red-500 ml-0.5 opacity-60 hover:opacity-100"
                    title="Remove label"
                  >
                    &times;
                  </button>
                </span>
              ))}
            </div>

            {/* Add Tag Form */}
            <form onSubmit={handleAddLabel} className="flex gap-2 text-xxs">
              <input
                type="text"
                placeholder="new-label"
                value={labelInput}
                onChange={e => setLabelInput(e.target.value)}
                className="flex-1 px-2.5 py-1 rounded border border-slate-200 dark:border-slate-800 bg-transparent text-slate-800 dark:text-slate-150 outline-none focus:border-brand-500"
              />
              <button
                type="submit"
                className="bg-brand-600 hover:bg-brand-700 text-white font-bold px-3 py-1 rounded"
              >
                Add
              </button>
            </form>
          </div>

          {/* AI Analysis Suggestion box (shows up if AI analysis matches this issue, like in Triaging or New state) */}
          {issue.aiAnalysis && (
            <div className="p-5 bg-gradient-to-br from-purple-500/10 to-brand-500/5 dark:from-purple-900/10 dark:to-brand-950/10 border border-purple-500/20 dark:border-purple-800/40 rounded-xl space-y-3">
              <div className="flex items-center gap-1.5 text-xs font-bold text-purple-700 dark:text-purple-400">
                <AlertTriangle size={15} />
                <span>AI Agent Diagnostic Recommendations</span>
              </div>
              <p className="text-xxs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                {issue.aiAnalysis.reasoning}
              </p>
              <div className="grid grid-cols-2 gap-2 text-[10px] font-mono border-t border-purple-500/10 pt-2.5">
                <div>
                  <span className="block text-slate-450">SEVERITY</span>
                  <span className="font-bold text-purple-650 dark:text-purple-300 uppercase">{issue.aiAnalysis.severitySuggestion}</span>
                </div>
                <div>
                  <span className="block text-slate-450">PRIORITY</span>
                  <span className="font-bold text-purple-650 dark:text-purple-300">{issue.aiAnalysis.prioritySuggestion}</span>
                </div>
                <div>
                  <span className="block text-slate-450">COMPONENT</span>
                  <span className="font-bold text-purple-650 dark:text-purple-300 truncate block">{issue.aiAnalysis.componentSuggestion}</span>
                </div>
                <div>
                  <span className="block text-slate-450">ASSIGNEE</span>
                  <span className="font-bold text-purple-650 dark:text-purple-300 truncate block">
                    {users.find(u => u.id === issue.aiAnalysis?.assigneeSuggestionId)?.name || 'Unassigned'}
                  </span>
                </div>
              </div>
            </div>
          )}

        </div>

      </div>

    </div>
  );
};
