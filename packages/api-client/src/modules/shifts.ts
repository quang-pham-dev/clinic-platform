// ── Shift Template types ──

export interface ShiftTemplate {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  colorHex: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateShiftTemplateRequest {
  name: string;
  startTime: string;
  endTime: string;
  colorHex?: string;
}

export interface UpdateShiftTemplateRequest {
  name?: string;
  startTime?: string;
  endTime?: string;
  colorHex?: string;
}

// ── Shift Assignment types ──

export interface ShiftAssignment {
  id: string;
  staffId: string;
  templateId: string;
  departmentId: string;
  shiftDate: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  notes: string | null;
  version: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  template?: ShiftTemplate;
  staff?: {
    id: string;
    email: string;
    profile?: { fullName: string } | null;
  };
  department?: {
    id: string;
    name: string;
  };
  creator?: {
    id: string;
    profile?: { fullName: string } | null;
  };
  auditLogs?: ShiftAuditLogEntry[];
}

export interface ShiftAuditLogEntry {
  id: string;
  assignmentId: string;
  actorId: string;
  actorRole: string;
  fromStatus: string | null;
  toStatus: string;
  reason: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export interface CreateShiftAssignmentRequest {
  staffId: string;
  templateId: string;
  shiftDate: string;
  notes?: string;
}

export interface BulkAssignRequest {
  assignments: CreateShiftAssignmentRequest[];
}

export interface UpdateShiftStatusRequest {
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  reason?: string;
}

export interface ShiftsQueryParams {
  staffId?: string;
  departmentId?: string;
  from?: string;
  to?: string;
  status?: string;
  page?: number;
  limit?: number;
}
