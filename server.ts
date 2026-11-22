import 'dotenv/config';
import express from 'express';
import path from 'node:path';
import type {
  Applicant,
  ApplicantAvailability,
  ApplicantStatus,
  FeedbackEntry,
  FeedbackStatus,
  FeedbackTargetType,
  OpportunityPriority,
  OpportunityStage,
  ProjectOpportunity,
  ServiceCategory,
} from './src/types.ts';
import { runSocialMediaScan, verifySocialPost } from './server/socialScanner.ts';
import { readWorkspace, writeWorkspace } from './server/store.ts';
import {
  clearFailedAttempts,
  getAuthMode,
  isRateLimited,
  issueAdminToken,
  recordFailedAttempt,
  requireAdminAuth,
  revokeAdminToken,
  setupInitialAdmin,
  verifyAdminLogin,
  type AuthenticatedRequest,
} from './server/auth.ts';

const PORT = Number(process.env.PORT || 3000);

const VALID_STAGES: OpportunityStage[] = [
  'Discovered',
  'Pitched',
  'Discovery Call',
  'Proposal Sent',
  'Won',
  'Archived',
];

const VALID_PRIORITIES: OpportunityPriority[] = ['High', 'Medium', 'Low'];

const VALID_SERVICES: ServiceCategory[] = [
  'Website Dev + SEO',
  'Website Development',
  'SEO',
  'Full-Stack Web Dev',
  'AEO',
  'Digital Marketing',
];

const VALID_APPLICANT_STATUSES: ApplicantStatus[] = [
  'New',
  'Shortlisted',
  'Interviewing',
  'Assigned',
  'Declined',
];

const VALID_AVAILABILITY: ApplicantAvailability[] = [
  'Immediate',
  'Within 1 Week',
  'Part-Time',
  'Booked',
];

const VALID_FEEDBACK_TARGETS: FeedbackTargetType[] = [
  'Social Post',
  'Project Opportunity',
  'Applicant',
  'Service / General',
];

const VALID_FEEDBACK_STATUSES: FeedbackStatus[] = ['Open', 'Reviewed', 'Actioned'];

function cleanStr(val: unknown, maxLen = 500): string {
  if (typeof val !== 'string') return '';
  return val.trim().slice(0, maxLen);
}

function cleanHttpUrl(val: unknown): string {
  if (typeof val !== 'string') return '';
  const trimmed = val.trim();
  if (!trimmed) return '';
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      return '';
    }
    const host = parsed.hostname.toLowerCase();
    if (
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host === '::1' ||
      host.startsWith('10.') ||
      host.startsWith('192.168.') ||
      host.startsWith('169.254.') ||
      /^172\.(1[6-9]|2\d|3[01])\./.test(host)
    ) {
      return '';
    }
    return parsed.toString();
  } catch {
    return '';
  }
}

function cleanStringArray(val: unknown, maxItems = 12): string[] {
  if (!Array.isArray(val)) return [];
  return val
    .filter((item): item is string => typeof item === 'string')
    .map((s) => s.trim().slice(0, 60))
    .filter(Boolean)
    .slice(0, maxItems);
}

function cleanSocialLinks(val: unknown, maxItems = 10): string[] {
  if (!Array.isArray(val)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of val) {
    const safe = cleanHttpUrl(item);
    if (safe && !seen.has(safe)) {
      seen.add(safe);
      out.push(safe);
      if (out.length >= maxItems) break;
    }
  }
  return out;
}

function parseBudgetNumber(budgetText: string, explicitVal: unknown): number {
  if (typeof explicitVal === 'number' && Number.isFinite(explicitVal) && explicitVal >= 0) {
    return Math.round(explicitVal);
  }
  const match = budgetText.replace(/,/g, '').match(/\d{2,6}/);
  return match ? Number(match[0]) : 0;
}

