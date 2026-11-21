export type SocialPlatform =
  | 'Reddit'
  | 'Hacker News'
  | 'Mastodon'
  | 'Remotive'
  | 'Dev.to'
  | 'X (Twitter)'
  | 'LinkedIn'
  | 'Indie Hackers'
  | 'Threads'
  | 'Facebook'
  | 'Web Community';

export type ServiceCategory =
  | 'Full-Stack Web Dev'
  | 'Website Development'
  | 'SEO'
  | 'AEO'
  | 'Digital Marketing';

export type IndustryCategory =
  | 'All Industries'
  | 'SaaS & Software'
  | 'E-Commerce & Retail'
  | 'Healthcare & MedTech'
  | 'Finance & FinTech'
  | 'Real Estate & PropTech'
  | 'Education & EdTech'
  | 'Hospitality & Travel'
  | 'Legal & Consulting'
  | 'Media & Entertainment'
  | 'Manufacturing & Logistics'
  | 'Non-Profit & Community';

export type OpportunityStage =
  | 'Discovered'
  | 'Pitched'
  | 'Discovery Call'
  | 'Proposal Sent'
  | 'Won'
  | 'Archived';

export type OpportunityPriority = 'High' | 'Medium' | 'Low';

export type ApplicantStatus =
  | 'New'
  | 'Shortlisted'
  | 'Interviewing'
  | 'Assigned'
  | 'Declined';

export type ApplicantAvailability =
  | 'Immediate'
  | 'Within 1 Week'
  | 'Part-Time'
  | 'Booked';

export type FeedbackTargetType =
  | 'Social Post'
  | 'Project Opportunity'
  | 'Applicant'
  | 'Service / General';

export type FeedbackStatus = 'Open' | 'Reviewed' | 'Actioned';

export interface SocialLead {
  id: string;
  title: string;
  author: string;
  authorProfileUrl: string;
  platform: SocialPlatform;
  sourceChannel: string;
  serviceCategory: ServiceCategory;
  industry: Exclude<IndustryCategory, 'All Industries'>;
  url: string;
  contactEmail: string;
  contactPhone: string;
  websiteUrl: string;
  socialLinks: string[];
  summary: string;
  postedAt: string;
  postedTimestamp: number;
  budget: string;
  techStack: string[];
  needsFreelanceWebDev: boolean;
  verificationNote: string;
  fetchMethod: 'Direct Public API' | 'Google Search Grounded';
}

export interface SourceStatus {
  count: number;
  status: 'ok' | 'skipped' | 'error';
  message?: string;
}

export interface SocialScanMeta {
  scannedAt: string;
  query: string;
  platformFilter: string;
  serviceFilter: string;
  industryFilter: string;
  totalFetched: number;
  confirmedFreelanceNeeds: number;
  sources: {
    remotive: SourceStatus;
    devTo: SourceStatus;
    mastodon: SourceStatus;
    hackerNews: SourceStatus;
    reddit: SourceStatus;
    searchGrounded: SourceStatus;
  };
}

export interface SocialScanResponse {
  leads: SocialLead[];
  meta: SocialScanMeta;
}

export interface ProjectOpportunity {
  id: string;
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
  budgetValue: number;
  techStack: string[];
  stage: OpportunityStage;
  priority: OpportunityPriority;
  deadline: string;
  notes: string;
  assignedApplicantIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Applicant {
  id: string;
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
  appliedAt: string;
}

export interface FeedbackEntry {
  id: string;
  authorName: string;
  serviceCategory: ServiceCategory;
  targetType: FeedbackTargetType;
  targetId: string;
  targetTitle: string;
  rating: number;
  comment: string;
  status: FeedbackStatus;
  createdAt: string;
}

export interface PostVerificationResult {
  needsFreelanceWebDev: boolean;
  verdictLabel: string;
  confidenceReason: string;
  suggestedTitle: string;
  clientOrAuthor: string;
  authorProfileUrl: string;
  contactEmail: string;
  websiteUrl: string;
  socialLinks: string[];
  platformGuess: SocialPlatform;
  serviceCategory: ServiceCategory;
  industry: Exclude<IndustryCategory, 'All Industries'>;
  budgetExtracted: string;
  techStack: string[];
  summary: string;
  recommendedPitch: string;
  sourceUrl: string;
}

export interface AuthStatusResponse {
  mode: 'setup' | 'login';
  envConfigured: boolean;
}

export interface AuthSessionResponse {
  token: string;
  username: string;
  expiresAt: string;
}

