import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';
import type {
  IndustryCategory,
  PostVerificationResult,
  ServiceCategory,
  SocialLead,
  SocialPlatform,
  SocialScanResponse,
} from '../src/types.ts';

type SpecificIndustry = Exclude<IndustryCategory, 'All Industries'>;

const TECH_KEYWORDS: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /\bfull[\s-]?stack\b/i, label: 'Full-Stack' },
  { pattern: /\bnext\.?js\b/i, label: 'Next.js' },
  { pattern: /\breact(?:\.?js)?\b/i, label: 'React' },
  { pattern: /\btypescript\b/i, label: 'TypeScript' },
  { pattern: /\bnode\.?js\b/i, label: 'Node.js' },
  { pattern: /\btailwind\b/i, label: 'Tailwind CSS' },
  { pattern: /\bseo\b|search engine optimization/i, label: 'SEO' },
  { pattern: /\baeo\b|answer engine optimization/i, label: 'AEO' },
  { pattern: /\bschema\.org|json-ld|structured data\b/i, label: 'Schema.org' },
  { pattern: /\bdigital marketing\b/i, label: 'Digital Marketing' },
  { pattern: /\bwordpress\b/i, label: 'WordPress' },
  { pattern: /\bshopify\b/i, label: 'Shopify' },
  { pattern: /\bwebflow\b/i, label: 'Webflow' },
  { pattern: /\bpostgresql|postgres\b/i, label: 'PostgreSQL' },
  { pattern: /\blaravel\b/i, label: 'Laravel' },
  { pattern: /\bphp\b/i, label: 'PHP' },
  { pattern: /\bcro\b|conversion rate/i, label: 'CRO' },
];

const INDUSTRY_RULES: Array<{
  industry: SpecificIndustry;
  pattern: RegExp;
  searchQuery: string;
}> = [
  {
    industry: 'Healthcare & MedTech',
    pattern: /\b(healthcare|health\s?tech|medtech|medical|clinic|hospital|patient|telehealth|wellness|pharma|dental)\b/i,
    searchQuery: 'healthcare OR clinic OR medical OR medtech',
  },
  {
    industry: 'E-Commerce & Retail',
    pattern: /\b(e-?commerce|ecommerce|shopify|woocommerce|retail|storefront|dtc|d2c|checkout|marketplace|fashion|apparel)\b/i,
    searchQuery: 'ecommerce OR shopify OR retail OR storefront',
  },
  {
    industry: 'Finance & FinTech',
    pattern: /\b(fintech|finance|financial|banking|payments|crypto|accounting|insurance|insurtech|trading|wealth|tax)\b/i,
    searchQuery: 'fintech OR finance OR banking OR insurance',
  },
  {
    industry: 'Real Estate & PropTech',
    pattern: /\b(real estate|proptech|property|realtor|idx|mortgage|housing|rental|brokerage|construction|architecture)\b/i,
    searchQuery: '"real estate" OR property OR proptech',
  },
  {
    industry: 'Education & EdTech',
    pattern: /\b(edtech|education|e-?learning|course|lms|university|school|tutoring|academy|training|student)\b/i,
    searchQuery: 'edtech OR education OR elearning OR academy',
  },
  {
    industry: 'Hospitality & Travel',
    pattern: /\b(hospitality|travel|hotel|booking|restaurant|food|beverage|tourism|airline|resort|event)\b/i,
    searchQuery: 'hospitality OR travel OR hotel OR restaurant',
  },
  {
    industry: 'Legal & Consulting',
    pattern: /\b(legal|law firm|attorney|lawyer|consulting|advisory|agency|b2b service|compliance|hr tech|recruiting)\b/i,
    searchQuery: 'legal OR "law firm" OR consulting OR agency',
  },
  {
    industry: 'Media & Entertainment',
    pattern: /\b(media|publishing|news|podcast|streaming|entertainment|creator|music|gaming|sports|magazine)\b/i,
    searchQuery: 'media OR publishing OR entertainment OR creator',
  },
  {
    industry: 'Manufacturing & Logistics',
    pattern: /\b(manufacturing|logistics|supply chain|freight|shipping|warehouse|automotive|industrial|energy|solar|climate)\b/i,
    searchQuery: 'logistics OR manufacturing OR industrial OR energy',
  },
  {
    industry: 'Non-Profit & Community',
    pattern: /\b(non-?profit|ngo|charity|foundation|community|civic|government|ngo|sustainability|volunteer)\b/i,
    searchQuery: 'nonprofit OR charity OR community OR foundation',
  },
  {
    industry: 'SaaS & Software',
    pattern: /\b(saas|software|b2b|startup|api|cloud|ai platform|analytics|crm|erp|developer tool|web app)\b/i,
    searchQuery: 'SaaS OR software OR startup OR B2B',
  },
];

const SOCIAL_HOST_PATTERNS = [
  'linkedin.com',
  'x.com',
  'twitter.com',
  'github.com',
  'threads.net',
  'threads.com',
  'instagram.com',
  'facebook.com',
  'reddit.com',
  'mastodon.social',
  'fosstodon.org',
  'bsky.app',
  'youtube.com',
];

const PLATFORM_HOST_EXCLUDES = [
  'remotive.com',
  'news.ycombinator.com',
  'dev.to',
  'reddit.com',
  'redd.it',
  'mastodon.social',
  'fosstodon.org',
  'w3.org',
  'schema.org',
];

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) return null;
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function stripHtml(raw: string): string {
  return raw
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;|&apos;/g, "'")
    .replace(/&#x2F;/gi, '/')
    .replace(/&#(\d+);/g, (_m, dec) => String.fromCharCode(Number(dec)))
    .replace(/\s+/g, ' ')
    .trim();
}

function sanitizeSafeExternalUrl(rawUrl: string): string | null {
  try {
    const parsed = new URL(rawUrl.trim());
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      return null;
    }
    const host = parsed.hostname.toLowerCase();
    if (
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host === '0.0.0.0' ||
      host === '::1' ||
      host.startsWith('10.') ||
      host.startsWith('192.168.') ||
      host.startsWith('169.254.') ||
      /^172\.(1[6-9]|2\d|3[0-1])\./.test(host)
    ) {
      return null;
    }
    return parsed.toString();
  } catch {
    return null;
  }
}

