import React from 'react';
import { Menu, Plus, RefreshCw } from 'lucide-react';
import type {
  Applicant,
  AuthSessionResponse,
  AuthStatusResponse,
  FeedbackEntry,
  FeedbackStatus,
  FeedbackTargetType,
  PostVerificationResult,
  ProjectOpportunity,
  ServiceCategory,
  SocialLead,
  SocialScanMeta,
  SocialScanResponse,
} from './types.ts';
import { Sidebar, type NavSection } from './components/Sidebar.tsx';
import { LoginView } from './components/LoginView.tsx';
import { OverviewView } from './components/OverviewView.tsx';
import { SocialScannerView } from './components/SocialScannerView.tsx';
import { OpportunitiesView } from './components/OpportunitiesView.tsx';
import { ApplicantsView } from './components/ApplicantsView.tsx';
import { FeedbackView, type FeedbackDraftTarget } from './components/FeedbackView.tsx';
import { OpportunityModal } from './components/OpportunityModal.tsx';
import { ApplicantModal } from './components/ApplicantModal.tsx';

const SECTION_TITLES: Record<NavSection, string> = {
  overview: 'Admin Overview',
  scanner: 'Recently Added Posts',
  opportunities: 'Project Opportunities',
  applicants: 'Applicant Details',
  feedback: 'Admin Feedback',
};

