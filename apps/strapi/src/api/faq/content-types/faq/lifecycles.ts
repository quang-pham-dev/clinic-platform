/**
 * FAQ lifecycle hooks.
 * Any published FAQ change can affect the FAQ listing page.
 */
import { notifyNestJs } from '../../../../helpers/notify-nestjs';

export default {
  async afterCreate(event) {
    const { result } = event;
    if (result.publishedAt) {
      await notifyNestJs('faq', result.id, 'publish');
    }
  },

  async afterUpdate(event) {
    const { result } = event;
    if (result.publishedAt) {
      await notifyNestJs('faq', result.id, 'update');
    }
  },

  async afterDelete(event) {
    const { result } = event;
    if (result.publishedAt) {
      await notifyNestJs('faq', result.id, 'delete');
    }
  },
};
