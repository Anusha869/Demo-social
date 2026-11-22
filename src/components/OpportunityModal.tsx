import React from 'react';
import { X } from 'lucide-react';
import type {
  IndustryCategory,
  OpportunityPriority,
  OpportunityStage,
  ServiceCategory,
} from '../types.ts';

const INDUSTRY_CHOICES: Array<Exclude<IndustryCategory, 'All Industries'>> = [
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

interface OpportunityModalProps {
  open: boolean;
  onClose: () => void;
  onCreate: (payload: {
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
    stage: OpportunityStage;
    priority: OpportunityPriority;
    deadline: string;
    notes: string;
  }) => Promise<void>;
}

export const OpportunityModal: React.FC<OpportunityModalProps> = ({
  open,
  onClose,
  onCreate,
}) => {
  const [title, setTitle] = React.useState('');
  const [clientName, setClientName] = React.useState('');
  const [clientHandle, setClientHandle] = React.useState('');
  const [platform, setPlatform] = React.useState('LinkedIn');
  const [serviceCategory, setServiceCategory] =
    React.useState<ServiceCategory>('Website Dev + SEO');
  const [industry, setIndustry] = React.useState('SaaS & Software');
  const [sourceUrl, setSourceUrl] = React.useState('');
  const [authorProfileUrl, setAuthorProfileUrl] = React.useState('');
  const [contactEmail, setContactEmail] = React.useState('');
  const [contactPhone, setContactPhone] = React.useState('');
  const [websiteUrl, setWebsiteUrl] = React.useState('');
  const [budget, setBudget] = React.useState('');
  const [techInput, setTechInput] = React.useState('React, Next.js, Node.js, SEO');
  const [stage, setStage] = React.useState<OpportunityStage>('Discovered');
  const [priority, setPriority] = React.useState<OpportunityPriority>('Medium');
  const [deadline, setDeadline] = React.useState('');
  const [notes, setNotes] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Project title is required.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const socialLinks = [authorProfileUrl.trim(), sourceUrl.trim()].filter(Boolean);
      await onCreate({
        title: title.trim(),
        clientName: clientName.trim() || 'Direct Client',
        clientHandle: clientHandle.trim(),
        platform,
        serviceCategory,
        industry,
        sourceUrl: sourceUrl.trim(),
        authorProfileUrl: authorProfileUrl.trim(),
        contactEmail: contactEmail.trim(),
        contactPhone: contactPhone.trim(),
        websiteUrl: websiteUrl.trim(),
        socialLinks,
        budget: budget.trim() || 'Not specified',
        techStack: techInput
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        stage,
        priority,
        deadline: deadline.trim() || 'Flexible',
        notes: notes.trim(),
      });
      setTitle('');
      setClientName('');
      setClientHandle('');
      setSourceUrl('');
      setAuthorProfileUrl('');
      setContactEmail('');
      setContactPhone('');
      setWebsiteUrl('');
      setBudget('');
      setDeadline('');
      setNotes('');
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save opportunity.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/45">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-opp-title"
        className="w-full max-w-2xl bg-white border border-slate-200 rounded-xl overflow-hidden"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h2 id="add-opp-title" className="font-display text-base font-semibold text-slate-900">
            Add Project Opportunity
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

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Project Title *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., E-Commerce Storefront Rebuild in Next.js"
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-sky-600"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Client / Company Name
              </label>
              <input
                type="text"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="e.g., Sarah Jenkins (Apex Bio)"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-sky-600"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Social Handle
              </label>
              <input
                type="text"
                value={clientHandle}
                onChange={(e) => setClientHandle(e.target.value)}
                placeholder="e.g., @sarah_apex"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-sky-600"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Digital Service
              </label>
              <select
                value={serviceCategory}
                onChange={(e) => setServiceCategory(e.target.value as ServiceCategory)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:border-sky-600"
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
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:border-sky-600"
              >
                {INDUSTRY_CHOICES.map((ind) => (
                  <option key={ind} value={ind}>
                    {ind}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Source Platform
              </label>
              <select
                value={platform}
                onChange={(e) => setPlatform(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:border-sky-600"
              >
                <option value="Himalayas">Himalayas</option>
                <option value="RemoteOK">RemoteOK</option>
                <option value="Jobicy">Jobicy</option>
                <option value="Arbeitnow">Arbeitnow</option>
                <option value="LinkedIn">LinkedIn</option>
                <option value="X (Twitter)">X (Twitter)</option>
                <option value="Mastodon">Mastodon</option>
                <option value="Reddit">Reddit</option>
                <option value="Hacker News">Hacker News</option>
                <option value="Threads">Threads</option>
                <option value="Facebook">Facebook</option>
                <option value="Remotive">Remotive</option>
                <option value="Dev.to">Dev.to</option>
                <option value="Direct Referral">Direct Referral</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Original Post URL
              </label>
              <input
                type="url"
                value={sourceUrl}
                onChange={(e) => setSourceUrl(e.target.value)}
                placeholder="https://..."
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-sky-600"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Author Social Profile URL
              </label>
              <input
                type="url"
                value={authorProfileUrl}
                onChange={(e) => setAuthorProfileUrl(e.target.value)}
                placeholder="https://..."
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-sky-600"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Contact Email
              </label>
              <input
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder="name@company.com"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-sky-600"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Contact Phone
              </label>
              <input
                type="text"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                placeholder="+1 555..."
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-sky-600"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Website URL
              </label>
              <input
                type="url"
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
                placeholder="https://company.com"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-sky-600"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Budget / Rate
              </label>
              <input
                type="text"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                placeholder="$2,500 fixed"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-sky-600"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Stage
              </label>
              <select
                value={stage}
                onChange={(e) => setStage(e.target.value as OpportunityStage)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:border-sky-600"
              >
                <option value="Discovered">Discovered</option>
                <option value="Pitched">Pitched</option>
                <option value="Discovery Call">Discovery Call</option>
                <option value="Proposal Sent">Proposal Sent</option>
                <option value="Won">Won</option>
                <option value="Archived">Archived</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as OpportunityPriority)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:border-sky-600"
              >
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Tech Stack (comma separated)
              </label>
              <input
                type="text"
                value={techInput}
                onChange={(e) => setTechInput(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-sky-600"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Target Deadline
              </label>
              <input
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-sky-600"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Scope &amp; Outreach Notes
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Client requirements, deliverables, or follow-up dates..."
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
              {submitting ? 'Saving...' : 'Save Opportunity'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
