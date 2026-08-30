import React, { useState } from 'react';
import { useBugFlow } from '../../context/BugFlowContext';
import { X, Plus, AlertCircle, GitMerge } from 'lucide-react';
import type { IssuePriority, IssueSeverity, IssueStatus } from '../../types';
import { aiService } from '../../services/aiService';

interface CreateIssueModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CreateIssueModal: React.FC<CreateIssueModalProps> = ({ isOpen, onClose }) => {
  const { createIssue, users, releases, issues } = useBugFlow();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  // Compute duplicate candidates for Duplicate Radar
  const duplicateCandidates = title.trim().length > 6
    ? aiService.findPossibleDuplicates(title, description, issues).filter(c => c.similarity >= 50)
    : [];
  const [component, setComponent] = useState('Core API');
  const [version, setVersion] = useState('v1.2.0');
  const [environment, setEnvironment] = useState('Production');
  const [priority, setPriority] = useState<IssuePriority>('P2');
  const [severity, setSeverity] = useState<IssueSeverity>('medium');
  const [assigneeId, setAssigneeId] = useState('');
  const [usersAffected, setUsersAffected] = useState<number>(1);
  const [businessImpact, setBusinessImpact] = useState<'critical' | 'high' | 'medium' | 'low'>('low');
  const [stepsToReproduce, setStepsToReproduce] = useState('');
  const [expectedBehavior, setExpectedBehavior] = useState('');
  const [actualBehavior, setActualBehavior] = useState('');
  const [labelsInput, setLabelsInput] = useState('');
  
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setSubmitting(true);
    const parsedLabels = labelsInput
      .split(',')
      .map(l => l.trim().toLowerCase())
      .filter(l => l.length > 0);

