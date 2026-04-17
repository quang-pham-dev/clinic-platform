import { DoctorDetailClient } from './doctor-detail-client';
import { getDoctorPageByDoctorId } from '@/lib/strapi';

interface DoctorDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function DoctorDetailPage({
  params,
}: DoctorDetailPageProps) {
  const { id } = await params;
  const cmsProfile = await getDoctorPageByDoctorId(id);

  return <DoctorDetailClient doctorId={id} cmsProfile={cmsProfile} />;
}
