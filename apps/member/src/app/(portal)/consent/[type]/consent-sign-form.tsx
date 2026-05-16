'use client';

import { useAuth } from '@/features/auth/contexts/auth-context';
import { apiClient } from '@/lib/api';
import { useEffect, useState } from 'react';

interface ConsentSignFormProps {
  formType: string;
  version: string;
}

export function ConsentSignForm({ formType, version }: ConsentSignFormProps) {
  const { user, token } = useAuth();
  const [agreed, setAgreed] = useState(false);
  const [signing, setSigning] = useState(false);
  const [signed, setSigned] = useState(false);
  const [signedAt, setSignedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;

    apiClient.consents
      .getMyConsents()
      .then((response) => {
        const currentConsent = response.data.find(
          (consent) =>
            consent.formType === formType &&
            consent.versionSigned === version &&
            consent.isCurrent,
        );
        if (currentConsent) {
          setSigned(true);
          setSignedAt(currentConsent.signedAt);
        }
      })
      .catch(() => {
        // Signing remains available if the status check fails.
      });
  }, [formType, token, version]);

  const handleSign = async () => {
    if (!agreed || !token) return;

    setSigning(true);
    setError(null);

    try {
      const response = await apiClient.consents.sign({
        formType,
        versionSigned: version,
      });

      setSigned(true);
      setSignedAt(response.data.signedAt);
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
          <p>
            You have signed this consent form (v{version})
            {signedAt ? ` on ${new Date(signedAt).toLocaleDateString()}` : ''}.
          </p>
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
