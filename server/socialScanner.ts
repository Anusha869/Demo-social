import dns from 'node:dns/promises';
import net from 'node:net';
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
  { pattern: /\btechnical seo\b/i, label: 'Technical SEO' },
  { pattern: /\bseo\b|search engine optimization/i, label: 'SEO' },
  { pattern: /\baeo\b|answer engine optimization/i, label: 'AEO' },
  { pattern: /\bgeo\b|generative engine/i, label: 'GEO' },
  { pattern: /\bschema\.org|json-ld|structured data\b/i, label: 'Schema.org' },
  { pattern: /\bcore web vitals|pagespeed|lighthouse\b/i, label: 'Core Web Vitals' },
  { pattern: /\bwordpress\b/i, label: 'WordPress' },
  { pattern: /\bshopify\b/i, label: 'Shopify' },
  { pattern: /\bwebflow\b/i, label: 'Webflow' },
  { pattern: /\bwoocommerce\b/i, label: 'WooCommerce' },
  { pattern: /\bnext\.?js\b/i, label: 'Next.js' },
  { pattern: /\breact(?:\.?js)?\b/i, label: 'React' },
  { pattern: /\btypescript\b/i, label: 'TypeScript' },
  { pattern: /\bnode\.?js\b/i, label: 'Node.js' },
  { pattern: /\btailwind\b/i, label: 'Tailwind CSS' },
  { pattern: /\bhtml\b|\bcss\b/i, label: 'HTML/CSS' },
  { pattern: /\bfull[\s-]?stack\b/i, label: 'Full-Stack' },
  { pattern: /\bgoogle search console|ga4|google analytics\b/i, label: 'GA4 / GSC' },
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
    pattern: /\b(non-?profit|ngo|charity|foundation|community|civic|government|sustainability|volunteer)\b/i,
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
  'himalayas.app',
  'jobicy.com',
  'remoteok.com',
  'remoteok.io',
  'arbeitnow.com',
  'arbeitnow.co.uk',
  'arbeitnow.nl',
  'remotive.com',
  'news.ycombinator.com',
  'dev.to',
  'reddit.com',
  'redd.it',
  'mastodon.social',
  'fosstodon.org',
  'w3.org',
  'schema.org',
  'fonts.googleapis.com',
  'googletagmanager.com',
  'google-analytics.com',
  'sentry.io',
  'cloudinary.com',
  'gravatar.com',
  'wa.me',
  'api.whatsapp.com',
];

const FREE_EMAIL_DOMAINS = new Set([
  'gmail.com',
  'googlemail.com',
  'yahoo.com',
  'ymail.com',
  'outlook.com',
  'hotmail.com',
  'live.com',
  'msn.com',
  'icloud.com',
  'me.com',
  'proton.me',
  'protonmail.com',
  'aol.com',
  'zoho.com',
  'gmx.com',
  'mail.com',
]);

const WEBSITE_DEV_SIGNAL_RE =
  /\b(website\s?dev(?:eloper|elopment)?|web\s?dev(?:eloper|elopment)?|web\s?designer|webmaster|website\s?(?:redesign|migration|optimization|builder|build|audit)|wordpress|shopify|webflow|woocommerce|squarespace|wix|front[\s-]?end|frontend|landing\s?page|cms|next\.?js|react\s?(?:web|frontend|developer|site)|full[\s-]?stack\s?(?:web|developer|engineer)|html\/css)\b/i;

const SEO_SIGNAL_RE =
  /\b(seo|technical\s+seo|on[\s-]?page\s+seo|off[\s-]?page\s+seo|local\s+seo|search\s+engine\s+optimization|organic\s+(?:search|traffic|growth)|google\s+search\s+console|schema\.org|core\s+web\s+vitals|serp|aeo|answer\s+engine|seo\s*\/\s*geo)\b/i;

const EXCLUDED_NON_WEB_TITLE_RE =
  /\b(customer support|tax intern|content reviewer|youtube|talent acquisition|office assistant|data engineer|devops|site reliability|account executive|sales rep(?:resentative)?|recruiter|operations analyst|software assurance|qa analyst|hr manager|bookkeeper|video editor|3d artist|embedded firmware|ios developer|android developer|rails engineer)\b/i;

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
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
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

function isPrivateOrReservedIp(ip: string): boolean {
  const normalized = ip.toLowerCase();
  if (normalized.startsWith('::ffff:')) {
    return isPrivateOrReservedIp(normalized.slice(7));
  }
  const version = net.isIP(normalized);
  if (version === 4) {
    const parts = normalized.split('.').map(Number);
    if (parts.length !== 4 || parts.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) {
      return true;
    }
    const [a, b] = parts;
    if (a === 0 || a === 10 || a === 127) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
    if (a >= 224) return true; // Multicast / reserved
    return false;
  }
  if (version === 6) {
    if (normalized === '::1' || normalized === '::') return true;
    if (normalized.startsWith('fe80:') || normalized.startsWith('fc') || normalized.startsWith('fd')) {
      return true;
    }
    return false;
  }
  return true;
}

function sanitizeSafeExternalUrl(rawUrl: string): string | null {
  try {
    const parsed = new URL(rawUrl.trim());
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      return null;
    }
    if (parsed.username || parsed.password) {
      return null;
    }
    const host = parsed.hostname.toLowerCase();
    if (
      !host ||
      host === 'localhost' ||
      host.endsWith('.localhost') ||
      host.endsWith('.local') ||
      host.endsWith('.internal') ||
      host === '0.0.0.0'
    ) {
      return null;
    }
    if (net.isIP(host) && isPrivateOrReservedIp(host)) {
      return null;
    }
    return parsed.toString();
  } catch {
    return null;
  }
}

async function resolveAndVerifyPublicUrl(rawUrl: string): Promise<string | null> {
  const safe = sanitizeSafeExternalUrl(rawUrl);
  if (!safe) return null;
  const parsed = new URL(safe);
  const host = parsed.hostname;
  if (net.isIP(host)) {
    return isPrivateOrReservedIp(host) ? null : safe;
  }
  try {
    const records = await dns.lookup(host, { all: true });
    if (!records || records.length === 0) return null;
    if (records.some((r) => isPrivateOrReservedIp(r.address))) {
      return null;
    }
    return safe;
  } catch {
    return null;
  }
}

async function safeFetchPublicHtml(rawUrl: string): Promise<{ html: string; finalUrl: string } | null> {
  let currentUrl: string | null = await resolveAndVerifyPublicUrl(rawUrl);
  if (!currentUrl) return null;

  for (let hop = 0; hop <= 2; hop += 1) {
    try {
      const res = await fetch(currentUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; HK-Surya-LeadBot/1.0)',
          Accept: 'text/html,application/xhtml+xml',
        },
        redirect: 'manual',
        signal: AbortSignal.timeout(3500),
      });

      if (res.status >= 300 && res.status < 400) {
        const location = res.headers.get('location');
        if (!location) return null;
        const resolvedNext = new URL(location, currentUrl).toString();
        const verifiedNext = await resolveAndVerifyPublicUrl(resolvedNext);
        if (!verifiedNext) return null;
        currentUrl = verifiedNext;
        continue;
      }

      if (!res.ok) return null;
      const contentType = (res.headers.get('content-type') || '').toLowerCase();
      if (
        contentType &&
        !contentType.includes('text/html') &&
        !contentType.includes('application/xhtml+xml') &&
        !contentType.includes('text/plain')
      ) {
        return null;
      }

      const html = (await res.text()).slice(0, 300_000);
      return { html, finalUrl: currentUrl };
    } catch {
      return null;
    }
  }
  return null;
}

