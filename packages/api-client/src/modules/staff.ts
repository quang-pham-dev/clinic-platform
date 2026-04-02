// ── Staff types ──

export interface StaffProfileSummary {
  departmentId: string | null;
  department: { id: string; name: string } | null;
  employeeNumber: string | null;
  hireDate: string | null;
}

export interface StaffMember {
  id: string;
  userId: string;
  email: string;
  role: string;
  isActive: boolean;
  profile: { fullName: string; phone: string | null } | null;
  staffProfile: StaffProfileSummary;
  createdAt: string;
}

export interface StaffQueryParams {
  role?: string;
  departmentId?: string;
  isActive?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface CreateStaffRequest {
  email: string;
  password: string;
  role: 'head_nurse' | 'nurse' | 'receptionist';
  departmentId?: string;
  fullName: string;
  phone?: string;
  employeeNumber?: string;
  hireDate?: string;
}

export interface UpdateStaffRequest {
  departmentId?: string;
  employeeNumber?: string;
  fullName?: string;
  phone?: string;
}
