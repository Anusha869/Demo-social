import React from 'react';
import {
  ArrowUpRight,
  Globe,
  Mail,
  MessageSquarePlus,
  Phone,
  Plus,
  Search,
  Trash2,
  User,
  X,
} from 'lucide-react';
import type {
  Applicant,
  IndustryCategory,
  OpportunityPriority,
  OpportunityStage,
  ProjectOpportunity,
  ServiceCategory,
} from '../types.ts';
import type { FeedbackDraftTarget } from './FeedbackView.tsx';

interface OpportunitiesViewProps {
  opportunities: ProjectOpportunity[];
  applicants: Applicant[];
  selectedOpportunity: ProjectOpportunity | null;
  onSelectOpportunity: (opp: ProjectOpportunity | null) => void;
  onUpdateOpportunity: (id: string, patch: Partial<ProjectOpportunity>) => Promise<void>;
  onDeleteOpportunity: (id: string) => Promise<void>;
  onOpenAddModal: () => void;
  onLeaveFeedback: (draft: FeedbackDraftTarget) => void;
}

const STAGES: Array<'All' | OpportunityStage> = [
  'All',
  'Discovered',
  'Pitched',
  'Discovery Call',
  'Proposal Sent',
  'Won',
  'Archived',
];

const INDUSTRIES: IndustryCategory[] = [
  'All Industries',
  'SaaS & Software',
  'E-Commerce & Retail',
  'Healthcare & MedTech',
  'Finance & FinTech',
  'Real Estate & PropTech',
  'Education & EdTech',
  'Hospitality & Travel',
  'Legal & Consulting',
  'Media & Entertainment',
  'Manufacturing & Logistics',
  'Non-Profit & Community',
];

function priorityTextColor(priority: OpportunityPriority): string {
  if (priority === 'High') return 'text-amber-700 font-medium';
  if (priority === 'Medium') return 'text-slate-700';
  return 'text-slate-500';
}

