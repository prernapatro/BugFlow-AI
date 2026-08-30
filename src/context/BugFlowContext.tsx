import React, { createContext, useContext, useState, useEffect } from 'react';
import type { Issue, User, Release, Comment, Activity, IssueStatus, IssuePriority, IssueSeverity, UserRole, AuditLogEntry } from '../types';
import { mockIssues, mockUsers, mockReleases } from '../data/mockData';
import { aiService } from '../services/aiService';

interface BugFlowContextType {
  issues: Issue[];
  users: User[];
  releases: Release[];
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  createIssue: (issueData: Partial<Issue>) => Promise<Issue>;
  updateIssue: (issueId: string, updates: Partial<Issue>) => void;
  addComment: (issueId: string, content: string, authorId: string) => void;
  acceptTriageSuggestions: (issueId: string) => void;
  mergeDuplicate: (duplicateId: string, targetId: string) => void;
  deleteIssue: (issueId: string) => void;
  userRole: UserRole;
  setUserRole: (role: UserRole) => void;
  auditLogs: AuditLogEntry[];
  clearAuditLogs: () => void;
}

const BugFlowContext = createContext<BugFlowContextType | undefined>(undefined);

export const useBugFlow = () => {
  const context = useContext(BugFlowContext);
  if (!context) {
    throw new Error('useBugFlow must be used within a BugFlowProvider');
  }
  return context;
};

