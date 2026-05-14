import { type CmsArticle, getArticles } from '@/lib/strapi';
import Link from 'next/link';

const CATEGORIES = [
  { value: '', label: 'All' },
  { value: 'health-tips', label: 'Health Tips' },
  { value: 'nutrition', label: 'Nutrition' },
  { value: 'mental-health', label: 'Mental Health' },
  { value: 'pediatrics', label: 'Pediatrics' },
  { value: 'cardiology', label: 'Cardiology' },
  { value: 'general', label: 'General' },
];

export const metadata = {
  title: 'Health Articles | Clinic Portal',
  description:
    'Read health and wellness articles from our medical professionals.',
};

export default async function ArticlesPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; page?: string }>;
}) {
  const params = await searchParams;
  const category = params.category ?? '';
  const page = parseInt(params.page ?? '1', 10);
  const { articles, total } = await getArticles(
    category || undefined,
    page,
    12,
  );
  const totalPages = Math.ceil(total / 12);

  return (
    <main className="articles-page">
      <div className="articles-hero">
        <h1>Health &amp; Wellness Articles</h1>
        <p>Expert insights and tips from our medical professionals</p>
      </div>

      <nav className="category-filter" aria-label="Filter by category">
        {CATEGORIES.map((cat) => (
          <Link
            key={cat.value}
            href={cat.value ? `/articles?category=${cat.value}` : '/articles'}
            className={`category-pill ${category === cat.value || (!category && !cat.value) ? 'active' : ''}`}
          >
            {cat.label}
          </Link>
        ))}
      </nav>

      {articles.length === 0 ? (
        <div className="empty-state">
          <p>No articles found. Check back soon!</p>
        </div>
      ) : (
        <div className="articles-grid">
          {articles.map((article: CmsArticle) => (
            <Link
              key={article.id}
              href={`/articles/${article.slug}`}
              className="article-card"
            >
              {article.coverImageUrl && (
                <div className="article-card-image">
                  <img
                    src={article.coverImageUrl}
                    alt={article.title}
                    loading="lazy"
                  />
                </div>
              )}
              <div className="article-card-body">
                {article.category && (
                  <span className="article-category">
                    {article.category.replace('-', ' ')}
                  </span>
                )}
                <h2>{article.title}</h2>
                <p>{article.excerpt}</p>
                <div className="article-meta">
                  {article.authorName && <span>By {article.authorName}</span>}
                  {article.readingTime && (
                    <span>{article.readingTime} min read</span>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <nav className="pagination" aria-label="Pagination">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <Link
              key={p}
              href={`/articles?${category ? `category=${category}&` : ''}page=${p}`}
              className={`page-link ${p === page ? 'active' : ''}`}
            >
              {p}
            </Link>
          ))}
        </nav>
      )}
    </main>
  );
}
