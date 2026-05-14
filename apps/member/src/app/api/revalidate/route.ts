import { revalidatePath, revalidateTag } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';

/**
 * On-demand ISR revalidation route.
 * Called by the NestJS CmsWebhookService after processing a Strapi webhook.
 *
 * POST /api/revalidate?secret=xxx
 * Body: { path?: string, tag?: string }
 */
export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get('secret');

  if (secret !== process.env.REVALIDATION_SECRET) {
    return NextResponse.json({ error: 'Invalid secret' }, { status: 401 });
  }

  try {
    const body = (await request.json()) as {
      path?: string;
      tag?: string;
    };

    const { path, tag } = body;

    if (tag) revalidateTag(tag, 'default');
    if (path) revalidatePath(path);

    return NextResponse.json({
      revalidated: true,
      timestamp: Date.now(),
      path,
      tag,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 },
    );
  }
}
