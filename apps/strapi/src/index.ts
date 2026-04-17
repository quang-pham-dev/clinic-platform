import {
  type DoctorPageSeedDraft,
  doctorPageSeedDrafts,
} from './seed/doctor-pages';
import type { Core } from '@strapi/strapi';

const DOCTOR_PAGE_UID = 'api::doctor-page.doctor-page';
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

async function grantPublicDoctorPageAccess(strapi: Core.Strapi) {
  const pluginStore = strapi.store({
    type: 'plugin',
    name: 'users-permissions',
  });

  const grantedKey = 'doctor-page-public-granted';

  const alreadyGranted = await pluginStore.get({ key: grantedKey });
  if (alreadyGranted) return;

  try {
    const publicRole = await strapi.db
      .query('plugin::users-permissions.role')
      .findOne({ where: { type: 'public' } });

    if (!publicRole) {
      strapi.log.warn(
        '[permissions] Public role not found, skipping doctor-page permission setup.',
      );
      return;
    }

    const actions = ['find', 'findOne'];

    for (const action of actions) {
      const existing = await strapi.db
        .query('plugin::users-permissions.permission')
        .findOne({
          where: {
            role: publicRole.id,
            action: `api::doctor-page.doctor-page.${action}`,
          },
        });

      if (!existing) {
        await strapi.db
          .query('plugin::users-permissions.permission')
          .create({
            data: {
              role: publicRole.id,
              action: `api::doctor-page.doctor-page.${action}`,
              enabled: true,
            },
          });

        strapi.log.info(
          `[permissions] Granted public ${action} on doctor-page.`,
        );
      }
    }

    await pluginStore.set({ key: grantedKey, value: true });
  } catch (error) {
    strapi.log.warn(
      `[permissions] Failed to set doctor-page permissions: ${error instanceof Error ? error.message : 'unknown error'}`,
    );
  }
}

export default {
  register() {},
  async bootstrap({ strapi }: { strapi: Core.Strapi }) {
    await grantPublicDoctorPageAccess(strapi);
    await seedDoctorPages(strapi);
  },
};
