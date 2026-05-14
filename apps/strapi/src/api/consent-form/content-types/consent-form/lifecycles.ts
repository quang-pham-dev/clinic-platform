/**
 * ConsentForm lifecycle hooks.
 *
 * beforeUpdate: When is_current is set to true, automatically set is_current=false
 * on other entries of the same form_type (only one current version per type).
 *
 * afterUpdate: When a current consent form is published, notify NestJS
 * to update the consent version cache and trigger ISR revalidation.
 */
import { notifyNestJs } from '../../../../helpers/notify-nestjs';

export default {
  async beforeUpdate(event) {
    const { data, where } = event.params;

    if (data.is_current === true) {
      // Need to get the form_type from the entry being updated
      const entry = await strapi
        .documents('api::consent-form.consent-form')
        .findOne({
          documentId: where.documentId || where.id,
          fields: ['form_type'],
        });

      if (entry?.form_type) {
        // Find all current forms of the same type
        const currentForms = await strapi
          .documents('api::consent-form.consent-form')
          .findMany({
            filters: {
              form_type: entry.form_type,
              is_current: true,
            },
          });

        // Set is_current = false for all except the one being updated
        for (const form of currentForms) {
          const formId = form.documentId;
          const targetId = where.documentId;
          if (formId && formId !== targetId) {
            await strapi.documents('api::consent-form.consent-form').update({
              documentId: formId,
              data: { is_current: false } as Record<string, unknown>,
            });
          }
        }
      }
    }
  },

  async afterUpdate(event) {
    const { result } = event;
    if (result.is_current && result.publishedAt) {
      await notifyNestJs('consent-form', result.id, 'publish', {
        form_type: result.form_type,
        version: result.version,
      });
    }
  },
};
