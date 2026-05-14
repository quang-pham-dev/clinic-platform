import { getAllArticleSlugs, getArticleBySlug } from '@/lib/strapi';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

export async function generateStaticParams() {
  const slugs = await getAllArticleSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const article = await getArticleBySlug(slug);

  if (!article) {
    return { title: 'Article Not Found' };
  }

  return {
    title: `${article.title} | Clinic Portal`,
    description: article.excerpt,
  };
}

export default async function ArticleDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const article = await getArticleBySlug(slug);

  if (!article) {
    notFound();
  }

  return (
    <main className="article-detail">
      <nav className="breadcrumb" aria-label="Breadcrumb">
        <Link href="/articles">← Back to Articles</Link>
      </nav>

      <article>
        <header className="article-header">
          {article.category && (
            <span className="article-category">
              {article.category.replace('-', ' ')}
            </span>
          )}
          <h1>{article.title}</h1>
          <div className="article-meta">
            {article.authorName && <span>By {article.authorName}</span>}
            {article.readingTime && <span>{article.readingTime} min read</span>}
            {article.publishedAt && (
              <time dateTime={article.publishedAt}>
                {new Date(article.publishedAt).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </time>
            )}
          </div>
        </header>

        {article.coverImageUrl && (
          <div className="article-cover">
            <img src={article.coverImageUrl} alt={article.title} />
          </div>
        )}

        <div className="article-body">
          {article.body && typeof article.body === 'string' ? (
            <div dangerouslySetInnerHTML={{ __html: article.body }} />
          ) : Array.isArray(article.body) ? (
            <div className="blocks-content">
              {(
                article.body as Array<{
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
                if (block.type === 'heading') {
                  return (
                    <h2 key={index}>
                      {block.children?.map((child) => child.text).join('')}
                    </h2>
                  );
                }
                return null;
              })}
            </div>
          ) : (
            <p className="article-excerpt">{article.excerpt}</p>
          )}
        </div>
      </article>
    </main>
  );
}
