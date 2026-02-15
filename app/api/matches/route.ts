import { NextResponse } from 'next/server';
import { listMatchesWithTopAnalysis } from '@/lib/db/queries';
import { matchesQuerySchema } from '@/lib/validation';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const parsed = matchesQuerySchema.safeParse({
      league: url.searchParams.get('league') ?? undefined,
      date: url.searchParams.get('date') ?? undefined,
      limit: url.searchParams.get('limit') ?? undefined
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid query', issues: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const data = await listMatchesWithTopAnalysis({
      league: parsed.data.league,
      date: parsed.data.date,
      limit: parsed.data.limit ?? 100
    });

    return NextResponse.json({
      count: data.length,
      matches: data
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[api/matches] failed', message);
    return NextResponse.json({ error: 'Failed to fetch matches' }, { status: 500 });
  }
}
