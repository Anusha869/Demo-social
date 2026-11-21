import React from 'react';
import {
  MessageSquarePlus,
  Search,
  Trash2,
} from 'lucide-react';
import type {
  Applicant,
  FeedbackEntry,
  FeedbackStatus,
  FeedbackTargetType,
  ProjectOpportunity,
  ServiceCategory,
  SocialLead,
} from '../types.ts';

export interface FeedbackDraftTarget {
  targetType: FeedbackTargetType;
  targetId: string;
  targetTitle: string;
  serviceCategory: ServiceCategory;
}

interface FeedbackViewProps {
  feedback: FeedbackEntry[];
  opportunities: ProjectOpportunity[];
  applicants: Applicant[];
  socialLeads: SocialLead[];
  draftTarget: FeedbackDraftTarget | null;
  onClearDraftTarget: () => void;
  onSubmitFeedback: (payload: {
    authorName: string;
    serviceCategory: ServiceCategory;
    targetType: FeedbackTargetType;
    targetId: string;
    targetTitle: string;
    rating: number;
    comment: string;
  }) => Promise<void>;
  onUpdateFeedbackStatus: (id: string, status: FeedbackStatus) => Promise<void>;
  onDeleteFeedback: (id: string) => Promise<void>;
}

const SERVICES: Array<'All' | ServiceCategory> = [
  'All',
  'Full-Stack Web Dev',
  'Website Development',
  'SEO',
  'AEO',
  'Digital Marketing',
];

const STATUSES: Array<'All' | FeedbackStatus> = ['All', 'Open', 'Reviewed', 'Actioned'];

function statusColor(status: FeedbackStatus): string {
  if (status === 'Actioned') return 'text-emerald-700 font-medium';
  if (status === 'Reviewed') return 'text-sky-700 font-medium';
  return 'text-amber-700 font-medium';
}