function formatHostLabel(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

export const OpportunitiesView: React.FC<OpportunitiesViewProps> = ({
  opportunities,
  applicants,
  selectedOpportunity,
  onSelectOpportunity,
  onUpdateOpportunity,
  onDeleteOpportunity,
  onOpenAddModal,
  onLeaveFeedback,
}) => {
  const [search, setSearch] = React.useState('');
  const [stageFilter, setStageFilter] = React.useState<'All' | OpportunityStage>('All');
  const [industryFilter, setIndustryFilter] = React.useState<IndustryCategory>('All Industries');

  const [notesDraft, setNotesDraft] = React.useState('');
  const [budgetDraft, setBudgetDraft] = React.useState('');
  const [deadlineDraft, setDeadlineDraft] = React.useState('');
  const [emailDraft, setEmailDraft] = React.useState('');
  const [phoneDraft, setPhoneDraft] = React.useState('');
  const [websiteDraft, setWebsiteDraft] = React.useState('');

  React.useEffect(() => {
    if (selectedOpportunity) {
      setNotesDraft(selectedOpportunity.notes);
      setBudgetDraft(selectedOpportunity.budget);
      setDeadlineDraft(selectedOpportunity.deadline);
      setEmailDraft(selectedOpportunity.contactEmail || '');
      setPhoneDraft(selectedOpportunity.contactPhone || '');
      setWebsiteDraft(selectedOpportunity.websiteUrl || '');
    }
  }, [selectedOpportunity]);

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    return opportunities.filter((opp) => {
      if (stageFilter !== 'All' && opp.stage !== stageFilter) return false;
      if (industryFilter !== 'All Industries' && opp.industry !== industryFilter) return false;
      if (!q) return true;
      return (
        opp.title.toLowerCase().includes(q) ||
        opp.clientName.toLowerCase().includes(q) ||
        opp.platform.toLowerCase().includes(q) ||
        (opp.industry || '').toLowerCase().includes(q) ||
        (opp.contactEmail || '').toLowerCase().includes(q) ||
        (opp.contactPhone || '').toLowerCase().includes(q) ||
        opp.techStack.some((t) => t.toLowerCase().includes(q))
      );
    });
  }, [opportunities, search, stageFilter, industryFilter]);

  const totalFilteredBudget = filtered.reduce((sum, o) => sum + (o.budgetValue || 0), 0);

  const toggleAssignedApplicant = (applicantId: string) => {
    if (!selectedOpportunity) return;
    const exists = selectedOpportunity.assignedApplicantIds.includes(applicantId);
    const nextIds = exists
      ? selectedOpportunity.assignedApplicantIds.filter((id) => id !== applicantId)
      : [...selectedOpportunity.assignedApplicantIds, applicantId];
    void onUpdateOpportunity(selectedOpportunity.id, { assignedApplicantIds: nextIds });
  };

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h2 className="font-display text-lg font-semibold text-slate-900">
              Project Opportunities Pipeline
            </h2>
            <p className="text-xs text-slate-500 font-mono tabular-nums">
              {filtered.length} projects shown · Est. total ${totalFilteredBudget.toLocaleString()}
            </p>
          </div>
          <button
            type="button"
            onClick={onOpenAddModal}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-[#0B1A33] hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap shrink-0 self-start sm:self-auto"
          >
            <Plus className="h-4 w-4" />
            <span>Add Opportunity</span>
          </button>
        </div>

        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3">
          <div className="flex flex-col sm:flex-row gap-3 flex-1">
            <div className="relative flex-1 max-w-md">
              <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search projects, clients, email, or stack..."
                className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-sky-600"
              />
            </div>

            <select
              aria-label="Filter opportunities by industry"
              value={industryFilter}
              onChange={(e) => setIndustryFilter(e.target.value as IndustryCategory)}
              className="px-3 py-2 text-xs font-medium text-slate-800 bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-sky-600"
            >
              {INDUSTRIES.map((ind) => (
                <option key={ind} value={ind}>
                  {ind}
                </option>
              ))}
            </select>
          </div>

          <div
            className="inline-flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg"
            role="tablist"
            aria-label="Filter opportunities by stage"
          >
            {STAGES.map((stage) => {
              const active = stageFilter === stage;
              return (
                <button
                  key={stage}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setStageFilter(stage)}
                  className={`px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                    active
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {stage}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-10 text-center space-y-3">
            <p className="text-sm font-medium text-slate-900">
              No project opportunities match your current filter.
            </p>
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setStageFilter('All');
                setIndustryFilter('All Industries');
              }}
              className="px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-medium text-slate-500">
                  <th className="py-3 px-5">Project &amp; Client</th>
                  <th className="py-3 px-3">Service &amp; Industry</th>
                  <th className="py-3 px-3">Original Links &amp; Contact</th>
                  <th className="py-3 px-3">Stage</th>
                  <th className="py-3 px-3">Priority</th>
                  <th className="py-3 px-3 text-right">Developers</th>
                  <th className="py-3 px-3 text-right">Budget</th>
                  <th className="py-3 px-5 text-right">Deadline</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filtered.map((opp) => {
                  const isSelected = selectedOpportunity?.id === opp.id;
                  return (
                    <tr
                      key={opp.id}
                      onClick={() => onSelectOpportunity(opp)}
                      className={`cursor-pointer transition-colors ${
                        isSelected ? 'bg-sky-50/70' : 'hover:bg-slate-50'
                      }`}
                    >
                      <td className="py-3 px-5">
                        <p className="font-medium text-slate-900 max-w-[240px] truncate">
                          {opp.title}
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5 truncate max-w-[240px]">
                          {opp.clientName}
                          {opp.clientHandle ? ` · ${opp.clientHandle}` : ''}
                        </p>
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        <p className="text-xs font-medium text-sky-800">{opp.serviceCategory}</p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {opp.industry || 'SaaS & Software'}
                        </p>
                      </td>
                      <td
                        className="py-3 px-3 text-xs text-slate-600"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="space-y-0.5 max-w-[220px]">
                          {opp.sourceUrl ? (
                            <a
                              href={opp.sourceUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-sky-700 hover:underline font-medium"
                            >
                              <span>{opp.platform} Post</span>
                              <ArrowUpRight className="h-3 w-3" />
                            </a>
                          ) : (
                            <span>{opp.platform}</span>
                          )}
                          {opp.contactPhone && (
                            <p className="truncate">
                              <a
                                href={`tel:${opp.contactPhone}`}
                                className="text-emerald-700 hover:text-emerald-800 hover:underline font-mono font-medium"
                              >
                                {opp.contactPhone}
                              </a>
                            </p>
                          )}
                          {opp.contactEmail && (
                            <p className="truncate">
                              <a
                                href={`mailto:${opp.contactEmail}`}
                                className="text-slate-700 hover:text-sky-700 hover:underline font-mono"
                              >
                                {opp.contactEmail}
                              </a>
                            </p>
                          )}
                          {opp.websiteUrl && (
                            <p className="truncate">
                              <a
                                href={opp.websiteUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-slate-500 hover:text-sky-700 hover:underline"
                              >
                                {formatHostLabel(opp.websiteUrl)}
                              </a>
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-3" onClick={(e) => e.stopPropagation()}>
                        <select
                          aria-label={`Stage for ${opp.title}`}
                          value={opp.stage}
                          onChange={(e) =>
                            void onUpdateOpportunity(opp.id, {
                              stage: e.target.value as OpportunityStage,
                            })
                          }
                          className="text-xs font-medium text-slate-800 bg-white border border-slate-200 rounded-md px-2 py-1 focus:outline-none focus:border-sky-600"
                        >
                          {STAGES.filter((s): s is OpportunityStage => s !== 'All').map((st) => (
                            <option key={st} value={st}>
                              {st}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className={`py-3 px-3 text-xs whitespace-nowrap ${priorityTextColor(opp.priority)}`}>
                        {opp.priority}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-xs text-slate-700 tabular-nums">
                        {opp.assignedApplicantIds.length}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-xs text-slate-900 tabular-nums whitespace-nowrap">
                        {opp.budget}
                      </td>
                      <td className="py-3 px-5 text-right font-mono text-xs text-slate-500 tabular-nums whitespace-nowrap">
                        {opp.deadline}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedOpportunity && (
        <div className="fixed inset-0 z-40 flex justify-end bg-slate-900/30">
          <div
            className="w-full max-w-lg bg-white h-full border-l border-slate-200 flex flex-col overflow-hidden"
            role="dialog"
            aria-modal="true"
            aria-label="Project Opportunity Details"
          >
            <div className="flex items-start justify-between gap-4 px-6 py-4 border-b border-slate-200">
              <div className="min-w-0">
                <p className="text-xs text-slate-500">
                  {selectedOpportunity.platform} · {selectedOpportunity.industry || 'SaaS & Software'} ·{' '}
                  {selectedOpportunity.clientName}
                </p>
                <h3 className="font-display text-base font-semibold text-slate-900 mt-0.5">
                  {selectedOpportunity.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => onSelectOpportunity(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-md shrink-0"
                aria-label="Close drawer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-3 text-xs font-medium">
                  {selectedOpportunity.sourceUrl && (
                    <a
                      href={selectedOpportunity.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-sky-700 hover:underline"
                    >
                      <span>Original Post</span>
                      <ArrowUpRight className="h-3.5 w-3.5" />
                    </a>
                  )}
                  {selectedOpportunity.authorProfileUrl && (
                    <a
                      href={selectedOpportunity.authorProfileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-slate-700 hover:text-sky-700 hover:underline"
                    >
                      <User className="h-3.5 w-3.5" />
                      <span>Author Profile</span>
                    </a>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() =>
                    onLeaveFeedback({
                      targetType: 'Project Opportunity',
                      targetId: selectedOpportunity.id,
                      targetTitle: selectedOpportunity.title,
                      serviceCategory: selectedOpportunity.serviceCategory,
                    })
                  }
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg"
                >
                  <MessageSquarePlus className="h-3.5 w-3.5 text-sky-700" />
                  <span>Add Feedback</span>
                </button>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-3">
                <p className="text-xs font-semibold text-slate-800">
                  Original Contact Details &amp; Social Links
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="flex items-center gap-1 text-[11px] font-medium text-slate-600 mb-1">
                      <Mail className="h-3 w-3" />
                      <span>Contact Email</span>
                    </label>
                    <input
                      type="email"
                      value={emailDraft}
                      onChange={(e) => setEmailDraft(e.target.value)}
                      onBlur={() => {
                        if (emailDraft !== (selectedOpportunity.contactEmail || '')) {
                          void onUpdateOpportunity(selectedOpportunity.id, {
                            contactEmail: emailDraft,
                          });
                        }
                      }}
                      placeholder="Not listed in post"
                      className="w-full px-2.5 py-1.5 text-xs font-mono bg-white border border-slate-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="flex items-center gap-1 text-[11px] font-medium text-slate-600 mb-1">
                      <Phone className="h-3 w-3" />
                      <span>Contact Phone</span>
                    </label>
                    <input
                      type="text"
                      value={phoneDraft}
                      onChange={(e) => setPhoneDraft(e.target.value)}
                      onBlur={() => {
                        if (phoneDraft !== (selectedOpportunity.contactPhone || '')) {
                          void onUpdateOpportunity(selectedOpportunity.id, {
                            contactPhone: phoneDraft,
                          });
                        }
                      }}
                      placeholder="Not listed in post"
                      className="w-full px-2.5 py-1.5 text-xs font-mono bg-white border border-slate-300 rounded-md"
                    />
                  </div>
                </div>

                <div>
                  <label className="flex items-center gap-1 text-[11px] font-medium text-slate-600 mb-1">
                    <Globe className="h-3 w-3" />
                    <span>Website URL</span>
                  </label>
                  <input
                    type="url"
                    value={websiteDraft}
                    onChange={(e) => setWebsiteDraft(e.target.value)}
                    onBlur={() => {
                      if (websiteDraft !== (selectedOpportunity.websiteUrl || '')) {
                        void onUpdateOpportunity(selectedOpportunity.id, {
                          websiteUrl: websiteDraft,
                        });
                      }
                    }}
                    placeholder="Not listed in post"
                    className="w-full px-2.5 py-1.5 text-xs font-mono bg-white border border-slate-300 rounded-md"
                  />
                </div>

                {selectedOpportunity.socialLinks && selectedOpportunity.socialLinks.length > 0 && (
                  <div className="pt-1">
                    <p className="text-[11px] font-medium text-slate-600 mb-1">
                      Extracted Social Links
                    </p>
                    <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs">
                      {selectedOpportunity.socialLinks.map((link) => (
                        <a
                          key={link}
                          href={link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-sky-700 hover:underline"
                        >
                          <span>{formatHostLabel(link)}</span>
                          <ArrowUpRight className="h-3 w-3" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Digital Service Scope
                  </label>
                  <select
                    value={selectedOpportunity.serviceCategory}
                    onChange={(e) =>
                      void onUpdateOpportunity(selectedOpportunity.id, {
                        serviceCategory: e.target.value as ServiceCategory,
                      })
                    }
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="Website Dev + SEO">Website Dev + SEO</option>
                    <option value="Website Development">Website Development</option>
                    <option value="SEO">SEO</option>
                    <option value="Full-Stack Web Dev">Full-Stack Web Dev</option>
                    <option value="AEO">AEO (Answer Engine Opt.)</option>
                    <option value="Digital Marketing">Digital Marketing</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Industry
                  </label>
                  <select
                    value={selectedOpportunity.industry || 'SaaS & Software'}
                    onChange={(e) =>
                      void onUpdateOpportunity(selectedOpportunity.id, {
                        industry: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                  >
                    {INDUSTRIES.filter((ind) => ind !== 'All Industries').map((ind) => (
                      <option key={ind} value={ind}>
                        {ind}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Pipeline Stage
                  </label>
                  <select
                    value={selectedOpportunity.stage}
                    onChange={(e) =>
                      void onUpdateOpportunity(selectedOpportunity.id, {
                        stage: e.target.value as OpportunityStage,
                      })
                    }
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                  >
                    {STAGES.filter((s): s is OpportunityStage => s !== 'All').map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Priority
                  </label>
                  <select
                    value={selectedOpportunity.priority}
                    onChange={(e) =>
                      void onUpdateOpportunity(selectedOpportunity.id, {
                        priority: e.target.value as OpportunityPriority,
                      })
                    }
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Budget
                  </label>
                  <input
                    type="text"
                    value={budgetDraft}
                    onChange={(e) => setBudgetDraft(e.target.value)}
                    onBlur={() => {
                      if (budgetDraft !== selectedOpportunity.budget) {
                        void onUpdateOpportunity(selectedOpportunity.id, { budget: budgetDraft });
                      }
                    }}
                    className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Target Deadline
                  </label>
                  <input
                    type="text"
                    value={deadlineDraft}
                    onChange={(e) => setDeadlineDraft(e.target.value)}
                    onBlur={() => {
                      if (deadlineDraft !== selectedOpportunity.deadline) {
                        void onUpdateOpportunity(selectedOpportunity.id, {
                          deadline: deadlineDraft,
                        });
                      }
                    }}
                    className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Project Scope &amp; Notes
                </label>
                <textarea
                  rows={4}
                  value={notesDraft}
                  onChange={(e) => setNotesDraft(e.target.value)}
                  onBlur={() => {
                    if (notesDraft !== selectedOpportunity.notes) {
                      void onUpdateOpportunity(selectedOpportunity.id, { notes: notesDraft });
                    }
                  }}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-sky-600"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Changes save automatically when you leave the field.
                </p>
              </div>

              <div className="border-t border-slate-200 pt-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-display text-sm font-semibold text-slate-900">
                    Assigned Developer Applicants
                  </h4>
                  <span className="font-mono text-xs text-slate-500 tabular-nums">
                    {selectedOpportunity.assignedApplicantIds.length} assigned
                  </span>
                </div>

                {applicants.length === 0 ? (
                  <p className="text-xs text-slate-500">
                    No applicants registered yet. Add developers in Applicant Details to assign them here.
                  </p>
                ) : (
                  <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg">
                    {applicants.map((app) => {
                      const assigned = selectedOpportunity.assignedApplicantIds.includes(app.id);
                      return (
                        <label
                          key={app.id}
                          className="flex items-center justify-between gap-3 px-3.5 py-2.5 hover:bg-slate-50 cursor-pointer"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <input
                              type="checkbox"
                              checked={assigned}
                              onChange={() => toggleAssignedApplicant(app.id)}
                              className="h-4 w-4 rounded border-slate-300 text-sky-700 focus:ring-sky-600"
                            />
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-slate-900 truncate">
                                {app.fullName}
                              </p>
                              <p className="text-xs text-slate-500 truncate">
                                {app.role} · {app.availability}
                              </p>
                            </div>
                          </div>
                          <span className="font-mono text-xs text-slate-700 tabular-nums shrink-0">
                            ${app.hourlyRate}/hr
                          </span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
              <button
                type="button"
                onClick={() => void onDeleteOpportunity(selectedOpportunity.id)}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-red-700 hover:text-red-900"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Delete Opportunity</span>
              </button>
              <button
                type="button"
                onClick={() => onSelectOpportunity(null)}
                className="px-4 py-2 text-xs font-medium text-white bg-[#0B1A33] hover:bg-slate-800 rounded-lg"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
