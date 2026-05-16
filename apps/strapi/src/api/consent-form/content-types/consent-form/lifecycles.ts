/**
 * ConsentForm lifecycle hooks.
 *
 * beforeCreate/beforeUpdate: When is_current is set to true, automatically set is_current=false
 * on other entries of the same form_type (only one current version per type).
 *
 * afterCreate/afterUpdate: When a current consent form is published, notify NestJS
 * to update the consent version cache and trigger ISR revalidation.
 */
import { notifyNestJs } from '../../../../helpers/notify-nestjs';

async function demoteCurrentForms(
  formType: string,
  currentDocumentId?: string,
) {
  const currentForms = await strapi
    .documents('api::consent-form.consent-form')
    .findMany({
      filters: {
        form_type: formType,
        is_current: true,
      },
    });

  for (const form of currentForms) {
    if (form.documentId && form.documentId !== currentDocumentId) {
      await strapi.documents('api::consent-form.consent-form').update({
        documentId: form.documentId,
        data: { is_current: false } as Record<string, unknown>,
      });
    }
  }
}

async function notifyCurrentConsent(result) {
  if (result.is_current && result.publishedAt) {
    await notifyNestJs('consent-form', result.id, 'publish', {
      form_type: result.form_type,
      version: result.version,
    });
  }
}

export default {
  async beforeCreate(event) {
    const { data } = event.params;

    if (data.is_current === true && data.form_type) {
      await demoteCurrentForms(data.form_type);
    }
  },

  async beforeUpdate(event) {
    const { data, where } = event.params;

    const entry = await strapi
      .documents('api::consent-form.consent-form')
      .findOne({
        documentId: where.documentId || where.id,
        fields: ['form_type', 'is_current'],
      });

    const formType = data.form_type ?? entry?.form_type;
    const remainsCurrent =
      data.is_current !== false && entry?.is_current === true;
    const shouldDemoteOtherForms =
      data.is_current === true || (data.form_type && remainsCurrent);

    if (formType && shouldDemoteOtherForms) {
      await demoteCurrentForms(formType, where.documentId);
    }
  },

  async afterCreate(event) {
    await notifyCurrentConsent(event.result);
  },

  async afterUpdate(event) {
    await notifyCurrentConsent(event.result);
  },
};
