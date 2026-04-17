import { DoctorsPageClient } from './doctors-page-client';
import { getDoctorPages } from '@/lib/strapi';

export default async function DoctorsPage() {
  const cmsProfiles = await getDoctorPages();

  return <DoctorsPageClient cmsProfiles={cmsProfiles} />;
}