export const FeedbackView: React.FC<FeedbackViewProps> = ({
  feedback,
  opportunities,
  applicants,
  socialLeads,
  draftTarget,
  onClearDraftTarget,
  onSubmitFeedback,
  onUpdateFeedbackStatus,
  onDeleteFeedback,
}) => {
  const [authorName, setAuthorName] = React.useState('HK Surya Admin');
  const [serviceCategory, setServiceCategory] =
    React.useState<ServiceCategory>('Full-Stack Web Dev');
  const [targetType, setTargetType] =
    React.useState<FeedbackTargetType>('Service / General');
  const [targetId, setTargetId] = React.useState('');
  const [targetTitle, setTargetTitle] = React.useState('Full-Stack & Digital Services');
  const [rating, setRating] = React.useState(5);
  const [comment, setComment] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const [search, setSearch] = React.useState('');
  const [serviceFilter, setServiceFilter] = React.useState<'All' | ServiceCategory>('All');
  const [statusFilter, setStatusFilter] = React.useState<'All' | FeedbackStatus>('All');

  React.useEffect(() => {
    if (draftTarget) {
      setTargetType(draftTarget.targetType);
      setTargetId(draftTarget.targetId);
      setTargetTitle(draftTarget.targetTitle);
      setServiceCategory(draftTarget.serviceCategory);
    }
  }, [draftTarget]);

  const targetOptions = React.useMemo(() => {
    if (targetType === 'Project Opportunity') {
      return opportunities.map((o) => ({ id: o.id, title: o.title, service: o.serviceCategory }));
    }
    if (targetType === 'Applicant') {
      return applicants.map((a) => ({
        id: a.id,
        title: `${a.fullName} — ${a.role}`,
        service: 'Full-Stack Web Dev' as ServiceCategory,
      }));
    }
    if (targetType === 'Social Post') {
      return socialLeads.map((l) => ({
        id: l.id,
        title: l.title,
        service: l.serviceCategory,
      }));
    }
    return [];
  }, [targetType, opportunities, applicants, socialLeads]);

  const handleTargetTypeChange = (nextType: FeedbackTargetType) => {
    setTargetType(nextType);
    onClearDraftTarget();
    if (nextType === 'Service / General') {
      setTargetId('');
      setTargetTitle('Digital Marketing & Web Dev Services');
    } else if (nextType === 'Project Opportunity' && opportunities[0]) {
      setTargetId(opportunities[0].id);
      setTargetTitle(opportunities[0].title);
      setServiceCategory(opportunities[0].serviceCategory);
    } else if (nextType === 'Applicant' && applicants[0]) {
      setTargetId(applicants[0].id);
      setTargetTitle(`${applicants[0].fullName} — ${applicants[0].role}`);
    } else if (nextType === 'Social Post' && socialLeads[0]) {
      setTargetId(socialLeads[0].id);
      setTargetTitle(socialLeads[0].title);
      setServiceCategory(socialLeads[0].serviceCategory);
    } else {
      setTargetId('');
      setTargetTitle('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) {
      setError('Please enter feedback notes before submitting.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await onSubmitFeedback({
        authorName: authorName.trim() || 'HK Surya Admin',
        serviceCategory,
        targetType,
        targetId,
        targetTitle: targetTitle.trim() || 'Digital Services Workspace',
        rating,
        comment: comment.trim(),
      });
      setComment('');
      onClearDraftTarget();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save feedback.');
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    return feedback.filter((item) => {
      if (serviceFilter !== 'All' && item.serviceCategory !== serviceFilter) return false;
      if (statusFilter !== 'All' && item.status !== statusFilter) return false;
      if (!q) return true;
      return (
        item.comment.toLowerCase().includes(q) ||
        item.targetTitle.toLowerCase().includes(q) ||
        item.authorName.toLowerCase().includes(q)
      );
    });
  }, [feedback, search, serviceFilter, statusFilter]);

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
      <section className="xl:col-span-5 bg-white border border-slate-200 rounded-xl p-5 space-y-4">
        <div className="space-y-1">
          <h2 className="font-display text-base font-semibold text-slate-900">
            Submit Admin &amp; Service Feedback
          </h2>
          <p className="text-xs text-slate-500">
            Log review notes directly from the frontend to the backend for recent posts, full-stack applicants, SEO/AEO deliverables, or client projects.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Reviewer Name
              </label>
              <input
                type="text"
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-sky-600"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Digital Service Scope
              </label>
              <select
                value={serviceCategory}
                onChange={(e) => setServiceCategory(e.target.value as ServiceCategory)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:border-sky-600"
              >
                <option value="Full-Stack Web Dev">Full-Stack Web Dev</option>
                <option value="Website Development">Website Development</option>
                <option value="SEO">SEO</option>
                <option value="AEO">AEO (Answer Engine Opt.)</option>
                <option value="Digital Marketing">Digital Marketing</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Connected Record Type
              </label>
              <select
                value={targetType}
                onChange={(e) => handleTargetTypeChange(e.target.value as FeedbackTargetType)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:border-sky-600"
              >
                <option value="Service / General">Service / General</option>
                <option value="Social Post">Recently Added Social Post</option>
                <option value="Project Opportunity">Project Opportunity</option>
                <option value="Applicant">Full-Stack / Web Applicant</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Quality / Fit Rating (1–5)
              </label>
              <select
                value={rating}
                onChange={(e) => setRating(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg bg-white focus:outline-none focus:border-sky-600"
              >
                <option value={5}>5 / 5 — Strong Fit</option>
                <option value={4}>4 / 5 — Good Fit</option>
                <option value={3}>3 / 5 — Moderate</option>
                <option value={2}>2 / 5 — Needs Review</option>
                <option value={1}>1 / 5 — Low Fit</option>
              </select>
            </div>
          </div>

          {targetOptions.length > 0 ? (
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Select Connected {targetType}
              </label>
              <select
                value={targetId}
                onChange={(e) => {
                  const chosen = targetOptions.find((opt) => opt.id === e.target.value);
                  setTargetId(e.target.value);
                  if (chosen) {
                    setTargetTitle(chosen.title);
                    setServiceCategory(chosen.service);
                  }
                }}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:border-sky-600"
              >
                <option value="">Choose record...</option>
                {targetOptions.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.title}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Subject / Service Area
              </label>
              <input
                type="text"
                value={targetTitle}
                onChange={(e) => setTargetTitle(e.target.value)}
                placeholder="e.g., Full-Stack React Pipeline, Technical SEO Audit..."
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-sky-600"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Feedback Notes *
            </label>
            <textarea
              rows={4}
              required
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Write detailed feedback on full-stack technical scope, SEO/AEO requirements, applicant code quality, or follow-up actions..."
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-sky-600"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-medium text-white bg-[#0B1A33] hover:bg-slate-800 rounded-lg transition-colors disabled:opacity-50"
          >
            <MessageSquarePlus className="h-4 w-4" />
            <span>{submitting ? 'Saving to Backend...' : 'Save Feedback to Backend'}</span>
          </button>
        </form>
      </section>

      <section className="xl:col-span-7 bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="p-5 border-b border-slate-200 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-base font-semibold text-slate-900">
                Connected Feedback Log
              </h2>
              <p className="text-xs text-slate-500 font-mono tabular-nums mt-0.5">
                {filtered.length} entries synced with server store
              </p>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search feedback..."
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-sky-600"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg">
              {SERVICES.map((svc) => (
                <button
                  key={svc}
                  type="button"
                  onClick={() => setServiceFilter(svc)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                    serviceFilter === svc
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {svc}
                </button>
              ))}
            </div>

            <div className="inline-flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
              {STATUSES.map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStatusFilter(st)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                    statusFilter === st
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="p-10 text-center space-y-2">
            <p className="text-sm font-medium text-slate-900">
              No feedback entries match this filter.
            </p>
            <p className="text-xs text-slate-500">
              Submit feedback using the form on the left to record notes in the backend.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-200">
            {filtered.map((item) => (
              <article key={item.id} className="p-5 space-y-2.5 hover:bg-slate-50/60 transition-colors">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
                    <span className="font-semibold text-slate-800">{item.serviceCategory}</span>
                    <span aria-hidden="true">·</span>
                    <span>{item.targetType}</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono text-slate-700 tabular-nums">
                      {item.rating} / 5
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono tabular-nums">
                      {new Date(item.createdAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <select
                      aria-label={`Feedback status for ${item.targetTitle}`}
                      value={item.status}
                      onChange={(e) =>
                        void onUpdateFeedbackStatus(item.id, e.target.value as FeedbackStatus)
                      }
                      className={`text-xs bg-white border border-slate-200 rounded-md px-2 py-1 focus:outline-none focus:border-sky-600 ${statusColor(
                        item.status
                      )}`}
                    >
                      <option value="Open">Open</option>
                      <option value="Reviewed">Reviewed</option>
                      <option value="Actioned">Actioned</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => void onDeleteFeedback(item.id)}
                      className="p-1.5 text-slate-400 hover:text-red-700 rounded"
                      aria-label="Delete feedback entry"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                <h3 className="font-display text-sm font-semibold text-slate-900">
                  {item.targetTitle}
                </h3>

                <p className="text-sm text-slate-600 leading-relaxed">{item.comment}</p>

                <p className="text-xs text-slate-400">Logged by {item.authorName}</p>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