function extractContactInfo(
  rawHtmlOrText: string,
  extraUrls: string[] = [],
  excludeProfileUrl = ''
): {
  contactEmail: string;
  contactPhone: string;
  websiteUrl: string;
  socialLinks: string[];
} {
  const decoded = rawHtmlOrText
    .replace(/&#x2F;/gi, '/')
    .replace(/&amp;/g, '&')
    .replace(/\s*\[at\]\s*/gi, '@')
    .replace(/\s*\(at\)\s*/gi, '@')
    .replace(/\s*\[dot\]\s*/gi, '.');

  const emailMatches =
    decoded.match(/\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,12}\b/g) ?? [];
  const validEmail =
    emailMatches.find(
      (em) =>
        !/\.(png|jpg|jpeg|gif|svg|webp)$/i.test(em) &&
        !/@(example\.com|sentry\.io|remotive\.com)$/i.test(em)
    ) ?? '';

  const plainText = stripHtml(decoded);
  const phoneMatch = plainText.match(
    /(?:\+\d{1,3}[\s.-]?)?\(?\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}\b/
  );
  const contactPhone = phoneMatch?.[0]?.trim() ?? '';

  const hrefMatches: string[] = [];
  const hrefRegex = /href=["'](https?:\/\/[^"'\s>]+)["']/gi;
  let m: RegExpExecArray | null = hrefRegex.exec(decoded);
  while (m) {
    if (m[1]) hrefMatches.push(m[1]);
    m = hrefRegex.exec(decoded);
  }

  const textUrlMatches = plainText.match(/https?:\/\/[^\s<>)"']+/gi) ?? [];
  const candidateUrls = [...extraUrls, ...hrefMatches, ...textUrlMatches];
  const normalizedExclude = excludeProfileUrl.replace(/\/+$/, '').toLowerCase();

  const socialLinks: string[] = [];
  let websiteUrl = '';

  for (const raw of candidateUrls) {
    const cleaned = raw.replace(/[.,;!?)]+$/, '');
    const safe = sanitizeSafeExternalUrl(cleaned);
    if (!safe) continue;

    const normalizedSafe = safe.replace(/\/+$/, '').toLowerCase();
    if (normalizedExclude && normalizedSafe === normalizedExclude) {
      continue;
    }

    const parsed = new URL(safe);
    const host = parsed.hostname.toLowerCase().replace(/^www\./, '');
    const pathname = parsed.pathname.toLowerCase();

    if (
      pathname.startsWith('/tags/') ||
      pathname.startsWith('/tag/') ||
      pathname.startsWith('/hashtag/') ||
      pathname.startsWith('/search') ||
      /\.(png|jpg|jpeg|gif|svg|webp|pdf)$/i.test(pathname)
    ) {
      continue;
    }

    const isSocial =
      SOCIAL_HOST_PATTERNS.some(
        (pattern) => host === pattern || host.endsWith(`.${pattern}`)
      ) || /^\/@[a-z0-9_.-]+$/i.test(parsed.pathname);

    if (isSocial) {
      if (!socialLinks.includes(safe) && socialLinks.length < 6) {
        socialLinks.push(safe);
      }
      continue;
    }

    const isPlatformInternal = PLATFORM_HOST_EXCLUDES.some(
      (ex) => host === ex || host.endsWith(`.${ex}`)
    );
    if (!isPlatformInternal && !websiteUrl) {
      websiteUrl = safe;
    }
  }

  return {
    contactEmail: validEmail,
    contactPhone,
    websiteUrl,
    socialLinks,
  };
}

function extractBudget(text: string): string {
  const patterns = [
    /(?:\$|USD\s?|€|£|₹)\s?\d[\d,]*(?:\s?[-–to]+\s?(?:\$|USD\s?|€|£|₹)?\s?\d[\d,]*)?(?:\s?\/?\s?(?:hr|hour|project|fixed|mo|month|yr|year))?/i,
    /\b\d[\d,]*(?:\s?[-–]\s?\d[\d,]*)?\s?(?:USD|EUR|GBP|INR)\b/i,
    /\b\d{2,3}\s?\/\s?hr\b/i,
  ];
  for (const re of patterns) {
    const match = text.match(re);
    if (match?.[0]) {
      return match[0].trim();
    }
  }
  return 'Not specified';
}

function extractTechStack(text: string): string[] {
  const found: string[] = [];
  for (const item of TECH_KEYWORDS) {
    if (item.pattern.test(text) && !found.includes(item.label)) {
      found.push(item.label);
    }
  }
  return found.slice(0, 6);
}

function classifyIndustry(text: string, hint?: string): SpecificIndustry {
  const combined = `${hint ?? ''} ${text}`;
  for (const rule of INDUSTRY_RULES) {
    if (rule.pattern.test(combined)) {
      return rule.industry;
    }
  }
  return 'SaaS & Software';
}

function getIndustrySearchTerms(industryFilter: string): string {
  const matched = INDUSTRY_RULES.find((r) => r.industry === industryFilter);
  return matched ? matched.searchQuery : '';
}

function matchesIndustryFilter(
  leadIndustry: SpecificIndustry,
  combinedText: string,
  industryFilter: string
): boolean {
  if (!industryFilter || industryFilter === 'All Industries') return true;
  if (leadIndustry === industryFilter) return true;
  const matched = INDUSTRY_RULES.find((r) => r.industry === industryFilter);
  return matched ? matched.pattern.test(combinedText) : false;
}

function classifyServiceCategory(text: string, hint?: string): ServiceCategory | null {
  const combined = `${hint ?? ''} ${text}`.toLowerCase();

  const isUnrelated =
    /\b(ios developer|android developer|unity game|embedded firmware|3d artist|video editor only|pcb design)\b/i.test(
      combined
    ) &&
    !/\b(website|web developer|full[\s-]?stack|seo|aeo|digital marketing|next\.?js|react|wordpress|shopify)\b/i.test(
      combined
    );
  if (isUnrelated) return null;

  if (/\baeo\b|answer engine|ai search optimization|llm optimization/i.test(combined)) {
    return 'AEO';
  }
  if (/\b(seo|technical seo|on-page seo|search engine optimization|organic traffic)\b/i.test(combined)) {
    return 'SEO';
  }
  if (
    /\b(full[\s-]?stack|fullstack|mern|pern|next\.?js.*node|react.*node|react.*express|postgresql.*react|backend.*frontend)\b/i.test(
      combined
    )
  ) {
    return 'Full-Stack Web Dev';
  }
  if (
    /\b(digital marketing|performance marketing|growth marketing|google ads|meta ads|conversion rate|cro|landing page funnel)\b/i.test(
      combined
    )
  ) {
    return 'Digital Marketing';
  }
  if (
    /\b(website|web developer|web dev|frontend|front-end|wordpress|shopify|webflow|landing page|web app|react|next\.?js)\b/i.test(
      combined
    )
  ) {
    return 'Website Development';
  }
  return null;
}

