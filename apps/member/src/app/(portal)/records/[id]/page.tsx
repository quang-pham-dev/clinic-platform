'use client';

import { useAuth } from '@/features/auth/contexts/auth-context';
import { apiClient } from '@/lib/api';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

interface MedicalRecordDetail {
  id: string;
  diagnosis?: string;
  prescription?: string;
  notes?: string;
  followUpDate?: string;
  isVisibleToPatient?: boolean;
  createdAt: string;
  doctor?: {
    user?: {
      profile?: {
        fullName?: string;
      };
    };
  };
  appointment?: {
    slot?: {
      startTime?: string;
      endTime?: string;
    };
  };
}

export default function RecordDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { token } = useAuth();
  const [record, setRecord] = useState<MedicalRecordDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token || !id) return;

    apiClient.medicalRecords
      .getById(id)
      .then((response) => setRecord(response.data as MedicalRecordDetail))
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [token, id]);

  if (loading) {
    return (
      <main className="record-detail-page">
        <div className="loading-skeleton">Loading record...</div>
      </main>
    );
  }

  if (error || !record) {
    return (
      <main className="record-detail-page">
        <div className="error-state">
          <p>{error ?? 'Record not found'}</p>
          <Link href="/records">← Back to Records</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="record-detail-page">
      <nav className="breadcrumb">
        <Link href="/records">← Back to Records</Link>
      </nav>

      <div className="record-detail-header">
        <h1>Medical Record</h1>
        <div className="record-detail-meta">
          <span>
            {new Date(record.createdAt).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </span>
          <span>Dr. {record.doctor?.user?.profile?.fullName ?? 'Unknown'}</span>
        </div>
      </div>

      <div className="record-detail-sections">
        <section className="record-section">
          <h2>Diagnosis</h2>
          <p>{record.diagnosis ?? 'Not provided'}</p>
        </section>

        <section className="record-section">
          <h2>Prescription</h2>
          <p>{record.prescription ?? 'No prescription'}</p>
        </section>

        {record.notes && (
          <section className="record-section">
            <h2>Doctor Notes</h2>
            <p>{record.notes}</p>
          </section>
        )}

        {record.followUpDate && (
          <section className="record-section">
            <h2>Follow-up Date</h2>
            <p>
              {new Date(record.followUpDate).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </p>
          </section>
        )}

        {record.appointment?.slot && (
          <section className="record-section">
            <h2>Appointment Time</h2>
            <p>
              {new Date(
                record.appointment.slot.startTime ?? '',
              ).toLocaleString()}
            </p>
          </section>
        )}
      </div>
    </main>
  );
}
