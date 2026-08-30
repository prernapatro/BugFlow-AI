import type { AIAnalysis, Issue, IssuePriority, IssueSeverity, User } from '../types';

/**
 * Deterministic AI Helper Service for BugFlow AI.
 * Simulates LLM suggestions based on title, description, and metadata keywords.
 * Easily swappable with a real LLM API call in production.
 */

// Helper to delay simulation (making it feel realistic, but brief)
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const aiService = {
  /**
   * Generates a concise AI summary of the bug
   */
  async generateIssueSummary(title: string, desc: string): Promise<string> {
    await delay(300);
    const lowercaseTitle = title.toLowerCase();
    const lowercaseDesc = desc.toLowerCase();

    if (lowercaseTitle.includes('login') || lowercaseDesc.includes('login')) {
      return 'Authentication system failure blocking user logins due to token verification mismatch.';
    }
    if (lowercaseTitle.includes('payment') || lowercaseDesc.includes('stripe') || lowercaseDesc.includes('checkout')) {
      return 'Payment checkout gateway timeout causing transaction failure and double charge risks.';
    }
    if (lowercaseTitle.includes('slow') || lowercaseDesc.includes('query') || lowercaseDesc.includes('database')) {
      return 'DB query deadlock in transaction logs leading to API request timeouts under heavy load.';
    }
    if (lowercaseTitle.includes('css') || lowercaseDesc.includes('align') || lowercaseDesc.includes('ui')) {
      return 'Visual layout regression affecting navigation bars on responsive mobile viewport sizes.';
    }

    return `Unresolved bug reporting "${title}". Requires investigation of logs and system state.`;
  },

  /**
   * Suggests bug severity based on text markers
   */
  async suggestSeverity(title: string, desc: string): Promise<IssueSeverity> {
    const text = (title + ' ' + desc).toLowerCase();
    
    if (
      text.includes('crash') || 
      text.includes('exploit') || 
      text.includes('security') || 
      text.includes('leak') ||
      text.includes('dataloss') || 
      text.includes('data loss') || 
      text.includes('down') ||
      text.includes('unable to login') ||
      text.includes('cannot log in')
    ) {
      return 'critical';
    }
    
    if (
      text.includes('broken') || 
      text.includes('error') || 
      text.includes('fail') || 
      text.includes('timeout') ||
      text.includes('leak') ||
      text.includes('exception') ||
      text.includes('deadlock')
    ) {
      return 'high';
    }

    if (
      text.includes('typo') || 
      text.includes('cosmetic') || 
      text.includes('color') || 
      text.includes('spacing') || 
      text.includes('padding') ||
      text.includes('margin') ||
      text.includes('icon')
    ) {
      return 'low';
    }

    return 'medium';
  },

  /**
   * Suggests issue priority based on suggested severity
   */
  async suggestPriority(severity: IssueSeverity): Promise<IssuePriority> {
    switch (severity) {
      case 'critical':
        return 'P0';
      case 'high':
        return 'P1';
      case 'medium':
        return 'P2';
      case 'low':
        return 'P3';
      default:
        return 'P2';
    }
  },

  /**
   * Suggests component based on contents
   */
  async suggestComponent(title: string, desc: string): Promise<string> {
    const text = (title + ' ' + desc).toLowerCase();

    if (text.includes('auth') || text.includes('login') || text.includes('password') || text.includes('token') || text.includes('jwt') || text.includes('session')) {
      return 'Authentication';
    }
    if (text.includes('billing') || text.includes('stripe') || text.includes('payment') || text.includes('checkout') || text.includes('subscription') || text.includes('invoice') || text.includes('charge')) {
      return 'Billing';
    }
    if (text.includes('db') || text.includes('query') || text.includes('sql') || text.includes('postgres') || text.includes('database') || text.includes('migration') || text.includes('deadlock')) {
      return 'Database';
    }
    if (text.includes('ui') || text.includes('ux') || text.includes('css') || text.includes('align') || text.includes('button') || text.includes('color') || text.includes('mobile') || text.includes('responsive')) {
      return 'UI/UX';
    }

    return 'Core API';
  },

  /**
   * Suggests assignee based on component expertise mapping
   */
  async suggestAssignee(component: string, users: User[]): Promise<string | undefined> {
    // Map components to developer names
    const componentExpertiseMap: Record<string, string> = {
      'Authentication': 'Sarah Chen', // Security lead
      'Billing': 'Alex Rivera',       // Payments backend lead
      'Database': 'Marcus Vance',     // DB engineer
      'UI/UX': 'Elena Rostova',       // Frontend architect
      'Core API': 'Tariq Mahmood'     // Core backend
    };

    const targetName = componentExpertiseMap[component];
    if (targetName) {
      const user = users.find(u => u.name === targetName);
      if (user) return user.id;
    }

    // Default to the developer with the least workload
    if (users.length > 0) {
      const sortedByWorkload = [...users].sort((a, b) => a.workload.assignedCount - b.workload.assignedCount);
      return sortedByWorkload[0].id;
    }

    return undefined;
  },

  /**
   * Suggests issue labels
   */
  async suggestLabels(title: string, desc: string): Promise<string[]> {
    const text = (title + ' ' + desc).toLowerCase();
    const suggestions: string[] = ['bug'];

    if (text.includes('auth') || text.includes('login') || text.includes('jwt')) {
      suggestions.push('security', 'auth');
    }
    if (text.includes('billing') || text.includes('stripe') || text.includes('payment')) {
      suggestions.push('payments', 'billing');
    }
    if (text.includes('ui') || text.includes('ux') || text.includes('css') || text.includes('layout')) {
      suggestions.push('frontend', 'ui-regression');
    }
    if (text.includes('performance') || text.includes('slow') || text.includes('deadlock') || text.includes('query')) {
      suggestions.push('performance', 'backend');
    }
    if (text.includes('crash') || text.includes('exception') || text.includes('nullpointer')) {
      suggestions.push('crash-risk');
    }

    // De-duplicate
    return Array.from(new Set(suggestions));
  },

  /**
   * Simple duplicate detection based on technical keyword overlap
   */
  async detectDuplicates(
    title: string,
    desc: string,
    allIssues: Issue[]
  ): Promise<{ duplicateProbability: number; duplicateOfId?: string }> {
    const textWords = new Set((title + ' ' + desc).toLowerCase().match(/\w+/g) || []);
    
    // Core technical keywords we look for overlap in
    const techKeywords = ['stripe', 'jwt', 'auth', 'login', 'billing', 'deadlock', 'query', 'postgres', 'token', 'nullpointer', 'nan', 'leak', 'crash'];
    const matchedTech = Array.from(textWords).filter(w => techKeywords.includes(w));

    if (matchedTech.length === 0) {
      return { duplicateProbability: 0 };
    }

    let highestProb = 0;
    let matchId: string | undefined = undefined;

    for (const issue of allIssues) {
      if (issue.status === 'Closed' && issue.duplicateOf) continue; // skip duplicates of duplicates
      
      const issueWords = new Set((issue.title + ' ' + issue.description).toLowerCase().match(/\w+/g) || []);
      const overlapWords = matchedTech.filter(w => issueWords.has(w));
      
      if (overlapWords.length > 0) {
        // Calculate basic Jaccard-like score on key tech terms
        const prob = overlapWords.length / matchedTech.length;
        if (prob > highestProb) {
          highestProb = prob;
          matchId = issue.id;
        }
      }
    }

    // Scale probability
    if (highestProb >= 0.7) {
      return { duplicateProbability: 0.88, duplicateOfId: matchId };
    } else if (highestProb >= 0.4) {
      return { duplicateProbability: 0.55, duplicateOfId: matchId };
    } else if (highestProb > 0.1) {
      return { duplicateProbability: 0.22, duplicateOfId: matchId };
    }

    return { duplicateProbability: 0 };
  },

  /**
   * Calculates overall business / system impact score
   */
  async calculateImpactScore(
    usersAffected: number,
    severity: IssueSeverity,
    businessImpact: 'critical' | 'high' | 'medium' | 'low'
  ): Promise<number> {
    let score = 0;

    // Severity contribution (max 35)
    if (severity === 'critical') score += 35;
    else if (severity === 'high') score += 25;
    else if (severity === 'medium') score += 12;
    else score += 4;

    // Business Impact contribution (max 35)
    if (businessImpact === 'critical') score += 35;
    else if (businessImpact === 'high') score += 25;
    else if (businessImpact === 'medium') score += 12;
    else score += 4;

    // Users affected contribution (max 30)
    if (usersAffected > 5000) score += 30;
    else if (usersAffected > 1000) score += 22;
    else if (usersAffected > 250) score += 15;
    else if (usersAffected > 50) score += 8;
    else score += 3;

    return Math.min(score, 100);
  },

  /**
   * Generates a complete triage analysis structure
   */
  async generateTriageAnalysis(
    title: string,
    desc: string,
    usersAffected: number,
    businessImpact: 'critical' | 'high' | 'medium' | 'low',
    allIssues: Issue[],
    users: User[]
  ): Promise<AIAnalysis> {
    const severity = await this.suggestSeverity(title, desc);
    const priority = await this.suggestPriority(severity);
    const component = await this.suggestComponent(title, desc);
    const assigneeSuggestionId = await this.suggestAssignee(component, users);
    const suggestedLabels = await this.suggestLabels(title, desc);
    const duplicateCheck = await this.detectDuplicates(title, desc, allIssues);
    const impactScore = await this.calculateImpactScore(usersAffected, severity, businessImpact);
    const summary = await this.generateIssueSummary(title, desc);

    // AI Confidence calculation
    let confidence = 0.85;
    if (duplicateCheck.duplicateProbability > 0.8) confidence += 0.1;
    if (title.length < 15) confidence -= 0.15; // less details, less confidence

    // Explanations / Reasoning mock
    let reasoning = `Automated analysis detected keywords matching the "${component}" component. `;
    if (severity === 'critical') {
      reasoning += `Severity set to critical because it reports dataloss or security issues. `;
    } else {
      reasoning += `Severity and priority set to ${severity}/${priority} based on core error profiles. `;
    }
    if (duplicateCheck.duplicateProbability > 0.7 && duplicateCheck.duplicateOfId) {
      reasoning += `Identified duplicate probability of ${(duplicateCheck.duplicateProbability * 100).toFixed(0)}% with ${duplicateCheck.duplicateOfId}.`;
    }

    // Determine suggested next action and release impact based on component
    let suggestedNextAction = 'Audit Sentry container logs and trace execution thread dumps.';
    let releaseImpactSuggestion = 'v1.2.0';

    if (component === 'Authentication') {
      suggestedNextAction = 'Implement a mutex queue queueing refresh token requests concurrently.';
      releaseImpactSuggestion = 'v1.2.0 (Target patch version)';
    } else if (component === 'Billing') {
      suggestedNextAction = 'Map Stripe card decline exceptions to UI-facing warning models.';
      releaseImpactSuggestion = 'v1.2.0 (Hotfix release cycle)';
    } else if (component === 'Database') {
      suggestedNextAction = 'Configure execution timeout bounds and add key database index mappings.';
      releaseImpactSuggestion = 'v1.2.0 (Active DB stabilization)';
    } else if (component === 'UI/UX') {
      suggestedNextAction = 'Inspect responsive flexbox bounds and overflow parameters on mobile grids.';
      releaseImpactSuggestion = 'v1.2.1 (UI refinement sprint)';
    } else if (component === 'Core API') {
      suggestedNextAction = 'Strip execution stacktrace leaks from public server response layers.';
      releaseImpactSuggestion = 'v1.2.0 (Standard release cycle)';
    }

    return {
      summary,
      severitySuggestion: severity,
      prioritySuggestion: priority,
      componentSuggestion: component,
      assigneeSuggestionId,
      suggestedLabels,
      duplicateProbability: duplicateCheck.duplicateProbability,
      impactScore,
      confidence: Math.max(0.1, Math.min(0.99, confidence)),
      reasoning,
      suggestedNextAction,
      releaseImpactSuggestion,
      analyzedAt: new Date().toISOString()
    };
  },

  /**
   * Duplicate Radar Similarity Scan.
   * Compares issue fields against all issues to return similar candidate matches.
   */
  findPossibleDuplicates(
    title: string,
    desc: string,
    allIssues: Issue[],
    currentIssueId?: string
  ): Array<{
    issue: Issue;
    similarity: number;
    sharedComponent: string;
    sharedErrorMessage: string;
    sharedEnvironment: string;
  }> {
    if (!title.trim()) return [];

    const queryText = (title + ' ' + desc).toLowerCase();
    const techKeywords = ['stripe', 'jwt', 'auth', 'login', 'billing', 'deadlock', 'query', 'postgres', 'token', 'nullpointer', 'nan', 'leak', 'crash', 'css', 'mobile', 'overflow'];
    const queryTerms = techKeywords.filter(k => queryText.includes(k));

    return allIssues
      .filter(issue => issue.id !== currentIssueId && issue.status !== 'Closed') // ignore current and closed duplicates
      .map(issue => {
        let similarity = 0;
        
        // 1. Component match (25%)
        const suggestedComp = title.toLowerCase().includes('login') || desc.toLowerCase().includes('token') ? 'Authentication' : '';
        const isComponentMatch = issue.component.toLowerCase() === suggestedComp.toLowerCase() || queryText.includes(issue.component.toLowerCase());
        if (isComponentMatch) similarity += 25;

        // 2. Technical keyword matches (max 50%)
        const issueText = (issue.title + ' ' + (issue.description || '')).toLowerCase();
        const matchedTerms = queryTerms.filter(k => issueText.includes(k));
        if (queryTerms.length > 0) {
          similarity += Math.round((matchedTerms.length / queryTerms.length) * 50);
        }

        // 3. Title fuzzy similarity (up to 25%)
        const queryWords = title.toLowerCase().split(/\s+/).filter(w => w.length > 3);
        const issueWords = issue.title.toLowerCase().split(/\s+/).filter(w => w.length > 3);
        const sharedWords = queryWords.filter(w => issueWords.includes(w));
        if (queryWords.length > 0) {
          similarity += Math.round((sharedWords.length / queryWords.length) * 25);
        }

        // Bound similarity score
        similarity = Math.min(99, Math.max(0, similarity));

        // Shared environment helper
        const sharedEnvironment = issue.environment;

        // Extract shared error messages based on matching terms
        let sharedErrorMessage = 'Generic Unhandled execution socket exception';
        if (issueText.includes('deadlock') || queryText.includes('deadlock')) {
          sharedErrorMessage = 'Postgres transaction deadlock on user authorization rows';
        } else if (issueText.includes('stripe') || queryText.includes('stripe')) {
          sharedErrorMessage = 'Stripe API signature decryption validation failure';
        } else if (issueText.includes('memory') || queryText.includes('memory') || issueText.includes('leak')) {
          sharedErrorMessage = 'Redis cache node allocation Out Of Memory crash';
        } else if (issueText.includes('css') || queryText.includes('css') || issueText.includes('overflow')) {
          sharedErrorMessage = 'CSS Mobile Viewport flexbox shift alignment mismatch';
        } else if (issueText.includes('token') || queryText.includes('token') || issueText.includes('jwt')) {
          sharedErrorMessage = 'JWT refreshment request concurrency token collision';
        }

        return {
          issue,
          similarity,
          sharedComponent: issue.component,
          sharedErrorMessage,
          sharedEnvironment
        };
      })
      .filter(candidate => candidate.similarity >= 40) // only show candidates above 40% similarity
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 3); // limit to top 3 duplicates
    }
  };
