'use client';

import { useAuth } from '@/features/auth/contexts/auth-context';
import Link from 'next/link';
import { useEffect, useState } from 'react';

interface MedicalRecord {
  id: string;
  diagnosis?: string;
  followUpDate?: string;
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
    };
  };
}

export default function RecordsPage() {
  const { token } = useAuth();
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;

    const apiUrl =
      process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1';

    fetch(`${apiUrl}/medical-records/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((json: { data?: MedicalRecord[] }) => {
        setRecords(json.data ?? []);
      })
      .catch(() => setRecords([]))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return (
      <main className="records-page">
        <h1>My Medical Records</h1>
        <div className="loading-skeleton">Loading records...</div>
      </main>
    );
  }

  return (
    <main className="records-page">
      <div className="records-header">
        <h1>My Medical Records</h1>
        <Link href="/portal/records/upload" className="upload-button">
          Upload Files
        </Link>
      </div>

      {records.length === 0 ? (
        <div className="empty-state">
          <p>
            No medical records yet. Records will appear here after your doctor
            completes an appointment.
          </p>
        </div>
      ) : (
        <div className="records-timeline">
          {records.map((record) => (
            <Link
              key={record.id}
              href={`/portal/records/${record.id}`}
              className="record-card"
            >
              <div className="record-date">
                {new Date(record.createdAt).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })}
              </div>
              <div className="record-body">
                <h3 className="record-doctor">
                  {record.doctor?.user?.profile?.fullName ?? 'Doctor'}
                </h3>
                <p className="record-diagnosis">
                  {record.diagnosis
                    ? record.diagnosis.slice(0, 100) +
                      (record.diagnosis.length > 100 ? '...' : '')
                    : 'No diagnosis recorded'}
                </p>
                {record.followUpDate && (
                  <span className="record-followup-badge">
                    Follow-up:{' '}
                    {new Date(record.followUpDate).toLocaleDateString()}
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
