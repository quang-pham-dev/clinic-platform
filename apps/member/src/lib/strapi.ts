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
