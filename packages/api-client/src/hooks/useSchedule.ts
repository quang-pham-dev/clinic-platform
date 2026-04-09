import type {
  DoctorScheduleDay,
  ScheduleQueryParams,
} from '../modules/schedule';
import type { ScheduleService } from '../services/schedule.service';
import { type UseQueryOptions, useQuery } from '@tanstack/react-query';

export const scheduleKeys = {
  all: ['schedule'] as const,
  doctor: (doctorId: string, params: ScheduleQueryParams) =>
    [...scheduleKeys.all, 'doctor', doctorId, params] as const,
};

export function createScheduleHooks(service: ScheduleService) {
  return {
    useDoctorSchedule: (
      doctorId: string,
      params: ScheduleQueryParams,
      options?: Omit<
        UseQueryOptions<DoctorScheduleDay[], Error>,
        'queryKey' | 'queryFn'
      >,
    ) => {
      return useQuery({
        queryKey: scheduleKeys.doctor(doctorId, params),
        queryFn: () => service.getDoctorSchedule(doctorId, params),
        enabled: !!doctorId && !!params.from && !!params.to,
        ...options,
      });
    },
  };
}
