/**
 * DoctorPage lifecycle hooks.
 * On publish/update, notify NestJS so member doctor pages are revalidated.
 */
import { notifyNestJs } from '../../../../helpers/notify-nestjs';

export default {
  async afterCreate(event) {
    const { result } = event;
    if (result.publishedAt) {
      await notifyNestJs('doctor-page', result.id, 'publish', {
        doctorId: result.doctorId,
      });
    }
  },

  async afterUpdate(event) {
    const { result } = event;
    if (result.publishedAt) {
      await notifyNestJs('doctor-page', result.id, 'update', {
        doctorId: result.doctorId,
      });
    }
  },
};
