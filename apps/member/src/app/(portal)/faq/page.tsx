import { type CmsFaq, getFaqs } from '@/lib/strapi';

const CATEGORY_LABELS: Record<string, string> = {
  booking: 'Booking',
  'video-call': 'Video Call',
  'medical-records': 'Medical Records',
  account: 'Account',
  general: 'General',
};

export const metadata = {
  title: 'FAQ | Clinic Portal',
  description:
    'Frequently asked questions about using the clinic patient portal.',
};

export default async function FaqPage() {
  const faqs = await getFaqs();

  // Group by category
  const grouped = faqs.reduce<Record<string, CmsFaq[]>>((acc, faq) => {
    const cat = faq.category || 'general';
    if (!acc[cat]) acc[cat] = [];
    acc[cat]!.push(faq);
    return acc;
  }, {});

  const categories = Object.keys(grouped);

  return (
    <main className="faq-page">
      <div className="faq-hero">
        <h1>Frequently Asked Questions</h1>
        <p>Find answers to common questions about our services</p>
      </div>

      {categories.length === 0 ? (
        <div className="empty-state">
          <p>No FAQs available yet. Check back soon!</p>
        </div>
      ) : (
        <div className="faq-sections">
          {categories.map((category) => (
            <section key={category} className="faq-section">
              <h2 className="faq-category-title">
                {CATEGORY_LABELS[category] ?? category}
              </h2>
              <div className="faq-list">
                {grouped[category]!.map((faq) => (
                  <details key={faq.id} className="faq-item">
                    <summary className="faq-question">{faq.question}</summary>
                    <div
                      className="faq-answer"
                      dangerouslySetInnerHTML={{ __html: faq.answer }}
                    />
                  </details>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </main>
  );
}
