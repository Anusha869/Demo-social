import fs from 'node:fs';
import path from 'node:path';
import type {
  Applicant,
  FeedbackEntry,
  ProjectOpportunity,
  ServiceCategory,
} from '../src/types.ts';

export interface AdminCredential {
  username: string;
  passwordHash: string;
  salt: string;
  createdAt: string;
}

export interface WorkspaceData {
  opportunities: ProjectOpportunity[];
  applicants: Applicant[];
  feedback: FeedbackEntry[];
  adminCredential?: AdminCredential;
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DATA_FILE = path.resolve(DATA_DIR, 'workspace.json');

const SEED_DATA: WorkspaceData = {
  opportunities: [
    {
      id: 'opp-seed-1',
      title: 'Full-Stack Next.js Website & Technical SEO/AEO Architecture',
      clientName: 'Arjun Mehta (FinGrid)',
      clientHandle: '@arjun_fingrid',
      platform: 'X (Twitter)',
      serviceCategory: 'Full-Stack Web Dev',
      industry: 'Finance & FinTech',
      sourceUrl: 'https://x.com',
      authorProfileUrl: 'https://x.com',
      contactEmail: '',
      contactPhone: '',
      websiteUrl: '',
      socialLinks: ['https://x.com'],
      budget: '$3,500 fixed',
      budgetValue: 3500,
      techStack: ['Next.js', 'TypeScript', 'Tailwind CSS', 'Schema.org'],
      stage: 'Proposal Sent',
      priority: 'High',
      deadline: '2026-12-12',
      notes: 'Full-stack marketing + SaaS dashboard site with Core Web Vitals optimization and structured JSON-LD for AEO.',
      assignedApplicantIds: ['app-seed-1'],
      createdAt: '2026-11-18T09:15:00.000Z',
      updatedAt: '2026-11-20T14:30:00.000Z',
    },
    {
      id: 'opp-seed-2',
      title: 'Shopify Storefront Rebuild + Product SEO & AEO Schema',
      clientName: 'Elena Rostova (Verve Atelier)',
      clientHandle: 'u/elena_verve',
      platform: 'Reddit',
      serviceCategory: 'SEO',
      industry: 'E-Commerce & Retail',
      sourceUrl: 'https://www.reddit.com/r/forhire/',
      authorProfileUrl: 'https://www.reddit.com/r/forhire/',
      contactEmail: '',
      contactPhone: '',
      websiteUrl: '',
      socialLinks: ['https://www.reddit.com/r/forhire/'],
      budget: '$2,400 fixed',
      budgetValue: 2400,
      techStack: ['Shopify', 'React', 'Technical SEO', 'AEO'],
      stage: 'Discovery Call',
      priority: 'High',
      deadline: '2026-12-05',
      notes: 'Custom storefront sections plus FAQ/Product schema markup for AI search visibility and organic rankings.',
      assignedApplicantIds: ['app-seed-2'],
      createdAt: '2026-11-19T11:40:00.000Z',
      updatedAt: '2026-11-20T16:10:00.000Z',
    },
    {
      id: 'opp-seed-3',
      title: 'Full-Stack Clinic Web Portal & Local SEO Landing Pages',
      clientName: 'Dr. Kavita Nair (CarePulse Clinic)',
      clientHandle: 'in/kavita-nair-md',
      platform: 'LinkedIn',
      serviceCategory: 'Full-Stack Web Dev',
      industry: 'Healthcare & MedTech',
      sourceUrl: 'https://www.linkedin.com',
      authorProfileUrl: 'https://www.linkedin.com',
      contactEmail: '',
      contactPhone: '',
      websiteUrl: '',
      socialLinks: ['https://www.linkedin.com'],
      budget: '$4,200 fixed',
      budgetValue: 4200,
      techStack: ['React', 'Node.js', 'PostgreSQL', 'Local SEO'],
      stage: 'Won',
      priority: 'High',
      deadline: '2026-12-22',
      notes: 'Kickoff completed. Delivering full-stack booking portal and city-level SEO/AEO service pages.',
      assignedApplicantIds: ['app-seed-1', 'app-seed-3'],
      createdAt: '2026-11-14T08:00:00.000Z',
      updatedAt: '2026-11-20T10:00:00.000Z',
    },
    {
      id: 'opp-seed-4',
      title: 'B2B Answer Engine Optimization (AEO) & WordPress Revamp',
      clientName: 'Marcus Vance (Harborview Realty)',
      clientHandle: 'mvance_hn',
      platform: 'Hacker News',
      serviceCategory: 'AEO',
      industry: 'Real Estate & PropTech',
      sourceUrl: 'https://news.ycombinator.com',
      authorProfileUrl: 'https://news.ycombinator.com',
      contactEmail: '',
      contactPhone: '',
      websiteUrl: '',
      socialLinks: ['https://news.ycombinator.com'],
      budget: '$45/hr (~40 hrs)',
      budgetValue: 1800,
      techStack: ['WordPress', 'AEO', 'Structured Data', 'Tailwind CSS'],
      stage: 'Pitched',
      priority: 'Medium',
      deadline: '2026-12-18',
      notes: 'Restructuring service hub pages for AI answer citations, entity clarity, and fast page speed.',
      assignedApplicantIds: [],
      createdAt: '2026-11-20T07:20:00.000Z',
      updatedAt: '2026-11-20T07:20:00.000Z',
    },
  ],
  applicants: [
    {
      id: 'app-seed-1',
      fullName: 'Rohan Kulkarni',
      email: 'rohan.kulkarni@example.com',
      role: 'Senior Full-Stack Web Developer (Next.js / Node.js)',
      location: 'Bengaluru, IN (IST)',
      sourcePlatform: 'LinkedIn',
      hourlyRate: 42,
      availability: 'Immediate',
      status: 'Assigned',
      skills: ['Next.js', 'React', 'TypeScript', 'Node.js', 'PostgreSQL', 'Technical SEO'],
      portfolioUrl: 'https://github.com',
      githubOrLinkedIn: 'https://www.linkedin.com',
      appliedForOpportunityId: 'opp-seed-1',
      experienceYears: 6,
      notes: 'Full-stack engineer specializing in SSR performance, Core Web Vitals, and structured AEO schema.',
      appliedAt: '2026-11-18T12:00:00.000Z',
    },
    {
      id: 'app-seed-2',
      fullName: 'Ananya Sharma',
      email: 'ananya.sharma@example.com',
      role: 'Full-Stack E-Commerce & Technical SEO Specialist',
      location: 'Pune, IN (IST)',
      sourcePlatform: 'Portfolio Inbound',
      hourlyRate: 36,
      availability: 'Immediate',
      status: 'Shortlisted',
      skills: ['Shopify', 'React', 'Node.js', 'Technical SEO', 'AEO', 'Tailwind CSS'],
      portfolioUrl: 'https://github.com',
      githubOrLinkedIn: 'https://www.linkedin.com',
      appliedForOpportunityId: 'opp-seed-2',
      experienceYears: 4,
      notes: 'Built custom storefronts with JSON-LD rich snippets and high organic conversion landing flows.',
      appliedAt: '2026-11-19T15:30:00.000Z',
    },
    {
      id: 'app-seed-3',
      fullName: 'Daniel Okafor',
      email: 'daniel.okafor@example.com',
      role: 'Full-Stack Web & API Engineer',
      location: 'Lagos, NG (WAT)',
      sourcePlatform: 'Reddit r/forhire',
      hourlyRate: 38,
      availability: 'Within 1 Week',
      status: 'Assigned',
      skills: ['React', 'Node.js', 'PostgreSQL', 'Express', 'TypeScript'],
      portfolioUrl: 'https://github.com',
      githubOrLinkedIn: 'https://www.linkedin.com',
      appliedForOpportunityId: 'opp-seed-3',
      experienceYears: 5,
      notes: 'Clean REST API design, authentication flows, and accessible full-stack web applications.',
      appliedAt: '2026-11-15T10:15:00.000Z',
    },
    {
      id: 'app-seed-4',
      fullName: 'Priya Venkatesh',
      email: 'priya.v@example.com',
      role: 'SEO, AEO & WordPress Web Developer',
      location: 'Chennai, IN (IST)',
      sourcePlatform: 'X (Twitter)',
      hourlyRate: 32,
      availability: 'Immediate',
      status: 'Interviewing',
      skills: ['WordPress', 'SEO', 'AEO', 'Schema.org', 'HTML/CSS', 'PHP'],
      portfolioUrl: 'https://github.com',
      githubOrLinkedIn: 'https://www.linkedin.com',
      appliedForOpportunityId: 'opp-seed-4',
      experienceYears: 5,
      notes: 'Specialized in Answer Engine Optimization (AEO), technical SEO audits, and custom WordPress builds.',
      appliedAt: '2026-11-20T09:45:00.000Z',
    },
    {
      id: 'app-seed-5',
      fullName: 'Lucas Fernandez',
      email: 'lucas.fernandez@example.com',
      role: 'Full-Stack Frontend & Conversion Landing Engineer',
      location: 'Buenos Aires, AR (ART)',
      sourcePlatform: 'Hacker News',
      hourlyRate: 45,
      availability: 'Part-Time',
      status: 'New',
      skills: ['React', 'Next.js', 'Tailwind CSS', 'Digital Marketing', 'CRO'],
      portfolioUrl: 'https://github.com',
      githubOrLinkedIn: 'https://www.linkedin.com',
      appliedForOpportunityId: 'opp-seed-1',
      experienceYears: 4,
      notes: 'Builds high-converting digital marketing landing pages and full-stack web experiences.',
      appliedAt: '2026-11-20T18:10:00.000Z',
    },
  ],
  feedback: [
    {
      id: 'fb-seed-1',
      authorName: 'HK Surya Admin',
      serviceCategory: 'Full-Stack Web Dev',
      targetType: 'Applicant',
      targetId: 'app-seed-1',
      targetTitle: 'Rohan Kulkarni',
      rating: 5,
      comment: 'Strong full-stack Next.js architecture sample and verified Core Web Vitals scores above 95. Approved for FinGrid proposal.',
      status: 'Actioned',
      createdAt: '2026-11-20T15:10:00.000Z',
    },
    {
      id: 'fb-seed-2',
      authorName: 'HK Surya Admin',
      serviceCategory: 'AEO',
      targetType: 'Project Opportunity',
      targetId: 'opp-seed-4',
      targetTitle: 'B2B Answer Engine Optimization (AEO) & WordPress Revamp',
      rating: 4,
      comment: 'Client specifically asked for AI search citation optimization and FAQ schema alongside WordPress speed improvements.',
      status: 'Reviewed',
      createdAt: '2026-11-20T19:05:00.000Z',
    },
  ],
};

function inferServiceCategory(opp: Partial<ProjectOpportunity>): ServiceCategory {
  if (opp.serviceCategory) return opp.serviceCategory;
  const text = `${opp.title ?? ''} ${opp.notes ?? ''} ${(opp.techStack ?? []).join(' ')}`.toLowerCase();
  if (/\baeo\b|answer engine/i.test(text)) return 'AEO';
  if (/\bseo\b|search engine/i.test(text)) return 'SEO';
  if (/full[\s-]?stack|node\.?js|postgresql|next\.?js/i.test(text)) return 'Full-Stack Web Dev';
  if (/marketing|cro|funnel|ads/i.test(text)) return 'Digital Marketing';
  return 'Website Development';
}

function ensureStore(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(SEED_DATA, null, 2), 'utf8');
  }
}