export default function App() {
  const [authStatus, setAuthStatus] = React.useState<AuthStatusResponse | null>(null);
  const [authStatusLoading, setAuthStatusLoading] = React.useState(true);
  const [authToken, setAuthToken] = React.useState<string | null>(null);
  const [adminUsername, setAdminUsername] = React.useState<string>('');

  const [activeSection, setActiveSection] = React.useState<NavSection>('overview');
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  const [opportunities, setOpportunities] = React.useState<ProjectOpportunity[]>([]);
  const [applicants, setApplicants] = React.useState<Applicant[]>([]);
  const [feedback, setFeedback] = React.useState<FeedbackEntry[]>([]);
  const [workspaceLoading, setWorkspaceLoading] = React.useState(true);
  const [workspaceError, setWorkspaceError] = React.useState<string | null>(null);

  const [socialLeads, setSocialLeads] = React.useState<SocialLead[]>([]);
  const [scanMeta, setScanMeta] = React.useState<SocialScanMeta | null>(null);
  const [scanning, setScanning] = React.useState(false);
  const [scanError, setScanError] = React.useState<string | null>(null);
  const [scanQuery, setScanQuery] = React.useState('');
  const [platformFilter, setPlatformFilter] = React.useState('All Platforms');
  const [serviceFilter, setServiceFilter] = React.useState('Website Dev + SEO');
  const [industryFilter, setIndustryFilter] = React.useState('All Industries');

  const [selectedOpportunityId, setSelectedOpportunityId] = React.useState<string | null>(null);
  const [feedbackDraft, setFeedbackDraft] = React.useState<FeedbackDraftTarget | null>(null);
  const [oppModalOpen, setOppModalOpen] = React.useState(false);
  const [appModalOpen, setAppModalOpen] = React.useState(false);
  const [notice, setNotice] = React.useState<string | null>(null);

  const selectedOpportunity = React.useMemo(
    () => opportunities.find((o) => o.id === selectedOpportunityId) ?? null,
    [opportunities, selectedOpportunityId]
  );

  const showNotice = React.useCallback((message: string) => {
    setNotice(message);
    window.setTimeout(() => {
      setNotice((prev) => (prev === message ? null : prev));
    }, 3500);
  }, []);

  const refreshAuthStatus = React.useCallback(async () => {
    setAuthStatusLoading(true);
    try {
      const res = await fetch('/api/auth/status');
      if (res.ok) {
        const data = (await res.json()) as AuthStatusResponse;
        setAuthStatus(data);
      }
    } finally {
      setAuthStatusLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void refreshAuthStatus();
  }, [refreshAuthStatus]);

  React.useEffect(() => {
    if (authToken) return;
    const handleFocus = () => {
      void refreshAuthStatus();
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [authToken, refreshAuthStatus]);

  const handleSessionExpired = React.useCallback(() => {
    setAuthToken(null);
    setAdminUsername('');
    setOpportunities([]);
    setApplicants([]);
    setFeedback([]);
    setSocialLeads([]);
    setScanMeta(null);
    void refreshAuthStatus();
  }, [refreshAuthStatus]);

  const authFetch = React.useCallback(
    async (input: string, init: RequestInit = {}) => {
      const headers = new Headers(init.headers);
      if (authToken) {
        headers.set('Authorization', `Bearer ${authToken}`);
      }
      const res = await fetch(input, { ...init, headers });
      if (res.status === 401) {
        handleSessionExpired();
      }
      return res;
    },
    [authToken, handleSessionExpired]
  );

  const loadWorkspace = React.useCallback(async () => {
    if (!authToken) return;
    setWorkspaceLoading(true);
    setWorkspaceError(null);
    try {
      const res = await authFetch('/api/workspace');
      if (!res.ok) throw new Error('Failed to load workspace data.');
      const data = (await res.json()) as {
        opportunities: ProjectOpportunity[];
        applicants: Applicant[];
        feedback: FeedbackEntry[];
      };
      setOpportunities(data.opportunities || []);
      setApplicants(data.applicants || []);
      setFeedback(data.feedback || []);
    } catch (err) {
      setWorkspaceError(err instanceof Error ? err.message : 'Unable to load workspace.');
    } finally {
      setWorkspaceLoading(false);
    }
  }, [authToken, authFetch]);

  const runSocialScan = React.useCallback(
    async (
      queryOverride?: string,
      platformOverride?: string,
      serviceOverride?: string,
      industryOverride?: string
    ) => {
      if (!authToken) return;
      const q = queryOverride !== undefined ? queryOverride : scanQuery;
      const p = platformOverride !== undefined ? platformOverride : platformFilter;
      const s = serviceOverride !== undefined ? serviceOverride : serviceFilter;
      const ind = industryOverride !== undefined ? industryOverride : industryFilter;
      setScanning(true);
      setScanError(null);
      try {
        const params = new URLSearchParams();
        if (q.trim()) params.set('query', q.trim());
        if (p) params.set('platform', p);
        if (s) params.set('service', s);
        if (ind) params.set('industry', ind);
        const res = await authFetch(`/api/social-scan?${params.toString()}`);
        const data = (await res.json()) as SocialScanResponse & { error?: string };
        if (!res.ok) {
          throw new Error(data.error || 'Live API scan failed.');
        }
        setSocialLeads(data.leads || []);
        setScanMeta(data.meta || null);
      } catch (err) {
        setScanError(err instanceof Error ? err.message : 'Unable to reach live APIs.');
      } finally {
        setScanning(false);
      }
    },
    [authToken, authFetch, scanQuery, platformFilter, serviceFilter, industryFilter]
  );

  React.useEffect(() => {
    if (!authToken) return;
    void loadWorkspace();
    void runSocialScan('', 'All Platforms', 'Website Dev + SEO', 'All Industries');
  }, [authToken, loadWorkspace, runSocialScan]);

  const handleAuthenticated = (session: AuthSessionResponse) => {
    setAuthToken(session.token);
    setAdminUsername(session.username);
    setActiveSection('overview');
  };

  const handleLogout = async () => {
    if (authToken) {
      try {
        await authFetch('/api/auth/logout', { method: 'POST' });
      } catch {
        // Clear local session regardless
      }
    }
    handleSessionExpired();
  };

  const handleCreateOpportunity = async (payload: {
    title: string;
    clientName: string;
    clientHandle: string;
    platform: string;
    serviceCategory: ServiceCategory;
    industry: string;
    sourceUrl: string;
    authorProfileUrl: string;
    contactEmail: string;
    contactPhone: string;
    websiteUrl: string;
    socialLinks: string[];
    budget: string;
    techStack: string[];
    stage: ProjectOpportunity['stage'];
    priority: ProjectOpportunity['priority'];
    deadline: string;
    notes: string;
  }) => {
    const res = await authFetch('/api/opportunities', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = (await res.json()) as ProjectOpportunity & { error?: string };
    if (!res.ok) {
      throw new Error(data.error || 'Failed to save opportunity.');
    }
    setOpportunities((prev) => [data, ...prev]);
    showNotice('Project opportunity added to pipeline.');
  };

  const handleImportSocialLead = async (lead: SocialLead) => {
    try {
      await handleCreateOpportunity({
        title: lead.title,
        clientName: lead.author,
        clientHandle: lead.author,
        platform: lead.platform,
        serviceCategory: lead.serviceCategory,
        industry: lead.industry,
        sourceUrl: lead.url,
        authorProfileUrl: lead.authorProfileUrl,
        contactEmail: lead.contactEmail,
        contactPhone: lead.contactPhone,
        websiteUrl: lead.websiteUrl,
        socialLinks: lead.socialLinks,
        budget: lead.budget,
        techStack: lead.techStack,
        stage: 'Discovered',
        priority: lead.needsFreelanceWebDev ? 'High' : 'Medium',
        deadline: 'Flexible',
        notes: `${lead.summary}\n\nVerification: ${lead.verificationNote}`,
      });
    } catch (err) {
      showNotice(err instanceof Error ? err.message : 'Could not import opportunity.');
    }
  };

  const handleSaveVerifiedPost = async (result: PostVerificationResult) => {
    try {
      await handleCreateOpportunity({
        title: result.suggestedTitle,
        clientName: result.clientOrAuthor,
        clientHandle: result.clientOrAuthor,
        platform: result.platformGuess,
        serviceCategory: result.serviceCategory,
        industry: result.industry,
        sourceUrl: result.sourceUrl,
        authorProfileUrl: result.authorProfileUrl,
        contactEmail: result.contactEmail,
        contactPhone: result.contactPhone || '',
        websiteUrl: result.websiteUrl,
        socialLinks: result.socialLinks,
        budget: result.budgetExtracted,
        techStack: result.techStack,
        stage: 'Discovered',
        priority: 'High',
        deadline: 'Flexible',
        notes: `${result.summary}\n\nRecommended pitch: ${result.recommendedPitch}`,
      });
      setActiveSection('opportunities');
    } catch (err) {
      showNotice(err instanceof Error ? err.message : 'Could not save verified post.');
    }
  };

  const handleUpdateOpportunity = async (
    id: string,
    patch: Partial<ProjectOpportunity>
  ) => {
    const res = await authFetch(`/api/opportunities/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
    const updated = (await res.json()) as ProjectOpportunity & { error?: string };
    if (!res.ok) {
      showNotice(updated.error || 'Failed to update opportunity.');
      return;
    }
    setOpportunities((prev) => prev.map((o) => (o.id === id ? updated : o)));
  };

  const handleDeleteOpportunity = async (id: string) => {
    const res = await authFetch(`/api/opportunities/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      showNotice('Failed to delete opportunity.');
      return;
    }
    setOpportunities((prev) => prev.filter((o) => o.id !== id));
    setApplicants((prev) =>
      prev.map((a) =>
        a.appliedForOpportunityId === id ? { ...a, appliedForOpportunityId: '' } : a
      )
    );
    if (selectedOpportunityId === id) {
      setSelectedOpportunityId(null);
    }
    showNotice('Opportunity removed.');
  };

  const handleCreateApplicant = async (payload: {
    fullName: string;
    email: string;
    role: string;
    location: string;
    sourcePlatform: string;
    hourlyRate: number;
    availability: Applicant['availability'];
    status: Applicant['status'];
    skills: string[];
    portfolioUrl: string;
    githubOrLinkedIn: string;
    appliedForOpportunityId: string;
    experienceYears: number;
    notes: string;
  }) => {
    const res = await authFetch('/api/applicants', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = (await res.json()) as Applicant & { error?: string };
    if (!res.ok) {
      throw new Error(data.error || 'Failed to add applicant.');
    }
    setApplicants((prev) => [data, ...prev]);
    if (data.status === 'Assigned' && data.appliedForOpportunityId) {
      setOpportunities((prev) =>
        prev.map((opp) =>
          opp.id === data.appliedForOpportunityId &&
          !opp.assignedApplicantIds.includes(data.id)
            ? { ...opp, assignedApplicantIds: [...opp.assignedApplicantIds, data.id] }
            : opp
        )
      );
    }
    showNotice('Applicant added to roster.');
  };

  const handleUpdateApplicant = async (id: string, patch: Partial<Applicant>) => {
    const res = await authFetch(`/api/applicants/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
    const updated = (await res.json()) as Applicant & { error?: string };
    if (!res.ok) {
      showNotice(updated.error || 'Failed to update applicant.');
      return;
    }
    setApplicants((prev) => prev.map((a) => (a.id === id ? updated : a)));
  };

  const handleDeleteApplicant = async (id: string) => {
    const res = await authFetch(`/api/applicants/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      showNotice('Failed to remove applicant.');
      return;
    }
    setApplicants((prev) => prev.filter((a) => a.id !== id));
    setOpportunities((prev) =>
      prev.map((opp) => ({
        ...opp,
        assignedApplicantIds: opp.assignedApplicantIds.filter((aid) => aid !== id),
      }))
    );
    showNotice('Applicant removed.');
  };

  const handleSubmitFeedback = async (payload: {
    authorName: string;
    serviceCategory: ServiceCategory;
    targetType: FeedbackTargetType;
    targetId: string;
    targetTitle: string;
    rating: number;
    comment: string;
  }) => {
    const res = await authFetch('/api/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = (await res.json()) as FeedbackEntry & { error?: string };
    if (!res.ok) {
      throw new Error(data.error || 'Failed to save feedback.');
    }
    setFeedback((prev) => [data, ...prev]);
    showNotice('Feedback saved to backend.');
  };

  const handleUpdateFeedbackStatus = async (id: string, status: FeedbackStatus) => {
    const res = await authFetch(`/api/feedback/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    const updated = (await res.json()) as FeedbackEntry & { error?: string };
    if (!res.ok) {
      showNotice(updated.error || 'Failed to update feedback status.');
      return;
    }
    setFeedback((prev) => prev.map((f) => (f.id === id ? updated : f)));
  };

  const handleDeleteFeedback = async (id: string) => {
    const res = await authFetch(`/api/feedback/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      showNotice('Failed to delete feedback.');
      return;
    }
    setFeedback((prev) => prev.filter((f) => f.id !== id));
    showNotice('Feedback entry deleted.');
  };

  const handleLeaveFeedback = (draft: FeedbackDraftTarget) => {
    setFeedbackDraft(draft);
    setActiveSection('feedback');
  };

  const handleVerifyPost = async (input: string): Promise<PostVerificationResult> => {
    const res = await authFetch('/api/verify-post', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input }),
    });
    const data = (await res.json()) as PostVerificationResult & { error?: string };
    if (!res.ok) {
      throw new Error(data.error || 'Could not verify post.');
    }
    return data;
  };

  if (!authToken) {
    return (
      <LoginView
        authStatus={authStatus}
        statusLoading={authStatusLoading}
        onRefreshStatus={refreshAuthStatus}
        onAuthenticated={handleAuthenticated}
      />
    );
  }

  return (
    <div className="min-h-screen flex bg-slate-50 text-slate-900">
      <Sidebar
        activeSection={activeSection}
        onSelect={setActiveSection}
        counts={{
          socialNeeds: socialLeads.length,
          opportunities: opportunities.length,
          applicants: applicants.length,
          feedback: feedback.length,
        }}
        adminUsername={adminUsername}
        onLogout={() => void handleLogout()}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
      />

      <div className="flex-1 min-w-0 flex flex-col">
        <header className="sticky top-0 z-30 bg-white border-b border-slate-200 px-4 sm:px-8 py-3.5 flex items-center justify-between gap-6">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 -ml-2 rounded-md text-slate-600 hover:bg-slate-100"
              aria-label="Open navigation"
            >
              <Menu className="h-5 w-5" />
            </button>
            <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm min-w-0">
              <span className="font-display font-semibold text-slate-900 whitespace-nowrap">
                HK Surya Admin
              </span>
              <span className="text-slate-300" aria-hidden="true">
                /
              </span>
              <h1 className="font-display font-medium text-slate-600 truncate">
                {SECTION_TITLES[activeSection]}
              </h1>
            </nav>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => {
                setActiveSection('scanner');
                void runSocialScan();
              }}
              disabled={scanning}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors whitespace-nowrap shrink-0 disabled:opacity-60"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${scanning ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">
                {scanning ? 'Fetching Recent Posts' : 'Fetch Recent Posts'}
              </span>
            </button>

            <button
              type="button"
              onClick={() =>
                activeSection === 'applicants'
                  ? setAppModalOpen(true)
                  : setOppModalOpen(true)
              }
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-[#0B1A33] hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>
                {activeSection === 'applicants' ? 'Add Applicant' : 'New Opportunity'}
              </span>
            </button>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-8 max-w-[1440px] w-full mx-auto">
          {notice && (
            <div
              role="status"
              className="mb-5 px-4 py-2.5 text-xs font-medium text-sky-950 bg-sky-50 border border-sky-200 rounded-lg flex items-center justify-between"
            >
              <span>{notice}</span>
              <button
                type="button"
                onClick={() => setNotice(null)}
                className="text-sky-700 hover:text-sky-900"
              >
                Dismiss
              </button>
            </div>
          )}

          {workspaceError ? (
            <div className="bg-white border border-red-200 rounded-xl p-6 text-center space-y-3">
              <p className="text-sm text-red-700">{workspaceError}</p>
              <button
                type="button"
                onClick={() => void loadWorkspace()}
                className="px-4 py-2 text-xs font-medium text-white bg-[#0B1A33] rounded-lg"
              >
                Reload Workspace
              </button>
            </div>
          ) : workspaceLoading ? (
            <div className="space-y-4">
              <div className="h-24 bg-white border border-slate-200 rounded-xl animate-pulse" />
              <div className="h-72 bg-white border border-slate-200 rounded-xl animate-pulse" />
            </div>
          ) : (
            <>
              {activeSection === 'overview' && (
                <OverviewView
                  opportunities={opportunities}
                  applicants={applicants}
                  feedback={feedback}
                  socialLeads={socialLeads}
                  scanMeta={scanMeta}
                  scanning={scanning}
                  onScanNow={() => void runSocialScan()}
                  onNavigate={setActiveSection}
                  onImportLead={(lead) => void handleImportSocialLead(lead)}
                  onSelectOpportunity={(opp) => {
                    setSelectedOpportunityId(opp.id);
                    setActiveSection('opportunities');
                  }}
                  onLeaveFeedback={handleLeaveFeedback}
                />
              )}

              {activeSection === 'scanner' && (
                <SocialScannerView
                  leads={socialLeads}
                  meta={scanMeta}
                  scanning={scanning}
                  scanError={scanError}
                  query={scanQuery}
                  platformFilter={platformFilter}
                  serviceFilter={serviceFilter}
                  industryFilter={industryFilter}
                  onQueryChange={setScanQuery}
                  onPlatformChange={setPlatformFilter}
                  onServiceChange={setServiceFilter}
                  onIndustryChange={setIndustryFilter}
                  onRunScan={(q, p, s, ind) => void runSocialScan(q, p, s, ind)}
                  opportunities={opportunities}
                  onImportLead={(lead) => void handleImportSocialLead(lead)}
                  onVerifyPost={handleVerifyPost}
                  onSaveVerifiedPost={(res) => void handleSaveVerifiedPost(res)}
                  onLeaveFeedback={handleLeaveFeedback}
                />
              )}

              {activeSection === 'opportunities' && (
                <OpportunitiesView
                  opportunities={opportunities}
                  applicants={applicants}
                  selectedOpportunity={selectedOpportunity}
                  onSelectOpportunity={(opp) =>
                    setSelectedOpportunityId(opp ? opp.id : null)
                  }
                  onUpdateOpportunity={handleUpdateOpportunity}
                  onDeleteOpportunity={handleDeleteOpportunity}
                  onOpenAddModal={() => setOppModalOpen(true)}
                  onLeaveFeedback={handleLeaveFeedback}
                />
              )}

              {activeSection === 'applicants' && (
                <ApplicantsView
                  applicants={applicants}
                  opportunities={opportunities}
                  onUpdateApplicant={handleUpdateApplicant}
                  onDeleteApplicant={handleDeleteApplicant}
                  onOpenAddModal={() => setAppModalOpen(true)}
                  onLeaveFeedback={handleLeaveFeedback}
                />
              )}

              {activeSection === 'feedback' && (
                <FeedbackView
                  feedback={feedback}
                  opportunities={opportunities}
                  applicants={applicants}
                  socialLeads={socialLeads}
                  draftTarget={feedbackDraft}
                  onClearDraftTarget={() => setFeedbackDraft(null)}
                  onSubmitFeedback={handleSubmitFeedback}
                  onUpdateFeedbackStatus={handleUpdateFeedbackStatus}
                  onDeleteFeedback={handleDeleteFeedback}
                />
              )}
            </>
          )}
        </main>
      </div>

      <OpportunityModal
        open={oppModalOpen}
        onClose={() => setOppModalOpen(false)}
        onCreate={handleCreateOpportunity}
      />

      <ApplicantModal
        open={appModalOpen}
        opportunities={opportunities}
        onClose={() => setAppModalOpen(false)}
        onCreate={handleCreateApplicant}
      />
    </div>
  );
}
