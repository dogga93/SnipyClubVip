import { z } from 'zod';

export const matchesQuerySchema = z.object({
  league: z.string().trim().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional()
});

export const analyzeBodySchema = z
  .object({
    matchId: z.string().uuid().optional(),
    marketType: z.enum(['ML', 'SPREAD', 'TOTAL', 'X1X2']).optional(),
    side: z.enum(['HOME', 'AWAY', 'DRAW', 'OVER', 'UNDER']).optional(),
    payload: z
      .object({
        matchId: z.string().uuid(),
        marketType: z.enum(['ML', 'SPREAD', 'TOTAL', 'X1X2']),
        side: z.enum(['HOME', 'AWAY', 'DRAW', 'OVER', 'UNDER']),
        openOdds: z.number().nullable(),
        currentOdds: z.number().positive(),
        modelProb: z.number().min(0).max(1),
        confidence: z.number().min(0).max(1),
        publicPercent: z.number().min(0).max(100).nullable(),
        cashPercent: z.number().min(0).max(100).nullable(),
        volatility: z.number().min(0).max(1).nullable().optional(),
        lineMovedAgainstPublic: z.boolean().optional()
      })
      .optional()
  })
  .refine((data) => data.payload || (data.matchId && data.marketType && data.side), {
    message: 'Provide payload OR (matchId + marketType + side).'
  });

export const syncQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional()
});
