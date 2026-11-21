import React from 'react';
import {
  AlertCircle,
  ArrowUpRight,
  Building2,
  CheckCircle2,
  Globe,
  Mail,
  MessageSquarePlus,
  Phone,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  User,
} from 'lucide-react';
import type {
  IndustryCategory,
  PostVerificationResult,
  ProjectOpportunity,
  SocialLead,
  SocialScanMeta,
} from '../types.ts';
import type { FeedbackDraftTarget } from './FeedbackView.tsx';

interface SocialScannerViewProps {
  leads: SocialLead[];
  meta: SocialScanMeta | null;
  scanning: boolean;
  scanError: string | null;
  query: string;
  platformFilter: string;
  serviceFilter: string;
  industryFilter: string;
  onQueryChange: (q: string) => void;
  onPlatformChange: (p: string) => void;
  onServiceChange: (s: string) => void;
  onIndustryChange: (i: string) => void;
  onRunScan: (
    queryOverride?: string,
    platformOverride?: string,
    serviceOverride?: string,
    industryOverride?: string
  ) => void;
  opportunities: ProjectOpportunity[];
  onImportLead: (lead: SocialLead) => void;
  onVerifyPost: (input: string) => Promise<PostVerificationResult>;
  onSaveVerifiedPost: (result: PostVerificationResult) => void;
  onLeaveFeedback: (draft: FeedbackDraftTarget) => void;
}

const PLATFORMS = [
  'All Platforms',
  'Mastodon',
  'Remotive',
  'Dev.to',
  'Hacker News',
  'Reddit',
  'X (Twitter)',
  'LinkedIn',
  'Threads',
  'Facebook',
];