    try {
      await createIssue({
        title,
        description,
        component,
        version,
        environment,
        priority,
        severity,
        assigneeId: assigneeId || undefined,
        usersAffected,
        businessImpact,
        stepsToReproduce,
        expectedBehavior,
        actualBehavior,
        labels: parsedLabels.length > 0 ? parsedLabels : ['bug'],
        status: 'Reported'
      });

      // Reset
      setTitle('');
      setDescription('');
      setComponent('Core API');
      setVersion('v1.2.0');
      setEnvironment('Production');
      setPriority('P2');
      setSeverity('medium');
      setAssigneeId('');
      setUsersAffected(1);
      setBusinessImpact('low');
      setStepsToReproduce('');
      setExpectedBehavior('');
      setActualBehavior('');
      setLabelsInput('');

      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl overflow-hidden my-8">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20">
          <div className="flex items-center gap-2">
            <AlertCircle className="text-brand-600 dark:text-brand-400" size={20} />
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">File New System Bug</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Title */}
          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 tracking-wider uppercase mb-1">Issue Title *</label>
            <input
              type="text"
              required
              placeholder="e.g. Memory leak in Stripe webhook payment stream handler"
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-transparent text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:border-brand-500 outline-none transition-all"
            />

            {/* Duplicate Radar Warning Alert inside modal flow */}
            {duplicateCandidates.length > 0 && (
              <div className="mt-2.5 p-3.5 bg-amber-500/10 border border-amber-500/25 rounded-lg space-y-2.5 animate-slide-down">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-600 dark:text-amber-400">
                  <GitMerge size={15} />
                  <span>Duplicate Radar Warning: Before creating this issue, we found {duplicateCandidates.length} potentially related issues.</span>
                </div>
                
                <div className="space-y-1.5 font-mono text-xxs">
                  {duplicateCandidates.map(candidate => {
                    const textColor = candidate.similarity >= 80 ? 'text-red-500 font-bold' : candidate.similarity >= 60 ? 'text-amber-550 dark:text-amber-400 font-bold' : 'text-blue-500 font-bold';
                    return (
                      <div key={candidate.issue.id} className="flex items-center justify-between p-2 bg-white/60 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 rounded">
                        <div className="flex items-center gap-2 min-w-0 pr-4">
                          <span className="font-bold text-slate-500">{candidate.issue.id}</span>
                          <span className="text-slate-350">|</span>
                          <span className="text-slate-750 dark:text-slate-305 font-sans truncate">{candidate.issue.title}</span>
                        </div>
                        <span className={`shrink-0 font-bold ${textColor}`}>{candidate.similarity}% Match</span>
                      </div>
                    );
                  })}
                </div>
                <p className="text-[9px] text-slate-450 italic">Please review to prevent duplicate ticketing. You can still proceed if this is a distinct bug.</p>
              </div>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 tracking-wider uppercase mb-1">Description</label>
            <textarea
              rows={3}
              placeholder="Provide a detailed description of the failure mechanism and consequences..."
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-transparent text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:border-brand-500 outline-none transition-all resize-y font-sans"
            />
          </div>

          {/* Environment Parameters Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 tracking-wider uppercase mb-1">Component</label>
              <select
                value={component}
                onChange={e => setComponent(e.target.value)}
                className="w-full px-2.5 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm text-slate-800 dark:text-slate-200 outline-none focus:border-brand-500"
              >
                <option value="Authentication">Authentication</option>
                <option value="Billing">Billing</option>
                <option value="Database">Database</option>
                <option value="UI/UX">UI/UX</option>
                <option value="Core API">Core API</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 tracking-wider uppercase mb-1">Affected Version</label>
              <select
                value={version}
                onChange={e => setVersion(e.target.value)}
                className="w-full px-2.5 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm text-slate-800 dark:text-slate-200 outline-none focus:border-brand-500"
              >
                {releases.map(rel => (
                  <option key={rel.id} value={rel.version}>{rel.version} ({rel.name.slice(0, 15)})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 tracking-wider uppercase mb-1">Environment</label>
              <select
                value={environment}
                onChange={e => setEnvironment(e.target.value)}
                className="w-full px-2.5 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm text-slate-800 dark:text-slate-200 outline-none focus:border-brand-500"
              >
                <option value="Production">Production</option>
                <option value="Staging">Staging</option>
                <option value="Development">Development</option>
                <option value="All">All environments</option>
              </select>
            </div>
          </div>

          {/* Severity & Assignee Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 tracking-wider uppercase mb-1">Priority</label>
              <select
                value={priority}
                onChange={e => setPriority(e.target.value as IssuePriority)}
                className="w-full px-2.5 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm text-slate-800 dark:text-slate-200 outline-none focus:border-brand-500"
              >
                <option value="P0">P0 Critical</option>
                <option value="P1">P1 High</option>
                <option value="P2">P2 Medium</option>
                <option value="P3">P3 Low</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 tracking-wider uppercase mb-1">Severity</label>
              <select
                value={severity}
                onChange={e => setSeverity(e.target.value as IssueSeverity)}
                className="w-full px-2.5 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm text-slate-800 dark:text-slate-200 outline-none focus:border-brand-500"
              >
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 tracking-wider uppercase mb-1">Assignee</label>
              <select
                value={assigneeId}
                onChange={e => setAssigneeId(e.target.value)}
                className="w-full px-2.5 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm text-slate-800 dark:text-slate-200 outline-none focus:border-brand-500"
              >
                <option value="">Leave Unassigned (Triggers AI Suggestions)</option>
                {users.map(u => (
                  <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                ))}
              </select>
            </div>
          </div>

          {/* Impact Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4.5 bg-slate-50 dark:bg-slate-950/20 border border-slate-100 dark:border-slate-850 rounded-xl">
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 tracking-wider uppercase mb-1">Users Affected *</label>
              <input
                type="number"
                min={1}
                required
                value={usersAffected}
                onChange={e => setUsersAffected(parseInt(e.target.value) || 1)}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-transparent text-sm text-slate-800 dark:text-slate-100 outline-none focus:border-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 tracking-wider uppercase mb-1">Business Impact</label>
              <select
                value={businessImpact}
                onChange={e => setBusinessImpact(e.target.value as 'critical' | 'high' | 'medium' | 'low')}
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm text-slate-800 dark:text-slate-200 outline-none focus:border-brand-500"
              >
                <option value="low">Low Impact</option>
                <option value="medium">Medium Impact</option>
                <option value="high">High Revenue Risk</option>
                <option value="critical">Critical Outage / Legal Risk</option>
              </select>
            </div>
          </div>

          {/* Technical Diagnostics */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest border-b border-slate-100 dark:border-slate-850 pb-1 mt-6">Technical Diagnostics</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 tracking-wider uppercase mb-1">Steps to Reproduce</label>
                <textarea
                  rows={3}
                  placeholder="1. Load user drawer&#13;2. Double click avatar..."
                  value={stepsToReproduce}
                  onChange={e => setStepsToReproduce(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-transparent text-xs font-mono text-slate-800 dark:text-slate-100 outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 tracking-wider uppercase mb-1">Expected Behavior</label>
                <textarea
                  rows={3}
                  placeholder="Image should crop and save dynamically."
                  value={expectedBehavior}
                  onChange={e => setExpectedBehavior(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-transparent text-xs text-slate-800 dark:text-slate-100 outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 tracking-wider uppercase mb-1">Actual Behavior</label>
                <textarea
                  rows={3}
                  placeholder="App crashes and logs boundary socket errors."
                  value={actualBehavior}
                  onChange={e => setActualBehavior(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-transparent text-xs text-slate-800 dark:text-slate-100 outline-none focus:border-brand-500"
                />
              </div>
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 tracking-wider uppercase mb-1">Labels / Tags (comma-separated)</label>
            <input
              type="text"
              placeholder="e.g. token-verification, oauth, regression"
              value={labelsInput}
              onChange={e => setLabelsInput(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-transparent text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:border-brand-500 outline-none transition-all"
            />
          </div>

          {/* Submit */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-1.5 px-4.5 py-2 text-sm font-semibold text-white bg-brand-600 hover:bg-brand-700 disabled:bg-brand-500/50 rounded-lg transition-all shadow-md shadow-brand-500/10"
            >
              {submitting ? 'Filing Issue...' : 'File Issue'}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