function normalizePhoneCandidate(raw: string): string {
  const trimmed = raw
    .replace(/^tel:/i, '')
    .replace(/^whatsapp:/i, '')
    .replace(/;ext=.*$/i, '')
    .replace(/[.,;)\]]+$/, '')
    .trim();

  const decoded = decodeURIComponent(trimmed);
  const digitsOnly = decoded.replace(/\D/g, '');
  if (digitsOnly.length < 8 || digitsOnly.length > 15) return '';

  // Reject dates (YYYY-MM-DD, YYYYMMDD, DD/MM/YYYY), fictional 555-01xx, or dummy sequences
  if (/^(19|20)\d{2}[-/.]?\d{2}[-/.]?\d{2}$/.test(decoded.trim())) return '';
  if (/^(\d)\1{6,}$/.test(digitsOnly)) return '';
  if (/^(12345678|00000000|99999999)/.test(digitsOnly)) return '';
  if (/^(?:1?55501\d{2}|1?5551234|55501\d{2})$/.test(digitsOnly)) return '';
  if (/555[\s.-]?01\d{2}/.test(decoded)) return '';

  // Clean display string preserving '+' or standard grouping
  const cleaned = decoded.replace(/[^\d+\-()\s.]/g, '').replace(/\s+/g, ' ').trim();
  return cleaned;
}

function extractPhoneNumbers(rawHtmlOrText: string): string[] {
  const found: string[] = [];
  const seenDigits = new Set<string>();

  const pushCandidate = (raw: string) => {
    const normalized = normalizePhoneCandidate(raw);
    if (!normalized) return;
    const digits = normalized.replace(/\D/g, '');
    if (seenDigits.has(digits)) return;
    seenDigits.add(digits);
    found.push(normalized);
  };

  // 1. Explicit tel: URIs (highest precision)
  const telHrefRegex = /href=["']tel:([^"'\s>]+)["']/gi;
  let m: RegExpExecArray | null = telHrefRegex.exec(rawHtmlOrText);
  while (m) {
    if (m[1]) pushCandidate(m[1]);
    m = telHrefRegex.exec(rawHtmlOrText);
  }

  // 2. WhatsApp links (wa.me/<digits> or api.whatsapp.com/send?phone=<digits>)
  const waRegex = /(?:wa\.me\/|api\.whatsapp\.com\/send\?[^"'\s>]*phone=)(\+?\d{8,15})/gi;
  m = waRegex.exec(rawHtmlOrText);
  while (m) {
    if (m[1]) pushCandidate(m[1].startsWith('+') ? m[1] : `+${m[1]}`);
    m = waRegex.exec(rawHtmlOrText);
  }

  // 3. Schema.org / JSON-LD "telephone"
  const jsonTelRegex = /"telephone"\s*:\s*"([^"]{7,30})"/gi;
  m = jsonTelRegex.exec(rawHtmlOrText);
  while (m) {
    if (m[1]) pushCandidate(m[1]);
    m = jsonTelRegex.exec(rawHtmlOrText);
  }

  // 4. Labeled phones in visible text (Phone:, Tel:, Call:, Mobile:, WhatsApp:)
  const plainText = stripHtml(rawHtmlOrText);
  const labeledRegex =
    /(?:phone|tel|telephone|call|mobile|whatsapp|contact)\s*(?:no\.?|number)?\s*[:\-–]\s*(\+?\(?\d[\d\s().\-–]{6,20}\d)/gi;
  m = labeledRegex.exec(plainText);
  while (m) {
    if (m[1]) pushCandidate(m[1]);
    m = labeledRegex.exec(plainText);
  }

  // 5. Explicit international or North American formatted numbers in plain text
  const intlMatches =
    plainText.match(/(?:\+\d{1,3}[\s.-]?(?:\(?\d{2,4}\)?[\s.-]?){2,4}\d{2,4}|\(\d{3}\)\s?\d{3}[\s.-]\d{4})\b/g) ??
    [];
  for (const cand of intlMatches) {
    pushCandidate(cand);
  }

  return found.slice(0, 3);
}

function deriveCompanyWebsiteFromEmail(email: string): string {
  const parts = email.toLowerCase().split('@');
  if (parts.length !== 2) return '';
  const domain = parts[1].trim();
  if (!domain || FREE_EMAIL_DOMAINS.has(domain)) return '';
  if (
    PLATFORM_HOST_EXCLUDES.some((ex) => domain === ex || domain.endsWith(`.${ex}`))
  ) {
    return '';
  }
  return sanitizeSafeExternalUrl(`https://${domain}`) ?? '';
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

  const mailtoMatches: string[] = [];
  const mailtoRe = /href=["']mailto:([^"'\s?>]+)/gi;
  let mm: RegExpExecArray | null = mailtoRe.exec(decoded);
  while (mm) {
    if (mm[1]) mailtoMatches.push(decodeURIComponent(mm[1]));
    mm = mailtoRe.exec(decoded);
  }

  const textEmailMatches =
    decoded.match(/\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,12}\b/g) ?? [];

  const allEmails = [...mailtoMatches, ...textEmailMatches].filter(
    (em) =>
      !/\.(png|jpg|jpeg|gif|svg|webp|css|js)$/i.test(em) &&
      !/^(no-?reply|noreply|mailer-daemon|anna@brightloom\.co|john@doe\.com|jane@doe\.com)/i.test(
        em
      ) &&
      !/@(example\.com|example\.org|sentry\.io|remotive\.com|himalayas\.app|jobicy\.com|arbeitnow\.com|remoteok\.com|wixpress\.com|brightloom\.co)$/i.test(
        em
      )
  );
  const validEmail =
    allEmails.find((em) => /^(contact|hello|info|jobs|careers|hiring|sales|support|hi|team)@/i.test(em)) ??
    allEmails.find((em) => !/^(privacy|dpo|legal|dmca|abuse)/i.test(em)) ??
    allEmails[0] ??
    '';

  const phones = extractPhoneNumbers(decoded);
  const contactPhone = phones[0] ?? '';

  const hrefMatches: string[] = [];
  const hrefRegex = /href=["'](https?:\/\/[^"'\s>]+)["']/gi;
  let m: RegExpExecArray | null = hrefRegex.exec(decoded);
  while (m) {
    if (m[1]) hrefMatches.push(m[1]);
    m = hrefRegex.exec(decoded);
  }

  const plainText = stripHtml(decoded);
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
      /\.(png|jpg|jpeg|gif|svg|webp|pdf|css|js|ico)$/i.test(pathname)
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

  if (!websiteUrl && validEmail) {
    websiteUrl = deriveCompanyWebsiteFromEmail(validEmail);
  }

  return {
    contactEmail: validEmail,
    contactPhone,
    websiteUrl,
    socialLinks,
  };
}

function findSameOriginContactHref(html: string, baseUrl: string): string | null {
  try {
    const base = new URL(baseUrl);
    const anchorRe = /<a\b[^>]*href=["']([^"'#]+)["'][^>]*>([\s\S]*?)<\/a>/gi;
    let m: RegExpExecArray | null = anchorRe.exec(html);
    while (m) {
      const href = (m[1] || '').trim();
      const label = stripHtml(m[2] || '').toLowerCase();
      if (/contact/i.test(href) || /contact/i.test(label)) {
        const resolved = new URL(href, base);
        if (resolved.origin === base.origin) {
          return sanitizeSafeExternalUrl(resolved.toString());
        }
      }
      m = anchorRe.exec(html);
    }
  } catch {
    return null;
  }
  return null;
}

const companySiteCache = new Map<string, string>();

async function lookupExactCompanyWebsite(companyName: string): Promise<string> {
  const cleaned = companyName
    .replace(/,?\s*(inc\.?|llc|ltd\.?|gmbh|corp\.?|co\.?)$/i, '')
    .replace(/\([^)]*\)/g, '')
    .trim();
  if (
    !cleaned ||
    cleaned.length < 2 ||
    /^(himalayas client|remoteok client|jobicy client|arbeitnow client|remotive client|hn user|mastodon user|reddit user|dev\.to author|social poster|direct inquiry)$/i.test(
      cleaned
    ) ||
    cleaned.startsWith('@') ||
    cleaned.startsWith('u/')
  ) {
    return '';
  }

  const norm = cleaned.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (norm.length < 3) return '';
  if (companySiteCache.has(norm)) return companySiteCache.get(norm) || '';

  try {
    const res = await fetch(
      `https://autocomplete.clearbit.com/v1/companies/suggest?query=${encodeURIComponent(cleaned)}`,
      {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(2500),
      }
    );
    if (!res.ok) {
      companySiteCache.set(norm, '');
      return '';
    }
    const items = (await res.json()) as Array<{ name?: string; domain?: string }>;
    if (!Array.isArray(items)) {
      companySiteCache.set(norm, '');
      return '';
    }

    const matches = items.filter((item) => {
      const nameNorm = (item.name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      const domainStem = (item.domain || '')
        .replace(/\.[a-z.]+$/i, '')
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '');
      return nameNorm === norm || domainStem === norm;
    });

    const preferredTldOrder = ['.com', '.io', '.co', '.ai', '.app', '.to', '.net', '.co.uk', '.org'];
    matches.sort((a, b) => {
      const dA = (a.domain || '').toLowerCase();
      const dB = (b.domain || '').toLowerCase();
      const rankA = preferredTldOrder.findIndex((tld) => dA.endsWith(tld));
      const rankB = preferredTldOrder.findIndex((tld) => dB.endsWith(tld));
      return (rankA === -1 ? 99 : rankA) - (rankB === -1 ? 99 : rankB);
    });

    const match = matches[0];
    const safe = match?.domain ? sanitizeSafeExternalUrl(`https://${match.domain}`) || '' : '';
    companySiteCache.set(norm, safe);
    return safe;
  } catch {
    companySiteCache.set(norm, '');
    return '';
  }
}

