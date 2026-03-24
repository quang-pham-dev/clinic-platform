export interface TimeSlot {
  id: string;
  doctorId: string;
  slotDate: string;
  startTime: string;
  endTime: string;
  isAvailable: boolean;
  createdAt: string;
}

export interface CreateSlotRequest {
  slotDate: string;
  startTime: string;
  endTime: string;
}

export interface CreateSlotBulkRequest {
  slots: CreateSlotRequest[];
}

export interface SlotQueryParams {
  date?: string;
  from?: string;
  to?: string;
  isAvailable?: boolean;
  page?: number;
  limit?: number;
}
