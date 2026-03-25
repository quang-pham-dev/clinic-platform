import { AppointmentStatus } from '@clinic-platform/types';

export interface CreateBookingRequest {
  slotId: string;
  notes?: string;
}

export interface UpdateBookingStatusRequest {
  status: AppointmentStatus;
  reason?: string;
}

export interface BookingSlot {
  id: string;
  slotDate: string;
  startTime: string;
  endTime: string;
}

export interface Booking {
  id: string;
  status: AppointmentStatus;
  notes?: string;
  slot: BookingSlot;
  doctor: {
    id: string;
    specialty: string;
    profile: {
      fullName: string;
    };
  };
  patient: {
    id: string;
    profile: {
      fullName: string;
    };
  };
  createdAt: string;
  updatedAt: string;
}

export interface BookingQueryParams {
  page?: number;
  limit?: number;
  status?: AppointmentStatus;
  doctorId?: string;
  patientId?: string;
  fromDate?: string;
  toDate?: string;
}