function isForeignLanguageMismatch(html: string, leadText: string): boolean {
  const langMatch = html.match(/<html[^>]*\blang=["']([a-z]{2})/i);
  if (!langMatch) return false;
  const siteLang = langMatch[1].toLowerCase();
  if (siteLang === 'en') return false;
  // Reject non-English site (e.g. German pavago.de) when the job listing itself is strictly English
  return !/\b(german|deutsch|french|français|spanish|español|dutch|nederlands|berlin|munich|paris|madrid)\b/i.test(
    leadText
  );
}

async function enrichLeadsWithPageContacts(leads: SocialLead[]): Promise<SocialLead[]> {
  const candidates = leads.slice(0, 24);
  const rest = leads.slice(24);
  const websiteCache = new Map<
    string,
    { contactPhone: string; contactEmail: string; socialLinks: string[]; rejectedLang?: string }
  >();

  const enrichOne = async (lead: SocialLead): Promise<SocialLead> => {
    if (lead.contactPhone && lead.contactEmail) return lead;

    let siteUrl = lead.websiteUrl;
    let extraEmail = lead.contactEmail;
    let extraPhone = lead.contactPhone;
    const mergedSocials = [...lead.socialLinks];
    let lookedUpFromName = false;

    if (!siteUrl && /arbeitnow\.|remoteok\.com|remotive\.com/i.test(lead.url)) {
      const jobPage = await safeFetchPublicHtml(lead.url);
      if (jobPage) {
        const pageInfo = extractContactInfo(jobPage.html);
        if (pageInfo.contactPhone && !extraPhone) extraPhone = pageInfo.contactPhone;
        if (pageInfo.contactEmail && !extraEmail) extraEmail = pageInfo.contactEmail;
        if (pageInfo.websiteUrl) siteUrl = pageInfo.websiteUrl;
      }
    }

    if (!siteUrl) {
      siteUrl = await lookupExactCompanyWebsite(lead.author);
      lookedUpFromName = Boolean(siteUrl);
    }

    if (siteUrl && (!extraPhone || !extraEmail)) {
      const originKey = (() => {
        try {
          return new URL(siteUrl).origin;
        } catch {
          return siteUrl;
        }
      })();

      let cached = websiteCache.get(originKey);
      if (!cached) {
        const home = await safeFetchPublicHtml(siteUrl);
        let foundPhone = '';
        let foundEmail = '';
        const foundSocials: string[] = [];
        let rejectedLang = '';

        if (home) {
          if (lookedUpFromName && isForeignLanguageMismatch(home.html, `${lead.title} ${lead.summary}`)) {
            rejectedLang = 'mismatch';
          } else {
            const homeInfo = extractContactInfo(home.html, [], lead.authorProfileUrl);
            foundPhone = homeInfo.contactPhone;
            foundEmail = homeInfo.contactEmail;
            foundSocials.push(...homeInfo.socialLinks);

            if (!foundPhone) {
              const contactHref = findSameOriginContactHref(home.html, home.finalUrl);
              if (contactHref && contactHref !== home.finalUrl) {
                const contactPage = await safeFetchPublicHtml(contactHref);
                if (contactPage) {
                  const contactInfo = extractContactInfo(contactPage.html);
                  if (contactInfo.contactPhone) foundPhone = contactInfo.contactPhone;
                  if (!foundEmail && contactInfo.contactEmail) foundEmail = contactInfo.contactEmail;
                }
              }
            }
          }
        }

        cached = {
          contactPhone: foundPhone,
          contactEmail: foundEmail,
          socialLinks: foundSocials,
          rejectedLang,
        };
        websiteCache.set(originKey, cached);
      }

      if (cached.rejectedLang && lookedUpFromName) {
        siteUrl = '';
      } else {
        if (!extraPhone && cached.contactPhone) extraPhone = cached.contactPhone;
        if (!extraEmail && cached.contactEmail) extraEmail = cached.contactEmail;
        for (const s of cached.socialLinks) {
          if (!mergedSocials.includes(s) && mergedSocials.length < 6) mergedSocials.push(s);
        }
      }
    }

    return {
      ...lead,
      websiteUrl: siteUrl || '',
      contactEmail: extraEmail,
      contactPhone: extraPhone,
      socialLinks: mergedSocials,
    };
  };

  // Run in bounded batches of 6 to keep latency fast and polite
  const enriched: SocialLead[] = [];
  for (let i = 0; i < candidates.length; i += 6) {
    const batch = candidates.slice(i, i + 6);
    const settled = await Promise.allSettled(batch.map(enrichOne));
    settled.forEach((res, idx) => {
      enriched.push(res.status === 'fulfilled' ? res.value : batch[idx]);
    });
  }

  return [...enriched, ...rest];
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

function hasWebsiteDevSignal(text: string): boolean {
  return WEBSITE_DEV_SIGNAL_RE.test(text);
}

function hasSeoSignal(text: string): boolean {
  return SEO_SIGNAL_RE.test(text);
}

function classifyWebSeoCategory(
  titleAndTags: string,
  fullText: string,
  hint?: string
): ServiceCategory | null {
  if (EXCLUDED_NON_WEB_TITLE_RE.test(titleAndTags)) {
    return null;
  }

  const primary = `${titleAndTags} ${hint ?? ''}`;
  const full = `${primary} ${fullText}`;

  const titleHasWeb = hasWebsiteDevSignal(primary);
  const titleHasSeo = hasSeoSignal(primary);

  // Require at least Website Dev OR SEO in the role title/tags (not buried in company boilerplate)
  if (!titleHasWeb && !titleHasSeo) {
    return null;
  }

  const anyWeb = titleHasWeb || hasWebsiteDevSignal(full);
  const anySeo = titleHasSeo || hasSeoSignal(full);

  if (anyWeb && anySeo) {
    return 'Website Dev + SEO';
  }
  if (titleHasSeo) {
    return 'SEO';
  }
  if (titleHasWeb) {
    return 'Website Development';
  }
  return null;
}

function matchesServiceScopeFilter(lead: SocialLead, serviceFilter: string): boolean {
  if (!serviceFilter || serviceFilter === 'All Web + SEO' || serviceFilter === 'All Services') {
    return (
      lead.serviceCategory === 'Website Dev + SEO' ||
      lead.serviceCategory === 'Website Development' ||
      lead.serviceCategory === 'SEO'
    );
  }
  if (serviceFilter === 'Website Dev + SEO') {
    return lead.serviceCategory === 'Website Dev + SEO';
  }
  if (serviceFilter === 'Website Development') {
    return (
      lead.serviceCategory === 'Website Development' ||
      lead.serviceCategory === 'Website Dev + SEO'
    );
  }
  if (serviceFilter === 'SEO') {
    return lead.serviceCategory === 'SEO' || lead.serviceCategory === 'Website Dev + SEO';
  }
  return lead.serviceCategory === serviceFilter;
}

function isWebSeoHiringIntent(title: string, body: string): boolean {
  const combined = `${title} ${body}`.toLowerCase();
  const isForHireSelfPromo =
    /\[for\s*hire\]/i.test(title) ||
    /\b(i am available|available for hire|available for work|open for work|seeking freelance work|my portfolio|dm me for web|hire me|for hire:|i build websites|landed a freelance|my services)\b/i.test(
      combined
    );
  if (isForHireSelfPromo) return false;

  const hasHiringSignal =
    /\[hiring\]/i.test(title) ||
    /\b(we are hiring|we're hiring|is hiring|hiring a|hiring freelance|looking to hire|looking for a|looking for an|need a|need an|we need|seeking a|seeking freelancer|want to hire|searching for a|apply now|join our team)\b/i.test(
      combined
    );

  return hasHiringSignal && (hasWebsiteDevSignal(combined) || hasSeoSignal(combined));
}

interface HimalayasJob {
  title?: string;
  excerpt?: string;
  companyName?: string;
  companySlug?: string;
  employmentType?: string;
  minSalary?: number | null;
  maxSalary?: number | null;
  salaryPeriod?: string;
  currency?: string;
  categories?: string[];
  description?: string;
  pubDate?: number;
  applicationLink?: string;
  guid?: string;
}

async function fetchHimalayasLeads(
  query: string,
  industryFilter: string
): Promise<{ leads: SocialLead[]; status: 'ok' | 'error'; message?: string }> {
  const searchTerms = query.trim()
    ? [`${query.trim()} website seo`, `${query.trim()} seo`]
    : ['seo web developer', 'website seo', 'wordpress seo'];

  const endpoints = searchTerms.map(
    (term) => `https://himalayas.app/jobs/api/search?q=${encodeURIComponent(term)}&limit=25`
  );

  const leads: SocialLead[] = [];
  let hadSuccess = false;
  let lastError = '';
  const sixtyDaysAgo = Date.now() - 60 * 24 * 60 * 60 * 1000;
  const qLower = query.trim().toLowerCase();

  const results = await Promise.allSettled(
    endpoints.map(async (url) => {
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'HK-Surya-LeadScanner/1.0',
          Accept: 'application/json',
        },
        signal: AbortSignal.timeout(7000),
      });
      if (!res.ok) throw new Error(`Himalayas HTTP ${res.status}`);
      return res.json() as Promise<{ jobs?: HimalayasJob[] }>;
    })
  );

  for (const result of results) {
    if (result.status === 'fulfilled') {
      hadSuccess = true;
      const jobs = result.value?.jobs ?? [];
      for (const job of jobs) {
        if (!job?.title) continue;
        const rawUrl = job.guid || job.applicationLink || '';
        const safeUrl = sanitizeSafeExternalUrl(rawUrl);
        if (!safeUrl) continue;

        const ts =
          typeof job.pubDate === 'number' && job.pubDate > 1000000000
            ? job.pubDate * 1000
            : Date.now();
        if (ts < sixtyDaysAgo) continue;

        const cleanDesc = stripHtml(job.description ?? job.excerpt ?? '');
        const titleAndTags = `${job.title} ${(job.categories ?? []).join(' ')}`;
        const combined = `${titleAndTags} ${cleanDesc}`;
        if (qLower && !combined.toLowerCase().includes(qLower)) continue;

        const category = classifyWebSeoCategory(titleAndTags, cleanDesc);
        if (!category) continue;

        const industry = classifyIndustry(`${job.companyName ?? ''} ${combined}`);
        if (!matchesIndustryFilter(industry, combined, industryFilter)) continue;

        const contact = extractContactInfo(job.description ?? '');
        const stack = extractTechStack(combined);
        const salaryText =
          job.minSalary || job.maxSalary
            ? `${job.currency || 'USD'} ${job.minSalary ?? ''}${
                job.minSalary && job.maxSalary ? '-' : ''
              }${job.maxSalary ?? ''} ${job.salaryPeriod || ''}`.trim()
            : extractBudget(cleanDesc);
        const isContractor = /contract|freelance|part/i.test(
          `${job.employmentType ?? ''} ${job.title}`
        );

        leads.push({
          id: `himalayas-${Buffer.from(safeUrl).toString('base64url').slice(0, 12)}`,
          title: job.title,
          author: job.companyName || 'Himalayas Client',
          authorProfileUrl: contact.websiteUrl || safeUrl,
          platform: 'Himalayas',
          sourceChannel: `himalayas.app · ${job.employmentType || 'remote'}`,
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
          budget: salaryText,
          techStack: stack.length > 0 ? stack : ['Website Dev', 'SEO'],
          needsFreelanceWebDev: true,
          verificationNote: `Live Himalayas ${isContractor ? 'contract/freelance' : 'remote'} ${category} listing (${industry}).`,
          fetchMethod: 'Direct Public API',
        });
      }
    } else {
      lastError = result.reason instanceof Error ? result.reason.message : 'Himalayas unavailable';
    }
  }

  return {
    leads,
    status: hadSuccess ? 'ok' : 'error',
    message: hadSuccess ? undefined : lastError || 'Himalayas API unavailable',
  };
}

