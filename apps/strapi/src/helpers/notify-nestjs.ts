/**
 * Shared helper to notify the NestJS API about Strapi content changes.
 * Used by lifecycle hooks in article, consent-form, and doctor-page.
 *
 * The NestJS CmsWebhookController validates the X-Strapi-Secret header
 * and dispatches to the appropriate handler (ISR revalidation, consent version update, etc.)
 */
export async function notifyNestJs(
  model: string,
  entryId: number,
  event: string,
  entry?: Record<string, unknown>,
): Promise<void> {
  const webhookUrl =
    process.env.NESTJS_WEBHOOK_URL ||
    'http://localhost:3000/api/v1/cms/webhook';
  const webhookSecret =
    process.env.STRAPI_WEBHOOK_SECRET || 'dev-webhook-secret';

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Strapi-Secret': webhookSecret,
      },
      body: JSON.stringify({
        event: `entry.${event}`,
        model,
        uid: `api::${model}.${model}`,
        entry: {
          id: entryId,
          ...entry,
        },
      }),
    });

    if (!response.ok) {
      console.warn(
        `[CMS Webhook] NestJS responded with ${response.status} for ${model}#${entryId}`,
      );
    } else {
      console.log(
        `[CMS Webhook] Notified NestJS: ${event} ${model}#${entryId}`,
      );
    }
  } catch (error) {
    // Don't throw — webhook failure should not block Strapi operations
    console.error(
      `[CMS Webhook] Failed to notify NestJS for ${model}#${entryId}:`,
      error instanceof Error ? error.message : error,
    );
  }
}
