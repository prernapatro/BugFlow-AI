import React, { useState } from 'react';
import { BugFlowProvider } from './context/BugFlowContext';
import { Layout } from './components/Layout';
import { Overview } from './components/Dashboard/Overview';
import { IssuesPage } from './components/Issues/IssuesPage';
import { IssueDetailPage } from './components/Issues/IssueDetailPage';
import { TriagePage } from './components/Triage/TriagePage';
import { ReleasesPage } from './components/Releases/ReleasesPage';
import { InsightsPage } from './components/Insights/InsightsPage';
import { TeamPage } from './components/Team/TeamPage';
import { SettingsPage } from './components/Settings/SettingsPage';
import { CreateIssueModal } from './components/Issues/CreateIssueModal';
import './App.css';

const AppContent: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<string>('overview');
  const [activeIssueId, setActiveIssueId] = useState<string | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState<boolean>(false);

  // Render correct page view inside layout based on current tab state
  const renderTabContent = () => {
    switch (currentTab) {
      case 'overview':
        return (
          <Overview 
            onNavigateToTab={setCurrentTab} 
            onOpenIssueDetail={setActiveIssueId} 
          />
        );
      case 'issues':
        return <IssuesPage onOpenIssueDetail={setActiveIssueId} />;
      case 'triage':
        return <TriagePage onOpenIssueDetail={setActiveIssueId} />;
      case 'releases':
        return (
          <ReleasesPage 
            onOpenIssueDetail={setActiveIssueId} 
            onNavigateToTab={setCurrentTab} 
          />
        );
      case 'insights':
        return <InsightsPage onOpenIssueDetail={setActiveIssueId} />;
      case 'team':
        return <TeamPage onOpenIssueDetail={setActiveIssueId} />;
      case 'settings':
        return <SettingsPage />;
      default:
        return (
          <Overview 
            onNavigateToTab={setCurrentTab} 
            onOpenIssueDetail={setActiveIssueId} 
          />
        );
    }
  };

  return (
    <>
      <Layout
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        activeIssueId={activeIssueId}
        setActiveIssueId={setActiveIssueId}
        onCreateIssueClick={() => setCreateModalOpen(true)}
      >
        {activeIssueId !== null ? (
          <IssueDetailPage
            issueId={activeIssueId}
            onBack={() => setActiveIssueId(null)}
            onNavigateToIssue={setActiveIssueId}
          />
        ) : (
          renderTabContent()
        )}
      </Layout>

      <CreateIssueModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
      />
    </>
  );
};

function App() {
  return (
    <BugFlowProvider>
      <AppContent />
    </BugFlowProvider>
  );
}

export default App;