interface RemoteOkJob {
  id?: string | number;
  position?: string;
  company?: string;
  date?: string;
  url?: string;
  apply_url?: string;
  tags?: string[];
  description?: string;
  salary_min?: number;
  salary_max?: number;
}

async function fetchRemoteOkLeads(
  query: string,
  industryFilter: string
): Promise<{ leads: SocialLead[]; status: 'ok' | 'error'; message?: string }> {
  const url = 'https://remoteok.com/api?tag=seo';
  const leads: SocialLead[] = [];
  const sixtyDaysAgo = Date.now() - 60 * 24 * 60 * 60 * 1000;
  const qLower = query.trim().toLowerCase();

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'HK-Surya-LeadScanner/1.0',
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(7000),
    });
    if (!res.ok) throw new Error(`RemoteOK HTTP ${res.status}`);
    const data = (await res.json()) as unknown[];
    const jobs = (Array.isArray(data) ? data.slice(1) : []) as RemoteOkJob[];

    for (const job of jobs) {
      if (!job?.position || !job?.url) continue;
      const ts = Date.parse(job.date ?? '');
      if (!Number.isFinite(ts) || ts < sixtyDaysAgo) continue;

      const cleanDesc = stripHtml(job.description ?? '');
      const titleOnly = job.position;
      // RemoteOK attaches 30 noisy tags; classify strictly using position title + description
      const combined = `${titleOnly} ${cleanDesc}`;
      if (qLower && !combined.toLowerCase().includes(qLower)) continue;

      const category = classifyWebSeoCategory(titleOnly, cleanDesc);
      if (!category) continue;

      const industry = classifyIndustry(`${job.company ?? ''} ${combined}`);
      if (!matchesIndustryFilter(industry, combined, industryFilter)) continue;

      const safeUrl = sanitizeSafeExternalUrl(job.url);
      if (!safeUrl) continue;

      const extraUrls = job.apply_url ? [job.apply_url] : [];
      const contact = extractContactInfo(job.description ?? '', extraUrls);
      const stack = extractTechStack(`${titleOnly} ${(job.tags ?? []).join(' ')} ${cleanDesc}`);
      const budget =
        job.salary_min || job.salary_max
          ? `$${(job.salary_min || 0).toLocaleString()}–$${(job.salary_max || 0).toLocaleString()}/yr`
          : extractBudget(cleanDesc);

      leads.push({
        id: `remoteok-${job.id ?? Buffer.from(safeUrl).toString('base64url').slice(0, 8)}`,
        title: titleOnly,
        author: job.company || 'RemoteOK Client',
        authorProfileUrl: contact.websiteUrl || safeUrl,
        platform: 'RemoteOK',
        sourceChannel: 'remoteok.com',
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
            : titleOnly,
        postedAt: new Date(ts).toISOString(),
        postedTimestamp: ts,
        budget,
        techStack: stack.length > 0 ? stack : ['Website Dev', 'SEO'],
        needsFreelanceWebDev: true,
        verificationNote: `Live RemoteOK ${category} listing (${industry}).`,
        fetchMethod: 'Direct Public API',
      });
    }

    return { leads, status: 'ok' };
  } catch (err) {
    return {
      leads: [],
      status: 'error',
      message: err instanceof Error ? err.message : 'RemoteOK API unavailable',
    };
  }
}

