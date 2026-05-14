'use client';

import { useAuth } from '@/features/auth/contexts/auth-context';
import { useState } from 'react';

interface ConsentSignFormProps {
  formType: string;
  version: string;
}

export function ConsentSignForm({ formType, version }: ConsentSignFormProps) {
  const { user, token } = useAuth();
  const [agreed, setAgreed] = useState(false);
  const [signing, setSigning] = useState(false);
  const [signed, setSigned] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSign = async () => {
    if (!agreed || !token) return;

    setSigning(true);
    setError(null);

    try {
      const apiUrl =
        process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1';

      const response = await fetch(`${apiUrl}/consents`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          formType,
          versionSigned: version,
        }),
      });

      if (!response.ok) {
        const data = (await response.json()) as { message?: string };
        throw new Error(data.message ?? 'Failed to sign consent');
      }

      setSigned(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setSigning(false);
    }
  };

  if (!user) {
    return (
      <div className="consent-sign-section">
        <p className="consent-login-prompt">
          Please <a href={`/login?redirect=/consent/${formType}`}>log in</a> to
          sign this consent form.
        </p>
      </div>
    );
  }

  if (signed) {
    return (
      <div className="consent-sign-section consent-signed">
        <div className="consent-success">
          <span className="consent-success-icon">✓</span>
          <p>You have signed this consent form (v{version}) successfully.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="consent-sign-section">
      <label className="consent-checkbox">
        <input
          type="checkbox"
          checked={agreed}
          onChange={(e) => setAgreed(e.target.checked)}
        />
        <span>I have read and agree to the terms above</span>
      </label>

      {error && <p className="consent-error">{error}</p>}

      <button
        className="consent-sign-button"
        onClick={handleSign}
        disabled={!agreed || signing}
      >
        {signing ? 'Signing...' : `Sign Consent (v${version})`}
      </button>
    </div>
  );
}
