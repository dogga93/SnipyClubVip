import { NextResponse } from 'next/server';
import { syncQuerySchema } from '@/lib/validation';
import { runSync } from '@/lib/analytics/sync';

export const dynamic = 'force-dynamic';

const isAuthorized = (request: Request) => {
  const cronSecret = request.headers.get('x-cron-secret');
  const isVercelCron = request.headers.get('x-vercel-cron') === '1';
  return isVercelCron || (!!process.env.CRON_SECRET && cronSecret === process.env.CRON_SECRET);
};

const runSyncHandler = async (request: Request) => {
  try {
    if (!isAuthorized(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(request.url);
    const parsed = syncQuerySchema.safeParse({
      cursor: url.searchParams.get('cursor') ?? undefined,
      limit: url.searchParams.get('limit') ?? undefined
    });

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid query', issues: parsed.error.flatten() }, { status: 400 });
    }

    const limit = parsed.data.limit ?? 30;
    console.info('[api/sync] start', { cursor: parsed.data.cursor ?? null, limit });

    const result = await runSync({
      cursor: parsed.data.cursor,
      limit
    });

    console.info('[api/sync] done', result);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown sync error';
    console.error('[api/sync] failed', message);
    return NextResponse.json({ error: 'Sync failed', detail: message }, { status: 500 });
  }
};

export async function POST(request: Request) {
  return runSyncHandler(request);
}

export async function GET(request: Request) {
  return runSyncHandler(request);
}
