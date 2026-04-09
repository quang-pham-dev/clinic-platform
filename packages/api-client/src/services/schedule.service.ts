import type { HttpClient } from '../core/client';
import type {
  DoctorScheduleDay,
  ScheduleQueryParams,
} from '../modules/schedule';

export interface ScheduleService {
  getDoctorSchedule(
    doctorId: string,
    params: ScheduleQueryParams,
  ): Promise<DoctorScheduleDay[]>;
}

export function createScheduleService(http: HttpClient): ScheduleService {
  return {
    getDoctorSchedule: (doctorId, params) =>
      http.get(`/schedule/doctor/${doctorId}`, { params }),
  };
}