async function startServer(): Promise<void> {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, service: 'hk-surya-admin-dashboard' });
  });

  app.get('/api/auth/status', (_req, res) => {
    res.json(getAuthMode());
  });

  app.post('/api/auth/setup', (req, res) => {
    const username = cleanStr(req.body?.username, 80);
    const password = typeof req.body?.password === 'string' ? req.body.password : '';
    if (!username || username.length < 2) {
      res.status(400).json({ error: 'Please enter a username (at least 2 characters).' });
      return;
    }
    if (password.length < 6 || password.length > 128) {
      res.status(400).json({ error: 'Password must be between 6 and 128 characters.' });
      return;
    }

    try {
      const created = setupInitialAdmin(username, password);
      const session = issueAdminToken(created.username);
      res.status(201).json({
        token: session.token,
        username: created.username,
        expiresAt: session.expiresAt,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Admin setup failed.';
      res.status(409).json({ error: message });
    }
  });

  app.post('/api/auth/login', (req, res) => {
    const ipKey = req.ip || 'unknown';
    if (isRateLimited(ipKey)) {
      res.status(429).json({
        error: 'Too many failed sign-in attempts. Please wait a few minutes and try again.',
      });
      return;
    }

    const username = cleanStr(req.body?.username, 80);
    const password = typeof req.body?.password === 'string' ? req.body.password : '';
    if (!username || !password) {
      res.status(400).json({ error: 'Username and password are required.' });
      return;
    }

    const { mode } = getAuthMode();
    if (mode === 'setup') {
      res.status(409).json({
        error: 'Admin credentials have not been set yet. Complete first-time setup first.',
      });
      return;
    }

    const verified = verifyAdminLogin(username, password);
    if (!verified) {
      recordFailedAttempt(ipKey);
      res.status(401).json({ error: 'Invalid username or password.' });
      return;
    }

    clearFailedAttempts(ipKey);
    const session = issueAdminToken(verified.username);
    res.json({
      token: session.token,
      username: verified.username,
      expiresAt: session.expiresAt,
    });
  });

  app.post('/api/auth/logout', requireAdminAuth, (req: AuthenticatedRequest, res) => {
    if (req.tokenId) {
      revokeAdminToken(req.tokenId);
    }
    res.json({ ok: true });
  });

  app.get('/api/auth/me', requireAdminAuth, (req: AuthenticatedRequest, res) => {
    res.json({ username: req.adminUsername });
  });

  app.get('/api/social-scan', requireAdminAuth, async (req, res) => {
    try {
      const query = cleanStr(req.query.query, 120);
      const platform = cleanStr(req.query.platform, 40) || 'All Platforms';
      const service = cleanStr(req.query.service, 40) || 'Website Dev + SEO';
      const industry = cleanStr(req.query.industry, 60) || 'All Industries';
      const result = await runSocialMediaScan(query, platform, service, industry);
      res.json(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to scan live feeds';
      res.status(500).json({ error: message });
    }
  });

  app.post('/api/verify-post', requireAdminAuth, async (req, res) => {
    try {
      const input = cleanStr(req.body?.input, 4500);
      if (!input) {
        res.status(400).json({ error: 'Post URL or text is required.' });
        return;
      }
      const result = await verifySocialPost(input);
      res.json(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to verify post';
      res.status(400).json({ error: message });
    }
  });

  app.get('/api/workspace', requireAdminAuth, (_req, res) => {
    const data = readWorkspace();
    res.json({
      opportunities: data.opportunities,
      applicants: data.applicants,
      feedback: data.feedback,
    });
  });

  app.post('/api/opportunities', requireAdminAuth, (req, res) => {
    const title = cleanStr(req.body?.title, 180);
    if (!title) {
      res.status(400).json({ error: 'Project title is required.' });
      return;
    }

    const stageRaw = cleanStr(req.body?.stage, 30) as OpportunityStage;
    const priorityRaw = cleanStr(req.body?.priority, 20) as OpportunityPriority;
    const serviceRaw = cleanStr(req.body?.serviceCategory, 40) as ServiceCategory;
    const budget = cleanStr(req.body?.budget, 80) || 'Not specified';
    const now = new Date().toISOString();

    const opportunity: ProjectOpportunity = {
      id: `opp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      title,
      clientName: cleanStr(req.body?.clientName, 120) || 'Social Client',
      clientHandle: cleanStr(req.body?.clientHandle, 80),
      platform: cleanStr(req.body?.platform, 40) || 'Direct',
      serviceCategory: VALID_SERVICES.includes(serviceRaw) ? serviceRaw : 'Full-Stack Web Dev',
      industry: cleanStr(req.body?.industry, 60) || 'SaaS & Software',
      sourceUrl: cleanHttpUrl(req.body?.sourceUrl),
      authorProfileUrl: cleanHttpUrl(req.body?.authorProfileUrl),
      contactEmail: cleanStr(req.body?.contactEmail, 160),
      contactPhone: cleanStr(req.body?.contactPhone, 60),
      websiteUrl: cleanHttpUrl(req.body?.websiteUrl),
      socialLinks: cleanSocialLinks(req.body?.socialLinks),
      budget,
      budgetValue: parseBudgetNumber(budget, req.body?.budgetValue),
      techStack: cleanStringArray(req.body?.techStack),
      stage: VALID_STAGES.includes(stageRaw) ? stageRaw : 'Discovered',
      priority: VALID_PRIORITIES.includes(priorityRaw) ? priorityRaw : 'Medium',
      deadline: cleanStr(req.body?.deadline, 40) || 'Flexible',
      notes: cleanStr(req.body?.notes, 2000),
      assignedApplicantIds: cleanStringArray(req.body?.assignedApplicantIds, 20),
      createdAt: now,
      updatedAt: now,
    };

    const workspace = readWorkspace();
    workspace.opportunities.unshift(opportunity);
    writeWorkspace(workspace);
    res.status(201).json(opportunity);
  });

  app.patch('/api/opportunities/:id', requireAdminAuth, (req, res) => {
    const id = cleanStr(req.params.id, 80);
    const workspace = readWorkspace();
    const index = workspace.opportunities.findIndex((o) => o.id === id);
    if (index === -1) {
      res.status(404).json({ error: 'Opportunity not found.' });
      return;
    }

    const existing = workspace.opportunities[index];
    const stageRaw = cleanStr(req.body?.stage, 30) as OpportunityStage;
    const priorityRaw = cleanStr(req.body?.priority, 20) as OpportunityPriority;
    const serviceRaw = cleanStr(req.body?.serviceCategory, 40) as ServiceCategory;
    const nextBudget =
      req.body?.budget !== undefined
        ? cleanStr(req.body.budget, 80) || 'Not specified'
        : existing.budget;

    const updated: ProjectOpportunity = {
      ...existing,
      title:
        req.body?.title !== undefined
          ? cleanStr(req.body.title, 180) || existing.title
          : existing.title,
      clientName:
        req.body?.clientName !== undefined
          ? cleanStr(req.body.clientName, 120) || existing.clientName
          : existing.clientName,
      clientHandle:
        req.body?.clientHandle !== undefined
          ? cleanStr(req.body.clientHandle, 80)
          : existing.clientHandle,
      platform:
        req.body?.platform !== undefined
          ? cleanStr(req.body.platform, 40) || existing.platform
          : existing.platform,
      serviceCategory: VALID_SERVICES.includes(serviceRaw)
        ? serviceRaw
        : existing.serviceCategory,
      industry:
        req.body?.industry !== undefined
          ? cleanStr(req.body.industry, 60) || existing.industry
          : existing.industry,
      sourceUrl:
        req.body?.sourceUrl !== undefined
          ? cleanHttpUrl(req.body.sourceUrl)
          : existing.sourceUrl,
      authorProfileUrl:
        req.body?.authorProfileUrl !== undefined
          ? cleanHttpUrl(req.body.authorProfileUrl)
          : existing.authorProfileUrl,
      contactEmail:
        req.body?.contactEmail !== undefined
          ? cleanStr(req.body.contactEmail, 160)
          : existing.contactEmail,
      contactPhone:
        req.body?.contactPhone !== undefined
          ? cleanStr(req.body.contactPhone, 60)
          : existing.contactPhone,
      websiteUrl:
        req.body?.websiteUrl !== undefined
          ? cleanHttpUrl(req.body.websiteUrl)
          : existing.websiteUrl,
      socialLinks:
        req.body?.socialLinks !== undefined
          ? cleanSocialLinks(req.body.socialLinks)
          : existing.socialLinks,
      budget: nextBudget,
      budgetValue:
        req.body?.budgetValue !== undefined || req.body?.budget !== undefined
          ? parseBudgetNumber(nextBudget, req.body?.budgetValue)
          : existing.budgetValue,
      techStack:
        req.body?.techStack !== undefined
          ? cleanStringArray(req.body.techStack)
          : existing.techStack,
      stage: VALID_STAGES.includes(stageRaw) ? stageRaw : existing.stage,
      priority: VALID_PRIORITIES.includes(priorityRaw) ? priorityRaw : existing.priority,
      deadline:
        req.body?.deadline !== undefined
          ? cleanStr(req.body.deadline, 40) || 'Flexible'
          : existing.deadline,
      notes:
        req.body?.notes !== undefined ? cleanStr(req.body.notes, 2000) : existing.notes,
      assignedApplicantIds:
        req.body?.assignedApplicantIds !== undefined
          ? cleanStringArray(req.body.assignedApplicantIds, 20)
          : existing.assignedApplicantIds,
      updatedAt: new Date().toISOString(),
    };

    workspace.opportunities[index] = updated;
    writeWorkspace(workspace);
    res.json(updated);
  });

  app.delete('/api/opportunities/:id', requireAdminAuth, (req, res) => {
    const id = cleanStr(req.params.id, 80);
    const workspace = readWorkspace();
    const nextOpps = workspace.opportunities.filter((o) => o.id !== id);
    if (nextOpps.length === workspace.opportunities.length) {
      res.status(404).json({ error: 'Opportunity not found.' });
      return;
    }
    workspace.opportunities = nextOpps;
    workspace.applicants = workspace.applicants.map((a) =>
      a.appliedForOpportunityId === id ? { ...a, appliedForOpportunityId: '' } : a
    );
    writeWorkspace(workspace);
    res.json({ ok: true });
  });

  app.post('/api/applicants', requireAdminAuth, (req, res) => {
    const fullName = cleanStr(req.body?.fullName, 120);
    const role = cleanStr(req.body?.role, 120);
    if (!fullName || !role) {
      res.status(400).json({ error: 'Full name and developer role are required.' });
      return;
    }

    const statusRaw = cleanStr(req.body?.status, 30) as ApplicantStatus;
    const availRaw = cleanStr(req.body?.availability, 30) as ApplicantAvailability;
    const hourlyRate = Number(req.body?.hourlyRate);
    const experienceYears = Number(req.body?.experienceYears);

    const applicant: Applicant = {
      id: `app-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      fullName,
      email: cleanStr(req.body?.email, 160),
      role,
      location: cleanStr(req.body?.location, 100) || 'Remote',
      sourcePlatform: cleanStr(req.body?.sourcePlatform, 60) || 'Direct Application',
      hourlyRate: Number.isFinite(hourlyRate) && hourlyRate >= 0 ? Math.round(hourlyRate) : 35,
      availability: VALID_AVAILABILITY.includes(availRaw) ? availRaw : 'Immediate',
      status: VALID_APPLICANT_STATUSES.includes(statusRaw) ? statusRaw : 'New',
      skills: cleanStringArray(req.body?.skills, 12),
      portfolioUrl: cleanHttpUrl(req.body?.portfolioUrl),
      githubOrLinkedIn: cleanHttpUrl(req.body?.githubOrLinkedIn),
      appliedForOpportunityId: cleanStr(req.body?.appliedForOpportunityId, 80),
      experienceYears:
        Number.isFinite(experienceYears) && experienceYears >= 0
          ? Math.min(40, Math.round(experienceYears))
          : 2,
      notes: cleanStr(req.body?.notes, 2000),
      appliedAt: new Date().toISOString(),
    };

    const workspace = readWorkspace();
    workspace.applicants.unshift(applicant);

    if (applicant.status === 'Assigned' && applicant.appliedForOpportunityId) {
      workspace.opportunities = workspace.opportunities.map((opp) =>
        opp.id === applicant.appliedForOpportunityId &&
        !opp.assignedApplicantIds.includes(applicant.id)
          ? {
              ...opp,
              assignedApplicantIds: [...opp.assignedApplicantIds, applicant.id],
              updatedAt: new Date().toISOString(),
            }
          : opp
      );
    }

    writeWorkspace(workspace);
    res.status(201).json(applicant);
  });

  app.patch('/api/applicants/:id', requireAdminAuth, (req, res) => {
    const id = cleanStr(req.params.id, 80);
    const workspace = readWorkspace();
    const index = workspace.applicants.findIndex((a) => a.id === id);
    if (index === -1) {
      res.status(404).json({ error: 'Applicant not found.' });
      return;
    }

    const existing = workspace.applicants[index];
    const statusRaw = cleanStr(req.body?.status, 30) as ApplicantStatus;
    const availRaw = cleanStr(req.body?.availability, 30) as ApplicantAvailability;
    const hourlyRate = Number(req.body?.hourlyRate);
    const experienceYears = Number(req.body?.experienceYears);

    const updated: Applicant = {
      ...existing,
      fullName:
        req.body?.fullName !== undefined
          ? cleanStr(req.body.fullName, 120) || existing.fullName
          : existing.fullName,
      email:
        req.body?.email !== undefined ? cleanStr(req.body.email, 160) : existing.email,
      role:
        req.body?.role !== undefined
          ? cleanStr(req.body.role, 120) || existing.role
          : existing.role,
      location:
        req.body?.location !== undefined
          ? cleanStr(req.body.location, 100) || 'Remote'
          : existing.location,
      sourcePlatform:
        req.body?.sourcePlatform !== undefined
          ? cleanStr(req.body.sourcePlatform, 60) || existing.sourcePlatform
          : existing.sourcePlatform,
      hourlyRate:
        req.body?.hourlyRate !== undefined && Number.isFinite(hourlyRate) && hourlyRate >= 0
          ? Math.round(hourlyRate)
          : existing.hourlyRate,
      availability: VALID_AVAILABILITY.includes(availRaw) ? availRaw : existing.availability,
      status: VALID_APPLICANT_STATUSES.includes(statusRaw) ? statusRaw : existing.status,
      skills:
        req.body?.skills !== undefined ? cleanStringArray(req.body.skills, 12) : existing.skills,
      portfolioUrl:
        req.body?.portfolioUrl !== undefined
          ? cleanHttpUrl(req.body.portfolioUrl)
          : existing.portfolioUrl,
      githubOrLinkedIn:
        req.body?.githubOrLinkedIn !== undefined
          ? cleanHttpUrl(req.body.githubOrLinkedIn)
          : existing.githubOrLinkedIn,
      appliedForOpportunityId:
        req.body?.appliedForOpportunityId !== undefined
          ? cleanStr(req.body.appliedForOpportunityId, 80)
          : existing.appliedForOpportunityId,
      experienceYears:
        req.body?.experienceYears !== undefined &&
        Number.isFinite(experienceYears) &&
        experienceYears >= 0
          ? Math.min(40, Math.round(experienceYears))
          : existing.experienceYears,
      notes:
        req.body?.notes !== undefined ? cleanStr(req.body.notes, 2000) : existing.notes,
    };

    workspace.applicants[index] = updated;
    writeWorkspace(workspace);
    res.json(updated);
  });

  app.delete('/api/applicants/:id', requireAdminAuth, (req, res) => {
    const id = cleanStr(req.params.id, 80);
    const workspace = readWorkspace();
    const nextApplicants = workspace.applicants.filter((a) => a.id !== id);
    if (nextApplicants.length === workspace.applicants.length) {
      res.status(404).json({ error: 'Applicant not found.' });
      return;
    }
    workspace.applicants = nextApplicants;
    workspace.opportunities = workspace.opportunities.map((opp) => ({
      ...opp,
      assignedApplicantIds: opp.assignedApplicantIds.filter((aid) => aid !== id),
    }));
    writeWorkspace(workspace);
    res.json({ ok: true });
  });

  app.get('/api/feedback', requireAdminAuth, (_req, res) => {
    const workspace = readWorkspace();
    res.json(workspace.feedback);
  });

  app.post('/api/feedback', requireAdminAuth, (req, res) => {
    const comment = cleanStr(req.body?.comment, 2000);
    if (!comment) {
      res.status(400).json({ error: 'Feedback comment is required.' });
      return;
    }

    const serviceRaw = cleanStr(req.body?.serviceCategory, 40) as ServiceCategory;
    const targetTypeRaw = cleanStr(req.body?.targetType, 40) as FeedbackTargetType;
    const statusRaw = cleanStr(req.body?.status, 30) as FeedbackStatus;
    const ratingNum = Number(req.body?.rating);
    const rating = Number.isFinite(ratingNum)
      ? Math.min(5, Math.max(1, Math.round(ratingNum)))
      : 5;

    const entry: FeedbackEntry = {
      id: `fb-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      authorName: cleanStr(req.body?.authorName, 100) || 'HK Surya Admin',
      serviceCategory: VALID_SERVICES.includes(serviceRaw) ? serviceRaw : 'Full-Stack Web Dev',
      targetType: VALID_FEEDBACK_TARGETS.includes(targetTypeRaw)
        ? targetTypeRaw
        : 'Service / General',
      targetId: cleanStr(req.body?.targetId, 100),
      targetTitle: cleanStr(req.body?.targetTitle, 180) || 'Digital Services Workspace',
      rating,
      comment,
      status: VALID_FEEDBACK_STATUSES.includes(statusRaw) ? statusRaw : 'Open',
      createdAt: new Date().toISOString(),
    };

    const workspace = readWorkspace();
    workspace.feedback.unshift(entry);
    writeWorkspace(workspace);
    res.status(201).json(entry);
  });

  app.patch('/api/feedback/:id', requireAdminAuth, (req, res) => {
    const id = cleanStr(req.params.id, 80);
    const workspace = readWorkspace();
    const index = workspace.feedback.findIndex((f) => f.id === id);
    if (index === -1) {
      res.status(404).json({ error: 'Feedback entry not found.' });
      return;
    }

    const existing = workspace.feedback[index];
    const statusRaw = cleanStr(req.body?.status, 30) as FeedbackStatus;
    const serviceRaw = cleanStr(req.body?.serviceCategory, 40) as ServiceCategory;

    const updated: FeedbackEntry = {
      ...existing,
      status: VALID_FEEDBACK_STATUSES.includes(statusRaw) ? statusRaw : existing.status,
      serviceCategory: VALID_SERVICES.includes(serviceRaw)
        ? serviceRaw
        : existing.serviceCategory,
      comment:
        req.body?.comment !== undefined
          ? cleanStr(req.body.comment, 2000) || existing.comment
          : existing.comment,
    };

    workspace.feedback[index] = updated;
    writeWorkspace(workspace);
    res.json(updated);
  });

  app.delete('/api/feedback/:id', requireAdminAuth, (req, res) => {
    const id = cleanStr(req.params.id, 80);
    const workspace = readWorkspace();
    const nextFeedback = workspace.feedback.filter((f) => f.id !== id);
    if (nextFeedback.length === workspace.feedback.length) {
      res.status(404).json({ error: 'Feedback entry not found.' });
      return;
    }
    workspace.feedback = nextFeedback;
    writeWorkspace(workspace);
    res.json({ ok: true });
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('/{*splat}', (_req, res) => {
      res.sendFile(path.resolve(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`HK Surya Admin Dashboard running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
