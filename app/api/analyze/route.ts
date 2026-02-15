import { NextResponse } from 'next/server';
import { analyzeBodySchema } from '@/lib/validation';
import { analyzeFromDb, saveAnalysis } from '@/lib/analytics/analyze';
import { inferLineMovedAgainstPublic } from '@/lib/analytics/engine';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = analyzeBodySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid payload', issues: parsed.error.flatten() },
        { status: 400 }
      );
    }

    if (parsed.data.payload) {
      const payload = parsed.data.payload;
      const result = await saveAnalysis({
        matchId: payload.matchId,
        marketType: payload.marketType,
        side: payload.side,
        openOdds: payload.openOdds,
        currentOdds: payload.currentOdds,
        modelProb: payload.modelProb,
        confidence: payload.confidence,
        publicPercent: payload.publicPercent,
        cashPercent: payload.cashPercent,
        volatility: payload.volatility ?? null,
        lineMovedAgainstPublic:
          payload.lineMovedAgainstPublic ??
          inferLineMovedAgainstPublic(payload.side, payload.publicPercent, payload.openOdds, payload.currentOdds)
      });

      return NextResponse.json({ mode: 'payload', result });
    }

    const result = await analyzeFromDb({
      matchId: parsed.data.matchId!,
      marketType: parsed.data.marketType!,
      side: parsed.data.side!
    });

    return NextResponse.json({ mode: 'db', result });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[api/analyze] failed', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
