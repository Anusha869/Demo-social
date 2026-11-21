import React from 'react';
import { X } from 'lucide-react';
import type {
  ApplicantAvailability,
  ApplicantStatus,
  ProjectOpportunity,
} from '../types.ts';

interface ApplicantModalProps {
  open: boolean;
  opportunities: ProjectOpportunity[];
  onClose: () => void;
  onCreate: (payload: {
    fullName: string;
    email: string;
    role: string;
    location: string;
    sourcePlatform: string;
    hourlyRate: number;
    availability: ApplicantAvailability;
    status: ApplicantStatus;
    skills: string[];
    portfolioUrl: string;
    githubOrLinkedIn: string;
    appliedForOpportunityId: string;
    experienceYears: number;
    notes: string;
  }) => Promise<void>;
}

export const ApplicantModal: React.FC<ApplicantModalProps> = ({
  open,
  opportunities,
  onClose,
  onCreate,
}) => {
  const [fullName, setFullName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [role, setRole] = React.useState('');
  const [location, setLocation] = React.useState('');
  const [sourcePlatform, setSourcePlatform] = React.useState('LinkedIn');
  const [hourlyRate, setHourlyRate] = React.useState('35');
  const [experienceYears, setExperienceYears] = React.useState('4');
  const [availability, setAvailability] = React.useState<ApplicantAvailability>('Immediate');
  const [status, setStatus] = React.useState<ApplicantStatus>('New');
  const [skillsInput, setSkillsInput] = React.useState('React, TypeScript, Tailwind CSS');
  const [portfolioUrl, setPortfolioUrl] = React.useState('');
  const [githubOrLinkedIn, setGithubOrLinkedIn] = React.useState('');
  const [appliedForOpportunityId, setAppliedForOpportunityId] = React.useState('');
  const [notes, setNotes] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !role.trim()) {
      setError('Full name and developer role are required.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await onCreate({
        fullName: fullName.trim(),
        email: email.trim(),
        role: role.trim(),
        location: location.trim() || 'Remote',
        sourcePlatform,
        hourlyRate: Number(hourlyRate) || 35,
        availability,
        status,
        skills: skillsInput
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        portfolioUrl: portfolioUrl.trim(),
        githubOrLinkedIn: githubOrLinkedIn.trim(),
        appliedForOpportunityId,
        experienceYears: Number(experienceYears) || 2,
        notes: notes.trim(),
      });
      setFullName('');
      setEmail('');
      setRole('');
      setLocation('');
      setPortfolioUrl('');
      setGithubOrLinkedIn('');
      setAppliedForOpportunityId('');
      setNotes('');
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save applicant.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/45">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-app-title"
        className="w-full max-w-xl bg-white border border-slate-200 rounded-xl overflow-hidden"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h2 id="add-app-title" className="font-display text-base font-semibold text-slate-900">
            Add Developer Applicant
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-md"
            aria-label="Close modal"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[82vh] overflow-y-auto">
          {error && (
            <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Full Name *
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g., Meera Krishnan"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-sky-600"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="meera@example.com"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-sky-600"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Developer Specialty / Role *
              </label>
              <input
                type="text"
                required
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="e.g., Full-Stack Next.js Developer"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-sky-600"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Location / Timezone
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g., Hyderabad, IN (IST)"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-sky-600"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Rate ($/hr)
              </label>
              <input
                type="number"
                min={0}
                value={hourlyRate}
                onChange={(e) => setHourlyRate(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg focus:outline-none focus:border-sky-600"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Exp (Years)
              </label>
              <input
                type="number"
                min={0}
                max={40}
                value={experienceYears}
                onChange={(e) => setExperienceYears(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg focus:outline-none focus:border-sky-600"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Availability
              </label>
              <select
                value={availability}
                onChange={(e) => setAvailability(e.target.value as ApplicantAvailability)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:border-sky-600"
              >
                <option value="Immediate">Immediate</option>
                <option value="Within 1 Week">Within 1 Week</option>
                <option value="Part-Time">Part-Time</option>
                <option value="Booked">Booked</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as ApplicantStatus)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:border-sky-600"
              >
                <option value="New">New</option>
                <option value="Shortlisted">Shortlisted</option>
                <option value="Interviewing">Interviewing</option>
                <option value="Assigned">Assigned</option>
                <option value="Declined">Declined</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Source Platform
              </label>
              <select
                value={sourcePlatform}
                onChange={(e) => setSourcePlatform(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:border-sky-600"
              >
                <option value="LinkedIn">LinkedIn</option>
                <option value="Portfolio Inbound">Portfolio Inbound</option>
                <option value="Reddit r/forhire">Reddit r/forhire</option>
                <option value="X (Twitter)">X (Twitter)</option>
                <option value="Hacker News">Hacker News</option>
                <option value="Referral">Referral</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Target Project Opportunity
              </label>
              <select
                value={appliedForOpportunityId}
                onChange={(e) => setAppliedForOpportunityId(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:border-sky-600"
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
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Technical Skills (comma separated)
            </label>
            <input
              type="text"
              value={skillsInput}
              onChange={(e) => setSkillsInput(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-sky-600"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Portfolio URL
              </label>
              <input
                type="url"
                value={portfolioUrl}
                onChange={(e) => setPortfolioUrl(e.target.value)}
                placeholder="https://..."
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-sky-600"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                GitHub or LinkedIn URL
              </label>
              <input
                type="url"
                value={githubOrLinkedIn}
                onChange={(e) => setGithubOrLinkedIn(e.target.value)}
                placeholder="https://..."
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-sky-600"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Screening Notes
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Portfolio review, communication score, relevant past sites..."
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-sky-600"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 text-xs font-medium text-white bg-[#0B1A33] hover:bg-slate-800 rounded-lg disabled:opacity-50"
            >
              {submitting ? 'Saving...' : 'Add Applicant'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