function isWebDevOrMarketingHiringIntent(title: string, body: string): boolean {
  const combined = `${title} ${body}`.toLowerCase();
  const isForHireSelfPromo =
    /\[for\s*hire\]/i.test(title) ||
    /\b(i am available|available for hire|available for work|open for work|seeking freelance work|my portfolio|dm me for web|hire me|for hire:|i build websites|landed a freelance|proposer un mini-audit|my services)\b/i.test(
      combined
    );
  if (isForHireSelfPromo) return false;

  const hasHiringSignal =
    /\[hiring\]/i.test(title) ||
    /\b(we are hiring|we're hiring|is hiring|hiring a|hiring freelance|looking to hire|looking for a|looking for an|need a|need an|we need|seeking a|seeking freelancer|want to hire|searching for a|apply now|join our team)\b/i.test(
      combined
    );

  return hasHiringSignal && classifyServiceCategory(combined) !== null;
}

interface RemotiveJob {
  id: number;
  url: string;
  title: string;
  company_name: string;
  category: string;
  tags?: string[];
  job_type: string;
  publication_date: string;
  salary?: string;
  description?: string;
}

async function fetchRemotiveLeads(
  query: string,
  industryFilter: string
): Promise<{ leads: SocialLead[]; status: 'ok' | 'error'; message?: string }> {
  const endpoints = [
    'https://remotive.com/api/remote-jobs?category=software-dev&limit=40',
    'https://remotive.com/api/remote-jobs?category=marketing&limit=25',
  ];

  const leads: SocialLead[] = [];
  let hadSuccess = false;
  let lastError = '';
  const thirtyFiveDaysAgo = Date.now() - 35 * 24 * 60 * 60 * 1000;
  const qLower = query.trim().toLowerCase();

  const results = await Promise.allSettled(
    endpoints.map(async (url) => {
      const res = await fetch(url, { signal: AbortSignal.timeout(7000) });
      if (!res.ok) throw new Error(`Remotive HTTP ${res.status}`);
      return res.json() as Promise<{ jobs?: RemotiveJob[] }>;
    })
  );

  for (const result of results) {
    if (result.status === 'fulfilled') {
      hadSuccess = true;
      const jobs = result.value?.jobs ?? [];
      for (const job of jobs) {
        if (!job?.title || !job?.url) continue;
        const ts = Date.parse(job.publication_date);
        if (!Number.isFinite(ts) || ts < thirtyFiveDaysAgo) continue;

        const cleanDesc = stripHtml(job.description ?? '');
        const titleAndTags = `${job.title} ${(job.tags ?? []).join(' ')}`;
        const combined = `${titleAndTags} ${cleanDesc}`;
        if (qLower && !combined.toLowerCase().includes(qLower)) continue;

        if (
          /\b(customer service|data engineer|devops|site reliability|account executive|sales rep|recruiter)\b/i.test(
            job.title
          )
        ) {
          continue;
        }

        const category = classifyServiceCategory(titleAndTags);
        if (!category) continue;

        const isContractOrFreelance =
          /freelance|contract/i.test(job.job_type) ||
          /\b(freelance|contractor|part-time|project-based)\b/i.test(combined);
        if (
          !isContractOrFreelance &&
          category !== 'SEO' &&
          category !== 'AEO' &&
          category !== 'Full-Stack Web Dev'
        ) {
          continue;
        }

        const industry = classifyIndustry(`${job.company_name} ${combined}`);
        if (!matchesIndustryFilter(industry, combined, industryFilter)) continue;

        const safeUrl = sanitizeSafeExternalUrl(job.url);
        if (!safeUrl) continue;

        const contact = extractContactInfo(job.description ?? '');
        const stack = extractTechStack(combined);

        leads.push({
          id: `remotive-${job.id}`,
          title: job.title,
          author: job.company_name || 'Remotive Client',
          authorProfileUrl: contact.websiteUrl || safeUrl,
          platform: 'Remotive',
          sourceChannel: `remotive.com · ${job.job_type || 'remote'}`,
          serviceCategory: category,
          industry,
          url: safeUrl,
          contactEmail: contact.contactEmail,
          contactPhone: contact.contactPhone,
          websiteUrl: contact.websiteUrl,
          socialLinks: contact.socialLinks,
          summary:
            cleanDesc.length > 0
              ? cleanDesc.slice(0, 220) + (cleanDesc.length > 220 ? '…' : '')
              : job.title,
          postedAt: new Date(ts).toISOString(),
          postedTimestamp: ts,
          budget: job.salary?.trim() ? job.salary.trim() : extractBudget(cleanDesc),
          techStack: stack.length > 0 ? stack : [category],
          needsFreelanceWebDev: isContractOrFreelance || category === 'Full-Stack Web Dev',
          verificationNote: `Live Remotive ${job.job_type.replace('_', ' ')} listing (${industry}).`,
          fetchMethod: 'Direct Public API',
        });
      }
    } else {
      lastError = result.reason instanceof Error ? result.reason.message : 'Remotive unavailable';
    }
  }

  return {
    leads,
    status: hadSuccess ? 'ok' : 'error',
    message: hadSuccess ? undefined : lastError || 'Remotive API unavailable',
  };
}

interface MastodonAccount {
  username?: string;
  acct?: string;
  display_name?: string;
  url?: string;
  note?: string;
  fields?: Array<{ name?: string; value?: string }>;
}

interface MastodonStatus {
  id: string;
  created_at: string;
  url?: string;
  uri?: string;
  content?: string;
  account?: MastodonAccount;
}

