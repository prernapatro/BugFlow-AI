export type IssueStatus =
  | 'Reported'
  | 'Triaged'
  | 'Confirmed'
  | 'Assigned'
  | 'In Progress'
  | 'Fix Submitted'
  | 'QA Verification'
  | 'Resolved'
  | 'Closed';

export type IssuePriority = 'P0' | 'P1' | 'P2' | 'P3'; // P0 Critical, P1 High, P2 Medium, P3 Low

export type IssueSeverity = 'critical' | 'high' | 'medium' | 'low';

export interface AIAnalysis {
  summary: string;
  severitySuggestion: IssueSeverity;
  prioritySuggestion: IssuePriority;
  componentSuggestion: string;
  assigneeSuggestionId?: string;
  suggestedLabels: string[];
  duplicateProbability: number; // 0 to 1
  impactScore: number; // 0 to 100
  confidence: number; // 0 to 1
  reasoning: string;
  suggestedNextAction?: string;
  releaseImpactSuggestion?: string;
  analyzedAt: string;
}

export interface Comment {
  id: string;
  issueId: string;
  authorId: string;
  content: string;
  createdDate: string;
}

export interface Activity {
  id: string;
  issueId: string;
  userId: string; // Actor
  type:
    | 'created'
    | 'status_changed'
    | 'priority_changed'
    | 'severity_changed'
    | 'assignee_changed'
    | 'comment_added'
    | 'ai_suggestions_accepted'
    | 'duplicate_merged'
    | 'relationships_updated'
    | 'details_edited';
  details: string;
  createdDate: string;
}

export interface Issue {
  id: string; // e.g. "BUG-101"
  title: string;
  description?: string;
  stepsToReproduce?: string;
  expectedBehavior?: string;
  actualBehavior?: string;
  status: IssueStatus;
  priority: IssuePriority;
  severity: IssueSeverity;
  assigneeId?: string; // User.id
  reporterId: string; // User.id
  labels: string[];
  component: string; // e.g. "Authentication", "Billing", "Database", "UI/UX"
  environment: string; // e.g. "Production", "Staging", "Development", "All"
  version: string; // Release.version / Affected Version
  createdDate: string;
  updatedDate: string;
  
  // Relationships
  relatedIssueIds?: string[];
  blockedBy?: string[];
  blocks?: string[];
  duplicateOf?: string; // references another Issue.id
  regressionOf?: string; // references another Issue.id or commit
  
  // Impact section
  usersAffected: number;
  releaseAffected?: string; // Release.version
  businessImpact: 'critical' | 'high' | 'medium' | 'low';
  confidence: number; // 0 to 1

  // AI evaluation
  aiAnalysis?: AIAnalysis;

  // Nested arrays (for local store simplicity)
  comments: Comment[];
  activityTimeline: Activity[];
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl: string;
  role: string;
  workload: {
    assignedCount: number;
    criticalCount: number;
    avgResolutionHours: number;
  };
}

export interface Release {
  id: string;
  version: string; // e.g. "v1.2.0"
  name: string;
  releaseDate: string;
  status: 'planning' | 'active' | 'released';
  targetDate: string;
  riskScore: number; // 0 to 100, calculated dynamically
}

export interface ServiceDependency {
  name: string;
  tier: 'tier-1' | 'tier-2' | 'tier-3';
  description: string;
}

export interface ComponentMetadata {
  name: string;
  serviceName: string; // Service dependency name
  leadId: string; // Engineer User.id
  description: string;
}

export type UserRole = 'Admin' | 'Maintainer' | 'Developer' | 'Reporter';

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  action: string;
  issueId?: string;
  issueTitle?: string;
  previousValue?: string;
  newValue?: string;
}
