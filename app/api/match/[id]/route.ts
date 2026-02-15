import { NextResponse } from 'next/server';
import { getMatchLatestDetails } from '@/lib/db/queries';

export const revalidate = 10;

export async function GET(_request: Request, context: { params: { id: string } }) {
  try {
    const id = context.params.id;
    const data = await getMatchLatestDetails(id);

    if (!data) {
      return NextResponse.json({ error: 'Match not found' }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[api/match/:id] failed', message);
    return NextResponse.json({ error: 'Failed to fetch match detail' }, { status: 500 });
  }
}