async function fetchMastodonLeads(
  query: string,
  industryFilter: string
): Promise<{ leads: SocialLead[]; status: 'ok' | 'error'; message?: string }> {
  const endpoints = [
    'https://mastodon.social/api/v1/timelines/tag/hiring?limit=30',
    'https://mastodon.social/api/v1/timelines/tag/freelance?limit=25',
    'https://fosstodon.org/api/v1/timelines/tag/hiring?limit=20',
  ];

  const leads: SocialLead[] = [];
  let hadSuccess = false;
  let lastError = '';
  const qLower = query.trim().toLowerCase();

  const results = await Promise.allSettled(
    endpoints.map(async (url) => {
      const res = await fetch(url, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(6500),
      });
      if (!res.ok) throw new Error(`Mastodon HTTP ${res.status}`);
      return res.json() as Promise<MastodonStatus[]>;
    })
  );

  for (const result of results) {
    if (result.status === 'fulfilled') {
      hadSuccess = true;
      const posts = Array.isArray(result.value) ? result.value : [];
      for (const post of posts) {
        const postUrl = sanitizeSafeExternalUrl(post.url || post.uri || '');
        if (!postUrl) continue;

        const cleanBody = stripHtml(post.content ?? '');
        if (!cleanBody || !isWebDevOrMarketingHiringIntent(cleanBody.slice(0, 80), cleanBody)) {
          continue;
        }
        if (qLower && !cleanBody.toLowerCase().includes(qLower)) continue;

        const category = classifyServiceCategory(cleanBody);
        if (!category) continue;

        const industry = classifyIndustry(cleanBody);
        if (!matchesIndustryFilter(industry, cleanBody, industryFilter)) continue;

        const authorProfile = sanitizeSafeExternalUrl(post.account?.url || '') || postUrl;
        const profileFieldsHtml = (post.account?.fields ?? [])
          .map((f) => `${f.name ?? ''} ${f.value ?? ''}`)
          .join(' ');
        const contact = extractContactInfo(
          `${post.content ?? ''} ${post.account?.note ?? ''} ${profileFieldsHtml}`,
          [],
          authorProfile
        );

        const ts = Date.parse(post.created_at) || Date.now();
        const stack = extractTechStack(cleanBody);

        leads.push({
          id: `mastodon-${post.id}`,
          title:
            cleanBody.length > 96
              ? cleanBody.slice(0, 93).trim() + '…'
              : cleanBody,
          author: post.account?.acct
            ? `@${post.account.acct}`
            : post.account?.display_name || 'Mastodon User',
          authorProfileUrl: authorProfile,
          platform: 'Mastodon',
          sourceChannel: new URL(postUrl).hostname,
          serviceCategory: category,
          industry,
          url: postUrl,
          contactEmail: contact.contactEmail,
          contactPhone: contact.contactPhone,
          websiteUrl: contact.websiteUrl,
          socialLinks: contact.socialLinks,
          summary: cleanBody.slice(0, 240) + (cleanBody.length > 240 ? '…' : ''),
          postedAt: new Date(ts).toISOString(),
          postedTimestamp: ts,
          budget: extractBudget(cleanBody),
          techStack: stack.length > 0 ? stack : [category],
          needsFreelanceWebDev: true,
          verificationNote: `Live Mastodon social post seeking ${category} (${industry}).`,
          fetchMethod: 'Direct Public API',
        });
      }
    } else {
      lastError = result.reason instanceof Error ? result.reason.message : 'Mastodon unavailable';
    }
  }

  return {
    leads,
    status: hadSuccess ? 'ok' : 'error',
    message: hadSuccess ? undefined : lastError || 'Mastodon API unavailable',
  };
}

interface DevToArticle {
  id: number;
  title: string;
  description: string;
  url: string;
  published_timestamp: string;
  tag_list?: string[];
  user?: {
    name?: string;
    username?: string;
    twitter_username?: string;
    github_username?: string;
    website_url?: string;
  };
}

async function fetchDevToLeads(
  query: string,
  industryFilter: string
): Promise<{ leads: SocialLead[]; status: 'ok' | 'error'; message?: string }> {
  const endpoints = [
    'https://dev.to/api/articles?tag=hiring&per_page=25',
    'https://dev.to/api/articles?tag=freelance&per_page=25',
  ];

  const leads: SocialLead[] = [];
  let hadSuccess = false;
  let lastError = '';
  const sixtyDaysAgo = Date.now() - 60 * 24 * 60 * 60 * 1000;
  const qLower = query.trim().toLowerCase();

  const results = await Promise.allSettled(
    endpoints.map(async (url) => {
      const res = await fetch(url, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(7000),
      });
      if (!res.ok) throw new Error(`Dev.to HTTP ${res.status}`);
      return res.json() as Promise<DevToArticle[]>;
    })
  );

  for (const result of results) {
    if (result.status === 'fulfilled') {
      hadSuccess = true;
      const articles = Array.isArray(result.value) ? result.value : [];
      for (const art of articles) {
        if (!art?.title || !art?.url) continue;
        const ts = Date.parse(art.published_timestamp);
        if (!Number.isFinite(ts) || ts < sixtyDaysAgo) continue;

        const tags = (art.tag_list ?? []).join(' ');
        const combined = `${art.title} ${art.description ?? ''} ${tags}`;
        if (qLower && !combined.toLowerCase().includes(qLower)) continue;
        if (!isWebDevOrMarketingHiringIntent(art.title, art.description ?? '')) continue;

        const category = classifyServiceCategory(combined);
        if (!category) continue;

        const industry = classifyIndustry(combined);
        if (!matchesIndustryFilter(industry, combined, industryFilter)) continue;

        const safeUrl = sanitizeSafeExternalUrl(art.url);
        if (!safeUrl) continue;

        const extraUrls: string[] = [];
        if (art.user?.website_url) extraUrls.push(art.user.website_url);
        if (art.user?.twitter_username) {
          extraUrls.push(`https://x.com/${art.user.twitter_username}`);
        }
        if (art.user?.github_username) {
          extraUrls.push(`https://github.com/${art.user.github_username}`);
        }

        const contact = extractContactInfo(art.description ?? '', extraUrls);
        const authorProfileUrl = art.user?.username
          ? `https://dev.to/${art.user.username}`
          : safeUrl;
        const stack = extractTechStack(combined);

        leads.push({
          id: `devto-${art.id}`,
          title: art.title,
          author: art.user?.username ? `@${art.user.username}` : art.user?.name || 'Dev.to Author',
          authorProfileUrl,
          platform: 'Dev.to',
          sourceChannel: 'dev.to',
          serviceCategory: category,
          industry,
          url: safeUrl,
          contactEmail: contact.contactEmail,
          contactPhone: contact.contactPhone,
          websiteUrl: contact.websiteUrl,
          socialLinks: contact.socialLinks,
          summary: art.description || art.title,
          postedAt: new Date(ts).toISOString(),
          postedTimestamp: ts,
          budget: extractBudget(combined),
          techStack: stack.length > 0 ? stack : [category],
          needsFreelanceWebDev: true,
          verificationNote: `Recent Dev.to post for ${category} (${industry}).`,
          fetchMethod: 'Direct Public API',
        });
      }
    } else {
      lastError = result.reason instanceof Error ? result.reason.message : 'Dev.to unavailable';
    }
  }

  return {
    leads,
    status: hadSuccess ? 'ok' : 'error',
    message: hadSuccess ? undefined : lastError || 'Dev.to API unavailable',
  };
}

interface RedditPostData {
  id: string;
  title: string;
  author: string;
  selftext?: string;
  selftext_html?: string;
  permalink: string;
  subreddit: string;
  created_utc: number;
}