export function readWorkspace(): WorkspaceData {
  ensureStore();
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    const parsed = JSON.parse(raw) as Partial<WorkspaceData>;
    const opportunities = Array.isArray(parsed.opportunities)
      ? parsed.opportunities.map((opp) => ({
          ...opp,
          serviceCategory: inferServiceCategory(opp),
          industry: opp.industry || 'SaaS & Software',
          authorProfileUrl: opp.authorProfileUrl || '',
          contactEmail: opp.contactEmail || '',
          contactPhone: opp.contactPhone || '',
          websiteUrl: opp.websiteUrl || '',
          socialLinks: Array.isArray(opp.socialLinks) ? opp.socialLinks : [],
        }))
      : [];
    const applicants = Array.isArray(parsed.applicants) ? parsed.applicants : [];
    const feedback = Array.isArray(parsed.feedback)
      ? parsed.feedback
      : SEED_DATA.feedback;
    const rawCred = parsed.adminCredential as
      | (Partial<AdminCredential> & { email?: string })
      | undefined;
    const credUsername =
      typeof rawCred?.username === 'string' && rawCred.username
        ? rawCred.username
        : typeof rawCred?.email === 'string'
          ? rawCred.email
          : '';
    const adminCredential =
      rawCred &&
      credUsername &&
      typeof rawCred.passwordHash === 'string' &&
      typeof rawCred.salt === 'string'
        ? {
            username: credUsername,
            passwordHash: rawCred.passwordHash,
            salt: rawCred.salt,
            createdAt: rawCred.createdAt || new Date().toISOString(),
          }
        : undefined;
    return { opportunities, applicants, feedback, adminCredential };
  } catch {
    return { opportunities: [], applicants: [], feedback: [] };
  }
}

