import React from 'react';
import {
  ArrowUpRight,
  CheckCircle2,
  MessageSquarePlus,
  Plus,
  RefreshCw,
} from 'lucide-react';
import type {
  Applicant,
  FeedbackEntry,
  ProjectOpportunity,
  SocialLead,
  SocialScanMeta,
} from '../types.ts';
import type { NavSection } from './Sidebar.tsx';
import type { FeedbackDraftTarget } from './FeedbackView.tsx';

interface OverviewViewProps {
  opportunities: ProjectOpportunity[];
  applicants: Applicant[];
  feedback: FeedbackEntry[];
  socialLeads: SocialLead[];
  scanMeta: SocialScanMeta | null;
  scanning: boolean;
  onScanNow: () => void;
  onNavigate: (section: NavSection) => void;
  onImportLead: (lead: SocialLead) => void;
  onSelectOpportunity: (opp: ProjectOpportunity) => void;
  onLeaveFeedback: (draft: FeedbackDraftTarget) => void;
}

function formatRelativeTime(isoDate: string): string {
  const diffMs = Date.now() - Date.parse(isoDate);
  if (!Number.isFinite(diffMs) || diffMs < 0) return 'Recent';
  const mins = Math.floor(diffMs / 60000);
  if (mins < 60) return `${Math.max(1, mins)}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function stageTone(stage: ProjectOpportunity['stage']): string {
  switch (stage) {
    case 'Won':
      return 'text-emerald-700 font-medium';
    case 'Proposal Sent':
    case 'Discovery Call':
      return 'text-amber-700 font-medium';
    case 'Pitched':
    case 'Discovered':
      return 'text-sky-700 font-medium';
    default:
      return 'text-slate-500';
  }
}

export const OverviewView: React.FC<OverviewViewProps> = ({
  opportunities,
  applicants,
  feedback,
  socialLeads,
  scanMeta,
  scanning,
  onScanNow,
  onNavigate,
  onImportLead,
  onSelectOpportunity,
  onLeaveFeedback,
}) => {
  const activeOpps = opportunities.filter((o) => o.stage !== 'Archived');
  const wonOpps = opportunities.filter((o) => o.stage === 'Won');
  const pipelineTotal = activeOpps.reduce((sum, o) => sum + (o.budgetValue || 0), 0);
  const fullStackApplicants = applicants.filter((a) =>
    /full[\s-]?stack|next\.?js|node\.?js|react/i.test(`${a.role} ${a.skills.join(' ')}`)
  );
  const trackedUrls = new Set(opportunities.map((o) => o.sourceUrl).filter(Boolean));

  const serviceBreakdown = [
    { label: 'Website Dev + SEO', count: opportunities.filter((o) => o.serviceCategory === 'Website Dev + SEO').length },
    { label: 'Website Dev', count: opportunities.filter((o) => o.serviceCategory === 'Website Development').length },
    { label: 'SEO', count: opportunities.filter((o) => o.serviceCategory === 'SEO').length },
    { label: 'Full-Stack Web Dev', count: opportunities.filter((o) => o.serviceCategory === 'Full-Stack Web Dev').length },
  ];

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 border border-slate-200 bg-white rounded-xl divide-y sm:divide-y-0 sm:divide-x divide-slate-200">
        <div className="p-5 space-y-1.5">
          <p className="text-xs font-medium text-slate-500">Active Digital Services Pipeline</p>
          <p className="font-mono text-2xl font-semibold text-slate-900 tabular-nums">
            ${pipelineTotal.toLocaleString()}
          </p>
          <p className="text-xs text-slate-500 tabular-nums">
            {activeOpps.length} active deals · {wonOpps.length} won
          </p>
        </div>

        <div className="p-5 space-y-1.5">
          <p className="text-xs font-medium text-slate-500">Recently Added API Posts</p>
          <p className="font-mono text-2xl font-semibold text-slate-900 tabular-nums">
            {socialLeads.length}
          </p>
          <p className="text-xs text-slate-500">
            {scanMeta
              ? `Fetched ${formatRelativeTime(scanMeta.scannedAt)}`
              : 'Website Dev + SEO Leads'}
          </p>
        </div>

        <div className="p-5 space-y-1.5">
          <p className="text-xs font-medium text-slate-500">Full-Stack &amp; Web Applicants</p>
          <p className="font-mono text-2xl font-semibold text-slate-900 tabular-nums">
            {applicants.length}
          </p>
          <p className="text-xs text-slate-500 tabular-nums">
            {fullStackApplicants.length} full-stack web engineers ready
          </p>
        </div>

        <div className="p-5 space-y-1.5">
          <p className="text-xs font-medium text-slate-500">Connected Backend Feedback</p>
          <p className="font-mono text-2xl font-semibold text-slate-900 tabular-nums">
            {feedback.length}
          </p>
          <p className="text-xs text-slate-500 tabular-nums">
            {feedback.filter((f) => f.status === 'Open').length} open ·{' '}
            {feedback.filter((f) => f.status === 'Actioned').length} actioned
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        <section className="xl:col-span-7 bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between gap-4 px-5 py-4 border-b border-slate-200">
            <div>
              <h2 className="font-display text-base font-semibold text-slate-900">
                Web Dev, SEO &amp; AEO Project Pipeline
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {serviceBreakdown.map((s) => `${s.label}: ${s.count}`).join(' · ')}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('opportunities')}
              className="text-xs font-medium text-sky-700 hover:text-sky-900 whitespace-nowrap shrink-0"
            >
              View All Projects
            </button>
          </div>

          {opportunities.length === 0 ? (
            <div className="p-8 text-center space-y-3">
              <p className="text-sm text-slate-600">
                No project opportunities tracked yet.
              </p>
              <button
                type="button"
                onClick={() => onNavigate('scanner')}
                className="px-4 py-2 text-xs font-medium text-white bg-[#0B1A33] rounded-lg hover:bg-slate-800"
              >
                Import From Recent Posts
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-medium text-slate-500">
                    <th className="py-2.5 px-5">Project &amp; Client</th>
                    <th className="py-2.5 px-3">Service</th>
                    <th className="py-2.5 px-3">Stage</th>
                    <th className="py-2.5 px-5 text-right">Budget</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {opportunities.slice(0, 6).map((opp) => (
                    <tr
                      key={opp.id}
                      onClick={() => onSelectOpportunity(opp)}
                      className="hover:bg-slate-50 cursor-pointer transition-colors"
                    >
                      <td className="py-3 px-5">
                        <p className="font-medium text-slate-900 truncate max-w-[260px]">
                          {opp.title}
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5 truncate max-w-[260px]">
                          {opp.clientName} · {opp.industry || 'SaaS & Software'} ·{' '}
                          {opp.assignedApplicantIds.length} assigned
                        </p>
                      </td>
                      <td className="py-3 px-3 text-xs font-medium text-sky-800 whitespace-nowrap">
                        {opp.serviceCategory}
                      </td>
                      <td className={`py-3 px-3 text-xs whitespace-nowrap ${stageTone(opp.stage)}`}>
                        {opp.stage}
                      </td>
                      <td className="py-3 px-5 text-right font-mono text-xs text-slate-800 tabular-nums whitespace-nowrap">
                        {opp.budget}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="xl:col-span-5 bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between gap-4 px-5 py-4 border-b border-slate-200">
            <div>
              <h2 className="font-display text-base font-semibold text-slate-900">
                Website Developer + SEO Leads
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Newest Website Dev + SEO posts with extracted contact numbers
              </p>
            </div>
            <button
              type="button"
              onClick={onScanNow}
              disabled={scanning}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap shrink-0 disabled:opacity-60"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${scanning ? 'animate-spin' : ''}`} />
              <span>{scanning ? 'Fetching' : 'Refresh'}</span>
            </button>
          </div>

          {scanning && socialLeads.length === 0 ? (
            <div className="divide-y divide-slate-100">
              {[1, 2, 3, 4].map((row) => (
                <div key={row} className="p-4 space-y-2 animate-pulse">
                  <div className="h-4 w-3/4 bg-slate-100 rounded" />
                  <div className="h-3 w-1/2 bg-slate-100 rounded" />
                </div>
              ))}
            </div>
          ) : socialLeads.length === 0 ? (
            <div className="p-8 text-center space-y-3">
              <p className="text-sm text-slate-600">
                Fetch live API feeds to view recently added freelance posts.
              </p>
              <button
                type="button"
                onClick={() => onNavigate('scanner')}
                className="px-4 py-2 text-xs font-medium text-white bg-[#0B1A33] rounded-lg hover:bg-slate-800"
              >
                Open Recently Added Posts
              </button>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {socialLeads.slice(0, 4).map((lead) => {
                const alreadyTracked = trackedUrls.has(lead.url);
                return (
                  <div key={lead.id} className="p-4 hover:bg-slate-50/70 transition-colors space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <a
                        href={lead.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-medium text-slate-900 hover:text-sky-700 leading-snug line-clamp-2"
                      >
                        {lead.title}
                      </a>
                      <a
                        href={lead.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`Open post on ${lead.platform}`}
                        className="text-slate-400 hover:text-sky-700 shrink-0 mt-0.5"
                      >
                        <ArrowUpRight className="h-4 w-4" />
                      </a>
                    </div>
                    <div className="flex items-center justify-between gap-3 text-xs text-slate-500">
                      <span className="truncate">
                        <strong className="font-medium text-sky-800">{lead.serviceCategory}</strong> ·{' '}
                        {lead.industry} · {lead.platform} · {formatRelativeTime(lead.postedAt)}
                        {lead.contactPhone ? ` · ${lead.contactPhone}` : ''}
                        {lead.contactEmail ? ` · ${lead.contactEmail}` : ''}
                      </span>
                      {alreadyTracked ? (
                        <span className="inline-flex items-center gap-1 text-emerald-700 font-medium whitespace-nowrap shrink-0">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Tracked
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onImportLead(lead)}
                          className="inline-flex items-center gap-1 text-sky-700 hover:text-sky-900 font-medium whitespace-nowrap shrink-0"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          Track
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="px-5 py-3 border-t border-slate-200 bg-slate-50/60 flex items-center justify-between">
            <span className="text-xs text-slate-500">
              Sorted newest first across live APIs
            </span>
            <button
              type="button"
              onClick={() => onNavigate('scanner')}
              className="text-xs font-medium text-sky-700 hover:text-sky-900 whitespace-nowrap"
            >
              See All Recent Posts
            </button>
          </div>
        </section>
      </div>

      <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between gap-4 px-5 py-4 border-b border-slate-200">
          <div>
            <h2 className="font-display text-base font-semibold text-slate-900">
              Connected Admin Feedback (Frontend → Backend)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Recent reviews for Full-Stack Web Dev applicants, SEO/AEO scopes, and client leads
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() =>
                onLeaveFeedback({
                  targetType: 'Service / General',
                  targetId: '',
                  targetTitle: 'Full-Stack Web Dev & Digital Services',
                  serviceCategory: 'Full-Stack Web Dev',
                })
              }
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-[#0B1A33] hover:bg-slate-800 rounded-lg whitespace-nowrap"
            >
              <MessageSquarePlus className="h-3.5 w-3.5" />
              <span>Add Feedback</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigate('feedback')}
              className="text-xs font-medium text-sky-700 hover:text-sky-900 whitespace-nowrap"
            >
              Manage All
            </button>
          </div>
        </div>

        {feedback.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-500">
            No feedback entries logged yet.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {feedback.slice(0, 3).map((item) => (
              <div
                key={item.id}
                className="px-5 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">
                    {item.targetTitle}
                  </p>
                  <p className="text-xs text-slate-600 mt-0.5 line-clamp-1">
                    {item.comment}
                  </p>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-500 shrink-0">
                  <span className="font-medium text-sky-800">{item.serviceCategory}</span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono text-slate-700 tabular-nums">{item.rating} / 5</span>
                  <span aria-hidden="true">·</span>
                  <span>{item.status}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