export const BugFlowProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [releases, setReleases] = useState<Release[]>([]);
  const [theme, setTheme] = useState<'light' | 'dark'>('dark'); // Default premium dark theme
  const [userRole, setUserRole] = useState<UserRole>('Admin');
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);

  // Initialize data from localStorage or mockData
  useEffect(() => {
    const savedIssues = localStorage.getItem('bugflow_issues');
    const savedUsers = localStorage.getItem('bugflow_users');
    const savedReleases = localStorage.getItem('bugflow_releases');
    const savedTheme = localStorage.getItem('bugflow_theme');
    const savedRole = localStorage.getItem('bugflow_role');
    const savedAuditLogs = localStorage.getItem('bugflow_audit_logs');

    if (savedIssues) {
      setIssues(JSON.parse(savedIssues));
    } else {
      setIssues(mockIssues);
      localStorage.setItem('bugflow_issues', JSON.stringify(mockIssues));
    }

    if (savedUsers) {
      setUsers(JSON.parse(savedUsers));
    } else {
      setUsers(mockUsers);
      localStorage.setItem('bugflow_users', JSON.stringify(mockUsers));
    }

    if (savedReleases) {
      setReleases(JSON.parse(savedReleases));
    } else {
      setReleases(mockReleases);
      localStorage.setItem('bugflow_releases', JSON.stringify(mockReleases));
    }

    if (savedTheme === 'light' || savedTheme === 'dark') {
      setTheme(savedTheme);
    } else {
      setTheme('dark');
      localStorage.setItem('bugflow_theme', 'dark');
    }

    if (savedRole) {
      setUserRole(savedRole as UserRole);
    } else {
      setUserRole('Admin');
      localStorage.setItem('bugflow_role', 'Admin');
    }

    if (savedAuditLogs) {
      setAuditLogs(JSON.parse(savedAuditLogs));
    } else {
      setAuditLogs([]);
      localStorage.setItem('bugflow_audit_logs', JSON.stringify([]));
    }
  }, []);

  // Update HTML class when theme changes
  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
      document.body.classList.add('dark');
    } else {
      root.classList.remove('dark');
      document.body.classList.remove('dark');
    }
    localStorage.setItem('bugflow_theme', theme);
  }, [theme]);

  // Unified audit logger helper
  const logAuditEvent = (
    action: string, 
    issueId?: string, 
    issueTitle?: string, 
    previousValue?: string, 
    newValue?: string
  ) => {
    const newEntry: AuditLogEntry = {
      id: `audit-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      userId: 'user-tariq',
      userName: 'Tariq Mahmood',
      action,
      issueId,
      issueTitle,
      previousValue,
      newValue
    };
    setAuditLogs(prev => {
      const updated = [newEntry, ...prev];
      localStorage.setItem('bugflow_audit_logs', JSON.stringify(updated));
      return updated;
    });
  };

  const handleSetRole = (role: UserRole) => {
    setUserRole(role);
    localStorage.setItem('bugflow_role', role);
    logAuditEvent('User Role Changed', undefined, undefined, userRole, role);
  };

  const clearAuditLogs = () => {
    setAuditLogs([]);
    localStorage.setItem('bugflow_audit_logs', JSON.stringify([]));
  };

  // Save utility that recalculates workloads and release risk scores dynamically
  const saveAllData = (updatedIssues: Issue[], updatedUsers: User[] = users, updatedReleases: Release[] = releases) => {
    // 1. Recalculate User Workloads
    const recalculatedUsers = updatedUsers.map(user => {
      const assignedIssues = updatedIssues.filter(
        i => i.assigneeId === user.id && i.status !== 'Resolved' && i.status !== 'Closed'
      );
      const criticalCount = assignedIssues.filter(
        i => i.priority === 'P0' || i.severity === 'critical'
      ).length;

      return {
        ...user,
        workload: {
          ...user.workload,
          assignedCount: assignedIssues.length,
          criticalCount
        }
      };
    });

    // 2. Recalculate Release Risk Scores & log risk recalculated events
    const recalculatedReleases = updatedReleases.map(release => {
      const releaseBugs = updatedIssues.filter(
        i => i.version === release.version && i.status !== 'Resolved' && i.status !== 'Closed'
      );
      
      let score = 0;
      releaseBugs.forEach(bug => {
        if (bug.priority === 'P0') score += 25;
        else if (bug.priority === 'P1') score += 15;
        else if (bug.priority === 'P2') score += 8;
        else score += 3;

        if (bug.severity === 'critical') score += 10;
        if (bug.severity === 'high') score += 5;

        if (bug.blocks && bug.blocks.length > 0) score += 10;
      });

      const newRisk = Math.min(99, score === 0 && releaseBugs.length > 0 ? 15 : score);

      // Check if risk score changed to log event
      const oldRelease = releases.find(r => r.version === release.version);
      if (oldRelease && oldRelease.riskScore !== newRisk) {
        setTimeout(() => {
          logAuditEvent(
            'Release Risk Recalculated',
            undefined,
            release.version,
            `${oldRelease.riskScore}%`,
            `${newRisk}%`
          );
        }, 0);
      }

      return {
        ...release,
        riskScore: newRisk
      };
    });

    setIssues(updatedIssues);
    setUsers(recalculatedUsers);
    setReleases(recalculatedReleases);

    localStorage.setItem('bugflow_issues', JSON.stringify(updatedIssues));
    localStorage.setItem('bugflow_users', JSON.stringify(recalculatedUsers));
    localStorage.setItem('bugflow_releases', JSON.stringify(recalculatedReleases));
  };

  const toggleTheme = () => {
    setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
  };

  /**
   * Creates an issue, triggers mock AI Suggestions asynchronously,
   * logs the audit events.
   */
  const createIssue = async (issueData: Partial<Issue>): Promise<Issue> => {
    const idNum = issues.length > 0 
      ? Math.max(...issues.map(i => parseInt(i.id.split('-')[1]) || 100)) + 1 
      : 101;
    const newId = `BUG-${idNum}`;
    const authorId = 'user-tariq'; // Default logged-in user for mock environment

    const newIssue: Issue = {
      id: newId,
      title: issueData.title || 'Untitled Issue',
      description: issueData.description || '',
      stepsToReproduce: issueData.stepsToReproduce || '',
      expectedBehavior: issueData.expectedBehavior || '',
      actualBehavior: issueData.actualBehavior || '',
      status: (issueData.status as IssueStatus) || 'Reported',
      priority: (issueData.priority as IssuePriority) || 'P2',
      severity: (issueData.severity as IssueSeverity) || 'medium',
      assigneeId: issueData.assigneeId,
      reporterId: authorId,
      labels: issueData.labels || ['bug'],
      component: issueData.component || 'Core API',
      environment: issueData.environment || 'Production',
      version: issueData.version || 'v1.2.0',
      createdDate: new Date().toISOString(),
      updatedDate: new Date().toISOString(),
      usersAffected: issueData.usersAffected || 1,
      releaseAffected: issueData.version || 'v1.2.0',
      businessImpact: issueData.businessImpact || 'low',
      confidence: 0.8,
      comments: [],
      activityTimeline: [
        {
          id: `act-${Math.random().toString(36).substr(2, 9)}`,
          issueId: newId,
          userId: authorId,
          type: 'created',
          details: 'Issue filed by developer.',
          createdDate: new Date().toISOString()
        }
      ]
    };

    // Append immediately
    const tempIssues = [newIssue, ...issues];
    saveAllData(tempIssues);
    logAuditEvent('Issue Created', newIssue.id, newIssue.title, undefined, newIssue.status);

    // Asynchronously perform AI analysis
    try {
      const aiAnalysis = await aiService.generateTriageAnalysis(
        newIssue.title,
        newIssue.description || '',
        newIssue.usersAffected,
        newIssue.businessImpact,
        tempIssues,
        users
      );
      
      // Update the issue with AI analysis metadata
      const analyzedIssues = tempIssues.map(issue => {
        if (issue.id === newId) {
          return {
            ...issue,
            aiAnalysis
          };
        }
        return issue;
      });

      saveAllData(analyzedIssues);
    } catch (err) {
      console.error('Failed to generate AI triage analysis:', err);
    }

    return newIssue;
  };

  /**
   * Updates an issue and logs audited activity log entries.
   */
  const updateIssue = (issueId: string, updates: Partial<Issue>) => {
    const actorId = 'user-tariq'; // simulate current user
    const updated = issues.map(issue => {
      if (issue.id === issueId) {
        const auditActivities: Activity[] = [];
        const generateActivityId = () => `act-${Math.random().toString(36).substr(2, 9)}`;

        // Check for specific state changes to audit
        if (updates.status && updates.status !== issue.status) {
          auditActivities.push({
            id: generateActivityId(),
            issueId,
            userId: actorId,
            type: 'status_changed',
            details: `Status changed from "${issue.status}" to "${updates.status}"`,
            createdDate: new Date().toISOString()
          });
          setTimeout(() => {
            logAuditEvent('Status Changed', issueId, issue.title, issue.status, updates.status);
          }, 0);
        }
        if (updates.priority && updates.priority !== issue.priority) {
          auditActivities.push({
            id: generateActivityId(),
            issueId,
            userId: actorId,
            type: 'priority_changed',
            details: `Priority adjusted from "${issue.priority}" to "${updates.priority}"`,
            createdDate: new Date().toISOString()
          });
          setTimeout(() => {
            logAuditEvent('Priority Changed', issueId, issue.title, issue.priority, updates.priority);
          }, 0);
        }
        if (updates.severity && updates.severity !== issue.severity) {
          auditActivities.push({
            id: generateActivityId(),
            issueId,
            userId: actorId,
            type: 'severity_changed',
            details: `Severity changed from "${issue.severity}" to "${updates.severity}"`,
            createdDate: new Date().toISOString()
          });
          setTimeout(() => {
            logAuditEvent('Severity Changed', issueId, issue.title, issue.severity, updates.severity);
          }, 0);
        }
        if (updates.assigneeId !== undefined && updates.assigneeId !== issue.assigneeId) {
          const oldName = users.find(u => u.id === issue.assigneeId)?.name || 'Unassigned';
          const newName = users.find(u => u.id === updates.assigneeId)?.name || 'Unassigned';
          auditActivities.push({
            id: generateActivityId(),
            issueId,
            userId: actorId,
            type: 'assignee_changed',
            details: `Assignee changed from ${oldName} to ${newName}`,
            createdDate: new Date().toISOString()
          });
          setTimeout(() => {
            logAuditEvent('Assignee Changed', issueId, issue.title, oldName, newName);
          }, 0);
        }
        if (
          updates.relatedIssueIds !== undefined ||
          updates.blockedBy !== undefined ||
          updates.blocks !== undefined ||
          updates.regressionOf !== undefined
        ) {
          auditActivities.push({
            id: generateActivityId(),
            issueId,
            userId: actorId,
            type: 'relationships_updated',
            details: `Dependency links or issue relationships updated`,
            createdDate: new Date().toISOString()
          });
        }

        // Generic details edit fallback if other edits occur but no direct logs
        if (
          auditActivities.length === 0 &&
          (updates.title !== undefined || updates.description !== undefined || updates.environment !== undefined || updates.version !== undefined)
        ) {
          auditActivities.push({
            id: generateActivityId(),
            issueId,
            userId: actorId,
            type: 'details_edited',
            details: `Issue description or primary environment attributes modified`,
            createdDate: new Date().toISOString()
          });
          setTimeout(() => {
            logAuditEvent('Issue Edited', issueId, issue.title, undefined, undefined);
          }, 0);
        }

        return {
          ...issue,
          ...updates,
          updatedDate: new Date().toISOString(),
          activityTimeline: [...issue.activityTimeline, ...auditActivities]
        };
      }
      return issue;
    });

    saveAllData(updated);
  };

  /**
   * Appends comment and creates audit activity
   */
  const addComment = (issueId: string, content: string, authorId: string) => {
    const updated = issues.map(issue => {
      if (issue.id === issueId) {
        const commentId = `com-${Math.random().toString(36).substr(2, 9)}`;
        const newComment: Comment = {
          id: commentId,
          issueId,
          authorId,
          content,
          createdDate: new Date().toISOString()
        };

        const activityId = `act-${Math.random().toString(36).substr(2, 9)}`;
        const auditActivity: Activity = {
          id: activityId,
          issueId,
          userId: authorId,
          type: 'comment_added',
          details: 'User added comment to discussion.',
          createdDate: new Date().toISOString()
        };

        setTimeout(() => {
          logAuditEvent('Comment Added', issueId, issue.title, undefined, content.length > 30 ? content.slice(0, 30) + '...' : content);
        }, 0);

        return {
          ...issue,
          comments: [...issue.comments, newComment],
          activityTimeline: [...issue.activityTimeline, auditActivity],
          updatedDate: new Date().toISOString()
        };
      }
      return issue;
    });

    saveAllData(updated);
  };

  /**
   * Applies suggested AI properties, sets status to triaged/confirmed, adds log
   */
  const acceptTriageSuggestions = (issueId: string) => {
    const actorId = 'user-tariq';
    const updated = issues.map(issue => {
      if (issue.id === issueId && issue.aiAnalysis) {
        const ai = issue.aiAnalysis;
        const activityId = `act-${Math.random().toString(36).substr(2, 9)}`;
        
        const oldAssignee = users.find(u => u.id === issue.assigneeId)?.name || 'Unassigned';
        const newAssignee = users.find(u => u.id === ai.assigneeSuggestionId)?.name || 'Unassigned';

        const auditActivity: Activity = {
          id: activityId,
          issueId,
          userId: actorId,
          type: 'ai_suggestions_accepted',
          details: `Accepted AI Triage recommendations: Status Confirmed, Severity -> ${ai.severitySuggestion}, Priority -> ${ai.prioritySuggestion}, Component -> ${ai.componentSuggestion}, Assignee changed from ${oldAssignee} to ${newAssignee}`,
          createdDate: new Date().toISOString()
        };

        setTimeout(() => {
          logAuditEvent('AI Recommendation Accepted', issueId, issue.title, undefined, 'Status Confirmed');
        }, 0);

        return {
          ...issue,
          status: 'Confirmed' as IssueStatus,
          severity: ai.severitySuggestion,
          priority: ai.prioritySuggestion,
          component: ai.componentSuggestion,
          assigneeId: ai.assigneeSuggestionId,
          labels: Array.from(new Set([...issue.labels, ...ai.suggestedLabels])),
          activityTimeline: [...issue.activityTimeline, auditActivity],
          updatedDate: new Date().toISOString()
        };
      }
      return issue;
    });

    saveAllData(updated);
  };

  /**
   * Merges a duplicate bug by setting it closed and linking to the source
   */
  const mergeDuplicate = (duplicateId: string, targetId: string) => {
    const actorId = 'user-tariq';
    const updated = issues.map(issue => {
      // 1. Update duplicate issue
      if (issue.id === duplicateId) {
        const actId = `act-${Math.random().toString(36).substr(2, 9)}`;
        const auditActivity: Activity = {
          id: actId,
          issueId: duplicateId,
          userId: actorId,
          type: 'duplicate_merged',
          details: `Merged as duplicate under issue ${targetId} and closed.`,
          createdDate: new Date().toISOString()
        };

        const existingRelated = issue.relatedIssueIds || [];
        
        setTimeout(() => {
          logAuditEvent('Issue Marked Duplicate', duplicateId, undefined, undefined, `Duplicate of ${targetId}`);
        }, 0);

        return {
          ...issue,
          status: 'Closed' as IssueStatus,
          duplicateOf: targetId,
          relatedIssueIds: Array.from(new Set([...existingRelated, targetId])),
          activityTimeline: [...issue.activityTimeline, auditActivity],
          updatedDate: new Date().toISOString()
        };
      }

      // 2. Update target issue (append duplicate link)
      if (issue.id === targetId) {
        const actId = `act-${Math.random().toString(36).substr(2, 9)}`;
        const auditActivity: Activity = {
          id: actId,
          issueId: targetId,
          userId: actorId,
          type: 'relationships_updated',
          details: `Linked duplicate issue ${duplicateId} to this issue.`,
          createdDate: new Date().toISOString()
        };

        const existingRelated = issue.relatedIssueIds || [];

        return {
          ...issue,
          relatedIssueIds: Array.from(new Set([...existingRelated, duplicateId])),
          activityTimeline: [...issue.activityTimeline, auditActivity],
          updatedDate: new Date().toISOString()
        };
      }

      return issue;
    });

    saveAllData(updated);
  };

  const deleteIssue = (issueId: string) => {
    const deleted = issues.find(i => i.id === issueId);
    const updated = issues.filter(i => i.id !== issueId);
    saveAllData(updated);
    logAuditEvent('Issue Deleted', issueId, deleted?.title, undefined, undefined);
  };

  return (
    <BugFlowContext.Provider
      value={{
        issues,
        users,
        releases,
        theme,
        toggleTheme,
        createIssue,
        updateIssue,
        addComment,
        acceptTriageSuggestions,
        mergeDuplicate,
        deleteIssue,
        userRole,
        setUserRole: handleSetRole,
        auditLogs,
        clearAuditLogs
      }}
    >
      {children}
    </BugFlowContext.Provider>
  );
};
