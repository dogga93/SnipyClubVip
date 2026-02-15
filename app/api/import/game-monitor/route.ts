import { NextResponse } from 'next/server';
import { importGameMonitorPageOneFiles } from '@/lib/import/gameMonitorPageOne';

export const dynamic = 'force-dynamic';

const isAuthorized = (request: Request) => {
  const secret = request.headers.get('x-admin-secret');
  return !!process.env.ADMIN_SECRET && secret === process.env.ADMIN_SECRET;
};

export async function POST(request: Request) {
  try {
    if (!isAuthorized(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({} as { files?: string[] }));
    const result = await importGameMonitorPageOneFiles({ files: body.files });

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown import error';
    console.error('[api/import/game-monitor] failed', message);
    return NextResponse.json({ error: 'Import failed', detail: message }, { status: 500 });
  }
}
