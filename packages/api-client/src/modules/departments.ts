// ── Department types ──

export interface Department {
  id: string;
  name: string;
  description: string | null;
  headNurseId: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DepartmentListItem {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  headNurse: { id: string; profile: { fullName: string } | null } | null;
  staffCount: number;
  createdAt: string;
}

export interface CreateDepartmentRequest {
  name: string;
  description?: string;
}

export interface UpdateDepartmentRequest {
  name?: string;
  description?: string;
  headNurseId?: string | null;
}
