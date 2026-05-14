import 'server-only';

const DEFAULT_STRAPI_URL = 'http://localhost:1337';

type StrapiMediaFormat = {
  url?: string;
};

type StrapiMedia = {
  url?: string;
  formats?: Record<string, StrapiMediaFormat>;
};

type StrapiRelation<T> = {
  data?: T | T[] | null;
};

type RawStrapiDoctorPage = {
  id?: number | string;
  documentId?: string;
  doctorId?: string;
  displayName?: string;
  specialtyLabel?: string | null;
  shortBio?: string | null;
  longBio?: string | null;
  languages?: unknown;
  photo?: StrapiRelation<StrapiMedia> | StrapiMedia | null;
  attributes?: RawStrapiDoctorPage;
};

export interface CmsDoctorPage {
  id: string;
  doctorId: string;
  displayName: string;
  specialtyLabel?: string;
  shortBio?: string;
  longBio?: string;
  languages: string[];
  photoUrl?: string;
}

function getStrapiBaseUrl() {
  return (process.env.STRAPI_URL ?? DEFAULT_STRAPI_URL).replace(/\/$/, '');
}

function toArray(value: unknown): string[] {
  if (!value) return [];

  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === 'string');
  }

  if (typeof value === 'string') {
    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

function resolvePhotoUrl(
  photo: RawStrapiDoctorPage['photo'],
  baseUrl: string,
): string | undefined {
  const mediaRelation = photo as StrapiRelation<StrapiMedia> | null | undefined;
  const media =
    mediaRelation?.data ?? (photo as StrapiMedia | null | undefined) ?? null;

  if (!media || Array.isArray(media)) return undefined;

  const mediaUrl =
    media.formats?.medium?.url ?? media.formats?.small?.url ?? media.url;
  if (!mediaUrl) return undefined;

  return mediaUrl.startsWith('http') ? mediaUrl : `${baseUrl}${mediaUrl}`;
}

function normalizeDoctorPage(
  entry: RawStrapiDoctorPage,
  baseUrl: string,
): CmsDoctorPage | null {
  const raw = entry.attributes ?? entry;
  const doctorId = raw.doctorId?.trim();
  const displayName = raw.displayName?.trim();

  if (!doctorId || !displayName) {
    return null;
  }

  return {
    id: String(entry.documentId ?? entry.id ?? doctorId),
    doctorId,
    displayName,
    specialtyLabel: raw.specialtyLabel?.trim() || undefined,
    shortBio: raw.shortBio?.trim() || undefined,
    longBio: raw.longBio?.trim() || undefined,
    languages: toArray(raw.languages),
    photoUrl: resolvePhotoUrl(raw.photo, baseUrl),
  };
}

async function fetchDoctorPages(path: string) {
  const baseUrl = getStrapiBaseUrl();

  try {
    const response = await fetch(`${baseUrl}${path}`, {
      headers: {
        Accept: 'application/json',
      },
      next: {
        revalidate: 60,
      },
    });

    if (!response.ok) {
      return [] as CmsDoctorPage[];
    }

    const payload = (await response.json()) as {
      data?: RawStrapiDoctorPage[] | RawStrapiDoctorPage | null;
    };

    const entries = Array.isArray(payload.data)
      ? payload.data
      : payload.data
        ? [payload.data]
        : [];

    return entries
      .map((entry) => normalizeDoctorPage(entry, baseUrl))
      .filter((entry): entry is CmsDoctorPage => entry !== null);
  } catch {
    return [] as CmsDoctorPage[];
  }
}

export async function getDoctorPages() {
  return fetchDoctorPages(
    '/api/doctor-pages?populate=photo&pagination[pageSize]=100',
  );
}

export async function getDoctorPageByDoctorId(doctorId: string) {
  const pages = await fetchDoctorPages(
    `/api/doctor-pages?filters[doctorId][$eq]=${encodeURIComponent(doctorId)}&populate=photo&pagination[pageSize]=1`,
  );

  return pages[0] ?? null;
}

// ---------------------------------------------------------------------------
// Articles
// ---------------------------------------------------------------------------

export interface CmsArticle {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  body: unknown;
  coverImageUrl?: string;
  authorName?: string;
  category?: string;
  readingTime?: number;
  featured?: boolean;
  publishedAt?: string;
}

function normalizeArticle(
  entry: Record<string, unknown>,
  baseUrl: string,
): CmsArticle | null {
  const raw = (entry.attributes as Record<string, unknown>) ?? entry;
  const title = raw.title as string | undefined;
  const slug = raw.slug as string | undefined;
  if (!title || !slug) return null;

  const coverImage = raw.cover_image as
    | StrapiRelation<StrapiMedia>
    | StrapiMedia
    | null
    | undefined;
  const coverImageUrl = resolvePhotoUrl(coverImage, baseUrl);

  const author = raw.author as Record<string, unknown> | null | undefined;
  const authorData = (author?.data as Record<string, unknown>) ?? author;
  const authorAttrs =
    (authorData?.attributes as Record<string, unknown>) ?? authorData;
  const authorName = authorAttrs?.displayName as string | undefined;

  return {
    id: String(entry.documentId ?? entry.id ?? slug),
    title,
    slug,
    excerpt: (raw.excerpt as string) ?? '',
    body: raw.body ?? null,
    coverImageUrl,
    authorName,
    category: raw.category as string | undefined,
    readingTime: raw.reading_time as number | undefined,
    featured: raw.featured as boolean | undefined,
    publishedAt: raw.publishedAt as string | undefined,
  };
}

export async function getArticles(
  category?: string,
  page = 1,
  pageSize = 12,
): Promise<{ articles: CmsArticle[]; total: number }> {
  const baseUrl = getStrapiBaseUrl();
  const params = new URLSearchParams({
    'populate[author][populate]': 'photo',
    'populate[0]': 'cover_image',
    sort: 'publishedAt:desc',
    'pagination[page]': String(page),
    'pagination[pageSize]': String(pageSize),
  });

  if (category) {
    params.set('filters[category][$eq]', category);
  }

  try {
    const response = await fetch(`${baseUrl}/api/articles?${params}`, {
      headers: { Accept: 'application/json' },
      next: { tags: ['article-listing'] },
    });

    if (!response.ok) return { articles: [], total: 0 };

    const payload = (await response.json()) as {
      data?: Record<string, unknown>[];
      meta?: { pagination?: { total?: number } };
    };

    const entries = payload.data ?? [];
    const articles = entries
      .map((e) => normalizeArticle(e, baseUrl))
      .filter((a): a is CmsArticle => a !== null);

    return {
      articles,
      total: payload.meta?.pagination?.total ?? articles.length,
    };
  } catch {
    return { articles: [], total: 0 };
  }
}

export async function getArticleBySlug(
  slug: string,
): Promise<CmsArticle | null> {
  const baseUrl = getStrapiBaseUrl();
  const params = new URLSearchParams({
    'filters[slug][$eq]': slug,
    populate: '*',
  });

  try {
    const response = await fetch(`${baseUrl}/api/articles?${params}`, {
      headers: { Accept: 'application/json' },
      next: { tags: [`article-${slug}`] },
    });

    if (!response.ok) return null;

    const payload = (await response.json()) as {
      data?: Record<string, unknown>[];
    };

    const entry = payload.data?.[0];
    if (!entry) return null;

    return normalizeArticle(entry, baseUrl);
  } catch {
    return null;
  }
}

export async function getAllArticleSlugs(): Promise<string[]> {
  const baseUrl = getStrapiBaseUrl();

  try {
    const response = await fetch(
      `${baseUrl}/api/articles?fields[0]=slug&pagination[pageSize]=100`,
      {
        headers: { Accept: 'application/json' },
        next: { revalidate: 3600 },
      },
    );

    if (!response.ok) return [];

    const payload = (await response.json()) as {
      data?: Array<{ slug?: string; attributes?: { slug?: string } }>;
    };

    return (payload.data ?? [])
      .map((e) => e.attributes?.slug ?? e.slug)
      .filter((s): s is string => !!s);
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// FAQs
// ---------------------------------------------------------------------------

export interface CmsFaq {
  id: string;
  question: string;
  answer: string;
  category: string;
  order: number;
}

export async function getFaqs(): Promise<CmsFaq[]> {
  const baseUrl = getStrapiBaseUrl();

  try {
    const response = await fetch(
      `${baseUrl}/api/faqs?filters[is_active][$eq]=true&sort[0]=category:asc&sort[1]=order:asc&pagination[pageSize]=100`,
      {
        headers: { Accept: 'application/json' },
        next: { revalidate: 86400 },
      },
    );

    if (!response.ok) return [];

    const payload = (await response.json()) as {
      data?: Record<string, unknown>[];
    };

    return (payload.data ?? []).map((entry) => {
      const raw = (entry.attributes as Record<string, unknown>) ?? entry;
      return {
        id: String(entry.documentId ?? entry.id ?? ''),
        question: (raw.question as string) ?? '',
        answer: (raw.answer as string) ?? '',
        category: (raw.category as string) ?? 'general',
        order: (raw.order as number) ?? 0,
      };
    });
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Consent Forms
// ---------------------------------------------------------------------------

export interface CmsConsentForm {
  id: string;
  title: string;
  version: string;
  formType: string;
  content: unknown;
  effectiveDate: string;
  isCurrent: boolean;
  changeSummary?: string;
}

export async function getCurrentConsentForm(
  formType: string,
): Promise<CmsConsentForm | null> {
  const baseUrl = getStrapiBaseUrl();
  const params = new URLSearchParams({
    'filters[form_type][$eq]': formType,
    'filters[is_current][$eq]': 'true',
    populate: '*',
  });

  try {
    const response = await fetch(`${baseUrl}/api/consent-forms?${params}`, {
      headers: { Accept: 'application/json' },
      next: { tags: [`consent-${formType}`] },
    });

    if (!response.ok) return null;

    const payload = (await response.json()) as {
      data?: Record<string, unknown>[];
    };

    const entry = payload.data?.[0];
    if (!entry) return null;

    const raw = (entry.attributes as Record<string, unknown>) ?? entry;

    return {
      id: String(entry.documentId ?? entry.id ?? ''),
      title: (raw.title as string) ?? '',
      version: (raw.version as string) ?? '',
      formType: (raw.form_type as string) ?? formType,
      content: raw.content ?? null,
      effectiveDate: (raw.effective_date as string) ?? '',
      isCurrent: (raw.is_current as boolean) ?? false,
      changeSummary: raw.change_summary as string | undefined,
    };
  } catch {
    return null;
  }
}
