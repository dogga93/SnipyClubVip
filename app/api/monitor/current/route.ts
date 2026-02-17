import path from 'node:path';
import { NextResponse } from 'next/server';
import { normalizeCurrentMonitor } from '@/lib/monitor/normalize';
import type { MonitorPayload } from '@/lib/monitor/types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const MONITOR_DEBUG = process.env.MONITOR_DEBUG === '1';

export async function GET() {
  try {
    const excelPath = path.join(
      process.cwd(),
      'public',
      'monitors',
      'current',
      'soccer-monitor.xlsx'
    );
    const manifestPath = path.join(
      process.cwd(),
      'public',
      'monitors',
      'current',
      'input-manifest.json'
    );
    const jsonPath = path.join(process.cwd(), 'public', 'data', 'game-monitor-all.json');

    const monitor: MonitorPayload = await normalizeCurrentMonitor({
      excelPath,
      jsonPath,
      manifestPath,
      prefer: 'excel'
    });

    if (MONITOR_DEBUG) {
      console.info('[api/monitor/current]', {
        source: monitor.source,
        date: monitor.date,
        matches: monitor.stats.totalMatches,
        leagues: monitor.stats.totalLeagues,
        minDate: monitor.stats.minDate,
        maxDate: monitor.stats.maxDate
      });
    }

    return NextResponse.json(monitor);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    console.error('[api/monitor/current] failed', detail);
    return NextResponse.json(
      {
        error: 'Failed to load monitor current data',
        detail
      },
      { status: 500 }
    );
  }
}