const SERVICES = [
  'All Services',
  'Full-Stack Web Dev',
  'Website Development',
  'SEO',
  'AEO',
  'Digital Marketing',
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

function formatDateLabel(isoDate: string): string {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return 'Recent';
  const diffMs = Date.now() - date.getTime();
  const hours = Math.floor(diffMs / 3600000);
  if (hours >= 0 && hours < 24) return `${Math.max(1, hours)}h ago`;
  const days = Math.floor(hours / 24);
  if (days >= 1 && days <= 14) return `${days}d ago`;
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatHostLabel(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

export const SocialScannerView: React.FC<SocialScannerViewProps> = ({
  leads,
  meta,
  scanning,
  scanError,
  query,
  platformFilter,
  serviceFilter,
  industryFilter,
  onQueryChange,
  onPlatformChange,
  onServiceChange,
  onIndustryChange,
  onRunScan,
  opportunities,
  onImportLead,
  onVerifyPost,
  onSaveVerifiedPost,
  onLeaveFeedback,
}) => {
  const [verifyOpen, setVerifyOpen] = React.useState(false);
  const [verifyInput, setVerifyInput] = React.useState('');
  const [verifying, setVerifying] = React.useState(false);
  const [verifyError, setVerifyError] = React.useState<string | null>(null);
  const [verifyResult, setVerifyResult] = React.useState<PostVerificationResult | null>(null);

  const trackedUrls = React.useMemo(
    () => new Set(opportunities.map((o) => o.sourceUrl).filter(Boolean)),
    [opportunities]
  );

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onRunScan(query, platformFilter, serviceFilter, industryFilter);
  };

  const handleVerifyPost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verifyInput.trim()) return;
    setVerifying(true);
    setVerifyError(null);
    setVerifyResult(null);
    try {
      const data = await onVerifyPost(verifyInput.trim());
      setVerifyResult(data);
    } catch (err) {
      setVerifyError(err instanceof Error ? err.message : 'Verification failed.');
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <h2 className="font-display text-lg font-semibold text-slate-900">
              Recently Added Posts — All Social Platforms &amp; Industries
            </h2>
            <p className="text-sm text-slate-600">
              Select an industry to fetch recent freelance Full-Stack Web Dev, Website Development, SEO, AEO, and Digital Marketing posts with extracted original contact details and social links.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setVerifyOpen((prev) => !prev)}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap shrink-0 self-start lg:self-auto"
          >
            <ShieldCheck className="h-4 w-4 text-sky-700" />
            <span>{verifyOpen ? 'Hide Post Verifier' : 'Verify Specific Post URL / Text'}</span>
          </button>
        </div>

        <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 md:grid-cols-12 gap-3">
          <div className="relative md:col-span-6">
            <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={query}
              onChange={(e) => onQueryChange(e.target.value)}
              placeholder="Keyword filter (e.g., Full-Stack, Next.js, Technical SEO, AEO, Shopify)"
              className="w-full pl-10 pr-4 py-2.5 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-sky-600 focus:ring-1 focus:ring-sky-600"
            />
          </div>

          <div className="relative md:col-span-3">
            <Building2 className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <select
              aria-label="Select industry to fetch across all social media platforms"
              value={industryFilter}
              onChange={(e) => {
                const nextIndustry = e.target.value;
                onIndustryChange(nextIndustry);
                onRunScan(query, platformFilter, serviceFilter, nextIndustry);
              }}
              className="w-full pl-9 pr-3 py-2.5 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-sky-600 focus:ring-1 focus:ring-sky-600"
            >
              {INDUSTRIES.map((ind) => (
                <option key={ind} value={ind}>
                  {ind}
                </option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            disabled={scanning}
            className="md:col-span-3 inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-[#0B1A33] hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${scanning ? 'animate-spin' : ''}`} />
            <span>{scanning ? 'Fetching All Platforms...' : 'Fetch Recent Posts'}</span>
          </button>
        </form>

        <div className="space-y-3 pt-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-slate-500 mr-1">Service Scope:</span>
            <div
              className="inline-flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg"
              role="tablist"
              aria-label="Filter by digital service category"
            >
              {SERVICES.map((svc) => {
                const active = serviceFilter === svc;
                return (
                  <button
                    key={svc}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => {
                      onServiceChange(svc);
                      onRunScan(query, platformFilter, svc, industryFilter);
                    }}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                      active
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {svc}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium text-slate-500 mr-1">Social Platforms:</span>
              <div
                className="inline-flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg"
                role="tablist"
                aria-label="Filter by social media platform"
              >
                {PLATFORMS.map((platform) => {
                  const active = platformFilter === platform;
                  return (
                    <button
                      key={platform}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      onClick={() => {
                        onPlatformChange(platform);
                        onRunScan(query, platform, serviceFilter, industryFilter);
                      }}
                      className={`px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                        active
                          ? 'bg-white text-slate-900 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {platform}
                    </button>
                  );
                })}
              </div>
            </div>

            {meta && (
              <p className="text-xs text-slate-500 font-mono tabular-nums">
                Mastodon: {meta.sources.mastodon.count} · Remotive: {meta.sources.remotive.count} ·
                Dev.to: {meta.sources.devTo.count} · HN: {meta.sources.hackerNews.count} · Reddit:{' '}
                {meta.sources.reddit.count} · Search: {meta.sources.searchGrounded.count}
              </p>
            )}
          </div>
        </div>
      </div>

      {verifyOpen && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
          <div>
            <h3 className="font-display text-sm font-semibold text-slate-900">
              Verify Post Scope &amp; Extract Contact Links
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Paste a public post URL or copy-paste the post text to confirm it fits HK Surya Digital Solutions services and extract original contact info.
            </p>
          </div>
          <form onSubmit={handleVerifyPost} className="space-y-3">
            <textarea
              rows={3}
              value={verifyInput}
              onChange={(e) => setVerifyInput(e.target.value)}
              placeholder="Paste a social media URL (https://...) or raw post text..."
              className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-sky-600 focus:ring-1 focus:ring-sky-600"
            />
            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={verifying || !verifyInput.trim()}
                className="px-4 py-2 text-xs font-medium text-white bg-sky-700 hover:bg-sky-800 rounded-lg transition-colors whitespace-nowrap disabled:opacity-50"
              >
                {verifying ? 'Checking Post...' : 'Verify Post Intent'}
              </button>
              {verifyError && (
                <span className="text-xs text-red-600 flex items-center gap-1.5">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  {verifyError}
                </span>
              )}
            </div>
          </form>

          {verifyResult && (
            <div className="border-t border-slate-200 pt-4 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="space-y-0.5">
                  <p
                    className={`text-xs font-semibold ${
                      verifyResult.needsFreelanceWebDev ? 'text-emerald-700' : 'text-amber-700'
                    }`}
                  >
                    {verifyResult.verdictLabel} · {verifyResult.serviceCategory} ·{' '}
                    {verifyResult.industry}
                  </p>
                  <h4 className="font-display text-base font-semibold text-slate-900">
                    {verifyResult.suggestedTitle}
                  </h4>
                </div>
                {verifyResult.needsFreelanceWebDev && (
                  <button
                    type="button"
                    onClick={() => {
                      onSaveVerifiedPost(verifyResult);
                      setVerifyOpen(false);
                      setVerifyInput('');
                      setVerifyResult(null);
                    }}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-[#0B1A33] hover:bg-slate-800 rounded-lg whitespace-nowrap shrink-0"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Save to Project Opportunities
                  </button>
                )}
              </div>
              <p className="text-sm text-slate-700">{verifyResult.summary}</p>
              <p className="text-xs text-slate-500">
                {verifyResult.clientOrAuthor} · {verifyResult.platformGuess} · Budget:{' '}
                <span className="font-mono text-slate-800">{verifyResult.budgetExtracted}</span> · Stack:{' '}
                {verifyResult.techStack.join(', ') || verifyResult.serviceCategory}
              </p>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
                {verifyResult.contactEmail && (
                  <a
                    href={`mailto:${verifyResult.contactEmail}`}
                    className="inline-flex items-center gap-1 text-sky-700 hover:underline font-mono"
                  >
                    <Mail className="h-3.5 w-3.5" />
                    <span>{verifyResult.contactEmail}</span>
                  </a>
                )}
                {verifyResult.authorProfileUrl && (
                  <a
                    href={verifyResult.authorProfileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sky-700 hover:underline"
                  >
                    <User className="h-3.5 w-3.5" />
                    <span>Author Profile</span>
                    <ArrowUpRight className="h-3 w-3" />
                  </a>
                )}
                {verifyResult.websiteUrl && (
                  <a
                    href={verifyResult.websiteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sky-700 hover:underline"
                  >
                    <Globe className="h-3.5 w-3.5" />
                    <span>{formatHostLabel(verifyResult.websiteUrl)}</span>
                    <ArrowUpRight className="h-3 w-3" />
                  </a>
                )}
              </div>
              <p className="text-xs text-slate-600">
                Verification note: {verifyResult.confidenceReason}
              </p>
              {verifyResult.recommendedPitch && (
                <p className="text-xs text-slate-700 bg-slate-50 border border-slate-200 rounded-lg p-3">
                  Suggested outreach: {verifyResult.recommendedPitch}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {scanError && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5 text-sm text-red-800">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{scanError}</span>
          </div>
          <button
            type="button"
            onClick={() => onRunScan(query, platformFilter, serviceFilter, industryFilter)}
            className="px-3 py-1.5 text-xs font-medium text-red-800 bg-white border border-red-200 rounded-lg hover:bg-red-100 whitespace-nowrap"
          >
            Retry Scan
          </button>
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-3.5 border-b border-slate-200 bg-slate-50/70">
          <p className="text-xs font-medium text-slate-700">
            Live Fetched Posts · {industryFilter} ({leads.length})
          </p>
          {meta && (
            <p className="text-xs text-slate-500 font-mono tabular-nums">
              Synced: {new Date(meta.scannedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
          )}
        </div>

        {scanning ? (
          <div className="divide-y divide-slate-100">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="p-5 space-y-2.5 animate-pulse">
                <div className="h-4 w-2/3 bg-slate-100 rounded" />
                <div className="h-3 w-full bg-slate-100 rounded" />
                <div className="h-3 w-1/3 bg-slate-100 rounded" />
              </div>
            ))}
          </div>
        ) : leads.length === 0 ? (
          <div className="p-10 text-center space-y-3">
            <p className="text-sm font-medium text-slate-900">
              No matching recent posts found for {industryFilter} on {platformFilter}.
            </p>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Switch to All Industries or All Platforms to fetch the latest freelance Full-Stack Web Dev, Website Development, SEO, AEO, and Digital Marketing posts.
            </p>
            <button
              type="button"
              onClick={() => {
                onQueryChange('');
                onPlatformChange('All Platforms');
                onServiceChange('All Services');
                onIndustryChange('All Industries');
                onRunScan('', 'All Platforms', 'All Services', 'All Industries');
              }}
              className="px-4 py-2 text-xs font-medium text-white bg-[#0B1A33] hover:bg-slate-800 rounded-lg"
            >
              Reset &amp; Fetch All Industries
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-200">
            {leads.map((lead) => {
              const isTracked = trackedUrls.has(lead.url);
              const isVeryRecent = Date.now() - lead.postedTimestamp < 7 * 24 * 60 * 60 * 1000;
              const extraSocialLinks = (lead.socialLinks || []).filter(
                (link) => link !== lead.url && link !== lead.authorProfileUrl
              );

              return (
                <article
                  key={lead.id}
                  className="p-5 hover:bg-slate-50/60 transition-colors flex flex-col lg:flex-row lg:items-start justify-between gap-5"
                >
                  <div className="space-y-2 min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
                      <span className="font-semibold text-sky-800">{lead.serviceCategory}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-medium text-slate-700">{lead.industry}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-medium text-slate-900">
                        {lead.platform} ({lead.sourceChannel})
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>{lead.author}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono tabular-nums text-slate-700">
                        {formatDateLabel(lead.postedAt)}
                      </span>
                      {isVeryRecent && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="text-emerald-700 font-medium">Recently Added</span>
                        </>
                      )}
                    </div>

                    <h3 className="font-display text-base font-semibold text-slate-900 leading-snug">
                      <a
                        href={lead.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-sky-700 transition-colors"
                      >
                        {lead.title}
                      </a>
                    </h3>

                    <p className="text-sm text-slate-600 leading-relaxed max-w-4xl">
                      {lead.summary}
                    </p>

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                      <span>
                        Budget:{' '}
                        <strong className="font-mono font-medium text-slate-800">
                          {lead.budget}
                        </strong>
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>Stack: {lead.techStack.join(', ')}</span>
                      <span aria-hidden="true">·</span>
                      <span>{lead.verificationNote}</span>
                    </div>

                    <div className="pt-1 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-600 border-t border-slate-100">
                      <span className="font-medium text-slate-500">Original Contact &amp; Links:</span>

                      <a
                        href={lead.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-sky-700 hover:underline font-medium"
                      >
                        <span>Post ({formatHostLabel(lead.url)})</span>
                        <ArrowUpRight className="h-3 w-3" />
                      </a>

                      {lead.authorProfileUrl && (
                        <a
                          href={lead.authorProfileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-slate-700 hover:text-sky-700 hover:underline"
                        >
                          <User className="h-3.5 w-3.5 text-slate-400" />
                          <span>Author Profile</span>
                          <ArrowUpRight className="h-3 w-3" />
                        </a>
                      )}

                      {lead.contactEmail ? (
                        <a
                          href={`mailto:${lead.contactEmail}`}
                          className="inline-flex items-center gap-1 text-emerald-700 hover:underline font-mono"
                        >
                          <Mail className="h-3.5 w-3.5" />
                          <span>{lead.contactEmail}</span>
                        </a>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-slate-400">
                          <Mail className="h-3.5 w-3.5" />
                          <span>Email not listed in post</span>
                        </span>
                      )}

                      {lead.contactPhone && (
                        <a
                          href={`tel:${lead.contactPhone}`}
                          className="inline-flex items-center gap-1 text-emerald-700 hover:underline font-mono"
                        >
                          <Phone className="h-3.5 w-3.5" />
                          <span>{lead.contactPhone}</span>
                        </a>
                      )}

                      {lead.websiteUrl && (
                        <a
                          href={lead.websiteUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-sky-700 hover:underline"
                        >
                          <Globe className="h-3.5 w-3.5" />
                          <span>{formatHostLabel(lead.websiteUrl)}</span>
                          <ArrowUpRight className="h-3 w-3" />
                        </a>
                      )}

                      {extraSocialLinks.slice(0, 3).map((socialUrl) => (
                        <a
                          key={socialUrl}
                          href={socialUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-slate-700 hover:text-sky-700 hover:underline"
                        >
                          <span>{formatHostLabel(socialUrl)}</span>
                          <ArrowUpRight className="h-3 w-3" />
                        </a>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-wrap sm:flex-row lg:flex-col items-stretch sm:items-center lg:items-end gap-2 shrink-0">
                    {isTracked ? (
                      <span className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg whitespace-nowrap">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        In Project Pipeline
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onImportLead(lead)}
                        className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-[#0B1A33] hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Track Opportunity
                      </button>
                    )}

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          onLeaveFeedback({
                            targetType: 'Social Post',
                            targetId: lead.id,
                            targetTitle: lead.title,
                            serviceCategory: lead.serviceCategory,
                          })
                        }
                        className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:border-slate-300 hover:text-slate-900 rounded-lg transition-colors whitespace-nowrap"
                      >
                        <MessageSquarePlus className="h-3.5 w-3.5 text-sky-700" />
                        <span>Feedback</span>
                      </button>

                      <a
                        href={lead.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:border-slate-300 hover:text-slate-900 rounded-lg transition-colors whitespace-nowrap"
                      >
                        <span>Open Post</span>
                        <ArrowUpRight className="h-3.5 w-3.5" />
                      </a>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
