import React from 'react';
import {
  ArrowUpRight,
  Mail,
  MessageSquarePlus,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import type {
  Applicant,
  ApplicantAvailability,
  ApplicantStatus,
  ProjectOpportunity,
} from '../types.ts';
import type { FeedbackDraftTarget } from './FeedbackView.tsx';

interface ApplicantsViewProps {
  applicants: Applicant[];
  opportunities: ProjectOpportunity[];
  onUpdateApplicant: (id: string, patch: Partial<Applicant>) => Promise<void>;
  onDeleteApplicant: (id: string) => Promise<void>;
  onOpenAddModal: () => void;
  onLeaveFeedback: (draft: FeedbackDraftTarget) => void;
}

const STATUSES: Array<'All' | ApplicantStatus> = [
  'All',
  'New',
  'Shortlisted',
  'Interviewing',
  'Assigned',
  'Declined',
];

function availabilityTone(avail: ApplicantAvailability): string {
  if (avail === 'Immediate') return 'text-emerald-700 font-medium';
  if (avail === 'Within 1 Week') return 'text-sky-700 font-medium';
  if (avail === 'Part-Time') return 'text-amber-700';
  return 'text-slate-500';
}

export const ApplicantsView: React.FC<ApplicantsViewProps> = ({
  applicants,
  opportunities,
  onUpdateApplicant,
  onDeleteApplicant,
  onOpenAddModal,
  onLeaveFeedback,
}) => {
  const [search, setSearch] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<'All' | ApplicantStatus>('All');
  const [selectedApplicantId, setSelectedApplicantId] = React.useState<string | null>(null);
  const [notesDraft, setNotesDraft] = React.useState('');
  const [rateDraft, setRateDraft] = React.useState('');

  const selectedApplicant = React.useMemo(
    () => applicants.find((a) => a.id === selectedApplicantId) ?? null,
    [applicants, selectedApplicantId]
  );

  React.useEffect(() => {
    if (selectedApplicant) {
      setNotesDraft(selectedApplicant.notes);
      setRateDraft(String(selectedApplicant.hourlyRate));
    }
  }, [selectedApplicant]);

  const oppMap = React.useMemo(() => {
    const map = new Map<string, ProjectOpportunity>();
    for (const opp of opportunities) {
      map.set(opp.id, opp);
    }
    return map;
  }, [opportunities]);

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    return applicants.filter((app) => {
      if (statusFilter !== 'All' && app.status !== statusFilter) return false;
      if (!q) return true;
      return (
        app.fullName.toLowerCase().includes(q) ||
        app.role.toLowerCase().includes(q) ||
        app.location.toLowerCase().includes(q) ||
        app.skills.some((s) => s.toLowerCase().includes(q))
      );
    });
  }, [applicants, search, statusFilter]);

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h2 className="font-display text-lg font-semibold text-slate-900">
              Developer Applicant Roster
            </h2>
            <p className="text-xs text-slate-500 font-mono tabular-nums">
              {filtered.length} applicants ·{' '}
              {filtered.filter((a) => a.availability === 'Immediate').length} ready immediately
            </p>
          </div>
          <button
            type="button"
            onClick={onOpenAddModal}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-[#0B1A33] hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap shrink-0 self-start sm:self-auto"
          >
            <Plus className="h-4 w-4" />
            <span>Add Applicant</span>
          </button>
        </div>

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, role, location, or skills..."
              className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-sky-600"
            />
          </div>

          <div
            className="inline-flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg"
            role="tablist"
            aria-label="Filter applicants by status"
          >
            {STATUSES.map((status) => {
              const active = statusFilter === status;
              return (
                <button
                  key={status}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setStatusFilter(status)}
                  className={`px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                    active
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {status}
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
              No developer applicants match your search.
            </p>
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setStatusFilter('All');
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
                  <th className="py-3 px-5">Applicant</th>
                  <th className="py-3 px-3">Role &amp; Experience</th>
                  <th className="py-3 px-3">Skills</th>
                  <th className="py-3 px-3">Linked Project</th>
                  <th className="py-3 px-3">Availability</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-5 text-right">Hourly Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filtered.map((app) => {
                  const linkedOpp = app.appliedForOpportunityId
                    ? oppMap.get(app.appliedForOpportunityId)
                    : undefined;
                  const isSelected = selectedApplicantId === app.id;
                  return (
                    <tr
                      key={app.id}
                      onClick={() => setSelectedApplicantId(app.id)}
                      className={`cursor-pointer transition-colors ${
                        isSelected ? 'bg-sky-50/70' : 'hover:bg-slate-50'
                      }`}
                    >
                      <td className="py-3 px-5">
                        <p className="font-medium text-slate-900">{app.fullName}</p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {app.location} · {app.sourcePlatform}
                        </p>
                      </td>
                      <td className="py-3 px-3">
                        <p className="text-xs font-medium text-slate-800 max-w-[200px] truncate">
                          {app.role}
                        </p>
                        <p className="text-xs text-slate-500 font-mono tabular-nums mt-0.5">
                          {app.experienceYears} yrs exp
                        </p>
                      </td>
                      <td className="py-3 px-3 text-xs text-slate-600 max-w-[200px] truncate">
                        {app.skills.join(', ')}
                      </td>
                      <td className="py-3 px-3 text-xs text-slate-600 max-w-[180px] truncate">
                        {linkedOpp ? linkedOpp.title : 'General Talent Pool'}
                      </td>
                      <td
                        className={`py-3 px-3 text-xs whitespace-nowrap ${availabilityTone(
                          app.availability
                        )}`}
                      >
                        {app.availability}
                      </td>
                      <td className="py-3 px-3" onClick={(e) => e.stopPropagation()}>
                        <select
                          aria-label={`Status for ${app.fullName}`}
                          value={app.status}
                          onChange={(e) =>
                            void onUpdateApplicant(app.id, {
                              status: e.target.value as ApplicantStatus,
                            })
                          }
                          className="text-xs font-medium text-slate-800 bg-white border border-slate-200 rounded-md px-2 py-1 focus:outline-none focus:border-sky-600"
                        >
                          {STATUSES.filter((s): s is ApplicantStatus => s !== 'All').map((st) => (
                            <option key={st} value={st}>
                              {st}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="py-3 px-5 text-right font-mono text-xs text-slate-900 tabular-nums whitespace-nowrap">
                        ${app.hourlyRate}/hr
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedApplicant && (
        <div className="fixed inset-0 z-40 flex justify-end bg-slate-900/30">
          <div
            className="w-full max-w-lg bg-white h-full border-l border-slate-200 flex flex-col overflow-hidden"
            role="dialog"
            aria-modal="true"
            aria-label="Applicant Details"
          >
            <div className="flex items-start justify-between gap-4 px-6 py-4 border-b border-slate-200">
              <div className="min-w-0">
                <p className="text-xs text-slate-500">
                  {selectedApplicant.location} · Applied via {selectedApplicant.sourcePlatform}
                </p>
                <h3 className="font-display text-base font-semibold text-slate-900 mt-0.5">
                  {selectedApplicant.fullName}
                </h3>
                <p className="text-xs text-slate-600 mt-0.5">{selectedApplicant.role}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedApplicantId(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-md shrink-0"
                aria-label="Close drawer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div className="flex flex-wrap items-center gap-4 text-xs">
                {selectedApplicant.email && (
                  <a
                    href={`mailto:${selectedApplicant.email}`}
                    className="inline-flex items-center gap-1.5 text-slate-700 hover:text-sky-700"
                  >
                    <Mail className="h-3.5 w-3.5" />
                    <span>{selectedApplicant.email}</span>
                  </a>
                )}
                {selectedApplicant.portfolioUrl && (
                  <a
                    href={selectedApplicant.portfolioUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sky-700 hover:underline"
                  >
                    <span>Portfolio</span>
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </a>
                )}
                {selectedApplicant.githubOrLinkedIn && (
                  <a
                    href={selectedApplicant.githubOrLinkedIn}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sky-700 hover:underline"
                  >
                    <span>GitHub / LinkedIn</span>
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </a>
                )}
                <button
                  type="button"
                  onClick={() =>
                    onLeaveFeedback({
                      targetType: 'Applicant',
                      targetId: selectedApplicant.id,
                      targetTitle: `${selectedApplicant.fullName} — ${selectedApplicant.role}`,
                      serviceCategory: 'Full-Stack Web Dev',
                    })
                  }
                  className="ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg"
                >
                  <MessageSquarePlus className="h-3.5 w-3.5 text-sky-700" />
                  <span>Add Feedback</span>
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Screening Status
                  </label>
                  <select
                    value={selectedApplicant.status}
                    onChange={(e) =>
                      void onUpdateApplicant(selectedApplicant.id, {
                        status: e.target.value as ApplicantStatus,
                      })
                    }
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                  >
                    {STATUSES.filter((s): s is ApplicantStatus => s !== 'All').map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Availability
                  </label>
                  <select
                    value={selectedApplicant.availability}
                    onChange={(e) =>
                      void onUpdateApplicant(selectedApplicant.id, {
                        availability: e.target.value as ApplicantAvailability,
                      })
                    }
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="Immediate">Immediate</option>
                    <option value="Within 1 Week">Within 1 Week</option>
                    <option value="Part-Time">Part-Time</option>
                    <option value="Booked">Booked</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Hourly Rate ($ USD)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={rateDraft}
                    onChange={(e) => setRateDraft(e.target.value)}
                    onBlur={() => {
                      const nextRate = Number(rateDraft);
                      if (Number.isFinite(nextRate) && nextRate !== selectedApplicant.hourlyRate) {
                        void onUpdateApplicant(selectedApplicant.id, { hourlyRate: nextRate });
                      }
                    }}
                    className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Target Project Opportunity
                  </label>
                  <select
                    value={selectedApplicant.appliedForOpportunityId}
                    onChange={(e) =>
                      void onUpdateApplicant(selectedApplicant.id, {
                        appliedForOpportunityId: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="">General Talent Pool</option>
                    {opportunities.map((opp) => (
                      <option key={opp.id} value={opp.id}>
                        {opp.title}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <p className="text-xs font-medium text-slate-700 mb-1">Technical Skills</p>
                <p className="text-sm text-slate-700">
                  {selectedApplicant.skills.join(' · ') || 'No skills listed'}
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Evaluation &amp; Interview Notes
                </label>
                <textarea
                  rows={4}
                  value={notesDraft}
                  onChange={(e) => setNotesDraft(e.target.value)}
                  onBlur={() => {
                    if (notesDraft !== selectedApplicant.notes) {
                      void onUpdateApplicant(selectedApplicant.id, { notes: notesDraft });
                    }
                  }}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-sky-600"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Notes save automatically when you leave the field.
                </p>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  const id = selectedApplicant.id;
                  setSelectedApplicantId(null);
                  void onDeleteApplicant(id);
                }}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-red-700 hover:text-red-900"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Remove Applicant</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedApplicantId(null)}
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
