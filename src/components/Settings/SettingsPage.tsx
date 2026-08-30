import React, { useState } from 'react';
import { useBugFlow } from '../../context/BugFlowContext';
import { 
  Settings, ShieldCheck, RefreshCw, Bell, Sparkles, 
  Database, Info, AlertOctagon, ShieldAlert, Trash2, Key, User, Clock
} from 'lucide-react';
import type { UserRole } from '../../types';

export const SettingsPage: React.FC = () => {
  const { 
    userRole, setUserRole, auditLogs, clearAuditLogs 
  } = useBugFlow();

  // Project details state
  const [projName, setProjName] = useState('BugFlow AI Command Center');
  const [projKey, setProjKey] = useState('BUG');
  const [projDesc, setProjDesc] = useState('Intelligent Developer Bug Observability Command Center for team performance analysis.');

  // Notification state
  const [notifySlack, setNotifySlack] = useState(true);
  const [notifySentry, setNotifySentry] = useState(true);
  const [notifyEmail, setNotifyEmail] = useState(false);

  // Workflow auto-triage state
  const [autoTriage, setAutoTriage] = useState(true);
  const [dupThreshold, setDupThreshold] = useState(70);

  // Reset database callback
  const handleResetData = () => {
    if (window.confirm('Warning: This will wipe all changes, comment threads, and custom bugs from localStorage, and re-seed the system. Proceed?')) {
      localStorage.clear();
      window.location.reload();
    }
  };

  const roleDescriptions: Record<UserRole, string> = {
    'Admin': 'Full system authority: Create, edit, delete, assign, accept AI recommendations, and recalculate release targets.',
    'Maintainer': 'Manage issues & releases: Assign issues, confirm triage, link duplicates, adjust releases. Cannot delete tickets.',
    'Developer': 'Edit assigned issues: Start work on assigned cases, submit pull request links, log QA logs, and write notes.',
    'Reporter': 'Log & comment: Create new issues and post discussion comments. Cannot modify metadata, priorities, or assignees.'
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      
      {/* Title Header */}
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-black text-slate-800 dark:text-slate-100 tracking-tight leading-none uppercase">System Control Center</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Configure project policies, switch authorization roles, and audit developer workflows.</p>
      </div>

      {/* Main Configurations Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column (2/3): Profiles and Role Switcher */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Role-Based Access Selector */}
          <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5 leading-none">
                <Key size={14} className="text-brand-500" />
                <span>Frontend Role-Based Access Control</span>
              </h4>
              <span className="px-2 py-0.5 text-[9px] bg-brand-500/10 text-brand-600 dark:text-brand-400 rounded font-mono font-bold uppercase tracking-wider">
                Active: {userRole}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {(['Admin', 'Maintainer', 'Developer', 'Reporter'] as UserRole[]).map(role => {
                const isActive = userRole === role;
                return (
                  <div
                    key={role}
                    onClick={() => setUserRole(role)}
                    className={`p-3 border rounded-xl cursor-pointer transition-all flex flex-col justify-between space-y-1.5 ${
                      isActive 
                        ? 'border-brand-500 bg-brand-500/5 dark:bg-brand-500/5 ring-1 ring-brand-500/10' 
                        : 'border-slate-150 dark:border-slate-850 hover:border-slate-350 dark:hover:border-slate-750'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <User size={13} className={isActive ? 'text-brand-500' : 'text-slate-450'} />
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{role}</span>
                    </div>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-normal">
                      {roleDescriptions[role]}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Project Profile Info */}
          <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-xl space-y-4">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800 pb-2">Project Profile</h4>
            
            <div className="space-y-3.5 text-xs">
              <div>
                <label className="block text-[10px] text-slate-400 font-bold uppercase mb-1">PROJECT NAME</label>
                <input
                  type="text"
                  value={projName}
                  onChange={e => setProjName(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-200 dark:border-slate-800 rounded bg-transparent text-slate-850 dark:text-slate-200 outline-none focus:border-brand-500 font-medium"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-1">
                  <label className="block text-[10px] text-slate-400 font-bold uppercase mb-1">PROJECT KEY</label>
                  <input
                    type="text"
                    value={projKey}
                    onChange={e => setProjKey(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-200 dark:border-slate-800 rounded bg-transparent text-slate-850 dark:text-slate-200 outline-none focus:border-brand-500 font-mono font-bold"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-[10px] text-slate-400 font-bold uppercase mb-1">DEFAULT TARGET ENVIRONMENT</label>
                  <select className="w-full px-2 py-1.5 border border-slate-200 dark:border-slate-800 rounded bg-white dark:bg-slate-900 outline-none text-slate-700 dark:text-slate-300 font-medium">
                    <option>Production (Default)</option>
                    <option>Staging</option>
                    <option>Development</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 font-bold uppercase mb-1">DESCRIPTION</label>
                <textarea
                  rows={2}
                  value={projDesc}
                  onChange={e => setProjDesc(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-200 dark:border-slate-800 rounded bg-transparent text-slate-850 dark:text-slate-200 outline-none focus:border-brand-500 font-medium font-sans resize-none"
                />
              </div>
            </div>
          </div>

        </div>

        {/* Right Column (1/3): Security Warning & Policies */}
        <div className="space-y-6">
          
          {/* Security Architecture Warning Panel */}
          <div className="p-5 bg-purple-500/5 border border-purple-500/15 rounded-xl space-y-3.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-purple-650 dark:text-purple-400">
              <ShieldAlert size={16} />
              <span>Architectural Security Note</span>
            </div>
            <div className="text-[10px] leading-relaxed text-slate-500 dark:text-slate-400 space-y-2">
              <p>
                <strong>Prototyping Notice:</strong> These frontend-only permissions simulate user flows inside the client layer to evaluate developer experience constraints.
              </p>
              <p>
                In production, authorization checks <em>must</em> be enforced at the API database level (e.g. Postgres RLS, NestJS AuthGuards, Firebase Security Rules) to prevent request header tampering.
              </p>
            </div>
          </div>

          {/* Workflow Auto Triage Config */}
          <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5 leading-none">
                <Sparkles size={13} className="text-purple-500" />
                <span>AI Auto-Triage Policies</span>
              </h4>
            </div>

            <div className="space-y-4 text-xs">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-800 dark:text-slate-200 block">Automated AI Analysis</span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">Runs AI triage simulations on newly reported bugs.</span>
                </div>
                <input
                  type="checkbox"
                  checked={autoTriage}
                  onChange={e => setAutoTriage(e.target.checked)}
                  className="rounded text-brand-650 cursor-pointer w-4 h-4"
                />
              </div>

              <div className="space-y-1.5 border-t border-slate-100 dark:border-slate-850 pt-3">
                <div className="flex justify-between items-center text-xxs font-mono">
                  <span className="font-bold text-slate-500">Duplicate Confidence Gate</span>
                  <span className="font-bold text-brand-600 dark:text-brand-400">{dupThreshold}%</span>
                </div>
                <input
                  type="range"
                  min="30"
                  max="90"
                  step="5"
                  value={dupThreshold}
                  onChange={e => setDupThreshold(parseInt(e.target.value))}
                  className="w-full h-1 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-brand-600"
                />
              </div>
            </div>
          </div>

          {/* Diagnostic Utilities */}
          <div className="p-5 bg-red-500/5 border border-red-500/10 rounded-xl space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-bold text-red-500">
              <AlertOctagon size={15} />
              <span>Diagnostic Utilities</span>
            </div>
            <p className="text-xxs text-slate-500 dark:text-slate-400 leading-relaxed">
              Clear the cache stored in the client browser's `localStorage` and reset the mock database.
            </p>
            <button
              onClick={handleResetData}
              className="w-full flex items-center justify-center gap-1.5 bg-red-600 hover:bg-red-750 text-white font-bold py-2 px-3 rounded text-[10px] transition-colors active:scale-98 shadow-md"
            >
              <RefreshCw size={12} />
              <span>Reset Seed Data</span>
            </button>
          </div>

        </div>

      </div>

      {/* Live System Security Audit log panel */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div>
            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5 leading-none">
              <ShieldCheck size={16} className="text-green-500" />
              <span>Live System Security Audit Registry</span>
            </h4>
            <p className="text-[10px] text-slate-500 mt-1">Audit log database recording issue metadata swaps, role changes, and AI acceptances.</p>
          </div>
          <button
            onClick={clearAuditLogs}
            className="flex items-center gap-1 px-3 py-1 bg-slate-50 hover:bg-slate-100 dark:bg-slate-950/20 text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 border border-slate-200 dark:border-slate-800 rounded text-xxs font-bold transition-all"
          >
            <Trash2 size={12} />
            <span>Clear Audit Log</span>
          </button>
        </div>

        {/* Audit Logs Register Table */}
        <div className="overflow-x-auto">
          {auditLogs.length > 0 ? (
            <table className="w-full text-left border-collapse text-xxs font-mono">
              <thead>
                <tr className="border-b border-slate-150 dark:border-slate-850 text-slate-400 font-bold uppercase tracking-wider text-[9px]">
                  <th className="py-2.5 pr-3">Timestamp</th>
                  <th className="py-2.5 px-3">Actor User</th>
                  <th className="py-2.5 px-3">Action logged</th>
                  <th className="py-2.5 px-3">Target Scope</th>
                  <th className="py-2.5 px-3">Original State</th>
                  <th className="py-2.5 pl-3 text-right">Modified State</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-850 text-slate-650 dark:text-slate-350">
                {auditLogs.map(log => (
                  <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-950/10">
                    <td className="py-2.5 pr-3 flex items-center gap-1 text-slate-400">
                      <Clock size={10} />
                      <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-slate-700 dark:text-slate-300">
                      {log.userName}
                    </td>
                    <td className="py-2.5 px-3 font-bold text-slate-800 dark:text-slate-150">
                      {log.action}
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-slate-500">
                      {log.issueId ? (
                        <span className="text-brand-600 dark:text-brand-400">{log.issueId}</span>
                      ) : log.issueTitle ? (
                        <span className="text-purple-500">{log.issueTitle}</span>
                      ) : (
                        <span className="italic text-slate-400">N/A</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 max-w-[120px] truncate text-slate-450 italic">
                      {log.previousValue || 'N/A'}
                    </td>
                    <td className="py-2.5 pl-3 text-right font-semibold text-slate-800 dark:text-slate-205 max-w-[150px] truncate">
                      {log.newValue || 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="text-center py-10 text-slate-400 italic">
              <ShieldCheck size={28} className="mx-auto text-slate-300 mb-1" />
              <span>No audit logs recorded. Trigger a mutation or update a bug status to register logs.</span>
            </div>
          )}
        </div>
      </div>

    </div>
  );
};
