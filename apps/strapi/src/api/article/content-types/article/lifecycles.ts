/**
 * Article lifecycle hooks.
 * On publish, notify NestJS to trigger ISR revalidation.
 */
import { notifyNestJs } from '../../../../helpers/notify-nestjs';

export default {
  async afterCreate(event) {
    const { result } = event;
    if (result.publishedAt) {
      await notifyNestJs('article', result.id, 'publish', {
        slug: result.slug,
      });
    }
  },

  async afterUpdate(event) {
    const { result } = event;
    if (result.publishedAt) {
      await notifyNestJs('article', result.id, 'update', {
        slug: result.slug,
      });
    }
  },
};
