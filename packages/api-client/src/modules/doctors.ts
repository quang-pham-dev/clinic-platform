export interface UpdateDoctorRequest {
  specialty?: string;
  bio?: string;
  consultationFee?: number;
  isAcceptingPatients?: boolean;
}

export interface DoctorProfile {
  fullName: string;
}

export interface Doctor {
  id: string;
  userId: string;
  specialty: string;
  licenseNumber?: string;
  bio?: string;
  consultationFee?: number;
  isAcceptingPatients: boolean;
  profile?: DoctorProfile;
  createdAt: string;
}

export interface DoctorQueryParams {
  page?: number;
  limit?: number;
  specialty?: string;
  isAcceptingPatients?: boolean;
  search?: string;
}