interface JobicyJob {
  id: number;
  url: string;
  jobTitle: string;
  companyName: string;
  jobIndustry?: string[];
  jobType?: string[];
  pubDate: string;
  annualSalaryMin?: string;
  annualSalaryMax?: string;
  salaryCurrency?: string;
  jobDescription?: string;
}

async function fetchJobicyLeads(
  query: string,
  industryFilter: string
): Promise<{ leads: SocialLead[]; status: 'ok' | 'error'; message?: string }> {
  // Jobicy enforces max 1 req/sec per IP: make strictly 1 request
  const url = 'https://jobicy.com/api/v2/remote-jobs?count=50&tag=seo';
  const leads: SocialLead[] = [];
  const sixtyDaysAgo = Date.now() - 60 * 24 * 60 * 60 * 1000;
  const qLower = query.trim().toLowerCase();

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'HK-Surya-LeadScanner/1.0',
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(7000),
    });
    if (!res.ok) throw new Error(`Jobicy HTTP ${res.status}`);
    const data = (await res.json()) as { jobs?: JobicyJob[] };
    const jobs = data.jobs ?? [];

    for (const job of jobs) {
      if (!job?.jobTitle || !job?.url) continue;
      const ts = Date.parse(job.pubDate);
      if (!Number.isFinite(ts) || ts < sixtyDaysAgo) continue;

      const cleanDesc = stripHtml(job.jobDescription ?? '');
      const titleAndIndustry = `${job.jobTitle} ${(job.jobIndustry ?? []).join(' ')}`;
      const combined = `${titleAndIndustry} ${cleanDesc}`;
      if (qLower && !combined.toLowerCase().includes(qLower)) continue;

      const category = classifyWebSeoCategory(job.jobTitle, cleanDesc);
      if (!category) continue;

      const industry = classifyIndustry(`${job.companyName} ${combined}`);
      if (!matchesIndustryFilter(industry, combined, industryFilter)) continue;

      const safeUrl = sanitizeSafeExternalUrl(job.url);
      if (!safeUrl) continue;

      const contact = extractContactInfo(job.jobDescription ?? '');
      const stack = extractTechStack(combined);
      const budget =
        job.annualSalaryMin || job.annualSalaryMax
          ? `${job.salaryCurrency || 'USD'} ${job.annualSalaryMin || ''}–${job.annualSalaryMax || ''}/yr`
          : extractBudget(cleanDesc);

      leads.push({
        id: `jobicy-${job.id}`,
        title: job.jobTitle,
        author: job.companyName || 'Jobicy Client',
        authorProfileUrl: contact.websiteUrl || safeUrl,
        platform: 'Jobicy',
        sourceChannel: `jobicy.com · ${(job.jobType ?? ['remote']).join(', ')}`,
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
            : job.jobTitle,
        postedAt: new Date(ts).toISOString(),
        postedTimestamp: ts,
        budget,
        techStack: stack.length > 0 ? stack : ['Website Dev', 'SEO'],
        needsFreelanceWebDev: true,
        verificationNote: `Live Jobicy ${category} role (${industry}).`,
        fetchMethod: 'Direct Public API',
      });
    }

    return { leads, status: 'ok' };
  } catch (err) {
    return {
      leads: [],
      status: 'error',
      message: err instanceof Error ? err.message : 'Jobicy API unavailable',
    };
  }
}

interface ArbeitnowJob {
  slug?: string;
  company_name?: string;
  title?: string;
  description?: string;
  tags?: string[];
  job_types?: string[];
  url?: string;
  created_at?: number;
}