async function fetchRedditLeads(
  query: string,
  industryFilter: string
): Promise<{ leads: SocialLead[]; status: 'ok' | 'error'; message?: string }> {
  const industryTerms = getIndustrySearchTerms(industryFilter);
  const baseTerms = query.trim()
    ? `${query.trim()} website OR fullstack OR SEO OR AEO`
    : 'website OR "full stack" OR "web developer" OR SEO OR AEO';
  const searchTerms = industryTerms ? `(${baseTerms}) AND (${industryTerms})` : baseTerms;

  const urls = [
    `https://www.reddit.com/r/forhire/search.json?q=${encodeURIComponent(searchTerms)}&restrict_sr=1&sort=new&t=month&limit=20`,
    `https://www.reddit.com/r/freelance_forhire/search.json?q=${encodeURIComponent(searchTerms)}&restrict_sr=1&sort=new&t=month&limit=15`,
  ];

  const leads: SocialLead[] = [];
  let hadSuccess = false;
  let lastError = '';

  const results = await Promise.allSettled(
    urls.map(async (url) => {
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'HK-Surya-LeadScanner/1.0',
          Accept: 'application/json',
        },
        signal: AbortSignal.timeout(6000),
      });
      if (!res.ok) throw new Error(`Reddit HTTP ${res.status}`);
      return res.json() as Promise<{ data?: { children?: Array<{ data: RedditPostData }> } }>;
    })
  );

  for (const result of results) {
    if (result.status === 'fulfilled') {
      hadSuccess = true;
      const children = result.value?.data?.children ?? [];
      for (const child of children) {
        const post = child.data;
        if (!post?.title || !post?.permalink) continue;
        const body = (post.selftext ?? '').trim();
        if (!isWebDevOrMarketingHiringIntent(post.title, body)) continue;

        const combined = `${post.title}\n${body}`;
        const category = classifyServiceCategory(combined);
        if (!category) continue;

        const industry = classifyIndustry(combined);
        if (!matchesIndustryFilter(industry, combined, industryFilter)) continue;

        const safeUrl = sanitizeSafeExternalUrl(`https://www.reddit.com${post.permalink}`);
        if (!safeUrl) continue;

        const authorProfileUrl = post.author
          ? `https://www.reddit.com/user/${encodeURIComponent(post.author)}`
          : safeUrl;
        const contact = extractContactInfo(post.selftext_html || body);
        const ts = (post.created_utc || Math.floor(Date.now() / 1000)) * 1000;
        const stack = extractTechStack(combined);

        leads.push({
          id: `reddit-${post.id}`,
          title: post.title.replace(/^\[hiring\]\s*/i, '').trim(),
          author: post.author ? `u/${post.author}` : 'Reddit User',
          authorProfileUrl,
          platform: 'Reddit',
          sourceChannel: `r/${post.subreddit || 'forhire'}`,
          serviceCategory: category,
          industry,
          url: safeUrl,
          contactEmail: contact.contactEmail,
          contactPhone: contact.contactPhone,
          websiteUrl: contact.websiteUrl,
          socialLinks: contact.socialLinks,
          summary:
            body.length > 0
              ? body.slice(0, 240).replace(/\s+/g, ' ') + (body.length > 240 ? '…' : '')
              : post.title,
          postedAt: new Date(ts).toISOString(),
          postedTimestamp: ts,
          budget: extractBudget(combined),
          techStack: stack.length > 0 ? stack : [category],
          needsFreelanceWebDev: true,
          verificationNote: `Verified [Hiring] post in r/${post.subreddit || 'forhire'} (${industry}).`,
          fetchMethod: 'Direct Public API',
        });
      }
    } else {
      lastError = result.reason instanceof Error ? result.reason.message : 'Reddit unavailable';
    }
  }

  return {
    leads,
    status: hadSuccess ? 'ok' : 'error',
    message: hadSuccess ? undefined : lastError || 'Reddit direct feed unavailable',
  };
}

interface HNHit {
  objectID: string;
  author?: string;
  title?: string;
  story_text?: string;
  comment_text?: string;
  created_at_i?: number;
  story_title?: string;
}

async function fetchHackerNewsLeads(
  query: string,
  industryFilter: string
): Promise<{ leads: SocialLead[]; status: 'ok' | 'error'; message?: string }> {
  const industryQuery = getIndustrySearchTerms(industryFilter).replace(/\s+OR\s+/g, ' ').replace(/"/g, '');
  const q = query.trim()
    ? `SEEKING FREELANCER ${query.trim()}`
    : industryQuery
      ? `hiring ${industryQuery}`
      : 'SEEKING FREELANCER';
  const fortyFiveDaysAgo = Math.floor((Date.now() - 45 * 24 * 60 * 60 * 1000) / 1000);
  const url = `https://hn.algolia.com/api/v1/search_by_date?query=${encodeURIComponent(q)}&tags=comment&numericFilters=created_at_i>${fortyFiveDaysAgo}&hitsPerPage=40`;

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(7000) });
    if (!res.ok) throw new Error(`HN Algolia HTTP ${res.status}`);

    const json = (await res.json()) as { hits?: HNHit[] };
    const hits = json.hits ?? [];
    const leads: SocialLead[] = [];

    for (const hit of hits) {
      const rawTitle = hit.title || hit.story_title || 'Hacker News Freelance Inquiry';
      const rawHtml = hit.comment_text || hit.story_text || '';
      const rawBody = stripHtml(rawHtml);
      const combined = `${rawTitle} ${rawBody}`;

      const isJobSeekerThread = /who wants to be hired/i.test(rawTitle);
      const isHiringThread =
        /freelancer\?\s*seeking freelancer|who is hiring/i.test(rawTitle) ||
        /\bseeking freelancer\b/i.test(rawBody);
      const isSeekingWork =
        isJobSeekerThread ||
        /\bseeking freelance\b/i.test(combined) ||
        /\b(seeking work|for hire|available for freelance|looking for a job|my resume|hire me|willing to relocate|i architect|i build websites|years of experience)\b/i.test(
          combined
        ) ||
        /^location:\s/i.test(rawBody);

      if (isSeekingWork || !isHiringThread) continue;

      const hasHiringTerm = /\b(seeking freelancer|hiring|looking for a|need a|we need|looking to hire|contractor|remote)\b/i.test(
        combined
      );
      if (!hasHiringTerm) continue;

      const category = classifyServiceCategory(combined);
      if (!category) continue;

      const industry = classifyIndustry(combined);
      if (!matchesIndustryFilter(industry, combined, industryFilter)) continue;

      const safeUrl = sanitizeSafeExternalUrl(
        `https://news.ycombinator.com/item?id=${encodeURIComponent(hit.objectID)}`
      );
      if (!safeUrl) continue;

      const contact = extractContactInfo(rawHtml);
      const authorProfileUrl = hit.author
        ? `https://news.ycombinator.com/user?id=${encodeURIComponent(hit.author)}`
        : safeUrl;
      const ts = (hit.created_at_i || Math.floor(Date.now() / 1000)) * 1000;
      const stack = extractTechStack(combined);

      leads.push({
        id: `hn-${hit.objectID}`,
        title: `${category} — ${rawTitle}`.slice(0, 100),
        author: hit.author || 'HN User',
        authorProfileUrl,
        platform: 'Hacker News',
        sourceChannel: 'news.ycombinator.com',
        serviceCategory: category,
        industry,
        url: safeUrl,
        contactEmail: contact.contactEmail,
        contactPhone: contact.contactPhone,
        websiteUrl: contact.websiteUrl,
        socialLinks: contact.socialLinks,
        summary:
          rawBody.length > 0
            ? rawBody.slice(0, 240) + (rawBody.length > 240 ? '…' : '')
            : rawTitle,
        postedAt: new Date(ts).toISOString(),
        postedTimestamp: ts,
        budget: extractBudget(combined),
        techStack: stack.length > 0 ? stack : [category],
        needsFreelanceWebDev: true,
        verificationNote: `Hacker News hiring post for ${category} (${industry}).`,
        fetchMethod: 'Direct Public API',
      });
    }

    return { leads, status: 'ok' };
  } catch (err) {
    return {
      leads: [],
      status: 'error',
      message: err instanceof Error ? err.message : 'Hacker News search failed',
    };
  }
}

