export interface ScheduleShift {
  id: string;
  status: string;
  template: {
    name: string;
    startTime: string;
    endTime: string;
    colorHex: string;
  };
}

export interface ScheduleSlot {
  id: string;
  startTime: string;
  endTime: string;
  isAvailable: boolean;
}

export interface DoctorScheduleDay {
  date: string;
  shifts: ScheduleShift[];
  slots: ScheduleSlot[];
}

export interface ScheduleQueryParams {
  from: string;
  to: string;
}