async function fetchArbeitnowLeads(
  query: string,
  industryFilter: string
): Promise<{ leads: SocialLead[]; status: 'ok' | 'error'; message?: string }> {
  const url = 'https://www.arbeitnow.com/api/job-board-api';
  const leads: SocialLead[] = [];
  const sixtyDaysAgo = Date.now() - 60 * 24 * 60 * 60 * 1000;
  const qLower = query.trim().toLowerCase();

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'HK-Surya-LeadScanner/1.0',
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error(`Arbeitnow HTTP ${res.status}`);
    const data = (await res.json()) as { data?: ArbeitnowJob[] };
    const jobs = data.data ?? [];

    for (const job of jobs) {
      if (!job?.title || !job?.url) continue;
      const ts =
        typeof job.created_at === 'number' && job.created_at > 1000000000
          ? job.created_at * 1000
          : Date.now();
      if (ts < sixtyDaysAgo) continue;

      const cleanDesc = stripHtml(job.description ?? '');
      const titleAndTags = `${job.title} ${(job.tags ?? []).join(' ')}`;
      const combined = `${titleAndTags} ${cleanDesc}`;
      if (qLower && !combined.toLowerCase().includes(qLower)) continue;

      const category = classifyWebSeoCategory(titleAndTags, cleanDesc);
      if (!category) continue;

      const industry = classifyIndustry(`${job.company_name ?? ''} ${combined}`);
      if (!matchesIndustryFilter(industry, combined, industryFilter)) continue;

      const safeUrl = sanitizeSafeExternalUrl(job.url);
      if (!safeUrl) continue;

      const contact = extractContactInfo(job.description ?? '');
      const stack = extractTechStack(combined);

      leads.push({
        id: `arbeitnow-${job.slug || Buffer.from(safeUrl).toString('base64url').slice(0, 10)}`,
        title: job.title,
        author: job.company_name || 'Arbeitnow Client',
        authorProfileUrl: contact.websiteUrl || safeUrl,
        platform: 'Arbeitnow',
        sourceChannel: `arbeitnow.com · ${(job.job_types ?? ['remote']).join(', ')}`,
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
        budget: extractBudget(cleanDesc),
        techStack: stack.length > 0 ? stack : ['Website Dev', 'SEO'],
        needsFreelanceWebDev: true,
        verificationNote: `Live Arbeitnow ${category} role (${industry}).`,
        fetchMethod: 'Direct Public API',
      });
    }

    return { leads, status: 'ok' };
  } catch (err) {
    return {
      leads: [],
      status: 'error',
      message: err instanceof Error ? err.message : 'Arbeitnow API unavailable',
    };
  }
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
    'https://remotive.com/api/remote-jobs?search=seo&limit=30',
    'https://remotive.com/api/remote-jobs?search=wordpress&limit=25',
    'https://remotive.com/api/remote-jobs?category=marketing&limit=30',
  ];

  const leads: SocialLead[] = [];
  let hadSuccess = false;
  let lastError = '';
  const sixtyDaysAgo = Date.now() - 60 * 24 * 60 * 60 * 1000;
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
        if (!Number.isFinite(ts) || ts < sixtyDaysAgo) continue;

        const cleanDesc = stripHtml(job.description ?? '');
        const titleAndTags = `${job.title} ${(job.tags ?? []).join(' ')}`;
        const combined = `${titleAndTags} ${cleanDesc}`;
        if (qLower && !combined.toLowerCase().includes(qLower)) continue;

        const category = classifyWebSeoCategory(titleAndTags, cleanDesc);
        if (!category) continue;

        const industry = classifyIndustry(`${job.company_name} ${combined}`);
        if (!matchesIndustryFilter(industry, combined, industryFilter)) continue;

        const safeUrl = sanitizeSafeExternalUrl(job.url);
        if (!safeUrl) continue;

        const contact = extractContactInfo(job.description ?? '');
        const stack = extractTechStack(combined);
        const isContractOrFreelance =
          /freelance|contract/i.test(job.job_type) ||
          /\b(freelance|contractor|part-time|project-based)\b/i.test(combined);

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
          techStack: stack.length > 0 ? stack : ['Website Dev', 'SEO'],
          needsFreelanceWebDev: isContractOrFreelance || category === 'Website Dev + SEO',
          verificationNote: `Live Remotive ${job.job_type.replace('_', ' ')} ${category} listing (${industry}).`,
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
    'https://mastodon.social/api/v1/timelines/tag/seo?limit=25',
    'https://mastodon.social/api/v1/timelines/tag/webdev?limit=25',
    'https://mastodon.social/api/v1/timelines/tag/wordpress?limit=20',
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
        if (!cleanBody || !isWebSeoHiringIntent(cleanBody.slice(0, 100), cleanBody)) {
          continue;
        }
        if (qLower && !cleanBody.toLowerCase().includes(qLower)) continue;

        const category = classifyWebSeoCategory(cleanBody, cleanBody);
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
          verificationNote: `Live Mastodon post seeking ${category} (${industry}).`,
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
    'https://dev.to/api/articles?tag=seo&per_page=25',
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
        if (!isWebSeoHiringIntent(art.title, art.description ?? '')) continue;

        const category = classifyWebSeoCategory(`${art.title} ${tags}`, art.description ?? '');
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
    ? `${query.trim()} website OR wordpress OR SEO`
    : 'website OR wordpress OR shopify OR webflow OR SEO';
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
        if (!isWebSeoHiringIntent(post.title, body)) continue;

        const category = classifyWebSeoCategory(post.title, body);
        if (!category) continue;

        const combined = `${post.title}\n${body}`;
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
  const sixtyDaysAgo = Math.floor((Date.now() - 60 * 24 * 60 * 60 * 1000) / 1000);

  try {
    // 1. Find latest "Seeking freelancer" story threads & direct comment matches
    const storyRes = await fetch(
      'https://hn.algolia.com/api/v1/search_by_date?query=%22Seeking%20freelancer%22&tags=story&hitsPerPage=2',
      { signal: AbortSignal.timeout(6500) }
    );
    const storyHits = storyRes.ok ? ((await storyRes.json()) as { hits?: HNHit[] }).hits ?? [] : [];
    const storyUrls = storyHits.map(
      (s) => `https://hn.algolia.com/api/v1/search_by_date?tags=comment,story_${encodeURIComponent(s.objectID)}&hitsPerPage=60`
    );

    const searchQ = query.trim() ? `${query.trim()} seo website` : 'website seo';
    const commentUrls = [
      ...storyUrls,
      `https://hn.algolia.com/api/v1/search_by_date?query=${encodeURIComponent(searchQ)}&tags=comment&numericFilters=created_at_i>${sixtyDaysAgo}&hitsPerPage=40`,
    ];

    const results = await Promise.allSettled(
      commentUrls.map(async (u) => {
        const res = await fetch(u, { signal: AbortSignal.timeout(7000) });
        if (!res.ok) throw new Error(`HN HTTP ${res.status}`);
        return res.json() as Promise<{ hits?: HNHit[] }>;
      })
    );

    const leads: SocialLead[] = [];
    let hadSuccess = false;
    const qLower = query.trim().toLowerCase();

    for (const res of results) {
      if (res.status !== 'fulfilled') continue;
      hadSuccess = true;
      const hits = res.value.hits ?? [];
      for (const hit of hits) {
        const rawTitle = hit.title || hit.story_title || 'Hacker News Freelance Inquiry';
        const rawHtml = hit.comment_text || hit.story_text || '';
        const rawBody = stripHtml(rawHtml);
        if (!rawBody) continue;
        const combined = `${rawTitle} ${rawBody}`;
        if (qLower && !combined.toLowerCase().includes(qLower)) continue;

        const isJobSeekerThread = /who wants to be hired/i.test(rawTitle);
        const isSeekingWork =
          isJobSeekerThread ||
          /\b(seeking work|for hire|available for freelance|looking for a job|my resume|hire me|willing to relocate|years of experience)\b/i.test(
            rawBody
          ) ||
          /^location:\s.*willing to/i.test(rawBody);

        if (isSeekingWork) continue;

        const hasSeekingClientSignal =
          /\bseeking freelancer\b/i.test(rawBody) ||
          /\b(hiring|looking for a|need a|we need|looking to hire|contractor|freelancer)\b/i.test(
            rawBody
          );
        if (!hasSeekingClientSignal) continue;

        const category = classifyWebSeoCategory(rawBody.slice(0, 260), rawBody);
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
          title: `${category} — ${rawBody.slice(0, 76).trim()}${rawBody.length > 76 ? '…' : ''}`,
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
          verificationNote: `Hacker News client inquiry for ${category} (${industry}).`,
          fetchMethod: 'Direct Public API',
        });
      }
    }

    return {
      leads,
      status: hadSuccess ? 'ok' : 'error',
      message: hadSuccess ? undefined : 'Hacker News API unavailable',
    };
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
  if (lower.includes('himalayas.app')) return 'Himalayas';
  if (lower.includes('remoteok.com')) return 'RemoteOK';
  if (lower.includes('jobicy.com')) return 'Jobicy';
  if (lower.includes('arbeitnow.')) return 'Arbeitnow';
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
    serviceFilter === 'SEO'
      ? 'SEO specialist OR Technical SEO'
      : serviceFilter === 'Website Development'
        ? 'Website Developer OR WordPress OR Shopify OR Webflow developer'
        : 'Website Developer WITH SEO OR Web Developer + Technical SEO';

  const industryClause =
    industryFilter && industryFilter !== 'All Industries'
      ? `in the "${industryFilter}" industry (${getIndustrySearchTerms(industryFilter)})`
      : 'across any business industry';

  const topic = query.trim() ? `${query.trim()} ${serviceTopic}` : serviceTopic;
  const prompt = `Search across social media platforms (${platformSiteClause}) for the most RECENT real posts where a client or business ${industryClause} is actively hiring a Website Developer with SEO expertise (topic: "${topic}").
Exclude self-promotion posts ("for hire", "hire me") and exclude unrelated non-website roles.
Extract ONLY real contact details (explicit phone number / WhatsApp, email, company website) and links explicitly visible in your Google Search results (never guess or fabricate a phone number, email, or URL). Sort newest first.

Return strictly a JSON array (no markdown fences) of up to 8 items:
[
  {
    "title": "Short clear project title",
    "author": "Author name or @handle",
    "authorProfileUrl": "Exact profile URL if found in search results, else empty string",
    "platform": "X (Twitter) | LinkedIn | Indie Hackers | Threads | Reddit | Facebook | Web Community",
    "sourceChannel": "Domain or community name",
    "serviceCategory": "Website Dev + SEO | Website Development | SEO",
    "industry": "Industry name",
    "url": "Exact post URL from search results",
    "contactEmail": "Exact email if explicitly stated in post, else empty string",
    "contactPhone": "Exact phone or WhatsApp number if explicitly stated, else empty string",
    "websiteUrl": "Company/client website URL if stated, else empty string",
    "socialLinks": ["Additional real social URLs mentioned in post"],
    "summary": "2-sentence factual summary of the website & SEO scope",
    "postedDateText": "ISO date YYYY-MM-DD found on page",
    "budget": "Exact budget/rate if stated, else Not specified",
    "techStack": ["WordPress", "Technical SEO"],
    "needsFreelanceWebDev": true,
    "verificationNote": "Brief note confirming website development + SEO hiring need"
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
      const category = classifyWebSeoCategory(
        title,
        summary,
        typeof item.serviceCategory === 'string' ? item.serviceCategory : ''
      );
      if (!category) return;

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
      const rawEmail =
        typeof item.contactEmail === 'string' ? item.contactEmail.trim() : '';
      const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawEmail) ? rawEmail : '';

      const websiteUrl =
        (typeof item.websiteUrl === 'string' && sanitizeSafeExternalUrl(item.websiteUrl)) ||
        (validEmail ? deriveCompanyWebsiteFromEmail(validEmail) : '');

      const rawSocials = Array.isArray(item.socialLinks)
        ? item.socialLinks
            .filter((s): s is string => typeof s === 'string')
            .map((s) => sanitizeSafeExternalUrl(s))
            .filter((s): s is string => Boolean(s))
        : [];
      const socialLinks = Array.from(new Set([safeUrl, ...rawSocials])).slice(0, 6);

      const rawPhone =
        typeof item.contactPhone === 'string' ? normalizePhoneCandidate(item.contactPhone) : '';

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
        contactPhone: rawPhone,
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
  serviceFilter = 'Website Dev + SEO',
  industryFilter = 'All Industries'
): Promise<SocialScanResponse> {
  const normalizedPlatform = platformFilter || 'All Platforms';
  const normalizedService = serviceFilter || 'Website Dev + SEO';
  const normalizedIndustry = industryFilter || 'All Industries';

  const shouldFetchHimalayas =
    normalizedPlatform === 'All Platforms' || normalizedPlatform === 'Himalayas';
  const shouldFetchRemoteOk =
    normalizedPlatform === 'All Platforms' || normalizedPlatform === 'RemoteOK';
  const shouldFetchJobicy =
    normalizedPlatform === 'All Platforms' || normalizedPlatform === 'Jobicy';
  const shouldFetchArbeitnow =
    normalizedPlatform === 'All Platforms' || normalizedPlatform === 'Arbeitnow';
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

  const emptyOk = Promise.resolve({
    leads: [] as SocialLead[],
    status: 'ok' as const,
    message: undefined as string | undefined,
  });

  const [
    himalayasRes,
    remoteOkRes,
    jobicyRes,
    arbeitnowRes,
    remotiveRes,
    devToRes,
    mastodonRes,
    redditRes,
    hnRes,
    groundedRes,
  ] = await Promise.all([
    shouldFetchHimalayas ? fetchHimalayasLeads(query, normalizedIndustry) : emptyOk,
    shouldFetchRemoteOk ? fetchRemoteOkLeads(query, normalizedIndustry) : emptyOk,
    shouldFetchJobicy ? fetchJobicyLeads(query, normalizedIndustry) : emptyOk,
    shouldFetchArbeitnow ? fetchArbeitnowLeads(query, normalizedIndustry) : emptyOk,
    shouldFetchRemotive ? fetchRemotiveLeads(query, normalizedIndustry) : emptyOk,
    shouldFetchDevTo ? fetchDevToLeads(query, normalizedIndustry) : emptyOk,
    shouldFetchMastodon ? fetchMastodonLeads(query, normalizedIndustry) : emptyOk,
    shouldFetchReddit ? fetchRedditLeads(query, normalizedIndustry) : emptyOk,
    shouldFetchHN ? fetchHackerNewsLeads(query, normalizedIndustry) : emptyOk,
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
  const seenTitleCompany = new Set<string>();
  const combined: SocialLead[] = [];

  for (const lead of [
    ...himalayasRes.leads,
    ...remoteOkRes.leads,
    ...jobicyRes.leads,
    ...arbeitnowRes.leads,
    ...mastodonRes.leads,
    ...hnRes.leads,
    ...devToRes.leads,
    ...redditRes.leads,
    ...remotiveRes.leads,
    ...groundedRes.leads,
  ]) {
    if (seenUrls.has(lead.url)) continue;
    const dedupKey = `${lead.title.toLowerCase().replace(/[^a-z0-9]/g, '')}|${lead.author
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')}`;
    if (seenTitleCompany.has(dedupKey)) continue;

    if (normalizedPlatform !== 'All Platforms' && lead.platform !== normalizedPlatform) {
      continue;
    }
    if (!matchesServiceScopeFilter(lead, normalizedService)) {
      continue;
    }
    if (normalizedIndustry !== 'All Industries' && lead.industry !== normalizedIndustry) {
      continue;
    }

    seenUrls.add(lead.url);
    seenTitleCompany.add(dedupKey);
    combined.push(lead);
  }

  combined.sort((a, b) => b.postedTimestamp - a.postedTimestamp);

  // Enrich top leads with real tel:/WhatsApp/mailto extracted safely from linked websites
  const enriched = await enrichLeadsWithPageContacts(combined);

  // Rank leads that have a direct phone or email slightly higher within similar recency
  enriched.sort((a, b) => {
    const dayBucketA = Math.floor(a.postedTimestamp / (24 * 3600_000));
    const dayBucketB = Math.floor(b.postedTimestamp / (24 * 3600_000));
    if (dayBucketB !== dayBucketA) return b.postedTimestamp - a.postedTimestamp;
    const contactScoreA = (a.contactPhone ? 2 : 0) + (a.contactEmail ? 1 : 0);
    const contactScoreB = (b.contactPhone ? 2 : 0) + (b.contactEmail ? 1 : 0);
    if (contactScoreB !== contactScoreA) return contactScoreB - contactScoreA;
    return b.postedTimestamp - a.postedTimestamp;
  });

  return {
    leads: enriched,
    meta: {
      scannedAt: new Date().toISOString(),
      query: query.trim() || 'Website Developer + SEO',
      platformFilter: normalizedPlatform,
      serviceFilter: normalizedService,
      industryFilter: normalizedIndustry,
      totalFetched: enriched.length,
      confirmedFreelanceNeeds: enriched.filter((l) => l.needsFreelanceWebDev).length,
      sources: {
        himalayas: {
          count: himalayasRes.leads.length,
          status: himalayasRes.status,
          message: himalayasRes.message,
        },
        remoteOk: {
          count: remoteOkRes.leads.length,
          status: remoteOkRes.status,
          message: remoteOkRes.message,
        },
        jobicy: {
          count: jobicyRes.leads.length,
          status: jobicyRes.status,
          message: jobicyRes.message,
        },
        arbeitnow: {
          count: arbeitnowRes.leads.length,
          status: arbeitnowRes.status,
          message: arbeitnowRes.message,
        },
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
  const isUrl = /^https?:\/\//i.test(trimmed);
  let safeUrl = '';
  let fetchedHtml = '';
  if (isUrl) {
    const validated = sanitizeSafeExternalUrl(trimmed);
    if (!validated) {
      throw new Error(
        'Invalid or restricted URL. Please provide a public https:// social post link.'
      );
    }
    safeUrl = validated;
    const fetched = await safeFetchPublicHtml(safeUrl);
    if (fetched) fetchedHtml = fetched.html;
  }

  const localExtract = extractContactInfo(fetchedHtml || trimmed);

  if (!ai) {
    // Allow deterministic verification even without GEMINI_API_KEY when raw post text or accessible URL is given
    const plain = stripHtml(fetchedHtml || trimmed);
    const titleGuess = plain.slice(0, 90).trim() || 'Website Developer & SEO Inquiry';
    const category = classifyWebSeoCategory(titleGuess, plain) ?? 'Website Dev + SEO';
    const industry = classifyIndustry(plain);
    const matchesWebSeo = hasWebsiteDevSignal(plain) || hasSeoSignal(plain);
    return {
      needsFreelanceWebDev: matchesWebSeo,
      verdictLabel: matchesWebSeo ? `Verified ${category} Need` : 'Low Web + SEO Fit',
      confidenceReason:
        'Analyzed directly from submitted content and extracted contact links (GEMINI_API_KEY not configured).',
      suggestedTitle: titleGuess,
      clientOrAuthor: 'Direct Inquiry',
      authorProfileUrl: safeUrl,
      contactEmail: localExtract.contactEmail,
      contactPhone: localExtract.contactPhone,
      websiteUrl: localExtract.websiteUrl,
      socialLinks: localExtract.socialLinks,
      platformGuess: mapPlatformFromUrl(safeUrl),
      serviceCategory: category,
      industry,
      budgetExtracted: extractBudget(plain),
      techStack: extractTechStack(plain),
      summary: plain.slice(0, 260) + (plain.length > 260 ? '…' : ''),
      recommendedPitch:
        'Share HK Surya Website Development + Technical SEO audit and conversion-ready deliverables.',
      sourceUrl: safeUrl,
    };
  }

  const response = await ai.models.generateContent({
    model: 'gemini-4-hydrogen',
    contents: isUrl
      ? `Inspect this social media post URL (${safeUrl}) and determine accurately whether the author is genuinely looking to hire a Website Developer with SEO expertise (Website Development, Technical SEO, WordPress/Shopify/Webflow/Next.js + SEO). Extract any explicitly listed contact phone/WhatsApp number, contact email, website URL, author profile URL, social media links, and industry.`
      : `Analyze this post text and determine accurately whether the author is genuinely looking to hire a Website Developer with SEO expertise. Extract any explicitly listed contact phone/WhatsApp number, contact email, website URL, social media links, and industry:\n\n"""\n${trimmed.slice(0, 4000)}\n"""`,
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
          contactPhone: { type: Type.STRING },
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
          'contactPhone',
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
    classifyWebSeoCategory(
      `${parsed.suggestedTitle} ${parsed.summary}`,
      parsed.summary,
      parsed.serviceCategory
    ) ?? 'Website Dev + SEO';
  const validIndustry = classifyIndustry(
    `${parsed.suggestedTitle} ${parsed.summary}`,
    parsed.industry
  );

  const normalizedPhone = parsed.contactPhone
    ? normalizePhoneCandidate(parsed.contactPhone) || localExtract.contactPhone
    : localExtract.contactPhone;

  return {
    ...parsed,
    authorProfileUrl: sanitizeSafeExternalUrl(parsed.authorProfileUrl || '') || safeUrl,
    contactEmail: parsed.contactEmail || localExtract.contactEmail,
    contactPhone: normalizedPhone,
    websiteUrl: sanitizeSafeExternalUrl(parsed.websiteUrl || '') || localExtract.websiteUrl,
    socialLinks: (parsed.socialLinks || [])
      .map((u) => sanitizeSafeExternalUrl(u))
      .filter((u): u is string => Boolean(u)),
    serviceCategory: validCategory,
    industry: validIndustry,
    platformGuess: mapPlatformFromUrl(safeUrl, parsed.platformGuess),
    sourceUrl: safeUrl,
  };
}