function mapPlatformFromUrl(url: string, hint?: string): SocialPlatform {
  const lower = `${url} ${hint ?? ''}`.toLowerCase();
  if (lower.includes('x.com') || lower.includes('twitter.com')) return 'X (Twitter)';
  if (lower.includes('linkedin.com')) return 'LinkedIn';
  if (lower.includes('reddit.com')) return 'Reddit';
  if (lower.includes('news.ycombinator.com')) return 'Hacker News';
  if (lower.includes('mastodon') || lower.includes('fosstodon')) return 'Mastodon';
  if (lower.includes('remotive.com')) return 'Remotive';
  if (lower.includes('dev.to')) return 'Dev.to';
  if (lower.includes('indiehackers.com')) return 'Indie Hackers';
  if (lower.includes('threads.net') || lower.includes('threads.com')) return 'Threads';
  if (lower.includes('facebook.com')) return 'Facebook';
  return 'Web Community';
}

async function fetchSearchGroundedLeads(
  query: string,
  platformFilter: string,
  serviceFilter: string,
  industryFilter: string
): Promise<{
  leads: SocialLead[];
  status: 'ok' | 'skipped' | 'error';
  message?: string;
}> {
  const ai = getGeminiClient();
  if (!ai) {
    return {
      leads: [],
      status: 'skipped',
      message: 'GEMINI_API_KEY not configured for X, LinkedIn, Threads & Facebook search.',
    };
  }

  const platformSiteClause =
    platformFilter === 'X (Twitter)'
      ? 'site:x.com OR site:twitter.com'
      : platformFilter === 'LinkedIn'
        ? 'site:linkedin.com/posts OR site:linkedin.com/jobs'
        : platformFilter === 'Reddit'
          ? 'site:reddit.com/r/forhire OR site:reddit.com/r/freelance_forhire'
          : platformFilter === 'Indie Hackers'
            ? 'site:indiehackers.com'
            : platformFilter === 'Threads'
              ? 'site:threads.net'
              : platformFilter === 'Facebook'
                ? 'site:facebook.com'
                : 'site:x.com OR site:linkedin.com/posts OR site:reddit.com/r/forhire OR site:threads.net OR site:indiehackers.com OR site:facebook.com';

  const serviceTopic =
    serviceFilter !== 'All Services'
      ? serviceFilter
      : 'freelance full stack web developer OR website development OR SEO OR AEO OR digital marketing';

  const industryClause =
    industryFilter && industryFilter !== 'All Industries'
      ? `in the "${industryFilter}" industry (${getIndustrySearchTerms(industryFilter)})`
      : 'across any business industry';

  const topic = query.trim() ? `${query.trim()} ${serviceTopic}` : serviceTopic;
  const prompt = `Search across social media platforms (${platformSiteClause}) for the most RECENT real posts where a client or business ${industryClause} is actively hiring a freelancer for Full-Stack Web Development, Website Development, SEO, AEO (Answer Engine Optimization), or Digital Marketing (topic: "${topic}").
Exclude self-promotion posts ("for hire", "hire me").
Extract ONLY real contact details and links explicitly visible in your Google Search results (never guess or fabricate an email or URL). Sort newest first.

Return strictly a JSON array (no markdown fences) of up to 8 items:
[
  {
    "title": "Short clear project title",
    "author": "Author name or @handle",
    "authorProfileUrl": "Exact profile URL if found in search results, else empty string",
    "platform": "X (Twitter) | LinkedIn | Indie Hackers | Threads | Reddit | Facebook | Web Community",
    "sourceChannel": "Domain or community name",
    "serviceCategory": "Full-Stack Web Dev | Website Development | SEO | AEO | Digital Marketing",
    "industry": "Industry name",
    "url": "Exact post URL from search results",
    "contactEmail": "Exact email if explicitly stated in post, else empty string",
    "contactPhone": "Exact phone if explicitly stated in post, else empty string",
    "websiteUrl": "Company/client website URL if stated, else empty string",
    "socialLinks": ["Additional real social URLs mentioned in post"],
    "summary": "2-sentence factual summary of the scope",
    "postedDateText": "ISO date YYYY-MM-DD found on page",
    "budget": "Exact budget/rate if stated, else Not specified",
    "techStack": ["Next.js", "SEO", "AEO"],
    "needsFreelanceWebDev": true,
    "verificationNote": "Brief note confirming freelance web/SEO/AEO/digital marketing hiring need"
  }
]`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
      },
    });

    const groundingChunks =
      response.candidates?.[0]?.groundingMetadata?.groundingChunks ?? [];
    const groundedUris = groundingChunks
      .map((chunk) => chunk.web?.uri)
      .filter((uri): uri is string => typeof uri === 'string' && uri.startsWith('http'));

    const rawText = (response.text ?? '').trim();
    const cleaned = rawText
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/```$/i, '')
      .trim();

    const jsonStart = cleaned.indexOf('[');
    const jsonEnd = cleaned.lastIndexOf(']');
    if (jsonStart === -1 || jsonEnd === -1) {
      return {
        leads: [],
        status: 'ok',
        message: 'No structured search matches parsed.',
      };
    }

    const parsed = JSON.parse(cleaned.slice(jsonStart, jsonEnd + 1)) as Array<
      Record<string, unknown>
    >;
    const leads: SocialLead[] = [];

    parsed.forEach((item, idx) => {
      const candidateUrl = typeof item.url === 'string' ? item.url : '';
      const fallbackUrl = groundedUris[idx] || groundedUris[0] || '';
      const safeUrl =
        sanitizeSafeExternalUrl(candidateUrl) || sanitizeSafeExternalUrl(fallbackUrl);
      if (!safeUrl) return;

      const title = typeof item.title === 'string' ? item.title.trim() : '';
      if (!title) return;

      const summary = typeof item.summary === 'string' ? item.summary.trim() : title;
      const category =
        classifyServiceCategory(
          `${title} ${summary}`,
          typeof item.serviceCategory === 'string' ? item.serviceCategory : ''
        ) ?? 'Full-Stack Web Dev';

      const industry = classifyIndustry(
        `${title} ${summary}`,
        typeof item.industry === 'string' ? item.industry : industryFilter
      );

      const dateStr =
        typeof item.postedDateText === 'string' ? item.postedDateText : '';
      const parsedTs = Date.parse(dateStr);
      const ts = Number.isFinite(parsedTs) ? parsedTs : Date.now() - idx * 3600_000;

      const platform = mapPlatformFromUrl(
        safeUrl,
        typeof item.platform === 'string' ? item.platform : ''
      );

      const authorProfileUrl =
        typeof item.authorProfileUrl === 'string'
          ? sanitizeSafeExternalUrl(item.authorProfileUrl) || safeUrl
          : safeUrl;
      const websiteUrl =
        typeof item.websiteUrl === 'string'
          ? sanitizeSafeExternalUrl(item.websiteUrl) || ''
          : '';
      const rawSocials = Array.isArray(item.socialLinks)
        ? item.socialLinks
            .filter((s): s is string => typeof s === 'string')
            .map((s) => sanitizeSafeExternalUrl(s))
            .filter((s): s is string => Boolean(s))
        : [];
      const socialLinks = Array.from(new Set([safeUrl, ...rawSocials])).slice(0, 6);

      const rawEmail =
        typeof item.contactEmail === 'string' ? item.contactEmail.trim() : '';
      const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawEmail) ? rawEmail : '';

      leads.push({
        id: `grounded-${idx}-${Buffer.from(safeUrl).toString('base64url').slice(0, 10)}`,
        title,
        author:
          typeof item.author === 'string' && item.author.trim()
            ? item.author.trim()
            : 'Social Poster',
        authorProfileUrl,
        platform,
        sourceChannel:
          typeof item.sourceChannel === 'string' && item.sourceChannel.trim()
            ? item.sourceChannel.trim()
            : new URL(safeUrl).hostname.replace(/^www\./, ''),
        serviceCategory: category,
        industry,
        url: safeUrl,
        contactEmail: validEmail,
        contactPhone:
          typeof item.contactPhone === 'string' ? item.contactPhone.trim() : '',
        websiteUrl,
        socialLinks,
        summary,
        postedAt: new Date(ts).toISOString(),
        postedTimestamp: ts,
        budget:
          typeof item.budget === 'string' && item.budget.trim()
            ? item.budget.trim()
            : 'Not specified',
        techStack: Array.isArray(item.techStack)
          ? item.techStack.filter((s): s is string => typeof s === 'string').slice(0, 6)
          : extractTechStack(`${title} ${summary}`),
        needsFreelanceWebDev: Boolean(item.needsFreelanceWebDev ?? true),
        verificationNote:
          typeof item.verificationNote === 'string' && item.verificationNote.trim()
            ? item.verificationNote.trim()
            : `Grounded recent post for ${category} (${industry}).`,
        fetchMethod: 'Google Search Grounded',
      });
    });

    return { leads, status: 'ok' };
  } catch (err) {
    return {
      leads: [],
      status: 'error',
      message: err instanceof Error ? err.message : 'Search grounding unavailable',
    };
  }
}

export async function runSocialMediaScan(
  query: string,
  platformFilter: string,
  serviceFilter = 'All Services',
  industryFilter = 'All Industries'
): Promise<SocialScanResponse> {
  const normalizedPlatform = platformFilter || 'All Platforms';
  const normalizedService = serviceFilter || 'All Services';
  const normalizedIndustry = industryFilter || 'All Industries';

  const shouldFetchRemotive =
    normalizedPlatform === 'All Platforms' || normalizedPlatform === 'Remotive';
  const shouldFetchDevTo =
    normalizedPlatform === 'All Platforms' || normalizedPlatform === 'Dev.to';
  const shouldFetchMastodon =
    normalizedPlatform === 'All Platforms' || normalizedPlatform === 'Mastodon';
  const shouldFetchReddit =
    normalizedPlatform === 'All Platforms' || normalizedPlatform === 'Reddit';
  const shouldFetchHN =
    normalizedPlatform === 'All Platforms' || normalizedPlatform === 'Hacker News';
  const shouldFetchGrounded =
    normalizedPlatform === 'All Platforms' ||
    ['Reddit', 'X (Twitter)', 'LinkedIn', 'Indie Hackers', 'Threads', 'Facebook'].includes(
      normalizedPlatform
    );

  const [remotiveRes, devToRes, mastodonRes, redditRes, hnRes, groundedRes] =
    await Promise.all([
      shouldFetchRemotive
        ? fetchRemotiveLeads(query, normalizedIndustry)
        : Promise.resolve({
            leads: [] as SocialLead[],
            status: 'ok' as const,
            message: undefined as string | undefined,
          }),
      shouldFetchDevTo
        ? fetchDevToLeads(query, normalizedIndustry)
        : Promise.resolve({
            leads: [] as SocialLead[],
            status: 'ok' as const,
            message: undefined as string | undefined,
          }),
      shouldFetchMastodon
        ? fetchMastodonLeads(query, normalizedIndustry)
        : Promise.resolve({
            leads: [] as SocialLead[],
            status: 'ok' as const,
            message: undefined as string | undefined,
          }),
      shouldFetchReddit
        ? fetchRedditLeads(query, normalizedIndustry)
        : Promise.resolve({
            leads: [] as SocialLead[],
            status: 'ok' as const,
            message: undefined as string | undefined,
          }),
      shouldFetchHN
        ? fetchHackerNewsLeads(query, normalizedIndustry)
        : Promise.resolve({
            leads: [] as SocialLead[],
            status: 'ok' as const,
            message: undefined as string | undefined,
          }),
      shouldFetchGrounded
        ? fetchSearchGroundedLeads(
            query,
            normalizedPlatform,
            normalizedService,
            normalizedIndustry
          )
        : Promise.resolve({
            leads: [] as SocialLead[],
            status: 'skipped' as const,
            message: undefined as string | undefined,
          }),
    ]);

  const seenUrls = new Set<string>();
  const combined: SocialLead[] = [];

  for (const lead of [
    ...mastodonRes.leads,
    ...devToRes.leads,
    ...redditRes.leads,
    ...hnRes.leads,
    ...remotiveRes.leads,
    ...groundedRes.leads,
  ]) {
    if (seenUrls.has(lead.url)) continue;
    seenUrls.add(lead.url);
    if (normalizedPlatform !== 'All Platforms' && lead.platform !== normalizedPlatform) {
      continue;
    }
    if (normalizedService !== 'All Services' && lead.serviceCategory !== normalizedService) {
      continue;
    }
    if (normalizedIndustry !== 'All Industries' && lead.industry !== normalizedIndustry) {
      continue;
    }
    combined.push(lead);
  }

  combined.sort((a, b) => b.postedTimestamp - a.postedTimestamp);

  return {
    leads: combined,
    meta: {
      scannedAt: new Date().toISOString(),
      query: query.trim() || 'Full-Stack Web Dev, Website Dev, SEO & AEO',
      platformFilter: normalizedPlatform,
      serviceFilter: normalizedService,
      industryFilter: normalizedIndustry,
      totalFetched: combined.length,
      confirmedFreelanceNeeds: combined.filter((l) => l.needsFreelanceWebDev).length,
      sources: {
        remotive: {
          count: remotiveRes.leads.length,
          status: remotiveRes.status,
          message: remotiveRes.message,
        },
        devTo: {
          count: devToRes.leads.length,
          status: devToRes.status,
          message: devToRes.message,
        },
        mastodon: {
          count: mastodonRes.leads.length,
          status: mastodonRes.status,
          message: mastodonRes.message,
        },
        hackerNews: {
          count: hnRes.leads.length,
          status: hnRes.status,
          message: hnRes.message,
        },
        reddit: {
          count: redditRes.leads.length,
          status: redditRes.status,
          message: redditRes.message,
        },
        searchGrounded: {
          count: groundedRes.leads.length,
          status: groundedRes.status,
          message: groundedRes.message,
        },
      },
    },
  };
}

export async function verifySocialPost(input: string): Promise<PostVerificationResult> {
  const trimmed = input.trim();
  if (!trimmed) {
    throw new Error('Please enter a social media post URL or paste post text.');
  }

  const ai = getGeminiClient();
  if (!ai) {
    throw new Error(
      'GEMINI_API_KEY is required on the server to analyze and verify social posts.'
    );
  }

  const isUrl = /^https?:\/\//i.test(trimmed);
  let safeUrl = '';
  if (isUrl) {
    const validated = sanitizeSafeExternalUrl(trimmed);
    if (!validated) {
      throw new Error(
        'Invalid or restricted URL. Please provide a public https:// social post link.'
      );
    }
    safeUrl = validated;
  }

  const response = await ai.models.generateContent({
    model: 'gemini-4-hydrogen',
    contents: isUrl
      ? `Inspect this social media post URL (${safeUrl}) and determine accurately whether the author is genuinely looking to hire a freelancer for Full-Stack Web Development, Website Development, SEO, AEO, or Digital Marketing. Extract any explicitly listed contact email, website URL, author profile URL, social media links, and industry.`
      : `Analyze this social media post text and determine accurately whether the author is genuinely looking to hire a freelancer for Full-Stack Web Development, Website Development, SEO, AEO, or Digital Marketing. Extract any explicitly listed contact email, website URL, social media links, and industry:\n\n"""\n${trimmed.slice(0, 4000)}\n"""`,
    config: {
      ...(isUrl ? { tools: [{ urlContext: {} }] } : {}),
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          needsFreelanceWebDev: { type: Type.BOOLEAN },
          verdictLabel: { type: Type.STRING },
          confidenceReason: { type: Type.STRING },
          suggestedTitle: { type: Type.STRING },
          clientOrAuthor: { type: Type.STRING },
          authorProfileUrl: { type: Type.STRING },
          contactEmail: { type: Type.STRING },
          websiteUrl: { type: Type.STRING },
          socialLinks: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
          platformGuess: { type: Type.STRING },
          serviceCategory: { type: Type.STRING },
          industry: { type: Type.STRING },
          budgetExtracted: { type: Type.STRING },
          techStack: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
          summary: { type: Type.STRING },
          recommendedPitch: { type: Type.STRING },
        },
        required: [
          'needsFreelanceWebDev',
          'verdictLabel',
          'confidenceReason',
          'suggestedTitle',
          'clientOrAuthor',
          'authorProfileUrl',
          'contactEmail',
          'websiteUrl',
          'socialLinks',
          'platformGuess',
          'serviceCategory',
          'industry',
          'budgetExtracted',
          'techStack',
          'summary',
          'recommendedPitch',
        ],
      },
    },
  });

  const parsed = JSON.parse((response.text ?? '{}').trim()) as Omit<
    PostVerificationResult,
    'sourceUrl'
  >;

  const validCategory =
    classifyServiceCategory(`${parsed.suggestedTitle} ${parsed.summary}`, parsed.serviceCategory) ??
    'Full-Stack Web Dev';
  const validIndustry = classifyIndustry(
    `${parsed.suggestedTitle} ${parsed.summary}`,
    parsed.industry
  );

  const fallbackExtract = extractContactInfo(trimmed);

  return {
    ...parsed,
    authorProfileUrl: sanitizeSafeExternalUrl(parsed.authorProfileUrl || '') || safeUrl,
    contactEmail: parsed.contactEmail || fallbackExtract.contactEmail,
    websiteUrl: sanitizeSafeExternalUrl(parsed.websiteUrl || '') || fallbackExtract.websiteUrl,
    socialLinks: (parsed.socialLinks || [])
      .map((u) => sanitizeSafeExternalUrl(u))
      .filter((u): u is string => Boolean(u)),
    serviceCategory: validCategory,
    industry: validIndustry,
    platformGuess: mapPlatformFromUrl(safeUrl, parsed.platformGuess),
    sourceUrl: safeUrl,
  };
}