export function writeWorkspace(data: WorkspaceData): void {
  ensureStore();
  const existing = readWorkspace();
  const payload: WorkspaceData = {
    opportunities: data.opportunities,
    applicants: data.applicants,
    feedback: data.feedback,
    adminCredential: data.adminCredential ?? existing.adminCredential,
  };
  const tmpFile = path.resolve(DATA_DIR, `workspace.${Date.now()}.tmp`);
  if (!tmpFile.startsWith(DATA_DIR + path.sep)) {
    throw new Error('Invalid storage path');
  }
  fs.writeFileSync(tmpFile, JSON.stringify(payload, null, 2), 'utf8');
  fs.renameSync(tmpFile, DATA_FILE);
}

export function readAdminCredential(): AdminCredential | undefined {
  return readWorkspace().adminCredential;
}

export function saveAdminCredential(credential: AdminCredential): void {
  const existing = readWorkspace();
  if (existing.adminCredential) {
    throw new Error('Admin account has already been claimed.');
  }
  ensureStore();
  const payload: WorkspaceData = {
    ...existing,
    adminCredential: credential,
  };
  const tmpFile = path.resolve(DATA_DIR, `workspace.${Date.now()}.tmp`);
  if (!tmpFile.startsWith(DATA_DIR + path.sep)) {
    throw new Error('Invalid storage path');
  }
  fs.writeFileSync(tmpFile, JSON.stringify(payload, null, 2), 'utf8');
  fs.renameSync(tmpFile, DATA_FILE);
}

