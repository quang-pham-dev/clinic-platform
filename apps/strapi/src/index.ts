import { articleSeedData } from './seed/articles';
import { consentFormSeedData } from './seed/consent-forms';
import {
  type DoctorPageSeedDraft,
  doctorPageSeedDrafts,
} from './seed/doctor-pages';
import { faqSeedData } from './seed/faqs';
import type { Core } from '@strapi/strapi';

const DOCTOR_PAGE_UID = 'api::doctor-page.doctor-page';
const ARTICLE_UID = 'api::article.article';
const FAQ_UID = 'api::faq.faq';
const CONSENT_FORM_UID = 'api::consent-form.consent-form';

const DEFAULT_API_URL = 'http://localhost:3000/api/v1';

interface ApiDoctor {
  id: string;
  specialty?: string;
  profile?: {
    fullName?: string;
  };
}

function shouldSeedDoctorPages() {
  return (
    process.env.NODE_ENV !== 'production' &&
    process.env.STRAPI_SEED_DOCTOR_PAGES !== 'false'
  );
}

function shouldSeedContent() {
  return (
    process.env.NODE_ENV !== 'production' &&
    process.env.STRAPI_SEED_CONTENT !== 'false'
  );
}

function getClinicApiBaseUrl() {
  return (process.env.CLINIC_API_URL ?? DEFAULT_API_URL).replace(/\/$/, '');
}

async function fetchApiDoctors(): Promise<ApiDoctor[]> {
  const response = await fetch(`${getClinicApiBaseUrl()}/doctors?limit=100`, {
    headers: {
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Doctors API returned ${response.status}`);
  }

  const payload = (await response.json()) as {
    data?: ApiDoctor[];
  };

  return payload.data ?? [];
}

function matchDoctor(
  doctors: ApiDoctor[],
  draft: DoctorPageSeedDraft,
): ApiDoctor | undefined {
  return doctors.find((doctor) => {
    const fullName = doctor.profile?.fullName?.trim();
    const specialty = doctor.specialty?.trim();

    return fullName === draft.fullName && specialty === draft.specialty;
  });
}

async function seedDoctorPages(strapi: Core.Strapi) {
  if (!shouldSeedDoctorPages()) {
    return;
  }

  let doctors: ApiDoctor[] = [];

  try {
    doctors = await fetchApiDoctors();
  } catch (error) {
    strapi.log.warn(
      `[doctor-page seed] Skipped because clinic API is unavailable: ${error instanceof Error ? error.message : 'unknown error'}`,
    );
    return;
  }

  for (const draft of doctorPageSeedDrafts) {
    const doctor = matchDoctor(doctors, draft);

    if (!doctor) {
      strapi.log.warn(
        `[doctor-page seed] No API doctor matched ${draft.fullName} (${draft.specialty}), skipping.`,
      );
      continue;
    }

    const existing = await strapi.db.query(DOCTOR_PAGE_UID).findOne({
      where: { doctorId: doctor.id },
    });

    if (existing) {
      continue;
    }

    await strapi.db.query(DOCTOR_PAGE_UID).create({
      data: {
        doctorId: doctor.id,
        displayName: draft.displayName,
        specialtyLabel: draft.specialtyLabel,
        shortBio: draft.shortBio,
        longBio: draft.longBio,
        languages: draft.languages,
        publishedAt: new Date(),
      },
    });

    strapi.log.info(
      `[doctor-page seed] Created CMS profile for ${draft.fullName}.`,
    );
  }
}

// ---------------------------------------------------------------------------
// Content seeding: Articles, FAQs, Consent Forms
// ---------------------------------------------------------------------------

async function seedArticles(strapi: Core.Strapi) {
  if (!shouldSeedContent()) return;

  const count = await strapi.db.query(ARTICLE_UID).count();
  if (count > 0) return;

  for (const article of articleSeedData) {
    await strapi.db.query(ARTICLE_UID).create({
      data: {
        ...article,
        publishedAt: new Date(),
      },
    });
    strapi.log.info(`[article seed] Created "${article.title}".`);
  }
}

async function seedFaqs(strapi: Core.Strapi) {
  if (!shouldSeedContent()) return;

  const count = await strapi.db.query(FAQ_UID).count();
  if (count > 0) return;

  for (const faq of faqSeedData) {
    await strapi.db.query(FAQ_UID).create({
      data: {
        ...faq,
        publishedAt: new Date(),
      },
    });
    strapi.log.info(`[faq seed] Created "${faq.question}".`);
  }
}

async function seedConsentForms(strapi: Core.Strapi) {
  if (!shouldSeedContent()) return;

  const count = await strapi.db.query(CONSENT_FORM_UID).count();
  if (count > 0) return;

  for (const form of consentFormSeedData) {
    await strapi.db.query(CONSENT_FORM_UID).create({
      data: {
        ...form,
        publishedAt: new Date(),
      },
    });
    strapi.log.info(
      `[consent-form seed] Created "${form.title}" v${form.version}.`,
    );
  }
}

// ---------------------------------------------------------------------------
// Public permissions bootstrap
// ---------------------------------------------------------------------------

const PUBLIC_CONTENT_TYPES = [
  'api::doctor-page.doctor-page',
  'api::article.article',
  'api::faq.faq',
  'api::consent-form.consent-form',
];

async function grantPublicReadAccess(strapi: Core.Strapi) {
  const pluginStore = strapi.store({
    type: 'plugin',
    name: 'users-permissions',
  });

  const grantedKey = 'p4-public-read-granted';

  const alreadyGranted = await pluginStore.get({ key: grantedKey });
  if (alreadyGranted) return;

  try {
    const publicRole = await strapi.db
      .query('plugin::users-permissions.role')
      .findOne({ where: { type: 'public' } });

    if (!publicRole) {
      strapi.log.warn(
        '[permissions] Public role not found, skipping permission setup.',
      );
      return;
    }

    const actions = ['find', 'findOne'];

    for (const contentType of PUBLIC_CONTENT_TYPES) {
      for (const action of actions) {
        const existing = await strapi.db
          .query('plugin::users-permissions.permission')
          .findOne({
            where: {
              role: publicRole.id,
              action: `${contentType}.${action}`,
            },
          });

        if (!existing) {
          await strapi.db.query('plugin::users-permissions.permission').create({
            data: {
              role: publicRole.id,
              action: `${contentType}.${action}`,
              enabled: true,
            },
          });

          const shortName = contentType.split('.').pop();
          strapi.log.info(
            `[permissions] Granted public ${action} on ${shortName}.`,
          );
        }
      }
    }

    await pluginStore.set({ key: grantedKey, value: true });
  } catch (error) {
    strapi.log.warn(
      `[permissions] Failed to set public permissions: ${error instanceof Error ? error.message : 'unknown error'}`,
    );
  }
}

// ---------------------------------------------------------------------------
// Strapi bootstrap entry point
// ---------------------------------------------------------------------------

export default {
  register() {},
  async bootstrap({ strapi }: { strapi: Core.Strapi }) {
    await grantPublicReadAccess(strapi);
    await seedDoctorPages(strapi);
    await seedArticles(strapi);
    await seedFaqs(strapi);
    await seedConsentForms(strapi);
  },
};
