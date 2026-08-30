import type { Issue, Release } from '../types';

/**
 * Utility to calculate the priority score (0-100) for a bug.
 * Higher scores mean the issue is a higher candidate for being fixed next.
 * Resolved or Closed issues are assigned a score of 0.
 */
export function calculateFixPriority(issue: Issue, releases: Release[], allIssues: Issue[] = []): number {
  // If the bug is already resolved or closed, it doesn't need to be fixed.
  if (issue.status === 'Resolved' || issue.status === 'Closed') {
    return 0;
  }

  let score = 0;

  // 1. Priority Contribution (max 40)
  switch (issue.priority) {
    case 'P0':
      score += 40;
      break;
    case 'P1':
      score += 25;
      break;
    case 'P2':
      score += 10;
      break;
    case 'P3':
      score += 2;
      break;
  }

  // 2. Severity Contribution (max 20)
  switch (issue.severity) {
    case 'critical':
      score += 20;
      break;
    case 'high':
      score += 12;
      break;
    case 'medium':
      score += 5;
      break;
    case 'low':
      score += 1;
      break;
  }

  // 3. User Impact Contribution (max 15)
  // log-scale points: users affected = 1 -> 0 pts, 10 -> 3 pts, 100 -> 6 pts, 1000 -> 9 pts, 10k+ -> 12-15 pts
  if (issue.usersAffected > 0) {
    const userLog = Math.log10(issue.usersAffected);
    const userPoints = Math.min(15, userLog * 3);
    score += Math.max(1, Math.round(userPoints));
  }

  // 4. Affected Release Proximity (max 10)
  if (issue.version) {
    const affectedRelease = releases.find(r => r.version === issue.version);
    if (affectedRelease) {
      if (affectedRelease.status === 'active') {
        score += 6; // active release has higher pressure
      }
      
      // If release is within the next 7 days, add extra pressure
      const targetTime = new Date(affectedRelease.releaseDate).getTime();
      const now = new Date().getTime();
      const diffDays = (targetTime - now) / (1000 * 60 * 60 * 24);
      if (diffDays > 0 && diffDays <= 7) {
        score += 4;
      }
    }
  }

  // 5. Issue Age (max 10)
  // +0.2 points per day since creation
  const createdTime = new Date(issue.createdDate).getTime();
  const now = new Date().getTime();
  const ageDays = (now - createdTime) / (1000 * 60 * 60 * 24);
  if (ageDays > 0) {
    const agePoints = Math.min(10, ageDays * 0.2);
    score += agePoints;
  }

  // 6. Dependencies (max range: -5 to +5)
  // If this bug is BLOCKING other bugs -> higher priority (+5)
  if (issue.blocks && issue.blocks.length > 0) {
    score += 5;
  }
  // If this bug is BLOCKED BY other active bugs -> lower priority (-5), fix the blocker first
  if (issue.blockedBy && issue.blockedBy.length > 0 && allIssues.length > 0) {
    const activeBlockers = issue.blockedBy.filter(blockerId => {
      const blocker = allIssues.find(i => i.id === blockerId);
      return blocker && blocker.status !== 'Resolved' && blocker.status !== 'Closed';
    });
    if (activeBlockers.length > 0) {
      score -= 5;
    }
  }

  // 7. Regression Status (max 8)
  if (issue.regressionOf) {
    score += 8;
  }

  // Bound the final score between 1 and 100 (for unresolved issues)
  return Math.max(1, Math.min(100, Math.round(score)));
}
