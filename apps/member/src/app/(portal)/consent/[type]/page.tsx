import { ConsentSignForm } from './consent-sign-form';
import { getCurrentConsentForm } from '@/lib/strapi';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

const VALID_TYPES = ['telemedicine', 'general', 'procedure', 'data-processing'];

export async function generateMetadata({
  params,
}: {
  params: Promise<{ type: string }>;
}): Promise<Metadata> {
  const { type } = await params;
  return {
    title: `${type.charAt(0).toUpperCase() + type.slice(1)} Consent | Clinic Portal`,
    description: `Read and sign the ${type} consent form.`,
  };
}

export default async function ConsentPage({
  params,
}: {
  params: Promise<{ type: string }>;
}) {
  const { type } = await params;

  if (!VALID_TYPES.includes(type)) {
    notFound();
  }

  const consentForm = await getCurrentConsentForm(type);

  return (
    <main className="consent-page">
      <div className="consent-header">
        <h1>{type.charAt(0).toUpperCase() + type.slice(1)} Consent Form</h1>
        {consentForm && (
          <p className="consent-version">
            Version {consentForm.version} · Effective{' '}
            {new Date(consentForm.effectiveDate).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </p>
        )}
      </div>

      {!consentForm ? (
        <div className="empty-state">
          <p>
            No consent form is currently available for this type. Please check
            back later.
          </p>
        </div>
      ) : (
        <>
          <div className="consent-content">
            {Array.isArray(consentForm.content) ? (
              <div className="blocks-content">
                {(
                  consentForm.content as Array<{
                    type: string;
                    children?: Array<{ text?: string }>;
                  }>
                ).map((block, index) => {
                  if (block.type === 'paragraph') {
                    return (
                      <p key={index}>
                        {block.children?.map((child) => child.text).join('')}
                      </p>
                    );
                  }
                  return null;
                })}
              </div>
            ) : typeof consentForm.content === 'string' ? (
              <div
                dangerouslySetInnerHTML={{
                  __html: consentForm.content,
                }}
              />
            ) : (
              <p>{consentForm.title}</p>
            )}
          </div>

          <ConsentSignForm formType={type} version={consentForm.version} />
        </>
      )}
    </main>
  );
}
